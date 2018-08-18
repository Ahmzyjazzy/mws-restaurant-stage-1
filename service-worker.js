//service worker
var staticCacheName = 'restaurant-static-v1',
    restaurants = 'restaurant-list',
    images = 'restaurant-image',
    restaurant_info = 'restaurant-page';

var allCaches = [
  staticCacheName,
  restaurants,
  images,
  restaurant_info
];

var scope = '/';

var staticFilesToCache = [
  `${scope}`,
  `${scope}index.html`,
  `${scope}css/responsive.css`,
  `${scope}css/styles.css`,
  `${scope}js/dbhelper.js`,
  `${scope}js/main.js`,
  `${scope}js/restaurant_info.js`,
  `${scope}data/restaurants.json`,
];

self.addEventListener('install', function(e) {
  console.log('[ServiceWorker] Install');
  e.waitUntil(
    caches.open(staticCacheName).then(function(cache) {
      console.log('[ServiceWorker] Caching app shell');
      return cache.addAll(staticFilesToCache);
    })
  );
});

self.addEventListener('activate', function(event) {
  event.waitUntil(
    caches.keys().then(function(cacheNames) {
      return Promise.all(
        cacheNames.filter(function(cacheName) {
          console.log('[ServiceWorker] Removing old cache', cacheName);
          return cacheName.startsWith('restaurant-') &&
                 !allCaches.includes(cacheName);
        }).map(function(cacheName) {
          return caches.delete(cacheName);
        })
      );
    })
  );
});


self.addEventListener('fetch', function(event) {
  var requestUrl = new URL(event.request.url);

  if (requestUrl.origin !== location.origin) {    
    //cache other origin file like map resources
    event.respondWith(serveFiles(event.request, 'restaurant-map-assets'));
    return; 
  }

  if (requestUrl.origin == location.origin && requestUrl.pathname.startsWith('/img')) {   
    // response to image file request in the folder
    event.respondWith(serveFiles(event.request, images));
    return; 
  }

  if (requestUrl.origin == location.origin && event.request.url.includes('restaurant.html')) {   
    // restaurant pages - detail info
    console.log(event.request);
    event.respondWith(serveFiles(event.request, restaurant_info));
    return; 
  }


  event.respondWith(
    caches.match(event.request).then(function(response) {
      if (response) return response;
      return fetch(event.request).then(function(response) {
        return response
      }).catch((e)=>{
        console.log(`ServiceWorker failed request: ${event.request}`);
      });
    })
  );
});

function serveFiles(request, cacheName) {
  var storageUrl = (request.url.includes('restaurant.html'))? `restaurant.html/id/${request.url.split('?')[1].slice(3)}` : request.url;

  /*check cache first then network*/
  return caches.open(cacheName).then(function(cache) {
    return cache.match(storageUrl).then(function(response) {
      if (response) return response;

      return fetch(request).then(function(networkResponse) {
        cache.put(storageUrl, networkResponse.clone());
        return networkResponse;
      });
    });
  });
}

self.addEventListener('message', function(event) {
  if (event.data.action === 'skipWaiting') {
    self.skipWaiting();
  }
});
