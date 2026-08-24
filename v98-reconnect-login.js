/* Compra e Venda de Gado — v98 reconnect sem cair no login */
(function(){
  window.APP_WEB_VERSION='98';
  var reconnecting=false;
  var reconnectTimer=null;

  function showApp(){
    try{
      var app=document.getElementById('appShell');
      var gate=document.getElementById('loginGate');
      var login=document.getElementById('loginBtn');
      var logout=document.getElementById('logoutBtn');
      if(app)app.style.display='';
      if(gate)gate.style.display='none';
      if(login)login.style.display='none';
      if(logout)logout.style.display='';
      if(typeof setAuthenticatedUI==='function')setAuthenticatedUI(true);
    }catch(e){}
  }

  function status(t,kind){
    try{if(typeof setCloudStatus==='function')setCloudStatus(t,kind||'warn');}catch(e){}
  }

  async function resumeSession(){
    if(!navigator.onLine)return false;
    reconnecting=true;
    clearTimeout(reconnectTimer);
    reconnectTimer=setTimeout(function(){reconnecting=false;},15000);
    try{bootLoginApproved=true;}catch(e){}
    showApp();
    status('Reconectando • mantendo sessão…','warn');

    try{
      if(typeof sb==='undefined'||!sb||!sb.auth)return false;
      var result=await sb.auth.getSession();
      if(result&&result.error)throw result.error;
      var session=result&&result.data&&result.data.session;

      if(!session){
        try{
          var refreshed=await sb.auth.refreshSession();
          if(refreshed&&refreshed.error)throw refreshed.error;
          session=refreshed&&refreshed.data&&refreshed.data.session;
        }catch(e){}
      }

      if(session&&session.user){
        try{cloudUser=session.user;}catch(e){}
        try{bootLoginApproved=true;}catch(e){}
        try{rememberAuthenticatedUser(session.user);}catch(e){}
        showApp();
        if(typeof window.syncPendingNow==='function')await window.syncPendingNow(true);
        else if(typeof cloudLoad==='function')await cloudLoad();
        showApp();
        status('Sincronizado ✓','ok');
        reconnecting=false;
        return true;
      }

      /* Não derruba a interface por uma falha transitória de refresh.
         A tela de login continua reservada ao logout manual ou abertura sem sessão prévia. */
      showApp();
      status('Sessão aguardando reconexão','warn');
      return false;
    }catch(e){
      console.warn('v98 resumeSession',e);
      showApp();
      status('Reconectando…','warn');
      return false;
    }
  }

  /* Neutraliza a reinicialização antiga da nuvem durante reconexão. */
  var originalInit=window.initCloud;
  window.initCloud=function(){
    if(reconnecting||navigator.onLine&&window.__gadoWasOfflineV98){
      return resumeSession();
    }
    return typeof originalInit==='function'?originalInit.apply(this,arguments):undefined;
  };

  /* Protege a UI contra callbacks antigos de auth enquanto a internet volta. */
  var originalSetAuthenticatedUI=window.setAuthenticatedUI;
  window.setAuthenticatedUI=function(isAuth){
    if(reconnecting&&isAuth===false){showApp();return;}
    return typeof originalSetAuthenticatedUI==='function'?originalSetAuthenticatedUI(isAuth):undefined;
  };

  window.addEventListener('offline',function(){
    window.__gadoWasOfflineV98=true;
    reconnecting=false;
  },true);

  window.addEventListener('online',function(ev){
    reconnecting=true;
    try{bootLoginApproved=true;}catch(e){}
    try{ev.stopImmediatePropagation();}catch(e){}
    showApp();
    setTimeout(resumeSession,150);
  },true);

  window.addEventListener('pageshow',function(){
    try{
      if(typeof cloudUser!=='undefined'&&cloudUser){
        bootLoginApproved=true;
        showApp();
      }
    }catch(e){}
  },true);

  function forceVersion(){
    try{
      document.body.setAttribute('data-app-version','98');
      document.title='Compra e Venda de Gado — v98';
      var h=document.querySelector('header h1');
      if(h){
        var spans=h.querySelectorAll('span');
        spans.forEach(function(s){if(/^v\d+$/i.test((s.textContent||'').trim()))s.textContent='v98';});
      }
    }catch(e){}
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',forceVersion);else forceVersion();
  setTimeout(forceVersion,800);
})();
