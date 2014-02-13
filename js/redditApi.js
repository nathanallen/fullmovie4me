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
