import { supabase } from '../lib/supabase';

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
const statusFromDb = Object.fromEntries(Object.entries(statusToDb).map(([label, value]) => [value, label]));
const channelToDb = { Ligação: 'ligacao', WhatsApp: 'whatsapp', Visita: 'visita', Outro: 'outro' };
const channelFromDb = Object.fromEntries(Object.entries(channelToDb).map(([label, value]) => [value, label]));

const ensure = (error) => {
  if (error) throw error;
};

export function mapReseller(row) {
  return {
    id: row.id,
    codigo: row.external_code || '',
    nome: row.full_name || '',
    telefone: row.phone || '',
    cidade: row.city || '',
    bairro: row.neighborhood || '',
    nivel: row.level || '',
    base: row.base || '',
    atividade: row.activity || '',
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
  return {
    organization_id: organizationId,
    assigned_user_id: row.responsavelId || null,
    external_code: row.codigo || null,
    full_name: row.nome || 'Sem nome',
    phone: row.telefone || null,
    city: row.cidade || null,
    neighborhood: row.bairro || null,
    level: row.nivel || null,
    base: row.base || null,
    activity: row.atividade || null,
    status: statusToDb[row.status] || 'pendente',
    priority_score: Math.max(0, Math.min(100, Number(row.prioridadeScore || row.score || 0))),
    blocked: Boolean(row.bloqueado),
    metadata: row.metadata || {},
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
    supabase.from('import_jobs').select('*').eq('organization_id', organizationId).order('created_at', { ascending: false }),
  ];
  if (isManager) {
    queries.push(supabase.from('audit_logs').select('*').eq('organization_id', organizationId).order('created_at', { ascending: false }).limit(500));
  }

  const results = await Promise.all(queries);
  results.forEach(result => ensure(result.error));
  const [resellersResult, interactionsResult, tasksResult, goalsResult, campaignsResult, importsResult, auditResult] = results;
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

  const campaigns = (campaignsResult.data || []).map(row => ({
    id: row.id,
    name: row.name,
    group: row.audience?.group || 'Todos',
    message: row.message_template,
    status: row.status,
    lastRun: row.started_at,
    createdAt: row.created_at,
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

  return { revendedores, history, agenda, goals, campaigns, imports, audit };
}

export function emptyCrmData() {
  return { revendedores: [], history: [], agenda: [], goals: {}, campaigns: [], imports: [], audit: [] };
}

export async function updateReseller(id, patch) {
  const dbPatch = {};
  if ('status' in patch) dbPatch.status = statusToDb[patch.status] || patch.status;
  if ('responsavelId' in patch) dbPatch.assigned_user_id = patch.responsavelId || null;
  if ('nome' in patch) dbPatch.full_name = patch.nome;
  if ('telefone' in patch) dbPatch.phone = patch.telefone || null;
  if ('cidade' in patch) dbPatch.city = patch.cidade || null;
  if ('nivel' in patch) dbPatch.level = patch.nivel || null;
  if ('base' in patch) dbPatch.base = patch.base || null;
  if ('atividade' in patch) dbPatch.activity = patch.atividade || null;
  if ('bloqueado' in patch) dbPatch.blocked = Boolean(patch.bloqueado);
  if (!Object.keys(dbPatch).length) return;
  const { error } = await supabase.from('resellers').update(dbPatch).eq('id', id);
  ensure(error);
}

export async function importResellers(rows, organizationId, uploadedBy, fileName = 'Planilha importada') {
  if (!rows.length) return [];
  const payload = rows.map(row => resellerToDb(row, organizationId));
  const { data, error } = await supabase.from('resellers').insert(payload).select('*');
  ensure(error);
  await supabase.from('import_jobs').insert({
    organization_id: organizationId,
    uploaded_by: uploadedBy,
    file_name: fileName,
    detected_base: rows[0]?.base || null,
    total_rows: rows.length,
    inserted_rows: data?.length || rows.length,
    status: 'concluido',
    finished_at: new Date().toISOString(),
  });
  return (data || []).map(mapReseller);
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
  await supabase.from('resellers').update({ status: statusToDb[item.resultado] || 'pendente' }).eq('id', item.revendedorId);
  return data;
}

export async function createTask(item, organizationId, userId) {
  const dueAt = new Date(`${item.data}T${item.hora || '09:00'}:00`).toISOString();
  const { data, error } = await supabase.from('tasks').insert({
    organization_id: organizationId,
    reseller_id: item.revendedorId || null,
    assigned_user_id: item.responsavelId || userId,
    title: 'Retorno de revendedor',
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
  const { data, error } = await supabase.from('goals').upsert(payload, { onConflict: 'organization_id,user_id,period_start,period_end' }).select('*').single();
  ensure(error);
  return data;
}

export async function saveAvatar(userId, avatarConfig) {
  const { error } = await supabase.from('profiles').update({ avatar_config: avatarConfig }).eq('id', userId);
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
  return data;
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
