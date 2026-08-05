import * as THREE from 'three';

const PI = Math.PI;
const isFemale = id => String(id || '').includes('female');

export const getAvatarKind = avatar => {
  const id = String(avatar?.character || 'human-male');
  if (id.startsWith('model-') || avatar?.modelUrl) return 'model';
  if (['cat', 'dog', 'fox', 'panda'].includes(id)) return 'animal';
  if (['dragon', 'alien', 'robot'].includes(id)) return 'creature';
  return 'human';
};

export const outfitColor = outfit => {
  const value = String(outfit || '').toLowerCase();
  if (value.includes('branca')) return '#f5f8f6';
  if (value.includes('preta')) return '#161c1a';
  if (value.includes('areia')) return '#c9b98f';
  if (value.includes('celebra')) return '#d9ad32';
  if (value.includes('jeans')) return '#3a6682';
  if (value.includes('social') || value.includes('executivo') || value.includes('blazer')) return '#0b3e2e';
  if (value.includes('esportivo')) return '#12a567';
  if (value.includes('premium') || value.includes('vip')) return '#063d2b';
  return '#087846';
};

export const shoeColor = shoes => {
  const value = String(shoes || '').toLowerCase();
  if (value.includes('verde')) return '#087846';
  if (value.includes('social') || value.includes('bota') || value.includes('coturno')) return '#201c19';
  if (value.includes('premium')) return '#e8ece9';
  return '#f8faf9';
};

const c = (value, fallback = '#ffffff') => new THREE.Color(value || fallback);
const physical = (value, options = {}) => new THREE.MeshPhysicalMaterial({
  color: c(value),
  roughness: 0.48,
  metalness: 0.02,
  clearcoat: 0.08,
  clearcoatRoughness: 0.45,
  ...options,
});
const standard = (value, options = {}) => new THREE.MeshStandardMaterial({
  color: c(value),
  roughness: 0.5,
  metalness: 0.02,
  ...options,
});

const addMesh = (parent, geometry, material, position = [0, 0, 0], rotation = [0, 0, 0], scale = [1, 1, 1]) => {
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(...position);
  mesh.rotation.set(...rotation);
  mesh.scale.set(...scale);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
};

const addGroup = (parent, position = [0, 0, 0], rotation = [0, 0, 0]) => {
  const group = new THREE.Group();
  group.position.set(...position);
  group.rotation.set(...rotation);
  parent.add(group);
  return group;
};

const addCapsule = (parent, radius, length, material, position, rotation = [0, 0, 0], scale = [1, 1, 1]) =>
  addMesh(parent, new THREE.CapsuleGeometry(radius, length, 10, 20), material, position, rotation, scale);

const createTextTexture = (text, { width = 1024, height = 420, foreground = '#073f2d', background = 'rgba(255,255,255,0.96)' } = {}) => {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = background;
  const radius = 56;
  ctx.beginPath();
  ctx.roundRect(12, 12, width - 24, height - 24, radius);
  ctx.fill();
  ctx.fillStyle = foreground;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `900 ${Math.max(68, Math.min(132, 880 / Math.max(5, String(text).length)))}px Inter, Arial, sans-serif`;
  ctx.fillText(text, width / 2, height / 2 + 4, width - 90);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  texture.needsUpdate = true;
  return texture;
};

const addShirtSlogan = (parent, slogan, position = [0, 1.28, 0.455], scale = [0.53, 0.22, 1]) => {
  if (!slogan || slogan === 'Sem frase') return null;
  const texture = createTextTexture(slogan);
  const material = new THREE.MeshBasicMaterial({ map: texture, transparent: true, alphaTest: 0.03, side: THREE.DoubleSide });
  const plane = addMesh(parent, new THREE.PlaneGeometry(1, 0.42), material, position, [0, 0, 0], scale);
  plane.userData.decalTexture = texture;
  return plane;
};

const createEye = (parent, x, y, z, style = 'Natural', irisColor = '#3e2417') => {
  const size = style === 'Grandes' ? 0.115 : style === 'Marcantes' ? 0.105 : 0.09;
  const white = addMesh(parent, new THREE.SphereGeometry(size, 24, 16), physical('#fffefb', { roughness: 0.16, clearcoat: 0.6 }), [x, y, z], [0, 0, 0], [1, 1.08, 0.6]);
  const iris = addMesh(parent, new THREE.SphereGeometry(size * 0.55, 20, 14), physical(irisColor, { roughness: 0.12, clearcoat: 0.7 }), [x, y, z + size * 0.52], [0, 0, 0], [1, 1, 0.52]);
  addMesh(parent, new THREE.SphereGeometry(size * 0.24, 18, 12), physical('#101513', { roughness: 0.08, clearcoat: 0.85 }), [x, y, z + size * 0.81], [0, 0, 0], [1, 1, 0.45]);
  addMesh(parent, new THREE.SphereGeometry(size * 0.08, 12, 8), new THREE.MeshBasicMaterial({ color: '#ffffff' }), [x - size * 0.13, y + size * 0.15, z + size * 0.97]);
  return { white, iris };
};

const addFace = (head, avatar, { y = 0, z = 0.43, scale = 1 } = {}) => {
  const spacing = avatar.eyeStyle === 'Felinos' ? 0.21 : 0.2;
  createEye(head, -spacing * scale, y + 0.08 * scale, z, avatar.eyeStyle);
  createEye(head, spacing * scale, y + 0.08 * scale, z, avatar.eyeStyle);

  const browMat = standard(avatar.hairColor || '#25170f', { roughness: 0.78 });
  const browAngle = avatar.brow === 'Arqueada' ? 0.18 : avatar.brow === 'Marcante' ? 0.08 : 0;
  [-1, 1].forEach(side => {
    const brow = addMesh(head, new THREE.CapsuleGeometry(0.021 * scale, 0.14 * scale, 5, 10), browMat, [side * spacing * scale, y + 0.245 * scale, z + 0.006], [0, 0, side * browAngle + PI / 2]);
    brow.scale.z = 0.55;
  });

  addMesh(head, new THREE.SphereGeometry(0.065 * scale, 18, 12), physical(avatar.skin || '#c98558', { roughness: 0.56 }), [0, y - 0.025 * scale, z + 0.085 * scale], [0, 0, 0], [0.75, 1.05, 0.65]);

  const expression = Number(avatar.expressionIndex || 0);
  const smile = expression === 5 ? -0.03 : expression === 2 ? 0.02 : 0.06;
  const mouth = new THREE.Mesh(
    new THREE.TorusGeometry(0.13 * scale, 0.018 * scale, 10, 30, PI),
    standard('#7b2d32', { roughness: 0.34 }),
  );
  mouth.position.set(0, y - 0.205 * scale, z + 0.06 * scale);
  mouth.rotation.set(expression === 5 ? 0 : PI, 0, 0);
  mouth.scale.y = 0.7 + smile;
  head.add(mouth);
  if (expression !== 5) {
    addMesh(head, new THREE.BoxGeometry(0.14 * scale, 0.022 * scale, 0.012), new THREE.MeshBasicMaterial({ color: '#fffdf8' }), [0, y - 0.17 * scale, z + 0.079 * scale]);
  }
};

const addHair = (head, avatar, female = false) => {
  const style = avatar.hairStyle || (female ? 'Longo' : 'Topete');
  if (style === 'Sem cabelo') return;
  const hair = physical(avatar.hairColor || '#18110e', { roughness: 0.76, clearcoat: 0.03 });
  const group = addGroup(head);
  const addLock = (x, y, z, sx, sy, sz, rotation = [0, 0, 0]) =>
    addMesh(group, new THREE.SphereGeometry(0.18, 18, 14), hair, [x, y, z], rotation, [sx, sy, sz]);

  if (style === 'Raspado') {
    addMesh(group, new THREE.SphereGeometry(0.49, 26, 18, 0, PI * 2, 0, PI / 2), hair, [0, 0.14, -0.02], [0, 0, 0], [1.02, 0.74, 0.98]);
    return;
  }
  if (style === 'Coque') {
    addMesh(group, new THREE.SphereGeometry(0.48, 26, 18, 0, PI * 2, 0, PI / 2), hair, [0, 0.15, -0.04], [0, 0, 0], [1.02, 0.88, 0.98]);
    addMesh(group, new THREE.SphereGeometry(0.24, 20, 14), hair, [0, 0.54, -0.12]);
    return;
  }
  if (['Longo', 'Tranças', 'Dreadlocks'].includes(style) || female) {
    addMesh(group, new THREE.SphereGeometry(0.5, 28, 20, 0, PI * 2, 0, PI / 2), hair, [0, 0.12, -0.03], [0, 0, 0], [1.04, 0.94, 1]);
    for (let i = -3; i <= 3; i += 1) {
      const strand = style === 'Tranças' || style === 'Dreadlocks';
      addLock(i * 0.13, -0.12 - Math.abs(i) * 0.012, -0.18, strand ? 0.34 : 0.52, strand ? 1.15 : 1.35, strand ? 0.34 : 0.56, [0.2, 0, i * 0.05]);
    }
    return;
  }
  const locks = style === 'Moicano' ? 5 : style === 'Cacheado' || style === 'Crespo' ? 11 : 8;
  for (let i = 0; i < locks; i += 1) {
    const t = locks === 1 ? 0 : i / (locks - 1);
    const x = (t - 0.5) * (style === 'Moicano' ? 0.2 : 0.78);
    const topBoost = style === 'Topete' ? 0.18 * (1 - t) : 0;
    const curl = style === 'Cacheado' || style === 'Crespo';
    addLock(x, 0.35 + topBoost - Math.abs(x) * 0.13, 0.02 - Math.abs(x) * 0.08, curl ? 1.05 : 1.2, curl ? 1.05 : 0.92, curl ? 1.05 : 0.85, [0, 0, -x * 0.5]);
  }
};

const addFacialHair = (head, avatar) => {
  const style = avatar.facialHair || 'Nenhum';
  if (style === 'Nenhum') return;
  const material = standard(avatar.hairColor || '#25170f', { roughness: 0.85 });
  if (style === 'Bigode') {
    addCapsule(head, 0.026, 0.11, material, [-0.06, -0.13, 0.44], [0, 0, PI / 2 + 0.18]);
    addCapsule(head, 0.026, 0.11, material, [0.06, -0.13, 0.44], [0, 0, PI / 2 - 0.18]);
    return;
  }
  const beard = addMesh(head, new THREE.SphereGeometry(0.38, 26, 16, 0, PI * 2, PI * 0.44, PI * 0.56), material, [0, -0.13, 0.02], [PI, 0, 0], [1, style === 'Barba cheia' ? 1.15 : 0.7, 0.94]);
  beard.position.z = 0.11;
  if (style === 'Cavanhaque') beard.scale.set(0.36, 0.8, 0.55);
};

const addAccessory = (root, avatar) => {
  const acc = avatar.accessory || 'Nenhum';
  if (acc === 'Nenhum') return;
  if (acc.includes('Óculos')) {
    const material = physical(acc.includes('premium') ? '#d7b45a' : '#1b2421', { metalness: 0.58, roughness: 0.22, clearcoat: 0.7 });
    [-0.2, 0.2].forEach(x => {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.145, 0.018, 10, 30), material);
      ring.position.set(x, 2.26, 0.53);
      root.add(ring);
    });
    addMesh(root, new THREE.BoxGeometry(0.12, 0.018, 0.018), material, [0, 2.26, 0.53]);
  }
  if (acc.includes('Boné') || acc === 'Viseira') {
    const cap = physical('#087846', { roughness: 0.54, clearcoat: 0.18 });
    addMesh(root, new THREE.SphereGeometry(0.49, 28, 18, 0, PI * 2, 0, PI / 2), cap, [0, 2.7, 0], [0, 0, 0], [1.02, 0.68, 1]);
    addMesh(root, new THREE.BoxGeometry(0.5, 0.055, 0.27), cap, [0.18, 2.63, 0.37], [0, -0.12, 0]);
  }
  if (acc === 'Headset' || acc.includes('Fone')) {
    const material = physical('#17231f', { metalness: 0.24, roughness: 0.24, clearcoat: 0.5 });
    const arc = new THREE.Mesh(new THREE.TorusGeometry(0.5, 0.035, 10, 30, PI), material);
    arc.position.set(0, 2.36, 0);
    arc.rotation.z = PI;
    root.add(arc);
    [-0.49, 0.49].forEach(x => addMesh(root, new THREE.CapsuleGeometry(0.08, 0.18, 8, 12), material, [x, 2.27, 0.02]));
  }
  if (acc === 'Crachá') {
    addMesh(root, new THREE.BoxGeometry(0.26, 0.34, 0.035), physical('#f7faf8', { roughness: 0.34, clearcoat: 0.3 }), [0.31, 1.1, 0.45]);
    addMesh(root, new THREE.BoxGeometry(0.025, 0.64, 0.018), standard('#0a7d4c'), [0.17, 1.53, 0.28], [0, 0, 0.34]);
  }
  if (acc === 'Relógio') addMesh(root, new THREE.BoxGeometry(0.13, 0.11, 0.075), physical('#121b18', { metalness: 0.62, roughness: 0.2, clearcoat: 0.8 }), [-0.58, 0.92, 0.18]);
  if (acc === 'Mochila') addMesh(root, new THREE.CapsuleGeometry(0.28, 0.54, 10, 18), physical('#075f3d', { roughness: 0.68 }), [0, 1.05, -0.42], [PI / 2, 0, 0], [1, 0.66, 1]);
  if (acc === 'Coroa') addMesh(root, new THREE.CylinderGeometry(0.26, 0.35, 0.25, 7), physical('#e6bd43', { metalness: 0.68, roughness: 0.25, clearcoat: 0.55 }), [0, 2.98, 0], [0, 0.2, 0]);
};

const createHuman = avatar => {
  const root = new THREE.Group();
  root.userData.avatarType = 'human';
  const female = isFemale(avatar.character);
  const skin = physical(avatar.skin || '#c98558', { roughness: 0.56, clearcoat: 0.05 });
  const shirt = physical(outfitColor(avatar.outfit), { roughness: 0.46, clearcoat: 0.12, sheen: 0.32, sheenColor: c('#b9f7d7') });
  const pants = physical(String(avatar.outfit || '').includes('casual') ? '#293a34' : '#1b2924', { roughness: 0.66 });
  const shoes = physical(shoeColor(avatar.shoes), { roughness: 0.28, clearcoat: 0.42 });

  const torso = addCapsule(root, female ? 0.41 : 0.46, 0.76, shirt, [0, 1.18, 0], [0, 0, 0], [female ? 0.98 : 1.08, 1, 0.72]);
  addMesh(root, new THREE.SphereGeometry(female ? 0.43 : 0.46, 34, 24), skin, [0, 2.32, 0], [0, 0, 0], [female ? 0.93 : 1, avatar.faceShape === 'Alongado' ? 1.12 : avatar.faceShape === 'Redondo' ? 0.96 : 1.03, 0.92]);
  addMesh(root, new THREE.CylinderGeometry(0.15, 0.18, 0.2, 20), skin, [0, 1.81, 0]);
  addMesh(root, new THREE.SphereGeometry(0.1, 18, 12), skin, [-0.45, 2.32, 0], [0, 0, 0], [0.65, 1, 0.55]);
  addMesh(root, new THREE.SphereGeometry(0.1, 18, 12), skin, [0.45, 2.32, 0], [0, 0, 0], [0.65, 1, 0.55]);
  addFace(root, avatar, { y: 2.33, z: 0.43, scale: 1 });
  const hairRoot = addGroup(root, [0, 2.32, 0]);
  addHair(hairRoot, avatar, female);
  addFacialHair(hairRoot, avatar);

  addShirtSlogan(root, avatar.shirtSlogan || 'I ♥ Boti');

  const pose = avatar.pose || 'Em pé';
  const arms = addGroup(root);
  const shoulderWidth = female ? 0.5 : 0.56;
  const addArm = (side, upperRot = 0, foreRot = 0, y = 1.35) => {
    const upper = addGroup(arms, [side * shoulderWidth, y, 0], [0, 0, upperRot]);
    addCapsule(upper, 0.105, 0.39, shirt, [0, -0.2, 0]);
    const fore = addGroup(upper, [0, -0.48, 0], [0, 0, foreRot]);
    addCapsule(fore, 0.09, 0.36, skin, [0, -0.18, 0]);
    addMesh(fore, new THREE.SphereGeometry(0.11, 18, 14), skin, [0, -0.45, 0]);
    return { upper, fore };
  };
  if (pose === 'Braços cruzados') {
    const left = addArm(-1, -0.7, -1.12, 1.45);
    const right = addArm(1, 0.7, 1.12, 1.45);
    left.upper.position.set(-0.42, 1.48, 0.1);
    right.upper.position.set(0.42, 1.48, 0.1);
  } else if (pose === 'Acenando') {
    addArm(-1, -0.1, 0.02, 1.42);
    const right = addArm(1, -2.25, 0.1, 1.58);
    right.upper.position.set(0.56, 1.68, 0);
  } else if (pose === 'Comemorando') {
    addArm(-1, 2.22, 0.02, 1.62);
    addArm(1, -2.22, -0.02, 1.62);
  } else if (pose === 'Confiante') {
    addArm(-1, -0.25, -0.55, 1.4);
    addArm(1, 0.25, 0.55, 1.4);
  } else {
    addArm(-1, -0.08, 0.02, 1.4);
    addArm(1, 0.08, -0.02, 1.4);
  }

  addCapsule(root, 0.16, 0.72, pants, [-0.23, 0.18, 0]);
  addCapsule(root, 0.16, 0.72, pants, [0.23, 0.18, 0]);
  addMesh(root, new THREE.BoxGeometry(0.38, 0.19, 0.6), shoes, [-0.23, -0.44, 0.12], [0, 0, 0], [1, 1, 1]);
  addMesh(root, new THREE.BoxGeometry(0.38, 0.19, 0.6), shoes, [0.23, -0.44, 0.12], [0, 0, 0], [1, 1, 1]);
  addAccessory(root, avatar);
  torso.userData.bodyAnchor = true;
  return root;
};

const animalPalette = {
  cat: ['#9aa1a2', '#e3e5e1'],
  dog: ['#a66d43', '#f0dfc5'],
  fox: ['#d86b31', '#f3e3d0'],
  panda: ['#f0f1ee', '#1c2421'],
};

const createAnimal = avatar => {
  const root = createHuman({ ...avatar, character: 'human-male', facialHair: 'Nenhum', hairStyle: 'Sem cabelo' });
  const headParts = [];
  root.traverse(node => {
    if (node.isMesh && node.position.y > 1.78) headParts.push(node);
  });
  headParts.forEach(node => node.parent?.remove(node));
  const [base, accent] = animalPalette[avatar.character] || animalPalette.cat;
  const fur = physical(base, { roughness: 0.74, sheen: 0.42, sheenColor: c(accent) });
  const light = physical(accent, { roughness: 0.7 });
  addMesh(root, new THREE.SphereGeometry(0.5, 34, 24), fur, [0, 2.32, 0], [0, 0, 0], [1, 1.04, 0.94]);
  const ear = new THREE.ConeGeometry(0.2, 0.43, 4);
  addMesh(root, ear, fur, [-0.33, 2.74, -0.02], [0, 0, -0.12]);
  addMesh(root, ear, fur, [0.33, 2.74, -0.02], [0, 0, 0.12]);
  if (avatar.character === 'dog') {
    addMesh(root, new THREE.CapsuleGeometry(0.14, 0.3, 8, 14), fur, [-0.43, 2.48, -0.03], [0, 0, 0.35]);
    addMesh(root, new THREE.CapsuleGeometry(0.14, 0.3, 8, 14), fur, [0.43, 2.48, -0.03], [0, 0, -0.35]);
  }
  if (avatar.character === 'panda') {
    addMesh(root, new THREE.SphereGeometry(0.19, 20, 14), physical('#1c2421', { roughness: 0.72 }), [-0.36, 2.61, 0]);
    addMesh(root, new THREE.SphereGeometry(0.19, 20, 14), physical('#1c2421', { roughness: 0.72 }), [0.36, 2.61, 0]);
    addMesh(root, new THREE.SphereGeometry(0.16, 20, 14), physical('#1c2421', { roughness: 0.72 }), [-0.2, 2.36, 0.4], [0, 0, 0], [1.1, 1.4, 0.5]);
    addMesh(root, new THREE.SphereGeometry(0.16, 20, 14), physical('#1c2421', { roughness: 0.72 }), [0.2, 2.36, 0.4], [0, 0, 0], [1.1, 1.4, 0.5]);
  }
  createEye(root, -0.2, 2.38, 0.44, avatar.eyeStyle, '#3c8b57');
  createEye(root, 0.2, 2.38, 0.44, avatar.eyeStyle, '#3c8b57');
  addMesh(root, new THREE.SphereGeometry(0.1, 20, 14), physical('#1a211e', { roughness: 0.3, clearcoat: 0.6 }), [0, 2.17, 0.5], [0, 0, 0], [1.05, 0.72, 0.65]);
  addMesh(root, new THREE.SphereGeometry(0.22, 22, 16), light, [0, 2.14, 0.32], [0, 0, 0], [1, 0.68, 0.8]);
  const tail = addCapsule(root, 0.12, 0.62, fur, [0.42, 0.9, -0.36], [0.2, 0, -0.55], [1, 1.2, 1]);
  tail.castShadow = true;
  return root;
};

const createCreature = avatar => {
  if (avatar.character === 'robot') {
    const root = new THREE.Group();
    const metal = physical('#91a9a1', { metalness: 0.7, roughness: 0.2, clearcoat: 0.72 });
    const dark = physical('#16241f', { metalness: 0.55, roughness: 0.28 });
    addMesh(root, new THREE.BoxGeometry(0.88, 0.72, 0.62), metal, [0, 2.26, 0]);
    addMesh(root, new THREE.BoxGeometry(0.64, 0.22, 0.03), new THREE.MeshStandardMaterial({ color: '#09291f', emissive: '#19f29a', emissiveIntensity: 1.2 }), [0, 2.29, 0.33]);
    addMesh(root, new THREE.CapsuleGeometry(0.43, 0.72, 10, 18), physical(outfitColor(avatar.outfit), { metalness: 0.18, roughness: 0.36 }), [0, 1.14, 0]);
    [-0.57, 0.57].forEach(x => addCapsule(root, 0.105, 0.72, metal, [x, 1.18, 0]));
    [-0.23, 0.23].forEach(x => addCapsule(root, 0.15, 0.7, dark, [x, 0.18, 0]));
    [-0.23, 0.23].forEach(x => addMesh(root, new THREE.BoxGeometry(0.38, 0.18, 0.58), dark, [x, -0.43, 0.12]));
    addShirtSlogan(root, avatar.shirtSlogan || 'Time Boti');
    addAccessory(root, avatar);
    return root;
  }

  const base = avatar.character === 'alien' ? '#7654b5' : '#37a86e';
  const root = createHuman({ ...avatar, character: 'human-male', skin: base, facialHair: 'Nenhum', hairStyle: 'Sem cabelo' });
  const headParts = [];
  root.traverse(node => { if (node.isMesh && node.position.y > 1.78) headParts.push(node); });
  headParts.forEach(node => node.parent?.remove(node));
  const skin = physical(base, { roughness: 0.46, clearcoat: avatar.character === 'alien' ? 0.28 : 0.08 });
  if (avatar.character === 'alien') {
    addMesh(root, new THREE.SphereGeometry(0.58, 36, 26), skin, [0, 2.32, 0], [0, 0, 0], [1, 1.18, 0.82]);
    createEye(root, -0.22, 2.36, 0.43, 'Grandes', '#121515');
    createEye(root, 0.22, 2.36, 0.43, 'Grandes', '#121515');
    addMesh(root, new THREE.CapsuleGeometry(0.018, 0.11, 5, 10), standard('#3a214f'), [0, 2.05, 0.45], [0, 0, PI / 2]);
  } else {
    addMesh(root, new THREE.SphereGeometry(0.49, 34, 24), skin, [0, 2.32, 0], [0, 0, 0], [1, 1.04, 0.94]);
    const horn = new THREE.ConeGeometry(0.12, 0.42, 12);
    addMesh(root, horn, physical('#e8c34e', { metalness: 0.12, roughness: 0.48 }), [-0.27, 2.75, -0.02], [0, 0, -0.18]);
    addMesh(root, horn, physical('#e8c34e', { metalness: 0.12, roughness: 0.48 }), [0.27, 2.75, -0.02], [0, 0, 0.18]);
    createEye(root, -0.2, 2.38, 0.44, avatar.eyeStyle, '#f3c845');
    createEye(root, 0.2, 2.38, 0.44, avatar.eyeStyle, '#f3c845');
    addMesh(root, new THREE.ConeGeometry(0.35, 0.9, 5), skin, [0, 1.15, -0.48], [PI / 2, 0, 0]);
    const wingMaterial = physical('#2b8d5b', { roughness: 0.58, side: THREE.DoubleSide, transparent: true, opacity: 0.94 });
    const wingGeometry = new THREE.BufferGeometry();
    wingGeometry.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0, -0.72, 0.52, -0.1, -0.42, -0.42, 0.05], 3));
    wingGeometry.setIndex([0, 1, 2]);
    wingGeometry.computeVertexNormals();
    addMesh(root, wingGeometry, wingMaterial, [-0.35, 1.45, -0.34], [0.05, 0.12, 0]);
    addMesh(root, wingGeometry.clone(), wingMaterial.clone(), [0.35, 1.45, -0.34], [0.05, PI - 0.12, 0]);
  }
  return root;
};

export const createAvatarModel = avatar => {
  const kind = getAvatarKind(avatar);
  const config = { ...avatar };
  const root = kind === 'animal' ? createAnimal(config) : kind === 'creature' ? createCreature(config) : createHuman(config);
  root.position.y = 0.42;
  root.userData.kind = kind;
  return root;
};

export const createDriverBust = avatar => {
  const group = new THREE.Group();
  const kind = getAvatarKind(avatar);
  const skinColor = kind === 'animal' ? (animalPalette[avatar?.character]?.[0] || '#9aa1a2') : kind === 'creature' ? (avatar?.character === 'alien' ? '#7654b5' : avatar?.character === 'robot' ? '#91a9a1' : '#37a86e') : (avatar?.skin || '#c98558');
  const head = addMesh(group, new THREE.SphereGeometry(0.18, 24, 18), physical(skinColor, { roughness: 0.48 }), [0, 0.22, 0], [0, 0, 0], [1, 1.06, 0.92]);
  if (kind === 'human') {
    const hair = physical(avatar?.hairColor || '#17110e', { roughness: 0.78 });
    addMesh(group, new THREE.SphereGeometry(0.19, 24, 16, 0, PI * 2, 0, PI / 2), hair, [0, 0.31, -0.01], [0, 0, 0], [1, 0.75, 0.98]);
  }
  if (kind === 'animal') {
    const ear = new THREE.ConeGeometry(0.075, 0.15, 4);
    addMesh(group, ear, head.material, [-0.12, 0.42, -0.01]);
    addMesh(group, ear, head.material, [0.12, 0.42, -0.01]);
  }
  addMesh(group, new THREE.CapsuleGeometry(0.15, 0.18, 8, 14), physical(outfitColor(avatar?.outfit), { roughness: 0.46 }), [0, -0.03, 0], [0, 0, 0], [1.2, 1, 0.8]);
  return group;
};

export const disposeThreeObject = object => {
  if (!object) return;
  object.traverse?.(node => {
    node.geometry?.dispose?.();
    const materials = Array.isArray(node.material) ? node.material : node.material ? [node.material] : [];
    materials.forEach(material => {
      ['map', 'normalMap', 'roughnessMap', 'metalnessMap', 'emissiveMap', 'aoMap', 'alphaMap', 'envMap'].forEach(key => material[key]?.dispose?.());
      material.dispose?.();
    });
  });
  object.clear?.();
};

export const fitExternalModel = (object, targetHeight = 3.25) => {
  const box = new THREE.Box3().setFromObject(object);
  const size = box.getSize(new THREE.Vector3());
  const scale = targetHeight / Math.max(size.y, 0.001);
  object.scale.setScalar(scale);
  const scaledBox = new THREE.Box3().setFromObject(object);
  const center = scaledBox.getCenter(new THREE.Vector3());
  object.position.x -= center.x;
  object.position.z -= center.z;
  object.position.y -= scaledBox.min.y - 0.02;
  object.traverse(node => {
    if (!node.isMesh) return;
    node.castShadow = true;
    node.receiveShadow = true;
    const materials = Array.isArray(node.material) ? node.material : node.material ? [node.material] : [];
    materials.forEach(material => {
      if ('roughness' in material) material.roughness = Math.min(0.78, material.roughness ?? 0.5);
      material.needsUpdate = true;
    });
  });
  return object;
};
