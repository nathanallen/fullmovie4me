document.addEventListener('DOMContentLoaded', function(){
  RedditAPI.getListings(function(movieList){
    App.movieData = movieList
    $(App.movieData).map(function(i,v){

      setTimeout(function(){

        RottenAPI.getReview(v,function(data){
          console.log(data)
          v.ratings = data.movies[0].ratings
          return v
        })

      },i*500)

    })
  })
  //App.init()
})

App = {
  movieData: [],
  moar: [],
  query:"Gone with the Wind",
  init: function(){
    $.ajax({
      url: RottenAPI.buildUrl(this.query),
      dataType: "jsonp",
      success: searchCallback
    })
  },
  searchCallback: function(data) {
    alert("made it")
    $(document.body).append('Found ' + data.total + ' results for ' + this.query);
    var movies = data.movies;
    $.each(movies, function(index, movie) {
      console.log(movie.title)
      $(document.body).append('<h1>' + movie.title + '</h1>');
      $(document.body).append('<img src="' + movie.posters.thumbnail + '" />');
    });
  }
}

var RottenAPI = {
  base_url: "http://api.rottentomatoes.com/api/public/v1.0",
  getReview: function(movie,callback){
    //given {title:"Fist of the North Star", year:1986}
    //return rating
    $.ajax({
      url: RottenAPI.buildUrl(movie.title),
      dataType: "jsonp",
      success: callback
    })
  },
  buildUrl: function(query){
    request_url = this.base_url
    request_url += "/movies.json?"
    request_url += "q=" + encodeURI(query)
    request_url += "&page_limit=5&page=1&apikey="
    request_url += Secret.rotten_key
    console.log(encodeURI)
    return request_url
  }
}

RedditAPI = {
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
  //given "Fist of the North Star (1986) [360p]"
  //returns {title:"Fist of the North Star", year:1986}
  parseTitle: function(title){
    var endOfTitle = title.search(/\s\(\d{4}\)/)
    var y = parseInt(title.substr(endOfTitle+2,4))
    var t = title.substr(0,endOfTitle)
    return {title: t, year: y}
  }
}


// $ = {
//   getJSON: function(api_url){
//   request = new XMLHttpRequest
//   request.open('GET', api_url, true)
//   request.send()

//     request.onload = function() {
//       data = JSON.parse(this.response)
//       alert(data)
//       return data
//     }
//   }
// }


