const CACHE_NAME = "bio-breach-v5";
const ASSETS = [
  "./",
  "./index.html",
  "./manifest.json",
  "./Logo%20BIO-BREACH.png",
  "./NOTIFICACIONES%20BIO-BREACH.jpeg"
];

// Variables de estado del Sistema (Simulación de Backend)
let versionLocal = "0.0.0";
let temporizadorRetorno = null;
const TIEMPO_PRUEBA_RETORNO = 10000; // 10 segundos para probar (luego pon 3600000 para 1 hora)
const INTERVALO_BUSQUEDA_UPDATE = 60000; // Revisar GitHub cada 60 segundos

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
  
  // Iniciar el ciclo de vida del "Servidor Local"
  console.log("SW: Sistema de fondo activo.");
});

// 3. INTERCEPTOR (Network First para JSON, Cache First para lo demás)
self.addEventListener("fetch", (event) => {
  if (event.request.method === 'POST') {
    event.respondWith(Response.redirect('./index.html'));
    return;
  }

  // Estrategia especial para versiones.json: Siempre buscar en red primero
  if (event.request.url.includes('versiones.json')) {
      event.respondWith(
          fetch(event.request)
            .then(response => response)
            .catch(() => caches.match(event.request))
      );
      return;
  }
  
  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request))
  );
});

// 4. PUENTE DE COMUNICACIÓN (El "Node.js" local)
self.addEventListener('message', (event) => {
    const data = event.data;

    // A) Recibimos la versión actual instalada desde el index.html
    if (data.type === 'SET_VERSION') {
        versionLocal = data.version;
        console.log(`SW: Versión local registrada: ${versionLocal}`);
        // Iniciamos el escaneo de actualizaciones
        iniciarRastreoActualizaciones();
    }

    // B) El usuario minimizó la app (Modo Retorno)
    if (data.type === 'USER_IDLE') {
        console.log("SW: Usuario inactivo. Iniciando cuenta regresiva de retorno...");
        if (temporizadorRetorno) clearTimeout(temporizadorRetorno);
        
        temporizadorRetorno = setTimeout(() => {
            lanzarNotificacionRetorno();
        }, TIEMPO_PRUEBA_RETORNO); 
    }

    // C) El usuario volvió a la app (Cancelar Retorno)
    if (data.type === 'USER_ACTIVE') {
        console.log("SW: Usuario activo. Cancelando alertas de retorno.");
        if (temporizadorRetorno) clearTimeout(temporizadorRetorno);
    }
    
    if (data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
});

// 5. LÓGICA DE NOTIFICACIONES PROPIAS

function lanzarNotificacionRetorno() {
    const title = "SISTEMA EN ESPERA";
    const options = {
        body: "Agente, el sistema requiere supervisión inmediata.",
        icon: "./Logo%20BIO-BREACH.png",
        badge: "./Logo%20BIO-BREACH.png",
        vibrate: [50, 50, 50],
        tag: 'user-return',
        data: { url: './index.html' },
        requireInteraction: true
    };
    self.registration.showNotification(title, options);
}

// Función para consultar GitHub periódicamente
function iniciarRastreoActualizaciones() {
    setInterval(() => {
        // URL directa a tu JSON en crudo o GitHub Pages
        fetch('https://elfaraon65.github.io/bio-breach-repositorio/versiones.json?t=' + new Date().getTime())
        .then(res => res.json())
        .then(data => {
            // Buscamos la versión más alta en el JSON
            // Ordenamos descendentemente por ID (V7, V6...)
            data.sort((a, b) => {
                const numA = parseInt(a.id.replace(/\D/g, '')) || 0;
                const numB = parseInt(b.id.replace(/\D/g, '')) || 0;
                return numB - numA;
            });

            const ultimaEnNube = data[0]; // La más nueva
            
            if (ultimaEnNube && hayActualizacionImportante(ultimaEnNube.version, versionLocal)) {
                lanzarNotificacionUpdate(ultimaEnNube);
            }
        })
        .catch(err => console.log("SW: Error buscando updates (Offline)", err));
    }, INTERVALO_BUSQUEDA_UPDATE);
}

function lanzarNotificacionUpdate(item) {
    const title = "¡NUEVA VERSIÓN DEL SISTEMA!";
    const options = {
        body: `La versión ${item.version} de ${item.nombre} está lista.`,
        icon: "./NOTIFICACIONES%20BIO-BREACH.jpeg",
        image: "./NOTIFICACIONES%20BIO-BREACH.jpeg",
        badge: "./Logo%20BIO-BREACH.png",
        vibrate: [200, 100, 200, 100, 500],
        tag: 'app-update-' + item.version, // Tag único para no spamear la misma
        data: { url: './index.html' },
        requireInteraction: true
    };
    self.registration.showNotification(title, options);
}

// Utilidad de comparación de versiones
function hayActualizacionImportante(vNube, vLocal) {
    if (!vNube || !vLocal) return false;
    const [M_n, m_n, p_n] = vNube.split('.').map(n => parseInt(n) || 0);
    const [M_l, m_l, p_l] = vLocal.split('.').map(n => parseInt(n) || 0);

    // Si Mayor es superior
    if (M_n > M_l) return true;
    // Si Mayor igual, pero Menor superior
    if (M_n === M_l && m_n > m_l) return true;
    // Si Mayor y Menor igual, pero Parche superior (Update silencioso o notificado según prefieras)
    if (M_n === M_l && m_n === m_l && p_n > p_l) return true;
    
    return false;
}

// 6. GESTIÓN DE CLICS EN NOTIFICACIÓN
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // Intentar enfocar ventana existente
      for (let i = 0; i < windowClients.length; i++) {
        const client = windowClients[i];
        if (client.url.includes('index.html') && 'focus' in client) {
          client.postMessage({ type: 'USER_ACTIVE' }); // Avisar que volvió
          return client.focus();
        }
      }
      // Si no hay ventana, abrir una nueva
      if (clients.openWindow) {
        return clients.openWindow('./index.html');
      }
    })
  );
});
