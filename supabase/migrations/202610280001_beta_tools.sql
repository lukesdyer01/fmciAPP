-- Member tools use separate rows so concurrent users never overwrite each other.
create table public.network_member_preferences (
 user_id uuid primary key references auth.users(id) on delete cascade,
 messages boolean not null default true,
 ministry_events boolean not null default true,
 moderation boolean not null default true
);
create table public.network_saved_items (
 user_id uuid not null references auth.users(id) on delete cascade,
 kind text not null check (kind in ('post','resource')),
 item_id text not null check (length(item_id) between 1 and 200),
 created_at timestamptz not null default now(),
 primary key(user_id,kind,item_id)
);
create table public.network_beta_feedback (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 kind text not null check(kind in ('bug','suggestion')),
 message text not null check(length(message) between 10 and 4000),
 device text not null default '',
 app_version text not null default '',
 page text not null default '',
 status text not null default 'new' check(status in ('new','reviewed','resolved')),
 created_at timestamptz not null default now()
);
alter table public.network_member_preferences enable row level security;
alter table public.network_saved_items enable row level security;
alter table public.network_beta_feedback enable row level security;
revoke all on public.network_member_preferences,public.network_saved_items,public.network_beta_feedback from anon,authenticated;
grant all on public.network_member_preferences,public.network_saved_items,public.network_beta_feedback to service_role;
alter table public.network_registration_links add column label text not null default 'Group invitation';
alter table public.network_registration_links add column signup_count bigint not null default 0;
alter table public.network_registration_links add column revoked_at timestamptz;
-- Keep counting atomic and rollback counts with failed account creation.
create or replace function public.require_network_invitation()
returns trigger language plpgsql security definer set search_path='' as $$
declare accepted_email text; accepted_general_link boolean := false; supplied_token text;
begin
 supplied_token := coalesce(new.raw_user_meta_data->>'invitation_token','');
 delete from public.network_invitations where email=lower(trim(new.email)) and expires_at>now()
 and token_hash=encode(sha256(convert_to(supplied_token,'UTF8')),'hex') returning email into accepted_email;
 if accepted_email is null then
  update public.network_registration_links set signup_count=signup_count+1
  where expires_at>now() and revoked_at is null
  and token_hash=encode(sha256(convert_to(supplied_token,'UTF8')),'hex');
  accepted_general_link := found;
 end if;
 if accepted_email is null and not accepted_general_link then raise exception 'A valid invitation is required to join FMCI Network'; end if;
 new.raw_user_meta_data=coalesce(new.raw_user_meta_data,'{}'::jsonb)-'invitation_token';
 return new;
end; $$;
revoke all on function public.require_network_invitation() from public,anon,authenticated;

update public.network_registration_links set label='fmci26' where token_hash=encode(sha256(convert_to('fmci26','UTF8')),'hex');
