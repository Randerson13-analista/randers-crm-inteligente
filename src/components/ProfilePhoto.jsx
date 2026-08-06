import React, { useMemo, useState } from 'react';

export function initialsForName(name = '') {
  const parts = String(name).trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return 'US';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] || ''}${parts.at(-1)?.[0] || ''}`.toUpperCase();
}

export default function ProfilePhoto({ name, photoUrl, size = 'medium', className = '' }) {
  const [failed, setFailed] = useState(false);
  const initials = useMemo(() => initialsForName(name), [name]);
  const showPhoto = Boolean(photoUrl) && !failed;

  return <span
    className={`profile-photo profile-photo-${size} ${className}`.trim()}
    role="img"
    aria-label={showPhoto ? `Foto de ${name || 'usuário'}` : `Iniciais de ${name || 'usuário'}`}
  >
    {showPhoto
      ? <img src={photoUrl} alt="" onError={() => setFailed(true)}/>
      : <span>{initials}</span>}
  </span>;
}
