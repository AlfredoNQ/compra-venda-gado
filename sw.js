const CACHE='gado-app-v73-pending-installments-only';
const APP_SHELL=['/manifest.webmanifest','/icon.svg'];
self.addEventListener('install',event=>{
  event.waitUntil(caches.open(CACHE).then(c=>c.addAll(APP_SHELL)).then(()=>self.skipWaiting()));
});
self.addEventListener('activate',event=>{
  event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));
});
self.addEventListener('fetch',event=>{
  const req=event.request;
  if(req.method!=='GET')return;
  const url=new URL(req.url);
  if(url.pathname==='/api/cotacoes'){
    event.respondWith((async()=>{
      const cache=await caches.open(CACHE);
      try{
        const fresh=await fetch(req);
        if(fresh.ok)cache.put(req,fresh.clone());
        return fresh;
      }catch(e){
        return (await cache.match(req)) || new Response(JSON.stringify({ok:false,error:'Sem internet e sem cotação armazenada'}),{status:503,headers:{'Content-Type':'application/json'}});
      }
    })());
    return;
  }
  if(req.mode==='navigate'){
    event.respondWith((async()=>{
      try{
        return await fetch(req,{cache:'no-store'});
      }catch(e){
        const cache=await caches.open(CACHE);
        return (await cache.match('/app-v68.html')) || Response.error();
      }
    })());
    return;
  }

  if(url.origin===self.location.origin){
    event.respondWith((async()=>{
      const cache=await caches.open(CACHE);
      const cached=await cache.match(req);
      try{
        const fresh=await fetch(req);
        if(fresh.ok && (req.destination==='script'||req.destination==='style'||req.destination==='document'||req.destination==='manifest')) cache.put(req,fresh.clone());
        return fresh;
      }catch(e){
        if(cached)return cached;
        if(req.mode==='navigate')return cache.match('/index.html');
        throw e;
      }
    })());
    return;
  }
  // Cache externo (ex.: biblioteca Supabase) para reabrir o app offline depois do primeiro acesso online.
  event.respondWith((async()=>{
    const cache=await caches.open(CACHE);
    const cached=await cache.match(req);
    if(cached)return cached;
    try{const fresh=await fetch(req);cache.put(req,fresh.clone());return fresh}catch(e){throw e}
  })());
});
