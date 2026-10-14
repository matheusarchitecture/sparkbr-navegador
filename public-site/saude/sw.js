/* Spark Saúde — SW offline + push real (escopo /saude/) */
var C = "setuppro-v2-9";
self.addEventListener("install", function (e) {
  self.skipWaiting();
  e.waitUntil(
    caches.open(C).then(function (c) {
      return c.addAll(["/saude/", "/saude/index.html", "/saude/setuppro.html", "/saude/manifest.webmanifest", "/saude/icon-192.png", "/saude/icon-512.png", "/saude/taco_db.json", "/saude/alimentos_online.json", "/saude/exercise-catalog.js", "/saude/exercise-media.js", "/saude/exercise-player.html"]);
    }).catch(function () {})
  );
});
self.addEventListener("activate", function (e) {
  e.waitUntil(
    caches.keys().then(function (ks) {
      return Promise.all(ks.map(function (k) { return k === C ? null : caches.delete(k); }));
    }).then(function () { return self.clients.claim(); })
  );
});
self.addEventListener("push", function (e) {
  var d = {};
  try { d = e.data ? e.data.json() : {}; }
  catch (err) { try { d = { body: e.data.text() }; } catch (e2) { d = {}; } }
  var title = d.title || "Spark Saúde";
  var body = d.body || "Hora do check-in Spark Saúde!";
  var icon = d.icon || "/saude/icon-192.png";
  var badge = d.badge || "/saude/icon-192.png";
  var url = d.url || "/saude/";
  e.waitUntil(
    self.registration.showNotification(title, { body: body, icon: icon, badge: badge, data: { url: url } })
  );
});
self.addEventListener("notificationclick", function (e) {
  e.notification.close();
  var url = (e.notification.data && e.notification.data.url) || "/saude/";
  e.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then(function (list) {
      for (var i = 0; i < list.length; i++) {
        try { if (list[i].url.indexOf("/saude/") !== -1) return list[i].focus(); } catch (err) {}
      }
      return clients.openWindow(url);
    })
  );
});
self.addEventListener("fetch", function (e) {
  var u;
  try { u = new URL(e.request.url); } catch (err) { return; }
  var cdn = ["cdn.tailwindcss.com", "cdnjs.cloudflare.com", "fonts.googleapis.com", "fonts.gstatic.com"];
  if (cdn.indexOf(u.hostname) >= 0) {
    e.respondWith(caches.open(C).then(function (c) {
      return c.match(e.request).then(function (hit) {
        if (hit) return hit;
        return fetch(e.request).then(function (r) {
          if (r.ok || r.type === "opaque") c.put(e.request, r.clone()).catch(function () {});
          return r;
        }).catch(function () { return hit || Response.error(); });
      });
    }));
    return;
  }
  if (e.request.method !== "GET" || u.origin !== self.location.origin) return;
  if (u.pathname.indexOf("/saude/") !== 0) return;
  if (e.request.mode === "navigate") {
    e.respondWith(fetch(e.request).catch(function () { return caches.match("/saude/index.html"); }));
    return;
  }
  e.respondWith(
    caches.match(e.request).then(function (hit) {
      return hit || fetch(e.request).then(function (r) {
        var cp = r.clone();
        caches.open(C).then(function (c) { c.put(e.request, cp); }).catch(function () {});
        return r;
      });
    }).catch(function () { return caches.match("/saude/index.html"); })
  );
});
