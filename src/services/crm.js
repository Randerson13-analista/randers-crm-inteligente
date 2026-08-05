import { supabase } from '../lib/supabase';
import { distributeWallets } from './assignment';
import { DEFAULT_TEMPLATES } from './whatsapp';
import {
  normalizeResellerClassification,
  normalizeWalletLabel,
} from '../domain/portfolio';

const statusToDb = {
  Pendente: 'pendente',
  'Não atendeu': 'nao_atendeu',
  'Em contato': 'em_contato',
  Retorno: 'retorno',
  Negociando: 'negociando',
  Pedido: 'pedido',
  Convertido: 'convertido',
  'Não converteu': 'sem_interesse',
  'Sem interesse': 'sem_interesse',
};

const statusFromDb = Object.fromEntries(
  Object.entries(statusToDb).map(([label, value]) => [value, label]),
);

const channelToDb = {
  Ligação: 'ligacao',
  WhatsApp: 'whatsapp',
  Visita: 'visita',
  Outro: 'outro',
};

const channelFromDb = Object.fromEntries(
  Object.entries(channelToDb).map(([label, value]) => [value, label]),
);

export const DEFAULT_ORGANIZATION_SETTINGS = {
  companyName: 'Randers CRM',
  autoAssignment: true,
  whatsappTemplates: DEFAULT_TEMPLATES,
  showAdvancedCloset: true,
};

const ensure = error => {
  if (error) throw error;
};

const normalizeText = value => String(value ?? '')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .trim()
  .toLowerCase();

const normalizePhoneKey = value => {
  let digits = String(value || '').replace(/\D/g, '');
  if (digits.startsWith('55') && digits.length > 11) digits = digits.slice(2);
  return digits;
};

const rowIdentity = row => {
  const code = normalizeText(row.codigo);
  if (code) return `code:${code}`;
  const phone = normalizePhoneKey(row.telefone);
  if (phone) return `phone:${phone}`;
  return `name:${normalizeText(row.nome)}|${normalizeText(row.cidade)}`;
};

const mergeSettings = settings => ({
  ...DEFAULT_ORGANIZATION_SETTINGS,
  ...(settings || {}),
  whatsappTemplates: {
    ...DEFAULT_TEMPLATES,
    ...(settings?.whatsappTemplates || {}),
  },
});

export function mapReseller(row) {
  const normalized = normalizeResellerClassification({
    id: row.id,
    codigo: row.external_code || '',
    nome: row.full_name || '',
    telefone: row.phone || '',
    cidade: row.city || '',
    bairro: row.neighborhood || '',
    nivel: row.level || '',
    base: row.base || '',
    atividade: row.activity || '',
  });

  return {
    ...normalized,
    status: statusFromDb[row.status] || 'Pendente',
    prioridadeScore: row.priority_score || 0,
    bloqueado: Boolean(row.blocked),
    responsavelId: row.assigned_user_id || null,
    ultimaCompra: row.last_purchase_at || null,
    ultimoPedidoValor: row.last_order_value || null,
    metadata: row.metadata || {},
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function resellerToDb(row, organizationId) {
  const normalized = normalizeResellerClassification(row);
  return {
    organization_id: organizationId,
    assigned_user_id: normalized.responsavelId || null,
    external_code: normalized.codigo || null,
    full_name: normalized.nome || 'Sem nome',
    phone: normalized.telefone || null,
    city: normalized.cidade || null,
    neighborhood: normalized.bairro || null,
    level: normalized.nivel || null,
    base: normalized.base || null,
    activity: normalized.nivel || null,
    status: statusToDb[normalized.status] || 'pendente',
    priority_score: Math.max(0, Math.min(100, Number(normalized.prioridadeScore || normalized.score || 0))),
    blocked: Boolean(normalized.bloqueado),
    metadata: normalized.metadata || {},
  };
}

export async function loadCrmData(organizationId, users, isManager) {
  if (!supabase || !organizationId) return emptyCrmData();

  const queries = [
    supabase.from('resellers').select('*').eq('organization_id', organizationId).order('created_at', { ascending: false }),
    supabase.from('interactions').select('*').eq('organization_id', organizationId).order('occurred_at', { ascending: false }),
    supabase.from('tasks').select('*').eq('organization_id', organizationId).order('due_at', { ascending: true }),
    supabase.from('goals').select('*').eq('organization_id', organizationId).order('period_start', { ascending: false }),
    supabase.from('campaigns').select('*').eq('organization_id', organizationId).order('created_at', { ascending: false }),
    supabase.from('campaign_recipients').select('campaign_id, reseller_id, status, sent_at, replied_at, converted_at'),
    supabase.from('import_jobs').select('*').eq('organization_id', organizationId).order('created_at', { ascending: false }),
    supabase.from('organizations').select('*').eq('id', organizationId).single(),
  ];

  if (isManager) {
    queries.push(
      supabase.from('audit_logs').select('*').eq('organization_id', organizationId).order('created_at', { ascending: false }).limit(500),
    );
  }

  const results = await Promise.all(queries);
  results.forEach(result => ensure(result.error));

  const [
    resellersResult,
    interactionsResult,
    tasksResult,
    goalsResult,
    campaignsResult,
    recipientsResult,
    importsResult,
    organizationResult,
    auditResult,
  ] = results;

  const usersById = new Map((users || []).map(item => [item.id, item]));
  const revendedores = (resellersResult.data || []).map(row => {
    const reseller = mapReseller(row);
    const responsible = usersById.get(reseller.responsavelId);
    return { ...reseller, responsavel: responsible?.nome || '' };
  });

  const history = (interactionsResult.data || []).map(row => ({
    id: row.id,
    revendedorId: row.reseller_id,
    userId: row.user_id,
    usuario: usersById.get(row.user_id)?.nome || 'Usuário',
    canal: channelFromDb[row.channel] || 'Outro',
    resultado: statusFromDb[row.result] || 'Pendente',
    observacao: row.notes || '',
    data: row.occurred_at,
  }));

  const agenda = (tasksResult.data || []).map(row => {
    const due = new Date(row.due_at);
    return {
      id: row.id,
      revendedorId: row.reseller_id || '',
      responsavelId: row.assigned_user_id,
      responsavel: usersById.get(row.assigned_user_id)?.nome || 'Usuário',
      data: due.toISOString().slice(0, 10),
      hora: due.toTimeString().slice(0, 5),
      observacao: row.notes || row.title || '',
      status: row.completed_at ? 'Concluído' : 'Pendente',
    };
  });

  const goals = {};
  (goalsResult.data || []).forEach(row => {
    if (goals[row.user_id]) return;
    goals[row.user_id] = {
      id: row.id,
      calls: row.calls_target || 0,
      whats: row.whatsapp_target || 0,
      conversions: row.conversions_target || 0,
      orders: row.orders_target || 0,
      periodStart: row.period_start,
      periodEnd: row.period_end,
    };
  });

  const recipientMetrics = (recipientsResult.data || []).reduce((result, row) => {
    result[row.campaign_id] ||= { sent: 0, replies: 0, conversions: 0, pending: 0 };
    const metrics = result[row.campaign_id];
    if (row.sent_at || row.status === 'aberto' || row.status === 'enviado') metrics.sent += 1;
    if (row.replied_at) metrics.replies += 1;
    if (row.converted_at) metrics.conversions += 1;
    if (!row.sent_at && row.status === 'pendente') metrics.pending += 1;
    return result;
  }, {});

  const campaigns = (campaignsResult.data || []).map(row => ({
    id: row.id,
    name: row.name,
    group: row.audience?.group || 'Todos',
    message: row.message_template,
    status: row.status,
    lastRun: row.started_at,
    createdAt: row.created_at,
    ...(recipientMetrics[row.id] || { sent: 0, replies: 0, conversions: 0, pending: 0 }),
  }));

  const imports = (importsResult.data || []).map(row => ({
    id: row.id,
    name: row.file_name,
    type: row.detected_base || row.file_type || '',
    rows: row.total_rows || 0,
    count: row.total_rows || 0,
    inserted: row.inserted_rows || 0,
    updated: row.updated_rows || 0,
    rejected: row.rejected_rows || 0,
    status: row.status,
    date: row.created_at,
  }));

  const audit = (auditResult?.data || []).map(row => ({
    id: String(row.id),
    date: row.created_at,
    user: usersById.get(row.user_id)?.nome || 'Sistema',
    action: row.action,
    details: row.details || {},
  }));

  const organization = organizationResult.data || {};
  return {
    revendedores,
    history,
    agenda,
    goals,
    campaigns,
    imports,
    audit,
    organization: {
      id: organization.id || organizationId,
      name: organization.name || 'Randers CRM',
      settings: mergeSettings(organization.settings),
    },
  };
}

export function emptyCrmData() {
  return {
    revendedores: [],
    history: [],
    agenda: [],
    goals: {},
    campaigns: [],
    imports: [],
    audit: [],
    organization: {
      id: null,
      name: 'Randers CRM',
      settings: mergeSettings(),
    },
  };
}

export async function createReseller(row, organizationId) {
  const payload = resellerToDb(row, organizationId);
  const { data, error } = await supabase.from('resellers').insert(payload).select('*').single();
  ensure(error);
  return mapReseller(data);
}

export async function updateReseller(id, patch) {
  const normalized = normalizeResellerClassification(patch);
  const dbPatch = {};
  if ('status' in patch) dbPatch.status = statusToDb[patch.status] || patch.status;
  if ('responsavelId' in patch) dbPatch.assigned_user_id = patch.responsavelId || null;
  if ('nome' in patch) dbPatch.full_name = patch.nome;
  if ('telefone' in patch) dbPatch.phone = patch.telefone || null;
  if ('cidade' in patch) dbPatch.city = patch.cidade || null;
  if ('bairro' in patch) dbPatch.neighborhood = patch.bairro || null;
  if ('codigo' in patch) dbPatch.external_code = patch.codigo || null;
  if ('nivel' in patch || 'base' in patch || 'atividade' in patch) {
    dbPatch.base = normalized.base || null;
    dbPatch.level = normalized.nivel || null;
    dbPatch.activity = normalized.nivel || null;
  }
  if ('bloqueado' in patch) dbPatch.blocked = Boolean(patch.bloqueado);
  if (!Object.keys(dbPatch).length) return;
  const { error } = await supabase.from('resellers').update(dbPatch).eq('id', id);
  ensure(error);
}

export async function deleteReseller(id) {
  const { error } = await supabase.from('resellers').delete().eq('id', id);
  ensure(error);
}

export async function importResellers(
  rows,
  organizationId,
  uploadedBy,
  fileName = 'Planilha importada',
  options = {},
) {
  if (!rows.length) return { total: 0, inserted: 0, updated: 0, rejected: 0 };

  const consolidated = new Map();
  let rejected = 0;
  for (const raw of rows) {
    const normalized = normalizeResellerClassification(raw);
    if (!String(normalized.nome || '').trim()) {
      rejected += 1;
      continue;
    }
    consolidated.set(rowIdentity(normalized), {
      ...(consolidated.get(rowIdentity(normalized)) || {}),
      ...normalized,
    });
  }

  let prepared = [...consolidated.values()];
  if (options.autoAssign && options.users?.length) {
    prepared = distributeWallets(prepared, options.users);
  }

  const { data: existingRows, error: existingError } = await supabase
    .from('resellers')
    .select('*')
    .eq('organization_id', organizationId);
  ensure(existingError);

  const existing = (existingRows || []).map(mapReseller);
  const existingByKey = new Map();
  existing.forEach(item => {
    const keys = [
      item.codigo ? `code:${normalizeText(item.codigo)}` : '',
      item.telefone ? `phone:${normalizePhoneKey(item.telefone)}` : '',
      `name:${normalizeText(item.nome)}|${normalizeText(item.cidade)}`,
    ].filter(Boolean);
    keys.forEach(key => existingByKey.set(key, item));
  });

  const inserts = [];
  const updates = [];
  for (const row of prepared) {
    const keys = [
      row.codigo ? `code:${normalizeText(row.codigo)}` : '',
      row.telefone ? `phone:${normalizePhoneKey(row.telefone)}` : '',
      `name:${normalizeText(row.nome)}|${normalizeText(row.cidade)}`,
    ].filter(Boolean);
    const match = keys.map(key => existingByKey.get(key)).find(Boolean);
    if (match) updates.push({ id: match.id, payload: resellerToDb(row, organizationId) });
    else inserts.push(resellerToDb(row, organizationId));
  }

  let insertedCount = 0;
  for (let index = 0; index < inserts.length; index += 400) {
    const batch = inserts.slice(index, index + 400);
    const { data, error } = await supabase.from('resellers').insert(batch).select('id');
    ensure(error);
    insertedCount += data?.length || batch.length;
  }

  let updatedCount = 0;
  for (let index = 0; index < updates.length; index += 25) {
    const batch = updates.slice(index, index + 25);
    const results = await Promise.all(batch.map(({ id, payload }) => {
      const { organization_id: _organizationId, ...patch } = payload;
      return supabase.from('resellers').update(patch).eq('id', id);
    }));
    results.forEach(result => ensure(result.error));
    updatedCount += batch.length;
  }

  const detectedBase = prepared.some(item => item.base === 'Atividade')
    ? 'Atividade'
    : prepared[0]?.base || null;

  const { error: importError } = await supabase.from('import_jobs').insert({
    organization_id: organizationId,
    uploaded_by: uploadedBy,
    file_name: fileName,
    detected_base: detectedBase,
    total_rows: rows.length,
    inserted_rows: insertedCount,
    updated_rows: updatedCount,
    rejected_rows: rejected,
    status: 'concluido',
    finished_at: new Date().toISOString(),
  });
  ensure(importError);

  return {
    total: rows.length,
    inserted: insertedCount,
    updated: updatedCount,
    rejected,
  };
}

export async function persistAssignments(revendedores, users, organizationId) {
  const distributed = distributeWallets(revendedores, users);
  const changes = distributed.filter(item => {
    const original = revendedores.find(source => source.id === item.id);
    return original && (original.responsavelId || null) !== (item.responsavelId || null);
  });

  for (let index = 0; index < changes.length; index += 25) {
    const batch = changes.slice(index, index + 25);
    const results = await Promise.all(batch.map(item => supabase
      .from('resellers')
      .update({ assigned_user_id: item.responsavelId || null })
      .eq('organization_id', organizationId)
      .eq('id', item.id)));
    results.forEach(result => ensure(result.error));
  }

  return {
    changed: changes.length,
    unassigned: distributed.filter(item => !item.responsavelId).length,
    distributed,
  };
}

export async function createInteraction(item, organizationId, userId) {
  const { data, error } = await supabase.from('interactions').insert({
    organization_id: organizationId,
    reseller_id: item.revendedorId,
    user_id: userId,
    channel: channelToDb[item.canal] || 'outro',
    result: statusToDb[item.resultado] || 'pendente',
    notes: item.observacao || null,
    occurred_at: item.data || new Date().toISOString(),
  }).select('*').single();
  ensure(error);

  const { error: statusError } = await supabase
    .from('resellers')
    .update({ status: statusToDb[item.resultado] || 'pendente' })
    .eq('id', item.revendedorId);
  ensure(statusError);

  // Vincula a resposta à campanha aberta mais recente desse revendedor.
  const { data: campaignRecipient, error: recipientLookupError } = await supabase
    .from('campaign_recipients')
    .select('id')
    .eq('reseller_id', item.revendedorId)
    .eq('status', 'aberto')
    .order('sent_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!recipientLookupError && campaignRecipient) {
    const now = new Date().toISOString();
    const campaignPatch = {
      replied_at: now,
      status: item.resultado === 'Convertido' ? 'convertido' : 'respondido',
      ...(item.resultado === 'Convertido' ? { converted_at: now } : {}),
    };
    const { error: recipientUpdateError } = await supabase
      .from('campaign_recipients')
      .update(campaignPatch)
      .eq('id', campaignRecipient.id);
    if (recipientUpdateError) console.warn('Não foi possível atualizar a métrica da campanha:', recipientUpdateError.message);
  }
  return data;
}

export async function createTask(item, organizationId, userId) {
  const dueAt = new Date(`${item.data}T${item.hora || '09:00'}:00`).toISOString();
  const { data, error } = await supabase.from('tasks').insert({
    organization_id: organizationId,
    reseller_id: item.revendedorId || null,
    assigned_user_id: item.responsavelId || userId,
    title: item.titulo || 'Retorno de revendedor',
    notes: item.observacao || null,
    due_at: dueAt,
    created_by: userId,
  }).select('*').single();
  ensure(error);
  return data;
}

export async function updateTask(id, patch) {
  const dbPatch = {};
  if ('status' in patch) dbPatch.completed_at = patch.status === 'Concluído' ? new Date().toISOString() : null;
  if ('observacao' in patch) dbPatch.notes = patch.observacao || null;
  if ('data' in patch || 'hora' in patch) {
    const date = patch.data || new Date().toISOString().slice(0, 10);
    const time = patch.hora || '09:00';
    dbPatch.due_at = new Date(`${date}T${time}:00`).toISOString();
  }
  const { error } = await supabase.from('tasks').update(dbPatch).eq('id', id);
  ensure(error);
}

export async function saveGoal(userId, goal, organizationId, createdBy) {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10);
  const payload = {
    organization_id: organizationId,
    user_id: userId,
    period_start: goal.periodStart || start,
    period_end: goal.periodEnd || end,
    calls_target: Number(goal.calls || 0),
    whatsapp_target: Number(goal.whats || 0),
    conversions_target: Number(goal.conversions || 0),
    orders_target: Number(goal.orders || 0),
    created_by: createdBy,
  };
  const { data, error } = await supabase
    .from('goals')
    .upsert(payload, { onConflict: 'organization_id,user_id,period_start,period_end' })
    .select('*')
    .single();
  ensure(error);
  return data;
}

export async function saveAvatar(userId, avatarConfig) {
  const { error } = await supabase.from('profiles').update({ avatar_config: avatarConfig }).eq('id', userId);
  ensure(error);
}

export async function updateProfile(userId, patch) {
  const dbPatch = {};
  if ('nome' in patch) dbPatch.full_name = patch.nome?.trim() || '';
  if ('telefone' in patch) dbPatch.phone = patch.telefone || null;
  if ('cidade' in patch) dbPatch.city = patch.cidade || null;
  if ('bio' in patch) dbPatch.bio = patch.bio || null;
  const { error } = await supabase.from('profiles').update(dbPatch).eq('id', userId);
  ensure(error);
}

export async function saveOrganizationSettings(organizationId, name, settings) {
  const { error } = await supabase
    .from('organizations')
    .update({ name: name || 'Randers CRM', settings: mergeSettings(settings) })
    .eq('id', organizationId);
  ensure(error);
}

export async function createCampaign(campaign, organizationId, userId) {
  const { data, error } = await supabase.from('campaigns').insert({
    organization_id: organizationId,
    created_by: userId,
    name: campaign.name,
    audience: { group: campaign.group },
    message_template: campaign.message,
    status: campaign.status || 'rascunho',
  }).select('*').single();
  ensure(error);

  const resellerIds = [...new Set(campaign.resellerIds || [])];
  if (resellerIds.length) {
    const recipients = resellerIds.map(resellerId => ({
      campaign_id: data.id,
      reseller_id: resellerId,
      status: 'pendente',
    }));
    const { error: recipientError } = await supabase.from('campaign_recipients').insert(recipients);
    ensure(recipientError);
  }
  return data;
}

export async function getNextCampaignRecipient(campaignId) {
  const { data: recipient, error } = await supabase
    .from('campaign_recipients')
    .select('id, reseller_id')
    .eq('campaign_id', campaignId)
    .eq('status', 'pendente')
    .order('id')
    .limit(1)
    .maybeSingle();
  ensure(error);
  if (!recipient) return null;

  const { data: resellerRow, error: resellerError } = await supabase
    .from('resellers')
    .select('*')
    .eq('id', recipient.reseller_id)
    .single();
  ensure(resellerError);

  const now = new Date().toISOString();
  const { error: updateError } = await supabase
    .from('campaign_recipients')
    .update({ status: 'aberto', sent_at: now })
    .eq('id', recipient.id);
  ensure(updateError);

  const { error: campaignError } = await supabase
    .from('campaigns')
    .update({ status: 'em_andamento', started_at: now })
    .eq('id', campaignId);
  ensure(campaignError);

  return mapReseller(resellerRow);
}

export async function deleteCampaign(id) {
  const { error } = await supabase.from('campaigns').delete().eq('id', id);
  ensure(error);
}

export async function logAudit(organizationId, userId, action, entityType = null, entityId = null, details = {}) {
  if (!supabase || !organizationId || !userId) return;
  const { error } = await supabase.from('audit_logs').insert({
    organization_id: organizationId,
    user_id: userId,
    action,
    entity_type: entityType,
    entity_id: entityId ? String(entityId) : null,
    details,
  });
  if (error) console.warn('Falha ao gravar auditoria:', error.message);
}
