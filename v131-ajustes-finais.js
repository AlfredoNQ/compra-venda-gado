/* v132 — compra/venda limpas, sem resumo nem campos duplicados */
(function(){
 function byText(txt){return Array.from(document.querySelectorAll('.tabs .tabbtn')).find(function(b){return (b.textContent||'').trim()===txt})}
 function cleanText(){
  document.querySelectorAll('button,a,h2,h3,h4,th,.ph h2,.sectiontitle').forEach(function(e){
   var s=(e.textContent||'').trim();
   if(s==='Continuar para Venda →'||s==='Continuar para Venda') e.style.display='none';
   if(s==='Vendedores / Compras') e.textContent='Compras';
   if(s==='Compradores / Vendas') e.textContent='Vendas';
   if(s==='Compra / Vendedor') e.textContent='Compra';
   if(s==='Venda / Comprador') e.textContent='Venda';
   if(s==='Vendedor') e.textContent='Cliente';
   if(s==='Comprador') e.textContent='Cliente';
   if(s==='A receber do comprador'){
    var card=e.closest('.panel,.calc,.summary-card,.field')||e.parentElement;
    if(card)card.style.display='none';
   }
  });
  document.querySelectorAll('.neg-v66-tab,[data-negv66="resumo"]').forEach(function(e){e.style.display='none'});
 }
 function syncClientNames(){
  function sync(selectId,legacyId){
   var sel=document.getElementById(selectId); if(!sel)return;
   var old=document.getElementById(legacyId);
   if(!old){old=document.createElement('input');old.type='hidden';old.id=legacyId;old.name=legacyId;var f=sel.closest('form');if(f)f.appendChild(old)}
   old.value=sel.options[sel.selectedIndex]?sel.options[sel.selectedIndex].text:'';
  }
  sync('rclienteCompra','rvendedor'); sync('rclienteVenda','rcomprador');
 }
 function run(){
  if(document.querySelector('.tabs')?.dataset.v131Locked==='1')return;
  var legacy=document.getElementById('v66-neg-separate');
  if(legacy)legacy.remove();
  ['rSellerIdV121','rBuyerIdV121'].forEach(function(id){var e=document.getElementById(id);if(e&&e.closest('.field'))e.closest('.field').remove()});
  cleanText();
  syncClientNames();
  var t=document.querySelector('.tabs'),p=t&&t.querySelector('[data-tab="painel"]');if(!t||!p)return;
  function add(id,label,view){var b=document.getElementById(id);if(!b){b=document.createElement('button');b.id=id;b.type='button';b.className='tabbtn';b.textContent=label;b.onclick=function(){document.querySelectorAll('.tabbtn').forEach(function(x){x.classList.remove('active')});b.classList.add('active');var s=document.getElementById('negociacoes');if(s)s.classList.add('active');var q=document.querySelector('.neg-list-tab[data-listview="'+view+'"]');if(q)q.click();var n=document.getElementById('newBtn');if(n)n.textContent=view==='seller'?'+ Nova compra':'+ Nova venda'};t.appendChild(b)}return b}
  var cad=t.querySelector('[data-tab="cadastrosV120"]')||byText('Cadastro'),ani=t.querySelector('[data-tab="animaisV121"]')||byText('Animais'),co=add('compraTelaV128','Compra','seller'),ve=add('vendaTelaV128','Venda','buyer'),es=t.querySelector('[data-tab="estoque"]')||byText('Estoque'),cu=t.querySelector('[data-tab="custos"]')||byText('$ Custos'),ma=t.querySelector('[data-tab="mapa"]')||byText('Mapa'),re=t.querySelector('[data-tab="relatorios"]')||byText('Relatório');
  var cur=p;[cad,co,ve,es,ani,cu,ma,re].filter(Boolean).forEach(function(x){t.insertBefore(x,cur.nextSibling);cur=x});
  t.dataset.v131Locked='1';
 }
 document.addEventListener('click',function(ev){
  var x=ev.target&&ev.target.closest&&ev.target.closest('.neg-v66-tab,[data-negv66-go],[data-negv66="resumo"]');
  if(x){ev.preventDefault();ev.stopImmediatePropagation();x.style.display='none';}
 },true);
 setTimeout(run,2200);
 new MutationObserver(function(){cleanText()}).observe(document.body,{subtree:true,childList:true});
})();
