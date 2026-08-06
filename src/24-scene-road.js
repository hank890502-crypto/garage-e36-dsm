/* ==========================================================================
   駕駛模式的道路與場景
   --------------------------------------------------------------------------
   為什麼是程式生成而不是找現成的 3D 道路模型：

     1. 車會一直開下去。任何固定的模型都有邊界，開到底就穿幫；
        程式生成的道路可以無限延伸（實作上是讓路面跟著車走並對齊標線週期）。
     2. 授權。本專案在授權上一路謹慎（見 NOTICE.md），道路模型的授權條款
        往往比車輛模型更模糊。程式生成沒有這個問題。
     3. 體積。repo 已經有 48 MB 的車輛網格，再塞一個場景模型會很痛；
        這整份程式碼不到 20 KB，貼圖是啟動時用 canvas 畫出來的。
     4. 可以畫對。標線尺寸直接照台灣法規，而不是照某個外國模型的樣子。

   標線尺寸依「道路交通標誌標線號誌設置規則」：
     車道線（第182條）      白虛線，線段 4 m、間距 6 m、線寬 10 cm
     分向限制線（第165條）  雙黃實線，線寬與間隔均 10 cm
     路面邊線（第183條）    白實線，線寬 15 cm
   車道寬取 3.5 m（一般道路常見值，法規未硬性規定單一數字）。

   ★ 路邊的柱子不是裝飾 ★
   在完全平坦的地面上開車是感覺不到速度的 —— 沒有東西經過你身邊。
   反光導標與路燈這些垂直物體才是速度感的來源，所以間距刻意做成規律的
   （導標 20 m、路燈 45 m），這樣掃過去的頻率就直接對應車速。
   ========================================================================== */

const ROAD = {
  laneW: 3.5,          // 車道寬（公尺）
  lanes: 2,            // 單向車道數
  tileL: 10,           // 標線循環長度：線段 4 + 間距 6
  texSpanZ: 44,        // 貼圖橫向涵蓋範圍（含路肩與草地）
  roadLen: 900,        // 路面板長度，夠遠才不會看到盡頭
  ppm: 16,             // 貼圖解析度（像素/公尺）
  postGap: 20,         // 反光導標間距
  poleGap: 45,         // 路燈間距
};
ROAD.roadW = ROAD.laneW*ROAD.lanes*2;      // 雙向總寬 14 m
ROAD.shoulder = 2.0;                        // 路肩

/* --------------------------------------------------------------------------
   用 canvas 畫出路面貼圖（橫向一整條剖面，縱向一個標線週期）
   -------------------------------------------------------------------------- */
function makeRoadTexture(THREE, night){
  const P = ROAD.ppm;
  const W = Math.round(ROAD.tileL*P);        // 縱向：一個 10 m 週期
  const H = Math.round(ROAD.texSpanZ*P);     // 橫向：44 m
  const cv = document.createElement('canvas');
  cv.width = W; cv.height = H;
  const g = cv.getContext('2d');
  const m2px = m => m*P;
  const midH = H/2;

  /* 草地／土地 */
  g.fillStyle = night ? '#1a2119' : '#5f6b4a';
  g.fillRect(0,0,W,H);
  /* 草地的顆粒感 */
  for(let i=0;i<900;i++){
    g.fillStyle = night ? 'rgba(255,255,255,.012)' : 'rgba(255,255,255,.04)';
    g.fillRect(Math.random()*W, Math.random()*H, 2, 2);
  }

  const halfRoad = ROAD.roadW/2, halfSh = halfRoad + ROAD.shoulder;

  /* 路肩：碎石色 */
  g.fillStyle = night ? '#2a2b28' : '#8a8577';
  g.fillRect(0, midH-m2px(halfSh), W, m2px(halfSh*2));

  /* 柏油路面 */
  const asphalt = night ? '#1b1d20' : '#454749';
  g.fillStyle = asphalt;
  g.fillRect(0, midH-m2px(halfRoad), W, m2px(halfRoad*2));
  /* 柏油的骨材顆粒 */
  for(let i=0;i<2600;i++){
    const y = midH-m2px(halfRoad) + Math.random()*m2px(halfRoad*2);
    const v = Math.random();
    g.fillStyle = v>.5 ? 'rgba(255,255,255,.030)' : 'rgba(0,0,0,.055)';
    g.fillRect(Math.random()*W, y, 1.6, 1.6);
  }
  /* 舊路面常見的縱向補胎痕（很淡，只是讓路面不要太平） */
  g.fillStyle = 'rgba(0,0,0,.06)';
  [-1,1].forEach(s=>{
    for(let l=0;l<ROAD.lanes;l++){
      const c = s*(ROAD.laneW*(l+0.5));
      g.fillRect(0, midH+m2px(c)-m2px(0.9), W, m2px(0.16));
      g.fillRect(0, midH+m2px(c)+m2px(0.74), W, m2px(0.16));
    }
  });

  const white = night ? '#c8ccc4' : '#eef0e9';
  const yellow = night ? '#b09a3e' : '#e3c341';

  /* 分向限制線：雙黃實線，線寬與間隔均 10 cm（第165條） */
  g.fillStyle = yellow;
  g.fillRect(0, midH-m2px(0.15), W, m2px(0.10));   // 中心往上 10cm 間隔的一半
  g.fillRect(0, midH+m2px(0.05), W, m2px(0.10));

  /* 車道線：白虛線，線段 4 m、間距 6 m、線寬 10 cm（第182條）
     貼圖縱向就是行車方向，所以在 0–4 m 畫線段、4–10 m 留空。 */
  g.fillStyle = white;
  for(let s=-1;s<=1;s+=2){
    for(let l=1;l<ROAD.lanes;l++){
      const c = s*(ROAD.laneW*l);
      g.fillRect(0, midH+m2px(c)-m2px(0.05), m2px(4), m2px(0.10));
    }
  }

  /* 路面邊線：白實線，線寬 15 cm（第183條） */
  g.fillStyle = white;
  [-1,1].forEach(s=>{
    const c = s*halfRoad;
    g.fillRect(0, midH+m2px(c)-m2px(s>0?0.15:0), W, m2px(0.15));
  });

  const tex = new THREE.CanvasTexture(cv);
  tex.wrapS = THREE.RepeatWrapping;    // 沿著行車方向重複
  tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.repeat.set(ROAD.roadLen/ROAD.tileL, 1);
  tex.anisotropy = 8;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}


/* ==========================================================================
   練車場地
   --------------------------------------------------------------------------
   三種場地共用同一套「跟著車走」的機制，只是路面貼圖與周邊物件不同：
     road  一般道路（雙向四線道，依台灣法規標線）
     drag  直線加速道：起跑線 + 距離標記，配計時器
     skid  甩尾場：大片柏油 + 定圓標線 + 三角錐，配甩尾計分
   ========================================================================== */

/* 直線加速道的貼圖：兩線道、無對向、每 10 m 一個週期 */
function makeDragTexture(THREE, night){
  const P = ROAD.ppm;
  const W = Math.round(ROAD.tileL*P), H = Math.round(ROAD.texSpanZ*P);
  const cv = document.createElement('canvas');
  cv.width=W; cv.height=H;
  const g = cv.getContext('2d'), m2px=m=>m*P, midH=H/2;
  g.fillStyle = night?'#161c16':'#5a6647'; g.fillRect(0,0,W,H);
  const halfRoad = 9;                       // 18 m 寬，兩個大車道
  g.fillStyle = night?'#26272a':'#3f4144';  // 賽道柏油偏深
  g.fillRect(0, midH-m2px(halfRoad), W, m2px(halfRoad*2));
  for(let i=0;i<2600;i++){
    const y = midH-m2px(halfRoad)+Math.random()*m2px(halfRoad*2);
    g.fillStyle = Math.random()>.5?'rgba(255,255,255,.028)':'rgba(0,0,0,.05)';
    g.fillRect(Math.random()*W, y, 1.6, 1.6);
  }
  /* 中央分道虛線 + 兩側邊線 */
  const white = night?'#c8ccc4':'#f0f2ec';
  g.fillStyle = white;
  g.fillRect(0, midH-m2px(0.06), m2px(4), m2px(0.12));
  [-1,1].forEach(sd=>g.fillRect(0, midH+m2px(sd*halfRoad)-m2px(sd>0?0.15:0), W, m2px(0.15)));
  const tex=new THREE.CanvasTexture(cv);
  tex.wrapS=THREE.RepeatWrapping; tex.wrapT=THREE.ClampToEdgeWrapping;
  tex.repeat.set(ROAD.roadLen/ROAD.tileL,1);
  tex.anisotropy=8; tex.colorSpace=THREE.SRGBColorSpace;
  return tex;
}

/* 甩尾場貼圖：一大片柏油 + 定圓 */
function makeSkidTexture(THREE, night){
  const S = 1024, PAD = 170;                // 貼圖像素、實際邊長（公尺）
  const cv=document.createElement('canvas'); cv.width=S; cv.height=S;
  const g=cv.getContext('2d'), px=m=>m/PAD*S, c=S/2;
  g.fillStyle = night?'#161c16':'#5a6647'; g.fillRect(0,0,S,S);
  /* 柏油場地 */
  g.fillStyle = night?'#232529':'#424447';
  g.fillRect(px(PAD/2-55), px(PAD/2-55), px(110), px(110));
  for(let i=0;i<9000;i++){
    g.fillStyle = Math.random()>.5?'rgba(255,255,255,.022)':'rgba(0,0,0,.045)';
    g.fillRect(px(PAD/2-55)+Math.random()*px(110), px(PAD/2-55)+Math.random()*px(110),2,2);
  }
  /* 胎痕：練甩尾的場地一定有一圈黑掉的軌跡 */
  g.strokeStyle='rgba(0,0,0,.30)';
  for(let i=0;i<26;i++){
    g.lineWidth=px(0.35+Math.random()*0.5);
    g.beginPath();
    g.arc(c,c,px(17+Math.random()*7),Math.random()*6.28,Math.random()*6.28+2.4);
    g.stroke();
  }
  /* 定圓標線：內圈 20 m 半徑、外圈 30 m */
  g.strokeStyle = night?'#c0c4bc':'#f2f4ee';
  g.lineWidth=px(0.10); g.beginPath(); g.arc(c,c,px(20),0,6.2832); g.stroke();
  g.lineWidth=px(0.10); g.beginPath(); g.arc(c,c,px(30),0,6.2832); g.stroke();
  /* 場地邊線 */
  g.lineWidth=px(0.15);
  g.strokeRect(px(PAD/2-55),px(PAD/2-55),px(110),px(110));
  const tex=new THREE.CanvasTexture(cv);
  tex.wrapS=tex.wrapT=THREE.ClampToEdgeWrapping;
  tex.anisotropy=8; tex.colorSpace=THREE.SRGBColorSpace;
  return {tex, pad:PAD};
}

/* --------------------------------------------------------------------------
   直線加速計時
   --------------------------------------------------------------------------
   自動判斷起跑：車停下來就重新武裝，一動就開始計時。
   量測點沿用實務慣例：60 ft（18.288 m）、1/8 mile（201.168 m）、
   1/4 mile（402.336 m），以及 0–60 / 0–100 / 0–200 km/h。
   -------------------------------------------------------------------------- */
const DragTimer = {
  armed:false, running:false, t:0, x0:0, marks:{}, best:{}, trap:0,
  SPEEDS:[60,100,200],
  DISTS:[['60ft',18.288],['201m',201.168],['402m',402.336]],
  reset(){ this.armed=false; this.running=false; this.t=0; this.marks={}; this.trap=0; },
  update(S, dt){
    const kph = Math.abs(S.speed);
    if(!this.running && kph < 1.2){ this.armed = true; this.marks={}; this.trap=0; }
    if(this.armed && !this.running && kph > 1.5){
      this.running=true; this.armed=false; this.t=0; this.x0=S.x; this.marks={};
    }
    if(!this.running) return;
    this.t += dt;
    const dist = Math.abs(S.x - this.x0);
    this.SPEEDS.forEach(v=>{
      const k='0-'+v;
      if(this.marks[k]===undefined && kph>=v){
        this.marks[k]=this.t;
        if(this.best[k]===undefined || this.t<this.best[k]) this.best[k]=this.t;
      }
    });
    this.DISTS.forEach(([k,d])=>{
      if(this.marks[k]===undefined && dist>=d){
        this.marks[k]=this.t;
        if(k==='402m') this.trap=kph;
        if(this.best[k]===undefined || this.t<this.best[k]) this.best[k]=this.t;
      }
    });
    /* 跑完 402 m 或停下來就結束這一趟 */
    if(dist>420 || (kph<1.2 && this.t>2)) this.running=false;
  },
};

/* --------------------------------------------------------------------------
   甩尾計分
   --------------------------------------------------------------------------
   連續段（combo）：滑移角維持在 15 度以上且車速夠快就持續累積，
   角度越大、時間越長分數越高。掉出來超過 0.7 秒才算結束。
   -------------------------------------------------------------------------- */
const DriftScore = {
  combo:0, comboT:0, maxAng:0, grace:0, best:0, bestT:0, active:false,
  reset(){ this.combo=0; this.comboT=0; this.maxAng=0; this.grace=0; this.active=false; },
  update(S, dt){
    const a = Math.abs(S.drift), kph = Math.abs(S.speed);
    /* 門檻設在 12 度／12 km/h：定圓甩尾（一檔滿舵）本來就是低速動作，
       門檻訂太高會讓最典型的練習項目完全不計分。 */
    const ok = a >= 12 && kph >= 12;
    if(ok){
      this.active=true; this.grace=0.7;
      this.comboT += dt; this.maxAng = Math.max(this.maxAng, a);
      /* 角度越接近 45 度給分越高，超過 70 度視為快打轉了，倍率下降 */
      const q = a<=45 ? a/45 : Math.max(0.25, 1-(a-45)/40);
      this.combo += q * (0.45 + kph/70) * dt * 100;
    }else if(this.active){
      this.grace -= dt;
      if(this.grace<=0){
        if(this.combo>this.best){ this.best=this.combo; this.bestT=this.comboT; }
        this.combo=0; this.comboT=0; this.maxAng=0; this.active=false;
      }
    }
  },
};

/* --------------------------------------------------------------------------
   天空：上下漸層的內面球
   -------------------------------------------------------------------------- */
function makeSky(THREE, night){
  const geo = new THREE.SphereGeometry(600, 24, 16);
  const mat = new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms:{
      top:   {value:new THREE.Color(night?0x070c14:0x7fb2e0)},
      bot:   {value:new THREE.Color(night?0x11161c:0xdfe6ea)},
      horiz: {value:new THREE.Color(night?0x0c1118:0xf2f0e6)},
    },
    vertexShader:`varying float vY;
      void main(){ vY = normalize(position).y;
        gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
    fragmentShader:`uniform vec3 top; uniform vec3 bot; uniform vec3 horiz;
      varying float vY;
      void main(){
        float h = smoothstep(-0.06, 0.30, vY);
        vec3 c = mix(horiz, top, h);
        c = mix(bot, c, smoothstep(-0.35, -0.02, vY));
        gl_FragColor = vec4(c, 1.0);
      }`,
  });
  const m = new THREE.Mesh(geo, mat);
  m.frustumCulled = false;
  return m;
}

/* --------------------------------------------------------------------------
   建立整組道路場景
   -------------------------------------------------------------------------- */
function buildRoadScene(THREE, scene, night){
  const grp = new THREE.Group();
  grp.name = 'roadScene';

  /* ---- 路面（一般道路 / 直線加速道共用同一塊，只換貼圖）---- */
  const roadMat = new THREE.MeshStandardMaterial({map:makeRoadTexture(THREE,night), roughness:.94, metalness:0});
  const road = new THREE.Mesh(new THREE.PlaneGeometry(ROAD.roadLen, ROAD.texSpanZ), roadMat);
  road.rotation.x = -Math.PI/2;
  road.position.y = 0.02;
  road.receiveShadow = true;
  grp.add(road);

  /* ---- 甩尾場：獨立一塊大柏油 ---- */
  const skidSrc = makeSkidTexture(THREE, night);
  const skidMat = new THREE.MeshStandardMaterial({map:skidSrc.tex, roughness:.93, metalness:0});
  const skid = new THREE.Mesh(new THREE.PlaneGeometry(skidSrc.pad, skidSrc.pad), skidMat);
  skid.rotation.x = -Math.PI/2;
  skid.position.y = 0.02;
  skid.receiveShadow = true;
  skid.visible = false;
  grp.add(skid);

  /* ---- 三角錐：甩尾場用，繞定圓排一圈 ---- */
  const coneGeo = new THREE.ConeGeometry(0.22, 0.55, 10);
  const coneMat = new THREE.MeshStandardMaterial({color:0xff6a1f, roughness:.75,
    emissive:0xff4400, emissiveIntensity:night?0.5:0.05});
  const CONE_N = 24;
  const cones = new THREE.InstancedMesh(coneGeo, coneMat, CONE_N);
  cones.visible = false;
  grp.add(cones);
  {
    const d = new THREE.Object3D();
    for(let i=0;i<CONE_N;i++){
      const a = i/CONE_N*Math.PI*2;
      d.position.set(Math.cos(a)*25, 0.28, Math.sin(a)*25);
      d.rotation.set(0,0,0); d.updateMatrix();
      cones.setMatrixAt(i, d.matrix);
    }
    cones.instanceMatrix.needsUpdate = true;
  }

  /* ---- 直線加速道的距離標記牌 ---- */
  const markGrp = new THREE.Group();
  markGrp.visible = false;
  grp.add(markGrp);
  const markMat = new THREE.MeshStandardMaterial({color:0xf2f4ee, roughness:.8});
  const markPost = new THREE.MeshStandardMaterial({color:0x5a6166, roughness:.7, metalness:.4});
  [[18.288,'60ft'],[100,'100'],[201.168,'1/8'],[300,'300'],[402.336,'1/4']].forEach(([d])=>{
    [-1,1].forEach(sd=>{
      const p2 = new THREE.Mesh(new THREE.CylinderGeometry(0.06,0.06,2.2,6), markPost);
      p2.position.set(-d, 1.1, sd*11.5);      // 車頭朝 −X，所以往 −X 方向排
      markGrp.add(p2);
      const bd = new THREE.Mesh(new THREE.BoxGeometry(0.08,0.9,1.5), markMat);
      bd.position.set(-d, 2.4, sd*11.5);
      markGrp.add(bd);
    });
  });
  /* 起跑線 */
  const startLine = new THREE.Mesh(new THREE.PlaneGeometry(0.4, 18),
    new THREE.MeshStandardMaterial({color:0xf5f7f2, roughness:.8}));
  startLine.rotation.x = -Math.PI/2; startLine.rotation.z = Math.PI/2;
  startLine.position.set(0, 0.03, 0);
  markGrp.add(startLine);

  /* ---- 遠處的地面：比貼圖範圍更大的一塊素色地，避免看到邊界 ---- */
  const groundMat = new THREE.MeshStandardMaterial({
    color: night?0x141a15:0x59634a, roughness:1, metalness:0});
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(1600,1600), groundMat);
  ground.rotation.x = -Math.PI/2;
  ground.position.y = -0.06;
  ground.receiveShadow = true;
  grp.add(ground);

  /* ---- 反光導標：路肩外側，20 m 一根 ---- */
  const postN = Math.ceil(ROAD.roadLen/ROAD.postGap);
  const postGeo = new THREE.CylinderGeometry(0.045,0.055,0.85,6);
  const postMat = new THREE.MeshStandardMaterial({color:night?0xb8b8ae:0xe8e8e0, roughness:.7});
  const posts = new THREE.InstancedMesh(postGeo, postMat, postN*2);
  posts.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  grp.add(posts);
  /* 導標上的反光片：夜間會亮 */
  const refGeo = new THREE.BoxGeometry(0.02,0.10,0.075);
  const refMat = new THREE.MeshStandardMaterial({
    color:0xff5a2a, emissive:0xff3a10, emissiveIntensity:night?1.7:0.15, roughness:.4});
  const refs = new THREE.InstancedMesh(refGeo, refMat, postN*2);
  refs.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  grp.add(refs);

  /* ---- 路燈：單側，45 m 一根 ---- */
  const poleN = Math.ceil(ROAD.roadLen/ROAD.poleGap);
  const poleGeo = new THREE.CylinderGeometry(0.075,0.10,8.2,7);
  const poleMat = new THREE.MeshStandardMaterial({color:night?0x3c4247:0x8d949a, roughness:.6, metalness:.5});
  const poles = new THREE.InstancedMesh(poleGeo, poleMat, poleN);
  poles.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  grp.add(poles);
  /* 燈頭：夜間發光 */
  const headGeo = new THREE.BoxGeometry(1.5,0.20,0.55);
  const headMat = new THREE.MeshStandardMaterial({
    color:night?0xfff0c8:0x9aa0a4, emissive:0xffdf9a, emissiveIntensity:night?2.4:0, roughness:.5});
  const heads = new THREE.InstancedMesh(headGeo, headMat, poleN);
  heads.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  grp.add(heads);

  /* ---- 遠景：一圈低多邊形丘陵，永遠保持在遠處 ---- */
  const hills = new THREE.Group();
  const hillMat = new THREE.MeshStandardMaterial({
    color:night?0x0e1512:0x4a5747, roughness:1, metalness:0, fog:true});
  for(let i=0;i<26;i++){
    const a = i/26*Math.PI*2 + (i%3)*0.06;
    const r = 300 + (i%4)*38;
    const h = 22 + (i%5)*14;
    const cone = new THREE.Mesh(new THREE.ConeGeometry(48+(i%3)*22, h, 5), hillMat);
    cone.position.set(Math.cos(a)*r, h/2-6, Math.sin(a)*r);
    cone.rotation.y = i*1.1;
    hills.add(cone);
  }
  grp.add(hills);

  /* ---- 天空 ---- */
  const sky = makeSky(THREE, night);
  grp.add(sky);

  /* ---- 每幀更新：把整組東西跟著車移動 ---- */
  const dummy = new THREE.Object3D();
  const state = {night, builtNight:night, venue:'road'};

  function layoutSkid(){
    posts.count = 0; refs.count = 0;
    posts.instanceMatrix.needsUpdate = true;
    refs.instanceMatrix.needsUpdate = true;
    for(let i=0;i<poleN;i++){
      /* 甩尾場四角各一盞燈 */
      const a = i<4 ? i/4*Math.PI*2 + Math.PI/4 : 0;
      dummy.position.set(i<4?Math.cos(a)*62:0, i<4?4.1:-99, i<4?Math.sin(a)*62:0);
      dummy.rotation.set(0,0,0); dummy.updateMatrix();
      poles.setMatrixAt(i, dummy.matrix);
      dummy.position.set(i<4?Math.cos(a)*61:0, i<4?8.15:-99, i<4?Math.sin(a)*61:0);
      dummy.updateMatrix(); heads.setMatrixAt(i, dummy.matrix);
    }
    poles.instanceMatrix.needsUpdate = true;
    heads.instanceMatrix.needsUpdate = true;
  }

  function layout(carX, carZ){
    /* 路面沿 X 對齊標線週期，這樣標線不會抖動 */
    road.position.x = Math.round(carX/ROAD.tileL)*ROAD.tileL;
    ground.position.x = carX; ground.position.z = carZ;
    hills.position.set(carX, 0, carZ);
    sky.position.set(carX, 0, carZ);
    /* 甩尾場是固定的一塊場地，不跟著車跑（不然定圓就沒有意義了） */
    if(state.venue==='skid') return layoutSkid();

    const zOut = ROAD.roadW/2 + ROAD.shoulder + 0.6;
    const base = Math.floor((carX - ROAD.roadLen/2)/ROAD.postGap)*ROAD.postGap;
    let n = 0;
    for(let i=0;i<postN;i++){
      const x = base + i*ROAD.postGap;
      for(const s of [-1,1]){
        dummy.position.set(x, 0.42, s*zOut);
        dummy.rotation.set(0,0,0); dummy.updateMatrix();
        posts.setMatrixAt(n, dummy.matrix);
        dummy.position.set(x-0.03*s, 0.62, s*zOut);
        dummy.updateMatrix();
        refs.setMatrixAt(n, dummy.matrix);
        n++;
      }
    }
    posts.count = n; refs.count = n;
    posts.instanceMatrix.needsUpdate = true;
    refs.instanceMatrix.needsUpdate = true;

    const pBase = Math.floor((carX - ROAD.roadLen/2)/ROAD.poleGap)*ROAD.poleGap;
    for(let i=0;i<poleN;i++){
      const x = pBase + i*ROAD.poleGap;
      dummy.position.set(x, 4.1, zOut+1.1);
      dummy.rotation.set(0,0,0); dummy.updateMatrix();
      poles.setMatrixAt(i, dummy.matrix);
      dummy.position.set(x, 8.15, zOut+0.45);
      dummy.updateMatrix();
      heads.setMatrixAt(i, dummy.matrix);
    }
    poles.instanceMatrix.needsUpdate = true;
    heads.instanceMatrix.needsUpdate = true;
  }

  layout(0,0);

  function setVenue(v){
    state.venue = v;
    road.visible = (v==='road' || v==='drag');
    skid.visible = (v==='skid');
    cones.visible = (v==='skid');
    markGrp.visible = (v==='drag');
    if(v==='drag' && roadMat.userData.kind!=='drag'){
      roadMat.map.dispose(); roadMat.map = makeDragTexture(THREE, state.builtNight);
      roadMat.userData.kind='drag'; roadMat.needsUpdate=true;
    }else if(v==='road' && roadMat.userData.kind!=='road'){
      roadMat.map.dispose(); roadMat.map = makeRoadTexture(THREE, state.builtNight);
      roadMat.userData.kind='road'; roadMat.needsUpdate=true;
    }
    if(v==='drag') DragTimer.reset();
    if(v==='skid') DriftScore.reset();
  }
  roadMat.userData.kind='road';

  return {
    group: grp,
    update: layout,
    setVenue,
    get venue(){ return state.venue; },
    /* 日夜切換：貼圖與材質重畫 */
    setNight(n){
      if(state.builtNight === n) return;
      state.builtNight = n;
      roadMat.map.dispose();
      roadMat.map = roadMat.userData.kind==='drag' ? makeDragTexture(THREE,n) : makeRoadTexture(THREE,n);
      roadMat.needsUpdate = true;
      skidMat.map.dispose();
      skidMat.map = makeSkidTexture(THREE,n).tex;
      skidMat.needsUpdate = true;
      coneMat.emissiveIntensity = n?0.5:0.05;
      groundMat.color.setHex(n?0x141a15:0x59634a);
      hillMat.color.setHex(n?0x0e1512:0x4a5747);
      postMat.color.setHex(n?0xb8b8ae:0xe8e8e0);
      refMat.emissiveIntensity = n?1.7:0.15;
      poleMat.color.setHex(n?0x3c4247:0x8d949a);
      headMat.color.setHex(n?0xfff0c8:0x9aa0a4);
      headMat.emissiveIntensity = n?2.4:0;
      const u = sky.material.uniforms;
      u.top.value.setHex(n?0x070c14:0x7fb2e0);
      u.bot.value.setHex(n?0x11161c:0xdfe6ea);
      u.horiz.value.setHex(n?0x0c1118:0xf2f0e6);
    },
    dispose(){
      grp.traverse(o=>{
        o.geometry?.dispose?.();
        if(o.material){
          (Array.isArray(o.material)?o.material:[o.material]).forEach(m=>{
            m.map?.dispose?.(); m.dispose?.();
          });
        }
      });
    },
  };
}
