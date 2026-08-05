import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const authHeader = req.headers.get('Authorization') || ''
    const callerClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } })
    const adminClient = createClient(supabaseUrl, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } })

    const { data: userData, error: userError } = await callerClient.auth.getUser()
    if (userError || !userData.user) throw new Error('Sessão inválida.')

    const body = await req.json()
    const { organizationId, fullName, email, role, wallet, activitySegments, recoveryGroups, redirectTo } = body
    if (!organizationId || !fullName || !email) throw new Error('Nome, e-mail e organização são obrigatórios.')

    const { data: membership, error: membershipError } = await adminClient
      .from('memberships').select('role, active').eq('organization_id', organizationId)
      .eq('user_id', userData.user.id).eq('active', true).maybeSingle()
    if (membershipError) throw membershipError
    if (!membership || membership.role !== 'administrador') throw new Error('Somente administradores podem convidar colaboradores.')

    const { data: invited, error: inviteError } = await adminClient.auth.admin.inviteUserByEmail(email, {
      data: { full_name: fullName },
      redirectTo: redirectTo || undefined,
    })
    if (inviteError) throw inviteError
    if (!invited.user) throw new Error('O Supabase não retornou o usuário convidado.')

    const { error: profileError } = await adminClient.from('profiles').upsert({
      id: invited.user.id,
      full_name: fullName,
      email,
      email_confirmed: false,
      must_change_password: true,
    }, { onConflict: 'id' })
    if (profileError) throw profileError

    const { error: memberError } = await adminClient.from('memberships').upsert({
      organization_id: organizationId,
      user_id: invited.user.id,
      role: ['administrador','gerente','consultor'].includes(role) ? role : 'consultor',
      wallet: ['recuperacao','cobre_ouro','vip','todas'].includes(wallet) ? wallet : 'recuperacao',
      activity_segments: Array.isArray(activitySegments) ? activitySegments : [],
      recovery_groups: Array.isArray(recoveryGroups) ? recoveryGroups : [],
      active: true,
    }, { onConflict: 'organization_id,user_id' })
    if (memberError) throw memberError

    return new Response(JSON.stringify({ ok: true, userId: invited.user.id }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200,
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message || 'Erro ao convidar colaborador.' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400,
    })
  }
})
