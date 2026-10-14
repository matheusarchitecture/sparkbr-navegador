/* Offline apenas para o shell. Apps, IA, páginas médicas e dados privados NÃO são cacheados aqui. */
const CACHE='sparkbr-shell-v2.1.0';
const CORE=['./','./index.html','./style.css','./config.js','./catalog.js','./app.js','./apps.json','./manifest.webmanifest','./assets/icon.svg','./assets/icon-192.png','./assets/icon-512.png','./bridge/spark-bridge.js','./bridge/spark-family.js','./bridge/spark-family.css'];
self.addEventListener('install',event=>{event.waitUntil(caches.open(CACHE).then(c=>c.addAll(CORE)).then(()=>self.skipWaiting()))});
self.addEventListener('activate',event=>{event.waitUntil(Promise.all([caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))),self.clients.claim()]))});
self.addEventListener('fetch',event=>{
  const req=event.request;
  if(req.method!=='GET')return;
  const u=new URL(req.url);
  if(u.origin!==self.location.origin||u.pathname.includes('/api/')||!u.pathname.startsWith(new URL(self.registration.scope).pathname))return;
  const file=u.pathname.split('/').pop();
  const cacheable=['','index.html','style.css','config.js','catalog.js','app.js','apps.json','manifest.webmanifest','icon.svg','icon-192.png','icon-512.png','spark-bridge.js','spark-family.js','spark-family.css'].includes(file);
  if(!cacheable)return;
  event.respondWith(caches.match(req,{ignoreSearch:true}).then(cached=>cached||fetch(req).then(res=>{if(res.ok){const copy=res.clone();caches.open(CACHE).then(c=>c.put(req,copy))}return res})));
});
