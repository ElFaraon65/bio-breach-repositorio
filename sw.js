const CACHE_NAME = "bio-breach-v3";
const ASSETS = [
  "./",
  "./index.html",
  "./manifest.json"
];

// 1. INSTALACIÓN: Solo guardamos lo crítico local
self.addEventListener("install", (event) => {
  self.skipWaiting(); // Forza la activación inmediata
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS);
    })
  );
});

// 2. ACTIVACIÓN: Limpia versiones viejas
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) return caches.delete(key);
        })
      );
    })
  );
  self.clients.claim();
});

// 3. INTERCEPTOR: Estrategia "Network First" (Mejor para juegos online)
// Intenta bajar de internet primero. Si no hay red, usa la caché.
self.addEventListener("fetch", (event) => {
  event.respondWith(
    fetch(event.request)
      .catch(() => {
        return caches.match(event.request);
      })
  );
});
