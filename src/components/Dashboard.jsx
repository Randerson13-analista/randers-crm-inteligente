import React, { useMemo } from 'react';
import { CalendarDays, Clock3, MessageCircle, RotateCcw, Target, TrendingUp, Trophy, Users } from 'lucide-react';
import { ACTIVITY_SEGMENTS, RECOVERY_GROUPS, VIP_ACTIVITY_SEGMENTS } from '../domain/portfolio';

const pct = (a, b) => b ? Math.round(a / b * 100) : 0;

export default function Dashboard({ revendedores = [], history = [], agenda = [] }) {
  const stats = useMemo(() => {
    const total = revendedores.length;
    const atividade = revendedores.filter(item => item.base === 'Atividade').length;
    const premium = revendedores.filter(item => item.base === 'Atividade' && VIP_ACTIVITY_SEGMENTS.includes(item.nivel)).length;
    const recuperacao = revendedores.filter(item => RECOVERY_GROUPS.includes(item.base)).length;
    const convertidos = revendedores.filter(item => item.status === 'Convertido').length;
    const emContato = revendedores.filter(item => ['Em contato', 'Retorno', 'Negociando'].includes(item.status)).length;
    const pendentes = revendedores.filter(item => item.status === 'Pendente').length;
    const atrasados = agenda.filter(item => item.status !== 'Concluído' && new Date(`${item.data}T${item.hora || '23:59'}`) < new Date()).length;
    const hoje = agenda.filter(item => item.data === new Date().toISOString().slice(0, 10) && item.status !== 'Concluído').length;
    return { total, atividade, premium, recuperacao, convertidos, emContato, pendentes, atrasados, hoje, rate: pct(convertidos, total) };
  }, [revendedores, agenda]);

  const cards = [
    ['Revendedores', stats.total, Users, 'Carteira total'],
    ['Em atendimento', stats.emContato, MessageCircle, 'Contatos em andamento'],
    ['Atividade', stats.atividade, Target, 'Todas as segmentações'],
    ['Recuperação', stats.recuperacao, RotateCcw, 'I6, cessados e intenções'],
    ['Atividade premium', stats.premium, Trophy, 'Platina a diamante'],
    ['Conversões', stats.convertidos, TrendingUp, `${stats.rate}% da carteira`],
    ['Retornos hoje', stats.hoje, CalendarDays, `${stats.atrasados} atrasados`],
  ];

  const byFlow = Object.entries(revendedores.reduce((result, reseller) => {
    const key = RECOVERY_GROUPS.includes(reseller.base) ? reseller.base : 'Atividade';
    result[key] = (result[key] || 0) + 1;
    return result;
  }, {})).sort((a, b) => b[1] - a[1]);

  const byLevel = ACTIVITY_SEGMENTS.map(level => [level, revendedores.filter(item => item.base === 'Atividade' && item.nivel === level).length])
    .filter(([, value]) => value > 0)
    .sort((a, b) => b[1] - a[1]);

  const recent = [...history].sort((a, b) => String(b.data).localeCompare(String(a.data))).slice(0, 5);

  return <section className="module-page dashboard-premium">
    <div className="hero-strip">
      <div><span>Visão executiva</span><h2>Sua operação está organizada por Atividade e Recuperação.</h2><p>Atividade reúne Cobre, Bronze, Prata, Ouro, Platina, Rubi, Esmeralda e Diamante.</p></div>
      <div className="hero-score"><Target/><b>{stats.rate}%</b><small>taxa de conversão</small></div>
    </div>

    <div className="kpi-grid premium-kpis">{cards.map(([label, value, Icon, help]) => <article className="kpi-card premium" key={label}><span><Icon size={22}/></span><div><small>{label}</small><strong>{value}</strong><em>{help}</em></div></article>)}</div>

    <div className="dashboard-grid premium-grid">
      <article className="panel"><div className="panel-title"><div><small>Fluxos</small><h2>Atividade e Recuperação</h2></div><span>{stats.total} contatos</span></div><div className="bar-list">{byFlow.map(([name, value]) => <div key={name}><div><b>{name}</b><span>{value}</span></div><progress value={value} max={Math.max(stats.total, 1)}/></div>)}</div></article>
      <article className="panel"><div className="panel-title"><div><small>Funil</small><h2>Etapas atuais</h2></div><span>Atualizado agora</span></div><div className="funnel-visual"><div><i style={{ width: `${pct(stats.pendentes, stats.total)}%` }}/><b>Pendentes</b><span>{stats.pendentes}</span></div><div><i style={{ width: `${pct(stats.emContato, stats.total)}%` }}/><b>Em contato</b><span>{stats.emContato}</span></div><div><i style={{ width: `${pct(stats.convertidos, stats.total)}%` }}/><b>Convertidos</b><span>{stats.convertidos}</span></div></div></article>
      <article className="panel"><div className="panel-title"><div><small>Atividade</small><h2>Segmentações</h2></div><span>8 níveis possíveis</span></div><div className="level-cloud">{byLevel.length ? byLevel.map(([name, value]) => <div key={name}><b>{name}</b><span>{value}</span></div>) : <div className="empty">Nenhuma segmentação importada.</div>}</div></article>
      <article className="panel"><div className="panel-title"><div><small>Atendimentos</small><h2>Últimas interações</h2></div><Clock3 size={18}/></div><div className="activity-feed">{recent.length === 0 ? <div className="empty">Nenhum atendimento registrado.</div> : recent.map(item => <div key={item.id}><i/><div><b>{item.resultado}</b><span>{item.usuario} · {item.canal}</span></div><small>{new Date(item.data).toLocaleDateString('pt-BR')}</small></div>)}</div></article>
    </div>
  </section>;
}
