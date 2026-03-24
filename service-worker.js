const CACHE_NAME = 'benefitai-v1';
const PRECACHE_URLS = [
  './index.html',
  './recommend.html',
  './account.html',
  './detail.html',
  './notice.html',
  './style.css',
  './app.js',
  './recommend.js',
  './detail.js',
  './subsidies.csv',
  './subsidies_sp.csv',
  './manifest.webmanifest',
  './icon/app_icon.png',
  './icon/search.svg',
  './icon/human.svg',
  './icon/notice.svg',
];

self.addEventListener('install', function (event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function (cache) {
      return cache.addAll(PRECACHE_URLS);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(
        keys.filter(function (key) {
          return key !== CACHE_NAME;
        }).map(function (key) {
          return caches.delete(key);
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', function (event) {
  event.respondWith(
    caches.match(event.request).then(function (cached) {
      if (cached) {
        return cached;
      }
      return fetch(event.request).then(function (response) {
        if (!response || response.status !== 200 || response.type === 'opaque') {
          return response;
        }
        var toCache = response.clone();
        caches.open(CACHE_NAME).then(function (cache) {
          cache.put(event.request, toCache);
        });
        return response;
      });
    })
  );
});
