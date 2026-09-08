/* Compra e Venda de Gado — v183 fixes */
(function(){
  // Bloqueio de acesso: nenhuma tela de dados fica visível sem sessão autenticada.
  function lockUntilLogin(){var app=document.getElementById('appShell'),gate=document.getElementById('loginGate');if(app)app.style.display='none';if(gate)gate.style.display='block';}
  async function requireFreshLogin(){window.__freshLoginRequired=true;lockUntilLogin();try{if(window.sb&&window.sb.auth){await window.sb.auth.signOut({scope:'local'});window.sb.auth.onAuthStateChange(function(event,session){if(event==='SIGNED_IN'&&session){window.__freshLoginRequired=false;}else if(!session){window.__freshLoginRequired=true;lockUntilLogin();}});}}catch(e){}lockUntilLogin();}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',requireFreshLogin,{once:true});else requireFreshLogin();
  window.addEventListener('pageshow',function(){try{applyDeleted();}catch(e){}});
})();

(function(){
  window.APP_WEB_VERSION='183';
  function dataUrlToBlob(dataUrl){var p=String(dataUrl||'').split(',');if(p.length<2)throw new Error('PDF sem conteúdo válido');var meta=p[0]||'';var mime=(meta.match(/data:([^;]+)/)||[])[1]||'application/pdf';var bin=meta.indexOf(';base64')>=0?atob(p.slice(1).join(',')):decodeURIComponent(p.slice(1).join(','));var bytes=new Uint8Array(bin.length);for(var i=0;i<bin.length;i++)bytes[i]=bin.charCodeAt(i)&255;return new Blob([bytes],{type:mime});}
  window.__pdfDocsV85=window.__pdfDocsV85||{};
  window.openStoredPdfV85=function(id){try{var doc=window.__pdfDocsV85[id];if(!doc||!doc.data)throw new Error('Documento não encontrado');var name=doc.name||'documento.pdf';if(window.AndroidPdf&&typeof window.AndroidPdf.openPdf==='function'){window.AndroidPdf.openPdf(doc.data,name);return;}var blob=dataUrlToBlob(doc.data);var url=URL.createObjectURL(blob);var w=window.open(url,'_blank');if(!w){var a=document.createElement('a');a.href=url;a.target='_blank';a.rel='noopener';document.body.appendChild(a);a.click();a.remove();}setTimeout(function(){try{URL.revokeObjectURL(url)}catch(e){}},60000);}catch(e){alert('Não foi possível abrir o PDF: '+(e.message||e));}};
  window.fileLink=function(doc,label){if(!doc||!doc.data)return '—';var id='pdf96_'+Math.random().toString(36).slice(2)+Date.now().toString(36);window.__pdfDocsV85[id]=doc;return '<button type="button" class="mini" onclick="openStoredPdfV85(\''+id+'\')">Abrir PDF</button>';};

  window.deleteNegotiationPdfV91=function(kind){try{var id=(document.getElementById('rid')||{}).value||'';if(!id){alert('Salve a negociação antes de excluir um PDF.');return;}var map={gta:{field:'gtaPdf',status:'rgtaFileStatus',input:'rgtaFile',label:'GTA'},nota:{field:'notaPdf',status:'rnotaFileStatus',input:'rnotaFile',label:'Nota'},pagamento:{field:'paymentPdf',status:'rpayFileStatus',input:'rpayFile',label:'Comprovante'}};var cfg=map[kind];if(!cfg)return;var r=records.find(function(x){return x.id===id;});if(!r)return;if(!r[cfg.field]){var st=document.getElementById(cfg.status);if(st)st.innerHTML='';return;}if(!confirm('Excluir somente o PDF de '+cfg.label+'?'))return;r[cfg.field]=null;r.updatedAt=new Date().toISOString();var inp=document.getElementById(cfg.input);if(inp)inp.value='';var st=document.getElementById(cfg.status);if(st)st.innerHTML='<span style="color:#6d786f">PDF excluído</span>';persist();renderAll();if(typeof window.syncPendingNow==='function')setTimeout(function(){window.syncPendingNow(false);},100);}catch(e){alert('Não foi possível excluir o PDF: '+(e.message||e));}};
  function deleteBtn(kind){return ' <button type="button" class="mini" style="background:#fff0ee;color:#b42318" onclick="deleteNegotiationPdfV91(\''+kind+'\')">Excluir PDF</button>';}
  var originalEditRecord=window.editRecord;if(typeof originalEditRecord==='function'){window.editRecord=function(id){originalEditRecord(id);setTimeout(function(){try{var r=records.find(function(x){return x.id===id;});if(!r)return;if(r.gtaPdf){var a=document.getElementById('rgtaFileStatus');if(a)a.innerHTML=fileLink(r.gtaPdf,'GTA')+deleteBtn('gta');}if(r.notaPdf){var b=document.getElementById('rnotaFileStatus');if(b)b.innerHTML=fileLink(r.notaPdf,'Nota')+deleteBtn('nota');}if(r.paymentPdf){var c=document.getElementById('rpayFileStatus');if(c)c.innerHTML=fileLink(r.paymentPdf,'Comprovante')+deleteBtn('pagamento');}}catch(e){}},80);};}

  var TOMBSTONE_KEY='gado_deleted_records_permanent_v95';
  var LEGACY_PENDING='gado_pending_sync_v78';
  var LEGACY_RETRY='gado_sync_retry_v78';
  var CLIENTS_KEY='gado_cadastros_v120';
  var ANIMALS_KEY='gado_animais_v121';
  var LOTS_KEY='gado_lotes_v121';
  var sync96Busy=false;
  var sync96Timer=null;
  var lastPullAt=0;

  function tombstones(){try{return JSON.parse(userGet(TOMBSTONE_KEY)||'[]')||[];}catch(e){return [];}}
  function saveTombstones(a){try{userSet(TOMBSTONE_KEY,JSON.stringify(Array.from(new Set(a||[]))));}catch(e){}}
  function mergeDeleted(remote){var all=Array.from(new Set(tombstones().concat(Array.isArray(remote)?remote:[])));saveTombstones(all);return all;}
  function addTombstone(id){if(!id)return;var a=tombstones();if(a.indexOf(id)<0)a.push(id);saveTombstones(a);}
  function applyDeleted(remote){var all=mergeDeleted(remote);var d=new Set(all);if(typeof records==='undefined'||!Array.isArray(records))return all;records=records.filter(function(r){return !d.has(r&&r.id);});try{userSet(KEY,JSON.stringify(records));}catch(e){}return all;}
  function stable(v){try{return JSON.stringify(v||[]);}catch(e){return '[]';}}
  function localClients(){try{var list=JSON.parse(userGet(CLIENTS_KEY)||'[]')||[];return Array.isArray(list)?list.map(function(x){if(!x||x.id)return x;return Object.assign({},x,{id:'cad-'+String(x.documento||x.nome||'cliente').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')});}):[];}catch(e){return [];}}
  function localObject(key){try{return JSON.parse(userGet(key)||'{}')||{};}catch(e){return {};}}
  function mergeObject(remote,local){var out={};Object.keys(remote||{}).forEach(function(k){out[k]=remote[k];});Object.keys(local||{}).forEach(function(k){out[k]=local[k];});return out;}
  function clearConfirmedFlags(){try{userRemove(OFFLINE_DIRTY_KEY);userRemove(DELETED_RECORDS_KEY);userRemove(DELETED_COSTS_KEY);userRemove(LEGACY_PENDING);localStorage.removeItem(LEGACY_RETRY);}catch(e){}}
  function markSynced(){setCloudStatus('Sincronizado ✓','ok');var s=document.getElementById('saveStatus');if(s)s.textContent='Dados sincronizados • '+new Date().toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'});var o=document.getElementById('offlineStatus');if(o){o.textContent='Online • sincronizado';o.className='cloudpill ok';}var b=document.getElementById('syncNowBtn');if(b)b.style.display='none';}
  function hasPending(){try{return isOfflineDirty()||!!userGet(LEGACY_PENDING)||getDeletedIds(DELETED_RECORDS_KEY).length>0||getDeletedIds(DELETED_COSTS_KEY).length>0;}catch(e){return false;}}

  window.delRecord=function(id){
    if(!confirm('Excluir esta negociação?'))return;
    addTombstone(id);
    try{addDeletedId(DELETED_RECORDS_KEY,id);}catch(e){}
    try{costs.filter(function(c){return c.recordId===id;}).forEach(function(c){addDeletedId(DELETED_COSTS_KEY,c.id);});}catch(e){}
    records=records.filter(function(x){return x.id!==id;});
    costs=costs.filter(function(c){return c.recordId!==id;});
    try{markOfflineDirty();}catch(e){}
    persist();renderAll();try{autoExcelBackup();}catch(e){}
    if(navigator.onLine)setTimeout(function(){window.syncPendingNow(true);},100);
  };

  async function hydrateMissingPdfs(list){
    if(!sb||!cloudUser)return;
    var res=await sb.from('gado_pdfs').select('record_id,kind,document').eq('user_id',cloudUser.id);
    if(res.error)throw res.error;
    var map={};(res.data||[]).forEach(function(x){map[String(x.record_id)+'|'+x.kind]=x.document;});
    (Array.isArray(list)?list:[]).forEach(function(r){
      if(!r||!r.id)return;
      [['gta','gtaPdf'],['nota','notaPdf'],['payment','paymentPdf']].forEach(function(p){
        var key=String(r.id)+'|'+p[0];
        if(!r[p[1]]&&map[key])r[p[1]]=map[key];
      });
    });
  }

  async function syncSeparatedPdfs(list){
    if(!sb||!cloudUser)return;
    var cache={};try{cache=JSON.parse(userGet('gado_pdf_sync_index_v1')||'{}')||{};}catch(e){cache={};}
    var jobs=[],next={};
    (Array.isArray(list)?list:[]).forEach(function(r){
      if(!r||!r.id)return;
      [['gta',r.gtaPdf],['nota',r.notaPdf],['payment',r.paymentPdf]].forEach(function(pair){
        var doc=pair[1],key=String(r.id)+'|'+pair[0];
        if(!doc||!doc.data)return;
        var sig=String(doc.name||'')+'|'+String(doc.type||'')+'|'+String(doc.data);
        next[key]=sig;
        // Sempre confirma o PDF no banco; o índice local podia ficar stale e
        // fazer o app pular um PDF que havia sido apagado ou não confirmado.
        jobs.push(sb.from('gado_pdfs').upsert({user_id:cloudUser.id,record_id:String(r.id),kind:pair[0],document:doc,updated_at:r.updatedAt||new Date().toISOString()},{onConflict:'user_id,record_id,kind'}));
      });
    });
    var results=await Promise.all(jobs);
    for(var i=0;i<results.length;i++)if(results[i]&&results[i].error)throw results[i].error;
    try{userSet('gado_pdf_sync_index_v1',JSON.stringify(next));}catch(e){}
  }
  function recordsWithoutPdfs(list){
    return (Array.isArray(list)?list:[]).map(function(r){
      if(!r)return r;
      var x=Object.assign({},r);delete x.gtaPdf;delete x.notaPdf;delete x.paymentPdf;return x;
    });
  }
  async function loadSeparatedPdfs(list){
    if(!sb||!cloudUser)return [];
    var res=await sb.from('gado_pdfs').select('record_id,kind,document,updated_at').eq('user_id',cloudUser.id);
    if(res.error)throw res.error;
    var map={};(res.data||[]).forEach(function(x){map[String(x.record_id)+'|'+x.kind]=x.document;});
    return (Array.isArray(list)?list:[]).map(function(r){
      if(!r||!r.id)return r;
      var x=Object.assign({},r);
      if(map[String(r.id)+'|gta'])x.gtaPdf=map[String(r.id)+'|gta'];
      if(map[String(r.id)+'|nota'])x.notaPdf=map[String(r.id)+'|nota'];
      if(map[String(r.id)+'|payment'])x.paymentPdf=map[String(r.id)+'|payment'];
      return x;
    });
  }

  async function save96(){
    if(!sb||!cloudUser)return false;
    if(!navigator.onLine){try{markOfflineDirty();}catch(e){}setCloudStatus('Offline • pendente','warn');return false;}
    if(sync96Busy)return false;
    sync96Busy=true;
    try{
      var dels=applyDeleted();
      // Reidrata os PDFs já confirmados antes de salvar qualquer edição.
      // Assim um formulário que não carregou o anexo nunca o apaga.
      await hydrateMissingPdfs(records);
      await syncSeparatedPdfs(records);
      var payload={user_id:cloudUser.id,records:recordsWithoutPdfs(records),costs:costs,clients:localClients(),animals:localObject(ANIMALS_KEY),lots:localObject(LOTS_KEY),deleted_records:dels,updated_at:new Date().toISOString()};
      var res=await sb.from(CLOUD_TABLE).upsert(payload,{onConflict:'user_id'});
      if(res.error)throw res.error;
      // Confirma o upsert sem devolver records/PDFs: reduz muito o tráfego no APK.

      clearConfirmedFlags();
      markSynced();
      return true;
    }catch(e){try{markOfflineDirty();}catch(_){}setCloudStatus('Pendente de sincronização','warn');console.error('SYNC96 SAVE',e);return false;}
    finally{sync96Busy=false;}
  }

  async function load96(force){
    if(window.__pdfViewerOpen)return true;
    if(!sb||!cloudUser||!navigator.onLine)return false;
    if(sync96Busy)return false;
    if(!force && Date.now()-lastPullAt<5000)return true;
    sync96Busy=true;lastPullAt=Date.now();
    try{
      var localBefore=stable(records), costsBefore=stable(costs), clientsBefore=stable(localClients()), pendingBefore=hasPending();
      var res=await sb.from(CLOUD_TABLE).select('records,costs,clients,animals,lots,deleted_records,updated_at').eq('user_id',cloudUser.id).maybeSingle();
      if(res.error)throw res.error;
      if(!res.data){sync96Busy=false;return await save96();}
      var deleted=applyDeleted(Array.isArray(res.data.deleted_records)?res.data.deleted_records:[]);
      var cloudRecords=Array.isArray(res.data.records)?res.data.records:[];
      cloudRecords=await loadSeparatedPdfs(cloudRecords);
      var cloudCosts=Array.isArray(res.data.costs)?res.data.costs:[];
      var cloudClients=Array.isArray(res.data.clients)?res.data.clients:[];
      cloudClients=cloudClients.map(function(x){if(!x||x.id)return x;return Object.assign({},x,{id:'cad-'+String(x.documento||x.nome||'cliente').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')});});
      var cloudAnimals=res.data.animals&&typeof res.data.animals==='object'?res.data.animals:{};
      var cloudLots=res.data.lots&&typeof res.data.lots==='object'?res.data.lots:{};
      records=mergeById(cloudRecords,records,deleted).filter(function(r){return deleted.indexOf(r&&r.id)<0;});
      // A mesclagem de registros nunca pode descartar anexos já confirmados.
      var cloudPdfById={};cloudRecords.forEach(function(x){if(x&&x.id)cloudPdfById[String(x.id)]=x;});
      records.forEach(function(r){
        var c=cloudPdfById[String(r&&r.id)];if(!c)return;
        ['gtaPdf','notaPdf','paymentPdf'].forEach(function(k){if(!r[k]&&c[k])r[k]=c[k];});
      });
      costs=mergeById(cloudCosts,costs,getDeletedIds(DELETED_COSTS_KEY));
      var mergedClients=mergeById(cloudClients,localClients(),[]);
      var mergedAnimals=mergeObject(cloudAnimals,localObject(ANIMALS_KEY));
      var mergedLots=mergeObject(cloudLots,localObject(LOTS_KEY));
      userSet(CLIENTS_KEY,JSON.stringify(mergedClients));
      userSet(ANIMALS_KEY,JSON.stringify(mergedAnimals));
      userSet(LOTS_KEY,JSON.stringify(mergedLots));
      document.dispatchEvent(new CustomEvent('clientesAtualizados',{detail:{source:'cloud'}}));
      userSet(KEY,JSON.stringify(records));userSet(COSTKEY,JSON.stringify(costs));renderAll();
      var cloudDeleted=Array.isArray(res.data.deleted_records)?res.data.deleted_records:[];
      var needsPush=pendingBefore || stable(records)!==stable(cloudRecords.filter(function(r){return deleted.indexOf(r&&r.id)<0;})) || stable(costs)!==stable(cloudCosts) || stable(mergedClients)!==stable(cloudClients) || stable(mergedAnimals)!==stable(cloudAnimals) || stable(mergedLots)!==stable(cloudLots) || stable(deleted)!==stable(cloudDeleted);
      sync96Busy=false;
      if(needsPush)return await save96();
      clearConfirmedFlags();markSynced();return true;
    }catch(e){console.error('SYNC96 LOAD',e);setCloudStatus('Pendente de sincronização','warn');return false;}
    finally{sync96Busy=false;}
  }

  cloudSaveNow=save96;
  cloudLoad=function(){return load96(true);};
  scheduleCloudSave=function(){clearTimeout(sync96Timer);setCloudStatus('Salvando na nuvem…','warn');sync96Timer=setTimeout(function(){save96();},350);};
  window.syncPendingNow=async function(manual){if(!navigator.onLine){setCloudStatus('Offline • pendente','warn');return false;}if(hasPending())return save96();return load96(!!manual);};

  var originalInitCloud=window.initCloud;var reconnectUntil=0;
  function keepUi(){try{if(window.__freshLoginRequired){lockUntilLogin();return;}if(typeof cloudUser!=='undefined'&&cloudUser&&typeof setAuthenticatedUI==='function')setAuthenticatedUI(true);}catch(e){}}
  async function recoverSession(tryNo){try{bootLoginApproved=true;}catch(e){}keepUi();try{if(typeof sb!=='undefined'&&sb&&navigator.onLine){var r=await sb.auth.getSession();var s=r&&r.data&&r.data.session;if(s&&s.user){try{cloudUser=s.user;}catch(e){}try{bootLoginApproved=true;}catch(e){}keepUi();await window.syncPendingNow(true);return true;}}}catch(e){}if(Date.now()<reconnectUntil&&(tryNo||0)<8)setTimeout(function(){recoverSession((tryNo||0)+1);},800);return false;}
  window.initCloud=async function(){if(Date.now()<reconnectUntil){try{bootLoginApproved=true;}catch(e){}keepUi();recoverSession(0);return;}if(typeof originalInitCloud==='function')return originalInitCloud();};
  window.addEventListener('online',function(ev){reconnectUntil=Date.now()+10000;try{bootLoginApproved=true;}catch(e){}try{ev.stopImmediatePropagation();}catch(e){}keepUi();setTimeout(function(){recoverSession(0);},250);},true);
  window.addEventListener('pageshow',function(){applyDeleted();try{if(typeof cloudUser!=='undefined'&&cloudUser){bootLoginApproved=true;keepUi();}}catch(e){}},true);

  function forceVersion(){try{document.body.setAttribute('data-app-version','183');document.title='Compra e Venda de Gado — v183';var h=document.querySelector('header h1');if(h){var spans=h.querySelectorAll('span');var found=false;spans.forEach(function(s){if(/^v\d+$/i.test((s.textContent||'').trim())){s.textContent='v183';found=true;}});if(!found){var b=document.createElement('span');b.textContent='v183';b.style.cssText='font-size:12px;font-weight:800;padding:3px 7px;border-radius:999px;background:rgba(255,255,255,.16);vertical-align:middle;white-space:nowrap;margin-left:6px';h.appendChild(b);}}}catch(e){}}
  function refresh(){forceVersion();applyDeleted();try{if(typeof renderTable==='function')renderTable();}catch(e){}}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',refresh);else refresh();setTimeout(refresh,500);setTimeout(refresh,1500);
})();


/* MIGRADO: v131-ajustes-finais.js incorporado ao script principal v85-fixes.js */
/* v132 — compra/venda limpas, sem resumo nem campos duplicados */
(function(){
 function byText(txt){return Array.from(document.querySelectorAll('.tabs .tabbtn')).find(function(b){return (b.textContent||'').trim()===txt})}
 function cleanText(){
  document.querySelectorAll('button,a,h2,h3,h4,th,b,.ph h2,.sectiontitle').forEach(function(e){
   var s=(e.textContent||'').trim();
   if(s==='Continuar para Venda →'||s==='Continuar para Venda') e.style.display='none';
   if(s==='Vendedores / Compras') e.textContent='Compras';
   if(s==='Compradores / Vendas') e.textContent='Vendas';
   if(s==='🐂 Vendedores / Compras') e.textContent='Compras';
   if(s==='💰 Compradores / Vendas') e.textContent='Vendas';
   if(s==='📋 Negociações completas') e.style.display='none';
   if(s==='Compra / Vendedor') e.textContent='Compra';
   if(s==='Venda / Comprador') e.textContent='Venda';
   if(s==='🐂 Compra / Vendedor') e.textContent='Compra';
   if(s==='💰 Venda / Comprador') e.textContent='Venda';
   if(s==='Vendedor') e.textContent='Cliente';
   if(s==='Comprador') e.textContent='Cliente';
   if(s==='Clientes'&&e.closest('.tabs')) e.textContent='Cadastro';
   if(s==='Estoque atual'&&e.closest('.tabs')) e.textContent='Estoque';
  });
  document.querySelectorAll('.neg-v66-top + div').forEach(function(e){if((e.textContent||'').indexOf('Escolha uma etapa da negociação')>=0)e.style.display='none'});
  document.querySelectorAll('.neg-v66-title').forEach(function(e){var s=(e.textContent||'').trim();if(s==='Compra / Vendedor')e.textContent='Compra';if(s==='Venda / Comprador')e.textContent='Venda'});
  var side=document.getElementById('paymentPlanSide');if(side&&side.closest('.field'))side.closest('.field').style.display='none';
  document.querySelectorAll('.neg-v66-tab,[data-negv66="resumo"]').forEach(function(e){e.style.display='none'});
  document.querySelectorAll('.neg-list-tabs').forEach(function(e){e.style.display='none'});
 }
 (function(){var st=document.createElement('style');st.textContent='.tabs{position:relative!important;top:auto!important;z-index:10!important;background:#fff!important;overflow:visible!important;margin-top:0!important;margin-bottom:18px!important}.tabs .tabbtn{position:relative;z-index:auto}.tab#negociacoes .tablewrap{overflow-x:auto}.tab#negociacoes table{font-size:12px}.tab#negociacoes th,.tab#negociacoes td{white-space:nowrap;padding:9px 10px}.tab#negociacoes th[data-sales-at],.tab#negociacoes th[data-sales-weight]{text-align:center;min-width:70px}.tab#negociacoes td.num{text-align:center}@media(max-width:600px){html,body{overflow-x:hidden!important;width:100%!important;max-width:100%!important}.tabs{display:flex!important;width:100%!important;max-width:100%!important;overflow-x:auto!important;overflow-y:hidden!important;flex-wrap:nowrap!important;scrollbar-width:none!important;-webkit-overflow-scrolling:touch!important}.tabs::-webkit-scrollbar{display:none}.tabs .tabbtn{flex:0 0 auto!important;white-space:nowrap!important}.wrap{width:100%!important;max-width:100%!important;overflow-x:hidden!important}.head{width:100%!important;max-width:100%!important}.tablewrap{max-width:100%!important;overflow-x:auto!important}.modal{padding:8px!important;align-items:flex-start!important}.modalcard{width:100%!important;max-width:100%!important;margin:0 auto!important;max-height:calc(100dvh - 16px)!important;overflow:auto!important}.modalcard .mb{padding:14px!important}.modalcard .formgrid{grid-template-columns:1fr!important}.modalcard .span2,.modalcard .span4{grid-column:span 1!important}.modalcard .actions{flex-wrap:wrap!important}.modalcard .actions .btn{flex:1 1 120px!important}}';document.head.appendChild(st)})();
 (function(){
  function activeIntoView(){var t=document.querySelector('.tabs'),a=t&&t.querySelector('.tabbtn.active');if(a&&t&&window.innerWidth<=600){try{a.scrollIntoView({block:'nearest',inline:'center'})}catch(e){}}}
  document.addEventListener('click',function(e){if(e.target&&e.target.closest&&e.target.closest('.tabs .tabbtn'))setTimeout(activeIntoView,30)},true);
  window.addEventListener('resize',function(){setTimeout(activeIntoView,30)});
  setTimeout(activeIntoView,500);
 })();
 function syncClientNames(){
  function sync(selectId,legacyId){
   var sel=document.getElementById(selectId); if(!sel)return;
   var old=document.getElementById(legacyId);
   if(!old){old=document.createElement('input');old.type='hidden';old.id=legacyId;old.name=legacyId;var f=sel.closest('form');if(f)f.appendChild(old)}
   old.value=sel.options[sel.selectedIndex]?sel.options[sel.selectedIndex].text:'';
  }
  sync('rclienteCompra','rvendedor'); sync('rclienteVenda','rcomprador');
  ['rclienteCompra','rclienteVenda'].forEach(function(id){var s=document.getElementById(id);if(s&&!s.dataset.v131Sync){s.dataset.v131Sync='1';s.addEventListener('change',function(){sync('rclienteCompra','rvendedor');sync('rclienteVenda','rcomprador')})}});
  function hydrate(selectId,legacyId){
   var s=document.getElementById(selectId),old=document.getElementById(legacyId); if(!s||!old)return;
   var val=(old.value||'').trim(); if(!val)return;
   var opt=Array.from(s.options).find(function(o){return (o.value||'').trim()===val||(o.textContent||'').trim()===val});
   if(opt)s.value=opt.value;
  }
  hydrate('rclienteCompra','rvendedor'); hydrate('rclienteVenda','rcomprador');
  [300,800,1500].forEach(function(ms){setTimeout(function(){hydrate('rclienteCompra','rvendedor');hydrate('rclienteVenda','rcomprador')},ms)});
  var form=document.getElementById('recordForm');
  if(form&&!form.dataset.v131EditHydrate){
   form.dataset.v131EditHydrate='1';
   new MutationObserver(function(){hydrate('rclienteCompra','rvendedor');hydrate('rclienteVenda','rcomprador')}).observe(form,{childList:true,subtree:true});
  }
  ['rvendedor','rcomprador'].forEach(function(id){var x=document.getElementById(id);if(x&&!x.dataset.v131Hydrate){x.dataset.v131Hydrate='1';x.addEventListener('input',function(){hydrate('rclienteCompra','rvendedor');hydrate('rclienteVenda','rcomprador')})}});
 }
 function normalizeLegacySaleLots(r){if(!r)return false;var has=Array.isArray(r.animalLotsSold)&&r.animalLotsSold.length||Array.isArray(r.sourceLots)&&r.sourceLots.length;if(has)return false;var id=r.animalLotId||r.sourceLotId||r.loteOrigemId||r.lotId||r.loteId||r.loteOrigem||r.lote; if(id&&typeof id==='object')id=id.id||id.lotId||id.recordId;var nums=(Array.isArray(r.animalNumbersSold)?r.animalNumbersSold:(Array.isArray(r.numerosAnimaisVendidos)?r.numerosAnimaisVendidos:[])).map(String);var qty=nums.length||Number(r.quantVenda||r.qtdVenda||r.quantidadeVenda||0);if(!id&&nums.length){try{var map=JSON.parse((typeof userGet==='function'?userGet('gado_animais_v121'):localStorage.getItem('gado_animais_v121'))||'{}'),best=null,score=0;Object.keys(map).forEach(function(lotId){var known=Array.isArray(map[lotId])?map[lotId].map(String):[],hits=nums.filter(function(n){return known.indexOf(n)>=0}).length;if(hits>score){score=hits;best=lotId;}});if(best&&score>0)id=best;}catch(e){}}if(!id||!(qty>0))return false;r.animalLotsSold=[{lotId:String(id),quantity:qty}];r.sourceLots=r.animalLotsSold;return true}
 function normalizeEditModal(){
  var title=document.getElementById('modalTitle'),rid=document.getElementById('rid');
  if(!title||title.textContent.indexOf('Editar')<0)return;
  var list=(typeof records!=='undefined'&&Array.isArray(records)?records:(window.records||[]));var migrated=list.some(normalizeLegacySaleLots);if(migrated){try{if(typeof persist==='function')persist()}catch(e){}}var r=list.find(function(x){return String(x.id)===String(rid&&rid.value)});var isVenda=!!(r&&(window.__negListView==='buyer'||(Number(r.quantVenda||0)>0&&!Number(r.quantCompra||0))));
  ['rclienteCompra','rclienteVenda'].forEach(function(id){var sel=document.getElementById(id);if(!sel)return;var field=sel.closest('.field');if(field)field.style.display='';sel.style.display='';var first=sel.options[0],rest=Array.from(sel.options).slice(1).sort(function(a,b){return String(a.textContent||'').localeCompare(String(b.textContent||''),'pt-BR',{sensitivity:'base'});});sel.innerHTML='';if(first)sel.appendChild(first);rest.forEach(function(opt){sel.appendChild(opt)});});
  var c=document.getElementById('negV66Compra'),v=document.getElementById('negV66Venda'),s=document.getElementById('negV66Resumo');
  if(c)c.style.display=isVenda?'none':'block'; if(v)v.style.display=isVenda?'block':'none'; if(s)s.style.display='block';
  var buyClient=document.getElementById('rclienteCompra'),sellClient=document.getElementById('rclienteVenda');
  // Depois de reconstruir/ordenar os selects, selecionar o cliente salvo no registro.
  [[buyClient,r&&r.vendedor],[sellClient,r&&r.comprador]].forEach(function(pair){
    var sel=pair[0],name=String(pair[1]||'').trim();if(!sel||!name)return;
    var opt=Array.from(sel.options).find(function(o){return String(o.value||'').trim()===name||String(o.textContent||'').trim()===name;});
    if(!opt){opt=document.createElement('option');opt.value=name;opt.textContent=name;sel.appendChild(opt);}
    sel.value=opt.value;sel.dispatchEvent(new Event('change',{bubbles:true}));
  });
  if(buyClient)buyClient.required=!isVenda;if(sellClient)sellClient.required=isVenda;
  var gc=document.getElementById('rgtaCompra'),gn=document.getElementById('rnotaCompra');if(gc)gc.value=(document.getElementById('rgta')||{}).value||'';if(gn)gn.value=(document.getElementById('rnota')||{}).value||'';var cv=document.getElementById('rcategoriaVenda'),cc=document.getElementById('rcategoria');if(cv&&cc&&document.activeElement!==cv)cv.value=cc.value||'';var wv=document.getElementById('rpesoVenda');if(wv){wv.disabled=false;wv.readOnly=false;if(document.activeElement!==wv)wv.value=r&&r.pesoVendaKg!=null?r.pesoVendaKg:'';}
  window.__modeV127=isVenda?'venda':'compra';
  var tabs=document.querySelector('.neg-v66-tabs');if(tabs)tabs.style.display='none';
  var st=s&&s.querySelector('.neg-v66-title');if(st)st.textContent=isVenda?'Documentos e fechamento da venda':'Documentos e fechamento da compra';
  var totals=document.getElementById('installmentTotals');if(totals){if(isVenda){var ins=Array.isArray(r&&r.installments)?r.installments:[],paid=ins.filter(function(p){return String(p.type||p.tipo||'').toLowerCase().indexOf('receb')>=0&&(p.paid===true||p.pago===true||p.baixada===true||String(p.status||'').toLowerCase()==='ok');}).reduce(function(a,p){return a+Number(p.value??p.valor??0)||0},0),scheduled=ins.filter(function(p){return String(p.type||p.tipo||'').toLowerCase().indexOf('receb')>=0;}).reduce(function(a,p){return a+Number(p.value??p.valor??0)||0},0),total=Number(r.quantVenda||0)*Number(r.precoVenda||0),pending=Math.max(0,total-paid);totals.innerHTML='<div style="display:flex;gap:8px;flex-wrap:wrap;margin:8px 0 12px"><div style="flex:1;min-width:220px;border:1px solid #cfe5d7;background:#f2faf5;border-radius:10px;padding:10px"><b style="color:#176b45">A receber do comprador</b><div style="margin-top:5px">Negociação: <b>'+money.format(total)+'</b></div><div>Parcelado: '+money.format(scheduled)+' • Baixado: '+money.format(paid)+'</div><div>Pendente real: <b>'+money.format(pending)+'</b></div><small style="color:#31734d">'+(ins.length?'Total distribuído conforme parcelas':'Sem parcelas')+'</small></div></div>';}else{var cards=Array.from(totals.querySelectorAll('div')).filter(function(e){var t=(e.textContent||'').trim().toLowerCase();return t.indexOf('a pagar ao vendedor')===0&&e.children.length>0;});cards.forEach(function(card){card.style.display='';});Array.from(totals.querySelectorAll('div')).filter(function(e){return (e.textContent||'').trim().toLowerCase().indexOf('a receber do comprador')===0&&e.children.length>0;}).forEach(function(card){card.style.display='none';});}}
  refreshEditLotOptions(r);hydrateSaleLots(r);
  try{if(typeof updateEditorSummary==='function')updateEditorSummary();}catch(e){}
 }
 function normalizePaymentCards(){var totals=document.getElementById('installmentTotals');if(!totals)return;var sale=window.__modeV127==='venda'||Number(document.getElementById('rqv')?.value||0)>0&&Number(document.getElementById('rqcomp')?.value||0)===0,cards=Array.from(totals.querySelectorAll('div')).filter(function(e){var t=(e.textContent||'').trim().toLowerCase();return (t.indexOf('a pagar ao vendedor')===0||t.indexOf('a receber do comprador')===0)&&e.children.length>0;});if(sale&&!cards.some(function(e){return (e.textContent||'').trim().toLowerCase().indexOf('a receber do comprador')===0;})){var total=Number(document.getElementById('rqv')?.value||0)*Number(document.getElementById('rpv')?.value||0);totals.innerHTML='<div style="display:flex;gap:8px;flex-wrap:wrap;margin:8px 0 12px"><div style="flex:1;min-width:220px;border:1px solid #cfe5d7;background:#f2faf5;border-radius:10px;padding:10px"><b style="color:#176b45">A receber do comprador</b><div style="margin-top:5px">Negociação: <b>'+money.format(total)+'</b></div><div>Parcelado: R$ 0,00 • Baixado: R$ 0,00</div><div>Pendente real: <b>'+money.format(total)+'</b></div><small style="color:#31734d">Sem parcelas</small></div></div>';return;}cards.forEach(function(card){var t=(card.textContent||'').trim().toLowerCase();card.style.display=(sale?t.indexOf('a receber do comprador')===0:t.indexOf('a pagar ao vendedor')===0)?'':'none';});}
 function hydrateSaleLots(r){if(!r)return;var saved=r.animalLotsSold||r.sourceLots||[];if(!Array.isArray(saved)||!saved.length)return;var rows=document.getElementById('loteRows130');if(rows&&rows.dataset.v131HydratedId===String(r.id))return;var all=rows?Array.from(rows.querySelectorAll('.field')):[];saved.forEach(function(item,i){var id=item.lotId||item.id,qty=Number(item.quantity||item.quantidade||0),row=all[i];if(!row&&document.getElementById('addLote130')){document.getElementById('addLote130').click();all=Array.from(rows.querySelectorAll('.field'));row=all[i];}var sel=row&&row.querySelector('.lote130'),q=row&&row.querySelector('.qtdLote130');if(sel){sel.value=id;sel.dispatchEvent(new Event('change',{bubbles:true}));}if(q)q.value=qty;});var rows2=document.getElementById('v131LotRows');if(rows2){saved.forEach(function(item){var c=rows2.querySelector('[data-lot="'+(item.lotId||item.id)+'"]'),q=rows2.querySelector('[data-lotq="'+(item.lotId||item.id)+'"]');if(c)c.checked=true;if(q)q.value=Number(item.quantity||item.quantidade||0);});}if(rows)rows.dataset.v131HydratedId=String(r.id);}
 function refreshEditLotOptions(r){var rows=document.getElementById('loteRows130');if(!rows)return;var base=sourceRecords(),saved=r&& (r.animalLotsSold||r.sourceLots)||[],ids=saved.map(function(x){return String(x.lotId||x.id)}),sig=base.map(function(l){return l.id+':'+Number(l.quantCompra||0)+':'+(l.loteCodigo||'')}).join('|')+';'+ids.join('|');if(rows.dataset.v131OptionsHash===sig)return;if(document.activeElement&&document.activeElement.classList&&document.activeElement.classList.contains('lote130'))return;base=base.filter(function(l){return Number(l.quantCompra||0)>0}).sort(function(a,b){return String(a.loteCodigo||'').localeCompare(String(b.loteCodigo||''),'pt-BR',{numeric:true})});rows.querySelectorAll('.lote130').forEach(function(sel){var keep=sel.value;sel.innerHTML='<option value="">Selecione o lote</option>'+base.map(function(l){var saldo=Math.max(0,Number(l.quantCompra||0)-Number(l.quantVenda||0)-allocatedFromLot(l.id));return '<option value="'+l.id+'">'+(l.loteCodigo||'LT')+' — '+(l.data||'')+' — '+(l.vendedor||'')+' — '+(l.era||'')+' (estoque '+saldo+')</option>';}).join('');sel.value=keep;});rows.dataset.v131OptionsHash=sig;}
 function showSaleLotHistory(r){var box=document.getElementById('negV66Venda');if(!box||!r)return;var saved=r.animalLotsSold||r.sourceLots||[];var old=document.getElementById('v131SaleLotHistory');if(old)old.remove();var d=document.createElement('div');d.id='v131SaleLotHistory';d.className='field span4';d.innerHTML='<label>Histórico dos lotes vendidos</label><div class="hint"></div>';var hint=d.querySelector('.hint');if(!Array.isArray(saved)||!saved.length){hint.textContent='Nenhum lote vinculado a esta venda.';}else{var list=(window.records||[]);hint.innerHTML=saved.map(function(x){var id=x.lotId||x.id,lot=list.find(function(y){return y.id===id})||{};return '<div style="padding:6px 0;border-bottom:1px solid #dfe9e2"><b>'+(lot.vendedor||'Lote')+'</b> • '+(lot.data||'')+' • '+(lot.era||'')+' — <b>'+Number(x.quantity||x.quantidade||0)+'</b> animal(is)</div>';}).join('');}var grid=box.querySelector('.formgrid');if(grid)grid.insertBefore(d,grid.firstChild);}
 function setModeRequirements(mode){var sale=mode==='venda',a=document.getElementById('rclienteCompra'),b=document.getElementById('rclienteVenda');if(a)a.required=!sale;if(b)b.required=sale;window.__modeV127=mode}
 function addLotPicker(){
  var box=document.getElementById('negV66Venda');if(!box||document.getElementById('v131LotPicker'))return;
  var base=(typeof records!=='undefined'&&Array.isArray(records)?records:(window.records||[]));var lots=base.filter(function(r){var used=base.reduce(function(a,s){var ls=s.animalLotsSold||s.sourceLots||[];return a+(Array.isArray(ls)?ls.reduce(function(n,x){return n+((x.lotId||x.id)===r.id?Number(x.quantity||x.quantidade||0):0)},0):0)},0);return Number(r.quantCompra||0)-Number(r.quantVenda||0)-used>0});
  var d=document.createElement('div');d.id='v131LotPicker';d.className='field span2';d.innerHTML='<label>Lotes de origem da venda</label><div class="hint">Selecione um ou mais lotes e informe quantos animais saem de cada um.</div><div id="v131LotRows"></div>';
  var anchor=box.querySelector('.formgrid');if(anchor)anchor.insertBefore(d,anchor.firstChild);var rows=d.querySelector('#v131LotRows');
  lots.forEach(function(r){var used=base.reduce(function(a,s){var ls=s.animalLotsSold||s.sourceLots||[];return a+(Array.isArray(ls)?ls.reduce(function(n,x){return n+((x.lotId||x.id)===r.id?Number(x.quantity||x.quantidade||0):0)},0):0)},0),saldo=Math.max(0,Number(r.quantCompra||0)-Number(r.quantVenda||0)-used),row=document.createElement('label');row.style.cssText='display:flex;gap:8px;align-items:center;margin:6px 0';row.innerHTML='<input type="checkbox" data-lot="'+r.id+'"> '+(r.vendedor||'Lote')+' • '+(r.era||'')+' • disponíveis: '+saldo+' <input type="number" min="1" max="'+saldo+'" step="1" data-lotq="'+r.id+'" style="width:90px" placeholder="Qtd">';rows.appendChild(row)});
  function collect(){var chosen=[];rows.querySelectorAll('[data-lot]:checked').forEach(function(c){var q=rows.querySelector('[data-lotq="'+c.dataset.lot+'"]');chosen.push({id:c.dataset.lot,quantidade:Number(q&&q.value||0)})});var qv=document.getElementById('rqv');if(chosen.length)qv.value=chosen.reduce(function(a,x){return a+x.quantidade},0);window.__v131PendingLots=chosen}
  rows.addEventListener('change',collect);rows.addEventListener('input',collect);
 }
 function addPurchaseDocuments(){
  var box=document.getElementById('negV66Compra');if(!box||document.getElementById('v131PurchaseDocs'))return;var grid=box.querySelector('.formgrid');if(!grid)return;
  var d=document.createElement('div');d.id='v131PurchaseDocs';d.className='field span2';d.innerHTML='<label>Documentos da compra</label><div style="display:flex;gap:8px;flex-wrap:wrap"><label class="btn secondary">GTA <select id="rgtaCompra"><option></option><option>ok</option><option>pendente</option></select></label><label class="btn secondary">Nota fiscal <select id="rnotaCompra"><option></option><option>ok</option><option>pendente</option></select></label></div>';grid.appendChild(d);
  [['rgtaCompra','rgta'],['rnotaCompra','rnota']].forEach(function(pair){var a=document.getElementById(pair[0]),b=document.getElementById(pair[1]);if(a&&b){a.value=b.value||'';a.addEventListener('change',function(){b.value=a.value})}});
 }
 function addSaleCategory(){var box=document.getElementById('negV66Venda'),grid=box&&box.querySelector('.formgrid');if(!grid||document.getElementById('rcategoriaVenda'))return;var f=document.createElement('div');f.className='field';f.innerHTML='<label>Categoria</label><select id="rcategoriaVenda"><option></option><option>Bezerro</option><option>Garrote</option><option>Boi</option><option>Novilha</option><option>Vaca</option><option>Outro</option></select>';var mark=document.getElementById('rmarca')?.closest('.field');if(mark)grid.insertBefore(f,mark);var s=document.getElementById('rcategoriaVenda'),c=document.getElementById('rcategoria');s.addEventListener('change',function(){if(c)c.value=s.value})}
 function addSaleWeight(){var box=document.getElementById('negV66Venda'),grid=box&&box.querySelector('.formgrid');if(!grid||document.getElementById('rpesoVenda'))return;var f=document.createElement('div');f.className='field';f.innerHTML='<label>Peso (kg/cabeça)</label><input id="rpesoVenda" type="number" min="0" step="0.01" placeholder="Peso médio" />';var mark=document.getElementById('rqv')?.closest('.field');if(mark)grid.insertBefore(f,mark);var s=document.getElementById('rpesoVenda'),p=document.getElementById('rpeso');s.addEventListener('input',function(){if(p)p.value=s.value;try{preview()}catch(e){}})}
 function addPurchaseHistoryDocs(){
  if((window.__negListView||'seller')!=='seller')return;var h=document.querySelector('#negTableHead tr');if(!h||h.querySelector('[data-purchase-doc]'))return;var a=document.createElement('th');a.textContent='GTA';a.dataset.purchaseDoc='1';var b=document.createElement('th');b.textContent='Nota fiscal';b.dataset.purchaseDoc='1';var actionIndex=h.children.length-1;h.insertBefore(b,h.children[actionIndex]);h.insertBefore(a,h.children[actionIndex]);
  var list=(typeof records!=='undefined'&&Array.isArray(records)?records:(window.records||[]));document.querySelectorAll('#tbody tr').forEach(function(tr){var edit=tr.querySelector('button[onclick*="editRecord"]'),id=edit&&((edit.getAttribute('onclick')||'').match(/editRecord\('([^']+)/)||[])[1],r=list.find(function(x){return x.id===id})||{};var ca=document.createElement('td');ca.innerHTML=typeof badge==='function'?badge(r.gta)+' '+(typeof fileLink==='function'?fileLink(r.gtaPdf,'GTA'):''):'';var cb=document.createElement('td');cb.innerHTML=typeof badge==='function'?badge(r.nota)+' '+(typeof fileLink==='function'?fileLink(r.notaPdf,'Nota'):''):'';var ai=tr.children.length-1;tr.insertBefore(cb,tr.children[ai]);tr.insertBefore(ca,tr.children[ai]);});
 }
 function numberedForSale(r,list){var direct=Array.isArray(r&&r.animalNumbersSold)?r.animalNumbersSold:(Array.isArray(r&&r.numerosAnimaisVendidos)?r.numerosAnimaisVendidos:[]);if(direct.length)return direct.map(String);var map={};try{map=JSON.parse((typeof userGet==='function'?userGet('gado_animais_v121'):localStorage.getItem('gado_animais_v121'))||'{}')}catch(e){}var used={};(list||[]).forEach(function(x){if(x.id===r.id)return;(x.animalNumbersSold||[]).forEach(function(n){used[String(n)]=1})});var out=[],lots=r&& (r.animalLotsSold||r.sourceLots)||[];if(!Array.isArray(lots))return out;lots.forEach(function(x){var nums=Array.isArray(map[x.lotId||x.id])?map[x.lotId||x.id]:[];nums.forEach(function(n){if(out.length<lots.reduce(function(a,z){return a+Number(z.quantity||z.quantidade||0)},0)&&!used[String(n)])out.push(String(n));});});return out;}
 function addSalesAt(){
  if((window.__negListView||'seller')!=='buyer')return;var h=document.querySelector('#negTableHead tr');if(!h||h.querySelector('[data-sales-at]'))return;var th=document.createElement('th');th.textContent='@';th.dataset.salesAt='1';h.insertBefore(th,h.children[6]);var wh=document.createElement('th');wh.textContent='Peso kg';wh.dataset.salesWeight='1';h.insertBefore(wh,th);var nh=document.createElement('th');nh.textContent='Nº animais';nh.dataset.salesNumbers='1';h.insertBefore(nh,h.children[h.children.length-1]);var list=(typeof records!=='undefined'&&Array.isArray(records)?records:(window.records||[]));document.querySelectorAll('#tbody tr').forEach(function(tr){var edit=tr.querySelector('button[onclick*="editRecord"]'),id=edit&&((edit.getAttribute('onclick')||'').match(/editRecord\('([^']+)/)||[])[1],r=list.find(function(x){return x.id===id})||{},kg=Number(r.pesoVendaKg||r.pesoKg||r.peso||0),td=document.createElement('td'),at=document.createElement('td'),nums=numberedForSale(r,list),nd=document.createElement('td');td.className='num';td.textContent=num.format(kg);at.className='num';at.textContent=num.format(kg/30);nd.textContent=nums.length?nums.join(', '):'—';nd.dataset.salesNumbers='1';tr.insertBefore(td,tr.children[6]);tr.insertBefore(at,tr.children[7]);tr.insertBefore(nd,tr.children[tr.children.length-1]);});
 }
 function sourceRecords(){try{return typeof records!=='undefined'&&Array.isArray(records)?records:(window.records||[])}catch(e){return window.records||[]}}
 function installReportAggregation(){if(typeof window.reportFilteredRecords!=='function'||window.reportFilteredRecords.__v132Grouped)return;var raw=window.reportFilteredRecords;window.reportFilteredRecords=function(){var list=raw.apply(this,arguments),groups={};list.forEach(function(r){var key=[r.data||'',r.comprador||'',r.vendedor||'',r.era||'',r.marca||''].join('|'),g=groups[key];if(!g){g={...r,quantCompra:0,quantVenda:0,pesoKg:0,precoCompra:0,precoVenda:0,installments:[],animalLotsSold:[],sourceLots:[]};groups[key]=g}var qc=Number(r.quantCompra||0),qv=Number(r.quantVenda||0),pc=Number(r.precoCompra||0),pv=Number(r.precoVenda||0);g.quantCompra+=qc;g.quantVenda+=qv;g.pesoKg+=Number(r.pesoKg||r.peso||0)*Math.max(qc,qv,1);g.precoCompra+=qc*pc;g.precoVenda+=qv*pv;if(Array.isArray(r.installments))g.installments=g.installments.concat(r.installments);['animalLotsSold','sourceLots'].forEach(function(k){if(Array.isArray(r[k]))g[k]=g[k].concat(r[k])});if(Array.isArray(r.parcelas))g.installments=g.installments.concat(r.parcelas);if(Array.isArray(r.animalNumbersSold))g.animalNumbersSold=(g.animalNumbersSold||[]).concat(r.animalNumbersSold)});return Object.keys(groups).map(function(k){var g=groups[k];g.precoCompra=g.quantCompra?g.precoCompra/g.quantCompra:0;g.precoVenda=g.quantVenda?g.precoVenda/g.quantVenda:0;g.pesoKg=(g.quantCompra||g.quantVenda)?g.pesoKg/(g.quantCompra||g.quantVenda):0;return g})};window.reportFilteredRecords.__v132Grouped=true;}
 function allocatedFromLot(id,excludeId){return sourceRecords().reduce(function(total,sale){if(excludeId&&sale.id===excludeId)return total;var lots=sale.animalLotsSold||sale.sourceLots||[];return total+(Array.isArray(lots)?lots.reduce(function(a,x){return a+((x.lotId||x.id)===id?Number(x.quantity||x.quantidade||0):0)},0):0)},0)}
 function refreshAllocatedStock(){var body=document.getElementById('stockBody');if(!body)return;var list=sourceRecords().filter(function(r){var saldo=Number(r.quantCompra||0)-Number(r.quantVenda||0)-allocatedFromLot(r.id);return saldo>0&&Number(r.quantCompra||0)>0}).sort(function(a,b){return (b.data||'').localeCompare(a.data||'')});body.innerHTML=list.map(function(r){var qc=Number(r.quantCompra||0),qv=Number(r.quantVenda||0),allocated=allocatedFromLot(r.id),saldo=Math.max(0,qc-qv-allocated),kg=Number(r.pesoKg||r.peso||0),pc=Number(r.precoCompra||0);return '<tr><td>'+fmtDate(r.data)+'</td><td><b>'+esc(r.loteCodigo||'—')+'</b></td><td>'+esc(r.vendedor||'')+'</td><td>'+esc(r.era||'—')+'</td><td class="num">'+num.format(qc)+'</td><td class="num">'+num.format(qv+allocated)+'</td><td class="num"><b>'+num.format(saldo)+'</b></td><td class="num">'+num.format(daysInStock(r))+'</td><td class="num">'+num.format(kg)+'</td><td class="num">'+money.format(pc)+'</td><td class="num">'+money.format(kg?pc/kg:0)+'</td><td class="num">'+money.format(saldo*pc)+'</td><td><span class="badge warn">'+(saldo===0?'Vendido':'Em estoque')+'</span></td><td>'+esc(r.parceiro||'—')+'</td></tr>';}).join('');}
 function run(){
  if(false)return;
  var legacy=document.getElementById('v66-neg-separate');
  if(legacy)legacy.remove();
  var legacyStyle=document.getElementById('v66-neg-separate-style');
  if(legacyStyle)legacyStyle.remove();
  document.querySelectorAll('.neg-v66-tab,[data-negv66-go]').forEach(function(x){x.onclick=null;x.style.display='none'});
  ['rSellerIdV121','rBuyerIdV121'].forEach(function(id){var e=document.getElementById(id);if(e&&e.closest('.field'))e.closest('.field').remove()});
  cleanText();
  // O seletor oficial de lotes é criado pelo v130; não duplicar a lista aqui.
  addPurchaseDocuments();
  addSaleCategory();
  addSaleWeight();
  var gen=document.getElementById('generatePaymentPlanBtn');if(gen&&!gen.dataset.v131Side){gen.dataset.v131Side='1';gen.addEventListener('click',function(){var side=document.getElementById('paymentPlanSide');if(side){side.value=window.__modeV127==='venda'?'Receber':'Pagar';side.dispatchEvent(new Event('change'))}} ,true)}
  syncClientNames();
  installReportAggregation();
  if(window.renderTable&&!window.renderTable.__v131Lists){var rt=window.renderTable;window.renderTable=function(){var out=rt.apply(this,arguments);addPurchaseHistoryDocs();addSalesAt();return out};window.renderTable.__v131Lists=true}
  if(window.renderStock&&!window.renderStock.__v131Allocated){var rs=window.renderStock;window.renderStock=function(){var out=rs.apply(this,arguments);refreshAllocatedStock();return out};window.renderStock.__v131Allocated=true}
  if(window.preview&&!window.preview.__v131Calc){var op=window.preview;window.preview=function(){var out=op.apply(this,arguments),t=document.getElementById('calcPreview'),m=document.getElementById('modalTitle');if(t&&m&&m.textContent.indexOf('Editar')>=0){var qc=Number(document.getElementById('rqcomp')?.value||0),qv=Number(document.getElementById('rqv')?.value||0),kg=Number(document.getElementById('rpeso')?.value||0),pc=Number(document.getElementById('rpc')?.value||0),pv=Number(document.getElementById('rpv')?.value||0),at=kg?num.format(kg/30):'0';if(qc>0&&qv===0)t.innerHTML='<b>Cálculos:</b> '+at+' @ • compra '+(kg?money.format(pc/kg):money.format(0))+'/kg • saldo '+qc+' cabeças • compra total '+money.format(qc*pc);else if(qv>0&&qc===0)t.innerHTML='<b>Cálculos:</b> '+at+' @ • venda '+(kg?money.format(pv/kg):money.format(0))+'/kg • venda total '+money.format(qv*pv)}return out};window.preview.__v131Calc=true}
  if(window.editRecord&&!window.editRecord.__v131Edit){var oe=window.editRecord;window.editRecord=function(id){window.__v131PendingLots=null;window.__v131SubmitLots=null;var rows=document.getElementById('loteRows130');if(rows){rows.innerHTML='';var add=document.getElementById('addLote130');if(add)add.click();delete rows.dataset.v131HydratedId;delete rows.dataset.v131OptionsHash}var picker=document.getElementById('v131LotPicker');if(picker){picker.querySelectorAll('input[type="checkbox"]').forEach(function(x){x.checked=false});picker.querySelectorAll('input[type="number"]').forEach(function(x){x.value=''})}var weight=document.getElementById('rpesoVenda');if(weight)weight.value='';var out=oe.apply(this,arguments);setTimeout(normalizeEditModal,120);setTimeout(normalizeEditModal,500);setTimeout(normalizeEditModal,1100);return out};window.editRecord.__v131Edit=true}
  var t=document.querySelector('.tabs'),p=t&&t.querySelector('[data-tab="painel"]');if(!t||!p)return;
  var oldNeg=t.querySelector('[data-tab="negociacoes"]');if(oldNeg)oldNeg.style.display='none';
  function add(id,label,view){var b=document.getElementById(id);if(!b){b=document.createElement('button');b.id=id;b.type='button';b.className='tabbtn';b.textContent=label;b.onclick=function(){document.querySelectorAll('.tabbtn').forEach(function(x){x.classList.remove('active')});document.querySelectorAll('.tab').forEach(function(x){x.classList.remove('active')});b.classList.add('active');var s=document.getElementById('negociacoes');if(s)s.classList.add('active');setModeRequirements(view==='buyer'?'venda':'compra');if(typeof setNegotiationListView==='function')setNegotiationListView(view);else{var q=document.querySelector('.neg-list-tab[data-listview="'+view+'"]');if(q&&typeof q.click==='function')q.click()}try{if(typeof renderTable==='function')renderTable()}catch(e){}var n=document.getElementById('newBtn');if(n)n.textContent=view==='seller'?'+ Nova compra':'+ Nova venda'};t.appendChild(b)}return b}
  var cad=t.querySelector('[data-tab="cadastrosV120"]')||byText('Cadastro'),ani=t.querySelector('[data-tab="animaisV121"]')||byText('Animais'),co=add('compraTelaV128','Compra','seller'),ve=add('vendaTelaV128','Venda','buyer'),es=t.querySelector('[data-tab="estoque"]')||byText('Estoque'),cu=t.querySelector('[data-tab="custos"]')||byText('$ Custos'),ma=t.querySelector('[data-tab="mapa"]')||byText('Mapa'),re=t.querySelector('[data-tab="relatorios"]')||byText('Relatório');
  var cur=p;[cad,co,ve,es,ani,cu,ma,re].filter(Boolean).forEach(function(x){t.insertBefore(x,cur.nextSibling);cur=x});
  t.dataset.v131Locked='1';
  t.style.visibility='';
 }
 document.addEventListener('click',function(ev){
  var x=ev.target&&ev.target.closest&&ev.target.closest('.neg-v66-tab,[data-negv66-go],[data-negv66="resumo"]');
  if(x){ev.preventDefault();ev.stopImmediatePropagation();x.style.display='none';}
 },true);
 document.addEventListener('change',function(ev){var s=ev.target;if(!s||!s.matches||!s.matches('select[data-client-select]'))return;var id=s.id==='rclienteCompra'?'rvendedor':'rcomprador',h=document.getElementById(id);if(h)h.value=s.value||'';},true);
 document.addEventListener('click',function(ev){var b=ev.target&&ev.target.closest&&ev.target.closest('#newBtn');if(b)setTimeout(function(){setModeRequirements((b.textContent||'').toLowerCase().indexOf('venda')>=0?'venda':'compra');if((b.textContent||'').toLowerCase().indexOf('venda')>=0)refreshEditLotOptions(null)},100)},true);
 document.addEventListener('submit',function(ev){var f=ev.target;if(!f||f.id!=='recordForm')return;['rclienteCompra','rclienteVenda'].forEach(function(sid){var s=document.getElementById(sid),hid=sid==='rclienteCompra'?'rvendedor':'rcomprador',h=document.getElementById(hid);if(s&&h)h.value=s.value||''});},true);
 document.addEventListener('submit',function(ev){var f=ev.target,sale=window.__modeV127==='venda'||window.__negListView==='buyer'||(Number(document.getElementById('rqv')?.value||0)>0&&Number(document.getElementById('rqcomp')?.value||0)===0);if(!f||f.id!=='recordForm'||!sale)return;window.__v131SaleEditId=(document.getElementById('rid')||{}).value||'';var total=Number(document.getElementById('rqv')?.value||0),chosen=[];document.querySelectorAll('#loteRows130 .field').forEach(function(row){var l=row.querySelector('.lote130'),q=row.querySelector('.qtdLote130');if(l&&l.value&&Number(q&&q.value||0)>0)chosen.push({lotId:l.value,quantity:Number(q.value)});});if(!chosen.length&&window.__v131PendingLots)chosen=window.__v131PendingLots.map(function(x){return {lotId:x.lotId||x.id,quantity:Number(x.quantity||x.quantidade||0)}});window.__v131SubmitLots=chosen;var sum=chosen.reduce(function(a,x){return a+Number(x.quantity||0)},0);if(total!==sum){ev.preventDefault();ev.stopImmediatePropagation();alert('A quantidade da venda deve ser igual à soma dos animais dos lotes. Venda: '+total+' • Lotes: '+sum);}},true);
 document.addEventListener('submit',function(ev){var sale=window.__modeV127==='venda'||window.__negListView==='buyer'||(Number(document.getElementById('rqv')?.value||0)>0&&Number(document.getElementById('rqcomp')?.value||0)===0);if(ev.target&&ev.target.id==='recordForm'&&sale){function syncSaleLots(){var chosen=window.__v131SubmitLots||window.__v131PendingLots||[],id=window.__v131SaleEditId||(document.getElementById('rid')||{}).value,list=(typeof records!=='undefined'&&records||window.records||[]),r=list.find(function(x){return x.id===id})||list[list.length-1];if(r&&chosen.length){r.animalLotsSold=chosen;r.sourceLots=chosen;if(!Array.isArray(r.animalNumbersSold)||!r.animalNumbersSold.length)r.animalNumbersSold=numberedForSale(r,list);r.updatedAt=new Date().toISOString();try{persist()}catch(e){}}try{if(typeof renderAll==='function')renderAll();else if(typeof renderStock==='function')renderStock();if(typeof renderTable==='function')renderTable();}catch(e){}}[150,600,1200,2200,4000].forEach(function(ms){setTimeout(syncSaleLots,ms);});}},false);
 document.addEventListener('submit',function(ev){var sale=window.__modeV127==='venda'||window.__negListView==='buyer'||(Number(document.getElementById('rqv')?.value||0)>0&&Number(document.getElementById('rqcomp')?.value||0)===0);if(ev.target&&ev.target.id==='recordForm'&&sale){setTimeout(function(){var id=document.getElementById('rid')?.value,r=(typeof records!=='undefined'&&records||[]).find(function(x){return x.id===id})||((typeof records!=='undefined'&&records||[]).slice(-1)[0]);var w=Number(document.getElementById('rpesoVenda')?.value||0);if(r&&w>0){r.pesoVendaKg=w;try{persist()}catch(e){}}},550)}},false);
 // A atualização contínua a cada 300 ms causava o pisca-pisca e reescrevia
 // selects enquanto o usuário editava. A normalização já é disparada pelos
 // eventos de abertura/alteração do modal e pelos timeouts controlados acima.
 var initialTabs=document.querySelector('.tabs');if(initialTabs)initialTabs.style.visibility='hidden';
 // Monta a navegação no primeiro ciclo, sem deixar as telas Compra/Venda
 // invisíveis enquanto o restante da sincronização termina.
 run();
 setTimeout(run,400);
 setTimeout(run,1600);
 new MutationObserver(function(){cleanText()}).observe(document.body,{subtree:true,childList:true});
})();

/* v180 — acabamento final para telas estreitas */
(function(){
  var st=document.createElement('style');
  st.textContent='@media(max-width:600px){.cattle-popup .leaflet-popup-content-wrapper{width:calc(100vw - 40px)!important;max-width:calc(100vw - 40px)!important}.cattle-popup .leaflet-popup-content{width:calc(100vw - 64px)!important;max-width:320px!important;overflow-x:hidden!important}.cattle-popup .map-popup,.cattle-popup .map-client-popup{min-width:0!important;max-width:100%!important}.cattle-popup table.smalltbl{width:100%!important;min-width:0!important;table-layout:fixed!important}.cattle-popup table.smalltbl th,.cattle-popup table.smalltbl td{padding:6px 3px!important;font-size:9px!important;white-space:nowrap!important;overflow:hidden!important;text-overflow:ellipsis!important}.cattle-popup table.smalltbl th:nth-child(1),.cattle-popup table.smalltbl td:nth-child(1){width:23%!important}.cattle-popup table.smalltbl th:nth-child(2),.cattle-popup table.smalltbl td:nth-child(2){width:15%!important}.cattle-popup table.smalltbl th:nth-child(3),.cattle-popup table.smalltbl td:nth-child(3){width:23%!important}.cattle-popup table.smalltbl th:nth-child(4),.cattle-popup table.smalltbl td:nth-child(4){width:12%!important}.cattle-popup table.smalltbl th:nth-child(5),.cattle-popup table.smalltbl td:nth-child(5){width:27%!important}.tab#cadastrosV120 .tablewrap{max-height:none!important;overflow-y:visible!important}.tab#cadastrosV120 .smalltbl{min-width:620px!important}}';
  document.head.appendChild(st);
})();
