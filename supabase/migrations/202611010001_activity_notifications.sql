-- Preserve reaction inbox compatibility while adding durable post activity.
alter table public.network_reaction_notifications
  alter column reaction drop not null,
  add column kind text not null default 'reaction'
    check (kind in ('reaction','mention','wall_post','wall_comment','comment','reply'));

create function public.notify_network_post_activity() returns trigger
language plpgsql security definer set search_path='' as $$
declare
  previous_items jsonb := '[]'; post jsonb; previous_post jsonb;
  cm jsonb; recipient uuid; actor uuid;
  recipient_text text; notice_kind text;
begin
  if new.key <> 'posts' then return new; end if;
  if tg_op = 'UPDATE' then previous_items := coalesce(old.value, '[]'); end if;
  for post in select value from jsonb_array_elements(new.value) loop
    select value into previous_post from jsonb_array_elements(previous_items) where value->>'id'=post->>'id';
    if previous_post = post then continue; end if;
    select id into actor from auth.users where id::text=post->>'authorId';
    if actor is not null then
      -- New wall entries and newly added tags only; unrelated writes never reset read state.
      for recipient_text, notice_kind in
        select post->>'wallUserId', 'wall_post' where previous_post is null
        union
        select tag.value->>'id', 'mention' from jsonb_array_elements(coalesce(post->'taggedUsers','[]')) tag
        where not exists (select from jsonb_array_elements(coalesce(previous_post->'taggedUsers','[]')) old_tag where old_tag->>'id'=tag.value->>'id')
      loop
        select id into recipient from auth.users where id::text=recipient_text and id<>actor;
        if recipient is not null then
          insert into public.network_reaction_notifications(recipient_id,actor_id,post_id,target_key,kind)
          values(recipient,actor,post->>'id',notice_kind||':'||(post->>'id'),notice_kind)
          on conflict(recipient_id,actor_id,target_key) do nothing;
        end if;
      end loop;
    end if;
    -- Only newly appended comments generate notifications, in the write transaction.
    for cm in select value from jsonb_array_elements(coalesce(post->'comments','[]')) loop
      if exists(select from jsonb_array_elements(coalesce(previous_post->'comments','[]')) old_cm where old_cm->>'id'=cm->>'id') then continue; end if;
      select id into actor from auth.users where id::text=cm->>'authorId';
      if actor is null then continue; end if;
      for recipient_text in
        select post->>'authorId'
        union select post->>'wallUserId'
        union select value->>'authorId' from jsonb_array_elements(coalesce(post->'comments','[]'))
          where value->>'id' in (cm->>'parentId',cm->>'replyToId')
      loop
        select id into recipient from auth.users where id::text=recipient_text and id<>actor;
        if recipient is null then continue; end if;
        if exists(select from jsonb_array_elements(coalesce(post->'comments','[]')) t
          where t->>'id' in (cm->>'parentId',cm->>'replyToId') and t->>'authorId'=recipient_text) then notice_kind:='reply';
        elsif recipient_text=post->>'wallUserId' then notice_kind:='wall_comment';
        else notice_kind:='comment'; end if;
        insert into public.network_reaction_notifications(recipient_id,actor_id,post_id,comment_id,target_key,kind)
        values(recipient,actor,post->>'id',cm->>'id','activity-comment:'||(post->>'id')||':'||(cm->>'id'),notice_kind)
        on conflict(recipient_id,actor_id,target_key) do nothing;
      end loop;
    end loop;
  end loop;
  return new;
end;$$;
revoke all on function public.notify_network_post_activity() from public,anon,authenticated;
create trigger network_post_activity after insert or update on public.kv_store_5bb4c08d
for each row when (new.key='posts') execute function public.notify_network_post_activity();
