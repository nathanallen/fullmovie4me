document.addEventListener('DOMContentLoaded', function(){
  App.init()
  //App.init(SampleData.movieData) //development
})

var App = {
  init: function(testData){
    this.viewControl = ViewControl
    this.rottenAPI = RottenAPI
    this.redditAPI = RedditAPI
    this.fullMovieListings = testData || []   //development
    if (testData){
      this.viewControl.renderMovies(testData) //development
    } else {
      this.getMoviesAndRatings()
    }
    this.createButtonListeners()
  },
  getMoviesAndRatings: function(){
    this.redditAPI.getMovies(function(movieList){
      App.rottenAPI.getRatings(movieList,'combineResults',App)
    })
  },
  combineResults: function(movie,data){
    if (data.movies[0]){
      movie.audience_rating = data.movies[0].ratings.audience_score
      movie.critics_rating = data.movies[0].ratings.critics_score
    }
    this.fullMovieListings.push(movie)
    this.viewControl.removeSpinner() // only happens the first time
    this.viewControl.renderMovieListing(movie)
  },
  createButtonListeners: function(){
    $('.sortby').click(App.initiateSort)
  },
  initiateSort: function(e){
    target = e.target
    var field_name = target.dataset.sort_by
    var direction = target.dataset.sort_direction
    target.dataset.sort_direction = (direction === 'desc') ? 'asc' : 'desc'
    App.sortBy(field_name, direction)
  },
  sortBy: function(field_name, direction){
    this.fullMovieListings.sort(function(a,b){
      if (!(a[field_name])) return -1
      if (!(b[field_name])) return 1
      return a[field_name] - b[field_name]
    })
    if (direction === 'desc'){
      this.fullMovieListings.reverse()
    }
    this.viewControl.clearListings()
    this.viewControl.renderMovies(this.fullMovieListings)
  }
}

var ViewControl = {
  target: $('.listings'),
  spinner: $('.spinner'),
  renderMovies: function(movieData){
    movieData.forEach(this.renderMovieListing)
  },
  renderMovieListing: function(movie){
    htmlString = ("<div class=\"movieListing\">")
    htmlString += ("<strong>")
    htmlString += ("<a href=\"" + movie.youtube_url + "\">") + movie.title + "</a>" 
    htmlString += ("</strong> ")
    htmlString += (movie.year + "<br>")
    if (movie.audience_rating & movie.critics_rating){
      htmlString += ("Audience Rating: " + (movie.audience_rating || "none") + ", Critics: " + (movie.critics_rating || "none"))
    } else {
      htmlString += ("No Reviews")
    }
    htmlString += ("</div>")
    ViewControl.insertMovieListing(htmlString)
  },
  insertMovieListing: function(htmlString){
    this.target.prepend(htmlString)
  },
  clearListings: function(){
    $('.movieListing').each(function(_,el){$(el).remove()})
  },
  removeSpinner: function(){
    if (this.spinner){
      this.spinner.remove()
      this.spinner = undefined
    }
  }
}

var RottenAPI = {
  base_url: "http://api.rottentomatoes.com/api/public/v1.0",
  getRatings: function(movieList,callback_str,callback_obj){
    this.callback_str = callback_str
    movieList.forEach(function(movie,i){
      setTimeout(function(){
        RottenAPI.getAndParseRatings(movie,callback_str,callback_obj)
      },i*200)
    })
  },
  getAndParseRatings: function(movie,callback_str,callback_obj){
    RottenAPI.getRatingsJSON(movie.title,function(data){
      callback_obj[callback_str](movie,data)
    })
  },
  getRatingsJSON: function(title,callback){
    $.ajax({
      url: RottenAPI.buildUrl(title),
      dataType: "jsonp",
      success: callback
    })
  },
  buildUrl: function(query){
    request_url = this.base_url
    request_url += "/movies.json?"
    request_url += "q=" + encodeURI(query)
    request_url += "&page_limit=5&page=1"
    request_url += "&apikey=" + Secret.rotten_key
    return request_url
  }
}

var RedditAPI = {
  movieData: [],
  baseUrl: "http://www.reddit.com/r/fullmoviesonyoutube.json",
  getMovies: function(callback){
    $.get(this.baseUrl).done(function(response){
      $(response.data.children).each(function(){
        var listingData = RedditAPI.cherryPick(this.data)
        if (!(listingData.title == "" & listingData.year == NaN)){
          RedditAPI.movieData.push(listingData)
        }
      })
      callback(RedditAPI.movieData)
    })
  },
  cherryPick: function(json){
    var listingData = this.parseTitle(json.title)
    listingData.youtube_url = json.url
    return listingData
  },
  parseTitle: function(title){   //e.g. "Fist of the North Star (1986) [360p]"
    var endOfTitle = title.search(/\s\(\d{4}\)/)
    var y = parseInt(title.substr(endOfTitle+2,4))
    var t = title.substr(0,endOfTitle)
    return {title: t, year: y}
  }
}



