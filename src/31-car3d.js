/* ==========================================================================
   Vehicle 3D preview
   Photo-referenced E36 / Eclipse geometry with independent modification parts.
   ========================================================================== */
const CAR3D_BODY_IDS = new Set(['coupe','sedan','touring','compact','cabrio','coupe2g']);
const CAR3D_INSTANCES = [];
const CAR3D_MODEL_URLS = {
  coupe:'./assets/models/e36/scene.gltf',
  sedan:'./assets/models/e36-sedan/model.glb',
  compact:'./assets/models/e36-compact/model.glb',
  touring:'./assets/models/e36-touring/model.glb',
  cabrio:'./assets/models/e36-cabrio/model.glb',
  coupe2g:'./assets/models/eclipse/scene.gltf',
};
/*
 * Every donor model uses a different origin and wheel layout. These values are
 * measured from the source meshes after normalization; they must not be shared
 * between body styles.
 */
const CAR3D_BODY_CONFIG = {
  coupe:{wheelMode:'replace',frontX:-1.486,rearX:1.263,frontY:.300,rearY:.300,frontTrack:.752,rearTrack:.752,
    hideNodes:['rim','rim001','rim002','rim003','Cylinder002','Cylinder004','Cylinder005','Cylinder006']},
  sedan:{wheelMode:'native',hideNodes:['Object_5']},
  compact:{wheelMode:'replace',flipX:true,yOffset:-.950,viewDirection:[.68,.28,.68],
    frontX:1.450,rearX:-1.260,frontY:.300,rearY:.300,frontTrack:.720,rearTrack:.735},
  touring:{wheelMode:'replace',frontX:-1.472,rearX:1.229,frontY:.311,rearY:.311,frontTrack:.735,rearTrack:.745,
    repairMaterials:true,smoothPaintNormals:true,relaxPaintSurface:4,paintRoughness:.33},
  cabrio:{wheelMode:'replace',frontX:-1.350,rearX:1.256,frontY:.300,rearY:.314,frontTrack:.740,rearTrack:.755},
  coupe2g:{wheelMode:'replace',yOffset:.105,frontX:-1.305,rearX:1.205,frontY:.315,rearY:.315,frontTrack:.650,rearTrack:.650,
    repairMaterials:true,smoothPaintNormals:true,relaxPaintSurface:3,paintRoughness:.30},
};
const CAR3D_REVERSED_BODIES=new Set(['compact']);
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

function wheelPreset(id){
  const exact=[...WHEEL_STYLES,...ECL_WHEEL_STYLES].find(x=>x.id===id);
  if(exact) return exact;
  return {spokes:10,wide:true};
}

function sweptSpokeGeometry(THREE, inner, outer, innerW, outerW, depth, sweep=0){
  const stations=[
    {x:0,y:inner,w:innerW},
    {x:sweep*.38,y:inner+(outer-inner)*.52,w:innerW+(outerW-innerW)*.48},
    {x:sweep,y:outer,w:outerW},
  ],vertices=[],indices=[],halfDepth=depth/2;
  [-halfDepth,halfDepth].forEach(z=>stations.forEach(s=>vertices.push(s.x-s.w/2,s.y,z,s.x+s.w/2,s.y,z)));
  for(let k=0;k<2;k++){
    const offset=k*6,reverse=k===0;
    for(let i=0;i<2;i++){
      const a=offset+i*2,b=a+1,c=a+2,d=a+3;
      indices.push(...(reverse?[a,c,b,b,c,d]:[a,b,c,b,d,c]));
    }
  }
  indices.push(
    0,6,8,0,8,2, 2,8,10,2,10,4,
    1,3,9,1,9,7, 3,5,11,3,11,9,
    0,1,7,0,7,6, 4,10,11,4,11,5,
  );
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));
  geometry.setIndex(indices);geometry.computeVertexNormals();return geometry;
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

function addSuspensionModule(THREE,parent,build,rimR,tireW,side,front){
  const palette=suspensionPalette(THREE,build),steel=mat(THREE,0x4c5355,{metalness:.68,roughness:.31});
  const isEclipse=build.platform==='dsm2g',x=front?rimR*.10:-rimR*.04;
  const z=-side*tireW*(isEclipse?.43:.31),top=rimR*.74,bottom=-rimR*.28;
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
    const hubZ=-side*tireW*.16,inboardZ=-side*tireW*.92;
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
    cylinderBetween(THREE,parent,[x,bottom,z],[0,-rimR*.16,-side*tireW*.06],rimR*.032,steel,14);
    cylinderBetween(THREE,parent,[-rimR*.38,-rimR*.31,z-side*tireW*.08],[0,-rimR*.18,-side*tireW*.05],rimR*.026,steel,12);
    cylinderBetween(THREE,parent,[rimR*.38,-rimR*.31,z-side*tireW*.08],[0,-rimR*.18,-side*tireW*.05],rimR*.026,steel,12);
  }
}

function caliperGeometry(THREE,width,height,depth){
  const shape=new THREE.Shape();
  shape.moveTo(-width*.42,-height*.50);shape.quadraticCurveTo(-width*.58,-height*.38,-width*.50,-height*.18);
  shape.lineTo(-width*.36,height*.35);shape.quadraticCurveTo(-width*.27,height*.52,0,height*.50);
  shape.lineTo(width*.26,height*.48);shape.quadraticCurveTo(width*.52,height*.38,width*.48,height*.14);
  shape.lineTo(width*.37,-height*.34);shape.quadraticCurveTo(width*.28,-height*.51,0,-height*.50);shape.closePath();
  const geometry=new THREE.ExtrudeGeometry(shape,{depth,bevelEnabled:true,bevelSegments:2,bevelSize:depth*.18,bevelThickness:depth*.14,curveSegments:8});
  geometry.translate(0,0,-depth/2);geometry.computeVertexNormals();return geometry;
}

function addBrakeModule(THREE,parent,build,rimR,tireW,side,front){
  const products=build.platform==='dsm2g'?eclipseBrakeProducts(build.modelId):BRAKE_PRODUCTS;
  const brake=products.find(x=>x.id===build.brakeKit)||products[0];
  const discR=Math.min(rimR*.84,(brake.disc/2000)*(front?1:.88)),discZ=side*tireW*.11;
  const rotor=mat(THREE,0x788083,{metalness:.82,roughness:.28}),edge=mat(THREE,0x33393a,{metalness:.72,roughness:.40});
  [-.013,.013].forEach(offset=>mesh(THREE,parent,new THREE.CylinderGeometry(discR,discR,.008,64),rotor,[0,0,discZ+side*offset],[Math.PI/2,0,0]));
  mesh(THREE,parent,new THREE.CylinderGeometry(discR*.36,discR*.36,.038,40),edge,[0,0,discZ],[Math.PI/2,0,0]);
  const vent=new THREE.Mesh(new THREE.TorusGeometry(discR*.96,.006,7,64),edge);vent.position.z=discZ;parent.add(vent);
  if(brake.id==='brembo'||brake.id==='ecl-brembo')for(let i=0;i<18;i++){
    const angle=i/18*Math.PI*2+.08,holeR=discR*(i%2?.68:.79);
    mesh(THREE,parent,new THREE.CylinderGeometry(.0045,.0045,.012,8),edge,[Math.cos(angle)*holeR,Math.sin(angle)*holeR,discZ+side*.019],[Math.PI/2,0,0],false);
  }
  const selectedColor=CALIPER_COLORS.find(x=>x.id===build.caliper)||CALIPER_COLORS.find(x=>x.id===brake.color)||CALIPER_COLORS[0];
  const caliperMat=mat(THREE,selectedColor.hex,{metalness:.28,roughness:.27});
  const height=discR*(brake.pistons>=4?.74:brake.pistons===2?.62:.52);
  const width=discR*(brake.pistons>=4?.35:brake.pistons===2?.31:.28),depth=brake.pistons>=4?.072:.052;
  const caliper=mesh(THREE,parent,caliperGeometry(THREE,width,height,depth),caliperMat,[-discR*.76,.01,discZ+side*.030],[0,0,-.16]);
  caliper.scale.set(front?1:.82,front?1:.82,.82);
}

function makeWheel(THREE, build, tireR, tireW, side, front){
  const g=new THREE.Group(), preset=wheelPreset(build.wheel);
  const od=(+build.size||17)*.0254+2*((+build.tireW||225)/1000*((+build.tireAR||45)/100));
  const rimR=Math.min(tireR*.82,tireR*((+build.size||17)*.0254/Math.max(.2,od)));
  const sidewall=Math.max(.045,tireR-rimR), tireMat=mat(THREE,0x111312,{roughness:.88,metalness:0});
  const tire=mesh(THREE,g,new THREE.TorusGeometry(tireR-sidewall*.52,sidewall*.52,12,48),tireMat);
  tire.scale.z=tireW/sidewall;
  const fin=WHEEL_FINISHES.find(x=>x.id===build.finish)||WHEEL_FINISHES[0];
  const rimMat=new THREE.MeshStandardMaterial({color:fin.face,metalness:preset.steel?.48:.64,roughness:preset.steel?.40:.23});
  const lipMat=new THREE.MeshStandardMaterial({color:fin.lip||fin.face,metalness:.76,roughness:.16});
  addSuspensionModule(THREE,g,build,rimR,tireW,side,front);
  addBrakeModule(THREE,g,build,rimR,tireW,side,front);
  const barrelMat=rimMat.clone();barrelMat.color.offsetHSL(0,0,-.10);barrelMat.side=THREE.DoubleSide;
  mesh(THREE,g,new THREE.CylinderGeometry(rimR*.96,rimR*.96,tireW*.70,64,1,true),barrelMat,[0,0,0],[Math.PI/2,0,0]);
  const faceZ=side*(tireW*.49+.008),n=(preset.pair||preset.mesh)?Math.max(3,preset.spokes/2):preset.spokes;
  const inner=rimR*.17*(preset.hubScale||1),outer=rimR*.82,innerW=preset.innerW||(preset.thin?.028:.040),outerW=preset.outerW||(preset.wide?.075:.055);
  for(let i=0;i<n;i++){
    const base=i/n*Math.PI*2,pair=preset.pair||preset.mesh;
    const sweeps=pair?[-1,1]:[0];
    sweeps.forEach(sign=>{
      const split=outer*(preset.pairSpread||.035)+(preset.spokeSweep||0),sweep=pair?sign*split:0;
      const spokeGeo=sweptSpokeGeometry(THREE,inner,outer,innerW,outerW,.030,sweep);
      const spoke=mesh(THREE,g,spokeGeo,rimMat,[0,0,faceZ-side*(preset.dish?.035:0)],[0,0,base]);
      if(preset.concave)spoke.position.z-=side*.035;
    });
  }
  mesh(THREE,g,new THREE.CylinderGeometry(rimR*.16*(preset.hubScale||1),rimR*.16*(preset.hubScale||1),.045,32),rimMat,[0,0,faceZ],[Math.PI/2,0,0]);
  for(let i=0;i<5;i++){
    const a=i/5*Math.PI*2;
    mesh(THREE,g,new THREE.CylinderGeometry(.012,.012,.018,12),lipMat,[Math.cos(a)*rimR*.105,Math.sin(a)*rimR*.105,faceZ+side*.026],[Math.PI/2,0,0],false);
  }
  const lip=new THREE.Mesh(new THREE.TorusGeometry(rimR*.91,rimR*.045,10,64),lipMat);lip.position.z=faceZ;g.add(lip);
  const bead=new THREE.Mesh(new THREE.TorusGeometry(rimR*.99,rimR*.018,8,64),rimMat);bead.position.z=faceZ-side*.012;g.add(bead);
  return g;
}

function addWheels(THREE, root, spec, build, tireR){
  const config=car3DBodyConfig(spec.id);
  if(config.wheelMode!=='replace') return;
  const tireW=Math.max(.17,Math.min(.31,(+build.tireW||225)/1000));
  [{front:true,x:config.frontX,y:config.frontY,track:config.frontTrack},
   {front:false,x:config.rearX,y:config.rearY,track:config.rearTrack}].forEach(axle=>[-1,1].forEach(side=>{
    const {front,x,y}=axle;
    const baseTrack=axle.track||spec.width/2-tireW*.52;
    const track=baseTrack+(+(front?build.trackF:build.trackR)||0)/2000;
    const camber=+(front?build.camberF:build.camberR)||0,toe=+(front?build.toeF:build.toeR)||0;
    const wheelBuild={...build,platform:spec.eclipse?'dsm2g':'e36'};
    const w=makeWheel(THREE,wheelBuild,tireR,tireW,side,front);w.position.set(x,y||tireR,side*track);
    w.rotation.order='YXZ';w.rotation.x=side*THREE.MathUtils.degToRad(camber);
    w.rotation.y=side*THREE.MathUtils.degToRad(toe);
    Object.assign(w.userData,{carWheel:true,front,side,baseTrack,baseY:y||tireR});root.add(w);
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

function car3DTireRadius(build){
  const od=(+build.size||17)*25.4+2*((+build.tireW||225)*(+build.tireAR||45)/100);
  return Math.max(.285,Math.min(.39,od/2000));
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
  const dropF=Math.max(0,+build.dropF||+build.drop||0),dropR=Math.max(0,+build.dropR||+build.drop||0);
  body.position.y=-(dropF+dropR)/2000;body.rotation.z=(dropF-dropR)/1000/Math.max(1,spec.wheelbase);
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
  const config=car3DBodyConfig(spec.id),paintDef=car3DPaint(spec,build);
  const paint=physicalPaint(THREE,paintDef.hex,{roughness:config.paintRoughness});
  const fin=WHEEL_FINISHES.find(x=>x.id===build.finish)||WHEEL_FINISHES[0];
  model.traverse(o=>{
    if(!o.isMesh) return;
    const partPath=importedPartPath(o);
    const paintSideSkirt=spec.eclipse&&o.name==='eclipse_black-material'&&o.parent?.name.startsWith('eclipse_sideskirts');
    const eclipseWindow=spec.eclipse&&/(windshield|doorglass|backlight|sideglass)/.test(partPath);
    const eclipseHeadlight=spec.eclipse&&/eclipse_headlight_[lr]/.test(partPath);
    const eclipseFrontLamp=spec.eclipse&&/eclipse_bumper_f/.test(partPath);
    const eclipseTail=spec.eclipse&&/(trunklight|trunklightframe)/.test(partPath);
    const eclipseInterior=spec.eclipse&&/(dash|seat|steer)/.test(partPath);
    const eclipseExhaust=spec.eclipse&&/exhaust/.test(partPath);
    const eclipseEngine=spec.eclipse&&/(engine|radiator)/.test(partPath);
    const eclipseSpoilerLamp=spec.eclipse&&/eclipse_spoiler\//.test(partPath);
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
      const lampGlass=eclipseHeadLens||eclipseFrontLens||eclipseTailLens||eclipseBrakeLens||(!spec.eclipse&&genericLamp);
      const windowGlass=eclipseWindow||(!spec.eclipse&&(name.includes('window')||name.includes('windscreen')
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
  const set=(name,visible)=>{const x=model.getObjectByName(name);if(x)x.visible=visible;};
  const hideDirectChild=(parentName,childName)=>{
    const parent=model.getObjectByName(parentName);
    parent?.children.filter(x=>x.name===childName).forEach(x=>x.visible=false);
  };
  if(spec.eclipse){
    set('wheel',false);set('eclipse_exhaust',build.tips!=='none');set('eclipse_exhaust_fartcan',false);
    hideDirectChild('eclipse_body','eclipse_underbody-material');
    hideDirectChild('eclipse_body','eclipse_Juiced_nosskirt-material');
    hideDirectChild('eclipse_body','eclipse_black-material');
    set('eclipse_tubs',true);hideDirectChild('eclipse_tubs','eclipse_black-material');
    hideDirectChild('eclipse_fender_L','eclipse_black-material');
    hideDirectChild('eclipse_fender_R','eclipse_black-material');
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
  if(spec.id==='sedan')removeImportedGround(THREE,model);
  normalizeImportedCar(THREE,model,spec);
  smoothImportedPaintNormals(THREE,model,spec);
  const paint=styleImportedCar(THREE,model,spec,build);setImportedVisibility(model,spec,build);
  const dropF=Math.max(0,+build.dropF||+build.drop||0),dropR=Math.max(0,+build.dropR||+build.drop||0);
  const baseY=model.position.y;model.position.y-=(dropF+dropR)/2000;model.rotation.z=(dropF-dropR)/1000/Math.max(1,spec.wheelbase);
  Object.assign(model.userData,{vehicleBody:true,baseY});root.add(model);
  const tireR=car3DTireRadius(build),wheelBuild={...build,tireW:Math.min(+build.tireW||225,spec.eclipse?225:235)};
  addWheels(THREE,root,spec,wheelBuild,tireR);
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
  const spec=bodySpec(config.bodyId), dark=document.documentElement.dataset.theme==='dark';
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
    const dropF=Math.max(0,+build.dropF||+build.drop||0),dropR=Math.max(0,+build.dropR||+build.drop||0);
    x.car.traverse(o=>{
      if(o.userData.vehicleBody){
        o.position.y=(o.userData.baseY||0)-(dropF+dropR)/2000;
        o.rotation.z=(dropF-dropR)/1000/Math.max(1,x.spec.wheelbase);
      }
      if(!o.userData.carWheel)return;
      const {front,side,baseTrack}=o.userData,camber=+(front?build.camberF:build.camberR)||0,toe=+(front?build.toeF:build.toeR)||0;
      o.position.z=side*(baseTrack+(+(front?build.trackF:build.trackR)||0)/2000);
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
