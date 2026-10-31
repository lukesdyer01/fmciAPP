create table public.network_reaction_notifications (
 id uuid primary key default gen_random_uuid(),
 recipient_id uuid not null references auth.users(id) on delete cascade,
 actor_id uuid not null references auth.users(id) on delete cascade,
 post_id text not null,
 comment_id text,
 target_key text not null,
 reaction text not null check(reaction in ('amen','pray','heart','praise')),
 created_at timestamptz not null default now(),
 read_at timestamptz,
 unique(recipient_id,actor_id,target_key)
);
create index network_reaction_notifications_inbox on public.network_reaction_notifications(recipient_id,created_at desc);
alter table public.network_reaction_notifications enable row level security;
revoke all on public.network_reaction_notifications from anon,authenticated;
grant all on public.network_reaction_notifications to service_role;

-- Runs in the same transaction as the reaction, so retries cannot lose or duplicate alerts.
create function public.notify_network_reaction() returns trigger language plpgsql security definer set search_path='' as $$
declare source jsonb; target_comment text; target text; owner_text text; recipient uuid;
begin
 source=case when tg_op='DELETE' then to_jsonb(old) else to_jsonb(new) end;
 target_comment=source->>'comment_id';
 target=case when target_comment is null then 'post:'||(source->>'post_id') else 'comment:'||(source->>'post_id')||':'||target_comment end;
 if tg_op='DELETE' then
  delete from public.network_reaction_notifications where actor_id=(source->>'user_id')::uuid and target_key=target;
  return old;
 end if;
 if tg_op='UPDATE' and old.reaction is not distinct from new.reaction then return new;end if;
 select p->>'authorId' into owner_text from public.kv_store_5bb4c08d k cross join lateral jsonb_array_elements(k.value) p where k.key='posts' and p->>'id'=new.post_id;
 if target_comment is not null then
  select cm->>'authorId' into owner_text from public.kv_store_5bb4c08d k cross join lateral jsonb_array_elements(k.value) p cross join lateral jsonb_array_elements(coalesce(p->'comments','[]')) cm where k.key='posts' and p->>'id'=new.post_id and cm->>'id'=target_comment;
 end if;
 select id into recipient from auth.users where id::text=owner_text;
 if recipient is null or recipient=new.user_id then return new;end if;
 insert into public.network_reaction_notifications(recipient_id,actor_id,post_id,comment_id,target_key,reaction)
 values(recipient,new.user_id,new.post_id,target_comment,target,new.reaction)
 on conflict(recipient_id,actor_id,target_key) do update set reaction=excluded.reaction,created_at=clock_timestamp(),read_at=null;
 return new;
end;$$;
revoke all on function public.notify_network_reaction() from public,anon,authenticated;
create trigger post_reaction_notification after insert or update or delete on public.network_post_reactions for each row execute function public.notify_network_reaction();
create trigger comment_reaction_notification after insert or update or delete on public.network_comment_reactions for each row execute function public.notify_network_reaction();
