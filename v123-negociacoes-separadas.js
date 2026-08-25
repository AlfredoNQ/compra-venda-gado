/* v123 — tela principal de negociações separada em compras e vendas */
(function(){
  function setup(){
    var tabs=document.querySelectorAll('.neg-list-tab');
    tabs.forEach(function(b){var v=b.dataset.listview;if(v==='seller'){b.textContent='🐂 Compras';}else if(v==='buyer'){b.textContent='💰 Vendas';}else if(v==='all'){b.style.display='none';}});
    var title=document.getElementById('negListTitle');if(title&&title.textContent.indexOf('Vendedores')>=0)title.textContent='Compras';
    var go=document.querySelector('[data-negv66-go="resumo"]');if(go)go.textContent='Continuar para documentos →';
    var buy=document.getElementById('negV66Compra'),sell=document.getElementById('negV66Venda'),summary=document.getElementById('negV66Resumo');
    if(!buy||!sell||!summary||document.getElementById('docsCompraV123'))return;
    var block=summary.querySelector('.formgrid');if(block){var c=document.createElement('div');c.id='docsCompraV123';c.className='sectiontitle';c.textContent='Documentos da compra';buy.appendChild(c);buy.appendChild(block);var s=document.createElement('div');s.className='sectiontitle';s.textContent='Documentos e pagamento da venda';sell.appendChild(s);var clone=block.cloneNode(true);clone.querySelectorAll('input').forEach(function(i){i.value='';i.removeAttribute('id')});sell.appendChild(clone)}
  }
  function init(){setup();setTimeout(setup,500);setTimeout(setup,1200)}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
