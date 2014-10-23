'use strict';

function Backend(model) {
    var self = this,
        movieList = model
      
    self.movies = [];
    self.latest_listing_ts = 0;

    self.fetch_movies = function(cb, force, after_this_ts) {
        movieList.trigger('loading...')
        $.get('/api/movies.json', {fetch: force || 0,
                                   after_this_ts: after_this_ts || self.latest_listing_ts})
         .done(function(res){
              var new_movies = JSON.parse(res)
              if (!new_movies.length){
                  console.log('nothing new');
                  movieList.trigger('done-loaded')
                  if (cb) { cb(false) }
                  return false
              }
              self.movies = self.movies.concat( new_movies )
              self.latest_listing_ts = new_movies[0]['listing_ts'];
              movieList.trigger('done-loaded')
              if (cb) { cb(self.movies) }
          })
         .fail(function(){
              movieList.trigger('done-loaded')
         })
    }

}

function MovieList() {
    var self = riot.observable(this),
        backend = new Backend(self),
        movies = [];
    
    self.movies = function(sort_options) {
        movies = movies.length ? movies : backend.movies
        if (!sort_options) {return movies}
        if (sort_options.sortby == 'refresh') {
          new_movies({'sortby': 'listing_ts', 'direction': 'desc'})
          return false
        }
        return sorted_movies(sort_options)
    }

    // private
    function new_movies(sort_options) {
        // force refresh with newest listings, if any
        backend.fetch_movies(function() {
          self.trigger('render', sort_options)
        }, 1)
    }

    function fetch_movies(page, conf) {
      backend.fetch_movies(function(movies){
          self.trigger('render', conf)
      })
    }

    function sorted_movies(sort_options) {
      var field_name = sort_options.sortby;
      if (!field_name) {return movies};
      movies.sort(function(a,b){
          if (!(a[field_name])) return -1
          if (!(b[field_name])) return 1
          return a[field_name] - b[field_name]
      })
      if (sort_options.direction === 'desc'){
          movies.reverse()
      }
      return movies
    }

    self.one('load', fetch_movies) // TODO: navigating back not triggering load, need separate init;
    
}

function moviePresenter(element, options) {
    element = $(element);
    var template = options.template,
        movieList = options.model,
        $list_target = element.find('#movie-list'),
        $load_spinner = element.find('#load-spinner'),
        $control = element.find('nav'),
        $refresh_button = $control.find('#refresh'),
        sort_options = {'sortby': 'listing_ts',
                        'direction': 'desc'};

    self.render_movies = function(new_sort) {
      // Beware infinite request loop! Do not change sort order in response otherwise it will re-request on render.
        if (new_sort.sortby == 'refresh' || sort_options.direction !== new_sort.direction || sort_options.sortby !== new_sort.sortby){
            // we've passed the conditional check --> the sort order has changed
            sort_options = new_sort.sortby ? new_sort : sort_options; // setter
            var movies = movieList.movies(sort_options);
            if (!movies){return false} // shortcircuit, may be waiting on ajax
            build_movie_list(movies)
            toggle_sort_button(sort_options)
        }
    }

    // private
    function show_spinner() {
      $load_spinner.show()
    }

    function remove_spinner() {
      $load_spinner.hide()
    }

    function build_movie_list(movies) {
      var listings = movies.map(function(movie, _){
            return $(riot.render(template, movie))
          })
      add(listings)
    }

    function add(movie_listings) {
        $list_target.html(movie_listings)
    }

    function toggle_sort_button(sort_options) {
        $control.find('.sortby#' + sort_options.sortby)
                .find('span')
                .attr('class', 'arrow-' + sort_options.direction) // ".arrow-asc", ".arrow-desc"
        $refresh_button.attr('disabled', false)
    }

    function toggle_sort() {
      var $button = $(this),
          direction = $button.find('span').attr('class') || 'asc', // ".arrow-desc"
          direction = (direction.match('desc') ? 'asc' : 'desc'), // toggles arrow direction
          sortby = $button.attr('id') // "#year", "#audience_rating"
      $refresh_button.attr('disabled', true)
      self.render_movies({'sortby': sortby, 'direction': direction})
    }

    $control.on("click", "button", toggle_sort);
    movieList.on('render', self.render_movies)
    movieList.on('loading...', show_spinner)
    movieList.on('done-loaded', remove_spinner)

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
      var params = {},
          key_vals = query_str.split('&'),
          n = key_vals.length
      while (n--) {
        var key_val = key_vals[n].split('=')
        if (key_val.length != 2){ continue }
        params[key_val[0]] = key_val[1]
      }
      return params
    }

}


$(document).ready(function(){
    top.movieList = new MovieList();
    routes({movieList: movieList});

    // Binds the Movie Presenter
    moviePresenter($("#app"), {
        model: movieList,
        template: $('#movie-item').html(),
    });
})