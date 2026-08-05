import { withSupabase } from "npm:@supabase/server@^1";

const ALLOWED_ROLES = new Set(["administrador", "gerente", "consultor"]);
const ALLOWED_WALLETS = new Set(["recuperacao", "cobre_ouro", "vip", "todas"]);
const ACTIVITY_SEGMENTS = new Set([
  "Cobre", "Bronze", "Prata", "Ouro", "Platina", "Rubi", "Esmeralda", "Diamante",
]);
const RECOVERY_GROUPS = new Set(["I6", "Cessados", "Intenções"]);

function uniqueAllowed(values: unknown, allowed: Set<string>): string[] {
  if (!Array.isArray(values)) return [];
  return [...new Set(values.filter((value): value is string =>
    typeof value === "string" && allowed.has(value)
  ))];
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Erro ao convidar colaborador.";
}

export default {
  fetch: withSupabase({ auth: "user" }, async (req, ctx) => {
    if (req.method !== "POST") {
      return Response.json({ error: "Método não permitido." }, { status: 405 });
    }

    let invitedUserId: string | null = null;

    try {
      const { data: authData, error: authError } = await ctx.supabase.auth.getUser();
      if (authError || !authData.user) {
        return Response.json({ error: "Sessão inválida." }, { status: 401 });
      }

      const body = await req.json();
      const organizationId = String(body.organizationId ?? "").trim();
      const fullName = String(body.fullName ?? "").trim();
      const email = String(body.email ?? "").trim().toLowerCase();
      const redirectTo = String(body.redirectTo ?? "").trim() || undefined;
      const requestedRole = String(body.role ?? "consultor").trim().toLowerCase();
      const role = ALLOWED_ROLES.has(requestedRole) ? requestedRole : "consultor";

      if (!organizationId || !fullName || !email) {
        return Response.json({ error: "Nome, e-mail e organização são obrigatórios." }, { status: 400 });
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return Response.json({ error: "Informe um e-mail válido." }, { status: 400 });
      }

      const { data: membership, error: membershipError } = await ctx.supabaseAdmin
        .from("memberships")
        .select("role, active")
        .eq("organization_id", organizationId)
        .eq("user_id", authData.user.id)
        .eq("active", true)
        .maybeSingle();

      if (membershipError) throw membershipError;
      if (!membership || membership.role !== "administrador") {
        return Response.json({ error: "Somente administradores podem convidar colaboradores." }, { status: 403 });
      }

      let activitySegments = uniqueAllowed(body.activitySegments, ACTIVITY_SEGMENTS);
      let recoveryGroups = uniqueAllowed(body.recoveryGroups, RECOVERY_GROUPS);
      let wallet = ALLOWED_WALLETS.has(String(body.wallet ?? "")) ? String(body.wallet) : "recuperacao";

      if (role === "administrador" || role === "gerente") {
        activitySegments = [...ACTIVITY_SEGMENTS];
        recoveryGroups = [...RECOVERY_GROUPS];
        wallet = "todas";
      }

      const { data: invited, error: inviteError } = await ctx.supabaseAdmin.auth.admin.inviteUserByEmail(email, {
        data: { full_name: fullName },
        redirectTo,
      });
      if (inviteError) throw inviteError;
      if (!invited.user) throw new Error("O Supabase não retornou o usuário convidado.");
      invitedUserId = invited.user.id;

      const { error: profileError } = await ctx.supabaseAdmin.from("profiles").upsert({
        id: invited.user.id,
        full_name: fullName,
        email,
        email_confirmed: false,
        must_change_password: true,
      }, { onConflict: "id" });
      if (profileError) throw profileError;

      const { error: membershipInsertError } = await ctx.supabaseAdmin.from("memberships").upsert({
        organization_id: organizationId,
        user_id: invited.user.id,
        role,
        wallet,
        activity_segments: activitySegments,
        recovery_groups: recoveryGroups,
        active: true,
      }, { onConflict: "organization_id,user_id" });
      if (membershipInsertError) throw membershipInsertError;

      return Response.json({ ok: true, userId: invited.user.id }, { status: 200 });
    } catch (error) {
      if (invitedUserId) {
        try { await ctx.supabaseAdmin.auth.admin.deleteUser(invitedUserId); } catch { /* rollback best effort */ }
      }
      console.error("invite-collaborator:", error);
      return Response.json({ error: errorMessage(error) }, { status: 400 });
    }
  }),
};
