-- Run after the migration, inside a transaction; fixture data is always rolled back.
begin;
do $$
declare actor uuid; stranger uuid; p jsonb; root text; reply text; other_root text; rejected boolean;
begin
 select id into actor from auth.users limit 1;
 if actor is null then raise exception 'Test needs an existing auth user';end if;
 stranger=gen_random_uuid();
 insert into public.kv_store_5bb4c08d(key,value) values('posts','[]') on conflict(key) do nothing;
 update public.kv_store_5bb4c08d set value=value||'[{"id":"thread-test-fixture","comments":[]}]'::jsonb where key='posts';
 p=public.write_post_comment('thread-test-fixture',actor,'root');root=p->'comments'->0->>'id';
 p=public.write_post_comment('thread-test-fixture',actor,'reply',root);reply=p->'comments'->1->>'id';
 p=public.write_post_comment('thread-test-fixture',actor,'nested',reply);
 if p->'comments'->2->>'parentId'<>root or p->'comments'->2->>'replyToId'<>reply then raise exception 'Reply flattening failed';end if;
 rejected=false;
 begin perform public.write_post_comment('thread-test-fixture',stranger,null,null,root);exception when others then rejected=true;end;
 if not rejected then raise exception 'Unauthorized delete accepted';end if;
 rejected=false;
 begin perform public.write_post_comment('thread-test-fixture',actor,'bad','missing');exception when others then rejected=true;end;
 if not rejected then raise exception 'Missing parent accepted';end if;
 insert into public.network_comment_reactions values('thread-test-fixture',reply,actor,'pray');
 if (select my_reaction from public.comment_reaction_totals(array['thread-test-fixture'],actor))<>'pray' then raise exception 'Reaction not restored';end if;
 p=public.write_post_comment('thread-test-fixture',actor,null,null,root);
 if jsonb_array_length(p->'comments')<>0 or (p->>'commentCount')::int<>0 then raise exception 'Reply cascade failed';end if;
 if exists(select from public.network_comment_reactions where post_id='thread-test-fixture') then raise exception 'Reactions not removed';end if;
 if has_function_privilege('authenticated','public.write_post_comment(text,uuid,text,text,text,boolean)','execute') then raise exception 'Untrusted RPC access';end if;
end;$$;
rollback;
