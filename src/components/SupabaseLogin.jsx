import React, { useState } from 'react';
import { BrainCircuit, Eye, EyeOff, KeyRound, LogIn, Mail } from 'lucide-react';
import { isSupabaseConfigured } from '../lib/supabase';
import { sendPasswordReset, signInWithPassword } from '../services/auth';

function friendlyError(error) {
  const message = String(error?.message || error || 'Não foi possível entrar.');
  if (/invalid login credentials/i.test(message)) return 'E-mail ou senha incorretos.';
  if (/email not confirmed/i.test(message)) return 'Confirme seu e-mail antes de entrar.';
  if (/rate limit/i.test(message)) return 'Muitas tentativas. Aguarde alguns minutos e tente novamente.';
  return message;
}

export default function SupabaseLogin({ onAuthenticated }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  async function submit(event) {
    event.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');
    try {
      const { user } = await signInWithPassword(email.trim(), password);
      await onAuthenticated(user);
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setLoading(false);
    }
  }

  async function recoverPassword() {
    if (!email.trim()) {
      setError('Informe seu e-mail para receber o link de redefinição.');
      return;
    }
    setLoading(true);
    setError('');
    setMessage('');
    try {
      await sendPasswordReset(email.trim());
      setMessage('Enviamos um link de redefinição para o seu e-mail.');
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-screen">
      <section className="login-brand">
        <div className="login-logo"><BrainCircuit size={54} /></div>
        <h1>Randers’CRM</h1>
        <p>Gestão inteligente de revendedores, metas e relacionamentos.</p>
        <div className="login-points">
          <span>✓ Carteiras por colaborador</span>
          <span>✓ Agenda e histórico</span>
          <span>✓ Importação inteligente</span>
          <span>✓ Dados protegidos na nuvem</span>
        </div>
      </section>

      <form className="login-card" onSubmit={submit}>
        <img src="/brain.svg" className="login-brain" alt="Cérebro verde Randers CRM" />
        <small>Acesso seguro</small>
        <h2>Bem-vindo</h2>
        <p>Entre com o e-mail e a senha cadastrados.</p>

        {!isSupabaseConfigured && (
          <div className="form-error">As variáveis do Supabase não foram encontradas neste deploy.</div>
        )}

        <label>
          E-mail
          <div className="auth-input-icon">
            <Mail size={18} />
            <input
              value={email}
              onChange={event => setEmail(event.target.value)}
              type="email"
              autoComplete="email"
              placeholder="seuemail@empresa.com"
              required
            />
          </div>
        </label>

        <label>
          Senha
          <div className="password-field">
            <KeyRound size={18} className="password-leading-icon" />
            <input
              value={password}
              onChange={event => setPassword(event.target.value)}
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              placeholder="Digite sua senha"
              required
            />
            <button type="button" aria-label="Mostrar ou ocultar senha" onClick={() => setShowPassword(value => !value)}>
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </label>

        {error && <div className="form-error">{error}</div>}
        {message && <div className="form-success">{message}</div>}

        <button className="primary login-submit" disabled={loading || !isSupabaseConfigured}>
          <LogIn size={18} />
          {loading ? 'Entrando...' : 'Entrar'}
        </button>
        <button className="link-button" type="button" disabled={loading} onClick={recoverPassword}>
          Esqueci minha senha
        </button>
        <small className="login-hint">O acesso é liberado somente para usuários cadastrados pelo administrador.</small>
      </form>
    </div>
  );
}
