/* Compra e Venda de Gado — v111 PDF mobile modal + restauração segura */
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
  var activePdfUrl='';
  function closeWebPdfModal(){
    var m=document.getElementById('cvPdfModal111');
    if(m)m.remove();
    if(activePdfUrl){try{URL.revokeObjectURL(activePdfUrl);}catch(e){} activePdfUrl='';}
  }
  window.closeWebPdfModal111=closeWebPdfModal;
  function openWebPdf(doc){
    closeWebPdfModal();
    var blob=dataUrlToBlob(doc.data),url=URL.createObjectURL(blob),name=safeName(doc.name);
    activePdfUrl=url;
    var m=document.createElement('div');
    m.id='cvPdfModal111';
    m.style.cssText='position:fixed;inset:0;z-index:99999;background:#0b1711eF;display:flex;flex-direction:column;padding:0;margin:0';
    var bar=document.createElement('div');
    bar.style.cssText='display:flex;align-items:center;gap:8px;padding:10px;background:#173b28;color:white;min-height:54px';
    var title=document.createElement('div');
    title.textContent=name;
    title.style.cssText='font-weight:800;font-size:13px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;flex:1';
    var down=document.createElement('a');
    down.textContent='Baixar'; down.href=url; down.download=name;
    down.style.cssText='background:white;color:#173b28;padding:8px 12px;border-radius:8px;text-decoration:none;font-weight:800;font-size:12px';
    var close=document.createElement('button');
    close.type='button';close.textContent='Fechar';close.onclick=closeWebPdfModal;
    close.style.cssText='border:0;background:#fff0ee;color:#9f241c;padding:8px 12px;border-radius:8px;font-weight:800';
    bar.appendChild(title);bar.appendChild(down);bar.appendChild(close);
    var frame=document.createElement('iframe');
    frame.src=url;
    frame.setAttribute('title',name);
    frame.style.cssText='border:0;width:100%;height:calc(100vh - 54px);background:white;display:block';
    m.appendChild(bar);m.appendChild(frame);document.body.appendChild(m);
    setTimeout(function(){if(document.getElementById('cvPdfModal111')&&frame.contentWindow==null){window.location.href=url;}},2500);
  }
  window.openStoredPdfV85=function(id){
    try{
      var doc=(window.__pdfDocsV85||{})[id];
      if(!doc||!doc.data) throw new Error('Documento não encontrado');
      var name=safeName(doc.name);
      if(window.AndroidPdf && typeof window.AndroidPdf.openPdf==='function'){window.AndroidPdf.openPdf(doc.data,name);return;}
      openWebPdf(doc);
    }catch(e){
      try{var d=(window.__pdfDocsV85||{})[id];if(d&&d.data){var a=document.createElement('a');a.href=d.data;a.download=safeName(d.name);a.style.display='none';document.body.appendChild(a);a.click();a.remove();return;}}catch(_){}
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

  function forceWebVersion111(){try{document.title='Compra e Venda de Gado — v111';var h=document.querySelector('header h1')||document.querySelector('h1');if(h){var spans=h.querySelectorAll('span');for(var i=0;i<spans.length;i++){if(/^v\d+$/i.test((spans[i].textContent||'').trim()))spans[i].textContent='v111';}}}catch(e){}}
  forceWebVersion111();setTimeout(forceWebVersion111,1200);setTimeout(forceWebVersion111,3000);setInterval(forceWebVersion111,10000);window.APP_WEB_VERSION='111';
})();
