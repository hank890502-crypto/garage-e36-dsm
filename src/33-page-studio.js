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
  {id:'drive',  name:'傳動系統', ic:'gauge',  val:b=>{
    const c=car(),st=stockDrivetrain(c);
    const g=gearboxById(b.gearbox||st.gearbox),f=finalDriveById(b.finalDrive||st.finalDrive);
    return [g&&g.name,f&&('終傳 '+f.label)].filter(Boolean).join(' · ');
  }},
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
  if(DPART==='drive') body = drivetrainPanel(b, c);
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

/* ==========================================================================
   傳動系統面板
   --------------------------------------------------------------------------
   資料與來源標註在 12-data-drivetrain.js。這裡負責顯示與試算。
   加速與極速是用引擎扭力曲線 + 齒比即時算的，不是查表。
   ========================================================================== */
function confBadge(x){
  if(!x) return '';
  const map={oem:['原廠','b'],trade:['同業技術文獻','b'],vendor:['廠商公布','b'],
             community:['社群共識','y'],est:['★估算值★','y']};
  const m=map[x.conf]; if(!m) return '';
  return `<span class="chip ${m[1]==='y'?'warn':''}" style="font-size:11px">${m[0]}</span>`;
}

function driveOption(item, current, key){
  const on = current===item.id;
  return `<div class="dt-opt ${on?'on':''}" role="button" tabindex="0"
    onclick="setDrivetrain('${key}','${item.id}')"
    onkeydown="if(event.key==='Enter')setDrivetrain('${key}','${item.id}')">
    <div class="dt-head"><b>${esc(item.name)}</b>${confBadge(item)}</div>
    <div class="dt-sub">${esc(item.brand||'')}${item.fits?' · '+esc(item.fits):''}${item.use?' · '+esc(item.use):''}</div>
    ${item.desc?`<div class="dt-desc">${esc(item.desc)}</div>`:''}
    ${item.note?`<div class="dt-desc mut">${esc(item.note)}</div>`:''}
  </div>`;
}

function drivetrainPanel(b, c){
  const st = stockDrivetrain(c);
  const gb = gearboxById(b.gearbox||st.gearbox) || gearboxesOf(c)[0];
  const fd = finalDriveById(b.finalDrive||st.finalDrive) || finalDrivesOf(c)[0];
  const df = diffById(b.diff||st.diff) || diffsOf(c)[0];
  const cl = clutchById(b.clutch||st.clutch) || clutchesOf(c)[0];
  const fw = flywheelById(b.flywheel||st.flywheel) || flywheelsOf(c)[0];
  const gears = (Array.isArray(b.gearRatios)&&b.gearRatios.length) ? b.gearRatios : gb.gears;
  const eng = carEngine(c), cv = engineCurve(eng?eng.id:'');
  const tireR = car3DTireRadius(b);
  const kphAt = (ratio,rpm)=> rpm*Math.PI/30/(ratio*fd.ratio)*tireR*3.6;

  const rows = gears.map((g,i)=>{
    const top = kphAt(g, cv.cut);
    const at100 = 100/3.6/tireR*(g*fd.ratio)*30/Math.PI;
    return `<tr>
      <td class="num">${i+1}</td>
      <td><input type="number" class="dt-ratio" step="0.001" min="0.4" max="6" value="${(+g).toFixed(3)}"
          aria-label="第 ${i+1} 檔齒比" onchange="setGearRatio(${i},this.value)"></td>
      <td class="num">${(g*fd.ratio).toFixed(2)}</td>
      <td class="num">${top.toFixed(0)}</td>
      <td class="num">${at100>cv.cut?'—':at100.toFixed(0)}</td>
    </tr>`;
  }).join('');

  /* 0–100 試算：用扭力曲線在各檔位積分（簡化：忽略換檔損失以外的阻力細節） */
  const accel = estimate0to100(b, c, gb, fd, gears, cv, tireR);

  return `<div style="padding-top:var(--s2)">
    ${DT_CSS}
    <div class="note b">傳動改裝在 3D 預覽裡是「開得出來」的：齒比與終傳直接決定加速與換檔轉速，
      LSD 的鎖定率會影響出彎內輪空轉與飄移的可控性，飛輪慣量改變補油的升轉速度與引擎聲。</div>

    <div class="dt-sum">
      <div><span>總減速比（一檔）</span><b>${(gears[0]*fd.ratio).toFixed(2)}</b></div>
      <div><span>極速（${gears.length}檔斷油）</span><b>${kphAt(gears[gears.length-1],cv.cut).toFixed(0)} km/h</b></div>
      <div><span>0–100 估算</span><b>${accel?accel.toFixed(1)+' 秒':'—'}</b></div>
      <div><span>飛輪慣量</span><b>${flywheelInertia(fw.kg).toFixed(3)} kg·m²</b></div>
    </div>

    <h4 class="dt-h">變速箱</h4>
    <div class="dt-list">${gearboxesOf(c).map(x=>driveOption(x,gb.id,'gearbox')).join('')}</div>

    <h4 class="dt-h">各檔齒比${b.gearRatios?'（已自訂）':''}</h4>
    <table class="dt-table"><thead><tr>
      <th>檔</th><th>齒比</th><th>總減速</th><th>斷油極速<br><small>km/h</small></th><th>100 km/h<br><small>rpm</small></th>
    </tr></thead><tbody>${rows}</tbody></table>
    <div class="btnrow" style="margin-top:8px">
      <button class="btn sm" onclick="resetGearRatios()">回到這顆變速箱的原始齒比</button>
    </div>
    <div class="hint">直接改數字就會即時反映在 3D 的加速與換檔轉速上。密齒比讓每次換檔的轉速掉落變小，
      引擎更容易待在扭力帶裡；但一檔拉長會犧牲起步。</div>

    <h4 class="dt-h">終傳比</h4>
    <div class="dt-chips">${finalDrivesOf(c).map(x=>`
      <button class="dt-chip ${fd.id===x.id?'on':''}" onclick="setDrivetrain('finalDrive','${x.id}')"
        title="${esc((x.code||'')+' '+(x.use||''))}">
        ${x.label}${x.oe?'':' <small>非原廠</small>'}</button>`).join('')}</div>
    <div class="dt-desc" style="margin-top:6px">${esc(fd.code||'')}${fd.use?' — '+esc(fd.use):''} ${confBadge(fd)}</div>
    ${fd.stages?`<div class="note y" style="margin-top:var(--s2)">
      <b>AWD 的終傳不是單一齒輪。</b> 變速箱出來先經一次減速 ${fd.stages.primary}，
      進中央差速器後分成前後兩路：前差速器 ${fd.stages.front}；後方再經分動箱 ${fd.stages.transfer}
      到後差速器 ${fd.stages.rear}。上面的 ${fd.label} 是換算後的等效總終傳。</div>`:''}

    <h4 class="dt-h">差速器（LSD）</h4>
    <div class="dt-list">${diffsOf(c).map(x=>driveOption(x,df.id,'diff')).join('')}</div>
    <div class="note ${df.est?'y':'b'}" style="margin-top:var(--s2)">
      <b>「鎖定率 25%」不是固定值。</b> 廠商的定義是「可跨傳到有抓地力那一輪的扭力，
      最多為輸入扭力的 25%」—— 所以同一顆差速器裝在 240 Nm 的引擎上，效果會比裝在 360 Nm 的明顯。
      物理模型是照這個定義寫的。<br>
      目前設定：加速側 ${(df.lockA*100).toFixed(0)}%、減速側 ${(df.lockD*100).toFixed(0)}%、預壓 ${df.pre} Nm${df.ways?`、${df.ways}way`:''}。
    </div>

    <h4 class="dt-h">離合器</h4>
    <div class="dt-list">${clutchesOf(c).map(x=>driveOption(x,cl.id,'clutch')).join('')}</div>
    <div class="kv"><span>容許扭力</span><b>${cl.nm} Nm</b></div>
    <div class="kv"><span>引擎峰值扭力</span><b>${cv.nm} Nm</b></div>
    ${cv.nm>cl.nm*0.92?`<div class="note r" style="margin-top:var(--s2)">
      引擎峰值扭力已接近或超過這顆離合器的容許值，3D 裡會出現打滑（轉速上去但車速跟不上）。</div>`:''}

    <h4 class="dt-h">飛輪</h4>
    <div class="dt-list">${flywheelsOf(c).map(x=>driveOption(x,fw.id,'flywheel')).join('')}</div>
    <div class="hint">飛輪越輕，空檔補油的升轉越快、放油門掉得也越快 —— 在 3D 裡按住「吹油」最容易聽出差別。
      代價是低速換檔與起步更容易熄火，市區會比較累。</div>

    <div class="src">齒比、終傳與零件規格的來源與可信度分級見各項目標籤。
      標示★估算值★的是廠商不公布規格（例如 Quaife 官方明文拒絕公布扭力偏壓比），
      由同型產品推估，僅供模擬，不可作為採購依據。</div>
  </div>`;
}

/* 0–100 km/h 估算：逐步積分，含換檔時間與空氣阻力 */
function estimate0to100(b, c, gb, fd, gears, cv, tireR){
  const body = bodyById(c.bodyId);
  const plat = platOf(c);
  const mass = (body&&+body.kg) || (plat==='dsm2g'?1350:1400);
  const drive = plat==='dsm2g' ? (mdlById(c.modelId)?.drive==='AWD'?'awd':'fwd') : 'rwd';
  const muLimit = drive==='awd' ? 1.05 : 0.55;      // 驅動輪能傳到地面的加速度上限（g）
  let v=0, t=0, gear=0;
  for(let i=0;i<20000;i++){
    const ratio=gears[gear]*fd.ratio;
    const rpm=v/tireR*ratio*30/Math.PI;
    if(rpm>cv.cut){
      if(gear>=gears.length-1) break;
      gear++; t+=0.25; continue;                     // 換檔耗時
    }
    const T=cv.nm*torqueFactor(cv, Math.max(1000,rpm))*ratio*0.92;   // 傳動效率
    let a=T/tireR/mass;
    a=Math.min(a, muLimit*9.81);                     // 抓地力上限
    a-=0.5*1.2*0.31*1.9*v*v/mass + 0.014*9.81;
    if(a<=0.05) break;
    v+=a*0.01; t+=0.01;
    if(v>=27.78) return t;
  }
  return null;
}

const DT_CSS=`<style>
.dt-h{font-size:14px;margin:var(--s3) 0 6px;color:var(--mut);font-weight:600}
.dt-list{display:flex;flex-direction:column;gap:6px}
.dt-opt{border:1px solid var(--line);border-radius:var(--rs);padding:9px 11px;cursor:pointer;background:var(--fill)}
.dt-opt.on{border-color:var(--tech);box-shadow:inset 0 0 0 1px var(--tech)}
.dt-head{display:flex;align-items:center;gap:7px;flex-wrap:wrap}
.dt-head b{font-size:14px}
.dt-sub{font-size:12px;color:var(--mut);margin-top:2px}
.dt-desc{font-size:12px;line-height:1.55;margin-top:5px}
.dt-desc.mut{color:var(--mut)}
.dt-chips{display:flex;flex-wrap:wrap;gap:6px}
.dt-chip{padding:5px 11px;border:1px solid var(--line);border-radius:99px;background:var(--fill);
  font-size:13px;font-variant-numeric:tabular-nums;cursor:pointer}
.dt-chip.on{background:var(--tech);border-color:var(--tech);color:#0a120e}
.dt-chip small{font-size:10px;opacity:.7}
.dt-table{width:100%;border-collapse:collapse;font-size:13px;margin-top:4px}
.dt-table th{font-size:11px;color:var(--mut);font-weight:500;padding:4px 6px;text-align:right;border-bottom:1px solid var(--line)}
.dt-table th:first-child,.dt-table td:first-child{text-align:center;width:34px}
.dt-table td{padding:4px 6px;text-align:right;border-bottom:1px solid var(--line)}
.dt-table td.num{font-variant-numeric:tabular-nums}
.dt-ratio{width:74px;padding:3px 6px;border:1px solid var(--line);border-radius:6px;
  background:var(--bg);color:inherit;font-variant-numeric:tabular-nums;text-align:right}
.dt-sum{display:grid;grid-template-columns:repeat(2,1fr);gap:8px;margin:var(--s2) 0}
.dt-sum>div{background:var(--fill);border-radius:var(--rs);padding:8px 10px}
.dt-sum span{display:block;font-size:11px;color:var(--mut)}
.dt-sum b{font-size:17px;font-variant-numeric:tabular-nums}
.chip.warn{background:var(--orange,#c47b12);color:#fff}
</style>`;

function setDrivetrain(key, id){
  const c=car(); if(!c) return;
  c.build[key]=id;
  if(key==='gearbox') c.build.gearRatios=null;   // 換箱就回到那顆箱的原始齒比
  saveDB(); render();
}
function setGearRatio(i, v){
  const c=car(); if(!c) return;
  const st=stockDrivetrain(c);
  const gb=gearboxById(c.build.gearbox||st.gearbox);
  const cur=(Array.isArray(c.build.gearRatios)&&c.build.gearRatios.length)?c.build.gearRatios.slice():gb.gears.slice();
  const n=Math.max(.4,Math.min(6,+v||cur[i]));
  cur[i]=Math.round(n*1000)/1000;
  c.build.gearRatios=cur; saveDB(); render();
}
function resetGearRatios(){
  const c=car(); if(!c) return;
  c.build.gearRatios=null; saveDB(); render();
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
.c3rpm{flex:1;min-width:150px;display:flex;align-items:center;gap:8px}
.c3rpm .bar{flex:1;height:7px;border-radius:4px;background:var(--fill);overflow:hidden;position:relative}
.c3rpm .bar i{display:block;height:100%;width:0;background:var(--tech);transition:width .05s linear}
.c3rpm .bar u{position:absolute;top:0;bottom:0;width:2px;background:var(--red);opacity:.55}
.c3rpm b{font-variant-numeric:tabular-nums;min-width:46px;text-align:right;font-size:14px}
.c3gear{display:inline-flex;align-items:baseline;gap:3px;font-variant-numeric:tabular-nums}
.c3gear b{font-size:20px;min-width:22px;text-align:center}
.c3gear span{font-size:11px;color:var(--mut)}

.drive-ov{position:absolute;inset:0;z-index:3;pointer-events:none;display:none}
.stage.driving .drive-ov{display:block}
.drive-hud{position:absolute;top:10px;left:12px;background:rgba(8,14,12,.58);color:#e7f3ee;
  padding:6px 12px;border-radius:10px;backdrop-filter:blur(5px);line-height:1.25;
  font-variant-numeric:tabular-nums;min-width:104px}
.drive-hud .sp{font-size:26px;font-weight:600}
.drive-hud .sp small{font-size:11px;font-weight:400;opacity:.75;margin-left:3px}
.drive-hud .gr{font-size:13px;opacity:.9;display:flex;gap:8px;align-items:center}
.drive-hud .gr em{font-style:normal;color:#7fe3c0;font-weight:600}
.drive-hud .rv{height:4px;border-radius:2px;background:rgba(255,255,255,.18);margin-top:5px;overflow:hidden}
.drive-hud .rv i{display:block;height:100%;width:0;background:#7fe3c0}
.drive-drift{position:absolute;top:10px;right:12px;background:rgba(8,14,12,.58);color:#ffd27f;
  padding:5px 11px;border-radius:10px;font-size:12px;backdrop-filter:blur(5px);
  font-variant-numeric:tabular-nums;opacity:0;transition:opacity .18s}
.drive-drift.on{opacity:1}
.drive-drift b{font-size:17px}

.joy{position:absolute;left:16px;bottom:14px;width:96px;height:96px;border-radius:50%;
  background:rgba(10,16,14,.35);border:1px solid rgba(255,255,255,.28);pointer-events:auto;touch-action:none}
.joy i{position:absolute;left:50%;top:50%;width:40px;height:40px;border-radius:50%;
  background:rgba(255,255,255,.78);transform:translate(-50%,-50%);pointer-events:none}
.pedals{position:absolute;right:14px;bottom:14px;display:flex;gap:9px;align-items:flex-end;pointer-events:auto}
.pedals button{width:58px;height:58px;border-radius:50%;border:1px solid rgba(255,255,255,.3);
  background:rgba(10,16,14,.45);color:#fff;font-size:12px;touch-action:none;user-select:none;-webkit-user-select:none}
.pedals button:active,.pedals button.on{background:var(--tech);color:#0a120e}
.paddles{position:absolute;right:14px;bottom:82px;display:flex;gap:9px;pointer-events:auto}
.paddles button{width:44px;height:34px;border-radius:8px;border:1px solid rgba(255,255,255,.3);
  background:rgba(10,16,14,.45);color:#fff;font-size:15px;user-select:none;-webkit-user-select:none}
.paddles button:active{background:var(--tech);color:#0a120e}
</style>`;

function driveOverlay(){
  return `<div class="drive-ov">
    <div class="drive-hud">
      <div class="sp"><span id="driveSpeed">0</span><small>km/h</small></div>
      <div class="gr"><span>檔位 <em id="driveGear">N</em></span><span id="driveMode">手排</span></div>
      <div class="rv"><i id="driveRev"></i></div>
    </div>
    <div class="drive-drift" id="driveDrift">飄移 <b>0</b>°</div>
    <div class="joy" id="c3Joy"><i id="c3JoyKnob"></i></div>
    <div class="paddles">
      <button id="c3Down" type="button" aria-label="降檔" onclick="car3DShift(-1)">−</button>
      <button id="c3Up" type="button" aria-label="升檔" onclick="car3DShift(1)">＋</button>
    </div>
    <div class="pedals">
      <button id="c3PedalH" type="button" aria-label="手煞車">手煞</button>
      <button id="c3PedalB" type="button" aria-label="煞車">煞車</button>
      <button id="c3PedalA" type="button" aria-label="油門">油門</button>
    </div>
  </div>`;
}

/* HUD 由模擬每 60ms 推一次，不走 render() */
function updateDriveHUD(S){
  if(!S) return;
  const sp=document.getElementById('driveSpeed');
  if(!sp) return;
  sp.textContent=Math.round(Math.abs(S.speed));
  const g=document.getElementById('driveGear');
  if(g) g.textContent=S.shifting>0?'—':(S.gear===0?'N':S.gear<0?'R':String(S.gear));
  const md=document.getElementById('driveMode');
  if(md) md.textContent=S.autoMode?'自排':'手排';
  const rv=document.getElementById('driveRev');
  if(rv){
    const p=Math.min(100,S.rpm/Math.max(1,S.cfg.cv.cut)*100);
    rv.style.width=p+'%';
    rv.style.background=p>93?'#ff5a5a':p>80?'#ffb44d':'#7fe3c0';
  }
  const df=document.getElementById('driveDrift');
  if(df){
    const a=Math.abs(S.drift);
    df.classList.toggle('on', a>7);
    if(a>7) df.innerHTML='飄移 <b>'+a.toFixed(0)+'</b>°';
  }
  /* 控制列上的轉速表 */
  const rb=document.getElementById('c3RpmBar');
  if(rb){
    const p=Math.min(100,S.rpm/Math.max(1,S.cfg.cv.cut)*100);
    rb.style.width=p+'%';
    rb.style.background=p>93?'var(--red)':p>80?'var(--orange)':'var(--tech)';
  }
  const rv2=document.getElementById('c3RpmVal'); if(rv2) rv2.textContent=Math.round(S.rpm);
  const gb=document.getElementById('c3GearVal');
  if(gb) gb.textContent=S.gear===0?'N':S.gear<0?'R':String(S.gear);
  const sv=document.getElementById('c3SpeedVal'); if(sv) sv.textContent=Math.round(Math.abs(S.speed));
}

function c3iBar(b){
  const L=car3DLightState(b);
  const c=car(), eng=carEngine(c), cv=engineCurve(eng?eng.id:'');
  const S=CAR3D_DRIVE.sim;
  const auto=S?S.autoMode:false;
  return `${C3I_CSS}<div class="card c3i">
    <div class="rowline"><span class="lb">燈光</span>
      <div class="seg" id="c3HeadSeg">${[[0,'關'],[1,'小燈'],[2,'近燈'],[3,'遠燈']].map(([v,n])=>
        `<button class="${L.head===v?'on':''}" onclick="c3iHead(${v})">${n}</button>`).join('')}</div>
      <button class="btn sm tgl ${L.brake?'on':''}" id="c3Brake" onclick="c3iLight('brake')">煞車燈</button>
      <button class="btn sm tgl ${L.turn==='hazard'?'on':''}" id="c3Turn" onclick="c3iTurn()">雙黃警示</button>
      <button class="btn sm tgl ${L.night?'on':''}" id="c3Night" onclick="c3iLight('night')">夜間模式</button>
    </div>

    <div class="rowline"><span class="lb">引擎</span>
      <button class="btn sm ${EngineAudio.running?'':'pri'}" id="c3EngineBtn" onclick="toggleCar3DEngine()">${EngineAudio.running?'熄火':'發動引擎'}</button>
      <button class="btn sm" id="c3Hold" onpointerdown="holdCar3DThrottle(1)" onpointerup="holdCar3DThrottle(0)"
        onpointercancel="holdCar3DThrottle(0)" onpointerleave="holdCar3DThrottle(0)">按住吹油</button>
      <input type="range" min="0" max="100" value="0" aria-label="持續油門" style="max-width:110px;flex:0 1 110px"
        oninput="setCar3DThrottle(this.value/100)">
      <div class="c3rpm"><div class="bar"><i id="c3RpmBar"></i><u style="left:${(cv.red/cv.cut*100).toFixed(1)}%"></u></div>
        <b id="c3RpmVal">0</b><span class="mut" style="font-size:11px">rpm</span></div>
    </div>

    <div class="rowline"><span class="lb"></span>
      <span class="mut" style="font-size:12px">${esc(eng?eng.name:'引擎')} · ${eng?eng.cyl:4} 缸 · 紅線 ${cv.red} rpm${cv.turbo?' · 渦輪':''}</span>
      <span style="flex:1"></span>
      <input type="range" min="0" max="100" value="${Math.round(EngineAudio.vol*100)}" style="max-width:100px;flex:0 1 100px"
        aria-label="音量" oninput="setCar3DVolume(this.value/100)">
      <button class="btn sm" id="c3MuteBtn" onclick="toggleCar3DMute()">${EngineAudio.muted?'取消靜音':'靜音'}</button>
    </div>

    <div class="rowline"><span class="lb">駕駛</span>
      <button class="btn sm tgl ${CAR3D_DRIVE.on?'on':''}" id="c3Drive" onclick="c3iDrive()">駕駛模式</button>
      <button class="btn sm tgl ${auto?'on':''}" id="c3Auto" onclick="c3iAuto()">${auto?'自排':'手排'}</button>
      <div class="c3gear"><span>檔</span><b id="c3GearVal">N</b>
        <span style="margin-left:8px">km/h</span><b id="c3SpeedVal">0</b></div>
      <button class="btn sm tgl ${(S?S.tc!==false:true)?'on':''}" id="c3TC" onclick="c3iTC()">循跡防滑</button>
      <button class="btn sm tgl ${CAR3D_DRIVE.follow?'on':''}" id="c3Follow" onclick="c3iFollow()">跟隨鏡頭</button>
      <button class="btn sm" onclick="resetCar3DDrive()">回到原點</button>
    </div>
    <div class="rowline"><span class="lb"></span>
      <span class="mut" style="font-size:12px">WASD／方向鍵駕駛 · <b>Q</b> 降檔 <b>E</b> 升檔 · <b>空白</b> 手煞車 · <b>左Shift</b> 踩離合。
      手機用畫面左下搖桿、右下踏板與撥片。<b>循跡防滑</b>開啟時方向盤鎖點會依車速自動收斂、並有防甩尾輔助；關掉才給滿鎖點，也才甩得動。</span>
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
function engineUIRefresh(){
  const b=$('#c3EngineBtn');
  if(b){b.textContent=EngineAudio.running?'熄火':'發動引擎';b.classList.toggle('pri',!EngineAudio.running);}
  const m=$('#c3MuteBtn');
  if(m)m.textContent=EngineAudio.muted?'取消靜音':'靜音';
}
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
  bindPedal($('#c3PedalH'),'padHandbrake');
  if(CAR3D_DRIVE.on)$('#stage')?.classList.add('driving');
  updateDriveHUD(CAR3D_DRIVE.sim);
}
function c3iTC(){
  const S=ensureSim(); S.tc=(S.tc===false);
  const el=$('#c3TC'); if(el) el.classList.toggle('on',S.tc!==false);
  if(typeof toast==='function') toast(S.tc!==false?'循跡防滑：開 — 轉向依車速收斂，不易失控':'循跡防滑：關 — 滿鎖點、無輔助，油門與手煞車可以把車尾送出去');
}
function c3iAuto(){
  const on=toggleCar3DAuto();
  const el=$('#c3Auto');
  if(el){el.classList.toggle('on',on);el.textContent=on?'自排':'手排';}
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
