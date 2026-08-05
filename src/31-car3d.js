/* ==========================================================================
   Vehicle 3D preview
   Photo-referenced E36 / Eclipse geometry with independent modification parts.
   ========================================================================== */
const CAR3D_BODY_IDS = new Set(['coupe','sedan','touring','compact','cabrio','coupe2g']);
const CAR3D_INSTANCES = [];
const CAR3D_MODEL_URLS = {
  coupe:'./assets/models/e36-coupe/model.glb',
  sedan:'./assets/models/e36-sedan/model.glb',
  compact:'./assets/models/e36-compact/model.glb',
  touring:'./assets/models/e36-touring/model.glb',
  cabrio:'./assets/models/e36-cabrio/model.glb',
  /* 2025 版 GSX：由 Sketchfab 的 source FBX 自行轉檔，
     已移除原始輪組（材質 Tire / Rim_Main / Rim_Badge / BrakeDisk），
     材質改名對齊本程式的通用著色規則。122,798 → 98,782 面。 */
  coupe2g:'./assets/models/eclipse-99/model.glb',
  /* E36 M3 專用車體。由 Sketchfab 的 source OBJ 自行轉檔：
     已移除場景地板與原始輪組（輪組由 app 依 datum 重建），63,433 → 21,392 面。 */
  'coupe-m3':'./assets/models/e36-m3/model.glb',
};
/*
 * Every donor model uses a different origin and wheel layout. These values are
 * measured from the source meshes after normalization; they must not be shared
 * between body styles.
 */
const CAR3D_BODY_CONFIG = {
  /* 2025 版 E36 車體網格：輪組已在轉檔時移除（由 app 依 datum 重建），
     所以整車 bbox 的最低點是車體而非輪胎，yOffset 用來把車身抬回實測的離地高。
     舊版那些 repairMaterials / smoothPaintNormals / relaxPaintSurface 是為了補救
     前一批網格的破面與尖角，新網格不需要，也不該再跑（relax 會把輪拱唇緣拉出尖角）。 */
  coupe:  {wheelMode:'replace', frontX:-1.4801, rearX:1.2317, yOffset:.1607},
  sedan:  {wheelMode:'replace', frontX:-1.4719, rearX:1.2293, yOffset:.1627},
  compact:{wheelMode:'replace', frontX:-1.3592, rearX:1.3479, yOffset:.1631},
  touring:{wheelMode:'replace', frontX:-1.4723, rearX:1.2293, yOffset:.1628, paintRoughness:.33},
  cabrio: {wheelMode:'replace', frontX:-1.4712, rearX:1.2437, yOffset:.1603},
  /* genericMaterials：新網格的節點名與舊版 eclipse_* 那一套完全不同，
     改走與 E36 相同的通用材質規則（材質已在轉檔時改名對齊）。 */
  coupe2g:{wheelMode:'replace', frontX:-1.2523, rearX:1.2799, yOffset:0.1204,
    genericMaterials:true, paintRoughness:.30},
  /* E36 M3：同上，yOffset 為實測的車體最低點與輪胎觸地面差值。 */
  'coupe-m3':{wheelMode:'replace',yOffset:.1229,frontX:-1.4382,rearX:1.2432},
};
const CAR3D_REVERSED_BODIES=new Set();   // 2025 版網格朝向已正確，不需要再翻面
const CAR3D_MODEL_CACHE = new Map();
const CAR3D_VIEWS = new Map();
let CAR3D_SYNCING = false;

const CAR3D_READY = window.CAR3D_LIB
  ? Promise.resolve(window.CAR3D_LIB)
  : Promise.reject(new Error('Three.js bundle is unavailable'));

function hasCar3D(bodyId){ return CAR3D_BODY_IDS.has(bodyId); }

function carPhoto(build, opt={}){
  const bodyId = hasCar3D(opt.bodyId) ? opt.bodyId : (String(opt.bodyId||'').endsWith('2g')?'coupe2g':'coupe');
  const config = encodeURIComponent(JSON.stringify({
    bodyId,
    modelId:opt.modelId||car()?.modelId||'',
    build:{...blankCar().build,...build},
    uid:opt.uid||uid(),
    interactive:opt.interactive!==false,
  }));
  const platform = bodyId.endsWith('2g') ? 'Mitsubishi Eclipse 2G' : 'BMW E36';
  return `<div class="car3d" data-car3d="${config}" role="img" aria-label="${platform} 3D 改裝預覽">
    <div class="car3d-load" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i></div>
    ${opt.interactive===false?'':`<button class="car3d-reset" type="button" aria-label="重設 3D 視角" title="重設 3D 視角"
      onclick="resetCar3D(event)">${ic('orbit',17)}</button>`}
  </div>`;
}

/* M3 的車身型式仍然是 Coupé，但葉子板、保桿、後視鏡與側裙都不同，
   所以給它自己的網格。variant 只影響 3D，車身資料（尺寸、相容性）仍走 coupe。 */
function isM3Model(modelId){
  const m = typeof mdlById==='function' ? mdlById(modelId) : null;
  return !!(m && m.m);
}
function car3DVariant(bodyId, modelId){
  if(bodyId==='coupe' && isM3Model(modelId) && CAR3D_MODEL_URLS['coupe-m3']) return 'coupe-m3';
  return bodyId;
}

function bodySpec(bodyId, modelId){
  const d = bodyById(bodyId) || {L:4433,W:1710,H:1366,wb:2700};
  return {
    id:car3DVariant(bodyId, modelId),   // 3D 用（可能是 variant）
    bodyId,                             // 資料用（永遠是真實車身型式）
    length:d.L/1000,
    width:d.W/1000,
    height:d.H/1000,
    wheelbase:d.wb/1000,
    eclipse:bodyId.endsWith('2g'),
    open:bodyId==='cabrio'||bodyId==='spyder2g',
  };
}

function car3DBodyConfig(bodyId){
  return CAR3D_BODY_CONFIG[bodyId]||{wheelMode:'native'};
}

function car3DPaints(spec){
  return spec.eclipse&&typeof ECL_PAINTS!=='undefined'?ECL_PAINTS:PAINTS;
}

function car3DPaint(spec, build){
  const list=car3DPaints(spec);
  return list.find(x=>x.id===build.paint)||list[0];
}

function lowerBodyPoints(spec){
  const front=-spec.length/2, rear=spec.length/2;
  if(spec.open) return [
    [front+.01,.46],[front+.10,.58],[front+.32,.70],[-1.35,.77],[-.78,.84],[.66,.85],[1.35,.82],[rear-.18,.72],[rear-.02,.54]
  ];
  if(spec.eclipse) return [
    [front+.01,.42],[front+.08,.53],[front+.28,.66],[-1.45,.72],[-.88,.80],[.82,.82],[1.42,.78],[rear-.16,.67],[rear-.01,.49]
  ];
  return [
    [front+.01,.46],[front+.10,.59],[front+.24,.70],[-1.50,.76],[-.84,.84],[.92,.85],[1.42,.82],[rear-.14,.72],[rear-.01,.51]
  ];
}

function cabinPoints(spec){
  const h=spec.height;
  if(spec.open) return null;
  if(spec.id==='touring') return [[-.80,.83],[-.48,h-.07],[.94,h-.07],[1.48,1.10],[1.53,.84]];
  if(spec.id==='compact') return [[-.72,.83],[-.40,h-.06],[.43,h-.06],[1.16,1.02],[1.22,.84]];
  if(spec.eclipse) return [[-.86,.80],[-.50,1.14],[-.16,h-.055],[.35,h-.045],[.70,1.23],[1.14,.98],[1.25,.81]];
  if(spec.id==='sedan') return [[-.77,.84],[-.40,h-.06],[.42,h-.06],[1.04,1.10],[1.16,.84]];
  return [[-.82,.84],[-.50,1.12],[-.27,h-.055],[.38,h-.06],[.72,1.23],[1.04,1.07],[1.16,.84]];
}

function shapeFromProfile(THREE, spec, tireR){
  const top=lowerBodyPoints(spec), s=new THREE.Shape();
  s.moveTo(top[0][0],top[0][1]);
  s.splineThru(top.slice(1).map(p=>new THREE.Vector2(p[0],p[1])));
  const rearX=spec.wheelbase/2, frontX=-rearX, arch=tireR+.065;
  s.lineTo(spec.length/2-.02,.27);
  s.lineTo(rearX+arch,tireR);
  s.absarc(rearX,tireR,arch,0,Math.PI,false);
  s.lineTo(frontX+arch,tireR);
  s.absarc(frontX,tireR,arch,0,Math.PI,false);
  s.lineTo(-spec.length/2+.02,.27);
  s.closePath();
  return s;
}

function shapeFromPolygon(THREE, points){
  const s=new THREE.Shape();s.moveTo(points[0][0],points[0][1]);
  s.splineThru(points.slice(1,-1).map(p=>new THREE.Vector2(p[0],p[1])));
  s.lineTo(points.at(-1)[0],points.at(-1)[1]);s.closePath();return s;
}

function mat(THREE, color, extra={}){
  return new THREE.MeshStandardMaterial({color,roughness:.42,metalness:.12,...extra});
}

function physicalPaint(THREE, hex, options={}){
  return new THREE.MeshPhysicalMaterial({
    color:hex,metalness:.24,roughness:options.roughness??.22,clearcoat:1,clearcoatRoughness:options.clearcoatRoughness??.09,
  });
}

function mesh(THREE, parent, geometry, material, pos=[0,0,0], rot=[0,0,0], cast=true){
  const m=new THREE.Mesh(geometry,material);
  m.position.set(...pos);m.rotation.set(...rot);m.castShadow=cast;m.receiveShadow=cast;parent.add(m);return m;
}

function ellipsoid(THREE, parent, material, dimensions, pos, rot=[0,0,0], segments=32){
  const m=mesh(THREE,parent,new THREE.SphereGeometry(.5,segments,Math.max(12,segments/2)),material,pos,rot);
  m.scale.set(...dimensions);return m;
}

function loftGeometry(THREE, stations, across=14){
  const vertices=[],indices=[];
  stations.forEach(({x,y,width,crown=.05})=>{
    for(let j=0;j<=across;j++){
      const u=j/across*2-1;
      vertices.push(x,y+crown*(1-u*u),u*width/2);
    }
  });
  for(let i=0;i<stations.length-1;i++) for(let j=0;j<across;j++){
    const a=i*(across+1)+j,b=(i+1)*(across+1)+j,c=a+1,d=b+1;
    indices.push(a,c,b,b,c,d);
  }
  const g=new THREE.BufferGeometry();
  g.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));g.setIndex(indices);g.computeVertexNormals();
  return g;
}

function addCrownedPanels(THREE, body, spec, paint){
  const front=-spec.length/2,rear=spec.length/2,w=spec.width;
  const panels=spec.eclipse ? [
    [{x:front+.08,y:.56,width:w*.72,crown:.035},{x:front+.40,y:.69,width:w*.92,crown:.075},{x:-.92,y:.805,width:w*.85,crown:.095}],
    [{x:-.18,y:spec.height-.018,width:w*.66,crown:.075},{x:.12,y:spec.height+.005,width:w*.65,crown:.085},{x:.42,y:spec.height-.018,width:w*.64,crown:.075}],
    [{x:1.10,y:.835,width:w*.78,crown:.05},{x:1.48,y:.79,width:w*.90,crown:.06},{x:rear-.08,y:.63,width:w*.76,crown:.04}],
  ] : [
    [{x:front+.09,y:.61,width:w*.70,crown:.035},{x:front+.42,y:.73,width:w*.92,crown:.075},{x:-.90,y:.845,width:w*.84,crown:.09}],
    [{x:-.26,y:spec.height-.018,width:w*.65,crown:.075},{x:.06,y:spec.height+.004,width:w*.65,crown:.085},{x:.40,y:spec.height-.022,width:w*.64,crown:.075}],
    [{x:1.02,y:.865,width:w*.76,crown:.045},{x:1.48,y:.83,width:w*.90,crown:.065},{x:rear-.08,y:.70,width:w*.76,crown:.035}],
  ];
  if(spec.open) panels.splice(1,1);
  panels.forEach(stations=>mesh(THREE,body,loftGeometry(THREE,stations),paint));
}

function addRoundedBodyVolumes(THREE, body, spec, paint){
  const front=-spec.length/2,rear=spec.length/2,w=spec.width;
  if(spec.eclipse){
    ellipsoid(THREE,body,paint,[.58,.42,w*.99],[front+.26,.53,0]);
    ellipsoid(THREE,body,paint,[.43,.36,w*.98],[rear-.18,.53,0]);
  }else{
    ellipsoid(THREE,body,paint,[.34,.34,w*.98],[front+.15,.54,0]);
    ellipsoid(THREE,body,paint,[.31,.34,w*.98],[rear-.13,.55,0]);
  }
}

function windowPolys(spec){
  if(spec.open) return [[[-.70,.94],[-.48,1.10],[-.37,1.10],[-.31,.94]]];
  if(spec.id==='touring') return [
    [[-.69,1.10],[-.43,spec.height-.12],[-.05,spec.height-.12],[-.08,1.08]],
    [[.02,1.08],[.02,spec.height-.12],[.87,spec.height-.12],[1.37,1.10]],
  ];
  if(spec.id==='sedan') return [
    [[-.68,1.09],[-.39,spec.height-.12],[-.02,spec.height-.12],[-.06,1.06]],
    [[.03,1.06],[.03,spec.height-.12],[.40,spec.height-.12],[.94,1.09]],
  ];
  if(spec.eclipse) return [
    [[-.72,1.02],[-.43,1.18],[-.14,spec.height-.12],[.03,spec.height-.12],[-.03,1.01]],
    [[.05,1.01],[.10,spec.height-.12],[.32,spec.height-.12],[.69,1.19],[.98,1.00]],
  ];
  return [
    [[-.69,1.09],[-.43,1.18],[-.24,spec.height-.12],[.05,spec.height-.12],[-.02,1.06]],
    [[.06,1.06],[.11,spec.height-.12],[.35,spec.height-.12],[.69,1.20],[.91,1.08]],
  ];
}

function polygonGeometry(THREE, pts){
  const s=new THREE.Shape();s.moveTo(pts[0][0],pts[0][1]);pts.slice(1).forEach(p=>s.lineTo(p[0],p[1]));s.closePath();
  return new THREE.ShapeGeometry(s);
}

function addWindows(THREE, body, spec, build, cabinWidth){
  const tint=Math.max(0,Math.min(90,+build.tint||0));
  const c=tint>55?0x030608:tint>20?0x0b171c:0x1b3038;
  const wm=new THREE.MeshPhysicalMaterial({
    color:c,metalness:.28,roughness:.08,clearcoat:1,clearcoatRoughness:.06,
    transparent:true,opacity:.94,side:THREE.DoubleSide,
  });
  windowPolys(spec).forEach(poly=>{
    const g=polygonGeometry(THREE,poly);
    [-1,1].forEach(side=>mesh(THREE,body,g,wm,[0,0,side*(cabinWidth/2+.046)],[0,0,0],false));
  });
  if(!spec.open){
    const pillar=mat(THREE,0x090d0f,{metalness:.22,roughness:.22});
    [-1,1].forEach(side=>mesh(THREE,body,new THREE.BoxGeometry(.045,.43,.025),pillar,[.025,1.12,side*(cabinWidth/2+.054)],[0,0,0],false));
    const cabin=cabinPoints(spec);
    const slopedGlass=(a,b,coverage)=>{
      const dx=b[0]-a[0],dy=b[1]-a[1],len=Math.hypot(dx,dy),angle=Math.atan2(dy,dx);
      const nx=-Math.sin(angle),ny=Math.cos(angle),cx=(a[0]+b[0])/2+nx*.065,cy=(a[1]+b[1])/2+ny*.065;
      mesh(THREE,body,new THREE.BoxGeometry(len*coverage,.026,cabinWidth*.91),wm,[cx,cy,0],[0,0,angle],false);
    };
    slopedGlass(cabin[0],cabin[1],.90);
    slopedGlass(cabin[cabin.length-2],cabin[cabin.length-1],.86);
  }
  if(spec.open){
    const interior=mat(THREE,0x111614,{roughness:.78});
    mesh(THREE,body,new THREE.BoxGeometry(1.65,.10,spec.width*.76),interior,[.05,.88,0]);
    [-.30,.52].forEach(x=>mesh(THREE,body,new THREE.BoxGeometry(.42,.54,.48),interior,[x,.78,-.29],[0,0,0]));
    const frame=mat(THREE,0x252d2d,{metalness:.38,roughness:.28});
    [-1,1].forEach(side=>mesh(THREE,body,new THREE.BoxGeometry(.07,.48,.045),frame,[-.47,1.03,side*(spec.width*.35)],[0,0,-.72]));
  }
}

function addPanelLines(THREE, body, spec){
  const lm=new THREE.LineBasicMaterial({color:0x151a1b,transparent:true,opacity:.5});
  [-1,1].forEach(side=>{
    const z=side*(spec.width/2+.046);
    const frontDoor=spec.eclipse?-.66:-.62,rearDoor=spec.eclipse?.70:.76;
    [frontDoor,rearDoor].forEach((x,i)=>{
      const pts=[new THREE.Vector3(x,i?1.02:1.08,z),new THREE.Vector3(x,.49,z)];
      body.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts),lm));
    });
    const lower=[new THREE.Vector3(-1.18,.43,z),new THREE.Vector3(1.20,.43,z)];
    body.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(lower),lm));
  });
}

function addBodyTrim(THREE, body, spec, paint){
  const trim=mat(THREE,0x151918,{metalness:.28,roughness:.48});
  const handle=mat(THREE,0x252b2a,{metalness:.64,roughness:.24});
  [-1,1].forEach(side=>{
    const z=side*(spec.width/2+.047);
    if(!spec.eclipse){
      mesh(THREE,body,new THREE.BoxGeometry(1.03,.055,.035),trim,[-.97,.61,z]);
      mesh(THREE,body,new THREE.BoxGeometry(1.54,.055,.035),trim,[.82,.61,z]);
    }
    mesh(THREE,body,new THREE.BoxGeometry(.19,.032,.028),handle,[.48,spec.eclipse?.82:.83,z+side*.012],spec.eclipse?[0,0,-.07]:[0,0,0],false);
  });
  const lowerTrim=spec.eclipse?paint:trim;
  [-1,1].forEach(side=>mesh(THREE,body,new THREE.BoxGeometry(spec.wheelbase-.58,.045,.045),lowerTrim,[0,.35,side*(spec.width/2+.048)]));
}

/* ==========================================================================
   輪組幾何基準（datum）
   --------------------------------------------------------------------------
   所有橫向座標都掛在 hubFace 上 —— 輪轂鎖付面到車輛中心線的距離。
   這是車上唯一不會因為換輪圈而改變的橫向平面：

       輪圈中心面 = hubFace − ET          （ET 變小 → 輪圈往外）
       輪圈安裝面 = hubFace                （永遠不動）
       碟盤摩擦面 = hubFace − hatOffset    （永遠不動）

   ★ 不可以用「胎寬」推導任何軸向座標。★

   hubFace 的來源分兩種，每一台都註明：
     measured  用 assets/models/ 的捐贈網格實測輪心 + 原廠 ET 反推。
               好處是原廠狀態與捐贈網格的輪拱完全貼齊。
     spec      捐贈網格拆不出輪心，改用公開規格的輪距/2 + 原廠 ET。

   refTireR 是「車身高度已經調準」的那個胎半徑。換胎時整車一起升降，
   輪拱間隙才會依實際物理變化，而不是讓輪胎陷進地面。
   ========================================================================== */
const CAR3D_DATUM = {
  /* 2025 版 E36 網格：直接從各自的輪組 primitive 解出頂點、分四角量測。
     這一批的軸距誤差只有 +1.2 ~ +14.8 mm，半輪距全家族一致落在 716.6–719.4 mm
     （真實 E36 半輪距約 704–711，網格偏寬 6–15 mm，但輪拱同樣偏寬，視覺自洽）。
     hubFace = 實測半輪距 + 原廠 ET47。 */
  coupe:  {hubFaceF:.7664, hubFaceR:.7664, oemET:47, refTireR:.3125, src:'measured'},
  sedan:  {hubFaceF:.7636, hubFaceR:.7636, oemET:47, refTireR:.3113, src:'measured'},
  compact:{hubFaceF:.7651, hubFaceR:.7651, oemET:47, refTireR:.3120, src:'measured'},
  touring:{hubFaceF:.7637, hubFaceR:.7637, oemET:47, refTireR:.3114, src:'measured'},
  cabrio: {hubFaceF:.7646, hubFaceR:.7646, oemET:47, refTireR:.3118, src:'measured'},
  /* Eclipse 的捐贈網格只有一顆孤立在原點的 15 吋鋼圈，不能當基準，改用公開規格：
     前輪距 1513.8 / 後 1508.8 mm（半 756.9 / 754.4），原廠 ET46。 */
  /* 2025 版 GSX 網格實測：半輪距 前 756.7 / 後 752.7 mm
     （真實輪距 1513.8 / 1508.8 → 756.9 / 754.4，差 −0.2 / −1.7 mm，七顆裡最準）
     軸距 2532 mm（真實 2510，+22）、胎徑 645 mm、輪心高 323 mm。原廠 ET46。
     （以 app 的 coupe2g 車長 4390 mm 換算） */
  coupe2g:{hubFaceF:0.7973, hubFaceR:0.7933, oemET:46, refTireR:0.3231, src:'measured'},
  /* E36 M3：由 source OBJ 的輪組實測。半輪距 前 705.4 / 後 721.3 mm
     （真實 M3 輪距 1422/1444 → 711.0/722.0，差 −5.6 / −0.7 mm），軸距 2681.4 mm。
     原廠 ET41（Style 22/23/24/39 皆為 ET41）。 */
  'coupe-m3':{hubFaceF:.7464, hubFaceR:.7623, oemET:41, refTireR:.3210, src:'measured'},
};

/* 輪轂幾何（相容性判斷另有 HUB 常數，這裡只取 3D 需要的） */
const CAR3D_HUB = {
  e36:   {pcd:120,   bore:72.56, lugs:5},
  dsm2g: {pcd:114.3, bore:67.1,  lugs:5},
};

/* ★估算值★ 公開領域查無原廠數據。UI 需標示為估算，不可作為干涉判斷依據。
   hatOffset：碟盤摩擦面中心相對輪轂鎖付面往內的距離。
   （Wilwood DS495 的 79.2 mm 是大盤改裝套件值，原廠碟帽較淺。） */
const CAR3D_BRAKE_EST = {
  e36:   {hatOffset:.042, caliperDegF:104, caliperDegR:76},
  dsm2g: {hatOffset:.040, caliperDegF:108, caliperDegR:74},
};
/* ★估算值★ 支柱中心線相對輪圈中心面往內的距離。 */
const CAR3D_STRUT_INSET = {e36:.070, dsm2g:.095};

function car3DDatum(bodyId){
  return CAR3D_DATUM[bodyId] || {hubFaceF:.75, hubFaceR:.75, oemET:47, refTireR:.30, src:'fallback'};
}

/* --------------------------------------------------------------------------
   外部輪輻面素材插槽
   --------------------------------------------------------------------------
   輪圈拆三段：輪輻面（造型）／輪輞（J 寬決定）／胎唇座（吋數決定）。
   只有「面」能換成外部素材 —— 輪輞與 ET 必須維持程序化，否則改 ET、改 J 寬會失效。

   註冊方式（素材放 assets/wheels/）：
     CAR3D_WHEEL_FACE_SOURCES['bbs-lm'] = {
       url:'./assets/wheels/lm-face.glb',
       faceDiameter:430,  // 素材輪輻面外圈直徑（mm）
       axis:'z',          // 素材的輪軸方向：'x' | 'y' | 'z'
       mountZ:0,          // 素材原點到安裝面的距離（mm）
     };
   未註冊的樣式自動退回程序化輪輻，功能不受影響。
   授權提醒：品牌輪圈造型可能受設計權／商標保護。上傳者標 CC0 不代表原廠同意。
   -------------------------------------------------------------------------- */
const CAR3D_WHEEL_FACE_SOURCES = {
  /* 由 Sketchfab 素材抽出的輪輻面單件：已刪掉素材自帶的輪胎與輪輞（那兩件由 app
     依 J 寬與 ET 程序化生成，否則改 ET 會失效），並把座標系烘成 +Z 朝外、
     原點在輪輻面外平面。4,852 面 / 99 KB。 */
  'bbs-lm': {url:'./assets/wheels/face-bbs.glb', axis:'z'},
};
const CAR3D_WHEEL_FACE_LOADING = new Map();
const CAR3D_WHEEL_FACE_READY   = new Map();

function ensureWheelFace(THREE, GLTFLoader, MeshoptDecoder, styleId){
  const src = CAR3D_WHEEL_FACE_SOURCES[styleId];
  if(!src) return Promise.resolve(null);
  if(CAR3D_WHEEL_FACE_READY.has(styleId)) return Promise.resolve(CAR3D_WHEEL_FACE_READY.get(styleId));
  if(!CAR3D_WHEEL_FACE_LOADING.has(styleId)){
    CAR3D_WHEEL_FACE_LOADING.set(styleId, new Promise(resolve=>{
      const loader=new GLTFLoader();
      if(MeshoptDecoder) loader.setMeshoptDecoder(MeshoptDecoder);
      loader.load(src.url, gltf=>{
        const inner=gltf.scene;
        if(src.axis==='x') inner.rotation.y=Math.PI/2;
        else if(src.axis==='y') inner.rotation.x=-Math.PI/2;
        inner.updateMatrixWorld(true);
        const box=new THREE.Box3().setFromObject(inner);
        const size=box.getSize(new THREE.Vector3()), c=box.getCenter(new THREE.Vector3());
        const measured=Math.max(size.x,size.y);
        const target=(+src.faceDiameter||measured*1000)/1000;
        inner.position.set(-c.x,-c.y,-c.z+(+src.mountZ||0)/1000);
        const holder=new THREE.Group(); holder.add(inner);
        if(measured>0) holder.scale.setScalar(target/measured);
        const ready={holder, faceDiameter:target};
        CAR3D_WHEEL_FACE_READY.set(styleId, ready); resolve(ready);
      }, undefined, err=>{
        console.warn('[car3d-wheelface]',styleId,err);
        CAR3D_WHEEL_FACE_READY.set(styleId,null); resolve(null);
      });
    }));
  }
  return CAR3D_WHEEL_FACE_LOADING.get(styleId);
}

function wheelPreset(id){
  const exact=[...WHEEL_STYLES,...ECL_WHEEL_STYLES].find(x=>x.id===id);
  if(exact) return exact;
  return {spokes:10,wide:true};
}

/* --------------------------------------------------------------------------
   配輪幾何：把 build 的胎規 + J 寬 + ET 換算成每一個長度（公尺）
   -------------------------------------------------------------------------- */
function wheelGeometrySpec(build, datum, front){
  const size=+build.size||17, ar=+build.tireAR||45, nominal=+build.tireW||225;
  const j=rimJOf(build), et=rimETOf(build, datum.oemET)/1000;
  const rimD=size*.0254, rimR=rimD/2, rimW=j*.0254;
  const section=tireSectionWidth(nominal, j)/1000;   // 實際斷面寬（隨 J 寬變）
  const overall=tireOverallWidth(nominal, j)/1000;   // 含保護肋 —— 會磨葉子板的是這個
  const sectionH=nominal*(ar/100)/1000;              // 胎壁高（依規範用標稱寬）
  const tireR=rimR+sectionH;
  const hubFace=front?datum.hubFaceF:datum.hubFaceR;
  return {size, j, et, rimD, rimR, rimW, section, overall, sectionH, tireR,
          hubFace, centreZ:hubFace-et};
}

/* --------------------------------------------------------------------------
   輪輻：沿半徑放樣的實體，帶剖面錐度與盤面深度
   -------------------------------------------------------------------------- */
function spokeGeometry(THREE, o){
  const {r0,r1,w0,w1,t0,t1,dish,twist}=o, N=6, verts=[], idx=[];
  const push=p=>{verts.push(p[0],p[1],p[2]);return verts.length/3-1;};
  const rows=[];
  for(let i=0;i<=N;i++){
    const u=i/N, r=r0+(r1-r0)*u;
    const w=(w0+(w1-w0)*u)/2, t=(t0+(t1-t0)*u)/2;
    const z=dish*Math.pow(u,1.7), a=twist*u;
    const ca=Math.cos(a), sa=Math.sin(a);
    rows.push([
      push([r*ca - w*sa, r*sa + w*ca, z+t]),
      push([r*ca + w*sa, r*sa - w*ca, z+t]),
      push([r*ca + w*sa, r*sa - w*ca, z-t]),
      push([r*ca - w*sa, r*sa + w*ca, z-t]),
    ]);
  }
  for(let i=0;i<rows.length-1;i++){
    const a=rows[i], b=rows[i+1];
    for(let k=0;k<4;k++){
      const k2=(k+1)%4;
      idx.push(a[k],b[k],a[k2], a[k2],b[k],b[k2]);
    }
  }
  const f=rows[0], l=rows[rows.length-1];
  idx.push(f[0],f[2],f[1], f[0],f[3],f[2]);
  idx.push(l[0],l[1],l[2], l[0],l[2],l[3]);
  const g=new THREE.BufferGeometry();
  g.setAttribute('position',new THREE.Float32BufferAttribute(verts,3));
  g.setIndex(idx); g.computeVertexNormals(); return g;
}

/* 輪輻面：輪輻 + 內盤 + 中心蓋 + 螺帽。所有 Z 都相對輪圈中心面，並乘上 side。 */
function wheelFaceGroup(THREE, preset, spec, hub, rimMat, lipMat, faceMesh, side){
  const g=new THREE.Group(), rimR=spec.rimR;
  const mountZ=side*spec.et;                                  // 輪轂鎖付面
  const faceZ=side*(spec.rimW/2 - Math.min(.018, spec.rimW*.10));

  if(faceMesh){
    const m=faceMesh.holder.clone(true);
    m.scale.multiplyScalar((rimR*2*.92)/faceMesh.faceDiameter);
    // 讓「輪圈顏色」8 種選項對外部素材同樣有效 —— 否則換色會對這款輪圈沒反應
    m.traverse(o=>{
      if(!o.isMesh) return;
      o.castShadow=true;o.receiveShadow=true;
      const list=(Array.isArray(o.material)?o.material:[o.material]).map(src=>{
        const r=src.clone();
        r.color.copy(rimMat.color);r.metalness=rimMat.metalness;r.roughness=rimMat.roughness;
        return r;
      });
      o.material=list.length===1?list[0]:list;
    });
    if(side<0) m.rotation.y=Math.PI;   // 用旋轉而不是負縮放，避免面法向反轉
    m.position.z=faceZ; g.add(m);
    return g;
  }

  const lugR=hub.pcd/2000, boreR=hub.bore/2000;
  // 輪輻起點必須繞得開螺栓圈，否則輪輻會在輪心互相穿模
  const r0=Math.max(boreR+.016, lugR+.014), r1=rimR*.955;
  const pair=!!(preset.pair||preset.mesh);
  const n=pair?Math.max(3,Math.round(preset.spokes/2)):Math.max(3,preset.spokes|0);
  const count=pair?n*2:n;
  // 內端總寬不得超過該半徑 88% 的週長 —— 防穿模的硬上限
  const w0=Math.min(preset.innerW||(preset.thin?.028:.040), 2*Math.PI*r0*.88/count);
  const w1=Math.min(preset.outerW||(preset.wide?.075:.055), 2*Math.PI*r1*.94/count);
  const t0=preset.steel?.012:.026, t1=preset.steel?.009:.016;
  const dish=side*((preset.dish?-.026:0)+(preset.concave?-.020:0));
  const spread=pair?(preset.pairSpread||.035):0;
  const spokeMat=rimMat.clone(); spokeMat.side=THREE.DoubleSide;

  for(let i=0;i<n;i++){
    const base=i/n*Math.PI*2;
    (pair?[-1,1]:[0]).forEach(sgn=>{
      const twist=(sgn*spread+(preset.spokeSweep||0))/Math.max(.05,r1);
      mesh(THREE,g,spokeGeometry(THREE,{r0,r1,w0,w1,t0,t1,dish,twist}),spokeMat,[0,0,faceZ],[0,0,base]);
    });
  }
  // 內盤：把輪輻根部與輪輞連起來，消掉「從空環看穿到卡鉗」
  const web=new THREE.Mesh(new THREE.CylinderGeometry(r0*1.02,r0*1.02,.030,36),rimMat);
  web.rotation.x=Math.PI/2; web.position.z=faceZ+dish*.35; g.add(web);
  // 中心蓋：外端與輪輻面齊平（舊版是長 40 mm 的圓柱，外凸 20 mm）
  const capR=Math.max(boreR+.012, lugR*.72), capL=.012;
  mesh(THREE,g,new THREE.CylinderGeometry(capR,capR*.97,capL,32),rimMat,
       [0,0,faceZ+dish-side*capL/2],[Math.PI/2,0,0]);
  // 螺帽：座落在真實螺栓圈上（5x120 → 半徑 60 mm，舊版是 17 mm）
  const lugs=hub.lugs||5;
  for(let i=0;i<lugs;i++){
    const a=i/lugs*Math.PI*2+Math.PI/lugs;
    mesh(THREE,g,new THREE.CylinderGeometry(.0092,.0092,.014,6),lipMat,
         [Math.cos(a)*lugR,Math.sin(a)*lugR,mountZ-side*.030],[Math.PI/2,0,0],false);
  }
  return g;
}

function cylinderBetween(THREE,parent,a,b,radius,material,segments=12){
  const start=new THREE.Vector3(...a),end=new THREE.Vector3(...b),direction=end.clone().sub(start);
  const part=new THREE.Mesh(new THREE.CylinderGeometry(radius,radius,direction.length(),segments),material);
  part.position.copy(start).add(end).multiplyScalar(.5);
  part.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),direction.normalize());
  part.castShadow=true;part.receiveShadow=true;parent.add(part);return part;
}

function suspensionPalette(THREE,build){
  const products=build.platform==='dsm2g'?ECL_SUSPENSION_PRODUCTS:SUSPENSION_PRODUCTS;
  const selected=products.find(x=>x.id===build.suspension)||products[0];
  if(selected.id==='tein-flexz')return {spring:mat(THREE,0x159448,{metalness:.40,roughness:.28}),damper:mat(THREE,0x293632,{metalness:.62,roughness:.27})};
  if(selected.id==='b14')return {spring:mat(THREE,0x195a9f,{metalness:.42,roughness:.28}),damper:mat(THREE,0xe5ba16,{metalness:.58,roughness:.24})};
  if(selected.id==='kwv3')return {spring:mat(THREE,0x643283,{metalness:.42,roughness:.28}),damper:mat(THREE,0xd9b122,{metalness:.58,roughness:.24})};
  return {spring:mat(THREE,0x252a2c,{metalness:.46,roughness:.38}),damper:mat(THREE,0x343a3c,{metalness:.55,roughness:.32})};
}

/* 支柱位置只由 datum 決定，不再由胎寬推導 */
function addSuspensionModule(THREE,parent,build,spec,side,front){
  const palette=suspensionPalette(THREE,build),steel=mat(THREE,0x4c5355,{metalness:.68,roughness:.31});
  const isEclipse=build.platform==='dsm2g',rimR=spec.rimR;
  const x=front?rimR*.10:-rimR*.04;
  const z=-side*CAR3D_STRUT_INSET[isEclipse?'dsm2g':'e36'];
  const top=rimR*.74,bottom=-rimR*.28;
  const hubZ=-side*.030, inboardZ=-side*(spec.rimW*.55+.055);
  mesh(THREE,parent,new THREE.CylinderGeometry(rimR*.055,rimR*.062,top-bottom,20),palette.damper,[x,(top+bottom)/2,z]);
  mesh(THREE,parent,new THREE.CylinderGeometry(rimR*.13,rimR*.13,.025,28),steel,[x,top+.018,z]);
  const points=[],turns=front?6.5:5.5,steps=72;
  for(let i=0;i<=steps;i++){
    const t=i/steps,angle=t*turns*Math.PI*2,r=rimR*.105;
    points.push(new THREE.Vector3(x+Math.cos(angle)*r,bottom+rimR*.22+t*rimR*.72,z+Math.sin(angle)*r*.54));
  }
  const spring=new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points),steps,rimR*.016,7,false),palette.spring);
  spring.castShadow=true;spring.receiveShadow=true;parent.add(spring);
  if(isEclipse){
    const lower=[0,-rimR*.20,hubZ],upper=[0,rimR*.30,hubZ];
    cylinderBetween(THREE,parent,lower,[-rimR*.40,-rimR*.27,inboardZ],rimR*.028,steel,14);
    cylinderBetween(THREE,parent,lower,[rimR*.38,-rimR*.27,inboardZ],rimR*.028,steel,14);
    if(front){
      cylinderBetween(THREE,parent,upper,[-rimR*.28,rimR*.31,inboardZ],rimR*.024,steel,14);
      cylinderBetween(THREE,parent,upper,[rimR*.27,rimR*.31,inboardZ],rimR*.024,steel,14);
    }else{
      cylinderBetween(THREE,parent,upper,[-rimR*.34,rimR*.18,inboardZ],rimR*.022,steel,12);
      cylinderBetween(THREE,parent,[0,-rimR*.05,hubZ],[rimR*.42,-rimR*.02,inboardZ],rimR*.021,steel,12);
      cylinderBetween(THREE,parent,[0,-rimR*.08,hubZ],[-rimR*.45,-rimR*.02,inboardZ],rimR*.021,steel,12);
    }
    cylinderBetween(THREE,parent,[x,bottom,z],lower,rimR*.030,steel,14);
  }else{
    cylinderBetween(THREE,parent,[x,bottom,z],[0,-rimR*.16,hubZ],rimR*.032,steel,14);
    cylinderBetween(THREE,parent,[-rimR*.38,-rimR*.31,z],[0,-rimR*.18,hubZ],rimR*.026,steel,12);
    cylinderBetween(THREE,parent,[rimR*.38,-rimR*.31,z],[0,-rimR*.18,hubZ],rimR*.026,steel,12);
  }
}

/* 卡鉗剖面：跨在碟盤外緣的 U 形，不再是蓋滿整個輪圈的平板 */
function caliperGeometry(THREE,width,height,depth){
  const shape=new THREE.Shape();
  shape.moveTo(-width*.46,-height*.50);
  shape.quadraticCurveTo(-width*.54,-height*.16,-width*.46,height*.30);
  shape.quadraticCurveTo(-width*.40,height*.52,-width*.10,height*.50);
  shape.lineTo(width*.12,height*.50);
  shape.quadraticCurveTo(width*.42,height*.52,width*.47,height*.28);
  shape.quadraticCurveTo(width*.54,-height*.16,width*.46,-height*.50);
  shape.quadraticCurveTo(width*.10,-height*.62,-width*.46,-height*.50);
  shape.closePath();
  const geometry=new THREE.ExtrudeGeometry(shape,{depth,bevelEnabled:true,bevelSegments:2,
    bevelSize:depth*.10,bevelThickness:depth*.08,curveSegments:10});
  geometry.translate(0,0,-depth/2);geometry.computeVertexNormals();return geometry;
}

/* 碟盤與卡鉗：軸向位置只由 hubFace − hatOffset 決定 */
function addBrakeModule(THREE,parent,build,spec,side,front){
  const isEclipse=build.platform==='dsm2g',plat=isEclipse?'dsm2g':'e36';
  const products=isEclipse?eclipseBrakeProducts(build.modelId):BRAKE_PRODUCTS;
  const brake=products.find(x=>x.id===build.brakeKit)||products[0];
  const est=CAR3D_BRAKE_EST[plat];
  // 碟盤要留得下輪輞內壁間隙；裝不下時夾到可容納的最大值（UI 另有文字警告）
  const discR=Math.min(spec.rimR-.014, (brake.disc/2000)*(front?1:.88));
  const discZ=side*(spec.et-est.hatOffset);            // ← 與胎寬無關
  const thick=brake.pistons>=4?.016:.011;
  const rotor=mat(THREE,0x788083,{metalness:.82,roughness:.28}),edge=mat(THREE,0x33393a,{metalness:.72,roughness:.40});
  [-thick/2,thick/2].forEach(o=>mesh(THREE,parent,new THREE.CylinderGeometry(discR,discR,.007,64),rotor,[0,0,discZ+side*o],[Math.PI/2,0,0]));
  mesh(THREE,parent,new THREE.CylinderGeometry(discR*.42,discR*.42,thick+.020,40),edge,[0,0,discZ],[Math.PI/2,0,0]);
  // 碟帽：把碟盤接回輪轂鎖付面
  mesh(THREE,parent,new THREE.CylinderGeometry(discR*.36,discR*.40,Math.max(.010,est.hatOffset),32),edge,
       [0,0,side*(spec.et-est.hatOffset/2)],[Math.PI/2,0,0],false);
  const vent=new THREE.Mesh(new THREE.TorusGeometry(discR*.965,.005,7,64),edge);vent.position.z=discZ;parent.add(vent);
  if(brake.id==='brembo'||brake.id==='ecl-brembo')for(let i=0;i<18;i++){
    const a=i/18*Math.PI*2+.08, hr=discR*(i%2?.70:.82);
    mesh(THREE,parent,new THREE.CylinderGeometry(.0042,.0042,thick+.004,8),edge,
         [Math.cos(a)*hr,Math.sin(a)*hr,discZ],[Math.PI/2,0,0],false);
  }
  const col=CALIPER_COLORS.find(x=>x.id===build.caliper)||CALIPER_COLORS.find(x=>x.id===brake.color)||CALIPER_COLORS[0];
  const caliperMat=mat(THREE,col.hex,{metalness:.28,roughness:.27});
  // 卡鉗只跨在摩擦帶上：徑向約 0.70R → 1.03R
  const height=discR*.34, width=discR*(brake.pistons>=4?.46:brake.pistons===2?.38:.32);
  const depth=thick+(brake.pistons>=4?.062:.046);
  // 軸向：中心對齊碟盤，且外側面不得超出輪轂鎖付面
  let cz=discZ;
  const maxOuter=side*(spec.et-.004);
  if(Math.abs(cz+side*depth/2)>Math.abs(maxOuter)) cz=maxOuter-side*depth/2;
  const deg=(front?est.caliperDegF:est.caliperDegR)*Math.PI/180*(build.rearIsPlusX?1:-1);
  const rr=discR*.865;
  const caliper=mesh(THREE,parent,caliperGeometry(THREE,width,height,depth),caliperMat,
       [Math.sin(deg)*rr,Math.cos(deg)*rr,cz],[0,0,-deg]);
  caliper.scale.set(front?1:.88,front?1:.88,1);
}

/* 輪胎剖面：胎唇落在真實輪輞寬上，最大斷面寬依 ETRTO 隨 J 寬修正 */
function tireProfileGeometry(THREE,spec){
  const {rimR,rimW,sectionH,tireR}=spec;
  const bead=rimW/2, half=spec.section/2, tread=spec.section*.42, seat=rimR*1.008;
  const pts=[
    [seat,-bead],
    [rimR+sectionH*.20,-half*.86],
    [rimR+sectionH*.48,-half],          // 最大斷面寬
    [rimR+sectionH*.78,-half*.97],
    [tireR-sectionH*.06,-tread*1.04],   // 胎肩
    [tireR,-tread],
    [tireR,tread],
    [tireR-sectionH*.06,tread*1.04],
    [rimR+sectionH*.78,half*.97],
    [rimR+sectionH*.48,half],
    [rimR+sectionH*.20,half*.86],
    [seat,bead],
  ].map(([r,a])=>new THREE.Vector2(r,a));
  const geometry=new THREE.LatheGeometry(pts,64);
  geometry.rotateX(Math.PI/2);geometry.computeVertexNormals();
  return geometry;
}

function addTireDetails(THREE,parent,spec){
  const groove=mat(THREE,0x070909,{roughness:.98,metalness:0}),sidewall=mat(THREE,0x1a1d1c,{roughness:.92,metalness:0});
  const tread=spec.section*.42;
  [-.62,-.21,.21,.62].forEach(o=>{
    const ring=new THREE.Mesh(new THREE.TorusGeometry(spec.tireR+.0012,.0022,6,72),groove);
    ring.position.z=o*tread;parent.add(ring);
  });
  [-1,1].forEach(s=>{
    const shoulder=new THREE.Mesh(new THREE.TorusGeometry(spec.rimR+spec.sectionH*.48,.0022,6,64),sidewall);
    shoulder.position.z=s*spec.section/2;parent.add(shoulder);
    const bead=new THREE.Mesh(new THREE.TorusGeometry(spec.rimR*1.02,.0045,7,64),sidewall);
    bead.position.z=s*spec.rimW/2;parent.add(bead);
  });
}

/* --------------------------------------------------------------------------
   一顆完整輪組。group 原點 = 輪圈中心面（= hubFace − ET）
   -------------------------------------------------------------------------- */
function makeWheel(THREE, build, spec, side, front){
  const g=new THREE.Group(), preset=wheelPreset(build.wheel);
  const hub=CAR3D_HUB[build.platform==='dsm2g'?'dsm2g':'e36'];
  mesh(THREE,g,tireProfileGeometry(THREE,spec),mat(THREE,0x111312,{roughness:.88,metalness:0}));
  addTireDetails(THREE,g,spec);

  const fin=WHEEL_FINISHES.find(x=>x.id===build.finish)||WHEEL_FINISHES[0];
  const rimMat=new THREE.MeshStandardMaterial({color:fin.face,
    metalness:preset.cast?.52:preset.steel?.48:.64, roughness:preset.cast?.34:preset.steel?.40:.23});
  const lipMat=new THREE.MeshStandardMaterial({color:fin.lip||fin.face,metalness:.76,roughness:.16});

  addSuspensionModule(THREE,g,build,spec,side,front);
  addBrakeModule(THREE,g,build,spec,side,front);

  // 輪輞：寬度 = 真實 J 寬，不再是胎寬 × 0.70
  const barrelMat=rimMat.clone();barrelMat.color.offsetHSL(0,0,-.10);barrelMat.side=THREE.DoubleSide;
  mesh(THREE,g,new THREE.CylinderGeometry(spec.rimR*.945,spec.rimR*.945,spec.rimW*.96,64,1,true),
       barrelMat,[0,0,0],[Math.PI/2,0,0]);

  g.add(wheelFaceGroup(THREE,preset,spec,hub,rimMat,lipMat,
        CAR3D_WHEEL_FACE_READY.get(build.wheel)||null, side));

  // 內外輪唇
  const lipW=spec.rimR*(preset.lipScale||.042);
  const outer=new THREE.Mesh(new THREE.TorusGeometry(spec.rimR*.97,lipW,10,64),preset.cast?rimMat:lipMat);
  outer.position.z=side*spec.rimW/2; g.add(outer);
  const inner=new THREE.Mesh(new THREE.TorusGeometry(spec.rimR*.97,lipW*.72,8,48),rimMat);
  inner.position.z=-side*spec.rimW/2; g.add(inner);
  return g;
}

function addWheels(THREE, root, spec, build, tireR){
  const config=car3DBodyConfig(spec.id);
  if(config.wheelMode!=='replace') return;
  const datum=car3DDatum(spec.id);
  const platform=spec.eclipse?'dsm2g':'e36';
  const rearIsPlusX=(+config.frontX||0)<0;
  [{front:true,x:config.frontX},{front:false,x:config.rearX}].forEach(axle=>[-1,1].forEach(side=>{
    const {front,x}=axle;
    const wheelBuild={...build,platform,rearIsPlusX};
    const geo=wheelGeometrySpec(wheelBuild,datum,front);
    const baseTrack=geo.centreZ;                       // ← 不含墊片，墊片由 updateCar3DBuild 疊加
    const spacer=(+(front?build.trackF:build.trackR)||0)/2000;
    const camber=+(front?build.camberF:build.camberR)||0,toe=+(front?build.toeF:build.toeR)||0;
    const wheelY=geo.tireR+(front?0:(datum.yTrimR||0));
    const w=makeWheel(THREE,wheelBuild,geo,side,front);
    w.position.set(x,wheelY,side*(baseTrack+spacer));
    w.rotation.order='YXZ';
    w.rotation.x=side*THREE.MathUtils.degToRad(camber);
    w.rotation.y=side*THREE.MathUtils.degToRad(toe);
    Object.assign(w.userData,{carWheel:true,front,side,baseTrack,baseY:wheelY,
      partId:`wheel-${front?'F':'R'}${side<0?'L':'R'}`});
    root.add(w);
  }));
}

function addWheelArches(THREE, body, spec, build, paint, tireR){
  const liner=mat(THREE,0x111514,{metalness:.08,roughness:.76}),wide=!!build.wide;
  const radius=tireR+(wide?.09:.062),tube=wide?.048:.026;
  [-spec.wheelbase/2,spec.wheelbase/2].forEach(x=>[-1,1].forEach(side=>{
    mesh(THREE,body,new THREE.TorusGeometry(radius-.014,.036,8,44,Math.PI),liner,[x,tireR,side*(spec.width/2+.027)]);
    mesh(THREE,body,new THREE.TorusGeometry(radius,tube,10,48,Math.PI),paint,[x,tireR,side*(spec.width/2+(wide?.068:.047))]);
  }));
}

function addLightingParts(THREE, body, spec){
  const front=-spec.length/2-.066,rear=spec.length/2+.052;
  const head=mat(THREE,0xd8eef2,{metalness:.18,roughness:.09,emissive:0xbfd7d5,emissiveIntensity:.30,transparent:true,opacity:.94});
  const reflector=mat(THREE,0xe7ece8,{metalness:.82,roughness:.12});
  const tail=mat(THREE,0xb41420,{metalness:.1,roughness:.18,emissive:0x6c0610,emissiveIntensity:.42});
  const turn=mat(THREE,0xe88721,{emissive:0x7b3504,emissiveIntensity:.25});
  const dark=mat(THREE,0x111615,{metalness:.58,roughness:.30});
  if(spec.eclipse){
    [-1,1].forEach(side=>{
      const z=side*spec.width*.29;
      const lens=ellipsoid(THREE,body,head,[.038,.17,.53],[front,.64,z],[side*.16,0,0]);
      lens.castShadow=false;
      ellipsoid(THREE,body,reflector,[.044,.10,.22],[front+.006,.64,z-side*.07],[0,0,0],24).castShadow=false;
      ellipsoid(THREE,body,tail,[.038,.16,.39],[rear,.62,side*spec.width*.32],[side*.06,0,0]).castShadow=false;
      ellipsoid(THREE,body,dark,[.04,.16,.27],[front-.006,.45,side*spec.width*.36]).castShadow=false;
      ellipsoid(THREE,body,turn,[.043,.09,.13],[front-.010,.45,side*spec.width*.37]).castShadow=false;
    });
    ellipsoid(THREE,body,dark,[.045,.19,.78],[front-.008,.44,0]).castShadow=false;
    mesh(THREE,body,new THREE.BoxGeometry(.028,.13,spec.width*.68),dark,[rear+.002,.62,0],[],false);
    const emblem=mat(THREE,0xd71924,{metalness:.34,roughness:.20,emissive:0x4f0308,emissiveIntensity:.15});
    [[0,.575,0], [0,.625,-.035], [0,.625,.035]].forEach(([,y,z])=>
      mesh(THREE,body,new THREE.BoxGeometry(.022,.055,.055),emblem,[front-.025,y,z],[Math.PI/4,0,0],false));
  }else{
    [-1,1].forEach(side=>{
      const z=side*spec.width*.29;
      mesh(THREE,body,new THREE.BoxGeometry(.024,.205,.455),dark,[front+.008,.64,z],[],false);
      mesh(THREE,body,new THREE.BoxGeometry(.026,.18,.43),head,[front,.64,z],[],false);
      [-.105,.105].forEach(offset=>{
        const ring=mesh(THREE,body,new THREE.TorusGeometry(.055,.010,10,32),reflector,[front-.017,.64,z+side*offset],[0,Math.PI/2,0],false);
        ring.scale.y=.92;
        ellipsoid(THREE,body,dark,[.020,.075,.075],[front-.021,.64,z+side*offset],[],20).castShadow=false;
      });
      mesh(THREE,body,new THREE.BoxGeometry(.028,.17,.34),tail,[rear,.65,side*spec.width*.32],[],false);
      mesh(THREE,body,new THREE.BoxGeometry(.030,.17,.10),turn,[rear+.003,.65,side*spec.width*.245],[],false);
      mesh(THREE,body,new THREE.BoxGeometry(.029,.07,.10),turn,[front-.003,.54,side*spec.width*.48],[],false);
    });
    [-.09,.09].forEach(z=>{
      const kidney=mesh(THREE,body,new THREE.TorusGeometry(.073,.014,10,32),dark,[front-.017,.55,z],[0,Math.PI/2,0],false);
      kidney.scale.y=1.30;kidney.scale.x=.72;
    });
    ellipsoid(THREE,body,dark,[.035,.13,.80],[front-.009,.40,0]).castShadow=false;
  }
  mesh(THREE,body,new THREE.BoxGeometry(.025,.115,.38),dark,[rear+.011,.43,0],[],false);
}

function addMirrors(THREE, body, spec, paint){
  [-1,1].forEach(side=>{
    const mirror=ellipsoid(THREE,body,paint,[.23,.12,.16],[-.63,1.01,side*(spec.width/2+.105)],[0,side*.08,side*.05],24);
    mirror.castShadow=true;
    mesh(THREE,body,new THREE.BoxGeometry(.12,.035,.09),paint,[-.56,.98,side*(spec.width/2+.035)]);
  });
}

function airfoilGeometry(THREE, length, width, thickness){
  const s=new THREE.Shape();
  s.moveTo(-length/2,0);s.quadraticCurveTo(-length*.05,thickness*.62,length/2,thickness*.18);
  s.quadraticCurveTo(length*.12,-thickness*.42,-length/2,0);
  const g=new THREE.ExtrudeGeometry(s,{depth:width,bevelEnabled:true,bevelSegments:2,bevelSize:.012,bevelThickness:.012,curveSegments:16});
  g.translate(0,0,-width/2);return g;
}

function addAero(THREE, body, spec, build, paint){
  const dark=mat(THREE,0x171c1d,{metalness:.38,roughness:.38});
  const front=-spec.length/2,rear=spec.length/2,w=spec.width;
  if(build.lip) mesh(THREE,body,airfoilGeometry(THREE,.40,w*.92,.075),dark,[front+.10,.255,0],[0,0,-.08]);
  if(build.skirt) [-1,1].forEach(side=>mesh(THREE,body,new THREE.BoxGeometry(spec.wheelbase-.62,.065,.10),dark,[0,.265,side*(w/2+.015)]));
  if(build.diffuser){
    mesh(THREE,body,new THREE.BoxGeometry(.50,.09,w*.72),dark,[rear-.20,.27,0],[0,0,.10]);
    [-.45,-.15,.15,.45].forEach(z=>mesh(THREE,body,new THREE.BoxGeometry(.34,.16,.025),dark,[rear-.14,.22,z],[0,0,.12]));
  }
  if(build.hood) [-.58,-.40,-.22].forEach(x=>[-.22,.22].forEach(z=>
    mesh(THREE,body,airfoilGeometry(THREE,.24,.07,.018),dark,[x,.92,z],[0,0,-.12],false)));
  if(build.wing==='duck'){
    mesh(THREE,body,airfoilGeometry(THREE,.56,w*.78,.075),paint,[rear-.31,.90,0],[0,0,-.14]);
  }
  if(build.wing==='gt'){
    [-.42,.42].forEach(z=>mesh(THREE,body,airfoilGeometry(THREE,.075,.07,.40),dark,[rear-.38,1.09,z],[0,0,Math.PI/2]));
    mesh(THREE,body,airfoilGeometry(THREE,.49,w*.92,.08),dark,[rear-.39,1.32,0],[0,0,-.06]);
    [-1,1].forEach(side=>mesh(THREE,body,new THREE.BoxGeometry(.20,.13,.025),dark,[rear-.39,1.32,side*w*.47],[0,0,-.06]));
  }
}

function addExhaust(THREE, root, spec, build){
  if(!build.tips||build.tips==='none') return;
  const n=build.tips==='quad'?4:build.tips==='dual'?2:1;
  const zs=n===1?[-.34]:n===2?[-.42,-.22]:[-.52,-.34,.34,.52];
  const metal=mat(THREE,0x929a9c,{metalness:.9,roughness:.18}),inner=mat(THREE,0x080a0a,{roughness:.9});
  zs.forEach(z=>{
    mesh(THREE,root,new THREE.CylinderGeometry(.055,.065,.30,24),metal,[spec.length/2+.08,.31,z],[0,0,Math.PI/2]);
    mesh(THREE,root,new THREE.CylinderGeometry(.038,.038,.306,20),inner,[spec.length/2+.085,.31,z],[0,0,Math.PI/2],false);
  });
}

/* 輪胎靜態半徑（公尺）。舊版夾在 .285–.39，但 UI 滑桿允許的外徑範圍是 448–882 mm，
   兩端都會被夾住 —— 那正是「輪心固定 300 mm、輪胎陷進地面」的來源。
   現在輪心高度直接等於這個值，所以只保留防呆用的寬鬆上下限。 */
/* --------------------------------------------------------------------------
   車身姿態：前後軸各自降低
   --------------------------------------------------------------------------
   舊版寫 `+build.dropF || +build.drop`，但 0 在 JS 是 falsy —— 把前軸設成 0 時
   會掉到 build.drop（前後平均值）去，所以「前 0 / 後 60」實際畫成「前 30 / 後 60」。
   任何一軸設 0 都會中招。這裡改成只有在欄位真的不存在時才回退。

   旋轉也重寫過：舊版繞模型原點（車身 bbox 中心）轉，但軸距中點並不在原點，
   會多出幾 mm 的垂直偏移。現在直接解出「前軸正好降 dropF、後軸正好降 dropR」
   的旋轉角與位移量，並改用 config 裡的實際軸位而不是規格軸距。
   -------------------------------------------------------------------------- */
function axleDrop(build, key){
  const v=+build?.[key];
  if(Number.isFinite(v)) return Math.max(0,v);
  const d=+build?.drop;
  return Number.isFinite(d)?Math.max(0,d):0;
}
function bodyStance(spec, build){
  const cfg=car3DBodyConfig(spec.id);
  const dF=axleDrop(build,'dropF')/1000, dR=axleDrop(build,'dropR')/1000;
  const xF=+cfg.frontX, xR=+cfg.rearX;
  const ok=Number.isFinite(xF)&&Number.isFinite(xR)&&Math.abs(xR-xF)>.5;
  const front=ok?xF:-Math.max(1,spec.wheelbase)/2;
  const wb=ok?(xR-xF):Math.max(1,spec.wheelbase);
  const tilt=(dF-dR)/wb;              // 繞 Z：Δy = x·tilt，車頭在 −X 所以前降時 tilt 為正
  return {tilt, dy:-dF-front*tilt};   // dy 補正旋轉造成的偏移，讓兩軸各自落在指定高度
}

function car3DTireRadius(build){
  const od=(+build.size||17)*25.4+2*((+build.tireW||225)*(+build.tireAR||45)/100);
  return Math.max(.20,Math.min(.46,od/2000));
}
/* 車身升降量：換胎徑時整車一起升降，輪拱間隙才會依實際物理變化 */
function car3DRideOffset(bodyId, build){
  return car3DTireRadius(build) - car3DDatum(bodyId).refTireR;
}

function referenceShellKnots(spec){
  const front=-spec.length/2,rear=spec.length/2,scale=spec.width/(spec.eclipse?1.745:1.710);
  if(spec.eclipse) return [
    [front,.45,.63*scale],[front+.16,.55,.76*scale],[front+.43,.66,.84*scale],[-1.48,.73,.872*scale],
    [-.92,.81,.86*scale],[.86,.82,.86*scale],[1.43,.78,.872*scale],[rear-.30,.66,.82*scale],[rear,.48,.70*scale],
  ];
  return [
    [front,.49,.71*scale],[front+.14,.60,.80*scale],[front+.34,.70,.845*scale],[-1.52,.77,.855*scale],
    [-.88,.85,.84*scale],[.92,.86,.84*scale],[1.43,.82,.855*scale],[rear-.23,.70,.81*scale],[rear,.52,.73*scale],
  ];
}

function referenceCabinKnots(spec){
  const h=spec.height,scale=spec.width/(spec.eclipse?1.745:1.710);
  if(spec.open) return null;
  if(spec.eclipse) return [
    [-.88,.815,.86,.66*scale],[-.60,.82,1.10,.64*scale],[-.28,.82,h-.015,.61*scale],
    [.18,.82,h+.012,.60*scale],[.48,.82,h-.015,.61*scale],[.86,.82,1.16,.66*scale],[1.27,.815,.85,.72*scale],
  ];
  if(spec.id==='touring') return [
    [-.84,.84,.88,.65*scale],[-.53,.84,1.15,.62*scale],[-.24,.84,h,.59*scale],[.90,.84,h-.01,.60*scale],[1.45,.84,1.06,.68*scale],
  ];
  if(spec.id==='compact') return [
    [-.77,.83,.87,.64*scale],[-.48,.83,1.14,.61*scale],[-.20,.83,h,.59*scale],[.44,.83,h-.01,.59*scale],[1.16,.83,.91,.67*scale],
  ];
  return [
    [-.83,.845,.89,.64*scale],[-.57,.845,1.12,.62*scale],[-.29,.845,h-.012,.59*scale],
    [.08,.845,h+.008,.585*scale],[.40,.845,h-.018,.59*scale],[.76,.845,1.18,.62*scale],[1.16,.845,.89,.67*scale],
  ];
}

function smoothSections(THREE, knots, count, cabin=false){
  if(cabin){
    const topCurve=new THREE.CatmullRomCurve3(knots.map(k=>new THREE.Vector3(k[0],k[2],k[3])),false,'centripetal');
    const bottomCurve=new THREE.CatmullRomCurve3(knots.map(k=>new THREE.Vector3(k[0],k[1],k[3])),false,'centripetal');
    const top=topCurve.getPoints(count),bottom=bottomCurve.getPoints(count);
    return top.map((p,i)=>({x:p.x,bottom:bottom[i].y,top:p.y,halfWidth:p.z}));
  }
  const curve=new THREE.CatmullRomCurve3(knots.map(k=>new THREE.Vector3(k[0],k[1],k[2])),false,'centripetal');
  return curve.getPoints(count).map(p=>({x:p.x,bottom:.265,top:p.y,halfWidth:p.z}));
}

function shellGeometry(THREE, sections, options={}){
  const across=options.across||24,vertices=[],indices=[];
  sections.forEach(section=>{
    for(let j=0;j<=across;j++){
      const u=j/across*2-1,angle=u*Math.PI/2,c=Math.max(0,Math.cos(angle));
      const shoulder=Math.pow(c,options.shoulderPower||.68);
      const z=Math.sin(angle)*section.halfWidth;
      const y=section.bottom+(section.top-section.bottom)*shoulder;
      vertices.push(section.x,y,z);
    }
  });
  for(let i=0;i<sections.length-1;i++) for(let j=0;j<across;j++){
    const a=i*(across+1)+j,b=(i+1)*(across+1)+j,c=a+1,d=b+1;
    let omit=false;
    if(options.arches){
      const x=(sections[i].x+sections[i+1].x)/2,u=(j+.5)/across*2-1;
      const y=(vertices[a*3+1]+vertices[b*3+1]+vertices[c*3+1]+vertices[d*3+1])/4;
      options.arches.forEach(({x:ax,r,cy})=>{
        const dx=x-ax;
        if(Math.abs(u)>.69&&Math.abs(dx)<r){
          const archY=cy+Math.sqrt(Math.max(0,r*r-dx*dx));
          if(y<archY+.018) omit=true;
        }
      });
    }
    if(!omit) indices.push(a,c,b,b,c,d);
  }
  const cap=(sectionIndex,reverse)=>{
    const section=sections[sectionIndex],start=sectionIndex*(across+1),center=vertices.length/3;
    vertices.push(section.x,(section.bottom+section.top)*.5,0);
    for(let j=0;j<across;j++) indices.push(...(reverse?[center,start+j,start+j+1]:[center,start+j+1,start+j]));
    indices.push(...(reverse?[center,start+across,start]:[center,start,start+across]));
  };
  cap(0,true);cap(sections.length-1,false);
  const g=new THREE.BufferGeometry();
  g.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));g.setIndex(indices);g.computeVertexNormals();
  return g;
}

function buildProceduralCarModel(THREE, spec, build){
  const root=new THREE.Group(), body=new THREE.Group(), tireR=car3DTireRadius(build);
  const paintDef=car3DPaint(spec,build), paint=physicalPaint(THREE,paintDef.hex);
  const archR=tireR+(build.wide?.10:.075),arches=[-spec.wheelbase/2,spec.wheelbase/2].map(x=>({x,r:archR,cy:tireR}));
  const bodySections=smoothSections(THREE,referenceShellKnots(spec),54);
  mesh(THREE,body,shellGeometry(THREE,bodySections,{across:28,shoulderPower:.58,arches}),paint);
  const cabinKnots=referenceCabinKnots(spec),cabinWidth=spec.open?spec.width*.70:spec.width*.76;
  if(cabinKnots){
    const cabinSections=smoothSections(THREE,cabinKnots,34,true);
    mesh(THREE,body,shellGeometry(THREE,cabinSections,{across:24,shoulderPower:.72}),paint);
  }
  const dark=mat(THREE,0x15191a,{metalness:.22,roughness:.55});
  mesh(THREE,body,new THREE.BoxGeometry(spec.length*.61,.085,spec.width*.76),dark,[.02,.29,0]);
  addWindows(THREE,body,spec,build,cabinWidth);addPanelLines(THREE,body,spec);addBodyTrim(THREE,body,spec,paint);
  addWheelArches(THREE,body,spec,build,paint,tireR);addLightingParts(THREE,body,spec);
  addMirrors(THREE,body,spec,paint);addAero(THREE,body,spec,build,paint);
  const stance=bodyStance(spec,build);
  body.position.y=stance.dy;body.rotation.z=stance.tilt;
  Object.assign(body.userData,{vehicleBody:true,baseY:0});root.add(body);
  addWheels(THREE,root,spec,build,tireR);addExhaust(THREE,root,spec,build);
  root.rotation.y=0;
  return root;
}

function loadCar3DSource(GLTFLoader, MeshoptDecoder, spec){
  const key=spec.id;
  if(!CAR3D_MODEL_CACHE.has(key)){
    CAR3D_MODEL_CACHE.set(key,new Promise((resolve,reject)=>{
      const loader=new GLTFLoader();if(MeshoptDecoder) loader.setMeshoptDecoder(MeshoptDecoder);
      loader.load(CAR3D_MODEL_URLS[key],gltf=>resolve(gltf.scene),undefined,reject);
    }));
  }
  return CAR3D_MODEL_CACHE.get(key);
}

function cloneCar3DSource(source){
  const clone=source.clone(true);
  clone.traverse(o=>{
    if(!o.isMesh) return;
    o.geometry=o.geometry.clone();
    if(o.material) o.material=Array.isArray(o.material)?o.material.map(m=>m.clone()):o.material.clone();
  });
  return clone;
}

function removeImportedGround(THREE,model){
  model.updateMatrixWorld(true);
  const sceneBox=importedCarBox(THREE,model),size=sceneBox.getSize(new THREE.Vector3()),cutY=sceneBox.min.y+size.y*.18;
  const a=new THREE.Vector3(),b=new THREE.Vector3(),c=new THREE.Vector3();
  model.traverse(o=>{
    if(!o.isMesh||!o.geometry?.attributes?.position)return;
    const g=o.geometry,pos=g.attributes.position,source=g.index?Array.from(g.index.array):Array.from({length:pos.count},(_,i)=>i),kept=[];
    for(let i=0;i<source.length;i+=3){
      const ai=source[i],bi=source[i+1],ci=source[i+2];
      a.fromBufferAttribute(pos,ai).applyMatrix4(o.matrixWorld);b.fromBufferAttribute(pos,bi).applyMatrix4(o.matrixWorld);c.fromBufferAttribute(pos,ci).applyMatrix4(o.matrixWorld);
      const low=(a.y+b.y+c.y)/3<cutY;
      if(!low)kept.push(ai,bi,ci);
    }
    if(kept.length!==source.length){g.setIndex(kept);g.computeBoundingBox();g.computeBoundingSphere();g.computeVertexNormals();}
  });
}

function importedCarBox(THREE,model){
  const box=new THREE.Box3(),partBox=new THREE.Box3();let found=false;
  model.updateMatrixWorld(true);
  model.traverse(o=>{
    if(!o.isMesh||!o.visible)return;
    partBox.setFromObject(o);if(partBox.isEmpty())return;
    box.union(partBox);found=true;
  });
  return found?box:new THREE.Box3().setFromObject(model);
}

function rotateImportedWorldY(THREE,model,angle){
  model.quaternion.premultiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0),angle));
  model.updateMatrixWorld(true);
}

function normalizeImportedCar(THREE, model, spec){
  const config=car3DBodyConfig(spec.id);
  if(config.flipX){
    model.quaternion.premultiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1,0,0),Math.PI));
    model.updateMatrixWorld(true);
  }
  model.updateMatrixWorld(true);
  let box=importedCarBox(THREE,model),size=box.getSize(new THREE.Vector3());
  if(size.z>size.x){model.rotation.y=-Math.PI/2;model.updateMatrixWorld(true);box=importedCarBox(THREE,model);size=box.getSize(size);}
  const frontNode=model.getObjectByName(spec.eclipse?'eclipse_bumper_F':'heads');
  if(frontNode){
    const carCenter=box.getCenter(new THREE.Vector3()),frontCenter=new THREE.Box3().setFromObject(frontNode).getCenter(new THREE.Vector3());
    if(frontCenter.x>carCenter.x){rotateImportedWorldY(THREE,model,Math.PI);box=importedCarBox(THREE,model);size=box.getSize(size);}
  }
  const scale=spec.length/Math.max(.01,size.x);model.scale.multiplyScalar(scale);model.updateMatrixWorld(true);
  box=importedCarBox(THREE,model);
  const center=box.getCenter(new THREE.Vector3());
  model.position.x-=center.x;model.position.z-=center.z;model.updateMatrixWorld(true);
  if(CAR3D_REVERSED_BODIES.has(spec.id))rotateImportedWorldY(THREE,model,Math.PI);
  const floorNode=spec.eclipse?model.getObjectByName('eclipse_body-material'):null;
  const floorBox=floorNode?new THREE.Box3().setFromObject(floorNode):importedCarBox(THREE,model);
  model.position.y-=floorBox.min.y;
  model.position.y+=config.yOffset||0;
  model.updateMatrixWorld(true);
}

function isImportedPaintName(name){
  return /car[\s_.-]*paint|bmwe36_(paint|leibi)/.test(name)||name.includes('carpaint_flakes_blue')||name==='eclipse_body';
}

function relaxImportedSurface(THREE,geometry,iterations=2){
  const positions=geometry.attributes?.position,index=geometry.index;
  if(!positions||!index||positions.count>180000)return;
  const neighbors=Array.from({length:positions.count},()=>new Set()),edgeCounts=new Map();
  const addEdge=(a,b)=>{
    neighbors[a].add(b);neighbors[b].add(a);
    const key=a<b?`${a},${b}`:`${b},${a}`;edgeCounts.set(key,(edgeCounts.get(key)||0)+1);
  };
  for(let i=0;i<index.count;i+=3){
    const a=index.getX(i),b=index.getX(i+1),c=index.getX(i+2);addEdge(a,b);addEdge(b,c);addEdge(c,a);
  }
  const boundary=new Set();edgeCounts.forEach((count,key)=>{
    if(count!==1)return;const [a,b]=key.split(',').map(Number);boundary.add(a);boundary.add(b);
  });
  geometry.computeBoundingBox();
  const limit=geometry.boundingBox.getSize(new THREE.Vector3()).length()*.002,cosine=Math.cos(THREE.MathUtils.degToRad(42));
  for(let pass=0;pass<iterations;pass++){
    geometry.computeVertexNormals();
    const normals=geometry.attributes.normal,source=Float32Array.from(positions.array),next=Float32Array.from(source);
    for(let i=0;i<positions.count;i++){
      if(boundary.has(i)||neighbors[i].size<3)continue;
      const ix=i*3,nx=normals.getX(i),ny=normals.getY(i),nz=normals.getZ(i);let sx=0,sy=0,sz=0,count=0;
      neighbors[i].forEach(j=>{
        if(nx*normals.getX(j)+ny*normals.getY(j)+nz*normals.getZ(j)<cosine)return;
        const jx=j*3;sx+=source[jx];sy+=source[jx+1];sz+=source[jx+2];count++;
      });
      if(count<3)continue;
      const normalDelta=((sx/count-source[ix])*nx+(sy/count-source[ix+1])*ny+(sz/count-source[ix+2])*nz)*.48;
      const move=Math.max(-limit,Math.min(limit,normalDelta));
      next[ix]+=nx*move;next[ix+1]+=ny*move;next[ix+2]+=nz*move;
    }
    positions.array.set(next);positions.needsUpdate=true;
  }
  geometry.computeBoundingBox();geometry.computeBoundingSphere();
}

function smoothImportedPaintNormals(THREE,model,spec){
  const config=car3DBodyConfig(spec.id);if(!config.smoothPaintNormals)return;
  const cosine=Math.cos(THREE.MathUtils.degToRad(48));
  model.traverse(o=>{
    if(!o.isMesh||!o.geometry?.attributes?.position)return;
    const materials=Array.isArray(o.material)?o.material:[o.material];
    if(!materials.some(m=>isImportedPaintName((m?.name||'').toLowerCase())))return;
    const geometry=o.geometry,positions=geometry.attributes.position;
    if(config.relaxPaintSurface)relaxImportedSurface(THREE,geometry,config.relaxPaintSurface===true?2:config.relaxPaintSurface);
    geometry.deleteAttribute('normal');geometry.computeVertexNormals();
    const normals=geometry.attributes.normal,source=Float32Array.from(normals.array);
    geometry.computeBoundingBox();
    const diagonal=geometry.boundingBox.getSize(new THREE.Vector3()).length();
    const tolerance=Math.max(1e-6,diagonal*1e-5),groups=new Map();
    for(let i=0;i<positions.count;i++){
      const key=`${Math.round(positions.getX(i)/tolerance)},${Math.round(positions.getY(i)/tolerance)},${Math.round(positions.getZ(i)/tolerance)}`;
      const group=groups.get(key);if(group)group.push(i);else groups.set(key,[i]);
    }
    groups.forEach(group=>{
      if(group.length<2)return;
      group.forEach(i=>{
        const ix=i*3,nx=source[ix],ny=source[ix+1],nz=source[ix+2];let sx=0,sy=0,sz=0;
        group.forEach(j=>{
          const jx=j*3,jxv=source[jx],jyv=source[jx+1],jzv=source[jx+2];
          if(nx*jxv+ny*jyv+nz*jzv>=cosine){sx+=jxv;sy+=jyv;sz+=jzv;}
        });
        const length=Math.hypot(sx,sy,sz)||1;normals.setXYZ(i,sx/length,sy/length,sz/length);
      });
    });
    normals.needsUpdate=true;
  });
}

function makeImportedMaterialOpaque(material){
  material.transparent=false;material.opacity=1;material.depthWrite=true;material.alphaTest=0;
  if('transmission' in material)material.transmission=0;
  if('thickness' in material)material.thickness=0;
}

function importedPartPath(object,depth=5){
  const names=[];let current=object;
  while(current&&depth-->0){names.push((current.name||'').toLowerCase());current=current.parent;}
  return names.join('/');
}

function styleImportedCar(THREE, model, spec, build){
  const eclipseLegacy=spec.eclipse&&!car3DBodyConfig(spec.id).genericMaterials;
  const config=car3DBodyConfig(spec.id),paintDef=car3DPaint(spec,build);
  const paint=physicalPaint(THREE,paintDef.hex,{roughness:config.paintRoughness});
  const fin=WHEEL_FINISHES.find(x=>x.id===build.finish)||WHEEL_FINISHES[0];
  model.traverse(o=>{
    if(!o.isMesh) return;
    const partPath=importedPartPath(o);
    const paintSideSkirt=eclipseLegacy&&o.name==='eclipse_black-material'&&o.parent?.name.startsWith('eclipse_sideskirts');
    const eclipseWindow=eclipseLegacy&&/(windshield|doorglass|backlight|sideglass)/.test(partPath);
    const eclipseHeadlight=eclipseLegacy&&/eclipse_headlight_[lr]/.test(partPath);
    const eclipseFrontLamp=eclipseLegacy&&/eclipse_bumper_f/.test(partPath);
    const eclipseTail=eclipseLegacy&&/(trunklight|trunklightframe)/.test(partPath);
    const eclipseInterior=eclipseLegacy&&/(dash|seat|steer)/.test(partPath);
    const eclipseExhaust=eclipseLegacy&&/exhaust/.test(partPath);
    const eclipseEngine=eclipseLegacy&&/(engine|radiator)/.test(partPath);
    const eclipseSpoilerLamp=eclipseLegacy&&/eclipse_spoiler\//.test(partPath);
    o.castShadow=true;o.receiveShadow=true;
    const wasArray=Array.isArray(o.material),materials=wasArray?o.material:[o.material];
    const styled=materials.map(m=>{
      const name=(m.name||'').toLowerCase();
      if(paintSideSkirt){const p=paint.clone();p.name=m.name;return p;}
      if(isImportedPaintName(name)
        ||spec.id==='cabrio'&&name.includes('bmwe36_signal_l')){
        const p=paint.clone();p.name=m.name;return p;
      }
      if(spec.id==='sedan'&&name==='material_0'){
        const r=m.clone();r.color.set(0xffffff);return r;
      }
      if(name.includes('carpaint_flakes_silver')||name.includes('eclipse95_wheel')){
        const r=m.clone();r.color.set(fin.face);r.metalness=.82;r.roughness=.18;return r;
      }
      const r=m.clone();
      const genericLamp=/(red|orange|clear).?glass|lamp|light.?lens/.test(name);
      const eclipseHeadLens=eclipseHeadlight&&/(glass|steklofar)/.test(name);
      const eclipseFrontLens=eclipseFrontLamp&&/(vehiclelights|steklofar|eclipse_(fl|fr))/.test(name);
      const eclipseTailLens=eclipseTail&&/(steklofar|lightzad|red|vehiclelights|eclipse_(fl|fr))/.test(name);
      const eclipseBrakeLens=eclipseSpoilerLamp&&name.includes('vehiclelights');
      const lampGlass=eclipseHeadLens||eclipseFrontLens||eclipseTailLens||eclipseBrakeLens||(!eclipseLegacy&&genericLamp);
      const windowGlass=eclipseWindow||(!eclipseLegacy&&(name.includes('window')||name.includes('windscreen')
        ||name.includes('windshield')||name.includes('windshild')||(name.includes('glass')&&!lampGlass)));
      if(config.repairMaterials&&!windowGlass&&!lampGlass)makeImportedMaterialOpaque(r);
      if(windowGlass){
        const tint=Math.max(0,Math.min(90,+build.tint||0));
        r.map=null;r.alphaMap=null;r.color.set(tint>55?0x111617:tint>20?0x384447:0x9eaaab);r.transparent=true;
        r.opacity=Math.min(.70,.22+tint*.0053);r.depthWrite=false;r.metalness=0;r.roughness=.055;r.side=THREE.DoubleSide;
        if('transmission' in r)r.transmission=0;if('thickness' in r)r.thickness=.003;
      }
      if(lampGlass){
        r.map=null;r.alphaMap=null;r.transparent=true;r.depthWrite=false;r.metalness=.03;r.roughness=.075;r.side=THREE.DoubleSide;
        if(eclipseHeadLens){r.color.set(0xd9e0de);r.opacity=.34;}
        else if(eclipseFrontLens){r.color.set(0xe7c782);r.opacity=.68;if(r.emissive){r.emissive.set(0x4e2704);r.emissiveIntensity=.16;}}
        else if(eclipseTailLens||eclipseBrakeLens){r.color.set(0xa30c18);r.opacity=.78;if(r.emissive){r.emissive.set(0x450208);r.emissiveIntensity=.22;}}
        else r.opacity=.72;
        if('transmission' in r)r.transmission=0;
      }
      if(eclipseHeadlight&&!eclipseHeadLens){
        makeImportedMaterialOpaque(r);r.color.set(name.includes('black')?0x1b1e1d:0xc8ceca);r.metalness=.72;r.roughness=.16;
        if(/vehiclelights|blizn/.test(name)&&r.emissive){r.emissive.set(0x8d7b54);r.emissiveIntensity=.12;}
      }
      if(eclipseInterior&&!name.includes('gauges')){
        makeImportedMaterialOpaque(r);r.color.set(/leather|seat|cloth|fabric/.test(name)?0x292b29:0x1c201f);r.metalness=0;r.roughness=.72;
      }else if(name.includes('interior')||name.includes('leather')||name.includes('cloth')||name.includes('fabric')||name.includes('carpet')){
        makeImportedMaterialOpaque(r);
        r.color.set(0x202321);r.metalness=0;r.roughness=.78;
      }
      if(eclipseExhaust){
        makeImportedMaterialOpaque(r);r.color.set(name.includes('black')?0x202423:0x7b8282);r.metalness=.84;r.roughness=.25;
      }
      if(eclipseEngine){
        makeImportedMaterialOpaque(r);r.color.set(name.includes('chrome')?0xaeb4b1:0x343a39);r.metalness=.64;r.roughness=.34;
      }
      if(/(^|[_. -])(tire|tyre)/.test(name)){
        makeImportedMaterialOpaque(r);r.color.set(0x111312);r.metalness=0;r.roughness=.88;
      }
      if(/brake.?disk|brake.?disc/.test(name)){
        makeImportedMaterialOpaque(r);r.color.set(0x697174);r.metalness=.76;r.roughness=.32;
      }
      if(name.includes('chrome')){
        makeImportedMaterialOpaque(r);r.metalness=.94;r.roughness=.12;
      }else if(name.includes('mattemetal')){
        makeImportedMaterialOpaque(r);r.metalness=.72;r.roughness=.34;
      }
      return r;
    });
    o.material=wasArray?styled:styled[0];
  });
  return paint;
}

function setImportedVisibility(model, spec, build){
  const eclipseLegacy=spec.eclipse&&!car3DBodyConfig(spec.id).genericMaterials;
  const set=(name,visible)=>{const x=model.getObjectByName(name);if(x)x.visible=visible;};
  const hideDirectChild=(parentName,childName)=>{
    const parent=model.getObjectByName(parentName);
    parent?.children.filter(x=>x.name===childName).forEach(x=>x.visible=false);
  };
  if(eclipseLegacy){
    set('wheel',false);set('eclipse_exhaust',build.tips!=='none');set('eclipse_exhaust_fartcan',false);
    hideDirectChild('eclipse_body','eclipse_underbody-material');
    hideDirectChild('eclipse_body','eclipse_Juiced_nosskirt-material');
    hideDirectChild('eclipse_body','eclipse_black-material');
    set('eclipse_tubs',true);
    const kit=build.aeroKit==='duraflex-b2';
    set('eclipse_bumper_F',!kit);set('eclipse_bumper_R',!kit);
    set('eclipse_bumperkit_F',kit);set('eclipse_bumperkit_R',kit);
    set('eclipse_sideskirts',!kit);set('eclipse_sideskirts_kit',kit);
    set('eclipse_spoiler',build.aeroKit==='gsx-oem');set('eclipse_spoiler_2',false);
  }else{
    const config=car3DBodyConfig(spec.id);
    (config.hideNodes||[]).forEach(name=>set(name,false));
    if(config.wheelMode!=='replace') return;
    model.traverse(o=>{
      const name=(o.name||'').toLowerCase(),mats=o.material?(Array.isArray(o.material)?o.material:[o.material]):[];
      const namedWheel=/^(fl|fr|rl|rr)_(tire|rim)$/.test(name)||/^rim(\.\d+)?$|^tire(\.\d+)?$/.test(name);
      const wheelMaterialIndexes=mats.reduce((indexes,m,i)=>{
        if(/(^|[^a-z])(tire|tyre|rim|wheel|brake.?disk|brake.?disc)([^a-z]|$)/.test((m.name||'').toLowerCase())) indexes.push(i);
        return indexes;
      },[]);
      if(namedWheel||(mats.length===1&&wheelMaterialIndexes.length)) o.visible=false;
      else if(wheelMaterialIndexes.length&&o.geometry?.groups?.length){
        const hidden=new Set(wheelMaterialIndexes);
        o.geometry.groups=o.geometry.groups.filter(group=>!hidden.has(group.materialIndex));
      }
    });
  }
}

async function buildImportedCarModel(THREE, GLTFLoader, MeshoptDecoder, spec, build){
  const source=await loadCar3DSource(GLTFLoader,MeshoptDecoder,spec),model=cloneCar3DSource(source),root=new THREE.Group();
  root.userData.viewDirection=car3DBodyConfig(spec.id).viewDirection;
  normalizeImportedCar(THREE,model,spec);
  smoothImportedPaintNormals(THREE,model,spec);
  const paint=styleImportedCar(THREE,model,spec,build);setImportedVisibility(model,spec,build);
  const wheelBuild={...build,tireW:Math.min(+build.tireW||225,spec.eclipse?265:285)};
  const stance=bodyStance(spec,wheelBuild);
  const baseY=model.position.y;
  model.position.y=baseY+car3DRideOffset(spec.id,wheelBuild)+stance.dy;
  model.rotation.z=stance.tilt;
  Object.assign(model.userData,{vehicleBody:true,baseY,ride:true});root.add(model);
  // 有註冊外部輪輻面素材時先載入；沒註冊會立刻 resolve(null)，不影響啟動速度
  await ensureWheelFace(THREE,GLTFLoader,MeshoptDecoder,wheelBuild.wheel).catch(()=>null);
  addWheels(THREE,root,spec,wheelBuild,car3DTireRadius(wheelBuild));
  return root;
}

function framedCar3DView(THREE, car, aspect=2){
  const box=new THREE.Box3().setFromObject(car),size=box.getSize(new THREE.Vector3()),center=box.getCenter(new THREE.Vector3());
  const target=new THREE.Vector3(center.x,box.min.y+size.y*.46,center.z);
  const vfov=THREE.MathUtils.degToRad(31),hfov=2*Math.atan(Math.tan(vfov/2)*Math.max(.75,aspect));
  const projectedWidth=size.x*.70+size.z*.72;
  const distance=Math.max(size.y/(2*Math.tan(vfov/2)),projectedWidth/(2*Math.tan(hfov/2)))*1.22;
  const dir=new THREE.Vector3(...(car.userData.viewDirection||[-.68,.28,.68])).normalize();
  return {target:target.toArray(),offset:dir.multiplyScalar(Math.max(5.30,distance)).toArray()};
}

function applyCar3DView(instance, view){
  instance.camera.position.fromArray(view.target).add(new instance.THREE.Vector3().fromArray(view.offset));
  if(instance.controls){
    instance.controls.target.fromArray(view.target);instance.controls.update();
  }else instance.camera.lookAt(...view.target);
}

async function createScene(root, config, THREE, OrbitControls, GLTFLoader, MeshoptDecoder){
  const spec=bodySpec(config.bodyId, config.modelId), dark=document.documentElement.dataset.theme==='dark';
  const scene=new THREE.Scene();scene.background=new THREE.Color(dark?0x101511:0xdfe4de);scene.fog=new THREE.Fog(scene.background,8,16);
  const camera=new THREE.PerspectiveCamera(31,1,.1,50);
  camera.position.set(-4.2,1.9,4.2);
  const renderer=new THREE.WebGLRenderer({antialias:true,alpha:false,preserveDrawingBuffer:true,powerPreference:'high-performance'});
  renderer.setPixelRatio(Math.min(2,devicePixelRatio||1));renderer.shadowMap.enabled=true;
  renderer.shadowMap.type=THREE.PCFShadowMap;renderer.outputColorSpace=THREE.SRGBColorSpace;
  renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.08;
  renderer.domElement.setAttribute('aria-hidden','true');root.prepend(renderer.domElement);

  scene.add(new THREE.HemisphereLight(dark?0xb7d6dd:0xe8f3ef,dark?0x172018:0x6d756d,2.2));
  const key=new THREE.DirectionalLight(0xffffff,4.0);key.position.set(-4.5,7,5);key.castShadow=true;
  key.shadow.mapSize.set(1024,1024);key.shadow.camera.left=-6;key.shadow.camera.right=6;key.shadow.camera.top=5;key.shadow.camera.bottom=-2;scene.add(key);
  const rim=new THREE.DirectionalLight(dark?0x58dcea:0x8ecad5,2.0);rim.position.set(5,3,-5);scene.add(rim);
  const warm=new THREE.DirectionalLight(0xffb466,.7);warm.position.set(2,1.6,4);scene.add(warm);

  const floor=new THREE.Mesh(new THREE.PlaneGeometry(18,18),new THREE.ShadowMaterial({color:0x000000,opacity:dark?.36:.18}));
  floor.rotation.x=-Math.PI/2;floor.position.y=.005;floor.receiveShadow=true;scene.add(floor);
  const grid=new THREE.GridHelper(12,24,dark?0x287b86:0x6d9ca1,dark?0x263a37:0xa7b9b5);
  grid.material.transparent=true;grid.material.opacity=dark?.34:.42;scene.add(grid);
  const hasLicensedMesh=!!CAR3D_MODEL_URLS[spec.id];
  let car;
  const renderBuild={...config.build,modelId:config.modelId};
  try{car=hasLicensedMesh?await buildImportedCarModel(THREE,GLTFLoader,MeshoptDecoder,spec,renderBuild):buildProceduralCarModel(THREE,spec,renderBuild);}
  catch(err){console.warn('[car3d-model-fallback]',err);car=buildProceduralCarModel(THREE,spec,renderBuild);}
  if(!root.isConnected){
    car.traverse(o=>{o.geometry?.dispose?.();if(o.material)(Array.isArray(o.material)?o.material:[o.material]).forEach(m=>m.dispose?.());});
    renderer.dispose();renderer.forceContextLoss();return null;
  }
  scene.add(car);

  const initialRect=root.getBoundingClientRect();
  camera.aspect=initialRect.width>2&&initialRect.height>2?initialRect.width/initialRect.height:2;
  camera.updateProjectionMatrix();
  const initialView=CAR3D_VIEWS.get(spec.id)||framedCar3DView(THREE,car,camera.aspect);
  CAR3D_VIEWS.set(spec.id,initialView);

  let controls=null;
  if(config.interactive){
    controls=new OrbitControls(camera,renderer.domElement);
    controls.enableDamping=true;controls.dampingFactor=.075;controls.enablePan=false;
    const initialDistance=new THREE.Vector3().fromArray(initialView.offset).length();
    controls.minDistance=initialDistance*.72;controls.maxDistance=initialDistance*1.75;
    controls.minPolarAngle=.72;controls.maxPolarAngle=1.48;
  }

  const instance={root,scene,camera,renderer,controls,spec,car,THREE,dead:false,observer:null};CAR3D_INSTANCES.push(instance);
  applyCar3DView(instance,initialView);
  if(controls){
    controls.addEventListener('change',()=>syncCar3DView(instance));controls.update();
  }
  const resize=()=>{
    if(instance.dead||!root.isConnected) return;
    const r=root.getBoundingClientRect();if(r.width<2||r.height<2) return;
    renderer.setSize(r.width,r.height,false);camera.aspect=r.width/r.height;camera.updateProjectionMatrix();renderer.render(scene,camera);
  };
  instance.observer=new ResizeObserver(resize);instance.observer.observe(root);resize();
  if(controls){
    renderer.setAnimationLoop(()=>{if(instance.dead)return;controls.update();renderer.render(scene,camera);});
  }else renderer.render(scene,camera);
  root.classList.add('ready');
  return instance;
}

function syncCar3DView(source){
  if(CAR3D_SYNCING||!source.controls) return;
  const off=source.camera.position.clone().sub(source.controls.target);
  const view={offset:off.toArray(),target:source.controls.target.toArray()};
  CAR3D_VIEWS.set(source.spec.id,view);CAR3D_SYNCING=true;
  CAR3D_INSTANCES.forEach(x=>{
    if(x===source||x.dead||!x.controls||x.spec.id!==source.spec.id) return;
    x.controls.target.set(...view.target);x.camera.position.copy(x.controls.target).add(off);x.controls.update();
  });
  CAR3D_SYNCING=false;
}

function resetCar3D(event){
  event.preventDefault();event.stopPropagation();
  const source=CAR3D_INSTANCES.find(x=>x.root===event.currentTarget.closest('.car3d'));
  if(!source)return;
  const view=framedCar3DView(source.THREE,source.car,source.camera.aspect);CAR3D_VIEWS.set(source.spec.id,view);CAR3D_SYNCING=true;
  CAR3D_INSTANCES.forEach(x=>{
    if(x.dead||x.spec.id!==source.spec.id) return;
    applyCar3DView(x,view);
  });
  CAR3D_SYNCING=false;
}

function updateCar3DBuild(build){
  CAR3D_READY.then(({THREE})=>CAR3D_INSTANCES.forEach(x=>{
    if(x.dead||!x.car)return;
    const stance=bodyStance(x.spec,build);
    x.car.traverse(o=>{
      if(o.userData.vehicleBody){
        const ride=o.userData.ride?car3DRideOffset(x.spec.id,build):0;
        o.position.y=(o.userData.baseY||0)+ride+stance.dy;
        o.rotation.z=stance.tilt;
      }
      if(!o.userData.carWheel)return;
      const {front,side}=o.userData,camber=+(front?build.camberF:build.camberR)||0,toe=+(front?build.toeF:build.toeR)||0;
      // 依目前的 ET 重算輪圈中心面，這樣拖 ET／J 寬滑桿時輪圈會即時左右移動
      const datum=car3DDatum(x.spec.id);
      const live=wheelGeometrySpec(build,datum,front);
      const baseTrack=Number.isFinite(live.centreZ)?live.centreZ:(o.userData.baseTrack||0);
      o.userData.baseTrack=baseTrack;
      o.position.z=side*(baseTrack+(+(front?build.trackF:build.trackR)||0)/2000);
      o.position.y=live.tireR+(front?0:(datum.yTrimR||0));
      o.rotation.x=side*THREE.MathUtils.degToRad(camber);o.rotation.y=side*THREE.MathUtils.degToRad(toe);
    });
  }));
}

function afterCarScenes(){
  const roots=$$('.car3d:not(.ready)');if(!roots.length)return;
  CAR3D_READY.then(({THREE,OrbitControls,GLTFLoader,MeshoptDecoder})=>roots.forEach(root=>{
    if(!root.isConnected||root.classList.contains('ready')) return;
    createScene(root,JSON.parse(decodeURIComponent(root.dataset.car3d)),THREE,OrbitControls,GLTFLoader,MeshoptDecoder)
      .catch(err=>{console.error('[car3d]',err);root.classList.add('failed');});
  })).catch(err=>{console.error('[car3d-load]',err);roots.forEach(x=>x.classList.add('failed'));});
}

function disposeCarScenes(){
  while(CAR3D_INSTANCES.length){
    const x=CAR3D_INSTANCES.pop();x.dead=true;x.observer?.disconnect();x.controls?.dispose();x.renderer.setAnimationLoop(null);
    x.scene.traverse(o=>{o.geometry?.dispose?.();if(o.material){(Array.isArray(o.material)?o.material:[o.material]).forEach(m=>m.dispose?.());}});
    x.renderer.dispose();x.renderer.forceContextLoss();
  }
}

function car3DExport(){
  const root=AB ? $('#abAfter .car3d') : $('#stage .car3d');
  const x=CAR3D_INSTANCES.find(i=>i.root===root);
  if(!x) return null;x.renderer.render(x.scene,x.camera);return x.renderer.domElement.toDataURL('image/png');
}

function wheelThumb(styleId, finishId){
  const p=wheelPreset(styleId), fin=WHEEL_FINISHES.find(x=>x.id===finishId)||WHEEL_FINISHES[0];
  const spokes=Array.from({length:p.spokes},(_,i)=>{
    const a=i/p.spokes*Math.PI*2, x1=50+Math.cos(a)*10,y1=50+Math.sin(a)*10,x2=50+Math.cos(a)*31,y2=50+Math.sin(a)*31;
    return `<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}"/>`;
  }).join('');
  return `<svg class="wheel-mini" viewBox="0 0 100 100" aria-hidden="true">
    <circle cx="50" cy="50" r="45" fill="#151817"/><circle cx="50" cy="50" r="34" fill="${fin.face}" stroke="#758080" stroke-width="3"/>
    <g stroke="${p.steel?'#222828':'#f2f4ef'}" stroke-width="${p.thin?3:5}" stroke-linecap="round">${spokes}</g>
    <circle cx="50" cy="50" r="9" fill="${fin.face}"/><circle cx="50" cy="50" r="3" fill="#161a19"/>
  </svg>`;
}

const carSVG=carPhoto;
