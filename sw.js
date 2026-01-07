const CACHE_NAME = 'bio-breach-v1';
// Lista de archivos que el celular guardará para que abran sin señal
const assets = [
  './',
  'index.html',
  'versiones.json',
  'manifest.json'
];

// Instalación: El celular descarga los archivos básicos
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      console.log('Hub: Guardando archivos en memoria local...');
      return cache.addAll(assets);
    })
  );
});

// Activación: Limpia memorias viejas si actualizas el Hub
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
      );
    })
  );
});

// Intercepción: Si no hay señal, sirve los archivos desde la memoria
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(cachedResponse => {
      return cachedResponse || fetch(event.request);
    })
  );
});
