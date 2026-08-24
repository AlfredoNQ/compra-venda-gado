/* Compra e Venda de Gado — APK v112 session and sync guard */
(function(){
  try{
    var isApp=/CompraVendaGadoApp\//i.test(navigator.userAgent||'');
    if(!isApp)return;

    /* Android WebView can complete a Supabase request but discard its response as
       "Failed to fetch". Route this project's HTTPS calls through the native
       connection and expose a normal Fetch Response back to supabase-js. */
    (function installNativeCloudFetch(){
      if(!window.AndroidCloud||typeof window.AndroidCloud.request!=='function'||typeof window.fetch!=='function')return;
      var CLOUD_HOST='bvqttwnxszsduhwiblmv.supabase.co';
      var originalFetch=window.fetch.bind(window);
      var pending={};
      var sequence=0;

      window.__androidCloudFetchResult=function(id,result){
        var item=pending[id];
        if(!item)return;
        delete pending[id];
        clearTimeout(item.timer);
        if(!result||Number(result.status)===0){
          item.reject(new TypeError((result&&result.error)||'Falha na conexão com a nuvem'));
          return;
        }
        try{
          var status=Number(result.status)||500;
          var responseBody=(status===204||status===205||status===304)?null:(result.body||'');
          item.resolve(new Response(responseBody,{
            status:status,
            statusText:result.statusText||'',
            headers:result.headers||{}
          }));
        }catch(e){item.reject(e);}
      };

      function toBody(value){
        if(value==null)return Promise.resolve('');
        if(typeof value==='string')return Promise.resolve(value);
        if(typeof URLSearchParams!=='undefined'&&value instanceof URLSearchParams)return Promise.resolve(value.toString());
        if(typeof Blob!=='undefined'&&value instanceof Blob&&typeof value.text==='function')return value.text();
        return Promise.reject(new TypeError('Formato de envio não suportado pela ponte da nuvem'));
      }

      function nativeFetch(input,init){
        init=init||{};
        var request=(typeof Request!=='undefined'&&input instanceof Request)?input:null;
        var url=request?request.url:String(input);
        var method=String(init.method||(request&&request.method)||'GET').toUpperCase();
        var headers=new Headers(request?request.headers:undefined);
        if(init.headers)new Headers(init.headers).forEach(function(value,key){headers.set(key,value);});
        var headerObject={};
        headers.forEach(function(value,key){headerObject[key]=value;});
        var bodyValue=Object.prototype.hasOwnProperty.call(init,'body')?init.body:null;
        var bodyPromise;
        if(bodyValue!=null)bodyPromise=toBody(bodyValue);
        else if(request&&method!=='GET'&&method!=='HEAD')bodyPromise=request.clone().text();
        else bodyPromise=Promise.resolve('');

        return bodyPromise.then(function(body){
          return new Promise(function(resolve,reject){
            var id='cloud-'+Date.now().toString(36)+'-'+(++sequence).toString(36);
            var timer=setTimeout(function(){
              if(!pending[id])return;
              delete pending[id];
              reject(new TypeError('Tempo esgotado ao conectar com a nuvem'));
            },65000);
            pending[id]={resolve:resolve,reject:reject,timer:timer};
            try{window.AndroidCloud.request(id,url,method,JSON.stringify(headerObject),body);}
            catch(e){clearTimeout(timer);delete pending[id];reject(e);}
          });
        });
      }

      window.fetch=function(input,init){
        var raw=(typeof Request!=='undefined'&&input instanceof Request)?input.url:String(input);
        try{
          var target=new URL(raw,window.location.href);
          if(target.protocol==='https:'&&target.hostname===CLOUD_HOST)return nativeFetch(input,init);
        }catch(e){}
        return originalFetch(input,init);
      };
    })();

    var LAST='gado_last_authenticated_user_v78';
    var LAST_EMAIL='gado_last_auth_email_v112';
    var LEGACY_ACCESS='gado_access_token';
    var LEGACY_REFRESH='gado_refresh_token';
    var LAST_SYNC='gado_last_cloud_sync_v112';
    var explicitLogout=false;
    var recovering=false;
    var syncTimer=null;

    function read(key){try{return localStorage.getItem(key)||'';}catch(e){return '';}}
    function write(key,value){try{localStorage.setItem(key,value);}catch(e){}}
    function remove(key){try{localStorage.removeItem(key);}catch(e){}}
    function hasLocalAuth(){return !!read(LAST);}

    function formatTime(value){
      try{return new Date(Number(value)).toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'});}catch(e){return '';}
    }

    function cloudIndicator(){
      var el=document.getElementById('apkCloudIndicator');
      if(el)return el;
      var row=document.querySelector('header .head > div:last-child');
      if(!row)return null;
      var style=document.getElementById('apkCloudIndicatorStyle');
      if(!style){
        style=document.createElement('style');
        style.id='apkCloudIndicatorStyle';
        style.textContent='#apkCloudIndicator{display:inline-flex;align-items:center;min-height:34px;padding:7px 12px;border:1px solid rgba(255,255,255,.38);border-radius:999px;background:#fff;color:#175b42;font:800 12px/1 system-ui,-apple-system,sans-serif;letter-spacing:.05px;box-shadow:0 2px 9px rgba(0,0,0,.16);white-space:nowrap;cursor:pointer}#apkCloudIndicator.sync{background:#fff3cf;color:#775300}#apkCloudIndicator.pending{background:#ffe4df;color:#9c2d1c}#apkCloudIndicator.offline{background:#e9edf1;color:#425366}@media(max-width:700px){#apkCloudIndicator{font-size:11px;padding:6px 9px;min-height:31px}}';
        var holder=document.head||document.documentElement;
        if(holder&&holder.appendChild)holder.appendChild(style);
      }
      el=document.createElement('button');
      el.id='apkCloudIndicator';
      el.type='button';
      if(el.setAttribute)el.setAttribute('aria-label','Status da sincronização');
      el.onclick=function(){
        var mode=el.dataset.mode||'';
        if(mode==='reconnect'){authModal();return;}
        try{if(typeof window.syncPendingNow==='function')window.syncPendingNow(true);}catch(e){}
      };
      if(row.insertBefore)row.insertBefore(el,row.firstChild);else if(row.appendChild)row.appendChild(el);
      return el;
    }

    function paintCloudStatus(text,kind){
      var el=cloudIndicator();
      if(!el)return;
      var raw=String(text||'');
      var lower=raw.toLowerCase();
      var mode='sync', label='☁ Sincronizando…';
      if(/salvo na nuvem|dados sincronizados/.test(lower)){
        write(LAST_SYNC,String(Date.now()));
        mode='ok';
        label='☁ Salvo • '+formatTime(read(LAST_SYNC));
      }else if(/offline/.test(lower)){
        mode='offline';
        label='☁ Offline • dados no aparelho';
      }else if(/pendente|erro na nuvem/.test(lower)){
        mode='pending';
        label='☁ Pendente • toque para enviar';
      }else if(/sessão expirada|reconecte|acesso protegido/.test(lower)){
        mode='pending';
        label='☁ Reconectar nuvem';
        el.dataset.mode='reconnect';
      }
      if(mode!=='pending'||el.dataset.mode!=='reconnect')el.dataset.mode='';
      el.className=mode==='ok'?'':mode;
      el.textContent=label;
      el.title=raw||label;
    }

    function installCloudStatusVisual(){
      if(typeof window.setCloudStatus!=='function'||window.setCloudStatus.__apkVisual)return;
      var original=window.setCloudStatus;
      function wrapped(text,kind){
        var result=original.apply(this,arguments);
        paintCloudStatus(text,kind);
        return result;
      }
      wrapped.__apkVisual=true;
      window.setCloudStatus=wrapped;
    }

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
      paintCloudStatus('Sessão expirada • reconecte a nuvem','warn');
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

    installCloudStatusVisual();
    var previousSync=read(LAST_SYNC);
    if(previousSync)paintCloudStatus('Salvo na nuvem • última sincronização '+formatTime(previousSync),'ok');
    else paintCloudStatus('Conectando à nuvem…','warn');

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
