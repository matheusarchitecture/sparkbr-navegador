const CACHE = 'astromatch-v3.2';
const SHELL = ['./', 'experience.css', 'experience.js', 'manifest.json', 'icon-192.png', 'icon-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).catch(() => {}));
  self.skipWaiting();
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k.startsWith('astromatch-') && k !== CACHE).map(k => caches.delete(k)))).then(() => clients.claim()));
});
// rede primeiro para o shell; API, fotos e WebSocket nunca passam pelo cache
self.addEventListener('fetch', e => {
  const u = new URL(e.request.url);
  if (e.request.method !== 'GET' || u.pathname.includes('/api/') || u.pathname.endsWith('/ws')) return;
  if (u.origin !== self.location.origin || !u.pathname.startsWith(new URL(self.registration.scope).pathname)) return;
  e.respondWith(fetch(e.request).then(r => {
    if (!r.ok) return r;
    const copy = r.clone(); caches.open(CACHE).then(c => c.put(e.request, copy)).catch(() => {}); return r;
  }).catch(() => caches.match(e.request).then(r => r || caches.match('./'))));
});

self.addEventListener('push', e => {
  let d = { title: 'AstroMatch ✦', body: 'Você tem novidades dos astros!', url: './' };
  try { if (e.data) d = { ...d, ...e.data.json() }; } catch (_) {}
  e.waitUntil(self.registration.showNotification(d.title, {
    body: d.body, icon: 'icon-192.png', badge: 'icon-192.png', data: { url: d.url }, tag: 'astromatch', renotify: true,
  }));
});
self.addEventListener('notificationclick', e => {
  e.notification.close();
  const target = new URL((e.notification.data && e.notification.data.url) || './', self.registration.scope).href;
  e.waitUntil(clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
    for (const c of list) if (c.url.startsWith(self.registration.scope) && 'focus' in c) { c.navigate(target).catch(() => {}); return c.focus(); }
    return clients.openWindow(target);
  }));
});
