/* v113 — leitor PDF próprio no Web móvel */
(function(){
  function isMobile(){return !window.AndroidPdf && (/Android|iPhone|iPad|iPod/i.test(navigator.userAgent||'') || window.innerWidth<=700);}
  function bytesFromDataUrl(dataUrl){
    var parts=String(dataUrl||'').split(',');
    if(parts.length<2) throw new Error('PDF sem conteúdo válido');
    var meta=parts[0]||'',payload=parts.slice(1).join(','),bin=meta.indexOf(';base64')>=0?atob(payload):decodeURIComponent(payload);
    var bytes=new Uint8Array(bin.length);for(var i=0;i<bin.length;i++)bytes[i]=bin.charCodeAt(i)&255;return bytes;
  }
  function safeName(name){var n=String(name||'documento.pdf').replace(/[\\/:*?"<>|]+/g,'_').trim();if(!/\.pdf$/i.test(n))n+='.pdf';return n||'documento.pdf';}
  function loadPdfJs(){
    if(window.pdfjsLib)return Promise.resolve(window.pdfjsLib);
    return new Promise(function(resolve,reject){
      var s=document.createElement('script');
      s.src='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
      s.onload=function(){try{window.pdfjsLib.GlobalWorkerOptions.workerSrc='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';resolve(window.pdfjsLib);}catch(e){reject(e);}};
      s.onerror=function(){reject(new Error('Não foi possível carregar o leitor de PDF.'));};
      document.head.appendChild(s);
    });
  }
  function close(){var m=document.getElementById('cvPdf113');if(m)m.remove();}
  window.closePdf113=close;
  async function show(doc){
    close();
    var m=document.createElement('div');m.id='cvPdf113';m.style.cssText='position:fixed;inset:0;z-index:100000;background:#111;display:flex;flex-direction:column';
    var bar=document.createElement('div');bar.style.cssText='display:flex;align-items:center;gap:8px;padding:10px;background:#173b28;color:#fff;min-height:54px';
    var title=document.createElement('div');title.textContent=safeName(doc.name);title.style.cssText='flex:1;font-weight:800;font-size:13px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap';
    var dl=document.createElement('button');dl.textContent='Baixar';dl.style.cssText='border:0;border-radius:8px;padding:8px 12px;font-weight:800';
    dl.onclick=function(){var b=new Blob([bytesFromDataUrl(doc.data)],{type:'application/pdf'}),u=URL.createObjectURL(b),a=document.createElement('a');a.href=u;a.download=safeName(doc.name);document.body.appendChild(a);a.click();a.remove();setTimeout(function(){URL.revokeObjectURL(u);},60000);};
    var x=document.createElement('button');x.textContent='Fechar';x.onclick=close;x.style.cssText='border:0;border-radius:8px;padding:8px 12px;font-weight:800';
    bar.appendChild(title);bar.appendChild(dl);bar.appendChild(x);
    var body=document.createElement('div');body.style.cssText='flex:1;overflow:auto;padding:10px;background:#2b2b2b;text-align:center';body.innerHTML='<div style="color:white;padding:30px;font-weight:700">Carregando PDF...</div>';
    m.appendChild(bar);m.appendChild(body);document.body.appendChild(m);
    try{
      var pdfjs=await loadPdfJs(),bytes=bytesFromDataUrl(doc.data),pdf=await pdfjs.getDocument({data:bytes}).promise;body.innerHTML='';
      for(var p=1;p<=pdf.numPages;p++){
        var page=await pdf.getPage(p),base=page.getViewport({scale:1}),max=Math.min(window.innerWidth-20,900),scale=max/base.width,viewport=page.getViewport({scale:scale});
        var c=document.createElement('canvas');c.width=Math.floor(viewport.width);c.height=Math.floor(viewport.height);c.style.cssText='display:block;max-width:100%;height:auto;margin:0 auto 12px;background:white;box-shadow:0 2px 12px #0008';body.appendChild(c);
        await page.render({canvasContext:c.getContext('2d'),viewport:viewport}).promise;
      }
    }catch(e){body.innerHTML='<div style="color:white;padding:30px">Falha ao visualizar: '+String(e&&e.message?e.message:e)+'</div>';}
  }
  var old=window.openStoredPdfV85;
  window.openStoredPdfV85=function(id){
    try{
      var doc=(window.__pdfDocsV85||{})[id];
      if(isMobile() && doc && doc.data){show(doc);return;}
    }catch(e){}
    if(typeof old==='function')return old(id);
  };
  function ver(){try{document.title='Compra e Venda de Gado — v113';var h=document.querySelector('header h1')||document.querySelector('h1');if(h)h.querySelectorAll('span').forEach(function(s){if(/^v\d+$/i.test((s.textContent||'').trim()))s.textContent='v113';});}catch(e){}}
  ver();setTimeout(ver,1000);setInterval(ver,10000);window.APP_WEB_VERSION='113';
})();
