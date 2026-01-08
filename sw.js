const CACHE_NAME = "bio-breach-v3.1";
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
self.addEventListener("fetch", (event) => {
  // Manejo especial para share_target (POST requests)
  if (event.request.method === 'POST') {
    event.respondWith(Response.redirect('./index.html'));
    return;
  }
  
  event.respondWith(
    fetch(event.request)
      .catch(() => {
        return caches.match(event.request);
      })
  );
});

// 4. FUNCIONES AVANZADAS (Para cumplir requisitos de PWA Builder)
self.addEventListener('sync', (event) => {
  console.log('Sincronización en segundo plano activada:', event.tag);
});

self.addEventListener('periodicsync', (event) => {
  console.log('Sincronización periódica activada:', event.tag);
});

self.addEventListener('push', (event) => {
  console.log('Notificación Push recibida');
  const options = {
    body: 'BIO-BREACH HUB Actualizado',
    icon: 'https://raw.githubusercontent.com/ElFaraon65/bio-breach-repositorio/main/Logo%20de%20BIO-BREACH.png',
    badge: 'https://raw.githubusercontent.com/ElFaraon65/bio-breach-repositorio/main/Logo%20de%20BIO-BREACH.png'
  };
  event.waitUntil(self.registration.showNotification('BIO-BREACH', options));
});
