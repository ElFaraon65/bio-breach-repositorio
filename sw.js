const CACHE_NAME = "bio-breach-v2";
const ASSETS_TO_CACHE = [
  "./",
  "./index.html",
  "./manifest.json",
  "https://raw.githubusercontent.com/ElFaraon65/bio-breach-repositorio/main/Logo%20de%20BIO-BREACH.png"
];

// 1. INSTALACIÓN: Descarga los archivos clave
self.addEventListener("install", (event) => {
  self.skipWaiting(); // Forza la activación inmediata
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
});

// 2. ACTIVACIÓN: Limpia cachés viejas
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            return caches.delete(cache);
          }
        })
      );
    })
  );
  self.clients.claim(); // Toma control de la página inmediatamente
});

// 3. INTERCEPTOR (FETCH): Sirve desde caché si no hay internet
self.addEventListener("fetch", (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      // Si está en caché, lo devuelve. Si no, lo busca en internet.
      return response || fetch(event.request).catch(() => {
        // Si no hay internet y no está en caché, devuelve el index (modo offline)
        if (event.request.mode === 'navigate') {
          return caches.match('./index.html');
        }
      });
    })
  );
});
