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
