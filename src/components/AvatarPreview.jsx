import React, { useMemo } from 'react';
import AvatarStage3D from './AvatarStage3D';
import { normalizeAvatarConfig } from '../data/avatarOptions';
import { getAvatarKind, outfitColor } from '../three/avatarFactory';

const iconFor = avatar => {
  const kind = getAvatarKind(avatar);
  if (kind === 'animal') return avatar.character === 'dog' ? '🐶' : avatar.character === 'fox' ? '🦊' : avatar.character === 'panda' ? '🐼' : '🐱';
  if (kind === 'creature') return avatar.character === 'dragon' ? '🐉' : avatar.character === 'robot' ? '🤖' : '👽';
  if (kind === 'model') return '3D';
  return String(avatar.character).includes('female') ? '👩' : '👨';
};

function CompactAvatarPoster({ avatar }) {
  const kind = getAvatarKind(avatar);
  const female = String(avatar.character).includes('female');
  const outfit = outfitColor(avatar.outfit);
  return <div
    className={`avatar-mini-poster kind-${kind} character-${avatar.character}`}
    style={{ '--avatar-skin': avatar.skin || '#c98558', '--avatar-hair': avatar.hairColor || '#17110e', '--avatar-outfit': outfit, '--avatar-car': avatar.carColor || '#0f8a55' }}
    aria-hidden="true"
  >
    <span className="avatar-mini-glow"/>
    <span className="avatar-mini-icon">{iconFor(avatar)}</span>
    {kind === 'human' && <>
      <span className={`avatar-mini-hair ${female ? 'female' : ''}`}/>
      <span className="avatar-mini-face"><i/><i/><b/></span>
    </>}
    <span className="avatar-mini-shirt"><em>{avatar.shirtSlogan && avatar.shirtSlogan !== 'Sem frase' ? avatar.shirtSlogan.replace('I ♥ ', '♥ ').slice(0, 11) : 'Boti'}</em></span>
    <span className="avatar-mini-legs"><i/><i/></span>
    <small>3D</small>
  </div>;
}

export default function AvatarPreview({ avatar: rawAvatar, compact = false, interactive = !compact }) {
  const avatar = useMemo(() => normalizeAvatarConfig(rawAvatar), [rawAvatar]);
  if (compact) return <div className="avatar-render compact"><CompactAvatarPoster avatar={avatar}/></div>;
  return <AvatarStage3D avatar={avatar} interactive={interactive}/>;
}
