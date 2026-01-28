const CACHE_NAME = "bio-breach-v5";
const DATA_CACHE = "bio-breach-db-v1"; // Base de datos para guardar hora de salida
const ASSETS = [
  "./",
  "./index.html",
  "./manifest.json",
  "./Logo%20BIO-BREACH.png",
  "./NOTIFICACIONES%20BIO-BREACH.jpeg"
];

// INTERVALO BASE (12 HORAS)
const TIEMPO_PARA_RETORNO = 12 * 60 * 60 * 1000; 

// --- ZONA DE CONFIGURACIÓN NOCTURNA ---
const HORA_DORMIR = 22; // 10 PM (22:00)
const HORA_DESPERTAR = 7; // 7 AM (07:00)

// 1. INSTALACIÓN
self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS)));
});

// 2. ACTIVACIÓN
self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
  console.log("SW: Modo Ahorro (Espera de Señal) Activo.");
});

// 3. INTERCEPTOR DE RED
self.addEventListener("fetch", (event) => {
  if (event.request.method === 'POST') {
    event.respondWith(Response.redirect('./index.html'));
    return;
  }
  if (event.request.url.includes('versiones.json')) {
      event.respondWith(fetch(event.request).catch(() => caches.match(event.request)));
      return;
  }
  event.respondWith(fetch(event.request).catch(() => caches.match(event.request)));
});

// 4. GESTIÓN DE MENSAJES (Guardar/Borrar Estado)
self.addEventListener('message', async (event) => {
    const data = event.data;

    // A) AL SALIR: Guardamos la hora. NO programamos alarma ciega.
    if (data.type === 'SAVE_EXIT_TIME') {
        const estado = { 
            horaSalida: Date.now(), 
            version: data.version,
            notificadoRetorno: false 
        };
        await guardarEstado(estado);
        console.log("SW: Hora de salida registrada. Esperando red para actuar...");
    }

    // B) AL ENTRAR: Limpiamos y verificamos updates
    if (data.type === 'CLEAR_EXIT_TIME') {
        const estado = await leerEstado();
        // Marcamos como "ya visto" para que no moleste
        estado.notificadoRetorno = true; 
        estado.version = data.version; // Actualizamos versión en memoria
        await guardarEstado(estado);
        
        // Chequeo inmediato si hay red
        checkUpdates(data.version); 
    }

    // C) LATIDO INTERNO (Solo actualización)
    if (data.type === 'CHECK_UPDATES_NOW') {
        checkUpdates(data.version);
    }
});

// --- 5. EL MOTOR DE SINCRONIZACIÓN (Aquí ocurre la magia) ---

// Se dispara cuando el navegador detecta red y decide procesar tareas de fondo
self.addEventListener('sync', (event) => {
    if (event.tag === 'sync-check-now') {
        console.log("SW: Red recuperada (Sync). Verificando sistema...");
        event.waitUntil(verificarTodo());
    }
});

// Se dispara periódicamente (si Android lo permite)
self.addEventListener('periodicsync', (event) => {
    if (event.tag === 'smart-system-check') {
        console.log("SW: Ciclo periódico (PeriodicSync). Verificando...");
        event.waitUntil(verificarTodo());
    }
});


// --- 6. LÓGICA MAESTRA ---

async function verificarTodo() {
    const estado = await leerEstado();
    const ahora = Date.now();
    const tiempoPasado = ahora - (estado.horaSalida || 0);

    // 1. LÓGICA DE RETORNO (Con Guardia Nocturna)
    // Si pasaron 4 horas Y no hemos notificado aún
    if (tiempoPasado >= TIEMPO_PARA_RETORNO && !estado.notificadoRetorno) {
        
        // Revisamos si es hora de dormir
        const horaActual = new Date().getHours();
        if (horaActual >= HORA_DORMIR || horaActual < HORA_DESPERTAR) {
            console.log("SW: Condiciones cumplidas pero es horario nocturno. Silencio.");
            // No hacemos nada. La próxima vez que haya red y sea de día, se disparará.
        } else {
            // ¡Fuego!
            await lanzarNotificacionRetorno();
            
            // Marcamos para no repetir
            estado.notificadoRetorno = true; 
            await guardarEstado(estado);
        }
    }

    // 2. LÓGICA DE ACTUALIZACIÓN (Si ya estamos despiertos y con red, revisamos)
    await checkUpdates(estado.version || "0.0.0");
}

async function checkUpdates(versionLocal) {
    try {
        const res = await fetch('https://elfaraon65.github.io/bio-breach-repositorio/versiones.json?t=' + Date.now());
        const data = await res.json();
        data.sort((a, b) => parseInt(b.id.replace(/\D/g, '')) - parseInt(a.id.replace(/\D/g, '')));
        
        const ultima = data[0];
        
        // Usamos tu filtro inteligente (Ignora parches)
        if (ultima && hayActualizacionImportante(ultima.version, versionLocal)) {
            // Verificamos horario nocturno también para updates (opcional, pero recomendado)
            const hora = new Date().getHours();
            if (hora >= HORA_DORMIR || hora < HORA_DESPERTAR) return;

            self.registration.showNotification("¡NUEVA VERSIÓN DISPONIBLE!", {
                body: `La versión ${ultima.version} de ${ultima.nombre} está lista.`,
                icon: "./NOTIFICACIONES%20BIO-BREACH.jpeg",
                tag: 'update-' + ultima.version,
                data: { url: './index.html' },
                requireInteraction: true
            });
        }
    } catch (e) {
        console.log("SW: Offline (Check fallido).");
    }
}

// --- UTILIDADES ---

function lanzarNotificacionRetorno() {
    return self.registration.showNotification("SISTEMA EN ESPERA", {
        body: "Tus casos han sido renovados, anímate, ¡Es hora de encontrar al culpable! ¡Qué no se te escape!",
        icon: "./Logo%20BIO-BREACH.png",
        tag: 'user-return-alarm',
        data: { url: './index.html' },
        requireInteraction: true
    });
}

function hayActualizacionImportante(vNube, vLocal) {
    if (!vNube || !vLocal) return false;
    const [M_n, m_n] = vNube.split('.').map(n => parseInt(n) || 0);
    const [M_l, m_l] = vLocal.split('.').map(n => parseInt(n) || 0);
    if (M_n > M_l) return true;
    if (M_n === M_l && m_n > m_l) return true;
    return false;
}

// Persistencia en Caché (Pseudo-DB)
async function guardarEstado(datos) {
    const cache = await caches.open(DATA_CACHE);
    const blob = new Blob([JSON.stringify(datos)], { type: 'application/json' });
    await cache.put('/estado_sistema.json', new Response(blob));
}

async function leerEstado() {
    const cache = await caches.open(DATA_CACHE);
    const res = await cache.match('/estado_sistema.json');
    if (res) return await res.json();
    return { horaSalida: Date.now(), notificadoRetorno: true, version: '0.0.0' };
}

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(clients.openWindow('./index.html'));
});
