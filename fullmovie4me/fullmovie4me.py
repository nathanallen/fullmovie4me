from google.appengine.api import users
from google.appengine.ext import ndb
import movie
import webapp2, json

class ApiHandler(webapp2.RequestHandler):
  def get(self):
    movie_list = movie.newest_movies()
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