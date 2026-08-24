const CACHE='gado-app-v114-cache-reset';
const APP_SHELL=['/index.html?v=114','/app-v68.html?v=114','/manifest.webmanifest?v=114','/v85-fixes.js?v=114','/v103-pdf-open.js?v=114','/icon.svg'];

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
      try{client.postMessage({type:'CVG_CACHE_RESET',version:'114'});}catch(e){}
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
          c.put('/index.html?v=114',fresh.clone());
        }
        return fresh;
      }catch(e){
        const c=await caches.open(CACHE);
        return (await c.match('/index.html?v=114'))||(await c.match('/app-v68.html?v=114'))||Response.error();
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
