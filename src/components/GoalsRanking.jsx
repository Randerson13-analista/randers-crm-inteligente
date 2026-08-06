import React, { useMemo } from 'react';
import { CheckCircle2, MessageCircle, Phone, Target, Trophy } from 'lucide-react';
import ProfilePhoto from './ProfilePhoto';
import RaceRanking3D from './RaceRanking3D';

const metricCount = (history, user, channel) => history.filter(item => (item.userId === user.id || (!item.userId && item.usuario === user.nome)) && (!channel || item.canal === channel)).length;
const conversions = (history, user) => history.filter(item => (item.userId === user.id || (!item.userId && item.usuario === user.nome)) && item.resultado === 'Convertido').length;

export default function GoalsRanking({ users = [], history = [], goals = {}, onGoalChange, currentUser }) {
  const active = users.filter(user => user.ativo);
  const ranking = useMemo(() => active.map(user => {
    const calls = metricCount(history, user, 'Ligação');
    const whats = metricCount(history, user, 'WhatsApp');
    const conv = conversions(history, user);
    return { ...user, calls, whats, conv, points: calls + whats + conv * 5 };
  }).sort((a, b) => b.points - a.points), [active, history]);

  const me = ranking.find(item => item.id === currentUser?.id) || ranking[0] || { calls: 0, whats: 0, conv: 0 };
  const goal = goals[currentUser?.id] || { calls: 20, whats: 30, conversions: 5 };
  const bars = [
    ['Ligações', me.calls || 0, goal.calls, Phone],
    ['WhatsApp', me.whats || 0, goal.whats, MessageCircle],
    ['Conversões', me.conv || 0, goal.conversions, CheckCircle2],
  ];

  return <section className="module-page ranking-module-page">
    <article className="panel race-panel">
      <div className="panel-title">
        <div><small>Gamificação da equipe</small><h2>Ranking em corrida 3D</h2><p>Os carros avançam conforme os pontos reais de ligações, WhatsApp e conversões.</p></div>
        <Trophy size={22}/>
      </div>
      <RaceRanking3D ranking={ranking}/>
    </article>

    <div className="goals-layout">
      <article className="panel">
        <div className="panel-title"><div><small>Desempenho individual</small><h2>Minhas metas</h2></div><Target size={20}/></div>
        <div className="goal-list">
          {bars.map(([label, value, target, Icon]) => <div className="goal-item" key={label}>
            <div className="goal-head"><span><Icon size={18}/><b>{label}</b></span><strong>{value}/{target}</strong></div>
            <progress value={value} max={Math.max(target, 1)}/>
            <small>{Math.min(100, Math.round(value / Math.max(target, 1) * 100))}% concluído</small>
          </div>)}
        </div>
      </article>

      {currentUser?.cargo === 'Administrador' && <article className="panel">
        <div className="panel-title"><div><small>Gestão de desempenho</small><h2>Configurar metas</h2></div><span>Por colaborador</span></div>
        <div className="goal-admin">
          {active.map(user => {
            const userGoal = goals[user.id] || { calls: 20, whats: 30, conversions: 5 };
            return <div className="goal-user" key={user.id}>
              <div className="goal-user-name"><span><ProfilePhoto name={user.nome} photoUrl={user.photoUrl} size="small"/></span><div><b>{user.nome}</b><small>{user.carteiraResumo || user.carteira}</small></div></div>
              <label>Ligações<input type="number" min="0" value={userGoal.calls} onChange={event => onGoalChange(user.id, { ...userGoal, calls: Number(event.target.value) })}/></label>
              <label>WhatsApp<input type="number" min="0" value={userGoal.whats} onChange={event => onGoalChange(user.id, { ...userGoal, whats: Number(event.target.value) })}/></label>
              <label>Conversões<input type="number" min="0" value={userGoal.conversions} onChange={event => onGoalChange(user.id, { ...userGoal, conversions: Number(event.target.value) })}/></label>
            </div>;
          })}
        </div>
      </article>}
    </div>

    <article className="panel ranking-panel">
      <div className="panel-title"><div><small>Classificação detalhada</small><h2>Ranking de colaboradores</h2></div><Trophy size={20}/></div>
      <div className="podium">
        {ranking.slice(0, 3).map((user, index) => <div className={`podium-card place-${index + 1}`} key={user.id}>
          <div className="medal">{['🥇', '🥈', '🥉'][index]}</div>
          <div className="podium-avatar"><ProfilePhoto name={user.nome} photoUrl={user.photoUrl} size="small"/></div>
          <b>{user.nome}</b><small>{user.carteiraResumo || user.carteira}</small><strong>{user.points} pts</strong>
          <div className="podium-stats"><span>{user.calls} ligações</span><span>{user.whats} WhatsApps</span><span>{user.conv} conversões</span></div>
        </div>)}
      </div>
      <div className="ranking-list">
        {ranking.map((user, index) => <div className="ranking-row" key={user.id}>
          <span className="rank-pos">{index + 1}º</span>
          <span className="user-avatar"><ProfilePhoto name={user.nome} photoUrl={user.photoUrl} size="small"/></span>
          <div><b>{user.nome}</b><small>{user.carteiraResumo || user.carteira}</small></div>
          <span>{user.calls} ligações</span><span>{user.whats} WhatsApps</span><span>{user.conv} conversões</span><strong>{user.points} pts</strong>
        </div>)}
      </div>
    </article>
  </section>;
}
