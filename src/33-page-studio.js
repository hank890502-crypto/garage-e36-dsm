/* ==========================================================================
   改裝 · 設計預覽 — 車輛是唯一主角，右欄一次只顯示一個部位
   ========================================================================== */
let AB = false, ABPOS = 50, DPART = null;

const DPARTS = [
  {id:'paint',  name:'車身顏色', ic:'paint',  val:b=>PAINTS.find(p=>p.id===b.paint)?.name},
  {id:'wheel',  name:'輪圈',     ic:'disc',   val:b=>wheelStylesOf(car()).find(w=>w.id===b.wheel)?.name},
  {id:'tire',   name:'尺寸與胎規',ic:'target',val:b=>`${b.size}″ · ${b.tireW}/${b.tireAR}`},
  {id:'drop',   name:'車身高度', ic:'arrows', val:b=>b.drop?`降低 ${b.drop} mm`:'原廠'},
  {id:'brake',  name:'煞車卡鉗', ic:'disc',   val:b=>CALIPER_COLORS.find(x=>x.id===b.caliper)?.name},
  {id:'tint',   name:'車窗隔熱紙',ic:'eye',   val:b=>b.tint?`${b.tint}%`:'無'},
  {id:'aero',   name:'空力套件', ic:'wind',   val:b=>{const n=countAero(b);return n?`${n} 項`:'無'}},
];

function pgDesign(){
  const c = car();
  if(!c) return needCar('設計預覽需要先建立車輛 — 相容性會依你的年份、引擎與車身型式計算');
  const b = c.build;
  const stock = {...b, wheel:'st42', finish:'silver', size:15, tireW:205, tireAR:60, drop:0,
                 caliper:'stock', tint:0, lip:false, skirt:false, wing:'none',
                 diffuser:false, wide:false, tips:'single', shadow:false, hood:false};
  const wc = wheelCheck(c, {size:b.size, width:estWidth(b), et:estET(b), tireW:b.tireW, tireAR:b.tireAR});

  return `
  <div class="cols">
    <div class="stack">
      <div class="stage crop ab" id="stage">
        ${AB ? `<div>${carPhoto(stock,{bodyId:c.bodyId,uid:'ab0'})}</div>
          <div class="after" id="abAfter" style="width:${ABPOS}%">${carPhoto(b,{bodyId:c.bodyId,uid:'ab1'})}</div>
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
    <b>這是 AI 生成的示意圖。</b>${esc(ASSET_NOTE)} 圖片僅供外觀方向參考，不代表實際尺寸、輪拱間隙與安裝相容性。
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
      <div class="wheelpick">${wheelStylesOf(car()).map(w=>`<div class="wp ${b.wheel===w.id?'on':''}" onclick="setB('wheel','${w.id}')">
        ${wheelThumb(w.id,b.finish)}<span>${esc(w.name)}</span></div>`).join('')}</div>
      <div class="t-cap" style="margin-top:var(--s3);margin-bottom:6px">輪圈顏色</div>
      <div class="swx">${WHEEL_FINISHES.map(f=>`<span class="sw ${b.finish===f.id?'on':''}" style="background:${f.face}"
        title="${esc(f.name)}" onclick="setB('finish','${f.id}')"></span>`).join('')}</div>
      <div class="hint">素材為類別近似的示意圖，不是精確的原廠 Style 復刻。</div></div>`;
  }
  if(DPART==='tire'){
    const od = tireOD({w:b.tireW,ar:b.tireAR,rim:b.size});
    body = `<div style="padding-top:var(--s2)">
      ${slider('輪圈尺寸', b.size+' 吋', 'size', 15, 19, 1, b.size)}
      ${slider('胎寬', b.tireW, 'tireW', 185, 285, 5, b.tireW)}
      ${slider('扁平比', b.tireAR, 'tireAR', 25, 65, 5, b.tireAR)}
      <div class="kv"><span>規格</span><b>${b.tireW}/${b.tireAR} R${b.size}</b></div>
      <div class="kv"><span>外徑</span><b>${od.toFixed(0)} mm</b></div>
      <div class="note b" style="margin-top:var(--s2)">E36 最佳解通常是 <b>245/40R17</b>，外徑僅 +0.13%、速度表幾乎零誤差。
        避開 235/40R18（+2.90%，超出台灣 2% 門檻）。</div></div>`;
  }
  if(DPART==='drop'){
    body = `<div style="padding-top:var(--s2)">
      ${slider('降低幅度', b.drop+' mm', 'drop', 0, 80, 5, b.drop)}
      <div class="note y" style="margin-top:var(--s2)">降低幅度越大，後副樑鎖點的疲勞風險越高 — 這是 E36 的結構性弱點。
        施工前請先掀後座地毯與趴車底檢查四個鎖點。</div>
      <div class="hint">參考：Bilstein B12 Pro-Kit 前約 30mm、B12 Sportline 前約 45mm、B14 絞牙 35–55mm。</div></div>`;
  }
  if(DPART==='brake'){
    body = `<div style="padding-top:var(--s2)">
      <div class="swx">${CALIPER_COLORS.map(x=>`<span class="sw ${b.caliper===x.id?'on':''}" style="background:${x.hex}"
        title="${esc(x.name)}" onclick="setB('caliper','${x.id}')"></span>`).join('')}</div>
      <div class="kv" style="margin-top:var(--s2)"><span>目前</span><b>${esc(CALIPER_COLORS.find(x=>x.id===b.caliper)?.name)}</b></div>
      <div class="hint">卡鉗需拆下清潔除鏽再噴，塗料要耐高溫。想升級卡鉗本體請到零件庫的煞車系統分類。</div></div>`;
  }
  if(DPART==='tint'){
    body = `<div style="padding-top:var(--s2)">
      ${slider('深淺', b.tint+'%', 'tint', 0, 90, 5, b.tint)}
      <div class="hint">前檔與前門過深會影響夜間視線，各地稽查的可見光穿透率標準不一。</div></div>`;
  }
  if(DPART==='aero'){
    body = `<div style="padding-top:var(--s1)">
      ${chk('lip','前下巴')}${chk('skirt','側裙')}${chk('diffuser','後下擾流')}
      ${chk('hood','引擎蓋散熱孔')}${chk('wide','寬體暴龜','台灣不可行')}
      <div class="t-cap" style="margin-top:var(--s3);margin-bottom:6px">尾翼</div>
      <div class="seg">${[['none','無'],['duck','鴨尾'],['gt','GT 尾翼']].map(([v,n])=>
        `<button class="${b.wing===v?'on':''}" onclick="setB('wing','${v}')">${n}</button>`).join('')}</div>
      <div class="t-cap" style="margin-top:var(--s2);margin-bottom:6px">排氣尾管</div>
      <div class="seg">${[['none','無'],['single','單出'],['dual','雙出'],['quad','四出']].map(([v,n])=>
        `<button class="${b.tips===v?'on':''}" onclick="setB('tips','${v}')">${n}</button>`).join('')}</div></div>`;
  }
  return head + body;
}

function slider(label, val, key, min, max, step, cur){
  return `<div style="margin-bottom:var(--s2)">
    <div style="display:flex;justify-content:space-between;font-size:14px">
      <span class="mut">${label}</span><b>${val}</b></div>
    <input type="range" min="${min}" max="${max}" step="${step}" value="${cur}" oninput="setB('${key}',+this.value)">
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
function setB(k,v){ const c=car(); if(!c) return; c.build[k]=v; saveDB(); render(); }
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
  const b = c.build, bodyId = (c.bodyId && BODY_META[c.bodyId]) ? c.bodyId : 'coupe';
  const M = BODY_META[bodyId], K = 2, W = VW*K, H = VH*K;
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
  const x = cv.getContext('2d');
  const load = src => new Promise(r=>{ const i=new Image(); i.onload=()=>r(i); i.onerror=()=>r(null); i.src=src; });
  Promise.all([load(AIMG['body-'+bodyId]), load(AIMG['mask-paint-'+bodyId]),
               load(AIMG['mask-glass-'+bodyId]), load(AIMG['wheel-'+b.wheel])]).then(([bi,pm,gm,wi])=>{
    const paint = PAINTS.find(p=>p.id===b.paint)||PAINTS[0];
    const fin = WHEEL_FINISHES.find(w=>w.id===b.finish)||WHEEL_FINISHES[0];
    const cal = CALIPER_COLORS.find(w=>w.id===b.caliper)||CALIPER_COLORS[0];
    const archR = (M.wheels[0].r+M.wheels[1].r)/2;
    const {tyreR, rimR} = wheelDims(b, archR);
    const wcy = (GND-tyreR)*K, dy = ((+b.drop||0)*S - BODY_LIFT)*K;
    const wm = WHEEL_META[b.wheel] || {rim:199.1, size:420};
    const half = rimR*(wm.size/2)/wm.rim*K;
    const dark = document.documentElement.dataset.theme==='dark';
    x.fillStyle = dark?'#0f1116':'#F2F2F5'; x.fillRect(0,0,W,H);
    [[AXF,M.wheels[0]],[AXR,M.wheels[1]]].forEach(([cx,w])=>{
      const CX = cx*K;
      x.beginPath(); x.arc(CX,(w.cy+(+b.drop||0)*S-BODY_LIFT)*K,(w.r+13)*K,0,7); x.fillStyle='#101318'; x.fill();
      x.beginPath(); x.arc(CX,wcy,rimR*0.80*K,0,7); x.fillStyle='#5a5f66'; x.fill();
      x.beginPath(); x.arc(CX,wcy,rimR*0.50*K,0,7); x.fillStyle='#494d54'; x.fill();
      x.save(); x.beginPath(); x.arc(CX,wcy,rimR*0.80*K,Math.PI*0.62,Math.PI*1.12);
      x.lineWidth=rimR*0.30*K; x.strokeStyle=cal.hex; x.stroke(); x.restore();
      x.beginPath(); x.arc(CX,wcy,(rimR+tyreR)/2*K,0,7); x.lineWidth=(tyreR-rimR)*K;
      x.strokeStyle='#0e1013'; x.stroke();
      if(wi){
        x.save(); if(fin.br) x.filter='brightness('+fin.br+')';
        x.drawImage(wi, CX-half, wcy-half, half*2, half*2); x.filter='none';
        if(fin.mul!=='#ffffff'){
          const t=document.createElement('canvas'); t.width=t.height=Math.max(2,Math.round(half*2));
          const tc=t.getContext('2d'); tc.drawImage(wi,0,0,t.width,t.height);
          tc.globalCompositeOperation='source-in'; tc.fillStyle=fin.mul; tc.fillRect(0,0,t.width,t.height);
          x.globalCompositeOperation='multiply'; x.drawImage(t, CX-half, wcy-half, half*2, half*2);
          x.globalCompositeOperation='source-over';
        }
        x.restore();
      }
    });
    const bx=M.box[0]*K, by=M.box[1]*K+dy, bw=M.box[2]*K, bh=M.box[3]*K;
    if(bi) x.drawImage(bi,bx,by,bw,bh);
    const tinted=(mask,color,op,mode)=>{
      if(!mask) return;
      const t=document.createElement('canvas'); t.width=Math.round(bw); t.height=Math.round(bh);
      const tc=t.getContext('2d'); tc.drawImage(mask,0,0,t.width,t.height);
      tc.globalCompositeOperation='source-in'; tc.fillStyle=color; tc.fillRect(0,0,t.width,t.height);
      x.save(); x.globalAlpha=op; x.globalCompositeOperation=mode; x.drawImage(t,bx,by,bw,bh); x.restore();
    };
    tinted(pm, paint.hex, 1, 'multiply');
    const L = lumOf(paint.hex), scr = Math.max(0,Math.min(1,(L-0.55)/0.45))*0.5;
    if(scr>0.01) tinted(pm,'#ffffff',scr,'screen');
    if(+b.tint) tinted(gm,'#04070b',(+b.tint)/100*0.82,'source-over');
    const a=document.createElement('a');
    a.href=cv.toDataURL('image/png');
    a.download='e36-'+(carLabel(c)||'build').replace(/\s+/g,'-')+'.png';
    a.click(); toast('已下載預覽圖');
  });
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
    h.style.left = ABPOS+'%'; af.style.width = ABPOS+'%';
  };
  h.addEventListener('mousedown', e=>{drag=true; e.preventDefault();});
  h.addEventListener('touchstart', ()=>{drag=true;}, {passive:true});
  window.addEventListener('mousemove', move);
  window.addEventListener('touchmove', move, {passive:true});
  window.addEventListener('mouseup', ()=>drag=false);
  window.addEventListener('touchend', ()=>drag=false);
}
