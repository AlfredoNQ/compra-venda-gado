/*
  Compra e Venda de Gado — Painel
  - Preço médio por kg
  - Preço médio por arroba
  - Cotação boi gordo PA, TO e MA
  - Reposição: bezerro e garrote
  - Pará em destaque
*/

(function () {

  function brl(v) {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(Number(v) || 0);
  }


  let latestQuoteDataV60 = null;

  function fmtScot(v,dec=2){
    const n=Number(v);
    if(!Number.isFinite(n))return '—';
    return n.toLocaleString('pt-BR',{minimumFractionDigits:dec,maximumFractionDigits:dec});
  }

  function renderScotMarketTable(data){
    if(data)latestQuoteDataV60=data;
    const d=data||latestQuoteDataV60;
    const body=document.getElementById('scotRepoTableBody');
    const grid=document.getElementById('scotIndicatorsGrid');
    const date=document.getElementById('scotRepoDate');

    if(!body||!grid)return;

    if(!d){
      body.innerHTML='<tr><td colspan="13">Carregando Scot...</td></tr>';
      grid.innerHTML='<div class="quote-meta">Carregando indicadores...</div>';
      return;
    }

    if(date)date.textContent='Macho Nelore • '+(d.dataReferencia||'data atual');

    const byUf={};
    (d.reposicao||[]).forEach(x=>{if(x&&x.uf)byUf[x.uf]=x});

    function trio(obj){
      if(!obj)return ['—','—','—'];
      return [fmtScot(obj.cabeca),fmtScot(obj.kg),fmtScot(obj.troca)];
    }

    body.innerHTML=['PA','TO','MA'].map(uf=>{
      const r=byUf[uf]||{};
      const vals=[...trio(r.boiMagro),...trio(r.garrote),...trio(r.bezerro),...trio(r.desmama)];
      return '<tr><td>'+uf+'</td>'+vals.map(v=>'<td>'+v+'</td>').join('')+'</tr>';
    }).join('');

    const atual=
      d.indicadorScotAtual &&
      Array.isArray(d.indicadorScotAtual.cotacoes)
        ? d.indicadorScotAtual.cotacoes
        : (d.cotacoes||[]);

    const ontem=
      d.indicadorScotOntem &&
      Array.isArray(d.indicadorScotOntem.cotacoes)
        ? d.indicadorScotOntem.cotacoes
        : [];

    const key=x=>String(x.uf||'')+'|'+String(x.regiao||'');
    const prevMap=new Map(ontem.map(x=>[key(x),x]));

    function variation(now,prev){
      const a=Number(now),b=Number(prev);
      if(!Number.isFinite(a)||!Number.isFinite(b)||b===0){
        return {diff:null,pct:null,cls:'scot-var-flat',arrow:'→'};
      }
      const diff=a-b;
      const pct=(diff/b)*100;
      return {
        diff,
        pct,
        cls:diff>0.005?'scot-var-up':diff<-0.005?'scot-var-down':'scot-var-flat',
        arrow:diff>0.005?'↑':diff<-0.005?'↓':'→'
      };
    }

    const rows=atual.map(x=>{
      const prev=prevMap.get(key(x));
      const v=variation(x.avista,prev&&prev.avista);

      return '<tr>'+
        '<td>'+String(x.uf||'—')+'</td>'+
        '<td>'+String(x.regiao||'—')+'</td>'+
        '<td><b>'+brl(x.avista)+'/@</b></td>'+
        '<td>'+(prev?brl(prev.avista)+'/@':'—')+'</td>'+
        '<td class="'+v.cls+'">'+
          (v.diff==null?'—':(v.diff>0?'+':'')+brl(v.diff).replace('R$ ','R$ '))+
        '</td>'+
        '<td class="'+v.cls+'">'+
          (v.pct==null?'—':v.arrow+' '+(v.pct>0?'+':'')+v.pct.toFixed(2).replace('.',',')+'%')+
        '</td>'+
      '</tr>';
    }).join('');

    const atualData=
      d.indicadorScotAtual && d.indicadorScotAtual.data
        ? d.indicadorScotAtual.data
        : (d.dataReferencia||'—');

    const ontemData=
      d.indicadorScotOntem && d.indicadorScotOntem.data
        ? d.indicadorScotOntem.data
        : 'não disponível';

    grid.innerHTML=
      '<div class="quote-meta"><b>Hoje:</b> '+atualData+
      ' &nbsp; • &nbsp; <b>Anterior:</b> '+ontemData+'</div>'+
      '<div class="scot-indicator-table-wrap">'+
        '<table class="scot-indicator-table">'+
          '<thead><tr>'+
            '<th>UF</th><th>Região</th><th>Hoje</th><th>Ontem</th><th>Diferença</th><th>Variação</th>'+
          '</tr></thead>'+
          '<tbody>'+(
            rows ||
            '<tr><td colspan="6" style="text-align:center">Sem indicadores disponíveis</td></tr>'
          )+'</tbody>'+
        '</table>'+
      '</div>';
  }



  function avgArroba(tipo, list) {

    let valor = 0;
    let qtd = 0;

    (list || []).forEach(function(r) {

      const c = calc(r);

      if (!c.at) return;

      if (
        tipo === 'buy' &&
        c.qc > 0 &&
        c.pc > 0
      ) {

        valor +=
          (c.pc / c.at) * c.qc;

        qtd += c.qc;
      }

      if (
        tipo === 'sell' &&
        c.sold > 0 &&
        c.pv > 0
      ) {

        valor +=
          (c.pv / c.at) * c.sold;

        qtd += c.sold;
      }

    });

    return qtd
      ? valor / qtd
      : 0;
  }


  /* =========================
     INDICADORES
  ========================= */

  renderKpis = function () {

    const list = panelRecords();
    const z = totals(list);


    $('kpis').innerHTML = [

      [
        'Cabeças compradas',
        num.format(z.qc)
      ],

      [
        'Cabeças vendidas',
        num.format(z.qv)
      ],

      [
        'Cabeças em estoque',
        num.format(z.est)
      ],

      [
        'Capital em estoque',
        money.format(z.cap)
      ],

      [
        'Total compras',
        money.format(z.comp)
      ],

      [
        'Total vendas',
        money.format(z.vend)
      ],

      [
        'Custos lançados',
        money.format(z.cost)
      ],

      [
        'Lucro realizado',
        money.format(z.luc)
      ],

      [
        'Preço médio compra/kg',
        money.format(
          avgKg('buy', list)
        )
      ],

      [
        'Preço médio venda/kg',
        money.format(
          avgKg('sell', list)
        )
      ],

      [
        'Preço médio @ compra',
        money.format(
          avgArroba('buy', list)
        )
      ],

      [
        'Preço médio @ venda',
        money.format(
          avgArroba('sell', list)
        )
      ]

    ].map(function(x, i) {

      const icons = ['🐂','💰','📦','🏦','🛒','💵','🧾','📈','⚖️','🏷️','⚖️','🏷️'];
      return `
        <div class="kpi">
          <span class="kpi-icon" aria-hidden="true">${icons[i] || '•'}</span>
          <span>${x[0]}</span>
          <b>${x[1]}</b>
        </div>
      `;

    }).join('');


    const all =
      totals(records);


    $('stockKpis').innerHTML = [

      [
        'Cabeças em estoque',
        num.format(all.est)
      ],

      [
        'Capital em estoque',
        money.format(all.cap)
      ],

      [
        'Lotes abertos',
        records.filter(
          function(r) {
            return calc(r).saldo > 0;
          }
        ).length
      ],

      [
        'Custo médio/cab estoque',

        all.est
          ? money.format(
              all.cap / all.est
            )
          : money.format(0)
      ]

    ].map(function(x) {

      return `
        <div class="kpi">
          <span>${x[0]}</span>
          <b>${x[1]}</b>
        </div>
      `;

    }).join('');

  };


  /* =========================
     ESTILO DAS COTAÇÕES
  ========================= */

  function addStyles() {

    if (
      document.getElementById(
        'quoteStyles'
      )
    ) return;


    const st =
      document.createElement('style');


    st.id =
      'quoteStyles';


    st.textContent = `

      .quote-panel {
        margin: 0 0 10px;
      }


      .quote-panel .ph {
        padding: 7px 12px;
      }


      .quote-panel .ph h2 {
        font-size: 14px;
        margin: 0;
      }


      .quote-panel .body {
        padding: 8px 12px;
      }


      .quote-grid {

        display: grid;

        grid-template-columns:
          repeat(
            3,
            minmax(0,1fr)
          );

        gap: 8px;

        align-items: stretch;

      }


      .quote-state {

        min-width: 0;

        border:
          1px solid
          var(--line);

        border-radius:
          9px;

        padding:
          7px 10px;

        background:
          #fff;

      }


      .quote-state.destaque {

        border:
          1.5px solid
          var(--g2);

        background:
          #f3f9f5;

      }


      .quote-state h3 {

        margin:
          0 0 3px;

        font-size:
          13px;

        line-height:
          1.2;

        color:
          #173d27;

      }


      .quote-state.destaque h3:after {

        content:
          " • DESTAQUE";

        font-size:
          8px;

        background:
          var(--g2);

        color:
          white;

        padding:
          2px 5px;

        border-radius:
          999px;

        margin-left:
          5px;

        vertical-align:
          1px;

      }


      .quote-row {

        display:
          grid;

        grid-template-columns:
          minmax(0,1fr) auto;

        gap:
          8px;

        align-items:
          center;

        padding:
          4px 0;

        border-bottom:
          1px solid #edf1ed;

        font-size:
          11px;

      }


      .quote-row:last-child {
        border-bottom: 0;
      }


      .quote-row span {

        min-width: 0;

        white-space:
          nowrap;

        overflow:
          hidden;

        text-overflow:
          ellipsis;

        color:
          #5f6b62;

      }


      .quote-row b {

        white-space:
          nowrap;

        font-size:
          12px;

        color:
          #173d27;

      }


      .quote-meta {

        font-size:
          10px;

        color:
          var(--muted);

        line-height:
          1.3;

      }


      .quote-footer {
        margin-top: 6px;
      }


      .repo-title {

        margin-top:
          10px;

        margin-bottom:
          5px;

        font-size:
          12px;

        font-weight:
          850;

        color:
          #173d27;

      }


      .quote-error {

        padding:
          8px;

        background:
          #fff3d4;

        color:
          #815500;

        border-radius:
          8px;

        font-size:
          11px;

      }


      @media (max-width:900px) {

        .quote-grid {

          grid-template-columns:
            repeat(
              3,
              minmax(0,1fr)
            );

        }


        .quote-state {
          padding: 6px;
        }


        .quote-row {

          gap: 4px;

          font-size:
            10px;

        }


        .quote-row b {
          font-size: 11px;
        }

      }


      @media (max-width:650px) {

        .quote-grid {

          grid-template-columns:
            1fr;

        }

      }


      .quote-history {
        margin-top: 16px;
        border-top: 1px solid #e1e9e3;
        padding-top: 14px;
      }

      .quote-history-head {
        display: flex;
        gap: 10px;
        align-items: end;
        justify-content: space-between;
        flex-wrap: wrap;
        margin-bottom: 10px;
      }

      .quote-history-title {
        font-size: 13px;
        font-weight: 850;
        color: #173d27;
      }

      .quote-history-controls {
        display: flex;
        gap: 8px;
        flex-wrap: wrap;
      }

      .quote-history-controls label {
        display: flex;
        flex-direction: column;
        gap: 3px;
        font-size: 9px;
        font-weight: 800;
        text-transform: uppercase;
        color: #6a776e;
      }

      .quote-history-controls select {
        min-width: 120px;
        padding: 7px 9px;
        border: 1px solid #d7e2da;
        border-radius: 9px;
        background: #fff;
        color: #20372a;
        font: inherit;
      }

      .quote-history-chart {
        height: 260px;
        position: relative;
        border: 1px solid #e0e8e2;
        border-radius: 12px;
        background: #fbfdfb;
        padding: 8px;
      }

      .quote-history-chart svg {
        width: 100%;
        height: 100%;
        display: block;
        overflow: visible;
        background: transparent;
      }

      .quote-history-legend {
        display:flex;
        gap:12px;
        flex-wrap:wrap;
        margin-top:8px;
        font-size:10px;
        font-weight:800;
        color:#445249;
      }

      .quote-history-legend span {
        display:inline-flex;
        align-items:center;
        gap:5px;
      }

      .quote-history-legend i {
        width:18px;
        height:3px;
        border-radius:99px;
        display:inline-block;
      }

      .quote-history-tooltip {
        position:absolute;
        z-index:5;
        pointer-events:none;
        min-width:120px;
        padding:7px 9px;
        border-radius:8px;
        background:#173d29;
        color:white;
        font-size:10px;
        line-height:1.35;
        box-shadow:0 8px 22px rgba(0,0,0,.22);
        transform:translate(-50%,-115%);
        white-space:nowrap;
      }

      .quote-history-kpis {
        display: grid;
        grid-template-columns: repeat(4,minmax(0,1fr));
        gap: 8px;
        margin-top: 10px;
      }

      .quote-history-kpi {
        border: 1px solid #e0e8e2;
        border-radius: 10px;
        padding: 8px 10px;
        background: #fff;
      }

      .quote-history-kpi span {
        display: block;
        font-size: 9px;
        color: #718078;
        text-transform: uppercase;
        font-weight: 800;
      }

      .quote-history-kpi b {
        display: block;
        margin-top: 3px;
        font-size: 13px;
        color: #183d29;
      }

      .quote-history-note {
        margin-top: 8px;
        font-size: 10px;
        color: #6b786f;
      }

      @media (max-width:650px) {
        .quote-history-kpis {
          grid-template-columns: repeat(2,minmax(0,1fr));
        }
        .quote-history-chart {
          height: 230px;
        }
        .quote-history-controls {
          width: 100%;
        }
        .quote-history-controls label {
          flex: 1;
        }
        .quote-history-controls select {
          width: 100%;
          min-width: 0;
        }
      }

      .quote-history-dashboard {
        display:grid;
        grid-template-columns:minmax(0,2.25fr) minmax(310px,.95fr);
        gap:12px;
        align-items:stretch;
      }

      .quote-history-main,
      .quote-history-side {
        border:1px solid #dfe8e1;
        border-radius:12px;
        background:#fff;
        overflow:hidden;
      }

      .quote-history-chart-title,
      .quote-history-side-title {
        padding:10px 12px;
        font-size:11px;
        font-weight:850;
        color:#284b35;
        background:#f5f9f6;
        border-bottom:1px solid #e2e9e4;
      }

      .quote-history-chart {
        height:320px;
        border:0!important;
        border-radius:0!important;
        background:#fff!important;
        padding:4px 6px 0!important;
      }

      .quote-history-chart svg {
        width:100%;
        height:100%;
        display:block;
        overflow:hidden;
        background:#fff;
      }

      .quote-history-side {
        display:flex;
        flex-direction:column;
        min-height:320px;
      }

      .quote-history-table-wrap {
        overflow:auto;
        max-height:320px;
        flex:1;
      }

      .quote-history-table {
        width:100%;
        border-collapse:collapse;
        font-size:10px;
      }

      .quote-history-table th {
        position:sticky;
        top:0;
        z-index:2;
        text-align:left;
        padding:7px 6px;
        background:#eaf4ed;
        color:#466052;
        font-size:8px;
        text-transform:uppercase;
        border-bottom:1px solid #d9e5dc;
        white-space:nowrap;
      }

      .quote-history-table td {
        padding:7px 6px;
        border-bottom:1px solid #eef2ef;
        white-space:nowrap;
        color:#39483f;
      }

      .quote-history-table tr:hover td {
        background:#f7faf8;
      }

      .trend-up {color:#18814d;font-weight:850}
      .trend-down {color:#bd4338;font-weight:850}
      .trend-flat {color:#9a7a25;font-weight:850}

      .quote-history-legend {
        padding:8px 12px 10px;
        border-top:1px solid #eef2ef;
        margin:0!important;
      }

      .quote-history-kpis {
        margin-top:10px!important;
      }

      @media(max-width:900px) {
        .quote-history-dashboard {
          grid-template-columns:1fr;
        }
        .quote-history-side {
          min-height:230px;
        }
        .quote-history-table-wrap {
          max-height:260px;
        }
      }

      /* v54 — gráfico amplo + histórico abaixo */
      .quote-history-dashboard {
        grid-template-columns:1fr!important;
        gap:12px!important;
      }

      .quote-history-main {
        width:100%;
      }

      .quote-history-chart {
        height:390px!important;
      }

      .quote-history-side {
        width:100%;
        min-height:0!important;
      }

      .quote-history-table-wrap {
        max-height:300px!important;
      }

      .quote-history-table {
        font-size:11px!important;
      }

      .quote-history-table th,
      .quote-history-table td {
        padding:9px 10px!important;
      }

      @media(max-width:900px) {
        .quote-history-chart {
          height:340px!important;
        }
      }

      /* v55 — estrutura física: gráfico em cima, histórico abaixo */
      .quote-history-main-full{
        display:block!important;
        width:100%!important;
        max-width:none!important;
        margin:0!important;
      }

      .quote-history-main-full .quote-history-chart{
        width:100%!important;
        height:430px!important;
        min-height:430px!important;
      }

      .quote-history-side-below{
        display:block!important;
        position:relative!important;
        width:100%!important;
        max-width:none!important;
        min-height:0!important;
        margin-top:14px!important;
        clear:both!important;
      }

      .quote-history-side-below .quote-history-table-wrap{
        width:100%!important;
        max-height:320px!important;
        overflow:auto!important;
      }

      .quote-history-side-below .quote-history-table{
        width:100%!important;
        min-width:700px!important;
      }

      .quote-history-side-below .quote-history-table th,
      .quote-history-side-below .quote-history-table td{
        padding:10px 14px!important;
        font-size:11px!important;
      }

      @media(max-width:900px){
        .quote-history-main-full .quote-history-chart{
          height:360px!important;
          min-height:360px!important;
        }
        .quote-history-side-below .quote-history-table{
          min-width:620px!important;
        }
      }

      .scot-market-area{margin-top:16px;padding-top:14px;border-top:1px solid #e1e9e3}
      .scot-section-head{display:flex;justify-content:space-between;align-items:center;margin-bottom:10px}
      .scot-table-wrap{overflow:auto;border:1px solid #d9e4dc;border-radius:12px;background:#fff}
      .scot-market-table{width:100%;min-width:1040px;border-collapse:collapse;font-size:11px}
      .scot-market-table th,.scot-market-table td{padding:9px 8px;border-right:1px solid #e1e8e3;border-bottom:1px solid #e5ebe7;text-align:right;white-space:nowrap}
      .scot-market-table th:first-child,.scot-market-table td:first-child{text-align:center;font-weight:900;position:sticky;left:0;z-index:3}
      .scot-market-table tbody td:first-child{background:#f7faf8}
      .scot-market-table thead th{background:#90aa32;color:#fff;font-weight:850}
      .scot-market-table thead .scot-group-head th{background:#0c6c46;font-size:12px;text-align:center}
      .scot-market-table tbody tr:nth-child(even) td{background:#f6f7f6}
      .scot-market-table tbody tr:nth-child(even) td:first-child{background:#eef2ef}
      .scot-indicators-card{margin-top:14px;border:1px solid #dfe8e1;border-radius:12px;padding:12px;background:#fff}
      .scot-indicators-grid{margin-top:10px;display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}
      .scot-indicator-box{border:1px solid #dfe8e1;border-radius:10px;padding:10px 12px;background:#f9fbf9}
      .scot-indicator-box b{display:block;font-size:13px;color:#173d29;margin-bottom:5px}
      .scot-indicator-row{display:flex;justify-content:space-between;gap:10px;padding:4px 0;border-bottom:1px solid #edf2ee;font-size:11px}
      .scot-indicator-row:last-child{border-bottom:0}
      @media(max-width:800px){.scot-indicators-grid{grid-template-columns:1fr}}

      /* v61 — contraste Scot e indicadores comparativos */
      .scot-market-table thead th{
        background:#7f9d22!important;
        color:#142718!important;
        text-shadow:none!important;
        font-weight:900!important;
      }

      .scot-market-table thead .scot-group-head th{
        background:#075c3c!important;
        color:#ffffff!important;
        font-weight:900!important;
        font-size:13px!important;
      }

      .scot-market-table thead tr:nth-child(2) th{
        background:#dce7b2!important;
        color:#213522!important;
        font-size:10px!important;
        text-transform:uppercase;
        letter-spacing:.2px;
      }

      .scot-indicators-grid{
        grid-template-columns:1fr!important;
      }

      .scot-indicator-table-wrap{
        overflow:auto;
        border:1px solid #dfe8e1;
        border-radius:10px;
        margin-top:10px;
      }

      .scot-indicator-table{
        width:100%;
        min-width:760px;
        border-collapse:collapse;
        font-size:11px;
      }

      .scot-indicator-table th{
        padding:8px 10px;
        text-align:right;
        background:#eef5ef;
        color:#496052;
        border-bottom:1px solid #dce6df;
        font-size:9px;
        text-transform:uppercase;
        white-space:nowrap;
      }

      .scot-indicator-table th:first-child,
      .scot-indicator-table th:nth-child(2),
      .scot-indicator-table td:first-child,
      .scot-indicator-table td:nth-child(2){
        text-align:left;
      }

      .scot-indicator-table td{
        padding:9px 10px;
        border-bottom:1px solid #edf2ee;
        text-align:right;
        white-space:nowrap;
      }

      .scot-indicator-table tr:last-child td{
        border-bottom:0;
      }

      .scot-var-up{color:#18814d;font-weight:900}
      .scot-var-down{color:#b83d34;font-weight:900}
      .scot-var-flat{color:#8b7625;font-weight:900}

      #cotacoesConteudo{display:none!important;height:0!important;min-height:0!important;margin:0!important;padding:0!important;overflow:hidden!important}

    `;


    document.head.appendChild(st);

  }


  /* =========================
     CRIAR QUADRO
  ========================= */

  function ensureQuotePanel() {

    if (
      document.getElementById(
        'cotacoesPanel'
      )
    ) return;


    const painel =
      document.getElementById(
        'painel'
      );


    if (!painel) return;


    const grid =
      painel.querySelector(
        '.grid2'
      );


    if (!grid) return;


    const box =
      document.createElement(
        'div'
      );


    box.id =
      'cotacoesPanel';


    box.className =
      'panel quote-panel';


    box.innerHTML = `

      <div class="ph">

        <h2>
          Cotações Scot <span style="font-size:9px;font-weight:700;opacity:.55">v63</span>
        </h2>

        <button
          class="mini"
          type="button"
          id="refreshCotacoes">
          Atualizar
        </button>

      </div>


      <div class="body">

        <div id="cotacoesConteudo" style="display:none!important"></div>

        <div class="quote-history scot-market-area">

          <div class="scot-section-head">
            <div>
              <div class="quote-history-title">Scot Consultoria — Macho Nelore</div>
              <div class="quote-meta" id="scotRepoDate">Cotação atual de reposição</div>
            </div>
          </div>

          <div class="scot-table-wrap">
            <table class="scot-market-table">
              <thead>
                <tr class="scot-group-head">
                  <th rowspan="2">UF</th>
                  <th colspan="3">Boi Magro</th>
                  <th colspan="3">Garrote</th>
                  <th colspan="3">Bezerro</th>
                  <th colspan="3">Desmama</th>
                </tr>
                <tr>
                  <th>R$/cab</th><th>R$/kg</th><th>Troca</th>
                  <th>R$/cab</th><th>R$/kg</th><th>Troca</th>
                  <th>R$/cab</th><th>R$/kg</th><th>Troca</th>
                  <th>R$/cab</th><th>R$/kg</th><th>Troca</th>
                </tr>
              </thead>
              <tbody id="scotRepoTableBody">
                <tr><td colspan="13">Carregando Scot...</td></tr>
              </tbody>
            </table>
          </div>

          <div class="scot-indicators-card">
            <div class="quote-history-title">Cotação — Indicadores Scot</div>
            <div class="quote-meta">Hoje x ontem • diferença e variação percentual</div>
            <div id="scotIndicatorsGrid" class="scot-indicators-grid">
              <div class="quote-meta">Carregando indicadores...</div>
            </div>
          </div>

        </div>

        </div>

      </div>

    `;


    painel.insertBefore(
      box,
      grid
    );


    const btn =
      document.getElementById(
        'refreshCotacoes'
      );


    if (btn) {

      btn.onclick =
        loadCotacoes;

    }

    renderScotMarketTable();

  }


  /* =========================
     BOI GORDO
  ========================= */

  function stateBlock(
    title,
    rows,
    destaque
  ) {

    if (
      !rows ||
      !rows.length
    ) {

      return `

        <div
          class="
            quote-state
            ${destaque ? 'destaque' : ''}
          ">

          <h3>
            ${title}
          </h3>

          <div class="quote-row">

            <span>
              Sem cotação
            </span>

            <b>—</b>

          </div>

        </div>

      `;

    }


    return `

      <div
        class="
          quote-state
          ${destaque ? 'destaque' : ''}
        ">

        <h3>
          ${title}
        </h3>


        ${rows.map(function(r) {

          return `

            <div class="quote-row">

              <span>
                ${r.regiao}
              </span>

              <b>
                ${brl(r.avista)}/@
              </b>

            </div>

          `;

        }).join('')}

      </div>

    `;

  }


  /* =========================
     REPOSIÇÃO
  ========================= */

  function repBlock(
    title,
    item,
    destaque
  ) {

    item =
      item || {};


    function valorReposicao(x) {

      if (!x) return '—';


      const cab =
        x.cabeca != null
          ? brl(x.cabeca)
          : '—';


      const kg =
        x.kg != null
          ? brl(x.kg) + '/kg'
          : '—';


      return (
        cab +
        ' • ' +
        kg
      );

    }


    return `

      <div
        class="
          quote-state
          ${destaque ? 'destaque' : ''}
        ">

        <h3>
          ${title}
        </h3>


        <div class="quote-row">

          <span>
            Bezerro
          </span>

          <b>
            ${valorReposicao(
              item.bezerro
            )}
          </b>

        </div>


        <div class="quote-row">

          <span>
            Garrote
          </span>

          <b>
            ${valorReposicao(
              item.garrote
            )}
          </b>

        </div>

      </div>

    `;

  }





  /* =========================
     GRÁFICO HISTÓRICO INTERATIVO
  ========================= */

  const HISTORY_CACHE_KEY =
    'gado_historico_v53';

  let historyRaw = [];
  let historyLoadingToken = 0;


  function hEl(id) {
    return document.getElementById(id);
  }


  function ensureHistoryYears() {
    const el=hEl('quoteHistoryYear');
    if (!el) return;

    const now=new Date().getFullYear();
    const years=[];

    for(let y=now;y>=2020;y--) {
      years.push(String(y));
    }

    const old=el.value;

    el.innerHTML=years
      .map(y=>'<option value="'+y+'">'+y+'</option>')
      .join('');

    el.value=
      old && years.includes(old)
        ? old
        : String(now);
  }


  function historyStateName(uf) {
    return {
      PA:'Pará',
      TO:'Tocantins',
      MA:'Maranhão'
    }[uf] || uf;
  }


  function historyTypeName(type) {
    return {
      boi:'Boi gordo',
      bezerro:'Bezerro',
      garrote:'Garrote',
      all:'Todos'
    }[type] || type;
  }


  function historyFormat(type,v) {
    if (!Number.isFinite(Number(v))) return '—';
    return type==='boi'
      ? brl(v) + '/@'
      : brl(v) + '/kg';
  }

  function historyHeadEquivalent(type,v) {
    if (!Number.isFinite(Number(v))) return '';
    if (type==='bezerro') return brl(Number(v)*240) + '/un';
    if (type==='garrote') return brl(Number(v)*300) + '/un';
    return '';
  }

  function historyPriceBoth(type,v) {
    const main=historyFormat(type,v);
    const head=historyHeadEquivalent(type,v);
    return head ? main+' • '+head : main;
  }


  function cacheAllRead() {
    try {
      return JSON.parse(
        localStorage.getItem(
          HISTORY_CACHE_KEY
        ) || '{}'
      ) || {};
    } catch (_) {
      return {};
    }
  }


  function cacheMonthRead(key) {
    const all=cacheAllRead();
    return all[key] || null;
  }


  function cacheMonthWrite(key,data) {
    try {
      const all=cacheAllRead();
      all[key]={
        savedAt:new Date().toISOString(),
        data
      };
      localStorage.setItem(
        HISTORY_CACHE_KEY,
        JSON.stringify(all)
      );
    } catch (_) {}
  }


  async function loadHistoryMonth(year,month,uf) {
    const key=[year,month,uf].join('|');
    const cached=cacheMonthRead(key);

    // Historical closed months may use cache indefinitely.
    const now=new Date();
    const closed =
      year<now.getFullYear() ||
      (year===now.getFullYear() && month<now.getMonth()+1);

    if (
      cached &&
      cached.data &&
      Array.isArray(cached.data.points) &&
      closed
    ) {
      return cached.data.points;
    }

    try {
      const r=await fetch(
        '/api/cotacoes-historico-mes?year='+
        encodeURIComponent(year)+
        '&month='+
        encodeURIComponent(month)+
        '&uf='+
        encodeURIComponent(uf),
        {cache:'no-store'}
      );

      if (!r.ok) throw new Error('HTTP '+r.status);

      const data=await r.json();

      if (!data.ok || !Array.isArray(data.points)) {
        throw new Error(data.error||'Histórico inválido');
      }

      cacheMonthWrite(key,data);
      return data.points;

    } catch (e) {
      if (
        cached &&
        cached.data &&
        Array.isArray(cached.data.points)
      ) {
        return cached.data.points;
      }
      return [];
    }
  }


  async function loadQuoteHistoryInteractive() {
    ensureHistoryYears();

    const token=++historyLoadingToken;
    const year=Number(hEl('quoteHistoryYear').value);
    const uf=hEl('quoteHistoryState').value;
    const note=hEl('quoteHistoryNote');

    historyRaw=[];
    renderQuoteHistoryInteractive();

    if (uf==='MA') {
      historyRaw=[];
      renderQuoteHistoryInteractive(true);
      if (note) {
        note.innerHTML=
          '<b>Maranhão:</b> a fonte histórica contínua usada neste gráfico não publica série estadual de MA. '+
          'A cotação atual de MA continua disponível acima.';
      }
      return;
    }

    if (note) {
      note.innerHTML=
        'Carregando histórico de <b>'+
        historyStateName(uf)+
        '</b> em <b>'+
        year+
        '</b>...';
    }

    const currentYear=new Date().getFullYear();
    const maxMonth=
      year===currentYear
        ? new Date().getMonth()+1
        : 12;

    for(let month=1;month<=maxMonth;month++) {
      if (token!==historyLoadingToken) return;

      const points=
        await loadHistoryMonth(
          year,month,uf
        );

      if (token!==historyLoadingToken) return;

      historyRaw=historyRaw
        .concat(points||[]);

      const byDate=new Map();

      historyRaw.forEach(
        p=>byDate.set(p.date,p)
      );

      historyRaw=
        Array.from(byDate.values())
          .sort((a,b)=>a.date.localeCompare(b.date));

      renderQuoteHistoryInteractive();

      if (note) {
        note.innerHTML=
          'Carregando '+month+
          '/'+maxMonth+
          ' • '+historyRaw.length+
          ' ponto(s) históricos encontrados...';
      }
    }

    renderQuoteHistoryInteractive(true);
  }


  function aggregateRows(rows,mode,key) {
    const values=(rows||[])
      .filter(x=>Number.isFinite(Number(x[key])))
      .map(x=>({
        date:x.date,
        value:Number(x[key])
      }));

    if (mode==='daily') return values;

    const groups=new Map();

    values.forEach(function(r){
      const d=new Date(r.date+'T12:00:00');
      if (isNaN(d)) return;

      // Mensal e Anual: um ponto por mês.
      const gkey=r.date.slice(0,7)+'-01';

      if (!groups.has(gkey))groups.set(gkey,[]);
      groups.get(gkey).push(r.value);
    });

    return Array.from(groups.entries())
      .map(([date,vals])=>({
        date,
        value:vals.reduce((a,b)=>a+b,0)/vals.length
      }))
      .sort((a,b)=>a.date.localeCompare(b.date));
  }


  function svgNode(name,attrs,text) {
    const n=document.createElementNS(
      'http://www.w3.org/2000/svg',
      name
    );
    Object.entries(attrs||{}).forEach(
      ([k,v])=>n.setAttribute(k,String(v))
    );
    if (text!=null)n.textContent=text;
    return n;
  }


  function renderQuoteHistoryInteractive(done) {
    const svg=hEl('quoteHistorySvg');
    const tip=hEl('quoteHistoryTooltip');
    const legend=hEl('quoteHistoryLegend');
    const kpis=hEl('quoteHistoryKpis');
    const note=hEl('quoteHistoryNote');
    const tbody=hEl('quoteHistoryTableBody');
    const title=hEl('quoteHistoryChartTitle');

    if(!svg||!legend||!kpis||!tbody)return;

    const type=hEl('quoteHistoryType').value;
    const mode=hEl('quoteHistoryGranularity').value;
    const uf=hEl('quoteHistoryState').value;
    const year=hEl('quoteHistoryYear').value;

    svg.innerHTML='';
    tip.style.display='none';
    tbody.innerHTML='';

    const colors={
      boi:'#23734b',
      bezerro:'#3b7899',
      garrote:'#b48a32'
    };

    const keys=type==='all'
      ? ['boi','bezerro','garrote']
      : [type];

    let series=keys.map(key=>({
      key,
      label:historyTypeName(key),
      rows:aggregateRows(historyRaw,mode,key)
    })).filter(s=>s.rows.length);

    if(title) {
      title.textContent=
        (type==='all'?'Evolução comparativa':'Preço por data')+
        ' — '+historyStateName(uf)+' — '+year;
    }

    if(!series.length) {
      svg.appendChild(svgNode('text',{
        x:500,y:190,'text-anchor':'middle',
        fill:'#768179','font-size':18
      },'Sem histórico disponível para esta seleção.'));
      legend.innerHTML='';
      kpis.innerHTML='';
      tbody.innerHTML='<tr><td colspan="4" style="text-align:center;color:#7c887f;padding:18px">Sem dados históricos</td></tr>';
      return;
    }

    const indexed=type==='all';

    if(indexed) {
      series=series.map(s=>{
        const base=s.rows[0].value;
        return {
          ...s,
          rows:s.rows.map(r=>({
            ...r,
            actual:r.value,
            value:base?(r.value/base)*100:100
          }))
        };
      });
    }

    const allRows=series.flatMap(s=>s.rows);
    let ymin=Math.min(...allRows.map(r=>r.value));
    let ymax=Math.max(...allRows.map(r=>r.value));

    if(ymin===ymax){ymin-=1;ymax+=1}
    else{
      const gap=(ymax-ymin)*.11;
      ymin-=gap;ymax+=gap;
    }

    const W=1000,H=390;
    const pad={l:82,r:24,t:20,b:52};
    const cw=W-pad.l-pad.r;
    const ch=H-pad.t-pad.b;

    const dates=allRows.map(r=>new Date(r.date+'T12:00:00'));
    let dmin=Math.min(...dates);
    let dmax=Math.max(...dates);

    if (mode==='annual') {
      dmin=+new Date(Number(year),0,1,12);
      dmax=+new Date(Number(year),11,31,12);
    }

    const dspan=Math.max(86400000,dmax-dmin);

    function xy(r){
      const d=new Date(r.date+'T12:00:00');
      return {
        x:pad.l+cw*((d-dmin)/dspan),
        y:pad.t+ch*(1-(r.value-ymin)/(ymax-ymin))
      };
    }

    svg.appendChild(svgNode('rect',{x:0,y:0,width:W,height:H,fill:'#fff'}));

    for(let i=0;i<=5;i++){
      const y=pad.t+ch*i/5;
      svg.appendChild(svgNode('line',{
        x1:pad.l,y1:y,x2:W-pad.r,y2:y,
        stroke:'#e5ece7','stroke-width':1
      }));

      const v=ymax-(ymax-ymin)*i/5;
      let label=indexed?v.toFixed(1):
        (type==='boi'
          ? 'R$ '+Math.round(v)
          : 'R$ '+v.toFixed(1).replace('.',','));

      svg.appendChild(svgNode('text',{
        x:pad.l-10,y:y+4,'text-anchor':'end',
        fill:'#66736a','font-size':12
      },label));
    }

    // Vertical month markers
    const monthNames=['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
    for(let m=0;m<12;m++){
      const d=new Date(Number(year),m,1,12);
      if(d<dmin||d>dmax)continue;
      const x=pad.l+cw*((d-dmin)/dspan);

      svg.appendChild(svgNode('line',{
        x1:x,y1:pad.t,x2:x,y2:pad.t+ch,
        stroke:'#f0f3f1','stroke-width':1
      }));

      svg.appendChild(svgNode('text',{
        x,y:H-18,'text-anchor':'middle',
        fill:'#66736a','font-size':12
      },monthNames[m]));
    }

    series.forEach(function(s){
      const pathPoints=s.rows.map(r=>xy(r));
      if(!pathPoints.length)return;

      // soft area only for one selected series
      if(series.length===1 && pathPoints.length>1){
        const area=[
          'M',pathPoints[0].x,pathPoints[0].y,
          ...pathPoints.slice(1).flatMap(p=>['L',p.x,p.y]),
          'L',pathPoints[pathPoints.length-1].x,pad.t+ch,
          'L',pathPoints[0].x,pad.t+ch,'Z'
        ].join(' ');

        const gradId='histGrad'+s.key;
        const defs=svgNode('defs');
        const grad=svgNode('linearGradient',{id:gradId,x1:'0%',y1:'0%',x2:'0%',y2:'100%'});
        grad.appendChild(svgNode('stop',{offset:'0%','stop-color':colors[s.key],'stop-opacity':'.18'}));
        grad.appendChild(svgNode('stop',{offset:'100%','stop-color':colors[s.key],'stop-opacity':'0'}));
        defs.appendChild(grad);
        svg.appendChild(defs);
        svg.appendChild(svgNode('path',{d:area,fill:'url(#'+gradId+')'}));
      }

      const path=[
        'M',pathPoints[0].x,pathPoints[0].y,
        ...pathPoints.slice(1).flatMap(p=>['L',p.x,p.y])
      ].join(' ');

      svg.appendChild(svgNode('path',{
        d:path,fill:'none',stroke:colors[s.key],
        'stroke-width':2.3,'stroke-linejoin':'round',
        'stroke-linecap':'round'
      }));

      s.rows.forEach(function(r){
        const p=xy(r);
        const circle=svgNode('circle',{
          cx:p.x,cy:p.y,r:mode==='daily'?3.1:4.2,
          fill:'#fff',stroke:colors[s.key],
          'stroke-width':2.2,style:'cursor:pointer'
        });

        function show(){
          const rect=svg.getBoundingClientRect();
          const px=(p.x/W)*rect.width;
          const py=(p.y/H)*rect.height;
          const actual=indexed?(r.actual!=null?r.actual:r.value):r.value;

          tip.innerHTML=
            '<b>'+historyTypeName(s.key)+'</b><br>'+
            historyFullDateV47(r.date)+'<br>'+
            historyPriceBoth(s.key,actual)+
            (indexed?'<br>Índice: '+r.value.toFixed(1):'');

          tip.style.left=px+'px';
          tip.style.top=py+'px';
          tip.style.display='block';
        }

        circle.addEventListener('mouseenter',show);
        circle.addEventListener('click',show);
        circle.addEventListener('mouseleave',()=>tip.style.display='none');
        svg.appendChild(circle);
      });
    });

    legend.innerHTML=series.map(s=>
      '<span><i style="background:'+colors[s.key]+'"></i>'+historyTypeName(s.key)+'</span>'
    ).join('');

    // Side table uses primary selected series; for all, list each category's most recent trend.
    let tableRows=[];
    if(type==='all'){
      series.forEach(s=>{
        const rows=s.rows;
        for(let i=Math.max(0,rows.length-8);i<rows.length;i++){
          tableRows.push({...rows[i],key:s.key});
        }
      });
      tableRows.sort((a,b)=>b.date.localeCompare(a.date));
    }else{
      tableRows=series[0].rows.slice().reverse().slice(0,18).map(r=>({...r,key:type}));
    }

    tbody.innerHTML=tableRows.map(function(r,i){
      const arr=series.find(s=>s.key===r.key)?.rows||[];
      const idx=arr.findIndex(x=>x.date===r.date);
      const prev=idx>0?arr[idx-1]:null;
      const actual=indexed?(r.actual!=null?r.actual:r.value):r.value;
      const prevActual=prev?(indexed?(prev.actual!=null?prev.actual:prev.value):prev.value):null;
      const variation=prevActual!=null && prevActual!==0
        ? ((actual-prevActual)/prevActual)*100
        : 0;

      const cls=variation>.05?'trend-up':variation<-.05?'trend-down':'trend-flat';
      const arrow=variation>.05?'↑':variation<-.05?'↓':'→';
      const trend=variation>.05?'ALTA':variation<-.05?'BAIXA':'ESTÁVEL';

      return '<tr>'+
        '<td>'+historyFullDateV47(r.date).slice(0,5)+'</td>'+
        '<td><b>'+historyPriceBoth(r.key,actual)+'</b></td>'+
        '<td class="'+cls+'">'+(variation>0?'+':'')+variation.toFixed(2).replace('.',',')+'%</td>'+
        '<td class="'+cls+'">'+arrow+' '+trend+'</td>'+
      '</tr>';
    }).join('');

    // KPI cards
    if(indexed){
      kpis.innerHTML=series.map(s=>{
        const first=s.rows[0],last=s.rows[s.rows.length-1];
        const change=last.value-first.value;
        return '<div class="quote-history-kpi"><span>'+s.label+
          '</span><b>'+(change>=0?'+':'')+change.toFixed(1).replace('.',',')+'%</b></div>';
      }).join('');
    }else{
      const rows=series[0].rows;
      const first=rows[0],last=rows[rows.length-1];
      const min=rows.reduce((a,b)=>b.value<a.value?b:a);
      const max=rows.reduce((a,b)=>b.value>a.value?b:a);
      kpis.innerHTML=[
        ['Primeiro',historyPriceBoth(type,first.value)],
        ['Último',historyPriceBoth(type,last.value)],
        ['Mínimo',historyPriceBoth(type,min.value)],
        ['Máximo',historyPriceBoth(type,max.value)]
      ].map(x=>'<div class="quote-history-kpi"><span>'+x[0]+'</span><b>'+x[1]+'</b></div>').join('');
    }

    if(note&&done){
      const total=historyRaw.filter(x=>x && x.date).length;
      note.innerHTML=
        '<b>Fonte do histórico: Scot Consultoria.</b> '+
        total+' fechamento(s) carregado(s). '+
        (mode==='annual'
          ? 'Visualização anual com eixo completo de janeiro a dezembro. '
          : '')+
        'O gráfico exibe somente datas realmente retornadas pela fonte.';
    }
  }

  function historyFullDateV47(iso){
    const p=String(iso||'').split('-');
    return p.length===3
      ? p[2]+'/'+p[1]+'/'+p[0]
      : iso;
  }


  function setupHistoryControlsV47() {
    ensureHistoryYears();

    ['quoteHistoryYear','quoteHistoryState'].forEach(id=>{
      const el=hEl(id);
      if(el)el.onchange=loadQuoteHistoryInteractive;
    });

    ['quoteHistoryType','quoteHistoryGranularity'].forEach(id=>{
      const el=hEl(id);
      if(el)el.onchange=()=>renderQuoteHistoryInteractive(true);
    });

    loadQuoteHistoryInteractive();
  }


  /* =========================
     CARREGAR COTAÇÕES
  ========================= */

  function completarCotacaoAnterior(data){
    if(!data || !Array.isArray(data.cotacoes)) return data;
    var atual=(data.indicadorScotAtual&&data.indicadorScotAtual.data)||data.dataReferencia||'';
    var anterior=data.indicadorScotOntem;
    try{
      var raw=localStorage.getItem('gado_cotacoes_historico_v2');
      var hist=raw?JSON.parse(raw):[];
      if(!Array.isArray(hist))hist=[];
      if(!anterior||!Array.isArray(anterior.cotacoes)||!anterior.cotacoes.length){
        var prev=hist.find(function(x){return x&&x.data&&x.data!==atual&&Array.isArray(x.cotacoes)&&x.cotacoes.length});
        if(prev)data.indicadorScotOntem={data:prev.data,cotacoes:prev.cotacoes};
      }
      if(atual&&data.cotacoes.length){
        hist=[{data:atual,cotacoes:data.cotacoes}].concat(hist.filter(function(x){return x&&x.data!==atual})).slice(0,30);
        localStorage.setItem('gado_cotacoes_historico_v2',JSON.stringify(hist));
      }
    }catch(_){ }
    return data;
  }

  async function loadCotacoes() {

    const el =
      document.getElementById(
        'cotacoesConteudo'
      );


    if (!el) return;


    el.innerHTML =
      'Atualizando cotações...';


    try {


      const res =
        await fetch(
          '/api/cotacoes',
          {
            cache:
              'no-store'
          }
        );


      if (!res.ok) {

        throw new Error(
          'HTTP ' +
          res.status
        );

      }


      let data =
        await res.json();

      data=completarCotacaoAnterior(data);

      try {
        localStorage.setItem('gado_cotacoes_cache_v1', JSON.stringify({
          savedAt: new Date().toISOString(),
          data: data
        }));
      } catch (_) {}

      if (
        !data.ok ||
        !Array.isArray(
          data.cotacoes
        )
      ) {

        throw new Error(
          data.error ||
          'Resposta inválida'
        );

      }


      renderScotMarketTable(data);


      const pa =
        data.cotacoes.filter(
          function(x) {
            return x.uf === 'PA';
          }
        );


      const to =
        data.cotacoes.filter(
          function(x) {
            return x.uf === 'TO';
          }
        );


      const ma =
        data.cotacoes.filter(
          function(x) {
            return x.uf === 'MA';
          }
        );


      const reposicao =
        Array.isArray(
          data.reposicao
        )
          ? data.reposicao
          : [];


      const repPA =
        reposicao.find(
          function(x) {
            return x.uf === 'PA';
          }
        ) || {};


      const repTO =
        reposicao.find(
          function(x) {
            return x.uf === 'TO';
          }
        ) || {};


      const repMA =
        reposicao.find(
          function(x) {
            return x.uf === 'MA';
          }
        ) || {};


      el.innerHTML = '';
} catch (e) {


      console.error(
        'Cotação:',
        e
      );


      let cached = null;
      try {
        const raw = localStorage.getItem('gado_cotacoes_cache_v1');
        cached = raw ? JSON.parse(raw) : null;
      } catch (_) {}

      if (cached && cached.data && cached.data.ok && Array.isArray(cached.data.cotacoes)) {
        const data = completarCotacaoAnterior(cached.data);
        renderScotMarketTable(data);
        const pa = data.cotacoes.filter(x => x.uf === 'PA');
        const to = data.cotacoes.filter(x => x.uf === 'TO');
        const ma = data.cotacoes.filter(x => x.uf === 'MA');
        const reposicao = Array.isArray(data.reposicao) ? data.reposicao : [];
        const repPA = reposicao.find(x => x.uf === 'PA') || {};
        const repTO = reposicao.find(x => x.uf === 'TO') || {};
        const repMA = reposicao.find(x => x.uf === 'MA') || {};
        const salvo = cached.savedAt ? new Date(cached.savedAt).toLocaleString('pt-BR') : '';
        el.innerHTML = '';
} else {
        el.innerHTML = `
          <div class="quote-error">
            Não foi possível carregar a cotação agora. Quando houver uma atualização online bem-sucedida, a última cotação ficará disponível também offline.
          </div>`;
      }

    }

  }


  /* =========================
     INICIALIZAÇÃO
  ========================= */

  function initPainelUpdate() {

    addStyles();

    ensureQuotePanel();


    const py =
      document.getElementById(
        'panelYear'
      );


    if (py) {

      py.onchange =
        renderKpis;

    }


    try {

      renderKpis();

    } catch (e) {

      console.error(
        'Erro nos indicadores:',
        e
      );

    }


    loadCotacoes();

  }


  if (
    document.readyState ===
    'loading'
  ) {

    document.addEventListener(
      'DOMContentLoaded',
      initPainelUpdate
    );

  } else {

    initPainelUpdate();

  }

})();
