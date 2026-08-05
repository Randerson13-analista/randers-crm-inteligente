import React,{useEffect,useRef,useState} from 'react';
import * as THREE from 'three';
import {GLTFLoader} from 'three/examples/jsm/loaders/GLTFLoader.js';
import {RoomEnvironment} from 'three/examples/jsm/environments/RoomEnvironment.js';
import {defaultAvatar} from '../data/avatarOptions';

const isHuman=id=>String(id).startsWith('male')||String(id).startsWith('female');
const isFemale=id=>String(id).startsWith('female');
const color=(value,fallback)=>new THREE.Color(value||fallback);
const mat=(value,opts={})=>new THREE.MeshStandardMaterial({color:color(value,'#ffffff'),roughness:.48,metalness:.05,...opts});
const mesh=(geometry,material,parent,position=[0,0,0],rotation=[0,0,0],scale=[1,1,1])=>{const m=new THREE.Mesh(geometry,material);m.position.set(...position);m.rotation.set(...rotation);m.scale.set(...scale);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m};
const rounded=(r=.4,h=1)=>new THREE.CapsuleGeometry(r,h,10,18);

function addEyes(root,a,y=2.15,z=.44,spacing=.21){
 const eyeMat=mat('#161c19',{roughness:.2});
 const white=mat('#ffffff',{roughness:.25});
 const size=a.eyeStyle==='Grandes'?.115:.09;
 [-spacing,spacing].forEach(x=>{mesh(new THREE.SphereGeometry(size,16,12),white,root,[x,y,z]);mesh(new THREE.SphereGeometry(size*.48,16,12),eyeMat,root,[x,y,z+.075]);});
}
function addMouth(root,a,y=1.9,z=.49){
 const mouth=new THREE.Mesh(new THREE.TorusGeometry(.16,.025,8,24,Math.PI),mat('#7a2e2e',{roughness:.3}));
 mouth.position.set(0,y,z);mouth.rotation.set(Math.PI,0,0);root.add(mouth);
 if(a.expressionIndex===5) mouth.rotation.x=0;
}
function addHair(root,a){
 if(a.hairStyle==='Sem cabelo')return;
 const hm=mat(a.hairColor||'#1b130e',{roughness:.8});
 const points=[];
 const style=a.hairStyle;
 if(style==='Coque') points.push([0,2.75,0,.25]);
 if(style==='Moicano') for(let i=-2;i<=2;i++) points.push([i*.11,2.68,.02,.16]);
 else if(style==='Longo'||style==='Tranças'||style==='Dreadlocks'){
  for(let i=-3;i<=3;i++) points.push([i*.11,2.58,.02,.22]);
  points.push([-.43,2.25,0,.16],[.43,2.25,0,.16]);
 }else{
  for(let i=-3;i<=3;i++) points.push([i*.11,2.58+(Math.abs(i)<2?.08:0),.02,.18]);
 }
 points.forEach(([x,y,z,s])=>mesh(new THREE.SphereGeometry(s,14,10),hm,root,[x,y,z]));
}
function addAccessory(root,a){
 const acc=a.accessory||'';
 if(acc.includes('Óculos')){
  const gm=mat('#1d2522',{metalness:.35,roughness:.25});
  [-.22,.22].forEach(x=>{const ring=new THREE.Mesh(new THREE.TorusGeometry(.14,.025,8,20),gm);ring.position.set(x,2.18,.52);root.add(ring)});
  mesh(new THREE.BoxGeometry(.16,.025,.025),gm,root,[0,2.18,.52]);
 }
 if(acc.includes('Boné')){
  const cm=mat('#087846');mesh(new THREE.SphereGeometry(.48,24,16,0,Math.PI*2,0,Math.PI/2),cm,root,[0,2.62,0]);mesh(new THREE.BoxGeometry(.52,.06,.22),cm,root,[.22,2.56,.36],[0,-.15,0]);
 }
 if(acc==='Headset'||acc.includes('Fone')){
  const hm=mat('#18312a',{metalness:.2});const tor=new THREE.Mesh(new THREE.TorusGeometry(.48,.045,10,28,Math.PI),hm);tor.position.set(0,2.3,0);tor.rotation.z=Math.PI;root.add(tor);[-.48,.48].forEach(x=>mesh(new THREE.BoxGeometry(.12,.36,.16),hm,root,[x,2.23,.02]));
 }
 if(acc==='Crachá'){
  mesh(new THREE.BoxGeometry(.25,.34,.035),mat('#ffffff'),root,[.32,1.1,.43]);mesh(new THREE.BoxGeometry(.035,.62,.02),mat('#0b7d4b'),root,[.18,1.52,.28],[0,0,.35]);
 }
 if(acc==='Relógio')mesh(new THREE.BoxGeometry(.13,.11,.08),mat('#111827',{metalness:.5}),root,[-.56,.92,.18]);
 if(acc==='Mochila')mesh(rounded(.28,.55),mat('#0a6f43'),root,[0,1.05,-.36],[Math.PI/2,0,0],[1,.65,1]);
 if(acc==='Coroa'){
  const crown=mesh(new THREE.CylinderGeometry(.32,.38,.22,5),mat('#f5c742',{metalness:.45}),root,[0,2.86,0]);crown.rotation.y=.3;
 }
}
function addHuman(root,a){
 const skin=mat(a.skin,'#c98558',{roughness:.55});
 const dark=mat('#202c28');
 const shirtColor=a.outfit?.includes('branca')?'#f7faf8':a.outfit?.includes('celebra')?'#e8bb3e':a.outfit?.includes('jeans')?'#3d6b85':'#087846';
 const shirt=mat(shirtColor,{roughness:.42});
 const female=isFemale(a.character);
 mesh(new THREE.SphereGeometry(.48,28,22),skin,root,[0,2.2,0],[0,0,0],[female?.94:1,1.06,1]);
 addHair(root,a);addEyes(root,a);addMouth(root,a);
 if(a.facialHair&&a.facialHair!=='Nenhum'){
  const fm=mat(a.hairColor||'#2f1d14',{roughness:.8});
  if(a.facialHair==='Bigode') mesh(new THREE.CapsuleGeometry(.045,.23,6,12),fm,root,[0,2.02,.47],[0,0,Math.PI/2]);
  else mesh(new THREE.SphereGeometry(.34,22,12,0,Math.PI*2,Math.PI/2,Math.PI/2),fm,root,[0,1.93,.25],[Math.PI,0,0],[1,.75,.8]);
 }
 mesh(rounded(female?.43:.48,.72),shirt,root,[0,1.08,0]);
 const collar=mat('#f4f7f5');mesh(new THREE.BoxGeometry(.38,.08,.08),collar,root,[0,1.55,.38]);
 // arms and pose
 const crossed=a.pose==='Braços cruzados';const wave=a.pose==='Acenando';const celebrate=a.pose==='Comemorando';
 const armGeo=new THREE.CapsuleGeometry(.105,.62,8,14);
 const left=mesh(armGeo,skin,root,[-.55,1.15,0],crossed?[0,0,-1.15]:celebrate?[0,0,.45]:[0,0,-.18]);
 const right=mesh(armGeo,skin,root,[.55,1.15,0],crossed?[0,0,1.15]:wave?[0,0,-2.35]:celebrate?[0,0,-.45]:[0,0,.18]);
 if(crossed){left.position.set(-.18,1.05,.42);right.position.set(.18,1.05,.42)}
 if(wave){right.position.set(.72,1.72,0)}
 if(celebrate){left.position.set(-.7,1.75,0);right.position.set(.7,1.75,0)}
 // legs
 mesh(new THREE.CapsuleGeometry(.15,.7,8,14),dark,root,[-.23,.15,0]);mesh(new THREE.CapsuleGeometry(.15,.7,8,14),dark,root,[.23,.15,0]);
 const shoeColor=a.shoes?.includes('verde')?'#0b8a52':a.shoes?.includes('social')?'#2a201a':'#f7faf8';
 mesh(new THREE.BoxGeometry(.38,.2,.62),mat(shoeColor,{roughness:.35}),root,[-.23,-.43,.12],[0,0,0]);mesh(new THREE.BoxGeometry(.38,.2,.62),mat(shoeColor,{roughness:.35}),root,[.23,-.43,.12]);
 addAccessory(root,a);
}
function addCreature(root,a){
 const id=a.character;let base='#b88455';
 if(id==='cat')base='#a9aeb0';if(id==='fox')base='#d86b31';if(id==='panda')base='#f1f2ef';if(id==='dragon')base='#35a56b';if(id==='alien')base='#7652b8';if(id==='robot')base='#9eb5ad';
 const bm=mat(base,{roughness:.48,metalness:id==='robot'?.45:.02});
 mesh(new THREE.SphereGeometry(.55,26,20),bm,root,[0,2.1,0],[0,0,0],[1,1.05,1]);
 mesh(rounded(.48,.72),mat(a.outfit?.includes('branca')?'#f7faf8':'#087846'),root,[0,1.02,0]);
 if(['cat','fox','panda','dog'].includes(id)){
  if(id!=='panda'){
   const cone=new THREE.ConeGeometry(.2,.45,4);mesh(cone,bm,root,[-.34,2.62,0],[0,0,-.2]);mesh(cone,bm,root,[.34,2.62,0],[0,0,.2]);
  }else{mesh(new THREE.SphereGeometry(.18,16,12),mat('#1f2623'),root,[-.37,2.5,0]);mesh(new THREE.SphereGeometry(.18,16,12),mat('#1f2623'),root,[.37,2.5,0]);}
 }
 if(id==='dragon'){
  [0,1,2].forEach(i=>mesh(new THREE.ConeGeometry(.1,.32,4),mat('#f0c341'),root,[0,2.65-i*.23,-.18],[Math.PI/2,0,0]));
  mesh(new THREE.ConeGeometry(.36,.8,5),bm,root,[0,1.2,-.48],[Math.PI/2,0,0]);
 }
 if(id==='alien'){
  mesh(new THREE.SphereGeometry(.62,26,18),bm,root,[0,2.2,0],[0,0,0],[1,1.18,.85]);
 }
 if(id==='robot'){
  mesh(new THREE.BoxGeometry(.9,.82,.75),bm,root,[0,2.15,0]);mesh(new THREE.BoxGeometry(.54,.25,.05),mat('#0e2c25',{emissive:new THREE.Color('#1ef0a0'),emissiveIntensity:.7}),root,[0,2.2,.4]);
 }
 addEyes(root,a,2.2,.5,.22);addMouth(root,a,1.93,.51);
 mesh(new THREE.CapsuleGeometry(.11,.55,8,12),bm,root,[-.58,1.12,0]);mesh(new THREE.CapsuleGeometry(.11,.55,8,12),bm,root,[.58,1.12,0]);
 mesh(new THREE.CapsuleGeometry(.15,.62,8,12),mat('#24332d'),root,[-.22,.15,0]);mesh(new THREE.CapsuleGeometry(.15,.62,8,12),mat('#24332d'),root,[.22,.15,0]);
 mesh(new THREE.BoxGeometry(.38,.2,.58),mat('#f7faf8'),root,[-.22,-.43,.12]);mesh(new THREE.BoxGeometry(.38,.2,.58),mat('#f7faf8'),root,[.22,-.43,.12]);
 addAccessory(root,a);
}
function buildAvatar(a){const root=new THREE.Group();(isHuman(a.character)?addHuman:addCreature)(root,a);root.position.y=.2;return root}
const isExternalModel=a=>Boolean(a.modelUrl)&&(['realistic-man','realistic-fox','custom-glb'].includes(a.character)||String(a.character).startsWith('model-'));
function fitModel(object,targetHeight=3.3){const box=new THREE.Box3().setFromObject(object);const size=box.getSize(new THREE.Vector3());const center=box.getCenter(new THREE.Vector3());const scale=targetHeight/Math.max(size.y,.001);object.scale.setScalar(scale);object.position.set(-center.x*scale,-box.min.y*scale-.42,-center.z*scale);object.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;if(o.material){o.material=o.material.clone();o.material.roughness=Math.min(.72,o.material.roughness??.55);o.material.metalness=Math.min(.35,o.material.metalness??0)}}});return object}

export default function AvatarPreview({avatar:raw,compact=false,interactive=!compact}){
 const host=useRef(null);const state=useRef({});const [status,setStatus]=useState('loading');const [message,setMessage]=useState('Preparando avatar 3D…');const a={...defaultAvatar,...raw};
 useEffect(()=>{
  const el=host.current;if(!el)return;let disposed=false;
  setStatus('loading');setMessage(isExternalModel(a)?'Carregando modelo 3D…':'Montando personagem 3D…');
  const scene=new THREE.Scene();scene.background=null;
  const camera=new THREE.PerspectiveCamera(compact?27:30,1,.1,100);camera.position.set(0,1.3,compact?7.25:6.25);
  const renderer=new THREE.WebGLRenderer({antialias:true,alpha:true,preserveDrawingBuffer:!compact,powerPreference:'high-performance'});
  renderer.setPixelRatio(Math.min(window.devicePixelRatio,compact?1.15:1.75));renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.08;renderer.shadowMap.enabled=!compact;renderer.shadowMap.type=THREE.PCFSoftShadowMap;el.innerHTML='';el.appendChild(renderer.domElement);
  const pmrem=new THREE.PMREMGenerator(renderer);const env=new RoomEnvironment();scene.environment=pmrem.fromScene(env,.04).texture;env.dispose();
  const hemi=new THREE.HemisphereLight('#f1fff7','#11362c',1.55);scene.add(hemi);
  const key=new THREE.DirectionalLight('#fffdf8',4.2);key.position.set(3.8,6.4,5.3);key.castShadow=!compact;key.shadow.mapSize.set(1024,1024);scene.add(key);
  const fill=new THREE.DirectionalLight('#b9f7d7',1.6);fill.position.set(-4,2.5,3);scene.add(fill);
  const rim=new THREE.PointLight('#2dff98',5.2,12);rim.position.set(-3.2,2.8,-1.5);scene.add(rim);
  const avatar=new THREE.Group();scene.add(avatar);let mixer=null;let loadCancelled=false;
  const showFallback=(reason)=>{if(loadCancelled||disposed)return;avatar.clear();avatar.add(buildAvatar({...a,character:String(a.character).includes('female')?'female-classic':'male-classic',modelUrl:''}));setStatus('fallback');setMessage(reason||'Modelo externo indisponível; exibindo avatar 3D interno.');resize()};
  const loadTimer=isExternalModel(a)?setTimeout(()=>showFallback('O modelo demorou para carregar; exibindo avatar 3D interno.'),12000):null;
  if(isExternalModel(a)){
   const loader=new GLTFLoader();loader.setCrossOrigin('anonymous');
   loader.load(a.modelUrl,gltf=>{if(loadCancelled||disposed)return;clearTimeout(loadTimer);avatar.clear();const model=fitModel(gltf.scene,compact?2.82:3.4);avatar.add(model);if(gltf.animations?.length){mixer=new THREE.AnimationMixer(model);const preferred=gltf.animations.find(c=>/idle|survey|walk|breath|stand/i.test(c.name))||gltf.animations[0];mixer.clipAction(preferred).reset().fadeIn(.2).play()}setStatus('ready');setMessage('Modelo 3D carregado.');resize()},undefined,()=>{clearTimeout(loadTimer);showFallback('Não foi possível carregar o arquivo GLB/GLTF.')});
  }else{avatar.add(buildAvatar(a));setStatus('ready');setMessage('Avatar 3D pronto.');}
  const floor=mesh(new THREE.CylinderGeometry(1.3,1.52,.2,64),mat('#075c3b',{metalness:.34,roughness:.22}),scene,[0,-.62,0]);floor.receiveShadow=true;
  const ring=new THREE.Mesh(new THREE.TorusGeometry(1.1,.035,10,64),new THREE.MeshStandardMaterial({color:'#73ffb4',emissive:'#37f390',emissiveIntensity:2.4,metalness:.2,roughness:.2}));ring.rotation.x=Math.PI/2;ring.position.y=-.5;scene.add(ring);
  const backGlow=new THREE.Mesh(new THREE.CircleGeometry(1.42,64),new THREE.MeshBasicMaterial({color:'#31ee8c',transparent:true,opacity:.075,depthWrite:false}));backGlow.position.set(0,1.25,-.55);scene.add(backGlow);
  let rotY=0,rotX=0,zoom=1,drag=false,lastX=0,lastY=0,frame=0,visible=true;
  const resize=()=>{if(disposed)return;const w=Math.max(1,el.clientWidth),h=Math.max(1,el.clientHeight);renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();renderer.render(scene,camera)};resize();const ro=new ResizeObserver(resize);ro.observe(el);
  const io=new IntersectionObserver(([entry])=>{visible=entry.isIntersecting},{rootMargin:'120px'});io.observe(el);
  const down=e=>{if(!interactive)return;drag=true;lastX=e.clientX;lastY=e.clientY;renderer.domElement.setPointerCapture?.(e.pointerId)};
  const move=e=>{if(!drag)return;rotY+=(e.clientX-lastX)*.011;rotX=Math.max(-.22,Math.min(.22,rotX+(e.clientY-lastY)*.005));lastX=e.clientX;lastY=e.clientY};
  const up=()=>drag=false;const wheel=e=>{if(!interactive)return;e.preventDefault();zoom=Math.max(.68,Math.min(1.42,zoom-e.deltaY*.0008))};
  renderer.domElement.addEventListener('pointerdown',down);renderer.domElement.addEventListener('pointermove',move);renderer.domElement.addEventListener('pointerup',up);renderer.domElement.addEventListener('pointercancel',up);renderer.domElement.addEventListener('wheel',wheel,{passive:false});
  let previous=performance.now();const animate=t=>{if(disposed)return;const dt=Math.min(.05,(t-previous)/1000);previous=t;if(visible){mixer?.update(dt);avatar.rotation.y=rotY+(interactive&&!drag?Math.sin(t*.0003)*.045:0);avatar.rotation.x=rotX;avatar.scale.setScalar(zoom);if(interactive)avatar.position.y=Math.sin(t*.0018)*.014;renderer.render(scene,camera)}frame=requestAnimationFrame(animate)};frame=requestAnimationFrame(animate);
  state.current={renderer,scene,camera,avatar};
  return()=>{disposed=true;loadCancelled=true;clearTimeout(loadTimer);cancelAnimationFrame(frame);mixer?.stopAllAction();io.disconnect();ro.disconnect();renderer.domElement.removeEventListener('pointerdown',down);renderer.domElement.removeEventListener('pointermove',move);renderer.domElement.removeEventListener('pointerup',up);renderer.domElement.removeEventListener('pointercancel',up);renderer.domElement.removeEventListener('wheel',wheel);scene.traverse(o=>{o.geometry?.dispose?.();if(Array.isArray(o.material))o.material.forEach(m=>m.dispose?.());else o.material?.dispose?.()});scene.environment?.dispose?.();pmrem.dispose();renderer.dispose();if(el)el.innerHTML=''};
 },[JSON.stringify(a),compact,interactive]);
 return <div ref={host} className={`avatar-render avatar-3d ${compact?'compact':''} status-${status}`} title={`${a.character} · ${a.outfit}`} aria-label="Avatar tridimensional personalizado">{!compact&&status==='loading'&&<div className="avatar-3d-status"><i/><span>{message}</span></div>}{!compact&&status==='fallback'&&<div className="avatar-3d-warning">{message}</div>}</div>;
}
