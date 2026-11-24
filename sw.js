// Service Worker: speichert die App-Dateien, damit die App ohne Netz startet.
// Bei jeder Veröffentlichung VERSION erhöhen (gleich wie in js/version.js).
const VERSION = '0.4.0';
const CACHE = `beckenbuch-${VERSION}`;
const DATEIEN = [
  './',
  'index.html',
  'manifest.webmanifest',
  'css/app.css',
  'js/app.js',
  'js/db.js',
  'js/gliederung.js',
  'js/ui.js',
  'js/zahlen.js',
  'js/bilder.js',
  'js/fotos.js',
  'js/skizzen.js',
  'js/skizzenlogik.js',
  'js/masse.js',
  'js/sammeldiktat.js',
  'js/diktat.js',
  'js/protokoll.js',
  'js/version.js',
  'gliederung/test-gliederung.json',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'icons/icon-maskable-512.png',
];

self.addEventListener('install', (ev) => {
  // cache: 'reload' – frisch vom Server holen, nicht aus dem HTTP-Zwischenspeicher des Browsers
  // (sonst könnte eine neue Version alte Dateien enthalten).
  ev.waitUntil(caches.open(CACHE).then((c) => c.addAll(DATEIEN.map((d) => new Request(d, { cache: 'reload' })))));
});

self.addEventListener('activate', (ev) => {
  ev.waitUntil(
    caches.keys()
      .then((namen) => Promise.all(namen.filter((n) => n.startsWith('beckenbuch-') && n !== CACHE).map((n) => caches.delete(n))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('message', (ev) => {
  if (ev.data === 'skipWaiting') self.skipWaiting();
});

// Auf dem Entwicklungsrechner (localhost) zuerst aus dem Netz, damit Änderungen sofort sichtbar sind;
// sonst zuerst aus dem Speicher (schnell und offline).
const ENTWICKLUNG = ['localhost', '127.0.0.1'].includes(self.location.hostname);

self.addEventListener('fetch', (ev) => {
  if (ev.request.method !== 'GET') return;
  const url = new URL(ev.request.url);
  if (url.origin !== self.location.origin) return;
  const ausSpeicher = () => caches.match(ev.request, { ignoreSearch: true });
  if (ENTWICKLUNG) {
    ev.respondWith(fetch(ev.request.url, { cache: 'no-cache' }).catch(() => ausSpeicher().then((t) => t || Response.error())));
  } else {
    ev.respondWith(ausSpeicher().then((t) => t || fetch(ev.request)));
  }
});
