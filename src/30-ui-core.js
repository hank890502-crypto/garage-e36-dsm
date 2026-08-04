/* ==========================================================================
   UI 核心：設計系統元件、五段式導覽、頁內分頁、主題
   ========================================================================== */
const $  = (s,r=document)=>r.querySelector(s);
const $$ = (s,r=document)=>[...r.querySelectorAll(s)];
const esc = s => String(s??'').replace(/[&<>"']/g, m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const nf  = n => (n==null||isNaN(n)) ? '—' : Math.round(n).toLocaleString('en-US');
const money = n => (n==null||isNaN(n)) ? '—' : 'NT$'+Math.round(n).toLocaleString('en-US');
const range = (a,b,f=money) => (a===b) ? f(a) : `${f(a)} – ${f(b)}`;
const today = () => new Date().toISOString().slice(0,10);

/* ---------- 介面偏好（與車輛資料分開存，不動原有資料格式） ---------- */
const UIKEY = 'e36garage.ui';
let UI = {theme:'light', snackDismissed:{}};
try{ Object.assign(UI, JSON.parse(localStorage.getItem(UIKEY)||'{}')); }catch(e){}
function saveUI(){ try{ localStorage.setItem(UIKEY, JSON.stringify(UI)); }catch(e){} }
function applyTheme(){
  const t = UI.theme==='auto'
    ? (matchMedia('(prefers-color-scheme:dark)').matches ? 'dark' : 'light')
    : UI.theme;
  document.documentElement.dataset.theme = t;
  const m = $('meta[name=theme-color]'); if(m) m.content = t==='dark' ? '#10130F' : '#D9DDD8';
}
applyTheme();
matchMedia('(prefers-color-scheme:dark)').addEventListener('change',()=>{ if(UI.theme==='auto') applyTheme(); });

/* ---------- 圖示 ---------- */
const IC = {
  home:'M3 10.6 12 3.5l9 7.1M5.4 9.4V20a1 1 0 0 0 1 1h11.2a1 1 0 0 0 1-1V9.4',
  car:'M5 16.5h14M6.5 16.5V19a1 1 0 0 1-1 1h-1a1 1 0 0 1-1-1v-2.5m14 0V19a1 1 0 0 0 1 1h1a1 1 0 0 0 1-1v-2.5M3.5 16.5l1.2-5.2A2 2 0 0 1 6.6 9.7h10.8a2 2 0 0 1 1.9 1.6l1.2 5.2M6.5 13.5h11',
  wand:'M15 4V2m0 20v-2M9 6l1.5 1.5M3 12h2M5 19l1.5-1.5M19 5l-1.5 1.5M4 4l16 16',
  wrench:'M14.5 5.5a4 4 0 0 0 5 5l-9 9a2.5 2.5 0 0 1-3.5-3.5z',
  dots:'M5 12h.01M12 12h.01M19 12h.01',
  search:'M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16zM21 21l-4.3-4.3',
  plus:'M12 5v14M5 12h14',
  alert:'M12 9v4.5m0 3.5h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z',
  chart:'M4 20V10m5 10V4m5 16v-7m5 7V8',
  book:'M4 4.5A1.5 1.5 0 0 1 5.5 3H19v18H5.5A1.5 1.5 0 0 1 4 19.5zM8 3v18',
  scale:'M12 3v18M5 8h14M7 8l-3 6a3 3 0 0 0 6 0zM17 8l-3 6a3 3 0 0 0 6 0z',
  file:'M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8zM14 3v5h5',
  box:'M21 8.5v7l-9 5-9-5v-7l9-5zM3 8.5l9 5 9-5M12 13.5V21',
  gauge:'M12 14a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM13.4 10.6 19 5M3.5 18a10 10 0 1 1 17 0',
  calendar:'M4 6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v13a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1zM4 9.5h16M8 3v3M16 3v3',
  droplet:'M12 3s6 6.4 6 10.5a6 6 0 0 1-12 0C6 9.4 12 3 12 3z',
  target:'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 16.5a4.5 4.5 0 1 0 0-9 4.5 4.5 0 0 0 0 9zM12 13a1 1 0 1 0 0-2 1 1 0 0 0 0 2z',
  paint:'M19 11H5V5.5A2.5 2.5 0 0 1 7.5 3h9A2.5 2.5 0 0 1 19 5.5zM12 11v4M10.5 15h3v6h-3z',
  disc:'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z',
  arrows:'M8 7 4 11l4 4M4 11h16M16 17l4-4-4-4',
  wind:'M3 8h11a3 3 0 1 0-3-3M3 12h15a3 3 0 1 1-3 3M3 16h8',
  sun:'M12 17a5 5 0 1 0 0-10 5 5 0 0 0 0 10zM12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4',
  eye:'M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7-10-7-10-7zM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z',
  shield:'M12 3 4 6v6c0 5 3.4 8.4 8 9 4.6-.6 8-4 8-9V6z',
  sofa:'M4 12V8a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v4M3 12h18v6H3zM6 18v2M18 18v2',
  clock:'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 7v5l3 2',
  down:'M12 4v13m0 0 5-5m-5 5-5-5M4 20h16',
  up:'M12 20V7m0 0 5 5m-5-5-5 5M4 4h16',
  trash:'M4 7h16M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2M6.5 7l1 13a1 1 0 0 0 1 1h7a1 1 0 0 0 1-1l1-13',
  edit:'M4 20h4l11-11-4-4L4 16zM13.5 6.5l4 4',
  back:'M15 5l-7 7 7 7',
  fwd:'M9 5l7 7-7 7',
  filter:'M4 6h16M7 12h10M10 18h4',
  check:'M4.5 12.5 9.5 17.5 19.5 6.5',
  circle:'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z',
  orbit:'M4.9 6.8A8.5 8.5 0 1 1 3.5 14M4.9 6.8V3m0 3.8h3.8M12 8v4l2.7 2',
};
const ic = (n,s=20)=>`<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="${IC[n]||IC.circle}"/></svg>`;

/* ---------- 通用元件 ---------- */
function toast(msg){
  const d = document.createElement('div'); d.className='tst'; d.textContent = msg;
  $('#toast').appendChild(d);
  setTimeout(()=>{ d.style.opacity='0'; d.style.transition='.3s'; setTimeout(()=>d.remove(),320); }, 2400);
}
function modal({title, body, footer, wide}){
  const root = $('#modalRoot');
  root.innerHTML = `<div class="mask"><div class="modal${wide?' wide':''}">
    <header><h3>${esc(title)}</h3><button data-x aria-label="關閉">✕</button></header>
    <div class="bd">${body}</div>${footer?`<footer>${footer}</footer>`:''}</div></div>`;
  const close = ()=>{ root.innerHTML=''; };
  root.querySelector('[data-x]').onclick = close;
  root.querySelector('.mask').onclick = e => { if(e.target===root.querySelector('.mask')) close(); };
  return {close};
}
const closeModal = ()=>{ $('#modalRoot').innerHTML=''; };

function snack(id, html, actions){
  if(UI.snackDismissed[id]) return;
  const d = document.createElement('div'); d.className='snk';
  d.innerHTML = html + `<div class="btnrow">${actions||''}
    <button class="btn txt" data-dismiss style="margin-left:auto">知道了</button></div>`;
  d.querySelector('[data-dismiss]').onclick = ()=>{ UI.snackDismissed[id]=1; saveUI(); d.remove(); };
  $('#snack').appendChild(d);
}

const stDot = lv => ({g:'g',y:'y',r:'r',n:''}[lv] ?? '');
const LV_TEXT = {g:'可直接安裝', y:'需要調整', r:'不建議安裝', n:'資料不足'};
const lvSt = lv => `<span class="st ${stDot(lv)}">${LV_TEXT[lv]||LV_TEXT.n}</span>`;
const CONF_TEXT = {manual:'原廠手冊', oem:'原廠文件', vendor:'專業零件商', community:'社群彙整', unverified:'尚未驗證'};
function confSt(c){
  const k = (c==='manual'||c==='oem') ? 'g' : c==='vendor' ? 'b' : c==='community' ? 'y' : '';
  return `<span class="st ${k}">${CONF_TEXT[c]||'—'}</span>`;
}
function srcLine(key, extra){
  if(!key || !SRC[key]) return extra ? `<div class="src">${esc(extra)}</div>` : '';
  const [n,u] = SRC[key];
  return `<div class="src">來源：${u?`<a href="${u}" target="_blank" rel="noopener">${esc(n)}</a>`:esc(n)}${extra?' · '+esc(extra):''}</div>`;
}
function reasonList(R){
  return `<div class="rows">${R.map(r=>{
    const k = r.k==='i' ? '' : stDot(r.k);
    return `<div class="row" style="align-items:flex-start;padding:11px 0">
      <span class="st ${k}" style="margin-top:4px"></span>
      <div class="gr" style="font-size:14px;line-height:1.55">${esc(r.t)}</div></div>`;}).join('')}</div>`;
}

/* ---------- 導覽 ---------- */
const NAV = [
  {id:'overview', name:'總覽', ic:'home', sub:'現在最需要處理的事'},
  {id:'mycar', name:'我的車', ic:'car', sub:'車輛資料與履歷', tabs:[
    {id:'info', name:'車輛資料'}, {id:'spec', name:'原廠規格'},
    {id:'parts', name:'已安裝零件'}, {id:'history', name:'保養履歷'},
    {id:'fuel', name:'加油'}]},
  {id:'build', name:'改裝', ic:'wand', sub:'設計、選件與施工規劃', tabs:[
    {id:'design', name:'設計預覽'}, {id:'catalog', name:'零件庫'},
    {id:'plans', name:'我的方案'}, {id:'compare', name:'方案比較'}, {id:'project', name:'施工專案'}]},
  {id:'lap', name:'計時', ic:'clock', sub:'賽道圈速與改裝驗證', tabs:[
    {id:'timer', name:'計時器'}, {id:'records', name:'成績'},
    {id:'tracks', name:'場地'}, {id:'compare', name:'改裝對比'}]},
  {id:'service', name:'維修', ic:'wrench', sub:'原廠數據與故障排除', tabs:[
    {id:'manual', name:'維修手冊'}, {id:'oem', name:'原廠數據'},
    {id:'fault', name:'故障診斷'}, {id:'maint', name:'保養提醒'}]},
  {id:'more', name:'更多', ic:'dots', sub:'', tabs:[
    {id:'legal', name:'法規與驗車'}, {id:'data', name:'資料備份'}, {id:'settings', name:'設定'}]},
];
let SEC = 'overview', TAB = '';

function parseHash(){
  const [s,t] = (location.hash||'#overview').slice(1).split('/');
  const sec = NAV.find(n=>n.id===s) || NAV[0];
  SEC = sec.id;
  TAB = sec.tabs ? (sec.tabs.some(x=>x.id===t) ? t : sec.tabs[0].id) : '';
}
function nav(route){ location.hash = '#'+route; }
window.addEventListener('hashchange', ()=>{ parseHash(); render(); $('#view').scrollTop = 0; });

const PAGES = {
  'overview':        pgOverview,
  'mycar/info':      pgCarInfo,
  'mycar/spec':      pgCarSpec,
  'mycar/parts':     pgCarParts,
  'mycar/history':   pgHistory,
  'mycar/fuel':      pgFuel,
  'build/design':    pgDesign,
  'build/catalog':   pgCatalog,
  'build/plans':     pgPlans,
  'build/compare':   pgCompare,
  'build/project':   pgProject,
  'lap/timer':       pgLapTimer,
  'lap/records':     pgLapRecords,
  'lap/tracks':      pgLapTracks,
  'lap/compare':     pgLapCompare,
  'service/manual':  pgManual,
  'service/oem':     pgOem,
  'service/fault':   pgFault,
  'service/maint':   pgMaint,
  'more/legal':      pgLegal,
  'more/data':       pgData,
  'more/settings':   pgSettings,
};

function render(){
  disposeCarScenes();
  const sec = NAV.find(n=>n.id===SEC);
  const key = TAB ? `${SEC}/${TAB}` : SEC;
  $('#top').dataset.screen = `G-SYS // ${sec.id.toUpperCase()} / ${TAB ? TAB.toUpperCase() : 'STATUS'}`;

  $('#nav').innerHTML = NAV.map(n=>
    `<a href="#${n.id}" class="${n.id===SEC?'on':''}">${ic(n.ic,20)}<span>${n.name}</span></a>`).join('');
  $('#tabbar').innerHTML = NAV.map(n=>
    `<a href="#${n.id}" class="${n.id===SEC?'on':''}">${ic(n.ic,23)}<span>${n.name}</span></a>`).join('');
  $('#sidefoot').innerHTML = DB.cars.length>1
    ? `<button class="btn blk sm" onclick="pickCar()">切換車輛</button>` : '';
  const activeCar = car();
  $('#brandSub').textContent = activeCar
    ? (platOf(activeCar)==='dsm2g' ? 'Mitsubishi Eclipse 2G · 1995–1999' : 'BMW E36 · 1990–2000')
    : 'BMW E36 / Eclipse 2G';

  $('#ttl').textContent = sec.id==='overview' ? greet() : sec.name;
  $('#sub').textContent = sec.id==='overview' ? carSubtitle() : (sec.sub||'');
  $('#acts').innerHTML = topActions(key);
  $('#tabs').innerHTML = sec.tabs
    ? `<div class="seg">${sec.tabs.map(t=>
        `<button class="${t.id===TAB?'on':''}" onclick="nav('${sec.id}/${t.id}')">${t.name}</button>`).join('')}</div>`
    : '';

  const fn = PAGES[key] || PAGES['overview'];
  /* 錯誤邊界：任何一頁炸掉都不該變成整片白，要把錯誤講出來並留一條退路 */
  try{
    $('#view').innerHTML = `<div class="wrap">${fn()}</div>`;
  }catch(err){
    console.error('[render]', key, err);
    $('#view').innerHTML = `<div class="wrap"><div class="card">
      <h3 class="t-card" style="color:var(--red)">這一頁載入失敗</h3>
      <p class="t-cap" style="margin:var(--s2) 0 0">頁面：<code>${esc(key)}</code></p>
      <div class="note r" style="margin-top:var(--s2)"><b>${esc(err&&err.message||String(err))}</b></div>
      <details class="dd" style="margin-top:var(--s2)"><summary class="mut">技術細節</summary>
        <div class="in"><pre style="font-size:12px;white-space:pre-wrap;overflow-x:auto">${esc(err&&err.stack||'')}</pre></div></details>
      <div class="note" style="margin-top:var(--s2)">多半是舊版存下來的車輛資料缺了新欄位。
        先「匯出備份」保住資料，再用下面的按鈕修補，通常就會好。</div>
      <div class="btnrow" style="margin-top:var(--s3)">
        <button class="btn" onclick="exportJSON()">匯出備份</button>
        <button class="btn pri" onclick="repairDB()">修補資料</button>
      </div></div></div>`;
  }
  afterCarScenes();
  if(key==='build/design') afterDesign();
  if(key==='lap/timer') afterLapTimer();
  lapLeave(key);          // 離開計時頁時停掉畫面更新；GPS 與計時本身會繼續
  storageSnack();
}

function greet(){
  const h = new Date().getHours();
  const c = car();
  const carName = !c ? '車庫' : platOf(c)==='dsm2g' ? 'Eclipse 2G' : 'BMW E36';
  return (h<5?'夜深了':h<11?'早安':h<18?'午安':'晚安') + `，這是你的 ${carName}`;
}
function carSubtitle(){
  const c = car(); if(!c) return '先建立一台車，開始使用';
  const m = mdlById(c.modelId), b = bodyById(c.bodyId), e = carEngine(c);
  return [c.year, m&&m.name, b&&b.name.replace(/^\d門\s*/,''), e&&e.name].filter(Boolean).join(' · ');
}

/* 每個畫面最多一個主要按鈕 */
function topAct(label, handler, icon='plus'){
  return `<button class="btn pri top-act" aria-label="${esc(label)}" title="${esc(label)}" onclick="${handler}">
    ${ic(icon,18)}<span class="act-label">${esc(label)}</span></button>`;
}
function topActions(key){
  const c = car();
  const pick = DB.cars.length>1
    ? `<button class="btn sm" onclick="pickCar()">${esc(carLabel(c)).slice(0,10)} ⌄</button>` : '';
  if(!c) return topAct('建立車輛','editCar()');
  const map = {
    'overview':      pick + topAct('新增保養紀錄','editLog()'),
    'mycar/info':    pick + topAct('編輯車輛','editCar(DB.cur)','edit'),
    'mycar/history': pick + topAct('新增紀錄','editLog()'),
    'build/design':  pick + topAct('儲存成方案','savePlan()','check'),
    'build/plans':   pick + topAct('新增方案',"nav('build/design')"),
    'build/project': pick + topAct('新增項目','addToProject()'),
    'service/maint': pick + topAct('新增紀錄','editLog()'),
  };
  return map[key] ?? pick;
}

function pickCar(){
  modal({title:'切換車輛', body:`<div class="rows">${DB.cars.map(c=>`
    <button class="row" style="width:100%;background:transparent;border:0;cursor:pointer;text-align:left;padding:14px 0"
            onclick="DB.cur='${c.id}';saveDB();closeModal();render()">
      <div class="gr"><div style="font-weight:500">${esc(carLabel(c))}</div>
        <div class="t-cap">${esc([mdlById(c.modelId)?.name, nf(c.km)+' km'].filter(Boolean).join(' · '))}</div></div>
      ${c.id===DB.cur?`<span style="color:var(--blue)">${ic('check',20)}</span>`:''}
    </button>`).join('')}</div>`,
    footer:`<button class="btn" onclick="closeModal();editCar()">新增車輛</button>`});
}

function needCar(msg='先建立一台車'){
  return `<div class="card"><div class="empty">${ic('car',44)}
    <p>${esc(msg)}<br><span class="t-cap">建立後，改裝方案、保養提醒與相容性判斷都會綁定這台車</span></p>
    <button class="btn pri" onclick="editCar()">${ic('plus',18)} 建立車輛</button></div></div>`;
}

function storageSnack(){
  if(LS_OK || UI.snackDismissed.ls) return;
  if($('#snack').childElementCount) return;
  snack('ls', `<b>資料只存在這個分頁</b><br>目前無法寫入瀏覽器本機儲存，關掉視窗資料就會消失。`,
    `<button class="btn sm pri" onclick="exportJSON()">立即備份</button>`);
}

/* 把舊版存下來的車輛補上新欄位，避免缺欄位造成整頁炸掉 */
function repairDB(){
  const blank = blankCar();
  let n = 0;
  DB.tracks = DB.tracks || [];
  (DB.cars||[]).forEach(c=>{
    Object.keys(blank).forEach(k=>{
      if(k==='id') return;
      if(c[k]===undefined){ c[k] = structuredClone(blank[k]); n++; }
    });
    c.build = Object.assign(structuredClone(blank.build), c.build||{});
    ['parts','logs','fuelLogs','plans','project'].forEach(k=>{ if(!Array.isArray(c[k])) c[k]=[]; });
    if(!c.plat) c.plat = 'e36';
  });
  saveDB();
  toast(n ? `已補上 ${n} 個缺少的欄位` : '資料檢查完成');
  location.hash = '#overview'; render();
}
