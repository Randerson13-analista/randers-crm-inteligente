# Painel real de colaboradores

Esta versão lista usuários das tabelas `profiles` e `memberships`, permite alterar cargo, carteira e status, e envia convites por e-mail por meio da Edge Function `invite-collaborator`.

## Ação necessária no Supabase

1. Execute `supabase/team-admin-policies.sql` no SQL Editor.
2. Publique a função `supabase/functions/invite-collaborator/index.ts` como Edge Function com o nome `invite-collaborator`.
3. A função usa automaticamente os segredos nativos `SUPABASE_URL`, `SUPABASE_ANON_KEY` e `SUPABASE_SERVICE_ROLE_KEY`. Nunca coloque a service role no frontend ou na Vercel.

Depois disso, o botão “Enviar convite de acesso” funcionará dentro do CRM.
