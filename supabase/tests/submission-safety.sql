begin;
do $test$
declare
  member_id uuid := gen_random_uuid();
  member_email text := 'submission-test-' || gen_random_uuid()::text || '@example.invalid';
  admin_id uuid;
  blocked boolean;
begin
  select id into admin_id from auth.users where raw_app_meta_data->>'role'='superadmin' limit 1;
  insert into public.network_invitations(email,token_hash,expires_at,created_by)
  values(member_email,encode(sha256(convert_to('submission-test','UTF8')),'hex'),now()+interval '1 minute',admin_id);
  insert into auth.users(id,email,raw_user_meta_data)
  values(member_id,member_email,'{"invitation_token":"submission-test","age18_confirmed_at":"1900-01-01","role":"superadmin","verified":true,"fmciLeadershipRole":"Apostolic Council"}');
  if (select raw_user_meta_data->'age18_confirmed' from auth.users where id=member_id) <> 'false'::jsonb then raise exception 'Age gate bypass'; end if;
  if (select raw_user_meta_data ? 'age18_confirmed_at' from auth.users where id=member_id) then raise exception 'Forged age timestamp'; end if;
  if (select raw_user_meta_data->'verified' from auth.users where id=member_id) <> 'false'::jsonb then raise exception 'Forged verification badge'; end if;
  update auth.users set raw_user_meta_data=raw_user_meta_data || '{"age18_confirmed":true,"age18_confirmed_at":"1900-01-01"}'::jsonb where id=member_id;
  if (select raw_user_meta_data->>'age18_confirmed_at' from auth.users where id=member_id) = '1900-01-01' then raise exception 'Forged acceptance time'; end if;
  if has_function_privilege('authenticated','public.account_uploads(uuid)','EXECUTE') then raise exception 'Storage listing exposed'; end if;
  if has_function_privilege('authenticated','public.admin_delete_user(uuid)','EXECUTE') then raise exception 'Legacy delete RPC exposed'; end if;
  perform set_config('request.jwt.claims',jsonb_build_object('sub',member_id,'role','authenticated','app_metadata',jsonb_build_object())::text,true);
  blocked := false;
  begin perform public.admin_set_role(member_id,'superadmin'); exception when insufficient_privilege then blocked := true; end;
  if not blocked then raise exception 'Missing-role escalation accepted'; end if;
  blocked := false;
  begin perform public.admin_update_member(member_id,'{"role":"superadmin"}'); exception when insufficient_privilege then blocked := true; end;
  if not blocked then raise exception 'Missing-role member update accepted'; end if;
  blocked := false;
  begin perform public.admin_list_users(); exception when insufficient_privilege then blocked := true; end;
  if not blocked then raise exception 'User listing exposed'; end if;
  perform set_config('request.jwt.claims',jsonb_build_object('sub',admin_id,'role','authenticated')::text,true);
  perform public.admin_update_member(member_id,'{"status":"suspended","verified":true}');
  update auth.users set raw_user_meta_data=raw_user_meta_data || '{"status":"active","verified":false}'::jsonb where id=member_id;
  if (select raw_user_meta_data->>'status' from auth.users where id=member_id) <> 'suspended' then raise exception 'Suspension bypass'; end if;
  if (select raw_user_meta_data->'verified' from auth.users where id=member_id) <> 'true'::jsonb then raise exception 'Admin badge not preserved'; end if;
end;
$test$;
rollback;
select 'PASS: adult declaration, protected badges/status, null-role RPC authorization, and upload/deletion privileges; all test records rolled back' as result;
