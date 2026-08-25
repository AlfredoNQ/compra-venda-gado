/* v127 — filtrar vendas realizadas e abrir formulário separado */
(function(){
  var oldRender=window.renderTable;
  if(typeof oldRender==='function')window.renderTable=function(){oldRender();var view=window.__negListView||'seller';if(view==='buyer'){document.querySelectorAll('#tbody tr').forEach(function(tr){var cell=tr.querySelector('td:nth-child(5)');if(cell&&Number(String(cell.textContent).replace(/\./g,'').replace(',','.'))<=0)tr.remove()})}};
  function mode(m){window.__modeV127=m;setTimeout(function(){var c=document.getElementById('negV66Compra'),v=document.getElementById('negV66Venda'),s=document.getElementById('negV66Resumo'),tabs=document.querySelector('.neg-v66-tabs');if(c)c.style.display=m==='compra'?'block':'none';if(v)v.style.display=m==='venda'?'block':'none';if(s)s.style.display='block';if(tabs)tabs.style.display='none';var t=s&&s.querySelector('.neg-v66-title');if(t)t.textContent=m==='compra'?'Documentos e fechamento da compra':'Documentos e fechamento da venda'},80)}
  function bind(){var b=document.getElementById('newBtn');if(b&&!b.dataset.v127){b.dataset.v127='1';b.addEventListener('click',function(){mode((b.textContent||'').toLowerCase().indexOf('venda')>=0?'venda':'compra')})}}
  bind();setTimeout(bind,700);setTimeout(bind,1500);
})();
