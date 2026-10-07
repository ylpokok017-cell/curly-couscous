const CACHE='lucky-draw-v10.3-arena';
const ASSETS=['./','./index.html','./app.css','./app.js','./manifest.webmanifest','./assets/P3_Q1.jpeg','./assets/P3_Q2.jpeg','./assets/P3_Q3.jpeg','./assets/P4_Q1.jpeg','./assets/P4_Q2.jpeg','./assets/P4_Q3.jpeg','./assets/P5_Q1.jpeg','./assets/P5_Q2.jpeg','./assets/P5_Q3.jpeg','./assets/P6_Q1.jpeg','./assets/P6_Q2.jpeg','./assets/P6_Q3.jpeg'];
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{if(e.request.method!=='GET')return;e.respondWith(caches.match(e.request).then(r=>r||fetch(e.request).then(res=>{const copy=res.clone();caches.open(CACHE).then(c=>c.put(e.request,copy));return res}).catch(()=>caches.match('./index.html'))))});
