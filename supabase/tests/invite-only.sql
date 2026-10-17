begin;
do $test$
declare
  inviter uuid;
  candidate uuid := gen_random_uuid();
  test_email text := 'invite-test-' || gen_random_uuid()::text || '@example.invalid';
  blocked boolean;
begin
  select id into inviter from auth.users where raw_app_meta_data->>'role' = 'superadmin' limit 1;
  if inviter is null then raise exception 'No trusted admin'; end if;
  -- No invitation, including a forged metadata role.
  blocked := false;
  begin
    insert into auth.users(id, email, raw_user_meta_data) values(candidate, test_email, '{"role":"superadmin"}');
  exception when raise_exception then blocked := true;
  end;
  if not blocked then raise exception 'Uninvited signup accepted'; end if;
  insert into public.network_invitations(email, token_hash, expires_at, created_by)
  values(test_email, encode(sha256(convert_to('test-secret', 'UTF8')), 'hex'), now() + interval '1 day', inviter);
  -- Wrong code.
  blocked := false;
  begin
    insert into auth.users(id, email, raw_user_meta_data) values(candidate, test_email, '{"invitation_token":"wrong"}');
  exception when raise_exception then blocked := true;
  end;
  if not blocked then raise exception 'Wrong token accepted'; end if;
  -- Wrong email.
  blocked := false;
  begin
    insert into auth.users(id, email, raw_user_meta_data) values(candidate, 'wrong-' || test_email, '{"invitation_token":"test-secret"}');
  exception when raise_exception then blocked := true;
  end;
  if not blocked then raise exception 'Wrong email accepted'; end if;
  -- Expired code.
  update public.network_invitations set expires_at = now() - interval '1 second' where email = test_email;
  blocked := false;
  begin
    insert into auth.users(id, email, raw_user_meta_data) values(candidate, test_email, '{"invitation_token":"test-secret"}');
  exception when raise_exception then blocked := true;
  end;
  if not blocked then raise exception 'Expired token accepted'; end if;
  -- Valid code is consumed and removed from the stored user metadata.
  update public.network_invitations set expires_at = now() + interval '1 day' where email = test_email;
  insert into auth.users(id, email, raw_user_meta_data) values(candidate, test_email, '{"invitation_token":"test-secret","full_name":"Test"}');
  if exists(select 1 from public.network_invitations where email = test_email) then raise exception 'Invitation not consumed'; end if;
  if exists(select 1 from auth.users where id = candidate and raw_user_meta_data ? 'invitation_token') then raise exception 'Token leaked into user metadata'; end if;
  blocked := false;
  begin
    insert into auth.users(id, email, raw_user_meta_data) values(gen_random_uuid(), test_email, '{"invitation_token":"test-secret"}');
  exception when raise_exception then blocked := true;
  end;
  if not blocked then raise exception 'Reused token accepted'; end if;
end;
$test$;
rollback;
select 'PASS: missing, incorrect, mismatched, expired, valid, and reused invitations; all test data rolled back' as result;
