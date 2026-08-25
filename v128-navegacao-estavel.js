/* v128 — navegação estável por telas */
(function(){
function apply(){
 var tabs=document.querySelector('.tabs'),neg=tabs&&tabs.querySelector('[data-tab="negociacoes"]'),panel=tabs&&tabs.querySelector('[data-tab="painel"]');if(!tabs||!neg||!panel)return false;
 neg.style.display='none';
 function btn(id,label,view){var b=document.getElementById(id);if(!b){b=document.createElement('button');b.id=id;b.type='button';b.className='tabbtn'}b.textContent=label;b.onclick=function(){document.querySelectorAll('.tabbtn').forEach(function(x){x.classList.remove('active')});document.querySelectorAll('.tab').forEach(function(x){x.classList.remove('active')});b.classList.add('active');var s=document.getElementById('negociacoes');if(s)s.classList.add('active');var i=document.querySelector('.neg-list-tab[data-listview="'+view+'"]');if(i)i.click();var n=document.getElementById('newBtn');if(n)n.textContent=view==='seller'?'+ Nova compra':'+ Nova venda';return false};return b}
 var cad=tabs.querySelector('[data-tab="cadastrosV120"]'),ani=tabs.querySelector('[data-tab="animaisV121"]'),estoque=tabs.querySelector('[data-tab="estoque"]'),custos=tabs.querySelector('[data-tab="custos"]'),mapa=tabs.querySelector('[data-tab="mapa"]'),rel=tabs.querySelector('[data-tab="relatorios"]');
 var compra=btn('compraTelaV128','Compra','seller'),venda=btn('vendaTelaV128','Venda','buyer');
 if(cad)cad.textContent='Cadastro';if(estoque)estoque.textContent='Estoque';if(rel)rel.textContent='Relatório';
 var order=[panel,cad,compra,venda,estoque,ani,custos,mapa,rel].filter(Boolean),cursor=panel;order.slice(1).forEach(function(x){tabs.insertBefore(x,cursor.nextSibling);cursor=x});
 document.querySelectorAll('.neg-list-tabs').forEach(function(x){x.style.display='none'});
 return true;
}
 function loop(){if(!apply())setTimeout(loop,300)}
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',loop);else loop();
})();
