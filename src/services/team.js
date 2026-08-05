import { supabase } from '../lib/supabase';
import {
  ACTIVITY_SEGMENTS,
  RECOVERY_GROUPS,
  STANDARD_ACTIVITY_SEGMENTS,
  VIP_ACTIVITY_SEGMENTS,
  WALLET_LABELS,
  defaultPortfolioForWallet,
  normalizeWalletLabel,
  summarizePortfolio,
} from '../domain/portfolio';

const roleLabels = {
  administrador: 'Administrador',
  gerente: 'Gerente',
  consultor: 'Consultor',
};

const walletLabels = {
  recuperacao: WALLET_LABELS.recovery,
  cobre_ouro: WALLET_LABELS.standard,
  vip: WALLET_LABELS.vip,
  todas: WALLET_LABELS.all,
};

const roleValues = {
  Administrador: 'administrador',
  Gerente: 'gerente',
  Consultor: 'consultor',
};

const walletValues = {
  [WALLET_LABELS.recovery]: 'recuperacao',
  [WALLET_LABELS.standard]: 'cobre_ouro',
  [WALLET_LABELS.vip]: 'vip',
  [WALLET_LABELS.all]: 'todas',
  'Cobre a Ouro': 'cobre_ouro',
  VIP: 'vip',
  Recuperação: 'recuperacao',
  Todas: 'todas',
};

function legacyWalletForRules(activitySegments = [], recoveryGroups = [], cargo = 'Consultor') {
  if (['Administrador', 'Gerente'].includes(cargo)) return 'todas';
  const activity = new Set(activitySegments);
  const recovery = new Set(recoveryGroups);
  if (ACTIVITY_SEGMENTS.every(item => activity.has(item)) && RECOVERY_GROUPS.every(item => recovery.has(item))) return 'todas';
  if (!activity.size && RECOVERY_GROUPS.every(item => recovery.has(item))) return 'recuperacao';
  if (!recovery.size && STANDARD_ACTIVITY_SEGMENTS.every(item => activity.has(item)) && activity.size === STANDARD_ACTIVITY_SEGMENTS.length) return 'cobre_ouro';
  if (!recovery.size && VIP_ACTIVITY_SEGMENTS.every(item => activity.has(item)) && activity.size === VIP_ACTIVITY_SEGMENTS.length) return 'vip';
  return activity.size ? 'cobre_ouro' : 'recuperacao';
}

export async function listOrganizationUsers(organizationId) {
  if (!supabase || !organizationId) return [];

  const [{ data: memberships, error: membershipError }, { data: profiles, error: profileError }] = await Promise.all([
    supabase
      .from('memberships')
      .select('*')
      .eq('organization_id', organizationId)
      .order('created_at'),
    supabase
      .from('profiles')
      .select('id, full_name, email, phone, city, bio, avatar_config, xp, coins, email_confirmed, must_change_password, created_at'),
  ]);

  if (membershipError) throw membershipError;
  if (profileError) throw profileError;

  const profilesById = new Map((profiles || []).map(profile => [profile.id, profile]));
  return (memberships || []).map(membership => {
    const profile = profilesById.get(membership.user_id) || {};
    const legacyWallet = normalizeWalletLabel(walletLabels[membership.wallet] || WALLET_LABELS.recovery);
    const defaults = defaultPortfolioForWallet(legacyWallet);
    const activitySegments = Array.isArray(membership.activity_segments)
      ? membership.activity_segments
      : defaults.activitySegments;
    const recoveryGroups = Array.isArray(membership.recovery_groups)
      ? membership.recovery_groups
      : defaults.recoveryGroups;
    const user = {
      id: membership.user_id,
      membershipId: membership.id,
      organizationId: membership.organization_id,
      nome: profile.full_name || profile.email || 'Colaborador',
      email: profile.email || '',
      telefone: profile.phone || '',
      cidade: profile.city || '',
      bio: profile.bio || '',
      cargo: roleLabels[membership.role] || 'Consultor',
      carteira: legacyWallet,
      activitySegments,
      recoveryGroups,
      ativo: membership.active,
      emailConfirmed: Boolean(profile.email_confirmed),
      mustChangePassword: Boolean(profile.must_change_password),
      avatarConfig: profile.avatar_config || {},
      xp: profile.xp || 0,
      coins: profile.coins || 0,
      createdAt: membership.created_at,
    };
    return { ...user, carteiraResumo: summarizePortfolio(user) };
  });
}

export async function updateMembership(userId, patch, organizationId) {
  if (!supabase) throw new Error('Supabase não configurado.');

  const membershipPatch = {};
  const cargo = patch.cargo;
  if (cargo) membershipPatch.role = roleValues[cargo] || cargo;
  if (typeof patch.ativo === 'boolean') membershipPatch.active = patch.ativo;

  if ('activitySegments' in patch) membershipPatch.activity_segments = [...new Set(patch.activitySegments || [])];
  if ('recoveryGroups' in patch) membershipPatch.recovery_groups = [...new Set(patch.recoveryGroups || [])];

  if (patch.carteira && !('activitySegments' in patch) && !('recoveryGroups' in patch)) {
    const normalizedWallet = normalizeWalletLabel(patch.carteira);
    const defaults = defaultPortfolioForWallet(normalizedWallet);
    membershipPatch.wallet = walletValues[normalizedWallet] || 'recuperacao';
    membershipPatch.activity_segments = defaults.activitySegments;
    membershipPatch.recovery_groups = defaults.recoveryGroups;
  } else if ('activitySegments' in patch || 'recoveryGroups' in patch || cargo) {
    membershipPatch.wallet = legacyWalletForRules(
      patch.activitySegments || [],
      patch.recoveryGroups || [],
      cargo || 'Consultor',
    );
  }

  if (Object.keys(membershipPatch).length) {
    const { error } = await supabase
      .from('memberships')
      .update(membershipPatch)
      .eq('organization_id', organizationId)
      .eq('user_id', userId);
    if (error) throw error;
  }

  const profilePatch = {};
  if ('nome' in patch) profilePatch.full_name = patch.nome?.trim() || '';
  if ('telefone' in patch) profilePatch.phone = patch.telefone || null;
  if ('cidade' in patch) profilePatch.city = patch.cidade || null;
  if ('bio' in patch) profilePatch.bio = patch.bio || null;

  if (Object.keys(profilePatch).length) {
    const { error } = await supabase.from('profiles').update(profilePatch).eq('id', userId);
    if (error) throw error;
  }
}

export async function inviteCollaborator({ organizationId, nome, email, cargo, carteira, activitySegments, recoveryGroups }) {
  if (!supabase) throw new Error('Supabase não configurado.');

  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  const session = sessionData?.session;
  if (sessionError || !session?.access_token) throw new Error('Sua sessão expirou. Saia do CRM e entre novamente.');

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const publishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  if (!supabaseUrl || !publishableKey) throw new Error('As variáveis do Supabase não estão configuradas na Vercel.');

  const defaults = defaultPortfolioForWallet(carteira);
  const selectedActivity = activitySegments?.length ? activitySegments : defaults.activitySegments;
  const selectedRecovery = recoveryGroups?.length ? recoveryGroups : defaults.recoveryGroups;
  const wallet = legacyWalletForRules(selectedActivity, selectedRecovery, cargo);
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 20000);

  try {
    const response = await fetch(`${supabaseUrl}/functions/v1/invite-collaborator`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${session.access_token}`,
        apikey: publishableKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        organizationId,
        fullName: nome.trim(),
        email: email.trim().toLowerCase(),
        role: roleValues[cargo] || 'consultor',
        wallet,
        activitySegments: selectedActivity,
        recoveryGroups: selectedRecovery,
        redirectTo: `${window.location.origin}/`,
      }),
      signal: controller.signal,
    });

    const raw = await response.text();
    let payload = {};
    if (raw) {
      try { payload = JSON.parse(raw); } catch { payload = { error: raw }; }
    }

    if (!response.ok) {
      const detail = payload?.error || payload?.message || `Erro HTTP ${response.status}`;
      if (response.status === 401) throw new Error('A função recusou sua sessão. Saia do CRM, entre novamente e tente outra vez.');
      if (response.status === 404) throw new Error('A função invite-collaborator não foi encontrada no projeto Supabase configurado.');
      throw new Error(detail);
    }

    if (payload?.error) throw new Error(payload.error);
    return payload;
  } catch (error) {
    if (error?.name === 'AbortError') {
      throw new Error('O servidor de convites não respondeu em 20 segundos. A tentativa foi cancelada para o botão não ficar travado.');
    }
    if (error instanceof TypeError && /fetch|network|failed/i.test(error.message || '')) {
      throw new Error('O navegador não conseguiu alcançar a Edge Function. Verifique a configuração JWT/CORS da função e tente novamente.');
    }
    throw error;
  } finally {
    window.clearTimeout(timeout);
  }
}

export { roleValues, walletValues, walletLabels };
