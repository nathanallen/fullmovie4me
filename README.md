FullMovie4Me
==============
A mash-up of Reddit and Rotten Tomoatoes so you can find good movies to watch online for free. Originally conceived as a pure client-side app ([fullmoviemeter](https://github.com/nathanallen/fullmoviemeter)) and now fleshed out with a backend/api (hosted on Google App Engine) and the minimalist [riot.js](https://muut.com/riotjs/) front end framework.

####Technologies:
* Google App Engine (Python)
* [Riot.js](https://muut.com/riotjs/)
* Reddit API
* Rotten Tomatoes API

## Installation

1. Download and install the [App Engine SDK for Python][appengine]
2. `git clone git://github.com/nathanallen/fullmovie4me.git`
3. Use `app.yaml.example` as a starting point for creating your own `app.yaml` file.
4. Make sure to add your API secrets for Reddit and Rotten Tomatoes to `app.yaml` and change the application id.
5. Open the SDK, choose `File > Add Existing Application...` and select the `fullmovie4me` folder

From here you can either run the app locally in the [App Engine development environment][local] or [deploy to Appspot][deploy].
See the [Getting Started](http://code.google.com/appengine/docs/python/gettingstarted) guide for a basic overview of the App Engine platform.

## Demo

The most recent development version of fullmovie4me lives at http://fullmovie4me.appspot.com