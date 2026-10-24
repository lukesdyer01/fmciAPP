-- Superadmin general registration links may authorize multiple accounts until expiry.
create or replace function public.require_network_invitation()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  accepted_email text;
  accepted_general_link boolean := false;
  supplied_token text;
begin
  supplied_token := coalesce(new.raw_user_meta_data->>'invitation_token', '');

  -- Email-specific invitations remain single-use and email-bound.
  delete from public.network_invitations
  where email = lower(trim(new.email))
    and expires_at > now()
    and token_hash = encode(sha256(convert_to(supplied_token, 'UTF8')), 'hex')
  returning email into accepted_email;

  -- General links are reusable bearer credentials until their seven-day expiry.
  if accepted_email is null then
    perform 1 from public.network_registration_links
    where expires_at > now()
      and token_hash = encode(sha256(convert_to(supplied_token, 'UTF8')), 'hex');
    accepted_general_link := found;
  end if;

  if accepted_email is null and not coalesce(accepted_general_link, false) then
    raise exception 'A valid invitation is required to join FMCI Network';
  end if;

  new.raw_user_meta_data = coalesce(new.raw_user_meta_data, '{}'::jsonb) - 'invitation_token';
  return new;
end;
$$;
revoke all on function public.require_network_invitation() from public, anon, authenticated;
