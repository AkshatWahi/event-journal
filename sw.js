// Event Journal — Service Worker
// Caches the app shell for full offline support

const CACHE = 'event-journal-v6';
const SHELL = [
  './',
  './index.html',
  'https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600&family=IBM+Plex+Sans:wght@300;400;500;600&display=swap',
];

// Install: cache app shell
self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE).then(cache => cache.addAll(SHELL).catch(() => {}))
  );
});

// Activate: remove old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// Fetch: cache-first for app shell, network-first for everything else
self.addEventListener('fetch', event => {
  // Skip non-GET and chrome-extension requests
  if (event.request.method !== 'GET') return;
  if (!event.request.url.startsWith('http')) return;

  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request).then(response => {
        // Cache same-origin and font responses
        if (response.ok && (
          event.request.url.includes(self.location.origin) ||
          event.request.url.includes('fonts.googleapis.com') ||
          event.request.url.includes('fonts.gstatic.com')
        )) {
          const clone = response.clone();
          caches.open(CACHE).then(c => c.put(event.request, clone));
        }
        return response;
      }).catch(() => cached || new Response('Offline', { status: 503 }));
    })
  );
});
