begin;
do $test$
declare
  admin_id uuid;
  member_id uuid := gen_random_uuid();
  member_email text := 'role-test-' || gen_random_uuid()::text || '@example.invalid';
  blocked boolean := false;
begin
  select id into admin_id from auth.users where raw_app_meta_data->>'role'='superadmin' limit 1;
  if admin_id is null then raise exception 'No trusted admin available'; end if;
  insert into public.network_invitations(email, token_hash, expires_at, created_by)
  values(member_email, encode(sha256(convert_to('role-test-secret','UTF8')),'hex'), now()+interval '1 minute', admin_id);
  insert into auth.users(id,email,raw_user_meta_data,raw_app_meta_data)
  values(member_id,member_email,'{"ministryRoles":["Pastor"],"invitation_token":"role-test-secret"}', '{"role":"member"}');
  if (select raw_user_meta_data->'ministryRoles' from auth.users where id=member_id) <> '[]'::jsonb then raise exception 'Unapproved role published at signup'; end if;
  if not exists(select 1 from public.ministry_role_requests where user_id=member_id and role='Pastor' and status='pending') then raise exception 'Signup request missing'; end if;
  -- A member cannot bypass approval by writing profile metadata directly.
  update auth.users set raw_user_meta_data=raw_user_meta_data || '{"ministryRoles":["Pastor"],"approvedMinistryRoles":["Pastor"]}'::jsonb where id=member_id;
  if (select raw_user_meta_data->'ministryRoles' from auth.users where id=member_id) <> '[]'::jsonb then raise exception 'Metadata bypass accepted'; end if;
  begin
    perform public.review_ministry_role(member_id,member_id,'Pastor','approved');
  exception when raise_exception then blocked := true;
  end;
  if not blocked then raise exception 'Non-admin review accepted'; end if;
  if has_function_privilege('authenticated','public.review_ministry_role(uuid,uuid,text,text)','EXECUTE') then raise exception 'Review RPC exposed'; end if;
  if has_table_privilege('authenticated','public.ministry_role_requests','UPDATE') then raise exception 'Review table exposed'; end if;
  perform public.review_ministry_role(admin_id,member_id,'Pastor','approved');
  if not (select raw_user_meta_data->'ministryRoles' ? 'Pastor' from auth.users where id=member_id) then raise exception 'Approved role not published'; end if;
  -- Keep approved Pastor while requesting Teacher; only Pastor is visible.
  update auth.users set raw_user_meta_data=raw_user_meta_data || '{"requestedMinistryRoles":["Pastor","Teacher"]}'::jsonb where id=member_id;
  if (select raw_user_meta_data->'ministryRoles' from auth.users where id=member_id) <> '["Pastor"]'::jsonb then raise exception 'New role bypassed approval'; end if;
  perform public.review_ministry_role(admin_id,member_id,'Teacher','denied');
  if not exists(select 1 from public.ministry_role_requests where user_id=member_id and role='Teacher' and status='denied') then raise exception 'Denial not recorded'; end if;
  update auth.users set raw_user_meta_data=raw_user_meta_data || '{"bio":"Unrelated edit"}'::jsonb where id=member_id;
  if (select raw_user_meta_data->'ministryRoles' from auth.users where id=member_id) <> '["Pastor"]'::jsonb then raise exception 'Unrelated update changed approvals'; end if;
  update auth.users set raw_user_meta_data=raw_user_meta_data || '{"requestedMinistryRoles":[]}'::jsonb where id=member_id;
  if (select raw_user_meta_data->'ministryRoles' from auth.users where id=member_id) <> '[]'::jsonb then raise exception 'Withdrawn role remains visible'; end if;
  if public.review_ministry_role(admin_id,member_id,'Pastor','approved') then raise exception 'Withdrawn request accepted'; end if;
  -- Old clients writing ministryRoles must still enter the approval queue.
  update auth.users set raw_user_meta_data=raw_user_meta_data || '{"ministryRoles":["Prophet"],"additionalRoles":["Pastoral","Teaching","Apostolic","Prophetic","Artist"]}'::jsonb where id=member_id;
  if (select raw_user_meta_data->'ministryRoles' from auth.users where id=member_id) <> '[]'::jsonb then raise exception 'Legacy update bypassed approval'; end if;
  if not exists(select 1 from public.ministry_role_requests where user_id=member_id and role='Prophet' and status='pending') then raise exception 'Legacy request missing'; end if;
end;
$test$;
rollback;
select 'PASS: signup, metadata bypass, admin authorization, approval, denial, profile edits, withdrawal, and legacy clients; test data rolled back' as result;
