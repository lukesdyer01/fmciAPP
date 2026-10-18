-- Canonical administrative claims are not writable through profile metadata.
update auth.users set raw_app_meta_data = coalesce(raw_app_meta_data,'{}'::jsonb) || jsonb_build_object(
  'status', coalesce(raw_app_meta_data->>'status',raw_user_meta_data->>'status','active'),
  'verified', coalesce(raw_app_meta_data->'verified',raw_user_meta_data->'verified','false'::jsonb),
  'fmciLeadershipRole', coalesce(raw_app_meta_data->>'fmciLeadershipRole',raw_user_meta_data->>'fmciLeadershipRole','')
);
create function public.guard_member_claims() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  new.raw_user_meta_data := coalesce(new.raw_user_meta_data,'{}'::jsonb) || jsonb_build_object(
    'status',coalesce(new.raw_app_meta_data->>'status','active'),
    'verified',coalesce(new.raw_app_meta_data->'verified','false'::jsonb),
    'fmciLeadershipRole',coalesce(new.raw_app_meta_data->>'fmciLeadershipRole','')
  );
  return new;
end;
$$;
create trigger guard_member_claims before insert or update of raw_user_meta_data, raw_app_meta_data on auth.users
for each row execute function public.guard_member_claims();
revoke all on function public.guard_member_claims() from public, anon, authenticated;

create function public.require_platform_admin(superadmin_only boolean default false) returns text
language plpgsql security definer set search_path = '' as $$
declare actor_role text;
begin
  select raw_app_meta_data->>'role' into actor_role from auth.users where id=auth.uid();
  if coalesce(actor_role,'') not in ('admin','superadmin') or (superadmin_only and actor_role <> 'superadmin') then
    raise exception 'Forbidden' using errcode='42501';
  end if;
  return actor_role;
end;
$$;
revoke all on function public.require_platform_admin(boolean) from public, anon, authenticated;

create or replace function public.admin_set_role(target_user_id uuid, new_role text) returns jsonb
language plpgsql security definer set search_path = '' as $$
begin
  perform public.require_platform_admin(true);
  if coalesce(new_role,'') not in ('member','admin','superadmin') then raise exception 'Invalid role'; end if;
  update auth.users set raw_app_meta_data=coalesce(raw_app_meta_data,'{}'::jsonb)||jsonb_build_object('role',new_role) where id=target_user_id;
  if not found then raise exception 'Member not found'; end if;
  return jsonb_build_object('ok',true);
end;
$$;

create or replace function public.admin_update_member(target_user_id uuid, updates jsonb) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare um jsonb := '{}'; am jsonb := '{}'; actor_role text; target_role text;
begin
  actor_role := public.require_platform_admin(false);
  select coalesce(raw_app_meta_data->>'role','member') into target_role from auth.users where id=target_user_id for update;
  if not found then raise exception 'Member not found'; end if;
  if actor_role <> 'superadmin' and target_role in ('admin','superadmin') then raise exception 'Only superadmins may edit administrators'; end if;
  if updates ? 'role' then
    if coalesce(updates->>'role','') not in ('member','admin','superadmin') then raise exception 'Invalid role'; end if;
    if updates->>'role' <> target_role and actor_role <> 'superadmin' then raise exception 'Only superadmins may assign roles'; end if;
    am := am || jsonb_build_object('role',updates->>'role');
  end if;
  if updates ? 'name' then um := um || jsonb_build_object('full_name',updates->>'name'); end if;
  if updates ? 'title' then um := um || jsonb_build_object('title',updates->>'title'); end if;
  if updates ? 'church' then um := um || jsonb_build_object('church',updates->>'church'); end if;
  if updates ? 'location' then um := um || jsonb_build_object('location',updates->>'location'); end if;
  if updates ? 'avatar_url' then um := um || jsonb_build_object('avatar_url',updates->>'avatar_url'); end if;
  if updates ? 'status' then
    if coalesce(updates->>'status','') not in ('active','pending','suspended') then raise exception 'Invalid status'; end if;
    am := am || jsonb_build_object('status',updates->>'status');
  end if;
  if updates ? 'verified' then am := am || jsonb_build_object('verified',coalesce((updates->>'verified')::boolean,false)); end if;
  update auth.users set raw_user_meta_data=coalesce(raw_user_meta_data,'{}'::jsonb)||um,
    raw_app_meta_data=coalesce(raw_app_meta_data,'{}'::jsonb)||am where id=target_user_id;
  return jsonb_build_object('ok',true);
end;
$$;

create or replace function public.admin_list_users()
returns table(id uuid,email text,name text,avatar_url text,title text,church text,location text,role text,status text,verified boolean,created_at timestamptz,last_sign_in timestamptz,confirmed boolean)
language plpgsql security definer set search_path = '' as $$
begin
  perform public.require_platform_admin(false);
  return query select u.id,u.email::text,
    coalesce(u.raw_user_meta_data->>'full_name',u.raw_user_meta_data->>'name',''),
    coalesce(u.raw_user_meta_data->>'avatar_url',''),coalesce(u.raw_user_meta_data->>'title',''),
    coalesce(u.raw_user_meta_data->>'church',''),coalesce(u.raw_user_meta_data->>'location',''),
    coalesce(u.raw_app_meta_data->>'role','member'),coalesce(u.raw_app_meta_data->>'status','active'),
    coalesce((u.raw_app_meta_data->>'verified')::boolean,false),u.created_at,u.last_sign_in_at,u.email_confirmed_at is not null
  from auth.users u order by u.created_at desc;
end;
$$;
-- The old delete RPC bypassed content/file cleanup. All deletion uses the API.
revoke all on function public.admin_delete_user(uuid) from public, anon, authenticated;
revoke all on function public.admin_set_role(uuid,text) from public, anon;
revoke all on function public.admin_update_member(uuid,jsonb) from public, anon;
revoke all on function public.admin_list_users() from public, anon;
grant execute on function public.admin_set_role(uuid,text) to authenticated;
grant execute on function public.admin_update_member(uuid,jsonb) to authenticated;
grant execute on function public.admin_list_users() to authenticated;

create function public.guard_profile_content() returns trigger
language plpgsql security definer set search_path = '' as $$
declare content text;
begin
  if tg_op = 'UPDATE' and new.raw_user_meta_data->'full_name' is not distinct from old.raw_user_meta_data->'full_name'
    and new.raw_user_meta_data->'title' is not distinct from old.raw_user_meta_data->'title'
    and new.raw_user_meta_data->'bio' is not distinct from old.raw_user_meta_data->'bio' then return new; end if;
  content := concat_ws(' ',new.raw_user_meta_data->>'full_name',new.raw_user_meta_data->>'title',new.raw_user_meta_data->>'bio');
  if content ~* '(^|[^[:alnum:]])(child[[:space:]]+porn|kill[[:space:]]*yourself|i[[:space:]]+will[[:space:]]+kill[[:space:]]+you|rape[[:space:]]+you|n[i1]gg[e3]r|faggot|fuck(ing|er|s)?|pornhub)($|[^[:alnum:]])' then
    raise exception 'Profile text violates the community rules';
  end if;
  return new;
end;
$$;
revoke all on function public.guard_profile_content() from public, anon, authenticated;
create trigger guard_profile_content before insert or update of raw_user_meta_data on auth.users
for each row execute function public.guard_profile_content();
