// Compra e Venda de Gado v87 — preserva sessao ao reconectar
(function(){
  if(window.__GADO_V87_SESSION_FIX__) return;
  window.__GADO_V87_SESSION_FIX__ = true;

  function preserveSessionOnReconnect(ev){
    try{
      if(ev && typeof ev.stopImmediatePropagation === 'function') ev.stopImmediatePropagation();
    }catch(_){ }

    try{
      if(window.cloudUser && typeof window.setAuthenticatedUI === 'function') {
        window.setAuthenticatedUI(true);
      }
    }catch(_){ }

    setTimeout(function(){
      try{
        if(typeof window.syncPendingNow === 'function') {
          window.syncPendingNow(false);
          return;
        }
        if(typeof window.cloudLoad === 'function') window.cloudLoad();
      }catch(_){ }
    }, 500);
  }

  // Captura o evento antes dos listeners antigos que chamam initCloud/login gate.
  window.addEventListener('online', preserveSessionOnReconnect, true);
})();
