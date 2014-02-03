document.addEventListener('DOMContentLoaded', function(){
  //App.init() 
  ViewControl.addMovies(SampleData.movieData)
})

var App = {
  movieData: [], //e.g. {title: "Boyz n the Hood", year: 1991, audience_rating: 93, critics_rating: 96}
  init: function(){
    this.getMoviesAndRatings()
  },
  getMoviesAndRatings: function(){
    RedditAPI.getListings(function(movieList){
      App.movieData = movieList
      $(App.movieData).map(function(i,v){
        RottenAPI.findRatings(i,v)
      })
    })
  }
}

var ViewControl = {
  addMovies: function(movieData){
    Array.prototype.forEach.call(movieData,function(v,i){
      ViewControl.addMovie(v)
    })
  },
  addMovie: function(movie){
    var target = document.body.children[0]
    target.insertAdjacentHTML('afterend',"<hr>")
    target.insertAdjacentHTML('afterend',"<p> Ratings: " + movie.audience_rating + " / " + movie.critics_rating + "</p>")
    target.insertAdjacentHTML('afterend',"<strong>" + movie.title + "</strong> " + movie.year + "<br>")
  }
}

var RottenAPI = {
  base_url: "http://api.rottentomatoes.com/api/public/v1.0",
  findRatings: function(i,movie){
    return this.waitPlease(i,movie,this.getAndParseReviews)
  },
  waitPlease: function(i,movie,callback){
    setTimeout(function(){
      return callback(movie)
    },i*200)
  },
  getAndParseReviews: function(movie){
    RottenAPI.getReviews(movie,function(data){
      return RottenAPI.filteredResults(movie,data)
    })
  },
  getReviews: function(movie,callback){
    $.ajax({
      url: RottenAPI.buildUrl(movie.title),
      dataType: "jsonp",
      success: callback
    })
  },
  filteredResults: function(movie,data){
    if (data){
      movie.audience_rating = data.movies[0].ratings.audience_score
      movie.critics_rating = data.movies[0].ratings.critics_score
    }
    return movie
  },
  buildUrl: function(query){
    request_url = this.base_url
    request_url += "/movies.json?"
    request_url += "q=" + encodeURI(query)
    request_url += "&page_limit=5&page=1&apikey="
    request_url += Secret.rotten_key
    return request_url
  }
}

var RedditAPI = {
  movieData: [],
  baseUrl: "http://www.reddit.com/r/fullmoviesonyoutube.json",
  getListings: function(callback){
    $.get(this.baseUrl).done(function(response){
      $(response.data.children).each(function(){
        var listing = RedditAPI.parseTitle(this.data.title)
        RedditAPI.movieData.push(listing)
      })
      callback(RedditAPI.movieData)
    })
  },
  parseTitle: function(title){   //e.g. "Fist of the North Star (1986) [360p]"
    var endOfTitle = title.search(/\s\(\d{4}\)/)
    var y = parseInt(title.substr(endOfTitle+2,4))
    var t = title.substr(0,endOfTitle)
    return {title: t, year: y}
  }
}



