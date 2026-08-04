/* ==========================================================================
   改裝 · 零件庫 / 我的方案 / 方案比較 / 施工專案
   ========================================================================== */
let PQ = '', PCAT = '', PLV = '';

const CAT_IC = {wheel:'disc', aero:'wind', light:'sun', finish:'paint', susp:'arrows',
  chassis:'shield', brake:'disc', intake:'wind', exhaust:'wind', engine:'gauge',
  drive:'arrows', int:'sofa'};
/* 輪圈類零件借用對應的鋁圈素材當示意圖 */
const PART_IMG = {'w-oem17':'st42','w-17-85-40':'st5','w-17-9-30':'st39','w-18-85':'mesh'};

/* 只有 E36 有車身合成素材與零件資料庫，其他平台照實說，不要拿 E36 的資料硬套 */
function platGate(c, what){
  return `<div class="card"><div class="empty">${ic('wand',44)}
    <p><b>${esc(what)}目前只支援 BMW E36</b><br>
    <span class="t-cap">你選的是 ${esc(platName(platOf(c)))}。<br>
    這一頁需要兩樣這個平台還沒有的東西：車身合成素材，以及對應的零件資料庫與相容性規則。<br>
    拿 E36 的圖和零件硬套上去只會給你錯的答案，所以先擋起來。</span></p>
    <div class="btnrow" style="justify-content:center">
      <button class="btn" onclick="nav('service/oem')">看原廠數據</button>
      <button class="btn" onclick="nav('service/maint')">看保養提醒</button>
    </div>
    <p class="t-cap" style="margin-top:var(--s3)">
      車輛資料、原廠數據、保養提醒、加油與圈速計時，這幾頁都已經支援這個平台。</p>
  </div></div>`;
}

function pgCatalog(){
  const c = car();
  if(c && !isE36(c)) return pgEclParts();
  const list = filterParts(c);
  const nActive = (PCAT?1:0)+(PLV?1:0);
  return `
  <div class="card tight">
    <div class="row" style="gap:var(--s1)">
      <div class="srch gr">${ic('search',18)}
        <input class="inp" placeholder="搜尋零件、品牌或料號" value="${esc(PQ)}" oninput="PQ=this.value;rerenderParts()"></div>
      <button class="btn" onclick="openFilter()">${ic('filter',18)} 篩選${nActive?`（${nActive}）`:''}</button>
    </div>
    ${!c?`<div class="note y" style="margin-top:var(--s2)">尚未建立車輛，相容性一律顯示為「資料不足」。
      <a href="#mycar/info">先建立車輛</a>後，每個零件都會依你的年份、引擎與車身型式判斷。</div>`:''}
  </div>
  <div id="partList" style="margin-top:var(--s2)">${partGrid(list, c)}</div>`;
}
function filterParts(c){
  return PARTS.filter(p=>{
    if(PCAT && p.cat!==PCAT) return false;
    if(PQ){
      const s=(p.name+' '+p.brand+' '+(p.pn||'')+' '+Object.values(p.spec||{}).join(' ')+' '+(p.note||'')).toLowerCase();
      if(!s.includes(PQ.toLowerCase())) return false;
    }
    if(PLV && c && compat(p,c).lv!==PLV) return false;
    return true;
  });
}
function rerenderParts(){ $('#partList').innerHTML = partGrid(filterParts(car()), car()); }

function openFilter(){
  const grps=[...new Set(PART_CATS.map(x=>x.grp))];
  modal({title:'篩選', body:`
    <div class="t-cap" style="margin-bottom:8px">分類</div>
    <div class="seg" style="flex-wrap:wrap">
      <button class="${!PCAT?'on':''}" onclick="PCAT='';closeModal();render()">全部</button>
      ${grps.map(g=>PART_CATS.filter(x=>x.grp===g).map(x=>
        `<button class="${PCAT===x.id?'on':''}" onclick="PCAT='${x.id}';closeModal();render()">${x.name}</button>`).join('')).join('')}
    </div>
    <div class="t-cap" style="margin:var(--s3) 0 8px">相容性</div>
    <div class="seg">
      ${[['','全部'],['g','可直接安裝'],['y','需要調整'],['r','不建議']].map(([v,n])=>
        `<button class="${PLV===v?'on':''}" onclick="PLV='${v}';closeModal();render()">${n}</button>`).join('')}
    </div>`,
    footer:`<button class="btn" onclick="PCAT='';PLV='';closeModal();render()">清除</button>
            <button class="btn pri" onclick="closeModal()">完成</button>`});
}

function partGrid(list, c){
  if(!list.length) return `<div class="card"><div class="empty">${ic('search',40)}
    <p>沒有符合條件的零件</p><button class="btn" onclick="PQ='';PCAT='';PLV='';render()">清除條件</button></div></div>`;
  return `<div class="grid g3">${list.map(p=>pcard(p,c)).join('')}</div>
    <div class="src" style="margin-top:var(--s3)">${esc(FX_NOTE)}</div>`;
}

function pcard(p, c){
  const r = compat(p, c);
  const owned = (c?.parts||[]).includes(p.id);
  const wi = PART_IMG[p.id] && AIMG['wheel-'+PART_IMG[p.id]];
  const thumb = wi
    ? `<img src="${wi}" alt="" style="position:absolute;top:6%;left:50%;transform:translateX(-50%);height:88%;width:auto">`
    : `${ic(CAT_IC[p.cat]||'box',40)}<span class="cn">${esc(PART_CATS.find(x=>x.id===p.cat)?.name||'')}</span>`;
  const fit = [p.fit?.eng?.length?`${p.fit.eng.length} 種引擎`:'', p.fit?.body?.length?p.fit.body.map(b=>bodyById(b)?.name.replace(/^\d門\s*/,'')).join(' / '):'']
    .filter(Boolean).join(' · ') || '全車系適用';
  const spec = Object.entries(p.spec||{}).slice(0,1).map(([k,v])=>`${k} ${v}`)[0] || '';
  return `<div class="pcard">
    <div class="ph">${thumb}</div>
    <div class="bd">
      <div class="t-cap">${esc(p.brand)}</div>
      <h4>${esc(p.name)}</h4>
      <div class="t-cap">${esc(fit)}${spec?' · '+esc(spec):''}</div>
      <div>${lvSt(r.lv)}</div>
      <div class="price">${range(p.price[0]+p.labor[0], p.price[1]+p.labor[1])}</div>
      <div class="btnrow" style="margin-top:8px">
        <button class="btn sm" onclick="showPart('${p.id}')">查看詳情</button>
        ${c?`<button class="btn sm" onclick="toggleOwn('${p.id}')" ${owned?'style="color:var(--green)"':''}>
          ${owned?'✓ 已安裝':'標記已裝'}</button>`:''}
      </div>
    </div>
  </div>`;
}

function toggleOwn(id){
  const c = car(); if(!c) return;
  c.parts = c.parts||[];
  c.parts = c.parts.includes(id) ? c.parts.filter(x=>x!==id) : [...c.parts, id];
  saveDB(); render();
}

function showPart(id){
  const p = PARTS.find(x=>x.id===id), c = car(); if(!p) return;
  const r = compat(p,c);
  modal({title:p.name, wide:true, body:`
    <div class="row" style="gap:var(--s3);margin-bottom:var(--s3)">${lvSt(r.lv)} ${confSt(p.conf)}
      <span class="chip">${esc(p.brand)}</span>${p.pn?`<span class="chip">${esc(p.pn)}</span>`:''}</div>
    <div class="summary" style="grid-template-columns:repeat(3,minmax(0,1fr));margin-bottom:var(--s3)">
      <div class="it"><div class="lb">零件費（估）</div><div class="vl" style="font-size:18px">${range(p.price[0],p.price[1])}</div></div>
      <div class="it"><div class="lb">安裝工資（估）</div><div class="vl" style="font-size:18px">${range(p.labor[0],p.labor[1])}</div></div>
      <div class="it"><div class="lb">合計（估）</div><div class="vl" style="font-size:18px">${range(p.price[0]+p.labor[0],p.price[1]+p.labor[1])}</div></div>
    </div>
    ${Object.keys(p.spec||{}).length?`<h4 class="t-card">規格</h4>
      <div style="margin-bottom:var(--s3)">${Object.entries(p.spec).map(([k,v])=>
        `<div class="kv"><span>${esc(k)}</span><b>${esc(v)}</b></div>`).join('')}</div>`:''}
    <h4 class="t-card">相容性判斷依據</h4>${reasonList(r.R)}
    ${p.req?.length?`<h4 class="t-card" style="margin-top:var(--s3)">前置條件與必要配套</h4>
      <div class="rows">${p.req.map(q=>`<div class="row" style="padding:10px 0;font-size:14px">${esc(q)}</div>`).join('')}</div>`:''}
    <h4 class="t-card" style="margin-top:var(--s3)">安裝後的影響</h4>
    ${IMPACT_KEYS.map(x=>{const rs=(p.impact?.[x.k])||[]; if(!rs.length) return '';
      return `<details class="dd"><summary>${x.n}<span class="mut" style="margin-left:auto;font-size:14px">${rs.length}</span></summary>
        <div class="in">${rs.map(t=>`<div style="font-size:14px;padding:4px 0">${esc(t)}</div>`).join('')}</div></details>`;}).join('')
      || '<p class="t-cap">此零件尚未建立影響分析資料。</p>'}
    ${p.note?`<div class="note b" style="margin-top:var(--s3)">${esc(p.note)}</div>`:''}
    ${p.warn?`<div class="note r" style="margin-top:var(--s2)">${esc(p.warn)}</div>`:''}
    ${srcLine(p.src)}`,
    footer:`<button class="btn" onclick="closeModal()">關閉</button>
            ${c?`<button class="btn pri" onclick="closeModal();addToProject('${p.id}')">加入施工專案</button>`:''}`});
}

/* ---------------- 我的方案 ---------------- */
function pgPlans(){
  const c = car(); if(!c) return needCar();
  const plans = c.plans||[];
  if(!plans.length) return `<div class="card"><div class="empty">${ic('file',44)}
    <p>還沒有改裝方案<br><span class="t-cap">在設計預覽調整外觀與零件後，按「儲存成方案」就能存起來比較</span></p>
    <button class="btn pri" onclick="nav('build/design')">前往設計預覽</button></div></div>`;
  return `<div class="grid g2">${plans.map(p=>{
    const s = planSummary(p.parts||[], c);
    return `<div class="card" style="padding:0;overflow:hidden">
      ${p.build?`<div class="stage crop">${carPhoto(p.build,{bodyId:c.bodyId,uid:'pl'+p.id})}</div>`:''}
      <div style="padding:var(--s3)">
        <h3 class="t-card">${esc(p.name)}</h3>
        <p class="t-cap" style="margin:4px 0 0">${esc(p.at)}${p.desc?' · '+esc(p.desc):''}</p>
        <div class="summary" style="grid-template-columns:repeat(2,minmax(0,1fr));margin-top:var(--s2)">
          <div class="it"><div class="lb">合計預估</div><div class="vl" style="font-size:19px">${range(s.totLo,s.totHi)}</div></div>
          <div class="it"><div class="lb">驗車風險</div><div class="vl" style="font-size:17px;padding-top:4px">
            <span class="st ${s.risk==='高'?'r':s.risk==='低'?'g':'y'}">${s.risk}</span></div></div>
        </div>
        ${s.n?`<div class="t-cap" style="margin-top:var(--s2)">${s.n} 項零件 ·
          可直上 ${s.green}／需調整 ${s.yellow}／不建議 ${s.red}</div>`:''}
        <div class="btnrow" style="margin-top:var(--s2)">
          <button class="btn sm" onclick="loadPlan('${p.id}')">載入設計室</button>
          <button class="btn sm" onclick="planToProject('${p.id}')">轉成施工專案</button>
          <button class="btn dgr" style="margin-left:auto" onclick="delPlan('${p.id}')">刪除</button>
        </div>
      </div></div>`;}).join('')}</div>`;
}
function delPlan(id){ const c=car(); c.plans=c.plans.filter(p=>p.id!==id); saveDB(); render(); toast('已刪除方案'); }
function loadPlan(id){
  const c=car(), p=c.plans.find(x=>x.id===id); if(!p) return;
  if(p.build) c.build = structuredClone(p.build);
  saveDB(); nav('build/design'); toast('已載入方案');
}

/* ---------------- 方案比較 ---------------- */
function pgCompare(){
  const c = car(); if(!c) return needCar();
  const plans = c.plans||[];
  if(plans.length<1) return `<div class="card"><div class="empty">${ic('chart',44)}
    <p>需要先儲存方案才能比較</p><button class="btn pri" onclick="nav('build/design')">前往設計預覽</button></div></div>`;
  const sums = plans.map(p=>({p, s:planSummary(p.parts||[], c)}));
  const rows = [
    ['零件費用', x=>range(x.s.partLo,x.s.partHi)],
    ['安裝工資', x=>range(x.s.laborLo,x.s.laborHi)],
    ['合計預估', x=>`<b>${range(x.s.totLo,x.s.totHi)}</b>`],
    ['零件項目', x=>x.s.n+' 項'],
    ['馬力變化', x=>x.s.hpHi?`+${x.s.hpLo}–${x.s.hpHi} hp`:'—'],
    ['重量變化', x=>(x.s.kgLo||x.s.kgHi)?`${x.s.kgLo} – ${x.s.kgHi} kg`:'—'],
    ['車高變化', x=>x.p.build?.drop?`-${x.p.build.drop} mm`:'原廠'],
    ['輪圈胎規', x=>x.p.build?`${x.p.build.size}″ ${x.p.build.tireW}/${x.p.build.tireAR}`:'—'],
    ['相容性', x=>`<span class="st g">${x.s.green}</span> <span class="st y">${x.s.yellow}</span> <span class="st r">${x.s.red}</span>`],
    ['驗車風險', x=>`<span class="st ${x.s.risk==='高'?'r':x.s.risk==='低'?'g':'y'}">${x.s.risk}</span>`],
    ['舒適度', x=>{const d=x.p.build?.drop||0, ar=x.p.build?.tireAR||60;
      const sc=(d>=50?3:d>=30?2:d>0?1:0)+(ar<=35?3:ar<=40?2:ar<=50?1:0);
      return sc>=5?'低':sc>=3?'中':sc>=1?'較高':'原廠';}],
  ];
  return `<div class="card flush" style="overflow-x:auto">
    <table class="tb" style="min-width:${200+sums.length*160}px">
      <thead><tr><th style="min-width:120px"></th>
        ${sums.map(x=>`<th style="min-width:150px;color:var(--tx);font-size:15px;font-weight:600">${esc(x.p.name)}</th>`).join('')}</tr></thead>
      <tbody>${rows.map(([n,f])=>`<tr><td class="mut">${n}</td>
        ${sums.map(x=>`<td class="num">${f(x)}</td>`).join('')}</tr>`).join('')}</tbody>
    </table></div>
  ${sums.some(x=>x.s.legal.length)?`<div class="card">
    <h3 class="t-card">法規注意事項</h3>
    <div class="rows" style="margin-top:var(--s1)">${sums.flatMap(x=>x.s.legal.map(l=>
      `<div class="row" style="align-items:flex-start;padding:10px 0"><span class="st y" style="margin-top:4px"></span>
       <div class="gr" style="font-size:14px">${esc(x.p.name)}：${esc(l)}</div></div>`)).join('')}</div></div>`:''}`;
}

/* ---------------- 施工專案 ---------------- */
const PROJ_ST = [
  {id:'todo',n:'尚未購買',k:''},{id:'bought',n:'已購買',k:''},{id:'waiting',n:'等待到貨',k:''},
  {id:'arrived',n:'已到貨',k:'b'},{id:'queued',n:'等待安裝',k:'b'},{id:'installing',n:'安裝中',k:'y'},
  {id:'done',n:'已完成',k:'g'},{id:'rework',n:'需要返工',k:'r'},{id:'removed',n:'已拆除',k:''},{id:'sold',n:'已出售',k:''},
];
const COST_KEYS = [['part','零件費'],['labor','工資'],['paint','烤漆加工'],['ship','運費'],['tax','關稅'],['other','其他']];

function pgProject(){
  const c = car(); if(!c) return needCar();
  const proj = c.project||[];
  if(!proj.length) return `<div class="card"><div class="empty">${ic('file',44)}
    <p>還沒有施工項目<br><span class="t-cap">改裝通常不是一次做完 — 用這裡追蹤購買、到貨與施工進度</span></p>
    <button class="btn pri" onclick="addToProject()">${ic('plus',18)} 新增項目</button></div></div>`;
  const done = proj.filter(p=>p.st==='done').length;
  const spent = proj.reduce((s,p)=>s+(+p.paid||0),0);
  const est = proj.reduce((s,p)=>s+(+p.est||0),0);
  const tot = k => proj.reduce((s,p)=>s+(+((p.cost||{})[k])||0),0);
  return `
  <div class="card">
    <div class="summary">
      <div class="it"><div class="lb">預估總預算</div><div class="vl" style="font-size:21px">${money(est)}</div></div>
      <div class="it"><div class="lb">已花費</div><div class="vl" style="font-size:21px">${money(spent)}</div></div>
      <div class="it"><div class="lb">尚需支付</div><div class="vl" style="font-size:21px">${money(Math.max(0,est-spent))}</div></div>
      <div class="it"><div class="lb">完成度</div><div class="vl">${Math.round(done/proj.length*100)}<small>%</small></div></div>
    </div>
    <details class="dd" style="margin-top:var(--s3);border-top:1px solid var(--line)">
      <summary class="mut">費用結構</summary>
      <div class="in">${COST_KEYS.map(([k,n])=>`<div class="kv"><span>${n}</span><b>${money(tot(k))}</b></div>`).join('')}</div>
    </details>
  </div>
  <div class="card">
    <h3 class="t-card">施工項目</h3>
    <div class="rows" style="margin-top:var(--s2)">
      ${proj.map((p,i)=>{
        const pt = PARTS.find(x=>x.id===p.pid), st = PROJ_ST.find(s=>s.id===p.st)||PROJ_ST[0];
        return `<div class="row" style="align-items:flex-start">
          <div class="gr">
            <div style="font-weight:500">${esc(pt?pt.name:p.name||'—')}</div>
            <div class="t-cap"><span class="st ${st.k}">${st.n}</span>${p.shop?' · '+esc(p.shop):''}${p.date?' · '+esc(p.date):''}</div>
          </div>
          <div class="rt">
            <div class="num">${p.paid?money(p.paid):`<span class="mut">預估 ${money(p.est)}</span>`}</div>
            <button class="btn txt" onclick="editProj(${i})">編輯</button>
          </div></div>`;}).join('')}
    </div>
  </div>`;
}

function addToProject(pid){
  const c = car(); if(!c) return;
  const p = pid ? PARTS.find(x=>x.id===pid) : null;
  const est = p ? Math.round((p.price[0]+p.price[1]+p.labor[0]+p.labor[1])/2) : 0;
  modal({title:'新增施工項目', body:`
    <div class="fld"><label>項目</label>
      ${p ? `<input class="inp" value="${esc(p.name)}" disabled>` :
        `<select class="inp" id="pj_pid"><option value="">自訂項目</option>
          ${PARTS.map(x=>`<option value="${x.id}">${esc(x.name)}（${esc(x.brand)}）</option>`).join('')}</select>
         <input class="inp" id="pj_name" placeholder="自訂項目名稱" style="margin-top:8px">`}</div>
    <div class="grid g2" style="gap:var(--s2)">
      <div class="fld"><label>預估總金額</label><input class="inp" id="pj_est" type="number" value="${est}"></div>
      <div class="fld"><label>狀態</label><select class="inp" id="pj_st">
        ${PROJ_ST.map(s=>`<option value="${s.id}">${s.n}</option>`).join('')}</select></div>
    </div>
    <div class="fld"><label>店家</label><input class="inp" id="pj_shop"></div>
    <div class="fld"><label>備註</label><textarea class="inp" id="pj_note"></textarea></div>`,
    footer:`<button class="btn" onclick="closeModal()">取消</button>
            <button class="btn pri" onclick="doAddProj('${pid||''}')">新增</button>`});
}
function doAddProj(pid){
  const c = car();
  c.project = c.project||[];
  c.project.push({id:uid(), pid:($('#pj_pid')?.value || pid || ''), name:$('#pj_name')?.value||'',
    est:+$('#pj_est').value||0, paid:0, st:$('#pj_st').value, shop:$('#pj_shop').value,
    note:$('#pj_note').value, date:today(), cost:{}});
  saveDB(); closeModal(); nav('build/project'); render(); toast('已加入施工專案');
}
function editProj(i){
  const c = car(), p = c.project[i], pt = PARTS.find(x=>x.id===p.pid);
  modal({title:pt?pt.name:(p.name||'施工項目'), wide:true, body:`
    <div class="grid g2">
      <div>
        <div class="fld"><label>狀態</label><select class="inp" id="e_st">
          ${PROJ_ST.map(s=>`<option value="${s.id}" ${p.st===s.id?'selected':''}>${s.n}</option>`).join('')}</select></div>
        <div class="fld"><label>預估總金額</label><input class="inp" id="e_est" type="number" value="${p.est||0}"></div>
        <div class="fld"><label>實際已付</label><input class="inp" id="e_paid" type="number" value="${p.paid||0}"></div>
        <div class="fld"><label>店家</label><input class="inp" id="e_shop" value="${esc(p.shop||'')}"></div>
        <div class="fld"><label>日期</label><input class="inp" id="e_date" type="date" value="${esc(p.date||today())}"></div>
      </div>
      <div><div class="t-cap" style="margin-bottom:6px">費用明細</div>
        ${COST_KEYS.map(([k,n])=>`<div class="fld"><label>${n}</label>
          <input class="inp" id="e_c_${k}" type="number" value="${(p.cost||{})[k]||0}"></div>`).join('')}</div>
    </div>
    <div class="fld"><label>備註</label><textarea class="inp" id="e_note">${esc(p.note||'')}</textarea></div>`,
    footer:`<button class="btn dgr" onclick="delProj(${i})">刪除項目</button>
            <button class="btn" style="margin-left:auto" onclick="closeModal()">取消</button>
            <button class="btn pri" onclick="saveProj(${i})">儲存</button>`});
}
function saveProj(i){
  const c = car(), p = c.project[i];
  p.st=$('#e_st').value; p.est=+$('#e_est').value||0; p.paid=+$('#e_paid').value||0;
  p.shop=$('#e_shop').value; p.date=$('#e_date').value; p.note=$('#e_note').value;
  p.cost={}; COST_KEYS.forEach(([k])=>p.cost[k]=+$('#e_c_'+k).value||0);
  const sum = Object.values(p.cost).reduce((a,b)=>a+b,0);
  if(sum && !p.paid) p.paid = sum;
  saveDB(); closeModal(); render(); toast('已儲存');
}
function delProj(i){ const c=car(); c.project.splice(i,1); saveDB(); closeModal(); render(); toast('已刪除'); }

function planToProject(id){
  const c = car(), pl = c.plans.find(p=>p.id===id); if(!pl) return;
  c.project = c.project||[];
  let n = 0;
  (pl.parts||[]).forEach(pid=>{
    if(c.project.some(x=>x.pid===pid)) return;
    const p = PARTS.find(x=>x.id===pid); if(!p) return;
    c.project.push({id:uid(), pid, name:'', est:Math.round((p.price[0]+p.price[1]+p.labor[0]+p.labor[1])/2),
      paid:0, st:'todo', shop:'', note:'', date:today(), cost:{}});
    n++;
  });
  if(pl.build) c.build = structuredClone(pl.build);
  saveDB(); nav('build/project'); toast(`已匯入 ${n} 個項目`);
}
