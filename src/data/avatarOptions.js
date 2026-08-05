export const modelCatalog = [
  {
    id: 'model-human-animated',
    label: 'Humano animado',
    kind: 'model',
    family: 'human',
    modelUrl: 'https://cdn.jsdelivr.net/gh/KhronosGroup/glTF-Sample-Assets@main/Models/CesiumMan/glTF-Binary/CesiumMan.glb',
    credit: 'Cesium Man · CC BY 4.0',
  },
  {
    id: 'model-fox-animated',
    label: 'Raposa animada',
    kind: 'model',
    family: 'animal',
    modelUrl: 'https://cdn.jsdelivr.net/gh/KhronosGroup/glTF-Sample-Assets@main/Models/Fox/glTF-Binary/Fox.glb',
    credit: 'Fox · CC0 / CC BY 4.0',
  },
];

export const characters = [
  { id: 'human-male', label: 'Humano masculino', kind: 'human', gender: 'male' },
  { id: 'human-female', label: 'Humano feminino', kind: 'human', gender: 'female' },
  { id: 'human-male-curly', label: 'Humano cacheado', kind: 'human', gender: 'male' },
  { id: 'human-female-braids', label: 'Humana com tranças', kind: 'human', gender: 'female' },
  { id: 'cat', label: 'Gato', kind: 'animal' },
  { id: 'dog', label: 'Cachorro', kind: 'animal' },
  { id: 'fox', label: 'Raposa', kind: 'animal' },
  { id: 'panda', label: 'Panda', kind: 'animal' },
  { id: 'dragon', label: 'Dragão', kind: 'creature' },
  { id: 'alien', label: 'Alien', kind: 'creature' },
  { id: 'robot', label: 'Robô', kind: 'creature' },
  ...modelCatalog,
];

export const skinTones = ['#f8d8c2', '#efc3a5', '#dfa77d', '#c98558', '#a65f3d', '#7d452f', '#542b20', '#2f1712'];
export const hairColors = ['#17110e', '#3b2418', '#69422e', '#a06a42', '#d5b67a', '#b54b2e', '#e6e0d8', '#6b3f91', '#1d529f', '#1c8f67'];
export const hairStyles = ['Sem cabelo', 'Clássico', 'Curto', 'Cacheado', 'Crespo', 'Topete', 'Raspado', 'Coque', 'Longo', 'Tranças', 'Dreadlocks', 'Moicano'];
export const faceShapes = ['Oval', 'Redondo', 'Quadrado', 'Alongado'];
export const eyeStyles = ['Natural', 'Grandes', 'Marcantes', 'Felinos'];
export const brows = ['Natural', 'Arqueada', 'Reta', 'Marcante'];
export const facialHair = ['Nenhum', 'Barba curta', 'Barba cheia', 'Bigode', 'Cavanhaque'];
export const outfits = [
  'Polo verde',
  'Polo branca',
  'Camisa preta',
  'Camisa areia',
  'Jaqueta premium',
  'Moletom verde',
  'Camisa social',
  'Look esportivo',
  'Uniforme VIP',
  'Look celebração',
  'Colete de campo',
  'Blazer verde',
  'Vestido verde',
  'Conjunto casual',
  'Jaqueta jeans',
  'Look executivo',
];
export const shirtSlogans = [
  'Sem frase',
  'I ♥ Boti',
  'I ♥ Malbec',
  'Time Boti',
  'Boti Lovers',
  'Meu ciclo, minha meta',
  'Conectar e realizar',
  'Orgulho de vender beleza',
];
export const accessories = ['Nenhum', 'Óculos', 'Boné', 'Headset', 'Crachá', 'Relógio', 'Brincos', 'Coroa', 'Viseira', 'Mochila', 'Colar', 'Tiara', 'Pulseira', 'Óculos premium', 'Boné do ciclo', 'Fone sem fio'];
export const shoes = ['Tênis branco', 'Tênis verde', 'Sapato social', 'Bota', 'Sneaker premium', 'Sapatilha', 'Coturno', 'Tênis casual', 'Salto verde'];
export const scenes = ['Loja Boti', 'Estúdio neon', 'Escritório', 'Pódio', 'Cidade noturna', 'Natureza', 'Fundo verde', 'Fundo branco', 'Campanha do ciclo', 'Loja premium'];
export const expressions = ['Feliz', 'Sorriso', 'Confiante', 'Apaixonado', 'Descolado', 'Determinado'];
export const poses = ['Em pé', 'Braços cruzados', 'Acenando', 'Comemorando', 'Confiante'];
export const qualityOptions = ['Automática', 'Alta', 'Equilibrada', 'Econômica'];
export const carColors = ['#0f8a55', '#ef3f78', '#2468d7', '#f59e0b', '#6d28d9', '#111827'];
export const carStyles = ['GT Verde', 'Sport Neon', 'Roadster', 'Hypercar'];

export const defaultAvatar = {
  character: 'human-male',
  characterKind: 'human',
  modelUrl: '',
  modelCredit: '',
  skin: skinTones[3],
  hairColor: hairColors[0],
  hairStyle: 'Topete',
  faceShape: 'Oval',
  eyeStyle: 'Natural',
  brow: 'Natural',
  facialHair: 'Barba curta',
  outfit: 'Polo verde',
  shirtSlogan: 'I ♥ Boti',
  accessory: 'Crachá',
  shoes: 'Tênis branco',
  scene: 'Loja Boti',
  expressionIndex: 0,
  pose: 'Braços cruzados',
  quality: 'Automática',
  carColor: carColors[0],
  carStyle: carStyles[0],
};

export const normalizeAvatarConfig = raw => {
  const source = { ...defaultAvatar, ...(raw || {}) };
  const legacyCharacters = {
    'male-classic': 'human-male',
    'female-classic': 'human-female',
    'male-curly': 'human-male-curly',
    'female-braids': 'human-female-braids',
    'male-bald': 'human-male',
    'female-curly': 'human-female',
    'realistic-man': 'human-male',
    'realistic-fox': 'fox',
  };
  const character = legacyCharacters[source.character] || source.character || 'human-male';
  const oldDemoModel = /KhronosGroup\/glTF-Sample-Assets.*\/(CesiumMan|Fox)\//i.test(source.modelUrl || '');
  const matched = characters.find(item => item.id === character);
  return {
    ...source,
    character,
    characterKind: matched?.kind || source.characterKind || (['cat', 'dog', 'fox', 'panda'].includes(character) ? 'animal' : ['dragon', 'alien', 'robot'].includes(character) ? 'creature' : 'human'),
    modelUrl: oldDemoModel ? '' : source.modelUrl,
    modelCredit: oldDemoModel ? '' : source.modelCredit,
  };
};
