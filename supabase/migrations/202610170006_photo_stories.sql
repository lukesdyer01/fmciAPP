-- Story records are accessed only by the authenticated Edge API. Private media
-- must never inherit the legacy avatars bucket's public access policies.
create table public.photo_stories (
 id uuid primary key,
 author_id uuid not null references auth.users(id) on delete cascade,
 object_path text not null unique,
 caption text not null default '' check (char_length(caption) <= 300),
 state text not null default 'pending' check (state in ('pending','published','deleted')),
 reserved_at timestamptz not null default now(),
 published_at timestamptz,
 expires_at timestamptz,
 check (published_at is null or expires_at = published_at + interval '24 hours')
);
create index photo_stories_author_time on public.photo_stories(author_id, reserved_at);
create index photo_stories_expiration on public.photo_stories(expires_at);
create table public.story_views (
 story_id uuid not null references public.photo_stories(id) on delete cascade,
 viewer_id uuid not null references auth.users(id) on delete cascade,
 viewed_at timestamptz not null default now(),
 reaction text check (reaction in ('heart','amen','pray')),
 primary key (story_id, viewer_id)
);
alter table public.photo_stories enable row level security;
alter table public.story_views enable row level security;
revoke all on public.photo_stories, public.story_views from anon, authenticated;
grant all on public.photo_stories, public.story_views to service_role;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values ('stories','stories',false,500000,array['image/jpeg'])
on conflict(id) do update set public=false,file_size_limit=500000,allowed_mime_types=array['image/jpeg'];

create function public.reserve_photo_story(p_id uuid,p_author uuid) returns public.photo_stories
language plpgsql security definer set search_path = '' as $$
declare result public.photo_stories; used integer;
begin
 perform pg_advisory_xact_lock(hashtextextended(p_author::text, 17));
 select * into result from public.photo_stories where id=p_id;
 if found then
  if result.author_id != p_author then raise exception 'Story unavailable'; end if;
  return result;
 end if;
 select count(*) into used from public.photo_stories where author_id=p_author and
 ((published_at > now()-interval '24 hours') or (state='pending' and reserved_at > now()-interval '10 minutes'));
 if used >= 10 then raise exception 'You can publish up to 10 Story photos per rolling 24 hours'; end if;
 insert into public.photo_stories(id,author_id,object_path)
 values(p_id,p_author,p_author::text || '/' || p_id::text || '.jpg') returning * into result;
 return result;
end $$;
create function public.publish_photo_story(p_id uuid,p_author uuid,p_caption text) returns public.photo_stories
language plpgsql security definer set search_path = '' as $$
declare result public.photo_stories;
begin
 select * into result from public.photo_stories where id=p_id and author_id=p_author for update;
 if not found then raise exception 'Story unavailable'; end if;
 if result.state='published' then return result; end if;
 if result.state!='pending' or result.reserved_at < now()-interval '10 minutes' then raise exception 'Upload expired. Choose your photo again'; end if;
 update public.photo_stories set state='published',caption=p_caption,published_at=now(),expires_at=now()+interval '24 hours'
 where id=p_id returning * into result;
 return result;
end $$;
-- Enumerate only Story bucket objects. Never DELETE storage.objects directly:
-- the worker uses the Storage API to remove the underlying bytes.
create function public.story_cleanup_objects() returns table(name text)
language sql security definer set search_path = '' as $$
 select o.name from storage.objects o left join public.photo_stories s on s.object_path=o.name
 where o.bucket_id='stories' and (
  (s.id is null and o.created_at < now()-interval '15 minutes') or
  s.state='deleted' or s.expires_at <= now() or
  (s.state='pending' and s.reserved_at < now()-interval '15 minutes')
 ) limit 100;
$$;
revoke all on function public.reserve_photo_story(uuid,uuid), public.publish_photo_story(uuid,uuid,text), public.story_cleanup_objects() from public,anon,authenticated;
grant execute on function public.reserve_photo_story(uuid,uuid), public.publish_photo_story(uuid,uuid,text), public.story_cleanup_objects() to service_role;
-- Restrictive policies protect this bucket even if older permissive policies
-- happen to allow broad storage access. Service-role backend bypasses RLS.
create policy stories_backend_only on storage.objects as restrictive for all to anon,authenticated
using (bucket_id <> 'stories') with check (bucket_id <> 'stories');
create function public.story_member_summaries(p_ids uuid[])
returns table(id uuid, user_metadata jsonb)
language sql security definer set search_path='' as $$
 select u.id,jsonb_build_object('full_name',coalesce(u.raw_user_meta_data->>'full_name','FMCI member'),
 'avatar_url',coalesce(u.raw_user_meta_data->>'avatar_url',u.raw_user_meta_data->>'avatarUrl',''))
 from auth.users u where u.id=any(p_ids)
 and u.raw_user_meta_data->'age18_confirmed'='true'::jsonb
 and coalesce(u.raw_user_meta_data->'onboarding_complete','true'::jsonb) != 'false'::jsonb
 and coalesce(u.raw_app_meta_data->>'status','active') != 'suspended'
 and (u.banned_until is null or u.banned_until <= now());
$$;
revoke all on function public.story_member_summaries(uuid[]) from public,anon,authenticated;
grant execute on function public.story_member_summaries(uuid[]) to service_role;
