import React, { useEffect, useState } from 'react';
import { KeyRound, Save, UserCircle } from 'lucide-react';
import AvatarPreview from './AvatarPreview';
import { changePassword } from '../services/auth';

export default function Profile({ user, onSave, onNotify }) {
  const [form, setForm] = useState({
    nome: user.nome || '',
    telefone: user.telefone || '',
    cidade: user.cidade || '',
    bio: user.bio || '',
  });
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);

  useEffect(() => {
    setForm({ nome: user.nome || '', telefone: user.telefone || '', cidade: user.cidade || '', bio: user.bio || '' });
  }, [user]);

  const submit = async event => {
    event.preventDefault();
    setSaving(true);
    try {
      await onSave(form);
    } finally {
      setSaving(false);
    }
  };

  const submitPassword = async event => {
    event.preventDefault();
    if (password !== confirmPassword) {
      onNotify?.('As senhas não coincidem.');
      return;
    }
    setChangingPassword(true);
    try {
      await changePassword(password);
      setPassword('');
      setConfirmPassword('');
      onNotify?.('Senha atualizada com segurança.');
    } catch (error) {
      onNotify?.(error.message || 'Não foi possível alterar a senha.');
    } finally {
      setChangingPassword(false);
    }
  };

  return <section className="module-page profile-page">
    <div className="profile-layout">
      <article className="panel profile-summary-card">
        {user.mustChangePassword && <div className="form-error">Troque a senha provisória antes de continuar usando a conta.</div>}
        <div className="profile-large-avatar"><AvatarPreview avatar={user.avatarConfig}/></div>
        <h2>{user.nome}</h2>
        <p>{user.email}</p>
        <div className="profile-badges"><span>{user.cargo}</span><span>{user.carteiraResumo || user.carteira}</span><span>{user.emailConfirmed ? 'E-mail confirmado' : 'E-mail pendente'}</span></div>
        <div className="profile-points"><div><b>{user.xp || 0}</b><small>XP</small></div><div><b>{user.coins || 0}</b><small>Moedas</small></div></div>
      </article>

      <div className="profile-forms">
        <form className="panel form-panel" onSubmit={submit}>
          <div className="panel-title"><div><small>Dados pessoais</small><h2>Meu perfil</h2></div><UserCircle size={22}/></div>
          <label>Nome completo<input value={form.nome} onChange={event => setForm({ ...form, nome: event.target.value })}/></label>
          <div className="form-row"><label>Telefone<input value={form.telefone} onChange={event => setForm({ ...form, telefone: event.target.value })}/></label><label>Cidade<input value={form.cidade} onChange={event => setForm({ ...form, cidade: event.target.value })}/></label></div>
          <label>Apresentação<textarea rows="4" value={form.bio} onChange={event => setForm({ ...form, bio: event.target.value })} placeholder="Conte um pouco sobre sua atuação."/></label>
          <button className="primary" disabled={saving}><Save size={17}/>{saving ? 'Salvando...' : 'Salvar perfil'}</button>
        </form>

        <form className="panel form-panel" onSubmit={submitPassword}>
          <div className="panel-title"><div><small>Segurança</small><h2>Alterar senha</h2></div><KeyRound size={22}/></div>
          <label>Nova senha<input type="password" minLength="8" value={password} onChange={event => setPassword(event.target.value)} required/></label>
          <label>Confirmar nova senha<input type="password" minLength="8" value={confirmPassword} onChange={event => setConfirmPassword(event.target.value)} required/></label>
          <button className="primary" disabled={changingPassword}><KeyRound size={17}/>{changingPassword ? 'Alterando...' : 'Alterar senha'}</button>
        </form>
      </div>
    </div>
  </section>;
}
