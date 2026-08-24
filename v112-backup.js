(function(){
  'use strict';

  const BACKUP_FORMAT='gado-v112-backup';
  const BACKUP_SCHEMA=1;
  const APP_VERSION='112';
  const MAX_BACKUP_BYTES=180*1024*1024;
  const UNSAFE_KEYS=new Set(['__proto__','prototype','constructor']);
  let restorePreview=null;

  function byId(id){return document.getElementById(id)}
  function nowIso(){return new Date().toISOString()}
  function clone(value){return JSON.parse(JSON.stringify(value))}
  function asArray(value){return Array.isArray(value)?value:[]}
  function finite(value){const x=Number(value);return Number.isFinite(x)?x:0}
  function safeName(value){return String(value||'').replace(/[\\/:*?"<>|\r\n]+/g,'_').trim()}
  function stamp(value){const t=Date.parse(value&&value.updatedAt||'');return Number.isFinite(t)?t:0}
  function dateTag(){
    const d=new Date();
    return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')+'_'+String(d.getHours()).padStart(2,'0')+'-'+String(d.getMinutes()).padStart(2,'0');
  }
  function moneyText(value){
    return Number(value||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
  }
  function html(value){
    return String(value??'').replace(/[&<>"']/g,function(ch){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]});
  }
  function currentRecords(){try{return asArray(records)}catch(_){return []}}
  function currentCosts(){try{return asArray(costs)}catch(_){return []}}
  function currentUser(){
    try{
      if(typeof cloudUser!=='undefined'&&cloudUser){
        return {id:String(cloudUser.id||''),email:String(cloudUser.email||'')};
      }
    }catch(_){}
    return {id:'',email:''};
  }

  function safeCopy(value,depth){
    depth=depth||0;
    if(depth>30)throw new Error('O backup contém dados aninhados demais.');
    if(value===null||typeof value==='string'||typeof value==='boolean')return value;
    if(typeof value==='number')return Number.isFinite(value)?value:0;
    if(Array.isArray(value))return value.map(function(x){return safeCopy(x,depth+1)});
    if(value&&typeof value==='object'){
      const out={};
      Object.keys(value).forEach(function(key){
        if(!UNSAFE_KEYS.has(key))out[key]=safeCopy(value[key],depth+1);
      });
      return out;
    }
    return null;
  }

  function dedupe(list,prefix,backupCreatedAt){
    const map=new Map();
    let generated=0,duplicates=0;
    asArray(list).forEach(function(raw,index){
      if(!raw||typeof raw!=='object'||Array.isArray(raw))return;
      const item=safeCopy(raw,0);
      let id=String(item.id||'').trim();
      if(!id){
        id=prefix+'-restaurado-'+String(index+1)+'-'+String(Date.now());
        generated++;
      }
      item.id=id;
      if(!item.updatedAt&&backupCreatedAt)item.updatedAt=backupCreatedAt;
      const old=map.get(id);
      if(old){
        duplicates++;
        if(stamp(item)>=stamp(old))map.set(id,item);
      }else map.set(id,item);
    });
    return {items:Array.from(map.values()),generated:generated,duplicates:duplicates};
  }

  function dataForChecksum(rec,cost){
    return JSON.stringify({records:rec,costs:cost});
  }
  async function sha256(text){
    try{
      if(window.crypto&&window.crypto.subtle){
        const bytes=new TextEncoder().encode(text);
        const hash=await window.crypto.subtle.digest('SHA-256',bytes);
        return Array.from(new Uint8Array(hash)).map(function(x){return x.toString(16).padStart(2,'0')}).join('');
      }
    }catch(_){}
    let h=2166136261;
    for(let i=0;i<text.length;i++){
      h^=text.charCodeAt(i);
      h=Math.imul(h,16777619);
    }
    return 'fnv32-'+(h>>>0).toString(16).padStart(8,'0');
  }

  function countPdfs(rec){
    return asArray(rec).reduce(function(total,r){
      return total+(r&&r.gtaPdf&&r.gtaPdf.data?1:0)+(r&&r.notaPdf&&r.notaPdf.data?1:0)+(r&&r.paymentPdf&&r.paymentPdf.data?1:0);
    },0);
  }

  function countInstallments(rec){
    return asArray(rec).reduce(function(total,r){return total+asArray(r&&r.installments).length},0);
  }

  function downloadBlob(name,blob){
    const url=URL.createObjectURL(blob);
    const a=document.createElement('a');
    a.href=url;
    a.download=name;
    a.rel='noopener';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(function(){URL.revokeObjectURL(url)},1500);
  }

  async function createFullBackup(){
    const button=byId('backupBtn');
    const oldText=button?button.textContent:'';
    if(button){button.disabled=true;button.textContent='Preparando backup…'}
    try{
      const rec=clone(currentRecords());
      const cost=clone(currentCosts());
      const createdAt=nowIso();
      const owner=currentUser();
      const checksum=await sha256(dataForChecksum(rec,cost));
      const payload={
        format:BACKUP_FORMAT,
        schemaVersion:BACKUP_SCHEMA,
        appVersion:APP_VERSION,
        createdAt:createdAt,
        owner:{id:owner.id,email:owner.email},
        summary:{records:rec.length,costs:cost.length,installments:countInstallments(rec),pdfs:countPdfs(rec)},
        checksum:{algorithm:checksum.startsWith('fnv32-')?'FNV-1a-32':'SHA-256',value:checksum},
        data:{records:rec,costs:cost}
      };
      const blob=new Blob([JSON.stringify(payload,null,2)],{type:'application/json;charset=utf-8'});
      downloadBlob('backup_completo_gado_v112_'+dateTag()+'.json',blob);
      alert('Backup completo criado. Ele inclui negociações, custos, parcelas e os PDFs anexados.');
    }catch(error){
      console.error('BACKUP V112',error);
      alert('Não foi possível criar o backup: '+(error&&error.message?error.message:error));
    }finally{
      if(button){button.disabled=false;button.textContent=oldText||'Backup completo'}
    }
  }

  function xml(value){
    return String(value??'').replace(/[&<>"']/g,function(ch){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[ch]});
  }
  function columnName(index){
    let out='';
    for(let n=index+1;n>0;n=Math.floor((n-1)/26))out=String.fromCharCode(65+(n-1)%26)+out;
    return out;
  }
  function excelDate(value){
    const m=String(value||'').match(/^(\d{4})-(\d{2})-(\d{2})/);
    if(!m)return null;
    const ms=Date.UTC(Number(m[1]),Number(m[2])-1,Number(m[3]));
    return Math.floor((ms-Date.UTC(1899,11,30))/86400000);
  }
  function xlsxCell(ref,value,type,header){
    if(header)return '<c r="'+ref+'" s="1" t="inlineStr"><is><t>'+xml(value)+'</t></is></c>';
    if(value===null||value===undefined||value==='')return '<c r="'+ref+'"/>';
    if(type==='date'){
      const serial=excelDate(value);
      if(serial!==null)return '<c r="'+ref+'" s="3"><v>'+serial+'</v></c>';
    }
    if(type==='money')return '<c r="'+ref+'" s="2"><v>'+finite(value)+'</v></c>';
    if(type==='integer')return '<c r="'+ref+'" s="4"><v>'+Math.round(finite(value))+'</v></c>';
    if(type==='decimal'||typeof value==='number')return '<c r="'+ref+'" s="5"><v>'+finite(value)+'</v></c>';
    if(type==='boolean')return '<c r="'+ref+'" t="inlineStr"><is><t>'+(value?'Sim':'Não')+'</t></is></c>';
    return '<c r="'+ref+'" t="inlineStr"><is><t xml:space="preserve">'+xml(value)+'</t></is></c>';
  }
  function sheetXml(columns,rows){
    const lastCol=columnName(Math.max(0,columns.length-1));
    const lastRow=Math.max(1,rows.length+1);
    const widths=columns.map(function(c,i){
      let width=Number(c.width)||Math.max(10,String(c.label||'').length+2);
      for(let j=0;j<Math.min(rows.length,80);j++)width=Math.max(width,Math.min(42,String(rows[j][c.key]??'').length+2));
      return '<col min="'+(i+1)+'" max="'+(i+1)+'" width="'+Math.min(width,42)+'" customWidth="1"/>';
    }).join('');
    const header='<row r="1" ht="24" customHeight="1">'+columns.map(function(c,i){return xlsxCell(columnName(i)+'1',c.label,c.type,true)}).join('')+'</row>';
    const body=rows.map(function(row,rowIndex){
      const r=rowIndex+2;
      return '<row r="'+r+'">'+columns.map(function(c,i){return xlsxCell(columnName(i)+r,row[c.key],c.type,false)}).join('')+'</row>';
    }).join('');
    return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'+
      '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><dimension ref="A1:'+lastCol+lastRow+'"/>'+
      '<sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>'+
      '<sheetFormatPr defaultRowHeight="18"/><cols>'+widths+'</cols><sheetData>'+header+body+'</sheetData>'+
      '<autoFilter ref="A1:'+lastCol+lastRow+'"/></worksheet>';
  }

  const CRC_TABLE=(function(){
    const table=new Uint32Array(256);
    for(let i=0;i<256;i++){
      let c=i;
      for(let j=0;j<8;j++)c=(c&1)?0xedb88320^(c>>>1):c>>>1;
      table[i]=c>>>0;
    }
    return table;
  })();
  function crc32(bytes){
    let crc=0xffffffff;
    for(let i=0;i<bytes.length;i++)crc=CRC_TABLE[(crc^bytes[i])&255]^(crc>>>8);
    return (crc^0xffffffff)>>>0;
  }
  function u16(value){return new Uint8Array([value&255,(value>>>8)&255])}
  function u32(value){return new Uint8Array([value&255,(value>>>8)&255,(value>>>16)&255,(value>>>24)&255])}
  function joinBytes(parts){
    const size=parts.reduce(function(total,x){return total+x.length},0);
    const out=new Uint8Array(size);
    let pos=0;
    parts.forEach(function(x){out.set(x,pos);pos+=x.length});
    return out;
  }
  function zipStore(files){
    const encoder=new TextEncoder();
    const locals=[],centrals=[];
    let offset=0;
    files.forEach(function(file){
      const name=encoder.encode(file.name);
      const data=typeof file.data==='string'?encoder.encode(file.data):file.data;
      const crc=crc32(data);
      const local=joinBytes([u32(0x04034b50),u16(20),u16(0x0800),u16(0),u16(0),u16(0),u32(crc),u32(data.length),u32(data.length),u16(name.length),u16(0),name,data]);
      const central=joinBytes([u32(0x02014b50),u16(20),u16(20),u16(0x0800),u16(0),u16(0),u16(0),u32(crc),u32(data.length),u32(data.length),u16(name.length),u16(0),u16(0),u16(0),u16(0),u32(0),u32(offset),name]);
      locals.push(local);centrals.push(central);offset+=local.length;
    });
    const central=joinBytes(centrals);
    const end=joinBytes([u32(0x06054b50),u16(0),u16(0),u16(files.length),u16(files.length),u32(central.length),u32(offset),u16(0)]);
    return joinBytes(locals.concat([central,end]));
  }

  function paymentTotals(r,type){
    const list=asArray(r&&r.installments).filter(function(p){return String(p&&p.type||'').toLowerCase()===type.toLowerCase()});
    return {
      count:list.length,
      pending:list.filter(function(p){return !p.paid}).reduce(function(s,p){return s+finite(p.value)},0),
      paid:list.filter(function(p){return !!p.paid}).reduce(function(s,p){return s+finite(p.value)},0)
    };
  }
  function recordCalc(r){
    try{if(typeof calc==='function')return calc(r)}catch(_){}
    const qc=finite(r&&r.quantCompra),qv=finite(r&&r.quantVenda),pc=finite(r&&r.precoCompra),pv=finite(r&&r.precoVenda),kg=finite(r&&r.pesoKg);
    const sold=Math.min(qc,qv),saldo=Math.max(0,qc-qv);
    return {qc:qc,qv:qv,pc:pc,pv:pv,kg:kg,at:kg/30,totalC:qc*pc,totalV:qv*pv,pcKg:kg?pc/kg:0,pvKg:kg?pv/kg:0,saldo:saldo,capital:saldo*pc,custo:0,lucro:sold*(pv-pc),status:saldo===0&&qc>0?'Vendido':qv>0?'Parcial':'Em estoque'};
  }
  function buildWorkbookData(){
    const rec=currentRecords(),cost=currentCosts();
    let totalBuy=0,totalSell=0,totalStock=0,totalCosts=0,totalProfit=0,totalHeads=0,totalSold=0;
    const negotiations=rec.map(function(r){
      const c=recordCalc(r),pay=paymentTotals(r,'Pagar'),receive=paymentTotals(r,'Receber');
      totalBuy+=finite(c.totalC);totalSell+=finite(c.totalV);totalStock+=finite(c.capital);totalCosts+=finite(c.custo);totalProfit+=finite(c.lucro);totalHeads+=finite(c.qc);totalSold+=Math.min(finite(c.qc),finite(c.qv));
      return {
        id:r.id||'',data:r.data||'',vendedor:r.vendedor||'',categoria:r.era||'',qtdCompra:c.qc,pesoKg:c.kg,arrobas:c.at,precoCompraCab:c.pc,precoCompraKg:c.pcKg,totalCompra:c.totalC,pgVendedor:r.pg||'',formaCompra:r.paymentBuy||'',contaVendedor:r.accountBuy||'',fazendaOrigem:r.originFarm||'',municipioOrigem:r.originCity||'',ufOrigem:r.originState||'',latitudeOrigem:r.originLat,longitudeOrigem:r.originLng,
        comprador:r.comprador||'',marca:r.marca||'',qtdVenda:c.qv,precoVendaCab:c.pv,precoVendaKg:c.pvKg,totalVenda:c.totalV,pgComprador:r.pgComprador||'',formaVenda:r.paymentSell||'',contaComprador:r.accountSell||'',fazendaDestino:r.destFarm||'',municipioDestino:r.destCity||'',ufDestino:r.destState||'',latitudeDestino:r.destLat,longitudeDestino:r.destLng,
        status:c.status,saldo:c.saldo,capitalEstoque:c.capital,custos:c.custo,lucro:c.lucro,gta:r.gta||'',nota:r.nota||'',gtaPdf:r.gtaPdf&&r.gtaPdf.name||'',notaPdf:r.notaPdf&&r.notaPdf.name||'',comprovantePdf:r.paymentPdf&&r.paymentPdf.name||'',parcelas:pay.count+receive.count,pendentePagar:pay.pending,pendenteReceber:receive.pending,observacoes:r.pagamento||r.observacoes||'',intermediario:r.parceiro||'',atualizadoEm:r.updatedAt||''
      };
    });
    const installments=[];
    rec.forEach(function(r){
      asArray(r.installments).forEach(function(p,index){
        installments.push({negociacaoId:r.id||'',negociacaoData:r.data||'',vendedor:r.vendedor||'',comprador:r.comprador||'',categoria:r.era||'',numero:index+1,tipo:p.type||'',vencimento:p.date||'',valor:finite(p.value),baixada:!!p.paid,dataBaixa:p.paidDate||'',status:p.paid?(String(p.type||'').toLowerCase()==='receber'?'Recebido':'Pago'):'Pendente'});
      });
    });
    const byRecord=new Map(rec.map(function(r){return [r.id,r]}));
    const costsRows=cost.map(function(c){
      const r=byRecord.get(c.recordId);
      return {id:c.id||'',data:c.date||'',mes:c.month||'',tipo:c.type||'',descricao:c.desc||'',negociacaoId:c.recordId||'',vendedor:r&&r.vendedor||'',valor:finite(c.value),atualizadoEm:c.updatedAt||''};
    });
    const summary=[
      {indicador:'Data da exportação',valor:new Date().toLocaleString('pt-BR'),unidade:''},
      {indicador:'Versão do programa',valor:'v'+APP_VERSION,unidade:''},
      {indicador:'Negociações',valor:rec.length,unidade:'registros'},
      {indicador:'Custos lançados',valor:cost.length,unidade:'lançamentos'},
      {indicador:'Parcelas',valor:installments.length,unidade:'parcelas'},
      {indicador:'PDFs anexados',valor:countPdfs(rec),unidade:'arquivos'},
      {indicador:'Cabeças compradas',valor:totalHeads,unidade:'cabeças'},
      {indicador:'Cabeças vendidas',valor:totalSold,unidade:'cabeças'},
      {indicador:'Total de compras',valor:totalBuy,unidade:'R$'},
      {indicador:'Total de vendas',valor:totalSell,unidade:'R$'},
      {indicador:'Capital em estoque',valor:totalStock,unidade:'R$'},
      {indicador:'Custos vinculados',valor:totalCosts,unidade:'R$'},
      {indicador:'Lucro realizado',valor:totalProfit,unidade:'R$'}
    ];
    return {summary:summary,negotiations:negotiations,installments:installments,costs:costsRows};
  }

  function createWorkbookBytes(){
    const data=buildWorkbookData();
    const sheets=[
      {name:'Resumo',columns:[{key:'indicador',label:'Indicador',width:25},{key:'valor',label:'Valor',width:20},{key:'unidade',label:'Unidade',width:14}],rows:data.summary},
      {name:'Negociações',columns:[
        {key:'id',label:'ID',width:18},{key:'data',label:'Data',type:'date',width:12},{key:'vendedor',label:'Vendedor',width:24},{key:'categoria',label:'Categoria',width:15},{key:'qtdCompra',label:'Qtd compra',type:'integer'},{key:'pesoKg',label:'Peso kg/cab',type:'decimal'},{key:'arrobas',label:'Arrobas/cab',type:'decimal'},{key:'precoCompraCab',label:'Preço compra/cab',type:'money'},{key:'precoCompraKg',label:'Preço compra/kg',type:'money'},{key:'totalCompra',label:'Total compra',type:'money'},{key:'pgVendedor',label:'PG vendedor'},{key:'formaCompra',label:'Forma pag. compra'},{key:'contaVendedor',label:'Conta/Pix vendedor',width:24},{key:'fazendaOrigem',label:'Fazenda origem',width:22},{key:'municipioOrigem',label:'Município origem',width:18},{key:'ufOrigem',label:'UF origem'},{key:'latitudeOrigem',label:'Latitude origem',type:'decimal'},{key:'longitudeOrigem',label:'Longitude origem',type:'decimal'},
        {key:'comprador',label:'Comprador',width:24},{key:'marca',label:'Marca',width:15},{key:'qtdVenda',label:'Qtd venda',type:'integer'},{key:'precoVendaCab',label:'Preço venda/cab',type:'money'},{key:'precoVendaKg',label:'Preço venda/kg',type:'money'},{key:'totalVenda',label:'Total venda',type:'money'},{key:'pgComprador',label:'PG comprador'},{key:'formaVenda',label:'Forma pag. venda'},{key:'contaComprador',label:'Conta/Pix comprador',width:24},{key:'fazendaDestino',label:'Fazenda destino',width:22},{key:'municipioDestino',label:'Município destino',width:18},{key:'ufDestino',label:'UF destino'},{key:'latitudeDestino',label:'Latitude destino',type:'decimal'},{key:'longitudeDestino',label:'Longitude destino',type:'decimal'},
        {key:'status',label:'Status'},{key:'saldo',label:'Saldo cabeças',type:'integer'},{key:'capitalEstoque',label:'Capital estoque',type:'money'},{key:'custos',label:'Custos',type:'money'},{key:'lucro',label:'Lucro realizado',type:'money'},{key:'gta',label:'GTA'},{key:'nota',label:'Nota'},{key:'gtaPdf',label:'PDF GTA',width:22},{key:'notaPdf',label:'PDF Nota',width:22},{key:'comprovantePdf',label:'PDF Comprovante',width:22},{key:'parcelas',label:'Parcelas',type:'integer'},{key:'pendentePagar',label:'Pendente pagar',type:'money'},{key:'pendenteReceber',label:'Pendente receber',type:'money'},{key:'observacoes',label:'Pagamento/Observações',width:30},{key:'intermediario',label:'Intermediário',width:22},{key:'atualizadoEm',label:'Atualizado em',width:23}
      ],rows:data.negotiations},
      {name:'Parcelas',columns:[{key:'negociacaoId',label:'ID negociação',width:18},{key:'negociacaoData',label:'Data negociação',type:'date'},{key:'vendedor',label:'Vendedor',width:24},{key:'comprador',label:'Comprador',width:24},{key:'categoria',label:'Categoria'},{key:'numero',label:'Nº',type:'integer'},{key:'tipo',label:'Tipo'},{key:'vencimento',label:'Vencimento',type:'date'},{key:'valor',label:'Valor',type:'money'},{key:'baixada',label:'Baixada',type:'boolean'},{key:'dataBaixa',label:'Data da baixa',type:'date'},{key:'status',label:'Status'}],rows:data.installments},
      {name:'Custos',columns:[{key:'id',label:'ID',width:18},{key:'data',label:'Data',type:'date'},{key:'mes',label:'Mês'},{key:'tipo',label:'Tipo',width:18},{key:'descricao',label:'Descrição',width:30},{key:'negociacaoId',label:'ID negociação',width:18},{key:'vendedor',label:'Vendedor',width:24},{key:'valor',label:'Valor',type:'money'},{key:'atualizadoEm',label:'Atualizado em',width:23}],rows:data.costs}
    ];
    const workbookSheets=sheets.map(function(s,i){return '<sheet name="'+xml(s.name)+'" sheetId="'+(i+1)+'" r:id="rId'+(i+1)+'"/>'}).join('');
    const workbookRels=sheets.map(function(_,i){return '<Relationship Id="rId'+(i+1)+'" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet'+(i+1)+'.xml"/>'}).join('')+'<Relationship Id="rId'+(sheets.length+1)+'" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>';
    const overrides=sheets.map(function(_,i){return '<Override PartName="/xl/worksheets/sheet'+(i+1)+'.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>'}).join('');
    const files=[
      {name:'[Content_Types].xml',data:'<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/><Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/><Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/>'+overrides+'</Types>'},
      {name:'_rels/.rels',data:'<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/><Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/></Relationships>'},
      {name:'docProps/core.xml',data:'<?xml version="1.0" encoding="UTF-8" standalone="yes"?><cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"><dc:title>Exportação Compra e Venda de Gado v112</dc:title><dc:creator>Compra e Venda de Gado</dc:creator><dcterms:created xsi:type="dcterms:W3CDTF">'+nowIso()+'</dcterms:created></cp:coreProperties>'},
      {name:'docProps/app.xml',data:'<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties" xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes"><Application>Compra e Venda de Gado v112</Application></Properties>'},
      {name:'xl/workbook.xml',data:'<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>'+workbookSheets+'</sheets></workbook>'},
      {name:'xl/_rels/workbook.xml.rels',data:'<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'+workbookRels+'</Relationships>'},
      {name:'xl/styles.xml',data:'<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><numFmts count="3"><numFmt numFmtId="164" formatCode="[$R$-pt-BR] #,##0.00"/><numFmt numFmtId="165" formatCode="dd/mm/yyyy"/><numFmt numFmtId="166" formatCode="0.00"/></numFmts><fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><color rgb="FFFFFFFF"/><sz val="11"/><name val="Calibri"/></font></fonts><fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF17633F"/><bgColor indexed="64"/></patternFill></fill></fills><borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="6"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf><xf numFmtId="164" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/><xf numFmtId="165" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/><xf numFmtId="1" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/><xf numFmtId="166" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>'}
    ];
    sheets.forEach(function(s,i){files.push({name:'xl/worksheets/sheet'+(i+1)+'.xml',data:sheetXml(s.columns,s.rows)})});
    return zipStore(files);
  }

  function exportExcel(){
    const button=byId('csvBtn');
    const oldText=button?button.textContent:'';
    if(button){button.disabled=true;button.textContent='Gerando Excel…'}
    try{
      const bytes=createWorkbookBytes();
      downloadBlob('gado_exportacao_completa_'+dateTag()+'.xlsx',new Blob([bytes],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'}));
    }catch(error){
      console.error('EXCEL V112',error);
      alert('Não foi possível gerar o Excel: '+(error&&error.message?error.message:error));
    }finally{
      if(button){button.disabled=false;button.textContent=oldText||'Exportar Excel'}
    }
  }

  async function readBackupFile(file){
    if(!file)throw new Error('Nenhum arquivo foi selecionado.');
    if(file.size>MAX_BACKUP_BYTES)throw new Error('O backup é maior que 180 MB.');
    const text=await file.text();
    let raw;
    try{raw=JSON.parse(text)}catch(_){throw new Error('O arquivo não é um backup JSON válido.');}
    let format='legado',createdAt='',owner={id:'',email:''},expectedChecksum='',rec,cost;
    if(Array.isArray(raw)){
      rec=raw;cost=[];
    }else if(raw&&raw.format===BACKUP_FORMAT&&raw.data){
      format=BACKUP_FORMAT;
      createdAt=String(raw.createdAt||'');
      owner=raw.owner&&typeof raw.owner==='object'?{id:String(raw.owner.id||''),email:String(raw.owner.email||'')}:{id:'',email:''};
      expectedChecksum=String(raw.checksum&&raw.checksum.value||'');
      rec=raw.data.records;cost=raw.data.costs;
    }else if(raw&&typeof raw==='object'){
      createdAt=String(raw.createdAt||'');
      rec=raw.records;cost=raw.costs;
    }
    if(!Array.isArray(rec)||!Array.isArray(cost))throw new Error('O arquivo não contém as listas de negociações e custos.');
    const cleanRecords=dedupe(rec,'n',createdAt||nowIso());
    const cleanCosts=dedupe(cost,'c',createdAt||nowIso());
    if(rec.length>100000||cost.length>200000)throw new Error('O backup contém registros demais para restauração pelo telefone.');
    let checksumState='Não disponível (backup antigo)';
    if(expectedChecksum){
      const actual=await sha256(dataForChecksum(rec,cost));
      if(actual!==expectedChecksum)throw new Error('A verificação de integridade falhou. O arquivo pode estar incompleto ou alterado.');
      checksumState='Integridade confirmada';
    }
    return {
      fileName:file.name,format:format,createdAt:createdAt,owner:owner,checksumState:checksumState,
      records:cleanRecords.items,costs:cleanCosts.items,
      duplicates:cleanRecords.duplicates+cleanCosts.duplicates,
      generatedIds:cleanRecords.generated+cleanCosts.generated,
      pdfs:countPdfs(cleanRecords.items),installments:countInstallments(cleanRecords.items)
    };
  }

  function ensureRestoreModal(){
    let modal=byId('restoreV112Modal');
    if(modal)return modal;
    modal=document.createElement('div');
    modal.id='restoreV112Modal';
    modal.className='modal';
    modal.innerHTML='<div class="modalcard" style="max-width:760px"><div class="mh"><div><b>Restaurar backup com segurança</b><div class="hint">Confira o conteúdo antes de alterar os dados</div></div><button type="button" class="mini" id="restoreV112Close">Fechar</button></div><div class="mb"><div id="restoreV112Summary"></div><div style="margin-top:16px;padding:12px;border:1px solid #d7e9dc;background:#f3faf5;border-radius:12px"><b>Escolha como restaurar:</b><div class="hint" style="margin-top:6px"><b>Mesclar</b> acrescenta o que falta, evita duplicações e preserva edições atuais mais novas.<br><b>Substituir tudo</b> deixa o sistema exatamente como o backup e remove dados atuais que não estão nele.</div></div><div style="display:flex;gap:8px;flex-wrap:wrap;justify-content:flex-end;margin-top:16px"><button type="button" class="btn secondary" id="restoreV112Cancel">Cancelar</button><button type="button" class="btn primary" id="restoreV112Merge">Mesclar com os atuais</button><button type="button" class="btn danger" id="restoreV112Replace">Substituir tudo</button></div></div></div>';
    document.body.appendChild(modal);
    byId('restoreV112Close').onclick=closeRestore;
    byId('restoreV112Cancel').onclick=closeRestore;
    byId('restoreV112Merge').onclick=function(){applyRestore('merge')};
    byId('restoreV112Replace').onclick=function(){applyRestore('replace')};
    return modal;
  }
  function closeRestore(){
    const modal=byId('restoreV112Modal');
    if(modal)modal.classList.remove('show');
    restorePreview=null;
  }
  function showRestorePreview(preview){
    restorePreview=preview;
    const modal=ensureRestoreModal();
    const user=currentUser();
    const differentUser=preview.owner.id&&user.id&&preview.owner.id!==user.id;
    const when=preview.createdAt?new Date(preview.createdAt).toLocaleString('pt-BR'):'Data não informada';
    byId('restoreV112Summary').innerHTML=
      '<div class="kpis" style="grid-template-columns:repeat(4,minmax(120px,1fr))"><div class="kpi"><span>Negociações</span><b>'+preview.records.length+'</b></div><div class="kpi"><span>Custos</span><b>'+preview.costs.length+'</b></div><div class="kpi"><span>Parcelas</span><b>'+preview.installments+'</b></div><div class="kpi"><span>PDFs</span><b>'+preview.pdfs+'</b></div></div>'+
      '<div class="calc"><b>Arquivo:</b> '+html(preview.fileName)+'<br><b>Criado em:</b> '+html(when)+'<br><b>Verificação:</b> '+html(preview.checksumState)+(preview.duplicates?'<br><b>Duplicações internas removidas:</b> '+preview.duplicates:'')+(preview.generatedIds?'<br><b>IDs antigos recuperados:</b> '+preview.generatedIds:'')+'</div>'+
      (differentUser?'<div style="margin-top:12px;padding:12px;border-radius:10px;background:#fff1d6;color:#7a5100"><b>Atenção:</b> este backup foi criado em outra conta. Confira antes de continuar.</div>':'');
    modal.classList.add('show');
  }

  function mergeLists(current,incoming){
    const map=new Map();
    asArray(current).forEach(function(item){if(item&&item.id)map.set(String(item.id),clone(item))});
    asArray(incoming).forEach(function(item){
      if(!item||!item.id)return;
      const id=String(item.id),old=map.get(id);
      if(!old||stamp(item)>stamp(old))map.set(id,clone(item));
    });
    return Array.from(map.values());
  }

  async function applyRestore(mode){
    if(!restorePreview)return;
    const merge=mode==='merge';
    if(!merge){
      const ok=confirm('ATENÇÃO: substituir tudo removerá do sistema as negociações e os custos atuais que não estiverem neste backup. Deseja continuar?');
      if(!ok)return;
    }
    const mergeBtn=byId('restoreV112Merge'),replaceBtn=byId('restoreV112Replace');
    if(mergeBtn)mergeBtn.disabled=true;if(replaceBtn)replaceBtn.disabled=true;
    try{
      const oldRecords=clone(currentRecords()),oldCosts=clone(currentCosts());
      if(typeof safetySnapshot==='function')safetySnapshot('antes-de-restaurar-backup-v112');
      if(merge){
        records=mergeLists(oldRecords,restorePreview.records);
        costs=mergeLists(oldCosts,restorePreview.costs);
      }else{
        const incomingRecordIds=new Set(restorePreview.records.map(function(x){return String(x.id)}));
        const incomingCostIds=new Set(restorePreview.costs.map(function(x){return String(x.id)}));
        if(typeof addDeletedId==='function'){
          oldRecords.forEach(function(x){if(x&&x.id&&!incomingRecordIds.has(String(x.id)))addDeletedId(DELETED_RECORDS_KEY,x.id)});
          oldCosts.forEach(function(x){if(x&&x.id&&!incomingCostIds.has(String(x.id)))addDeletedId(DELETED_COSTS_KEY,x.id)});
        }
        const restoredAt=nowIso();
        records=restorePreview.records.map(function(x){const y=clone(x);y.restoredAt=restoredAt;y.updatedAt=restoredAt;return y});
        costs=restorePreview.costs.map(function(x){const y=clone(x);y.restoredAt=restoredAt;y.updatedAt=restoredAt;return y});
      }
      if(typeof persist!=='function')throw new Error('A rotina de salvamento não está disponível.');
      persist();
      if(typeof renderAll==='function')renderAll();
      const recCount=records.length,costCount=costs.length;
      closeRestore();
      alert((merge?'Backup mesclado':'Backup substituído')+' com sucesso: '+recCount+' negociações e '+costCount+' custos. A nuvem será sincronizada.');
      setTimeout(function(){try{if(window.syncPendingNow)window.syncPendingNow(true)}catch(_){}},500);
    }catch(error){
      console.error('RESTORE V112',error);
      alert('Não foi possível restaurar: '+(error&&error.message?error.message:error));
    }finally{
      if(mergeBtn)mergeBtn.disabled=false;if(replaceBtn)replaceBtn.disabled=false;
    }
  }

  async function onRestoreFile(event){
    event.stopImmediatePropagation();
    const input=event.currentTarget||event.target;
    const file=input&&input.files&&input.files[0];
    if(!file)return;
    try{
      const preview=await readBackupFile(file);
      showRestorePreview(preview);
    }catch(error){
      console.error('READ BACKUP V112',error);
      alert('Backup inválido: '+(error&&error.message?error.message:error));
    }finally{
      if(input)input.value='';
    }
  }

  function bind(){
    const excelBtn=byId('csvBtn'),backupBtn=byId('backupBtn'),restore=byId('restore');
    if(excelBtn){excelBtn.textContent='Exportar Excel';excelBtn.onclick=exportExcel}
    if(backupBtn){backupBtn.textContent='Backup completo';backupBtn.onclick=createFullBackup}
    if(restore&&!restore.dataset.backupV112){
      restore.dataset.backupV112='1';
      restore.accept='.json,application/json';
      restore.addEventListener('change',onRestoreFile,true);
      const label=restore.closest('label');
      if(label&&label.childNodes.length)label.childNodes[0].textContent='Restaurar backup';
    }
    try{exportCSV=exportExcel}catch(_){}
    try{backup=createFullBackup}catch(_){}
    window.exportExcelV112=exportExcel;
    window.createFullBackupV112=createFullBackup;
    window.__BACKUP_V112_READY=true;
    window.__BACKUP_V112_TEST={zipStore:zipStore,createWorkbookBytes:createWorkbookBytes,mergeLists:mergeLists,readBackupFile:readBackupFile,sha256:sha256};
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bind,{once:true});
  else bind();
  setTimeout(bind,700);
})();
