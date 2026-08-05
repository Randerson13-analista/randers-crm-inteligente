export const CAMPAIGN_STATUS_LABELS = {
  rascunho: 'Rascunho',
  agendada: 'Agendada',
  em_andamento: 'Em andamento',
  concluida: 'Concluída',
  pausada: 'Pausada',
};

export const RECIPIENT_STATUS_LABELS = {
  pendente: 'Pendente',
  aberto: 'Conversa aberta',
  enviado: 'Enviado',
  respondeu: 'Respondeu',
  convertido: 'Convertido',
  nao_respondeu: 'Não respondeu',
  bloqueado: 'Não deseja mensagens',
};

const normalize = value => String(value || '')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase()
  .trim();

const SENT_STATUSES = new Set(['enviado', 'respondeu', 'convertido', 'nao_respondeu', 'bloqueado']);
const REPLY_STATUSES = new Set(['respondeu', 'convertido']);

export function campaignRecipientCounts(campaign = {}) {
  const recipients = campaign.recipients || [];
  const counts = {
    total: recipients.length || Number(campaign.total || 0),
    pending: 0,
    opened: 0,
    sent: 0,
    replied: 0,
    converted: 0,
    noReply: 0,
    blocked: 0,
    worked: 0,
  };

  recipients.forEach(recipient => {
    const status = recipient.status || 'pendente';
    if (status === 'pendente') counts.pending += 1;
    if (status === 'aberto') counts.opened += 1;
    if (status === 'enviado') counts.sent += 1;
    if (status === 'respondeu') counts.replied += 1;
    if (status === 'convertido') counts.converted += 1;
    if (status === 'nao_respondeu') counts.noReply += 1;
    if (status === 'bloqueado') counts.blocked += 1;
    if (status !== 'pendente') counts.worked += 1;
  });

  if (!recipients.length) {
    counts.pending = Number(campaign.pending || 0);
    counts.worked = Number(campaign.sent || 0);
    counts.replied = Number(campaign.replies || 0);
    counts.converted = Number(campaign.conversions || 0);
  }

  counts.confirmedSent = recipients.length
    ? recipients.filter(recipient => SENT_STATUSES.has(recipient.status)).length
    : counts.worked;
  counts.responses = recipients.length
    ? recipients.filter(recipient => REPLY_STATUSES.has(recipient.status)).length
    : counts.replied;
  counts.replyRate = counts.confirmedSent ? Math.round((counts.responses / counts.confirmedSent) * 100) : 0;
  counts.conversionRate = counts.confirmedSent ? Math.round((counts.converted / counts.confirmedSent) * 100) : 0;
  counts.progress = counts.total ? Math.round((counts.worked / counts.total) * 100) : 0;
  return counts;
}

export function campaignSummary(campaigns = []) {
  const summary = {
    campaigns: campaigns.length,
    concluded: 0,
    total: 0,
    pending: 0,
    worked: 0,
    confirmedSent: 0,
    responses: 0,
    conversions: 0,
    blocked: 0,
  };

  campaigns.forEach(campaign => {
    const counts = campaignRecipientCounts(campaign);
    if (campaign.status === 'concluida') summary.concluded += 1;
    summary.total += counts.total;
    summary.pending += counts.pending;
    summary.worked += counts.worked;
    summary.confirmedSent += counts.confirmedSent;
    summary.responses += counts.responses;
    summary.conversions += counts.converted;
    summary.blocked += counts.blocked;
  });

  summary.replyRate = summary.confirmedSent ? Math.round((summary.responses / summary.confirmedSent) * 100) : 0;
  summary.conversionRate = summary.confirmedSent ? Math.round((summary.conversions / summary.confirmedSent) * 100) : 0;
  return summary;
}

export function filterCampaigns(campaigns = [], { period = 'Todos', status = 'Todos', query = '' } = {}) {
  const cutoff = period === 'Todos' ? null : Date.now() - Number(period) * 86400000;
  const needle = normalize(query);

  return campaigns.filter(campaign => {
    const createdAt = new Date(campaign.createdAt || campaign.date || 0).getTime();
    const matchesPeriod = cutoff === null || (Number.isFinite(createdAt) && createdAt >= cutoff);
    const matchesStatus = status === 'Todos' || campaign.status === status;
    const haystack = normalize([
      campaign.name,
      campaign.group,
      campaign.createdByName,
      campaign.audience?.flow,
      campaign.audience?.cycleStatus,
      campaign.audience?.city,
      campaign.audience?.owner,
    ].join(' '));
    const matchesQuery = !needle || haystack.includes(needle);
    return matchesPeriod && matchesStatus && matchesQuery;
  });
}

export function campaignStatusLabel(status) {
  return CAMPAIGN_STATUS_LABELS[status] || status || 'Rascunho';
}

export function recipientStatusLabel(status) {
  return RECIPIENT_STATUS_LABELS[status] || status || 'Pendente';
}

export function campaignAudienceLabel(campaign = {}) {
  const audience = campaign.audience || {};
  return [
    audience.flow && audience.flow !== 'Todos' ? audience.flow : null,
    audience.group && audience.group !== 'Todos' ? audience.group : campaign.group !== 'Todos' ? campaign.group : null,
    audience.cycleStatus && audience.cycleStatus !== 'Todos' ? audience.cycleStatus : null,
    audience.city && audience.city !== 'Todas' ? audience.city : null,
    audience.owner && audience.owner !== 'Todos' ? audience.owner : null,
  ].filter(Boolean).join(' · ') || 'Todos os filtros';
}
