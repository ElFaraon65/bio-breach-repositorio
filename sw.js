const CACHE_NAME = "bio-breach-v5";
const ASSETS = [
  "./",
  "./index.html",
  "./manifest.json",
  "./Logo%20BIO-BREACH.png",
  "./NOTIFICACIONES%20BIO-BREACH.jpeg"
];

// INTERVALO BASE (4 HORAS)
const TIEMPO_PARA_RETORNO = 4 * 60 * 60 * 1000; 

// --- ZONA DE CONFIGURACIÓN NOCTURNA ---
const HORA_DORMIR = 22; // 10 PM (22:00) - Inicio silencio
const HORA_DESPERTAR = 8; // 8 AM (08:00) - Fin silencio

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
  console.log("SW: Sistema (4h) + Guardia Nocturna Activo.");
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

// 4. SISTEMA DE ALARMA INTELIGENTE
self.addEventListener('message', async (event) => {
    const data = event.data;

    // A) USUARIO SE VA -> PROGRAMAR LA BOMBA DE TIEMPO
    if (data.type === 'SCHEDULE_ALARM') {
        let tiempoObjetivo = Date.now() + TIEMPO_PARA_RETORNO;
        let fechaObjetivo = new Date(tiempoObjetivo);
        let hora = fechaObjetivo.getHours();

        console.log(`SW: Calculando disparo para: ${fechaObjetivo.toLocaleTimeString()}`);

        // --- LÓGICA DE GUARDIA NOCTURNA ---
        // Si cae entre las 22:00 (10 PM) y las 07:59 (8 AM casi)
        if (hora >= HORA_DORMIR || hora < HORA_DESPERTAR) {
            console.log("SW: Horario nocturno detectado. Reprogramando para la mañana.");
            
            // Creamos una fecha para "mañana a las 8:00 AM" o "hoy a las 8:00 AM"
            let nuevaFecha = new Date(tiempoObjetivo);
            
            if (hora >= HORA_DORMIR) {
                // Si son las 11 PM, pasamos al día siguiente
                nuevaFecha.setDate(nuevaFecha.getDate() + 1);
            }
            // (Si es la madrugada, ya estamos en el día correcto)
            
            nuevaFecha.setHours(HORA_DESPERTAR, 0, 0, 0); // Fijar a las 08:00:00 exactas
            tiempoObjetivo = nuevaFecha.getTime();
            
            console.log(`SW: Reprogramado para: ${nuevaFecha.toLocaleString()}`);
        }
        // ----------------------------------

        // Usamos TimestampTrigger para que Android maneje la notificación aunque el navegador muera
        const trigger = 'showTrigger' in Notification.prototype 
            ? new TimestampTrigger(tiempoObjetivo) 
            : null;

        if (trigger) {
            self.registration.showNotification("SISTEMA EN ESPERA", {
                body: "Tus casos han sido renovados, anímate, ¡Es hora de encontrar al culpable! ¡Qué no se te escape!",
                icon: "./Logo%20BIO-BREACH.png",
                badge: "./Logo%20BIO-BREACH.png",
                tag: 'user-return-alarm', // Tag fijo
                data: { url: './index.html' },
                showTrigger: trigger 
            });
        } else {
            // Fallback para navegadores antiguos
            setTimeout(() => {
                 lanzarNotificacionRetorno();
            }, TIEMPO_PARA_RETORNO);
        }
    }

    // B) USUARIO VUELVE -> DESACTIVAR LA BOMBA
    if (data.type === 'CANCEL_ALARM') {
        console.log("SW: Usuario activo. Cancelando alarmas pendientes.");
        
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

// 5. FUNCIONES AUXILIARES (Tus textos originales recuperados)

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
