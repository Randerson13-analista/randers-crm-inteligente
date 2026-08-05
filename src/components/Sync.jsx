import React, { useState } from 'react';
import { CheckCircle2, Cloud, RefreshCw, ShieldCheck } from 'lucide-react';

export default function Sync({ state, user, onRefresh, notify }) {
  const [busy, setBusy] = useState(false);
  const refresh = async () => {
    setBusy(true);
    try {
      await onRefresh();
      notify?.('Dados atualizados diretamente do Supabase.');
    } catch (error) {
      notify?.(error.message || 'Não foi possível atualizar os dados.');
    } finally {
      setBusy(false);
    }
  };

  const items = [
    ['Revendedores', state.revendedores?.length || 0],
    ['Atendimentos', state.history?.length || 0],
    ['Agenda', state.agenda?.length || 0],
    ['Colaboradores', state.users?.length || 0],
    ['Campanhas', state.campaigns?.length || 0],
    ['Importações', state.imports?.length || 0],
  ];

  return <section className="module-page">
    <div className="sync-status-grid">
      <article className="panel sync-health-card">
        <div className="panel-title"><div><small>Conexão oficial</small><h2>Supabase em produção</h2></div><Cloud size={30}/></div>
        <div className="connection-ok"><CheckCircle2 size={24}/><div><b>Conectado e autenticado</b><small>Os módulos operacionais usam o banco real.</small></div></div>
        <dl className="sync-details"><div><dt>Usuário</dt><dd>{user.email}</dd></div><div><dt>Organização</dt><dd>{state.organization?.name || 'Randers CRM'}</dd></div><div><dt>Perfil</dt><dd>{user.cargo} · {user.carteiraResumo || user.carteira}</dd></div></dl>
        <button className="primary" onClick={refresh} disabled={busy}><RefreshCw size={17}/>{busy ? 'Atualizando...' : 'Atualizar dados agora'}</button>
      </article>

      <article className="panel">
        <div className="panel-title"><div><small>Registros visíveis</small><h2>Resumo da sincronização</h2></div><ShieldCheck size={24}/></div>
        <div className="sync-counts">{items.map(([label, value]) => <div key={label}><b>{value}</b><span>{label}</span></div>)}</div>
        <p className="muted-note">Não é necessário informar novamente URL, chave ou senha nesta tela. A Vercel fornece as variáveis seguras ao aplicativo.</p>
      </article>
    </div>
  </section>;
}
