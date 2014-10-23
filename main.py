from google.appengine.api import users
import webapp2

class MainPage(webapp2.RequestHandler):

  def get(self):
    print self.request
    print self.arguments() 
    self.response.headers['Content-Type'] = 'text/plain'
    self.response.write('Hello, ')
    


application = webapp2.WSGIApplication([
    ('/', MainPage),
], debug=True)