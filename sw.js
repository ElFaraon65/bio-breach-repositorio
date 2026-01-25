// --- FIREBASE MESSAGING INTEGRATION ---
importScripts('https://www.gstatic.com/firebasejs/9.22.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.22.0/firebase-messaging-compat.js');

const firebaseConfig = {
  apiKey: "AIzaSyBmn_I9e9RWS6nwk95o-MYR45DTepe3Gzw",
  authDomain: "bio-breach-game.firebaseapp.com",
  projectId: "bio-breach-game",
  storageBucket: "bio-breach-game.firebasestorage.app",
  messagingSenderId: "446020506947",
  appId: "1:446020506947:web:27e1b80ca7e8713b788bf6",
  measurementId: "G-19C40FDYJZ"
};

firebase.initializeApp(firebaseConfig);
const messaging = firebase.messaging();

// NOTA: Mantenemos tu listener 'push' personalizado para controlar 
// la lógica de updates vs returns.

// --- LÓGICA ORIGINAL ---
const CACHE_NAME = "bio-breach-v5";
const ASSETS = [
  "./",
  "./index.html",
  "./manifest.json",
  "./Logo%20BIO-BREACH.png",
  "./NOTIFICACIONES%20BIO-BREACH.jpeg"
];

// 1. INSTALACIÓN
self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS);
    })
  );
});

// 2. ACTIVACIÓN
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

// 3. INTERCEPTOR
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
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-datos') {
    console.log('SW: Sincronización de fondo');
  }
});

self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'sync-periodico') {
    console.log('SW: Sincronización periódica');
  }
});

// 5. GESTIÓN DE NOTIFICACIONES INTELIGENTES
self.addEventListener('push', (event) => {
  console.log('SW: Notificación Push recibida');

  const ICON_DEFAULT = "./Logo%20BIO-BREACH.png"; 
  // TODO: Reemplaza esto con tu URL real cuando la tengas
  const ICON_UPDATE = "./NOTIFICACIONES%20BIO-BREACH.jpeg"; 

  // Parseamos los datos que envías desde el servidor
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
    // Si viene de Firebase como "data payload", a veces está dentro de data.data
    if (data.data) data = data.data; 
  } catch (e) {
    // Si no es JSON, asumimos formato básico
    data = { type: 'general', body: event.data ? event.data.text() : 'Aviso del Sistema' };
  }

  // --- LÓGICA DE FILTRADO ---
  
  // Función para detectar si es un parche menor (X.Y.1, X.Y.2...)
  // Retorna TRUE si es un parche, FALSE si es una versión mayor (X.Y.0)
  const esParcheMenor = (version) => {
      if (!version) return false; // Si no hay versión, asumimos que es importante
      const partes = version.split('.'); // Divide "1.2.5" en ["1", "2", "5"]
      if (partes.length < 3) return false; 
      
      // Si el último número (Parche) es mayor a 0, es un fix menor.
      const parche = parseInt(partes[2]);
      return parche > 0;
  };

  let title = 'BIO-BREACH HUB';
  let options = {
    body: data.body || 'Atención requerida.',
    icon: ICON_DEFAULT,
    badge: ICON_DEFAULT,
    vibrate: [100, 50, 100],
    data: { url: './index.html' },
    tag: 'general'
  };

  // CASO A: ACTUALIZACIÓN (Update)
  if (data.type === 'update') {
      
    // EL CEREBRO: Verifica si la versión enviada (ej: "1.0.4") es solo un parche
    if (esParcheMenor(data.version) && !data.force) {
        console.log(`SW: Versión ${data.version} detectada como parche menor. Notificación silenciada.`);
        return; // DETIENE LA EJECUCIÓN AQUÍ. No muestra nada.
    }

    // Si pasa el filtro, configuramos la alerta visual
    title = data.title || "¡NUEVA VERSIÓN DEL SISTEMA!";
    options.body = data.body || `La versión ${data.version} incluye nuevo contenido.`;
    options.icon = ICON_UPDATE;
    options.image = ICON_UPDATE; // Imagen grande para Android
    options.tag = 'app-update';
    options.vibrate = [200, 100, 200, 100, 500]; // Vibración larga
    options.requireInteraction = true; // No desaparece sola
  }

  // CASO B: REGRESO (Return / Engagement)
  else if (data.type === 'return') {
    title = "SISTEMA EN ESPERA";
    options.body = "Agente, el sistema requiere supervisión.";
    options.icon = ICON_DEFAULT; // Mantiene identidad visual clásica
    options.tag = 'user-return';
    options.vibrate = [50, 50]; // Muy sutil
    options.actions = [
        { action: 'open', title: 'Entrar' }
    ];
  }

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (let i = 0; i < windowClients.length; i++) {
        const client = windowClients[i];
        if (client.url.includes('index.html') && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow('./index.html');
      }
    })
  );
});
