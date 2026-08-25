/* v132 — compra/venda limpas, sem resumo nem campos duplicados */
(function(){
 function byText(txt){return Array.from(document.querySelectorAll('.tabs .tabbtn')).find(function(b){return (b.textContent||'').trim()===txt})}
 function cleanText(){
  document.querySelectorAll('button,a,h2,h3,h4,th,b,.ph h2,.sectiontitle').forEach(function(e){
   var s=(e.textContent||'').trim();
   if(s==='Continuar para Venda →'||s==='Continuar para Venda') e.style.display='none';
   if(s==='Vendedores / Compras') e.textContent='Compras';
   if(s==='Compradores / Vendas') e.textContent='Vendas';
   if(s==='🐂 Vendedores / Compras') e.textContent='Compras';
   if(s==='💰 Compradores / Vendas') e.textContent='Vendas';
   if(s==='📋 Negociações completas') e.style.display='none';
   if(s==='Compra / Vendedor') e.textContent='Compra';
   if(s==='Venda / Comprador') e.textContent='Venda';
   if(s==='🐂 Compra / Vendedor') e.textContent='Compra';
   if(s==='💰 Venda / Comprador') e.textContent='Venda';
   if(s==='Vendedor') e.textContent='Cliente';
   if(s==='Comprador') e.textContent='Cliente';
   if(s==='Clientes'&&e.closest('.tabs')) e.textContent='Cadastro';
   if(s==='Estoque atual'&&e.closest('.tabs')) e.textContent='Estoque';
   if(s==='A receber do comprador'){
    var card=e.closest('.neg-v66-card,.panel,.calc,.summary-card,.field')||e.parentElement;
    if(card)card.style.display='none';
   }
  });
  document.querySelectorAll('.neg-v66-top + div').forEach(function(e){if((e.textContent||'').indexOf('Escolha uma etapa da negociação')>=0)e.style.display='none'});
  document.querySelectorAll('.neg-v66-title').forEach(function(e){var s=(e.textContent||'').trim();if(s==='Compra / Vendedor')e.textContent='Compra';if(s==='Venda / Comprador')e.textContent='Venda'});
  var side=document.getElementById('paymentPlanSide');if(side&&side.closest('.field'))side.closest('.field').style.display='none';
  document.querySelectorAll('.neg-v66-tab,[data-negv66="resumo"]').forEach(function(e){e.style.display='none'});
  document.querySelectorAll('.neg-list-tabs').forEach(function(e){e.style.display='none'});
 }
 function syncClientNames(){
  function sync(selectId,legacyId){
   var sel=document.getElementById(selectId); if(!sel)return;
   var old=document.getElementById(legacyId);
   if(!old){old=document.createElement('input');old.type='hidden';old.id=legacyId;old.name=legacyId;var f=sel.closest('form');if(f)f.appendChild(old)}
   old.value=sel.options[sel.selectedIndex]?sel.options[sel.selectedIndex].text:'';
  }
  sync('rclienteCompra','rvendedor'); sync('rclienteVenda','rcomprador');
  ['rclienteCompra','rclienteVenda'].forEach(function(id){var s=document.getElementById(id);if(s&&!s.dataset.v131Sync){s.dataset.v131Sync='1';s.addEventListener('change',function(){sync('rclienteCompra','rvendedor');sync('rclienteVenda','rcomprador')})}});
  function hydrate(selectId,legacyId){
   var s=document.getElementById(selectId),old=document.getElementById(legacyId); if(!s||!old)return;
   var val=(old.value||'').trim(); if(!val)return;
   var opt=Array.from(s.options).find(function(o){return (o.value||'').trim()===val||(o.textContent||'').trim()===val});
   if(opt)s.value=opt.value;
  }
  hydrate('rclienteCompra','rvendedor'); hydrate('rclienteVenda','rcomprador');
  [300,800,1500].forEach(function(ms){setTimeout(function(){hydrate('rclienteCompra','rvendedor');hydrate('rclienteVenda','rcomprador')},ms)});
  var form=document.getElementById('recordForm');
  if(form&&!form.dataset.v131EditHydrate){
   form.dataset.v131EditHydrate='1';
   new MutationObserver(function(){hydrate('rclienteCompra','rvendedor');hydrate('rclienteVenda','rcomprador')}).observe(form,{childList:true,subtree:true});
  }
  ['rvendedor','rcomprador'].forEach(function(id){var x=document.getElementById(id);if(x&&!x.dataset.v131Hydrate){x.dataset.v131Hydrate='1';x.addEventListener('input',function(){hydrate('rclienteCompra','rvendedor');hydrate('rclienteVenda','rcomprador')})}});
 }
 function normalizeEditModal(){
  var title=document.getElementById('modalTitle'),rid=document.getElementById('rid');
  if(!title||title.textContent.indexOf('Editar')<0)return;
  var r=(window.records||[]).find(function(x){return x.id===(rid&&rid.value)}),isVenda=!!(r&&Number(r.quantVenda||0)>0&&!Number(r.quantCompra||0));
  var c=document.getElementById('negV66Compra'),v=document.getElementById('negV66Venda'),s=document.getElementById('negV66Resumo');
  if(c)c.style.display=isVenda?'none':'block'; if(v)v.style.display=isVenda?'block':'none'; if(s)s.style.display='block';
  var st=s&&s.querySelector('.neg-v66-title');if(st)st.textContent=isVenda?'Documentos e fechamento da venda':'Documentos e fechamento da compra';
 }
 function run(){
  if(document.querySelector('.tabs')?.dataset.v131Locked==='1')return;
  var legacy=document.getElementById('v66-neg-separate');
  if(legacy)legacy.remove();
  var legacyStyle=document.getElementById('v66-neg-separate-style');
  if(legacyStyle)legacyStyle.remove();
  document.querySelectorAll('.neg-v66-tab,[data-negv66-go]').forEach(function(x){x.onclick=null;x.style.display='none'});
  ['rSellerIdV121','rBuyerIdV121'].forEach(function(id){var e=document.getElementById(id);if(e&&e.closest('.field'))e.closest('.field').remove()});
  cleanText();
  syncClientNames();
  if(window.editRecord&&!window.editRecord.__v131Edit){var oe=window.editRecord;window.editRecord=function(id){var out=oe.apply(this,arguments);setTimeout(normalizeEditModal,120);setTimeout(normalizeEditModal,500);return out};window.editRecord.__v131Edit=true}
  var t=document.querySelector('.tabs'),p=t&&t.querySelector('[data-tab="painel"]');if(!t||!p)return;
  var oldNeg=t.querySelector('[data-tab="negociacoes"]');if(oldNeg)oldNeg.style.display='none';
  function add(id,label,view){var b=document.getElementById(id);if(!b){b=document.createElement('button');b.id=id;b.type='button';b.className='tabbtn';b.textContent=label;b.onclick=function(){document.querySelectorAll('.tabbtn').forEach(function(x){x.classList.remove('active')});b.classList.add('active');var s=document.getElementById('negociacoes');if(s)s.classList.add('active');var q=document.querySelector('.neg-list-tab[data-listview="'+view+'"]');if(q)q.click();var n=document.getElementById('newBtn');if(n)n.textContent=view==='seller'?'+ Nova compra':'+ Nova venda'};t.appendChild(b)}return b}
  var cad=t.querySelector('[data-tab="cadastrosV120"]')||byText('Cadastro'),ani=t.querySelector('[data-tab="animaisV121"]')||byText('Animais'),co=add('compraTelaV128','Compra','seller'),ve=add('vendaTelaV128','Venda','buyer'),es=t.querySelector('[data-tab="estoque"]')||byText('Estoque'),cu=t.querySelector('[data-tab="custos"]')||byText('$ Custos'),ma=t.querySelector('[data-tab="mapa"]')||byText('Mapa'),re=t.querySelector('[data-tab="relatorios"]')||byText('Relatório');
  var cur=p;[cad,co,ve,es,ani,cu,ma,re].filter(Boolean).forEach(function(x){t.insertBefore(x,cur.nextSibling);cur=x});
  t.dataset.v131Locked='1';
  t.style.visibility='';
 }
 document.addEventListener('click',function(ev){
  var x=ev.target&&ev.target.closest&&ev.target.closest('.neg-v66-tab,[data-negv66-go],[data-negv66="resumo"]');
  if(x){ev.preventDefault();ev.stopImmediatePropagation();x.style.display='none';}
 },true);
 var initialTabs=document.querySelector('.tabs');if(initialTabs)initialTabs.style.visibility='hidden';
 setTimeout(run,800);
 new MutationObserver(function(){cleanText()}).observe(document.body,{subtree:true,childList:true});
})();
