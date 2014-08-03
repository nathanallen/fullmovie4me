from google.appengine.api import users
from google.appengine.ext import ndb
import webapp2, json, datetime


class Movie(ndb.Model):
  title = ndb.StringProperty()
  year = ndb.IntegerProperty()
  audience_rating = ndb.IntegerProperty()
  critics_rating = ndb.IntegerProperty()
  youtube_url = ndb.StringProperty()
  creation_ts = ndb.DateTimeProperty(required=True, auto_now_add=True)
  # title, year, audience_rating, critics_rating, youtube_url

class MainPage(webapp2.RequestHandler):
  def get(self):
    movies = Movie.query().order(-Movie.creation_ts).fetch(20)
    movies = [movie.to_dict() for movie in movies]
    print movies

  @ndb.toplevel #This tells the handler not to exit until its asynchronous requests have finished
  def post(self):
    movies_str = self.request.params.get('movies')
    movies = json.loads(movies_str)
    ndb.put_multi_async([Movie(**movie) for movie in movies])
    self.response.headers.add_header("Access-Control-Allow-Origin", "*")
    self.response.headers['Content-Type'] = '*.*'
    self.response.write('Hello')
    

application = webapp2.WSGIApplication([
    ('/', MainPage),
], debug=True)