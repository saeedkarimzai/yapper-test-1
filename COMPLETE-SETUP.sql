-- YAPPER complete Supabase setup
-- Run this whole file once in Supabase SQL Editor on a fresh project.
-- It is idempotent for tables, indexes, policies, triggers, and helper functions.

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null unique check (char_length(username) between 2 and 24),
  avatar_url text,
  updated_at timestamptz not null default now()
);
create table if not exists public.servers (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 60),
  owner_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);
create table if not exists public.server_members (
  server_id uuid not null references public.servers(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'member' check (role in ('owner','member')),
  created_at timestamptz not null default now(),
  primary key(server_id,user_id)
);
-- Existing YAPPER databases may have server_members without a role column.
alter table public.server_members
  add column if not exists role text not null default 'member'
  check (role in ('owner','member'));

create table if not exists public.channels (
  id uuid primary key default gen_random_uuid(),
  server_id uuid not null references public.servers(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 60),
  created_at timestamptz not null default now()
);
create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  channel_id uuid not null references public.channels(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  content text not null check (char_length(content) between 1 and 2000),
  created_at timestamptz not null default now(),
  edited_at timestamptz
);
create table if not exists public.friendships (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references auth.users(id) on delete cascade,
  addressee_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending','accepted','rejected')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check(requester_id <> addressee_id),
  unique(requester_id,addressee_id)
);
create unique index if not exists friendships_pair_unique
on public.friendships(least(requester_id,addressee_id),greatest(requester_id,addressee_id));
create table if not exists public.group_chats (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 60),
  owner_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);
create table if not exists public.group_chat_members (
  group_id uuid not null references public.group_chats(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key(group_id,user_id)
);
create table if not exists public.group_chat_messages (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.group_chats(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  content text not null check (char_length(content) between 1 and 2000),
  created_at timestamptz not null default now()
);
create table if not exists public.direct_messages (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references auth.users(id) on delete cascade,
  recipient_id uuid not null references auth.users(id) on delete cascade,
  content text not null check (char_length(content) between 1 and 2000),
  created_at timestamptz not null default now(),
  check(sender_id <> recipient_id)
);
create table if not exists public.voice_signals (
  id uuid primary key default gen_random_uuid(),
  room_id text not null,
  sender_id uuid not null references auth.users(id) on delete cascade,
  recipient_id uuid not null references auth.users(id) on delete cascade,
  signal jsonb not null,
  created_at timestamptz not null default now()
);
create table if not exists public.message_reactions (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null references public.messages(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  emoji text not null check (char_length(emoji) between 1 and 16),
  created_at timestamptz not null default now(),
  unique(message_id,user_id,emoji)
);

create index if not exists server_members_user_idx on public.server_members(user_id);
create index if not exists channels_server_idx on public.channels(server_id,created_at);
create index if not exists messages_channel_created_idx on public.messages(channel_id,created_at);
create index if not exists friendships_requester_status on public.friendships(requester_id,status);
create index if not exists friendships_addressee_status on public.friendships(addressee_id,status);
create unique index if not exists friendships_one_pair on public.friendships(least(requester_id,addressee_id),greatest(requester_id,addressee_id));
create index if not exists group_members_user_idx on public.group_chat_members(user_id);
create index if not exists group_messages_created_idx on public.group_chat_messages(group_id,created_at);
create index if not exists dm_pair_created_idx on public.direct_messages(sender_id,recipient_id,created_at);
create index if not exists voice_signals_recipient_idx on public.voice_signals(recipient_id,created_at);
create index if not exists reactions_message_idx on public.message_reactions(message_id);
create index if not exists group_chat_messages_user_id_idx on public.group_chat_messages(user_id);
create index if not exists group_chats_owner_id_idx on public.group_chats(owner_id);
create index if not exists message_reactions_user_id_idx on public.message_reactions(user_id);
create index if not exists messages_user_id_idx on public.messages(user_id);
create index if not exists servers_owner_id_idx on public.servers(owner_id);
create index if not exists voice_signals_sender_id_idx on public.voice_signals(sender_id);

-- Index old prototype tables only when they still exist.
do $legacy_index$
begin
  if to_regclass('public.group_conversations') is not null then
    execute 'create index if not exists group_conversations_owner_id_idx on public.group_conversations(owner_id)';
  end if;
  if to_regclass('public.group_members') is not null then
  end if;
  if to_regclass('public.group_messages') is not null then
    execute 'create index if not exists group_messages_user_id_idx on public.group_messages(user_id)';
  end if;
end $legacy_index$;

-- Remove redundant indexes inherited from the prototype schema.
drop index if exists public.friendships_requester_idx;
drop index if exists public.friendships_addressee_idx;
drop index if exists public.friendships_pair_unique;
drop index if exists public.message_reactions_message_idx;

-- Private security-definer helpers avoid recursive RLS checks without exposing RPCs.
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;
grant usage on schema private to authenticated;

create or replace function private.yapper_is_server_member(p_server_id uuid,p_user_id uuid)
returns boolean language sql stable security definer set search_path = ''
as $$ select p_user_id=auth.uid() and exists(select 1 from public.server_members m where m.server_id=p_server_id and m.user_id=p_user_id); $$;
create or replace function private.yapper_is_group_member(p_group_id uuid,p_user_id uuid)
returns boolean language sql stable security definer set search_path = ''
as $$ select p_user_id=auth.uid() and exists(select 1 from public.group_chat_members m where m.group_id=p_group_id and m.user_id=p_user_id); $$;
create or replace function private.yapper_is_group_owner(p_group_id uuid,p_user_id uuid)
returns boolean language sql stable security definer set search_path = ''
as $$ select p_user_id=auth.uid() and exists(select 1 from public.group_chats g where g.id=p_group_id and g.owner_id=p_user_id); $$;
create or replace function private.yapper_are_friends(p_user_a uuid,p_user_b uuid)
returns boolean language sql stable security definer set search_path = ''
as $$ select (p_user_a=auth.uid() or p_user_b=auth.uid()) and exists(select 1 from public.friendships f where f.status='accepted' and ((f.requester_id=p_user_a and f.addressee_id=p_user_b) or (f.requester_id=p_user_b and f.addressee_id=p_user_a))); $$;
create or replace function private.yapper_server_exists(p_server_id uuid)
returns boolean language sql stable security definer set search_path = ''
as $$ select auth.uid() is not null and exists(select 1 from public.servers s where s.id=p_server_id); $$;

revoke all on function private.yapper_is_server_member(uuid,uuid) from public,anon,authenticated;
revoke all on function private.yapper_is_group_member(uuid,uuid) from public,anon,authenticated;
revoke all on function private.yapper_is_group_owner(uuid,uuid) from public,anon,authenticated;
revoke all on function private.yapper_are_friends(uuid,uuid) from public,anon,authenticated;
revoke all on function private.yapper_server_exists(uuid) from public,anon,authenticated;
grant execute on function private.yapper_is_server_member(uuid,uuid) to authenticated;
grant execute on function private.yapper_is_group_member(uuid,uuid) to authenticated;
grant execute on function private.yapper_is_group_owner(uuid,uuid) to authenticated;
grant execute on function private.yapper_are_friends(uuid,uuid) to authenticated;
grant execute on function private.yapper_server_exists(uuid) to authenticated;

alter table public.profiles enable row level security;
alter table public.servers enable row level security;
alter table public.server_members enable row level security;
alter table public.channels enable row level security;
alter table public.messages enable row level security;
alter table public.friendships enable row level security;
alter table public.group_chats enable row level security;
alter table public.group_chat_members enable row level security;
alter table public.group_chat_messages enable row level security;
alter table public.direct_messages enable row level security;
alter table public.voice_signals enable row level security;
alter table public.message_reactions enable row level security;

-- Explicit Data API table privileges for authenticated users; RLS below is the row-level gate.
grant usage on schema public to authenticated;
grant select,insert on public.profiles to authenticated;
revoke update on public.profiles from authenticated;
grant update(username,avatar_url,updated_at) on public.profiles to authenticated;
grant select,insert,delete on public.servers to authenticated;
revoke update on public.servers from authenticated;
grant update(name) on public.servers to authenticated;
grant select,insert,delete on public.server_members to authenticated;
grant select,insert on public.channels to authenticated;
grant select,insert,delete on public.messages to authenticated;
revoke update on public.messages from authenticated;
grant update(content,edited_at) on public.messages to authenticated;
grant select,insert,delete on public.friendships to authenticated;
revoke update on public.friendships from authenticated;
grant update(status,updated_at) on public.friendships to authenticated;
grant select,insert on public.group_chats to authenticated;
revoke update on public.group_chats from authenticated;
grant update(name) on public.group_chats to authenticated;
grant select,insert,delete on public.group_chat_members to authenticated;
grant select,insert on public.group_chat_messages to authenticated;
grant select,insert on public.direct_messages to authenticated;
grant select,insert,delete on public.voice_signals to authenticated;
grant select,insert,delete on public.message_reactions to authenticated;

-- Retired group-chat tables from an older prototype are not used by this client.
-- Revoke direct Data API access if they exist.
do $legacy$
begin
  if to_regclass('public.group_conversations') is not null then
    execute 'revoke all on public.group_conversations from anon, authenticated';
  end if;
  if to_regclass('public.group_members') is not null then
    execute 'revoke all on public.group_members from anon, authenticated';
  end if;
  if to_regclass('public.group_messages') is not null then
    execute 'revoke all on public.group_messages from anon, authenticated';
  end if;
end $legacy$;


-- Remove legacy policies on these app tables before applying the known-safe policy set.
-- This prevents older permissive policies from silently overriding the policies below.
do $block$
declare p record;
begin
  for p in
    select schemaname, tablename, policyname
    from pg_policies
    where schemaname='public'
      and tablename = any(array[
        'profiles','servers','server_members','channels','messages','friendships',
        'group_chats','group_chat_members','group_chat_messages','direct_messages',
        'voice_signals','message_reactions','group_conversations','group_members','group_messages'
      ])
  loop
    execute format('drop policy if exists %I on %I.%I',p.policyname,p.schemaname,p.tablename);
  end loop;
end $block$;

-- Remove old exposed helper RPCs from earlier setup revisions, if present.
drop function if exists public.yapper_is_server_member(uuid,uuid) cascade;
drop function if exists public.yapper_is_group_member(uuid,uuid) cascade;
drop function if exists public.yapper_is_group_owner(uuid,uuid) cascade;
drop function if exists public.yapper_are_friends(uuid,uuid) cascade;
drop function if exists public.yapper_server_exists(uuid) cascade;

-- Lock down leftover SECURITY DEFINER RPCs from the previous YAPPER prototype.
-- rls_auto_enable remains installed as an event-trigger callback, not a client RPC.
revoke all on function public.rls_auto_enable() from public, anon, authenticated;
revoke all on function public.yapper_is_group_member(uuid) from public, anon, authenticated;
revoke all on function public.yapper_is_member(uuid) from public, anon, authenticated;
revoke all on function public.yapper_is_owner(uuid) from public, anon, authenticated;

-- Profiles
drop policy if exists "profiles readable by signed in users" on public.profiles;
create policy "profiles readable by signed in users" on public.profiles for select to authenticated using(true);
drop policy if exists "users create own profile" on public.profiles;
create policy "users create own profile" on public.profiles for insert to authenticated with check(id=(select auth.uid()));
drop policy if exists "users update own profile" on public.profiles;
create policy "users update own profile" on public.profiles for update to authenticated using(id=(select auth.uid())) with check(id=(select auth.uid()));

-- Servers and membership
drop policy if exists "members can read servers" on public.servers;
create policy "members can read servers" on public.servers for select to authenticated using(owner_id=(select auth.uid()) or private.yapper_is_server_member(id,(select auth.uid())));
drop policy if exists "users create servers" on public.servers;
create policy "users create servers" on public.servers for insert to authenticated with check(owner_id=(select auth.uid()));
drop policy if exists "owners update servers" on public.servers;
create policy "owners update servers" on public.servers for update to authenticated using(owner_id=(select auth.uid())) with check(owner_id=(select auth.uid()));
drop policy if exists "owners delete servers" on public.servers;
create policy "owners delete servers" on public.servers for delete to authenticated using(owner_id=(select auth.uid()));
drop policy if exists "members can read memberships" on public.server_members;
create policy "members can read memberships" on public.server_members for select to authenticated using(user_id=(select auth.uid()) or private.yapper_is_server_member(server_id,(select auth.uid())));
drop policy if exists "owners add memberships" on public.server_members;
create policy "owners add memberships" on public.server_members for insert to authenticated with check(
  (user_id=(select auth.uid()) and role='owner' and exists(select 1 from public.servers s where s.id=server_id and s.owner_id=(select auth.uid())))
  or (user_id=(select auth.uid()) and role='member' and private.yapper_server_exists(server_id))
);
drop policy if exists "users leave own membership" on public.server_members;
create policy "users leave own membership" on public.server_members for delete to authenticated using(user_id=(select auth.uid()) and role<>'owner');

-- Channels and messages
drop policy if exists "members read channels" on public.channels;
create policy "members read channels" on public.channels for select to authenticated using(private.yapper_is_server_member(server_id,(select auth.uid())));
drop policy if exists "members create channels" on public.channels;
create policy "members create channels" on public.channels for insert to authenticated with check(private.yapper_is_server_member(server_id,(select auth.uid())));
drop policy if exists "members read messages" on public.messages;
create policy "members read messages" on public.messages for select to authenticated using(exists(select 1 from public.channels c where c.id=channel_id and private.yapper_is_server_member(c.server_id,(select auth.uid()))));
drop policy if exists "members send messages" on public.messages;
create policy "members send messages" on public.messages for insert to authenticated with check(user_id=(select auth.uid()) and exists(select 1 from public.channels c where c.id=channel_id and private.yapper_is_server_member(c.server_id,(select auth.uid()))));
drop policy if exists "authors edit own messages" on public.messages;
create policy "authors edit own messages" on public.messages for update to authenticated using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()) and exists(select 1 from public.channels c where c.id=channel_id and private.yapper_is_server_member(c.server_id,(select auth.uid()))));
drop policy if exists "authors delete own messages" on public.messages;
create policy "authors delete own messages" on public.messages for delete to authenticated using(user_id=(select auth.uid()));

-- Friend requests
drop policy if exists "users read their friendships" on public.friendships;
create policy "users read their friendships" on public.friendships for select to authenticated using(requester_id=(select auth.uid()) or addressee_id=(select auth.uid()));
drop policy if exists "users send friend requests" on public.friendships;
create policy "users send friend requests" on public.friendships for insert to authenticated with check(requester_id=(select auth.uid()) and status='pending' and addressee_id<>(select auth.uid()));
drop policy if exists "recipients respond to requests" on public.friendships;
create policy "recipients respond to requests" on public.friendships for update to authenticated using(addressee_id=(select auth.uid()) and status='pending') with check(addressee_id=(select auth.uid()) and status in ('accepted','rejected'));
drop policy if exists "participants remove friendships" on public.friendships;
create policy "participants remove friendships" on public.friendships for delete to authenticated using(requester_id=(select auth.uid()) or addressee_id=(select auth.uid()));

-- Group chats
drop policy if exists "members read groups" on public.group_chats;
create policy "members read groups" on public.group_chats for select to authenticated using(owner_id=(select auth.uid()) or private.yapper_is_group_member(id,(select auth.uid())));
drop policy if exists "users create groups" on public.group_chats;
create policy "users create groups" on public.group_chats for insert to authenticated with check(owner_id=(select auth.uid()));
drop policy if exists "owners update groups" on public.group_chats;
create policy "owners update groups" on public.group_chats for update to authenticated using(owner_id=(select auth.uid())) with check(owner_id=(select auth.uid()));
drop policy if exists "members read group members" on public.group_chat_members;
create policy "members read group members" on public.group_chat_members for select to authenticated using(private.yapper_is_group_member(group_id,(select auth.uid())) or private.yapper_is_group_owner(group_id,(select auth.uid())));
drop policy if exists "owners add group members" on public.group_chat_members;
create policy "owners add group members" on public.group_chat_members for insert to authenticated with check(
  private.yapper_is_group_owner(group_id,(select auth.uid()))
  and (user_id=(select auth.uid()) or private.yapper_are_friends((select auth.uid()),user_id))
);
drop policy if exists "owners remove group members" on public.group_chat_members;
create policy "owners remove group members" on public.group_chat_members for delete to authenticated using(private.yapper_is_group_owner(group_id,(select auth.uid())) or user_id=(select auth.uid()));
drop policy if exists "members read group messages" on public.group_chat_messages;
create policy "members read group messages" on public.group_chat_messages for select to authenticated using(private.yapper_is_group_member(group_id,(select auth.uid())));
drop policy if exists "members send group messages" on public.group_chat_messages;
create policy "members send group messages" on public.group_chat_messages for insert to authenticated with check(user_id=(select auth.uid()) and private.yapper_is_group_member(group_id,(select auth.uid())));

-- Direct messages and one-to-one voice signaling: accepted friends only.
drop policy if exists "friends read direct messages" on public.direct_messages;
create policy "friends read direct messages" on public.direct_messages for select to authenticated using((sender_id=(select auth.uid()) or recipient_id=(select auth.uid())) and private.yapper_are_friends(sender_id,recipient_id));
drop policy if exists "friends send direct messages" on public.direct_messages;
create policy "friends send direct messages" on public.direct_messages for insert to authenticated with check(sender_id=(select auth.uid()) and private.yapper_are_friends(sender_id,recipient_id));
drop policy if exists "participants create voice signals" on public.voice_signals;
create policy "participants create voice signals" on public.voice_signals for insert to authenticated with check(sender_id=(select auth.uid()) and private.yapper_are_friends(sender_id,recipient_id));
drop policy if exists "call participants read voice signals" on public.voice_signals;
create policy "call participants read voice signals" on public.voice_signals for select to authenticated using(sender_id=(select auth.uid()) or recipient_id=(select auth.uid()));
drop policy if exists "call participants delete voice signals" on public.voice_signals;
create policy "call participants delete voice signals" on public.voice_signals for delete to authenticated using(sender_id=(select auth.uid()) or recipient_id=(select auth.uid()));

-- Reactions
drop policy if exists "members read reactions" on public.message_reactions;
create policy "members read reactions" on public.message_reactions for select to authenticated using(exists(select 1 from public.messages m join public.channels c on c.id=m.channel_id where m.id=message_id and private.yapper_is_server_member(c.server_id,(select auth.uid()))));
drop policy if exists "members add own reactions" on public.message_reactions;
create policy "members add own reactions" on public.message_reactions for insert to authenticated with check(user_id=(select auth.uid()) and exists(select 1 from public.messages m join public.channels c on c.id=m.channel_id where m.id=message_id and private.yapper_is_server_member(c.server_id,(select auth.uid()))));
drop policy if exists "users remove own reactions" on public.message_reactions;
create policy "users remove own reactions" on public.message_reactions for delete to authenticated using(user_id=(select auth.uid()));

-- Create profiles for new and existing auth users.
create or replace function public.yapper_create_profile()
returns trigger language plpgsql security definer set search_path = ''
as $profile$
begin
  insert into public.profiles(id,username)
  values(new.id,'user_'||substr(new.id::text,1,8))
  on conflict(id) do nothing;
  return new;
end;
$profile$;
revoke all on function public.yapper_create_profile() from public, anon, authenticated;
drop trigger if exists yapper_create_profile_after_signup on auth.users;
create trigger yapper_create_profile_after_signup after insert on auth.users
for each row execute function public.yapper_create_profile();
insert into public.profiles(id,username)
select u.id,'user_'||substr(u.id::text,1,8) from auth.users u
on conflict(id) do nothing;

-- Avatar bucket and ownership-safe storage policies.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('yapper-avatars','yapper-avatars',true,2097152,array['image/png','image/jpeg','image/webp','image/gif'])
on conflict(id) do update set public=true,file_size_limit=2097152,allowed_mime_types=array['image/png','image/jpeg','image/webp','image/gif'];
drop policy if exists "avatar images are publicly readable" on storage.objects;
create policy "avatar images are publicly readable" on storage.objects for select to public using(bucket_id='yapper-avatars');
drop policy if exists "users upload their own avatars" on storage.objects;
create policy "users upload their own avatars" on storage.objects for insert to authenticated with check(bucket_id='yapper-avatars' and (storage.foldername(name))[1]=(select auth.uid())::text);
drop policy if exists "users update their own avatars" on storage.objects;
create policy "users update their own avatars" on storage.objects for update to authenticated using(bucket_id='yapper-avatars' and (storage.foldername(name))[1]=(select auth.uid())::text) with check(bucket_id='yapper-avatars' and (storage.foldername(name))[1]=(select auth.uid())::text);
drop policy if exists "users delete their own avatars" on storage.objects;
create policy "users delete their own avatars" on storage.objects for delete to authenticated using(bucket_id='yapper-avatars' and (storage.foldername(name))[1]=(select auth.uid())::text);

-- Realtime feeds used by the client.
do $$
begin
  alter publication supabase_realtime add table public.messages;
exception when duplicate_object then null; when undefined_object then null;
end $$;
do $$
begin
  alter publication supabase_realtime add table public.friendships;
exception when duplicate_object then null; when undefined_object then null;
end $$;
do $$
begin
  alter publication supabase_realtime add table public.group_chat_members;
exception when duplicate_object then null; when undefined_object then null;
end $$;
do $$
begin
  alter publication supabase_realtime add table public.group_chat_messages;
exception when duplicate_object then null; when undefined_object then null;
end $$;
do $$
begin
  alter publication supabase_realtime add table public.direct_messages;
exception when duplicate_object then null; when undefined_object then null;
end $$;
do $$
begin
  alter publication supabase_realtime add table public.voice_signals;
exception when duplicate_object then null; when undefined_object then null;
end $$;
do $$
begin
  alter publication supabase_realtime add table public.message_reactions;
exception when duplicate_object then null; when undefined_object then null;
end $$;
