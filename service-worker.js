//service worker 
var staticCacheName = 'restaurant-static-v1',
  restaurants = 'restaurant-list',
  images = 'restaurant-image',
  restaurant_info = 'restaurant-page',
  api_store = 'restaurant-api';

var allCaches = [
  staticCacheName,
  restaurants,
  images,
  restaurant_info,
  api_store
];

var scope = '/';

var staticFilesToCache = [
  `${scope}`,
  `${scope}index.html`,
  `${scope}offline.html`,
  `${scope}css/responsive.css`,
  `${scope}css/styles.css`,
  `${scope}js/dbhelper.js`,
  `${scope}js/main.js`,
  `${scope}js/restaurant_info.js`,
  `${scope}js/database.js`
]; 

var offlineUrl = `${scope}offline.html`;

self.addEventListener('install', function (e) {
  console.log('[ServiceWorker] Install');
  e.waitUntil(
    caches.open(staticCacheName).then(function (cache) {
      console.log('[ServiceWorker] Caching app shell');
      return cache.addAll(staticFilesToCache);
    })
  );
});

self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys().then(function (cacheNames) {
      return Promise.all(
        cacheNames.filter(function (cacheName) {
          console.log('[ServiceWorker] Removing old cache', cacheName);
          return cacheName.startsWith('restaurant-') &&
            !allCaches.includes(cacheName);
        }).map(function (cacheName) {
          return caches.delete(cacheName);
        })
      );
    })
  );
});


self.addEventListener('fetch', function (event) {
  var requestUrl = new URL(event.request.url);


  if (requestUrl.origin == location.origin && requestUrl.pathname.startsWith('/img')) {
    // response to image file request in the folder
    event.respondWith(serveFiles(event.request, images));
    return;
  }

  if (requestUrl.origin == location.origin && event.request.url.includes('restaurant.html')) {
    // restaurant pages - detail info
    event.respondWith(serveFiles(event.request, restaurant_info));
    return;
  }
  
  if(requestUrl.origin !== location.origin && (event.request.url.includes('restaurants') || event.request.url.includes('reviews'))){
    console.log("::",requestUrl.origin);
    console.log("::", event.request);
    event.respondWith(serveApi(event, api_store));
    return
  }
  
  if (requestUrl.origin !== location.origin) {
    //cache other origin file like map resources
    event.respondWith(serveFiles(event.request, 'restaurant-map-assets'));
    return;
  }

  event.respondWith(
    caches.match(event.request).then(function (response) {
      if (response) {
        console.log('[served from SERVICEWORKER.]', response);
        return response;
      }
      return fetch(event.request).then(function (response) {
        console.log('[served from NETWORK.]', response);
        return response
      }).catch((e) => {
        /*respond with offline page*/
        console.log(`ServiceWorker failed request:`, event.request);
        return (event.request.url.includes('restaurant.html')) && (
          caches.open(staticCacheName).then(function (cache) {
            return cache.match(offlineUrl).then(function (response) {
              if (response) return response;
            })
          })
        );
        /*END offline response page*/
      });
    })
  );
});

function serveFiles(request, cacheName) {
  var storageUrl = (request.url.includes('restaurant.html')) ? `restaurant.html/id/${request.url.split('?')[1].slice(3)}` : request.url;

  /*check cache first then network*/
  return caches.open(cacheName).then(function (cache) {
    return cache.match(storageUrl).then(function (response) {
      if (response) {
        console.log('[served from SERVICEWORKER.]', response);
        return response;
      }

      return fetch(request).then(function (networkResponse) {
        cache.put(storageUrl, networkResponse.clone());
        console.log('[served from NETWORK.]', storageUrl);
        return networkResponse;
      }).catch((e) => {
        /*respond with offline page*/
        console.log(`ServiceWorker failed request:`, request);
        return (request.url.includes('restaurant.html')) && (
          caches.open(staticCacheName).then(function (cache) {
            return cache.match(offlineUrl).then(function (response) {
              if (response) return response;
            })
          })
        );
        /*END offline response page*/
      });
    });
  });
}

// implementing online first then fallback to cache
async function serveApi(event, cacheName) {
  var storageUrl = `api${event.request.url.split('1337')[1]}`; //remove port from url

  const cache = await caches.open(cacheName);
  const cachedResponse = await cache.match(event.request);
  const networkResponsePromise = fetch(event.request);

  event.waitUntil(async function() {
    const networkResponse = await networkResponsePromise;
    await cache.put(storageUrl, networkResponse.clone());
  }());

  // Returned the network response otherwise return the cached response if we have one.
  return networkResponsePromise || cachedResponse;
}

self.addEventListener('message', function (event) {
  if (event.data.action === 'skipWaiting') {
    self.skipWaiting();
  }
});

