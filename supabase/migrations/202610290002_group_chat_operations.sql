create or replace function public.group_chat_blocked(a uuid,b uuid) returns boolean language sql stable security definer set search_path='' as $$
 select coalesce((select (value->a::text) ? b::text or (value->b::text) ? a::text from public.kv_store_5bb4c08d where key='user_blocks'),false)
$$;
create or replace function public.group_chat(p_user uuid,p_action text,p_id uuid default null,p_body jsonb default '{}') returns jsonb
language plpgsql security definer set search_path='' as $$
declare g public.network_group_conversations; me public.network_group_members; target uuid; ids uuid[]; mid bigint; boundary bigint; result jsonb; members jsonb; next_owner uuid;
begin
 if coalesce((select value='1'::jsonb from public.kv_store_5bb4c08d where key='group_messages_enabled'),false)=false then raise exception 'Group messaging is disabled';end if;
 if not exists(select 1 from auth.users where id=p_user and confirmed_at is not null and coalesce(raw_user_meta_data->>'status','active')<>'suspended' and coalesce(raw_user_meta_data->>'onboarding_complete','true')<>'false') then raise exception 'Account unavailable';end if;
 if p_action='create' then
  select array_agg(distinct value::uuid) into ids from jsonb_array_elements_text(p_body->'memberIds');
  ids=array_append(array_remove(ids,p_user),p_user);
  if coalesce(cardinality(ids),0)<3 or cardinality(ids)>25 or length(trim(p_body->>'name')) not between 1 and 80 then raise exception 'Choose a name and 2–24 other members';end if;
  if exists(select 1 from unnest(ids) i where not exists(select 1 from auth.users u where u.id=i and u.confirmed_at is not null and coalesce(u.raw_user_meta_data->>'status','active')<>'suspended' and coalesce(u.raw_user_meta_data->>'onboarding_complete','true')<>'false')) then raise exception 'Member unavailable';end if;
  if exists(select 1 from unnest(ids) a cross join unnest(ids) b where a<>b and public.group_chat_blocked(a,b)) then raise exception 'Selected members cannot share a conversation';end if;
  insert into public.network_group_conversations(name,owner_id) values(trim(p_body->>'name'),p_user) returning * into g;
  insert into public.network_group_members(conversation_id,user_id) select g.id,i from unnest(ids) i;
  return jsonb_build_object('id',g.id);
 end if;
 if p_action='list' then
  return coalesce((select jsonb_agg(x.summary order by x.updated desc) from (
   select coalesce(latest.created_at,listed.created_at) updated,jsonb_build_object('id',listed.id,'kind','group','name',listed.name,'ownerId',listed.owner_id,'muted',m.muted,'archived',m.archived,'participantCount',(select count(*) from public.network_group_members where conversation_id=listed.id),'updatedAt',coalesce(latest.created_at,listed.created_at),'lastMessage',case when latest.id is null then null else jsonb_build_object('text',latest.text,'senderId',latest.sender_id,'createdAt',latest.created_at) end,'unreadCount',(select count(*) from public.network_group_messages msg where msg.conversation_id=listed.id and msg.id>greatest(m.last_read_id,m.history_after) and msg.sender_id<>p_user and not public.group_chat_blocked(p_user,msg.sender_id))) summary
   from public.network_group_members m join public.network_group_conversations listed on listed.id=m.conversation_id
   left join lateral(select * from public.network_group_messages msg where msg.conversation_id=listed.id and msg.id>m.history_after and not public.group_chat_blocked(p_user,msg.sender_id) order by id desc limit 1) latest on true
   where m.user_id=p_user and (m.hidden_after is null or latest.id>m.hidden_after)
  ) x),'[]'::jsonb);
 end if;
 select * into g from public.network_group_conversations where id=p_id for update;
 select * into me from public.network_group_members where conversation_id=p_id and user_id=p_user;
 if g.id is null or me.user_id is null then raise exception 'Conversation unavailable';end if;
 select coalesce(max(id),0) into boundary from public.network_group_messages where conversation_id=p_id;
 if p_action='messages' then
  select coalesce(jsonb_agg(to_jsonb(x) order by x.id::bigint),'[]'::jsonb) into result from (
   select msg.id::text id,msg.sender_id "senderId",coalesce(u.raw_user_meta_data->>'full_name','Member') "senderName",u.raw_user_meta_data->>'avatar_url' "senderAvatarUrl",msg.text,msg.created_at "createdAt"
   from public.network_group_messages msg left join auth.users u on u.id=msg.sender_id
   where msg.conversation_id=p_id and msg.id>me.history_after and (p_body->>'before' is null or msg.id<(p_body->>'before')::bigint) and not public.group_chat_blocked(p_user,msg.sender_id)
   order by msg.id desc limit 50
  ) x;
  select coalesce(jsonb_agg(jsonb_build_object('id',m.user_id,'name',coalesce(u.raw_user_meta_data->>'full_name','Member')) order by m.joined_at),'[]'::jsonb) into members from public.network_group_members m join auth.users u on u.id=m.user_id where m.conversation_id=p_id;
  if p_body->>'before' is null then update public.network_group_members set last_read_id=boundary where conversation_id=p_id and user_id=p_user;end if;
  return jsonb_build_object('visibleSenderIds',coalesce((select jsonb_agg(distinct sender_id) from public.network_group_messages where conversation_id=p_id and not public.group_chat_blocked(p_user,sender_id)),'[]'::jsonb),'messages',result,'members',members,'name',g.name,'ownerId',g.owner_id,'muted',me.muted);
 elsif p_action='send' then
  if length(trim(p_body->>'text')) not between 1 and 4000 then raise exception 'Message must contain 1–4000 characters';end if;
  insert into public.network_group_messages(conversation_id,sender_id,text) values(p_id,p_user,trim(p_body->>'text')) returning id into mid;
  update public.network_group_members set hidden_after=null where conversation_id=p_id;
  update public.network_group_members set last_read_id=mid where conversation_id=p_id and user_id=p_user;
  return jsonb_build_object('id',mid::text);
 elsif p_action='settings' then
  update public.network_group_members set muted=coalesce((p_body->>'muted')::boolean,muted),archived=coalesce((p_body->>'archived')::boolean,archived),hidden_after=case when p_body->>'hide'='true' then boundary else hidden_after end where conversation_id=p_id and user_id=p_user;
 elsif p_action in ('leave','remove') then
  target=case when p_action='leave' then p_user else (p_body->>'userId')::uuid end;
  if target<>p_user and g.owner_id<>p_user then raise exception 'Only the creator manages membership';end if;
  if target=g.owner_id then
   if (select count(*) from public.network_group_members where conversation_id=p_id)=1 then delete from public.network_group_conversations where id=p_id;return jsonb_build_object('ok',true);end if;
   raise exception 'Transfer ownership before leaving';
  end if;
  delete from public.network_group_members where conversation_id=p_id and user_id=target;
 elsif g.owner_id<>p_user then raise exception 'Only the creator manages this group';
 elsif p_action='rename' then
  if length(trim(p_body->>'name')) not between 1 and 80 then raise exception 'Enter a group name';end if;
  update public.network_group_conversations set name=trim(p_body->>'name') where id=p_id;
 elsif p_action='transfer' then
  target=(p_body->>'userId')::uuid;
  if not exists(select 1 from public.network_group_members where conversation_id=p_id and user_id=target) then raise exception 'Choose a current participant';end if;
  update public.network_group_conversations set owner_id=target where id=p_id;
 elsif p_action='add' then
  target=(p_body->>'userId')::uuid;
  if (select count(*) from public.network_group_members where conversation_id=p_id)>=25 then raise exception 'Group limit is 25 people';end if;
  if not exists(select 1 from auth.users where id=target and confirmed_at is not null and coalesce(raw_user_meta_data->>'status','active')<>'suspended' and coalesce(raw_user_meta_data->>'onboarding_complete','true')<>'false') then raise exception 'Member unavailable';end if;
  if exists(select 1 from public.network_group_members where conversation_id=p_id and public.group_chat_blocked(user_id,target)) then raise exception 'Member cannot join this conversation';end if;
  insert into public.network_group_members(conversation_id,user_id,history_after,last_read_id) values(p_id,target,boundary,boundary) on conflict do nothing;
 else raise exception 'Invalid group action';end if;
 return jsonb_build_object('ok',true);
end;$$;
revoke all on function public.group_chat(uuid,text,uuid,jsonb),public.group_chat_blocked(uuid,uuid) from public,anon,authenticated;
grant execute on function public.group_chat(uuid,text,uuid,jsonb),public.group_chat_blocked(uuid,uuid) to service_role;
-- Preserve remaining conversations when their owner deletes an account.
create function public.cleanup_group_account() returns trigger language plpgsql security definer set search_path='' as $$
declare g record; successor uuid;
begin
 for g in select id from public.network_group_conversations where owner_id=old.id for update loop
  select user_id into successor from public.network_group_members where conversation_id=g.id and user_id<>old.id order by joined_at,user_id limit 1;
  if successor is null then delete from public.network_group_conversations where id=g.id;else update public.network_group_conversations set owner_id=successor where id=g.id;end if;
 end loop;
 return old;
end;$$;
revoke all on function public.cleanup_group_account() from public,anon,authenticated;
create trigger cleanup_group_account before delete on auth.users for each row execute function public.cleanup_group_account();
