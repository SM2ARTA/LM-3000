// ═══════════════════════════════════════════════════════════════
// ML3K Shared Calculations — reusable across all modules
// ═══════════════════════════════════════════════════════════════

// ── Destination Classification ──
function isDestCAN(d){const u=(d||'').toUpperCase();return u.startsWith('CAN')||u.includes('TORONTO')||u.includes('VANCOUVER')}
function isDestMEX(d){const u=(d||'').toUpperCase();return u.startsWith('MEX')||u.includes('GUADALAJARA')||u.includes('MONTERREY')||u.includes('MEXICO CITY')}
function isDestUSA(d){return!isDestCAN(d)&&!isDestMEX(d)}
function isDestStadium(d){return d&&(d.includes('Stadium')||d.includes('Broadcast'))}
function isTruckDest(d){const u=(d||'').toUpperCase();return u.includes('MEX')||u.includes('CAN')||u.includes('RIC')}
function destCountry(d){if(isDestMEX(d))return'mex';if(isDestCAN(d))return'can';return'usa'}
function destPriority(d){if(isDestMEX(d))return 0;if(isDestCAN(d))return 1;return 2}

// ── VN Aggregation ──
// field: 'ep' (pallets) or 'it' (pieces)
// country: 'all'|'usa'|'can'|'mex' (optional, default 'all')
function vnSum(field,country){
  if(!country||country==='all')return VN.reduce((s,v)=>s+(v[field]||0),0);
  if(country==='can')return VN.filter(v=>vcIsCAN(v.cluster)).reduce((s,v)=>s+(v[field]||0),0);
  if(country==='mex')return VN.filter(v=>vcIsMEX(v.cluster)).reduce((s,v)=>s+(v[field]||0),0);
  return VN.filter(v=>!vcIsCAN(v.cluster)&&!vcIsMEX(v.cluster)).reduce((s,v)=>s+(v[field]||0),0);
}

// ── Source Classification ──
function isExclSrc(sku){const s=(NOM[sku]?.src||'').toUpperCase().trim();return s.startsWith('CT')||s.startsWith('STP')}

// ── Stock Coverage ──
// Returns {inStock, total, pct, color}
function stockCoverage(demandSkus){
  if(!STOCK_SKUS||!STOCK_SKUS.size)return{inStock:0,total:demandSkus.size,pct:0,color:'var(--tt)',hasReport:false};
  const inStock=[...demandSkus].filter(s=>STOCK_SKUS.has(s)).length;
  const pct=demandSkus.size>0?Math.round(inStock/demandSkus.size*100):0;
  const color=pct>=90?'var(--gn)':pct>=50?'var(--or)':'var(--rd)';
  return{inStock,total:demandSkus.size,pct,color,hasReport:true};
}

// ── Progress Color Scale ──
function pctColor(pct){return pct>=90?'var(--gn)':pct>=50?'var(--or)':'var(--ac)'}

// ── KPI Card Presets ──
function cortCard(count,pcs){
  return{label:'🏷 CORT',value:count,color:'#E31837',labelColor:'#E31837',style:'border-color:#F5C6C7;background:#FFF8F8',sub:pcs.toLocaleString()+' pcs'};
}
function stpCard(count,pcs,plt,days){
  const sub=pcs.toLocaleString()+(plt!==undefined?' pcs · '+plt.toFixed(1)+' plt':' qty')+(days?' · '+days+' days':'');
  return{label:'🏪 Staples',value:count,color:'#EF6C00',labelColor:'#EF6C00',style:'border-color:#FFCC80;background:#FFF8F0',sub};
}

// ── Compute KPIs from a unified truck list ──
// trucks: [{source:'Load Plan'|'Last Mile'|'STP Direct', dest, pallets, qty, items, excluded, id, date, _stpRate?}]
// cort: [{dest, qty, excluded}]
// opts: {countryFilter:'all'|'lp'|'usa'|'can'|'mex', dates:[], getLmTc:fn(dest)=>cap}
// Returns data object (no rendering)
function computeKpis(trucks,cort,opts){
  opts=opts||{};
  const cf=opts.countryFilter||'all';
  const active=trucks.filter(t=>!t.excluded);
  const activeCort=(cort||[]).filter(c=>!c.excluded);

  // ── By source ──
  const lp=active.filter(t=>t.source==='Load Plan');
  const lm=active.filter(t=>t.source==='Last Mile');
  const stp=active.filter(t=>t.source==='STP Direct');

  // ── Core metrics ──
  const lpPlt=Math.round(lp.reduce((s,t)=>s+t.pallets,0)*10)/10;
  const lmPlt=cf==='lp'?0:Math.round(vnSum('ep',cf)*10)/10;
  const pieces=cf==='lp'?lp.reduce((s,t)=>s+t.qty,0):vnSum('it',cf);

  // ── CORT ──
  const cortN=activeCort.length;
  const cortPcs=activeCort.reduce((s,c)=>s+c.qty,0);

  // ── STP ──
  const stpN=stp.length;
  const stpPlt=stp.reduce((s,t)=>s+t.pallets,0);
  const stpPcs=stp.reduce((s,t)=>s+t.qty,0);

  // ── Destinations ──
  const lpDests=new Set(lp.map(t=>t.dest));
  const lmDests=new Set(lm.map(t=>t.dest));

  // ── Dates ──
  const dates=opts.dates||[];

  // ── Distribution cost ──
  const _tc=opts.getLmTc||(d=>12);
  const lpCost=lp.reduce((s,t)=>s+getEffRate(t.id,t.dest,26,false),0);
  const lmSta=lm.filter(t=>isDestStadium(t.dest));
  const lmLocal=lm.filter(t=>!isDestStadium(t.dest)&&(isDestCAN(t.dest)||isDestMEX(t.dest)));
  const lmCluster=lm.filter(t=>!isDestStadium(t.dest)&&isDestUSA(t.dest));
  const staCost=lmSta.reduce((s,t)=>s+getEffRate(t.id,t.dest,_tc(t.dest),true),0);
  const clusterCost=lmCluster.reduce((s,t)=>s+getEffRate(t.id,t.dest,_tc(t.dest),true),0);
  const localCost=lmLocal.reduce((s,t)=>s+getEffRate(t.id,t.dest,_tc(t.dest),true),0);
  const stpCost=stp.reduce((s,t)=>s+(t._stpRate||0),0);
  const distCost=lpCost+staCost+clusterCost+localCost+stpCost;

  // ── Stock coverage ──
  const demandSkus=collectDemandSkus(cf);
  const stock=stockCoverage(demandSkus);

  return{
    // Counts
    lpCount:lp.length, lmCount:lm.length, stpN, cortN,
    // Pallets
    lpPlt, lmPlt,
    // Pieces
    pieces,
    // STP detail
    stpPlt, stpPcs,
    // CORT detail
    cortPcs,
    // Destinations
    lpDests, lmDests,
    // Dates
    dateCount:dates.length,
    // Cost
    distCost, lpCost, staCost, clusterCost, localCost, stpCost,
    // Stock
    stock,
    // Active arrays (for subtitle / further use)
    active, activeCort
  };
}

// Build standard KPI card array from computeKpis result
function buildKpiCards(k,opts){
  opts=opts||{};
  const cards=[
    {label:'🚛 LM Pallets',value:k.lmPlt.toLocaleString(),color:'var(--gn)',sub:k.lmCount+' trucks'},
    {label:'📦 LP Pallets',value:k.lpPlt.toLocaleString(),color:'var(--ac)',sub:k.lpCount+' trucks'},
    {label:'📋 Pieces',value:k.pieces.toLocaleString()},
    {label:'🚛 Trucks',value:(k.lmCount+k.lpCount),sub:'LP '+k.lpCount+' · LM '+k.lmCount},
  ];
  if(k.cortN>0)cards.push(cortCard(k.cortN,k.cortPcs));
  if(k.stpN>0)cards.push(stpCard(k.stpN,k.stpPcs,k.stpPlt));
  const destSub='LP '+k.lpDests.size+' · LM '+k.lmDests.size;
  cards.push({label:'📅 Ship Dates',value:k.dateCount},{label:'🌎 Destinations',value:k.lpDests.size+k.lmDests.size,sub:destSub});
  cards.push({label:'📦 In Stock',value:k.stock.hasReport?k.stock.pct+'%':'—',color:k.stock.color,sub:k.stock.hasReport?k.stock.inStock+' / '+k.stock.total+' SKUs':'No stock report'});
  return cards;
}

// ── Demand SKU Collection (for stock coverage) ──
// countryFilter: 'all'|'lp'|'usa'|'can'|'mex'
function collectDemandSkus(countryFilter){
  const skus=new Set();
  // LM material plan (RW)
  if(countryFilter!=='lp'){
    const _isMatch=v=>{
      if(countryFilter==='all')return true;
      const meta=VN.find(x=>x.name===v);
      const cl=meta?.cluster||'';
      if(countryFilter==='can')return vcIsCAN(cl);
      if(countryFilter==='mex')return vcIsMEX(cl);
      return!vcIsCAN(cl)&&!vcIsMEX(cl);// usa
    };
    for(const r of RW){
      const sku=r["Nomenclature"];
      if(!sku||!NOM[sku]||NOM[sku]._kitNom||isExclSrc(sku))continue;
      const v=r["Venue"];if(!v||!_isMatch(v))continue;
      skus.add(sku);
    }
  }
  // LP material plan
  if(countryFilter==='all'||countryFilter==='lp'){
    for(const d of(LP_STATE.materialPlan||[])){
      if(!d.sku)continue;
      if(isExclSrc(d.sku))continue;
      const src=(LP_STATE.nomenclature[d.sku]?.source||'').toUpperCase().trim();
      if(src.startsWith('CT')||src.startsWith('STP'))continue;
      skus.add(d.sku);
    }
  }
  return skus;
}
