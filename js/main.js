let restaurants,
  neighborhoods,
  cuisines
var newMap
var markers = [];
var dbname = 'RESTAURANT_DB';

/**
 * Fetch neighborhoods and cuisines as soon as the page is loaded.
 */
document.addEventListener('DOMContentLoaded', (event) => {
  registerServiceWorker(); //register service worker
  initMap(); // added
  fetchNeighborhoods();
  fetchCuisines();
});

document.addEventListener('click',function(e){
  console.log(e.target);
  if(e.target && e.target.className == 'favourite-icon'){
    alert();
  }
})

/**
 * Service worker functions below
 */
registerServiceWorker = () => {

  if (!navigator.serviceWorker) return;

  navigator.serviceWorker.register('/service-worker.js').then((reg) => {
    if (!navigator.serviceWorker.controller) {
      return;
    }

    if (reg.waiting) {
      console.log('[ServiceWorker] is waiting - call update sw');
      updateWorker(reg.waiting);
      return;
    }

    if (reg.installing) {
      console.log('[ServiceWorker] is installing - call to track Installing sw');
      trackInstalling(reg.installing);
      return;
    }

    reg.addEventListener('updatefound', () => {
      console.log('[ServiceWorker] is installing - call to track Installing sw');
      trackInstalling(reg.installing);
    });

  })
  .catch(function(err) { 
    console.error(err); // the Service Worker didn't install correctly
  });

  //implement background sync for favourites and reviews offline posting
  if ('SyncManager' in window) {
    navigator.serviceWorker.ready.then(function(swRegistration) {      
      return swRegistration.sync.register('syncrhronizeOfflineData')
        .then(function() {
          // registration succeeded
          console.log('[ServiceWorker] is ready - sync is registered');
        }, function() {
          // registration failed
          console.log('[ServiceWorker] is ready - sync reg failed');
        });
    });
  }   

};
trackInstalling = (worker) => {
  worker.addEventListener('statechange', function () {
    console.log('[ServiceWorker] statechange -trackInstalling');
    if (worker.state == 'installed') {
      updateWorker(worker);
    }
  });
};
updateWorker = (worker) => {
  console.log('[ServiceWorker] action to update worker called -skipWaiting');
  worker.postMessage({ action: 'skipWaiting' });
};

/**
 * Fetch all neighborhoods and set their HTML.
 */
fetchNeighborhoods = () => {
  DBHelper.fetchNeighborhoods((error, neighborhoods) => {
    if (error) { // Got an error
      console.error(error);
    } else {
      self.neighborhoods = neighborhoods;
      fillNeighborhoodsHTML();
    }
  });
}

/**
 * Set neighborhoods HTML.
 */
fillNeighborhoodsHTML = (neighborhoods = self.neighborhoods) => {
  const select = document.getElementById('neighborhoods-select');
  neighborhoods.forEach(neighborhood => {
    const option = document.createElement('option');
    option.innerHTML = neighborhood;
    option.value = neighborhood;
    select.append(option);
  });
}

/**
 * Fetch all cuisines and set their HTML.
 */
fetchCuisines = () => {
  DBHelper.fetchCuisines((error, cuisines) => {
    if (error) { // Got an error!
      console.error(error);
    } else {
      self.cuisines = cuisines;
      fillCuisinesHTML();
    }
  });
}

/**
 * Set cuisines HTML.
 */
fillCuisinesHTML = (cuisines = self.cuisines) => {
  const select = document.getElementById('cuisines-select');

  cuisines.forEach(cuisine => {
    const option = document.createElement('option');
    option.innerHTML = cuisine;
    option.value = cuisine;
    select.append(option);
  });
}

/**
 * Initialize leaflet map, called from HTML.
 */
initMap = () => {
  self.newMap = L.map('map', {
    center: [40.722216, -73.987501],
    zoom: 12,
    scrollWheelZoom: false
  });
  L.tileLayer('https://api.tiles.mapbox.com/v4/{id}/{z}/{x}/{y}.jpg70?access_token={mapboxToken}', {
    mapboxToken: 'pk.eyJ1IjoiYWhtenlqYXp5IiwiYSI6ImNqa3k3b3EwdDBnbHQzcWxtd2o0YWpoamEifQ.wVqwATAT6b69QZM2Z30Fmg',
    maxZoom: 18,
    attribution: 'Map data &copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors, ' +
      '<a href="https://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, ' +
      'Imagery © <a href="https://www.mapbox.com/">Mapbox</a>',
    id: 'mapbox.streets'
  }).addTo(newMap);

  updateRestaurants();
}
/* window.initMap = () => {
  let loc = {
    lat: 40.722216,
    lng: -73.987501
  };
  self.map = new google.maps.Map(document.getElementById('map'), {
    zoom: 12,
    center: loc,
    scrollwheel: false
  });
  updateRestaurants();
} */

/**
 * Update page and map for current restaurants.
 */
updateRestaurants = () => {
  const cSelect = document.getElementById('cuisines-select');
  const nSelect = document.getElementById('neighborhoods-select');

  const cIndex = cSelect.selectedIndex;
  const nIndex = nSelect.selectedIndex;

  const cuisine = cSelect[cIndex].value;
  const neighborhood = nSelect[nIndex].value;

  DBHelper.fetchRestaurantByCuisineAndNeighborhood(cuisine, neighborhood, (error, restaurants) => {
    if (error) { // Got an error!
      console.error(error);
    } else {
      resetRestaurants(restaurants);
      fillRestaurantsHTML();
    }
  })
}

/**
 * Clear current restaurants, their HTML and remove their map markers.
 */
resetRestaurants = (restaurants) => {
  // Remove all restaurants
  self.restaurants = [];
  const ul = document.getElementById('restaurants-list');
  ul.innerHTML = '';

  // Remove all map markers
  if (self.markers) {
    self.markers.forEach(marker => marker.remove());
  }
  self.markers = [];
  self.restaurants = restaurants;
}

/**
 * Create all restaurants HTML and add them to the webpage.
 */
fillRestaurantsHTML = (restaurants = self.restaurants) => {
  const ul = document.getElementById('restaurants-list');
  restaurants.forEach(restaurant => {
    ul.append(createRestaurantHTML(restaurant));
    //register event listener on fav image here
    const favctrls = document.getElementsByClassName('favourite-icon');
    for (var i = 0; i < favctrls.length; i++) {
      favctrls[i].addEventListener('click', addFavourite, false);
    }

  });
  addMarkersToMap();
}

/**
 * Create restaurant HTML.
 */
createRestaurantHTML = (restaurant) => {
  console.log('()=> ', restaurant);

  const li = document.createElement('li');

  const image = document.createElement('img');
  image.className = 'restaurant-img';
  image.src = (restaurant.photograph) ? DBHelper.imageUrlForRestaurant(restaurant) : `/img/no-image.jpg`;
  image.alt = `Photo of ${restaurant.name} restaurant, cuisine type is ${restaurant.cuisine_type}.`;
  li.append(image);

  const name = document.createElement('h2');
  name.innerHTML = restaurant.name;
  li.append(name);

  const neighborhood = document.createElement('p');
  neighborhood.innerHTML = restaurant.neighborhood;
  li.append(neighborhood);

  const address = document.createElement('p');
  address.innerHTML = restaurant.address;
  li.append(address);

  const likeImage = document.createElement('img');
  likeImage.className = 'favourite-icon like';
  likeImage.setAttribute('data-id', restaurant.id);
  likeImage.setAttribute('data-action', 'like');
  likeImage.src = `img/like.png`;
  likeImage.alt = `Like icon for ${restaurant.name} restaurant`;

  const dislikeImage = document.createElement('img');
  dislikeImage.className = 'favourite-icon dislike';
  dislikeImage.setAttribute('data-id', restaurant.id);
  dislikeImage.setAttribute('data-action', 'dislike');
  dislikeImage.src = `img/dislike.png`;
  dislikeImage.alt = `Dislike icon for ${restaurant.name} restaurant`;

  const favWrapper = document.createElement('div');
  favWrapper.className = 'fav-wrapper';

  (restaurant.is_favorite == true || restaurant.is_favorite == "true") ?  favWrapper.append(likeImage) : favWrapper.append(dislikeImage);

  const more = document.createElement('a');
  more.innerHTML = 'View Details';
  more.href = DBHelper.urlForRestaurant(restaurant);

  const actionWrapper = document.createElement('div');
  actionWrapper.className = 'action-wrapper';
  actionWrapper.append(favWrapper);
  actionWrapper.append(more);
  li.append(actionWrapper); 

  return li
}

/**
 * Add or remove favourites
 */
addFavourite = (event) => {
  const id = event.target.getAttribute("data-id");
  const is_favorite = event.target.getAttribute("data-action") == "like" ? false : true;
  DBHelper.postFavourite(id, is_favorite, (error, restaurants) => {
    if (error) { // Got an error!
      console.error(error);
      console.log('cannot post favorite at this time, pls persist')
    } else {
      updateRestaurants();
    }
  })
}


/**
 * Add markers for current restaurants to the map.
 */
addMarkersToMap = (restaurants = self.restaurants) => {
  restaurants.forEach(restaurant => {
    // Add marker to the map
    const marker = DBHelper.mapMarkerForRestaurant(restaurant, self.newMap);
    marker.on("click", onClick);
    function onClick() {
      window.location.href = marker.options.url;
    }
    self.markers.push(marker);
  });

}



