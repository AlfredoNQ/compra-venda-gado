/* Compra e Venda de Gado — v112 PDF mobile direto + restauração segura */
(function(){
  function dataUrlToBlob(dataUrl){
    var parts=String(dataUrl||'').split(',');
    if(parts.length<2) throw new Error('PDF sem conteúdo válido');
    var meta=parts[0]||'';
    var mime=(meta.match(/data:([^;]+)/)||[])[1]||'application/pdf';
    var payload=parts.slice(1).join(',');
    var bin=meta.indexOf(';base64')>=0 ? atob(payload) : decodeURIComponent(payload);
    var bytes=new Uint8Array(bin.length);
    for(var i=0;i<bin.length;i++) bytes[i]=bin.charCodeAt(i)&255;
    return new Blob([bytes],{type:mime});
  }
  function safeName(name){
    var n=String(name||'documento.pdf').replace(/[\\/:*?"<>|]+/g,'_').trim();
    if(!/\.pdf$/i.test(n)) n+='.pdf';
    return n||'documento.pdf';
  }
  function isMobileWeb(){
    return !window.AndroidPdf && (/Android|iPhone|iPad|iPod/i.test(navigator.userAgent||'') || window.innerWidth<=700);
  }
  function downloadPdf(doc){
    var blob=dataUrlToBlob(doc.data),url=URL.createObjectURL(blob),a=document.createElement('a');
    a.href=url;a.download=safeName(doc.name);a.rel='noopener';a.style.display='none';
    document.body.appendChild(a);a.click();a.remove();
    setTimeout(function(){try{URL.revokeObjectURL(url);}catch(e){}},120000);
  }
  function openPdfDirect(doc){
    var target='gadoPdf_'+Date.now()+'_'+Math.random().toString(36).slice(2);
    var popup=null;
    try{popup=window.open('about:blank',target);}catch(e){}
    try{
      if(popup){
        popup.document.open();
        popup.document.write('<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><title>Abrindo PDF...</title><body style="font-family:system-ui;padding:24px">Abrindo PDF...</body>');
        popup.document.close();
      }
    }catch(e){}
    var form=document.createElement('form');
    form.method='POST';
    form.action='/api/pdf-open';
    form.target=popup?target:'_self';
    form.enctype='multipart/form-data';
    form.style.display='none';
    var d=document.createElement('input');d.type='hidden';d.name='pdf';d.value=doc.data;
    var n=document.createElement('input');n.type='hidden';n.name='name';n.value=safeName(doc.name);
    form.appendChild(d);form.appendChild(n);document.body.appendChild(form);
    form.submit();
    setTimeout(function(){try{form.remove();}catch(e){}},1000);
  }
  function openPdfDesktop(doc){
    var blob=dataUrlToBlob(doc.data),url=URL.createObjectURL(blob),w=null;
    try{w=window.open(url,'_blank','noopener,noreferrer');}catch(e){}
    if(!w){try{window.location.href=url;}catch(e){downloadPdf(doc);}}
    setTimeout(function(){try{URL.revokeObjectURL(url);}catch(e){}},300000);
  }
  window.openStoredPdfV85=function(id){
    try{
      var doc=(window.__pdfDocsV85||{})[id];
      if(!doc||!doc.data) throw new Error('Documento não encontrado');
      var name=safeName(doc.name);
      if(window.AndroidPdf && typeof window.AndroidPdf.openPdf==='function'){
        window.AndroidPdf.openPdf(doc.data,name);return;
      }
      if(isMobileWeb()) openPdfDirect(doc); else openPdfDesktop(doc);
    }catch(e){
      try{var d=(window.__pdfDocsV85||{})[id];if(d&&d.data){downloadPdf(d);return;}}catch(_){}
      alert('Não foi possível abrir o PDF: '+(e&&e.message?e.message:e));
    }
  };

  var cfg={gta:{input:'rgtaFile',status:'rgtaFileStatus',field:'gtaPdf',label:'GTA'},nota:{input:'rnotaFile',status:'rnotaFileStatus',field:'notaPdf',label:'Nota'},pay:{input:'rpayFile',status:'rpayFileStatus',field:'paymentPdf',label:'Comprovante'}};
  function currentRecord(){try{var id=(document.getElementById('rid')||{}).value||'';return (typeof records!=='undefined'&&Array.isArray(records))?records.find(function(x){return x.id===id;}):null;}catch(e){return null;}}
  function registerDoc(doc){if(!doc||!doc.data)return null;window.__pdfDocsV85=window.__pdfDocsV85||{};var id='pdf-'+Math.random().toString(36).slice(2)+Date.now().toString(36);window.__pdfDocsV85[id]=doc;return id;}
  function htmlEsc(s){return String(s||'').replace(/[&<>"']/g,function(m){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m];});}
  function renderOne(key,doc){
    var c=cfg[key],st=document.getElementById(c.status),inp=document.getElementById(c.input);if(!st||!inp)return;inp.dataset.deletePdf='0';
    if(!doc||!doc.data){st.innerHTML='';return;}
    var id=registerDoc(doc),nm=doc.name||c.label+'.pdf';
    st.innerHTML='<div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap;margin-top:6px"><span class="hint" style="max-width:220px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="'+htmlEsc(nm)+'">'+htmlEsc(nm)+'</span><button type="button" class="mini" onclick="openStoredPdfV85(\''+id+'\')">Abrir PDF</button><button type="button" class="mini" style="background:#fff0ee;color:#b42318" onclick="markPdfDeleteV106(\''+key+'\')">Excluir PDF</button></div>';
  }
  window.markPdfDeleteV106=function(key){var c=cfg[key];if(!c)return;var inp=document.getElementById(c.input),st=document.getElementById(c.status);if(!inp||!st)return;inp.dataset.deletePdf='1';inp.value='';st.innerHTML='<div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap;margin-top:6px"><span class="hint" style="color:#b42318;font-weight:700">PDF será excluído ao salvar</span><button type="button" class="mini" onclick="cancelPdfDeleteV106(\''+key+'\')">Cancelar exclusão</button></div>';};
  window.cancelPdfDeleteV106=function(key){var r=currentRecord();if(r)renderOne(key,r[cfg[key].field]);};
  function renderCurrentDocs(){var r=currentRecord();Object.keys(cfg).forEach(function(k){renderOne(k,r?r[cfg[k].field]:null);});}
  var oldFileToStoredObject=window.fileToStoredObject;
  if(typeof oldFileToStoredObject==='function')window.fileToStoredObject=async function(input,oldDoc){if(input&&input.dataset&&input.dataset.deletePdf==='1')return null;return oldFileToStoredObject(input,oldDoc);};
  var oldEdit=window.editRecord;if(typeof oldEdit==='function')window.editRecord=function(id){var r=oldEdit(id);setTimeout(renderCurrentDocs,0);return r;};
  var oldNew=window.newRecord;if(typeof oldNew==='function')window.newRecord=function(){var r=oldNew();setTimeout(function(){Object.keys(cfg).forEach(function(k){renderOne(k,null);});},0);return r;};
  Object.keys(cfg).forEach(function(k){var inp=document.getElementById(cfg[k].input);if(!inp)return;inp.addEventListener('change',function(){inp.dataset.deletePdf='0';var f=inp.files&&inp.files[0],st=document.getElementById(cfg[k].status);if(f&&st)st.innerHTML='<div class="hint" style="margin-top:6px">Novo arquivo: <b>'+htmlEsc(f.name)+'</b> — será salvo ao confirmar a negociação.</div>';});});

  function itemKey(x){if(x&&x.id!=null)return 'id:'+String(x.id);try{return 'sig:'+JSON.stringify(x);}catch(e){return 'sig:'+String(x);}}
  function ts(x){var t=Date.parse(x&&x.updatedAt||'');return isNaN(t)?0:t;}
  function mergeSafe(current,incoming){var map=new Map(),order=[];(Array.isArray(current)?current:[]).forEach(function(x){var k=itemKey(x);if(!map.has(k))order.push(k);map.set(k,x);});(Array.isArray(incoming)?incoming:[]).forEach(function(x){var k=itemKey(x);if(!map.has(k)){order.push(k);map.set(k,x);return;}var old=map.get(k);if(ts(x)>ts(old))map.set(k,x);});return order.map(function(k){return map.get(k);});}
  function safetyBackup(){try{if(typeof download!=='function')return false;var now=new Date().toISOString().replace(/[:.]/g,'-');download('backup_antes_restaurar_'+now+'.json',JSON.stringify({records:records,costs:costs},null,2),'application/json');return true;}catch(e){return false;}}
  function installSafeRestore(){
    var inp=document.getElementById('restore');if(!inp||inp.dataset.safeRestoreV109==='1')return;inp.dataset.safeRestoreV109='1';
    inp.addEventListener('change',function(e){e.stopImmediatePropagation();var f=inp.files&&inp.files[0];if(!f)return;var rd=new FileReader();rd.onload=function(){try{var x=JSON.parse(rd.result),incRecords,incCosts;if(Array.isArray(x)){incRecords=x;incCosts=[];}else{incRecords=x&&x.records;incCosts=x&&x.costs;}if(!Array.isArray(incRecords))throw new Error('Arquivo não contém uma lista válida de negociações.');if(incCosts!=null&&!Array.isArray(incCosts))throw new Error('Lista de custos inválida.');incCosts=Array.isArray(incCosts)?incCosts:[];safetyBackup();var mode=prompt('RESTAURAÇÃO SEGURA\n\nDigite MESCLAR para recuperar o backup sem apagar dados mais novos.\nDigite SUBSTITUIR para trocar toda a base atual pelo arquivo.\n\nRecomendado: MESCLAR','MESCLAR');if(!mode){inp.value='';return;}mode=String(mode).trim().toUpperCase();if(mode==='MESCLAR'){records=mergeSafe(records,incRecords);costs=mergeSafe(costs,incCosts);}else if(mode==='SUBSTITUIR'){if(!confirm('ATENÇÃO: SUBSTITUIR remove da base atual tudo que não estiver neste backup. Confirma?')){inp.value='';return;}records=incRecords;costs=incCosts;}else{alert('Opção inválida. Nada foi alterado.');inp.value='';return;}persist();renderAll();alert(mode==='MESCLAR'?'Backup mesclado com segurança. Os dados mais novos foram preservados.':'Backup substituído. Um backup preventivo foi gerado antes da restauração.');}catch(err){alert('Backup inválido: '+(err&&err.message?err.message:err));}inp.value='';};rd.onerror=function(){alert('Não foi possível ler o arquivo de backup.');inp.value='';};rd.readAsText(f);},true);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',installSafeRestore);else installSafeRestore();

  function forceWebVersion112(){try{document.title='Compra e Venda de Gado — v112';var h=document.querySelector('header h1')||document.querySelector('h1');if(h){var spans=h.querySelectorAll('span');for(var i=0;i<spans.length;i++){if(/^v\d+$/i.test((spans[i].textContent||'').trim()))spans[i].textContent='v112';}}}catch(e){}}
  forceWebVersion112();setTimeout(forceWebVersion112,800);setTimeout(forceWebVersion112,2000);setInterval(forceWebVersion112,10000);window.APP_WEB_VERSION='112';
})();
