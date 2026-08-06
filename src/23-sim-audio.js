/* ==========================================================================
   引擎聲：曲軸角度驅動的物理合成（AudioWorklet）
   --------------------------------------------------------------------------
   為什麼不是播錄音
   --------------------------------------------------------------------------
   常被拿來比較的那類線上引擎模擬器（例如 markeasting 的 engine-audio），
   聽起來真實是因為它們播的就是真車錄音 —— 四段實錄 WAV（高／低轉 × 收／放油門）
   依轉速與油門交叉淡入，再用 detune 微調音高。它的 26 個音檔共 48 MB。

   本專案不走那條路的兩個理由：
     1. 授權。引擎錄音有著作權，本專案已在授權上反覆卡關（見 NOTICE.md）。
     2. 錄音是死的。固定音檔沒辦法反映「這台車的缸數、紅線、排氣尾段、
        增壓值、目前檔位負載」—— 而這正是這個 app 存在的意義。

   --------------------------------------------------------------------------
   那怎麼讓合成聲不像電子音？
   --------------------------------------------------------------------------
   關鍵是別再用「基頻正弦波 + 疊諧波」那套。真實的引擎聲是：
     每個汽缸在自己的相位排出一團高壓氣體 → 一連串脈衝
     這串脈衝在排氣管裡來回反射 → 管長決定共鳴音色
   所以這裡改成在 AudioWorklet 裡逐取樣做：

     曲軸角度 θ 積分（取樣級精度）
       → 每缸依點火順序在自己的相位產生壓力脈衝（急升緩降）
       → 燃燒不均勻性：每次點火加一點隨機變化（這是「活的」的來源）
       → 排氣歧管波導 → 主排氣管波導（開口端反射為負，造成共鳴）
       → 進氣噪音（隨油門開度）＋ 機械噪音（隨轉速）
       → 渦輪嘯叫與洩壓閥（渦輪車）
       → 直流阻隔 → 軟限幅

   直四點火順序 1-3-4-2（每轉兩次點火）與直六 1-5-3-6-2-4（每轉三次）
   的差別，在這個模型裡是「自動」出現的，不需要另外調參數 ——
   這也是直六天生比較滑順的物理原因。

   斷油限轉：只要停掉燃燒脈衝、保留泵氣脈衝，那個「噠噠噠」就自然出現。
   放油門的回火也一樣：偶爾補一個未燃燒的爆音進排氣管。
   ========================================================================== */

/* --------------------------------------------------------------------------
   Worklet 本體。用字串內嵌 + Blob URL 載入，維持單檔可離線。
   注意：這段字串裡不可以出現反引號或 ${ }。
   -------------------------------------------------------------------------- */
const ENGINE_WORKLET_SRC = `
class EngineProcessor extends AudioWorkletProcessor {
  static get parameterDescriptors(){
    return [
      {name:'rpm',      defaultValue:0,   minValue:0, maxValue:14000, automationRate:'k-rate'},
      {name:'throttle', defaultValue:0,   minValue:0, maxValue:1,     automationRate:'k-rate'},
      {name:'boost',    defaultValue:0,   minValue:0, maxValue:1,     automationRate:'k-rate'},
      {name:'load',     defaultValue:0,   minValue:0, maxValue:1,     automationRate:'k-rate'},
      {name:'cut',      defaultValue:0,   minValue:0, maxValue:1,     automationRate:'k-rate'},
    ];
  }

  constructor(opt){
    super();
    const o = (opt && opt.processorOptions) || {};
    this.setup(o);
    this.theta = 0;
    this.fs = sampleRate;

    /* 波導延遲線：歧管（短）與主管（長） */
    this.maxD = Math.ceil(this.fs*0.06);
    this.hdr = new Float32Array(this.maxD); this.hi = 0; this.hlp = 0;
    this.pipe = new Float32Array(this.maxD); this.pi = 0; this.plp = 0;
    this.intk = new Float32Array(this.maxD); this.ii = 0; this.ilp = 0;

    /* 濾波與雜訊狀態 */
    this.dcx = 0; this.dcy = 0;
    this.bp1 = 0; this.bp2 = 0;
    this.mech = 0;
    this.turbo = 0; this.turboPh = 0;
    this.bov = 0; this.bovF = 0;
    this.pop = 0;
    /* 每缸固定的個體差異（噴油嘴、壓縮、積碳都會造成），一輩子不變 */
    this.cylBias = new Float32Array(12);
    for(let i=0;i<12;i++) this.cylBias[i] = 0.94+Math.random()*0.12;
    /* 每個循環再疊一點小抖動 —— 這是燃燒的循環變異，不是缸別差異 */
    this.fireSeed = new Float32Array(12);
    for(let i=0;i<12;i++) this.fireSeed[i] = this.cylBias[i];

    this.port.onmessage = e => {
      const d = e.data || {};
      if(d.type==='config') this.setup(d);
      if(d.type==='bov'){ this.bov = 1; this.bovF = 2600; }
      if(d.type==='pop') this.pop = 1;
    };
  }

  setup(o){
    this.cyl = Math.max(1, Math.min(12, o.cylinders|0 || 4));
    /* 四行程：一個完整循環 720 度 = 4π。直四與直六都是等間隔點火。 */
    this.fire = new Float32Array(this.cyl);
    for(let i=0;i<this.cyl;i++) this.fire[i] = i*(4*Math.PI/this.cyl);
    /* 排氣管長度（公尺）→ 延遲取樣數。尾段設定會改變這個值。 */
    this.pipeL = o.pipeLength || 2.6;
    this.hdrL  = o.headerLength || 0.62;
    this.intkL = o.intakeLength || 0.42;
    this.isTurbo = !!o.turbo;
    this.isDiesel = !!o.diesel;
    /* 排氣溫度高，音速比常溫快很多 */
    this.cExh = 480; this.cAir = 343;
    this.damp = o.damp!==undefined ? o.damp : 0.34;
    this.refl = o.reflect!==undefined ? o.reflect : 0.74;
    /* ---- 每具引擎的個性參數 ---- */
    this.intakeG = o.intakeGain!==undefined ? o.intakeGain : 1.0;
    /* 獨立節流閥（ITB）：進氣口直接對著汽門，高轉時的吸氣聲非常突出。
       這是 S50 歐規 M3 那個著名進氣聲的來源。 */
    this.itb = !!o.itb;
    /* 脈衝形狀：每缸汽門面積大（DOHC 4 汽門）→ 洩放快、脈衝短而銳；
       SOHC 2 汽門排氣較慢，脈衝拖長、聽起來比較悶。 */
    this.pulseW = o.pulseWidth!==undefined ? o.pulseWidth : 2.3;
    this.pulseD = o.pulseDecay!==undefined ? o.pulseDecay : 4.1;
    /* 機械噪音：柴油的燃燒敲擊、VANOS 的怠速咯咯聲 */
    this.mechG = o.mechGain!==undefined ? o.mechGain : 1.0;
    this.rattle = o.rattle||0;      // VANOS／挺桿的低轉異音
    this.idleJit = o.idleJitter!==undefined ? o.idleJitter : 0.03;
    this.rattlePh = 0;
  }

  /* 單缸壓力：ph 為該缸在循環中的相位（0 到 4π） */
  cylPressure(ph, seed, burn){
    const TAU4 = 4*Math.PI;
    if(ph < 0) ph += TAU4;
    if(ph >= TAU4) ph -= TAU4;
    /* 排氣門開啟後的洩放脈衝：急升、指數衰減 */
    const w = this.pulseW;               // 脈衝持續的弧度
    let p = 0;
    if(ph < w){
      const u = ph/w;
      const atk = u < 0.035 ? u/0.035 : 1;
      p = atk*Math.exp(-this.pulseD*u)*seed*burn;
    }
    /* 壓縮行程的泵氣：即使斷油也存在，這是限轉噠噠聲的來源 */
    const cph = ph - 2*Math.PI;
    if(cph > 0 && cph < 1.5){
      const u = cph/1.5;
      p -= 0.16*Math.sin(Math.PI*u)*seed;
    }
    return p;
  }

  process(inputs, outputs, params){
    const out = outputs[0][0];
    if(!out) return true;
    const rpm = params.rpm[0], thr = params.throttle[0];
    const boost = params.boost[0], load = params.load[0], cut = params.cut[0];

    if(rpm < 1){
      for(let i=0;i<out.length;i++) out[i] = 0;
      return true;
    }

    const omega = rpm*Math.PI/30;
    const dTh = omega/this.fs;
    const TAU4 = 4*Math.PI;

    /* 燃燒強度：油門與增壓決定。斷油時只剩泵氣。 */
    const burn = cut > 0.5 ? 0.10 : (0.30 + 0.70*thr)*(1 + boost*0.85);
    /* 管長：延遲取樣數 */
    const dHdr = Math.min(this.maxD-2, Math.floor(this.fs*2*this.hdrL/this.cExh));
    const dPipe= Math.min(this.maxD-2, Math.floor(this.fs*2*this.pipeL/this.cExh));
    const dIntk= Math.min(this.maxD-2, Math.floor(this.fs*2*this.intkL/this.cAir));

    /* 進氣與機械噪音的量 */
    /* ITB 的進氣聲隨轉速急遽增強（節流閥直接對著汽門，沒有集氣箱緩衝） */
    const itbBoost = this.itb ? (0.6 + Math.pow(rpm/7000, 1.7)*1.9) : 1;
    const intakeAmt = (0.05 + 0.55*thr)*(0.35 + rpm/7000)*this.intakeG*itbBoost;
    const mechAmt = (0.020 + rpm/9000*0.055 + (this.isDiesel?0.05:0))*this.mechG;
    /* 低轉的機械異音（VANOS／液壓挺桿），轉速一高就被排氣蓋掉 */
    const rattleAmt = this.rattle*Math.max(0, 1-rpm/2600)*(1-thr*0.6);
    const turboAmt = this.isTurbo ? boost*0.6*(0.3+thr*0.7) : 0;

    for(let n=0;n<out.length;n++){
      this.theta += dTh;
      if(this.theta >= TAU4){
        this.theta -= TAU4;
        /* 循環變異：在各缸固定偏差上疊 ±3%。太大會變成「拖拉機」，
           太小會回到電子音。直六天生比直四滑順是點火間隔造成的，不靠這裡調。 */
        const j=this.idleJit;
        for(let c=0;c<this.cyl;c++) this.fireSeed[c] = this.cylBias[c]*(1-j+Math.random()*2*j);
      }

      /* 所有汽缸的壓力總和 */
      let p = 0;
      for(let c=0;c<this.cyl;c++){
        p += this.cylPressure(this.theta - this.fire[c], this.fireSeed[c], burn);
      }
      p *= 0.9/Math.sqrt(this.cyl);

      /* 放油門回火：未燃燒混合氣在排氣管點著 */
      if(this.pop > 0){
        p += this.pop*(Math.random()*2-1)*0.9;
        this.pop *= 0.988;
        if(this.pop < 0.001) this.pop = 0;
      }

      /* --- 歧管波導 --- */
      let hRead = this.hdr[this.hi];
      this.hlp += this.damp*(hRead - this.hlp);
      let hRefl = -this.refl*0.55*this.hlp;
      this.hdr[this.hi] = p + hRefl;
      this.hi = (this.hi+1) % dHdr;
      const hOut = hRead - hRefl;

      /* --- 主排氣管波導 --- */
      let pRead = this.pipe[this.pi];
      this.plp += this.damp*(pRead - this.plp);
      let pRefl = -this.refl*this.plp;
      this.pipe[this.pi] = hOut*0.85 + pRefl;
      this.pi = (this.pi+1) % dPipe;
      let exh = pRead - pRefl;

      /* --- 進氣：噪音經自己的短波導 --- */
      const nz = Math.random()*2-1;
      let iRead = this.intk[this.ii];
      this.ilp += 0.42*(iRead - this.ilp);
      const iRefl = -0.55*this.ilp;
      /* 進氣脈動與曲軸同步 */
      const intakePulse = Math.max(0, Math.sin(this.theta*this.cyl/2));
      this.intk[this.ii] = nz*intakeAmt*(0.4+0.6*intakePulse) + iRefl;
      this.ii = (this.ii+1) % dIntk;
      const intake = (iRead - iRefl)*0.9;

      /* --- 機械／汽門噪音：帶通雜訊 --- */
      const mn = Math.random()*2-1;
      this.bp1 += 0.25*(mn - this.bp1);
      this.bp2 += 0.11*(this.bp1 - this.bp2);
      const mechNoise = (this.bp1 - this.bp2)*mechAmt;

      /* --- 渦輪嘯叫與洩壓閥 --- */
      let turboSig = 0;
      if(this.isTurbo){
        this.turboPh += (rpm*0.055 + boost*900 + 1600)*2*Math.PI/this.fs;
        if(this.turboPh > 6.283185) this.turboPh -= 6.283185;
        turboSig = Math.sin(this.turboPh)*turboAmt*0.14
                 + (Math.random()*2-1)*turboAmt*0.05;
        if(this.bov > 0){
          this.bovF *= 0.99972;
          const bn = Math.random()*2-1;
          turboSig += bn*this.bov*0.55*Math.min(1, this.bovF/900);
          this.bov *= 0.99975;
          if(this.bov < 0.002) this.bov = 0;
        }
      }

      /* --- VANOS／挺桿異音：與凸輪軸同步的窄脈衝 --- */
      let rattleSig = 0;
      if(rattleAmt > 0.0001){
        this.rattlePh += dTh*0.5;                    // 凸輪軸轉速是曲軸一半
        if(this.rattlePh >= 2*Math.PI) this.rattlePh -= 2*Math.PI;
        const k = Math.pow(Math.max(0, Math.sin(this.rattlePh*this.cyl)), 22);
        rattleSig = k*(Math.random()*2-1)*rattleAmt;
      }

      /* --- 混音 --- */
      let s = exh*1.0 + intake*0.55 + mechNoise + turboSig + rattleSig;

      /* 直流阻隔 */
      this.dcy = s - this.dcx + 0.9985*this.dcy;
      this.dcx = s;
      s = this.dcy;

      /* 軟限幅 */
      out[n] = Math.tanh(s*1.6)*0.62;
    }
    return true;
  }
}
registerProcessor('engine-processor', EngineProcessor);
`;


/* ==========================================================================
   每具引擎的聲學特性
   --------------------------------------------------------------------------
   ★ 這些是「調音參數」，不是查得到的規格。★
   引擎的聲音沒有官方數據可查（沒有廠商公布排氣管長度或進氣共鳴頻率），
   下面每一組數字都是依這些實際存在的物理差異推導出來的建模值：

     缸數與點火間隔  直四每轉點火 2 次、直六 3 次 —— 直六天生滑順的原因
     每缸汽門數      DOHC 4 汽門排氣洩放快 → 脈衝短而銳；SOHC 2 汽門拖長 → 悶
     單缸排氣量      缸越大單次脈衝能量越強，音調越低沉
     進氣型式        獨立節流閥（ITB）沒有集氣箱緩衝，高轉進氣聲極為突出
     VANOS／挺桿     怠速的機械咯咯聲，轉速一高就被排氣蓋過
     柴油            燃燒敲擊明顯、轉速域低

   參數意義：
     pipe/header  排氣主管與歧管長度（公尺）→ 決定共鳴音高
     intake       進氣路徑長度與音量
     pulseW/D     排氣脈衝的寬度與衰減率（越小越銳利）
     damp/refl    消音器的吸收與開口端反射（越低越開放）
     rattle       低轉機械異音
     idleJitter   燃燒循環變異（越大越「抖」）
   ========================================================================== */
const ENGINE_ACOUSTICS = {
  /* ---- M40 / M43：SOHC 8 汽門直四。單凸輪、每缸兩汽門，排氣洩放慢，
         聲音悶而粗糙，紅線也低。這是最「不悅耳」的一組。 ---- */
  M40B16:{pipe:2.9,header:0.50,intake:0.40,intakeGain:0.85,pulseW:2.9,pulseD:3.3,
          damp:0.44,refl:0.80,rattle:0.010,idleJitter:0.055,
          note:'SOHC 8 汽門，排氣洩放慢，低沉而略帶顆粒感'},
  M40B18:{pipe:2.9,header:0.52,intake:0.41,intakeGain:0.88,pulseW:2.9,pulseD:3.2,
          damp:0.43,refl:0.80,rattle:0.010,idleJitter:0.052},
  M43B16:{pipe:2.9,header:0.50,intake:0.40,intakeGain:0.85,pulseW:2.85,pulseD:3.35,
          damp:0.44,refl:0.79,rattle:0.008,idleJitter:0.050,
          note:'M43 改鏈條正時，怠速比 M40 安靜一些'},
  M43B18:{pipe:2.9,header:0.52,intake:0.41,intakeGain:0.88,pulseW:2.85,pulseD:3.25,
          damp:0.43,refl:0.79,rattle:0.008,idleJitter:0.048},

  /* ---- M42 / M44：DOHC 16 汽門直四。四汽門讓脈衝變銳，
         比 M40／M43 明顯清脆、也更愛拉轉。 ---- */
  M42B18:{pipe:2.75,header:0.55,intake:0.38,intakeGain:1.05,pulseW:2.25,pulseD:4.3,
          damp:0.36,refl:0.75,rattle:0.014,idleJitter:0.036,
          note:'DOHC 16 汽門，脈衝銳利，高轉有明顯的四缸咆哮'},
  M44B19:{pipe:2.75,header:0.56,intake:0.38,intakeGain:1.06,pulseW:2.2,pulseD:4.4,
          damp:0.35,refl:0.74,rattle:0.012,idleJitter:0.034},

  /* ---- M50 / M52：DOHC 24 汽門直六。等間隔每轉三次點火，
         一次點火的餘波還沒散下一缸就接上 —— 這就是 BMW 直六那種連續的
         絲滑感。歧管較長（六缸排氣要匯流），共鳴音高比直四低。 ---- */
  M50B20:{pipe:3.0,header:0.70,intake:0.46,intakeGain:0.95,pulseW:2.15,pulseD:4.5,
          damp:0.34,refl:0.74,rattle:0.010,idleJitter:0.024,
          note:'早期 M50 無 VANOS，怠速乾淨'},
  M50B20TU:{pipe:3.0,header:0.70,intake:0.46,intakeGain:0.95,pulseW:2.15,pulseD:4.5,
          damp:0.34,refl:0.74,rattle:0.030,idleJitter:0.024,
          note:'單 VANOS，怠速有輕微的機械咯咯聲'},
  M50B25:{pipe:3.05,header:0.74,intake:0.48,intakeGain:0.98,pulseW:2.05,pulseD:4.35,
          damp:0.33,refl:0.74,rattle:0.010,idleJitter:0.023},
  M50B25TU:{pipe:3.05,header:0.74,intake:0.48,intakeGain:0.98,pulseW:2.05,pulseD:4.35,
          damp:0.33,refl:0.74,rattle:0.032,idleJitter:0.023},
  M52B20:{pipe:3.0,header:0.71,intake:0.46,intakeGain:0.96,pulseW:2.12,pulseD:4.5,
          damp:0.35,refl:0.75,rattle:0.034,idleJitter:0.024},
  M52B25:{pipe:3.05,header:0.75,intake:0.48,intakeGain:0.99,pulseW:2.02,pulseD:4.3,
          damp:0.34,refl:0.75,rattle:0.036,idleJitter:0.023},
  M52B28:{pipe:3.1,header:0.78,intake:0.50,intakeGain:1.00,pulseW:1.95,pulseD:4.2,
          damp:0.33,refl:0.75,rattle:0.036,idleJitter:0.022,
          note:'2.8 升的單缸排氣量最大，六缸裡最低沉飽滿'},

  /* ---- S50 / S52：M Power。
         ★ 關鍵差異：歐規 S50B30／S50B32 用「獨立節流閥」（每缸一個節流閥，
         直接對著進氣門，沒有集氣箱緩衝）—— 高轉那個吸氣的嘶吼就是它。
         北美的 S50B30US 與 S52B32 是單一節流閥，聽起來接近強化版 M52。 ---- */
  S50B30:{pipe:2.95,header:0.80,intake:0.30,intakeGain:1.30,itb:true,
          pulseW:1.75,pulseD:4.9,damp:0.27,refl:0.68,rattle:0.026,idleJitter:0.021,
          note:'★ITB★ 獨立節流閥，高轉進氣聲極為突出；賽車化排氣，回壓低'},
  S50B32:{pipe:2.9,header:0.82,intake:0.28,intakeGain:1.38,itb:true,
          pulseW:1.68,pulseD:5.1,damp:0.25,refl:0.66,rattle:0.024,idleJitter:0.020,
          note:'★ITB★ 雙 VANOS + 獨立節流閥，紅線 7600，最尖銳的一具'},
  S50B30US:{pipe:3.05,header:0.76,intake:0.44,intakeGain:1.06,pulseW:1.95,pulseD:4.4,
          damp:0.31,refl:0.73,rattle:0.030,idleJitter:0.022,
          note:'北美版單一節流閥，沒有 ITB 的進氣嘶吼'},
  S52B32:{pipe:3.1,header:0.79,intake:0.46,intakeGain:1.08,pulseW:1.90,pulseD:4.3,
          damp:0.30,refl:0.72,rattle:0.032,idleJitter:0.022,
          note:'北美版單一節流閥，接近排氣量放大的 M52'},

  /* ---- 柴油：燃燒敲擊是主角。轉速域低（紅線 4800），
         機械噪音大，怠速抖動明顯。 ---- */
  M41D17:{pipe:3.2,header:0.48,intake:0.52,intakeGain:0.55,pulseW:3.2,pulseD:2.9,
          damp:0.52,refl:0.84,rattle:0.050,idleJitter:0.075,mechGain:2.6,
          note:'四缸柴油，燃燒敲擊明顯，轉速域低'},
  M51D25:{pipe:3.3,header:0.66,intake:0.56,intakeGain:0.52,pulseW:3.1,pulseD:2.8,
          damp:0.53,refl:0.84,rattle:0.046,idleJitter:0.062,mechGain:2.4,
          note:'六缸柴油，比四缸柴油滑順但仍有明顯敲擊'},
  M51D25OL:{pipe:3.3,header:0.66,intake:0.55,intakeGain:0.56,pulseW:3.05,pulseD:2.85,
          damp:0.51,refl:0.83,rattle:0.044,idleJitter:0.058,mechGain:2.3,
          note:'中冷版，增壓較高，渦輪聲較明顯'},

  /* ---- Eclipse ---- */
  '4G63T':{pipe:2.45,header:0.42,intake:0.34,intakeGain:1.02,pulseW:2.3,pulseD:4.0,
          damp:0.40,refl:0.70,rattle:0.016,idleJitter:0.040,
          note:'渦輪在歧管後方，把排氣脈衝削平了一部分 —— 這是渦輪車聲音比較悶、'
              +'但放油門有洩壓閥與回火的原因。歧管短（渦輪要靠近排氣門）。'},
  '420A':{pipe:2.7,header:0.50,intake:0.40,intakeGain:1.00,pulseW:2.35,pulseD:4.1,
          damp:0.40,refl:0.76,rattle:0.012,idleJitter:0.038,
          note:'Chrysler 血統的自然進氣 DOHC，聲音比 4G63T 清亮但單薄'},
};

function engineAcoustics(engId){
  return ENGINE_ACOUSTICS[engId] || {
    pipe:2.8, header:0.60, intake:0.42, intakeGain:1.0,
    pulseW:2.3, pulseD:4.1, damp:0.34, refl:0.74, rattle:0.012, idleJitter:0.035,
  };
}

/* --------------------------------------------------------------------------
   主執行緒的包裝
   -------------------------------------------------------------------------- */
const EngineAudio = {
  ctx:null, node:null, master:null, ready:false, loading:null,
  vol:.7, muted:false, running:false, unsupported:false,

  load(){
    try{
      const s=JSON.parse(localStorage.getItem('garage.engineAudio')||'{}');
      if(Number.isFinite(+s.vol)) this.vol=Math.max(0,Math.min(1,+s.vol));
      this.muted=!!s.muted;
    }catch(e){}
  },
  save(){
    try{localStorage.setItem('garage.engineAudio',JSON.stringify({vol:this.vol,muted:this.muted}));}catch(e){}
  },

  async init(){
    if(this.ready) return true;
    if(this.loading) return this.loading;
    const AC = window.AudioContext||window.webkitAudioContext;
    if(!AC){ this.unsupported=true; return false; }

    this.loading = (async()=>{
      this.ctx = new AC();
      /* ★ 偵測要對「實例」做 ★ audioWorklet 定義在 BaseAudioContext.prototype 上
         而且是 accessor，拿 AudioContext.prototype.audioWorklet 會取不到值，
         照那樣判斷會永遠認定瀏覽器不支援，引擎就發不動。 */
      if(!this.ctx.audioWorklet){
        this.unsupported=true;
        try{this.ctx.close();}catch(e){}
        this.ctx=null; return false;
      }
      const url = URL.createObjectURL(new Blob([ENGINE_WORKLET_SRC],{type:'application/javascript'}));
      try{
        await this.ctx.audioWorklet.addModule(url);
      }catch(err){
        console.warn('[engine-audio] worklet 載入失敗',err);
        this.unsupported=true; URL.revokeObjectURL(url); return false;
      }
      URL.revokeObjectURL(url);

      this.master = this.ctx.createGain();
      this.master.gain.value = this.muted?0:this.vol;
      /* 車室感：一點點低通與壓縮，避免高轉刺耳 */
      const tone = this.ctx.createBiquadFilter();
      tone.type='lowshelf'; tone.frequency.value=140; tone.gain.value=4;
      const comp = this.ctx.createDynamicsCompressor();
      comp.threshold.value=-18; comp.knee.value=20; comp.ratio.value=6;
      comp.attack.value=.004; comp.release.value=.18;
      tone.connect(comp); comp.connect(this.master); this.master.connect(this.ctx.destination);
      this.chainIn = tone;
      this.ready = true;
      return true;
    })();
    return this.loading;
  },

  /* 依目前車輛建立引擎節點 */
  async start(cfg){
    const ok = await this.init();
    if(!ok) return false;
    if(this.ctx.state==='suspended') await this.ctx.resume();
    if(this.node){ try{this.node.disconnect();}catch(e){} this.node=null; }
    this.node = new AudioWorkletNode(this.ctx,'engine-processor',{
      numberOfInputs:0, numberOfOutputs:1, outputChannelCount:[1],
      processorOptions:cfg,
    });
    this.node.connect(this.chainIn);
    this.running = true;
    SFX.loadAll();          // 一次性音效：有就用，沒有就走合成
    return true;
  },

  reconfigure(cfg){ if(this.node) this.node.port.postMessage({type:'config',...cfg}); },
  /* 洩壓閥與回火：有錄音就播錄音（真實感遠勝合成），沒有才用 worklet 合成 */
  bov(intensity=1){
    if(SFX.play('bov',{gain:0.6+0.4*intensity, rate:0.94+Math.random()*0.12})) return;
    if(this.node) this.node.port.postMessage({type:'bov'});
  },
  pop(){
    if(SFX.play('backfire',{rate:0.9+Math.random()*0.25})) return;
    if(this.node) this.node.port.postMessage({type:'pop'});
  },
  /* 換檔聲：合成沒有對應物，沒有音檔就靜默 */
  shift(dir){ SFX.play(dir>0?'shiftUp':'shiftDown',{rate:0.96+Math.random()*0.08}); },
  starterSfx(){ return SFX.play('starter'); },

  set(name, value, smooth=.02){
    if(!this.node) return;
    const p=this.node.parameters.get(name); if(!p) return;
    p.setTargetAtTime(value, this.ctx.currentTime, smooth);
  },

  stop(){
    this.running=false;
    if(this.node){
      this.set('rpm',0,.05);
      const n=this.node; this.node=null;
      setTimeout(()=>{try{n.disconnect();}catch(e){}}, 300);
    }
    if(this.ctx) setTimeout(()=>{
      if(!this.running && this.ctx && this.ctx.state==='running') this.ctx.suspend();
    }, 500);
  },

  setVolume(v){
    this.vol=Math.max(0,Math.min(1,+v||0));
    if(this.master&&!this.muted) this.master.gain.setTargetAtTime(this.vol,this.ctx.currentTime,.03);
    this.save();
  },
  toggleMute(){
    this.muted=!this.muted;
    if(this.master) this.master.gain.setTargetAtTime(this.muted?0:this.vol,this.ctx.currentTime,.02);
    this.save(); return this.muted;
  },
  suspend(){ if(this.ctx&&this.ctx.state==='running') this.ctx.suspend(); },
  resumeIfRunning(){ if(this.running&&this.ctx&&this.ctx.state==='suspended') this.ctx.resume(); },
};
EngineAudio.load();


/* ==========================================================================
   一次性音效插槽
   --------------------------------------------------------------------------
   連續的引擎聲必須用合成 —— 任何固定音檔都沒辦法跟著轉速、負載與增壓即時變化。
   但「瞬態事件」剛好相反：換檔的機械聲、洩壓閥、回火、起動馬達都是一次性的，
   用真實錄音會比合成好非常多。專業賽車遊戲也是這樣分工的。

   所以這裡開一組插槽：檔案存在就用檔案，不存在就自動回退到合成，
   兩邊都不會壞。音檔放在 assets/audio/，格式與命名見 docs/音效製作規格.md。

   ★ 檔案是選配的 ★ 沒有任何音檔時，app 的行為與現在完全相同，
   仍然維持單檔離線可用。
   ========================================================================== */
const SFX_SLOTS = {
  shiftUp:   {file:'shift-up.ogg',   gain:0.55, desc:'升檔：排檔桿入檔的機械聲'},
  shiftDown: {file:'shift-down.ogg', gain:0.55, desc:'降檔'},
  bov:       {file:'bov.ogg',        gain:0.70, desc:'洩壓閥（渦輪車放油門）'},
  backfire:  {file:'backfire.ogg',   gain:0.65, desc:'排氣回火爆音'},
  starter:   {file:'starter.ogg',    gain:0.60, desc:'起動馬達拖轉'},
  limiter:   {file:'limiter.ogg',    gain:0.50, desc:'斷油限轉的補強層（疊在合成之上）'},
};

const SFX = {
  buf:{}, tried:{}, base:'./assets/audio/',

  /* 非阻塞載入：載不到就永遠標記為沒有，不重試、不拋錯 */
  load(key){
    if(this.tried[key]) return;
    this.tried[key]=true;
    const slot=SFX_SLOTS[key]; if(!slot||!EngineAudio.ctx) return;
    fetch(this.base+slot.file)
      .then(r=>{ if(!r.ok) throw new Error('404'); return r.arrayBuffer(); })
      .then(a=>EngineAudio.ctx.decodeAudioData(a))
      .then(b=>{ this.buf[key]=b; })
      .catch(()=>{ this.buf[key]=null; });   // 沒有這個檔案 → 用合成
  },

  loadAll(){ Object.keys(SFX_SLOTS).forEach(k=>this.load(k)); },

  /* 有音檔就播並回傳 true；沒有就回傳 false 讓呼叫端走合成 */
  play(key, opt={}){
    const b=this.buf[key];
    if(!b || !EngineAudio.ctx || !EngineAudio.chainIn) return false;
    const src=EngineAudio.ctx.createBufferSource();
    src.buffer=b;
    if(opt.rate) src.playbackRate.value=opt.rate;
    const g=EngineAudio.ctx.createGain();
    g.gain.value=(SFX_SLOTS[key].gain||0.6)*(opt.gain!==undefined?opt.gain:1);
    src.connect(g); g.connect(EngineAudio.chainIn);
    src.start();
    return true;
  },

  has(key){ return !!this.buf[key]; },
};

/* 在 UI 上告訴使用者目前載到了哪些音檔 */
function sfxStatus(){
  return Object.keys(SFX_SLOTS).map(k=>({
    key:k, file:SFX_SLOTS[k].file, desc:SFX_SLOTS[k].desc, loaded:SFX.has(k),
  }));
}

/* 由車輛資料組出 worklet 的設定 */
function engineAudioConfig(S){
  const cv = S.cfg.cv, eng = S.cfg.eng;
  const cyl = (eng && +eng.cyl) || 4;
  const A = engineAcoustics(eng ? eng.id : '');
  const build = (typeof car==='function'&&car()) ? car().build : {};

  /* 排氣尾段是在引擎本身的特性上做「修正」，不是取代 ——
     同一顆 S50 換四出還是 S50，只是更開放。 */
  const tips = build.tips || 'single';
  const tipPipe = {none:1.14, single:1.00, dual:0.90, quad:0.80}[tips] || 1;
  const tipDamp = {none:1.30, single:1.00, dual:0.84, quad:0.70}[tips] || 1;
  const tipRefl = {none:1.07, single:1.00, dual:0.94, quad:0.87}[tips] || 1;

  return {
    cylinders: cyl,
    pipeLength:   A.pipe   * tipPipe,
    headerLength: A.header,
    intakeLength: A.intake,
    intakeGain:   A.intakeGain,
    itb:          !!A.itb,
    pulseWidth:   A.pulseW,
    pulseDecay:   A.pulseD,
    mechGain:     A.mechGain || 1,
    rattle:       A.rattle || 0,
    idleJitter:   A.idleJitter,
    damp:    Math.max(.12, Math.min(.72, A.damp * tipDamp)),
    reflect: Math.max(.40, Math.min(.90, A.refl * tipRefl)),
    turbo: !!cv.turbo, diesel: !!cv.diesel,
  };
}

/* 每幀把模擬狀態餵給音訊 */
function pushEngineAudio(S){
  if(!EngineAudio.running || !EngineAudio.node) return;
  EngineAudio.set('rpm', S.rpm, .012);
  EngineAudio.set('throttle', S.throttle, .02);
  EngineAudio.set('boost', S.boost, .04);
  EngineAudio.set('load', Math.min(1, Math.abs(S.gForce)/6), .05);
  EngineAudio.set('cut', (S.fuelCut||S.starter>0)?1:0, .003);
}

/* 切分頁停聲，回來再開 */
document.addEventListener('visibilitychange',()=>{
  if(document.hidden) EngineAudio.suspend(); else EngineAudio.resumeIfRunning();
});
