create function public.guard_adult_membership() returns trigger
language plpgsql security definer set search_path = '' as $$
declare confirmed boolean; stamp jsonb;
begin
  confirmed := new.raw_user_meta_data->'age18_confirmed' = 'true'::jsonb;
  if tg_op = 'UPDATE' and old.raw_user_meta_data->'age18_confirmed' = 'true'::jsonb then
    confirmed := true;
    stamp := old.raw_user_meta_data->'age18_confirmed_at';
  end if;
  new.raw_user_meta_data := coalesce(new.raw_user_meta_data,'{}'::jsonb) || jsonb_build_object('age18_confirmed',coalesce(confirmed,false));
  if confirmed then
    new.raw_user_meta_data := new.raw_user_meta_data || jsonb_build_object('age18_confirmed_at',coalesce(stamp,to_jsonb(now())));
  else
    new.raw_user_meta_data := new.raw_user_meta_data - 'age18_confirmed_at';
  end if;
  return new;
end;
$$;
revoke all on function public.guard_adult_membership() from public, anon, authenticated;
create trigger guard_adult_membership before insert or update of raw_user_meta_data on auth.users
for each row execute function public.guard_adult_membership();

-- Called only by the trusted backend when deleting the authenticated account.
create function public.account_uploads(p_user uuid)
returns table(bucket_id text, name text)
language sql security definer set search_path = '' as $$
  select o.bucket_id, o.name from storage.objects o
  where o.owner_id = p_user::text or left(o.name,37) = p_user::text || '/';
$$;
revoke all on function public.account_uploads(uuid) from public, anon, authenticated;
grant execute on function public.account_uploads(uuid) to service_role;

-- Stop retaining the old IP-address geolocation cache. It is no longer used.
update public.kv_store_5bb4c08d set value='{}'::jsonb where key='analytics_geo_cache';
