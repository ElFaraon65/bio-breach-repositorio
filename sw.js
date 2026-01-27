const CACHE_NAME = "bio-breach-v5";
const DB_CACHE = "bio-breach-db-v1"; // Nueva caché exclusiva para datos
const ASSETS = [
  "./",
  "./index.html",
  "./manifest.json",
  "./Logo%20BIO-BREACH.png",
  "./NOTIFICACIONES%20BIO-BREACH.jpeg"
];

// --- ZONA DE CONFIGURACIÓN DE TIEMPO ---
// 24 horas exactas en milisegundos
const TIEMPO_PARA_RETORNO = 24 * 60 * 60 * 1000; 

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
  console.log("SW: Sistema persistente activado.");
});

// 3. INTERCEPTOR DE RED
self.addEventListener("fetch", (event) => {
  if (event.request.method === 'POST') {
    event.respondWith(Response.redirect('./index.html'));
    return;
  }
  // Permitimos que versiones.json siempre intente red primero
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

// --- 4. PERSISTENCIA DE DATOS (Node.js style fs-like) ---
// Estas funciones guardan la hora en el disco para que no se pierda al cerrar la app

async function guardarEstado(datos) {
    const cache = await caches.open(DB_CACHE);
    // Guardamos un "archivo virtual" con tus datos
    await cache.put('/estado_sistema.json', new Response(JSON.stringify(datos)));
}

async function leerEstado() {
    const cache = await caches.open(DB_CACHE);
    const respuesta = await cache.match('/estado_sistema.json');
    if (respuesta) {
        return await respuesta.json();
    }
    // Estado por defecto si es la primera vez
    return { ultimoUso: Date.now(), version: '0.0.0', notificadoRetorno: false };
}

// --- 5. PUENTE DE COMUNICACIÓN ---
self.addEventListener('message', async (event) => {
    const data = event.data;
    
    // Leemos el estado actual antes de modificarlo
    let estado = await leerEstado();

    if (data.type === 'SET_VERSION') {
        estado.version = data.version;
        await guardarEstado(estado);
        // Al abrir la app, intentamos buscar updates de una vez
        checkUpdates(estado.version);
    }

    if (data.type === 'USER_ACTIVE') {
        // Usuario volvió: reseteamos la marca de tiempo y la bandera de notificación
        estado.notificadoRetorno = false;
        estado.ultimoUso = Date.now(); // "Para siempre" empieza a contar desde que te vas
        await guardarEstado(estado);
        console.log("SW: Usuario activo. Cronómetro reseteado.");
    }

    if (data.type === 'USER_IDLE') {
        // Usuario se fue: Guardamos la hora exacta
        estado.ultimoUso = Date.now();
        await guardarEstado(estado);
        console.log(`SW: Usuario salió. Hora registrada: ${new Date(estado.ultimoUso).toLocaleTimeString()}`);
        
        // Disparo de respaldo por si el navegador no mata el proceso inmediatamente
        setTimeout(() => verificarTodo(), TIEMPO_PARA_RETORNO);
    }
});

// --- 6. EL MOTOR DE FONDO (PERIODIC SYNC) ---
// Esto se ejecuta cuando el navegador decide despertar al SW en segundo plano

self.addEventListener('periodicsync', (event) => {
    if (event.tag === 'ciclo-sistema') {
        console.log("SW: Ejecutando mantenimiento periódico en segundo plano...");
        event.waitUntil(verificarTodo());
    }
});

// Función Maestra de Verificación
async function verificarTodo() {
    const estado = await leerEstado();
    const ahora = Date.now();
    
    // A) VERIFICAR RETORNO (24 HORAS)
    // Si pasaron 24h Y todavía no hemos notificado, Y el usuario no está jugando ahora
    if ((ahora - estado.ultimoUso > TIEMPO_PARA_RETORNO) && !estado.notificadoRetorno) {
        if (!(await estaElUsuarioJugando())) {
            await lanzarNotificacionRetorno();
            // Marcamos como notificado para no spamear
            estado.notificadoRetorno = true; 
            await guardarEstado(estado);
        }
    }

    // B) VERIFICAR ACTUALIZACIONES
    // Esto corre siempre que el sistema despierta
    await checkUpdates(estado.version);
}

// --- UTILIDADES ---

async function checkUpdates(versionLocal) {
    if(await estaElUsuarioJugando()) return; // No molestar si juega

    try {
        const res = await fetch('https://elfaraon65.github.io/bio-breach-repositorio/versiones.json?t=' + Date.now());
        const data = await res.json();
        data.sort((a, b) => parseInt(b.id.replace(/\D/g, '')) - parseInt(a.id.replace(/\D/g, '')));
        
        if (data[0] && data[0].version !== versionLocal) {
            self.registration.showNotification("¡NUEVA VERSIÓN!", {
                body: `La versión ${data[0].version} de ${data[0].nombre} está lista.`,
                icon: "./NOTIFICACIONES%20BIO-BREACH.jpeg",
                tag: 'update-' + data[0].version,
                data: { url: './index.html' }
            });
        }
    } catch (e) { console.log("SW: Sin red para updates."); }
}

async function estaElUsuarioJugando() {
    const clientes = await clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const c of clientes) {
        if (c.visibilityState === 'visible' && c.focused) return true;
    }
    return false;
}

function lanzarNotificacionRetorno() {
    return self.registration.showNotification("SISTEMA EN ESPERA", {
        body: "Han pasado 24 horas. El sistema requiere supervisión.",
        icon: "./Logo%20BIO-BREACH.png",
        tag: 'user-return',
        data: { url: './index.html' },
        requireInteraction: true
    });
}

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes('index.html') && 'focus' in client) {
            client.postMessage({ type: 'USER_ACTIVE' }); // Avisar inmediatamente
            return client.focus();
        }
      }
      if (clients.openWindow) return clients.openWindow('./index.html');
    })
  );
});
