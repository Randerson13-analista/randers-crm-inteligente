import React, { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, RefreshCw, Save, UserPlus, Users } from 'lucide-react';
import AvatarPreview from './AvatarPreview';
import { defaultAvatar } from '../data/avatarOptions';
import { assignmentSummary } from '../services/assignment';
import {
  ACTIVITY_SEGMENTS,
  RECOVERY_GROUPS,
  STANDARD_ACTIVITY_SEGMENTS,
  VIP_ACTIVITY_SEGMENTS,
  WALLET_LABELS,
  summarizePortfolio,
} from '../domain/portfolio';

const roles = ['Consultor', 'Gerente', 'Administrador'];
const presets = [
  { id: 'recovery', label: 'Recuperação', activitySegments: [], recoveryGroups: RECOVERY_GROUPS },
  { id: 'standard', label: 'Atividade · Cobre a Ouro', activitySegments: STANDARD_ACTIVITY_SEGMENTS, recoveryGroups: [] },
  { id: 'premium', label: 'Atividade · Platina a Diamante', activitySegments: VIP_ACTIVITY_SEGMENTS, recoveryGroups: [] },
  { id: 'all', label: 'Todas', activitySegments: ACTIVITY_SEGMENTS, recoveryGroups: RECOVERY_GROUPS },
  { id: 'custom', label: 'Personalizada', activitySegments: [], recoveryGroups: [] },
];

const toggle = (items, value) => items.includes(value) ? items.filter(item => item !== value) : [...items, value];
const sameSet = (left = [], right = []) => left.length === right.length && left.every(item => right.includes(item));
const presetFor = (activitySegments = [], recoveryGroups = []) => presets.find(preset =>
  preset.id !== 'custom'
  && sameSet(activitySegments, preset.activitySegments)
  && sameSet(recoveryGroups, preset.recoveryGroups))?.id || 'custom';

function PortfolioFields({ activitySegments, recoveryGroups, onChange, disabled = false }) {
  return <div className="portfolio-fields">
    <div className="portfolio-group">
      <div><b>Segmentações dentro de Atividade</b><small>Atividade não é uma carteira separada dos níveis: ela contém as oito segmentações abaixo.</small></div>
      <div className="checkbox-grid">{ACTIVITY_SEGMENTS.map(segment => <label className={activitySegments.includes(segment) ? 'selected' : ''} key={segment}>
        <input type="checkbox" disabled={disabled} checked={activitySegments.includes(segment)} onChange={() => onChange({ activitySegments: toggle(activitySegments, segment), recoveryGroups })}/>
        <span>{activitySegments.includes(segment) && <CheckCircle2 size={14}/>} {segment}</span>
      </label>)}</div>
    </div>
    <div className="portfolio-group">
      <div><b>Grupos de Recuperação</b><small>I6, Cessados e Intenções continuam como fluxos operacionais de recuperação.</small></div>
      <div className="checkbox-grid recovery-grid">{RECOVERY_GROUPS.map(group => <label className={recoveryGroups.includes(group) ? 'selected' : ''} key={group}>
        <input type="checkbox" disabled={disabled} checked={recoveryGroups.includes(group)} onChange={() => onChange({ activitySegments, recoveryGroups: toggle(recoveryGroups, group) })}/>
        <span>{recoveryGroups.includes(group) && <CheckCircle2 size={14}/>} {group}</span>
      </label>)}</div>
    </div>
  </div>;
}

function UserPortfolioEditor({ user, onUpdate }) {
  const [cargo, setCargo] = useState(user.cargo);
  const [activitySegments, setActivitySegments] = useState(user.activitySegments || []);
  const [recoveryGroups, setRecoveryGroups] = useState(user.recoveryGroups || []);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  useEffect(() => {
    setCargo(user.cargo);
    setActivitySegments(user.activitySegments || []);
    setRecoveryGroups(user.recoveryGroups || []);
  }, [user]);

  const applyPreset = id => {
    const preset = presets.find(item => item.id === id);
    if (!preset || id === 'custom') return;
    setActivitySegments([...preset.activitySegments]);
    setRecoveryGroups([...preset.recoveryGroups]);
  };

  const save = async () => {
    setSaving(true);
    setSaveError('');
    try {
      await onUpdate(user.id, { cargo, activitySegments, recoveryGroups });
    } catch (error) {
      setSaveError(error.message || 'Não foi possível salvar a carteira.');
    } finally {
      setSaving(false);
    }
  };

  const display = summarizePortfolio({ ...user, cargo, activitySegments, recoveryGroups });
  return <details className="portfolio-editor">
    <summary><span>{display}</span><small>Configurar carteira</small></summary>
    <div className="portfolio-editor-body">
      <div className="form-row">
        <label>Cargo<select value={cargo} onChange={event => {
          const next = event.target.value;
          setCargo(next);
          if (['Administrador', 'Gerente'].includes(next)) {
            setActivitySegments([...ACTIVITY_SEGMENTS]);
            setRecoveryGroups([...RECOVERY_GROUPS]);
          }
        }}>{roles.map(role => <option key={role}>{role}</option>)}</select></label>
        <label>Predefinição<select value={presetFor(activitySegments, recoveryGroups)} onChange={event => applyPreset(event.target.value)}>
          {presets.map(item => <option key={item.id} value={item.id}>{item.label}</option>)}
        </select></label>
      </div>
      <PortfolioFields activitySegments={activitySegments} recoveryGroups={recoveryGroups} onChange={next => {
        setActivitySegments(next.activitySegments);
        setRecoveryGroups(next.recoveryGroups);
      }} disabled={['Administrador', 'Gerente'].includes(cargo)}/>
      {saveError && <div className="form-error">{saveError}</div>}
      <button className="primary compact-button" onClick={save} disabled={saving}><Save size={16}/>{saving ? 'Salvando...' : 'Salvar carteira'}</button>
    </div>
  </details>;
}

export default function Admin({ users, revendedores = [], onInvite, onUpdate, onDistribute, loading = false }) {
  const defaultPreset = presets[0];
  const [form, setForm] = useState({
    nome: '',
    email: '',
    cargo: 'Consultor',
    carteira: WALLET_LABELS.recovery,
    activitySegments: [...defaultPreset.activitySegments],
    recoveryGroups: [...defaultPreset.recoveryGroups],
  });
  const [submitting, setSubmitting] = useState(false);
  const [distributing, setDistributing] = useState(false);
  const [error, setError] = useState('');
  const summary = useMemo(() => assignmentSummary(revendedores, users), [revendedores, users]);

  const setPreset = id => {
    const preset = presets.find(item => item.id === id);
    if (!preset || id === 'custom') return;
    setForm(current => ({
      ...current,
      carteira: preset.label,
      activitySegments: [...preset.activitySegments],
      recoveryGroups: [...preset.recoveryGroups],
    }));
  };

  const submit = async event => {
    event.preventDefault();
    setError('');
    if (!form.nome.trim() || !form.email.trim()) return setError('Informe nome e e-mail.');
    if (form.cargo === 'Consultor' && !form.activitySegments.length && !form.recoveryGroups.length) {
      return setError('Selecione ao menos uma segmentação da Atividade ou um grupo de Recuperação.');
    }
    setSubmitting(true);
    try {
      await onInvite(form);
      setForm({
        nome: '', email: '', cargo: 'Consultor', carteira: WALLET_LABELS.recovery,
        activitySegments: [], recoveryGroups: [...RECOVERY_GROUPS],
      });
    } catch (exception) {
      setError(exception.message || 'Não foi possível enviar o convite.');
    } finally {
      setSubmitting(false);
    }
  };

  const distribute = async () => {
    setDistributing(true);
    try { await onDistribute(); } finally { setDistributing(false); }
  };

  return <section className="module-page">
    <div className="admin-grid">
      <form className="panel form-panel admin-invite-form" onSubmit={submit}>
        <div className="panel-title"><div><small>Convite por e-mail</small><h2>Novo colaborador</h2></div><UserPlus size={20}/></div>
        <label>Nome completo<input value={form.nome} onChange={event => setForm({ ...form, nome: event.target.value })} placeholder="Nome do colaborador"/></label>
        <label>E-mail<input type="email" value={form.email} onChange={event => setForm({ ...form, email: event.target.value })} placeholder="colaborador@empresa.com"/></label>
        <div className="form-row">
          <label>Cargo<select value={form.cargo} onChange={event => {
            const cargo = event.target.value;
            setForm(current => ({
              ...current,
              cargo,
              ...(cargo === 'Consultor' ? {} : { activitySegments: [...ACTIVITY_SEGMENTS], recoveryGroups: [...RECOVERY_GROUPS], carteira: WALLET_LABELS.all }),
            }));
          }}>{roles.map(role => <option key={role}>{role}</option>)}</select></label>
          <label>Predefinição<select value={presetFor(form.activitySegments, form.recoveryGroups)} onChange={event => setPreset(event.target.value)}>
            {presets.map(item => <option key={item.id} value={item.id}>{item.label}</option>)}
          </select></label>
        </div>
        <PortfolioFields activitySegments={form.activitySegments} recoveryGroups={form.recoveryGroups} onChange={next => setForm({ ...form, ...next, carteira: WALLET_LABELS.custom })} disabled={form.cargo !== 'Consultor'}/>
        {error && <div className="form-error">{error}</div>}
        <button className="primary" disabled={submitting}>{submitting ? 'Enviando convite...' : 'Enviar convite de acesso'}</button>
      </form>

      <article className="panel">
        <div className="panel-title"><div><small>Equipe real no Supabase</small><h2>Usuários e carteiras</h2></div><span>{users.length}</span></div>
        {loading ? <div className="empty-state">Carregando colaboradores...</div> : <div className="user-list professional-user-list">
          {users.map(user => <div className="user-row professional-user-row" key={user.id}>
            <span className="user-avatar"><AvatarPreview compact avatar={user.avatarConfig || defaultAvatar}/></span>
            <div className="user-details"><b>{user.nome}</b><small>{user.email || 'E-mail pendente'} · {user.emailConfirmed ? 'Confirmado' : 'Aguardando confirmação'}</small></div>
            <label className="switch"><input type="checkbox" checked={user.ativo} onChange={event => onUpdate(user.id, { ativo: event.target.checked }).catch(() => {})}/><span>{user.ativo ? 'Ativo' : 'Inativo'}</span></label>
            <UserPortfolioEditor user={user} onUpdate={onUpdate}/>
          </div>)}
        </div>}
      </article>
    </div>

    <article className="panel assignment-panel">
      <div className="panel-title">
        <div><small>Distribuição persistida</small><h2>Carteiras dos consultores</h2><p>A distribuição usa as segmentações selecionadas dentro de Atividade e os grupos de Recuperação, sem duplicar revendedores.</p></div>
        <button className="primary" onClick={distribute} disabled={distributing}><RefreshCw size={17}/>{distributing ? 'Distribuindo...' : 'Redistribuir agora'}</button>
      </div>
      <div className="assignment-summary">{summary.map(item => <div key={item.id}>
        <span className="assignment-avatar"><Users size={18}/></span>
        <div><b>{item.nome}</b><small>{item.carteira}</small></div>
        <strong>{item.total}</strong><span>revendedores</span>
      </div>)}</div>
    </article>
  </section>;
}
