create table public.network_post_reactions (
 post_id text not null,
 user_id uuid not null references auth.users(id) on delete cascade,
 reaction text not null check(reaction in ('amen','pray','heart')),
 primary key(post_id,user_id)
);
alter table public.network_post_reactions enable row level security;
revoke all on public.network_post_reactions from anon,authenticated;
grant all on public.network_post_reactions to service_role;
create function public.post_reaction_totals(p_post_ids text[],p_user uuid)
returns table(post_id text,counts jsonb,my_reaction text)
language sql stable security definer set search_path='' as $$
 select r.post_id,jsonb_build_object('amen',count(*) filter(where reaction='amen'),'pray',count(*) filter(where reaction='pray'),'heart',count(*) filter(where reaction='heart')),max(reaction) filter(where user_id=p_user)
 from public.network_post_reactions r where r.post_id=any(p_post_ids) group by r.post_id
$$;
revoke all on function public.post_reaction_totals(text[],uuid) from public,anon,authenticated;
grant execute on function public.post_reaction_totals(text[],uuid) to service_role;
