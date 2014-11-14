from google.appengine.ext import ndb
from google.appengine.api import memcache
import os, urllib, urllib2, json, re, datetime, time, logging

# flush the logs regularly to improve production debugging
# sets AUTOFLUSH_EVERY_LINES to 1 (vs. default 20)
# see: https://code.google.com/p/googleappengine/issues/detail?id=8809#c10
from google.appengine.api import logservice
logservice.AUTOFLUSH_EVERY_SECONDS = None
logservice.AUTOFLUSH_EVERY_BYTES = None
logservice.AUTOFLUSH_EVERY_LINES = 1

class Movie(ndb.Model):
  title = ndb.StringProperty()
  title_tags = ndb.StringProperty(repeated=True)
  year = ndb.IntegerProperty()
  audience_rating = ndb.IntegerProperty()
  critics_rating = ndb.IntegerProperty()
  youtube_url = ndb.StringProperty() # any video url
  listing_ts = ndb.DateTimeProperty() # i.e. when was movie listed?
  creation_ts = ndb.DateTimeProperty(required=True, auto_now_add=True)
  # title, year, audience_rating, critics_rating, youtube_url

  def put(self, **kwargs):
    self.title_tags = self.title.lower().split()
    super(Movie, self).put(**kwargs)
    return self

  def fetch_ratings(self, save=True):
    # TODO: check ratings already exist;
    # TODO: save anyway, add task to find misssing ratings
    logging.info("fetching...")
    match = fetch_movie_data(self.title, self.year)
    if not match:
      logging.warning("ratings fetch failed")
      return None
    ratings = match.get('ratings', {})
    self.audience_rating = ratings.get('audience_score')
    self.critics_rating = ratings.get('critics_score')
    if save:
      logging.info("saving...")
      self.put()
    # return ratings

  def to_consumable_dict(self, exclude=None):
    movie_dict = self.to_dict(exclude=['creation_ts'])
    movie_dict['listing_ts'] = int(1000 * time.mktime(self.listing_ts.timetuple()))
    return movie_dict


#
# REDDIT API
#

SUBREDDITS = ["bestofstreamingvideo", "fullmoviesonanything", "fullmoviesonyoutube"]

def fetch_before_cursor(subreddit):
  return memcache.get(subreddit)

def cache_before_cursor(subreddit, cursor):
  return memcache.set(subreddit, cursor)

def query_reddit_api(subreddit, count=20, before_cursor=None, after_cursor=None, delay=1):
  '''fetches the json representation of a subreddit page.
      if no cursors are provided, returns the topmost page'''
  time.sleep(delay)
  endpoint = 'http://reddit.com/r/%s.json' % (subreddit)
  query_data = urllib.urlencode([('count', count), ('before', before_cursor), ('after', after_cursor)])
  request = urllib2.Request(endpoint, query_data)
  request.add_header('user-agent', os.environ['REDDIT_API_USER_AGENT']) # https://github.com/reddit/reddit/wiki/API
  data_str = urllib2.urlopen(request).read()
  if not data_str:
    return None
  return json.loads(data_str)['data']

def movie_listings(max_pages=1, subreddits=SUBREDDITS, newest_only=True):
  '''wrapper for bulk fetching movie listings from reddit.
    if newest_only is True, walks forward through results using the cached before_cursor
    (otherwise it walks backwards) until either max_pages is reached or results are exhausted'''
  for subreddit in subreddits:
    after_cursor = None
    before_cursor = fetch_before_cursor(subreddit) if newest_only else None
    for _ in range(max_pages):
      movies, before_cursor, after_cursor = fetch_and_parse_raw_movie_listings(subreddit, before_cursor=before_cursor, after_cursor=after_cursor)
      if not len(movies):
        break
      for movie in movies:
        yield movie
      if before_cursor is None: # i.e we've run out of listings
        break
      if newest_only is True:
        after_cursor = None
      else:
        before_cursor = None

def check_cursors(subreddit, data, cache=True):
  '''grab the latest round of cursors & cache the topmost before_cursor'''
  next_after_cursor = data.get('after', None)
  next_before_cursor = data.get('before', None)
  if cache and next_before_cursor == None and len(data['children']):
    # we've run out of subsequent listings
    # grab the cursor from the topmost / most recent listing and cache it
    before_cursor = data['children'][0]['data']['name']
    # TODO: if old and new cursors are the same then no need to cache.
    old_cursor = fetch_before_cursor(subreddit)
    logging.info("caching %s cursor: old %s, new %s" % (subreddit, old_cursor, before_cursor))
    cache_before_cursor(subreddit, before_cursor)
  return next_before_cursor, next_after_cursor

def fetch_and_parse_raw_movie_listings(subreddit, count=20, before_cursor=None, after_cursor=None):
  '''generates parsed movie listings from a subreddit page (and caches the before_cursor)'''
  data = query_reddit_api(subreddit, count, before_cursor, after_cursor)
  if not data or not data['children']:
    logging.info("wowza, reddit fetch probably 429ed - no data")
    return [], None, None
  listings = data['children']
  movies = []
  for listing in listings:
    if before_cursor != None and listing['data']['name'] == before_cursor:
      logging.info("booya! caught the cursor and returned early")
      break
    movie = parsed_movie_listing(listing)
    if movie == None:
      continue
    movies.append(movie)
  next_before_cursor, next_after_cursor = check_cursors(subreddit, data)
  return movies, next_before_cursor, next_after_cursor

def parsed_movie_listing(listing):
  '''creates a movie object from a listing'''
  post_title = listing['data']['title']
  title, year = parse_title_and_year(post_title)
  if title == None:
    return
    # TODO: if year is None?
  url = listing['data']['url']
  listing_utc = listing['data']['created_utc']
  listing_ts = datetime.datetime.fromtimestamp(listing_utc)
  return Movie(title=title, year=year, youtube_url=url, listing_ts=listing_ts)


def parse_title_and_year(post_title):
  if post_title == None or post_title == '':
    return None, None
  match = re.search(r'([^\(]*?) \((\d{4})\).?', post_title)
  # TODO: capture "Season 1 / Episode 2" info
  # TODO: "The Purge (I) (2013)" --> "I)""
  if not match:
    return None, None
  try:
    movie_title, movie_year = match.group(1, 2)
  except:
    return None, None
  return movie_title, int(movie_year)

#
# ROTTEN TOMATOES API
#

def build_rotten_api_request_url(title, resource='movies'):
  ROTTEN_API_KEY = os.environ['ROTTEN_API_KEY']
  request_url = "http://api.rottentomatoes.com/api/public/v1.0/" + resource + ".json"
  title = re.sub(r'[^a-zA-Z0-9 ]', '', title).strip()
  request_url += "?q=" + urllib2.quote(title)
  request_url += "&page_limit=5&page=1"
  request_url += "&apikey=" + ROTTEN_API_KEY
  return request_url

def query_rotten_api(title, delay=5):
  if title == None:
    return None
  time.sleep(delay)
  request_url = build_rotten_api_request_url(title)
  logging.info(request_url)
  data_str = urllib2.urlopen(request_url).read()
  return json.loads(data_str)

def fetch_movie_data(title, year, delay=5):
  # TODO: save movie ID / IMDB ID & blob of response data
  if not title:
    return None
  data = query_rotten_api(title, delay)
  if not data:
    logging.warning("uh oh... no data in rotten response")
    return None
  movies = data.get('movies', None)
  if not movies:
    logging.warning("uh oh... no movies in rotten response data")
    return None
  match = None
  for movie in movies:
    if movie.get('year') != year:
      continue
    # TODO: fuzzy matching on year
    # TODO: double check title is correct
    match = movie
    break
  if match == None:
    logging.info("no match on year: guessing")
    match = movies[0]
  return match

#
# General Interface for Retrieving Movies
#

def fetch_new_movies_and_ratings(max_pages=1, subreddits=SUBREDDITS, overwrite=False, newest_only=True):
  for movie in movie_listings(max_pages=max_pages, subreddits=subreddits, newest_only=newest_only):
    if not movie.title:
      continue
    exists = Movie.query(Movie.youtube_url == movie.youtube_url).get() # TODO: keys only req?
    if exists:
      if overwrite:
        exists.key.delete()
      else:
        logging.info("skipping " + repr(movie.title))
        continue
    logging.info("fetching " + repr(movie.title))
    movie.fetch_ratings(save=True)
    logging.info(movie)

def newest_movies(to_json=True, fetch=False, after_this_ts=None):
  if fetch:
    # TODO: fetch takes too long for ajax call, make this a task
    # return 200 on request, then, use intermitent polling for new listings
    fetch_new_movies_and_ratings(max_pages=3, overwrite=False, newest_only=True)
  movies = Movie.query().order(-Movie.listing_ts).fetch(20)
  movies = [amovie.to_consumable_dict() for amovie in movies]
  latest_listing_ts = len(movies) and movies[0]['listing_ts']
  cached_latest_listing_ts = memcache.get('latest_listing_ts', 0)
  if cached_latest_listing_ts == 0 or latest_listing_ts > cached_latest_listing_ts:
    logging.info("in latest_listing_ts block: " + repr(latest_listing_ts))
    memcache.set('latest_listing_ts', latest_listing_ts)
  if after_this_ts: # zero
    logging.info("in after_this_ts block: " + repr(after_this_ts))
    movies = [amovie for amovie in movies if amovie['listing_ts'] > after_this_ts]
  if to_json:
    return json.dumps(movies)
  return movies

def autocomplete(search_str, max_results=20):
  if not search_str:
    return []
  search_terms = search_str.lower().split()
  movies = Movie.query(Movie.title_tags.IN(search_terms)).fetch(max_results)
  return json.dumps([amovie.to_consumable_dict() for amovie in movies])
