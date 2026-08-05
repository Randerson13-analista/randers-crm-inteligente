import { withSupabase } from "npm:@supabase/server@^1";

const ALLOWED_ROLES = new Set(["administrador", "gerente", "consultor"]);
const ALLOWED_WALLETS = new Set(["recuperacao", "cobre_ouro", "vip", "todas"]);
const ACTIVITY_SEGMENTS = new Set([
  "Cobre", "Bronze", "Prata", "Ouro", "Platina", "Rubi", "Esmeralda", "Diamante",
]);
const RECOVERY_GROUPS = new Set(["I6", "Cessados", "Intenções"]);
const EMAIL_FALLBACK_CODES = new Set([
  "email_address_not_authorized",
  "over_email_send_rate_limit",
  "over_request_rate_limit",
]);

type UnknownRecord = Record<string, unknown>;

function uniqueAllowed(values: unknown, allowed: Set<string>): string[] {
  if (!Array.isArray(values)) return [];
  return [...new Set(values.filter((value): value is string =>
    typeof value === "string" && allowed.has(value)
  ))];
}

function asRecord(value: unknown): UnknownRecord {
  return value && typeof value === "object" ? value as UnknownRecord : {};
}

function errorInfo(error: unknown) {
  const source = asRecord(error);
  const message = error instanceof Error
    ? error.message
    : typeof source.message === "string"
      ? source.message
      : typeof source.error_description === "string"
        ? source.error_description
        : typeof source.details === "string"
          ? source.details
          : "Erro não identificado ao convidar colaborador.";

  return {
    message,
    code: typeof source.code === "string" ? source.code : undefined,
    status: typeof source.status === "number" ? source.status : undefined,
    details: typeof source.details === "string" ? source.details : undefined,
    hint: typeof source.hint === "string" ? source.hint : undefined,
  };
}

function jsonError(stage: string, error: unknown, fallbackStatus = 400) {
  const info = errorInfo(error);
  console.error("invite-collaborator", { stage, ...info, raw: error });
  return Response.json(
    { error: info.message, code: info.code, stage, details: info.details, hint: info.hint },
    { status: info.status && info.status >= 400 ? info.status : fallbackStatus },
  );
}

async function generateManualInvite(ctx: any, email: string, fullName: string, redirectTo?: string) {
  const { data, error } = await ctx.supabaseAdmin.auth.admin.generateLink({
    type: "invite",
    email,
    options: {
      data: { full_name: fullName },
      redirectTo,
    },
  });
  if (error) throw error;
  const user = data?.user;
  const inviteLink = data?.properties?.action_link;
  if (!user?.id || !inviteLink) {
    throw new Error("O Supabase não retornou o usuário ou o link de convite manual.");
  }
  return { user, inviteLink };
}

export default {
  fetch: withSupabase({ auth: "user" }, async (req, ctx) => {
    if (req.method !== "POST") {
      return Response.json({ error: "Método não permitido.", stage: "request" }, { status: 405 });
    }

    let stage = "request";
    let createdUserId: string | null = null;
    let delivery: "email" | "manual_link" = "email";
    let inviteLink: string | undefined;

    try {
      stage = "auth";
      const callerId = String(ctx.userClaims?.sub || ctx.userClaims?.id || "").trim();
      if (!callerId) {
        return Response.json({ error: "Sessão inválida ou sem identificação do usuário.", stage }, { status: 401 });
      }

      stage = "payload";
      const body = await req.json();
      const organizationId = String(body.organizationId ?? "").trim();
      const fullName = String(body.fullName ?? "").trim();
      const email = String(body.email ?? "").trim().toLowerCase();
      const redirectTo = String(body.redirectTo ?? "").trim() || undefined;
      const requestedRole = String(body.role ?? "consultor").trim().toLowerCase();
      const role = ALLOWED_ROLES.has(requestedRole) ? requestedRole : "consultor";

      if (!organizationId || !fullName || !email) {
        return Response.json({ error: "Nome, e-mail e organização são obrigatórios.", stage }, { status: 400 });
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return Response.json({ error: "Informe um e-mail válido.", stage }, { status: 400 });
      }

      stage = "authorization";
      const { data: membership, error: membershipError } = await ctx.supabaseAdmin
        .from("memberships")
        .select("role, active")
        .eq("organization_id", organizationId)
        .eq("user_id", callerId)
        .eq("active", true)
        .maybeSingle();
      if (membershipError) throw membershipError;
      if (!membership || membership.role !== "administrador") {
        return Response.json({ error: "Somente administradores podem convidar colaboradores.", stage }, { status: 403 });
      }

      let activitySegments = uniqueAllowed(body.activitySegments, ACTIVITY_SEGMENTS);
      let recoveryGroups = uniqueAllowed(body.recoveryGroups, RECOVERY_GROUPS);
      let wallet = ALLOWED_WALLETS.has(String(body.wallet ?? "")) ? String(body.wallet) : "recuperacao";

      if (role === "administrador" || role === "gerente") {
        activitySegments = [...ACTIVITY_SEGMENTS];
        recoveryGroups = [...RECOVERY_GROUPS];
        wallet = "todas";
      }

      stage = "existing_user";
      const { data: existingProfile, error: existingProfileError } = await ctx.supabaseAdmin
        .from("profiles")
        .select("id, email, email_confirmed")
        .eq("email", email)
        .maybeSingle();
      if (existingProfileError) throw existingProfileError;

      let invitedUser: any = existingProfile ? { id: existingProfile.id } : null;

      if (!invitedUser) {
        stage = "send_invite";
        const { data: invited, error: inviteError } = await ctx.supabaseAdmin.auth.admin.inviteUserByEmail(email, {
          data: { full_name: fullName },
          redirectTo,
        });

        if (inviteError) {
          const info = errorInfo(inviteError);
          if (info.code && EMAIL_FALLBACK_CODES.has(info.code)) {
            stage = "generate_manual_link";
            const generated = await generateManualInvite(ctx, email, fullName, redirectTo);
            invitedUser = generated.user;
            inviteLink = generated.inviteLink;
            delivery = "manual_link";
          } else {
            throw inviteError;
          }
        } else {
          invitedUser = invited?.user;
        }

        if (!invitedUser?.id) throw new Error("O Supabase não retornou o usuário convidado.");
        createdUserId = invitedUser.id;
      } else if (!existingProfile?.email_confirmed) {
        stage = "regenerate_manual_link";
        try {
          const generated = await generateManualInvite(ctx, email, fullName, redirectTo);
          inviteLink = generated.inviteLink;
          delivery = "manual_link";
        } catch (error) {
          const info = errorInfo(error);
          console.warn("invite-collaborator: não foi possível regenerar link", info);
        }
      }

      stage = "profile";
      const { error: profileError } = await ctx.supabaseAdmin.from("profiles").upsert({
        id: invitedUser.id,
        full_name: fullName,
        email,
        email_confirmed: Boolean(existingProfile?.email_confirmed),
        must_change_password: true,
      }, { onConflict: "id" });
      if (profileError) throw profileError;

      stage = "membership";
      const { error: membershipInsertError } = await ctx.supabaseAdmin.from("memberships").upsert({
        organization_id: organizationId,
        user_id: invitedUser.id,
        role,
        wallet,
        activity_segments: activitySegments,
        recovery_groups: recoveryGroups,
        active: true,
      }, { onConflict: "organization_id,user_id" });
      if (membershipInsertError) throw membershipInsertError;

      stage = "complete";
      return Response.json({
        ok: true,
        userId: invitedUser.id,
        delivery,
        inviteLink,
        existingUser: Boolean(existingProfile),
        message: delivery === "email"
          ? "Convite enviado por e-mail."
          : "O provedor padrão bloqueou o envio. Use o link manual gerado pelo CRM.",
      }, { status: 200 });
    } catch (error) {
      if (createdUserId && stage !== "profile" && stage !== "membership") {
        try { await ctx.supabaseAdmin.auth.admin.deleteUser(createdUserId); } catch { /* rollback best effort */ }
      }
      return jsonError(stage, error);
    }
  }),
};
