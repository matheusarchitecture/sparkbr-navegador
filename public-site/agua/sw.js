/* Spark Água service worker v3.7 — push com tela bloqueada (vibra + fixa na tela) + offline */
var CACHE = "hidra-v3.7";
var CORE = ["/agua/", "/agua/index.html", "/agua/manifest.webmanifest", "/agua/icon-192.png", "/agua/icon-512.png"];
self.addEventListener("install", function (e) {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then(function (c) { return c.addAll(CORE); }).catch(function () {}));
});
self.addEventListener("activate", function (e) {
  e.waitUntil(
    caches.keys().then(function (ks) {
      return Promise.all(ks.map(function (k) { return k === CACHE ? null : caches.delete(k); }));
    }).then(function () { return self.clients.claim(); })
  );
});
self.addEventListener("fetch", function (e) {
  var u;
  try { u = new URL(e.request.url); } catch (err) { return; }
  if (e.request.method !== "GET" || u.origin !== self.location.origin) return;
  if (e.request.mode === "navigate") {
    e.respondWith(
      fetch(e.request).then(function (r) {
        var cp = r.clone();
        caches.open(CACHE).then(function (c) { c.put("/agua/index.html", cp); }).catch(function () {});
        return r;
      }).catch(function () {
        return caches.match("/agua/index.html").then(function (r2) { return r2 || caches.match("/agua/"); });
      })
    );
    return;
  }
  e.respondWith(
    caches.match(e.request).then(function (hit) {
      if (hit) return hit;
      return fetch(e.request).then(function (r) {
        var cp = r.clone();
        caches.open(CACHE).then(function (c) { c.put(e.request, cp); }).catch(function () {});
        return r;
      });
    })
  );
});
self.addEventListener("push", function (e) {
  var d = {};
  try { d = e.data ? e.data.json() : {}; } catch (err) {}
  var title = d.title || "💧 Hora de beber água!";
  var body = d.body || "Pausa rápida para hidratar 💙 Toque para abrir.";
  e.waitUntil(
    self.registration.showNotification(title, {
      body: body,
      icon: "/agua/icon-192.png",
      badge: "/agua/icon-192.png",
      tag: "hidra-lembrete",
      renotify: true,
      requireInteraction: true,
      silent: false,
      timestamp: Date.now(),
      vibrate: [500, 150, 500, 150, 500],
      data: { url: d.url || "/agua/?drink=1" },
      actions: [{ action: "abrir", title: "💧 Abrir Spark Água" }]
    })
  );
});
self.addEventListener("notificationclick", function (e) {
  e.notification.close();
  var target = (e.notification.data && e.notification.data.url) || "/agua/?drink=1";
  e.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then(function (wins) {
      for (var i = 0; i < wins.length; i++) {
        if (wins[i].url.indexOf("/agua") !== -1) {
          if ("navigate" in wins[i]) return wins[i].navigate(target).then(function (w) { return w.focus(); });
          return wins[i].focus();
        }
      }
      return clients.openWindow(target);
    })
  );
});
