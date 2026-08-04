/* ==========================================================================
   E36 外觀預覽 — AI 素材圖層合成
   座標系：1000 × 462 單位；S = 0.2 px/mm；地面 y=400；前軸 x=218、後軸 x=758
   圖層順序（由後到前）
     背景 SVG  地面陰影 → 輪拱內襯 → 煞車碟盤 → 卡鉗 → 輪胎
     鋁圈 PNG  ×2（依實際胎規縮放，可疊色改變輪圈顏色）
     車身群組（依降低幅度整體下移）
        車身 PNG → 車漆疊色(multiply) → 亮色補償(screen) → 車窗隔熱紙
        空力套件 SVG（貼合該車身的實際下緣輪廓）
   ========================================================================== */
const S = 0.2, GND = 400, AXF = 218, AXR = 758, VW = 1000, VH = 462;
const STOCK_OD = 627;                 // 原廠 205/60R15 外徑 (mm)
const ARCH_FILL = 2.6;                // 胎外半徑相對輪拱開口的補正（單位）
const BODY_LIFT = 2.6;                // 原廠車高時車身上提量，讓輪拱留出自然間隙

function shade(hex, amt){
  const n = parseInt(String(hex).slice(1),16);
  const f = v => Math.max(0,Math.min(255, Math.round(v + 255*amt)));
  return '#'+[f((n>>16)&255),f((n>>8)&255),f(n&255)].map(v=>v.toString(16).padStart(2,'0')).join('');
}
function lumOf(hex){
  const n = parseInt(String(hex).slice(1),16);
  return (((n>>16)&255)*0.299 + ((n>>8)&255)*0.587 + (n&255)*0.114)/255;
}

/* 輪圈幾何：回傳單位座標下的胎外半徑與鋁圈半徑 */
function wheelDims(b, archR){
  const t = {w:+b.tireW||205, ar:+b.tireAR||60, rim:+b.size||15};
  const od = tireOD(t) || STOCK_OD;
  const tyreR = (archR + ARCH_FILL) * (od/STOCK_OD);
  const rimR  = tyreR * (t.rim*25.4/od);
  return {tyreR, rimR, od};
}

const pct = (v,tot) => (v/tot*100).toFixed(4)+'%';

function carPhoto(b, opt={}){
  const bodyId = (opt.bodyId && BODY_META[opt.bodyId]) ? opt.bodyId
    : (String(opt.bodyId||'').endsWith('2g') ? 'coupe2g' : 'coupe');
  const M = BODY_META[bodyId];
  const paint = PAINTS.find(p=>p.id===b.paint) || PAINTS[0];
  const fin   = WHEEL_FINISHES.find(w=>w.id===b.finish) || WHEEL_FINISHES[0];
  const cal   = CALIPER_COLORS.find(w=>w.id===b.caliper) || CALIPER_COLORS[0];
  const wid   = (WHEEL_STYLES.concat(ECL_WHEEL_STYLES).find(w=>w.id===b.wheel) || WHEEL_STYLES[0]).id;
  const u     = opt.uid || 'a';

  const archR = (M.wheels[0].r + M.wheels[1].r)/2;
  const {tyreR, rimR} = wheelDims(b, archR);
  const wcy = GND - tyreR;
  const dy  = (+b.drop||0) * S - BODY_LIFT;

  /* 鋁圈圖：資產尺寸 420、鋁圈半徑 199.1 → 半寬比 */
  const wm = WHEEL_META[wid] || {rim:199.1, size:420};
  const imgHalf = rimR * (wm.size/2) / wm.rim;
  const wheelImg = (cx) => `<img src="${AIMG['wheel-'+wid]}" alt="" style="
      left:${pct(cx-imgHalf,VW)};top:${pct(wcy-imgHalf,VH)};
      width:${pct(imgHalf*2,VW)};height:auto;
      filter:${fin.br?`brightness(${fin.br})`:'none'}">
    ${fin.mul==='#ffffff'?'':`<div class="cvw" style="
      left:${pct(cx-imgHalf,VW)};top:${pct(wcy-imgHalf,VH)};
      width:${pct(imgHalf*2,VW)};height:${pct(imgHalf*2,VH)};
      -webkit-mask-image:url(${AIMG['wheel-'+wid]});mask-image:url(${AIMG['wheel-'+wid]});
      -webkit-mask-size:100% 100%;mask-size:100% 100%;
      background:${fin.mul};mix-blend-mode:multiply"></div>`}`;

  /* 背景 SVG：陰影、輪拱內襯、碟盤、卡鉗、輪胎 */
  const brake = (cx) => `
    <circle cx="${cx}" cy="${wcy}" r="${(rimR*0.80).toFixed(1)}" fill="#5a5f66"/>
    <circle cx="${cx}" cy="${wcy}" r="${(rimR*0.50).toFixed(1)}" fill="#494d54"/>
    <circle cx="${cx}" cy="${wcy}" r="${(rimR*0.70).toFixed(1)}" fill="none" stroke="#70767f" stroke-width="1" opacity=".55"/>
    <path d="M ${(cx-rimR*0.79).toFixed(1)} ${(wcy-rimR*0.11).toFixed(1)}
             A ${(rimR*0.8).toFixed(1)} ${(rimR*0.8).toFixed(1)} 0 0 1 ${(cx-rimR*0.26).toFixed(1)} ${(wcy-rimR*0.76).toFixed(1)}
             L ${(cx-rimR*0.42).toFixed(1)} ${(wcy-rimR*0.48).toFixed(1)} Z" fill="${cal.hex}"/>
    <rect x="${(cx-rimR*0.80).toFixed(1)}" y="${(wcy-rimR*0.42).toFixed(1)}"
          width="${(rimR*0.34).toFixed(1)}" height="${(rimR*0.56).toFixed(1)}" rx="3" fill="${cal.hex}"/>`;
  const tyre = (cx) => `<circle cx="${cx}" cy="${wcy}" r="${((rimR+tyreR)/2).toFixed(1)}"
      fill="none" stroke="#0e1013" stroke-width="${(tyreR-rimR).toFixed(1)}"/>
    <circle cx="${cx}" cy="${wcy}" r="${(tyreR-0.6).toFixed(1)}" fill="none" stroke="#2b3037" stroke-width="1.1" opacity=".75"/>`;

  const bg = `<svg class="cvl" viewBox="0 0 ${VW} ${VH}" preserveAspectRatio="none">
    <defs><radialGradient id="gs${u}" cx=".5" cy=".5" r=".5">
      <stop offset="0" stop-color="#000" stop-opacity=".30"/><stop offset="1" stop-color="#000" stop-opacity="0"/>
    </radialGradient></defs>
    <ellipse cx="500" cy="${GND+12}" rx="430" ry="18" fill="url(#gs${u})"/>
    <line x1="24" y1="${GND}" x2="976" y2="${GND}" stroke="var(--line2)" stroke-width="1.2"/>
    <circle cx="${AXF}" cy="${(M.wheels[0].cy+dy).toFixed(1)}" r="${(M.wheels[0].r+13).toFixed(1)}" fill="#101318"/>
    <circle cx="${AXR}" cy="${(M.wheels[1].cy+dy).toFixed(1)}" r="${(M.wheels[1].r+13).toFixed(1)}" fill="#101318"/>
    ${brake(AXF)}${brake(AXR)}${tyre(AXF)}${tyre(AXR)}
  </svg>`;

  /* 車漆疊色 */
  const L = lumOf(paint.hex);
  const scr = Math.max(0, Math.min(1,(L-0.55)/0.45))*0.5;
  const mk = (src) => `-webkit-mask-image:url(${src});mask-image:url(${src});-webkit-mask-size:100% 100%;mask-size:100% 100%`;
  const box = `left:${pct(M.box[0],VW)};top:${pct(M.box[1],VH)};width:${pct(M.box[2],VW)};height:${pct(M.box[3],VH)}`;
  const tintOp = ((+b.tint||0)/100*0.82).toFixed(3);

  const body = `<div class="cvl" style="transform:translateY(${pct(dy,VH)})">
    <div class="cvbody" style="position:absolute;${box}">
      <img src="${AIMG['body-'+bodyId]}" alt="${bodyId.endsWith('2g')?'Mitsubishi Eclipse 2G':'BMW E36'} 側視預覽"
           style="position:absolute;inset:0;width:100%;height:100%">
      <div class="cvl" style="${mk(AIMG['mask-paint-'+bodyId])};background:${paint.hex};mix-blend-mode:multiply"></div>
      ${scr>0.01?`<div class="cvl" style="${mk(AIMG['mask-paint-'+bodyId])};background:#fff;opacity:${scr.toFixed(2)};mix-blend-mode:screen"></div>`:''}
      ${+b.tint?`<div class="cvl" style="${mk(AIMG['mask-glass-'+bodyId])};background:#04070b;opacity:${tintOp}"></div>`:''}
      ${b.shadow?`<div class="cvl" style="${mk(AIMG['mask-glass-'+bodyId])};background:#0b0d10;opacity:.30;mix-blend-mode:multiply"></div>`:''}
    </div>
    ${aeroSVG(b, M, paint.hex, u)}
  </div>`;

  return `<div class="cv">${bg}${wheelImg(AXF)}${wheelImg(AXR)}${body}</div>`;
}

/* ---------------- 空力套件：貼合該車身的實際輪廓 ---------------- */
function seg(prof, x0, x1){
  const p = prof.filter(q=>q[0]>=x0 && q[0]<=x1);
  return p.length>1 ? p : prof.slice(0,2);
}
function bandPath(pts, dy, dx0=0, dx1=0){
  if(pts.length<2) return '';
  const up = pts.map(p=>`${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(' L ');
  const dn = pts.slice().reverse().map((p,i)=>{
    const x = p[0] + (i===0 ? dx1 : (i===pts.length-1 ? dx0 : 0));
    return `${x.toFixed(1)} ${(p[1]+dy).toFixed(1)}`;
  }).join(' L ');
  return `M ${up} L ${dn} Z`;
}

function aeroSVG(b, M, hex, u){
  const dk = shade(hex,-0.34), lo = M.lo, hi = M.hi;
  const gid = 'ag'+u;
  const grad = `<defs><linearGradient id="${gid}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${shade(hex,-0.02)}"/><stop offset="1" stop-color="${shade(hex,-0.30)}"/>
    </linearGradient></defs>`;
  const bx = M.box[0], bw = M.box[2];
  const archR = (M.wheels[0].r + M.wheels[1].r)/2;
  let s = '';

  if(b.lip){
    const p = seg(lo, bx-2, bx+96);
    s += `<path d="${bandPath(p, 7.5, -8, 0)}" fill="url(#${gid})" stroke="rgba(0,0,0,.42)" stroke-width=".7"/>`;
  }
  if(b.skirt){
    const p = seg(lo, AXF+archR-6, AXR-archR+6);
    s += `<path d="${bandPath(p, 6.5)}" fill="url(#${gid})" stroke="rgba(0,0,0,.36)" stroke-width=".7"/>`;
  }
  if(b.diffuser){
    const p = seg(lo, bx+bw-96, bx+bw+2);
    s += `<path d="${bandPath(p, 11, 0, 8)}" fill="#191c21"/>`;
    for(let i=0;i<4;i++){
      const q = p[Math.min(p.length-1, Math.round(p.length*(0.18+i*0.2)))];
      if(q) s += `<rect x="${(q[0]-2).toFixed(1)}" y="${(q[1]+1).toFixed(1)}" width="4" height="9" fill="#3a3f47"/>`;
    }
  }
  if(b.wide){
    [M.wheels[0], M.wheels[1]].forEach(w=>{
      const R = w.r+7;
      s += `<path d="M ${(w.cx-R).toFixed(1)} ${(w.cy+4).toFixed(1)}
        A ${R} ${R} 0 0 1 ${(w.cx+R).toFixed(1)} ${(w.cy+4).toFixed(1)}
        L ${(w.cx+R-5).toFixed(1)} ${(w.cy+7).toFixed(1)}
        A ${R-5} ${R-5} 0 0 0 ${(w.cx-R+5).toFixed(1)} ${(w.cy+7).toFixed(1)} Z"
        fill="${shade(hex,-0.13)}" stroke="rgba(0,0,0,.28)" stroke-width=".7"/>`;
    });
  }
  if(b.hood){
    const p = seg(hi, bx+95, bx+240);
    if(p.length>3){
      const a=p[Math.round(p.length*0.25)], c=p[Math.round(p.length*0.6)];
      s += `<path d="M ${a[0]} ${(a[1]+9).toFixed(1)} L ${(a[0]+58)} ${(a[1]+5).toFixed(1)} L ${(a[0]+58)} ${(a[1]+11).toFixed(1)} L ${a[0]} ${(a[1]+15).toFixed(1)} Z" fill="#1a1d22" opacity=".8"/>
        <path d="M ${c[0]} ${(c[1]+11).toFixed(1)} L ${(c[0]+52)} ${(c[1]+7).toFixed(1)} L ${(c[0]+52)} ${(c[1]+13).toFixed(1)} L ${c[0]} ${(c[1]+17).toFixed(1)} Z" fill="#1a1d22" opacity=".62"/>`;
    }
  }
  if(b.wing==='duck'){
    const p = seg(hi, bx+bw-76, bx+bw-8);
    if(p.length>2){
      const a=p[0], z=p[p.length-1];
      s += `<path d="M ${a[0].toFixed(1)} ${a[1].toFixed(1)}
        C ${((a[0]+z[0])/2).toFixed(1)} ${(Math.min(a[1],z[1])-9).toFixed(1)}, ${(z[0]-14).toFixed(1)} ${(z[1]-11).toFixed(1)}, ${z[0].toFixed(1)} ${(z[1]-9).toFixed(1)}
        L ${z[0].toFixed(1)} ${(z[1]+2).toFixed(1)}
        C ${(z[0]-16).toFixed(1)} ${(z[1]-1).toFixed(1)}, ${((a[0]+z[0])/2).toFixed(1)} ${(Math.min(a[1],z[1])+2).toFixed(1)}, ${a[0].toFixed(1)} ${(a[1]+4).toFixed(1)} Z"
        fill="url(#${gid})" stroke="${dk}" stroke-width=".7"/>`;
    }
  }
  if(b.wing==='gt'){
    const p = seg(hi, bx+bw-56, bx+bw-6);
    const a = p[0] || [bx+bw-56, 200];
    const top = a[1]-58;
    s += `<rect x="${(a[0]-24).toFixed(1)}" y="${top.toFixed(1)}" width="12" height="58" fill="#23262b"/>
      <rect x="${(a[0]+22).toFixed(1)}" y="${top.toFixed(1)}" width="12" height="58" fill="#23262b"/>
      <path d="M ${(a[0]-48).toFixed(1)} ${(top-8).toFixed(1)} L ${(a[0]+58).toFixed(1)} ${(top-12).toFixed(1)}
               L ${(a[0]+60).toFixed(1)} ${(top+5).toFixed(1)} L ${(a[0]-46).toFixed(1)} ${(top+9).toFixed(1)} Z"
        fill="#2a2e34" stroke="#3d424b" stroke-width=".8"/>
      <path d="M ${(a[0]-46).toFixed(1)} ${(top+9).toFixed(1)} L ${(a[0]+60).toFixed(1)} ${(top+5).toFixed(1)}
               L ${(a[0]+58).toFixed(1)} ${(top+13).toFixed(1)} L ${(a[0]-44).toFixed(1)} ${(top+17).toFixed(1)} Z" fill="#171a1e"/>`;
  }
  if(b.tips && b.tips!=='none'){
    const p = seg(lo, bx+bw-120, bx+bw-14);
    const q = p[Math.max(0,Math.round(p.length*0.45))] || [bx+bw-80, 340];
    const n = b.tips==='quad'?4:b.tips==='dual'?2:1;
    const w = n===4?12:n===2?15:17, gap = n===4?15:n===2?18:0;
    for(let i=0;i<n;i++)
      s += `<rect x="${(q[0]-(n-1)*gap/2 + i*gap - w/2).toFixed(1)}" y="${(q[1]-8).toFixed(1)}"
             width="${w}" height="10" rx="5" fill="#767c85" stroke="#3d434b" stroke-width=".6"/>
        <ellipse cx="${(q[0]-(n-1)*gap/2 + i*gap + w/2 - 3).toFixed(1)}" cy="${(q[1]-3).toFixed(1)}"
             rx="2.4" ry="3.6" fill="#14171b"/>`;
  }
  return s ? `<svg class="cvl" viewBox="0 0 ${VW} ${VH}" preserveAspectRatio="none">${grad}${s}</svg>` : '';
}

/* 輪圈選擇器縮圖 */
function wheelThumb(styleId, finId){
  const fin = WHEEL_FINISHES.find(w=>w.id===finId) || WHEEL_FINISHES[0];
  const src = AIMG['wheel-'+styleId];
  return `<div style="position:relative;width:100%;aspect-ratio:1/1;isolation:isolate">
    <img src="${src}" alt="" style="position:absolute;inset:0;width:100%;height:100%;filter:${fin.br?`brightness(${fin.br})`:'none'}">
    ${fin.mul==='#ffffff'?'':`<div style="position:absolute;inset:0;
      -webkit-mask-image:url(${src});mask-image:url(${src});-webkit-mask-size:100% 100%;mask-size:100% 100%;
      background:${fin.mul};mix-blend-mode:multiply"></div>`}
  </div>`;
}

/* 對外沿用舊名稱，全站不必改呼叫點 */
const carSVG = carPhoto;
