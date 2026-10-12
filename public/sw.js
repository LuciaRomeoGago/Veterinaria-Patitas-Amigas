/*
 * Modo sin conexión. La app guarda los datos en el navegador, así que con tener los archivos
 * guardados alcanza para usarla sin internet: las páginas piden primero a la red (para tener
 * siempre la última versión) y, si no hay conexión, usan lo guardado. Imágenes, fuentes y los
 * archivos de la app (que cambian de nombre en cada versión) se sirven desde lo guardado.
 */
const CACHE = 'patitas-v1';
const BASE = ['/', '/manifest.webmanifest', '/img/logo-bosque.webp', '/img/logo-salvia.webp', '/img/perrito.webp', '/img/gatito.webp'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(BASE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;

  // Pantallas: red primero; sin conexión, la última versión guardada de la app.
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req)
        .then((res) => {
          const copia = res.clone();
          caches.open(CACHE).then((c) => c.put('/', copia));
          return res;
        })
        .catch(() => caches.match('/')),
    );
    return;
  }

  // Lo demás: lo guardado primero; si no está, se busca y se guarda.
  e.respondWith(
    caches.match(req).then(
      (hit) =>
        hit ||
        fetch(req).then((res) => {
          if (res.ok) {
            const copia = res.clone();
            caches.open(CACHE).then((c) => c.put(req, copia));
          }
          return res;
        }),
    ),
  );
});
