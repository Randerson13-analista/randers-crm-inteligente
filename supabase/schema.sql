
-- Randers'CRM — esquema inicial Supabase
-- Versão: 1.0
-- Execute uma única vez no SQL Editor do Supabase.
-- Este script cria tabelas, índices, funções, gatilhos e políticas RLS.

begin;

create extension if not exists pgcrypto;

do $$ begin
  create type public.app_role as enum ('administrador', 'gerente', 'consultor');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.wallet_group as enum ('recuperacao', 'cobre_ouro', 'vip', 'todas');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.contact_channel as enum ('ligacao', 'whatsapp', 'visita', 'outro');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.contact_result as enum (
    'pendente', 'nao_atendeu', 'em_contato', 'retorno',
    'negociando', 'pedido', 'convertido', 'sem_interesse'
  );
exception when duplicate_object then null;
end $$;

create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  created_by uuid references auth.users(id) on delete set null,
  settings jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  email text,
  phone text,
  city text,
  bio text,
  avatar_config jsonb not null default '{}'::jsonb,
  xp integer not null default 0 check (xp >= 0),
  coins integer not null default 0 check (coins >= 0),
  email_confirmed boolean not null default false,
  must_change_password boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.memberships (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.app_role not null default 'consultor',
  wallet public.wallet_group not null default 'recuperacao',
  activity_segments text[] not null default '{}'::text[],
  recovery_groups text[] not null default '{}'::text[],
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, user_id)
);

create table if not exists public.resellers (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  assigned_user_id uuid references auth.users(id) on delete set null,
  external_code text,
  full_name text not null,
  phone text,
  city text,
  neighborhood text,
  level text,
  base text,
  activity text,
  status public.contact_result not null default 'pendente',
  priority_score integer not null default 0 check (priority_score between 0 and 100),
  blocked boolean not null default false,
  last_purchase_at date,
  last_order_value numeric(12,2),
  source_file text,
  source_row integer,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.interactions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  reseller_id uuid not null references public.resellers(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete restrict,
  channel public.contact_channel not null,
  result public.contact_result not null,
  notes text,
  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  reseller_id uuid references public.resellers(id) on delete cascade,
  assigned_user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  notes text,
  due_at timestamptz not null,
  completed_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.goals (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  period_start date not null,
  period_end date not null,
  calls_target integer not null default 0 check (calls_target >= 0),
  whatsapp_target integer not null default 0 check (whatsapp_target >= 0),
  conversions_target integer not null default 0 check (conversions_target >= 0),
  orders_target integer not null default 0 check (orders_target >= 0),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, user_id, period_start, period_end)
);

create table if not exists public.campaigns (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  created_by uuid not null references auth.users(id) on delete restrict,
  name text not null,
  audience jsonb not null default '{}'::jsonb,
  message_template text not null,
  status text not null default 'rascunho',
  started_at timestamptz,
  finished_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.campaign_recipients (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  reseller_id uuid not null references public.resellers(id) on delete cascade,
  sent_at timestamptz,
  replied_at timestamptz,
  converted_at timestamptz,
  status text not null default 'pendente',
  unique (campaign_id, reseller_id)
);

create table if not exists public.import_jobs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  uploaded_by uuid not null references auth.users(id) on delete restrict,
  file_name text not null,
  file_type text,
  detected_base text,
  total_rows integer not null default 0,
  inserted_rows integer not null default 0,
  updated_rows integer not null default 0,
  rejected_rows integer not null default 0,
  errors jsonb not null default '[]'::jsonb,
  status text not null default 'processando',
  created_at timestamptz not null default now(),
  finished_at timestamptz
);

create table if not exists public.achievements (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  description text,
  icon text,
  xp_reward integer not null default 0,
  coin_reward integer not null default 0,
  active boolean not null default true
);

create table if not exists public.user_achievements (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  achievement_id uuid not null references public.achievements(id) on delete cascade,
  unlocked_at timestamptz not null default now(),
  unique (organization_id, user_id, achievement_id)
);

create table if not exists public.audit_logs (
  id bigint generated always as identity primary key,
  organization_id uuid references public.organizations(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  action text not null,
  entity_type text,
  entity_id text,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists memberships_user_idx on public.memberships(user_id);
create index if not exists memberships_org_idx on public.memberships(organization_id);
create index if not exists resellers_org_idx on public.resellers(organization_id);
create index if not exists resellers_assigned_idx on public.resellers(assigned_user_id);
create index if not exists resellers_search_idx on public.resellers(organization_id, full_name);
create index if not exists resellers_base_idx on public.resellers(organization_id, base);
create index if not exists resellers_level_idx on public.resellers(organization_id, level);
create index if not exists interactions_reseller_idx on public.interactions(reseller_id, occurred_at desc);
create index if not exists interactions_user_idx on public.interactions(user_id, occurred_at desc);
create index if not exists tasks_user_due_idx on public.tasks(assigned_user_id, due_at);
create index if not exists audit_org_created_idx on public.audit_logs(organization_id, created_at desc);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists organizations_updated_at on public.organizations;
create trigger organizations_updated_at before update on public.organizations
for each row execute function public.set_updated_at();

drop trigger if exists profiles_updated_at on public.profiles;
create trigger profiles_updated_at before update on public.profiles
for each row execute function public.set_updated_at();

drop trigger if exists memberships_updated_at on public.memberships;
create trigger memberships_updated_at before update on public.memberships
for each row execute function public.set_updated_at();

drop trigger if exists resellers_updated_at on public.resellers;
create trigger resellers_updated_at before update on public.resellers
for each row execute function public.set_updated_at();

drop trigger if exists tasks_updated_at on public.tasks;
create trigger tasks_updated_at before update on public.tasks
for each row execute function public.set_updated_at();

drop trigger if exists goals_updated_at on public.goals;
create trigger goals_updated_at before update on public.goals
for each row execute function public.set_updated_at();

drop trigger if exists campaigns_updated_at on public.campaigns;
create trigger campaigns_updated_at before update on public.campaigns
for each row execute function public.set_updated_at();

create or replace function public.current_org_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select organization_id
  from public.memberships
  where user_id = (select auth.uid()) and active = true
  order by created_at
  limit 1
$$;

create or replace function public.current_app_role()
returns public.app_role
language sql
stable
security definer
set search_path = public
as $$
  select role
  from public.memberships
  where user_id = (select auth.uid()) and active = true
  order by created_at
  limit 1
$$;

create or replace function public.is_manager()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.current_app_role() in ('administrador', 'gerente'), false)
$$;

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  org_id uuid;
  is_first boolean;
begin
  insert into public.profiles (id, full_name, email, email_confirmed)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(coalesce(new.email, ''), '@', 1)),
    new.email,
    new.email_confirmed_at is not null
  )
  on conflict (id) do nothing;

  select not exists (select 1 from public.memberships) into is_first;

  if is_first then
    insert into public.organizations (name, slug, created_by)
    values ('Randers CRM', 'randers-crm', new.id)
    returning id into org_id;

    insert into public.memberships (organization_id, user_id, role, wallet, activity_segments, recovery_groups, active)
    values (
      org_id, new.id, 'administrador', 'todas',
      array['Cobre','Bronze','Prata','Ouro','Platina','Rubi','Esmeralda','Diamante']::text[],
      array['I6','Cessados','Intenções']::text[],
      true
    );
  end if;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_auth_user();

alter table public.organizations enable row level security;
alter table public.profiles enable row level security;
alter table public.memberships enable row level security;
alter table public.resellers enable row level security;
alter table public.interactions enable row level security;
alter table public.tasks enable row level security;
alter table public.goals enable row level security;
alter table public.campaigns enable row level security;
alter table public.campaign_recipients enable row level security;
alter table public.import_jobs enable row level security;
alter table public.achievements enable row level security;
alter table public.user_achievements enable row level security;
alter table public.audit_logs enable row level security;

grant select, insert, update, delete on all tables in schema public to authenticated;
grant usage, select on all sequences in schema public to authenticated;
grant execute on function public.current_org_id() to authenticated;
grant execute on function public.current_app_role() to authenticated;
grant execute on function public.is_manager() to authenticated;

drop policy if exists "Members can view their organization" on public.organizations;
create policy "Members can view their organization"
on public.organizations for select to authenticated
using (id = (select public.current_org_id()));

drop policy if exists "Administrators can update their organization" on public.organizations;
create policy "Administrators can update their organization"
on public.organizations for update to authenticated
using (id = (select public.current_org_id()) and (select public.current_app_role()) = 'administrador')
with check (id = (select public.current_org_id()));

drop policy if exists "Users can view organization profiles" on public.profiles;
create policy "Users can view organization profiles"
on public.profiles for select to authenticated
using (
  id in (
    select m.user_id from public.memberships m
    where m.organization_id = (select public.current_org_id()) and m.active = true
  )
);

drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile"
on public.profiles for update to authenticated
using (id = (select auth.uid()))
with check (id = (select auth.uid()));

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

drop policy if exists "Members can view memberships" on public.memberships;
create policy "Members can view memberships"
on public.memberships for select to authenticated
using (organization_id = (select public.current_org_id()));

drop policy if exists "Administrators can insert memberships" on public.memberships;
create policy "Administrators can insert memberships"
on public.memberships for insert to authenticated
with check (
  organization_id = (select public.current_org_id())
  and (select public.current_app_role()) = 'administrador'
);

drop policy if exists "Administrators can update memberships" on public.memberships;
create policy "Administrators can update memberships"
on public.memberships for update to authenticated
using (
  organization_id = (select public.current_org_id())
  and (select public.current_app_role()) = 'administrador'
)
with check (organization_id = (select public.current_org_id()));

drop policy if exists "Administrators can delete memberships" on public.memberships;
create policy "Administrators can delete memberships"
on public.memberships for delete to authenticated
using (
  organization_id = (select public.current_org_id())
  and (select public.current_app_role()) = 'administrador'
);

drop policy if exists "Users can view allowed resellers" on public.resellers;
create policy "Users can view allowed resellers"
on public.resellers for select to authenticated
using (
  organization_id = (select public.current_org_id())
  and (
    (select public.is_manager())
    or assigned_user_id = (select auth.uid())
  )
);

drop policy if exists "Managers can insert resellers" on public.resellers;
create policy "Managers can insert resellers"
on public.resellers for insert to authenticated
with check (
  organization_id = (select public.current_org_id())
  and (select public.is_manager())
);

drop policy if exists "Users can update allowed resellers" on public.resellers;
create policy "Users can update allowed resellers"
on public.resellers for update to authenticated
using (
  organization_id = (select public.current_org_id())
  and ((select public.is_manager()) or assigned_user_id = (select auth.uid()))
)
with check (organization_id = (select public.current_org_id()));

drop policy if exists "Managers can delete resellers" on public.resellers;
create policy "Managers can delete resellers"
on public.resellers for delete to authenticated
using (
  organization_id = (select public.current_org_id())
  and (select public.is_manager())
);

drop policy if exists "Users can view allowed interactions" on public.interactions;
create policy "Users can view allowed interactions"
on public.interactions for select to authenticated
using (
  organization_id = (select public.current_org_id())
  and (
    (select public.is_manager())
    or user_id = (select auth.uid())
    or reseller_id in (
      select r.id from public.resellers r where r.assigned_user_id = (select auth.uid())
    )
  )
);

drop policy if exists "Users can create interactions" on public.interactions;
create policy "Users can create interactions"
on public.interactions for insert to authenticated
with check (
  organization_id = (select public.current_org_id())
  and user_id = (select auth.uid())
);

drop policy if exists "Users can view allowed tasks" on public.tasks;
create policy "Users can view allowed tasks"
on public.tasks for select to authenticated
using (
  organization_id = (select public.current_org_id())
  and ((select public.is_manager()) or assigned_user_id = (select auth.uid()))
);

drop policy if exists "Users can create tasks" on public.tasks;
create policy "Users can create tasks"
on public.tasks for insert to authenticated
with check (
  organization_id = (select public.current_org_id())
  and (assigned_user_id = (select auth.uid()) or (select public.is_manager()))
);

drop policy if exists "Users can update allowed tasks" on public.tasks;
create policy "Users can update allowed tasks"
on public.tasks for update to authenticated
using (
  organization_id = (select public.current_org_id())
  and (assigned_user_id = (select auth.uid()) or (select public.is_manager()))
)
with check (organization_id = (select public.current_org_id()));

drop policy if exists "Managers can delete tasks" on public.tasks;
create policy "Managers can delete tasks"
on public.tasks for delete to authenticated
using (
  organization_id = (select public.current_org_id())
  and (select public.is_manager())
);

drop policy if exists "Users can view organization goals" on public.goals;
create policy "Users can view organization goals"
on public.goals for select to authenticated
using (
  organization_id = (select public.current_org_id())
  and ((select public.is_manager()) or user_id = (select auth.uid()))
);

drop policy if exists "Managers can insert goals" on public.goals;
create policy "Managers can insert goals"
on public.goals for insert to authenticated
with check (
  organization_id = (select public.current_org_id())
  and (select public.is_manager())
);

drop policy if exists "Managers can update goals" on public.goals;
create policy "Managers can update goals"
on public.goals for update to authenticated
using (
  organization_id = (select public.current_org_id())
  and (select public.is_manager())
)
with check (organization_id = (select public.current_org_id()));

drop policy if exists "Managers can delete goals" on public.goals;
create policy "Managers can delete goals"
on public.goals for delete to authenticated
using (
  organization_id = (select public.current_org_id())
  and (select public.is_manager())
);

drop policy if exists "Members can view campaigns" on public.campaigns;
create policy "Members can view campaigns"
on public.campaigns for select to authenticated
using (organization_id = (select public.current_org_id()));

drop policy if exists "Managers can create campaigns" on public.campaigns;
create policy "Managers can create campaigns"
on public.campaigns for insert to authenticated
with check (
  organization_id = (select public.current_org_id())
  and (select public.is_manager())
);

drop policy if exists "Managers can update campaigns" on public.campaigns;
create policy "Managers can update campaigns"
on public.campaigns for update to authenticated
using (
  organization_id = (select public.current_org_id())
  and (select public.is_manager())
)
with check (organization_id = (select public.current_org_id()));

drop policy if exists "Managers can delete campaigns" on public.campaigns;
create policy "Managers can delete campaigns"
on public.campaigns for delete to authenticated
using (
  organization_id = (select public.current_org_id())
  and (select public.is_manager())
);

drop policy if exists "Members can view campaign recipients" on public.campaign_recipients;
create policy "Members can view campaign recipients"
on public.campaign_recipients for select to authenticated
using (
  campaign_id in (
    select c.id from public.campaigns c
    where c.organization_id = (select public.current_org_id())
  )
);

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
  )
  and (select public.is_manager())
);

drop policy if exists "Managers can update campaign recipients" on public.campaign_recipients;
create policy "Managers can update campaign recipients"
on public.campaign_recipients for update to authenticated
using (
  campaign_id in (
    select c.id from public.campaigns c
    where c.organization_id = (select public.current_org_id())
  )
  and (select public.is_manager())
)
with check (
  campaign_id in (
    select c.id from public.campaigns c
    where c.organization_id = (select public.current_org_id())
  )
);

drop policy if exists "Managers can delete campaign recipients" on public.campaign_recipients;
create policy "Managers can delete campaign recipients"
on public.campaign_recipients for delete to authenticated
using (
  campaign_id in (
    select c.id from public.campaigns c
    where c.organization_id = (select public.current_org_id())
  )
  and (select public.is_manager())
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

drop policy if exists "Members can view imports" on public.import_jobs;
create policy "Members can view imports"
on public.import_jobs for select to authenticated
using (organization_id = (select public.current_org_id()));

drop policy if exists "Managers can create imports" on public.import_jobs;
create policy "Managers can create imports"
on public.import_jobs for insert to authenticated
with check (
  organization_id = (select public.current_org_id())
  and (select public.is_manager())
);

drop policy if exists "Achievements are visible to members" on public.achievements;
create policy "Achievements are visible to members"
on public.achievements for select to authenticated
using (active = true);

drop policy if exists "Members can view organization achievements" on public.user_achievements;
create policy "Members can view organization achievements"
on public.user_achievements for select to authenticated
using (
  organization_id = (select public.current_org_id())
  and ((select public.is_manager()) or user_id = (select auth.uid()))
);

drop policy if exists "System users can unlock own achievements" on public.user_achievements;
create policy "System users can unlock own achievements"
on public.user_achievements for insert to authenticated
with check (
  organization_id = (select public.current_org_id())
  and (user_id = (select auth.uid()) or (select public.is_manager()))
);

drop policy if exists "Managers can view audit logs" on public.audit_logs;
create policy "Managers can view audit logs"
on public.audit_logs for select to authenticated
using (
  organization_id = (select public.current_org_id())
  and (select public.is_manager())
);

drop policy if exists "Users can create audit logs" on public.audit_logs;
create policy "Users can create audit logs"
on public.audit_logs for insert to authenticated
with check (
  organization_id = (select public.current_org_id())
  and user_id = (select auth.uid())
);

insert into public.achievements (code, name, description, icon, xp_reward, coin_reward)
values
  ('primeiro_contato', 'Primeiro contato', 'Registre seu primeiro atendimento.', 'phone', 50, 10),
  ('dez_contatos', 'Ritmo de trabalho', 'Registre 10 atendimentos.', 'activity', 100, 25),
  ('primeira_conversao', 'Primeira conversão', 'Converta seu primeiro revendedor.', 'trophy', 150, 40),
  ('meta_batida', 'Meta batida', 'Alcance uma meta do período.', 'target', 250, 75)
on conflict (code) do nothing;

commit;
