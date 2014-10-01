from google.appengine.ext import ndb
from google.appengine.api import memcache
import urllib2, json, re, datetime, time

class Movie(ndb.Model):
  title = ndb.StringProperty()
  year = ndb.IntegerProperty()
  audience_rating = ndb.IntegerProperty()
  critics_rating = ndb.IntegerProperty()
  youtube_url = ndb.StringProperty() # any video url
  listing_ts = ndb.DateTimeProperty() # i.e. when was movie listed?
  creation_ts = ndb.DateTimeProperty(required=True, auto_now_add=True)
  # title, year, audience_rating, critics_rating, youtube_url

  def fetch_ratings(self, save=True):
    # TODO: check ratings already exist
    match = fetch_movie_data(self.title, self.year)
    if not match:
      return None
    ratings = match.get('ratings', {})
    self.audience_rating = ratings.get('audience_score')
    self.critics_rating = ratings.get('critics_score')
    if save:
      self.put()
    # return ratings


#
# REDDIT API
#

SUBREDDITS = ["fullmoviesonanything", "fullmoviesonyoutube", "bestofstreamingvideo"]

def fetch_before_cursor(subreddit):
  return memcache.get(subreddit)

def cache_before_cursor(subreddit, cursor):
  return memcache.set(subreddit, cursor)

def query_reddit_api(subreddit, count=20, before_cursor=None, after_cursor=None):
  '''fetches the json representation of a subreddit page.
      if no cursors are provided, returns the topmost page'''
  endpoint = 'http://reddit.com/r/%s.json?count=%s&before=%s&after=%s' % (subreddit, count, before_cursor, after_cursor)
  try:
    data_str = urllib2.urlopen(endpoint).read()
  except:
    data_str = urllib2.urlopen(endpoint).read()
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

def fetch_and_parse_raw_movie_listings(subreddit, count=20, before_cursor=None, after_cursor=None):
  '''generates parsed movie listings from a subreddit page (and caches the before_cursor)'''
  data = query_reddit_api(subreddit, count, before_cursor, after_cursor)
  listings = data['children']
  if not len(listings):
    return [], None, None
  next_after_cursor = data.get('after', None)
  next_before_cursor = data.get('before', None)
  if next_before_cursor == None and len(listings):
    # we've run out of subsequent listings
    # grab the cursor from the topmost / most recent listing and cache it
    before_cursor = listings[0]['data']['name']
    cache_before_cursor(subreddit, before_cursor)
  return parsed_movie_listings(listings), next_before_cursor, next_after_cursor

def parsed_movie_listings(listings):
  movies = []
  for listing in listings:
    post_title = listing['data']['title']
    title, year = parse_title_and_year(post_title)
    if title == None:
      continue
      # TODO: if year is None?
    url = listing['data']['url']
    listing_utc = listing['data']['created_utc']
    listing_ts = datetime.datetime.fromtimestamp(listing_utc)
    movie = Movie(title=title, year=year, youtube_url=url, listing_ts=listing_ts)
    movies.append(movie)
  return movies

def parse_title_and_year(post_title):
  if post_title == None or post_title == '':
    return None, None
  match = re.search(r'([^\(]*?) \((\d{4})\).?', post_title)
  # TODO: capture "Season 1 / Episode 2" info
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

def build_rotten_api_request_url(title):
  ROTTEN_KEY = "7ru5dxvkwrfj8yfx36ymhch7"
  request_url = "http://api.rottentomatoes.com/api/public/v1.0"
  request_url += "/movies.json?"
  request_url += "q=" + urllib2.quote(title) # TODO: KeyError: u'\u8fa3'
  request_url += "&page_limit=5&page=1"
  request_url += "&apikey=" + ROTTEN_KEY
  return request_url

def query_rotten_api(title, delay=5):
  if title == None:
    return None
  time.sleep(delay)
  request_url = build_rotten_api_request_url(title)
  request_data = urllib2.urlopen(request_url).read()
  return json.loads(request_data)

def fetch_movie_data(title, year, delay=5):
  if not title:
    return None
  data = query_rotten_api(title, delay)
  if not data:
    return None
  movies = data.get('movies', None)
  if not movies:
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
    print "no match on year: guessing"
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
        print "skipping " + repr(movie.title)
        continue
    print "fetching " + repr(movie.title)
    movie.fetch_ratings(save=True)
    print movie

def newest_movies(to_json=True, fetch=False):
  if fetch:
    fetch_new_movies_and_ratings(max_pages=3, overwrite=False, newest_only=True)
  movies = Movie.query().order(-Movie.listing_ts).fetch(1000) # swap with listing_ts
  movies = [amovie.to_dict(exclude=['creation_ts','listing_ts']) for amovie in movies]
  if to_json:
    return json.dumps(movies)
  return movies