import React,{useMemo} from 'react';
import {Target,Trophy,Phone,MessageCircle,CheckCircle2} from 'lucide-react';import AvatarPreview from './AvatarPreview';

const metricCount=(history,user,channel)=>history.filter(h=>h.usuario===user.nome && (!channel || h.canal===channel)).length;
const conversions=(history,user)=>history.filter(h=>h.usuario===user.nome && h.resultado==='Convertido').length;

export default function GoalsRanking({users,history,goals,onGoalChange,currentUser}){
 const active=users.filter(u=>u.ativo);
 const ranking=useMemo(()=>active.map(u=>{
  const calls=metricCount(history,u,'Ligação');
  const whats=metricCount(history,u,'WhatsApp');
  const conv=conversions(history,u);
  return {...u,calls,whats,conv,points:calls+(whats*1)+(conv*5)};
 }).sort((a,b)=>b.points-a.points),[active,history]);
 const me=ranking.find(r=>r.id===currentUser.id)||ranking[0];
 const goal=goals[currentUser.id]||{calls:20,whats:30,conversions:5};
 const bars=[['Ligações',me?.calls||0,goal.calls,Phone],['WhatsApp',me?.whats||0,goal.whats,MessageCircle],['Conversões',me?.conv||0,goal.conversions,CheckCircle2]];
 return <section className="module-page">
  <div className="goals-layout">
   <article className="panel"><div className="panel-title"><h2>Minhas metas</h2><Target size={20}/></div><div className="goal-list">{bars.map(([label,value,target,Icon])=><div className="goal-item" key={label}><div className="goal-head"><span><Icon size={18}/><b>{label}</b></span><strong>{value}/{target}</strong></div><progress value={value} max={Math.max(target,1)}/><small>{Math.min(100,Math.round(value/Math.max(target,1)*100))}% concluído</small></div>)}</div></article>
   {currentUser.cargo==='Administrador'&&<article className="panel"><div className="panel-title"><h2>Configurar metas</h2><span>Por colaborador</span></div><div className="goal-admin">{active.map(u=>{const g=goals[u.id]||{calls:20,whats:30,conversions:5};return <div className="goal-user" key={u.id}><div className="goal-user-name"><span><AvatarPreview compact avatar={u.avatarConfig}/></span><div><b>{u.nome}</b><small>{u.carteira}</small></div></div><label>Ligações<input type="number" min="0" value={g.calls} onChange={e=>onGoalChange(u.id,{...g,calls:Number(e.target.value)})}/></label><label>WhatsApp<input type="number" min="0" value={g.whats} onChange={e=>onGoalChange(u.id,{...g,whats:Number(e.target.value)})}/></label><label>Conversões<input type="number" min="0" value={g.conversions} onChange={e=>onGoalChange(u.id,{...g,conversions:Number(e.target.value)})}/></label></div>})}</div></article>}
  </div>
  <article className="panel ranking-panel"><div className="panel-title"><h2>Ranking de colaboradores</h2><Trophy size={20}/></div><div className="podium">{ranking.slice(0,3).map((u,i)=><div className={`podium-card place-${i+1}`} key={u.id}><div className="medal">{['🥇','🥈','🥉'][i]}</div><div className="podium-avatar"><AvatarPreview compact avatar={u.avatarConfig}/></div><b>{u.nome}</b><small>{u.carteira}</small><strong>{u.points} pts</strong><div className="podium-stats"><span>{u.calls} ligações</span><span>{u.whats} WhatsApps</span><span>{u.conv} conversões</span></div></div>)}</div><div className="ranking-list">{ranking.map((u,i)=><div className="ranking-row" key={u.id}><span className="rank-pos">{i+1}º</span><span className="user-avatar"><AvatarPreview compact avatar={u.avatarConfig}/></span><div><b>{u.nome}</b><small>{u.carteira}</small></div><span>{u.calls} ligações</span><span>{u.whats} WhatsApps</span><span>{u.conv} conversões</span><strong>{u.points} pts</strong></div>)}</div></article>
 </section>
}
