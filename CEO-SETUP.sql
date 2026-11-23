-- YAPPER CEO permissions and announcement tools
-- Grants CEO access only to the existing CEO account.
create table if not exists public.admin_users (
 user_id uuid primary key references auth.users(id) on delete cascade,
 created_at timestamptz not null default now()
);
alter table public.admin_users enable row level security;
revoke all on public.admin_users from anon,authenticated;
grant select on public.admin_users to authenticated;
drop policy if exists "admins can verify own admin row" on public.admin_users;
create policy "admins can verify own admin row" on public.admin_users
 for select to authenticated using(user_id=(select auth.uid()));

insert into public.admin_users(user_id)
values ('88914b6e-2862-404f-bee8-4b00714afa63') on conflict(user_id) do nothing;

create or replace function private.yapper_is_ceo()
returns boolean language sql stable security definer set search_path=''
as $$
 select exists(select 1 from public.admin_users where user_id=(select auth.uid()));
$$;
revoke all on function private.yapper_is_ceo() from public,anon,authenticated;
grant execute on function private.yapper_is_ceo() to authenticated;

drop policy if exists "ceo can view all servers" on public.servers;
create policy "ceo can view all servers" on public.servers for select to authenticated using(private.yapper_is_ceo());
drop policy if exists "ceo can view all messages" on public.messages;
create policy "ceo can view all messages" on public.messages for select to authenticated using(private.yapper_is_ceo());
drop policy if exists "ceo can view all friendships" on public.friendships;
create policy "ceo can view all friendships" on public.friendships for select to authenticated using(private.yapper_is_ceo());

create table if not exists public.announcements (
 id uuid primary key default gen_random_uuid(),
 title text not null check(char_length(title) between 1 and 100),
 body text not null check(char_length(body) between 1 and 2000),
 created_by uuid not null references auth.users(id),
 created_at timestamptz not null default now()
);
alter table public.announcements enable row level security;
revoke all on public.announcements from anon,authenticated;
grant select,insert,delete on public.announcements to authenticated;
drop policy if exists "signed in users read announcements" on public.announcements;
create policy "signed in users read announcements" on public.announcements for select to authenticated using(true);
drop policy if exists "ceo publishes announcements" on public.announcements;
create policy "ceo publishes announcements" on public.announcements for insert to authenticated with check(private.yapper_is_ceo() and created_by=(select auth.uid()));
drop policy if exists "ceo deletes announcements" on public.announcements;
create policy "ceo deletes announcements" on public.announcements for delete to authenticated using(private.yapper_is_ceo());
