/* Compra e Venda de Gado — v106 PDF open/delete */
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
  window.openStoredPdfV85=function(id){
    try{
      var doc=(window.__pdfDocsV85||{})[id];
      if(!doc||!doc.data) throw new Error('Documento não encontrado');
      var name=safeName(doc.name);
      if(window.AndroidPdf && typeof window.AndroidPdf.openPdf==='function'){window.AndroidPdf.openPdf(doc.data,name);return;}
      var blob=dataUrlToBlob(doc.data),url=URL.createObjectURL(blob),a=document.createElement('a');
      a.href=url;a.target='_blank';a.rel='noopener';a.download='';a.style.display='none';document.body.appendChild(a);a.click();a.remove();
      setTimeout(function(){try{URL.revokeObjectURL(url);}catch(e){}},120000);
    }catch(e){
      try{var doc=(window.__pdfDocsV85||{})[id];if(doc&&doc.data){var a=document.createElement('a');a.href=doc.data;a.target='_blank';a.rel='noopener';a.download=safeName(doc.name);document.body.appendChild(a);a.click();a.remove();return;}}catch(_){}
      alert('Não foi possível abrir o PDF: '+(e&&e.message?e.message:e));
    }
  };
  var cfg={gta:{input:'rgtaFile',status:'rgtaFileStatus',field:'gtaPdf',label:'GTA'},nota:{input:'rnotaFile',status:'rnotaFileStatus',field:'notaPdf',label:'Nota'},pay:{input:'rpayFile',status:'rpayFileStatus',field:'paymentPdf',label:'Comprovante'}};
  function currentRecord(){
    try{var id=(document.getElementById('rid')||{}).value||'';return (typeof records!=='undefined'&&Array.isArray(records))?records.find(function(x){return x.id===id;}):null;}catch(e){return null;}
  }
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
  try{var h=document.querySelector('header h1')||document.querySelector('h1');if(h){var spans=h.querySelectorAll('span');for(var i=0;i<spans.length;i++){if(/^v\d+$/i.test((spans[i].textContent||'').trim())){spans[i].textContent='v106';break;}}}}catch(e){}
  window.APP_WEB_VERSION='106';
})();
