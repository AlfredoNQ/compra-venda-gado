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
 (function(){var st=document.createElement('style');st.textContent='.tabs{position:relative;z-index:30;background:#fff!important}.tabs .tabbtn{position:relative;z-index:31}.tab#negociacoes .tablewrap{overflow-x:auto}.tab#negociacoes table{font-size:12px}.tab#negociacoes th,.tab#negociacoes td{white-space:nowrap;padding:9px 10px}.tab#negociacoes th[data-sales-at],.tab#negociacoes th[data-sales-weight]{text-align:center;min-width:70px}.tab#negociacoes td.num{text-align:center}';document.head.appendChild(st)})();
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
  var list=(typeof records!=='undefined'&&Array.isArray(records)?records:(window.records||[]));var r=list.find(function(x){return x.id===(rid&&rid.value)}),isVenda=!!(r&&Number(r.quantVenda||0)>0&&!Number(r.quantCompra||0));
  var c=document.getElementById('negV66Compra'),v=document.getElementById('negV66Venda'),s=document.getElementById('negV66Resumo');
  if(c)c.style.display=isVenda?'none':'block'; if(v)v.style.display=isVenda?'block':'none'; if(s)s.style.display='block';
  var buyClient=document.getElementById('rclienteCompra'),sellClient=document.getElementById('rclienteVenda');if(buyClient)buyClient.required=!isVenda;if(sellClient)sellClient.required=isVenda;
  var gc=document.getElementById('rgtaCompra'),gn=document.getElementById('rnotaCompra');if(gc)gc.value=(document.getElementById('rgta')||{}).value||'';if(gn)gn.value=(document.getElementById('rnota')||{}).value||'';var cv=document.getElementById('rcategoriaVenda'),cc=document.getElementById('rcategoria');if(cv&&cc&&document.activeElement!==cv)cv.value=cc.value||'';var wv=document.getElementById('rpesoVenda');if(wv){wv.disabled=false;wv.readOnly=false;if(document.activeElement!==wv)wv.value=r&&r.pesoVendaKg!=null?r.pesoVendaKg:'';}
  window.__modeV127=isVenda?'venda':'compra';
  var tabs=document.querySelector('.neg-v66-tabs');if(tabs)tabs.style.display='none';
  var st=s&&s.querySelector('.neg-v66-title');if(st)st.textContent=isVenda?'Documentos e fechamento da venda':'Documentos e fechamento da compra';
 }
 function setModeRequirements(mode){var sale=mode==='venda',a=document.getElementById('rclienteCompra'),b=document.getElementById('rclienteVenda');if(a)a.required=!sale;if(b)b.required=sale;window.__modeV127=mode}
 function addLotPicker(){
  var box=document.getElementById('negV66Venda');if(!box||document.getElementById('v131LotPicker'))return;
  var lots=(window.records||[]).filter(function(r){return Number(r.quantCompra||0)-Number(r.quantVenda||0)>0});
  var d=document.createElement('div');d.id='v131LotPicker';d.className='field span2';d.innerHTML='<label>Lotes de origem da venda</label><div class="hint">Selecione um ou mais lotes e informe quantos animais saem de cada um.</div><div id="v131LotRows"></div>';
  var anchor=box.querySelector('.formgrid');if(anchor)anchor.insertBefore(d,anchor.firstChild);var rows=d.querySelector('#v131LotRows');
  lots.forEach(function(r){var saldo=Number(r.quantCompra||0)-Number(r.quantVenda||0),row=document.createElement('label');row.style.cssText='display:flex;gap:8px;align-items:center;margin:6px 0';row.innerHTML='<input type="checkbox" data-lot="'+r.id+'"> '+(r.vendedor||'Lote')+' • '+(r.era||'')+' • disponíveis: '+saldo+' <input type="number" min="1" max="'+saldo+'" step="1" data-lotq="'+r.id+'" style="width:90px" placeholder="Qtd">';rows.appendChild(row)});
  function collect(){var chosen=[];rows.querySelectorAll('[data-lot]:checked').forEach(function(c){var q=rows.querySelector('[data-lotq="'+c.dataset.lot+'"]');chosen.push({id:c.dataset.lot,quantidade:Number(q&&q.value||0)})});var qv=document.getElementById('rqv');if(chosen.length)qv.value=chosen.reduce(function(a,x){return a+x.quantidade},0);window.__v131PendingLots=chosen}
  rows.addEventListener('change',collect);rows.addEventListener('input',collect);
 }
 function addPurchaseDocuments(){
  var box=document.getElementById('negV66Compra');if(!box||document.getElementById('v131PurchaseDocs'))return;var grid=box.querySelector('.formgrid');if(!grid)return;
  var d=document.createElement('div');d.id='v131PurchaseDocs';d.className='field span2';d.innerHTML='<label>Documentos da compra</label><div style="display:flex;gap:8px;flex-wrap:wrap"><label class="btn secondary">GTA <select id="rgtaCompra"><option></option><option>ok</option><option>pendente</option></select></label><label class="btn secondary">Nota fiscal <select id="rnotaCompra"><option></option><option>ok</option><option>pendente</option></select></label></div>';grid.appendChild(d);
  [['rgtaCompra','rgta'],['rnotaCompra','rnota']].forEach(function(pair){var a=document.getElementById(pair[0]),b=document.getElementById(pair[1]);if(a&&b){a.value=b.value||'';a.addEventListener('change',function(){b.value=a.value})}});
 }
 function addSaleCategory(){var box=document.getElementById('negV66Venda'),grid=box&&box.querySelector('.formgrid');if(!grid||document.getElementById('rcategoriaVenda'))return;var f=document.createElement('div');f.className='field';f.innerHTML='<label>Categoria</label><select id="rcategoriaVenda"><option></option><option>Bezerro</option><option>Garrote</option><option>Boi</option><option>Novilha</option><option>Vaca</option><option>Outro</option></select>';var mark=document.getElementById('rmarca')?.closest('.field');if(mark)grid.insertBefore(f,mark);var s=document.getElementById('rcategoriaVenda'),c=document.getElementById('rcategoria');s.addEventListener('change',function(){if(c)c.value=s.value})}
 function addSaleWeight(){var box=document.getElementById('negV66Venda'),grid=box&&box.querySelector('.formgrid');if(!grid||document.getElementById('rpesoVenda'))return;var f=document.createElement('div');f.className='field';f.innerHTML='<label>Peso (kg/cabeça)</label><input id="rpesoVenda" type="number" min="0" step="0.01" placeholder="Peso médio" />';var mark=document.getElementById('rqv')?.closest('.field');if(mark)grid.insertBefore(f,mark);var s=document.getElementById('rpesoVenda'),p=document.getElementById('rpeso');s.addEventListener('input',function(){if(p)p.value=s.value;try{preview()}catch(e){}})}
 function addPurchaseHistoryDocs(){
  if((window.__negListView||'seller')!=='seller')return;var h=document.querySelector('#negTableHead tr');if(!h||h.querySelector('[data-purchase-doc]'))return;var a=document.createElement('th');a.textContent='GTA';a.dataset.purchaseDoc='1';var b=document.createElement('th');b.textContent='Nota fiscal';b.dataset.purchaseDoc='1';var actionIndex=h.children.length-1;h.insertBefore(b,h.children[actionIndex]);h.insertBefore(a,h.children[actionIndex]);
  var list=(typeof records!=='undefined'&&Array.isArray(records)?records:(window.records||[]));document.querySelectorAll('#tbody tr').forEach(function(tr){var edit=tr.querySelector('button[onclick*="editRecord"]'),id=edit&&((edit.getAttribute('onclick')||'').match(/editRecord\('([^']+)/)||[])[1],r=list.find(function(x){return x.id===id})||{};var ca=document.createElement('td');ca.innerHTML=typeof badge==='function'?badge(r.gta)+' '+(typeof fileLink==='function'?fileLink(r.gtaPdf,'GTA'):''):'';var cb=document.createElement('td');cb.innerHTML=typeof badge==='function'?badge(r.nota)+' '+(typeof fileLink==='function'?fileLink(r.notaPdf,'Nota'):''):'';var ai=tr.children.length-1;tr.insertBefore(cb,tr.children[ai]);tr.insertBefore(ca,tr.children[ai]);});
 }
 function addSalesAt(){
  if((window.__negListView||'seller')!=='buyer')return;var h=document.querySelector('#negTableHead tr');if(!h||h.querySelector('[data-sales-at]'))return;var th=document.createElement('th');th.textContent='@';th.dataset.salesAt='1';h.insertBefore(th,h.children[6]);var wh=document.createElement('th');wh.textContent='Peso kg';wh.dataset.salesWeight='1';h.insertBefore(wh,th);var list=(typeof records!=='undefined'&&Array.isArray(records)?records:(window.records||[]));document.querySelectorAll('#tbody tr').forEach(function(tr){var edit=tr.querySelector('button[onclick*="editRecord"]'),id=edit&&((edit.getAttribute('onclick')||'').match(/editRecord\('([^']+)/)||[])[1],r=list.find(function(x){return x.id===id})||{},td=document.createElement('td'),kg=Number(r.pesoVendaKg||r.pesoKg||r.peso||0);td.className='num';td.textContent=num.format(kg);var at=tr.children[6];tr.insertBefore(td,at);});
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
  addPurchaseDocuments();
  addSaleCategory();
  addSaleWeight();
  var gen=document.getElementById('generatePaymentPlanBtn');if(gen&&!gen.dataset.v131Side){gen.dataset.v131Side='1';gen.addEventListener('click',function(){var side=document.getElementById('paymentPlanSide');if(side){side.value=window.__modeV127==='venda'?'Receber':'Pagar';side.dispatchEvent(new Event('change'))}} ,true)}
  syncClientNames();
  if(window.renderTable&&!window.renderTable.__v131Lists){var rt=window.renderTable;window.renderTable=function(){var out=rt.apply(this,arguments),view=window.__negListView||'seller',idx=view==='buyer'?4:3;document.querySelectorAll('#tbody tr').forEach(function(tr){var cell=tr.querySelector('td:nth-child('+(idx+1)+')');var n=Number(String(cell&&cell.textContent||'0').replace(/[^0-9,.-]/g,'').replace(/\./g,'').replace(',','.'));if(!(n>0))tr.style.display='none'});addPurchaseHistoryDocs();addSalesAt();return out};window.renderTable.__v131Lists=true}
  if(window.preview&&!window.preview.__v131Calc){var op=window.preview;window.preview=function(){var out=op.apply(this,arguments),t=document.getElementById('calcPreview'),m=document.getElementById('modalTitle');if(t&&m&&m.textContent.indexOf('Editar')>=0){var qc=Number(document.getElementById('rqcomp')?.value||0),qv=Number(document.getElementById('rqv')?.value||0),kg=Number(document.getElementById('rpeso')?.value||0),pc=Number(document.getElementById('rpc')?.value||0),pv=Number(document.getElementById('rpv')?.value||0),at=kg?num.format(kg/30):'0';if(qc>0&&qv===0)t.innerHTML='<b>Cálculos:</b> '+at+' @ • compra '+(kg?money.format(pc/kg):money.format(0))+'/kg • saldo '+qc+' cabeças • compra total '+money.format(qc*pc);else if(qv>0&&qc===0)t.innerHTML='<b>Cálculos:</b> '+at+' @ • venda '+(kg?money.format(pv/kg):money.format(0))+'/kg • venda total '+money.format(qv*pv)}return out};window.preview.__v131Calc=true}
  if(window.editRecord&&!window.editRecord.__v131Edit){var oe=window.editRecord;window.editRecord=function(id){var out=oe.apply(this,arguments);setTimeout(normalizeEditModal,120);setTimeout(normalizeEditModal,500);setTimeout(normalizeEditModal,1100);return out};window.editRecord.__v131Edit=true}
  var t=document.querySelector('.tabs'),p=t&&t.querySelector('[data-tab="painel"]');if(!t||!p)return;
  var oldNeg=t.querySelector('[data-tab="negociacoes"]');if(oldNeg)oldNeg.style.display='none';
  function add(id,label,view){var b=document.getElementById(id);if(!b){b=document.createElement('button');b.id=id;b.type='button';b.className='tabbtn';b.textContent=label;b.onclick=function(){document.querySelectorAll('.tabbtn').forEach(function(x){x.classList.remove('active')});b.classList.add('active');var s=document.getElementById('negociacoes');if(s)s.classList.add('active');setModeRequirements(view==='buyer'?'venda':'compra');if(typeof setNegotiationListView==='function')setNegotiationListView(view);else{var q=document.querySelector('.neg-list-tab[data-listview="'+view+'"]');if(q&&typeof q.click==='function')q.click()}var n=document.getElementById('newBtn');if(n)n.textContent=view==='seller'?'+ Nova compra':'+ Nova venda'};t.appendChild(b)}return b}
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
 document.addEventListener('click',function(ev){var b=ev.target&&ev.target.closest&&ev.target.closest('#newBtn');if(b)setTimeout(function(){setModeRequirements((b.textContent||'').toLowerCase().indexOf('venda')>=0?'venda':'compra')},100)},true);
 document.addEventListener('submit',function(ev){var f=ev.target;if(!f||f.id!=='recordForm')return;['rclienteCompra','rclienteVenda'].forEach(function(sid){var s=document.getElementById(sid),hid=sid==='rclienteCompra'?'rvendedor':'rcomprador',h=document.getElementById(hid);if(s&&h)h.value=s.value||''});},true);
 document.addEventListener('submit',function(ev){if(ev.target&&ev.target.id==='recordForm'&&window.__v131PendingLots){setTimeout(function(){var id=document.getElementById('rid')?.value,r=(window.records||[]).find(function(x){return x.id===id})||window.records&&window.records[window.records.length-1];if(r){r.sourceLots=window.__v131PendingLots;try{persist()}catch(e){}}},500)}},false);
 document.addEventListener('submit',function(ev){if(ev.target&&ev.target.id==='recordForm'&&window.__modeV127==='venda'){setTimeout(function(){var id=document.getElementById('rid')?.value,r=(typeof records!=='undefined'&&records||[]).find(function(x){return x.id===id})||((typeof records!=='undefined'&&records||[]).slice(-1)[0]);var w=Number(document.getElementById('rpesoVenda')?.value||0);if(r&&w>0){r.pesoVendaKg=w;try{persist()}catch(e){}}},550)}},false);
 setInterval(function(){var m=document.getElementById('modalTitle');if(m&&m.textContent.indexOf('Editar')>=0)normalizeEditModal()},300);
 var initialTabs=document.querySelector('.tabs');if(initialTabs)initialTabs.style.visibility='hidden';
 setTimeout(run,800);
 new MutationObserver(function(){cleanText()}).observe(document.body,{subtree:true,childList:true});
})();
