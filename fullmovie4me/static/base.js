'use strict';

function Backend(model) {
    var self = this,
        movieList = model;
      
    self.movies = [];

    self.fetch_movies = function(cb) {
        $.get('http://localhost:4444/api/movies.json', {fetch:0})
         .done(function(res){
              self.movies = JSON.parse(res)
              if (cb) { cb(self.movies) }
          })
    }

}

function MovieList() {
    var self = riot.observable(this),
        backend = new Backend(self),
        movies = [];
    
    self.movies = function(field_name, direction) {
        movies = movies.length ? movies : backend.movies
        return sorted_movies(field_name, direction)
    }

    // private
    function fetch_movies() {
      backend.fetch_movies(function(movies){
          self.trigger('render')
      })
    }

    function sorted_movies(field_name, direction) {
      if (!field_name) {return movies};
      movies.sort(function(a,b){
          if (!(a[field_name])) return -1
          if (!(b[field_name])) return 1
          return a[field_name] - b[field_name]
      })
      if (direction === 'desc'){
          movies.reverse()
      }
      return movies
    }

    function init() {
      self.on('load', fetch_movies)
    }

    init()
    
}

function moviePresenter(element, options) {
    element = $(element);
    var template = options.template,
        movieList = options.model,
        $list_target = element.find('#movie-list'), // TODO: #movie-list
        $load_spinner = element.find('#load-spinner'),
        $sort_buttons = element.find('.sortby')
        // filter_state = null

    // private
    function remove_spinner() {
      $load_spinner.remove()
    }

    function render_movies(movies) {
        movies = movies || movieList.movies();
        var listings = movies.map(function(movie, _){
          return $(riot.render(template, movie))
        })
        add(listings)
    }

    function add(movie_listings) {
        $list_target.html(movie_listings)
    }

    function sort_listings(field_name, direction){
        var movies = movieList.movies(field_name, direction)
        render_movies(movies)
    }

    function trigger_sort(e) {
        var button = e.target,
          field_name = button.dataset.sort_by,
          direction = button.dataset.sort_direction || 'asc';
        sort_listings(field_name, direction)
        toggle_sort_button_arrows(button, direction)
    }

    function toggle_sort_button_arrows(button, direction) {
        $sort_buttons.each(function(_,el){
            el.dataset.sort_direction = '';
            $(el).find('span').removeClass()  //resets arrow class
        })
        button.dataset.sort_direction = (direction === 'desc') ? 'asc' : 'desc';
        $(button).find('span').addClass('arrow ' + direction)
    }

    movieList.on('render', render_movies)
    movieList.on('render', remove_spinner)
    $sort_buttons.on('click', trigger_sort)
}

function routes(models) {
    riot.route(function(hash) {
        models.movieList.trigger('load', hash.slice(2));
    });
}

var movieList;

$(document).ready(function(){
    var movieList = new MovieList();
    routes({movieList: movieList});

    // Binds the Movie Presenter
    moviePresenter($("#app"), {
        model: movieList,
        template: $('#movie-item').html(),
    });
})