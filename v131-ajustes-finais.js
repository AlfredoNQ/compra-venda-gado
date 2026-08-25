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
 function addLotPicker(){
  var box=document.getElementById('negV66Venda');if(!box||document.getElementById('v131LotPicker'))return;
  var lots=(window.records||[]).filter(function(r){return Number(r.quantCompra||0)-Number(r.quantVenda||0)>0});
  var d=document.createElement('div');d.id='v131LotPicker';d.className='field span2';d.innerHTML='<label>Lotes de origem da venda</label><div class="hint">Selecione um ou mais lotes e informe quantos animais saem de cada um.</div><div id="v131LotRows"></div>';
  var anchor=box.querySelector('.formgrid');if(anchor)anchor.insertBefore(d,anchor.firstChild);var rows=d.querySelector('#v131LotRows');
  lots.forEach(function(r){var saldo=Number(r.quantCompra||0)-Number(r.quantVenda||0),row=document.createElement('label');row.style.cssText='display:flex;gap:8px;align-items:center;margin:6px 0';row.innerHTML='<input type="checkbox" data-lot="'+r.id+'"> '+(r.vendedor||'Lote')+' • '+(r.era||'')+' • disponíveis: '+saldo+' <input type="number" min="1" max="'+saldo+'" step="1" data-lotq="'+r.id+'" style="width:90px" placeholder="Qtd">';rows.appendChild(row)});
  function collect(){var chosen=[];rows.querySelectorAll('[data-lot]:checked').forEach(function(c){var q=rows.querySelector('[data-lotq="'+c.dataset.lot+'"]');chosen.push({id:c.dataset.lot,quantidade:Number(q&&q.value||0)})});var qv=document.getElementById('rqv');if(chosen.length)qv.value=chosen.reduce(function(a,x){return a+x.quantidade},0);window.__v131PendingLots=chosen}
  rows.addEventListener('change',collect);rows.addEventListener('input',collect);
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
  addLotPicker();
  syncClientNames();
  if(window.renderTable&&!window.renderTable.__v131Lists){var rt=window.renderTable;window.renderTable=function(){var out=rt.apply(this,arguments),view=window.__negListView||'seller',idx=view==='buyer'?4:3;document.querySelectorAll('#tbody tr').forEach(function(tr){var cell=tr.querySelector('td:nth-child('+(idx+1)+')');var n=Number(String(cell&&cell.textContent||'0').replace(/[^0-9,.-]/g,'').replace(/\./g,'').replace(',','.'));if(!(n>0))tr.style.display='none'});return out};window.renderTable.__v131Lists=true}
  if(window.preview&&!window.preview.__v131Calc){var op=window.preview;window.preview=function(){var out=op.apply(this,arguments),t=document.getElementById('calcPreview'),m=document.getElementById('modalTitle');if(t&&m&&m.textContent.indexOf('Editar')>=0){var qc=Number(document.getElementById('rqcomp')?.value||0),qv=Number(document.getElementById('rqv')?.value||0),kg=Number(document.getElementById('rpeso')?.value||0),pc=Number(document.getElementById('rpc')?.value||0),pv=Number(document.getElementById('rpv')?.value||0),at=kg?num.format(kg/30):'0';if(qc>0&&qv===0)t.innerHTML='<b>Cálculos:</b> '+at+' @ • compra '+(kg?money.format(pc/kg):money.format(0))+'/kg • saldo '+qc+' cabeças • compra total '+money.format(qc*pc);else if(qv>0&&qc===0)t.innerHTML='<b>Cálculos:</b> '+at+' @ • venda '+(kg?money.format(pv/kg):money.format(0))+'/kg • venda total '+money.format(qv*pv)}return out};window.preview.__v131Calc=true}
  if(window.editRecord&&!window.editRecord.__v131Edit){var oe=window.editRecord;window.editRecord=function(id){var out=oe.apply(this,arguments);setTimeout(normalizeEditModal,120);setTimeout(normalizeEditModal,500);return out};window.editRecord.__v131Edit=true}
  var t=document.querySelector('.tabs'),p=t&&t.querySelector('[data-tab="painel"]');if(!t||!p)return;
  var oldNeg=t.querySelector('[data-tab="negociacoes"]');if(oldNeg)oldNeg.style.display='none';
  function add(id,label,view){var b=document.getElementById(id);if(!b){b=document.createElement('button');b.id=id;b.type='button';b.className='tabbtn';b.textContent=label;b.onclick=function(){document.querySelectorAll('.tabbtn').forEach(function(x){x.classList.remove('active')});b.classList.add('active');var s=document.getElementById('negociacoes');if(s)s.classList.add('active');if(typeof setNegotiationListView==='function')setNegotiationListView(view);else{var q=document.querySelector('.neg-list-tab[data-listview="'+view+'"]');if(q&&typeof q.click==='function')q.click()}var n=document.getElementById('newBtn');if(n)n.textContent=view==='seller'?'+ Nova compra':'+ Nova venda'};t.appendChild(b)}return b}
  var cad=t.querySelector('[data-tab="cadastrosV120"]')||byText('Cadastro'),ani=t.querySelector('[data-tab="animaisV121"]')||byText('Animais'),co=add('compraTelaV128','Compra','seller'),ve=add('vendaTelaV128','Venda','buyer'),es=t.querySelector('[data-tab="estoque"]')||byText('Estoque'),cu=t.querySelector('[data-tab="custos"]')||byText('$ Custos'),ma=t.querySelector('[data-tab="mapa"]')||byText('Mapa'),re=t.querySelector('[data-tab="relatorios"]')||byText('Relatório');
  var cur=p;[cad,co,ve,es,ani,cu,ma,re].filter(Boolean).forEach(function(x){t.insertBefore(x,cur.nextSibling);cur=x});
  t.dataset.v131Locked='1';
  t.style.visibility='';
 }
 document.addEventListener('click',function(ev){
  var x=ev.target&&ev.target.closest&&ev.target.closest('.neg-v66-tab,[data-negv66-go],[data-negv66="resumo"]');
  if(x){ev.preventDefault();ev.stopImmediatePropagation();x.style.display='none';}
 },true);
 document.addEventListener('change',function(ev){var s=ev.target;if(!s||!s.matches||!s.matches('select[data-client-select]'))return;var id=s.id==='rclienteCompra'?'rvendedor':'rcomprador',h=document.getElementById(id);if(h)h.value=s.value||'';},true);
 document.addEventListener('submit',function(ev){var f=ev.target;if(!f||f.id!=='recordForm')return;['rclienteCompra','rclienteVenda'].forEach(function(sid){var s=document.getElementById(sid),hid=sid==='rclienteCompra'?'rvendedor':'rcomprador',h=document.getElementById(hid);if(s&&h)h.value=s.value||''});},true);
 document.addEventListener('submit',function(ev){if(ev.target&&ev.target.id==='recordForm'&&window.__v131PendingLots){setTimeout(function(){var id=document.getElementById('rid')?.value,r=(window.records||[]).find(function(x){return x.id===id})||window.records&&window.records[window.records.length-1];if(r){r.sourceLots=window.__v131PendingLots;try{persist()}catch(e){}}},500)}},false);
 var initialTabs=document.querySelector('.tabs');if(initialTabs)initialTabs.style.visibility='hidden';
 setTimeout(run,800);
 new MutationObserver(function(){cleanText()}).observe(document.body,{subtree:true,childList:true});
})();
