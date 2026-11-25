-- Echo public server discovery (kept idempotent for existing projects)
alter table public.servers
  add column if not exists discoverable boolean not null default false,
  add column if not exists description text not null default '',
  add column if not exists category text not null default 'Community';

do $$
begin
  if not exists (select 1 from pg_constraint where conname='servers_description_length_check' and conrelid='public.servers'::regclass) then
    alter table public.servers add constraint servers_description_length_check check(char_length(description)<=180);
  end if;
  if not exists (select 1 from pg_constraint where conname='servers_category_check' and conrelid='public.servers'::regclass) then
    alter table public.servers add constraint servers_category_check check(category in ('Gaming','Technology','Education','Art & Music','Community','Other'));
  end if;
end $$;

grant update(discoverable,description,category) on public.servers to authenticated;
grant usage on schema private to authenticated;

create or replace function private.discoverable_servers()
returns table(id uuid,name text,description text,category text,created_at timestamptz,member_count bigint)
language sql stable security definer set search_path=''
as $function$
 select s.id,s.name,s.description,s.category,s.created_at,
        (select count(*) from public.server_members m where m.server_id=s.id)::bigint
 from public.servers s
 where s.discoverable is true and (select auth.uid()) is not null
 order by s.created_at desc
 limit 100;
$function$;
revoke all on function private.discoverable_servers() from public,anon,authenticated;
grant execute on function private.discoverable_servers() to authenticated;

create or replace function public.discoverable_servers()
returns table(id uuid,name text,description text,category text,created_at timestamptz,member_count bigint)
language sql stable security invoker set search_path=''
as $function$ select * from private.discoverable_servers(); $function$;
revoke all on function public.discoverable_servers() from public,anon,authenticated;
grant execute on function public.discoverable_servers() to authenticated;

create or replace function private.join_public_server(p_server_id uuid)
returns uuid language plpgsql security definer set search_path=''
as $function$
declare v_user_id uuid := (select auth.uid());
begin
 if v_user_id is null then raise exception 'Sign in before joining a server.' using errcode='28000'; end if;
 if not exists(select 1 from public.servers s where s.id=p_server_id and s.discoverable is true) then
  raise exception 'This server is not currently listed in discovery.' using errcode='P0002';
 end if;
 insert into public.server_members(server_id,user_id,role)
 values(p_server_id,v_user_id,'member') on conflict(server_id,user_id) do nothing;
 return p_server_id;
end;
$function$;
revoke all on function private.join_public_server(uuid) from public,anon,authenticated;
grant execute on function private.join_public_server(uuid) to authenticated;

create or replace function public.join_public_server(p_server_id uuid)
returns uuid language sql volatile security invoker set search_path=''
as $function$ select private.join_public_server($1); $function$;
revoke all on function public.join_public_server(uuid) from public,anon,authenticated;
grant execute on function public.join_public_server(uuid) to authenticated;
