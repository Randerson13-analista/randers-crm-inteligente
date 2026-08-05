import { isSupabaseConfigured, supabase } from '../lib/supabase';
import { defaultAvatar } from '../data/avatarOptions';
import { WALLET_LABELS, defaultPortfolioForWallet, summarizePortfolio } from '../domain/portfolio';

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

export async function signInWithPassword(email, password) {
  if (!isSupabaseConfigured) throw new Error('O Supabase ainda não está configurado neste ambiente.');
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

export async function signOut() {
  if (!supabase) return;
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function sendPasswordReset(email) {
  if (!isSupabaseConfigured) throw new Error('O Supabase ainda não está configurado neste ambiente.');
  const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/` });
  if (error) throw error;
}

export async function changePassword(password) {
  if (!supabase) throw new Error('Supabase não configurado.');
  if (String(password || '').length < 8) throw new Error('A nova senha deve ter pelo menos 8 caracteres.');
  const { data, error } = await supabase.auth.updateUser({ password });
  if (error) throw error;
  if (data?.user?.id) {
    const { error: profileError } = await supabase
      .from('profiles')
      .update({ must_change_password: false })
      .eq('id', data.user.id);
    if (profileError) throw profileError;
  }
}

export async function getCurrentSession() {
  if (!supabase) return null;
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  return data.session;
}

export function onAuthStateChange(callback) {
  if (!supabase) return { unsubscribe() {} };
  const { data } = supabase.auth.onAuthStateChange((event, session) => callback(event, session));
  return data.subscription;
}

export async function loadAppUser(authUser) {
  if (!authUser || !supabase) return null;

  const [{ data: profile, error: profileError }, { data: membership, error: membershipError }] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', authUser.id).maybeSingle(),
    supabase
      .from('memberships')
      .select('*')
      .eq('user_id', authUser.id)
      .eq('active', true)
      .maybeSingle(),
  ]);

  if (profileError) throw profileError;
  if (membershipError) throw membershipError;
  if (!membership) throw new Error('Seu usuário não possui uma associação ativa no Randers’CRM.');

  const carteira = walletLabels[membership.wallet] || WALLET_LABELS.recovery;
  const defaults = defaultPortfolioForWallet(carteira);
  const appUser = {
    id: authUser.id,
    nome: profile?.full_name || authUser.user_metadata?.full_name || authUser.email?.split('@')[0] || 'Usuário',
    email: profile?.email || authUser.email || '',
    telefone: profile?.phone || '',
    cidade: profile?.city || '',
    bio: profile?.bio || '',
    cargo: roleLabels[membership.role] || 'Consultor',
    carteira,
    activitySegments: Array.isArray(membership.activity_segments) ? membership.activity_segments : defaults.activitySegments,
    recoveryGroups: Array.isArray(membership.recovery_groups) ? membership.recovery_groups : defaults.recoveryGroups,
    ativo: membership.active,
    organizationId: membership.organization_id,
    avatarConfig: profile?.avatar_config && Object.keys(profile.avatar_config).length ? profile.avatar_config : defaultAvatar,
    xp: profile?.xp || 0,
    coins: profile?.coins || 0,
    emailConfirmed: Boolean(authUser.email_confirmed_at),
    mustChangePassword: Boolean(profile?.must_change_password),
  };
  return { ...appUser, carteiraResumo: summarizePortfolio(appUser) };
}
