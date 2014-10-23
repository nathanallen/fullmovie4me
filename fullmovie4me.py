from google.appengine.api import users
from google.appengine.ext import ndb
import movie
import webapp2, json
import jinja2, os

JINJA_ENVIRONMENT = jinja2.Environment(
  loader=jinja2.FileSystemLoader(os.path.dirname(__file__)),
  autoescape=True)

class ApiHandler(webapp2.RequestHandler):
  def get(self, *args):
    # resource = args[0] if args else None # e.g. "movies"
    query_params = self.request.params
    fetch = query_params.get('fetch', '0') == '1'
    after_this_ts = int(query_params.get('after_this_ts', 0))
    movie_list = movie.newest_movies(fetch=fetch, after_this_ts=after_this_ts)
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
    template_values = {}
    template = JINJA_ENVIRONMENT.get_template('layout/index.html')
    self.response.write(template.render(template_values))
    
  def post(self):
    print "HERE"
    self.response.write('Hello')

application = webapp2.WSGIApplication([
    ('/', ViewHandler),
    ('/api/([^/]+)?.json', ApiHandler),
], debug=True)