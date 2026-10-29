-- Apply group-chat migrations first. Requires an existing superadmin; all fixtures roll back.
begin;
do $$
declare admin_id uuid; a uuid:=gen_random_uuid(); b uuid:=gen_random_uuid(); c uuid:=gen_random_uuid(); d uuid:=gen_random_uuid(); g uuid; x jsonb; r jsonb; n bigint;
begin
 select id into strict admin_id from auth.users where raw_app_meta_data->>'role'='superadmin' limit 1;
 insert into public.network_registration_links(token_hash,expires_at,created_by) values(encode(sha256(convert_to('group-chat-transaction-fixture','UTF8')),'hex'),now()+interval '1 hour',admin_id);
 foreach admin_id in array array[a,b,c,d] loop
 insert into auth.users(id,email,email_confirmed_at,raw_user_meta_data) values(admin_id,admin_id::text||'@example.invalid',now(),jsonb_build_object('invitation_token','group-chat-transaction-fixture','onboarding_complete',true,'age18_confirmed',true,'full_name','Test member'));
 insert into storage.objects(bucket_id,name,metadata) values('avatars',admin_id::text||'/group-fixture.jpg','{"mimetype":"image/jpeg"}');
 update auth.users set raw_user_meta_data=raw_user_meta_data||jsonb_build_object('onboarding_complete',true,'avatar_url','https://example.invalid/storage/v1/object/public/avatars/'||admin_id::text||'/group-fixture.jpg') where id=admin_id;
 end loop;
 update public.kv_store_5bb4c08d set value='1'::jsonb where key='group_messages_enabled';
 x=public.group_chat(a,'create',null,jsonb_build_object('name','Test group','memberIds',jsonb_build_array(b,c)));g=(x->>'id')::uuid;
 perform public.group_chat(a,'send',g,'{"text":"First message"}');
 perform public.group_chat(b,'send',g,'{"text":"Second message"}');
 x=public.group_chat(c,'messages',g);if jsonb_array_length(x->'messages')<>2 then raise exception 'Messages lost';end if;
 begin perform public.group_chat(b,'add',g,jsonb_build_object('userId',d));raise exception 'Non-owner added member';exception when others then if sqlerrm not like '%creator%' then raise;end if;end;
 perform public.group_chat(a,'add',g,jsonb_build_object('userId',d));x=public.group_chat(d,'messages',g);if jsonb_array_length(x->'messages')<>0 then raise exception 'New participant saw history';end if;
 perform public.group_chat(a,'send',g,'{"text":"After joining"}');x=public.group_chat(d,'messages',g);if jsonb_array_length(x->'messages')<>1 then raise exception 'New messages not visible';end if;
 perform public.group_chat(a,'remove',g,jsonb_build_object('userId',d));
 begin perform public.group_chat(d,'messages',g);raise exception 'Removed member read chat';exception when others then if sqlerrm not like '%unavailable%' then raise;end if;end;
 insert into public.kv_store_5bb4c08d(key,value) values('user_blocks',jsonb_build_object(b::text,jsonb_build_array(a::text))) on conflict(key) do update set value=excluded.value;
 x=public.group_chat(b,'messages',g);if jsonb_array_length(x->'messages')<>1 then raise exception 'Blocked messages visible';end if;
 x=public.group_chat(a,'messages',g);if jsonb_array_length(x->'messages')<>2 then raise exception 'Reverse blocked messages visible';end if;
 perform public.group_chat(c,'settings',g,'{"muted":true,"archived":true}');x=public.group_chat(c,'list');if not (x->0->>'muted')::boolean then raise exception 'Mute not retained';end if;
 update public.kv_store_5bb4c08d set value='0'::jsonb where key='group_messages_enabled';
 begin perform public.group_chat(c,'messages',g);raise exception 'Disabled feature accessible';exception when others then if sqlerrm not like '%disabled%' then raise;end if;end;
 update public.kv_store_5bb4c08d set value='1'::jsonb where key='group_messages_enabled';
 delete from auth.users where id=a;
 if (select owner_id from public.network_group_conversations where id=g)=a then raise exception 'Owner deletion failed';end if;
 if exists(select 1 from public.network_group_messages where sender_id=a) then raise exception 'Authored messages retained';end if;
end $$;
select 'Group creation, ownership checks, history boundaries, removal, blocking, mute, flag enforcement and deletion cleanup passed; rolled back' as result;
rollback;
