import { supabase } from '../lib/supabase';

const roleLabels = { administrador: 'Administrador', gerente: 'Gerente', consultor: 'Consultor' };
const walletLabels = { recuperacao: 'Recuperação', cobre_ouro: 'Cobre a Ouro', vip: 'VIP', todas: 'Todas' };
const roleValues = { Administrador: 'administrador', Gerente: 'gerente', Consultor: 'consultor' };
const walletValues = { Recuperação: 'recuperacao', 'Cobre a Ouro': 'cobre_ouro', VIP: 'vip', Todas: 'todas' };

export async function listOrganizationUsers(organizationId) {
  if (!supabase || !organizationId) return [];
  const [{ data: memberships, error: membershipError }, { data: profiles, error: profileError }] = await Promise.all([
    supabase.from('memberships').select('id, organization_id, user_id, role, wallet, active, created_at').eq('organization_id', organizationId).order('created_at'),
    supabase.from('profiles').select('id, full_name, email, phone, city, avatar_config, xp, coins, email_confirmed, created_at'),
  ]);
  if (membershipError) throw membershipError;
  if (profileError) throw profileError;
  const profilesById = new Map((profiles || []).map(profile => [profile.id, profile]));
  return (memberships || []).map(membership => {
    const profile = profilesById.get(membership.user_id) || {};
    return {
      id: membership.user_id,
      membershipId: membership.id,
      organizationId: membership.organization_id,
      nome: profile.full_name || profile.email || 'Colaborador',
      email: profile.email || '',
      telefone: profile.phone || '',
      cidade: profile.city || '',
      cargo: roleLabels[membership.role] || 'Consultor',
      carteira: walletLabels[membership.wallet] || 'Recuperação',
      ativo: membership.active,
      emailConfirmed: Boolean(profile.email_confirmed),
      avatarConfig: profile.avatar_config || {},
      xp: profile.xp || 0,
      coins: profile.coins || 0,
      createdAt: membership.created_at,
    };
  });
}

export async function updateMembership(userId, patch, organizationId) {
  if (!supabase) throw new Error('Supabase não configurado.');
  const dbPatch = {};
  if (patch.cargo) dbPatch.role = roleValues[patch.cargo] || patch.cargo;
  if (patch.carteira) dbPatch.wallet = walletValues[patch.carteira] || patch.carteira;
  if (typeof patch.ativo === 'boolean') dbPatch.active = patch.ativo;
  if (!Object.keys(dbPatch).length) return;
  const { error } = await supabase.from('memberships').update(dbPatch).eq('organization_id', organizationId).eq('user_id', userId);
  if (error) throw error;
}

export async function inviteCollaborator({ organizationId, nome, email, cargo, carteira }) {
  if (!supabase) throw new Error('Supabase não configurado.');
  const { data: sessionData } = await supabase.auth.getSession();
  if (!sessionData.session) throw new Error('Sua sessão expirou. Entre novamente.');
  const { data, error } = await supabase.functions.invoke('invite-collaborator', {
    body: {
      organizationId,
      fullName: nome.trim(),
      email: email.trim().toLowerCase(),
      role: roleValues[cargo] || 'consultor',
      wallet: walletValues[carteira] || 'recuperacao',
      redirectTo: `${window.location.origin}/`,
    },
  });
  if (error) throw new Error(error.message || 'Não foi possível enviar o convite.');
  if (data?.error) throw new Error(data.error);
  return data;
}
