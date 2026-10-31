begin;
do $$
declare u uuid; r jsonb;
begin
 select id into strict u from auth.users where raw_app_meta_data->>'role'='superadmin' limit 1;
 insert into public.network_post_reactions values('reaction-rollback-fixture',u,'amen');
 insert into public.network_post_reactions values('reaction-rollback-fixture',u,'amen') on conflict(post_id,user_id) do update set reaction=excluded.reaction;
 select counts into r from public.post_reaction_totals(array['reaction-rollback-fixture'],u);
 if r->>'amen'<>'1' then raise exception 'Duplicate reaction counted';end if;
 update public.network_post_reactions set reaction='pray' where post_id='reaction-rollback-fixture';
 select counts into r from public.post_reaction_totals(array['reaction-rollback-fixture'],u);
 if r->>'amen'<>'0' or r->>'pray'<>'1' then raise exception 'Switch failed';end if;
 if (select my_reaction from public.post_reaction_totals(array['reaction-rollback-fixture'],u))<>'pray' then raise exception 'Selection not restored';end if;
 delete from public.network_post_reactions where post_id='reaction-rollback-fixture';
 if exists(select 1 from public.post_reaction_totals(array['reaction-rollback-fixture'],u)) then raise exception 'Removal failed';end if;
 if has_table_privilege('authenticated','public.network_post_reactions','SELECT') then raise exception 'Reaction identities exposed';end if;
end $$;
select 'Reaction idempotency, switching, reload selection, removal and privacy passed (rolled back)' as result;
rollback;
