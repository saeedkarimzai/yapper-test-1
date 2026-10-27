-- Run once in Supabase SQL Editor AFTER your YAPPER schema and helper-function patch.
create or replace function public.yapper_server_exists(p_server_id uuid)
returns boolean language sql security definer stable set search_path = ''
as $$ select exists (select 1 from public.servers s where s.id = p_server_id); $$;
revoke all on function public.yapper_server_exists(uuid) from public, anon;
grant execute on function public.yapper_server_exists(uuid) to authenticated;
drop policy if exists "Users can join servers with server ID" on public.server_members;
create policy "Users can join servers with server ID"
on public.server_members for insert to authenticated
with check (user_id = (select auth.uid()) and public.yapper_server_exists(server_id));