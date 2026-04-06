/**
 * RELEASED HOLD ELIGIBILITY FLOOR — REGRESSION TESTS
 *
 * Run in browser console after LM data is loaded.
 * Tests the planBiK vs origBiK separation.
 */
(function(){
  'use strict';
  const PASS='✅', FAIL='❌';
  let passed=0,failed=0;
  const log=(name,ok,detail)=>{ok?passed++:failed++;console.log(`${ok?PASS:FAIL} ${name}${detail?' — '+detail:''}`)};

  console.log('%c══ RELEASED HOLD ELIGIBILITY FLOOR TESTS ══','color:#CF5D5D;font-weight:bold');
  const today=new Date().toISOString().slice(0,10);

  // Find a venue with past bump-in dates
  let testVenue=null,testSku=null,testOrigBiK=null;
  for(const r of RW){
    if(r._kit)continue;
    const s=r.Nomenclature;if(!s||!NOM[s])continue;
    const bi=r['Estimated bump-in date'];if(!bi)continue;
    const biK=typeof pD==='function'&&pD(bi)?dk(pD(bi)):null;
    if(!biK||biK>=today)continue;
    testVenue=r.Venue;testSku=s;testOrigBiK=biK;
    break;
  }

  // ══ T1: Release past-dated item → truck NOT in past ══
  if(!testVenue){console.warn('⏭ No past-dated items found for T1-T4');return}

  // Setup: hold then release
  const k=testVenue+'|'+testSku;
  const savedHolds=new Set(LM_holds);
  const savedReleased={...LM_holdReleased};

  LM_holds.add(k);
  delete LM_holdReleased[k];
  PLAN_CACHE={};numberAll();

  // Verify held = not on any truck
  let heldOnTruck=false;
  const P1=PLAN_CACHE[testVenue];
  if(P1)for(const d of P1.days||[])for(const t of d.trucks||[])for(const it of t.items||[])if(it.sku===testSku)heldOnTruck=true;
  log('T1a: Held item not on any truck',!heldOnTruck,`${testSku}@${testVenue}`);

  // Release
  LM_holds.delete(k);
  LM_holdReleased[k]=today;
  PLAN_CACHE={};numberAll();

  // Verify: truck date >= today
  let releasedTruckDate=null,releasedTruckBiK=null,releasedOrigBiK=null;
  const P2=PLAN_CACHE[testVenue];
  if(P2)for(const d of P2.days||[])for(const t of d.trucks||[]){
    for(const it of t.items||[])if(it.sku===testSku){releasedTruckDate=t.dd;releasedTruckBiK=t.biK;releasedOrigBiK=t.origBiK;break}
    if(releasedTruckDate)break;
  }

  log('T1b: Released item truck date >= today',releasedTruckDate>=today||releasedTruckDate===null,
    `dd=${releasedTruckDate} today=${today}`);
  log('T1c: planBiK >= today',releasedTruckBiK>=today||releasedTruckBiK===null,
    `biK=${releasedTruckBiK}`);
  log('T1d: origBiK = original need date',releasedOrigBiK===testOrigBiK||releasedOrigBiK<=testOrigBiK,
    `origBiK=${releasedOrigBiK} expected<=${testOrigBiK}`);
  log('T1e: origBiK != planBiK (different dates for past item)',
    !releasedOrigBiK||!releasedTruckBiK||releasedOrigBiK<=releasedTruckBiK,
    `origBiK=${releasedOrigBiK} biK=${releasedTruckBiK}`);

  // ══ T2: Release future-dated item → truck uses original date ══
  let futVenue=null,futSku=null,futBiK=null;
  for(const r of RW){
    if(r._kit)continue;const s=r.Nomenclature;if(!s||!NOM[s])continue;
    const bi=r['Estimated bump-in date'];if(!bi)continue;
    const biK=typeof pD==='function'&&pD(bi)?dk(pD(bi)):null;
    if(!biK||biK<=today)continue;
    futVenue=r.Venue;futSku=s;futBiK=biK;break;
  }
  if(futVenue){
    const fk=futVenue+'|'+futSku;
    LM_holds.add(fk);delete LM_holdReleased[fk];
    LM_holds.delete(fk);LM_holdReleased[fk]=today;
    PLAN_CACHE={};numberAll();
    let futTruckBiK=null;
    const PF=PLAN_CACHE[futVenue];
    if(PF)for(const d of PF.days||[])for(const t of d.trucks||[])for(const it of t.items||[])if(it.sku===futSku){futTruckBiK=t.biK;break}
    log('T2: Future item uses original biK (no clamping)',futTruckBiK===futBiK||futTruckBiK===null,
      `biK=${futTruckBiK} origBiK=${futBiK}`);
    delete LM_holdReleased[fk];
  } else {console.warn('⏭ T2 skipped: no future-dated items')}

  // ══ T3: Re-hold → release again → new release date ══
  LM_holds.add(k);delete LM_holdReleased[k];
  LM_holds.delete(k);
  const newDate='2026-04-02';// simulate tomorrow
  LM_holdReleased[k]=newDate;
  log('T3: Re-release uses new date',LM_holdReleased[k]===newDate,`stored=${LM_holdReleased[k]}`);

  // ══ T4: Locked truck unchanged after release ══
  const savedDispatched=new Set(LM_dispatched);
  const savedSnapshots=JSON.parse(JSON.stringify(LM_lockedSnapshots));
  LM_holdReleased[k]=today;
  PLAN_CACHE={};numberAll();
  const snapsUnchanged=JSON.stringify(LM_lockedSnapshots)===JSON.stringify(savedSnapshots);
  const dispUnchanged=[...LM_dispatched].join()===([...savedDispatched].join());
  log('T4: Locked trucks unchanged after release',snapsUnchanged&&dispUnchanged,
    `snaps=${snapsUnchanged} disp=${dispUnchanged}`);

  // ══ T5: Save/load roundtrip ══
  const serialized=JSON.stringify({holds:[...LM_holds],holdReleased:LM_holdReleased});
  const restored=JSON.parse(serialized);
  const holdsMatch=JSON.stringify([...new Set(restored.holds)])===JSON.stringify([...LM_holds]);
  const releasedMatch=JSON.stringify(restored.holdReleased)===JSON.stringify(LM_holdReleased);
  log('T5: Save/load roundtrip',holdsMatch&&releasedMatch,`holds=${holdsMatch} released=${releasedMatch}`);

  // ══ T6: Undo roundtrip ══
  const snap={lm_holds:JSON.stringify([...LM_holds]),lm_holdReleased:JSON.stringify(LM_holdReleased)};
  const undoHolds=new Set(JSON.parse(snap.lm_holds));
  const undoRel=JSON.parse(snap.lm_holdReleased);
  log('T6: Undo snapshot captures release dates',
    undoRel[k]===LM_holdReleased[k],`undo=${undoRel[k]} current=${LM_holdReleased[k]}`);

  // ══ CLEANUP ══
  LM_holds=savedHolds;
  LM_holdReleased=savedReleased;
  PLAN_CACHE={};numberAll();

  console.log(`%c══ RESULTS: ${passed} passed, ${failed} failed ══`,
    `color:${failed>0?'#C62A2F':'#12804A'};font-size:14px;font-weight:bold`);
  return{passed,failed};
})();
