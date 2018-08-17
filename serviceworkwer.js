//service worker 
var staticCacheName = 'restaurant-static-v1',
    restaurants = 'restaurant-list',
    images = 'restaurant-image',

var allCaches = [
  staticCacheName,
  restaurants,
  images
];

var scope = '/';

var staticFilesToCache = [
  `${scope}`,
  `${scope}index.html`,
  `${scope}css/responsive.css`,
  `${scope}css/style.css`,
  `${scope}js/dbhelper.js`,
  `${scope}js/main.js`,
  `${scope}js/restaurant_info.js`,
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

    return; 
  }

  if (requestUrl.origin == location.origin) {    
    // response to image file request in the folder
    console.log(requestUrl);    
    return; 
  }

  // response to other static files request
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
  var storageUrl = (request.url.endsWith('currencies?'))? request.url.slice(8).split('/')[3] : request.url;
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
