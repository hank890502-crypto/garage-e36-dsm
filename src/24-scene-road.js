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

  /* ---- 路面 ---- */
  const roadTex = makeRoadTexture(THREE, night);
  const roadMat = new THREE.MeshStandardMaterial({map:roadTex, roughness:.94, metalness:0});
  const road = new THREE.Mesh(new THREE.PlaneGeometry(ROAD.roadLen, ROAD.texSpanZ), roadMat);
  road.rotation.x = -Math.PI/2;
  road.position.y = 0.02;
  road.receiveShadow = true;
  grp.add(road);

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
  const state = {night, builtNight:night};

  function layout(carX, carZ){
    /* 路面沿 X 對齊標線週期，這樣標線不會抖動 */
    road.position.x = Math.round(carX/ROAD.tileL)*ROAD.tileL;
    ground.position.x = carX; ground.position.z = carZ;
    hills.position.set(carX, 0, carZ);
    sky.position.set(carX, 0, carZ);

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

  return {
    group: grp,
    update: layout,
    /* 日夜切換：貼圖與材質重畫 */
    setNight(n){
      if(state.builtNight === n) return;
      state.builtNight = n;
      roadMat.map.dispose();
      roadMat.map = makeRoadTexture(THREE, n);
      roadMat.needsUpdate = true;
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
