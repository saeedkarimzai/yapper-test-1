-- YAPPER profile and avatar schema.
-- This migration has already been applied to Supabase project grtvubvopumjnflhlzrz.
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null unique check (char_length(username) between 2 and 24),
  avatar_url text,
  updated_at timestamptz not null default now()
);
alter table public.profiles enable row level security;
drop policy if exists "profiles readable by signed in users" on public.profiles;
create policy "profiles readable by signed in users" on public.profiles
for select to authenticated using (true);
drop policy if exists "users create own profile" on public.profiles;
create policy "users create own profile" on public.profiles
for insert to authenticated with check (id = (select auth.uid()));
drop policy if exists "users update own profile" on public.profiles;
create policy "users update own profile" on public.profiles
for update to authenticated using (id = (select auth.uid()))
with check (id = (select auth.uid()));

create or replace function public.yapper_create_profile()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, username)
  values (new.id, 'user_' || substr(new.id::text, 1, 8))
  on conflict (id) do nothing;
  return new;
end;
$$;
drop trigger if exists yapper_create_profile_after_signup on auth.users;
create trigger yapper_create_profile_after_signup
after insert on auth.users for each row execute function public.yapper_create_profile();

insert into public.profiles (id, username)
select u.id, 'user_' || substr(u.id::text, 1, 8) from auth.users u
on conflict (id) do nothing;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('yapper-avatars', 'yapper-avatars', true, 2097152, array['image/png','image/jpeg','image/webp','image/gif'])
on conflict (id) do update set public = true, file_size_limit = 2097152,
allowed_mime_types = array['image/png','image/jpeg','image/webp','image/gif'];

drop policy if exists "avatar images are publicly readable" on storage.objects;
create policy "avatar images are publicly readable" on storage.objects
for select to public using (bucket_id = 'yapper-avatars');
drop policy if exists "users upload their own avatars" on storage.objects;
create policy "users upload their own avatars" on storage.objects
for insert to authenticated with check (bucket_id = 'yapper-avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);
drop policy if exists "users update their own avatars" on storage.objects;
create policy "users update their own avatars" on storage.objects
for update to authenticated using (bucket_id = 'yapper-avatars' and (storage.foldername(name))[1] = (select auth.uid())::text)
with check (bucket_id = 'yapper-avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);
drop policy if exists "users delete their own avatars" on storage.objects;
create policy "users delete their own avatars" on storage.objects
for delete to authenticated using (bucket_id = 'yapper-avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);
