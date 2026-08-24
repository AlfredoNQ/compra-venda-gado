/* Compra e Venda de Gado — APK v112 session and sync guard */
(function(){
  try{
    var isApp=/CompraVendaGadoApp\//i.test(navigator.userAgent||'');
    if(!isApp)return;

    var LAST='gado_last_authenticated_user_v78';
    var LAST_EMAIL='gado_last_auth_email_v112';
    var LEGACY_ACCESS='gado_access_token';
    var LEGACY_REFRESH='gado_refresh_token';
    var explicitLogout=false;
    var recovering=false;
    var syncTimer=null;

    function read(key){try{return localStorage.getItem(key)||'';}catch(e){return '';}}
    function write(key,value){try{localStorage.setItem(key,value);}catch(e){}}
    function remove(key){try{localStorage.removeItem(key);}catch(e){}}
    function hasLocalAuth(){return !!read(LAST);}

    function keepAppOpen(){
      if(!hasLocalAuth()||explicitLogout)return;
      try{bootLoginApproved=true;}catch(e){}
      try{cloudUser=cloudUser||{id:read(LAST)};}catch(e){}
      var app=document.getElementById('appShell');
      var gate=document.getElementById('loginGate');
      var login=document.getElementById('loginBtn');
      var logout=document.getElementById('logoutBtn');
      if(app)app.style.display='';
      if(gate)gate.style.display='none';
      if(login)login.style.display='none';
      if(logout)logout.style.display='';
    }

    function authModal(){
      keepAppOpen();
      var modal=document.getElementById('authModal');
      var email=document.getElementById('authEmail');
      var msg=document.getElementById('authMsg');
      var savedEmail=read(LAST_EMAIL);
      if(email&&savedEmail&&!email.value)email.value=savedEmail;
      if(msg)msg.textContent='Seus dados continuam salvos. Digite seu e-mail e senha para reconectar a nuvem.';
      if(modal)modal.classList.add('show');
      if(email)setTimeout(function(){try{email.focus();}catch(e){}},50);
    }

    function syncButton(){
      var button=document.getElementById('syncNowBtn');
      if(button)return button;
      var row=document.querySelector('header .head > div:last-child');
      if(!row)return null;
      button=document.createElement('button');
      button.id='syncNowBtn';
      button.type='button';
      button.className='cloudbtn';
      row.appendChild(button);
      return button;
    }

    function showReconnect(){
      if(!hasLocalAuth()||explicitLogout)return;
      keepAppOpen();
      try{setCloudStatus('Sessão expirada • reconecte a nuvem','warn');}catch(e){}
      var status=document.getElementById('offlineStatus');
      if(status){status.textContent='Online • dados protegidos no aparelho';status.className='cloudpill warn';}
      var save=document.getElementById('saveStatus');
      if(save)save.textContent='Dados preservados • entre novamente para sincronizar';
      var button=syncButton();
      if(button){
        button.dataset.apkReconnect='1';
        button.textContent='Reconectar nuvem';
        button.style.display='';
        button.onclick=authModal;
      }
    }

    function restoreSyncButton(){
      var button=document.getElementById('syncNowBtn');
      if(!button||button.dataset.apkReconnect!=='1')return;
      delete button.dataset.apkReconnect;
      button.textContent='Sincronizar agora';
      button.style.display='none';
      button.onclick=function(){
        try{if(typeof window.syncPendingNow==='function')window.syncPendingNow(true);}catch(e){}
      };
    }

    function scheduleSync(){
      clearTimeout(syncTimer);
      syncTimer=setTimeout(async function(){
        try{
          if(typeof cloudLoad==='function')await cloudLoad();
          else if(typeof window.syncPendingNow==='function')await window.syncPendingNow(false);
        }catch(e){
          try{console.warn('APK CLOUD SYNC',e);}catch(_){}
        }
      },120);
    }

    function acceptSession(session){
      if(!session||!session.user)return false;
      try{
        cloudUser=session.user;
        rememberAuthenticatedUser(session.user);
        bootLoginApproved=true;
        if(session.user.email)write(LAST_EMAIL,session.user.email);
      }catch(e){}
      keepAppOpen();
      restoreSyncButton();
      try{setCloudStatus('Conectado • sincronizando…','warn');}catch(e){}
      try{if(typeof migrateGenericStorageToUser==='function')migrateGenericStorageToUser();}catch(e){}
      try{if(typeof loadScopedLocalData==='function')loadScopedLocalData();}catch(e){}
      try{if(typeof setAuthenticatedUI==='function')setAuthenticatedUI(true);}catch(e){}
      scheduleSync();
      return true;
    }

    async function recoverLegacySession(){
      var access=read(LEGACY_ACCESS);
      var refresh=read(LEGACY_REFRESH);
      if(!refresh||typeof sb==='undefined'||!sb||!sb.auth)return false;
      try{
        var result=await sb.auth.setSession({access_token:access,refresh_token:refresh});
        var session=result&&result.data&&result.data.session;
        if(result&&result.error)throw result.error;
        if(acceptSession(session))return true;
      }catch(e){
        remove(LEGACY_ACCESS);
        remove(LEGACY_REFRESH);
      }
      return false;
    }

    if(typeof window.setAuthenticatedUI==='function'){
      var oldSet=window.setAuthenticatedUI;
      window.setAuthenticatedUI=function(ok){
        if(ok===false&&hasLocalAuth()&&!explicitLogout){keepAppOpen();return;}
        return oldSet(ok);
      };
    }

    if(typeof window.onCloudSession==='function'){
      var oldSession=window.onCloudSession;
      window.onCloudSession=function(session){
        if(session&&session.user){
          acceptSession(session);
          return true;
        }
        if(hasLocalAuth()&&!explicitLogout){
          keepAppOpen();
          if(navigator.onLine)showReconnect();
          else try{setCloudStatus('Offline • acesso local','warn');}catch(e){}
          return false;
        }
        return oldSession(session);
      };
    }

    if(typeof window.cloudLogout==='function'){
      var oldLogout=window.cloudLogout;
      window.cloudLogout=async function(){
        explicitLogout=true;
        remove(LAST);
        return oldLogout();
      };
    }

    async function recover(){
      if(!hasLocalAuth()||explicitLogout||recovering)return;
      keepAppOpen();
      if(!navigator.onLine)return;
      if(typeof sb==='undefined'||!sb||!sb.auth){
        setTimeout(recover,500);
        return;
      }
      recovering=true;
      try{
        var result=await sb.auth.getSession();
        var session=result&&result.data&&result.data.session;
        if(result&&result.error)throw result.error;
        if(acceptSession(session))return;
        if(await recoverLegacySession())return;
      }catch(e){
        try{console.warn('APK SESSION RECOVERY',e);}catch(_){}
      }finally{
        recovering=false;
      }
      showReconnect();
    }

    window.addEventListener('offline',function(){
      keepAppOpen();
      try{setCloudStatus('Offline • acesso local','warn');}catch(e){}
    },true);
    window.addEventListener('online',function(){
      keepAppOpen();
      setTimeout(recover,300);
      setTimeout(recover,1500);
    },true);
    window.addEventListener('pageshow',function(){keepAppOpen();},true);
    if(document.readyState==='loading'){
      document.addEventListener('DOMContentLoaded',function(){keepAppOpen();setTimeout(recover,300);});
    }else{
      keepAppOpen();
      setTimeout(recover,300);
    }
  }catch(e){console.error('APK SESSION GUARD',e);}
})();
