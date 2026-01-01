// sw.js - Service Worker para Bio-Breach Hub

self.addEventListener('install', (event) => {
    console.log('Service Worker instalado');
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    console.log('Service Worker activado');
});

// ESCUCHA EVENTOS PUSH DEL SERVIDOR
self.addEventListener('push', (event) => {
    let data = { title: 'Bio-Breach Hub', body: 'Nueva actualización disponible', url: '/' };

    if (event.data) {
        try {
            data = event.data.json(); // Espera JSON: { "title": "...", "body": "..." }
        } catch (e) {
            data.body = event.data.text();
        }
    }

    const options = {
        body: data.body,
        icon: 'https://via.placeholder.com/128', // CAMBIAR POR TU ICONO REAL (URL)
        badge: 'https://via.placeholder.com/64', // ICONO PEQUEÑO PARA LA BARRA (BLANCO Y NEGRO)
        vibrate: [100, 50, 100],
        data: {
            url: data.url || '/'
        }
    };

    event.waitUntil(
        self.registration.showNotification(data.title, options)
    );
});

// AL HACER CLIC EN LA NOTIFICACION
self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
            // Si la app ya está abierta, enfócala
            for (let i = 0; i < windowClients.length; i++) {
                const client = windowClients[i];
                if (client.url === '/' && 'focus' in client) {
                    return client.focus();
                }
            }
            // Si no, abre una nueva ventana
            if (clients.openWindow) {
                return clients.openWindow('/');
            }
        })
    );
});