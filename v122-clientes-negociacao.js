/* v122 — clientes únicos e compra/venda sem resumo */
(function(){
  function esc(v){return String(v||'').replace(/[&<>"']/g,function(c){return({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])})}
  function clients(){try{return JSON.parse((window.userGet?userGet('gado_cadastros_v120'):localStorage.getItem('gado_cadastros_v120'))||'[]')}catch(e){return[]}}
  function setup(){
    document.querySelectorAll('.neg-v66-tab[data-negv66="resumo"], [data-negv66-go="resumo"]').forEach(function(x){x.style.display='none'});
    var summary=document.getElementById('negV66Resumo');if(summary){summary.style.display='block';var st=summary.querySelector('.neg-v66-title');if(st)st.textContent='Documentos e fechamento';var cards=summary.querySelector('.neg-v66-summary-grid');if(cards)cards.style.display='none'}
    var oldBuy=document.getElementById('rvendedor'),oldSell=document.getElementById('rcomprador');
    function replace(old,id,label){if(!old||document.getElementById(id))return;var s=document.createElement('select');s.id=id;s.required=old.required;s.className=old.className;s.setAttribute('data-client-select','1');var h=document.createElement('input');h.type='hidden';h.id=old.id;old.parentNode.replaceChild(s,old);s.parentNode.appendChild(h);var wrap=s.parentNode;var l=wrap.querySelector('label');if(l)l.textContent=label;}
    replace(oldBuy,'rclienteCompra','Cliente');replace(oldSell,'rclienteVenda','Cliente');
    var list=clients();['rclienteCompra','rclienteVenda'].forEach(function(id){var s=document.getElementById(id);if(!s)return;var cur=s.value;s.innerHTML='<option value="">Selecione um cliente cadastrado</option>'+list.map(function(x){return '<option value="'+esc(x.nome)+'">'+esc(x.nome)+'</option>'}).join('');if(cur)s.value=cur;var hid=id==='rclienteCompra'?'rvendedor':'rcomprador';s.onchange=function(){var h=document.getElementById(hid);if(h)h.value=s.value||''};s.oninput=s.onchange});
    var go=document.querySelector('[data-negv66-go="resumo"]');if(go)go.textContent='Continuar para documentos →';
    var form=document.getElementById('recordForm');if(form&&!form.dataset.v122){form.dataset.v122='1';form.addEventListener('submit',function(e){var a=document.getElementById('rclienteCompra'),b=document.getElementById('rclienteVenda');if(a&&document.getElementById('rqcomp')&&Number(document.getElementById('rqcomp').value)>0&&!a.value){e.preventDefault();alert('Selecione um cliente cadastrado para a compra.');return}if(b&&document.getElementById('rqv')&&Number(document.getElementById('rqv').value)>0&&!b.value){e.preventDefault();alert('Selecione um cliente cadastrado para a venda.');return}if(a&&document.getElementById('rvendedor'))document.getElementById('rvendedor').value=a.value;if(b&&document.getElementById('rcomprador'))document.getElementById('rcomprador').value=b.value})}
  }
  function init(){setup();setTimeout(setup,500);setTimeout(setup,1200)}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
  document.addEventListener('clientesAtualizados',function(e){var d=e.detail||{},oldName=d.oldName,newName=d.newName;if(oldName&&newName&&oldName!==newName&&typeof records!=='undefined'&&Array.isArray(records)){records.forEach(function(r){if(r.vendedor===oldName)r.vendedor=newName;if(r.comprador===oldName)r.comprador=newName});try{if(typeof persist==='function')persist();if(typeof renderAll==='function')renderAll()}catch(err){}}setup()});
  document.addEventListener('click',function(e){if(e.target.closest&&e.target.closest('#newRecordBtn,.new-record,.btn-new-record'))setTimeout(setup,100)});
})();
