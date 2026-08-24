/* Compra e Venda de Gado — v103 PDF opener */
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

      if(window.AndroidPdf && typeof window.AndroidPdf.openPdf==='function'){
        window.AndroidPdf.openPdf(doc.data,name);
        return;
      }

      var blob=dataUrlToBlob(doc.data);
      var url=URL.createObjectURL(blob);
      var a=document.createElement('a');
      a.href=url;
      a.target='_blank';
      a.rel='noopener';
      a.download='';
      a.style.display='none';
      document.body.appendChild(a);
      a.click();
      a.remove();

      setTimeout(function(){
        try{URL.revokeObjectURL(url);}catch(e){}
      },120000);
    }catch(e){
      try{
        var doc=(window.__pdfDocsV85||{})[id];
        if(doc&&doc.data){
          var a=document.createElement('a');
          a.href=doc.data;
          a.target='_blank';
          a.rel='noopener';
          a.download=safeName(doc.name);
          document.body.appendChild(a);
          a.click();
          a.remove();
          return;
        }
      }catch(_){}
      alert('Não foi possível abrir o PDF: '+(e&&e.message?e.message:e));
    }
  };

  window.APP_WEB_VERSION='103';
})();
