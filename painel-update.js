/*
  Compra e Venda de Gado — atualização do Painel
  - Preço médio da @ na compra
  - Preço médio da @ na venda
  - Cotações PA, TO e MA (Pará em destaque)
*/
(function () {
  function brl(v) {
    return new Intl.NumberFormat('pt-BR', {style:'currency', currency:'BRL'}).format(Number(v)||0);
  }

  function avgArroba(tipo, list) {
    let valor = 0, qtd = 0;
    (list || []).forEach(r => {
      const c = calc(r);
      if (!c.at) return;
      if (tipo === 'buy' && c.qc > 0 && c.pc > 0) {
        valor += (c.pc / c.at) * c.qc;
        qtd += c.qc;
      }
      if (tipo === 'sell' && c.sold > 0 && c.pv > 0) {
        valor += (c.pv / c.at) * c.sold;
        qtd += c.sold;
      }
    });
    return qtd ? valor / qtd : 0;
  }

  const oldRenderKpis = renderKpis;
  renderKpis = function () {
    const list = panelRecords(), z = totals(list);

    $('kpis').innerHTML = [
      ['Cabeças compradas', num.format(z.qc)],
      ['Cabeças vendidas', num.format(z.qv)],
      ['Cabeças em estoque', num.format(z.est)],
      ['Capital em estoque', money.format(z.cap)],
      ['Total compras', money.format(z.comp)],
      ['Total vendas', money.format(z.vend)],
      ['Custos lançados', money.format(z.cost)],
      ['Lucro realizado', money.format(z.luc)],
      ['Preço médio compra/kg', money.format(avgKg('buy', list))],
      ['Preço médio venda/kg', money.format(avgKg('sell', list))],
      ['Preço médio @ compra', money.format(avgArroba('buy', list))],
      ['Preço médio @ venda', money.format(avgArroba('sell', list))]
    ].map(x => `<div class="kpi"><span>${x[0]}</span><b>${x[1]}</b></div>`).join('');

    const all = totals(records);
    $('stockKpis').innerHTML = [
      ['Cabeças em estoque', num.format(all.est)],
      ['Capital em estoque', money.format(all.cap)],
      ['Lotes abertos', records.filter(r => calc(r).saldo > 0).length],
      ['Custo médio/cab estoque', all.est ? money.format(all.cap/all.est) : money.format(0)]
    ].map(x => `<div class="kpi"><span>${x[0]}</span><b>${x[1]}</b></div>`).join('');
  };

  function addStyles() {
    if (document.getElementById('quoteStyles')) return;
    const st = document.createElement('style');
    st.id = 'quoteStyles';
    st.textContent = `
      .quote-panel{margin:0 0 12px}
      .quote-grid{display:grid;grid-template-columns:repeat(3,minmax(220px,1fr));gap:10px}
      .quote-state{border:1px solid var(--line);border-radius:12px;padding:13px;background:#fff}
      .quote-state.destaque{border:2px solid var(--g2);background:#f1f8f3;box-shadow:0 5px 18px #16321f12}
      .quote-state h3{margin:0 0 8px;font-size:15px;color:#173d27}
      .quote-state.destaque h3:after{content:" • DESTAQUE";font-size:9px;background:var(--g2);color:white;padding:3px 6px;border-radius:999px;margin-left:6px;vertical-align:2px}
      .quote-row{display:grid;grid-template-columns:1fr auto;gap:8px;padding:6px 0;border-bottom:1px solid #edf1ed;font-size:12px}
      .quote-row:last-child{border-bottom:0}
      .quote-row b{font-size:14px;color:#173d27}
      .quote-meta{font-size:11px;color:var(--muted);line-height:1.45}
      .quote-error{padding:12px;color:#815500;background:#fff3d4;border-radius:9px;font-size:12px}
      @media(max-width:900px){.quote-grid{grid-template-columns:1fr}}
    `;
    document.head.appendChild(st);
  }

  function ensureQuotePanel() {
    if (document.getElementById('cotacoesPanel')) return;
    const painel = document.getElementById('painel');
    const grid = painel && painel.querySelector('.grid2');
    if (!painel || !grid) return;

    const box = document.createElement('div');
    box.id = 'cotacoesPanel';
    box.className = 'panel quote-panel';
    box.innerHTML = `
      <div class="ph">
        <h2>Cotação da @ — mercado físico</h2>
        <button class="mini" type="button" id="refreshCotacoes">Atualizar</button>
      </div>
      <div class="body">
        <div id="cotacoesConteudo" class="quote-meta">Carregando cotações...</div>
      </div>`;
    painel.insertBefore(box, grid);
    document.getElementById('refreshCotacoes').onclick = loadCotacoes;
  }

  function stateBlock(title, rows, destaque) {
    return `
      <div class="quote-state ${destaque ? 'destaque' : ''}">
        <h3>${title}</h3>
        ${rows.map(r => `
          <div class="quote-row">
            <span>${r.regiao}</span>
            <b>${brl(r.avista)}/@</b>
          </div>`).join('')}
      </div>`;
  }

  async function loadCotacoes() {
    const el = document.getElementById('cotacoesConteudo');
    if (!el) return;
    el.innerHTML = 'Atualizando cotações...';

    try {
      const res = await fetch('/api/cotacoes', {cache:'no-store'});
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const data = await res.json();
      if (!data.ok || !Array.isArray(data.cotacoes)) throw new Error(data.error || 'Resposta inválida');

      const pa = data.cotacoes.filter(x => x.uf === 'PA');
      const to = data.cotacoes.filter(x => x.uf === 'TO');
      const ma = data.cotacoes.filter(x => x.uf === 'MA');

      el.innerHTML = `
        <div class="quote-grid">
          ${stateBlock('Pará', pa, true)}
          ${stateBlock('Tocantins', to, false)}
          ${stateBlock('Maranhão', ma, false)}
        </div>
        <div class="quote-meta" style="margin-top:9px">
          Boi gordo, R$/@ à vista. Fonte: Scot Consultoria via Notícias Agrícolas.
          ${data.dataReferencia ? ' Atualizado em: <b>'+data.dataReferencia+'</b>.' : ''}
        </div>`;
    } catch (e) {
      el.innerHTML = `<div class="quote-error">Não foi possível carregar a cotação agora. Tente novamente pelo botão Atualizar.</div>`;
      console.error('Cotação:', e);
    }
  }

  function initPainelUpdate() {
    addStyles();
    ensureQuotePanel();

    const py = document.getElementById('panelYear');
    if (py) py.onchange = renderKpis;

    try { renderKpis(); } catch(e) { console.error(e); }
    loadCotacoes();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initPainelUpdate);
  } else {
    initPainelUpdate();
  }

  // Se os dados chegarem da nuvem depois, renderAll chamará a nova renderKpis.
})();
