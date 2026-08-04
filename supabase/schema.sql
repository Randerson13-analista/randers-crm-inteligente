create extension if not exists pgcrypto;
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  nome text not null,
  cargo text not null default 'Consultor' check (cargo in ('Administrador','Gerente','Consultor')),
  carteira text not null default 'Sem carteira',
  ativo boolean not null default true,
  avatar_config jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.revendedores (
  id uuid primary key default gen_random_uuid(), codigo text, nome text not null, telefone text,
  cidade text, bairro text, nivel text, base text, atividade text, status text default 'Pendente',
  responsavel_id uuid references public.profiles(id), metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create unique index if not exists revendedores_codigo_unique on public.revendedores(codigo) where codigo is not null and codigo<>'';
create table if not exists public.atendimentos (
  id uuid primary key default gen_random_uuid(), revendedor_id uuid not null references public.revendedores(id) on delete cascade,
  usuario_id uuid references public.profiles(id), canal text not null, resultado text not null,
  observacao text, created_at timestamptz not null default now()
);
create table if not exists public.agenda (
  id uuid primary key default gen_random_uuid(), revendedor_id uuid not null references public.revendedores(id) on delete cascade,
  responsavel_id uuid references public.profiles(id), data date not null, hora time, status text not null default 'Pendente',
  observacao text, created_at timestamptz not null default now()
);
create table if not exists public.metas (
  id uuid primary key default gen_random_uuid(), usuario_id uuid not null references public.profiles(id) on delete cascade,
  periodo text not null, ligacoes int not null default 0, whatsapps int not null default 0, conversoes int not null default 0,
  unique(usuario_id,periodo)
);
create table if not exists public.auditoria (
  id bigint generated always as identity primary key, usuario_id uuid references public.profiles(id), acao text not null,
  dados jsonb not null default '{}'::jsonb, created_at timestamptz not null default now()
);
alter table public.profiles enable row level security;
alter table public.revendedores enable row level security;
alter table public.atendimentos enable row level security;
alter table public.agenda enable row level security;
alter table public.metas enable row level security;
alter table public.auditoria enable row level security;
create or replace function public.current_profile() returns public.profiles language sql stable security definer set search_path=public as $$ select * from public.profiles where id=auth.uid() $$;
create policy "profiles read authenticated" on public.profiles for select to authenticated using (true);
create policy "profiles self update" on public.profiles for update to authenticated using (id=auth.uid()) with check (id=auth.uid());
create policy "admins manage profiles" on public.profiles for all to authenticated using ((select cargo from public.current_profile())='Administrador') with check ((select cargo from public.current_profile())='Administrador');
create policy "revendedores read by role" on public.revendedores for select to authenticated using (
  (select cargo from public.current_profile()) in ('Administrador','Gerente') or responsavel_id=auth.uid()
);
create policy "revendedores write authenticated" on public.revendedores for all to authenticated using (true) with check (true);
create policy "atendimentos authenticated" on public.atendimentos for all to authenticated using (true) with check (true);
create policy "agenda authenticated" on public.agenda for all to authenticated using (true) with check (true);
create policy "metas read authenticated" on public.metas for select to authenticated using (true);
create policy "metas admin write" on public.metas for all to authenticated using ((select cargo from public.current_profile()) in ('Administrador','Gerente')) with check ((select cargo from public.current_profile()) in ('Administrador','Gerente'));
create policy "auditoria read admin" on public.auditoria for select to authenticated using ((select cargo from public.current_profile())='Administrador');
create policy "auditoria insert authenticated" on public.auditoria for insert to authenticated with check (true);

-- Snapshot por usuário: opção segura para sincronização gradual do estado completo do CRM.
create table if not exists public.crm_snapshots (
  user_id uuid primary key references auth.users(id) on delete cascade,
  payload jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
alter table public.crm_snapshots enable row level security;
drop policy if exists "snapshot próprio leitura" on public.crm_snapshots;
drop policy if exists "snapshot próprio escrita" on public.crm_snapshots;
create policy "snapshot próprio leitura" on public.crm_snapshots for select to authenticated using (user_id=auth.uid());
create policy "snapshot próprio escrita" on public.crm_snapshots for all to authenticated using (user_id=auth.uid()) with check (user_id=auth.uid());

-- Estrutura normalizada v4. Cada conta autenticada possui seu próprio conjunto de dados.
create table if not exists public.crm_users (
  owner_id uuid not null references auth.users(id) on delete cascade,
  local_id text not null, nome text not null, email text, cargo text, carteira text,
  ativo boolean not null default true, avatar_config jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(), primary key(owner_id,local_id)
);
create table if not exists public.crm_revendedores (
  owner_id uuid not null references auth.users(id) on delete cascade,
  local_id text not null, codigo text, nome text not null, telefone text, cidade text, bairro text,
  nivel text, base text, atividade text, status text, responsavel text,
  metadata jsonb not null default '{}'::jsonb, updated_at timestamptz not null default now(),
  primary key(owner_id,local_id)
);
create table if not exists public.crm_atendimentos (
  owner_id uuid not null references auth.users(id) on delete cascade,
  local_id text not null, revendedor_local_id text not null, usuario text, canal text, resultado text,
  observacao text, occurred_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  primary key(owner_id,local_id)
);
create table if not exists public.crm_agenda (
  owner_id uuid not null references auth.users(id) on delete cascade,
  local_id text not null, revendedor_local_id text not null, responsavel text, data date not null,
  hora time, status text, observacao text, updated_at timestamptz not null default now(),
  primary key(owner_id,local_id)
);
create table if not exists public.crm_metas (
  owner_id uuid not null references auth.users(id) on delete cascade,
  user_local_id text not null, calls int not null default 0, whats int not null default 0,
  conversions int not null default 0, updated_at timestamptz not null default now(),
  primary key(owner_id,user_local_id)
);
create table if not exists public.crm_campanhas (
  owner_id uuid not null references auth.users(id) on delete cascade,
  local_id text not null, payload jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(), primary key(owner_id,local_id)
);
create table if not exists public.crm_auditoria (
  owner_id uuid not null references auth.users(id) on delete cascade,
  local_id text not null, usuario text, acao text not null, occurred_at timestamptz not null default now(),
  primary key(owner_id,local_id)
);
create table if not exists public.crm_importacoes (
  owner_id uuid not null references auth.users(id) on delete cascade,
  local_id text not null, payload jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(), primary key(owner_id,local_id)
);
do $$ declare t text; begin foreach t in array array['crm_users','crm_revendedores','crm_atendimentos','crm_agenda','crm_metas','crm_campanhas','crm_auditoria','crm_importacoes'] loop execute format('alter table public.%I enable row level security',t); execute format('drop policy if exists "owner access" on public.%I',t); execute format('create policy "owner access" on public.%I for all to authenticated using (owner_id=auth.uid()) with check (owner_id=auth.uid())',t); end loop; end $$;
create index if not exists crm_revendedores_codigo_idx on public.crm_revendedores(owner_id,codigo);
create index if not exists crm_revendedores_filtros_idx on public.crm_revendedores(owner_id,base,nivel,status);
create index if not exists crm_agenda_data_idx on public.crm_agenda(owner_id,data,status);
create index if not exists crm_atendimentos_rev_idx on public.crm_atendimentos(owner_id,revendedor_local_id,occurred_at desc);
