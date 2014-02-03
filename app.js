document.addEventListener('DOMContentLoaded', function(){
  RedditAPI.getListings()
  //App.init()
})

var App = {
  query:"Gone with the Wind",
  init: function(){
    $.ajax({
      url: RottenAPI.buildUrl(this.query),
      dataType: "jsonp",
      success: App.searchCallback
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
  findMatch: function(title){

  },
  parseTitle: function(title){

  },
  buildQuery: function(query){
    //"Who Killed the Electric Car (1909)" --> "%22Who%20Killed%20the%20Electric%20Car%22"
    return "q=" + encodeURI(query)
    //"q=%22" + query.replace(/ /g, "%20") + "%22"
  },
  buildUrl: function(query){
    request_url = this.base_url
    request_url += "/movies.json?"
    request_url += this.buildQuery(query)
    request_url += "&page_limit=5&page=1&apikey="
    request_url += Secret.rotten_key
    return request_url
  }
}

RedditAPI = {
  baseUrl: "http://www.reddit.com/r/fullmoviesonyoutube.json",
  data: {},
  getListings: function(callback){
    $.get(this.baseUrl).done(function(data){
      $(data.children).each(function(i,v){
        RedditAPI.data[i] = v.data.media
      })
    })
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


