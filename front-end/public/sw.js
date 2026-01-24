const CACHE_NAME = 'indumine-v1';
const STATIC_CACHE = 'indumine-static-v1';
const API_CACHE = 'indumine-api-v1';
const IMAGE_CACHE = 'indumine-images-v1';

// Assets to cache on install
const STATIC_ASSETS = [
  '/',
  '/index.html',
];

// Install event: cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      console.log('Caching static assets');
      return cache.addAll(STATIC_ASSETS).catch(err => {
        console.warn('Some static assets failed to cache:', err);
      });
    })
  );
  self.skipWaiting();
});

// Activate event: clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== STATIC_CACHE && 
              cacheName !== API_CACHE && 
              cacheName !== IMAGE_CACHE) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch event: implement smart caching strategies
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Handle API requests
  if (url.pathname.startsWith('/api')) {
    event.respondWith(networkFirstStrategy(request));
    return;
  }

  // Handle image requests
  if (request.destination === 'image') {
    event.respondWith(cacheFirstStrategy(request, IMAGE_CACHE));
    return;
  }

  // Handle navigation requests
  if (request.mode === 'navigate') {
    event.respondWith(networkFirstStrategy(request));
    return;
  }

  // Default: stale-while-revalidate for other assets
  event.respondWith(staleWhileRevalidateStrategy(request));
});

// Network first strategy: try network, fallback to cache
function networkFirstStrategy(request) {
  return fetch(request)
    .then((response) => {
      if (!response || response.status !== 200) {
        return response;
      }
      
      const responseToCache = response.clone();
      caches.open(API_CACHE).then((cache) => {
        cache.put(request, responseToCache);
      });
      
      return response;
    })
    .catch(() => {
      return caches.match(request);
    });
}

// Cache first strategy: use cache, fallback to network
function cacheFirstStrategy(request, cacheName) {
  return caches.match(request).then((response) => {
    if (response) {
      return response;
    }
    
    return fetch(request)
      .then((response) => {
        if (!response || response.status !== 200) {
          return response;
        }
        
        const responseToCache = response.clone();
        caches.open(cacheName).then((cache) => {
          cache.put(request, responseToCache);
        });
        
        return response;
      })
      .catch(() => {
        // Return a placeholder response for images
        if (request.destination === 'image') {
          return new Response(
            '<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><rect fill="#f3f4f6" width="100" height="100"/><text x="50" y="50" font-size="12" fill="#d1d5db" text-anchor="middle" dominant-baseline="middle">Offline</text></svg>',
            { headers: { 'Content-Type': 'image/svg+xml' } }
          );
        }
        return new Response('Offline - Content not available', { status: 503 });
      });
  });
}

// Stale-while-revalidate strategy
function staleWhileRevalidateStrategy(request) {
  return caches.open(CACHE_NAME).then((cache) => {
    return cache.match(request).then((response) => {
      const fetchPromise = fetch(request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            cache.put(request, networkResponse.clone());
          }
          return networkResponse;
        })
        .catch(() => response);

      return response || fetchPromise;
    });
  });
}
