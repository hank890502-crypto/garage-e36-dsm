/* ==========================================================================
   維修（手冊 / 原廠數據 / 故障診斷 / 保養提醒）與 更多
   ========================================================================== */
let MQ = '', MCAT = '', MFIT = true;

function svcFits(s, c){
  if(!c || !MFIT) return true;
  const eng = carEngine(c), mdl = mdlById(c.modelId), body = bodyById(c.bodyId), a = s.ap||{};
  if(a.eng?.length && (!eng || !a.eng.includes(eng.id))) return false;
  if(a.mdl?.length && (!mdl || !a.mdl.some(k=>mdl.name.includes(k)))) return false;
  if(a.yr?.length===2 && (c.year<a.yr[0] || c.year>a.yr[1])) return false;
  if(a.body?.length && (!body || !a.body.includes(body.id))) return false;
  return true;
}
function svcKey(s){ return s.cat+'|'+s.name; }
function pushRecent(k){
  UI.recent = (UI.recent||[]).filter(x=>x!==k); UI.recent.unshift(k);
  UI.recent = UI.recent.slice(0,6); saveUI();
}

/* ---------------- 維修手冊：以搜尋為中心 ---------------- */
function pgManual(){
  const c = car(), eng = carEngine(c);
  const q = MQ.trim();
  return `
  <div class="card">
    <div class="srch">${ic('search',20)}
      <input class="inp" id="mq" autocomplete="off" placeholder="搜尋原廠規格、扭力值、油品或程序"
             value="${esc(MQ)}" oninput="MQ=this.value;renderManualBody()"></div>
    ${c?`<label class="chk" style="border:0;padding:12px 0 0"><input type="checkbox" ${MFIT?'checked':''}
      onchange="MFIT=this.checked;render()"><span class="t-cap">只顯示適用於 ${esc(eng?eng.name:'本車')} 的資料</span></label>`:''}
  </div>
  <div id="mBody">${manualBody()}</div>`;
}
function renderManualBody(){ $('#mBody').innerHTML = manualBody(); }

function manualBody(){
  const c = car(), q = MQ.trim().toLowerCase();
  if(!q){
    const SV=svcOf(platOf(c)), SC=svcCatsOf(platOf(c));
    const rec = (UI.recent||[]).map(k=>SV.find(s=>svcKey(s)===k)).filter(Boolean);
    return `
    ${rec.length?`<div class="card"><h3 class="t-card">最近查看</h3>
      <div class="rows" style="margin-top:var(--s1)">${rec.map(s=>svcRow(s,'')).join('')}</div></div>`:''}
    <div class="card">
      <h3 class="t-card">常用分類</h3>
      <div class="rows" style="margin-top:var(--s1)">
        ${SC.map(x=>{
          const n = SV.filter(s=>s.cat===x.id && svcFits(s,c)).length;
          if(!n) return '';
          return `<button class="row" style="width:100%;background:transparent;border:0;border-bottom:1px solid var(--line);
            padding:14px 0;cursor:pointer;text-align:left;font-size:15px" onclick="MQ='';MCAT='${x.id}';showCat('${x.id}')">
            <span class="mut">${ic(x.ic,20)}</span><span class="gr">${x.name}</span>
            <span class="t-cap">${n}</span><span class="mut3">${ic('fwd',16)}</span></button>`;}).join('')}
      </div>
    </div>
    ${platOf(c)==='dsm2g' ? eclProcCard() : ''}
    <div class="card">
      <h3 class="t-card">原廠胎壓與手冊規格表</h3>
      <p class="t-cap" style="margin:4px 0 var(--s2)">完整的原廠冷胎壓表、手冊保養規格表與故障案例，收在「原廠數據」分頁。</p>
      <button class="btn" onclick="nav('service/oem')">前往原廠數據</button>
    </div>
    <div class="card">
      <h3 class="t-card">試試這些</h3>
      <div class="btnrow" style="margin-top:var(--s2)">
        ${['機油容量','輪圈螺絲','火星塞','胎壓','四輪定位','冷卻液','煞車油','P0171'].map(k=>
          `<button class="btn sm" onclick="MQ='${k}';render()">${k}</button>`).join('')}
      </div>
    </div>`;
  }
  const rows = svcOf(platOf(c)).filter(s=>{
    if(!svcFits(s,c)) return false;
    return (s.name+' '+s.val+' '+(s.q||'')+' '+(s.note||'')+' '+(s.warn||'')).toLowerCase().includes(q);
  });
  const mrows = MANUAL_SPEC_ROWS.filter(r=>(r.item+r.m43+r.m44+r.m52).toLowerCase().includes(q));
  const hl = t => esc(t).replace(new RegExp('('+q.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+')','ig'),'<mark>$1</mark>');
  if(!rows.length && !mrows.length) return `<div class="card"><div class="empty">${ic('search',40)}
    <p>找不到「${esc(MQ)}」</p>
    ${MFIT&&c?`<button class="btn" onclick="MFIT=false;render()">取消「只顯示適用本車」再找一次</button>`:''}</div></div>`;
  return `
  ${mrows.length?`<div class="card">
    <h3 class="t-card">原廠手冊</h3>
    <p class="t-cap" style="margin:4px 0 var(--s2)">來自你上傳的《${esc(MANUAL.title)}》</p>
    ${mrows.map(r=>`<div class="kv"><span>${hl(r.item)}</span>
      <b class="num" style="max-width:66%">M43 ${hl(r.m43)}　M44 ${hl(r.m44)}　M52 ${hl(r.m52)}</b></div>`).join('')}
  </div>`:''}
  ${rows.length?`<div class="card"><h3 class="t-card">搜尋結果 <span class="mut" style="font-weight:400">${rows.length}</span></h3>
    <div class="rows" style="margin-top:var(--s1)">${rows.map(s=>svcRow(s,q)).join('')}</div></div>`:''}`;
}

function svcRow(s, q){
  const hl = t => q ? esc(t).replace(new RegExp('('+q.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+')','ig'),'<mark>$1</mark>') : esc(t);
  return `<button class="row" style="width:100%;background:transparent;border:0;border-bottom:1px solid var(--line);
    padding:14px 0;cursor:pointer;text-align:left;align-items:flex-start" onclick="showSvc('${svcKey(s).replace(/'/g,"\\'")}')">
    <div class="gr">
      <div style="font-size:15px">${hl(s.name)}</div>
      <div class="t-cap">${confSt(s.conf)}</div>
    </div>
    <div class="rt"><div class="num" style="font-weight:600;font-size:16px;max-width:230px;
      color:${s.conf==='unverified'?'var(--tx3)':'inherit'}">${hl(s.val)}${s.unit?` <span class="mut" style="font-size:13px;font-weight:400">${esc(s.unit)}</span>`:''}</div></div>
  </button>`;
}

function showSvc(key){
  const s = svcOf(platOf(car())).find(x=>svcKey(x)===key); if(!s) return;
  pushRecent(key);
  modal({title:s.name, body:`
    <div class="t-data" style="margin-bottom:var(--s2);color:${s.conf==='unverified'?'var(--tx3)':'inherit'}">
      ${esc(s.val)}${s.unit?` <span class="mut" style="font-size:15px;font-weight:400">${esc(s.unit)}</span>`:''}</div>
    <div class="row" style="gap:var(--s3);margin-bottom:var(--s3)">${confSt(s.conf)}
      <span class="chip">${esc(svcCatsOf(platOf(car())).find(x=>x.id===s.cat)?.name||'')}</span>
      ${s.ap?.eng?.length?`<span class="chip b">${esc(s.ap.eng.length>3?s.ap.eng.slice(0,3).join(' / ')+` 等 ${s.ap.eng.length} 種`:s.ap.eng.join(' / '))}</span>`:'<span class="chip">全車系適用</span>'}
    </div>
    ${s.note?`<div class="note b">${esc(s.note)}</div>`:''}
    ${s.warn?`<div class="note y" style="margin-top:var(--s2)">${esc(s.warn)}</div>`:''}
    ${srcLine(s.src)}
    <div class="src">同一款車不同年份、引擎、變速箱與市場版本的數據可能不同。施工前請以你車上的原廠手冊或 BMW TIS 再核對。</div>`,
    footer:`<button class="btn pri" onclick="closeModal()">完成</button>`});
}
function showCat(id){
  const c = car(), cat = svcCatsOf(platOf(c)).find(x=>x.id===id);
  const rows = svcOf(platOf(c)).filter(s=>s.cat===id && svcFits(s,c));
  modal({title:cat.name, wide:true, body:`<div class="rows">${rows.map(s=>svcRow(s,'')).join('')}</div>`,
    footer:`<button class="btn" onclick="closeModal()">關閉</button>`});
}

/* ---------------- 原廠數據：2G Eclipse ---------------- */
function pgOemEclipse(c, eng){
  const turbo = eng && eng.id==='4G63T';
  const cats = svcCatsOf('dsm2g');
  return `
  <div class="card">
    <h3 class="t-card">${esc(ECL_MANUAL.title)}</h3>
    <p class="t-cap" style="margin:4px 0 0">${esc(ECL_MANUAL.pub)} · ${nf(ECL_MANUAL.pages)} 頁 · ${esc(ECL_MANUAL.lang)}</p>
    ${turbo
      ? `<div class="note b" style="margin-top:var(--s2)">你的車是 <b>${esc(eng.name)}</b>，這本手冊正好就是這顆引擎的。</div>`
      : `<div class="note y" style="margin-top:var(--s2)">${esc(ECL_MANUAL.note)}</div>`}
    <div class="grid g3" style="margin-top:var(--s3)">
      ${ECL_MANUAL.sections.slice(0,6).map(s=>`<div class="note" style="padding:12px 14px">
        <b>${esc(s.name)}</b><br>${nf(s.n)} 頁</div>`).join('')}
    </div>
  </div>

  ${cats.map(cat=>{
    const rows = ECL_SVC.filter(s=>s.cat===cat.id);
    if(!rows.length) return '';
    return `<div class="card"><h3 class="t-card">${ic(cat.ic,18)} ${esc(cat.name)}
      <span class="mut" style="font-weight:400">${rows.length}</span></h3>
      <div style="margin-top:var(--s2)">${rows.map(s=>`
        <div class="kv"><span>${esc(s.name)}${s.hl?' <span class="chip b">重點</span>':''}</span>
          <b class="num" style="max-width:60%">${esc(s.val)}${s.unit?` <span class="mut" style="font-weight:400;font-size:13px">${esc(s.unit)}</span>`:''}</b></div>
        ${s.warn?`<div class="note y" style="margin:0 0 12px">${esc(s.warn)}</div>`:''}`).join('')}</div>
    </div>`;}).join('')}

  <div class="card">
    <h3 class="t-card">手冊釐清或修正的事</h3>
    <div class="rows" style="margin-top:var(--s2)">
      ${ECL_MANUAL_RESOLVES.map(r=>`<div class="row" style="align-items:flex-start">
        <div class="gr">
          <div style="font-weight:500">${esc(r.topic)}</div>
          <div class="t-cap">原本：${esc(r.before)}</div>
          <div class="t-cap" style="color:var(--green)">手冊：${esc(r.after)}</div>
          <div class="t-cap">${esc(r.why)}</div>
        </div></div>`).join('')}
    </div>
    <div class="src">來源：${esc(ECL_SRC.fsm[0])}</div>
  </div>`;
}

/* ---------------- 原廠數據 ---------------- */
function pgOem(){
  const c = car(), eng = carEngine(c);
  if(platOf(c)==='dsm2g') return pgOemEclipse(c, eng);
  const col = eng ? (eng.id.startsWith('M43')?'m43':eng.id.startsWith('M44')?'m44':eng.id.startsWith('M52')?'m52':null) : null;
  return `
  <div class="card">
    <h3 class="t-card">${esc(MANUAL.title)}</h3>
    <p class="t-cap" style="margin:4px 0 0">${esc(MANUAL.pub)} · ${MANUAL.pages} 頁 · ${esc(MANUAL.lang)} · 涵蓋 M43 / M44 / M52</p>
    ${col?`<div class="note b" style="margin-top:var(--s2)">你的車是 <b>${esc(eng.name)}</b>，下表已標示對應欄位。</div>`
        :`<div class="note y" style="margin-top:var(--s2)">你的引擎不在本手冊涵蓋範圍內，下表僅供參考。</div>`}
    <div style="overflow-x:auto;margin-top:var(--s2)">
      <table class="tb" style="min-width:560px"><thead><tr><th>項目</th>
        <th style="${col==='m43'?'color:var(--blue)':''}">M43 1.6/1.8</th>
        <th style="${col==='m44'?'color:var(--blue)':''}">M44 1.9</th>
        <th style="${col==='m52'?'color:var(--blue)':''}">M52 2.0/2.8</th></tr></thead>
      <tbody>${MANUAL_SPEC_ROWS.map(r=>`<tr>
        <td>${esc(r.item)}</td>
        <td class="num" style="${col==='m43'?'font-weight:600':''}">${esc(r.m43)}</td>
        <td class="num" style="${col==='m44'?'font-weight:600':''}">${esc(r.m44)}</td>
        <td class="num" style="${col==='m52'?'font-weight:600':''}">${esc(r.m52)}</td></tr>`).join('')}</tbody></table>
    </div>
    <div class="src">手冊頁碼：M43 ${esc(MANUAL_REF.m43)}　M44 ${esc(MANUAL_REF.m44)}　M52 ${esc(MANUAL_REF.m52)}</div>
  </div>

  <div class="card">
    <h3 class="t-card">手冊記載的故障案例</h3>
    <div style="margin-top:var(--s1)">${MANUAL_QA.map(q=>{
      const fit = !q.eng.length || (eng && q.eng.includes(eng.id));
      return `<details class="dd">
        <summary><span style="flex:1">${esc(q.q.slice(0,38))}…</span>
          ${fit&&q.eng.length?'<span class="chip b">符合你的引擎</span>':''}</summary>
        <div class="in">
          <p style="font-size:14px;margin:0 0 var(--s2)"><b>症狀：</b>${esc(q.q)}</p>
          ${q.a.map((a,i)=>`<div style="font-size:14px;padding:3px 0">${i+1}. ${esc(a)}</div>`).join('')}
          <div class="note b" style="margin-top:var(--s2)">${esc(q.tie)}</div>
        </div></details>`;}).join('')}</div>
    <div class="src">來源：手冊 QA 章節（PDF p.552–554）</div>
  </div>

  <div class="card">
    <h3 class="t-card">資料衝突與定案</h3>
    <p class="t-cap" style="margin:4px 0 var(--s2)">這些項目先前從國外來源查到的數值互相衝突或查不到，由你上傳的原廠手冊補上或修正。</p>
    ${MANUAL_RESOLVES.map(r=>`<details class="dd"><summary><span style="flex:1">${esc(r.topic)}</span>
      <span class="st g">已定案</span></summary>
      <div class="in">
        <div class="kv"><span>先前</span><b class="mut" style="font-weight:400;max-width:64%">${esc(r.before)}</b></div>
        <div class="kv"><span>手冊記載</span><b style="color:var(--green);max-width:64%">${esc(r.after)}</b></div>
        <p class="t-cap" style="margin-top:var(--s2)">${esc(r.note)}</p></div></details>`).join('')}
  </div>

  <div class="card">
    <h3 class="t-card">原廠冷胎壓</h3>
    <div style="overflow-x:auto;margin-top:var(--s2)">
      <table class="tb" style="min-width:520px"><thead><tr><th>車型</th><th>輪胎規格</th><th class="rt">前 bar</th><th class="rt">後 bar</th></tr></thead>
      <tbody>${TIRE_PSI.map(t=>`<tr><td>${esc(t.mdl)}</td><td class="mut">${esc(t.tire)}</td>
        <td class="rt num">${esc(t.f)}</td><td class="rt num">${esc(t.r)}</td></tr>`).join('')}</tbody></table>
    </div>
    <div class="src">${esc(TIRE_PSI_NOTE)}</div>
  </div>

  <div class="card"><div class="src">${esc(MANUAL_NOT_COVERED)}</div></div>`;
}

/* ---------------- 故障診斷 ---------------- */
let FQ = '', FTAB = 'sym';
function pgFault(){
  return `
  <div class="card">
    <div class="srch">${ic('search',20)}
      <input class="inp" placeholder="輸入症狀或故障碼，例如 怠速不穩、P0171" value="${esc(FQ)}"
             oninput="FQ=this.value;$('#fBody').innerHTML=faultBody()"></div>
    <div class="seg" style="margin-top:var(--s2)">
      ${[['sym','症狀'],['dtc','故障碼'],['weak','已知弱點'],['obd','OBD 判別']].map(([v,n])=>
        `<button class="${FTAB===v?'on':''}" onclick="FTAB='${v}';render()">${n}</button>`).join('')}
    </div>
    <div class="note y" style="margin-top:var(--s2)">這是初步診斷參考，不能取代技師現場檢查。涉及煞車、轉向、燃油與過熱的項目請直接送修。</div>
  </div>
  <div id="fBody">${faultBody()}</div>`;
}
function faultBody(){
  const c = car(), eng = carEngine(c), q = FQ.trim().toLowerCase();
  if(FTAB==='obd') return `<div class="card">
    <h3 class="t-card">${esc(OBD_NOTE.title)}</h3>
    ${OBD_NOTE.body.map(b=>`<p style="font-size:14px;margin:var(--s2) 0 0">${esc(b)}</p>`).join('')}
    <div class="note b" style="margin-top:var(--s3)"><b>可靠的判別方式</b><br>
      ${OBD_NOTE.steps.map((s,i)=>`${i+1}. ${esc(s)}`).join('<br>')}</div>
    <div class="note" style="margin-top:var(--s2)">你上傳的手冊記載 M52 美規車故障碼為 <code>251</code>／<code>254</code>，
      是 BMW 自有的 3 位數碼而不是 P0xxx —— 正好印證「E36 不能直接套用 OBD2 P 碼」。</div>
    ${srcLine(OBD_NOTE.src)}</div>`;

  if(FTAB==='weak' && platOf(c)==='dsm2g') return `
    <div class="card"><div class="note y">${esc(ECL_WEAK_NOTE)}</div></div>
    <div class="grid g2">${ECL_WEAK
      .filter(w=>!q||(w.name+w.what+w.sign+w.fix).toLowerCase().includes(q))
      .map(w=>`<div class="card">
        <div class="mhd"><h3 class="t-card nm">${esc(w.name)}</h3>
          <span class="st ${w.lv}">${w.lv==='r'?'高風險':'常見'}</span></div>
        <p style="font-size:14px;line-height:1.65;margin:var(--s2) 0 0">${esc(w.what)}</p>
        <div class="note" style="margin-top:var(--s2)"><b>怎麼看出來：</b>${esc(w.sign)}</div>
        <div class="note" style="margin-top:var(--s1)"><b>怎麼處理：</b>${esc(w.fix)}</div>
      </div>`).join('')}</div>`;

  if(FTAB==='weak') return `<div class="grid g2">${WEAKPOINTS
    .filter(w=>!q||(w.name+w.desc+w.aff).toLowerCase().includes(q))
    .map(w=>`<div class="card">
      <div class="row"><h3 class="t-card gr">${esc(w.name)}</h3>
        <span class="st ${w.sev===3?'r':w.sev===2?'y':''}">${w.sev===3?'高風險':w.sev===2?'中風險':'低風險'}</span></div>
      <p class="t-cap" style="margin:4px 0 var(--s2)">${esc(w.aff)}</p>
      <p style="font-size:14px;margin:0">${esc(w.desc)}</p>
      <div class="note" style="margin-top:var(--s2)"><b>建議處理：</b>${esc(w.fix)}</div>
      ${srcLine(w.src)}</div>`).join('')}</div>`;

  if(FTAB==='dtc' && platOf(c)==='dsm2g') return eclDtcBody(q);
  if(FTAB==='dtc'){
    const rows = DTCS.filter(d=>!q||(d.code+d.name+d.causes.join('')).toLowerCase().includes(q));
    if(!rows.length) return emptyFind();
    return `<div class="card"><div style="margin-top:0">${rows.map(d=>`
      <details class="dd"><summary><code>${esc(d.code)}</code><span style="flex:1">${esc(d.name)}</span></summary>
        <div class="in">
          <div class="t-cap" style="margin-bottom:6px">E36 上最常見的實際原因</div>
          ${d.causes.map((x,i)=>`<div style="font-size:14px;padding:3px 0">${i+1}. ${esc(x)}</div>`).join('')}
          <div class="t-cap" style="margin:var(--s2) 0 6px">建議檢查順序</div>
          ${d.order.map((x,i)=>`<div style="font-size:14px;padding:3px 0">${i+1}. ${esc(x)}</div>`).join('')}
          ${d.note?`<div class="note b" style="margin-top:var(--s2)">${esc(d.note)}</div>`:''}
          ${srcLine(d.src)}</div></details>`).join('')}</div></div>`;
  }

  const rows = SYMPTOMS.filter(s=>!q||(s.sym+s.causes.join('')).toLowerCase().includes(q));
  if(!rows.length) return emptyFind();
  return `<div class="card"><div>${rows.map(s=>`
    <details class="dd"><summary><span style="flex:1">${esc(s.sym)}</span>
      <span class="st ${s.risk==='high'?'r':s.risk==='mid'?'y':''}">${s.risk==='high'?'可能危險':s.risk==='mid'?'盡快處理':'可觀察'}</span></summary>
      <div class="in">
        <div class="t-cap" style="margin-bottom:6px">高頻原因（依機率排序）</div>
        ${s.causes.map((x,i)=>`<div style="font-size:14px;padding:3px 0">${i+1}. ${esc(x)}</div>`).join('')}
        <div class="t-cap" style="margin:var(--s2) 0 6px">建議動作</div>
        ${s.act.map(x=>`<div style="font-size:14px;padding:3px 0">・${esc(x)}</div>`).join('')}
        ${s.note?`<div class="note b" style="margin-top:var(--s2)">${esc(s.note)}</div>`:''}
        ${s.warn?`<div class="note y" style="margin-top:var(--s2)">${esc(s.warn)}</div>`:''}
        ${srcLine(s.src)}</div></details>`).join('')}</div></div>`;
}
function emptyFind(){ return `<div class="card"><div class="empty">${ic('search',40)}
  <p>找不到「${esc(FQ)}」<br><span class="t-cap">試試：怠速、水溫、抖動、異音、冷氣、電瓶、故障燈</span></p></div></div>`; }

/* ---------------- 保養提醒 ---------------- */
function pgMaint(){
  const c = car(); if(!c) return needCar();
  const ms = maintStatus(c);
  const act = ms.filter(m=>m.st==='over'||m.st==='due');
  const ok  = ms.filter(m=>m.st==='ok');
  const non = ms.filter(m=>m.st==='none');
  const sect = (title, arr) => arr.length ? `<div class="card">
    <h3 class="t-card">${title} <span class="mut" style="font-weight:400">${arr.length}</span></h3>
    <div class="rows" style="margin-top:var(--s2)">${arr.map(m=>maintBlock(m,c,true)).join('')}</div>
  </div>` : '';
  return `
  <div class="card">
    <div class="summary" style="grid-template-columns:repeat(3,minmax(0,1fr))">
      <div class="it"><div class="lb">需要處理</div><div class="vl" style="color:${act.length?'var(--orange)':'inherit'}">${act.length}</div></div>
      <div class="it"><div class="lb">狀態正常</div><div class="vl">${ok.length}</div></div>
      <div class="it"><div class="lb">尚無紀錄</div><div class="vl">${non.length}</div></div>
    </div>
    <p class="t-cap" style="margin-top:var(--s2)">目前里程 ${nf(c.km)} km。進度條是<b>剩餘量</b>：滿格代表剛做完，見底代表該換了。里程與時間哪個先到就以哪個為準。</p>
  </div>
  ${sect('需要處理', act)}
  ${sect('狀態正常', ok)}
  ${non.length?`<div class="card"><h3 class="t-card">尚無紀錄 <span class="mut" style="font-weight:400">${non.length}</span></h3>
    <div class="rows" style="margin-top:var(--s1)">${non.map(m=>`<div class="row">
      <div class="gr" style="font-size:15px">${esc(m.name)}</div>
      <span class="t-cap">建議每 ${m.km?nf(m.km)+' km':''}${m.km&&m.mo?' 或 ':''}${m.mo?m.mo+' 個月':''}</span>
    </div>`).join('')}</div></div>`:''}`;
}

/* ---------------- 保養紀錄編輯 ---------------- */
function editLog(id){
  const c = car(); if(!c) return;
  const isNew = !id;
  const l = isNew ? {id:uid(), date:today(), km:c.km, items:[], title:'', shop:'', parts:'', cost:0, labor:0, note:''}
                  : structuredClone(c.logs.find(x=>x.id===id));
  modal({title: isNew?'新增保養紀錄':'編輯保養紀錄', wide:true, body:`
    <div class="grid g2">
      <div>
        <div class="fld"><label>日期</label><input class="inp" id="l_date" type="date" value="${esc(l.date)}"></div>
        <div class="fld"><label>里程（km）</label><input class="inp" id="l_km" type="number" value="${l.km||0}"></div>

        <div class="fld"><label>這次做了哪些項目<span class="mut" style="font-weight:400">（用於推算下次到期）</span></label>
          <div id="mpick">${maintPicker(c, l.items||[])}</div></div>

        <div class="fld"><label>維修項目說明</label><input class="inp" id="l_title" value="${esc(l.title)}" placeholder="更換機油與機油濾芯"></div>
      </div>
      <div>
        <div class="fld"><label>店家</label><input class="inp" id="l_shop" value="${esc(l.shop)}"></div>
        <div class="fld"><label>使用油品／零件</label><input class="inp" id="l_parts" value="${esc(l.parts)}" placeholder="Motul 8100 5W-40、Mahle OX254D"></div>
        <div class="grid g2" style="gap:var(--s2)">
          <div class="fld"><label>零件費</label><input class="inp" id="l_cost" type="number" value="${l.cost||0}"></div>
          <div class="fld"><label>工資</label><input class="inp" id="l_labor" type="number" value="${l.labor||0}"></div>
        </div>
        <div class="fld"><label>備註</label><textarea class="inp" id="l_note" style="min-height:110px">${esc(l.note)}</textarea></div>
      </div>
    </div>
`,
    footer:`${isNew?'':`<button class="btn dgr" onclick="delLog('${id}')">刪除</button>`}
      <button class="btn" style="margin-left:auto" onclick="closeModal()">取消</button>
      <button class="btn pri" onclick="saveLog('${l.id}',${isNew})">儲存</button>`});
}
function saveLog(id, isNew){
  const c = car();
  const l = {id, date:$('#l_date').value, km:+$('#l_km').value||0, title:$('#l_title').value,
    shop:$('#l_shop').value, parts:$('#l_parts').value, cost:+$('#l_cost').value||0,
    labor:+$('#l_labor').value||0, note:$('#l_note').value, items:$$('.lgi:checked').map(x=>x.value)};
  c.logs = c.logs||[];
  if(isNew) c.logs.push(l); else c.logs = c.logs.map(x=>x.id===id?l:x);
  if(l.km > c.km) c.km = l.km;
  saveDB(); closeModal(); render(); toast('已儲存');
}
function delLog(id){ const c=car(); c.logs=c.logs.filter(x=>x.id!==id); saveDB(); closeModal(); render(); toast('已刪除'); }

/* ---------------- 更多 ---------------- */
function pgLegal(){
  const cats = [...new Set(REGS.map(r=>r.cat))];
  return `
  <div class="card">
    <h3 class="t-card">不可變更項目</h3>
    <p class="t-cap" style="margin:4px 0 var(--s2)">規劃改裝前最該先知道的紅線。依交通部公路局〈設備變更〉頁。</p>
    <div class="btnrow">${REG_CANT_CHANGE.items.map(i=>`<span class="chip r">${esc(i)}</span>`).join('')}</div>
    <p style="font-size:14px;margin:var(--s2) 0 0">${esc(REG_CANT_CHANGE.note)}</p>
    ${srcLine(REG_CANT_CHANGE.src)}
  </div>
  ${cats.map(cat=>`<div class="card">
    <h3 class="t-card">${esc(cat)}</h3>
    <div style="margin-top:var(--s1)">${REGS.filter(r=>r.cat===cat).map(r=>`
      <details class="dd"><summary><span style="flex:1">${esc(r.item)}</span>
        <span class="st ${r.need.startsWith('❌')?'r':r.need.startsWith('⚠')?'y':''}">${esc(r.need.replace(/^[❌⚠]\s*/,'').slice(0,14))}</span></summary>
        <div class="in">
          <p style="font-size:14px;margin:0 0 var(--s2)">${esc(r.detail)}</p>
          ${r.pen&&r.pen!=='—'?`<div class="note y"><b>罰則：</b>${esc(r.pen)}</div>`:''}
          ${r.warn?`<div class="note r" style="margin-top:var(--s2)">${esc(r.warn)}</div>`:''}
          <div style="margin-top:var(--s2)">${confSt(r.conf)}</div>
          ${srcLine(r.src)}</div></details>`).join('')}</div>
  </div>`).join('')}
  <div class="card"><div class="src">法規資料為 ${REG_DATE} 的靜態快照。標示為「社群彙整」或「尚未驗證」的項目，
    代表官方原文中未見對應專章或來源為媒體與業者整理 —— 請務必向監理站確認後再施工。</div></div>`;
}

function pgData(){
  const n = DB.cars.length;
  const logs = DB.cars.reduce((s,c)=>s+(c.logs||[]).length,0);
  return `
  <div class="card">
    <h3 class="t-card">資料存在哪裡</h3>
    <p style="font-size:14px;margin:var(--s2) 0 0">
      車輛、保養紀錄、改裝方案與施工專案全部存在<b>這台裝置的瀏覽器</b>，沒有伺服器，也不會上傳到任何地方。
      換電腦、換瀏覽器或清除瀏覽資料都會消失，所以請定期匯出備份。</p>
    <div class="summary" style="grid-template-columns:repeat(3,minmax(0,1fr));margin-top:var(--s3)">
      <div class="it"><div class="lb">車輛</div><div class="vl">${n}</div></div>
      <div class="it"><div class="lb">保養紀錄</div><div class="vl">${logs}</div></div>
      <div class="it"><div class="lb">儲存狀態</div><div class="vl" style="font-size:17px;padding-top:5px">
        <span class="st ${LS_OK?'g':'r'}">${LS_OK?'正常':'無法寫入'}</span></div></div>
    </div>
    <div class="btnrow" style="margin-top:var(--s3)">
      <button class="btn pri" onclick="exportJSON()">匯出備份</button>
      <button class="btn" onclick="$('#fileImport').click()">匯入備份</button>
    </div>
    ${DB.savedAt?`<div class="src">上次儲存：${esc(new Date(DB.savedAt).toLocaleString('zh-TW'))}</div>`:''}
  </div>`;
}

function pgSettings(){
  return `
  <div class="card">
    <h3 class="t-card">外觀</h3>
    <div class="rows" style="margin-top:var(--s2)">
      <div class="row"><div class="gr">佈景主題</div>
        <div class="seg">${[['light','淺色'],['dark','深色'],['auto','跟隨系統']].map(([v,n])=>
          `<button class="${UI.theme===v?'on':''}" onclick="UI.theme='${v}';saveUI();applyTheme();render()">${n}</button>`).join('')}</div>
      </div>
    </div>
  </div>
  <div class="card">
    <h3 class="t-card">關於</h3>
    <div style="margin-top:var(--s1)">
      <div class="kv"><span>資料查證日期</span><b>${VERIFIED_AT}</b></div>
      <div class="kv"><span>法規快照</span><b>${REG_DATE}</b></div>
      <div class="kv"><span>零件筆數</span><b>${PARTS.length}</b></div>
      <div class="kv"><span>維修數據筆數</span><b>E36 ${SVC.length} · Eclipse ${ECL_SVC.length}</b></div>
      <div class="kv"><span>原廠手冊</span><b style="max-width:62%">${esc(MANUAL.title)}</b></div>
    </div>
    <div class="note" style="margin-top:var(--s3)">
      每一筆數據都標註了可信度與來源。標示「尚未驗證」的項目代表查無可靠來源，請勿直接照著施工。
      車輛外觀預覽為 AI 生成的示意素材，不代表實際尺寸與安裝相容性。</div>
  </div>
  <div class="card">
    <h3 class="t-card">重置</h3>
    <p class="t-cap" style="margin:4px 0 var(--s2)">清除這台裝置上的所有車輛與紀錄，無法復原。建議先匯出備份。</p>
    <button class="btn dgr" onclick="confirmReset()">清除所有資料</button>
  </div>`;
}
function confirmReset(){
  modal({title:'清除所有資料', body:`<p>確定要清除這台裝置上的所有車輛、保養紀錄、改裝方案與施工專案嗎？此動作無法復原。</p>
    <div class="note y">建議先按「取消」，到資料備份匯出一份 JSON。</div>`,
    footer:`<button class="btn" onclick="closeModal()">取消</button>
            <button class="btn pri" style="background:var(--red)" onclick="doReset()">確定清除</button>`});
}
function doReset(){
  DB = structuredClone(DEF); saveDB(); closeModal(); location.hash='#overview'; location.reload();
}


/* ---------------- 保養項目選單：依分類收合，顯示已勾選數量 ---------------- */
function maintPicker(c, sel){
  const groups = maintGrouped(c);
  return groups.map(g=>{
    const n = g.list.filter(it=>sel.includes(it.id)).length;
    return `<details class="dd mpg"${n?' open':''}>
      <summary><span class="mut">${ic(g.ic,17)}</span><span style="flex:1">${esc(g.name)}</span>
        <span class="mpn${n?' on':''}">${n?n:g.list.length}</span></summary>
      <div class="in">${g.list.map(m=>`
        <label class="chk"><input type="checkbox" class="lgi" value="${m.id}"
          ${sel.includes(m.id)?'checked':''} onchange="mpCount()">
          <span style="font-size:14px">${esc(m.name)}</span>
          <span class="t-cap" style="margin-left:auto;white-space:nowrap">${
            [m.km?nf(m.km)+' km':'', m.mo?m.mo+' 個月':''].filter(Boolean).join(' / ')}</span></label>`).join('')}
      </div></details>`;
  }).join('');
}
/* 勾選時即時更新各分類右邊的數字 */
function mpCount(){
  $$('#mpick .mpg').forEach(d=>{
    const boxes = [...d.querySelectorAll('.lgi')];
    const n = boxes.filter(b=>b.checked).length;
    const badge = d.querySelector('.mpn');
    badge.textContent = n ? n : boxes.length;
    badge.classList.toggle('on', !!n);
  });
}
