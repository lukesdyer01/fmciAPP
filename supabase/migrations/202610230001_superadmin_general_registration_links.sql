-- Superadmins may create a one-use link that is not bound to an email address.
create table public.network_registration_links (
  token_hash text primary key,
  expires_at timestamptz not null,
  created_by uuid not null references auth.users(id) on delete cascade
);

alter table public.network_registration_links enable row level security;
revoke all on public.network_registration_links from anon, authenticated;
grant all on public.network_registration_links to service_role;

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

  -- Preserve existing email-specific invitations.
  delete from public.network_invitations
  where email = lower(trim(new.email))
    and expires_at > now()
    and token_hash = encode(sha256(convert_to(supplied_token, 'UTF8')), 'hex')
  returning email into accepted_email;

  -- A superadmin general link is a bearer credential and can authorize one
  -- account with any email. DELETE serializes concurrent attempts.
  if accepted_email is null then
    delete from public.network_registration_links
    where expires_at > now()
      and token_hash = encode(sha256(convert_to(supplied_token, 'UTF8')), 'hex')
    returning true into accepted_general_link;
  end if;

  if accepted_email is null and not coalesce(accepted_general_link, false) then
    raise exception 'A valid invitation is required to join FMCI Network';
  end if;

  new.raw_user_meta_data = coalesce(new.raw_user_meta_data, '{}'::jsonb) - 'invitation_token';
  return new;
end;
$$;
revoke all on function public.require_network_invitation() from public, anon, authenticated;
