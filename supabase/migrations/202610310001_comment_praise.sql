-- Extend comment reactions without changing the post reaction choices.
alter table public.network_comment_reactions drop constraint network_comment_reactions_reaction_check;
alter table public.network_comment_reactions add constraint network_comment_reactions_reaction_check check (reaction in ('amen','pray','heart','praise'));
create or replace function public.comment_reaction_totals(p_post_ids text[],p_user uuid)
returns table(post_id text,comment_id text,counts jsonb,my_reaction text)
language sql stable security definer set search_path='' as $$
 select r.post_id,r.comment_id,jsonb_build_object('amen',count(*) filter(where reaction='amen'),'pray',count(*) filter(where reaction='pray'),'heart',count(*) filter(where reaction='heart'),'praise',count(*) filter(where reaction='praise')),max(reaction) filter(where user_id=p_user)
 from public.network_comment_reactions r where r.post_id=any(p_post_ids) group by r.post_id,r.comment_id
$$;
