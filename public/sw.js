// Last Bell service worker: app shell works offline, and new versions take over by themselves.
const CACHE = 'lastbell-shell-v1';
self.addEventListener('install', (e) => { self.skipWaiting(); });
self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    for (const k of await caches.keys()) if (k !== CACHE) await caches.delete(k);
    await self.clients.claim();
  })());
});
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return; // Firebase, Google and fonts are handled by the browser
  // Pages: network first so a new version shows up straight away, cache when offline.
  if (req.mode === 'navigate') {
    e.respondWith((async () => {
      try { const res = await fetch(req); const c = await caches.open(CACHE); c.put('./', res.clone()); return res; }
      catch { return (await caches.match('./')) || (await caches.match(req)) || Response.error(); }
    })());
    return;
  }
  // Everything else (hashed assets, images): cache first, fill from network.
  e.respondWith((async () => {
    const hit = await caches.match(req);
    if (hit) return hit;
    const res = await fetch(req);
    if (res.ok) (await caches.open(CACHE)).put(req, res.clone());
    return res;
  })());
});
