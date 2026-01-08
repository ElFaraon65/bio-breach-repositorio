const CACHE_NAME = "bio-breach-v4.1-final";
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

// 3. INTERCEPTOR: Estrategia "Network First"
self.addEventListener("fetch", (event) => {
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

// 4. FUNCIONES AVANZADAS (PWA BUILDER & SYNC)

// Background Sync
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-datos') {
    console.log('SW: Ejecutando sincronización de fondo (sync-datos)');
    // Aquí iría la lógica real de sincronización, por ahora solo valida la función
  }
});

// Periodic Sync
self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'sync-periodico') {
    console.log('SW: Ejecutando sincronización periódica (sync-periodico)');
    // Aquí se actualizaría contenido cada 12h-24h
  }
});

// Push Notifications
self.addEventListener('push', (event) => {
  console.log('SW: Notificación Push recibida');
  
  const options = {
    body: event.data ? event.data.text() : 'BIO-BREACH HUB: Nueva versión disponible',
    icon: 'https://raw.githubusercontent.com/ElFaraon65/bio-breach-repositorio/main/Logo%20de%20BIO-BREACH.png',
    badge: 'https://raw.githubusercontent.com/ElFaraon65/bio-breach-repositorio/main/Logo%20de%20BIO-BREACH.png',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1
    }
  };
  
  event.waitUntil(
    self.registration.showNotification('BIO-BREACH HUB', options)
  );
});

// Clic en notificación
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.openWindow('./index.html')
  );
});
