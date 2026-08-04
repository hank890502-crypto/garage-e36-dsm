/* ==========================================================================
   Vehicle 3D preview
   Procedural E36 / Eclipse geometry with independent modification parts.
   ========================================================================== */
const CAR3D_BODY_IDS = new Set(['coupe','sedan','touring','compact','cabrio','coupe2g','spyder2g']);
const CAR3D_INSTANCES = [];
const CAR3D_DEFAULT_VIEW = {offset:[-4.95,2.15,4.35], target:[0,.65,0]};
let CAR3D_VIEW = structuredClone(CAR3D_DEFAULT_VIEW);
let CAR3D_SYNCING = false;

const CAR3D_READY = window.CAR3D_LIB
  ? Promise.resolve(window.CAR3D_LIB)
  : Promise.reject(new Error('Three.js bundle is unavailable'));

function hasCar3D(bodyId){ return CAR3D_BODY_IDS.has(bodyId); }

function carPhoto(build, opt={}){
  const bodyId = hasCar3D(opt.bodyId) ? opt.bodyId : (String(opt.bodyId||'').endsWith('2g')?'coupe2g':'coupe');
  const config = encodeURIComponent(JSON.stringify({
    bodyId,
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

function bodySpec(bodyId){
  const d = bodyById(bodyId) || {L:4433,W:1710,H:1366,wb:2700};
  return {
    id:bodyId,
    length:d.L/1000,
    width:d.W/1000,
    height:d.H/1000,
    wheelbase:d.wb/1000,
    eclipse:bodyId.endsWith('2g'),
    open:bodyId==='cabrio'||bodyId==='spyder2g',
  };
}

function lowerBodyPoints(spec){
  const front=-spec.length/2, rear=spec.length/2;
  if(spec.open) return [
    [front+.02,.49],[front+.18,.66],[-1.24,.78],[-.70,.86],[.70,.86],[1.42,.82],[rear-.03,.70],[rear,.49]
  ];
  if(spec.eclipse) return [
    [front+.02,.46],[front+.20,.60],[-1.34,.72],[-.82,.82],[.98,.82],[1.55,.78],[rear-.02,.68],[rear,.46]
  ];
  return [
    [front+.02,.50],[front+.18,.70],[-1.24,.82],[-.78,.86],[1.04,.86],[1.52,.83],[rear-.03,.75],[rear,.50]
  ];
}

function cabinPoints(spec){
  const h=spec.height;
  if(spec.open) return null;
  if(spec.id==='touring') return [[-.80,.83],[-.48,h-.07],[.94,h-.07],[1.48,1.10],[1.53,.84]];
  if(spec.id==='compact') return [[-.72,.83],[-.40,h-.06],[.43,h-.06],[1.16,1.02],[1.22,.84]];
  if(spec.eclipse) return [[-.82,.80],[-.38,h-.07],[.37,h-.07],[1.03,.98],[1.16,.81]];
  if(spec.id==='sedan') return [[-.77,.84],[-.40,h-.06],[.42,h-.06],[1.04,1.10],[1.16,.84]];
  return [[-.74,.84],[-.36,h-.06],[.38,h-.06],[1.00,1.08],[1.13,.84]];
}

function shapeFromProfile(THREE, spec, tireR){
  const top=lowerBodyPoints(spec), s=new THREE.Shape();
  s.moveTo(top[0][0],top[0][1]);
  top.slice(1).forEach(p=>s.lineTo(p[0],p[1]));
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
  points.slice(1).forEach(p=>s.lineTo(p[0],p[1]));s.closePath();return s;
}

function mat(THREE, color, extra={}){
  return new THREE.MeshStandardMaterial({color,roughness:.42,metalness:.12,...extra});
}

function physicalPaint(THREE, hex){
  return new THREE.MeshPhysicalMaterial({
    color:hex,metalness:.22,roughness:.26,clearcoat:1,clearcoatRoughness:.12,
  });
}

function mesh(THREE, parent, geometry, material, pos=[0,0,0], rot=[0,0,0], cast=true){
  const m=new THREE.Mesh(geometry,material);
  m.position.set(...pos);m.rotation.set(...rot);m.castShadow=cast;m.receiveShadow=cast;parent.add(m);return m;
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
    [[-.70,1.00],[-.34,spec.height-.13],[.05,spec.height-.13],[-.02,1.00]],
    [[.06,1.00],[.10,spec.height-.13],[.34,spec.height-.13],[.90,.98]],
  ];
  return [
    [[-.68,1.08],[-.34,spec.height-.12],[.06,spec.height-.12],[-.02,1.05]],
    [[.06,1.05],[.11,spec.height-.12],[.34,spec.height-.12],[.91,1.06]],
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
      const nx=-Math.sin(angle),ny=Math.cos(angle),cx=(a[0]+b[0])/2+nx*.022,cy=(a[1]+b[1])/2+ny*.022;
      mesh(THREE,body,new THREE.BoxGeometry(len*coverage,.018,cabinWidth*.86),wm,[cx,cy,0],[0,0,angle],false);
    };
    slopedGlass(cabin[0],cabin[1],.76);
    slopedGlass(cabin[cabin.length-2],cabin[cabin.length-1],.70);
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
  const doorX=spec.eclipse?-.05:-.02;
  [-1,1].forEach(side=>{
    const z=side*(spec.width/2+.046);
    const pts=[new THREE.Vector3(doorX,1.04,z),new THREE.Vector3(doorX,.48,z),new THREE.Vector3(.72,.45,z)];
    body.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts),lm));
    const lower=[new THREE.Vector3(-1.18,.43,z),new THREE.Vector3(1.20,.43,z)];
    body.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(lower),lm));
  });
}

function wheelPreset(id){
  if(id==='steel') return {spokes:12,steel:true};
  if(id==='st66') return {spokes:5,wide:true};
  if(id==='dish') return {spokes:8,dish:true};
  if(id==='mesh') return {spokes:14,thin:true};
  if(id==='st5'||id==='st39') return {spokes:10,thin:true};
  if(id==='ecl-oem'||id==='ecl-gold') return {spokes:6,wide:true};
  if(id==='ecl-mesh6') return {spokes:12,thin:true};
  return {spokes:10,wide:true};
}

function makeWheel(THREE, build, tireR, tireW, side){
  const g=new THREE.Group(), preset=wheelPreset(build.wheel);
  const od=(+build.size||17)*.0254+2*((+build.tireW||225)/1000*((+build.tireAR||45)/100));
  const rimR=Math.min(tireR*.82,tireR*((+build.size||17)*.0254/Math.max(.2,od)));
  const sidewall=Math.max(.045,tireR-rimR), tireMat=mat(THREE,0x111312,{roughness:.88,metalness:0});
  const tire=mesh(THREE,g,new THREE.TorusGeometry(tireR-sidewall*.52,sidewall*.52,12,48),tireMat);
  tire.scale.z=tireW/sidewall;
  const fin=WHEEL_FINISHES.find(x=>x.id===build.finish)||WHEEL_FINISHES[0];
  const rimMat=new THREE.MeshStandardMaterial({color:fin.face,metalness:preset.steel?.5:.82,roughness:preset.steel?.42:.2});
  const discMat=mat(THREE,0x737b7d,{metalness:.72,roughness:.34});
  const cal=CALIPER_COLORS.find(x=>x.id===build.caliper)||CALIPER_COLORS[0];
  const calMat=mat(THREE,cal.hex,{metalness:.25,roughness:.3});
  mesh(THREE,g,new THREE.CylinderGeometry(rimR*.73,rimR*.73,.055,40),discMat,[0,0,side*.012],[Math.PI/2,0,0]);
  mesh(THREE,g,new THREE.BoxGeometry(rimR*.20,rimR*.46,.09),calMat,[-rimR*.55,0,side*.045],[0,0,-.18]);
  mesh(THREE,g,new THREE.CylinderGeometry(rimR,rimR,.09,48),rimMat,[0,0,side*(tireW*.40)],[Math.PI/2,0,0]);
  const faceZ=side*(tireW*.5+.012), spokeW=preset.thin?.035:preset.wide?.065:.05;
  for(let i=0;i<preset.spokes;i++){
    const a=i/preset.spokes*Math.PI*2;
    mesh(THREE,g,new THREE.BoxGeometry(rimR*.77,spokeW,.025),rimMat,
      [Math.cos(a)*rimR*.37,Math.sin(a)*rimR*.37,faceZ],[0,0,a]);
  }
  mesh(THREE,g,new THREE.CylinderGeometry(rimR*.18,rimR*.18,.04,32),rimMat,[0,0,faceZ],[Math.PI/2,0,0]);
  const lip=new THREE.Mesh(new THREE.TorusGeometry(rimR*.91,rimR*.055,8,48),rimMat);lip.position.z=faceZ;g.add(lip);
  return g;
}

function addWheels(THREE, root, spec, build, tireR){
  const tireW=Math.max(.17,Math.min(.31,(+build.tireW||225)/1000));
  const track=spec.width/2-tireW*.20;
  [-spec.wheelbase/2,spec.wheelbase/2].forEach(x=>[-1,1].forEach(side=>{
    const w=makeWheel(THREE,build,tireR,tireW,side);w.position.set(x,tireR,side*track);root.add(w);
  }));
}

function addLightingParts(THREE, body, spec){
  const front=-spec.length/2-.015,rear=spec.length/2+.015;
  const head=mat(THREE,spec.eclipse?0xd8eef2:0xe9f4ed,{metalness:.25,roughness:.14,emissive:0xbfd7d5,emissiveIntensity:.35});
  const tail=mat(THREE,0xb41420,{metalness:.1,roughness:.25,emissive:0x6c0610,emissiveIntensity:.35});
  const turn=mat(THREE,0xe88721,{emissive:0x7b3504,emissiveIntensity:.25});
  const hw=spec.eclipse?.42:.37;
  [-1,1].forEach(side=>{
    mesh(THREE,body,new THREE.BoxGeometry(.025,.16,hw),head,[front,.62,side*(spec.width*.28)]);
    mesh(THREE,body,new THREE.BoxGeometry(.025,.17,.30),tail,[rear,.64,side*(spec.width*.31)]);
    mesh(THREE,body,new THREE.BoxGeometry(.027,.07,.11),turn,[front-.002,.55,side*(spec.width*.48)]);
  });
  if(!spec.eclipse){
    const grille=mat(THREE,0x151a19,{metalness:.55,roughness:.35});
    [-.10,.10].forEach(z=>mesh(THREE,body,new THREE.BoxGeometry(.03,.18,.15),grille,[front-.006,.56,z]));
  }
}

function addMirrors(THREE, body, spec, paint){
  [-1,1].forEach(side=>{
    mesh(THREE,body,new THREE.SphereGeometry(.12,18,10),paint,[-.63,1.00,side*(spec.width/2+.11)],[0,0,0]);
    mesh(THREE,body,new THREE.BoxGeometry(.10,.035,.10),paint,[-.58,.98,side*(spec.width/2+.035)]);
  });
}

function addAero(THREE, body, spec, build, paint){
  const dark=mat(THREE,0x171c1d,{metalness:.38,roughness:.38});
  const front=-spec.length/2,rear=spec.length/2,w=spec.width;
  if(build.lip) mesh(THREE,body,new THREE.BoxGeometry(.38,.075,w*.92),dark,[front+.10,.245,0],[0,0,-.08]);
  if(build.skirt) [-1,1].forEach(side=>mesh(THREE,body,new THREE.BoxGeometry(spec.wheelbase-.62,.065,.10),dark,[0,.265,side*(w/2+.015)]));
  if(build.diffuser){
    mesh(THREE,body,new THREE.BoxGeometry(.50,.09,w*.72),dark,[rear-.20,.27,0],[0,0,.10]);
    [-.45,-.15,.15,.45].forEach(z=>mesh(THREE,body,new THREE.BoxGeometry(.34,.16,.025),dark,[rear-.14,.22,z],[0,0,.12]));
  }
  if(build.hood) [-.58,-.40,-.22].forEach(x=>[-.22,.22].forEach(z=>
    mesh(THREE,body,new THREE.BoxGeometry(.24,.018,.07),dark,[x,.92,z],[0,0,-.12],false)));
  if(build.wide){
    const tireR=car3DTireRadius(build),r=tireR+.085;
    [-spec.wheelbase/2,spec.wheelbase/2].forEach(x=>[-1,1].forEach(side=>{
      const flare=mesh(THREE,body,new THREE.TorusGeometry(r,.045,8,28,Math.PI),paint,[x,tireR,side*(w/2+.06)]);
      flare.rotation.z=0;
    }));
  }
  if(build.wing==='duck'){
    mesh(THREE,body,new THREE.BoxGeometry(.56,.065,w*.78),paint,[rear-.30,.89,0],[0,0,-.16]);
  }
  if(build.wing==='gt'){
    [-.42,.42].forEach(z=>mesh(THREE,body,new THREE.BoxGeometry(.055,.48,.055),dark,[rear-.37,1.09,z]));
    mesh(THREE,body,new THREE.BoxGeometry(.48,.07,w*.92),dark,[rear-.37,1.32,0],[0,0,-.06]);
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

function car3DTireRadius(build){
  const od=(+build.size||17)*25.4+2*((+build.tireW||225)*(+build.tireAR||45)/100);
  return Math.max(.285,Math.min(.39,od/2000));
}

function buildCarModel(THREE, spec, build){
  const root=new THREE.Group(), body=new THREE.Group(), tireR=car3DTireRadius(build);
  const paintDef=PAINTS.find(x=>x.id===build.paint)||PAINTS[0], paint=physicalPaint(THREE,paintDef.hex);
  const shape=shapeFromProfile(THREE,spec,tireR);
  const geo=new THREE.ExtrudeGeometry(shape,{depth:spec.width,bevelEnabled:true,bevelSegments:3,steps:1,bevelSize:.035,bevelThickness:.035,curveSegments:24});
  geo.translate(0,0,-spec.width/2);
  mesh(THREE,body,geo,paint);
  const cabin=cabinPoints(spec), cabinWidth=spec.open?spec.width*.70:spec.width*.76;
  if(cabin){
    const cabinGeo=new THREE.ExtrudeGeometry(shapeFromPolygon(THREE,cabin),{
      depth:cabinWidth,bevelEnabled:true,bevelSegments:3,steps:1,bevelSize:.026,bevelThickness:.026,curveSegments:18,
    });
    cabinGeo.translate(0,0,-cabinWidth/2);mesh(THREE,body,cabinGeo,paint);
  }
  const dark=mat(THREE,0x15191a,{metalness:.22,roughness:.55});
  mesh(THREE,body,new THREE.BoxGeometry(spec.length*.58,.10,spec.width*.76),dark,[.02,.31,0]);
  addWindows(THREE,body,spec,build,cabinWidth);addPanelLines(THREE,body,spec);addLightingParts(THREE,body,spec);
  addMirrors(THREE,body,spec,paint);addAero(THREE,body,spec,build,paint);
  body.position.y=-Math.max(0,+build.drop||0)/1000;root.add(body);
  addWheels(THREE,root,spec,build,tireR);addExhaust(THREE,root,spec,build);
  root.rotation.y=0;
  return root;
}

function createScene(root, config, THREE, OrbitControls){
  const spec=bodySpec(config.bodyId), dark=document.documentElement.dataset.theme==='dark';
  const scene=new THREE.Scene();scene.background=new THREE.Color(dark?0x101511:0xdfe4de);scene.fog=new THREE.Fog(scene.background,8,16);
  const camera=new THREE.PerspectiveCamera(31,1,.1,50);
  camera.position.set(...CAR3D_VIEW.offset);
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
  scene.add(buildCarModel(THREE,spec,config.build));

  let controls=null;
  if(config.interactive){
    controls=new OrbitControls(camera,renderer.domElement);controls.target.set(...CAR3D_VIEW.target);
    controls.enableDamping=true;controls.dampingFactor=.075;controls.enablePan=false;
    controls.minDistance=4.4;controls.maxDistance=9.5;controls.minPolarAngle=.72;controls.maxPolarAngle=1.48;
  }else camera.lookAt(...CAR3D_VIEW.target);

  const instance={root,scene,camera,renderer,controls,spec,dead:false,observer:null};CAR3D_INSTANCES.push(instance);
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
  CAR3D_VIEW={offset:off.toArray(),target:source.controls.target.toArray()};CAR3D_SYNCING=true;
  CAR3D_INSTANCES.forEach(x=>{
    if(x===source||x.dead||!x.controls) return;
    x.controls.target.set(...CAR3D_VIEW.target);x.camera.position.copy(x.controls.target).add(off);x.controls.update();
  });
  CAR3D_SYNCING=false;
}

function resetCar3D(event){
  event.preventDefault();event.stopPropagation();CAR3D_VIEW=structuredClone(CAR3D_DEFAULT_VIEW);CAR3D_SYNCING=true;
  CAR3D_INSTANCES.forEach(x=>{
    if(x.dead) return;
    x.camera.position.set(...CAR3D_VIEW.offset);
    if(x.controls){x.controls.target.set(...CAR3D_VIEW.target);x.controls.update();}
    else x.camera.lookAt(...CAR3D_VIEW.target);
  });
  CAR3D_SYNCING=false;
}

function afterCarScenes(){
  const roots=$$('.car3d:not(.ready)');if(!roots.length)return;
  CAR3D_READY.then(({THREE,OrbitControls})=>roots.forEach(root=>{
    if(!root.isConnected||root.classList.contains('ready')) return;
    try{createScene(root,JSON.parse(decodeURIComponent(root.dataset.car3d)),THREE,OrbitControls);}
    catch(err){console.error('[car3d]',err);root.classList.add('failed');}
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
