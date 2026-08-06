/* ==========================================================================
   車輛模擬核心 —— 引擎 / 傳動 / 輪胎 / LSD
   --------------------------------------------------------------------------
   這一層完全不碰 Three.js，只吐狀態；3D 那邊（31-car3d.js）讀狀態去畫。
   單位一律 SI：公尺、公斤、牛頓、牛頓米、弧度、秒。

   座標與慣例（與 3D 場景一致）：
     車頭朝 −X，heading θ 為繞 Y 軸的偏航角
     前進方向向量 = (−cosθ, 0, sinθ)
     車身座標 vx = 縱向（前為正）、vy = 橫向（左為正）

   模型結構：
     引擎（曲軸角度、扭力曲線、引擎煞車、斷油）
       ↕ 離合器（有滑差、有扭力上限）
     變速箱（齒比）→ 終傳 → 差速器（LSD 分配左右輪）
       ↓
     四顆輪子（各自的角速度）→ 輪胎滑移 → 地面作用力
       ↓
     車身（縱向、橫向、偏航三個自由度）
   ========================================================================== */

/* --------------------------------------------------------------------------
   輪胎模型：簡化 Pacejka「魔術公式」
   --------------------------------------------------------------------------
   F = D·sin(C·atan(B·s − E·(B·s − atan(B·s))))
   s 為滑移率（縱向）或滑移角（橫向，弧度）。
   B 越大 → 抓地力上升越快（峰值來得越早）
   C 決定曲線形狀，D = 峰值 = μ·Fz，E 修正峰值後的掉落
   -------------------------------------------------------------------------- */
function pacejka(s, B, C, D, E){
  const bs = B*s;
  return D*Math.sin(C*Math.atan(bs - E*(bs - Math.atan(bs))));
}

/* 輪胎產品對應的抓地係數與曲線硬度。
   TIRE_PRODUCTS 的 grip 是相對評分，這裡換算成實際的 μ。 */
function tireModel(build){
  const p = (typeof TIRE_PRODUCTS!=='undefined' && TIRE_PRODUCTS.find(x=>x.id===build.tireProduct)) || null;
  const g = p ? (+p.grip||0) : 0;
  return {
    mu: 0.95 + g*0.035,          // 街胎約 0.95–1.05，半熱熔 1.15–1.3
    Bx: 11 + g*1.2,              // 縱向：滑移率約 8–12% 到峰值
    Cx: 1.65, Ex: .55,
    By: 7.5 + g*0.9,             // 橫向：滑移角約 7–9° 到峰值
    Cy: 1.35, Ey: .75,
    name: p?p.name:'街道胎',
  };
}

/* --------------------------------------------------------------------------
   差速器：把單一輸入扭力分配到左右兩輪
   --------------------------------------------------------------------------
   多片式（clutch）：可跨傳的扭力上限 = 預壓 + 鎖定率 × 輸入扭力
       —— 「鎖定率相對輸入扭力」是廠商定義，不是固定值
   螺旋齒（helical / ATB）：跨傳上限與「較低那側的扭力」成比例，
       所以單輪完全離地（該側扭力 0）時整顆失效，這點必須模擬出來
   黏性（viscous）：跨傳扭力與左右轉速差成比例，反應慢
   -------------------------------------------------------------------------- */
function diffSplit(diff, torqueIn, omegaL, omegaR, dt){
  const half = torqueIn/2;
  if(!diff || diff.kind==='open') return [half, half];
  if(diff.kind==='spool') return [half, half];

  const dw = omegaL - omegaR;                 // 左快為正
  const accel = torqueIn >= 0;
  const lock = accel ? diff.lockA : diff.lockD;

  let cap;                                     // 可跨傳的扭力上限（Nm）
  if(diff.kind==='helical'){
    /* 扭力感應式：上限正比於「較小側」的驅動扭力 */
    const tbr = 1 + 2*(lock||0)*1.5;           // lock 0.6 → TBR ≈ 2.8
    const lowSide = Math.abs(half);
    cap = lowSide*(tbr-1)/2;
  }else if(diff.kind==='viscous'){
    /* 黏性接合：扭力 ∝ 轉速差，且有上升時間 */
    cap = Math.min(Math.abs(dw)*22, 260*(lock||.2)/.2*.5) + (diff.pre||0);
  }else{
    cap = (diff.pre||0) + (lock||0)*Math.abs(torqueIn);
  }

  /* 跨傳方向永遠是「從快的那輪送到慢的那輪」 */
  const transfer = Math.max(-cap, Math.min(cap, dw*180));
  return [half - transfer/2, half + transfer/2];
}

/* --------------------------------------------------------------------------
   建立模擬狀態
   -------------------------------------------------------------------------- */
function createVehicleSim(build, spec){
  const c = typeof car==='function' ? car() : null;
  const eng = (c && typeof carEngine==='function') ? carEngine(c) : null;
  const cv = engineCurve(eng?eng.id:'');
  const stock = typeof stockDrivetrain==='function' ? stockDrivetrain(c) : {};

  const gb = gearboxById(build.gearbox||stock.gearbox) || GEARBOXES[0];
  const fd = finalDriveById(build.finalDrive||stock.finalDrive) || FINAL_DRIVES[0];
  const df = diffById(build.diff||stock.diff) || DIFFS[0];
  const cl = clutchById(build.clutch||stock.clutch) || CLUTCHES[0];
  const fw = flywheelById(build.flywheel||stock.flywheel) || FLYWHEELS[0];

  /* 使用者可逐檔微調（build.gearRatios 覆寫，null 表示用原本的） */
  const gears = (Array.isArray(build.gearRatios)&&build.gearRatios.length)
    ? build.gearRatios.map(Number) : gb.gears.slice();

  const plat = c && typeof platOf==='function' ? platOf(c) : 'e36';
  const mdl = (c && typeof mdlById==='function') ? mdlById(c.modelId) : null;
  const drive = plat==='dsm2g' ? (mdl && mdl.drive==='AWD' ? 'awd' : 'fwd') : 'rwd';

  /* 車重：用車身資料估，加上駕駛 */
  const body = (c && typeof bodyById==='function') ? bodyById(c.bodyId) : null;
  const mass = (body && +body.kg) || (plat==='dsm2g' ? (drive==='awd'?1420:1255) : 1400);

  const tireR = typeof car3DTireRadius==='function' ? car3DTireRadius(build) : .31;
  const wheelbase = (body && +body.wb ? body.wb/1000 : 2.70);
  const trackW = (body && +body.W ? body.W/1000*.86 : 1.45);

  return {
    /* 設定 */
    cfg:{
      gb, fd, df, cl, fw, gears, drive, plat, cv, eng,
      finalRatio: +fd.ratio || 3.15,
      flyI: flywheelInertia(fw.kg) + 0.09,     // 飛輪 + 曲軸與其他旋轉件
      clutchNm: +cl.nm || 350,
      auto: !!gb.auto,
      mass, tireR, wheelbase, trackW,
      /* 前後配重：E36 約 50:50，Eclipse 前驅偏前 */
      wDistF: plat==='dsm2g' ? .61 : .51,
      cgH: .52,                                 // 重心高（公尺）★估算★
      /* 每顆輪子的轉動慣量（含輪圈、輪胎與碟盤）★估算★
         17 吋鋁圈配 245/40 街胎的總成約 22 kg，質量多集中在外緣，
         取 I ≈ 0.62·m·R²。舊版係數只有這個的 4 成，扭力一進來輪子就瞬間空轉。 */
      wheelI: Math.max(.55, 0.62*(16+(tireR-.30)*90)*tireR*tireR),
      Cd: plat==='dsm2g' ? .29 : .31, area: 1.86, rho: 1.2,
      rollRes: .014,
      brakeNm: 2400, handbrakeNm: 850,
    },
    /* 引擎 */
    rpm: 0, crank: 0, throttle: 0, running:false,
    starter: 0,
    fuelCut:false, cutTimer:0, misfire:0,
    boost: 0,
    /* 傳動 */
    gear: 1, clutch: 1, shifting: 0, shiftFrom: 0, shiftCool: 0, autoMode: !!gb.auto,
    /* 車身 */
    x:0, z:0, heading:0, vx:0, vy:0, yaw:0,
    /* 四輪角速度（FL, FR, RL, RR） */
    w:[0,0,0,0], slipR:[0,0,0,0], slipA:[0,0,0,0],
    fxL:[0,0,0,0], fyL:[0,0,0,0], launchT:0,
    steer:0, brake:0, handbrake:0, tc:true, tcCut:0, escBrake:0, escWheel:0,
    /* 輸出 */
    speed:0, drift:0, wheelSpin:0, gForce:0, lastShift:0,
  };
}

/* --------------------------------------------------------------------------
   引擎扭力（含引擎煞車、斷油、渦輪遲滯）
   -------------------------------------------------------------------------- */
function engineTorque(S, dt){
  const cv = S.cfg.cv, rpm = S.rpm;
  /* 斷油：到達 cut 就切火，切一小段時間再回來 —— 這是限轉跳動的來源 */
  if(rpm >= cv.cut){ S.fuelCut = true; S.cutTimer = .11; }
  if(S.cutTimer > 0){ S.cutTimer -= dt; if(S.cutTimer<=0) S.fuelCut=false; }

  /* 渦輪：增壓跟著油門與轉速建立，有遲滯 */
  if(cv.turbo){
    const spoolable = Math.max(0, Math.min(1, (rpm-(cv.spool||2200))/1400));
    const target = S.throttle*spoolable;
    const rate = target>S.boost ? 3.4 : 6.5;      // 建立慢、洩掉快
    S.boost += (target-S.boost)*Math.min(1, rate*dt);
  }else S.boost = 0;

  /* 起動馬達：把引擎拖到約 320 rpm 就交給燃燒。
     用物理做而不是用計時器改 rpm —— 計時器會跟每幀的物理積分打架，
     而且拿著舊的狀態物件參考（換零件時會被換掉）。 */
  if(S.starter > 0){
    return Math.max(0, 95 - rpm*0.30);
  }
  if(!S.running || S.fuelCut) {
    /* 熄火或斷油：只剩泵損與摩擦 */
    return -(24 + rpm*0.010);
  }

  const peak = cv.nm;
  let t = peak*torqueFactor(cv, rpm)*S.throttle;
  /* 怠速控制：轉速低於怠速時補扭力，避免熄火 */
  const idle = cv.diesel?760:800;
  if(rpm < idle*1.35 && S.throttle < .12){
    t += peak*.16*Math.max(0,(idle*1.15-rpm)/(idle*1.15));
  }
  /* 引擎煞車：放油門時的泵損，轉速越高越強 */
  const brakeT = (24 + rpm*0.010)*(1-S.throttle);
  return t - brakeT;
}

/* --------------------------------------------------------------------------
   自排換檔邏輯
   -------------------------------------------------------------------------- */
function autoShift(S, dt){
  if(S.shiftCool>0){ S.shiftCool-=dt; return; }
  if(S.shifting>0) return;
  const cv=S.cfg.cv, n=S.cfg.gears.length;
  /* ★ 用車速回推的轉速判斷，不能用引擎轉速 ★
     起步放離合器時引擎會空轉到很高，拿引擎轉速判斷會一路亂升檔。 */
  const r=totalRatio(S); if(!r) return;
  const wheelRpm = Math.abs(S.vx)/S.cfg.tireR*Math.abs(r)*30/Math.PI;
  const up = cv.psRpm*(0.74+0.24*S.throttle);
  const dn = cv.psRpm*0.34;
  /* 觸發用引擎轉速（起步空轉時它才會到限轉，這時本來就該升檔），
     但升上去之後的轉速必須夠高才准換 —— 否則低速時會一路升到頂檔然後熄火。 */
  if(S.gear<n && S.rpm>up){
    const nextWheelRpm = wheelRpm*(+S.cfg.gears[S.gear]/+S.cfg.gears[S.gear-1]);
    /* 門檻必須高過降檔門檻（0.34），否則升上去馬上又被降回來 */
    if(nextWheelRpm > cv.psRpm*0.44){ shiftTo(S,S.gear+1); S.shiftCool=.55; }
  }else if(S.gear>1){
    /* 降檔前先確認降下去不會直接超過斷油 */
    const nextRpm = wheelRpm*(+S.cfg.gears[S.gear-2]/+S.cfg.gears[S.gear-1]);
    if(wheelRpm<dn && nextRpm<cv.cut*0.92){ shiftTo(S,S.gear-1); S.shiftCool=.45; }
  }
}

function shiftTo(S, g){
  const n=S.cfg.gears.length;
  g = Math.max(-1, Math.min(n, g|0));
  if(g===S.gear || S.shifting>0) return;
  S.shiftFrom = S.gear;
  const dir = g>S.gear ? 1 : -1;
  S.gear = g;
  if(typeof EngineAudio!=='undefined' && EngineAudio.running) EngineAudio.shift(dir);
  /* 換檔時間：自排較長且不完全斷離合，手排短而乾脆 */
  S.shifting = S.cfg.auto ? .30 : .16;
  S.lastShift = g;
  /* 換檔後引擎轉速跟著齒比跳。手排降檔沒補油就是靠這個產生引擎煞車衝擊。 */
  const from=S.shiftFrom, gears=S.cfg.gears;
  if(from>0 && g>0 && gears[from-1] && gears[g-1]){
    S._rpmTarget = S.rpm*(gears[g-1]/gears[from-1]);
  }else S._rpmTarget = null;
}

/* 目前總減速比（含終傳）。空檔為 0，倒檔取負值。 */
function totalRatio(S){
  if(S.gear===0) return 0;
  if(S.gear<0) return -(+S.cfg.gb.rev || 3.5)*S.cfg.finalRatio;
  return (+S.cfg.gears[S.gear-1]||1)*S.cfg.finalRatio;
}

/* --------------------------------------------------------------------------
   主積分：一個 substep
   -------------------------------------------------------------------------- */
function stepVehicleSim(S, dt, input){
  const C = S.cfg;
  /* 循跡防滑（可關）：驅動輪滑移率超過門檻就收油。
     這不是作弊 —— E36 多數車款原廠就有 ASC，Eclipse 沒有。
     關掉之後才能用油門把車尾送出去，飄移要關這個。 */
  let thrIn = input.thr||0;
  /* ★ 低速不啟動循跡防滑 ★
     低速時滑移率本來就不可靠（見上面 vRef 的說明），這時候介入會變成
     「一打方向盤就沒油門」—— 車子停在原地永遠起不來。
     真實的循跡防滑系統同樣有速度下限，起步時是不作用的。 */
  const tcActive = S.tc!==false && Math.abs(S.vx) > 3.0;
  if(tcActive){
    const dwIdx = C.drive==='fwd' ? [0,1] : C.drive==='rwd' ? [2,3] : [0,1,2,3];
    /* ★ 用「兩輪平均」而不是「最差的那一輪」★
       過彎時內外輪的行走距離本來就不同，拿最差的那輪判斷會把正常過彎
       誤判成打滑，結果一打方向盤油門就被掐死（實測從 84 掉到 2 km/h）。 */
    let sum=0; dwIdx.forEach(i=>sum+=Math.max(0,S.slipR[i]||0));
    const avg=sum/dwIdx.length;
    if(avg>0.12){
      /* 漸進式：滑移越大切越深。
         正常過彎的滑移率只有 0.03–0.05，完全不會被誤判；
         真的在空轉（滑移率 1 以上）時才會大幅收油。
         保留 18% 油門，讓它是「修正」而不是「熄火」。 */
      S.tcCut = Math.min(1, (avg-0.12)*1.1);
      thrIn *= Math.max(0.18, 1 - S.tcCut*0.85);
    }else S.tcCut = Math.max(0, (S.tcCut||0)-dt*3);
  }else S.tcCut = Math.max(0, (S.tcCut||0)-dt*4);
  S.throttle += (thrIn-S.throttle)*Math.min(1, 18*dt);
  S.brake = input.brake||0;
  S.handbrake = input.handbrake?1:0;
  /* 最大轉向角隨車速略降，但不能降太多 ——
     救車靠的就是反打，反打角度大致要等於滑移角。上限壓到 10 度以下的話
     車一滑出去就永遠救不回來，那不是飄移，是必定打轉。
     靜止約 34°、時速 65 約 22°、時速 110 約 18°。 */
  /* 轉向上限有兩段：
     一般行駛依車速收斂 —— 靜止約 33°、時速 72 約 15°、時速 144 約 9°。
     這模擬的是駕駛自己的克制：沒有人會在時速 144 給滿舵，那不是轉彎是打轉。
     但車一旦already在滑，就要放行到足以反打的角度，否則永遠救不回來。 */
  const vAbs = Math.abs(S.vx);
  const beta = Math.abs(Math.atan2(-S.vy, Math.max(1, vAbs)));
  /* ★ 轉向上限由抓地力反推，不是憑感覺給的曲線 ★
     穩態轉向時 側向加速度 a = v²·δ / 軸距。反過來，想讓 a 不超過輪胎能給的
     上限，方向盤最多就只能打到 δ = 軸距·a_max / v²。
     取 a_max ≈ 0.85g 留一點餘裕：
       時速 36 → 約 24°   時速 72 → 約 6.6°   時速 144 → 約 1.7°
     舊版在時速 72 給到 21.5°，那等於要求 2G 的側向加速度 —— 物理上拿不到，
     所以輪胎必定飽和、車必定打轉。這是「高速打方向就高速旋轉」的真正原因。
     （真實駕駛在高速本來就只給很小的修正量，這個限制模擬的正是這件事。） */
  /* 方向盤鎖點綁在「循跡防滑」這個輔助開關上，這也是它真正的意義：
     開 = 有輔助的日常駕駛，關 = 全手動。 */
  let maxSteer;
  if(S.tc !== false){
    /* ---- 輔助開啟：轉向上限由抓地力反推 ----
       穩態轉向時 側向加速度 a = v²·δ / 軸距，反推 δ = 軸距·a / v²。
       a 取 0.66g 而不是輪胎極限的 1.0g，刻意留三成餘裕給加速與煞車 ——
       鍵盤是全有或全無的輸入，按住 D 就是滿舵；滿舵若剛好把抓地力用光，
       輪胎就沒有餘力再傳動力，於是變成「一轉彎就不會加速」。
         時速 36 → 約 19°   時速 72 → 約 5°   時速 144 → 約 1.3°
       舊版在時速 72 給到 21.5°，那等於要求 2G 側向加速度 —— 物理上拿不到，
       所以輪胎必定飽和、車必定打轉。 */
    maxSteer = C.wheelbase*6.5/Math.max(20, vAbs*vAbs);
    maxSteer = Math.max(0.010, Math.min(0.58, maxSteer));
    /* 已經在滑的時候放寬上限，讓反打救得回來。
       ★ 但必須先確認是「反打」★ —— 只有轉向方向與滑移方向相反時才放行。
       少了這個方向判斷會變成正回饋：往打滑方向打死 → 上限被放寬 → 打更多 →
       滑更多 → 上限又被放寬……實測轉向角會從 3.2 度自己長到 8 度以上然後打轉。 */
    const betaSigned = Math.atan2(-S.vy, Math.max(1, vAbs));
    const inSign = Math.sign(input.steer||0);
    if(inSign !== 0 && inSign !== Math.sign(betaSigned)){
      maxSteer = Math.max(maxSteer, Math.min(0.52, beta*1.3));
    }
  }else{
    /* ---- 輔助關閉：給到接近實車的方向盤鎖點，隨速度略收 ----
       靜止約 34°、時速 65 約 24°、時速 144 約 18°。
       這個角度足以用油門與手煞車把車尾送出去，也足以反打救回來；
       代價是打過頭一樣會打轉 —— 那本來就是關掉輔助的意思。 */
    maxSteer = 0.60/(1 + vAbs*0.022);
  }
  S.steer += ((input.steer||0)*maxSteer - S.steer)*Math.min(1, 9*dt);

  if(S.starter>0){
    S.starter-=dt;
    if(S.starter<=0){ S.starter=0; S.running=true; }
  }
  if(S.shifting>0){
    S.shifting-=dt;
    if(S.shifting<=0){
      S.shifting=0;
      if(S._rpmTarget){ S.rpm=Math.max(400,Math.min(S.cfg.cv.cut*1.02,S._rpmTarget)); S._rpmTarget=null; }
    }
  }
  if(S.autoMode && S.running) autoShift(S, dt);

  /* ---- 引擎 ---- */
  const Te = engineTorque(S, dt);
  const ratio = totalRatio(S);
  /* 離合器接合度：換檔中放開，起步時依轉速差滑動 */
  let engage = S.shifting>0 ? (C.auto?.35:0) : 1;
  if(input.clutch) engage = 0;
  /* 起步：轉速越高、接合越多。這是真人放離合器的行為，也讓模型自己穩住 ——
     直接全接合會瞬間把引擎拖到怠速以下（熄火），完全不接合則是空轉。 */
  if(engage>0 && Math.abs(S.gear)===1 && Math.abs(S.vx)<5.5){
    if(input.thr>.05) S.launchT=(S.launchT||0)+dt; else S.launchT=0;
    /* 兩個條件取小：轉速要夠（不然熄火）、時間要夠（不然是把離合器摔下去）。
       真人起步就是這兩件事同時在做，少了時間項就會變成一放就 15 倍空轉。 */
    const rev=Math.max(0,(S.rpm-900)/1400);
    const byRev=Math.min(1, rev*rev);
    const byTime=Math.min(1,(S.launchT||0)/0.85);
    engage=Math.min(engage, Math.max(.04, Math.min(byRev, byTime)));
  }else S.launchT=0;

  /* 驅動輪的平均角速度 → 換算到引擎端 */
  const dw = C.drive==='fwd' ? [0,1] : C.drive==='rwd' ? [2,3] : [0,1,2,3];
  let wDrive = 0; dw.forEach(i=>wDrive+=S.w[i]); wDrive/=dw.length;
  const wEngFromWheels = wDrive*Math.abs(ratio);

  let wEng = S.rpm*Math.PI/30;
  let clutchT = 0;
  if(ratio!==0 && engage>0){
    /* 離合器傳遞扭力：與轉速差成比例，但不超過離合器容許值 */
    const slip = wEng - wEngFromWheels;
    const cap = C.clutchNm*engage;
    clutchT = Math.max(-cap, Math.min(cap, slip*14*engage));
  }
  /* 引擎角加速度 */
  wEng += (Te - clutchT)/C.flyI*dt;
  S.rpm = Math.max(0, wEng*30/Math.PI);
  if(S.running) S.rpm = Math.max(S.rpm, 380);      // 怠速下限（模擬怠速閥）
  S.crank += wEng*dt;

  /* ---- 傳動扭力送到輪子 ---- */
  const axleT = clutchT*Math.abs(ratio)*Math.sign(ratio||1);
  let tFL=0,tFR=0,tRL=0,tRR=0;
  if(C.drive==='awd'){
    /* 中央差速器：名目 50/50。★注意★ 焊死中差不代表扭力 50/50，
       只保證前後平均轉速相同 —— 實際分配仍依抓地力變化。 */
    const [fl,fr] = diffSplit(DIFFS.find(x=>x.id==='d-ecl-open'), axleT*.5, S.w[0], S.w[1], dt);
    const [rl,rr] = diffSplit(C.df, axleT*.5, S.w[2], S.w[3], dt);
    tFL=fl;tFR=fr;tRL=rl;tRR=rr;
  }else if(C.drive==='fwd'){
    const [fl,fr] = diffSplit(C.df, axleT, S.w[0], S.w[1], dt); tFL=fl;tFR=fr;
  }else{
    const [rl,rr] = diffSplit(C.df, axleT, S.w[2], S.w[3], dt); tRL=rl;tRR=rr;
  }
  const driveT=[tFL,tFR,tRL,tRR];

  /* ---- 荷重轉移 ---- */
  const g=9.81, m=C.mass;
  const aLong = S.gForce||0, aLat = S.yaw*S.vx;
  const Wf = Math.max(0, m*g*C.wDistF - m*aLong*C.cgH/C.wheelbase);
  const Wr = Math.max(0, m*g*(1-C.wDistF) + m*aLong*C.cgH/C.wheelbase);
  /* 橫向轉移不可超過該軸荷重 —— 超過就是內側輪離地，再多也轉移不出去。
     沒有這個上限的話，高偏航率時 Fz 會算出負值與暴增值，車子就會自己炸開。 */
  const rawLat = m*aLat*C.cgH/C.trackW;
  const latF = Math.max(-Wf, Math.min(Wf, rawLat));
  const latR = Math.max(-Wr, Math.min(Wr, rawLat));
  const Fz=[
    Math.max(0, Wf/2 - latF/2), Math.max(0, Wf/2 + latF/2),
    Math.max(0, Wr/2 - latR/2), Math.max(0, Wr/2 + latR/2),
  ];

  /* ---- 每顆輪子：滑移 → 地面作用力 ---- */
  const T = tireModel(typeof car==='function'&&car()?car().build:{});
  const cosH=Math.cos(S.heading), sinH=Math.sin(S.heading);
  let Fx=0, Fy=0, Mz=0, maxSpin=0;
  const halfWB=C.wheelbase/2, halfT=C.trackW/2;
  const pos=[[halfWB,-halfT],[halfWB,halfT],[-halfWB,-halfT],[-halfWB,halfT]];

  for(let i=0;i<4;i++){
    const front = i<2;
    const sa = front ? S.steer : 0;              // 轉向角（只有前輪）
    /* 該輪在車身座標的速度 */
    const wx = S.vx - S.yaw*pos[i][1];
    const wy = S.vy + S.yaw*pos[i][0];
    /* 旋轉到輪子座標 */
    const cx = Math.cos(sa), sx = Math.sin(sa);
    const vLong = wx*cx + wy*sx;
    const vLat  = -wx*sx + wy*cx;

    /* 縱向滑移率。
       ★ 參考速度的下限很重要 ★ 滑移率的定義是 (輪速−地速)/地速，
       車速接近零時分母趨近 0，任何微小的輪速差都會算出巨大的滑移率。
       下限設 2.5 m/s 讓低速時的數值穩定（這是業界常見作法）。 */
    const vRef = Math.max(2.5, Math.abs(vLong));
    const slipRatio = (S.w[i]*C.tireR - vLong)/vRef;
    /* 側向滑移角 */
    const slipAngle = Math.atan2(-vLat, vRef);
    S.slipR[i]=slipRatio; S.slipA[i]=slipAngle;

    /* 前軸的側向剛性刻意調得比後軸低一點 = 出廠設定的推頭傾向。
       原廠車都是這樣調的，否則極限一到就是甩尾，一般駕駛救不回來。
       後軸束角（toeR）越正，穩定性越高，這裡一併反映。 */
    const build0 = (typeof car==='function'&&car())?car().build:{};
    const toeRBoost = 1 + Math.max(0, +build0.toeR||0)*1.4;
    const By = front ? T.By*0.90 : T.By*1.06*toeRBoost;
    const D = T.mu*Fz[i];
    let fx = pacejka(slipRatio, T.Bx, T.Cx, D, T.Ex);
    let fy = pacejka(slipAngle, By, T.Cy, D, T.Ey);
    /* 摩擦圓：縱向與橫向共用同一份抓地力 */
    const mag = Math.hypot(fx, fy);
    if(mag > D && mag>0){ fx*=D/mag; fy*=D/mag; }

    /* ★ 輪胎鬆弛長度（relaxation length）★
       輪胎不是彈簧，胎體要滾過一段距離才建立得起側向力，典型 0.4–0.6 公尺。
       少了這一項，模型在極限附近會出現數值上的瞬間反覆，車子看起來像被彈開 ——
       這也是為什麼原本某些速度下會莫名其妙自己打轉。 */
    const relax = 0.55;
    const kRel = Math.min(1, Math.abs(vLong)*dt/relax + dt*4);
    S.fxL[i] += (fx - S.fxL[i])*kRel;
    S.fyL[i] += (fy - S.fyL[i])*kRel;
    fx = S.fxL[i]; fy = S.fyL[i];

    /* 輪子角動量：驅動扭力 − 地面反力矩 − 煞車 */
    let brakeT = S.brake*C.brakeNm*(front?.62:.38);
    if(S.handbrake && !front) brakeT += C.handbrakeNm;   // 手煞車只鎖後輪
    /* 車身穩定系統：偵測到甩尾就對單一前輪加煞車，靠輪胎自己產生回正力矩。
       這是真實 ESC 的作法（不是憑空加一個力矩）。關掉循跡防滑就一起關掉，
       所以要飄移的人不會被系統一直救回來。 */
    if(front && S.escBrake && S.escWheel===i) brakeT += S.escBrake*C.brakeNm*0.55;
    const roadT = fx*C.tireR;
    let dw2 = (driveT[i] - roadT)/C.wheelI;
    S.w[i] += dw2*dt;
    /* 煞車力矩：不可把輪子推成反轉 */
    if(brakeT>0){
      const dec = brakeT/C.wheelI*dt;
      if(Math.abs(S.w[i])<=dec) S.w[i]=0; else S.w[i]-=Math.sign(S.w[i])*dec;
    }
    maxSpin=Math.max(maxSpin, Math.abs(slipRatio));

    /* 把輪子的力轉回車身座標 */
    Fx += fx*cx - fy*sx;
    Fy += fx*sx + fy*cx;
    Mz += (fx*sx + fy*cx)*pos[i][0] - (fx*cx - fy*sx)*pos[i][1];
  }

  /* ---- 空氣阻力與滾動阻力 ---- */
  const v=Math.hypot(S.vx,S.vy);
  const drag=.5*C.rho*C.Cd*C.area*v*v;
  if(v>.01){ Fx -= drag*S.vx/v; Fy -= drag*S.vy/v; }
  Fx -= C.rollRes*m*g*Math.sign(S.vx);

  /* ---- 車身運動（三自由度）---- */
  /* 偏航慣量。均質長方體公式會低估（引擎與變速箱集中在前後軸之間），
     實車量測值約為公式值的 1.6–1.9 倍，這裡取 1.75。 */
  const Iz = m*(C.wheelbase*C.wheelbase + C.trackW*C.trackW)/12*1.75;
  const ax = Fx/m + S.yaw*S.vy;
  const ay = Fy/m - S.yaw*S.vx;
  S.vx += ax*dt; S.vy += ay*dt;
  S.yaw += Mz/Iz*dt;
  S.gForce = ax;

  /* 極低速時把橫向與偏航收斂掉，避免數值噪音讓車子自己抖動 */
  if(Math.abs(S.vx)<.35 && Math.abs(S.vy)<.35){
    S.vy*=Math.pow(.02,dt); S.yaw*=Math.pow(.02,dt);
  }

  /* ---- 車身穩定系統：算出下一步要煞哪一輪 ---- */
  if(S.tc!==false && Math.abs(S.vx)>4){
    const slipAng = Math.atan2(-S.vy, Math.max(1,Math.abs(S.vx)));
    const limit = 0.16;                       // 約 9 度，超過就算甩尾
    const over = Math.abs(slipAng) - limit;
    if(over > 0){
      S.escBrake = Math.min(1, over*3.2);
      /* 要產生與目前偏航反向的力矩：Mz 對 fx 的貢獻是 −fx·y，
         煞車讓 fx 為負，所以選 y 與 yaw 同號的那一輪。 */
      S.escWheel = S.yaw > 0 ? 0 : 1;
    }else S.escBrake = Math.max(0, (S.escBrake||0) - dt*4);
  }else S.escBrake = 0;

  /* ---- 數值防護 ----
     偏航率上限 2.6 rad/s：真實道路車輛不可能超過這個值（那已經是原地打轉），
     而高速滿舵時輪胎的側向力回授會讓積分發散，實測會直接算出 NaN。
     這道防線讓模擬在任何輸入下都不會崩掉。 */
  const YAW_MAX = 2.6;
  if(S.yaw > YAW_MAX) S.yaw = YAW_MAX;
  else if(S.yaw < -YAW_MAX) S.yaw = -YAW_MAX;
  /* 橫向速度不可能超過總速度 */
  const vLim = Math.max(6, Math.abs(S.vx)*1.6);
  if(S.vy > vLim) S.vy = vLim; else if(S.vy < -vLim) S.vy = -vLim;
  /* 最後一道：任何一項變成 NaN／Infinity 就把該項歸零，不讓它擴散 */
  if(!Number.isFinite(S.vx)) S.vx = 0;
  if(!Number.isFinite(S.vy)) S.vy = 0;
  if(!Number.isFinite(S.yaw)) S.yaw = 0;
  if(!Number.isFinite(S.x)) S.x = 0;
  if(!Number.isFinite(S.z)) S.z = 0;
  if(!Number.isFinite(S.heading)) S.heading = 0;
  for(let i=0;i<4;i++){
    if(!Number.isFinite(S.w[i])) S.w[i] = 0;
    if(!Number.isFinite(S.fxL[i])) S.fxL[i] = 0;
    if(!Number.isFinite(S.fyL[i])) S.fyL[i] = 0;
  }
  if(!Number.isFinite(S.rpm)) S.rpm = S.running ? 800 : 0;

  /* ---- 位置積分 ---- */
  S.heading += S.yaw*dt;
  /* 車身座標 → 世界座標：車頭朝 −X */
  S.x += (-S.vx*cosH - S.vy*sinH)*dt;
  S.z += ( S.vx*sinH - S.vy*cosH)*dt;

  /* ---- 輸出量 ---- */
  S.speed = S.vx*3.6;
  S.drift = Math.abs(S.vx)>2 ? Math.atan2(-S.vy, Math.abs(S.vx))*180/Math.PI : 0;
  S.wheelSpin = maxSpin;
  return S;
}

/* 依目前檔位與車速回推「應有的」引擎轉速（給 UI 與換檔提示用） */
function simRpmAtSpeed(S, kph){
  const r=totalRatio(S); if(!r) return 0;
  return Math.abs(kph/3.6/S.cfg.tireR*r*30/Math.PI);
}
/* 該檔位的理論極速（到斷油為止） */
function simGearTopSpeed(S, gearIndex){
  const g=+S.cfg.gears[gearIndex]; if(!g) return 0;
  const r=g*S.cfg.finalRatio;
  return S.cfg.cv.cut*Math.PI/30/r*S.cfg.tireR*3.6;
}
