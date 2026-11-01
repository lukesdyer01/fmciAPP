begin;
do $$
declare member_id uuid; actor uuid; job_count integer; unread_job uuid;
begin
 select id into member_id from auth.users order by id limit 1;
 select id into actor from auth.users where id<>member_id order by id limit 1;
 if actor is null then raise exception 'Requires two existing users';end if;
 insert into public.network_reaction_notifications(recipient_id,actor_id,post_id,target_key,kind)
 values(member_id,actor,'email-test','email-test-mention','mention');
 if not exists(select from public.network_email_jobs where recipient_id=member_id and kind='mention') then raise exception 'Activity not queued';end if;
 insert into public.network_reaction_notifications(recipient_id,actor_id,post_id,target_key,reaction)
 values(member_id,actor,'email-test','email-test-reaction','amen');
 if exists(select from public.network_email_jobs j join public.network_reaction_notifications n on n.id=j.notification_id where n.target_key='email-test-reaction') then raise exception 'Reaction email unexpectedly queued';end if;
 update public.kv_store_5bb4c08d set value=value||jsonb_build_array(jsonb_build_object('id','email-test-conversation','participantIds',jsonb_build_array(member_id,actor),'messages',jsonb_build_array(jsonb_build_object('id','email-test-message','senderId',actor,'createdAt',now())))) where key='conversations';
 if (select count(*) from public.network_email_jobs where source_key='direct:email-test-conversation:email-test-message' and recipient_id=member_id)<>1 then raise exception 'Direct message missing';end if;
 update public.kv_store_5bb4c08d set value=value where key='conversations';
 if (select count(*) from public.network_email_jobs where source_key='direct:email-test-conversation:email-test-message')<>1 then raise exception 'Message retry duplicates';end if;
 insert into public.network_group_conversations(name,owner_id) values('email-test-group',actor);
 insert into public.network_group_members(conversation_id,user_id) select id,member_id from public.network_group_conversations where name='email-test-group';
 insert into public.network_group_messages(conversation_id,sender_id,text) select id,actor,'Email test' from public.network_group_conversations where name='email-test-group';
 if not exists(select from public.network_email_jobs where recipient_id=member_id and kind='group') then raise exception 'Group message missing';end if;
 update public.network_email_jobs set due_at=now()-interval '1 minute' where source_key='direct:email-test-conversation:email-test-message' returning id into unread_job;
 perform public.claim_network_email_jobs();
 if not exists(select from public.network_email_jobs where id=unread_job and attempts=1 and lease_until>now()) then raise exception 'Lease missing';end if;
 if exists(select from public.claim_network_email_jobs() where id=unread_job) then raise exception 'Leased job claimed twice';end if;
 if has_table_privilege('authenticated','public.network_email_jobs','select') or has_table_privilege('authenticated','public.network_email_preferences','select') then raise exception 'Email data exposed';end if;
 delete from public.network_reaction_notifications where post_id='email-test';
 if exists(select from public.network_email_jobs where source_key like 'activity:%' and notification_id is null) then raise exception 'Notice deletion did not cascade';end if;
end;$$;
rollback;
