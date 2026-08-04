/* ==========================================================================
   圈速計時
   定位資料只留在這台裝置，不會送到任何伺服器。
   ========================================================================== */
const LAP = {
  on:false, mode:'gps', trackId:null,
  watchId:null, wake:null, tick:null,
  prev:null, fix:null, startT:null,
  laps:[], best:null, armed:false,
  err:null, sessStart:null,
  /* 分段路線（起點 → 中間點 → 終點）用的狀態 */
  splits:[], lastSplits:[], stagePos:0, refRun:null,
};

const trackById = id => (DB.tracks||[]).find(t=>t.id===id) || null;
const curTrack  = () => trackById(LAP.trackId) || (DB.tracks||[])[0] || null;
const isStage   = t => t && t.type==='stage';
/* 分段路線的感應點：起點、任意數量的中間點、終點 */
function stagePts(t){ return (t && t.pts) ? t.pts : []; }
function newStagePts(){
  return [{id:uid(), kind:'start',  name:'起點', line:null},
          {id:uid(), kind:'finish', name:'終點', line:null}];
}
/* 找出這條路線過去跑最快的一趟，拿來當即時比較的基準 */
function bestRunFor(trackId){
  const c = car(); if(!c) return null;
  let best = null;
  (c.sessions||[]).forEach(s=>{
    if(s.trackId!==trackId) return;
    (s.laps||[]).forEach(l=>{ if(best==null || l.ms<best.ms) best = l; });
  });
  return best;
}

/* ---------------- 提示音：開車時眼睛不在螢幕上 ---------------- */
let AC = null;
function beep(hz=880, ms=120){
  try{
    AC = AC || new (window.AudioContext||window.webkitAudioContext)();
    const o = AC.createOscillator(), g = AC.createGain();
    o.frequency.value = hz; o.type = 'sine';
    g.gain.setValueAtTime(.0001, AC.currentTime);
    g.gain.exponentialRampToValueAtTime(.25, AC.currentTime+.01);
    g.gain.exponentialRampToValueAtTime(.0001, AC.currentTime+ms/1000);
    o.connect(g); g.connect(AC.destination);
    o.start(); o.stop(AC.currentTime+ms/1000+.02);
  }catch(e){}
}

/* ---------------- GPS ---------------- */
function gpsSupported(){ return 'geolocation' in navigator; }

function gpsStart(onErr){
  if(LAP.watchId!=null) return true;
  if(!gpsSupported()){ LAP.err='這個瀏覽器沒有定位功能'; onErr&&onErr(); return false; }
  LAP.watchId = navigator.geolocation.watchPosition(onFix, e=>{
    LAP.err = ({1:'定位權限被拒絕。用檔案直接開啟（file://）時瀏覽器不會給定位權限，需要用 https 或本機伺服器開啟。',
                2:'目前拿不到定位訊號，請到空曠處再試。',
                3:'定位逾時。'})[e.code] || ('定位錯誤：'+e.message);
    onErr && onErr();
  }, {enableHighAccuracy:true, maximumAge:0, timeout:15000});
  return true;
}
function gpsStop(){
  if(LAP.watchId!=null){ navigator.geolocation.clearWatch(LAP.watchId); LAP.watchId=null; }
}
function onFix(p){
  const f = {lat:p.coords.latitude, lon:p.coords.longitude, t:p.timestamp,
             acc:p.coords.accuracy, spd:p.coords.speed,
             hd:(p.coords.heading!=null && !isNaN(p.coords.heading)) ? p.coords.heading : null};
  if(f.hd==null && LAP.prev) f.hd = bearing(LAP.prev, f);
  LAP.err = null;
  const before = LAP.fix; LAP.fix = f;
  if(LAP.on && LAP.mode==='gps'){
    const tr = curTrack();
    const p0 = LAP.prev || before;
    if(isStage(tr)) stageFix(p0, f, tr);
    else if(tr && tr.line){
      const ct = crossTime(p0, f, tr.line);
      if(ct!=null) onCross(ct, tr);
    }
  }
  LAP.prev = f;
  if(TRACKSET.on) tracksetPaint();
}

/* 分段路線：只比對「下一個該通過的點」，避免路線折返時誤觸發別的點 */
function stageFix(prev, cur, tr){
  const pts = stagePts(tr);
  const p = pts[LAP.stagePos];
  if(!p || !p.line) return;
  const ct = crossTime(prev, cur, p.line);
  if(ct!=null) onStagePoint(ct, tr, p, LAP.stagePos);
}
function onStagePoint(ct, tr, p, idx){
  if(p.kind==='start'){
    LAP.startT = ct; LAP.splits = []; LAP.armed = false; LAP.stagePos = idx+1;
    beep(660,90); return;
  }
  if(LAP.startT==null) return;
  const ms = ct - LAP.startT;
  if(ms < 2000) return;                            // 防彈跳
  const ref = LAP.refRun && LAP.refRun.splits ? LAP.refRun.splits[LAP.splits.length] : null;
  const delta = ref ? ms - ref.ms : null;          // 負數＝比基準快
  LAP.splits.push({name:p.name, ms, delta});

  if(p.kind==='finish'){
    const run = {n:LAP.laps.length+1, ms, splits:LAP.splits.slice()};
    LAP.laps.push(run);
    LAP.lastSplits = LAP.splits.slice();
    if(LAP.best==null || ms<LAP.best){
      LAP.best = ms; LAP.refRun = {ms, splits:run.splits}; beep(1180,200);
    } else beep(880,90);
    LAP.startT = null; LAP.stagePos = 0; LAP.armed = true; LAP.splits = [];
  }else{
    LAP.stagePos = idx+1;
    LAP.lastSplits = LAP.splits.slice();
    beep(delta!=null && delta<0 ? 1046 : 784, 90);   // 比基準快的話音高一點
  }
}
function onCross(ct, tr){
  if(LAP.startT==null){                       // 第一次過線＝開始計時
    LAP.startT = ct; LAP.armed = false; beep(660,90); return;
  }
  const ms = ct - LAP.startT;
  if(ms < (tr.minLap||20000)) return;         // 防止同一次通過被算成兩圈
  LAP.laps.push({n:LAP.laps.length+1, ms});
  if(LAP.best==null || ms<LAP.best){ LAP.best = ms; beep(1180,160); }
  else beep(880,90);
  LAP.startT = ct;
}

/* ---------------- 計時控制 ---------------- */
async function lapStart(){
  const c = car(); if(!c) return toast('先建立車輛');
  const tr = curTrack();
  const u = trackUsable(tr);
  if(!u.ok) return toast(u.why);
  if(LAP.mode==='gps'){
    if(!gpsStart(()=>lapPaint())) { lapPaint(); return; }
    LAP.armed = true; LAP.startT = null;
  }else{
    LAP.armed = false;
    LAP.startT = isStage(tr) ? null : Date.now();   // 分段路線在手動模式要另外按「開始這一趟」
  }
  LAP.on = true; LAP.laps = []; LAP.best = null; LAP.sessStart = Date.now();
  LAP.splits = []; LAP.lastSplits = []; LAP.stagePos = 0;
  /* 以這條路線過去最快的一趟當基準，第一次下場就有 +/- 可以看 */
  LAP.refRun = isStage(tr) ? bestRunFor(tr.id) : null;
  /* iOS 只允許在使用者操作中建立音訊，所以在這裡先開好，過線時才叫得出聲音 */
  try{ AC = AC || new (window.AudioContext||window.webkitAudioContext)(); AC.resume(); }catch(e){}
  try{ if('wakeLock' in navigator) LAP.wake = await navigator.wakeLock.request('screen'); }catch(e){}
  lapTickStart(); lapPaint(); lapBar();
}
/* 手動模式的分段路線：按一下開始這一趟，之後每通過一個點按一下 */
function manualStageStart(){
  LAP.startT = Date.now(); LAP.splits = []; LAP.stagePos = 1; beep(660,90); lapPaint();
}
function manualStagePoint(tr){
  const pts = stagePts(tr), p = pts[LAP.stagePos];
  if(!p) return;
  const ms = Date.now() - LAP.startT;
  if(ms < 2000) return;
  const ref = LAP.refRun && LAP.refRun.splits ? LAP.refRun.splits[LAP.splits.length] : null;
  const delta = ref ? ms - ref.ms : null;
  LAP.splits.push({name:p.name, ms, delta});
  if(p.kind==='finish'){
    const run = {n:LAP.laps.length+1, ms, splits:LAP.splits.slice()};
    LAP.laps.push(run); LAP.lastSplits = LAP.splits.slice();
    if(LAP.best==null || ms<LAP.best){ LAP.best=ms; LAP.refRun={ms,splits:run.splits}; beep(1180,200); }
    else beep(880,90);
    LAP.startT = null; LAP.stagePos = 1; LAP.splits = [];
  }else{
    LAP.stagePos++; LAP.lastSplits = LAP.splits.slice();
    beep(delta!=null && delta<0 ? 1046 : 784, 90);
  }
  lapPaint();
}
function lapManualLap(){
  if(!LAP.on || LAP.startT==null) return;
  const tr = curTrack();
  if(isStage(tr)) return manualStagePoint(tr);
  const now = Date.now(), ms = now - LAP.startT;
  if(ms < 3000) return;
  LAP.laps.push({n:LAP.laps.length+1, ms});
  if(LAP.best==null || ms<LAP.best){ LAP.best = ms; beep(1180,160); } else beep(880,90);
  LAP.startT = now; lapPaint();
}
function lapStop(){
  LAP.on = false; gpsStop(); lapTickStop();
  try{ LAP.wake && LAP.wake.release(); }catch(e){} LAP.wake = null;
  lapBar();
  if(LAP.laps.length) saveSessionPrompt();
  else { lapReset(); lapPaint(); }
}
function lapReset(){
  LAP.laps=[]; LAP.best=null; LAP.startT=null; LAP.armed=false; LAP.prev=null;
  LAP.splits=[]; LAP.lastSplits=[]; LAP.stagePos=0; LAP.refRun=null;
}

function lapTickStart(){ lapTickStop(); LAP.tick = setInterval(lapPaint, 60); }
function lapTickStop(){ if(LAP.tick){ clearInterval(LAP.tick); LAP.tick=null; } }
/* 離開計時頁時：畫面停止更新，但 GPS 與計時繼續，改用底部常駐提示 */
function lapLeave(key){
  if(key!=='lap/timer') lapTickStop();
  if(key!=='lap/tracks') tracksetStop();
  lapBar();
}
function lapBar(){
  const el = $('#lapbar'); if(!el) return;
  const show = LAP.on && !($('#lapClock'));
  el.classList.toggle('on', !!show);
  if(show) $('#lapbartx').textContent = `計時中 · ${LAP.laps.length} ${isStage(curTrack())?'趟':'圈'}`;
}

/* ---------------- 計時器畫面 ---------------- */
function pgLapTimer(){
  const c = car(); if(!c) return needCar();
  const tracks = DB.tracks||[];
  if(!tracks.length) return `<div class="card"><div class="empty">${ic('clock',44)}
    <p>還沒有任何場地<br><span class="t-cap">計時前要先設一條起跑線，程式才知道什麼時候算一圈</span></p>
    <button class="btn pri" onclick="nav('lap/tracks')">去建立場地</button></div></div>`;

  const tr = curTrack();
  const u = trackUsable(tr);
  return `
  ${u.ok?'':`<div class="card"><div class="mhd"><h3 class="t-card nm">這個場地目前不能計時</h3>
    <span class="st y">${esc(tr&&tr.kind==='event'?'封路活動':'尚未設定')}</span></div>
    <p style="margin:var(--s2) 0 0;font-size:15px;line-height:1.6">${esc(u.why)}</p>
    <div class="btnrow" style="margin-top:var(--s3)"><button class="btn" onclick="nav('lap/tracks')">去設定場地</button></div></div>`}
  <div class="card">
    <div class="btnrow" style="justify-content:space-between">
      <select class="inp" id="lapTrack" style="max-width:220px" onchange="LAP.trackId=this.value;render()"
              ${LAP.on?'disabled':''}>
        ${tracks.map(t=>`<option value="${t.id}" ${t.id===(tr&&tr.id)?'selected':''}>${esc(t.name)}</option>`).join('')}
      </select>
      <div class="seg">
        <button class="${LAP.mode==='gps'?'on':''}" onclick="if(!LAP.on){LAP.mode='gps';render()}">GPS 自動</button>
        <button class="${LAP.mode==='manual'?'on':''}" onclick="if(!LAP.on){LAP.mode='manual';render()}">${isStage(tr)?'手動按點':'手動按圈'}</button>
      </div>
    </div>

    <div class="clockwrap">
      <div class="clock idle" id="lapClock">0.000</div>
      <div class="clockdelta" id="lapDelta"></div>
    </div>

    <div class="lapstat">
      <div class="it"><div class="lb">${isStage(tr)?'趟數':'圈數'}</div><div class="vl" id="lapCount">0</div></div>
      <div class="it"><div class="lb">${isStage(tr)?'上一趟':'上一圈'}</div><div class="vl" id="lapLast">—</div></div>
      <div class="it"><div class="lb">${isStage(tr)?'最佳':'最佳圈'}</div><div class="vl" id="lapBest">—</div></div>
    </div>

    <div id="lapBtns" style="margin-top:var(--s3);display:flex;flex-direction:column;gap:var(--s1)"></div>
    <div class="gpsrow" id="gpsInfo" style="margin-top:var(--s2)"></div>
  </div>

  ${isStage(tr)?`<div class="card" id="splitCard">
    <h3 class="t-card">分段</h3>
    <div id="splitList" style="margin-top:var(--s2)"></div>
  </div>`:''}

  <div class="card" id="lapListCard">
    <h3 class="t-card">本場次</h3>
    <div id="lapList" style="margin-top:var(--s2)"></div>
  </div>`;
}

/* 只改數字，不重畫整頁，否則計時會被打斷 */
function lapPaint(){
  const clock = $('#lapClock'); if(!clock) return;
  const tr = curTrack();
  const stage = isStage(tr);
  const running = LAP.on && LAP.startT!=null;
  clock.className = 'clock ' + (running?'run':'idle');
  clock.textContent = running ? lapFmt(Date.now()-LAP.startT)
                     : (LAP.on && LAP.armed) ? (stage?'等待通過起點':'等待過線') : '0.000';

  const last = LAP.laps.length ? LAP.laps[LAP.laps.length-1].ms : null;
  const d = $('#lapDelta');
  /* 分段路線：跑的時候顯示最近一個中間點的 +/-，跑完顯示整趟與最佳的差距 */
  const liveSplit = stage && running && LAP.splits.length ? LAP.splits[LAP.splits.length-1] : null;
  if(liveSplit && liveSplit.delta!=null){
    d.textContent = `${liveSplit.name} ${deltaFmt(liveSplit.delta)}`;
    d.className = 'clockdelta ' + (liveSplit.delta>0?'up':'dn');
  } else if(liveSplit){
    d.textContent = `${liveSplit.name} ${lapFmt(liveSplit.ms)}`;
    d.className = 'clockdelta';
  } else if(last!=null && LAP.best!=null && LAP.laps.length>1){
    const dv = last - LAP.best;
    d.textContent = dv===0 ? (stage?'最佳成績':'最佳圈') : deltaFmt(dv);
    d.className = 'clockdelta ' + (dv>0?'up':'dn');
  } else { d.textContent = LAP.laps.length===1?(stage?'第一趟':'第一圈'):''; d.className='clockdelta'; }

  $('#lapCount').textContent = LAP.laps.length;
  $('#lapLast').textContent  = lapFmt(last);
  $('#lapBest').textContent  = lapFmt(LAP.best);

  $('#lapBtns').innerHTML = !LAP.on
    ? `<button class="bigbtn go" onclick="lapStart()">開始計時</button>`
    : LAP.mode==='manual'
      ? (stage && LAP.startT==null
          ? `<button class="bigbtn go" onclick="manualStageStart()">開始這一趟</button>
             <button class="bigbtn stop" onclick="lapStop()">結束並儲存</button>`
          : `<button class="bigbtn lap" onclick="lapManualLap()">${stage
               ? `記錄「${esc((stagePts(tr)[LAP.stagePos]||{}).name||'下一點')}」` : '計一圈'}</button>
             <button class="bigbtn stop" onclick="lapStop()">結束並儲存</button>`)
      : `<button class="bigbtn stop" onclick="lapStop()">結束並儲存</button>`;

  /* 分段清單：這一趟已經通過哪些點、各差多少 */
  const S = $('#splitList');
  if(S){
    const pts = stagePts(tr), show = LAP.splits.length ? LAP.splits : LAP.lastSplits;
    const nextName = LAP.on && pts[LAP.stagePos] ? pts[LAP.stagePos].name : null;
    S.innerHTML = show.length
      ? `<table class="tb laptable"><thead><tr><th>點</th><th class="rt">累計</th><th class="rt">與基準</th></tr></thead>
         <tbody>${show.map(s=>`<tr><td>${esc(s.name)}</td>
           <td class="rt">${lapFmt(s.ms)}</td>
           <td class="rt" style="${s.delta==null?'':`color:var(--${s.delta>0?'red':'green'});font-weight:600`}">
             ${s.delta==null?'—':deltaFmt(s.delta)}</td></tr>`).join('')}</tbody></table>
         ${nextName?`<p class="t-cap" style="margin:var(--s2) 0 0">下一個：${esc(nextName)}</p>`:''}
         ${LAP.refRun?'':`<p class="t-cap" style="margin:var(--s2) 0 0">還沒有可比的基準，跑完第一趟之後就會出現 +/- 差距。</p>`}`
      : `<p class="t-cap" style="margin:0">${pts.filter(p=>p.line).length
          ? `感應點：${pts.map(p=>esc(p.name)).join(' → ')}${nextName?`　·　下一個：${esc(nextName)}`:''}`
          : '這條路線還沒設定感應點。'}</p>`;
  }

  const g = $('#gpsInfo');
  if(LAP.mode!=='gps'){
    g.innerHTML = `<span class="st">手動模式：${stage?'每通過一個點按一下「記一個點」':'每次通過起跑線按一下「計一圈」'}</span>`;
  }else if(LAP.err){
    g.innerHTML = `<span class="st r">${esc(LAP.err)}</span>`;
  }else if(!LAP.fix){
    g.innerHTML = LAP.on ? `<span class="st y">搜尋衛星中…</span>`
                         : `<span class="st">按開始後會開始定位</span>`;
  }else{
    const a = LAP.fix.acc;
    const k = a<=8 ? 'g' : a<=20 ? 'y' : 'r';
    const kmh = LAP.fix.spd!=null ? Math.round(LAP.fix.spd*3.6) : null;
    g.innerHTML = `<span class="st ${k}">定位精度 ±${Math.round(a)} m</span>
      ${kmh!=null?`<span class="mut">${kmh} km/h</span>`:''}
      ${!stage && tr && tr.line?`<span class="mut">起跑線寬 ${Math.round(tr.line.w)} m</span>`:''}
      ${a>20?`<span class="mut">精度太差時容易漏判過線，等訊號穩一點再開始</span>`:''}`;
  }

  const L = $('#lapList');
  L.innerHTML = LAP.laps.length
    ? `<table class="tb laptable"><thead><tr><th>${stage?'趟':'圈'}</th><th class="rt">時間</th><th class="rt">與最佳差距</th></tr></thead>
       <tbody>${LAP.laps.slice().reverse().map(l=>`<tr>
         <td>${l.n}</td>
         <td class="rt ${l.ms===LAP.best?'bestlap':''}">${lapFmt(l.ms)}</td>
         <td class="rt mut">${l.ms===LAP.best?'—':deltaFmt(l.ms-LAP.best)}</td></tr>`).join('')}</tbody></table>`
    : `<p class="t-cap" style="margin:0">${LAP.on
        ? (stage?'通過起點後開始計時，到終點結束一趟。':'第一次通過起跑線後開始計圈。')
        : (stage?'還沒有成績。':'還沒有圈速。')}</p>`;
}
function afterLapTimer(){ lapPaint(); if(LAP.on) lapTickStart(); }

/* ---------------- 儲存場次 ---------------- */
function saveSessionPrompt(){
  const c = car(), tr = curTrack();
  const valid = LAP.laps.filter(l=>l.ms>0);
  modal({title:'儲存這個場次', body:`
    <div class="summary" style="grid-template-columns:repeat(3,minmax(0,1fr))">
      <div class="it"><div class="lb">場地</div><div class="vl" style="font-size:17px;padding-top:5px">${esc(tr?tr.name:'—')}</div></div>
      <div class="it"><div class="lb">圈數</div><div class="vl">${valid.length}</div></div>
      <div class="it"><div class="lb">最佳圈</div><div class="vl" style="font-size:20px">${lapFmt(LAP.best)}</div></div>
    </div>
    <div class="fld" style="margin-top:var(--s3)"><label>備註（天氣、胎壓、這次換了什麼）</label>
      <input class="inp" id="s_note" placeholder="晴，胎壓熱胎 32 psi，剛換 KW V3"></div>
    <div class="note">這個場次會記下你目前的改裝設定與已安裝零件，之後在「改裝對比」就能看出換東西前後差多少。</div>`,
    footer:`<button class="btn dgr" onclick="discardSession()">不儲存</button>
      <button class="btn pri" style="margin-left:auto" onclick="doSaveSession()">儲存</button>`});
}
function doSaveSession(){
  const c = car(), tr = curTrack();
  c.sessions = c.sessions || [];
  c.sessions.push({
    id: uid(), trackId: tr?tr.id:null, trackName: tr?tr.name:'',
    date: today(), mode: LAP.mode, km: c.km,
    note: $('#s_note') ? $('#s_note').value : '',
    type: (tr && tr.type) || 'lap',
    laps: LAP.laps.map(l=>({n:l.n, ms:Math.round(l.ms),
      splits: l.splits ? l.splits.map(s=>({name:s.name, ms:Math.round(s.ms)})) : undefined})),
    best: LAP.best!=null ? Math.round(LAP.best) : null,
    build: structuredClone(c.build||{}),
    parts: (c.parts||[]).slice(),
    tire: c.tire, wheelW: c.wheelW, wheelET: c.wheelET,
  });
  saveDB(); lapReset(); closeModal(); nav('lap/records'); toast('場次已儲存');
}
function discardSession(){ lapReset(); closeModal(); lapPaint(); toast('已捨棄'); }

/* ---------------- 場地與起跑線 ---------------- */
const TRACKSET = {on:false, trackId:null};
function tracksetStop(){ TRACKSET.on=false; if(!LAP.on) gpsStop(); }
function tracksetPaint(){
  const el = $('#setLineInfo'); if(!el) return;
  const f = LAP.fix;
  if(LAP.err){ el.innerHTML = `<span class="st r">${esc(LAP.err)}</span>`; return; }
  if(!f){ el.innerHTML = `<span class="st y">搜尋衛星中…</span>`; return; }
  const kmh = f.spd!=null ? Math.round(f.spd*3.6) : null;
  el.innerHTML = `<span class="st ${f.acc<=8?'g':f.acc<=20?'y':'r'}">精度 ±${Math.round(f.acc)} m</span>
    ${kmh!=null?`<span class="mut">${kmh} km/h</span>`:''}
    ${f.hd!=null?`<span class="mut">方向 ${Math.round(f.hd)}°</span>`:'<span class="mut">方向：需要移動才量得到</span>'}`;
}

function pgLapTracks(){
  const tracks = DB.tracks||[];
  return `
  <div class="card">
    <h3 class="t-card">場地</h3>
    ${tracks.length ? `<div class="rows" style="margin-top:var(--s2)">
      ${tracks.map(t=>{ const u = trackUsable(t); return `<div class="row" style="align-items:flex-start">
        <div class="gr">
          <div class="mhd"><span class="nm">${esc(t.name)}</span>
            <span class="st ${u.ok?'g':'y'}">${t.kind==='event'?'封路活動':'封閉賽車場'}</span></div>
          <div class="t-cap">${isStage(t)
            ? `分段路線 · ${stagePts(t).map(p=>esc(p.name)).join(' → ')} · 已設定 ${stagePts(t).filter(p=>p.line).length}/${stagePts(t).length} 點`
            : (t.line?`繞圈 · 起跑線寬 ${Math.round(t.line.w)} m · 方向 ${Math.round(t.line.hd)}°`:'繞圈 · 尚未設定起跑線')
          }${t.len?` · 全長約 ${nf(t.len)} m`:''}</div>
          ${t.kind==='event'&&t.ev?`<div class="t-cap">${esc(t.ev.name)} · ${esc(t.ev.org)} · ${esc(t.ev.auth)} ${esc(t.ev.doc)} · ${esc(t.ev.from)} 至 ${esc(t.ev.to)}</div>`:''}
          ${u.ok?'':`<div class="t-cap" style="color:var(--orange)">${esc(u.why)}</div>`}
        </div>
        <button class="btn sm" onclick="editTrack('${t.id}')">設定</button>
      </div>`;}).join('')}
    </div>` : `<p class="t-cap" style="margin:var(--s2) 0 0">還沒有場地。</p>`}
    <div class="btnrow" style="margin-top:var(--s3)">
      <button class="btn pri" onclick="editTrack()">${ic('plus',18)} 新增場地</button>
    </div>
  </div>

  <div class="card">
    <h3 class="t-card">怎麼設起跑線</h3>
    <div class="note" style="margin-top:var(--s2)">${esc(TRACK_NOTE)}</div>
    <div class="rows" style="margin-top:var(--s2)">
      ${TRACK_SUGGEST.map((s,i)=>`<div class="row">
        <div class="gr"><div style="font-weight:500">${esc(s.name)}</div>
          <div class="t-cap">${esc(s.area)} · 全長約 ${nf(s.len)} m · ${esc(s.note)}</div></div>
        <button class="btn sm" onclick="editTrack(null,${i})">用這個建立</button>
      </div>`).join('')}
    </div>
  </div>`;
}

/* 這個路段現在可不可以計時 */
function trackUsable(t){
  if(!t) return {ok:false, why:'沒有選擇場地'};
  if(isStage(t)){
    const pts = stagePts(t);
    const s = pts.find(p=>p.kind==='start'), f = pts.find(p=>p.kind==='finish');
    if(!s || !s.line) return {ok:false, why:'還沒設定起點'};
    if(!f || !f.line) return {ok:false, why:'還沒設定終點'};
    const noLine = pts.filter(p=>p.kind==='split' && !p.line);
    if(noLine.length) return {ok:false, why:`還有 ${noLine.length} 個中間點沒設定位置`};
  }else if(!t.line){
    return {ok:false, why:'還沒設定起跑線'};
  }
  if(t.kind!=='event') return {ok:true};
  const ev = t.ev||{}, d = today();
  if(!ev.ack) return {ok:false, why:'尚未確認封路活動聲明'};
  if(ev.from && d < ev.from) return {ok:false, why:`活動尚未開始（${ev.from} 起）`};
  if(ev.to && d > ev.to) return {ok:false, why:EVENT_LOCK_NOTE};
  return {ok:true};
}

function editTrack(id, suggestIdx){
  const isNew = !id;
  const sg = (suggestIdx!=null) ? TRACK_SUGGEST[suggestIdx] : null;
  const t = isNew ? {id:uid(), name:sg?sg.name:'', len:sg?sg.len:0, minLap:20000, line:null,
                     kind:'circuit', type:'lap', pts:null, ev:null}
                  : structuredClone(trackById(id));
  t.kind = t.kind || 'circuit';
  t.type = t.type || 'lap';
  window.__editTrack = t;
  TRACKSET.on = true; TRACKSET.trackId = t.id;
  gpsStart(()=>tracksetPaint());
  modal({title: isNew?'新增場地':'場地設定', wide:true, body:`
    <div class="seg" style="margin-bottom:var(--s3)">
      <button id="k_circuit" class="${t.kind==='circuit'?'on':''}" onclick="setTrackKind('circuit')">封閉賽車場</button>
      <button id="k_event" class="${t.kind==='event'?'on':''}" onclick="setTrackKind('event')">封路活動路段</button>
    </div>
    <div class="fld"><label>名稱</label><input class="inp" id="t_name" value="${esc(t.name)}" placeholder="大鵬灣國際賽車場"></div>
    <div class="grid g2">
      <div class="fld"><label>全長（公尺，選填）</label><input class="inp" id="t_len" type="number" value="${t.len||''}"></div>
      <div class="fld"><label>最短圈／單趟時間（秒）</label><input class="inp" id="t_min" type="number" value="${Math.round((t.minLap||20000)/1000)}"></div>
    </div>
    <div id="evBlock">${eventBlock(t)}</div>
    <div class="seg" style="margin-bottom:var(--s2)">
      <button id="y_lap" class="${t.type==='lap'?'on':''}" onclick="setTrackType('lap')">繞圈（單一起跑線）</button>
      <button id="y_stage" class="${t.type==='stage'?'on':''}" onclick="setTrackType('stage')">分段路線（起點→終點）</button>
    </div>
    <div class="fld"><label>感應線寬度（公尺）</label>
      <input class="inp" id="t_w" type="number" min="10" max="120" value="${t.line?Math.round(t.line.w):40}"></div>
    <div class="note"><b>在車上經過那一點的瞬間按對應的按鈕。</b>程式會用你當下的位置與行進方向，
      拉出一條垂直於行進方向的感應線。要在移動中按，靜止時量不到行進方向。</div>
    <div class="gpsrow" id="setLineInfo" style="margin-top:var(--s2)"></div>
    <div id="ptsBlock" style="margin-top:var(--s2)">${ptsBlock(t)}</div>`,
    footer:`${isNew?'':`<button class="btn dgr" onclick="delTrack('${t.id}')">刪除</button>`}
      <button class="btn" style="margin-left:auto" onclick="tracksetStop();closeModal()">取消</button>
      <button class="btn pri" onclick="saveTrack('${t.id}',${isNew})">儲存</button>`});
  tracksetPaint();
}
function setTrackKind(k){
  const t = window.__editTrack; if(!t) return;
  t.kind = k;
  $('#k_circuit').classList.toggle('on', k==='circuit');
  $('#k_event').classList.toggle('on', k==='event');
  $('#evBlock').innerHTML = eventBlock(t);
  /* 封路活動通常是起點到終點跑一趟，不是繞圈，所以預設切成分段路線 */
  if(k==='event' && t.type==='lap' && !t.line) setTrackType('stage');
  if(k==='circuit' && t.type==='stage' && !(t.pts||[]).some(p=>p.line)) setTrackType('lap');
}
function setTrackType(y){
  const t = window.__editTrack; if(!t) return;
  t.type = y;
  if(y==='stage' && !t.pts) t.pts = newStagePts();
  const a=$('#y_lap'), b=$('#y_stage');
  if(a) a.classList.toggle('on', y==='lap');
  if(b) b.classList.toggle('on', y==='stage');
  $('#ptsBlock').innerHTML = ptsBlock(t);
}
/* 感應點清單：起點、任意數量的中間點、終點 */
function ptsBlock(t){
  if(t.type!=='stage'){
    return `<button class="bigbtn go" onclick="captureLine()">設為起跑線</button>
      <div class="t-cap" style="margin-top:10px">${t.line
        ? `目前：${t.line.c.lat.toFixed(6)}, ${t.line.c.lon.toFixed(6)} · 方向 ${Math.round(t.line.hd)}°`
        : '目前：尚未設定'}</div>`;
  }
  const pts = t.pts || (t.pts = newStagePts());
  return `<div class="rows">${pts.map((p,i)=>`<div class="row">
      <div class="gr">
        <div class="mhd"><span class="nm">${esc(p.name)}</span>
          <span class="st ${p.line?'g':''}">${p.line?`方向 ${Math.round(p.line.hd)}°`:'尚未設定'}</span></div>
        <div class="t-cap">${p.line?`${p.line.c.lat.toFixed(6)}, ${p.line.c.lon.toFixed(6)}`
          :(p.kind==='start'?'通過起點時按右邊的按鈕':p.kind==='finish'?'通過終點時按右邊的按鈕':'通過這個中間點時按右邊的按鈕')}</div>
      </div>
      ${p.kind==='split'?`<button class="btn txt dgr" onclick="delPt(${i})">移除</button>`:''}
      <button class="btn sm" onclick="capturePt(${i})">設為此點</button>
    </div>`).join('')}</div>
    <div class="btnrow" style="margin-top:var(--s2)">
      <button class="btn" onclick="addPt()">${ic('plus',18)} 新增中間點</button>
      <span class="t-cap">中間點可以加任意多個，順序就是實際通過的順序</span>
    </div>`;
}
function addPt(){
  const t = window.__editTrack; if(!t) return;
  const pts = t.pts || (t.pts = newStagePts());
  const fin = pts.findIndex(p=>p.kind==='finish');
  const n = pts.filter(p=>p.kind==='split').length + 1;
  pts.splice(fin<0?pts.length:fin, 0, {id:uid(), kind:'split', name:`中間點 ${n}`, line:null});
  $('#ptsBlock').innerHTML = ptsBlock(t);
}
function delPt(i){
  const t = window.__editTrack; if(!t || !t.pts) return;
  t.pts.splice(i,1);
  t.pts.filter(p=>p.kind==='split').forEach((p,j)=>{ if(/^中間點 \d+$/.test(p.name)) p.name = `中間點 ${j+1}`; });
  $('#ptsBlock').innerHTML = ptsBlock(t);
}
function capturePt(i){
  const t = window.__editTrack, f = LAP.fix;
  if(!t || !t.pts || !t.pts[i]) return;
  if(!f) return toast('還沒有定位');
  if(f.hd==null) return toast('量不到行進方向，請在移動中按');
  if(f.acc>25) return toast(`定位精度只有 ±${Math.round(f.acc)} m，太差了`);
  t.pts[i].line = lineFrom(f, f.hd, +$('#t_w').value || 40);
  $('#ptsBlock').innerHTML = ptsBlock(t);
  beep(1180,160); toast(`${t.pts[i].name} 已記錄`);
}
/* 封路活動路段才要填的東西 */
function eventBlock(t){
  if(t.kind!=='event') return '';
  const e = t.ev || {};
  return `
  <div class="note r" style="margin-bottom:var(--s2)">
    <b>這是給合法封路活動用的。</b>路段計時只在你填的活動期間內可用，過期會自動停用。
  </div>
  <div class="grid g2">
    <div class="fld"><label>活動名稱</label><input class="inp ev" data-k="name" value="${esc(e.name||'')}" placeholder="2026 ○○盃山道賽 SS1"></div>
    <div class="fld"><label>主辦單位</label><input class="inp ev" data-k="org" value="${esc(e.org||'')}" placeholder="○○汽車運動協會"></div>
    <div class="fld"><label>核准機關</label><input class="inp ev" data-k="auth" value="${esc(e.auth||'')}" placeholder="○○縣政府警察局"></div>
    <div class="fld"><label>封路許可文號</label><input class="inp ev" data-k="doc" value="${esc(e.doc||'')}" placeholder="○警交字第 1150000000 號"></div>
    <div class="fld"><label>活動開始日</label><input class="inp ev" data-k="from" type="date" value="${esc(e.from||today())}"></div>
    <div class="fld"><label>活動結束日</label><input class="inp ev" data-k="to" type="date" value="${esc(e.to||today())}"></div>
  </div>
  <label class="chk" style="margin-bottom:var(--s2)">
    <input type="checkbox" id="ev_ack" ${e.ack?'checked':''}>
    <span style="font-size:14px">我已閱讀並同意下列封路活動使用聲明</span></label>
  <div class="note" style="margin-bottom:var(--s2)">
    ${EVENT_TERMS.map((x,i)=>`<div style="margin:${i?'8px':'0'} 0 0">${i+1}. ${esc(x)}</div>`).join('')}
  </div>`;
}
function captureLine(){
  const f = LAP.fix;
  if(!f) return toast('還沒有定位');
  if(f.hd==null) return toast('量不到行進方向，請在移動中按');
  if(f.acc>25) return toast(`定位精度只有 ±${Math.round(f.acc)} m，太差了`);
  const w = +$('#t_w').value || 40;
  window.__editTrack.line = lineFrom(f, f.hd, w);
  $('#ptsBlock').innerHTML = ptsBlock(window.__editTrack);
  beep(1180,160); toast('起跑線已記錄');
}
function saveTrack(id, isNew){
  const t = window.__editTrack;
  t.name = $('#t_name').value.trim() || '未命名場地';
  t.len = +$('#t_len').value || 0;
  t.minLap = Math.max(3, +$('#t_min').value || 20) * 1000;
  if(t.kind==='event'){
    const e = {};
    $$('.ev').forEach(el=>{ e[el.dataset.k] = el.value.trim(); });
    const miss = ['name','org','auth','doc','from','to'].filter(k=>!e[k]);
    if(miss.length) return toast('封路活動路段要把活動名稱、主辦單位、核准機關、許可文號與起訖日期都填完');
    if(e.to < e.from) return toast('結束日不能早於開始日');
    if(!$('#ev_ack').checked) return toast('要先勾選同意封路活動使用聲明');
    e.ack = (t.ev && t.ev.ack) || new Date().toISOString();
    e.terms = EVENT_TERMS.slice();          // 把當下同意的版本一起存下來
    t.ev = e;
  } else { t.ev = null; }
  const w = +$('#t_w').value || 40;
  if(t.type==='stage'){
    (t.pts||[]).forEach(p=>{ if(p.line) p.line = lineFrom(p.line.c, p.line.hd, w); });
  }else if(t.line){
    t.line = lineFrom(t.line.c, t.line.hd, w);
  }
  DB.tracks = DB.tracks || [];
  if(isNew) DB.tracks.push(t); else DB.tracks = DB.tracks.map(x=>x.id===id?t:x);
  if(!LAP.trackId) LAP.trackId = t.id;
  saveDB(); tracksetStop(); closeModal(); render(); toast('已儲存');
}
function delTrack(id){
  DB.tracks = (DB.tracks||[]).filter(x=>x.id!==id);
  if(LAP.trackId===id) LAP.trackId = null;
  saveDB(); tracksetStop(); closeModal(); render(); toast('已刪除');
}

/* ---------------- 成績 ---------------- */
function pgLapRecords(){
  const c = car(); if(!c) return needCar();
  const ss = (c.sessions||[]).slice().sort((a,b)=>(b.date||'').localeCompare(a.date||''));
  if(!ss.length) return `<div class="card"><div class="empty">${ic('clock',44)}
    <p>還沒有任何場次<br><span class="t-cap">跑完一場並儲存後，這裡會列出每次的最佳圈與所有圈速</span></p>
    <button class="btn pri" onclick="nav('lap/timer')">去計時</button></div></div>`;

  const byTrack = {};
  ss.forEach(s=>{ (byTrack[s.trackName||'未命名'] = byTrack[s.trackName||'未命名'] || []).push(s); });

  return `
  <div class="card">
    <h3 class="t-card">個人最佳</h3>
    <div class="rows" style="margin-top:var(--s2)">
      ${Object.entries(byTrack).map(([nm,arr])=>{
        const best = arr.reduce((m,s)=>(s.best!=null && (m==null||s.best<m.best))?s:m, null);
        return `<div class="row"><div class="gr"><div style="font-weight:500">${esc(nm)}</div>
          <div class="t-cap">${arr.length} 個場次 · 最佳於 ${esc(best?best.date:'—')}</div></div>
          <div class="rt"><div class="laptable" style="font-size:19px;font-weight:600">${lapFmt(best?best.best:null)}</div></div>
        </div>`; }).join('')}
    </div>
  </div>

  <div class="card">
    <h3 class="t-card">場次紀錄</h3>
    <div class="rows" style="margin-top:var(--s2)">
      ${ss.map(s=>`<div class="row">
        <div class="gr"><div style="font-weight:500">${esc(s.trackName||'未命名')} · ${esc(s.date)}</div>
          <div class="t-cap">${s.laps.length} 圈 · ${s.mode==='gps'?'GPS 自動':'手動'} · ${nf(s.km)} km${s.note?' · '+esc(s.note):''}</div></div>
        <div class="rt"><div class="laptable" style="font-weight:600">${lapFmt(s.best)}</div></div>
        <button class="btn sm" onclick="showSession('${s.id}')">明細</button>
      </div>`).join('')}
    </div>
  </div>`;
}
function showSession(id){
  const c = car(); const s = (c.sessions||[]).find(x=>x.id===id); if(!s) return;
  modal({title:`${s.trackName||'未命名'} · ${s.date}`, wide:true, body:`
    <div class="summary" style="grid-template-columns:repeat(4,minmax(0,1fr))">
      <div class="it"><div class="lb">圈數</div><div class="vl">${s.laps.length}</div></div>
      <div class="it"><div class="lb">最佳圈</div><div class="vl" style="font-size:20px">${lapFmt(s.best)}</div></div>
      <div class="it"><div class="lb">里程</div><div class="vl">${nf(s.km)} <small>km</small></div></div>
      <div class="it"><div class="lb">輪胎</div><div class="vl" style="font-size:15px;padding-top:8px">${esc(s.tire||'—')}</div></div>
    </div>
    ${s.note?`<div class="note" style="margin-top:var(--s3)">${esc(s.note)}</div>`:''}
    <table class="tb laptable" style="margin-top:var(--s3)"><thead><tr>
        <th>${s.type==='stage'?'趟':'圈'}</th><th class="rt">時間</th><th class="rt">差距</th></tr></thead>
      <tbody>${s.laps.map(l=>{
        const best = s.laps.find(x=>x.ms===s.best);
        return `<tr><td>${l.n}</td>
        <td class="rt ${l.ms===s.best?'bestlap':''}">${lapFmt(l.ms)}</td>
        <td class="rt mut">${l.ms===s.best?'—':deltaFmt(l.ms-s.best)}</td></tr>
        ${(l.splits||[]).length ? `<tr><td colspan="3" style="padding-top:0;border-top:0">
          <div class="t-cap laptable">${l.splits.map((sp,i)=>{
            const ref = best && best.splits && best.splits[i];
            const dv = (ref && l!==best) ? sp.ms-ref.ms : null;
            return `${esc(sp.name)} ${lapFmt(sp.ms)}${dv!=null
              ? ` <span style="color:var(--${dv>0?'red':'green'})">${deltaFmt(dv)}</span>` : ''}`;
          }).join('　·　')}</div></td></tr>` : ''}`;}).join('')}</tbody></table>`,
    footer:`<button class="btn dgr" onclick="delSession('${id}')">刪除場次</button>
      <button class="btn" style="margin-left:auto" onclick="closeModal()">關閉</button>`});
}
function delSession(id){
  const c = car(); c.sessions = (c.sessions||[]).filter(x=>x.id!==id);
  saveDB(); closeModal(); render(); toast('已刪除');
}

/* ---------------- 改裝對比 ---------------- */
function pgLapCompare(){
  const c = car(); if(!c) return needCar();
  const ss = (c.sessions||[]).filter(s=>s.best!=null);
  if(ss.length<2) return `<div class="card"><div class="empty">${ic('chart',44)}
    <p>至少要兩個場次才能比較<br><span class="t-cap">同一個場地跑過兩次以上，這裡就會告訴你改裝前後差多少</span></p>
    <button class="btn pri" onclick="nav('lap/timer')">去計時</button></div></div>`;

  const names = [...new Set(ss.map(s=>s.trackName||'未命名'))];
  const sel = UI.cmpTrack && names.includes(UI.cmpTrack) ? UI.cmpTrack : names[0];
  const arr = ss.filter(s=>(s.trackName||'未命名')===sel).sort((a,b)=>a.date.localeCompare(b.date));
  const fastest = arr.reduce((m,s)=>(m==null||s.best<m)?s.best:m, null);

  const diffs = (a,b)=>{                       // 兩個場次之間改了什麼
    const out = [];
    const A = a.build||{}, B = b.build||{};
    const LB = {wheel:'輪圈',size:'尺寸',tireW:'胎寬',tireAR:'扁平比',drop:'車身高度',caliper:'卡鉗',
                paint:'車色',lip:'前下巴',skirt:'側裙',wing:'尾翼',diffuser:'後下擾流',wide:'寬體',tips:'尾管'};
    Object.keys(LB).forEach(k=>{ if(String(A[k])!==String(B[k])) out.push(`${LB[k]} ${A[k]}→${B[k]}`); });
    if(a.tire!==b.tire) out.push(`輪胎 ${a.tire}→${b.tire}`);
    const pa = new Set(a.parts||[]), pb = new Set(b.parts||[]);
    (b.parts||[]).filter(p=>!pa.has(p)).forEach(p=>{
      const pt = PARTS.find(x=>x.id===p); out.push('＋'+(pt?pt.name:p)); });
    (a.parts||[]).filter(p=>!pb.has(p)).forEach(p=>{
      const pt = PARTS.find(x=>x.id===p); out.push('－'+(pt?pt.name:p)); });
    return out;
  };

  return `
  <div class="card">
    <div class="mhd"><h3 class="t-card nm">同場地比較</h3>
      <select class="inp" style="max-width:220px" onchange="UI.cmpTrack=this.value;saveUI();render()">
        ${names.map(n=>`<option ${n===sel?'selected':''}>${esc(n)}</option>`).join('')}
      </select></div>
    <table class="tb" style="margin-top:var(--s3)"><thead>
      <tr><th>日期</th><th class="rt">最佳圈</th><th class="rt">與最快差距</th><th>與上一次相比改了什麼</th></tr></thead>
      <tbody>${arr.map((s,i)=>`<tr>
        <td>${esc(s.date)}<div class="t-cap">${nf(s.km)} km · ${s.laps.length} 圈</div></td>
        <td class="rt laptable ${s.best===fastest?'bestlap':''}" style="font-weight:600">${lapFmt(s.best)}</td>
        <td class="rt laptable mut">${s.best===fastest?'—':deltaFmt(s.best-fastest)}</td>
        <td>${i===0?'<span class="mut">基準</span>':(()=>{
            const d = diffs(arr[i-1], s), dt = s.best - arr[i-1].best;
            return `<div class="laptable" style="color:${dt<0?'var(--green)':'var(--red)'};font-weight:600">${deltaFmt(dt)}</div>`
              + (d.length?`<div class="t-cap">${d.map(esc).join('、')}</div>`:'<div class="t-cap">設定沒有變動</div>');
          })()}</td></tr>`).join('')}</tbody></table>
    <div class="note" style="margin-top:var(--s3)">圈速受天氣、胎溫、油量、車手狀態影響很大，
      同一天同一組胎的比較才有意義。零件換了幾樣就一起下場，這張表只會告訴你「總共差多少」，
      沒辦法拆出是哪一樣的功勞。</div>
  </div>`;
}
