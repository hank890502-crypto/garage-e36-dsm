/* ==========================================================================
   2G Eclipse 專屬頁面：零件庫、維修程序、故障碼
   ========================================================================== */
const eclCatById = id => ECL_PART_CATS.find(x=>x.id===id);
let EPQ = '', EPCAT = '';

/* ---------------- 改裝零件庫 ---------------- */
function pgEclParts(){
  const c = car(); if(!c) return needCar();
  const q = EPQ.trim().toLowerCase();
  const list = ECL_PARTS.filter(p=>{
    if(EPCAT && p.cat!==EPCAT) return false;
    if(!q) return true;
    return (p.name+p.brand+(p.note||'')).toLowerCase().includes(q);
  });
  const grps = [...new Set(ECL_PART_CATS.map(x=>x.grp))];
  return `
  <div class="card tight">
    <div class="srch">${ic('search',18)}
      <input class="inp" placeholder="搜尋零件或品牌" value="${esc(EPQ)}"
             oninput="EPQ=this.value;render()"></div>
    <div class="seg" style="margin-top:var(--s2);flex-wrap:nowrap">
      <button class="${EPCAT?'':'on'}" onclick="EPCAT='';render()">全部</button>
      ${ECL_PART_CATS.map(x=>`<button class="${EPCAT===x.id?'on':''}" onclick="EPCAT='${x.id}';render()">${esc(x.name)}</button>`).join('')}
    </div>
  </div>

  <div class="card"><div class="note y">${esc(ECL_PARTS_NOTE)}</div></div>

  ${list.length ? grps.map(g=>{
    const rows = list.filter(p=>eclCatById(p.cat) && eclCatById(p.cat).grp===g);
    if(!rows.length) return '';
    return `<div class="card">
      <h3 class="t-card">${esc(g)} <span class="mut" style="font-weight:400">${rows.length}</span></h3>
      <div class="rows" style="margin-top:var(--s2)">
        ${rows.map(p=>{ const cp = eclCompat(p,c); return `
        <button class="row" style="width:100%;background:transparent;border:0;border-bottom:1px solid var(--line);
          padding:14px 0;cursor:pointer;text-align:left;align-items:flex-start" onclick="showEclPart('${p.id}')">
          <div class="gr">
            <div class="mhd"><span class="nm">${esc(p.name)}</span>${lvSt(cp.lv)}</div>
            <div class="t-cap">${esc(p.brand)} · Stage ${p.stage} · ${esc(eclCatById(p.cat).name)}</div>
            <div class="t-cap">${esc((p.note||'').slice(0,58))}${(p.note||'').length>58?'…':''}</div>
          </div>
          <div class="rt"><div class="num" style="font-weight:600">${range(p.price[0],p.price[1])}</div>
            <div class="t-cap">工資 ${range(p.labor[0],p.labor[1])}</div></div>
        </button>`;}).join('')}
      </div></div>`;}).join('')
    : `<div class="card"><div class="empty">${ic('search',40)}<p>找不到符合的零件</p></div></div>`}`;
}

function showEclPart(id){
  const p = ECL_PARTS.find(x=>x.id===id); if(!p) return;
  const c = car(), cp = eclCompat(p,c);
  const IMP = {perf:'性能', dura:'耐用度', comfort:'舒適性', cost:'費用', look:'外觀', legal:'法規'};
  modal({title:p.name, wide:true, body:`
    <div class="summary" style="grid-template-columns:repeat(3,minmax(0,1fr));margin-bottom:var(--s3)">
      <div class="it"><div class="lb">零件費</div><div class="vl" style="font-size:19px">${range(p.price[0],p.price[1])}</div></div>
      <div class="it"><div class="lb">工資估算</div><div class="vl" style="font-size:19px">${range(p.labor[0],p.labor[1])}</div></div>
      <div class="it"><div class="lb">相容性</div><div class="vl" style="font-size:16px;padding-top:6px">${lvSt(cp.lv)}</div></div>
    </div>
    ${Object.keys(p.spec||{}).length?`<div style="margin-bottom:var(--s2)">
      ${Object.entries(p.spec).map(([k,v])=>`<div class="kv"><span>${esc(k)}</span><b>${esc(v)}</b></div>`).join('')}</div>`:''}
    <h4 class="t-card">相容性判斷</h4>
    ${reasonList(cp.R)}
    <h4 class="t-card" style="margin-top:var(--s3)">裝了會怎樣</h4>
    <div style="margin-top:var(--s1)">
      ${Object.entries(p.impact||{}).filter(([,v])=>v&&v.length).map(([k,v])=>
        `<div class="kv" style="align-items:flex-start"><span>${IMP[k]||k}</span>
          <b style="max-width:70%;font-weight:400;text-align:right">${v.map(esc).join('<br>')}</b></div>`).join('')}
    </div>
    ${p.note?`<div class="note b" style="margin-top:var(--s3)">${esc(p.note)}</div>`:''}
    <div class="src">${esc(ECL_PARTS_NOTE)}</div>`,
    footer:`<button class="btn" style="margin-left:auto" onclick="closeModal()">關閉</button>`});
}

/* ---------------- 維修程序 ---------------- */
function eclProcCard(){
  return `<div class="card">
    <h3 class="t-card">原廠維修程序（中文翻譯）</h3>
    <p class="t-cap" style="margin:6px 0 0">${esc(ECL_PROC_NOTE)}</p>
    <div class="rows" style="margin-top:var(--s2)">
      ${ECL_PROC.map(p=>`<button class="row" style="width:100%;background:transparent;border:0;
        border-bottom:1px solid var(--line);padding:14px 0;cursor:pointer;text-align:left"
        onclick="showEclProc('${p.id}')">
        <div class="gr">
          <div style="font-weight:500">${esc(p.name)}</div>
          <div class="t-cap">難度 ${'●'.repeat(p.hard)}${'○'.repeat(5-p.hard)} · 約 ${p.hr[0]}–${p.hr[1]} 小時 · 手冊第 ${p.page} 頁</div>
        </div>
        <span class="mut3">${ic('fwd',16)}</span></button>`).join('')}
    </div>
  </div>`;
}
function showEclProc(id){
  const p = ECL_PROC.find(x=>x.id===id); if(!p) return;
  modal({title:p.name, wide:true, body:`
    <div class="row" style="gap:var(--s3);margin-bottom:var(--s2)">
      ${confSt(p.conf)}<span class="chip">難度 ${p.hard}/5</span>
      <span class="chip">約 ${p.hr[0]}–${p.hr[1]} 小時</span>
      <span class="chip b">手冊第 ${p.page} 頁</span>
    </div>
    ${p.warn?`<div class="note r">${esc(p.warn)}</div>`:''}
    ${(p.pre||[]).length?`<h4 class="t-card" style="margin-top:var(--s3)">開始之前</h4>
      <div style="margin-top:var(--s1)">${p.pre.map(x=>`<div style="font-size:14px;padding:3px 0">· ${esc(x)}</div>`).join('')}</div>`:''}
    <h4 class="t-card" style="margin-top:var(--s3)">步驟</h4>
    <div class="rows" style="margin-top:var(--s1)">
      ${p.steps.map((s,i)=>`<div class="row" style="align-items:flex-start">
        <span class="num" style="font-weight:600;color:var(--tx3);min-width:22px">${i+1}</span>
        <div class="gr"><div style="font-weight:500">${esc(s.t)}</div>
          <div class="t-cap" style="font-size:14px;line-height:1.65;color:var(--tx2)">${esc(s.d)}</div></div>
      </div>`).join('')}
    </div>
    ${(p.res||[]).length?`<h4 class="t-card" style="margin-top:var(--s3)">結果判讀</h4>
      <div style="margin-top:var(--s1)">${p.res.map(r=>
        `<div class="kv" style="align-items:flex-start"><span>${esc(r.k)}</span>
          <b style="max-width:70%;font-weight:400;text-align:right">${esc(r.d)}</b></div>`).join('')}</div>`:''}
    ${p.after?`<div class="note b" style="margin-top:var(--s3)"><b>收尾：</b>${esc(p.after)}</div>`:''}
    <div class="src">翻譯自《${esc(ECL_MANUAL.title)}》第 ${p.page} 頁。手冊裡的分解圖為掃描影像，未包含在此，施工時請對照原圖。</div>`,
    footer:`<button class="btn pri" onclick="closeModal()">完成</button>`});
}

/* ---------------- 故障碼 ---------------- */
function eclDtcBody(q){
  const rows = ECL_DTC.filter(d=>!q||(d.c+d.n).toLowerCase().includes(q));
  if(!rows.length) return `<div class="card"><div class="empty">${ic('search',40)}<p>找不到「${esc(FQ)}」</p></div></div>`;
  return `
  <div class="card"><div class="note y">${esc(ECL_DTC_NOTE)}</div></div>
  <div class="card">
    <h3 class="t-card">手冊收錄的故障碼 <span class="mut" style="font-weight:400">${rows.length}</span></h3>
    <div style="margin-top:var(--s2)">
      ${rows.map(d=>`<div class="kv" style="align-items:flex-start">
        <span><code>${esc(d.c)}</code> ${d.k==='mmc'?'<span class="chip y">三菱自訂碼</span>':''}</span>
        <b style="max-width:64%;font-weight:400;text-align:right">${esc(d.n)}
          <span class="t-cap">手冊第 ${d.p} 頁有診斷流程圖</span></b></div>`).join('')}
    </div>
  </div>`;
}
