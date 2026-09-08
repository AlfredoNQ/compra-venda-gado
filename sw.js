const CACHE='gado-app-v184-auth-clientes';
const APP_SHELL=['/index.html?v=2.0','/app-v68.html?v=2.0','/manifest.webmanifest?v=2.0','/v2.0-fixes.js?v=2.0','/v103-pdf-open.js?v=2.0','/v116-pdf-mobile.js?v=2.0','/v112-payments.js?v=2.0','/v112-backup.js?v=2.0','/v120-cadastros-lotes.js?v=2.0','/icon.svg'];

self.addEventListener('install',event=>{
  event.waitUntil((async()=>{
    const keys=await caches.keys();
    await Promise.all(keys.map(k=>caches.delete(k)));
    const c=await caches.open(CACHE);
    try{await c.addAll(APP_SHELL);}catch(e){}
    await self.skipWaiting();
  })());
});

self.addEventListener('activate',event=>{
  event.waitUntil((async()=>{
    const keys=await caches.keys();
    await Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)));
    await self.clients.claim();
    const clients=await self.clients.matchAll({type:'window',includeUncontrolled:true});
    for(const client of clients){
          try{client.postMessage({type:'CVG_CACHE_RESET',version:'184-auth-pdf'});}catch(e){}
    }
  })());
});

self.addEventListener('fetch',event=>{
  const req=event.request;
  if(req.method!=='GET')return;
  const url=new URL(req.url);

  if(req.mode==='navigate'){
    event.respondWith((async()=>{
      try{
        const fresh=await fetch(req,{cache:'no-store'});
        if(fresh.ok){
          const c=await caches.open(CACHE);
          c.put('/index.html?v=184auth',fresh.clone());
        }
        return fresh;
      }catch(e){
        const c=await caches.open(CACHE);
        return (await c.match('/index.html?v=184auth'))||(await c.match('/app-v68.html?v=184auth'))||Response.error();
      }
    })());
    return;
  }

  if(url.origin===self.location.origin){
    event.respondWith((async()=>{
      const c=await caches.open(CACHE);
      try{
        const fresh=await fetch(req,{cache:'no-store'});
        if(fresh.ok)c.put(req,fresh.clone());
        return fresh;
      }catch(e){
        return (await c.match(req))||Response.error();
      }
    })());
    return;
  }

  event.respondWith(fetch(req).catch(async()=>{
    const c=await caches.open(CACHE);
    return (await c.match(req))||Response.error();
  }));
});
