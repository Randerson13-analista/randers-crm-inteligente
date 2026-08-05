import React, { useMemo, useState } from 'react';
import { Camera, Coins, RotateCcw, Save, Search, Shuffle, Star } from 'lucide-react';
import AvatarPreview from './AvatarPreview';
import {
  accessories,
  brows,
  characters,
  defaultAvatar,
  eyeStyles,
  faceShapes,
  facialHair,
  hairColors,
  hairStyles,
  modelCatalog,
  outfits,
  poses,
  qualityOptions,
  scenes,
  shirtSlogans,
  shoes,
  skinTones,
  normalizeAvatarConfig,
} from '../data/avatarOptions';

const tabs = ['Personagem', 'Rosto', 'Cabelo', 'Roupas', 'Acessórios', 'Calçados', 'Cenário'];
const expressions = ['😀', '😄', '😊', '😍', '😎', '😤'];
const quickAccessories = [
  ['Boné', '🧢'],
  ['Óculos', '👓'],
  ['Headset', '🎧'],
  ['Relógio', '⌚'],
  ['Crachá', '🪪'],
  ['Mochila', '🎒'],
];

const pick = values => values[Math.floor(Math.random() * values.length)];
const normalizedCharacter = character => characters.find(item => item.id === character) || characters[0];

export default function Closet({ initialAvatar, onSave, coins = 0 }) {
  const [tab, setTab] = useState('Personagem');
  const [avatar, setAvatar] = useState(() => normalizeAvatarConfig(initialAvatar));
  const [query, setQuery] = useState('');
  const [saving, setSaving] = useState(false);
  const [savedLooks, setSavedLooks] = useState(() => [
    { ...defaultAvatar, outfit: 'Polo verde', shirtSlogan: 'I ♥ Boti', accessory: 'Crachá', pose: 'Braços cruzados' },
    { ...defaultAvatar, outfit: 'Look esportivo', shirtSlogan: 'Time Boti', accessory: 'Boné', pose: 'Confiante' },
    { ...defaultAvatar, character: 'human-female', outfit: 'Jaqueta premium', shirtSlogan: 'Boti Lovers', accessory: 'Óculos premium', pose: 'Em pé' },
  ]);

  const update = (key, value) => setAvatar(current => ({ ...current, [key]: value }));
  const character = normalizedCharacter(avatar.character);
  const progress = useMemo(() => Math.round((Object.values(avatar).filter(Boolean).length / Object.keys(defaultAvatar).length) * 100), [avatar]);
  const filtered = values => values.filter(value => {
    const label = typeof value === 'string' ? value : value.label;
    return String(label).toLowerCase().includes(query.toLowerCase());
  });

  const selectCharacter = item => {
    setAvatar(current => ({
      ...current,
      character: item.id,
      characterKind: item.kind,
      modelUrl: item.modelUrl || '',
      modelCredit: item.credit || '',
    }));
  };

  const randomize = () => {
    const chosen = pick(characters.filter(item => item.kind !== 'model'));
    setAvatar({
      ...defaultAvatar,
      character: chosen.id,
      characterKind: chosen.kind,
      skin: pick(skinTones),
      hairColor: pick(hairColors),
      hairStyle: pick(hairStyles),
      faceShape: pick(faceShapes),
      eyeStyle: pick(eyeStyles),
      brow: pick(brows),
      facialHair: chosen.kind === 'human' ? pick(facialHair) : 'Nenhum',
      outfit: pick(outfits),
      shirtSlogan: pick(shirtSlogans),
      accessory: pick(accessories),
      shoes: pick(shoes),
      scene: pick(scenes),
      pose: pick(poses),
      expressionIndex: Math.floor(Math.random() * expressions.length),
    });
  };

  const save = async () => {
    setSaving(true);
    try {
      await onSave?.(avatar);
    } finally {
      setSaving(false);
    }
  };

  const resetSafe = () => setAvatar({ ...defaultAvatar, modelUrl: '', modelCredit: '', character: 'human-male', characterKind: 'human' });
  const addLook = () => setSavedLooks(current => [{ ...avatar }, ...current].slice(0, 6));

  const optionCards = (items, key, mode = 'avatar') => <div className="studio-option-grid">
    {filtered(items).map(item => {
      const value = typeof item === 'string' ? item : item.id;
      const label = typeof item === 'string' ? item : item.label;
      const selected = avatar[key] === value;
      const previewAvatar = key === 'character'
        ? { ...avatar, character: value, characterKind: item.kind, modelUrl: item.modelUrl || '', modelCredit: item.credit || '' }
        : { ...avatar, [key]: value };
      return <button
        type="button"
        key={value}
        className={`studio-option-card ${selected ? 'active' : ''}`}
        onClick={() => key === 'character' ? selectCharacter(item) : update(key, value)}
      >
        {mode === 'avatar' ? <AvatarPreview compact avatar={previewAvatar}/> : <span className="studio-text-preview">{String(label).slice(0, 3).toUpperCase()}</span>}
        <strong>{label}</strong>
        {key === 'character' && <small>{item.kind === 'model' ? 'GLB animado' : item.kind === 'human' ? 'Humano' : item.kind === 'animal' ? 'Animal' : 'Criatura'}</small>}
      </button>;
    })}
  </div>;

  return <section className="avatar-studio-page">
    <div className="avatar-studio-heading">
      <div>
        <span className="studio-eyebrow">Avatar Studio</span>
        <h2>Meu Closet Boti</h2>
        <p>Personalize personagem, roupa, frase, acessórios e cenário em um único estúdio 3D.</p>
      </div>
      <div className="studio-heading-actions">
        <span className="studio-coins"><Coins size={17}/>{coins} moedas</span>
        <button type="button" className="primary" onClick={save} disabled={saving}><Save size={17}/>{saving ? 'Salvando…' : 'Salvar avatar'}</button>
      </div>
    </div>

    <div className="avatar-studio-grid">
      <article className="avatar-stage-card">
        <div className="avatar-stage-toolbar">
          <button type="button" onClick={randomize}><Shuffle size={18}/><span>Aleatório</span></button>
          <button type="button" onClick={() => window.print()}><Camera size={18}/><span>Foto</span></button>
          <button type="button" onClick={() => update('pose', pick(poses))}><Star size={18}/><span>Pose</span></button>
          <button type="button" onClick={() => update('scene', pick(scenes))}><Camera size={18}/><span>Cenário</span></button>
          <button type="button" onClick={resetSafe}><RotateCcw size={18}/><span>Modo seguro</span></button>
        </div>
        <div className="avatar-stage-frame"><AvatarPreview avatar={avatar}/></div>
        <div className="avatar-stage-meta">
          <div><small>Personagem</small><strong>{character.label}</strong></div>
          <div><small>Look</small><strong>{avatar.outfit}</strong></div>
          <div><small>Frase</small><strong>{avatar.shirtSlogan}</strong></div>
          <span className="studio-progress"><i style={{ width: `${Math.min(100, progress)}%` }}/>{Math.min(100, progress)}%</span>
        </div>
        <div className="avatar-expression-row">
          {expressions.map((emoji, index) => <button type="button" key={emoji} className={Number(avatar.expressionIndex) === index ? 'active' : ''} onClick={() => update('expressionIndex', index)}>{emoji}</button>)}
        </div>
      </article>

      <article className="avatar-editor-card">
        <div className="avatar-editor-tabs">
          {tabs.map(item => <button type="button" key={item} className={tab === item ? 'active' : ''} onClick={() => { setTab(item); setQuery(''); }}>{item}</button>)}
        </div>
        <label className="avatar-editor-search"><Search size={17}/><input value={query} onChange={event => setQuery(event.target.value)} placeholder={`Buscar em ${tab.toLowerCase()}…`}/></label>

        <div className="avatar-editor-content">
          {tab === 'Personagem' && <>
            <div className="studio-section-title"><div><small>Base do avatar</small><h3>Humanos, animais e criaturas</h3></div><span>1 cena WebGL</span></div>
            {optionCards(characters, 'character')}
            <div className="realistic-model-panel">
              <div><small>Modo realista</small><h3>Modelos GLB licenciados</h3><p>O modelo externo é opcional. Em qualquer falha, o avatar interno continua funcionando.</p></div>
              <div className="realistic-model-actions">
                {modelCatalog.map(model => <button type="button" key={model.id} className={avatar.character === model.id ? 'active' : ''} onClick={() => selectCharacter(model)}>{model.label}</button>)}
                <button type="button" onClick={resetSafe}>Voltar ao modelo interno</button>
              </div>
              <input value={avatar.modelUrl || ''} onChange={event => setAvatar(current => ({ ...current, modelUrl: event.target.value, character: event.target.value ? 'model-custom' : 'human-male', characterKind: event.target.value ? 'model' : 'human', modelCredit: event.target.value ? 'Modelo fornecido pelo administrador' : '' }))} placeholder="https://servidor-seguro/avatar.glb"/>
              <small>{avatar.modelCredit || 'Nenhum modelo externo selecionado.'}</small>
            </div>
            <h3>Tom de pele</h3>
            <div className="studio-swatches">{skinTones.map(value => <button type="button" aria-label="Tom de pele" key={value} className={avatar.skin === value ? 'active' : ''} style={{ background: value }} onClick={() => update('skin', value)}/>)}</div>
            <h3>Qualidade gráfica</h3>
            <div className="studio-pill-options">{qualityOptions.map(value => <button type="button" key={value} className={avatar.quality === value ? 'active' : ''} onClick={() => update('quality', value)}>{value}</button>)}</div>
          </>}

          {tab === 'Rosto' && <>
            <h3>Formato do rosto</h3>{optionCards(faceShapes, 'faceShape', 'text')}
            <h3>Olhos</h3>{optionCards(eyeStyles, 'eyeStyle', 'text')}
            <h3>Sobrancelhas</h3>{optionCards(brows, 'brow', 'text')}
            <h3>Barba e bigode</h3>{optionCards(facialHair, 'facialHair', 'text')}
          </>}

          {tab === 'Cabelo' && <>
            <h3>Estilo do cabelo</h3>{optionCards(hairStyles, 'hairStyle', 'text')}
            <h3>Cor do cabelo</h3><div className="studio-swatches">{hairColors.map(value => <button type="button" aria-label="Cor do cabelo" key={value} className={avatar.hairColor === value ? 'active' : ''} style={{ background: value }} onClick={() => update('hairColor', value)}/>)}</div>
          </>}

          {tab === 'Roupas' && <>
            <h3>Roupas</h3>{optionCards(outfits, 'outfit', 'text')}
            <h3>Frases da camisa</h3><div className="shirt-slogan-grid">{shirtSlogans.map(value => <button type="button" key={value} className={avatar.shirtSlogan === value ? 'active' : ''} onClick={() => update('shirtSlogan', value)}><span>{value}</span><small>Aplicação 3D</small></button>)}</div>
          </>}

          {tab === 'Acessórios' && <><h3>Acessórios</h3>{optionCards(accessories, 'accessory', 'text')}</>}
          {tab === 'Calçados' && <><h3>Calçados</h3>{optionCards(shoes, 'shoes', 'text')}</>}
          {tab === 'Cenário' && <>
            <h3>Cenário do estúdio</h3>{optionCards(scenes, 'scene', 'text')}
            <h3>Pose</h3><div className="studio-pill-options">{poses.map(value => <button type="button" key={value} className={avatar.pose === value ? 'active' : ''} onClick={() => update('pose', value)}>{value}</button>)}</div>
          </>}
        </div>

        <div className="avatar-accessory-bar">
          <div><small>Acessórios rápidos</small><strong>Seu conjunto atual</strong></div>
          <div className="avatar-accessory-buttons">{quickAccessories.map(([name, icon]) => <button type="button" key={name} className={avatar.accessory === name ? 'active' : ''} onClick={() => update('accessory', name)}><span>{icon}</span><small>{name}</small></button>)}</div>
          <button type="button" className="primary" onClick={save}><Save size={16}/>Salvar</button>
        </div>
      </article>
    </div>

    <article className="saved-looks-panel">
      <div className="saved-looks-heading"><div><small>Biblioteca pessoal</small><h3>Looks salvos</h3></div><button type="button" onClick={addLook}>+ Salvar novo look</button></div>
      <div className="saved-looks-grid">{savedLooks.map((look, index) => <button type="button" key={`${look.outfit}-${index}`} onClick={() => setAvatar({ ...look })}><AvatarPreview compact avatar={look}/><div><strong>{look.outfit}</strong><small>{look.shirtSlogan} · {look.accessory}</small></div></button>)}</div>
    </article>
  </section>;
}
