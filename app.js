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
  target: document.body.children[0],
  addMovies: function(movieData){
    Array.prototype.forEach.call(movieData,function(movie){
      ViewControl.buildAndAppendMovie(movie)
    })
  },
  buildAndAppendMovie: function(movie){
    htmlString = ("<div class=\"movieListing\">")
    htmlString += ("<strong>")
    htmlString += ("<a href=\"" + movie.youtube_url + "\">") + movie.title + "</a>" 
    htmlString += ("</strong> ")
    htmlString += (movie.year + "<br>")
    htmlString += ("Ratings: " + (movie.audience_rating || "none") + " / " + (movie.critics_rating || "none"))
    htmlString += ("</div>")
    this.addMovie(htmlString)
  },
  addMovie: function(htmlString){
    this.target.insertAdjacentHTML('afterend', htmlString)
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
        var listingData = RedditAPI.cherryPick(this.data)
        RedditAPI.movieData.push(listingData)
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



