-- Protect the Auth endpoint itself, including requests outside the app.
create table public.network_invitations (
  email text primary key check (email = lower(trim(email))),
  token_hash text not null,
  expires_at timestamptz not null,
  created_by uuid not null references auth.users(id) on delete cascade
);
alter table public.network_invitations enable row level security;
revoke all on public.network_invitations from anon, authenticated;
grant all on public.network_invitations to service_role;

create or replace function public.require_network_invitation()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  accepted_email text;
begin
  -- DELETE takes a row lock: concurrent attempts cannot reuse an invitation.
  delete from public.network_invitations
  where email = lower(trim(new.email))
    and expires_at > now()
    and token_hash = encode(sha256(convert_to(coalesce(new.raw_user_meta_data->>'invitation_token', ''), 'UTF8')), 'hex')
  returning email into accepted_email;
  if accepted_email is null then
    raise exception 'A valid invitation is required to join FMCI Network';
  end if;
  new.raw_user_meta_data = coalesce(new.raw_user_meta_data, '{}'::jsonb) - 'invitation_token';
  return new;
end;
$$;
revoke all on function public.require_network_invitation() from public, anon, authenticated;
create trigger require_network_invitation
before insert on auth.users
for each row execute function public.require_network_invitation();
