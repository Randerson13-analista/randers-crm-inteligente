import React, { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { createAvatarModel, disposeThreeObject, fitExternalModel } from '../three/avatarFactory';
import { normalizeAvatarConfig } from '../data/avatarOptions';

const qualityProfile = quality => {
  if (quality === 'Alta') return { pixelRatio: 1.8, shadows: 2048, antialias: true };
  if (quality === 'Econômica') return { pixelRatio: 1, shadows: 512, antialias: false };
  if (quality === 'Equilibrada') return { pixelRatio: 1.25, shadows: 1024, antialias: true };
  const deviceMemory = Number(navigator.deviceMemory || 4);
  const high = deviceMemory >= 8 && window.devicePixelRatio <= 2;
  return high ? { pixelRatio: 1.55, shadows: 1536, antialias: true } : { pixelRatio: 1.15, shadows: 768, antialias: true };
};

const validModelUrl = value => {
  if (!value) return false;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && /\.(glb|gltf)(?:$|[?#])/i.test(`${url.pathname}${url.search}${url.hash}`);
  } catch {
    return false;
  }
};

const makeLabelTexture = (text, color = '#eafff3') => {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.font = '900 118px Inter, Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = color;
  ctx.shadowColor = '#3cff9f';
  ctx.shadowBlur = 30;
  ctx.fillText(text, canvas.width / 2, canvas.height / 2);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
};

const makeScenePalette = sceneName => {
  const name = String(sceneName || '').toLowerCase();
  if (name.includes('cidade')) return { wall: '#0b1720', floor: '#101c1a', accent: '#2ceea0', fog: '#07110e' };
  if (name.includes('branco')) return { wall: '#eaf0ed', floor: '#d8e5df', accent: '#0ea463', fog: '#eaf0ed' };
  if (name.includes('pódio')) return { wall: '#15231e', floor: '#0c1713', accent: '#f2c94c', fog: '#07110e' };
  if (name.includes('natureza')) return { wall: '#9fc8aa', floor: '#668f70', accent: '#d8ff9b', fog: '#9fc8aa' };
  if (name.includes('escritório')) return { wall: '#dfe8e3', floor: '#b8c8c0', accent: '#0a8c55', fog: '#dfe8e3' };
  return { wall: '#0b5f40', floor: '#0b3025', accent: '#45f39a', fog: '#0a3f2e' };
};

const createStage = (scene, avatar, quality) => {
  const palette = makeScenePalette(avatar.scene);
  scene.background = new THREE.Color(palette.wall);
  scene.fog = new THREE.FogExp2(palette.fog, 0.03);

  const stage = new THREE.Group();
  scene.add(stage);

  const floorMaterial = new THREE.MeshPhysicalMaterial({ color: palette.floor, roughness: 0.28, metalness: 0.26, clearcoat: 0.55, clearcoatRoughness: 0.18 });
  const floor = new THREE.Mesh(new THREE.CylinderGeometry(2.1, 2.25, 0.24, 72), floorMaterial);
  floor.position.y = -0.62;
  floor.receiveShadow = true;
  stage.add(floor);

  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(1.82, 0.035, 12, 96),
    new THREE.MeshStandardMaterial({ color: palette.accent, emissive: palette.accent, emissiveIntensity: 3.2, roughness: 0.22 }),
  );
  ring.rotation.x = Math.PI / 2;
  ring.position.y = -0.49;
  stage.add(ring);

  const wall = new THREE.Mesh(
    new THREE.PlaneGeometry(8.5, 6.2),
    new THREE.MeshPhysicalMaterial({ color: palette.wall, roughness: 0.62, metalness: 0.05 }),
  );
  wall.position.set(0, 2.1, -2.3);
  wall.receiveShadow = true;
  stage.add(wall);

  const archMaterial = new THREE.MeshStandardMaterial({ color: palette.accent, emissive: palette.accent, emissiveIntensity: 2.5, roughness: 0.2 });
  const leftStrip = new THREE.Mesh(new THREE.BoxGeometry(0.055, 4.3, 0.055), archMaterial);
  leftStrip.position.set(-1.8, 1.55, -2.18);
  stage.add(leftStrip);
  const rightStrip = leftStrip.clone();
  rightStrip.position.x = 1.8;
  stage.add(rightStrip);
  const topStrip = new THREE.Mesh(new THREE.BoxGeometry(3.65, 0.055, 0.055), archMaterial);
  topStrip.position.set(0, 3.68, -2.18);
  stage.add(topStrip);

  const signTexture = makeLabelTexture("RANDERS' STUDIO");
  const sign = new THREE.Mesh(
    new THREE.PlaneGeometry(2.6, 0.65),
    new THREE.MeshBasicMaterial({ map: signTexture, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }),
  );
  sign.position.set(0.7, 3.12, -2.08);
  sign.rotation.z = -0.05;
  sign.userData.texture = signTexture;
  stage.add(sign);

  const shelfMaterial = new THREE.MeshPhysicalMaterial({ color: '#dff8e9', transparent: true, opacity: 0.24, roughness: 0.18, metalness: 0.08, transmission: quality.pixelRatio > 1.4 ? 0.35 : 0 });
  const shelf = new THREE.Mesh(new THREE.BoxGeometry(1.25, 2.45, 0.12), shelfMaterial);
  shelf.position.set(2.35, 1.15, -1.95);
  stage.add(shelf);
  const bottleColors = ['#0d7c4f', '#12a567', '#075c3c', '#1f8f61'];
  for (let row = 0; row < 4; row += 1) {
    for (let col = 0; col < 3; col += 1) {
      const bottle = new THREE.Mesh(
        new THREE.CylinderGeometry(0.08, 0.09, 0.42 + (col % 2) * 0.07, 16),
        new THREE.MeshPhysicalMaterial({ color: bottleColors[(row + col) % bottleColors.length], roughness: 0.3, metalness: 0.05, clearcoat: 0.55 }),
      );
      bottle.position.set(1.92 + col * 0.42, 0.3 + row * 0.58, -1.78);
      bottle.castShadow = true;
      stage.add(bottle);
    }
  }

  return stage;
};

export default function AvatarStage3D({ avatar: rawAvatar, interactive = true, onStateChange }) {
  const avatar = useMemo(() => normalizeAvatarConfig(rawAvatar), [rawAvatar]);
  const hostRef = useRef(null);
  const [state, setState] = useState({ status: 'loading', message: 'Preparando o estúdio 3D…' });
  const dependencyKey = useMemo(() => JSON.stringify(avatar), [avatar]);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return undefined;

    let renderer;
    let scene;
    let camera;
    let environmentTexture;
    let pmrem;
    let frame = 0;
    let resizeObserver;
    let intersectionObserver;
    let loadTimer;
    let mixer;
    let visible = true;
    let disposed = false;
    let avatarRoot;
    let rotationY = 0;
    let rotationX = 0;
    let zoom = 1;
    let dragging = false;
    let lastX = 0;
    let lastY = 0;
    const profile = qualityProfile(avatar.quality);

    const updateState = next => {
      if (disposed) return;
      setState(next);
      onStateChange?.(next);
    };

    const cleanup = () => {
      disposed = true;
      clearTimeout(loadTimer);
      cancelAnimationFrame(frame);
      mixer?.stopAllAction?.();
      resizeObserver?.disconnect?.();
      intersectionObserver?.disconnect?.();
      if (renderer?.domElement) {
        renderer.domElement.removeEventListener('pointerdown', pointerDown);
        renderer.domElement.removeEventListener('pointermove', pointerMove);
        renderer.domElement.removeEventListener('pointerup', pointerUp);
        renderer.domElement.removeEventListener('pointercancel', pointerUp);
        renderer.domElement.removeEventListener('wheel', wheel);
        renderer.domElement.removeEventListener('webglcontextlost', contextLost);
      }
      if (scene) disposeThreeObject(scene);
      environmentTexture?.dispose?.();
      pmrem?.dispose?.();
      renderer?.dispose?.();
      renderer?.forceContextLoss?.();
      host.replaceChildren();
    };

    const fail = (message, error) => {
      console.error('[Randers CRM] AvatarStage3D:', error || message);
      updateState({ status: 'error', message });
    };

    const pointerDown = event => {
      if (!interactive || !renderer) return;
      dragging = true;
      lastX = event.clientX;
      lastY = event.clientY;
      renderer.domElement.setPointerCapture?.(event.pointerId);
    };
    const pointerMove = event => {
      if (!dragging) return;
      rotationY += (event.clientX - lastX) * 0.011;
      rotationX = Math.max(-0.18, Math.min(0.18, rotationX + (event.clientY - lastY) * 0.004));
      lastX = event.clientX;
      lastY = event.clientY;
    };
    const pointerUp = () => { dragging = false; };
    const wheel = event => {
      if (!interactive) return;
      event.preventDefault();
      zoom = Math.max(0.76, Math.min(1.32, zoom - event.deltaY * 0.00075));
    };
    const contextLost = event => {
      event.preventDefault();
      fail('O navegador pausou o 3D. Use o modo seguro ou recarregue o Closet.');
    };

    try {
      updateState({ status: 'loading', message: avatar.modelUrl ? 'Carregando modelo realista…' : 'Montando personagem premium…' });
      scene = new THREE.Scene();
      camera = new THREE.PerspectiveCamera(31, 1, 0.1, 100);
      camera.position.set(0, 1.45, 6.5);
      camera.lookAt(0, 1.2, 0);

      renderer = new THREE.WebGLRenderer({ alpha: false, antialias: profile.antialias, powerPreference: 'high-performance' });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, profile.pixelRatio));
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.12;
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      host.replaceChildren(renderer.domElement);
      renderer.domElement.addEventListener('webglcontextlost', contextLost, false);

      try {
        pmrem = new THREE.PMREMGenerator(renderer);
        const room = new RoomEnvironment();
        environmentTexture = pmrem.fromScene(room, 0.04).texture;
        room.dispose();
        scene.environment = environmentTexture;
      } catch (error) {
        console.warn('[Randers CRM] PBR ambiente simplificado:', error);
      }

      scene.add(new THREE.HemisphereLight('#f5fff9', '#092a20', 1.25));
      const key = new THREE.DirectionalLight('#fffaf0', 4.8);
      key.position.set(3.7, 6.6, 5.2);
      key.castShadow = true;
      key.shadow.mapSize.set(profile.shadows, profile.shadows);
      key.shadow.camera.near = 0.5;
      key.shadow.camera.far = 20;
      key.shadow.bias = -0.0002;
      scene.add(key);
      const fill = new THREE.DirectionalLight('#9dffd0', 1.6);
      fill.position.set(-4.5, 2.8, 3.4);
      scene.add(fill);
      const rim = new THREE.PointLight('#31ef98', 8, 12, 2);
      rim.position.set(-2.8, 3.1, -1.2);
      scene.add(rim);

      createStage(scene, avatar, profile);
      avatarRoot = new THREE.Group();
      avatarRoot.position.set(0, -0.02, 0.05);
      scene.add(avatarRoot);
      const fallback = createAvatarModel({ ...avatar, modelUrl: '' });
      avatarRoot.add(fallback);

      const resize = () => {
        if (disposed || !renderer) return;
        const width = Math.max(1, host.clientWidth);
        const height = Math.max(1, host.clientHeight);
        renderer.setSize(width, height, false);
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
      };
      resize();
      if ('ResizeObserver' in window) {
        resizeObserver = new ResizeObserver(resize);
        resizeObserver.observe(host);
      }
      if ('IntersectionObserver' in window) {
        intersectionObserver = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; }, { rootMargin: '160px' });
        intersectionObserver.observe(host);
      }

      renderer.domElement.addEventListener('pointerdown', pointerDown);
      renderer.domElement.addEventListener('pointermove', pointerMove);
      renderer.domElement.addEventListener('pointerup', pointerUp);
      renderer.domElement.addEventListener('pointercancel', pointerUp);
      renderer.domElement.addEventListener('wheel', wheel, { passive: false });

      if (validModelUrl(avatar.modelUrl)) {
        loadTimer = window.setTimeout(() => {
          updateState({ status: 'fallback', message: 'O modelo externo demorou. Mantivemos o avatar interno para não interromper o CRM.' });
        }, 14000);
        const loader = new GLTFLoader();
        loader.setCrossOrigin('anonymous');
        loader.load(
          avatar.modelUrl,
          gltf => {
            if (disposed) return;
            clearTimeout(loadTimer);
            while (avatarRoot.children.length) {
              const child = avatarRoot.children[0];
              avatarRoot.remove(child);
              disposeThreeObject(child);
            }
            const model = fitExternalModel(gltf.scene, 3.25);
            avatarRoot.add(model);
            if (gltf.animations?.length) {
              mixer = new THREE.AnimationMixer(model);
              const clip = gltf.animations.find(item => /idle|survey|stand|breath|walk/i.test(item.name)) || gltf.animations[0];
              mixer.clipAction(clip).reset().fadeIn(0.25).play();
            }
            updateState({ status: 'ready', message: 'Modelo realista carregado.' });
          },
          undefined,
          error => {
            clearTimeout(loadTimer);
            console.warn('[Randers CRM] Modelo GLB indisponível:', error);
            updateState({ status: 'fallback', message: 'O modelo externo falhou. O avatar premium interno continua ativo.' });
          },
        );
      } else {
        updateState({ status: avatar.modelUrl ? 'fallback' : 'ready', message: avatar.modelUrl ? 'URL de modelo inválida. O avatar interno foi mantido.' : 'Avatar premium pronto.' });
      }

      let previous = performance.now();
      const animate = time => {
        if (disposed) return;
        const delta = Math.min(0.05, (time - previous) / 1000);
        previous = time;
        if (visible) {
          mixer?.update(delta);
          avatarRoot.rotation.y = rotationY + (!dragging ? Math.sin(time * 0.00032) * 0.035 : 0);
          avatarRoot.rotation.x = rotationX;
          avatarRoot.scale.setScalar(zoom);
          avatarRoot.position.y = -0.02 + Math.sin(time * 0.0018) * 0.012;
          renderer.render(scene, camera);
        }
        frame = requestAnimationFrame(animate);
      };
      frame = requestAnimationFrame(animate);
    } catch (error) {
      fail('Não foi possível iniciar o estúdio 3D neste dispositivo. O restante do CRM continua protegido.', error);
    }

    return cleanup;
  }, [dependencyKey, interactive]);

  return <div className={`avatar-stage-3d status-${state.status}`}>
    <div ref={hostRef} className="avatar-stage-canvas"/>
    {state.status === 'loading' && <div className="avatar-stage-message"><i/><strong>{state.message}</strong></div>}
    {state.status === 'fallback' && <div className="avatar-stage-notice">{state.message}</div>}
    {state.status === 'error' && <div className="avatar-stage-error"><img src="/brain.svg" alt="Randers CRM"/><strong>Modo 3D indisponível</strong><span>{state.message}</span><button type="button" onClick={() => window.location.reload()}>Recarregar módulo</button></div>}
  </div>;
}
