create table public.network_comment_reactions (
 post_id text not null,comment_id text not null,user_id uuid not null references auth.users(id) on delete cascade,
 reaction text not null check(reaction in ('amen','pray','heart')),primary key(post_id,comment_id,user_id)
);
alter table public.network_comment_reactions enable row level security;
revoke all on public.network_comment_reactions from anon,authenticated;
grant all on public.network_comment_reactions to service_role;
create function public.comment_reaction_totals(p_post_ids text[],p_user uuid)
returns table(post_id text,comment_id text,counts jsonb,my_reaction text)
language sql stable security definer set search_path='' as $$
 select r.post_id,r.comment_id,jsonb_build_object('amen',count(*) filter(where reaction='amen'),'pray',count(*) filter(where reaction='pray'),'heart',count(*) filter(where reaction='heart')),max(reaction) filter(where user_id=p_user)
 from public.network_comment_reactions r where r.post_id=any(p_post_ids) group by r.post_id,r.comment_id
$$;
create function public.write_post_comment(p_post text,p_user uuid,p_text text default null,p_parent text default null,p_delete text default null,p_admin boolean default false)
returns jsonb language plpgsql security definer set search_path='' as $$
declare items jsonb; post jsonb; comments jsonb; parent jsonb; target jsonb; updated jsonb; doomed text[];
begin
 select value into items from public.kv_store_5bb4c08d where key='posts' for update;
 select value into post from jsonb_array_elements(coalesce(items,'[]')) where value->>'id'=p_post;
 if post is null then raise exception 'Post unavailable';end if;
 comments=coalesce(post->'comments','[]');
 if p_delete is not null then
  select value into target from jsonb_array_elements(comments) where value->>'id'=p_delete;
  if target is null then raise exception 'Comment unavailable';end if;
  if (target->>'authorId') is distinct from p_user::text and not p_admin then raise exception 'Cannot delete this comment';end if;
  with recursive descendants(id) as (select p_delete union select c->>'id' from jsonb_array_elements(comments) c join descendants d on c->>'parentId'=d.id)
  select array_agg(id) into doomed from descendants;
  select coalesce(jsonb_agg(value),'[]') into comments from jsonb_array_elements(comments) where not (value->>'id'=any(doomed));
  delete from public.network_comment_reactions where post_id=p_post and comment_id=any(doomed);
 else
  if p_text is null or length(trim(p_text)) not between 1 and 4000 then raise exception 'Enter a comment of 1–4000 characters';end if;
  if p_parent is not null then
   select value into parent from jsonb_array_elements(comments) where value->>'id'=p_parent;
   if parent is null then raise exception 'Comment being replied to is unavailable';end if;
  end if;
  comments=comments||jsonb_build_array(jsonb_build_object('id',gen_random_uuid()::text,'authorId',p_user,'text',trim(p_text),'createdAt',clock_timestamp(),'parentId',case when parent is null then null else coalesce(parent->>'parentId',parent->>'id') end,'replyToId',p_parent));
 end if;
 updated=post||jsonb_build_object('comments',comments,'commentCount',jsonb_array_length(comments));
 update public.kv_store_5bb4c08d set value=(select jsonb_agg(case when value->>'id'=p_post then updated else value end) from jsonb_array_elements(items)) where key='posts';
 return updated;
end;$$;
revoke all on function public.comment_reaction_totals(text[],uuid),public.write_post_comment(text,uuid,text,text,text,boolean) from public,anon,authenticated;
grant execute on function public.comment_reaction_totals(text[],uuid),public.write_post_comment(text,uuid,text,text,text,boolean) to service_role;
