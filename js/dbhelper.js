/**
 * Common database helper functions.
 */
class DBHelper {

  /**
   * Database URL.
   * Change this to restaurants.json file location on your server.
   */
  static get DATABASE_URL() {
    const port = 1337; // Change this to your server port
    return `http://localhost:${port}/`;
  }

  /**
   * Fetch all restaurants.
   */
  static fetchRestaurants(callback) {
    fetch(`${DBHelper.DATABASE_URL}restaurants`)
      .then(response => response.json())
      .then(restaurants => {
        DBHelper.updateLocalDB('restaurants', restaurants, (error, data) => {
          callback(null, data);
        });
      })
      .catch(error => {
        //check index db here if data exist
        localforage.getItem('restaurants')
          .then(res => callback(null, res))
          .catch(err => callback(error.message, null));
      })
  }


  /**
   * Fetch a restaurant by its ID.
   */
  static fetchRestaurantById(id, callback) {
    // fetch all restaurants with proper error handling.
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        const restaurant = restaurants.find(r => r.id == id);
        if (restaurant) { // Got the restaurant
          callback(null, restaurant);
        } else { // Restaurant does not exist in the database
          callback('Restaurant does not exist', null);
        }
      }
    });
  }

  /**
   * Update local DB
   */
  static updateLocalDB(type, onlineData, callback) {
    if (type == 'restaurants') {
      //save result to local storage
      localforage.setItem(type, onlineData);
      console.log('local DB updated...');
      callback(null, onlineData);
    } else {
      //for reviews
      localforage.removeItem(type).then(res => {
        localforage.setItem(type, onlineData);
        console.log('local DB updated...');
        callback(null, onlineData);
      });
    }
  }


  /**
   * Fetch restaurants by a cuisine type with proper error handling.
   */
  static fetchRestaurantByCuisine(cuisine, callback) {
    // Fetch all restaurants  with proper error handling
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        // Filter restaurants to have only given cuisine type
        const results = restaurants.filter(r => r.cuisine_type == cuisine);
        callback(null, results);
      }
    });
  }

  /**
   * Fetch restaurants by a neighborhood with proper error handling.
   */
  static fetchRestaurantByNeighborhood(neighborhood, callback) {
    // Fetch all restaurants
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        // Filter restaurants to have only given neighborhood
        const results = restaurants.filter(r => r.neighborhood == neighborhood);
        callback(null, results);
      }
    });
  }

  /**
   * Fetch restaurants by a cuisine and a neighborhood with proper error handling.
   */
  static fetchRestaurantByCuisineAndNeighborhood(cuisine, neighborhood, callback) {
    // Fetch all restaurants
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        let results = restaurants
        if (cuisine != 'all') { // filter by cuisine
          results = results.filter(r => r.cuisine_type == cuisine);
        }
        if (neighborhood != 'all') { // filter by neighborhood
          results = results.filter(r => r.neighborhood == neighborhood);
        }
        callback(null, results);
      }
    });
  }

  /**
   * Fetch all neighborhoods with proper error handling.
   */
  static fetchNeighborhoods(callback) {
    // Fetch all restaurants
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        // Get all neighborhoods from all restaurants
        const neighborhoods = restaurants.map((v, i) => restaurants[i].neighborhood)
        // Remove duplicates from neighborhoods
        const uniqueNeighborhoods = neighborhoods.filter((v, i) => neighborhoods.indexOf(v) == i)
        callback(null, uniqueNeighborhoods);
      }
    });
  }

  /**
   * Fetch all cuisines with proper error handling.
   */
  static fetchCuisines(callback) {
    // Fetch all restaurants
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        // Get all cuisines from all restaurants
        const cuisines = restaurants.map((v, i) => restaurants[i].cuisine_type)
        // Remove duplicates from cuisines
        const uniqueCuisines = cuisines.filter((v, i) => cuisines.indexOf(v) == i)
        callback(null, uniqueCuisines);
      }
    });
  }

  /**
  * Fetch all reviews for a restaurant.
  */
  static fetchRestaurantReview(id, callback) {
    fetch(`${DBHelper.DATABASE_URL}reviews/?restaurant_id=${id}`)
      .then(response => response.json())
      .then(reviews => {
        //store data for offline use
        console.log('newly fetched reviews', reviews);
        DBHelper.updateLocalDB(`reviews_${id}`, reviews, (error, data) => {
          callback(null, data);
        });
      })
      .catch(error => {
        //check index db here if data exist
        localforage.getItem(`reviews_${id}`)
          .then(res => callback(null, res))
          .catch(err => callback(error.message, null));
      })
  }


  /**
   * Favourite -PUT 
   */
  static postFavourite(id, isfav, callback) {
    fetch(`${DBHelper.DATABASE_URL}restaurants/${id}/?is_favorite=${isfav}`, {
      method: 'PUT',
      body: JSON.stringify({ id: id }),
      headers: {
        'Content-Type': 'application/json'
      }
    })
      .then(response => response.json())
      .then(restaurant => {
        callback(null, restaurant)
      })
      .catch(err => {
        //update locally and return result - add isOffline = true to object
        DBHelper.fetchRestaurants((error, restaurants) => {
          if (error) {
            callback(error, null);
          } else {
            let newRestaurants = restaurants.map((r) => {
              if (r.id == id) {
                r['is_offline'] = true;
                r['is_favorite'] = isfav;
              }
              return r;
            });
            //update local copy before callback
            localforage.setItem('restaurants', newRestaurants);
            (newRestaurants.length > 0) ? callback(null, newRestaurants) : callback('Restaurant does not exist', null);
          }
        });

      });

  }

  /**
    * Restuarant reviews -POST
    */
  static postRestaurantReview(formObj, callback) {

    fetch(`${DBHelper.DATABASE_URL}reviews/`, {
      method: 'POST',
      cache: "no-cache",
      body: JSON.stringify(formObj),
      headers: {
        'Content-Type': 'application/json'
      }
    })
      .then(response => response.json())
      .then(review => callback(null, review))
      .catch(error => {
        console.log('offline post', formObj);
        //update locally and return result - add isOffline = true to object
        DBHelper.fetchRestaurantReview(formObj.restaurant_id, (error, reviews) => {
          const { restaurant_id, name, rating, comments } = formObj;
          if (error) {
            callback(error, null);
          } else {
            let newReviews = [...reviews, {
              restaurant_id,
              name,
              rating,
              comments,
              createdAt: new Date(),
              is_offline: true
            }];
            //update local copy before callback
            localforage.setItem(`reviews_${formObj.restaurant_id}`, newReviews);
            (newReviews.length > 0) ? callback(null, newReviews) : callback('Review does not exist', null);
          }
        });

        callback(error.message, null)
      });
  }

  /**
   * Restaurant page URL.
   */
  static urlForRestaurant(restaurant) {
    return (`./restaurant.html?id=${restaurant.id}`);
  }

  /**
   * Restaurant image URL.
   */
  static imageUrlForRestaurant(restaurant) {
    return (`/img/${restaurant.photograph}.jpg`);
  }

  /**
   * Map marker for a restaurant.
   */
  static mapMarkerForRestaurant(restaurant, map) {
    // https://leafletjs.com/reference-1.3.0.html#marker  
    const marker = new L.marker([restaurant.latlng.lat, restaurant.latlng.lng],
      {
        title: restaurant.name,
        alt: restaurant.name,
        url: DBHelper.urlForRestaurant(restaurant)
      })
    marker.addTo(newMap);
    return marker;
  }

  /**
   *  Retrieve offline posts
   */
  static retrieveOfflinePost(type, callback) {
    console.log('params.type ', type);
    localforage.getItem(type)
      .then(data => callback(null, data.filter(r => r.is_offline)))
      .catch(err => callback(err, null));
  }

  /**
   * Synchronize favorite posts and reviews
   */
  static backgroundSync(type, callback) {
    if (!navigator.onLine) return;
    DBHelper.retrieveOfflinePost(type, (error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        callback(null, restaurants);
      }
    });
  }

  /* static mapMarkerForRestaurant(restaurant, map) {
    const marker = new google.maps.Marker({
      position: restaurant.latlng,
      title: restaurant.name,
      url: DBHelper.urlForRestaurant(restaurant),
      map: map,
      animation: google.maps.Animation.DROP}
    );
    return marker;
  } */

}

