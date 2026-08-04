const vipLevels=['Platina','Rubi','Esmeralda','Diamante'];
const recoveryBases=['I6','Cessados','Intenções'];

export function scoreRevendedor(revendedor,history=[],agenda=[]){
  const interactions=history.filter(h=>h.revendedorId===revendedor.id);
  const pendingReturns=agenda.filter(a=>a.revendedorId===revendedor.id&&a.status!=='Concluído');
  const lastInteraction=[...interactions].sort((a,b)=>String(b.data).localeCompare(String(a.data)))[0];
  let score=25;
  const reasons=[];
  if(recoveryBases.includes(revendedor.base)){score+=30;reasons.push('base de recuperação');}
  if(vipLevels.includes(revendedor.nivel)){score+=18;reasons.push('alto valor');}
  if(revendedor.status==='Retorno'){score+=22;reasons.push('retorno solicitado');}
  if(revendedor.status==='Em contato'){score+=10;reasons.push('negociação ativa');}
  if(revendedor.status==='Convertido'){score-=35;reasons.push('já convertido');}
  if(pendingReturns.length){score+=15;reasons.push('agenda pendente');}
  if(!interactions.length){score+=8;reasons.push('sem contato registrado');}
  if(lastInteraction){
    const age=Math.floor((Date.now()-new Date(lastInteraction.data).getTime())/86400000);
    if(age>=7){score+=12;reasons.push(`${age} dias sem interação`);}
    if(lastInteraction.resultado==='Não atendeu'){score+=7;reasons.push('última tentativa sem resposta');}
  }
  score=Math.max(0,Math.min(100,score));
  const prioridade=score>=70?'Alta':score>=45?'Média':'Baixa';
  let recommendedChannel='WhatsApp';
  if(lastInteraction?.canal==='WhatsApp'&&lastInteraction?.resultado==='Não atendeu')recommendedChannel='Ligação';
  else if(recoveryBases.includes(revendedor.base))recommendedChannel='Ligação';
  const nextAction=revendedor.status==='Convertido'?'Acompanhar pós-venda':pendingReturns.length?'Cumprir retorno agendado':recommendedChannel==='Ligação'?'Ligar hoje':'Enviar abordagem personalizada';
  return{score,prioridade,motivoPrioridade:reasons.slice(0,3).join(' · ')||'Sem urgência registrada.',recommendedChannel,nextAction};
}

export const matchesCampaign=(r,g)=>g==='Todos'||(g==='Recuperação'&&recoveryBases.includes(r.base))||(g==='Cobre a Ouro'&&['Cobre','Bronze','Prata','Ouro'].includes(r.nivel))||(g==='VIP'&&vipLevels.includes(r.nivel));
