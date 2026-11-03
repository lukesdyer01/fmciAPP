-- Run after the signup notification migration; fixtures are rolled back.
begin;
do $test$
declare
 admin_id uuid;
 member_id uuid := gen_random_uuid();
 member_email text := 'signup-notice-' || gen_random_uuid()::text || '@example.invalid';
 expected integer;
begin
 select id into strict admin_id from auth.users where raw_app_meta_data->>'role'='superadmin' limit 1;
 select count(*) into expected from auth.users where raw_app_meta_data->>'role'='superadmin';
 insert into public.network_invitations(email,token_hash,expires_at,created_by)
 values(member_email,encode(sha256(convert_to('signup-notice-test','UTF8')),'hex'),now()+interval '1 minute',admin_id);
 insert into auth.users(id,email,raw_user_meta_data)
 values(member_id,member_email,'{"invitation_token":"signup-notice-test","full_name":"New Member","age18_confirmed_at":"2026-11-02T00:00:00Z"}');
 if (select count(*) from public.network_signup_notifications where actor_id=member_id)<>expected then
  raise exception 'Every superadmin must receive one signup alert';
 end if;
 if exists(select 1 from public.network_signup_notifications n join auth.users u on u.id=n.recipient_id where n.actor_id=member_id and (u.raw_app_meta_data->>'role' is distinct from 'superadmin' or n.read_at is not null)) then
  raise exception 'Signup alerts must be unread and restricted to superadmins';
 end if;
 update auth.users set raw_user_meta_data=raw_user_meta_data || '{"full_name":"Updated Member"}' where id=member_id;
 if (select count(*) from public.network_signup_notifications where actor_id=member_id)<>expected then
  raise exception 'Profile updates must not duplicate signup alerts';
 end if;
end;
$test$;
rollback;
