from google.appengine.ext import ndb
import urllib2, json, re, time

class Movie(ndb.Model):
  title = ndb.StringProperty()
  year = ndb.IntegerProperty()
  audience_rating = ndb.IntegerProperty()
  critics_rating = ndb.IntegerProperty()
  youtube_url = ndb.StringProperty() # any video url
  creation_ts = ndb.DateTimeProperty(required=True, auto_now_add=True)
  # title, year, audience_rating, critics_rating, youtube_url

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

def fetch_movie_listings():
  data = urllib2.urlopen('http://reddit.com/r/fullmoviesonanything.json').read()
  listings = json.loads(data)['data']['children']
  for listing in listings:
    url = listing['data']['url']
    # if Movie.query(Movie.youtube_url == url):
    #   continue
    post_title = listing['data']['title']
    title, year = parse_title_and_year(post_title)
    yield title, year, url

def build_rotten_api_request_url(title):
  ROTTEN_KEY = "7ru5dxvkwrfj8yfx36ymhch7"
  BASE_URL = "http://api.rottentomatoes.com/api/public/v1.0"
  request_url = BASE_URL
  request_url += "/movies.json?"
  request_url += "q=" + urllib2.quote(title)
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

def fetch_new_movies_and_ratings(overwrite=False):
  for title, year, url in fetch_movie_listings():
    if not title:
      continue
    exists = Movie.query(Movie.youtube_url == url).get() # TODO: keys only req?
    if exists:
      if overwrite:
        exists.key.delete()
      continue
    match = fetch_movie_data(title, year)
    if not match:
      continue
    ratings = match.get('ratings', {})
    Movie.put(Movie(**{ "title": match.get('title') or title, 
                        "year": year,
                        "url": url,
                        "audience_rating": ratings.get('audience_score'),
                        "critics_rating": ratings.get('critics_score')
                      }))
