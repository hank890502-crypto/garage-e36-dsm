/* ==========================================================================
   改裝 · 設計預覽 — 車輛是唯一主角，右欄一次只顯示一個部位
   ========================================================================== */
let AB = false, ABPOS = 50, DPART = null;
const paintsOf = c => platOf(c)==='dsm2g'?ECL_PAINTS:PAINTS;
function stockBuildFor(c,paint){
  const build={...blankCar().build,paint,wheel:platOf(c)==='dsm2g'?'ecl-oem':'st42'};
  if(platOf(c)==='dsm2g'){
    const stock=eclipseStockFitment(c);
    Object.assign(build,{size:stock.size,tireW:stock.tireW,tireAR:stock.tireAR});
  }
  return build;
}

const DPARTS = [
  {id:'paint',  name:'車身顏色', ic:'paint',  val:b=>car()?.bodyId==='sedan'?'來源模型原色':paintsOf(car()).find(p=>p.id===b.paint)?.name},
  {id:'wheel',  name:'輪圈',     ic:'disc',   val:b=>car()?.bodyId==='sedan'?'來源模型輪圈':wheelStylesOf(car()).find(w=>w.id===b.wheel)?.name},
  {id:'tire',   name:'輪胎與尺寸',ic:'target',val:b=>TIRE_PRODUCTS.find(x=>x.id===b.tireProduct)?.name},
  {id:'drop',   name:'懸吊與車高',ic:'arrows', val:b=>suspensionProductsOf(car()).find(x=>x.id===b.suspension)?.name},
  {id:'brake',  name:'煞車系統', ic:'disc',   val:b=>brakeProductsOf(car()).find(x=>x.id===b.brakeKit)?.name},
  {id:'tint',   name:'隔熱紙',   ic:'eye',    val:b=>TINT_PRODUCTS.find(x=>x.id===b.tintProduct)?.name},
  {id:'aero',   name:'空力套件', ic:'wind',   val:b=>aeroProductsOf(car()).find(x=>x.id===b.aeroKit)?.name},
  {id:'alignment',name:'底盤定位',ic:'suspension',val:b=>`前 ${(+b.camberF).toFixed(1)}° / 後 ${(+b.camberR).toFixed(1)}°`},
];

function pgDesign(){
  const c = car();
  if(!c) return needCar('設計預覽需要先建立車輛 — 相容性會依你的年份、引擎與車身型式計算');
  if(!c.bodyId || !hasCar3D(c.bodyId)) return `<div class="card"><div class="empty">${ic('car',44)}
    <p><b>${c.bodyId?'此車身暫無專用 3D 模型':'還沒有選車身型式'}</b><br><span class="t-cap">${c.bodyId?'為避免顯示由其他車型硬切出的錯誤外觀，目前不提供預覽。':'設計預覽要知道是哪一種車身才畫得出來。'}
    ${esc(platName(platOf(c)))} 目前有：${bodiesOf(platOf(c)).filter(x=>hasCar3D(x.id)).map(x=>esc(x.name)).join('、')}</span></p>
    <button class="btn pri" onclick="editCar('${c.id}')">${c.bodyId?'編輯車輛':'去選車身型式'}</button></div></div>`;
  const b = c.build;
  const stock = stockBuildFor(c,b.paint);
  const wc = wheelCheck(c, {size:b.size, width:estWidth(b), et:estET(b), tireW:b.tireW, tireAR:b.tireAR});

  return `
  <div class="cols">
    <div class="stack">
      <div class="stage crop ab" id="stage">
        ${AB ? `<div>${carPhoto(stock,{bodyId:c.bodyId,uid:'ab0'})}</div>
          <div class="after" id="abAfter" style="--ab-pos:${ABPOS}%">${carPhoto(b,{bodyId:c.bodyId,uid:'ab1'})}</div>
          <div class="abh" id="abH" style="left:${ABPOS}%"></div>
          <div class="abl" style="left:14px">改裝後</div><div class="abl" style="right:14px">原廠</div>`
        : carPhoto(b,{bodyId:c.bodyId,uid:'st'})+driveOverlay()}
      </div>

      <div class="btnrow">
        <div class="seg"><button class="${!AB?'on':''}" onclick="AB=false;render()">預覽</button>
          <button class="${AB?'on':''}" onclick="AB=true;render()">前後比較</button></div>
        <button class="btn sm" style="margin-left:auto" onclick="exportPng()">下載圖片</button>
        <button class="btn sm" onclick="resetBuild()">回到原廠</button>
      </div>

      ${AB?'':c3iBar(b)}

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
    <b>這是依原廠尺寸校正的可互動 3D 外觀預覽。</b> 只有可獨立拆件的車身才會顯示輪圈、車高、外傾角與束角變化；合併網格會保留來源模型原狀。這不是原廠 CAD，安裝前仍須實車量測。
  </div>`;
}

function partPanel(b, c){
  const P = DPARTS.find(x=>x.id===DPART);
  const head = `<div class="row" style="padding-bottom:var(--s2);border-bottom:1px solid var(--line)">
    <button class="btn sm" onclick="DPART=null;render()">${ic('back',16)}</button>
    <b style="font-size:16px">${P.name}</b></div>`;
  let body = '';

  if(DPART==='paint'){
    const palette=paintsOf(c),p=palette.find(x=>x.id===b.paint)||palette[0];
    body = `<div style="padding-top:var(--s2)">
      ${c.bodyId==='sedan'?`<div class="note y">這個 Sedan 來源將車漆、玻璃與輪圈合併在同一材質，為了避免整車與玻璃一起被染色，3D 保留來源模型原色。</div>`:`<div class="swx">${palette.map(x=>`<span class="sw ${b.paint===x.id?'on':''}" style="background:${x.hex}"
        title="${esc(x.name)}" onclick="setB('paint','${x.id}')"></span>`).join('')}</div>
      <div class="kv" style="margin-top:var(--s2)"><span>目前</span><b>${esc(p.name)}</b></div>
      <div class="kv"><span>色號</span><b>${esc(p.code)}</b></div>`}
      ${platOf(c)==='e36'?`<label class="chk"><input type="checkbox" ${b.shadow?'checked':''} onchange="setB('shadow',this.checked)">
        <span>Shadowline 黑窗框</span></label>`:''}
      <div class="hint">改色需辦變更登記並換行照，代檢廠可在定期檢驗時一併辦理。</div></div>`;
  }
  if(DPART==='wheel'){
    body = c.bodyId==='sedan'?`<div style="padding-top:var(--s2)"><div class="note y">Sedan 輪圈與車身是合併網格，3D 保留來源輪圈，不再疊加第二組輪胎。款式與尺寸仍可在方案中記錄。</div></div>`:`<div style="padding-top:var(--s2)">
      <div class="product-grid">${wheelStylesOf(car()).map(w=>productOption(w,b.wheel,'wheel',w.img
        ?`<img src="${w.img}" alt="${esc(w.brand+' '+w.name)}" loading="lazy" referrerpolicy="no-referrer">`
        :wheelThumb(w.id,b.finish))).join('')}</div>
      <div class="t-cap" style="margin-top:var(--s3);margin-bottom:6px">輪圈顏色</div>
      <div class="swx">${WHEEL_FINISHES.map(f=>`<span class="sw ${b.finish===f.id?'on':''}" style="background:${f.face}"
        title="${esc(f.name)}" onclick="setB('finish','${f.id}')"></span>`).join('')}</div>
      <div class="hint">官方商品圖用來核對款式；3D 輪圈依原廠公開的輻條結構、凹面與輪唇特徵建立，不冒充原廠 CAD。</div></div>`;
  }
  if(DPART==='tire'){
    const od = tireOD({w:b.tireW,ar:b.tireAR,rim:b.size});
    const auto = rimFitmentIsAuto(b), j = rimJOf(b), et = rimETOf(b, stockET(c));
    const range = tireRimRange(b.tireW, b.tireAR);
    const inRange = j>=range[0] && j<=range[1];
    body = `<div style="padding-top:var(--s2)">
      <div class="product-grid compact">${TIRE_PRODUCTS.map(x=>productOption(x,b.tireProduct,'tireProduct')).join('')}</div>
      ${sliderInput('輪圈尺寸','吋','size',14,19,1,b.size)}
      ${sliderInput('胎寬','mm','tireW',185,285,5,b.tireW)}
      ${sliderInput('扁平比','%','tireAR',25,70,5,b.tireAR)}
      <div class="kv"><span>規格</span><b>${b.tireW}/${b.tireAR} R${b.size}</b></div>
      <div class="kv"><span>外徑</span><b>${od.toFixed(0)} mm</b></div>

      <div class="t-cap" style="margin-top:var(--s3);margin-bottom:6px">輪圈寬與 ET${auto?'（目前為推估值）':''}</div>
      <label class="chk"><input type="checkbox" ${auto?'checked':''}
        onchange="setRimAuto(this.checked)">依胎寬自動推估</label>
      ${auto?`<div class="kv"><span>推估輪圈寬</span><b>${j.toFixed(1)}J</b></div>
      <div class="kv"><span>推估 ET</span><b>ET${et.toFixed(0)}</b></div>`
      :`${sliderInput('輪圈寬','J','rimJ',5.5,11,0.5,j)}
        ${sliderInput('ET（偏距）','mm','rimET',0,60,1,et)}`}
      <div class="kv"><span>輪胎實際斷面寬</span><b>${tireSectionWidth(b.tireW,j).toFixed(0)} mm</b></div>
      <div class="kv"><span>輪胎總寬（會磨葉子板的值）</span><b>${tireOverallWidth(b.tireW,j).toFixed(0)} mm</b></div>
      <div class="note ${inRange?'b':'y'}" style="margin-top:var(--s2)">
        ${b.tireW}/${b.tireAR} 的 ETRTO 允許輪圈寬約 <b>${range[0]}J–${range[1]}J</b>，
        目前 ${j.toFixed(1)}J ${inRange?'在範圍內':'<b>超出範圍</b>，實際不建議這樣配'}。
        斷面寬每偏離量測輪圈 0.5 吋約變化 5 mm（ETRTO／Tire Rack）。
        ${auto?'推估值只是常見配法，不是查到的規格 —— 有實際輪圈資料請關掉自動推估自己填。':'3D 預覽與相容性判斷都吃這一組數字。'}
      </div>
      <div class="note b" style="margin-top:var(--s2)">${platOf(c)==='dsm2g'
        ?'1997–1999 GSX 原廠為 <b>17×6.5JJ、ET46、215/50R17 90V</b>。變更尺寸時，外徑仍須控制在原廠值 ±2% 內。'
        :'E36 最佳解通常是 <b>245/40R17</b>，外徑僅 +0.13%、速度表幾乎零誤差。避開 235/40R18（+2.90%，超出台灣 2% 門檻）。'}</div></div>`;
  }
  if(DPART==='drop'){
    const products=suspensionProductsOf(c),eclipse=platOf(c)==='dsm2g';
    body = `<div style="padding-top:var(--s2)">
      <div class="product-grid compact">${products.map(x=>productOption(x,b.suspension,'suspension')).join('')}</div>
      ${sliderInput('前軸降低','mm','dropF',0,80,1,b.dropF)}
      ${sliderInput('後軸降低','mm','dropR',0,80,1,b.dropR)}
      <div class="note y" style="margin-top:var(--s2)">${eclipse
        ?'2G Eclipse 前後皆為獨立多連桿；前軸的高置上臂與兩支下臂形成類雙 A 臂幾何。過度降低會改變控制臂工作角度，設定後必須重新定位。'
        :'降低幅度越大，後副樑鎖點的疲勞風險越高。施工前請檢查 E36 後副樑四個鎖點。'}</div>
      <div class="hint">${eclipse
        ?'TEIN 公開的 D33A AWD 建議調整範圍約為前 36–56 mm、後 25–46 mm。'
        :'B14 的 E36 官方範圍：前 35–55 mm、後 20–45 mm。'}前後可分開調整，車身姿態會同步變化。</div></div>`;
  }
  if(DPART==='brake'){
    const products=brakeProductsOf(c),selected=products.find(x=>x.id===b.brakeKit)||products[0];
    body = `<div style="padding-top:var(--s2)">
      <div class="product-grid compact">${products.map(x=>productOption(x,b.brakeKit,'brakeKit')).join('')}</div>
      <div class="swx">${CALIPER_COLORS.map(x=>`<span class="sw ${b.caliper===x.id?'on':''}" style="background:${x.hex}"
        title="${esc(x.name)}" onclick="setB('caliper','${x.id}')"></span>`).join('')}</div>
      <div class="kv" style="margin-top:var(--s2)"><span>碟盤直徑</span><b>${selected.disc} mm</b></div>
      <div class="kv"><span>前卡鉗</span><b>${selected.pistons} 活塞</b></div>
      <div class="hint">卡鉗尺寸、活塞數與碟盤直徑會在輪圈內同步顯示；實際套件仍須核對車型料號與輪圈間隙。</div></div>`;
  }
  if(DPART==='tint'){
    body = `<div style="padding-top:var(--s2)">
      <div class="product-grid compact">${TINT_PRODUCTS.map(x=>productOption(x,b.tintProduct,'tintProduct')).join('')}</div>
      ${sliderInput('視覺深色程度','%','tint',0,90,5,b.tint)}
      <div class="hint">產品 VLT 與畫面深淺分開顯示；玻璃角度、環境光與螢幕亮度都會影響視覺結果。</div></div>`;
  }
  if(DPART==='aero'){
    const aero=aeroProductsOf(c),exact=aero.filter(x=>x.preview3d);
    body = `<div style="padding-top:var(--s1)">
      <div class="product-grid compact">${aero.map(x=>productOption(x,b.aeroKit,'aeroKit')).join('')}</div>
      <div class="note ${exact.length>1?'b':'y'}" style="margin-top:var(--s2)">${exact.length>1
        ?'只有畫面中實際存在的車型專用網格可以切換，不再用通用平板零件取代真實套件。'
        :'這個車身目前只開放原廠網格預覽。尚未取得專用 3D 零件的套件僅保留官方資料，不會硬套到車上。'}</div>
      <div class="hint">尾翼、引擎蓋、寬體與排氣必須有這個車身的專用建模才會出現在 3D 預覽。</div></div>`;
  }
  if(DPART==='alignment') body = alignmentPanel(b);
  return head + body;
}

function productOption(item, current, key, media){
  const detail=item.cat||item.name,source=productSourceLink(item);
  const disabled=key==='aeroKit'&&item.preview3d===false;
  const productMedia=media||(item.img?`<img src="${item.img}" alt="${esc(item.brand+' '+item.name)}" loading="lazy" referrerpolicy="no-referrer"
    onerror="this.remove()"><b class="product-fallback">${esc(item.brand)}</b>`:`<b>${esc(item.brand)}</b>`);
  return `<div class="product-option ${current===item.id?'on':''} ${disabled?'disabled':''}" role="button" tabindex="${disabled?-1:0}"
    ${disabled?'aria-disabled="true"':`onclick="setB('${key}','${item.id}')" onkeydown="if(event.key==='Enter')setB('${key}','${item.id}')"`}>
    <div class="product-media">${productMedia}</div>
    <div class="product-copy"><span>${esc(item.brand||'')}</span><b>${esc(item.name)}</b><small>${disabled?'資料參考 · 尚無專用 3D':esc(detail)}</small></div>
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
/* 這台車的原廠 ET（3D 的 hubFace 基準與推估值都靠它） */
function stockET(c){
  if(c&&platOf(c)==='dsm2g')return eclipseStockFitment(c).wheelET;
  return +(c?.wheelET)||47;
}
/* estWidth / estET 保留舊名給既有呼叫點，但一律轉呼叫 11-data-wheel.js 的單一來源，
   確保 3D 預覽與相容性計算用的是同一組 J 寬與 ET。 */
function estWidth(b){
  const c=car();
  if(c&&platOf(c)==='dsm2g'&&b.wheel==='ecl-oem'&&rimFitmentIsAuto(b))return eclipseStockFitment(c).wheelW;
  return rimJOf(b);
}
function estET(b){
  const c=car();
  if(c&&platOf(c)==='dsm2g'&&b.wheel==='ecl-oem'&&rimFitmentIsAuto(b))return eclipseStockFitment(c).wheelET;
  return rimETOf(b, stockET(c));
}
/* 切換「自動推估 / 自己填」。關掉自動時，先把目前的推估值寫進去當起點。 */
function setRimAuto(auto){
  const c=car(); if(!c) return;
  if(auto){ c.build.rimJ=null; c.build.rimET=null; }
  else { c.build.rimJ=rimJOf(c.build); c.build.rimET=rimETOf(c.build, stockET(c)); }
  saveDB(); render();
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
    const products=suspensionProductsOf(car()),x=products.find(p=>p.id===v)||products[0];
    b.dropF=x.front[0];b.dropR=x.rear[0];b.drop=Math.round((b.dropF+b.dropR)/2);
  }
  if(k==='brakeKit'){
    const x=brakeProductsOf(car()).find(p=>p.id===v);if(x&&x.color)b.caliper=x.color;
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
  c.build = stockBuildFor(c,keep);
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

/* ==========================================================================
   互動預覽控制列（燈光 / 引擎聲 / 駕駛）
   引擎邏輯在 31-car3d.js：這裡只有 UI 與事件接線。
   所有控制都走「直接改 DOM + 廣播到 3D 場景」，不觸發整頁 render() ——
   否則每按一次開關就重建一次 WebGL 場景。
   ========================================================================== */
const C3I_CSS=`<style>
.c3i{display:flex;flex-direction:column;gap:10px}
.c3i .rowline{display:flex;align-items:center;gap:10px;flex-wrap:wrap}
.c3i .lb{font-size:12px;color:var(--mut);flex:0 0 56px}
.c3i .btn.tgl.on{background:var(--tech);border-color:var(--tech);color:#0a120e}
.c3i input[type=range]{flex:1;min-width:80px}
.c3rpm{flex:1;min-width:130px;display:flex;align-items:center;gap:8px}
.c3rpm .bar{flex:1;height:6px;border-radius:3px;background:var(--fill);overflow:hidden}
.c3rpm .bar i{display:block;height:100%;width:0;background:var(--tech);transition:width .06s linear}
.c3rpm b{font-variant-numeric:tabular-nums;min-width:44px;text-align:right;font-size:14px}
.drive-ov{position:absolute;inset:0;z-index:3;pointer-events:none;display:none}
.stage.driving .drive-ov{display:block}
.drive-hud{position:absolute;top:10px;left:12px;background:rgba(8,14,12,.55);color:#e7f3ee;
  padding:3px 10px;border-radius:8px;font-size:12px;backdrop-filter:blur(4px)}
.drive-hud b{font-size:19px;font-variant-numeric:tabular-nums}
.joy{position:absolute;left:16px;bottom:14px;width:96px;height:96px;border-radius:50%;
  background:rgba(10,16,14,.35);border:1px solid rgba(255,255,255,.28);pointer-events:auto;touch-action:none}
.joy i{position:absolute;left:50%;top:50%;width:40px;height:40px;border-radius:50%;
  background:rgba(255,255,255,.78);transform:translate(-50%,-50%);pointer-events:none}
.pedals{position:absolute;right:14px;bottom:14px;display:flex;gap:10px;pointer-events:auto}
.pedals button{width:60px;height:60px;border-radius:50%;border:1px solid rgba(255,255,255,.3);
  background:rgba(10,16,14,.45);color:#fff;font-size:13px;touch-action:none;user-select:none;-webkit-user-select:none}
.pedals button:active{background:var(--tech);color:#0a120e}
</style>`;
function driveOverlay(){
  return `<div class="drive-ov">
    <div class="drive-hud"><b id="driveSpeed">0</b> km/h</div>
    <div class="joy" id="c3Joy"><i id="c3JoyKnob"></i></div>
    <div class="pedals">
      <button id="c3PedalB" type="button" aria-label="煞車">煞車</button>
      <button id="c3PedalA" type="button" aria-label="油門">油門</button>
    </div>
  </div>`;
}
function c3iBar(b){
  const L=car3DLightState(b);
  return `${C3I_CSS}<div class="card c3i">
    <div class="rowline"><span class="lb">燈光</span>
      <div class="seg" id="c3HeadSeg">${[[0,'關'],[1,'小燈'],[2,'近燈'],[3,'遠燈']].map(([v,n])=>
        `<button class="${L.head===v?'on':''}" onclick="c3iHead(${v})">${n}</button>`).join('')}</div>
      <button class="btn sm tgl ${L.brake?'on':''}" id="c3Brake" onclick="c3iLight('brake')">煞車燈</button>
      <button class="btn sm tgl ${L.turn==='hazard'?'on':''}" id="c3Turn" onclick="c3iTurn()">雙黃警示</button>
      <button class="btn sm tgl ${L.night?'on':''}" id="c3Night" onclick="c3iLight('night')">夜間模式</button>
    </div>
    <div class="rowline"><span class="lb">引擎聲</span>
      <button class="btn sm ${C3AUD.running?'':'pri'}" id="c3EngineBtn" onclick="toggleCar3DEngine()">${C3AUD.running?'熄火':'發動引擎'}</button>
      <button class="btn sm" id="c3Hold" onpointerdown="holdCar3DThrottle(1)" onpointerup="holdCar3DThrottle(0)"
        onpointercancel="holdCar3DThrottle(0)" onpointerleave="holdCar3DThrottle(0)">按住吹油</button>
      <input type="range" min="0" max="100" value="${Math.round(C3AUD.slider*100)}" aria-label="持續油門"
        oninput="setCar3DThrottle(this.value/100)">
      <div class="c3rpm"><div class="bar"><i id="c3RpmBar"></i></div><b id="c3RpmVal">0</b><span class="mut" style="font-size:11px">rpm</span></div>
    </div>
    <div class="rowline"><span class="lb"></span>
      <span class="mut" id="c3EngineName" style="font-size:12px"></span>
      <span style="flex:1"></span>
      <input type="range" min="0" max="100" value="${Math.round(C3AUD.vol*100)}" style="max-width:110px;flex:0 1 110px"
        aria-label="音量" oninput="setCar3DVolume(this.value/100)">
      <button class="btn sm" id="c3MuteBtn" onclick="toggleCar3DMute()">${C3AUD.muted?'取消靜音':'靜音'}</button>
    </div>
    <div class="rowline"><span class="lb">駕駛</span>
      <button class="btn sm tgl ${CAR3D_DRIVE.on?'on':''}" id="c3Drive" onclick="c3iDrive()">駕駛模式</button>
      <button class="btn sm tgl ${CAR3D_DRIVE.follow?'on':''}" id="c3Follow" onclick="c3iFollow()">跟隨鏡頭</button>
      <button class="btn sm" onclick="resetCar3DDrive()">回到原點</button>
      <span class="mut" style="font-size:12px">WASD／方向鍵；手機用畫面左下搖桿與右下踏板</span>
    </div>
  </div>`;
}
function c3iLightsMut(fn){
  const c=car();if(!c)return;
  const L=car3DLightState(c.build);fn(L);
  c.build.lights=L;saveDB();
  updateCar3DLights(c.build);c3iLightUI(L);
}
function c3iHead(v){c3iLightsMut(L=>L.head=v);}
function c3iLight(k){c3iLightsMut(L=>L[k]=!L[k]);}
function c3iTurn(){c3iLightsMut(L=>L.turn=L.turn==='hazard'?'none':'hazard');}
function c3iLightUI(L){
  const seg=$('#c3HeadSeg');
  if(seg)[...seg.children].forEach((el,i)=>el.classList.toggle('on',i===L.head));
  $('#c3Brake')?.classList.toggle('on',L.brake);
  $('#c3Turn')?.classList.toggle('on',L.turn==='hazard');
  $('#c3Night')?.classList.toggle('on',L.night);
}
function c3iDrive(){
  setCar3DDriveMode(!CAR3D_DRIVE.on);
  $('#c3Drive')?.classList.toggle('on',CAR3D_DRIVE.on);
  $('#stage')?.classList.toggle('driving',CAR3D_DRIVE.on);
}
function c3iFollow(){
  setCar3DFollow(!CAR3D_DRIVE.follow);
  $('#c3Follow')?.classList.toggle('on',CAR3D_DRIVE.follow);
}
function afterInteract(){
  const joy=$('#c3Joy'),knob=$('#c3JoyKnob');
  if(joy){
    let pid=null;
    const setJoy=(dx,dy)=>{
      CAR3D_DRIVE.joySteer=dx;CAR3D_DRIVE.joyThrottle=-dy;
      if(knob)knob.style.transform=`translate(calc(-50% + ${(dx*28).toFixed(1)}px),calc(-50% + ${(dy*28).toFixed(1)}px))`;
    };
    const move=e=>{
      if(pid===null||e.pointerId!==pid)return;
      const r=joy.getBoundingClientRect();
      let dx=(e.clientX-r.left-r.width/2)/(r.width/2),dy=(e.clientY-r.top-r.height/2)/(r.height/2);
      const len=Math.hypot(dx,dy);if(len>1){dx/=len;dy/=len;}
      setJoy(dx,dy);
    };
    joy.addEventListener('pointerdown',e=>{pid=e.pointerId;joy.setPointerCapture(pid);move(e);});
    joy.addEventListener('pointermove',move);
    const end=e=>{if(e.pointerId!==pid)return;pid=null;setJoy(0,0);};
    joy.addEventListener('pointerup',end);joy.addEventListener('pointercancel',end);
  }
  const bindPedal=(el,k)=>{
    if(!el)return;
    el.addEventListener('pointerdown',e=>{e.preventDefault();CAR3D_DRIVE[k]=1;el.setPointerCapture(e.pointerId);});
    ['pointerup','pointercancel','lostpointercapture'].forEach(ev=>el.addEventListener(ev,()=>CAR3D_DRIVE[k]=0));
  };
  bindPedal($('#c3PedalA'),'padThrottle');
  bindPedal($('#c3PedalB'),'padBrake');
  if(CAR3D_DRIVE.on)$('#stage')?.classList.add('driving');
  c3audUI();
}

/* A/B 拖曳 */
function afterDesign(){
  afterInteract();
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
