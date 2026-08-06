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
    /* 四行程：一個完整循環 720 度 = 4π。等間隔點火。 */
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
  }

  /* 單缸壓力：ph 為該缸在循環中的相位（0 到 4π） */
  cylPressure(ph, seed, burn){
    const TAU4 = 4*Math.PI;
    if(ph < 0) ph += TAU4;
    if(ph >= TAU4) ph -= TAU4;
    /* 排氣門開啟後的洩放脈衝：急升、指數衰減 */
    const w = 2.3;                       // 脈衝持續的弧度
    let p = 0;
    if(ph < w){
      const u = ph/w;
      const atk = u < 0.035 ? u/0.035 : 1;
      p = atk*Math.exp(-4.1*u)*seed*burn;
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
    const intakeAmt = (0.05 + 0.55*thr)*(0.35 + rpm/7000);
    const mechAmt = 0.020 + rpm/9000*0.055 + (this.isDiesel?0.05:0);
    const turboAmt = this.isTurbo ? boost*0.6*(0.3+thr*0.7) : 0;

    for(let n=0;n<out.length;n++){
      this.theta += dTh;
      if(this.theta >= TAU4){
        this.theta -= TAU4;
        /* 循環變異：在各缸固定偏差上疊 ±3%。太大會變成「拖拉機」，
           太小會回到電子音。直六天生比直四滑順是點火間隔造成的，不靠這裡調。 */
        for(let c=0;c<this.cyl;c++) this.fireSeed[c] = this.cylBias[c]*(0.97+Math.random()*0.06);
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

      /* --- 混音 --- */
      let s = exh*1.0 + intake*0.55 + mechNoise + turboSig;

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
    return true;
  },

  reconfigure(cfg){ if(this.node) this.node.port.postMessage({type:'config',...cfg}); },
  bov(){ if(this.node) this.node.port.postMessage({type:'bov'}); },
  pop(){ if(this.node) this.node.port.postMessage({type:'pop'}); },

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

/* 由車輛資料組出 worklet 的設定 */
function engineAudioConfig(S){
  const cv = S.cfg.cv, eng = S.cfg.eng;
  const cyl = (eng && +eng.cyl) || 4;
  const build = (typeof car==='function'&&car()) ? car().build : {};
  /* 排氣尾段影響管長與阻尼：四出比單出短而開放，聲音更亮 */
  const tips = build.tips||'single';
  const pipeL = {none:3.4, single:2.9, dual:2.5, quad:2.1}[tips] || 2.7;
  const damp  = {none:.46, single:.36, dual:.30, quad:.24}[tips] || .34;
  const refl  = {none:.80, single:.75, dual:.70, quad:.64}[tips] || .74;
  return {
    cylinders: cyl,
    pipeLength: pipeL,
    headerLength: cyl>=6 ? .72 : .58,
    intakeLength: cyl>=6 ? .48 : .38,
    turbo: !!cv.turbo, diesel: !!cv.diesel,
    damp, reflect: refl,
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
