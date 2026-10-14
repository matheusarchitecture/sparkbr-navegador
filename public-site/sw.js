/* SparkBrowser SW v2: shell offline + fallback */
const V = 'spark-hub-v2.1';
const SHELL = ['/', '/manifest.webmanifest', '/saude/icon-192.png', '/saude/icon-512.png', '/spark-suite.css', '/spark-casa.js'];
self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(V).then(function (c) { return c.addAll(SHELL); }).then(function () { return self.skipWaiting(); }));
});
self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (ks) {
    return Promise.all(ks.map(function (k) { if (k !== V) return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});
self.addEventListener('fetch', function (e) {
  var u = new URL(e.request.url);
  if (e.request.method !== 'GET') return;
  if (u.origin !== location.origin) return;
  if (u.pathname.indexOf('/navegador/api/') === 0 || u.pathname.indexOf('/spark-api/') === 0 || u.pathname.indexOf('/api/') === 0 || u.pathname.indexOf('/setupv2-api/') === 0 || u.pathname.indexOf('/dosefiel-api/') === 0 || u.pathname.indexOf('/saude-api/') === 0 || u.pathname.indexOf('/sparkmat-api/') === 0) {
    e.respondWith(fetch(e.request).catch(function () { return new Response(JSON.stringify({ ok: false, error: 'offline' }), { headers: { 'Content-Type': 'application/json' } }); }));
    return;
  }
  e.respondWith(fetch(e.request).then(function (r) {
    var cp = r.clone();
    caches.open(V).then(function (c) { c.put(e.request, cp); });
    return r;
  }).catch(function () {
    return caches.match(e.request).then(function (m) { return m || caches.match('/'); });
  }));
});
