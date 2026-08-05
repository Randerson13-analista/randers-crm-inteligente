# Supabase — atualização obrigatória

## Banco existente

No SQL Editor, execute uma vez:

```text
supabase/migrations/20260805_finish_core.sql
```

A migração é idempotente e adiciona:

- configurações da organização;
- segmentações detalhadas nas associações;
- correção das classificações legadas;
- índices;
- políticas de perfil e campanhas;
- sincronização do status de confirmação do e-mail.

## Convite de colaboradores

Publique novamente a função:

```text
supabase/functions/invite-collaborator/index.ts
```

A função usa variáveis secretas gerenciadas automaticamente pelo Supabase. Nunca coloque a `service_role` no frontend ou na Vercel.
