/* Compra e Venda de Gado — v88 fixes */
(function(){
  window.APP_WEB_VERSION='88';

  function dataUrlToBlob(dataUrl){
    var p=String(dataUrl||'').split(',');
    if(p.length<2) throw new Error('PDF sem conteúdo válido');
    var meta=p[0]||'';
    var mime=(meta.match(/data:([^;]+)/)||[])[1]||'application/pdf';
    var bin=meta.indexOf(';base64')>=0 ? atob(p.slice(1).join(',')) : decodeURIComponent(p.slice(1).join(','));
    var bytes=new Uint8Array(bin.length);
    for(var i=0;i<bin.length;i++) bytes[i]=bin.charCodeAt(i)&255;
    return new Blob([bytes],{type:mime});
  }

  window.__pdfDocsV85=window.__pdfDocsV85||{};
  window.openStoredPdfV85=function(id){
    try{
      var doc=window.__pdfDocsV85[id];
      if(!doc||!doc.data) throw new Error('Documento não encontrado');
      var name=doc.name||'documento.pdf';
      if(window.AndroidPdf && typeof window.AndroidPdf.openPdf==='function'){
        window.AndroidPdf.openPdf(doc.data,name);
        return;
      }
      var blob=dataUrlToBlob(doc.data);
      var url=URL.createObjectURL(blob);
      var w=window.open(url,'_blank');
      if(!w){
        var a=document.createElement('a');
        a.href=url;
        a.target='_blank';
        a.rel='noopener';
        document.body.appendChild(a);
        a.click();
        a.remove();
      }
      setTimeout(function(){try{URL.revokeObjectURL(url)}catch(e){}},60000);
    }catch(e){
      alert('Não foi possível abrir o PDF: '+(e.message||e));
    }
  };

  window.fileLink=function(doc,label){
    if(!doc||!doc.data)return '—';
    var id='pdf85_'+Math.random().toString(36).slice(2)+Date.now().toString(36);
    window.__pdfDocsV85[id]=doc;
    return '<button type="button" class="mini" onclick="openStoredPdfV85(\''+id+'\')">Abrir PDF</button>';
  };

  var originalInitCloud=window.initCloud;
  window.initCloud=async function(){
    try{
      if(window.sb && navigator.onLine){
        var r=await window.sb.auth.getSession();
        var session=r&&r.data&&r.data.session;
        if(session&&session.user){
          window.cloudUser=session.user;
          if(typeof rememberAuthenticatedUser==='function') rememberAuthenticatedUser(session.user);
          if(typeof setAuthenticatedUI==='function') setAuthenticatedUI(true);
          if(typeof setCloudStatus==='function') setCloudStatus('Reconectado • sincronizando…','warn');
          if(typeof window.syncPendingNow==='function') setTimeout(function(){window.syncPendingNow(false)},150);
          else if(typeof cloudLoad==='function') setTimeout(cloudLoad,150);
          return;
        }
      }
    }catch(e){}
    if(typeof originalInitCloud==='function') return originalInitCloud();
  };

  function forceVersion(){
    try{
      document.body.setAttribute('data-app-version','88');
      document.title='Compra e Venda de Gado — v88';
      var h=document.querySelector('header h1');
      if(h){
        var spans=h.querySelectorAll('span');
        var found=false;
        spans.forEach(function(s){
          if(/^v\d+$/i.test((s.textContent||'').trim())){s.textContent='v88';found=true;}
        });
        if(!found){
          var b=document.createElement('span');
          b.textContent='v88';
          b.style.cssText='font-size:12px;font-weight:800;padding:3px 7px;border-radius:999px;background:rgba(255,255,255,.16);vertical-align:middle;white-space:nowrap;margin-left:6px';
          h.appendChild(b);
        }
      }
    }catch(e){}
  }

  function refresh(){
    forceVersion();
    try{if(typeof renderTable==='function')renderTable();}catch(e){}
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',refresh);
  else refresh();
  setTimeout(refresh,500);
  setTimeout(refresh,1500);
  window.addEventListener('online',function(){
    setTimeout(function(){
      try{if(typeof window.syncPendingNow==='function') window.syncPendingNow(false);}catch(e){}
    },250);
  });
})();
