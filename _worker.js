async function cotacoesResponse() {
  try {
    const urlBoi =
      'https://www.noticiasagricolas.com.br/cotacoes/boi-gordo';

    const urlScotReposicao =
      'https://www.scotconsultoria.com.br/cotacoes/reposicao/';

    async function buscar(url) {
      const r = await fetch(url, {
        headers:{'User-Agent':'Mozilla/5.0'},
        cf:{cacheTtl:1800,cacheEverything:true}
      });
      if (!r.ok) throw new Error('Fonte respondeu '+r.status);
      return await r.text();
    }

    function numero(txt) {
      if (!txt) return null;
      const n = Number(
        String(txt)
          .replace(/\./g,'')
          .replace(',','.')
      );
      return Number.isFinite(n) ? n : null;
    }

    function limpar(txt) {
      return String(txt||'')
        .replace(/&nbsp;/gi,' ')
        .replace(/&ccedil;/gi,'ç')
        .replace(/&atilde;/gi,'ã')
        .replace(/&aacute;/gi,'á')
        .replace(/&eacute;/gi,'é')
        .replace(/&iacute;/gi,'í')
        .replace(/&oacute;/gi,'ó')
        .replace(/&uacute;/gi,'ú')
        .replace(/<script[\s\S]*?<\/script>/gi,' ')
        .replace(/<style[\s\S]*?<\/style>/gi,' ')
        .replace(/<[^>]+>/g,' ')
        .replace(/\s+/g,' ')
        .trim();
    }

    function pegarBoi(html,nome) {
      const pos = html.indexOf(nome);
      if (pos === -1) return null;
      const trecho = limpar(html.substring(pos,pos+1600));
      const vals = trecho.match(/\d{2,4}[,.]\d{2}/g);
      return vals && vals.length ? numero(vals[0]) : null;
    }

    function secaoMachoNelore(html) {
      const texto=limpar(html);

      const inicio=texto.indexOf('MACHO NELORE');
      if(inicio<0) return '';

      let fim=texto.indexOf('MACHO MESTIÇO',inicio+20);
      if(fim<0) fim=texto.indexOf('MACHO MESTICO',inicio+20);
      if(fim<0) fim=Math.min(texto.length,inicio+30000);

      return texto.slice(inicio,fim);
    }

    function linhaReposicao(secao,uf) {
      if(!secao) return null;

      // MACHO NELORE:
      // UF
      // Boi Magro: cab, kg, troca
      // Garrote:    cab, kg, troca
      // Bezerro:    cab, kg, troca
      // Desmama:    cab, kg, troca
      const re = new RegExp(
        '(?:^|\\s)' + uf + '\\s+' +
        '(\\d{3,5}(?:\\.\\d{3})*,\\d{2}|\\d{3,5},\\d{2})\\s+' + // boi cab
        '(\\d{1,2},\\d{2})\\s+' + // boi kg
        '(\\d{1,2},\\d{2})\\s+' + // boi troca
        '(\\d{3,5}(?:\\.\\d{3})*,\\d{2}|\\d{3,5},\\d{2})\\s+' + // garrote cab
        '(\\d{1,2},\\d{2})\\s+' + // garrote kg
        '(\\d{1,2},\\d{2})\\s+' + // garrote troca
        '(\\d{3,5}(?:\\.\\d{3})*,\\d{2}|\\d{3,5},\\d{2})\\s+' + // bezerro cab
        '(\\d{1,2},\\d{2})\\s+' + // bezerro kg
        '(\\d{1,2},\\d{2})\\s+' + // bezerro troca
        '(\\d{3,5}(?:\\.\\d{3})*,\\d{2}|\\d{3,5},\\d{2})\\s+' + // desmama cab
        '(\\d{1,2},\\d{2})\\s+' + // desmama kg
        '(\\d{1,2},\\d{2})',      // desmama troca
        'i'
      );

      const m=secao.match(re);
      if(!m) return null;

      return {
        boiMagro:{
          cabeca:numero(m[1]),
          kg:numero(m[2]),
          troca:numero(m[3])
        },
        garrote:{
          cabeca:numero(m[4]),
          kg:numero(m[5]),
          troca:numero(m[6])
        },
        bezerro:{
          cabeca:numero(m[7]),
          kg:numero(m[8]),
          troca:numero(m[9])
        },
        desmama:{
          cabeca:numero(m[10]),
          kg:numero(m[11]),
          troca:numero(m[12])
        }
      };
    }


    async function buscarScotBoiOficial() {
      const u='https://www.scotconsultoria.com.br/cotacoes/indicadores/';
      try {
        return await buscar(u);
      } catch (_) {
        return null;
      }
    }

    async function buscarScotFisicoOficial() {
      const u='https://www.scotconsultoria.com.br/cotacoes/boi-gordo/';
      try {
        const html=await buscar(u);
        if(/PA\\s+Marabá[\\s|]+\\d{2,4},\\d{2}/i.test(limpar(html)))return html;
      } catch (_) {}
      try {
        const r=await fetch('https://r.jina.ai/http://www.scotconsultoria.com.br/cotacoes/boi-gordo/',{
          headers:{'User-Agent':'Mozilla/5.0'},cf:{cacheTtl:900,cacheEverything:true}
        });
        if(!r.ok)return null;
        const text=await r.text();
        return /PA\\s+Marabá[\\s|]+\\d{2,4},\\d{2}/i.test(text)?text:null;
      } catch (_) { return null; }
    }

    function parseScotBoi(html) {
      if (!html) return {data:null,cotacoes:[]};

      const texto=limpar(html);
      const dm=texto.match(/Indicador do boi gordo[^\d]*(\d{2}\/\d{2}\/\d{4})/i)
        || texto.match(/Mercado Físico\s*-\s*(\d{2}\/\d{2}\/\d{4})/i);

      function precos(label) {
        const esc=label.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
        const m=texto.match(
          new RegExp(esc+'\\s+(\\d{2,4},\\d{2})\\s+(\\d{2,4},\\d{2})','i')
        );
        return m ? {atual:numero(m[1]),ontem:numero(m[2])} : null;
      }

      function linha(uf,regiao){
        const p=precos(uf+' '+regiao);
        return {uf,regiao,avista:p?p.atual:null};
      }

      function linhaAnterior(uf,regiao){
        const p=precos(uf+' '+regiao);
        return {uf,regiao,avista:p?p.ontem:null};
      }

      function dataAnterior(data){
        const m=String(data||'').match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
        if(!m)return null;
        const d=new Date(Number(m[3]),Number(m[2])-1,Number(m[1])-1);
        return String(d.getDate()).padStart(2,'0')+'/'+String(d.getMonth()+1).padStart(2,'0')+'/'+d.getFullYear();
      }

      const cotacoes=[
          linha('PA','Marabá'),linha('PA','Redenção'),linha('PA','Paragominas'),
          linha('TO','Sul'),linha('TO','Norte'),linha('MA','Oeste')
        ].filter(x=>x.avista!==null);
      const ontem=[
          linhaAnterior('PA','Marabá'),linhaAnterior('PA','Redenção'),linhaAnterior('PA','Paragominas'),
          linhaAnterior('TO','Sul'),linhaAnterior('TO','Norte'),linhaAnterior('MA','Oeste')
        ].filter(x=>x.avista!==null);
      return {
        data:dm ? dm[1] : null,
        cotacoes,
        ontem
      };
    }

    function parseMercadoFisico(html){
      const texto=limpar(html);
      function linha(uf,regiao){
        const esc=(uf+' '+regiao).replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
        const sep='(?:\\s*\\|\\s*|\\s+)';
        // Na tabela oficial pode existir um rótulo entre 30 dias e a variação.
        const m=texto.match(new RegExp(
          esc+sep+'(-?\\d{2,4},\\d{2})'+sep+'(-?\\d{2,4},\\d{2})[^\\d-]*(-?\\d{1,2},\\d{2})',
          'i'
        ));
        if(!m)return null;
        return {uf,regiao,avistas:numero(m[1]),avista:numero(m[1]),prazo30:numero(m[2]),variacao:numero(m[3])};
      }
      return [linha('PA','Marabá'),linha('PA','Redenção'),linha('PA','Paragominas'),linha('TO','Sul'),linha('TO','Norte'),linha('MA','Oeste')].filter(Boolean);
    }

    function parseMercadoNoticias(html){
      const texto=limpar(html);
      function linha(uf,regiao){
        const esc=(uf+' '+regiao).replace(/[.*+?^\${}()|[\]\\]/g,'\\    async function buscarOntemScot() {');
        const sep='(?:\\s*\\|\\s*|\\s+)';
        const m=texto.match(new RegExp(esc+sep+'(-?\\d{2,4},\\d{2})'+sep+'(-?\\d{2,4},\\d{2})','i'));
        return m?{uf,regiao,avistas:numero(m[1]),avista:numero(m[1]),prazo30:numero(m[2]),variacao:null}:null;
      }
      return [linha('PA','Marabá'),linha('PA','Redenção'),linha('PA','Paragominas'),linha('TO','Sul'),linha('TO','Norte'),linha('MA','Oeste')].filter(Boolean);
    }

    async function buscarOntemScot() {
      const official='https://www.scotconsultoria.com.br/cotacoes/boi-gordo/';

      try {
        const cdx=
          'https://web.archive.org/cdx/search/cdx'+
          '?url='+encodeURIComponent(official)+
          '&output=json'+
          '&filter=statuscode:200'+
          '&filter=mimetype:text/html'+
          '&fl=timestamp,original'+
          '&collapse=timestamp:8'+
          '&limit=12'+
          '&filter=timestamp:.*';

        const r=await fetch(cdx,{
          headers:{'User-Agent':'Mozilla/5.0'},
          cf:{cacheTtl:1800,cacheEverything:true}
        });

        if(!r.ok)return null;

        const rows=await r.json();
        if(!Array.isArray(rows)||rows.length<2)return null;

        const snaps=rows.slice(1)
          .map(x=>({
            timestamp:String(x[0]||''),
            original:String(x[1]||official)
          }))
          .filter(x=>/^\d{14}$/.test(x.timestamp))
          .sort((a,b)=>b.timestamp.localeCompare(a.timestamp));

        const today=new Date();
        const todayKey=
          today.getFullYear()+
          String(today.getMonth()+1).padStart(2,'0')+
          String(today.getDate()).padStart(2,'0');

        for(const s of snaps){
          if(s.timestamp.slice(0,8)>=todayKey)continue;

          try{
            const u=
              'https://web.archive.org/web/'+
              s.timestamp+'id_/'+s.original;

            const rr=await fetch(u,{
              headers:{'User-Agent':'Mozilla/5.0'},
              cf:{cacheTtl:86400,cacheEverything:true}
            });

            if(!rr.ok)continue;

            const parsed=parseScotBoi(await rr.text());

            if(parsed.cotacoes.length){
              return parsed;
            }
          }catch(_){}
        }
      }catch(_){}

      return null;
    }

    const [htmlBoi,htmlScot] = await Promise.all([
      buscar(urlBoi),
      buscar(urlScotReposicao)
    ]);

    const cotacoes = [
      {uf:'PA',regiao:'Marabá',avista:pegarBoi(htmlBoi,'PA Marabá')},
      {uf:'PA',regiao:'Redenção',avista:pegarBoi(htmlBoi,'PA Redenção')},
      {uf:'PA',regiao:'Paragominas',avista:pegarBoi(htmlBoi,'PA Paragominas')},
      {uf:'TO',regiao:'Sul',avista:pegarBoi(htmlBoi,'TO Sul')},
      {uf:'TO',regiao:'Norte',avista:pegarBoi(htmlBoi,'TO Norte')},
      {uf:'MA',regiao:'Oeste',avista:pegarBoi(htmlBoi,'MA Oeste')}
    ].filter(x=>x.avista!==null);

    const secao=secaoMachoNelore(htmlScot);

    const pa=linhaReposicao(secao,'PA');
    const to=linhaReposicao(secao,'TO');
    const ma=linhaReposicao(secao,'MA');

    const reposicao=[
      {
        uf:'PA',
        bezerro:pa?pa.bezerro:null,
        garrote:pa?pa.garrote:null,
        boiMagro:pa?pa.boiMagro:null,
        desmama:pa?pa.desmama:null
      },
      {
        uf:'TO',
        bezerro:to?to.bezerro:null,
        garrote:to?to.garrote:null,
        boiMagro:to?to.boiMagro:null,
        desmama:to?to.desmama:null
      },
      {
        uf:'MA',
        bezerro:ma?ma.bezerro:null,
        garrote:ma?ma.garrote:null,
        boiMagro:ma?ma.boiMagro:null,
        desmama:ma?ma.desmama:null
      }
    ];

    const dm=limpar(htmlScot).match(/MACHO NELORE\s*-\s*(\d{2}\/\d{2}\/\d{4})/i);

    let indicadorScotAtual=null;
    let indicadorScotOntem=null;

    try {
      const oficial=await buscarScotBoiOficial();
      if (oficial) {
        const parsed=parseScotBoi(oficial);
        if(parsed){
          const htmlFisico=await buscarScotFisicoOficial();
          const fisico=parseMercadoFisico(htmlFisico);
          if(fisico.length) cotacoes.splice(0,cotacoes.length,...fisico);
          indicadorScotAtual={data:parsed.data,cotacoes:parsed.cotacoes};
          indicadorScotOntem={data:dataAnterior(parsed.data),cotacoes:parsed.ontem||[]};
        }
      }
    } catch (_) {}

    // A página oficial de Indicadores já entrega Hoje e Ontem na mesma linha.
    // Não substituir esse resultado por uma consulta antiga ao Wayback.

    // Mercado Físico é uma tabela separada da página de Indicadores.
    // Buscar novamente aqui garante à vista, 30 dias e variação.
    try {
      const fisicoDireto=parseMercadoFisico(await buscarScotFisicoOficial());
      const fisicoFallback=parseMercadoFisico(htmlBoi);
      const fisicoNoticias=parseMercadoNoticias(htmlBoi);
      const fisicoFinal=fisicoDireto.length
        ?fisicoDireto
        :(fisicoFallback.length?fisicoFallback:fisicoNoticias);
      if(fisicoFinal.length) cotacoes.splice(0,cotacoes.length,...fisicoFinal);
    } catch (_) {}

    return Response.json({
      ok:true,
      fonte:'Scot Consultoria',
      dataReferencia:dm?dm[1]:new Date().toLocaleDateString('pt-BR'),
      cotacoes,
      reposicao,
      indicadorScotAtual,
      indicadorScotOntem
    },{
      headers:{
        'Cache-Control':'public, max-age=1800'
      }
    });

  } catch (erro) {
    return Response.json({
      ok:false,
      error:erro && erro.message ? erro.message : 'Erro ao carregar cotações'
    },{
      status:500
    });
  }
}


async function cotacoesHistoricoMesResponse(request) {
  try {
    const url = new URL(request.url);

    const year = Number(url.searchParams.get('year') || new Date().getFullYear());
    const month = Number(url.searchParams.get('month') || (new Date().getMonth()+1));
    const uf = String(url.searchParams.get('uf') || 'PA').toUpperCase();

    if (!['PA','TO','MA'].includes(uf)) {
      return Response.json({ok:false,error:'Estado inválido'}, {status:400});
    }

    const boiUrl = 'https://www.scotconsultoria.com.br/cotacoes/boi-gordo/';
    const repUrl = 'https://www.scotconsultoria.com.br/cotacoes/reposicao/';

    function clean(html){
      return String(html||'')
        .replace(/&nbsp;/gi,' ')
        .replace(/&ccedil;/gi,'ç').replace(/&atilde;/gi,'ã')
        .replace(/&aacute;/gi,'á').replace(/&eacute;/gi,'é')
        .replace(/&iacute;/gi,'í').replace(/&oacute;/gi,'ó')
        .replace(/&uacute;/gi,'ú').replace(/&ecirc;/gi,'ê')
        .replace(/&ocirc;/gi,'ô')
        .replace(/<script[\s\S]*?<\/script>/gi,' ')
        .replace(/<style[\s\S]*?<\/style>/gi,' ')
        .replace(/<[^>]+>/g,' ')
        .replace(/\s+/g,' ')
        .trim();
    }

    function num(v){
      const n = Number(String(v||'').replace(/\./g,'').replace(',','.'));
      return Number.isFinite(n) ? n : null;
    }

    function isoFromTimestamp(ts){
      return ts.slice(0,4)+'-'+ts.slice(4,6)+'-'+ts.slice(6,8);
    }

    function parseBoi(html, fallbackDate){
      const text = clean(html);
      let values = [];

      if (uf === 'PA') {
        ['PA Marabá','PA Redenção','PA Paragominas'].forEach(label=>{
          const esc = label.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
          const m = text.match(new RegExp(esc+'\\s+(\\d{2,4},\\d{2})','i'));
          if (m && num(m[1]) != null) values.push(num(m[1]));
        });
      } else if (uf === 'TO') {
        ['TO Sul','TO Norte'].forEach(label=>{
          const m = text.match(new RegExp(label+'\\s+(\\d{2,4},\\d{2})','i'));
          if (m && num(m[1]) != null) values.push(num(m[1]));
        });
      } else {
        const m = text.match(/MA Oeste\s+(\d{2,4},\d{2})/i);
        if (m && num(m[1]) != null) values.push(num(m[1]));
      }

      if (!values.length) return null;

      return {
        date: fallbackDate,
        boi: values.reduce((a,b)=>a+b,0)/values.length
      };
    }

    function parseRepo(html, fallbackDate){
      const text = clean(html);

      // Try the common Scot table ordering around UF.
      // We intentionally return null if structure does not match rather than invent data.
      const re = new RegExp(
        '\\b'+uf+'\\s+'+
        '(\\d{3,5}[.,]\\d{2})\\s+(\\d{1,2}[.,]\\d{2})\\s+(\\d{1,2}[.,]\\d{2})\\s+'+
        '(\\d{3,5}[.,]\\d{2})\\s+(\\d{1,2}[.,]\\d{2})\\s+(\\d{1,2}[.,]\\d{2})\\s+'+
        '(\\d{3,5}[.,]\\d{2})\\s+(\\d{1,2}[.,]\\d{2})',
        'i'
      );

      const m = text.match(re);
      if (!m) return null;

      return {
        date: fallbackDate,
        garrote: num(m[4]),
        garroteKg: num(m[5]),
        bezerro: num(m[7]),
        bezerroKg: num(m[8])
      };
    }

    async function getSnapshots(target){
      const mm = String(month).padStart(2,'0');
      const last = String(new Date(year,month,0).getDate()).padStart(2,'0');

      const cdx =
        'https://web.archive.org/cdx/search/cdx'+
        '?url='+encodeURIComponent(target)+
        '&from='+year+mm+'01'+
        '&to='+year+mm+last+
        '&output=json'+
        '&filter=statuscode:200'+
        '&filter=mimetype:text/html'+
        '&fl=timestamp,original'+
        '&collapse=timestamp:8';

      try {
        const r = await fetch(cdx, {
          headers:{'User-Agent':'Mozilla/5.0'},
          cf:{cacheTtl:21600,cacheEverything:true}
        });

        if (!r.ok) return [];

        const rows = await r.json();
        if (!Array.isArray(rows) || rows.length < 2) return [];

        return rows.slice(1)
          .map(x=>({
            timestamp:String(x[0]||''),
            original:String(x[1]||target)
          }))
          .filter(x=>/^\d{14}$/.test(x.timestamp));
      } catch (_) {
        return [];
      }
    }

    async function readArchive(target, parser){
      let snaps = await getSnapshots(target);

      const byDay = new Map();
      snaps.forEach(s=>{
        const d=s.timestamp.slice(0,8);
        if (!byDay.has(d)) byDay.set(d,s);
      });

      snaps = Array.from(byDay.values());

      // Keep worker subrequests controlled.
      if (snaps.length > 20) {
        const sample=[];
        for(let i=0;i<20;i++){
          sample.push(snaps[Math.round(i*(snaps.length-1)/19)]);
        }
        snaps=sample;
      }

      const rows=[];
      const batchSize=4;

      for(let i=0;i<snaps.length;i+=batchSize){
        const batch=snaps.slice(i,i+batchSize);

        const got = await Promise.all(batch.map(async s=>{
          try{
            const u='https://web.archive.org/web/'+s.timestamp+'id_/'+s.original;
            const r=await fetch(u,{
              headers:{'User-Agent':'Mozilla/5.0'},
              cf:{cacheTtl:86400,cacheEverything:true}
            });

            if(!r.ok) return null;

            const html=await r.text();
            return parser(html, isoFromTimestamp(s.timestamp));
          }catch(_){
            return null;
          }
        }));

        got.forEach(x=>{if(x)rows.push(x)});
      }

      return rows;
    }

    const [boiRows, repRows] = await Promise.all([
      readArchive(boiUrl, parseBoi),
      readArchive(repUrl, parseRepo)
    ]);

    const byDate = new Map();

    function ensure(date){
      if(!byDate.has(date)){
        byDate.set(date,{
          date,
          boi:null,
          bezerro:null,
          bezerroKg:null,
          garrote:null,
          garroteKg:null
        });
      }
      return byDate.get(date);
    }

    boiRows.forEach(r=>{
      const x=ensure(r.date);
      x.boi=r.boi;
    });

    repRows.forEach(r=>{
      const x=ensure(r.date);
      x.bezerro=r.bezerro;
      x.bezerroKg=r.bezerroKg;
      x.garrote=r.garrote;
      x.garroteKg=r.garroteKg;
    });

    const points = Array.from(byDate.values())
      .sort((a,b)=>a.date.localeCompare(b.date));

    return Response.json({
      ok:true,
      year,
      month,
      uf,
      source:'Scot Consultoria',
      points
    },{
      headers:{'Cache-Control':'public, max-age=21600'}
    });

  } catch(error) {
    return Response.json({
      ok:false,
      error:error && error.message ? error.message : 'Erro no histórico Scot'
    }, {status:500});
  }
}


async function pdfOpenResponse(request) {
  try {
    const form = await request.formData();
    const dataUrl = String(form.get('pdf') || '');
    let name = String(form.get('name') || 'documento.pdf')
      .replace(/[\\/:*?"<>|\r\n]+/g,'_')
      .trim();
    if (!name.toLowerCase().endsWith('.pdf')) name += '.pdf';
    if (!dataUrl.startsWith('data:application/pdf;base64,')) {
      return new Response('PDF inválido', {status:400});
    }
    const b64 = dataUrl.slice(dataUrl.indexOf(',') + 1);
    if (!b64 || b64.length > 22000000) {
      return new Response('PDF vazio ou grande demais', {status:413});
    }
    const binary = atob(b64);
    const bytes = new Uint8Array(binary.length);
    for (let i=0;i<binary.length;i++) bytes[i]=binary.charCodeAt(i);
    return new Response(bytes, {
      status:200,
      headers:{
        'Content-Type':'application/pdf',
        'Content-Disposition':`inline; filename="${name.replace(/"/g,'')}"`,
        'Cache-Control':'no-store, no-cache, must-revalidate, max-age=0',
        'X-Content-Type-Options':'nosniff'
      }
    });
  } catch (e) {
    return new Response('Não foi possível abrir o PDF', {status:400});
  }
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === '/api/pdf-open' || url.pathname === '/api/pdf-open/') {
      if (request.method !== 'POST') {
        return new Response('Method Not Allowed', {status:405, headers:{'Allow':'POST'}});
      }
      return pdfOpenResponse(request);
    }

    if (
      request.method === 'GET' &&
      (url.pathname === '/' || url.pathname === '/index.html')
    ) {
      const assetUrl = new URL('/index.html?v=165', url.origin);
      const assetReq = new Request(assetUrl.toString(), {
        method:'GET',
        headers:request.headers
      });
      const asset = await env.ASSETS.fetch(assetReq);
      const headers = new Headers(asset.headers);
      headers.set('Cache-Control','no-store, no-cache, must-revalidate, max-age=0');
      headers.set('X-Gado-App-Version','165');
      return new Response(asset.body,{
        status:asset.status,
        statusText:asset.statusText,
        headers
      });
    }
    if (url.pathname === '/api/cotacoes-historico-mes' || url.pathname === '/api/cotacoes-historico-mes/') {
      if (request.method !== 'GET' && request.method !== 'HEAD') {
        return new Response('Method Not Allowed', { status: 405, headers: { 'Allow':'GET, HEAD' } });
      }
      const response = await cotacoesHistoricoMesResponse(request);
      if (request.method === 'HEAD') {
        return new Response(null, {status:response.status, headers:response.headers});
      }
      return response;
    }

    if (url.pathname === '/api/cotacoes' || url.pathname === '/api/cotacoes/') {
      if (request.method !== 'GET' && request.method !== 'HEAD') {
        return new Response('Method Not Allowed', { status: 405, headers: { 'Allow': 'GET, HEAD' } });
      }
      const response = await cotacoesResponse();
      if (request.method === 'HEAD') {
        return new Response(null, { status: response.status, headers: response.headers });
      }
      return response;
    }
    return env.ASSETS.fetch(request);
  }
};
