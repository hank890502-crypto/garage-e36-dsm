/* ==========================================================================
   總覽 / 我的車
   ========================================================================== */
function pgOverview(){
  const c = car();
  if(!c) return needCar();
  const ms = maintStatus(c);
  const urgent = ms.filter(m=>m.st==='over' || m.st==='due')
                   .sort((a,b)=>(b.pct||0)-(a.pct||0));
  const noRec  = ms.filter(m=>m.st==='none');
  const proj = c.project||[];
  const done = proj.filter(p=>p.st==='done').length;
  const spent = proj.reduce((s,p)=>s+(+p.paid||0),0);
  const est   = proj.reduce((s,p)=>s+(+p.est||0),0);
  const lastLog = (c.logs||[]).slice().sort((a,b)=>(b.date||'').localeCompare(a.date||''))[0];
  const health = urgent.some(m=>m.st==='over') ? ['r','需要處理 '+urgent.filter(m=>m.st==='over').length+' 項']
               : urgent.length ? ['y','即將到期 '+urgent.length+' 項'] : ['g','目前正常'];

  return `
  <!-- 車輛主視覺：畫面的主角 -->
  <div class="card stack-l" style="padding:0;overflow:hidden">
    ${heroArt(c,'ov')}
    <div style="padding:var(--s3);margin-top:0">
      <h3 class="t-sec">${esc(carLabel(c))}</h3>
      <p class="t-cap" style="margin:6px 0 0">${esc(carSubtitle())}</p>
      <div class="summary" style="margin-top:var(--s3)">
        <div class="it"><div class="lb">目前里程</div><div class="vl">${nf(c.km)} <small>km</small></div></div>
        <div class="it"><div class="lb">車況</div><div class="vl" style="font-size:17px;padding-top:5px">
          <span class="st ${health[0]}">${health[1]}</span></div></div>
        <div class="it"><div class="lb">改裝進度</div><div class="vl">${proj.length?Math.round(done/proj.length*100):0}<small>%</small></div></div>
        <div class="it"><div class="lb">已投入</div><div class="vl">${money(spent).replace('NT$','')} <small>元</small></div></div>
      </div>
      <div class="btnrow" style="margin-top:var(--s3)">
        <button class="btn" onclick="nav('mycar/info')">查看車輛</button>
        <button class="btn" onclick="nav('build/design')">改裝設計</button>
        ${fuelLine(c)}
      </div>
    </div>
  </div>

  <!-- 現在需要處理的事情：最多三項 -->
  <div class="card">
    <h3 class="t-card">現在需要處理</h3>
    ${urgent.length ? `<div class="rows" style="margin-top:var(--s2)">
      ${urgent.slice(0,3).map(m=>maintBlock(m,c,false)).join('')}
    </div>` : `<p class="t-cap" style="margin:var(--s2) 0 0">沒有到期或逾期的項目。</p>`}
    ${noRec.length ? `<details class="dd" style="margin-top:var(--s2);border-top:1px solid var(--line)">
      <summary class="mut">另外 ${noRec.length} 個項目尚未建立紀錄</summary>
      <div class="in"><div class="rows">${noRec.map(m=>`<div class="row">
        <div class="gr" style="font-size:14px">${esc(m.name)}</div>
        <span class="t-cap">建議每 ${m.km?nf(m.km)+' km':''}${m.km&&m.mo?' 或 ':''}${m.mo?m.mo+' 個月':''}</span>
      </div>`).join('')}</div>
      <p class="t-cap" style="margin-top:var(--s2)">建立第一筆紀錄後，系統就會依里程與時間自動推算下次到期。</p></div>
    </details>` : ''}
  </div>

  <!-- 目前改裝專案 -->
  <div class="card">
    <h3 class="t-card">改裝專案</h3>
    ${proj.length ? (()=>{
      const nextItem = proj.find(p=>p.st!=='done' && p.st!=='removed' && p.st!=='sold');
      const pt = nextItem && PARTS.find(x=>x.id===nextItem.pid);
      return `
      <div class="summary" style="margin-top:var(--s2);grid-template-columns:repeat(3,minmax(0,1fr))">
        <div class="it"><div class="lb">項目</div><div class="vl">${done}<small> / ${proj.length}</small></div></div>
        <div class="it"><div class="lb">預算使用</div><div class="vl">${est?Math.round(spent/est*100):0}<small>%</small></div></div>
        <div class="it"><div class="lb">尚需支付</div><div class="vl" style="font-size:20px">${money(Math.max(0,est-spent))}</div></div>
      </div>
      ${nextItem?`<div class="note" style="margin-top:var(--s3)">
        <b>下一步：</b>${esc(pt?pt.name:nextItem.name||'—')} — ${esc(PROJ_ST.find(s=>s.id===nextItem.st)?.n||'')}</div>`:''}
      <div class="btnrow" style="margin-top:var(--s3)">
        <button class="btn txt" onclick="nav('build/project')">查看專案 →</button></div>`;
    })() : `<p class="t-cap" style="margin:var(--s2) 0 var(--s3)">還沒有改裝專案。在設計預覽選好零件後可以直接轉成施工專案。</p>
      <button class="btn" onclick="nav('build/design')">開始規劃</button>`}
  </div>`;
}

/* 車輛主視覺。有對應素材就直接算圖，沒有才退回文字卡（不拿別台車的圖硬湊） */
function heroArt(c, uid){
  if(c.bodyId && BODY_META[c.bodyId]) return `<div class="stage crop">${carPhoto(c.build,{bodyId:c.bodyId,uid})}</div>`;
  const m = mdlById(c.modelId), b = bodyById(c.bodyId), e = carEngine(c);
  return `<div class="stage" style="aspect-ratio:1000/352;display:flex;flex-direction:column;
      align-items:center;justify-content:center;gap:6px;text-align:center;padding:var(--s3)">
    <div style="font-size:13px;letter-spacing:.14em;color:var(--tx3)">${esc(platName(platOf(c)))}</div>
    <div style="font-size:26px;font-weight:600;letter-spacing:-.02em">${esc(m?m.name:'—')}${m&&m.drive?` <span style="color:var(--tx2);font-size:18px">${m.drive}</span>`:''}</div>
    <div class="t-cap">${esc([c.year, b&&b.name, e&&e.name].filter(Boolean).join(' · '))}</div>
    <div class="t-cap" style="color:var(--orange)">${c.bodyId?'這個車身型式還沒有合成素材':'還沒有選車身型式，選了才畫得出車'}</div>
    ${!c.bodyId?`<button class="btn sm" style="margin-top:8px" onclick="editCar('${c.id}')">去選車身型式</button>`:''}
  </div>`;
}

function dueText(m, c){
  const bits = [];
  if(m.last) bits.push(`上次 ${m.last.date||'—'}${m.last.km?`（${nf(m.last.km)} km）`:''}`);
  if(m.dueKm) bits.push(`建議 ${nf(m.dueKm)} km${c && m.dueKm>c.km?`，還有 ${nf(m.dueKm-c.km)} km`:'，已超過'}`);
  if(m.dueMo) bits.push(`或 ${m.dueMo}`);
  return bits.join(' · ');
}

/* ---------------- 保養剩餘量：進度條＋剩餘里程／時間 ---------------- */
const MTONE = {over:'r', due:'y', ok:'g', none:'n'};

function dayText(d){
  d = Math.abs(d);
  if(d >= 60)  return `${Math.round(d/30.44)} 個月`;
  if(d >= 14)  return `${Math.round(d/7)} 週`;
  return `${d} 天`;
}
function cycleText(m){
  return [m.km?nf(m.km)+' km':'', m.mo?m.mo+' 個月':''].filter(Boolean).join(' 或 ');
}
/* 「還可以跑多久」——里程與時間分開講，哪個先到就先列 */
function remainText(m){
  if(!m.last) return '';
  const km = m.remKm==null ? null
    : m.remKm >= 0 ? `還可跑 ${nf(m.remKm)} km` : `里程已超過 ${nf(-m.remKm)} km`;
  const mo = m.remDay==null ? null
    : m.remDay >= 0 ? `還有 ${dayText(m.remDay)}` : `時間已超過 ${dayText(m.remDay)}`;
  const arr = m.by==='km' ? [km,mo] : [mo,km];
  return arr.filter(Boolean).join(' · ') || '沒有可推算的週期';
}
/* 進度條長度＝剩餘比例：滿格代表剛做完，見底代表該換了 */
function maintBlock(m, c, detail){
  const tone = MTONE[m.st] || 'n';
  const w = m.last ? m.left : 0;
  return `<div style="width:100%">
    <div class="mhd">
      <span class="nm">${esc(m.name)}</span>
      ${!m.last ? `<span class="pc mut">尚無紀錄</span>`
        : m.st==='over' ? `<span class="pc" style="color:var(--red)"><b style="color:var(--red)">已逾期</b></span>`
        : `<span class="pc"${m.st==='due'?' style="color:var(--orange)"':''}>剩餘 <b${m.st==='due'?' style="color:var(--orange)"':''}>${m.left}%</b></span>`}
    </div>
    <div class="bar ${tone}"><i style="width:${w}%"></i></div>
    <div class="t-cap" style="margin-top:8px">
      ${m.last ? esc(remainText(m)) : `建議每 ${esc(cycleText(m))}，建立第一筆紀錄後開始推算`}
    </div>
    ${detail && m.last ? `<div class="t-cap">上次 ${esc(m.last.date||'—')}${m.last.km?`（${nf(m.last.km)} km）`:''} · 週期 ${esc(cycleText(m))}</div>` : ''}
    ${detail && !m.last && m.note ? `<div class="t-cap">${esc(m.note)}</div>` : ''}
  </div>`;
}

/* ---------------- 我的車 ---------------- */
function pgCarInfo(){
  const c = car(); if(!c) return needCar();
  const m = mdlById(c.modelId), b = bodyById(c.bodyId), e = carEngine(c);
  return `
  <div class="card" style="padding:0;overflow:hidden">
    ${heroArt(c,'mc')}
  </div>
  <div class="card">
    <h3 class="t-card">基本資料</h3>
    <div style="margin-top:var(--s1)">
      <div class="kv"><span>車型</span><b>${esc(m?m.name:'—')}</b></div>
      <div class="kv"><span>車身型式</span><b>${esc(b?`${b.code} ${b.name}`:'—')}</b></div>
      <div class="kv"><span>年份</span><b>${c.year||'—'}</b></div>
      <div class="kv"><span>市場版本</span><b>${esc(c.mkt||'—')}</b></div>
      <div class="kv"><span>變速箱</span><b>${esc(c.trans||'—')}</b></div>
      <div class="kv"><span>車身顏色</span><b>${esc(c.color||'—')}</b></div>
      <div class="kv"><span>車牌</span><b>${esc(c.plate||'—')}</b></div>
      <div class="kv"><span>VIN</span><b class="num">${esc(c.vin||'—')}</b></div>
      <div class="kv"><span>目前里程</span><b>${nf(c.km)} km</b></div>
      <div class="kv"><span>目前輪圈胎</span><b>${c.wheelW}J ET${c.wheelET} · ${esc(c.tire)}</b></div>
    </div>
    ${c.notes?`<div class="note" style="margin-top:var(--s3)">${esc(c.notes)}</div>`:''}
  </div>
  ${DB.cars.length>1?`<div class="card">
    <h3 class="t-card">其他車輛</h3>
    <div class="rows" style="margin-top:var(--s1)">
      ${DB.cars.filter(x=>x.id!==c.id).map(x=>`<div class="row">
        <div class="gr"><div style="font-weight:500">${esc(carLabel(x))}</div>
          <div class="t-cap">${nf(x.km)} km</div></div>
        <button class="btn sm" onclick="DB.cur='${x.id}';saveDB();render()">切換</button>
      </div>`).join('')}
    </div></div>`:''}
  <div class="card">
    <div class="btnrow"><button class="btn" onclick="editCar()">新增另一台車</button>
      <button class="btn dgr" style="margin-left:auto" onclick="delCar('${c.id}')">刪除這台車</button></div>
  </div>`;
}

function pgCarSpec(){
  const c = car(); if(!c) return needCar();
  const e = carEngine(c), b = bodyById(c.bodyId), t = TRANS.find(x=>x.name===c.trans);
  if(!e) return `<div class="card"><div class="empty">${ic('gauge',40)}
    <p>這台車還沒設定車型與引擎</p><button class="btn pri" onclick="editCar(DB.cur)">編輯車輛</button></div></div>`;
  return `
  <div class="card">
    <h3 class="t-card">引擎</h3>
    <div style="margin-top:var(--s1)">
      <div class="kv"><span>代號</span><b>${esc(e.name)}</b></div>
      <div class="kv"><span>排氣量</span><b>${e.disp} cc</b></div>
      <div class="kv"><span>汽缸 / 汽門</span><b>${e.cyl} 缸 · ${e.valves} 汽門 · ${esc(e.cam)}</b></div>
      <div class="kv"><span>最大馬力</span><b>${e.ps} ps</b></div>
      <div class="kv"><span>最大扭力</span><b>${e.nm} Nm</b></div>
      <div class="kv"><span>可變汽門</span><b>${esc(e.vanos)}</b></div>
      <div class="kv"><span>缸體</span><b style="max-width:60%">${esc(e.block)}</b></div>
      <div class="kv"><span>正時</span><b>${esc(e.timing)}</b></div>
      <div class="kv"><span>生產年份</span><b>${e.yr[0]}–${e.yr[1]}</b></div>
    </div>
    ${e.warn?`<div class="note y" style="margin-top:var(--s3)">${esc(e.warn)}</div>`:''}
    ${srcLine(e.src)}
  </div>
  ${b?`<div class="card">
    <h3 class="t-card">車身</h3>
    <div style="margin-top:var(--s1)">
      <div class="kv"><span>代號</span><b>${esc(b.code)}</b></div>
      <div class="kv"><span>長 × 寬 × 高</span><b>${b.L} × ${b.W} × ${b.H} mm</b></div>
      <div class="kv"><span>軸距</span><b>${b.wb} mm</b></div>
      <div class="kv"><span>車重範圍</span><b>${b.kg[0]}–${b.kg[1]} kg</b></div>
      <div class="kv"><span>生產年份</span><b>${b.yr[0]}–${b.yr[1]}</b></div>
    </div>
    ${b.warn?`<div class="note y" style="margin-top:var(--s3)">${esc(b.warn)}</div>`:''}
  </div>`:''}
  <div class="card">
    <h3 class="t-card">輪轂規格</h3>
    <p class="t-cap" style="margin:6px 0 0">${isE36(c)?'E36 全車系一致，沒有例外。':'2G Eclipse 全車系一致（含鋼圈、鋁圈與備胎）。'}</p>
    ${(()=>{ const H = hubOf(c); return `<div style="margin-top:var(--s2)">
      <div class="kv"><span>孔距 PCD</span><b>${H.pcd}</b></div>
      <div class="kv"><span>中心孔</span><b>${H.bore} mm</b></div>
      <div class="kv"><span>螺絲</span><b>${H.bolt} · ${H.seat}</b></div>
      ${H.boltLen?`<div class="kv"><span>原廠螺絲長度</span><b>${H.boltLen} mm</b></div>`:''}
      ${H.et?`<div class="kv"><span>原廠 offset</span><b>ET${H.et}</b></div>`:''}
      <div class="kv"><span>鎖付扭力</span><b>${esc(H.torque||'100 N·m')}</b></div>
    </div>`; })()}
    ${isE36(c)
      ? `<div class="note b" style="margin-top:var(--s3)"><b>${esc(HUB_MYTH.claim)}是錯的。</b>${esc(HUB_MYTH.truth)} ${esc(HUB_MYTH.why)}</div>${srcLine('apex_bolt')}`
      : `<div class="note b" style="margin-top:var(--s3)"><b>${esc(ECL_HUB.note)}</b></div>
         <h4 class="t-card" style="margin-top:var(--s3)">原廠輪圈與胎</h4>
         <div style="margin-top:var(--s1)">${ECL_OEM_WHEEL.map(w=>
           `<div class="kv"><span>${esc(w.trim)}</span><b>${esc(w.wheel)} ET${w.et} · ${esc(w.tire)}</b></div>`).join('')}</div>
         <div class="src">來源：${esc(ECL_SRC.fsm_whl[0])}</div>`}
  </div>
  ${t?`<div class="card"><h3 class="t-card">變速箱</h3>
    <div style="margin-top:var(--s1)">
      <div class="kv"><span>型號</span><b>${esc(t.name)}</b></div>
      <div class="kv"><span>型式</span><b>${esc(t.type)} · ${t.gears} 速</b></div>
      ${t.nm?`<div class="kv"><span>可承受扭力</span><b>${t.nm} Nm</b></div>`:''}
    </div>
    ${t.note?`<div class="note" style="margin-top:var(--s3)">${esc(t.note)}</div>`:''}
    ${srcLine(t.src)}</div>`:''}`;
}

function pgCarParts(){
  const c = car(); if(!c) return needCar();
  const owned = (c.parts||[]).map(id=>PARTS.find(p=>p.id===id)).filter(Boolean);
  return `
  <div class="card">
    <h3 class="t-card">已安裝零件</h3>
    <p class="t-cap" style="margin:6px 0 0">標記後，相容性判斷會把這些零件當成前置條件（例如已完成冷卻系統翻新，動力改裝就不再重複提醒）。</p>
    ${owned.length ? `<div class="rows" style="margin-top:var(--s2)">
      ${owned.map(p=>`<div class="row">
        <div class="gr"><div style="font-weight:500">${esc(p.name)}</div>
          <div class="t-cap">${esc(p.brand)}${p.pn?' · '+esc(p.pn):''}</div></div>
        <button class="btn txt" onclick="toggleOwn('${p.id}')">移除</button>
      </div>`).join('')}</div>`
      : `<div class="empty" style="padding:var(--s4) 0">${ic('box',40)}
          <p>還沒標記任何已安裝零件</p>
          <button class="btn" onclick="nav('build/catalog')">前往零件庫</button></div>`}
  </div>
  ${owned.length?`<div class="card">
    <h3 class="t-card">快速標記</h3>
    <p class="t-cap" style="margin:6px 0 var(--s2)">E36 常見的前置工程</p>
    ${quickOwn(c)}</div>`:`<div class="card"><h3 class="t-card">快速標記</h3>
    <p class="t-cap" style="margin:6px 0 var(--s2)">E36 常見的前置工程</p>${quickOwn(c)}</div>`}`;
}
function quickOwn(c){
  const ids = ['c-cooling','c-subframe','c-rtab','c-fcab','c-rsm','c-vanos','d-giubo'];
  return `<div>${ids.map(id=>{const p=PARTS.find(x=>x.id===id); if(!p) return '';
    const on=(c.parts||[]).includes(id);
    return `<label class="chk"><input type="checkbox" ${on?'checked':''} onchange="toggleOwn('${id}')">
      <span>${esc(p.name)}</span></label>`;}).join('')}</div>`;
}

function pgHistory(){
  const c = car(); if(!c) return needCar();
  const logs = (c.logs||[]).slice().sort((a,b)=>(b.date||'').localeCompare(a.date||''));
  const total = logs.reduce((s,l)=>s+(+l.cost||0)+(+l.labor||0),0);
  if(!logs.length) return `<div class="card"><div class="empty">${ic('clock',44)}
    <p>還沒有保養紀錄<br><span class="t-cap">建立第一筆後，保養提醒就會開始依里程與時間推算</span></p>
    <button class="btn pri" onclick="editLog()">${ic('plus',18)} 新增保養紀錄</button></div></div>`;
  return `
  <div class="card">
    <div class="summary" style="grid-template-columns:repeat(3,minmax(0,1fr))">
      <div class="it"><div class="lb">紀錄筆數</div><div class="vl">${logs.length}</div></div>
      <div class="it"><div class="lb">累計支出</div><div class="vl" style="font-size:22px">${money(total)}</div></div>
      <div class="it"><div class="lb">最近一次</div><div class="vl" style="font-size:18px;padding-top:4px">${esc(logs[0].date||'—')}</div></div>
    </div>
  </div>
  <div class="card">
    <h3 class="t-card">維修履歷</h3>
    <div class="rows" style="margin-top:var(--s2)">
      ${logs.map(l=>`<div class="row" style="align-items:flex-start">
        <div class="gr">
          <div style="display:flex;gap:10px;align-items:baseline;flex-wrap:wrap">
            <b style="font-weight:500">${esc(l.title||'保養')}</b>
            <span class="t-cap">${esc(l.date||'')}${l.km?` · ${nf(l.km)} km`:''}</span>
          </div>
          ${(l.items||[]).length?`<div class="t-cap" style="margin-top:2px">${
            (l.items||[]).map(id=>esc(ALL_MAINT().find(m=>m.id===id)?.name||id)).join('、')}</div>`:''}
          ${l.parts?`<div class="t-cap">${esc(l.parts)}</div>`:''}
          ${l.note?`<div class="t-cap">${esc(l.note)}</div>`:''}
        </div>
        <div class="rt">
          <div class="num" style="font-weight:500">${money((+l.cost||0)+(+l.labor||0))}</div>
          <button class="btn txt" onclick="editLog('${l.id}')">編輯</button>
        </div>
      </div>`).join('')}
    </div>
  </div>`;
}

/* ---------------- 車輛編輯 ---------------- */
function delCar(id){
  const c = DB.cars.find(x=>x.id===id); if(!c) return;
  modal({title:'刪除車輛', body:`<p>確定要刪除 <b>${esc(carLabel(c))}</b> 嗎？<br>
    這台車的改裝方案、保養紀錄與施工專案都會一併刪除，無法復原。</p>
    <div class="note">建議先到「更多 → 資料備份」匯出一份 JSON。</div>`,
    footer:`<button class="btn" onclick="closeModal()">取消</button>
            <button class="btn pri" style="background:var(--red)" onclick="doDelCar('${id}')">刪除</button>`});
}
function doDelCar(id){
  DB.cars = DB.cars.filter(c=>c.id!==id);
  if(DB.cur===id) DB.cur = DB.cars[0]?.id || null;
  saveDB(); closeModal(); nav('overview'); render(); toast('已刪除車輛');
}

/* 依平台產生「車型／車身／年份／變速箱」這一欄，切換平台時只重畫這一塊 */
function carPlatFields(c){
  const P = platOf(c);
  const yr = P==='dsm2g' ? [1995,1999] : [1990,2000];
  const mkts = P==='dsm2g'
    ? ['US 北美','JP 日規（Eclipse / GSR-4）','TW 平行輸入','其他']
    : ['EU 歐規','US 北美','JP 日規','TW 台灣總代理','平行輸入'];
  return `
    <div class="fld"><label>車輛暱稱</label><input class="inp" id="f_name" value="${esc(c.name)}" placeholder="留空會自動用車型組合"></div>
    <div class="fld"><label>車型與引擎</label><select class="inp" id="f_model"><option value="">請選擇</option>
      ${modelsOf(P).map(m=>{const e=engById(m.eng);
        return `<option value="${m.id}" ${c.modelId===m.id?'selected':''}>${esc(m.name)} · ${e?esc(e.name):''}${m.drive?' · '+m.drive:''}（${m.yr[0]}–${m.yr[1]}）</option>`;}).join('')}
    </select></div>
    <div class="fld"><label>車身型式</label><select class="inp" id="f_body"><option value="">請選擇</option>
      ${bodiesOf(P).map(b=>`<option value="${b.id}" ${c.bodyId===b.id?'selected':''}>${esc(b.code)} ${esc(b.name)}</option>`).join('')}</select></div>
    <div class="fld"><label>年份</label><input class="inp" id="f_year" type="number" min="${yr[0]}" max="${yr[1]}" value="${c.year||yr[0]+1}"></div>
    <div class="fld"><label>市場版本</label><select class="inp" id="f_mkt">
      ${mkts.map(m=>`<option ${c.mkt===m?'selected':''}>${esc(m)}</option>`).join('')}</select></div>
    <div class="fld"><label>變速箱</label><select class="inp" id="f_trans"><option value="">請選擇</option>
      ${transOf(P).map(t=>`<option value="${esc(t.name)}" ${c.trans===t.name?'selected':''}>${t.type?esc(t.type)+' · ':''}${esc(t.name)}</option>`).join('')}</select></div>`;
}
function setCarPlat(p){
  const c = window.__editCar; if(!c || c.plat===p) return;
  c.plat = p; c.modelId=''; c.bodyId=''; c.trans='';
  c.year = p==='dsm2g' ? 1997 : 1996;
  if(p==='dsm2g'){ c.wheelW = 6; c.wheelET = 46; c.tire = c.tire||'205/55R16'; }
  PLATFORMS.forEach(x=>{ const b=$('#pl_'+x.id); if(b) b.classList.toggle('on', x.id===p); });
  $('#platFields').innerHTML = carPlatFields(c);
}

function editCar(id){
  const isNew = !id;
  const c = isNew ? blankCar() : structuredClone(DB.cars.find(x=>x.id===id));
  if(!c) return;
  window.__editCar = c;
  const P = platOf(c);
  modal({title: isNew?'建立車輛':'編輯車輛', wide:true, body:`
    <div class="fld"><label>車輛平台</label>
      <div class="seg">${PLATFORMS.map(p=>`<button id="pl_${p.id}" class="${p.id===P?'on':''}"
        onclick="setCarPlat('${p.id}')">${esc(p.name)}</button>`).join('')}</div>
      <div class="hint">換平台會清掉車型與車身選擇，因為兩邊的車型清單不一樣</div></div>
    <div class="grid g2">
      <div id="platFields">${carPlatFields(c)}</div>
      <div>
        <div class="fld"><label>車身顏色</label><input class="inp" id="f_color" value="${esc(c.color)}" placeholder="Alpinweiss III / 300"></div>
        <div class="fld"><label>車牌</label><input class="inp" id="f_plate" value="${esc(c.plate)}"></div>
        <div class="fld"><label>VIN 車身號碼</label><input class="inp" id="f_vin" value="${esc(c.vin)}" placeholder="WBA…">
          <div class="hint">用 VIN 到 RealOEM 可查原廠實際配置，是判斷 OBD 型式最可靠的方法</div></div>
        <div class="fld"><label>目前里程（km）</label><input class="inp" id="f_km" type="number" value="${c.km||0}"></div>
        <div class="grid g2" style="gap:var(--s2)">
          <div class="fld"><label>輪圈寬度 J</label><input class="inp" id="f_ww" type="number" step="0.5" value="${c.wheelW}"></div>
          <div class="fld"><label>輪圈 ET</label><input class="inp" id="f_et" type="number" value="${c.wheelET}"></div>
        </div>
        <div class="fld"><label>目前輪胎規格</label><input class="inp" id="f_tire" value="${esc(c.tire)}" placeholder="205/60R15">
          <div class="hint">這三項是輪圈相容性計算的基準，請填目前實際裝在車上的規格</div></div>
      </div>
    </div>
    <div class="fld"><label>備註</label><textarea class="inp" id="f_notes" placeholder="車況、已做過的工程、購入資訊…">${esc(c.notes)}</textarea></div>`,
    footer:`<button class="btn" onclick="closeModal()">取消</button>
            <button class="btn pri" onclick="saveCar('${c.id}',${isNew})">${isNew?'建立':'儲存'}</button>`});
}
function saveCar(id, isNew){
  const g = s => $('#'+s)?.value ?? '';
  const c = isNew ? blankCar() : DB.cars.find(x=>x.id===id);
  if(isNew) c.id = id;
  Object.assign(c, {
    plat: platOf(window.__editCar),
    name:g('f_name').trim(), modelId:g('f_model'), bodyId:g('f_body'), year:+g('f_year')||1996,
    mkt:g('f_mkt'), trans:g('f_trans'), color:g('f_color'), plate:g('f_plate'),
    vin:g('f_vin').trim().toUpperCase(), km:+g('f_km')||0,
    wheelW:+g('f_ww')||7, wheelET:+g('f_et')||47, tire:g('f_tire')||'205/60R15', notes:g('f_notes'),
  });
  if(isNew){ DB.cars.push(c); DB.cur = c.id; }
  saveDB(); closeModal(); render(); toast(isNew?'已建立車輛':'已儲存');
}
