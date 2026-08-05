import {
  RECOVERY_GROUPS,
  VIP_ACTIVITY_SEGMENTS,
  campaignGroupMatches,
  normalizeResellerClassification,
} from '../domain/portfolio';

export function scoreRevendedor(revendedor, history = [], agenda = []) {
  const normalized = normalizeResellerClassification(revendedor);
  const interactions = history.filter(item => item.revendedorId === revendedor.id);
  const pendingReturns = agenda.filter(item => item.revendedorId === revendedor.id && item.status !== 'Concluído');
  const lastInteraction = [...interactions].sort((a, b) => String(b.data).localeCompare(String(a.data)))[0];

  let score = 25;
  const reasons = [];

  if (RECOVERY_GROUPS.includes(normalized.base)) {
    score += 30;
    reasons.push('carteira de recuperação');
  }
  if (VIP_ACTIVITY_SEGMENTS.includes(normalized.nivel)) {
    score += 18;
    reasons.push(`atividade ${normalized.nivel}`);
  }
  if (revendedor.status === 'Retorno') {
    score += 22;
    reasons.push('retorno solicitado');
  }
  if (revendedor.status === 'Em contato') {
    score += 10;
    reasons.push('negociação ativa');
  }
  if (revendedor.status === 'Convertido') {
    score -= 35;
    reasons.push('já convertido');
  }
  if (pendingReturns.length) {
    score += 15;
    reasons.push('agenda pendente');
  }
  if (!interactions.length) {
    score += 8;
    reasons.push('sem contato registrado');
  }
  if (lastInteraction) {
    const age = Math.floor((Date.now() - new Date(lastInteraction.data).getTime()) / 86400000);
    if (age >= 7) {
      score += 12;
      reasons.push(`${age} dias sem interação`);
    }
    if (lastInteraction.resultado === 'Não atendeu') {
      score += 7;
      reasons.push('última tentativa sem resposta');
    }
  }

  score = Math.max(0, Math.min(100, score));
  const prioridade = score >= 70 ? 'Alta' : score >= 45 ? 'Média' : 'Baixa';
  let recommendedChannel = 'WhatsApp';
  if (lastInteraction?.canal === 'WhatsApp' && lastInteraction?.resultado === 'Não atendeu') recommendedChannel = 'Ligação';
  else if (RECOVERY_GROUPS.includes(normalized.base)) recommendedChannel = 'Ligação';

  const nextAction = revendedor.status === 'Convertido'
    ? 'Acompanhar pós-venda'
    : pendingReturns.length
      ? 'Cumprir retorno agendado'
      : recommendedChannel === 'Ligação'
        ? 'Ligar hoje'
        : 'Enviar abordagem personalizada';

  return {
    score,
    prioridade,
    motivoPrioridade: reasons.slice(0, 3).join(' · ') || 'Sem urgência registrada.',
    recommendedChannel,
    nextAction,
  };
}

export const matchesCampaign = (reseller, group) => campaignGroupMatches(reseller, group);
