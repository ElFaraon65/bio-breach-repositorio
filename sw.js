const CACHE_NAME = "bio-breach-v5";
const ASSETS = [
  "./",
  "./index.html",
  "./manifest.json",
  "./Logo%20BIO-BREACH.png",
  "./NOTIFICACIONES%20BIO-BREACH.jpeg"
];

// CONFIGURACIÓN DE TIEMPO (24 horas)
const TIEMPO_PARA_RETORNO = 24 * 60 * 60 * 1000; 
//const TIEMPO_PARA_RETORNO = 10000; // Descomenta para pruebas de 10 segundos

// 1. INSTALACIÓN
self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
});

// 2. ACTIVACIÓN
self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
  console.log("SW: Sistema de Disparo Programado Activo.");
});

// 3. INTERCEPTOR DE RED (Tu lógica original intacta)
self.addEventListener("fetch", (event) => {
  if (event.request.method === 'POST') {
    event.respondWith(Response.redirect('./index.html'));
    return;
  }
  // Estrategia específica para versiones.json
  if (event.request.url.includes('versiones.json')) {
      event.respondWith(
          fetch(event.request).catch(() => caches.match(event.request))
      );
      return;
  }
  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request))
  );
});

// 4. PUENTE DE COMUNICACIÓN (Aquí está la magia para app cerrada)
self.addEventListener('message', async (event) => {
    const data = event.data;

    // A) USUARIO SE VA -> PROGRAMAR LA BOMBA DE TIEMPO
    if (data.type === 'SCHEDULE_ALARM') {
        const targetTime = Date.now() + TIEMPO_PARA_RETORNO;
        console.log(`SW: Programando retorno para dentro de 24h.`);

        // Usamos TimestampTrigger para que Android maneje la notificación aunque el navegador muera
        const trigger = 'showTrigger' in Notification.prototype 
            ? new TimestampTrigger(targetTime) 
            : null;

        // Si el navegador soporta Triggers (Android moderno), lo programamos
        if (trigger) {
            self.registration.showNotification("SISTEMA EN ESPERA", {
                body: "Tus casos han sido renovados, anímate, ¡Es hora de encontrar al culpable! ¡Qué no se te escape!",
                icon: "./Logo%20BIO-BREACH.png",
                badge: "./Logo%20BIO-BREACH.png",
                tag: 'user-return-alarm', // Tag fijo para controlar duplicados
                data: { url: './index.html' },
                showTrigger: trigger // <--- ESTO MANTIENE VIVA LA ALERTA
            });
        } else {
            // Fallback para navegadores antiguos (menos fiable si cierras la app, pero es lo que hay)
            setTimeout(() => {
                 lanzarNotificacionRetorno();
            }, TIEMPO_PARA_RETORNO);
        }
    }

    // B) USUARIO VUELVE -> DESACTIVAR LA BOMBA
    if (data.type === 'CANCEL_ALARM') {
        console.log("SW: Usuario activo. Cancelando alarmas pendientes.");
        
        // Buscamos las notificaciones programadas y las borramos
        const notifications = await self.registration.getNotifications({
            tag: 'user-return-alarm',
            includeTriggered: true 
        });
        notifications.forEach(notification => notification.close());

        // Ya que estamos despiertos, revisamos updates
        if (data.version) checkUpdates(data.version);
    }
    
    // Configuración de versión inicial
    if (data.type === 'SET_VERSION') {
        checkUpdates(data.version);
    }
});

// 5. FUNCIONES AUXILIARES (Tus textos originales)

function lanzarNotificacionRetorno() {
    return self.registration.showNotification("SISTEMA EN ESPERA", {
        body: "Tus casos han sido renovados, anímate, ¡Es hora de encontrar al culpable! ¡Qué no se te escape!",
        icon: "./Logo%20BIO-BREACH.png",
        tag: 'user-return-alarm',
        data: { url: './index.html' },
        requireInteraction: true
    });
}

async function checkUpdates(versionLocal) {
    // No chequeamos si el usuario está jugando activamente para no molestar,
    // pero si acabamos de abrir la app (CANCEL_ALARM), sí chequeamos.
    try {
        const res = await fetch('https://elfaraon65.github.io/bio-breach-repositorio/versiones.json?t=' + Date.now());
        const data = await res.json();
        // Ordenar por ID descendente
        data.sort((a, b) => parseInt(b.id.replace(/\D/g, '')) - parseInt(a.id.replace(/\D/g, '')));
        
        const ultima = data[0];
        if (ultima && ultima.version !== versionLocal) {
            self.registration.showNotification("¡NUEVA VERSIÓN DISPONIBLE!", {
                body: `La versión ${ultima.version} de ${ultima.nombre} está lista.`,
                icon: "./NOTIFICACIONES%20BIO-BREACH.jpeg",
                tag: 'update-' + ultima.version,
                data: { url: './index.html' }
            });
        }
    } catch (e) { 
        console.log("SW: Sin red para updates."); 
    }
}

// 6. CLIC EN NOTIFICACIÓN
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Intentar enfocar ventana existente
      for (const client of clientList) {
        if (client.url.includes('index.html') && 'focus' in client) {
            client.postMessage({ type: 'USER_ACTIVE' });
            return client.focus();
        }
      }
      // Si no, abrir nueva
      if (clients.openWindow) return clients.openWindow('./index.html');
    })
  );
});
