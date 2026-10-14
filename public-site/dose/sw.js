/* Spark Dose SW offline + push */
var CACHE = "dosefiel-v6-pdfpng-diario";
var ASSETS = [
  "/apps/dosefiel/",
  "/apps/dosefiel/index.html",
  "/apps/dosefiel/manifest.webmanifest",
  "/apps/dosefiel/css/styles.css",
  "/apps/dosefiel/js/app.js",
  "/apps/dosefiel/js/api.js",
  "/apps/dosefiel/js/pwa.js",
  "/apps/dosefiel/icons/icon-192.png",
  "/apps/dosefiel/icons/icon-512.png"
];
self.addEventListener("install", function(e) {
  e.waitUntil(caches.open(CACHE).then(function(c){ return c.addAll(ASSETS); }).then(function(){ return self.skipWaiting(); }));
});
self.addEventListener("activate", function(e) {
  e.waitUntil(caches.keys().then(function(keys){
    return Promise.all(keys.map(function(k){ if(k!==CACHE) return caches.delete(k); }));
  }).then(function(){ return self.clients.claim(); }));
});
self.addEventListener("fetch", function(e) {
  var u; try { u = new URL(e.request.url); } catch(err){ return; }
  if(e.request.method!=="GET" || u.origin!==self.location.origin) return;
  if(u.pathname.indexOf("/dosefiel-api/")===0) {
    e.respondWith(fetch(e.request).catch(function(){
      return new Response(JSON.stringify({error:"offline", offline:true}), {headers:{"Content-Type":"application/json"}});
    }));
    return;
  }
  var isHTML = (e.request.mode === "navigate" || u.pathname === "/apps/dosefiel/" || u.pathname === "/apps/dosefiel/index.html" || u.pathname.endsWith(".html"));
  if(isHTML) {
    e.respondWith(
      fetch(e.request).then(function(r){
        if(r && r.status===200){ var cp=r.clone(); caches.open(CACHE).then(function(c){ c.put(e.request, cp); }).catch(function(){}); }
        return r;
      }).catch(function(){
        return caches.match(e.request).then(function(hit){ return hit || caches.match("/apps/dosefiel/index.html"); });
      })
    );
    return;
  }
  e.respondWith(
    caches.match(e.request).then(function(hit){
      var net = fetch(e.request).then(function(r){
        if(r && r.status===200){ var cp=r.clone(); caches.open(CACHE).then(function(c){ c.put(e.request, cp); }).catch(function(){}); }
        return r;
      }).catch(function(){ return hit || caches.match("/apps/dosefiel/index.html"); });
      return hit || net;
    })
  );
});
self.addEventListener("push", function(e) {
  var d = {};
  try { d = e.data ? e.data.json() : {}; } catch(err) { try { d = {body: e.data.text()}; } catch(e2){} }
  var n = d.notification || d;
  var title = n.title || "Spark Dose Hora do seu cuidado";
  var body = n.body || "Toque para abrir.";
  var data = n.data || d.data || {};
  var url = data.url || "/apps/dosefiel/";
  var actions = n.actions || [
    {action:"confirm", title:"Tomei agora"},
    {action:"snooze", title:"Adiar 15m"},
    {action:"skip", title:"Nao tomei"}
  ];
  e.waitUntil(self.registration.showNotification(title, {
    body: body, icon: "/apps/dosefiel/icons/icon-192.png", badge: "/apps/dosefiel/icons/icon-192.png",
    vibrate: [200,100,200], tag: "dosefiel-geral", renotify: true,
    requireInteraction: true, data: {url: url, occurrence_id: data.occurrence_id||null}, actions: actions
  }));
});
self.addEventListener("notificationclick", function(e) {
  e.notification.close();
  var dd = e.notification.data || {};
  var occ = dd.occurrence_id;
  var base = dd.url || "/apps/dosefiel/";
  if(e.action==="confirm" && occ) {
    e.waitUntil(fetch("/dosefiel-api/occurrences/"+occ+"/confirm", {method:"POST", headers:{"Content-Type":"application/json"}, body: JSON.stringify({notes:"Confirmado via push"})}).catch(function(){}).then(function(){
      return self.registration.showNotification("Dose Confirmada!", {body:"Registro atualizado.", icon:"/apps/dosefiel/icons/icon-192.png", tag:"df-ok"});
    }));
    return;
  }
  if(e.action==="snooze" && occ) {
    e.waitUntil(fetch("/dosefiel-api/occurrences/"+occ+"/snooze", {method:"POST", headers:{"Content-Type":"application/json"}, body: JSON.stringify({minutes:15})}).catch(function(){}));
    return;
  }
  e.waitUntil(clients.matchAll({type:"window", includeUncontrolled:true}).then(function(wins){
    for(var i=0;i<wins.length;i++){ try{ if(wins[i].url.indexOf("/apps/dosefiel/")!==-1) return wins[i].focus(); }catch(err){} }
    return clients.openWindow(base);
  }));
});
