/* ==========================================================================
   改裝 · 設計預覽 — 車輛是唯一主角，右欄一次只顯示一個部位
   ========================================================================== */
let AB = false, ABPOS = 50, DPART = null;

const DPARTS = [
  {id:'paint',  name:'車身顏色', ic:'paint',  val:b=>PAINTS.find(p=>p.id===b.paint)?.name},
  {id:'wheel',  name:'輪圈',     ic:'disc',   val:b=>wheelStylesOf(car()).find(w=>w.id===b.wheel)?.name},
  {id:'tire',   name:'輪胎與尺寸',ic:'target',val:b=>TIRE_PRODUCTS.find(x=>x.id===b.tireProduct)?.name},
  {id:'drop',   name:'懸吊與車高',ic:'arrows', val:b=>SUSPENSION_PRODUCTS.find(x=>x.id===b.suspension)?.name},
  {id:'brake',  name:'煞車系統', ic:'disc',   val:b=>BRAKE_PRODUCTS.find(x=>x.id===b.brakeKit)?.name},
  {id:'tint',   name:'隔熱紙',   ic:'eye',    val:b=>TINT_PRODUCTS.find(x=>x.id===b.tintProduct)?.name},
  {id:'aero',   name:'空力套件', ic:'wind',   val:b=>aeroProductsOf(car()).find(x=>x.id===b.aeroKit)?.name},
  {id:'alignment',name:'底盤定位',ic:'suspension',val:b=>`前 ${(+b.camberF).toFixed(1)}° / 後 ${(+b.camberR).toFixed(1)}°`},
];

function pgDesign(){
  const c = car();
  if(!c) return needCar('設計預覽需要先建立車輛 — 相容性會依你的年份、引擎與車身型式計算');
  if(!c.bodyId || !hasCar3D(c.bodyId)) return `<div class="card"><div class="empty">${ic('car',44)}
    <p><b>還沒有選車身型式</b><br><span class="t-cap">設計預覽要知道是哪一種車身才畫得出來。
    ${esc(platName(platOf(c)))} 目前有：${bodiesOf(platOf(c)).filter(x=>hasCar3D(x.id)).map(x=>esc(x.name)).join('、')}</span></p>
    <button class="btn pri" onclick="editCar('${c.id}')">去選車身型式</button></div></div>`;
  const b = c.build;
  const stock = {...blankCar().build,paint:b.paint};
  const wc = wheelCheck(c, {size:b.size, width:estWidth(b), et:estET(b), tireW:b.tireW, tireAR:b.tireAR});

  return `
  <div class="cols">
    <div class="stack">
      <div class="stage crop ab" id="stage">
        ${AB ? `<div>${carPhoto(stock,{bodyId:c.bodyId,uid:'ab0'})}</div>
          <div class="after" id="abAfter" style="--ab-pos:${ABPOS}%">${carPhoto(b,{bodyId:c.bodyId,uid:'ab1'})}</div>
          <div class="abh" id="abH" style="left:${ABPOS}%"></div>
          <div class="abl" style="left:14px">改裝後</div><div class="abl" style="right:14px">原廠</div>`
        : carPhoto(b,{bodyId:c.bodyId,uid:'st'})}
      </div>

      <div class="btnrow">
        <div class="seg"><button class="${!AB?'on':''}" onclick="AB=false;render()">預覽</button>
          <button class="${AB?'on':''}" onclick="AB=true;render()">前後比較</button></div>
        <button class="btn sm" style="margin-left:auto" onclick="exportPng()">下載圖片</button>
        <button class="btn sm" onclick="resetBuild()">回到原廠</button>
      </div>

      <!-- 相容性摘要列：只放三個數字，細節收進面板 -->
      <div class="sumbar">
        <div class="m"><div class="lb">相容性</div><div class="vl">${lvSt(wc.lv)}</div></div>
        <div class="m"><div class="lb">輪胎外徑</div>
          <div class="vl" style="color:${Math.abs(wc.g.odPct)>2?'var(--red)':Math.abs(wc.g.odPct)>1.5?'var(--orange)':'inherit'}">
            ${wc.g.odPct>=0?'+':''}${wc.g.odPct.toFixed(2)}%</div></div>
        <div class="m"><div class="lb">外緣位移</div>
          <div class="vl">${wc.g.outerDelta>=0?'+':''}${wc.g.outerDelta.toFixed(1)} mm</div></div>
        <div class="btnrow" style="margin-left:auto">
          <button class="btn sm" onclick="showAnalysis()">完整分析</button>
        </div>
      </div>
    </div>

    <!-- 右欄：部位清單 → 下鑽，一次只顯示一項 -->
    <div class="card tight">${DPART ? partPanel(b, c) : `
      <h3 class="t-card" style="padding:0 0 4px">選擇要調整的部位</h3>
      <div class="optlist">
        ${DPARTS.map(p=>`<button onclick="DPART='${p.id}';render()">
          <span class="mut">${ic(p.ic,20)}</span><span>${p.name}</span>
          <span class="vl">${esc(p.val(b)||'')}</span>
          <span class="cr">${ic('fwd',16)}</span></button>`).join('')}
      </div>`}
    </div>
  </div>

  <div class="note" style="margin-top:var(--s3)">
    <b>這是依原廠尺寸校正的可互動 3D 外觀預覽。</b> E36 各車身使用獨立授權網格；輪圈、車高、外傾角與束角會直接反映在預覽中。這不是原廠 CAD，安裝前仍須實車量測。
  </div>`;
}

function partPanel(b, c){
  const P = DPARTS.find(x=>x.id===DPART);
  const head = `<div class="row" style="padding-bottom:var(--s2);border-bottom:1px solid var(--line)">
    <button class="btn sm" onclick="DPART=null;render()">${ic('back',16)}</button>
    <b style="font-size:16px">${P.name}</b></div>`;
  let body = '';

  if(DPART==='paint'){
    const p = PAINTS.find(x=>x.id===b.paint)||PAINTS[0];
    body = `<div style="padding-top:var(--s2)">
      <div class="swx">${PAINTS.map(x=>`<span class="sw ${b.paint===x.id?'on':''}" style="background:${x.hex}"
        title="${esc(x.name)}" onclick="setB('paint','${x.id}')"></span>`).join('')}</div>
      <div class="kv" style="margin-top:var(--s2)"><span>目前</span><b>${esc(p.name)}</b></div>
      <div class="kv"><span>色號</span><b>${esc(p.code)}</b></div>
      <label class="chk"><input type="checkbox" ${b.shadow?'checked':''} onchange="setB('shadow',this.checked)">
        <span>Shadowline 黑窗框</span></label>
      <div class="hint">改色需辦變更登記並換行照，代檢廠可在定期檢驗時一併辦理。</div></div>`;
  }
  if(DPART==='wheel'){
    body = `<div style="padding-top:var(--s2)">
      <div class="product-grid">${wheelStylesOf(car()).map(w=>productOption(w,b.wheel,'wheel',w.img
        ?`<img src="${w.img}" alt="${esc(w.brand+' '+w.name)}" loading="lazy" referrerpolicy="no-referrer">`
        :wheelThumb(w.id,b.finish))).join('')}</div>
      <div class="t-cap" style="margin-top:var(--s3);margin-bottom:6px">輪圈顏色</div>
      <div class="swx">${WHEEL_FINISHES.map(f=>`<span class="sw ${b.finish===f.id?'on':''}" style="background:${f.face}"
        title="${esc(f.name)}" onclick="setB('finish','${f.id}')"></span>`).join('')}</div>
      <div class="hint">品牌款式使用官方商品圖核對，3D 依實際輻條數、雙輻、深唇與凹面結構重建。</div></div>`;
  }
  if(DPART==='tire'){
    const od = tireOD({w:b.tireW,ar:b.tireAR,rim:b.size});
    body = `<div style="padding-top:var(--s2)">
      <div class="product-grid compact">${TIRE_PRODUCTS.map(x=>productOption(x,b.tireProduct,'tireProduct')).join('')}</div>
      ${sliderInput('輪圈尺寸','吋','size',14,19,1,b.size)}
      ${sliderInput('胎寬','mm','tireW',185,285,5,b.tireW)}
      ${sliderInput('扁平比','%','tireAR',25,70,5,b.tireAR)}
      <div class="kv"><span>規格</span><b>${b.tireW}/${b.tireAR} R${b.size}</b></div>
      <div class="kv"><span>外徑</span><b>${od.toFixed(0)} mm</b></div>
      <div class="note b" style="margin-top:var(--s2)">E36 最佳解通常是 <b>245/40R17</b>，外徑僅 +0.13%、速度表幾乎零誤差。
        避開 235/40R18（+2.90%，超出台灣 2% 門檻）。</div></div>`;
  }
  if(DPART==='drop'){
    body = `<div style="padding-top:var(--s2)">
      <div class="product-grid compact">${SUSPENSION_PRODUCTS.map(x=>productOption(x,b.suspension,'suspension')).join('')}</div>
      ${sliderInput('前軸降低','mm','dropF',0,80,1,b.dropF)}
      ${sliderInput('後軸降低','mm','dropR',0,80,1,b.dropR)}
      <div class="note y" style="margin-top:var(--s2)">降低幅度越大，後副樑鎖點的疲勞風險越高 — 這是 E36 的結構性弱點。
        施工前請先掀後座地毯與趴車底檢查四個鎖點。</div>
      <div class="hint">B14 的 E36 官方範圍：前 35–55 mm、後 20–45 mm。前後可分開調整，車身姿態會同步改變。</div></div>`;
  }
  if(DPART==='brake'){
    body = `<div style="padding-top:var(--s2)">
      <div class="product-grid compact">${BRAKE_PRODUCTS.map(x=>productOption(x,b.brakeKit,'brakeKit')).join('')}</div>
      <div class="swx">${CALIPER_COLORS.map(x=>`<span class="sw ${b.caliper===x.id?'on':''}" style="background:${x.hex}"
        title="${esc(x.name)}" onclick="setB('caliper','${x.id}')"></span>`).join('')}</div>
      <div class="kv" style="margin-top:var(--s2)"><span>碟盤直徑</span><b>${BRAKE_PRODUCTS.find(x=>x.id===b.brakeKit)?.disc||286} mm</b></div>
      <div class="hint">卡鉗尺寸、活塞數與碟盤直徑會在輪圈內同步顯示；實際套件仍須核對車型料號與輪圈間隙。</div></div>`;
  }
  if(DPART==='tint'){
    body = `<div style="padding-top:var(--s2)">
      <div class="product-grid compact">${TINT_PRODUCTS.map(x=>productOption(x,b.tintProduct,'tintProduct')).join('')}</div>
      ${sliderInput('視覺深色程度','%','tint',0,90,5,b.tint)}
      <div class="hint">產品 VLT 與畫面深淺分開顯示；玻璃角度、環境光與螢幕亮度都會影響視覺結果。</div></div>`;
  }
  if(DPART==='aero'){
    body = `<div style="padding-top:var(--s1)">
      <div class="product-grid compact">${aeroProductsOf(c).map(x=>productOption(x,b.aeroKit,'aeroKit')).join('')}</div>
      ${chk('lip','前下巴')}${chk('skirt','側裙')}${chk('diffuser','後下擾流')}
      ${chk('hood','引擎蓋散熱孔')}${chk('wide','寬體暴龜','台灣不可行')}
      <div class="t-cap" style="margin-top:var(--s3);margin-bottom:6px">尾翼</div>
      <div class="seg">${[['none','無'],['duck','鴨尾'],['gt','GT 尾翼']].map(([v,n])=>
        `<button class="${b.wing===v?'on':''}" onclick="setB('wing','${v}')">${n}</button>`).join('')}</div>
      <div class="t-cap" style="margin-top:var(--s2);margin-bottom:6px">排氣尾管</div>
      <div class="seg">${[['none','無'],['single','單出'],['dual','雙出'],['quad','四出']].map(([v,n])=>
        `<button class="${b.tips===v?'on':''}" onclick="setB('tips','${v}')">${n}</button>`).join('')}</div></div>`;
  }
  if(DPART==='alignment') body = alignmentPanel(b);
  return head + body;
}

function productOption(item, current, key, media){
  const detail=item.cat||item.name,source=productSourceLink(item);
  const productMedia=media||(item.img?`<img src="${item.img}" alt="${esc(item.brand+' '+item.name)}" loading="lazy" referrerpolicy="no-referrer"
    onerror="this.remove()"><b class="product-fallback">${esc(item.brand)}</b>`:`<b>${esc(item.brand)}</b>`);
  return `<div class="product-option ${current===item.id?'on':''}" role="button" tabindex="0"
    onclick="setB('${key}','${item.id}')" onkeydown="if(event.key==='Enter')setB('${key}','${item.id}')">
    <div class="product-media">${productMedia}</div>
    <div class="product-copy"><span>${esc(item.brand||'')}</span><b>${esc(item.name)}</b><small>${esc(detail)}</small></div>
    ${source?`<span onclick="event.stopPropagation()">${source}</span>`:''}
  </div>`;
}

function sliderInput(label, unit, key, min, max, step, cur){
  const digits=step<1?2:0;
  return `<div class="tune-control">
    <div class="tune-head"><label for="rng-${key}">${label}</label>
      <span><output id="out-${key}">${(+cur).toFixed(digits)}</output> ${unit}</span></div>
    <div class="tune-inputs"><input id="rng-${key}" type="range" min="${min}" max="${max}" step="${step}" value="${cur}"
      oninput="setBLive('${key}',+this.value,${digits})" onchange="commitBuild()">
      <input type="number" min="${min}" max="${max}" step="${step}" value="${cur}" aria-label="${esc(label)}"
        onchange="setB('${key}',+this.value)"></div>
  </div>`;
}
function chk(k, label, warn){
  const b = car().build;
  return `<label class="chk"><input type="checkbox" ${b[k]?'checked':''} onchange="setB('${k}',this.checked)">
    <span>${esc(label)}</span>${warn?`<span class="rt" style="color:var(--red)">${esc(warn)}</span>`:''}</label>`;
}
function countAero(b){ return ['lip','skirt','diffuser','hood','wide'].filter(k=>b[k]).length + (b.wing!=='none'?1:0) + (b.tips&&b.tips!=='single'&&b.tips!=='none'?1:0); }
function estWidth(b){ return Math.round((b.tireW/25.4 - 1.6)*2)/2; }
function estET(b){
  const w = estWidth(b);
  if(b.size<=15) return 47;
  if(w<=7.5) return 45; if(w<=8) return 42; if(w<=8.5) return 40; if(w<=9) return 35; return 30;
}
function alignmentScores(b){
  const tire=TIRE_PRODUCTS.find(x=>x.id===b.tireProduct)||TIRE_PRODUCTS[0];
  const cf=Math.abs(+b.camberF||0),cr=Math.abs(+b.camberR||0),tf=Math.abs(+b.toeF||0),tr=+b.toeR||0;
  const drop=(+b.dropF+ +b.dropR)/2;
  const clamp=n=>Math.max(20,Math.min(98,Math.round(n)));
  return {
    grip:clamp(66+tire.grip+Math.min(cf,2.8)*5+Math.min(cr,2.2)*2-drop*.04-tf*8),
    speed:clamp(80+(tire.speed||0)-tf*24-Math.abs(tr)*18-drop*.05-(b.wing==='gt'?7:0)),
    turn:clamp(62+cf*7-(+b.toeF||0)*25+(+b.caster||7)*1.4),
    stable:clamp(64+Math.max(0,tr)*30+cr*3-Math.max(0,cf-3)*7),
    wear:clamp(88+(tire.wear||0)-Math.max(0,cf-1.2)*10-Math.max(0,cr-1.5)*9-tf*34-Math.abs(tr)*25),
  };
}

function alignmentChart(b){
  const s=alignmentScores(b),vals=[s.grip,s.speed,s.turn,s.stable,s.wear],cx=110,cy=94,r=66;
  const point=(v,i)=>{const a=-Math.PI/2+i*Math.PI*2/5,rr=r*v/100;return `${(cx+Math.cos(a)*rr).toFixed(1)},${(cy+Math.sin(a)*rr).toFixed(1)}`;};
  const ring=v=>Array.from({length:5},(_,i)=>point(v,i)).join(' ');
  return `<div class="align-chart" id="alignLive"><svg viewBox="0 0 220 190" role="img" aria-label="底盤設定動態趨勢圖">
    <g class="chart-grid"><polygon points="${ring(100)}"/><polygon points="${ring(70)}"/><polygon points="${ring(40)}"/></g>
    <polygon class="chart-area" points="${vals.map(point).join(' ')}"/>
    <text x="110" y="13">抓地 ${s.grip}</text><text x="194" y="73">直線 ${s.speed}</text>
    <text x="164" y="181">轉向 ${s.turn}</text><text x="56" y="181">穩定 ${s.stable}</text><text x="25" y="73">胎耗 ${s.wear}</text>
  </svg><div class="chart-readout">${Object.entries({抓地:s.grip,直線:s.speed,轉向:s.turn,穩定:s.stable,胎耗:s.wear}).map(([k,v])=>`<span><i style="--v:${v}%"></i><b>${k}</b><em>${v}</em></span>`).join('')}</div></div>`;
}

function alignmentPanel(b){
  return `<div class="alignment-panel">
    <div class="preset-row"><button onclick="applyAlignmentPreset('street')">街道</button><button onclick="applyAlignmentPreset('touge')">山路</button><button onclick="applyAlignmentPreset('track')">賽道</button></div>
    ${alignmentChart(b)}
    <h4>前軸</h4>
    ${sliderInput('外傾角 Camber','°','camberF',-4,0,.1,b.camberF)}
    ${sliderInput('束角 Toe','°','toeF',-.30,.30,.01,b.toeF)}
    ${sliderInput('主銷後傾 Caster','°','caster',3,10,.1,b.caster)}
    ${sliderInput('輪距增量','mm','trackF',0,40,1,b.trackF)}
    ${sliderInput('冷胎壓','psi','pressureF',24,44,1,b.pressureF)}
    <h4>後軸</h4>
    ${sliderInput('外傾角 Camber','°','camberR',-4,0,.1,b.camberR)}
    ${sliderInput('束角 Toe','°','toeR',-.30,.30,.01,b.toeR)}
    ${sliderInput('輪距增量','mm','trackR',0,40,1,b.trackR)}
    ${sliderInput('冷胎壓','psi','pressureR',24,44,1,b.pressureR)}
    <div class="hint">圖表是相對趨勢模擬，用來比較設定方向，不是定位機或輪胎實測數據。</div>
  </div>`;
}

function mutateBuild(b,k,v){
  b[k]=v;
  if(k==='drop'){b.dropF=v;b.dropR=v;}
  if(k==='dropF'||k==='dropR') b.drop=Math.round((+b.dropF+ +b.dropR)/2);
  if(k==='suspension'){
    const x=SUSPENSION_PRODUCTS.find(p=>p.id===v)||SUSPENSION_PRODUCTS[0];
    b.dropF=x.front[0];b.dropR=x.rear[0];b.drop=Math.round((b.dropF+b.dropR)/2);
  }
  if(k==='brakeKit'){
    const x=BRAKE_PRODUCTS.find(p=>p.id===v);if(x&&x.color)b.caliper=x.color;
  }
  if(k==='tintProduct'){
    const x=TINT_PRODUCTS.find(p=>p.id===v)||TINT_PRODUCTS[0];b.tint=x.id==='none'?0:100-x.vlt;
  }
  if(k==='aeroKit'){
    const x=aeroProductsOf(car()).find(p=>p.id===v)||AERO_PRODUCTS[0];
    ['lip','skirt','diffuser','wing'].forEach(a=>b[a]=x[a]);
  }
}
function setB(k,v){ const c=car(); if(!c) return; mutateBuild(c.build,k,v);saveDB();render(); }
function setBLive(k,v,digits=0){
  const c=car();if(!c)return;mutateBuild(c.build,k,v);saveDB();
  const out=$(`#out-${k}`);if(out)out.textContent=(+v).toFixed(digits);
  if(typeof updateCar3DBuild==='function') updateCar3DBuild(c.build);
  const chart=$('#alignLive');if(chart)chart.outerHTML=alignmentChart(c.build);
}
function commitBuild(){ saveDB();render(); }
function applyAlignmentPreset(id){
  const presets={street:{camberF:-1.1,camberR:-1.5,toeF:.02,toeR:.10,caster:7.0},
    touge:{camberF:-2.2,camberR:-1.8,toeF:-.05,toeR:.12,caster:7.8},
    track:{camberF:-3.2,camberR:-2.2,toeF:-.10,toeR:.15,caster:8.5}};
  const c=car(),p=presets[id];if(!c||!p)return;Object.assign(c.build,p);saveDB();render();
}
function resetBuild(){
  const c = car(); if(!c) return;
  const keep = c.build.paint;
  c.build = blankCar().build; c.build.paint = keep;
  saveDB(); render(); toast('已回到原廠設定');
}

/* 完整分析放進面板，不長期占用主畫面 */
function showAnalysis(){
  const c = car(); if(!c) return;
  const b = c.build;
  const wc = wheelCheck(c, {size:b.size, width:estWidth(b), et:estET(b), tireW:b.tireW, tireAR:b.tireAR});
  modal({title:'完整分析', wide:true, body:`
    <div class="summary" style="grid-template-columns:repeat(3,minmax(0,1fr));margin-bottom:var(--s3)">
      <div class="it"><div class="lb">輪胎外徑變化</div><div class="vl">${wc.g.odPct>=0?'+':''}${wc.g.odPct.toFixed(2)}%</div>
        <div class="t-cap">${wc.g.modOD.toFixed(0)} mm ← 原廠 ${wc.g.baseOD.toFixed(0)} mm</div></div>
      <div class="it"><div class="lb">速度表誤差</div><div class="vl">${wc.g.speedoErrPct>=0?'+':''}${wc.g.speedoErrPct.toFixed(2)}%</div>
        <div class="t-cap">實速 100 時表速約 ${(100*(1+wc.g.speedoErrPct/100)).toFixed(1)}</div></div>
      <div class="it"><div class="lb">單軸輪距</div><div class="vl">${wc.g.trackDelta>=0?'+':''}${wc.g.trackDelta.toFixed(0)} mm</div>
        <div class="t-cap">內緣 ${wc.g.innerDelta>=0?'+':''}${wc.g.innerDelta.toFixed(1)} mm</div></div>
    </div>
    <h4 class="t-card" style="margin-bottom:var(--s1)">輪圈相容性判斷依據</h4>
    ${reasonList(wc.R)}
    <h4 class="t-card" style="margin:var(--s3) 0 var(--s1)">這樣改之後會怎樣</h4>
    ${impactPanel(b, c)}
    <div class="src">計算基準：車庫設定的目前規格 ${c.wheelW}J ET${c.wheelET} ${esc(c.tire)}。台灣 2% 外徑門檻的來源見「更多 → 法規與驗車」。</div>`,
    footer:`<button class="btn" onclick="closeModal()">關閉</button>
            <button class="btn pri" onclick="closeModal();savePlan()">儲存成方案</button>`});
}

function impactPanel(b, c){
  const eng = carEngine(c), rows = [];
  if(b.drop>0) DROP_IMPACT.forEach(x=>rows.push({k:x.k, p:`降低 ${b.drop}mm`, t:x.t}));
  if(b.size>=17){
    rows.push({k:'perf',p:`${b.size} 吋輪圈`,t:'簧下重量增加，加速、煞車反應與油耗都會變差'});
    rows.push({k:'perf',p:`${b.size} 吋輪圈`,t:'接地面積增加，乾地抓地力與轉向反應提升'});
    rows.push({k:'comfort',p:`${b.size} 吋輪圈`,t:`扁平比 ${b.tireAR}，路面震動更直接傳入車內`});
    rows.push({k:'dura',p:`${b.size} 吋輪圈`,t:'輪胎成本提高；低扁平比輪圈遇坑洞容易變形'});
  }
  if(b.tint>=50) rows.push({k:'safety',p:'深色隔熱紙',t:'夜間與雨天的側後方視線明顯變差'});
  if(b.wide){
    rows.push({k:'legal',p:'寬體暴龜',t:'❌ 車身尺寸不得與原車資料不符，會被要求復原'});
    rows.push({k:'dura',p:'寬體暴龜',t:'切割輪拱後鈑金防鏽處理不當容易生鏽'});
  }
  if(b.wing==='gt'){
    rows.push({k:'perf',p:'GT 尾翼',t:'高速後軸下壓力增加，同時增加風阻'});
    rows.push({k:'legal',p:'GT 尾翼',t:'⚠ 不得突出車身兩側及後方；後延伸 ≤25cm'});
  }
  if(b.lip||b.skirt||b.diffuser) rows.push({k:'comfort',p:'空力套件',t:'離地更低，進出停車場斜坡與減速丘容易刮傷'});
  if(b.tips && b.tips!=='none' && b.tips!=='single')
    rows.push({k:'legal',p:'排氣尾管',t:'排氣管尾端須位於車輛後方、最低點離地 ≥10 公分'});
  if(eng && ['M52B20','M52B25','M52B28'].includes(eng.id))
    rows.push({k:'dura',p:'引擎批次',t:'你的 M52 屬 Nikasil 鋁缸體風險批次 — 動力改裝前請先做缸壓／洩漏測試'});
  (c.parts||[]).forEach(id=>{
    const p = PARTS.find(x=>x.id===id); if(!p||!p.impact) return;
    IMPACT_KEYS.forEach(x=>(p.impact[x.k]||[]).forEach(t=>rows.push({k:x.k,p:p.name,t})));
  });
  if(!rows.length) return `<p class="t-cap">目前是原廠設定，調整任一項目後這裡會列出對外觀、性能、舒適、安全、耐用度與法規的影響。</p>`;
  return IMPACT_KEYS.map(x=>{
    const rs = rows.filter(r=>r.k===x.k); if(!rs.length) return '';
    return `<details class="dd" ${x.k==='safety'||x.k==='legal'?'open':''}>
      <summary>${x.n}<span class="mut" style="margin-left:auto;font-size:14px">${rs.length}</span></summary>
      <div class="in"><div class="rows">${rs.map(r=>`<div class="row" style="align-items:flex-start;padding:10px 0">
        <span class="chip" style="flex:0 0 auto;max-width:120px;overflow:hidden;text-overflow:ellipsis">${esc(r.p)}</span>
        <div class="gr" style="font-size:14px">${esc(r.t)}</div></div>`).join('')}</div></div></details>`;
  }).join('');
}

/* ---------------- 儲存方案 ---------------- */
function savePlan(){
  const c = car(); if(!c) return;
  modal({title:'儲存成改裝方案', wide:true, body:`
    <div class="fld"><label>方案名稱</label><input class="inp" id="pl_name" value="方案 ${(c.plans||[]).length+1}" placeholder="日常街道版 / 山路操控版 / 賽道版"></div>
    <div class="fld"><label>用途說明</label><textarea class="inp" id="pl_desc" placeholder="取捨、預算上限、預計施工時間…"></textarea></div>
    <div class="fld"><label>納入這個方案的零件</label>
      <div style="max-height:300px;overflow-y:auto;background:var(--fill);border-radius:var(--rs);padding:0 14px">
        ${PART_CATS.map(cat=>{const ps=PARTS.filter(p=>p.cat===cat.id); if(!ps.length) return '';
          return `<div class="t-cap" style="padding:12px 0 2px;font-weight:500">${cat.grp} · ${cat.name}</div>` +
            ps.map(p=>`<label class="chk"><input type="checkbox" class="plpart" value="${p.id}" ${(c.parts||[]).includes(p.id)?'checked':''}>
              <span style="font-size:14px">${esc(p.name)}</span>
              <span class="rt num">${range(p.price[0]+p.labor[0],p.price[1]+p.labor[1])}</span></label>`).join('');
        }).join('')}
      </div><div class="hint">${esc(FX_NOTE)}</div></div>`,
    footer:`<button class="btn" onclick="closeModal()">取消</button>
            <button class="btn pri" onclick="doSavePlan()">儲存方案</button>`});
}
function doSavePlan(){
  const c = car(); if(!c) return;
  c.plans = c.plans||[];
  c.plans.push({id:uid(), name:$('#pl_name').value||'未命名方案', desc:$('#pl_desc').value,
                build:structuredClone(c.build), parts:$$('.plpart:checked').map(x=>x.value), at:today()});
  saveDB(); closeModal(); nav('build/plans'); toast('已儲存方案');
}

/* ---------------- 下載預覽圖 ---------------- */
function exportPng(){
  const c = car(); if(!c) return;
  const data=car3DExport();if(!data){toast('3D 預覽還在載入');return;}
  const a=document.createElement('a');a.href=data;
  a.download=(platOf(c)==='dsm2g'?'eclipse-2g-':'e36-')+(carLabel(c)||'build').replace(/\s+/g,'-')+'.png';
  a.click();toast('已下載目前 3D 視角');
}

/* A/B 拖曳 */
function afterDesign(){
  const h = $('#abH'), af = $('#abAfter'), st = $('#stage');
  if(!h||!af||!st) return;
  let drag = false;
  const move = e => {
    if(!drag) return;
    const r = st.getBoundingClientRect();
    const x = ((e.touches?e.touches[0].clientX:e.clientX) - r.left)/r.width*100;
    ABPOS = Math.max(2, Math.min(98, x));
    h.style.left = ABPOS+'%'; af.style.setProperty('--ab-pos',ABPOS+'%');
  };
  h.addEventListener('mousedown', e=>{drag=true; e.preventDefault();});
  h.addEventListener('touchstart', ()=>{drag=true;}, {passive:true});
  window.addEventListener('mousemove', move);
  window.addEventListener('touchmove', move, {passive:true});
  window.addEventListener('mouseup', ()=>drag=false);
  window.addEventListener('touchend', ()=>drag=false);
}
