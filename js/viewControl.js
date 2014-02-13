var ViewControl = {
  target: $('.listings'),
  spinner: $('.spinner'),
  buttons: $('.sortby'),
  renderMovies: function(movieData){
    this.clearListings()
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
  },
  flipArrow: function(button, direction){
    var buttons = this.buttons
    function resetArrows(callback){
      buttons.each(function(_,el){
        el.dataset.sort_direction = ''
        $(el).find('span').removeClass()  //resets arrow class
      })
      callback()
    }
    function setActiveArrow(){
      button.dataset.sort_direction = (direction === 'desc') ? 'asc' : 'desc'
      $(button).find('span').addClass('arrow ' + direction)
    }
    resetArrows(setActiveArrow)
  }
}
