/* v121 — numeração de animais por lote, sem alterar negociações antigas */
(function(){
  var KEY='gado_animais_v121';
  function all(){try{return JSON.parse((window.userGet?userGet(KEY):localStorage.getItem(KEY))||'{}')}catch(e){return{}}}
  function save(x){try{if(window.userSet)userSet(KEY,JSON.stringify(x));else localStorage.setItem(KEY,JSON.stringify(x))}catch(e){}}
  function people(){try{return JSON.parse((window.userGet?userGet('gado_cadastros_v120'):localStorage.getItem('gado_cadastros_v120'))||'[]')}catch(e){return[]}}
  function populatePeople(){
    var list=people(), s=document.getElementById('rSellerIdV121'), b=document.getElementById('rBuyerIdV121');if(!s||!b)return;
    function opts(tipo){return '<option value="">Selecionar</option>'+list.filter(function(x){return x.tipo===tipo}).map(function(x){return '<option value="'+esc(x.id)+'">'+esc(x.nome)+'</option>'}).join('')}
    s.innerHTML=opts('Vendedor');b.innerHTML=opts('Comprador');
  }
  function migrateLots(){
    if(typeof records==='undefined')return;
    var lots={};try{lots=JSON.parse(localStorage.getItem('gado_lotes_v121')||'{}')}catch(e){}
    records.forEach(function(r){if(!r||!r.id||lots[r.id])return;var q=Number(r.quantCompra||0),v=Number(r.quantVenda||0);lots[r.id]={id:r.id,recordId:r.id,vendedor:r.vendedor||'',data:r.data||'',categoria:r.era||'',original:q,vendida:Math.min(q,v),disponivel:Math.max(0,q-v),createdAt:new Date().toISOString()};});
    try{if(window.userSet)userSet('gado_lotes_v121',JSON.stringify(lots));else localStorage.setItem('gado_lotes_v121',JSON.stringify(lots))}catch(e){}
  }
  function esc(v){return String(v||'').replace(/[&<>"']/g,function(c){return({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])})}
  function render(){
    var body=document.getElementById('animaisTabelaV121');if(!body||typeof records==='undefined')return;
    var a=all(), sold={};
    if(typeof records!=='undefined')records.forEach(function(x){(x.animalNumbersSold||[]).forEach(function(n){sold[String(n)]=1})});
    function allocated(id){return records.reduce(function(total,x){var lots=x.animalLotsSold||x.sourceLots||[];return total+(Array.isArray(lots)?lots.reduce(function(n,z){return n+((z.lotId||z.id)===id?Number(z.quantity||z.quantidade||0):0)},0):0)},0)}
    body.innerHTML=records.filter(function(r){return Number(r.quantCompra||0)-Number(r.quantVenda||0)-allocated(r.id)>0}).map(function(r){
      var nums=Array.isArray(a[r.id])?a[r.id]:[], available=nums.filter(function(n){return !sold[String(n)]}), total=Math.max(0,Number(r.quantCompra||0)), soldCount=records.filter(function(x){return x.animalLotId===r.id}).reduce(function(n,x){return n+(x.animalNumbersSold||[]).length},0)+allocated(r.id), remaining=Math.max(0,total-soldCount);
      return '<tr><td>'+esc(r.data)+'</td><td><b>'+esc(r.loteCodigo||'—')+'</b></td><td>'+esc(r.vendedor)+'</td><td>'+esc(r.era)+'</td><td>'+remaining+'</td><td>'+esc(available.join(', ')||'Ainda não numerados')+'</td><td><button class="mini" data-num-lote="'+esc(r.id)+'">Numerar</button></td></tr>';
    }).join('')||'<tr><td colspan="6" class="hint">Nenhuma compra encontrada.</td></tr>';
  }
  function init(){
    if(document.getElementById('animaisV121'))return;
    migrateLots();
    var tabs=document.querySelector('.tabs'),shell=document.querySelector('.wrap');if(!tabs||!shell)return;
    var b=document.createElement('button');b.className='tabbtn';b.textContent='Animais';tabs.appendChild(b);
    var sec=document.createElement('section');sec.id='animaisV121';sec.className='tab';sec.innerHTML='<div class="panel"><div class="ph"><h2>Animais por lote</h2><span class="hint">Numere os animais atuais ou novos</span></div><div class="tablewrap"><table class="smalltbl"><thead><tr><th>Data</th><th>ID lote</th><th>Vendedor</th><th>Categoria</th><th>Disponíveis</th><th>Números cadastrados</th><th>Ação</th></tr></thead><tbody id="animaisTabelaV121"></tbody></table></div></div>';shell.appendChild(sec);
    b.onclick=function(){document.querySelectorAll('.tabbtn').forEach(function(x){x.classList.remove('active')});document.querySelectorAll('.tab').forEach(function(x){x.classList.remove('active')});b.classList.add('active');sec.classList.add('active');render()};
    sec.addEventListener('click',function(e){var id=e.target.dataset.numLote;if(!id)return;var a=all(),old=Array.isArray(a[id])?a[id]:[],v=prompt('Digite os números separados por vírgula:',old.join(', '));if(v===null)return;var nums=v.split(',').map(function(x){return x.trim()}).filter(Boolean);a[id]=Array.from(new Set(nums));save(a);render()});
    var q=document.getElementById('rqv');if(q&&!document.getElementById('animalNumbersSoldV121')){var w=document.createElement('div');w.className='field span2';w.innerHTML='<label>Lote de origem da venda</label><select id="animalLotV121"><option value="">Selecionar lote (opcional)</option></select><label style="margin-top:6px">Números dos animais vendidos</label><input id="animalNumbersSoldV121" placeholder="Ex.: 12, 18, 27"><div class="hint">Selecione o lote e informe os números comercializados.</div>';q.closest('.field').parentNode.insertBefore(w,q.closest('.field').nextSibling)}
    var rv=document.getElementById('rvendedor'),rc=document.getElementById('rcomprador');if(rv&&!document.getElementById('rSellerIdV121')){var a=document.createElement('div');a.className='field span2';a.innerHTML='<label>Vendedor cadastrado</label><select id="rSellerIdV121"></select>';rv.closest('.field').parentNode.insertBefore(a,rv.closest('.field'))}if(rc&&!document.getElementById('rBuyerIdV121')){var z=document.createElement('div');z.className='field span2';z.innerHTML='<label>Comprador cadastrado</label><select id="rBuyerIdV121"></select>';rc.closest('.field').parentNode.insertBefore(z,rc.closest('.field'))}populatePeople();
    var sel=document.getElementById('animalLotV121');if(sel&&typeof records!=='undefined'){sel.innerHTML='<option value="">Selecionar lote (opcional)</option>'+records.filter(function(r){return Number(r.quantCompra||0)>Number(r.quantVenda||0)}).map(function(r){return '<option value="'+esc(r.id)+'">'+esc(r.data)+' — '+esc(r.vendedor)+' — '+esc(r.era)+'</option>'}).join('')}
    var form=document.getElementById('recordForm');if(form)form.addEventListener('submit',function(){setTimeout(function(){var id=(document.getElementById('rid')||{}).value;if(!id||typeof records==='undefined')return;var r=records.find(function(x){return x.id===id});if(!r)return;var el=document.getElementById('animalNumbersSoldV121'),ls=document.getElementById('animalLotV121'),ss=document.getElementById('rSellerIdV121'),bb=document.getElementById('rBuyerIdV121');var nums=(el&&el.value?el.value.split(',').map(function(x){return x.trim()}).filter(Boolean):[]),lot=ls&&ls.value?ls.value:'';if(lot&&nums.length){var known=Array.isArray(all()[lot])?all()[lot].map(String):[],sold={};records.forEach(function(x){(x.animalNumbersSold||[]).forEach(function(n){if(x.id!==id)sold[String(n)]=1})});var invalid=nums.filter(function(n){return known.indexOf(String(n))<0||sold[String(n)]});if(invalid.length){alert('Números indisponíveis ou não pertencentes ao lote: '+invalid.join(', '));return}}r.animalLotId=lot;r.sellerIdV121=ss?ss.value:'';r.buyerIdV121=bb?bb.value:'';r.animalNumbersSold=nums;if(typeof persist==='function')persist()},50)});
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
  setTimeout(function(){try{migrateLots();render();populatePeople()}catch(e){}},900);
  setTimeout(function(){try{migrateLots();render();populatePeople()}catch(e){}},2500);
  setTimeout(function(){try{migrateLots();render();populatePeople()}catch(e){}},5000);
})();
