import React, { useMemo } from 'react';
import { AlertTriangle, Clock3, TrendingUp, Users } from 'lucide-react';
import ProfilePhoto from './ProfilePhoto';

export default function ManagerPanel({ users = [], history = [], agenda = [] }) {
  const active = users.filter(user => user.ativo && user.cargo === 'Consultor');
  const data = useMemo(() => active.map(user => {
    const own = history.filter(item => item.userId === user.id || (!item.userId && item.usuario === user.nome));
    const conv = own.filter(item => item.resultado === 'Convertido').length;
    const overdue = agenda.filter(item => item.responsavelId === user.id && item.status !== 'Concluído' && new Date(`${item.data}T${item.hora || '23:59'}`) < new Date()).length;
    return { ...user, total: own.length, conv, overdue, rate: own.length ? Math.round(conv / own.length * 100) : 0 };
  }).sort((a, b) => b.conv - a.conv || b.total - a.total), [active, history, agenda]);
  const top = data[0];
  const cards = [
    ['Consultores ativos', active.length, Users],
    ['Conversões da equipe', data.reduce((sum, user) => sum + user.conv, 0), TrendingUp],
    ['Retornos atrasados', data.reduce((sum, user) => sum + user.overdue, 0), AlertTriangle],
    ['Melhor desempenho', top?.nome || '—', Clock3],
  ];

  return <section className="module-page">
    <div className="kpi-grid">{cards.map(([label, value, Icon]) => <article className="kpi-card" key={label}><span><Icon size={22}/></span><div><small>{label}</small><strong>{value}</strong></div></article>)}</div>
    <article className="panel"><div className="panel-title"><h2>Desempenho da equipe</h2><span>Visão gerencial</span></div><div className="manager-table">
      <div className="manager-row manager-head"><span>Colaborador</span><span>Carteira</span><span>Atendimentos</span><span>Conversões</span><span>Taxa</span><span>Atrasados</span></div>
      {data.map(user => <div className="manager-row" key={user.id}>
        <span className="manager-user"><i><ProfilePhoto name={user.nome} photoUrl={user.photoUrl} size="small"/></i><b>{user.nome}</b></span>
        <span>{user.carteiraResumo || user.carteira}</span><span>{user.total}</span><span>{user.conv}</span><span>{user.rate}%</span><span className={user.overdue ? 'danger-text' : ''}>{user.overdue}</span>
      </div>)}
      {!data.length && <div className="empty">Nenhum consultor ativo.</div>}
    </div></article>
  </section>;
}
