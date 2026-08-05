import React, { useState } from 'react';
import { BrainCircuit, Eye, EyeOff, KeyRound, LogOut } from 'lucide-react';
import { changePassword } from '../services/auth';

function validatePassword(password) {
  if (password.length < 8) return 'A senha deve ter pelo menos 8 caracteres.';
  if (!/[A-Z]/.test(password)) return 'Inclua pelo menos uma letra maiúscula.';
  if (!/[a-z]/.test(password)) return 'Inclua pelo menos uma letra minúscula.';
  if (!/\d/.test(password)) return 'Inclua pelo menos um número.';
  return '';
}

export default function PasswordSetup({ user, onComplete, onSignOut, recovery = false }) {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const submit = async event => {
    event.preventDefault();
    setError('');

    const validationError = validatePassword(password);
    if (validationError) {
      setError(validationError);
      return;
    }
    if (password !== confirmPassword) {
      setError('As senhas não coincidem.');
      return;
    }

    setLoading(true);
    try {
      await changePassword(password);
      await onComplete?.();
    } catch (err) {
      setError(err?.message || 'Não foi possível criar sua senha.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="password-setup-screen">
      <section className="password-setup-brand">
        <div className="login-logo"><BrainCircuit size={54} /></div>
        <h1>Randers’CRM</h1>
        <p>Seu acesso foi confirmado. Falta apenas proteger a conta com uma senha pessoal.</p>
        <div className="password-security-points">
          <span>✓ A senha não é armazenada pelo CRM</span>
          <span>✓ O acesso é individual e protegido</span>
          <span>✓ Sua carteira permanece separada</span>
        </div>
      </section>

      <form className="password-setup-card" onSubmit={submit}>
        <img src="/brain.svg" className="login-brain" alt="Cérebro verde Randers CRM" />
        <small>{recovery ? 'Recuperação de acesso' : 'Primeiro acesso'}</small>
        <h2>{recovery ? 'Defina uma nova senha' : 'Crie sua senha'}</h2>
        <p>
          Olá, <strong>{user?.nome || 'colaborador'}</strong>. Esta etapa é obrigatória antes de entrar no CRM.
        </p>

        <label>
          Nova senha
          <div className="password-field">
            <KeyRound size={18} className="password-leading-icon" />
            <input
              value={password}
              onChange={event => setPassword(event.target.value)}
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              minLength="8"
              placeholder="Mínimo de 8 caracteres"
              required
              autoFocus
            />
            <button type="button" aria-label="Mostrar ou ocultar senha" onClick={() => setShowPassword(value => !value)}>
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </label>

        <label>
          Confirmar nova senha
          <div className="password-field">
            <KeyRound size={18} className="password-leading-icon" />
            <input
              value={confirmPassword}
              onChange={event => setConfirmPassword(event.target.value)}
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              minLength="8"
              placeholder="Digite novamente"
              required
            />
          </div>
        </label>

        <div className="password-rules">Use pelo menos 8 caracteres, com letra maiúscula, letra minúscula e número.</div>
        {error && <div className="form-error">{error}</div>}

        <button className="primary login-submit" disabled={loading}>
          <KeyRound size={18} />
          {loading ? 'Salvando senha...' : 'Salvar senha e entrar'}
        </button>

        <button className="link-button password-signout" type="button" disabled={loading} onClick={onSignOut}>
          <LogOut size={16} /> Sair desta conta
        </button>
      </form>
    </div>
  );
}
