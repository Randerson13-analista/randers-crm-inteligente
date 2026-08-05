-- Permite que administradores atualizem dados básicos dos perfis da própria organização.
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
