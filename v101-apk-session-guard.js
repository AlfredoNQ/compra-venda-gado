/* Compra e Venda de Gado — v101 APK session guard */
(function(){
  try{
    var isApp=/CompraVendaGadoApp\//i.test(navigator.userAgent||'');
    if(!isApp)return;

    var LAST='gado_last_authenticated_user_v78';
    var explicitLogout=false;
    function hasLocalAuth(){try{return !!localStorage.getItem(LAST);}catch(e){return false;}}
    function keepAppOpen(){
      if(!hasLocalAuth()||explicitLogout)return;
      try{bootLoginApproved=true;}catch(e){}
      try{cloudUser=cloudUser||{id:localStorage.getItem(LAST)};}catch(e){}
      var app=document.getElementById('appShell');
      var gate=document.getElementById('loginGate');
      var login=document.getElementById('loginBtn');
      var logout=document.getElementById('logoutBtn');
      if(app)app.style.display='';
      if(gate)gate.style.display='none';
      if(login)login.style.display='none';
      if(logout)logout.style.display='';
    }

    if(typeof window.setAuthenticatedUI==='function'){
      var oldSet=window.setAuthenticatedUI;
      window.setAuthenticatedUI=function(ok){
        if(ok===false && hasLocalAuth() && !explicitLogout){keepAppOpen();return;}
        return oldSet(ok);
      };
    }

    if(typeof window.onCloudSession==='function'){
      var oldSession=window.onCloudSession;
      window.onCloudSession=async function(session){
        if(session&&session.user){
          try{rememberAuthenticatedUser(session.user);bootLoginApproved=true;}catch(e){}
          return oldSession(session);
        }
        if(hasLocalAuth()&&!explicitLogout){
          keepAppOpen();
          try{setCloudStatus(navigator.onLine?'Online • renovando sessão…':'Offline • acesso local','warn');}catch(e){}
          return false;
        }
        return oldSession(session);
      };
    }

    if(typeof window.cloudLogout==='function'){
      var oldLogout=window.cloudLogout;
      window.cloudLogout=async function(){
        explicitLogout=true;
        try{localStorage.removeItem(LAST);}catch(e){}
        return oldLogout();
      };
    }

    async function recover(){
      if(!hasLocalAuth()||explicitLogout)return;
      keepAppOpen();
      if(!navigator.onLine)return;
      try{
        if(typeof sb!=='undefined'&&sb){
          var r=await sb.auth.getSession();
          var s=r&&r.data&&r.data.session;
          if(s&&s.user){
            try{cloudUser=s.user;rememberAuthenticatedUser(s.user);bootLoginApproved=true;}catch(e){}
            keepAppOpen();
            try{if(typeof window.syncPendingNow==='function')await window.syncPendingNow(true);else if(typeof cloudLoad==='function')await cloudLoad();}catch(e){}
            return;
          }
        }
      }catch(e){}
      keepAppOpen();
      try{setCloudStatus('Online • sessão da nuvem pendente','warn');}catch(e){}
    }

    window.addEventListener('offline',function(){keepAppOpen();try{setCloudStatus('Offline • acesso local','warn');}catch(e){}},true);
    window.addEventListener('online',function(){keepAppOpen();setTimeout(recover,300);setTimeout(recover,1500);},true);
    window.addEventListener('pageshow',function(){keepAppOpen();},true);
    if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',function(){keepAppOpen();setTimeout(recover,300);});
    else {keepAppOpen();setTimeout(recover,300);}
  }catch(e){console.error('APK SESSION GUARD',e);}
})();
