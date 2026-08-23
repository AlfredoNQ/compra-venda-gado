/* Compra e Venda de Gado — v95 fixes */
(function(){
  window.APP_WEB_VERSION='95';
  function dataUrlToBlob(dataUrl){var p=String(dataUrl||'').split(',');if(p.length<2)throw new Error('PDF sem conteúdo válido');var meta=p[0]||'';var mime=(meta.match(/data:([^;]+)/)||[])[1]||'application/pdf';var bin=meta.indexOf(';base64')>=0?atob(p.slice(1).join(',')):decodeURIComponent(p.slice(1).join(','));var bytes=new Uint8Array(bin.length);for(var i=0;i<bin.length;i++)bytes[i]=bin.charCodeAt(i)&255;return new Blob([bytes],{type:mime});}
  window.__pdfDocsV85=window.__pdfDocsV85||{};
  window.openStoredPdfV85=function(id){try{var doc=window.__pdfDocsV85[id];if(!doc||!doc.data)throw new Error('Documento não encontrado');var name=doc.name||'documento.pdf';if(window.AndroidPdf&&typeof window.AndroidPdf.openPdf==='function'){window.AndroidPdf.openPdf(doc.data,name);return;}var blob=dataUrlToBlob(doc.data);var url=URL.createObjectURL(blob);var w=window.open(url,'_blank');if(!w){var a=document.createElement('a');a.href=url;a.target='_blank';a.rel='noopener';document.body.appendChild(a);a.click();a.remove();}setTimeout(function(){try{URL.revokeObjectURL(url)}catch(e){}},60000);}catch(e){alert('Não foi possível abrir o PDF: '+(e.message||e));}};
  window.fileLink=function(doc,label){if(!doc||!doc.data)return '—';var id='pdf95_'+Math.random().toString(36).slice(2)+Date.now().toString(36);window.__pdfDocsV85[id]=doc;return '<button type="button" class="mini" onclick="openStoredPdfV85(\''+id+'\')">Abrir PDF</button>';};

  window.deleteNegotiationPdfV91=function(kind){try{var id=(document.getElementById('rid')||{}).value||'';if(!id){alert('Salve a negociação antes de excluir um PDF.');return;}var map={gta:{field:'gtaPdf',status:'rgtaFileStatus',input:'rgtaFile',label:'GTA'},nota:{field:'notaPdf',status:'rnotaFileStatus',input:'rnotaFile',label:'Nota'},pagamento:{field:'paymentPdf',status:'rpayFileStatus',input:'rpayFile',label:'Comprovante'}};var cfg=map[kind];if(!cfg)return;var r=records.find(function(x){return x.id===id;});if(!r)return;if(!r[cfg.field]){var st=document.getElementById(cfg.status);if(st)st.innerHTML='';return;}if(!confirm('Excluir somente o PDF de '+cfg.label+'?'))return;r[cfg.field]=null;r.updatedAt=new Date().toISOString();var inp=document.getElementById(cfg.input);if(inp)inp.value='';var st=document.getElementById(cfg.status);if(st)st.innerHTML='<span style="color:#6d786f">PDF excluído</span>';persist();renderAll();if(typeof window.syncPendingNow==='function')setTimeout(function(){window.syncPendingNow(false);},100);}catch(e){alert('Não foi possível excluir o PDF: '+(e.message||e));}};
  function deleteBtn(kind){return ' <button type="button" class="mini" style="background:#fff0ee;color:#b42318" onclick="deleteNegotiationPdfV91(\''+kind+'\')">Excluir PDF</button>';}
  var originalEditRecord=window.editRecord;if(typeof originalEditRecord==='function'){window.editRecord=function(id){originalEditRecord(id);setTimeout(function(){try{var r=records.find(function(x){return x.id===id;});if(!r)return;if(r.gtaPdf){var a=document.getElementById('rgtaFileStatus');if(a)a.innerHTML=fileLink(r.gtaPdf,'GTA')+deleteBtn('gta');}if(r.notaPdf){var b=document.getElementById('rnotaFileStatus');if(b)b.innerHTML=fileLink(r.notaPdf,'Nota')+deleteBtn('nota');}if(r.paymentPdf){var c=document.getElementById('rpayFileStatus');if(c)c.innerHTML=fileLink(r.paymentPdf,'Comprovante')+deleteBtn('pagamento');}}catch(e){}},80);};}

  /* v94 — exclusões compartilhadas pela coluna deleted_records do gado_state. */
  var TOMBSTONE_KEY='gado_deleted_records_permanent_v95';
  function tombstones(){try{return JSON.parse(userGet(TOMBSTONE_KEY)||'[]')||[];}catch(e){return [];}}
  function saveTombstones(a){try{userSet(TOMBSTONE_KEY,JSON.stringify(Array.from(new Set(a||[]))));}catch(e){}}
  function mergeDeleted(remote){var all=Array.from(new Set(tombstones().concat(Array.isArray(remote)?remote:[])));saveTombstones(all);return all;}
  function addTombstone(id){if(!id)return;var a=tombstones();if(a.indexOf(id)<0)a.push(id);saveTombstones(a);}
  function applyDeleted(remote){var all=mergeDeleted(remote);var d=new Set(all);records=records.filter(function(r){return !d.has(r&&r.id);});try{userSet(KEY,JSON.stringify(records));}catch(e){}return all;}

  window.delRecord=function(id){
    if(!confirm('Excluir esta negociação?'))return;
    addTombstone(id);
    try{addDeletedId(DELETED_RECORDS_KEY,id);}catch(e){}
    try{costs.filter(function(c){return c.recordId===id;}).forEach(function(c){addDeletedId(DELETED_COSTS_KEY,c.id);});}catch(e){}
    records=records.filter(function(x){return x.id!==id;});
    costs=costs.filter(function(c){return c.recordId!==id;});
    try{markOfflineDirty();}catch(e){}
    persist();
    renderAll();
    try{autoExcelBackup();}catch(e){}
    if(navigator.onLine)setTimeout(function(){cloudSaveNow();},100);
  };

  cloudSaveNow=async function(){
    if(!sb||!cloudUser)return;
    if(!navigator.onLine){markOfflineDirty();setCloudStatus('Offline • pendente','warn');return;}
    if(cloudBusy){clearTimeout(cloudTimer);cloudTimer=setTimeout(cloudSaveNow,900);return;}
    cloudBusy=true;
    try{
      var dels=applyDeleted();
      var payload={user_id:cloudUser.id,records:records,costs:costs,deleted_records:dels,updated_at:new Date().toISOString()};
      var res=await sb.from(CLOUD_TABLE).upsert(payload,{onConflict:'user_id'});
      if(res.error)throw res.error;
      try{userRemove(OFFLINE_DIRTY_KEY);userRemove(DELETED_RECORDS_KEY);userRemove(DELETED_COSTS_KEY);}catch(e){}
      setCloudStatus('Salvo na nuvem ✓','ok');
      if(document.getElementById('saveStatus'))document.getElementById('saveStatus').textContent='Dados sincronizados • '+new Date().toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'});
    }catch(e){try{markOfflineDirty();}catch(_){}setCloudStatus('Pendente de sincronização','warn');console.error(e);}finally{cloudBusy=false;}
  };

  cloudLoad=async function(){
    if(!sb||!cloudUser||cloudBusy)return;
    cloudBusy=true;
    try{
      var res=await sb.from(CLOUD_TABLE).select('records,costs,deleted_records,updated_at').eq('user_id',cloudUser.id).maybeSingle();
      if(res.error)throw res.error;
      if(!res.data){cloudBusy=false;await cloudSaveNow();return;}
      var deleted=applyDeleted(Array.isArray(res.data.deleted_records)?res.data.deleted_records:[]);
      var cloudRecords=Array.isArray(res.data.records)?res.data.records:[];
      var cloudCosts=Array.isArray(res.data.costs)?res.data.costs:[];
      records=mergeById(cloudRecords,records,deleted);
      records=records.filter(function(r){return deleted.indexOf(r&&r.id)<0;});
      costs=mergeById(cloudCosts,costs,getDeletedIds(DELETED_COSTS_KEY));
      userSet(KEY,JSON.stringify(records));userSet(COSTKEY,JSON.stringify(costs));
      renderAll();
      cloudBusy=false;
      await cloudSaveNow();
    }catch(e){console.error(e);setCloudStatus('Erro na nuvem','warn');}finally{cloudBusy=false;}
  };
  applyDeleted();

  var originalInitCloud=window.initCloud;var reconnectUntil=0;
  function keepUi(){try{if(typeof cloudUser!=='undefined'&&cloudUser&&typeof setAuthenticatedUI==='function')setAuthenticatedUI(true);}catch(e){}}
  async function recoverSession(tryNo){try{bootLoginApproved=true;}catch(e){}keepUi();try{if(typeof sb!=='undefined'&&sb&&navigator.onLine){var r=await sb.auth.getSession();var s=r&&r.data&&r.data.session;if(s&&s.user){try{cloudUser=s.user;}catch(e){}try{bootLoginApproved=true;}catch(e){}keepUi();try{await cloudLoad();}catch(e){}return true;}}}catch(e){}if(Date.now()<reconnectUntil&&(tryNo||0)<20)setTimeout(function(){recoverSession((tryNo||0)+1);},500);return false;}
  window.initCloud=async function(){if(Date.now()<reconnectUntil){try{bootLoginApproved=true;}catch(e){}keepUi();recoverSession(0);return;}if(typeof originalInitCloud==='function')return originalInitCloud();};
  window.addEventListener('online',function(ev){reconnectUntil=Date.now()+20000;try{bootLoginApproved=true;}catch(e){}try{ev.stopImmediatePropagation();}catch(e){}keepUi();setTimeout(function(){recoverSession(0);},100);},true);
  window.addEventListener('pageshow',function(){applyDeleted();try{if(typeof cloudUser!=='undefined'&&cloudUser){bootLoginApproved=true;keepUi();}}catch(e){}},true);

  function forceVersion(){try{document.body.setAttribute('data-app-version','95');document.title='Compra e Venda de Gado — v95';var h=document.querySelector('header h1');if(h){var spans=h.querySelectorAll('span');var found=false;spans.forEach(function(s){if(/^v\d+$/i.test((s.textContent||'').trim())){s.textContent='v95';found=true;}});if(!found){var b=document.createElement('span');b.textContent='v95';b.style.cssText='font-size:12px;font-weight:800;padding:3px 7px;border-radius:999px;background:rgba(255,255,255,.16);vertical-align:middle;white-space:nowrap;margin-left:6px';h.appendChild(b);}}}catch(e){}}
  function refresh(){forceVersion();applyDeleted();try{if(typeof renderTable==='function')renderTable();}catch(e){}}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',refresh);else refresh();setTimeout(refresh,500);setTimeout(refresh,1500);
})();
