const CACHE='gado-app-v78-sync-multidevice';
const APP_SHELL=['/index.html','/app-v68.html','/manifest.webmanifest','/icon.svg'];
self.addEventListener('install',event=>{event.waitUntil(caches.open(CACHE).then(c=>c.addAll(APP_SHELL)).then(()=>self.skipWaiting()));});
self.addEventListener('activate',event=>{event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));});
self.addEventListener('fetch',event=>{
 const req=event.request;if(req.method!=='GET')return;const url=new URL(req.url);
 if(req.mode==='navigate'){
   event.respondWith((async()=>{try{const fresh=await fetch(req,{cache:'no-store'});const c=await caches.open(CACHE);if(fresh.ok)c.put('/index.html',fresh.clone());return fresh}catch(e){const c=await caches.open(CACHE);return (await c.match('/index.html'))||(await c.match('/app-v68.html'))||Response.error()}})());return;
 }
 if(url.origin===self.location.origin){event.respondWith((async()=>{const c=await caches.open(CACHE);try{const fresh=await fetch(req,{cache:'no-store'});if(fresh.ok)c.put(req,fresh.clone());return fresh}catch(e){return (await c.match(req))||Response.error()}})());return;}
 event.respondWith((async()=>{const c=await caches.open(CACHE);try{const fresh=await fetch(req);if(fresh.ok)c.put(req,fresh.clone());return fresh}catch(e){return (await c.match(req))||Response.error()}})());
});
