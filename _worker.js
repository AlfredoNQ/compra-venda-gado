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
          indicadorScotAtual={data:parsed.data,cotacoes:parsed.cotacoes};
          indicadorScotOntem={data:dataAnterior(parsed.data),cotacoes:parsed.ontem||[]};
        }
      }
    } catch (_) {}

    try {
      indicadorScotOntem=await buscarOntemScot();
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


