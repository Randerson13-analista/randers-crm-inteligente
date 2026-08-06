begin;

alter table public.profiles
  add column if not exists photo_url text;

-- Corrige perfis antigos que já confirmaram o e-mail no Supabase Auth.
update public.profiles as profile
set email_confirmed = true
from auth.users as auth_user
where auth_user.id = profile.id
  and auth_user.email_confirmed_at is not null
  and profile.email_confirmed is distinct from true;

-- Bucket público somente para exibição das fotos de perfil.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'profile-photos',
  'profile-photos',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']::text[]
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

-- Cada usuário grava, substitui e remove apenas a própria foto.
drop policy if exists "profile_photos_select_own" on storage.objects;
create policy "profile_photos_select_own"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'profile-photos'
  and (storage.foldername(name))[1] = (select auth.uid()::text)
);

drop policy if exists "profile_photos_insert_own" on storage.objects;
create policy "profile_photos_insert_own"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'profile-photos'
  and (storage.foldername(name))[1] = (select auth.uid()::text)
);

drop policy if exists "profile_photos_update_own" on storage.objects;
create policy "profile_photos_update_own"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'profile-photos'
  and (storage.foldername(name))[1] = (select auth.uid()::text)
)
with check (
  bucket_id = 'profile-photos'
  and (storage.foldername(name))[1] = (select auth.uid()::text)
);

drop policy if exists "profile_photos_delete_own" on storage.objects;
create policy "profile_photos_delete_own"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'profile-photos'
  and (storage.foldername(name))[1] = (select auth.uid()::text)
);

commit;
