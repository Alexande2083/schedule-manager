const CACHE_NAME = 'schedule-manager-v2';
const RUNTIME_CACHE = 'schedule-manager-runtime-v2';

const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icons/icon-192.svg',
  '/icons/icon-512.svg',
];

// ─── Install: pre-cache static assets ───
self.addEventListener('install', ((event: ExtendableEvent) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
}) as EventListener);

// ─── Activate: clean old caches ───
self.addEventListener('activate', ((event: ExtendableEvent) => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(k => k !== CACHE_NAME && k !== RUNTIME_CACHE).map(k => caches.delete(k))
      )
    )
  );
  self.clients.claim();
}) as EventListener);

// ─── Fetch: smart strategy ───
self.addEventListener('fetch', ((event: FetchEvent) => {
  const url = new URL(event.request.url);

  // API / sync: network-only, no cache
  if (url.pathname.startsWith('/api/')) {
    return;
  }

  // Static assets (JS/CSS/images): cache-first with network update
  if (
    url.pathname.match(/\.(js|css|png|jpg|jpeg|gif|webp|svg|ico|woff2?)$/) ||
    url.pathname.startsWith('/assets/')
  ) {
    event.respondWith(
      caches.match(event.request).then(cached => {
        const networkFetch = fetch(event.request).then(response => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          }
          return response;
        });
        return cached || networkFetch;
      })
    );
    return;
  }

  // HTML / navigation: network-first, fallback to cached index.html
  event.respondWith(
    fetch(event.request)
      .then(response => {
        if (response.ok && response.type === 'basic') {
          const clone = response.clone();
          caches.open(RUNTIME_CACHE).then(cache => cache.put(event.request, clone));
        }
        return response;
      })
      .catch(() => caches.match('/index.html'))
  );
}) as EventListener);

export {};
