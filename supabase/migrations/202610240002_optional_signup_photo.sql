-- Keep the signup onboarding gate, but let members finish it without a photo.
create or replace function public.require_signup_photo() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    new.raw_user_meta_data := coalesce(new.raw_user_meta_data, '{}'::jsonb) ||
      '{"onboarding_complete":false,"profile_photo_required":false}'::jsonb;
  else
    new.raw_user_meta_data := coalesce(new.raw_user_meta_data, '{}'::jsonb) ||
      '{"profile_photo_required":false}'::jsonb;
    if old.raw_user_meta_data->'onboarding_complete' = 'false'::jsonb
        and new.raw_user_meta_data->'onboarding_complete' is distinct from 'true'::jsonb then
      new.raw_user_meta_data := new.raw_user_meta_data || '{"onboarding_complete":false}'::jsonb;
    end if;
  end if;
  return new;
end;
$$;
