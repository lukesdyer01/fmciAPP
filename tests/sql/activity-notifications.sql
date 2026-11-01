begin;
do $$
declare owner_id uuid; actor uuid; cm_id text; reply_id text;
begin
 select id into owner_id from auth.users order by id limit 1;
 select id into actor from auth.users where id<>owner_id order by id limit 1;
 if actor is null then raise exception 'Requires two existing users'; end if;
 update public.kv_store_5bb4c08d set value=value||jsonb_build_array(jsonb_build_object(
  'id','activity-notification-test','authorId',actor,'wallUserId',owner_id,
  'taggedUsers',jsonb_build_array(jsonb_build_object('id',owner_id),jsonb_build_object('id',actor)),
  'comments','[]'::jsonb)) where key='posts';
 if (select count(*) from public.network_reaction_notifications where post_id='activity-notification-test' and recipient_id=owner_id and kind in ('mention','wall_post'))<>2 then raise exception 'Missing tag or wall notification'; end if;
 if exists(select from public.network_reaction_notifications where post_id='activity-notification-test' and recipient_id=actor) then raise exception 'Self notification'; end if;
 update public.network_reaction_notifications set read_at=now() where post_id='activity-notification-test';
 update public.kv_store_5bb4c08d set value=value where key='posts';
 if exists(select from public.network_reaction_notifications where post_id='activity-notification-test' and read_at is null) then raise exception 'Retry reset read state'; end if;
 perform public.write_post_comment('activity-notification-test',owner_id,'Root');
 select cm->>'id' into cm_id from public.kv_store_5bb4c08d k cross join lateral jsonb_array_elements(k.value) p cross join lateral jsonb_array_elements(p->'comments') cm where k.key='posts' and p->>'id'='activity-notification-test';
 perform public.write_post_comment('activity-notification-test',actor,'Reply',cm_id);
 if not exists(select from public.network_reaction_notifications where post_id='activity-notification-test' and recipient_id=owner_id and kind='reply' and comment_id<>cm_id) then raise exception 'Missing reply notification'; end if;
 select comment_id into reply_id from public.network_reaction_notifications where post_id='activity-notification-test' and kind='reply';
 perform public.write_post_comment('activity-notification-test',owner_id,'Nested reply',reply_id);
 if not exists(select from public.network_reaction_notifications where post_id='activity-notification-test' and recipient_id=actor and kind='reply') then raise exception 'Missing reply-to-reply notification'; end if;
 perform public.write_post_comment('activity-notification-test',actor,'Wall comment');
 if not exists(select from public.network_reaction_notifications where post_id='activity-notification-test' and recipient_id=owner_id and kind='wall_comment') then raise exception 'Missing wall comment'; end if;
 if has_table_privilege('authenticated','public.network_reaction_notifications','select') then raise exception 'Inbox exposed'; end if;
end;$$;
rollback;
