const CACHE_NAME = 'bio-breach-v6';
const ASSETS = [
  './',
  './index.html'
];

// Instalar y guardar en caché
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
});

// Interceptar peticiones para servir desde caché si no hay red
self.addEventListener('fetch', (e) => {
  e.respondWith(
    caches.match(e.request).then((res) => res || fetch(e.request))
  );
});
