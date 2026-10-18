/* TKA QUEST — service worker: aset statis langsung dari cache perangkat (buka ulang instan).
   Panggilan ke server Apps Script TIDAK pernah di-cache. */
const VERSION = new URL(self.location).searchParams.get('v') || '1';
const CACHE = 'tkaquest-' + VERSION;
const ASSETS = ['./', 'index.html', 'css/app.css?v=' + VERSION, 'js/config.js?v=' + VERSION, 'js/icons.js?v=' + VERSION, 'js/core.js?v=' + VERSION, 'js/murid.js?v=' + VERSION, 'icon.svg', 'manifest.webmanifest'];
self.addEventListener('install', (e) => { e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting())); });
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k.startsWith('tkaquest-') && k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== self.location.origin) return;   // API GAS & font: lewat jaringan biasa
  if (e.request.mode === 'navigate' || url.pathname.endsWith('/index.html') || url.pathname.endsWith('/js/config.js')) {
    // halaman & config: jaringan dulu (agar update langsung terasa), cadangan cache saat offline
    e.respondWith(fetch(e.request).then((r) => { const cp = r.clone(); caches.open(CACHE).then((c) => c.put(e.request, cp)); return r; }).catch(() => caches.match(e.request).then((r) => r || caches.match('index.html'))));
    return;
  }
  e.respondWith(caches.match(e.request).then((hit) => hit || fetch(e.request).then((r) => { if (r.ok) { const cp = r.clone(); caches.open(CACHE).then((c) => c.put(e.request, cp)); } return r; })));
});
