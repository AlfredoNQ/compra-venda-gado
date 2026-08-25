/* v120 — cadastros independentes de compradores e vendedores */
(function(){
  'use strict';
  var KEY='gado_cadastros_v120';
  function read(){try{return JSON.parse((window.userGet?userGet(KEY):localStorage.getItem(KEY))||'[]')}catch(e){return[]}}
  function write(v){try{if(window.userSet)userSet(KEY,JSON.stringify(v));else localStorage.setItem(KEY,JSON.stringify(v))}catch(e){}}
  function esc(v){return String(v||'').replace(/[&<>"']/g,function(c){return({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])})}
  function render(){
    var sec=document.getElementById('cadastrosV120');if(!sec)return;
    var list=read(), q=(document.getElementById('cadBuscaV120').value||'').toLowerCase();
    var rows=list.filter(function(x){return !q||[x.nome,x.tipo,x.documento,x.telefone].join(' ').toLowerCase().includes(q)});
    document.getElementById('cadTabelaV120').innerHTML=rows.length?rows.map(function(x){return '<tr><td>'+esc(x.tipo)+'</td><td>'+esc(x.nome)+'</td><td>'+esc(x.documento||'—')+'</td><td>'+esc(x.telefone||'—')+'</td><td>'+esc(x.pix||'—')+'</td><td><button class="mini" data-cad-edit="'+x.id+'">Editar</button> <button class="mini" data-cad-del="'+x.id+'">Excluir</button></td></tr>'}).join(''):'<tr><td colspan="6" class="hint">Nenhum cadastro ainda.</td></tr>';
  }
  function openForm(item){
    var nome=prompt('Nome do comprador ou vendedor:',item?item.nome:'');if(!nome||!nome.trim())return;
    var tipo=prompt('Digite comprador ou vendedor:',item?item.tipo:'comprador');tipo=(tipo||'comprador').toLowerCase().includes('vend')?'Vendedor':'Comprador';
    var doc=prompt('CPF/CNPJ (opcional):',item?item.documento:'')||'';
    var tel=prompt('Telefone (opcional):',item?item.telefone:'')||'';
    var pix=prompt('Pix/conta (opcional):',item?item.pix:'')||'';
    var list=read(), obj={id:item?item.id:'cad-'+Date.now(),nome:nome.trim(),tipo:tipo,documento:doc,telefone:tel,pix:pix,updatedAt:new Date().toISOString()};
    var i=list.findIndex(function(x){return x.id===obj.id});if(i>=0)list[i]=obj;else list.push(obj);write(list);render();
  }
  function init(){
    if(document.getElementById('cadastrosV120'))return;
    var tabs=document.querySelector('.tabs');var shell=document.querySelector('.wrap');if(!tabs||!shell)return;
    var b=document.createElement('button');b.className='tabbtn';b.dataset.tab='cadastrosV120';b.textContent='Cadastros';tabs.appendChild(b);
    var sec=document.createElement('section');sec.id='cadastrosV120';sec.className='tab';sec.innerHTML='<div class="toolbar"><button class="btn primary" id="cadNovoV120">+ Novo cadastro</button><input class="search" id="cadBuscaV120" placeholder="Pesquisar comprador ou vendedor"></div><div class="panel"><div class="ph"><h2>Compradores e vendedores</h2><span class="hint">Base de clientes</span></div><div class="tablewrap"><table class="smalltbl"><thead><tr><th>Tipo</th><th>Nome</th><th>CPF/CNPJ</th><th>Telefone</th><th>Pix/conta</th><th>Ações</th></tr></thead><tbody id="cadTabelaV120"></tbody></table></div></div>';
    shell.appendChild(sec);
    b.onclick=function(){document.querySelectorAll('.tabbtn').forEach(function(x){x.classList.remove('active')});document.querySelectorAll('.tab').forEach(function(x){x.classList.remove('active')});b.classList.add('active');sec.classList.add('active');render()};
    document.getElementById('cadNovoV120').onclick=function(){openForm(null)};
    document.getElementById('cadBuscaV120').oninput=render;
    sec.addEventListener('click',function(e){var id=e.target.dataset.cadEdit||e.target.dataset.cadDel;if(!id)return;var list=read(),item=list.find(function(x){return x.id===id});if(e.target.dataset.cadEdit)openForm(item);else if(confirm('Excluir este cadastro?')){write(list.filter(function(x){return x.id!==id}));render()}});
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
