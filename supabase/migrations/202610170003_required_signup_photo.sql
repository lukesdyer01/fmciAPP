-- Existing completed accounts are unchanged. Every new account must complete onboarding.
create function public.require_signup_photo() returns trigger
language plpgsql security definer set search_path = '' as $$
declare photo_path text;
begin
  if tg_op = 'INSERT' then
    new.raw_user_meta_data := coalesce(new.raw_user_meta_data, '{}'::jsonb) ||
      '{"onboarding_complete":false,"profile_photo_required":true}'::jsonb;
  elsif old.raw_user_meta_data->'profile_photo_required' = 'true'::jsonb
      or old.raw_user_meta_data->'onboarding_complete' = 'false'::jsonb then
    new.raw_user_meta_data := coalesce(new.raw_user_meta_data, '{}'::jsonb) || '{"profile_photo_required":true}'::jsonb;
    if old.raw_user_meta_data->'onboarding_complete' = 'true'::jsonb then
      new.raw_user_meta_data := new.raw_user_meta_data || '{"onboarding_complete":true}'::jsonb;
    elsif new.raw_user_meta_data->'onboarding_complete' = 'true'::jsonb then
      photo_path := split_part(coalesce(new.raw_user_meta_data->>'avatar_url',''), '/storage/v1/object/public/avatars/', 2);
      if photo_path not like new.id::text || '/%' or not exists (
        select 1 from storage.objects where bucket_id = 'avatars' and name = photo_path
          and metadata->>'mimetype' like 'image/%'
      ) then
        raise exception 'Upload a profile photo before completing signup';
      end if;
    else
      -- Removing or falsifying the flag must not bypass the onboarding gate.
      new.raw_user_meta_data := new.raw_user_meta_data || '{"onboarding_complete":false}'::jsonb;
    end if;
  end if;
  return new;
end;
$$;
revoke all on function public.require_signup_photo() from public, anon, authenticated;
create trigger require_signup_photo before insert or update of raw_user_meta_data on auth.users
for each row execute function public.require_signup_photo();
