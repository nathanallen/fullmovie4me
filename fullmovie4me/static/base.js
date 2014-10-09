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

    self.one('load', fetch_movies)
    
}

function moviePresenter(element, options) {
    element = $(element);
    var template = options.template,
        movieList = options.model,
        $list_target = element.find('#movie-list'),
        $load_spinner = element.find('#load-spinner'),
        $control = element.find('nav'),
        sort_options = {};

    // private
    function remove_spinner() {
      $load_spinner.remove()
    }

    function render_movies(movies) {
        movies = movies || movieList.movies(sort_options.sortby, sort_options.direction);
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

    function set_sort_button_arrow(field_name, direction) {
        $control.find('.sortby#' + field_name)
                .find('span')
                .attr('class', 'arrow-' + direction) // ".arrow-asc", ".arrow-desc"
    }

    function toggle_sort() {
      var $button = $(this),
          direction = $button.find('span').attr('class') || 'asc', // ".arrow-desc"
          direction = (direction.match('desc') ? 'asc' : 'desc'), // toggles arrow direction
          sortby = $button.attr('id') // "#year", "#audience_rating"

      if (sort_options.direction != direction || sort_options.sortby != sortby){
        sort_options = {'sortby': sortby, 'direction': direction} // setter
        sort_listings(sortby, direction)
        set_sort_button_arrow(sortby, direction)
      }

    }

    function init_sort_options(page, conf) {
      sort_options = {'sortby': conf.sortby, 'direction': conf.direction}
      set_sort_button_arrow(conf.sortby, conf.direction)
    }

    $control.on("click", "button", toggle_sort);
    movieList.one('load', init_sort_options)
    movieList.on('render', render_movies)
    movieList.one('render', remove_spinner)

}

function routes(models) {
    riot.route(function(hash) {
        hash = hash.slice(2) || 'movies'
        var split_hash = hash.split('?'),
            current_hash = split_hash[0],
            query_str = split_hash[1],
            query_params = parse_query_params(query_str)
        models.movieList.trigger('load', current_hash, query_params)
    });

    // private
    function parse_query_params(query_str) {
      if (!query_str){return {}}
      var params = {}
      var key_vals = query_str.split('&')
      var n = key_vals.length
      while (n--) {
        var key_val = key_vals[n].split('=')
        if (key_val.length != 2){ continue }
        params[key_val[0]] = key_val[1]
      }
      return params
    }

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