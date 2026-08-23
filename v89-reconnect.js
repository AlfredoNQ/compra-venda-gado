(function(){
  var guard=0;
  function keep(){try{if(window.cloudUser&&typeof setAuthenticatedUI==='function')setAuthenticatedUI(true);}catch(e){}}
  async function sync(attempt){
    keep();
    try{
      if(window.sb&&navigator.onLine){
        var r=await window.sb.auth.getSession();
        var s=r&&r.data&&r.data.session;
        if(s&&s.user){
          window.cloudUser=s.user;
          keep();
          try{if(typeof rememberAuthenticatedUser==='function')rememberAuthenticatedUser(s.user);}catch(e){}
          try{if(typeof window.syncPendingNow==='function')await window.syncPendingNow(false);else if(typeof cloudLoad==='function')await cloudLoad();}catch(e){}
          return;
        }
      }
    }catch(e){}
    if(Date.now()<guard&&(attempt||0)<12)setTimeout(function(){sync((attempt||0)+1);},750);
  }
  window.addEventListener('online',function(e){
    guard=Date.now()+15000;
    try{e.stopImmediatePropagation();}catch(_){ }
    keep();
    setTimeout(function(){sync(0);},150);
  },true);
})();
