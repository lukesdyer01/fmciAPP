begin;
do $test$
declare
  admin_id uuid;
  member_id uuid := gen_random_uuid();
  member_email text := 'photo-test-' || gen_random_uuid()::text || '@example.invalid';
  image_path text := member_id::text || '/test-avatar.png';
  blocked boolean;
begin
  select id into admin_id from auth.users where raw_app_meta_data->>'role'='superadmin' limit 1;
  insert into public.network_invitations(email,token_hash,expires_at,created_by)
  values(member_email,encode(sha256(convert_to('photo-test','UTF8')),'hex'),now()+interval '1 minute',admin_id);
  insert into auth.users(id,email,raw_user_meta_data) values(member_id,member_email,'{"onboarding_complete":true,"invitation_token":"photo-test"}');
  if (select raw_user_meta_data->'onboarding_complete' from auth.users where id=member_id) <> 'false'::jsonb then raise exception 'Signup bypassed onboarding'; end if;
  update auth.users set raw_user_meta_data='{}'::jsonb where id=member_id;
  if (select raw_user_meta_data->'onboarding_complete' from auth.users where id=member_id) <> 'false'::jsonb then raise exception 'Flag removal bypassed onboarding'; end if;
  blocked := false;
  begin
    update auth.users set raw_user_meta_data=raw_user_meta_data || '{"onboarding_complete":true}'::jsonb where id=member_id;
  exception when raise_exception then blocked := true;
  end;
  if not blocked then raise exception 'Missing photo accepted'; end if;
  blocked := false;
  begin
    update auth.users set raw_user_meta_data=raw_user_meta_data || jsonb_build_object('onboarding_complete',true,'avatar_url','https://example.invalid/storage/v1/object/public/avatars/' || image_path) where id=member_id;
  exception when raise_exception then blocked := true;
  end;
  if not blocked then raise exception 'Nonexistent upload accepted'; end if;
  insert into storage.objects(bucket_id,name,metadata) values('avatars',image_path,'{"mimetype":"application/pdf"}');
  blocked := false;
  begin
    update auth.users set raw_user_meta_data=raw_user_meta_data || jsonb_build_object('onboarding_complete',true,'avatar_url','https://example.invalid/storage/v1/object/public/avatars/' || image_path) where id=member_id;
  exception when raise_exception then blocked := true;
  end;
  if not blocked then raise exception 'Non-image accepted'; end if;
  update storage.objects set metadata='{"mimetype":"image/png"}' where bucket_id='avatars' and name=image_path;
  update auth.users set raw_user_meta_data=raw_user_meta_data || jsonb_build_object('onboarding_complete',true,'avatar_url','https://jbtlmdrmysrgvdpbveyu.supabase.co/storage/v1/object/public/avatars/' || image_path) where id=member_id;
  if (select raw_user_meta_data->'onboarding_complete' from auth.users where id=member_id) <> 'true'::jsonb then raise exception 'Valid photo did not complete signup'; end if;
end;
$test$;
rollback;
select 'PASS: required onboarding, flag-removal bypass, missing upload, invalid type, and valid image; test data rolled back' as result;
