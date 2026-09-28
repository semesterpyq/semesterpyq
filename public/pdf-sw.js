const PDF_CACHE_NAME = 'lbs-pdf-cache-v1';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  if (url.pathname.startsWith('/api/papers/') && url.pathname.includes('/view/')) {
    event.respondWith(
      (async () => {
        try {
          const cache = await caches.open(PDF_CACHE_NAME);
          const cachedResponse = await cache.match(url.pathname) || await cache.match(event.request);
          if (cachedResponse) {
            return cachedResponse;
          }
        } catch (err) {
          // Continue to network fallback
        }
        return fetch(event.request);
      })()
    );
  }
});
