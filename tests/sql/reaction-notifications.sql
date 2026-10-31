begin;
do $$
declare owner_id uuid; actor uuid; notification_id uuid; changed_at timestamptz;
begin
 select id into owner_id from auth.users order by id limit 1;
 select id into actor from auth.users where id<>owner_id order by id limit 1;
 if actor is null then raise exception 'Test requires two existing auth users';end if;
 update public.kv_store_5bb4c08d set value=value||jsonb_build_array(jsonb_build_object('id','notification-test-post','authorId',owner_id,'comments',jsonb_build_array(jsonb_build_object('id','notification-test-comment','authorId',owner_id)))) where key='posts';
 insert into public.network_post_reactions values('notification-test-post',owner_id,'amen');
 if exists(select from public.network_reaction_notifications where post_id='notification-test-post') then raise exception 'Self reaction notified';end if;
 insert into public.network_post_reactions values('notification-test-post',actor,'amen');
 select id,created_at into notification_id,changed_at from public.network_reaction_notifications where post_id='notification-test-post';
 if notification_id is null then raise exception 'Post reaction missing notification';end if;
 update public.network_reaction_notifications set read_at=now() where id=notification_id;
 update public.network_post_reactions set reaction='amen' where post_id='notification-test-post' and user_id=actor;
 if not exists(select from public.network_reaction_notifications where id=notification_id and read_at is not null and created_at=changed_at) then raise exception 'Retry duplicated/reset notification';end if;
 update public.network_post_reactions set reaction='heart' where post_id='notification-test-post' and user_id=actor;
 if not exists(select from public.network_reaction_notifications where id=notification_id and read_at is null and reaction='heart' and recipient_id=owner_id) then raise exception 'Changed reaction not updated';end if;
 insert into public.network_comment_reactions values('notification-test-post','notification-test-comment',actor,'praise');
 if not exists(select from public.network_reaction_notifications where recipient_id=owner_id and actor_id=actor and comment_id='notification-test-comment' and reaction='praise') then raise exception 'Comment recipient or praise incorrect';end if;
 delete from public.network_comment_reactions where post_id='notification-test-post';
 if exists(select from public.network_reaction_notifications where post_id='notification-test-post' and comment_id is not null) then raise exception 'Removed reaction notification retained';end if;
 if has_table_privilege('authenticated','public.network_reaction_notifications','select') then raise exception 'Inbox exposed';end if;
end;$$;
rollback;
