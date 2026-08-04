/* ==========================================================================
   加油：中油油價 + 加滿試算
   油價存在 UI 偏好鍵（e36garage.ui），不動車輛資料格式。
   油箱容量存在車輛物件的 tank 欄位（新增欄位，舊備份沒有就用預設值）。
   ========================================================================== */
const p1 = n => (n==null||isNaN(n)) ? '—' : (Math.round(n*10)/10).toFixed(1);

/* 目前採用的油價：使用者更新過就用更新的，否則用內建快照 */
function fuelNow(){
  const u = UI.fuel;
  if(u && Array.isArray(u.list) && u.list.length) return u;
  return FUEL_SNAP;
}
function fuelPrice(k){ return (fuelNow().list.find(x=>x.k===k)||{}).p ?? null; }
function tankOf(c){ return +c.tank || TANK_DEF[c.bodyId] || 65; }

/* 油價新舊程度：中油每週一調價，超過 8 天就提醒可能過期 */
function fuelAge(){
  const f = fuelNow();
  const d = Math.floor((new Date(today()+'T00:00:00') - new Date(f.eff+'T00:00:00'))/86400000);
  return isNaN(d) ? null : d;
}

function pgFuel(){
  const c = car(); if(!c) return needCar();
  const f = fuelNow();
  const rec = fuelRec(c);
  const age = fuelAge();
  const tank = tankOf(c);
  const pr = fuelPrice(rec.k);
  const stale = age!=null && age>8;

  return `
  <!-- 今日油價 -->
  <div class="card">
    <div class="mhd" style="margin-bottom:var(--s3)">
      <h3 class="t-card nm">中油參考牌價</h3>
      <span class="st ${stale?'y':'g'}">${f.eff} 起${stale?`（${age} 天前）`:''}</span>
    </div>
    <div class="ftiles">
      ${f.list.map(x=>`<div class="ftile${x.k===rec.k?' on':''}">
        ${x.k===rec.k?'<span class="tag">你的車</span>':''}
        <div class="nm">${esc(x.name.replace('汽油','').replace('超級',''))}</div>
        <div class="pr">${p1(x.p)}<small> 元/L</small></div>
      </div>`).join('')}
    </div>
    ${stale ? `<div class="note y" style="margin-top:var(--s3)">
      <b>這是 ${age} 天前的價格。</b>中油每週一凌晨調價，請按下面的「更新油價」或直接到中油網站確認。</div>` : ''}
    <div class="btnrow" style="margin-top:var(--s3)">
      <button class="btn pri" onclick="updateFuel(this)">更新油價</button>
      <button class="btn" onclick="manualFuel()">手動輸入</button>
      <a class="btn" href="${FUEL_SITE}" target="_blank" rel="noopener">中油網站</a>
    </div>
    <div class="src">來源：<a href="${FUEL_DATA}" target="_blank" rel="noopener">政府資料開放平臺 — 中油主產品牌價</a>
      · 一般自用客戶、中油自營站、含稅 · ${f.from==='live'?`線上更新於 ${esc(f.got)}`:`內建快照，寫入於 ${esc(f.got)}`}
      · 民營加油站與中油促銷價可能不同</div>
  </div>

  <!-- 加滿一次多少錢 -->
  <div class="card">
    <h3 class="t-card">加滿一次</h3>
    <div class="summary" style="grid-template-columns:repeat(3,minmax(0,1fr));margin-top:var(--s3)">
      <div class="it"><div class="lb">油箱容量</div><div class="vl">${tank} <small>L</small></div></div>
      <div class="it"><div class="lb">建議油品</div><div class="vl" style="font-size:20px;padding-top:4px">${esc((f.list.find(x=>x.k===rec.k)||{}).name||'—')}</div></div>
      <div class="it"><div class="lb">加滿約</div><div class="vl" style="color:var(--blue)">${pr?money(tank*pr):'—'}</div></div>
    </div>
    <div style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:var(--s1);margin-top:var(--s3)">
      ${[10,20,30].map(l=>`<div class="note" style="text-align:center;padding:12px 8px">
        <b>${l} L</b><br>${pr?money(l*pr):'—'}</div>`).join('')}
    </div>
    <div class="fld" style="margin:var(--s3) 0 0;max-width:260px">
      <label>油箱容量（公升）— 改成你實際加滿的量會比較準</label>
      <input class="inp" id="f_tank" type="number" min="20" max="120" step="1" value="${tank}"
             onchange="setTank(this.value)">
    </div>
    <div class="note" style="margin-top:var(--s2)">${esc(TANK_NOTE)}</div>
  </div>

  <!-- 建議油品 -->
  <div class="card">
    <div class="mhd"><h3 class="t-card nm">為什麼建議這個油品</h3>${confSt(rec.conf)}</div>
    <p style="margin:var(--s2) 0 0;font-size:15px;line-height:1.65">${esc(rec.why)}</p>
    <div class="note" style="margin-top:var(--s3)">${esc(FUEL_CONF_NOTE)}</div>
  </div>

  <!-- 更新方式說明 -->
  <div class="card">
    <h3 class="t-card">關於「即時」這兩個字</h3>
    <div style="margin-top:var(--s2)">
      <div class="kv"><span>資料來源</span><b>中油 openData（每 7 日更新）</b></div>
      <div class="kv"><span>調價時間</span><b>每週一凌晨零時</b></div>
      <div class="kv"><span>離線開啟時</span><b>顯示內建快照</b></div>
      <div class="kv"><span>更新成功後</span><b>存在瀏覽器，下次開啟沿用</b></div>
    </div>
    <div class="note" style="margin-top:var(--s3)">
      <b>直接用檔案開啟（file://）時，「更新油價」多半會被瀏覽器的跨網域限制擋下來。</b>
      這不是程式壞了，是瀏覽器的安全規則。想抓到當下最新價，用資料夾裡的
      「分享給朋友.command」把這個檔案用本機伺服器開起來，成功率會高很多；
      不然就按「手動輸入」把加油站看到的價格填進去，一樣會存起來。</div>
  </div>`;
}

/* ---- 線上更新 ---- */
async function updateFuel(btn){
  const old = btn.innerHTML;
  btn.disabled = true; btn.innerHTML = '更新中…';
  try{
    const r = await fetch(FUEL_API, {cache:'no-store'});
    if(!r.ok) throw new Error('HTTP '+r.status);
    const j = await r.json();
    const list = [];
    let eff = '';
    (Array.isArray(j)?j:[]).forEach(o=>{
      const nm = String(o['產品名稱']||'').trim();
      const k = FUEL_MAP[nm];
      if(!k || list.some(x=>x.k===k)) return;
      const p = parseFloat(o['參考牌價_金額']);
      if(isNaN(p)) return;
      const src = FUEL_SNAP.list.find(x=>x.k===k) || {};
      list.push({k, name:nm, ron:src.ron ?? 0, p});
      const roc = String(o['牌價生效日期']||'').trim();       // 民國年 1150803
      if(!eff && /^\d{7}$/.test(roc))
        eff = `${+roc.slice(0,3)+1911}-${roc.slice(3,5)}-${roc.slice(5,7)}`;
    });
    if(!list.length) throw new Error('回傳資料裡找不到汽柴油牌價');
    UI.fuel = {eff: eff || today(), got: today(), from:'live', list};
    saveUI(); render(); toast('油價已更新');
  }catch(e){
    btn.disabled = false; btn.innerHTML = old;
    modal({title:'抓不到即時油價', body:`
      <p style="margin:0 0 var(--s2)">錯誤訊息：<code>${esc(e.message||e)}</code></p>
      <div class="note"><b>最常見的原因是瀏覽器的跨網域限制（CORS）。</b>
        用檔案直接開啟這個網頁時，瀏覽器不允許它去抓別的網站的資料。中油的開放資料端點也不一定
        允許網頁端直接存取。</div>
      <div class="note" style="margin-top:var(--s2)"><b>可以這樣做：</b><br>
        1. 用「分享給朋友.command」以本機伺服器開啟，再試一次<br>
        2. 到中油網站看今天的價格，回來按「手動輸入」<br>
        3. 不更新也沒關係，內建快照是 ${esc(FUEL_SNAP.eff)} 的牌價</div>`,
      footer:`<a class="btn" href="${FUEL_SITE}" target="_blank" rel="noopener" style="margin-left:auto">開啟中油網站</a>
        <button class="btn pri" onclick="closeModal();manualFuel()">手動輸入</button>`});
  }
}

/* ---- 手動輸入 ---- */
function manualFuel(){
  const f = fuelNow();
  const v = k => (f.list.find(x=>x.k===k)||{}).p ?? '';
  modal({title:'手動輸入油價', body:`
    <p class="t-cap" style="margin:0 0 var(--s2)">填加油站看板上的每公升價格，空白就沿用原本的。</p>
    <div class="grid g2">
      ${FUEL_SNAP.list.map(x=>`<div class="fld"><label>${esc(x.name)}</label>
        <input class="inp fmp" data-k="${x.k}" type="number" step="0.1" min="0" max="200" value="${v(x.k)}"></div>`).join('')}
    </div>
    <div class="fld"><label>牌價日期</label><input class="inp" id="f_eff" type="date" value="${esc(f.eff)}"></div>`,
    footer:`<button class="btn dgr" onclick="resetFuel()">還原成內建快照</button>
      <button class="btn" style="margin-left:auto" onclick="closeModal()">取消</button>
      <button class="btn pri" onclick="saveManualFuel()">儲存</button>`});
}
function saveManualFuel(){
  const list = $$('.fmp').map(el=>{
    const k = el.dataset.k, p = parseFloat(el.value);
    const base = FUEL_SNAP.list.find(x=>x.k===k);
    return isNaN(p) ? null : {k, name:base.name, ron:base.ron, p};
  }).filter(Boolean);
  if(!list.length) return toast('至少要填一個價格');
  UI.fuel = {eff: $('#f_eff').value || today(), got: today(), from:'manual', list};
  saveUI(); closeModal(); render(); toast('已儲存油價');
}
function resetFuel(){ delete UI.fuel; saveUI(); closeModal(); render(); toast('已還原成內建快照'); }

/* ---- 油箱容量 ---- */
function setTank(v){
  const c = car(); if(!c) return;
  const n = Math.max(20, Math.min(120, +v||0));
  c.tank = n; saveDB(); render(); toast('油箱容量已更新');
}

/* ---- 總覽用的一行摘要 ---- */
function fuelLine(c){
  const rec = fuelRec(c), p = fuelPrice(rec.k), f = fuelNow();
  if(!p) return '';
  const nm = (f.list.find(x=>x.k===rec.k)||{}).name || '';
  return `<button class="btn txt sm" onclick="nav('mycar/fuel')" style="margin-left:auto;padding-left:0">
    ${esc(nm.replace('汽油',''))} ${p1(p)} 元/L · 加滿約 ${money(tankOf(c)*p)} ›</button>`;
}
