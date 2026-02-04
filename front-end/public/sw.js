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

  // Skip caching non-HTTP(S) requests (chrome-extension, etc.)
  if (!url.protocol.startsWith('http')) {
    return;
  }

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
      const url = new URL(request.url);
      
      // Only cache HTTP(S) GET requests (not POST, PUT, DELETE, etc.)
      if (url.protocol.startsWith('http') && request.method === 'GET') {
        caches.open(API_CACHE).then((cache) => {
          cache.put(request, responseToCache);
        });
      }
      
      return response;
    })
    .catch((error) => {
      console.error('Fetch error:', error);
      return caches.match(request).then((response) => {
        if (response) {
          return response;
        }
        // Return error response if nothing in cache
        return new Response('Network error and no cached response available', {
          status: 503,
          statusText: 'Service Unavailable',
          headers: new Headers({
            'Content-Type': 'text/plain'
          })
        });
      });
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
      .catch((error) => {
        console.error('Fetch error in cacheFirstStrategy:', error);
        return new Response('Network error and no cached response available', {
          status: 503,
          statusText: 'Service Unavailable',
          headers: new Headers({
            'Content-Type': 'text/plain'
          })
        });
      });
  });
}

// Stale while revalidate strategy: return cache, update in background
function staleWhileRevalidateStrategy(request) {
  return caches.match(request).then((response) => {
    const fetchPromise = fetch(request)
      .then((response) => {
        if (!response || response.status !== 200) {
          return response;
        }
        
        const responseToCache = response.clone();
        const url = new URL(request.url);
        
        if (url.protocol.startsWith('http')) {
          caches.open(STATIC_CACHE).then((cache) => {
            cache.put(request, responseToCache);
          });
        }
        
        return response;
      })
      .catch((error) => {
        console.error('Fetch error in staleWhileRevalidateStrategy:', error);
        // If fetch fails and we have cache, just return it silently
        if (response) {
          return response;
        }
        return new Response('Network error and no cached response available', {
          status: 503,
          statusText: 'Service Unavailable',
          headers: new Headers({
            'Content-Type': 'text/plain'
          })
        });
      });
    
    // Return cached response immediately if available, fetch in background
    return response || fetchPromise;
  });
}
