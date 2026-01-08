const CACHE_NAME = 'bio-breach-v1';
const assets = [
  './',
  'index.html',
  'manifest.json'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      // Usamos un bucle para que si un archivo falla, los demás sí se guarden
      return Promise.allSettled(
        assets.map(asset => cache.add(asset))
      );
    })
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(response => {
      return response || fetch(event.request);
    })
  );
});
