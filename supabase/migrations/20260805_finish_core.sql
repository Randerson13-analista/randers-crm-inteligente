-- Randers'CRM — finalização dos módulos centrais
-- Execute uma vez no SQL Editor depois do schema inicial.
-- É idempotente: pode ser executado novamente em caso de interrupção.

begin;

alter table public.organizations
  add column if not exists settings jsonb not null default '{}'::jsonb;

alter table public.memberships
  add column if not exists activity_segments text[] not null default '{}'::text[],
  add column if not exists recovery_groups text[] not null default '{}'::text[],
  add column if not exists activity_cycle_statuses text[] not null default array['Ativo','Ativo 1','Ativo 2','Ativo 3','Inativo 4','Inativo 5']::text[];

-- Converte as carteiras legadas para regras explícitas.
update public.memberships
set activity_segments = case wallet
      when 'cobre_ouro' then array['Cobre','Bronze','Prata','Ouro']::text[]
      when 'vip' then array['Platina','Rubi','Esmeralda','Diamante']::text[]
      when 'todas' then array['Cobre','Bronze','Prata','Ouro','Platina','Rubi','Esmeralda','Diamante']::text[]
      else '{}'::text[]
    end,
    recovery_groups = case wallet
      when 'recuperacao' then array['I6','Cessados','Intenções']::text[]
      when 'todas' then array['I6','Cessados','Intenções']::text[]
      else '{}'::text[]
    end
where cardinality(activity_segments) = 0
  and cardinality(recovery_groups) = 0;

-- Administradores e gerentes sempre possuem visão completa.
update public.memberships
set activity_segments = array['Cobre','Bronze','Prata','Ouro','Platina','Rubi','Esmeralda','Diamante']::text[],
    recovery_groups = array['I6','Cessados','Intenções']::text[],
    activity_cycle_statuses = array['Ativo','Ativo 1','Ativo 2','Ativo 3','Inativo 4','Inativo 5']::text[],
    wallet = 'todas'
where role in ('administrador','gerente');

-- Corrige classificações antigas nas quais o nível foi salvo como base.
update public.resellers
set level = base,
    activity = base,
    base = 'Atividade'
where base in ('Cobre','Bronze','Prata','Ouro','Platina','Rubi','Esmeralda','Diamante');

update public.resellers
set base = 'Atividade'
where lower(coalesce(base,'')) = 'vip';

-- Quando registros de Atividade antigos tinham o nível apenas em activity.
update public.resellers
set level = activity
where base = 'Atividade'
  and coalesce(level,'') = ''
  and activity in ('Cobre','Bronze','Prata','Ouro','Platina','Rubi','Esmeralda','Diamante');

create index if not exists resellers_org_external_code_idx on public.resellers (organization_id, external_code);
create index if not exists resellers_org_phone_idx on public.resellers (organization_id, phone);
create index if not exists resellers_org_assigned_status_idx on public.resellers (organization_id, assigned_user_id, status);
create index if not exists resellers_org_base_level_idx on public.resellers (organization_id, base, level);
create index if not exists campaign_recipients_campaign_status_idx on public.campaign_recipients (campaign_id, status);
create index if not exists memberships_org_active_idx on public.memberships (organization_id, active);

-- Sincroniza a confirmação do perfil com o Supabase Auth.
create or replace function public.sync_profile_confirmation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.profiles
  set email = coalesce(new.email, email),
      email_confirmed = (new.email_confirmed_at is not null),
      updated_at = now()
  where id = new.id;
  return new;
end;
$$;

drop trigger if exists on_auth_user_confirmation_changed on auth.users;
create trigger on_auth_user_confirmation_changed
after update of email, email_confirmed_at on auth.users
for each row execute function public.sync_profile_confirmation();

-- Administradores podem editar os perfis dos integrantes da própria organização.
drop policy if exists "Administrators can update organization profiles" on public.profiles;
create policy "Administrators can update organization profiles"
on public.profiles for update to authenticated
using (
  (select public.current_app_role()) = 'administrador'
  and id in (
    select m.user_id from public.memberships m
    where m.organization_id = (select public.current_org_id())
  )
)
with check (
  id in (
    select m.user_id from public.memberships m
    where m.organization_id = (select public.current_org_id())
  )
);

-- Políticas idempotentes para a fila de campanhas.
drop policy if exists "Managers can manage campaign recipients" on public.campaign_recipients;
drop policy if exists "Managers can insert campaign recipients" on public.campaign_recipients;
drop policy if exists "Managers can update campaign recipients" on public.campaign_recipients;
drop policy if exists "Managers can delete campaign recipients" on public.campaign_recipients;

create policy "Managers can insert campaign recipients"
on public.campaign_recipients for insert to authenticated
with check (
  campaign_id in (
    select c.id from public.campaigns c
    where c.organization_id = (select public.current_org_id())
  ) and (select public.is_manager())
);

create policy "Managers can update campaign recipients"
on public.campaign_recipients for update to authenticated
using (
  campaign_id in (
    select c.id from public.campaigns c
    where c.organization_id = (select public.current_org_id())
  ) and (select public.is_manager())
)
with check (
  campaign_id in (
    select c.id from public.campaigns c
    where c.organization_id = (select public.current_org_id())
  )
);

create policy "Managers can delete campaign recipients"
on public.campaign_recipients for delete to authenticated
using (
  campaign_id in (
    select c.id from public.campaigns c
    where c.organization_id = (select public.current_org_id())
  ) and (select public.is_manager())
);

drop policy if exists "Consultants can update assigned campaign recipients" on public.campaign_recipients;
create policy "Consultants can update assigned campaign recipients"
on public.campaign_recipients for update to authenticated
using (
  reseller_id in (
    select r.id from public.resellers r
    where r.organization_id = (select public.current_org_id())
      and r.assigned_user_id = (select auth.uid())
  )
)
with check (
  reseller_id in (
    select r.id from public.resellers r
    where r.organization_id = (select public.current_org_id())
      and r.assigned_user_id = (select auth.uid())
  )
);

-- A organização pode ser atualizada apenas pelo administrador.
drop policy if exists "Administrators can update their organization" on public.organizations;
create policy "Administrators can update their organization"
on public.organizations for update to authenticated
using (
  id = (select public.current_org_id())
  and (select public.current_app_role()) = 'administrador'
)
with check (id = (select public.current_org_id()));

commit;
