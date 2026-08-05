-- Randers'CRM v10.7 — regras de carteira por situação no ciclo
-- Execute uma vez no SQL Editor antes de publicar a interface v10.7.
-- Idempotente: pode ser executado novamente sem duplicar dados.

begin;

alter table public.memberships
  add column if not exists activity_cycle_statuses text[] not null
  default array['Ativo','Ativo 1','Ativo 2','Ativo 3','Inativo 4','Inativo 5']::text[];

-- Mantém acesso completo para quem já trabalhava Atividade antes da atualização.
update public.memberships
set activity_cycle_statuses = array['Ativo','Ativo 1','Ativo 2','Ativo 3','Inativo 4','Inativo 5']::text[]
where role in ('administrador','gerente')
   or cardinality(activity_segments) > 0;

create index if not exists memberships_activity_cycle_statuses_gin_idx
  on public.memberships using gin (activity_cycle_statuses);

-- A Edge Function usa service_role para convites e atualizações iniciais.
grant select, insert, update, delete on table public.memberships to service_role;

commit;

-- Verificação opcional:
-- select user_id, role, activity_segments, activity_cycle_statuses, recovery_groups
-- from public.memberships
-- order by created_at;
