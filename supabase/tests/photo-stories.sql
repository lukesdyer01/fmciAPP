-- Run after the migration inside a transaction that is rolled back.
do $$
declare owner uuid; upload uuid := gen_random_uuid(); other uuid := gen_random_uuid(); record public.photo_stories; denied boolean := false;
begin
 select id into owner from auth.users limit 1;
 if owner is null then raise exception 'A fixture account is required'; end if;
 if has_table_privilege('authenticated','public.photo_stories','SELECT') or has_table_privilege('anon','public.story_views','INSERT') then raise exception 'Member table access leaked'; end if;
 if has_function_privilege('authenticated','public.reserve_photo_story(uuid,uuid)','EXECUTE') then raise exception 'Reservation RPC leaked'; end if;
 if (select public from storage.buckets where id='stories') then raise exception 'Story bucket must be private'; end if;
 delete from public.photo_stories where author_id=owner;
 record := public.reserve_photo_story(upload,owner);
 if record.author_id != owner then raise exception 'Owner mismatch'; end if;
 perform public.reserve_photo_story(upload,owner);
 if (select count(*) from public.photo_stories where id=upload) != 1 then raise exception 'Duplicate reservation'; end if;
 begin perform public.reserve_photo_story(upload,other); exception when others then denied:=true; end;
 if not denied then raise exception 'Cross-account upload accepted'; end if;
 record := public.publish_photo_story(upload,owner,'A photo');
 if record.expires_at != record.published_at + interval '24 hours' then raise exception 'Incorrect lifetime'; end if;
 record := public.publish_photo_story(upload,owner,'Changed retry');
 if record.caption != 'A photo' then raise exception 'Retry edited a published photo'; end if;
 update public.photo_stories set state='deleted' where id=upload;
 for i in 1..9 loop perform public.reserve_photo_story(gen_random_uuid(),owner); end loop;
 denied:=false;
 begin perform public.reserve_photo_story(gen_random_uuid(),owner); exception when others then denied:=true; end;
 if not denied then raise exception 'Quota bypassed by deleted Story'; end if;
end $$;
