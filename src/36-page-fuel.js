/* ==========================================================================
   加油：油耗紀錄 + 中油油價 + 加滿試算
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

/* ---- 油耗紀錄：滿油到滿油，中間補油也會納入 ---- */
function fuelLogsOf(c){ return Array.isArray(c?.fuelLogs) ? c.fuelLogs : []; }
function fuelLogsSorted(c, desc=false){
  const a = fuelLogsOf(c).slice().sort((x,y)=>(+x.km||0)-(+y.km||0) || String(x.date||'').localeCompare(String(y.date||'')));
  return desc ? a.reverse() : a;
}
function fuelCycles(c){
  const out = [];
  let anchor = null, liters = 0;
  fuelLogsSorted(c).forEach(log=>{
    const km = +log.km||0, qty = +log.liters||0;
    if(!anchor){ if(log.full && km>0) anchor = log; return; }
    if(km < (+anchor.km||0)) return;
    if(qty>0) liters += qty;
    if(log.full){
      const dist = km-(+anchor.km||0);
      if(dist>0 && liters>0) out.push({from:anchor,to:log,dist,liters,kml:dist/liters,l100:liters/dist*100});
      anchor = log; liters = 0;
    }
  });
  return out;
}
function fuelStats(c){
  const logs = fuelLogsOf(c), cycles = fuelCycles(c), recent = cycles.slice(-5);
  const dist = recent.reduce((s,x)=>s+x.dist,0), liters = recent.reduce((s,x)=>s+x.liters,0);
  return {
    logs, cycles, latest:cycles[cycles.length-1]||null,
    avg:dist>0&&liters>0 ? {kml:dist/liters,l100:liters/dist*100} : null,
    spent:logs.reduce((s,x)=>s+(+x.total||0),0), liters:logs.reduce((s,x)=>s+(+x.liters||0),0),
  };
}
function fuelOverviewCard(c){
  const s = fuelStats(c), recent = fuelLogsSorted(c,true).slice(0,2);
  const reading = s.latest
    ? `<div class="fuel-reading"><b>${p1(s.latest.kml)}</b><span>km/L</span></div>
       <div class="fuel-reading-sub">${p1(s.latest.l100)} L/100 km · ${nf(s.latest.dist)} km</div>`
    : `<div class="fuel-reading"><b>—</b><span>km/L</span></div>
       <div class="fuel-reading-sub">${s.logs.length?'等待下一筆滿油紀錄':'尚無加油紀錄'}</div>`;
  return `<div class="card overview-fuel">
    <div class="overview-card-head">${ic('droplet',20)}<h3 class="t-card">油耗紀錄</h3>
      <button class="btn sm" onclick="editFuelLog()">${ic('plus',16)} 新增</button></div>
    ${reading}
    ${recent.length?`<div class="fuel-mini">${recent.map(x=>`<div class="row">
      <time>${esc(x.date||'—')}</time><span>${p1(x.liters)} L</span>
      <span class="amt">${+x.total?money(x.total):'—'}</span></div>`).join('')}</div>`:''}
    <div class="btnrow" style="margin-top:var(--s2)">
      <button class="btn txt" onclick="showFuelLogs()">全部紀錄${s.logs.length?` · ${s.logs.length}`:''} →</button>
    </div>
  </div>`;
}

function editFuelLog(id){
  const c = car(); if(!c) return;
  const old = id ? fuelLogsOf(c).find(x=>x.id===id) : null;
  const log = old ? structuredClone(old) : {id:uid(),date:today(),km:c.km||0,liters:'',total:'',full:true,note:''};
  modal({title:old?'編輯加油紀錄':'新增加油紀錄', body:`
    <div class="grid g2">
      <div class="fld"><label>加油日期</label><input class="inp" id="fl_date" type="date" value="${esc(log.date||today())}"></div>
      <div class="fld"><label>當時里程（km）</label><input class="inp" id="fl_km" type="number" min="0" step="1" value="${+log.km||0}"></div>
      <div class="fld"><label>加油量（L）</label><input class="inp" id="fl_liters" type="number" min="0.01" step="0.01" inputmode="decimal" value="${esc(log.liters)}" placeholder="42.5"></div>
      <div class="fld"><label>總金額（元）</label><input class="inp" id="fl_total" type="number" min="0" step="1" inputmode="decimal" value="${esc(log.total)}" placeholder="1350"></div>
    </div>
    <label class="chk" style="border:0;padding:8px 0 var(--s2)">
      <input id="fl_full" type="checkbox" ${log.full?'checked':''}>
      <span>這次有加滿</span><span class="rt">用於滿油到滿油計算</span>
    </label>
    <div class="fld"><label>備註</label><textarea class="inp" id="fl_note" placeholder="油品、加油站或行車狀況">${esc(log.note||'')}</textarea></div>`,
    footer:`${old?`<button class="btn dgr" onclick="confirmDeleteFuelLog('${log.id}')">刪除</button>`:''}
      <button class="btn" style="margin-left:auto" onclick="closeModal()">取消</button>
      <button class="btn pri" onclick="saveFuelLog('${log.id}',${old?'false':'true'})">儲存</button>`});
}
function saveFuelLog(id, isNew){
  const c = car(); if(!c) return;
  const date = $('#fl_date').value;
  const km = Math.round(+$('#fl_km').value||0);
  const liters = +$('#fl_liters').value||0;
  const total = +$('#fl_total').value||0;
  if(!date) return toast('請選擇加油日期');
  if(km<=0) return toast('請填當時里程');
  if(liters<=0) return toast('請填加油公升數');
  const log = {id,date,km,liters:Math.round(liters*100)/100,total:Math.max(0,Math.round(total)),
    full:$('#fl_full').checked,note:$('#fl_note').value.trim()};
  if(!Array.isArray(c.fuelLogs)) c.fuelLogs=[];
  if(isNew) c.fuelLogs.push(log);
  else { const i=c.fuelLogs.findIndex(x=>x.id===id); if(i>=0) c.fuelLogs[i]=log; else c.fuelLogs.push(log); }
  if(km>(c.km||0)) c.km=km;
  saveDB(); closeModal(); render();
  const latest = fuelStats(c).latest;
  toast(latest && latest.to.id===id ? `已儲存，本次 ${p1(latest.kml)} km/L` : '已儲存加油紀錄');
}
function showFuelLogs(){
  const c = car(); if(!c) return;
  const s=fuelStats(c), logs=fuelLogsSorted(c,true);
  modal({title:'油耗紀錄', wide:true, body:`
    <div class="fuel-log-summary">
      <div><div class="lb">近 5 次平均</div><div class="vl">${s.avg?p1(s.avg.kml)+' km/L':'—'}</div></div>
      <div><div class="lb">累計加油</div><div class="vl">${p1(s.liters)} L</div></div>
      <div><div class="lb">累計金額</div><div class="vl">${money(s.spent)}</div></div>
    </div>
    ${logs.length?`<div class="fuel-log-list">${logs.map(x=>`<div class="fuel-log-item">
      <div class="when">${esc(x.date||'—')}<br>${nf(x.km)} km</div>
      <div class="main"><b>${p1(x.liters)} L${x.full?' · 已加滿':''}</b>
        <span>${+x.total&&+x.liters?`${p1(x.total/x.liters)} 元/L`:''}${x.note?`${+x.total&&+x.liters?' · ':''}${esc(x.note)}`:''}</span></div>
      <div class="actions"><span class="cost">${+x.total?money(x.total):'—'}</span>
        <button class="btn ico" title="編輯紀錄" aria-label="編輯 ${esc(x.date||'')}加油紀錄" onclick="editFuelLog('${x.id}')">${ic('edit',17)}</button></div>
    </div>`).join('')}</div>`:`<div class="empty" style="padding:var(--s4) 0">${ic('droplet',40)}<p>尚無加油紀錄</p></div>`}`,
    footer:`<button class="btn" onclick="closeModal()">關閉</button><button class="btn pri" onclick="editFuelLog()">${ic('plus',18)} 新增紀錄</button>`});
}
function confirmDeleteFuelLog(id){
  const c=car(), log=fuelLogsOf(c).find(x=>x.id===id); if(!log) return;
  modal({title:'刪除加油紀錄', body:`<p>確定要刪除 <b>${esc(log.date||'—')}</b>、${p1(log.liters)} L 的紀錄嗎？</p>`,
    footer:`<button class="btn" onclick="closeModal()">取消</button><button class="btn pri" style="background:var(--red)" onclick="deleteFuelLog('${id}')">刪除</button>`});
}
function deleteFuelLog(id){
  const c=car(); if(!c) return;
  c.fuelLogs=fuelLogsOf(c).filter(x=>x.id!==id); saveDB(); closeModal(); render(); toast('已刪除加油紀錄');
}

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
  return `<button class="btn txt sm fuel-link" onclick="nav('mycar/fuel')">
    ${esc(nm.replace('汽油',''))} ${p1(p)} 元/L · 加滿約 ${money(tankOf(c)*p)} ›</button>`;
}
