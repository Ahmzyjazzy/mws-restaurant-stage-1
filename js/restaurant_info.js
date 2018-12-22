let restaurant;
let newMap;

/**
 * Initialize map as soon as the page is loaded.
 */
document.addEventListener('DOMContentLoaded', (event) => {
  initMap();
  document.getElementById("actionbtn").addEventListener("click", postReview, false);
});

/**
 * Fire events to sync restaurants reviews data to 
 */
window.addEventListener('online', () => {
  console.log('now online');
  DBHelper.retrieveOfflinePost(`reviews_${getParameterByName('id')}`, async (error, restaurants) => {
    const offlinePosts = restaurants.map(post => {
      const { name, rating, restaurant_id, comments } = post;
      return {
        restaurant_id,
        name,
        rating,
        comments
      };
    });
    console.log('syncing offline posts favorites start...', offlinePosts);

    if (offlinePosts.length == 0) { console.log('No data to sync...', offlinePosts); return; }

    offlinePosts.forEach((postObj, i) => {
      DBHelper.postRestaurantReview(postObj, (error, reviews) => {
        console.log(`user ${postObj.name} review post done syncing ${postObj.rating}`);
        if (error) {
          console.log('An error occur while syncing...', error);
          updateRestaurantReviews(postObj.restaurant_id);
          return
        }

        if (i == offlinePosts.length - 1) {          
          //fetch update reviews and load page
          updateRestaurantReviews(postObj.restaurant_id);
        }
      });
    });

  });

})
window.addEventListener('offline', () => {
  console.log('now offline');
})

/**
 * Initialize leaflet map
 */
initMap = () => {
  fetchRestaurantFromURL((error, restaurant) => {
    if (error) { // Got an error!
      console.error(error);
    } else {

      try {
        self.newMap = L.map('map', {
          center: [restaurant.latlng.lat, restaurant.latlng.lng],
          zoom: 16,
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
      } catch (e) {
        console.group(e);
      }
      DBHelper.mapMarkerForRestaurant(self.restaurant, self.newMap);
    }
  });
}

/**
 * Get current restaurant from page URL.
 */
fetchRestaurantFromURL = (callback) => {
  if (self.restaurant) { // restaurant already fetched
    callback(null, self.restaurant)
    return;
  }
  const id = getParameterByName('id');
  if (!id) { // no id found in URL
    error = 'No restaurant id in URL'
    callback(error, null);
  } else {
    DBHelper.fetchRestaurantById(id, (error, restaurant) => {
      self.restaurant = restaurant;
      if (!self.restaurant) {
        console.error(error);
        return;
      }
      fillRestaurantHTML();
      fillBreadcrumb();
      // callback(null, restaurant)
    });
  }
}

/**
 * Create restaurant HTML and add it to the webpage
 */
fillRestaurantHTML = (restaurant = self.restaurant) => {
  const name = document.getElementById('restaurant-name');
  name.innerHTML = restaurant.name;

  const address = document.getElementById('restaurant-address');
  address.innerHTML = restaurant.address;

  const image = document.getElementById('restaurant-img');
  image.className = 'restaurant-img'
  image.src = (restaurant.photograph) ? DBHelper.imageUrlForRestaurant(restaurant) : `/img/no-image.jpg`;
  image.alt = `Photo of ${restaurant.name} restaurant`;

  const cuisine = document.getElementById('restaurant-cuisine');
  cuisine.innerHTML = restaurant.cuisine_type;

  // fill operating hours
  if (restaurant.operating_hours) {
    fillRestaurantHoursHTML();
  }

  DBHelper.fetchRestaurantReview(self.restaurant.id, (error, reviews) => {
    self.restaurant.reviews = reviews;
    if (!reviews) {
      console.error(error);
      return;
    }
    // fill reviews
    fillReviewsHTML();
  });

}

/**
 * Create restaurant operating hours HTML table and add it to the webpage.
 */
fillRestaurantHoursHTML = (operatingHours = self.restaurant.operating_hours) => {
  const hours = document.getElementById('restaurant-hours');
  for (let key in operatingHours) {
    const row = document.createElement('tr');

    const day = document.createElement('td');
    day.innerHTML = key;
    row.appendChild(day);

    const time = document.createElement('td');
    time.innerHTML = operatingHours[key];
    row.appendChild(time);

    hours.appendChild(row);
  }
}

/**
 * Create all reviews HTML and add them to the webpage.
 */
fillReviewsHTML = (reviews = self.restaurant.reviews) => {

  const container = document.getElementById('reviews-container');
  const title = document.createElement('h2');
  title.className = 'review-title';
  title.innerHTML = 'Reviews';
  container.appendChild(title);

  if (!reviews) {
    const noReviews = document.createElement('p');
    noReviews.innerHTML = 'No reviews yet!';
    container.appendChild(noReviews);
    return;
  }
  const ul = document.getElementById('reviews-list');
  reviews.forEach(review => {
    ul.appendChild(createReviewHTML(review));
  });
  container.appendChild(ul);
}

/**
 * Create review HTML and add it to the webpage.
 */
createReviewHTML = (review) => {
  const li = document.createElement('li');
  const name = document.createElement('p');
  name.innerHTML = review.name;
  li.appendChild(name);

  const date = document.createElement('p');
  date.innerHTML = formatDate(review.createdAt);
  li.appendChild(date);

  const rating = document.createElement('p');
  rating.innerHTML = `Rating: ${review.rating}`;
  li.appendChild(rating);

  const comments = document.createElement('p');
  comments.innerHTML = review.comments;
  li.appendChild(comments);

  return li;
}



/**
 * Add restaurant name to the breadcrumb navigation menu
 */
fillBreadcrumb = (restaurant = self.restaurant) => {
  const breadcrumb = document.getElementById('breadcrumb');
  const li = document.createElement('li');
  li.innerHTML = restaurant.name;
  breadcrumb.appendChild(li);
}

/**
 * Get a parameter by name from page URL.
 */
getParameterByName = (name, url) => {
  if (!url)
    url = window.location.href;
  name = name.replace(/[\[\]]/g, '\\$&');
  const regex = new RegExp(`[?&]${name}(=([^&#]*)|&|#|$)`),
    results = regex.exec(url);
  if (!results)
    return null;
  if (!results[2])
    return '';
  return decodeURIComponent(results[2].replace(/\+/g, ' '));
}

/**
 * Post reviews
 */
postReview = (event) => {
  event.preventDefault();
  const name = document.getElementById("sender_name").value;
  const rating = document.getElementById("rating").value;
  const comments = document.getElementById("comment").value;
  const restaurant_id = getParameterByName('id');

  const postObj = {
    restaurant_id,
    name,
    rating,
    comments
  }

  DBHelper.postRestaurantReview(postObj, (error, reviews) => {
    if (error) { // Got an error!
      console.error(error);
    } else {
      console.log('posted reviews', reviews);
      clearForm();
      //fetch update reviews and load page
      updateRestaurantReviews(postObj.restaurant_id);
    }
  })
}

/**
 * Clear review form
 */
clearForm = () => {
  document.getElementById("sender_name").value = "";
  document.getElementById("rating").value = "";
  document.getElementById("comment").value = "";
}

/**
 * Clear review form
 */
formatDate = (d) => {
  const date = new Date(d);
  const monthNames = [
    "January", "February", "March",
    "April", "May", "June", "July",
    "August", "September", "October",
    "November", "December"
  ];
  const day = date.getDate();
  const monthIndex = date.getMonth();
  const year = date.getFullYear();
  return day + ' ' + monthNames[monthIndex] + ' ' + year;
}

/**
 * Update 
 */
updateRestaurantReviews = (restaurant_id) => {
  DBHelper.fetchRestaurantReview(restaurant_id, (error, reviews) => {
    self.restaurant.reviews = reviews;
    if (!reviews) {
      console.error(error);
      return;
    }
    //remove review title
    document.querySelector('.review-title').remove();
    // fill reviews
    fillReviewsHTML();
  });
}