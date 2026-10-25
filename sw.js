/**
 * EvalScan - Service Worker Offline Cache
 * Proporciona soporte completo sin conexión (offline-first) para EvalScan.
 */

const CACHE_NAME = 'evalscan-cache-v1';

const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/public/manifest.json',
  '/css/styles.css',
  '/css/responsive.css',
  '/js/app.js',
  '/js/database.js',
  '/js/evaluations.js',
  '/js/utils.js',
  '/js/answer-key.js',
  '/js/sheet-generator.js',
  '/js/cameraService.js',
  '/js/image-processing.js',
  '/js/scanner.js',
  '/js/grading.js',
  '/js/results.js',
  '/js/export.js',
  '/public/icon.svg',
  '/icon.svg',
  '/public/pwa-192x192.png',
  '/public/pwa-512x512.png',
  '/public/apple-touch-icon.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      // Intentar almacenar en caché los activos estáticos; no bloquear la instalación si un archivo de desarrollo no está presente aún
      return Promise.allSettled(
        STATIC_ASSETS.map((url) =>
          cache.add(url).catch((err) => {
            console.warn(`[SW] No se pudo precachear ${url}:`, err);
          })
        )
      );
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  // Ignorar peticiones que no sean GET (como IndexedDB o WebSockets de desarrollo)
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // Ignorar peticiones de HMR de Vite o extensiones de navegador
  if (url.pathname.includes('/@vite') || url.pathname.includes('/@fs') || url.protocol.startsWith('chrome-extension')) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        // En segundo plano intentar actualizar el recurso si hay red
        fetch(event.request)
          .then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
              const clone = networkResponse.clone();
              caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
            }
          })
          .catch(() => {
            // Sin conexión, se mantiene el cachedResponse
          });
        return cachedResponse;
      }

      // Si no está en caché, buscar en la red
      return fetch(event.request)
        .then((networkResponse) => {
          if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
            return networkResponse;
          }
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
          return networkResponse;
        })
        .catch(() => {
          // Si falla la red y es una navegación HTML, retornar index.html en caché
          if (event.request.headers.get('accept')?.includes('text/html')) {
            return caches.match('/index.html') || caches.match('/');
          }
        });
    })
  );
});
