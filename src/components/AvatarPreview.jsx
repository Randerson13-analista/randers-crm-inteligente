import React,{useEffect,useMemo,useRef,useState} from 'react';
import * as THREE from 'three';
import {GLTFLoader} from 'three/examples/jsm/loaders/GLTFLoader.js';
import {RoomEnvironment} from 'three/examples/jsm/environments/RoomEnvironment.js';
import {defaultAvatar} from '../data/avatarOptions';

const isHuman=id=>String(id).startsWith('male')||String(id).startsWith('female')||String(id).includes('realistic-man');
const isFemale=id=>String(id).startsWith('female');
const color=(value,fallback)=>new THREE.Color(value||fallback);
const mat=(value,opts={})=>new THREE.MeshStandardMaterial({color:color(value,'#ffffff'),roughness:.48,metalness:.05,...opts});
const mesh=(geometry,material,parent,position=[0,0,0],rotation=[0,0,0],scale=[1,1,1])=>{const m=new THREE.Mesh(geometry,material);m.position.set(...position);m.rotation.set(...rotation);m.scale.set(...scale);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m};
const rounded=(r=.4,h=1)=>new THREE.CapsuleGeometry(r,h,10,18);

function CompactAvatarPoster({avatar:a}){
 const human=isHuman(a.character);const female=isFemale(a.character);const creature=human?'human':String(a.character||'creature');
 const outfit=a.outfit?.includes('branca')?'#f7faf8':a.outfit?.includes('celebra')?'#e5b834':a.outfit?.includes('jeans')?'#3d6b85':'#087846';
 return <div className={`compact-avatar-poster ${human?'human':'creature'} creature-${creature}`} style={{'--skin':a.skin||'#c98558','--hair':a.hairColor||'#17110e','--outfit':outfit}} aria-hidden="true">
  <span className="poster-glow"/>
  <span className={`poster-hair ${female?'female':''}`}/>
  <span className="poster-head"><i/><i/><b/></span>
  <span className="poster-body"><em/></span>
  <span className="poster-legs"><i/><i/></span>
  {a.accessory&&a.accessory!=='Nenhum'&&<span className="poster-accessory">{a.accessory.includes('Óculos')?'⌁':a.accessory.includes('Boné')?'⌒':a.accessory==='Coroa'?'♛':'•'}</span>}
  <small>3D</small>
 </div>;
}

function addEyes(root,a,y=2.15,z=.44,spacing=.21){
 const eyeMat=mat('#161c19',{roughness:.2});const white=mat('#ffffff',{roughness:.25});const size=a.eyeStyle==='Grandes'?.115:.09;
 [-spacing,spacing].forEach(x=>{mesh(new THREE.SphereGeometry(size,16,12),white,root,[x,y,z]);mesh(new THREE.SphereGeometry(size*.48,16,12),eyeMat,root,[x,y,z+.075]);});
}
function addMouth(root,a,y=1.9,z=.49){const mouth=new THREE.Mesh(new THREE.TorusGeometry(.16,.025,8,24,Math.PI),mat('#7a2e2e',{roughness:.3}));mouth.position.set(0,y,z);mouth.rotation.set(a.expressionIndex===5?0:Math.PI,0,0);root.add(mouth)}
function addHair(root,a){
 if(a.hairStyle==='Sem cabelo')return;const hm=mat(a.hairColor||'#1b130e',{roughness:.8});const points=[];const style=a.hairStyle;
 if(style==='Coque')points.push([0,2.75,0,.25]);
 if(style==='Moicano')for(let i=-2;i<=2;i++)points.push([i*.11,2.68,.02,.16]);
 else if(style==='Longo'||style==='Tranças'||style==='Dreadlocks'){for(let i=-3;i<=3;i++)points.push([i*.11,2.58,.02,.22]);points.push([-.43,2.25,0,.16],[.43,2.25,0,.16]);}
 else for(let i=-3;i<=3;i++)points.push([i*.11,2.58+(Math.abs(i)<2?.08:0),.02,.18]);
 points.forEach(([x,y,z,s])=>mesh(new THREE.SphereGeometry(s,14,10),hm,root,[x,y,z]));
}
function addAccessory(root,a){
 const acc=a.accessory||'';
 if(acc.includes('Óculos')){const gm=mat('#1d2522',{metalness:.35,roughness:.25});[-.22,.22].forEach(x=>{const ring=new THREE.Mesh(new THREE.TorusGeometry(.14,.025,8,20),gm);ring.position.set(x,2.18,.52);root.add(ring)});mesh(new THREE.BoxGeometry(.16,.025,.025),gm,root,[0,2.18,.52]);}
 if(acc.includes('Boné')){const cm=mat('#087846');mesh(new THREE.SphereGeometry(.48,24,16,0,Math.PI*2,0,Math.PI/2),cm,root,[0,2.62,0]);mesh(new THREE.BoxGeometry(.52,.06,.22),cm,root,[.22,2.56,.36],[0,-.15,0]);}
 if(acc==='Headset'||acc.includes('Fone')){const hm=mat('#18312a',{metalness:.2});const tor=new THREE.Mesh(new THREE.TorusGeometry(.48,.045,10,28,Math.PI),hm);tor.position.set(0,2.3,0);tor.rotation.z=Math.PI;root.add(tor);[-.48,.48].forEach(x=>mesh(new THREE.BoxGeometry(.12,.36,.16),hm,root,[x,2.23,.02]));}
 if(acc==='Crachá'){mesh(new THREE.BoxGeometry(.25,.34,.035),mat('#ffffff'),root,[.32,1.1,.43]);mesh(new THREE.BoxGeometry(.035,.62,.02),mat('#0b7d4b'),root,[.18,1.52,.28],[0,0,.35]);}
 if(acc==='Relógio')mesh(new THREE.BoxGeometry(.13,.11,.08),mat('#111827',{metalness:.5}),root,[-.56,.92,.18]);
 if(acc==='Mochila')mesh(rounded(.28,.55),mat('#0a6f43'),root,[0,1.05,-.36],[Math.PI/2,0,0],[1,.65,1]);
 if(acc==='Coroa'){const crown=mesh(new THREE.CylinderGeometry(.32,.38,.22,5),mat('#f5c742',{metalness:.45}),root,[0,2.86,0]);crown.rotation.y=.3;}
}
function addHuman(root,a){
 const skin=mat(a.skin,'#c98558',{roughness:.55});const dark=mat('#202c28');const shirtColor=a.outfit?.includes('branca')?'#f7faf8':a.outfit?.includes('celebra')?'#e8bb3e':a.outfit?.includes('jeans')?'#3d6b85':'#087846';const shirt=mat(shirtColor,{roughness:.42});const female=isFemale(a.character);
 mesh(new THREE.SphereGeometry(.48,28,22),skin,root,[0,2.2,0],[0,0,0],[female?.94:1,1.06,1]);addHair(root,a);addEyes(root,a);addMouth(root,a);
 if(a.facialHair&&a.facialHair!=='Nenhum'){const fm=mat(a.hairColor||'#2f1d14',{roughness:.8});if(a.facialHair==='Bigode')mesh(new THREE.CapsuleGeometry(.045,.23,6,12),fm,root,[0,2.02,.47],[0,0,Math.PI/2]);else mesh(new THREE.SphereGeometry(.34,22,12,0,Math.PI*2,Math.PI/2,Math.PI/2),fm,root,[0,1.93,.25],[Math.PI,0,0],[1,.75,.8]);}
 mesh(rounded(female?.43:.48,.72),shirt,root,[0,1.08,0]);mesh(new THREE.BoxGeometry(.38,.08,.08),mat('#f4f7f5'),root,[0,1.55,.38]);
 const crossed=a.pose==='Braços cruzados',wave=a.pose==='Acenando',celebrate=a.pose==='Comemorando';const armGeo=new THREE.CapsuleGeometry(.105,.62,8,14);
 const left=mesh(armGeo,skin,root,[-.55,1.15,0],crossed?[0,0,-1.15]:celebrate?[0,0,.45]:[0,0,-.18]);const right=mesh(armGeo,skin,root,[.55,1.15,0],crossed?[0,0,1.15]:wave?[0,0,-2.35]:celebrate?[0,0,-.45]:[0,0,.18]);
 if(crossed){left.position.set(-.18,1.05,.42);right.position.set(.18,1.05,.42)}if(wave)right.position.set(.72,1.72,0);if(celebrate){left.position.set(-.7,1.75,0);right.position.set(.7,1.75,0)}
 mesh(new THREE.CapsuleGeometry(.15,.7,8,14),dark,root,[-.23,.15,0]);mesh(new THREE.CapsuleGeometry(.15,.7,8,14),dark,root,[.23,.15,0]);
 const shoeColor=a.shoes?.includes('verde')?'#0b8a52':a.shoes?.includes('social')?'#2a201a':'#f7faf8';mesh(new THREE.BoxGeometry(.38,.2,.62),mat(shoeColor,{roughness:.35}),root,[-.23,-.43,.12]);mesh(new THREE.BoxGeometry(.38,.2,.62),mat(shoeColor,{roughness:.35}),root,[.23,-.43,.12]);addAccessory(root,a);
}
function addCreature(root,a){
 const id=a.character;let base='#b88455';if(id==='cat')base='#a9aeb0';if(id==='fox'||id==='realistic-fox')base='#d86b31';if(id==='panda')base='#f1f2ef';if(id==='dragon')base='#35a56b';if(id==='alien')base='#7652b8';if(id==='robot')base='#9eb5ad';const bm=mat(base,{roughness:.48,metalness:id==='robot'?.45:.02});
 mesh(new THREE.SphereGeometry(.55,26,20),bm,root,[0,2.1,0],[0,0,0],[1,1.05,1]);mesh(rounded(.48,.72),mat(a.outfit?.includes('branca')?'#f7faf8':'#087846'),root,[0,1.02,0]);
 if(['cat','fox','panda','dog','realistic-fox'].includes(id)){if(id!=='panda'){const cone=new THREE.ConeGeometry(.2,.45,4);mesh(cone,bm,root,[-.34,2.62,0],[0,0,-.2]);mesh(cone,bm,root,[.34,2.62,0],[0,0,.2]);}else{mesh(new THREE.SphereGeometry(.18,16,12),mat('#1f2623'),root,[-.37,2.5,0]);mesh(new THREE.SphereGeometry(.18,16,12),mat('#1f2623'),root,[.37,2.5,0]);}}
 if(id==='dragon'){[0,1,2].forEach(i=>mesh(new THREE.ConeGeometry(.1,.32,4),mat('#f0c341'),root,[0,2.65-i*.23,-.18],[Math.PI/2,0,0]));mesh(new THREE.ConeGeometry(.36,.8,5),bm,root,[0,1.2,-.48],[Math.PI/2,0,0]);}
 if(id==='alien')mesh(new THREE.SphereGeometry(.62,26,18),bm,root,[0,2.2,0],[0,0,0],[1,1.18,.85]);
 if(id==='robot'){mesh(new THREE.BoxGeometry(.9,.82,.75),bm,root,[0,2.15,0]);mesh(new THREE.BoxGeometry(.54,.25,.05),mat('#0e2c25',{emissive:new THREE.Color('#1ef0a0'),emissiveIntensity:.7}),root,[0,2.2,.4]);}
 addEyes(root,a,2.2,.5,.22);addMouth(root,a,1.93,.51);mesh(new THREE.CapsuleGeometry(.11,.55,8,12),bm,root,[-.58,1.12,0]);mesh(new THREE.CapsuleGeometry(.11,.55,8,12),bm,root,[.58,1.12,0]);mesh(new THREE.CapsuleGeometry(.15,.62,8,12),mat('#24332d'),root,[-.22,.15,0]);mesh(new THREE.CapsuleGeometry(.15,.62,8,12),mat('#24332d'),root,[.22,.15,0]);mesh(new THREE.BoxGeometry(.38,.2,.58),mat('#f7faf8'),root,[-.22,-.43,.12]);mesh(new THREE.BoxGeometry(.38,.2,.58),mat('#f7faf8'),root,[.22,-.43,.12]);addAccessory(root,a);
}
function buildAvatar(a){const root=new THREE.Group();(isHuman(a.character)?addHuman:addCreature)(root,a);root.position.y=.2;return root}
const isExternalModel=a=>Boolean(a.modelUrl)&&(['realistic-man','realistic-fox','custom-glb'].includes(a.character)||String(a.character).startsWith('model-'));
function validModelUrl(value){try{const url=new URL(value);return url.protocol==='https:'&&/\.(glb|gltf)(\?|#|$)/i.test(url.pathname+url.search)}catch{return false}}
function disposeMaterial(material){if(!material)return;['map','normalMap','roughnessMap','metalnessMap','emissiveMap','aoMap','alphaMap','envMap'].forEach(key=>material[key]?.dispose?.());material.dispose?.()}
function disposeObject(object){object?.traverse?.(node=>{node.geometry?.dispose?.();if(Array.isArray(node.material))node.material.forEach(disposeMaterial);else disposeMaterial(node.material)});object?.clear?.()}
function fitModel(object,targetHeight=3.3){const box=new THREE.Box3().setFromObject(object);const size=box.getSize(new THREE.Vector3());const center=box.getCenter(new THREE.Vector3());const scale=targetHeight/Math.max(size.y,.001);object.scale.setScalar(scale);object.position.set(-center.x*scale,-box.min.y*scale-.42,-center.z*scale);object.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;if(o.material){o.material=o.material.clone();o.material.roughness=Math.min(.72,o.material.roughness??.55);o.material.metalness=Math.min(.35,o.material.metalness??0)}}});return object}
function webglAvailable(){const canvas=document.createElement('canvas');const gl=canvas.getContext('webgl2')||canvas.getContext('webgl');if(!gl)return false;gl.getExtension('WEBGL_lose_context')?.loseContext();return true}

export default function AvatarPreview({avatar:raw,compact=false,interactive=!compact}){
 const a=useMemo(()=>({...defaultAvatar,...raw}),[raw]);
 const canvasHost=useRef(null);const [status,setStatus]=useState('loading');const [message,setMessage]=useState('Preparando avatar 3D…');
 const dependencyKey=useMemo(()=>JSON.stringify(a),[a]);
 useEffect(()=>{
  if(compact)return undefined;
  const el=canvasHost.current;if(!el)return;let disposed=false,frame=0,mixer=null,renderer=null,scene=null,pmrem=null,environmentTexture=null,resizeObserver=null,intersectionObserver=null,loadTimer=null,windowResizeHandler=null;let visible=true,drag=false,lastX=0,lastY=0,rotY=0,rotX=0,zoom=1;
  const cleanup=()=>{disposed=true;clearTimeout(loadTimer);cancelAnimationFrame(frame);mixer?.stopAllAction();resizeObserver?.disconnect?.();intersectionObserver?.disconnect?.();if(windowResizeHandler)window.removeEventListener('resize',windowResizeHandler);if(renderer?.domElement){renderer.domElement.removeEventListener('pointerdown',down);renderer.domElement.removeEventListener('pointermove',move);renderer.domElement.removeEventListener('pointerup',up);renderer.domElement.removeEventListener('pointercancel',up);renderer.domElement.removeEventListener('wheel',wheel);renderer.domElement.removeEventListener('webglcontextlost',contextLost)}if(scene)disposeObject(scene);environmentTexture?.dispose?.();pmrem?.dispose?.();renderer?.dispose?.();renderer?.forceContextLoss?.();el.replaceChildren();};
  const fail=(text,error)=>{console.error('[Randers CRM] Falha no Avatar Studio 3D:',error||text);if(!disposed){setStatus('error');setMessage(text)}};
  const down=e=>{if(!interactive)return;drag=true;lastX=e.clientX;lastY=e.clientY;renderer?.domElement.setPointerCapture?.(e.pointerId)};
  const move=e=>{if(!drag)return;rotY+=(e.clientX-lastX)*.011;rotX=Math.max(-.22,Math.min(.22,rotX+(e.clientY-lastY)*.005));lastX=e.clientX;lastY=e.clientY};
  const up=()=>{drag=false};
  const wheel=e=>{if(!interactive)return;e.preventDefault();zoom=Math.max(.68,Math.min(1.42,zoom-e.deltaY*.0008))};
  const contextLost=e=>{e.preventDefault();fail('A renderização 3D foi pausada pelo navegador. Reabra o Closet para tentar novamente.')};
  try{
   setStatus('loading');setMessage(isExternalModel(a)?'Carregando modelo 3D…':'Montando personagem 3D…');
   if(!webglAvailable())throw new Error('WebGL indisponível neste dispositivo.');
   scene=new THREE.Scene();const camera=new THREE.PerspectiveCamera(30,1,.1,100);camera.position.set(0,1.3,6.25);
   renderer=new THREE.WebGLRenderer({antialias:true,alpha:true,powerPreference:'default'});renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.5));renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.08;renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;el.replaceChildren(renderer.domElement);
   renderer.domElement.addEventListener('webglcontextlost',contextLost,false);
   try{pmrem=new THREE.PMREMGenerator(renderer);const env=new RoomEnvironment();environmentTexture=pmrem.fromScene(env,.04).texture;scene.environment=environmentTexture;env.dispose();}catch(error){console.warn('[Randers CRM] Ambiente PBR simplificado:',error)}
   scene.add(new THREE.HemisphereLight('#f1fff7','#11362c',1.55));const key=new THREE.DirectionalLight('#fffdf8',4.2);key.position.set(3.8,6.4,5.3);key.castShadow=true;key.shadow.mapSize.set(1024,1024);scene.add(key);const fill=new THREE.DirectionalLight('#b9f7d7',1.6);fill.position.set(-4,2.5,3);scene.add(fill);const rim=new THREE.PointLight('#2dff98',5.2,12);rim.position.set(-3.2,2.8,-1.5);scene.add(rim);
   const avatarGroup=new THREE.Group();scene.add(avatarGroup);avatarGroup.add(buildAvatar({...a,character:String(a.character).includes('female')?'female-classic':String(a.character).includes('fox')?'fox':'male-classic',modelUrl:''}));
   const floor=mesh(new THREE.CylinderGeometry(1.3,1.52,.2,64),mat('#075c3b',{metalness:.34,roughness:.22}),scene,[0,-.62,0]);floor.receiveShadow=true;const ring=new THREE.Mesh(new THREE.TorusGeometry(1.1,.035,10,64),new THREE.MeshStandardMaterial({color:'#73ffb4',emissive:'#37f390',emissiveIntensity:2.4,metalness:.2,roughness:.2}));ring.rotation.x=Math.PI/2;ring.position.y=-.5;scene.add(ring);const backGlow=new THREE.Mesh(new THREE.CircleGeometry(1.42,64),new THREE.MeshBasicMaterial({color:'#31ee8c',transparent:true,opacity:.075,depthWrite:false}));backGlow.position.set(0,1.25,-.55);scene.add(backGlow);
   const resize=()=>{if(disposed||!renderer)return;const w=Math.max(1,el.clientWidth),h=Math.max(1,el.clientHeight);renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();renderer.render(scene,camera)};resize();
   if('ResizeObserver'in window){resizeObserver=new ResizeObserver(resize);resizeObserver.observe(el)}else{windowResizeHandler=resize;window.addEventListener('resize',windowResizeHandler,{passive:true});}
   if('IntersectionObserver'in window){intersectionObserver=new IntersectionObserver(([entry])=>{visible=entry.isIntersecting},{rootMargin:'120px'});intersectionObserver.observe(el)}
   renderer.domElement.addEventListener('pointerdown',down);renderer.domElement.addEventListener('pointermove',move);renderer.domElement.addEventListener('pointerup',up);renderer.domElement.addEventListener('pointercancel',up);renderer.domElement.addEventListener('wheel',wheel,{passive:false});
   if(isExternalModel(a)&&validModelUrl(a.modelUrl)){
    loadTimer=setTimeout(()=>{if(!disposed){setStatus('fallback');setMessage('O modelo externo demorou para carregar. O avatar interno continuará disponível.')}},12000);
    const loader=new GLTFLoader();loader.setCrossOrigin('anonymous');loader.load(a.modelUrl,gltf=>{if(disposed)return;clearTimeout(loadTimer);disposeObject(avatarGroup);const model=fitModel(gltf.scene,3.4);avatarGroup.add(model);if(gltf.animations?.length){mixer=new THREE.AnimationMixer(model);const preferred=gltf.animations.find(c=>/idle|survey|walk|breath|stand/i.test(c.name))||gltf.animations[0];mixer.clipAction(preferred).reset().fadeIn(.2).play()}setStatus('ready');setMessage('Modelo 3D carregado.');resize()},undefined,error=>{clearTimeout(loadTimer);if(!disposed){setStatus('fallback');setMessage('O arquivo GLB/GLTF não pôde ser carregado. O avatar interno foi mantido.');console.warn('[Randers CRM] GLB indisponível:',error)}});
   }else{setStatus(isExternalModel(a)?'fallback':'ready');setMessage(isExternalModel(a)?'URL de modelo inválida. O avatar interno foi mantido.':'Avatar 3D pronto.');}
   let previous=performance.now();const animate=t=>{if(disposed)return;const dt=Math.min(.05,(t-previous)/1000);previous=t;if(visible){mixer?.update(dt);avatarGroup.rotation.y=rotY+(interactive&&!drag?Math.sin(t*.0003)*.045:0);avatarGroup.rotation.x=rotX;avatarGroup.scale.setScalar(zoom);if(interactive)avatarGroup.position.y=Math.sin(t*.0018)*.014;renderer.render(scene,camera)}frame=requestAnimationFrame(animate)};frame=requestAnimationFrame(animate);
  }catch(error){fail('Não foi possível iniciar o modo 3D neste navegador. As outras áreas do CRM continuam disponíveis.',error)}
  return cleanup;
 },[dependencyKey,interactive,compact]);
 if(compact)return <div className="avatar-render compact avatar-poster-wrap" title={`${a.character} · ${a.outfit}`} aria-label="Miniatura do avatar"><CompactAvatarPoster avatar={a}/></div>;
 return <div className={`avatar-render avatar-3d status-${status}`} title={`${a.character} · ${a.outfit}`} aria-label="Avatar tridimensional personalizado">
  <div ref={canvasHost} className="avatar-canvas-host"/>
  {status==='loading'&&<div className="avatar-3d-status"><i/><span>{message}</span></div>}
  {status==='fallback'&&<div className="avatar-3d-warning">{message}</div>}
  {status==='error'&&<div className="avatar-3d-error"><strong>Modo 3D indisponível</strong><span>{message}</span><button type="button" onClick={()=>window.location.reload()}>Recarregar</button></div>}
 </div>;
}
