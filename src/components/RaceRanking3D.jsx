import React, { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { carColors, defaultAvatar } from '../data/avatarOptions';
import { createDriverBust, disposeThreeObject } from '../three/avatarFactory';
import AvatarPreview from './AvatarPreview';

const makeMaterial = (color, options = {}) => new THREE.MeshPhysicalMaterial({
  color: new THREE.Color(color),
  roughness: 0.25,
  metalness: 0.45,
  clearcoat: 0.85,
  clearcoatRoughness: 0.14,
  ...options,
});

const mesh = (parent, geometry, material, position = [0, 0, 0], rotation = [0, 0, 0], scale = [1, 1, 1]) => {
  const item = new THREE.Mesh(geometry, material);
  item.position.set(...position);
  item.rotation.set(...rotation);
  item.scale.set(...scale);
  item.castShadow = true;
  item.receiveShadow = true;
  parent.add(item);
  return item;
};

const createWheel = (parent, x, z) => {
  const tire = makeMaterial('#090c0b', { roughness: 0.48, metalness: 0.08, clearcoat: 0.22 });
  const rim = makeMaterial('#d8dfdc', { roughness: 0.16, metalness: 0.88, clearcoat: 0.7 });
  const wheel = new THREE.Group();
  wheel.position.set(x, 0.18, z);
  const tireMesh = mesh(wheel, new THREE.TorusGeometry(0.24, 0.095, 14, 28), tire, [0, 0, 0], [Math.PI / 2, 0, 0]);
  mesh(wheel, new THREE.CylinderGeometry(0.13, 0.13, 0.06, 24), rim, [0, 0, 0], [Math.PI / 2, 0, 0]);
  tireMesh.userData.isWheel = true;
  parent.add(wheel);
  return wheel;
};

const createSportsCar = (entry, color, index) => {
  const car = new THREE.Group();
  car.userData.entry = entry;
  const paint = makeMaterial(color, { roughness: 0.18, metalness: 0.58, clearcoat: 1, clearcoatRoughness: 0.08 });
  const dark = makeMaterial('#101715', { roughness: 0.32, metalness: 0.35, clearcoat: 0.45 });
  const glass = new THREE.MeshPhysicalMaterial({ color: '#8edbc6', transparent: true, opacity: 0.48, transmission: 0.25, roughness: 0.08, metalness: 0.04, clearcoat: 1 });
  const light = new THREE.MeshStandardMaterial({ color: '#f8fff9', emissive: '#d7fff0', emissiveIntensity: 2.6, roughness: 0.15 });
  const tailLight = new THREE.MeshStandardMaterial({ color: '#ff315b', emissive: '#ff1f4f', emissiveIntensity: 2.3, roughness: 0.18 });

  mesh(car, new THREE.BoxGeometry(2.35, 0.42, 1.08), paint, [0, 0.42, 0], [0, 0, 0], [1, 1, 1]);
  mesh(car, new THREE.BoxGeometry(1.05, 0.28, 0.92), paint, [0.55, 0.69, 0], [0, 0, -0.08]);
  mesh(car, new THREE.BoxGeometry(0.95, 0.34, 0.82), glass, [-0.35, 0.74, 0], [0, 0, 0.04]);
  mesh(car, new THREE.BoxGeometry(0.9, 0.12, 1.2), dark, [-0.88, 0.32, 0]);
  mesh(car, new THREE.BoxGeometry(0.55, 0.08, 1.2), dark, [-1.12, 0.65, 0]);
  mesh(car, new THREE.BoxGeometry(0.07, 0.18, 0.28), light, [1.2, 0.48, -0.37]);
  mesh(car, new THREE.BoxGeometry(0.07, 0.18, 0.28), light, [1.2, 0.48, 0.37]);
  mesh(car, new THREE.BoxGeometry(0.07, 0.14, 0.3), tailLight, [-1.2, 0.45, -0.36]);
  mesh(car, new THREE.BoxGeometry(0.07, 0.14, 0.3), tailLight, [-1.2, 0.45, 0.36]);
  mesh(car, new THREE.BoxGeometry(0.8, 0.08, 0.06), dark, [-1.2, 0.82, 0]);
  mesh(car, new THREE.BoxGeometry(0.08, 0.26, 0.06), dark, [-1.15, 0.7, -0.28]);
  mesh(car, new THREE.BoxGeometry(0.08, 0.26, 0.06), dark, [-1.15, 0.7, 0.28]);

  const wheels = [createWheel(car, -0.73, -0.56), createWheel(car, -0.73, 0.56), createWheel(car, 0.76, -0.56), createWheel(car, 0.76, 0.56)];
  car.userData.wheels = wheels;

  const driver = createDriverBust({ ...defaultAvatar, ...(entry.avatarConfig || {}) });
  driver.scale.setScalar(0.72);
  driver.position.set(-0.36, 0.98, 0);
  driver.rotation.y = Math.PI / 2;
  car.add(driver);

  const numberTexture = document.createElement('canvas');
  numberTexture.width = 256;
  numberTexture.height = 128;
  const ctx = numberTexture.getContext('2d');
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.roundRect(8, 8, 240, 112, 26);
  ctx.fill();
  ctx.fillStyle = '#075c3c';
  ctx.font = '900 72px Inter, Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(String(index + 1), 128, 68);
  const texture = new THREE.CanvasTexture(numberTexture);
  texture.colorSpace = THREE.SRGBColorSpace;
  const plate = mesh(car, new THREE.PlaneGeometry(0.5, 0.25), new THREE.MeshBasicMaterial({ map: texture, transparent: true }), [0.16, 0.52, -0.548], [-Math.PI / 2, 0, 0]);
  plate.userData.texture = texture;

  car.rotation.y = -Math.PI / 2;
  car.scale.setScalar(0.78);
  return car;
};

export default function RaceRanking3D({ ranking = [] }) {
  const top = useMemo(() => ranking.slice(0, 5), [ranking]);
  const hostRef = useRef(null);
  const [status, setStatus] = useState('loading');

  useEffect(() => {
    const host = hostRef.current;
    if (!host || top.length === 0) {
      setStatus('empty');
      return undefined;
    }

    let renderer;
    let scene;
    let camera;
    let frame = 0;
    let resizeObserver;
    let intersectionObserver;
    let visible = true;
    let disposed = false;
    let pmrem;
    let environmentTexture;
    const cars = [];
    const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

    const cleanup = () => {
      disposed = true;
      cancelAnimationFrame(frame);
      resizeObserver?.disconnect?.();
      intersectionObserver?.disconnect?.();
      if (scene) disposeThreeObject(scene);
      environmentTexture?.dispose?.();
      pmrem?.dispose?.();
      renderer?.dispose?.();
      renderer?.forceContextLoss?.();
      host.replaceChildren();
    };

    try {
      scene = new THREE.Scene();
      scene.background = new THREE.Color('#07130f');
      scene.fog = new THREE.FogExp2('#07130f', 0.025);
      camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
      camera.position.set(0, 8.4, 11.8);
      camera.lookAt(0, 0.35, 0);

      renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.45));
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.05;
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      host.replaceChildren(renderer.domElement);

      try {
        pmrem = new THREE.PMREMGenerator(renderer);
        const room = new RoomEnvironment();
        environmentTexture = pmrem.fromScene(room, 0.04).texture;
        room.dispose();
        scene.environment = environmentTexture;
      } catch (error) {
        console.warn('[Randers CRM] Ambiente PBR da corrida simplificado:', error);
      }

      scene.add(new THREE.HemisphereLight('#effff7', '#062018', 1.25));
      const key = new THREE.DirectionalLight('#fff8e8', 4.4);
      key.position.set(5, 9, 5);
      key.castShadow = true;
      key.shadow.mapSize.set(1536, 1536);
      scene.add(key);
      const green = new THREE.PointLight('#34f49a', 8, 18, 2);
      green.position.set(-5, 3.5, 2);
      scene.add(green);
      const pink = new THREE.PointLight('#ff4e91', 5, 16, 2);
      pink.position.set(5, 2.5, -3);
      scene.add(pink);

      const road = mesh(scene, new THREE.BoxGeometry(14, 0.24, 7.3), new THREE.MeshPhysicalMaterial({ color: '#1b2320', roughness: 0.65, metalness: 0.02 }), [0, -0.18, 0]);
      road.receiveShadow = true;
      for (let lane = 1; lane < top.length; lane += 1) {
        const z = -3 + lane * (6 / Math.max(top.length - 1, 1)) - (6 / Math.max(top.length - 1, 1)) / 2;
        for (let x = -6; x <= 6; x += 1.1) {
          mesh(scene, new THREE.BoxGeometry(0.56, 0.012, 0.035), new THREE.MeshBasicMaterial({ color: '#dfe7e3' }), [x, -0.045, z]);
        }
      }
      [-3.58, 3.58].forEach(z => {
        mesh(scene, new THREE.BoxGeometry(14, 0.28, 0.16), new THREE.MeshStandardMaterial({ color: '#0f8a55', emissive: '#0f8a55', emissiveIntensity: 0.65 }), [0, 0.05, z]);
      });
      for (let x = -6.3; x < 6.4; x += 0.7) {
        mesh(scene, new THREE.BoxGeometry(0.32, 0.015, 7.1), new THREE.MeshBasicMaterial({ color: x % 1.4 < 0.4 ? '#ffffff' : '#169760' }), [x, -0.04, 0]);
      }

      const maxPoints = Math.max(...top.map(item => Number(item.points || 0)), 1);
      top.forEach((entry, index) => {
        const car = createSportsCar(entry, entry.avatarConfig?.carColor || carColors[index % carColors.length], index);
        const laneZ = top.length === 1 ? 0 : -2.7 + index * (5.4 / (top.length - 1));
        const targetX = -4.3 + (Number(entry.points || 0) / maxPoints) * 8.1;
        car.position.set(targetX, 0.06, laneZ);
        car.userData.baseX = targetX;
        car.userData.laneZ = laneZ;
        scene.add(car);
        cars.push(car);
      });

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
        intersectionObserver = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; }, { rootMargin: '150px' });
        intersectionObserver.observe(host);
      }

      setStatus('ready');
      const animate = time => {
        if (disposed) return;
        if (visible) {
          cars.forEach((car, index) => {
            const motion = reduceMotion ? 0 : Math.sin(time * 0.0012 + index * 1.7) * 0.1;
            car.position.x = car.userData.baseX + motion;
            car.position.y = 0.06 + (reduceMotion ? 0 : Math.sin(time * 0.003 + index) * 0.012);
            car.userData.wheels?.forEach(wheel => { wheel.rotation.z = reduceMotion ? 0 : -time * 0.003; });
          });
          renderer.render(scene, camera);
        }
        frame = requestAnimationFrame(animate);
      };
      frame = requestAnimationFrame(animate);
    } catch (error) {
      console.error('[Randers CRM] Corrida 3D:', error);
      setStatus('error');
    }

    return cleanup;
  }, [top]);

  if (top.length === 0) return <div className="race-empty">O ranking aparecerá quando houver colaboradores ativos.</div>;

  return <div className={`race-ranking-3d status-${status}`}>
    <div className="race-header-overlay"><span>🏁 Corrida de performance</span><small>Posição dos carros baseada nos pontos reais</small></div>
    <div ref={hostRef} className="race-canvas"/>
    {status === 'loading' && <div className="race-loading"><i/>Preparando a pista 3D…</div>}
    {status === 'error' && <div className="race-fallback"><strong>Modo 3D indisponível</strong><span>O ranking tradicional continua funcionando abaixo.</span></div>}
    <div className="race-drivers">
      {top.map((entry, index) => <div key={entry.id} className="race-driver-card" style={{ '--race-color': entry.avatarConfig?.carColor || carColors[index % carColors.length] }}>
        <span className="race-position">{index + 1}º</span>
        <AvatarPreview compact avatar={entry.avatarConfig}/>
        <div><strong>{entry.nome}</strong><small>{entry.points} pts · {entry.carteira}</small></div>
      </div>)}
    </div>
  </div>;
}
