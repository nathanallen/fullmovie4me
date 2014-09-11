$(document).ready(function(){
  $.get('http://localhost:4444/api')
   .done(function(res){
      window.movie_list = JSON.parse(res)
      App.init(window.movie_list)
    })
  // App.init()
  // $.post('http://localhost:4444/', {movies: JSON.stringify(this.fullMovieListings)}, function(res){console.log(res)})
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
      App.rottenAPI.getRatings(movieList,App,'combineResults')
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
    $('.sortby').click(this.initiateSort)
  },
  initiateSort: function(e){
    var button = e.target,
        field_name = button.dataset.sort_by,
        direction = button.dataset.sort_direction || 'asc'
    App.sortBy(field_name, direction)
    App.viewControl.flipArrow(button, direction)
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
    this.viewControl.renderMovies(this.fullMovieListings)
  },
}
