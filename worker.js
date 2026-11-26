const CACHE='mooncat-neon-landscape-v7';
const files=['./','./stages.js','./profiles.js','./home.js','./cat-home.webp','./expedition.js','./art.js','./neon-render.js','./night-market.webp','./shopfronts.webp','./rooftop-cat.webp','./game.js','./district.js','./stick.js','./install.js','./icon-192.png','./icon-512.png','./game.webmanifest'];
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(c=>c.addAll(files)).then(()=>self.skipWaiting())));
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>(k.startsWith('mooncat-landscape-')||k.startsWith('mooncat-neon-landscape-'))&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',event=>{
 if(event.request.method!=='GET'||!files.some(file=>new URL(file,self.registration.scope).href===event.request.url))return;
 event.respondWith(caches.open(CACHE).then(async c=>(await c.match(event.request))||fetch(event.request)));
});
