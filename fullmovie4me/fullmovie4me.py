from google.appengine.api import users
from google.appengine.ext import ndb
import movie
import webapp2, json

class ApiHandler(webapp2.RequestHandler):
  def get(self):
    print "HERE"
    movies = movie.Movie.query().order(-movie.Movie.creation_ts).fetch(1000)
    movies = [amovie.to_dict(exclude=['creation_ts']) for amovie in movies]
    movies = dict([(amovie.get('title',''), amovie) for amovie in movies]).values() # dirty filter for uniques
    movie_list = json.dumps(movies)
    self.response.headers.add_header("Access-Control-Allow-Origin", "*")
    self.response.headers['Content-Type'] = 'application/javascript'
    self.response.out.write(movie_list)

  @ndb.toplevel #This tells the handler not to exit until its asynchronous requests have finished
  def post(self):
    movies_str = self.request.params.get('movies')
    print movies_str
    movies = json.loads(movies_str)
    ndb.put_multi_async([movie.Movie(**amovie) for amovie in movies])
    self.response.headers.add_header("Access-Control-Allow-Origin", "*")
    self.response.headers['Content-Type'] = '*.*'
    self.response.write('Hello')

class ViewHandler(webapp2.RequestHandler):
  def get(self):
    print "HERE"
    self.response.write('Hello')
    
  def post(self):
    print "HERE"
    self.response.write('Hello')

application = webapp2.WSGIApplication([
    ('/', ViewHandler),
    ('/api', ApiHandler),
], debug=True)