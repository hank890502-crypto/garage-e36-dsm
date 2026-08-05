/* ==========================================================================
   相容性判斷引擎 + 輪圈幾何計算
   等級：g 綠=確認可直上 / y 黃=需其他配件或調整 / r 紅=不建議或無法安裝 / n 灰=資料不足
   原則：一律顯示「判斷依據」，不只顯示結果。
   ========================================================================== */
const LV = {g:'可直上', y:'需配件或調整', r:'不建議／無法安裝', n:'資料不足'};
const LVRANK = {g:0, y:1, r:2, n:3};

function compat(p, c){
  const R = [];
  if(!c || !c.modelId){
    return {lv:'n', R:[{k:'n', t:'尚未選擇車輛或車輛資料不完整，無法判斷適用性'}]};
  }
  const eng = carEngine(c), mdl = mdlById(c.modelId), body = bodyById(c.bodyId);
  const f = p.fit || {};
  let lv = 'g';
  const bump = v => { if(LVRANK[v] > LVRANK[lv] && lv!=='n') lv = v; };

  /* --- 引擎適用 --- */
  if(f.eng && f.eng.length){
    if(!eng){ R.push({k:'n', t:'車輛未設定引擎，無法比對引擎適用性'}); lv='n'; }
    else if(f.eng.includes(eng.id)) R.push({k:'g', t:`引擎 ${eng.name} 在適用清單內`});
    else { R.push({k:'r', t:`引擎 ${eng.name} 不在適用清單（僅適用 ${f.eng.join(' / ')}）`}); bump('r'); }
  }
  /* --- 車型適用 --- */
  if(f.mdl && f.mdl.length){
    const nm = mdl ? mdl.name : '';
    if(f.mdl.some(k=>nm.includes(k))) R.push({k:'g', t:`車型 ${nm} 在適用清單內`});
    else { R.push({k:'r', t:`車型 ${nm} 不在適用清單（僅適用 ${f.mdl.join(' / ')}）`}); bump('r'); }
  }
  /* --- 年份 --- */
  if(f.yr && f.yr.length===2){
    if(c.year>=f.yr[0] && c.year<=f.yr[1]) R.push({k:'g', t:`年份 ${c.year} 在適用區間 ${f.yr[0]}–${f.yr[1]}`});
    else { R.push({k:'r', t:`年份 ${c.year} 超出適用區間 ${f.yr[0]}–${f.yr[1]}`}); bump('r'); }
  }
  /* --- 車身 --- */
  if(f.body && f.body.length){
    if(c.bodyId && f.body.includes(c.bodyId)) R.push({k:'g', t:`車身型式 ${body?body.name:''} 適用`});
    else if(!c.bodyId){ R.push({k:'n', t:'車輛未設定車身型式'}); lv='n'; }
    else { R.push({k:'r', t:`車身型式 ${body?body.name:''} 不適用（僅 ${f.body.map(b=>bodyById(b)?.name).join(' / ')}）`}); bump('r'); }
  }
  /* --- 硬性覆寫等級 --- */
  if(p.grade==='r'){ bump('r'); }
  if(p.grade==='y'){ bump('y'); }

  /* --- 前置需求 --- */
  (p.req||[]).forEach(q=>{ R.push({k:'y', t:'需要：'+q}); bump('y'); });

  /* --- 法規紅旗 --- */
  const legal = (p.impact && p.impact.legal) || [];
  legal.forEach(l=>{
    if(l.startsWith('❌')){ R.push({k:'r', t:'法規：'+l.replace(/^❌\s*/,'')}); bump('r'); }
    else if(l.startsWith('⚠')){ R.push({k:'y', t:'法規：'+l.replace(/^⚠\s*/,'')}); bump('y'); }
    else R.push({k:'i', t:'法規：'+l});
  });

  /* --- 冷卻系統前置條件（動力改裝） --- */
  if(['engine','intake','exhaust'].includes(p.cat) && (p.hp && p.hp[1]>=40)){
    const done = (c.parts||[]).includes('c-cooling');
    if(!done){ R.push({k:'y', t:'建議先完成冷卻系統全套翻新 — E36 塑膠件老化，動力提升後過熱風險大幅上升'}); bump('y'); }
    else R.push({k:'g', t:'✓ 你的車庫已標記完成冷卻系統翻新'});
  }
  /* --- 硬懸吊 → 後副樑 --- */
  if(p.cat==='susp' && (p.drop||0)>=35){
    const done = (c.parts||[]).includes('c-subframe');
    if(!done){ R.push({k:'y', t:'⚠ 安裝前請先檢查後副樑四個鎖點是否龜裂 — 硬懸吊會加速此處疲勞，Coupe/Cabrio/M3 風險最高'}); bump('y'); }
    else R.push({k:'g', t:'✓ 你的車庫已標記完成後副樑加強'});
  }
  /* --- 資料可信度 --- */
  if(p.conf==='unverified'){ R.push({k:'n', t:'此零件的適用性資料尚未驗證，請向店家或原廠確認'}); if(lv==='g') lv='n'; }

  if(!R.length) R.push({k:'g', t:'未發現年份／引擎／車身的適用性限制'});
  return {lv, R};
}

/* ---------- 輪圈相容性（獨立計算，因為要算幾何） ---------- */
function wheelCheck(c, mod){
  // mod: {size, width, et, tireW, tireAR}
  const R = [];
  const base = {width:+(c.wheelW||7), et:+(c.wheelET||47), tire:c.tire||'205/60R15'};
  const m = {width:+mod.width, et:+mod.et, tire:`${mod.tireW}/${mod.tireAR}R${mod.size}`};
  const g = wheelGeom(base, m);

  const H = hubOf(c);
  R.push({k:'g', t:`孔距 ${H.pcd}、中心孔 ${H.bore} mm、螺絲 ${H.bolt} ${H.seat} — ${isE36(c)?'E36':'2G Eclipse'} 全車系一致`});

  // 輪胎實際總寬：會磨葉子板的是輪胎，不是輪圈 J 寬
  const baseT = parseTire(base.tire), modT = parseTire(m.tire);
  if(baseT && modT){
    const baseEdge = baseT.w ? (tireOverallWidth(baseT.w, base.width)/2 - base.et) : null;
    const modEdge  = tireOverallWidth(modT.w, m.width)/2 - m.et;
    if(baseEdge !== null){
      const tyreDelta = modEdge - baseEdge;
      R.push({k: tyreDelta>22?'r':tyreDelta>10?'y':'g',
        t:`輪胎最外緣較原廠${tyreDelta>=0?'外凸':'內縮'} ${Math.abs(tyreDelta).toFixed(1)} mm`
          +`（輪胎總寬 ${tireOverallWidth(modT.w, m.width).toFixed(0)} mm，含保護肋；`
          +`${m.width}J 上的實際斷面寬 ${tireSectionWidth(modT.w, m.width).toFixed(0)} mm，非標稱 ${modT.w}）`
          +' — 葉子板干涉看的是這個值，不是輪圈 J 寬'});
    }
    const rr = tireRimRange(modT.w, modT.ar);
    if(m.width < rr[0] || m.width > rr[1])
      R.push({k:'r', t:`${modT.w}/${modT.ar} 的 ETRTO 允許輪圈寬約 ${rr[0]}J–${rr[1]}J，目前 ${m.width}J 超出範圍 — 這個組合實務上不成立`});
  }

  // 外緣（輪圈 J 寬基準，業界適配慣用值）
  if(g.outerDelta > 22) R.push({k:'r', t:`外緣較原廠外凸 ${g.outerDelta.toFixed(1)} mm — 幾乎確定磨葉子板，需壓平＋負外傾，且台灣規定輪胎不得超出車身`});
  else if(g.outerDelta > 10) R.push({k:'y', t:`外緣較原廠外凸 ${g.outerDelta.toFixed(1)} mm — 建議壓平葉子板並加負外傾`});
  else if(g.outerDelta > 0) R.push({k:'g', t:`外緣較原廠外凸 ${g.outerDelta.toFixed(1)} mm — 一般在可接受範圍`});
  else R.push({k:'g', t:`外緣較原廠內縮 ${Math.abs(g.outerDelta).toFixed(1)} mm`});

  // 內緣
  if(g.innerDelta > 12) R.push({k:'r', t:`內緣較原廠往內 ${g.innerDelta.toFixed(1)} mm — 高風險干涉避震筒身／彈簧座（社外避震如 KW 筒身更粗）`});
  else if(g.innerDelta > 5) R.push({k:'y', t:`內緣較原廠往內 ${g.innerDelta.toFixed(1)} mm — 需確認避震筒身間隙，可能要加墊片往外推`});
  else R.push({k:'g', t:`內緣間隙較原廠寬鬆 ${Math.abs(g.innerDelta).toFixed(1)} mm`});

  // 外徑 / 速度表 / 法規
  const pct = g.odPct;
  const s = pct>=0?'+':'';
  if(Math.abs(pct) > TIRE_OD_LIMIT_PCT)
    R.push({k:'r', t:`輪胎外徑 ${s}${pct.toFixed(2)}%（${g.modOD.toFixed(0)} mm vs 原廠 ${g.baseOD.toFixed(0)} mm）— 超出台灣 2% 誤差門檻`});
  else if(Math.abs(pct) > 1.5)
    R.push({k:'y', t:`輪胎外徑 ${s}${pct.toFixed(2)}% — 逼近台灣 2% 誤差上限`});
  else
    R.push({k:'g', t:`輪胎外徑 ${s}${pct.toFixed(2)}%（${g.modOD.toFixed(0)} mm vs 原廠 ${g.baseOD.toFixed(0)} mm）— 在 2% 門檻內`});

  const sp = g.speedoErrPct;
  R.push({k:'i', t:`速度表誤差：實際時速 100 km/h 時，表速約 ${(100*(1+sp/100)).toFixed(1)} km/h（${sp>=0?'表速偏高':'表速偏低'} ${Math.abs(sp).toFixed(2)}%）`});
  R.push({k:'i', t:`單軸輪距變化 ${g.trackDelta>=0?'+':''}${g.trackDelta.toFixed(1)} mm`});

  // 卡鉗空間
  if(mod.size<=15) R.push({k:'y', t:'15 吋輪圈與多數大盤／大卡鉗升級不相容（M3 315mm 前碟原廠即配 17 吋）'});
  else if(mod.size===16) R.push({k:'i', t:'16 吋可容納 E36 M3 315mm 前碟（實務普遍說法，未取得原廠最小尺寸文件），但無法容納 325mm 以上大盤套件'});
  else R.push({k:'g', t:`${mod.size} 吋對煞車升級的空間充裕（Turner 6 活塞 325mm 套件明訂需 17 吋以上）`});

  const lv = R.some(x=>x.k==='r') ? 'r' : R.some(x=>x.k==='y') ? 'y' : 'g';
  return {lv, R, g};
}

/* ---------- 方案彙總（重量、馬力、車高、成本） ---------- */
function planSummary(ids, c){
  const ps = ids.map(id=>PARTS.find(p=>p.id===id)).filter(Boolean);
  const sum = {n:ps.length, partLo:0, partHi:0, laborLo:0, laborHi:0,
               hpLo:0, hpHi:0, kgLo:0, kgHi:0, drop:0,
               green:0, yellow:0, red:0, gray:0, legal:[], warns:[]};
  ps.forEach(p=>{
    sum.partLo += p.price?.[0]||0; sum.partHi += p.price?.[1]||0;
    sum.laborLo += p.labor?.[0]||0; sum.laborHi += p.labor?.[1]||0;
    if(p.hp){ sum.hpLo += p.hp[0]; sum.hpHi += p.hp[1]; }
    if(p.kg){ sum.kgLo += p.kg[0]; sum.kgHi += p.kg[1]; }
    if(p.drop) sum.drop = Math.max(sum.drop, p.drop);
    const r = compat(p, c);
    sum[{g:'green',y:'yellow',r:'red',n:'gray'}[r.lv]]++;
    (p.impact?.legal||[]).forEach(l=>{ if(l.startsWith('❌')||l.startsWith('⚠')) sum.legal.push(p.name+'：'+l.replace(/^[❌⚠]\s*/,'')); });
    if(p.warn) sum.warns.push(p.name+'：'+p.warn);
  });
  sum.totLo = sum.partLo+sum.laborLo; sum.totHi = sum.partHi+sum.laborHi;
  // 驗車風險
  sum.risk = sum.red>0 ? '高' : sum.legal.length>2 ? '中高' : sum.legal.length>0 ? '中' : '低';
  return sum;
}

/* ---------- 綜合影響分析 ---------- */
const IMPACT_KEYS = [
  {k:'look',    n:'外觀影響',   ic:'eye'},
  {k:'perf',    n:'性能影響',   ic:'gauge'},
  {k:'comfort', n:'舒適性影響', ic:'sofa'},
  {k:'safety',  n:'安全影響',   ic:'shield'},
  {k:'dura',    n:'耐用度影響', ic:'clock'},
  {k:'legal',   n:'法規與驗車', ic:'scale'},
];
function mergeImpact(ids){
  const out = {}; IMPACT_KEYS.forEach(x=>out[x.k]=[]);
  ids.forEach(id=>{
    const p = PARTS.find(q=>q.id===id); if(!p||!p.impact) return;
    IMPACT_KEYS.forEach(x=>(p.impact[x.k]||[]).forEach(t=>out[x.k].push({p:p.name, t})));
  });
  return out;
}

/* 降低車身的通用影響（不綁特定零件） */
const DROP_IMPACT = [
  {k:'look',    t:'輪拱間隙縮小，視覺重心降低'},
  {k:'perf',    t:'重心降低，側傾與重心轉移減少'},
  {k:'comfort', t:'避震行程縮短，路感變硬；過大坑洞容易觸底'},
  {k:'safety',  t:'底盤離地高度降低 — 進出地下室、減速丘、停車場斜坡容易磨底'},
  {k:'safety',  t:'降低幅度過大時可能產生 bump steer（過坎時方向盤自己動）'},
  {k:'dura',    t:'四輪定位數據改變，未修正會造成輪胎內側偏磨'},
  {k:'dura',    t:'⚠ 增加後副樑鎖點的疲勞應力 — E36 已知弱點'},
  {k:'legal',   t:'避震器變更需統一發票 ＋ 檢驗合格後登記；變更後不得超過原核定車身高度'},
  {k:'legal',   t:'降低後排氣管最低點需離地 ≥10 公分'},
];
