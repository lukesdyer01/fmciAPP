create table public.ministry_role_requests (
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('Pastor', 'Teacher', 'Evangelist', 'Apostle', 'Prophet')),
  status text not null default 'pending' check (status in ('pending', 'approved', 'denied')),
  requested_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid references auth.users(id) on delete set null,
  primary key (user_id, role)
);
alter table public.ministry_role_requests enable row level security;
revoke all on public.ministry_role_requests from anon, authenticated;
grant all on public.ministry_role_requests to service_role;

-- Preserve roles already displayed before this approval requirement existed.
insert into public.ministry_role_requests(user_id, role, status, reviewed_at)
select u.id, r.role, 'approved', now()
from auth.users u cross join lateral jsonb_array_elements_text(
  case when jsonb_typeof(u.raw_user_meta_data->'ministryRoles') = 'array'
    then u.raw_user_meta_data->'ministryRoles' else '[]'::jsonb end
) r(role)
where r.role in ('Pastor', 'Teacher', 'Evangelist', 'Apostle', 'Prophet')
on conflict do nothing;
update auth.users set raw_user_meta_data = coalesce(raw_user_meta_data, '{}'::jsonb) ||
  jsonb_build_object('requestedMinistryRoles', coalesce(raw_user_meta_data->'ministryRoles', '[]'::jsonb));

create function public.guard_ministry_roles() returns trigger
language plpgsql security definer set search_path = '' as $$
declare desired jsonb; approved jsonb;
begin
  if tg_op = 'INSERT' then
    desired := coalesce(new.raw_user_meta_data->'requestedMinistryRoles', new.raw_user_meta_data->'ministryRoles', '[]'::jsonb);
  elsif new.raw_user_meta_data->'requestedMinistryRoles' is distinct from old.raw_user_meta_data->'requestedMinistryRoles' then
    desired := coalesce(new.raw_user_meta_data->'requestedMinistryRoles', '[]'::jsonb);
  elsif new.raw_user_meta_data->'ministryRoles' is distinct from old.raw_user_meta_data->'ministryRoles' then
    -- Older clients must also submit requests instead of publishing roles.
    desired := coalesce(new.raw_user_meta_data->'ministryRoles', '[]'::jsonb);
  else
    desired := coalesce(old.raw_user_meta_data->'requestedMinistryRoles', '[]'::jsonb);
  end if;
  select coalesce(jsonb_agg(role order by role), '[]'::jsonb) into desired
  from (select distinct value as role from jsonb_array_elements_text(
    case when jsonb_typeof(desired) = 'array' then desired else '[]'::jsonb end
  ) where value in ('Pastor', 'Teacher', 'Evangelist', 'Apostle', 'Prophet')) roles;
  select coalesce(jsonb_agg(role order by role), '[]'::jsonb) into approved
  from public.ministry_role_requests where user_id = new.id and status = 'approved' and desired ? role;
  new.raw_user_meta_data := coalesce(new.raw_user_meta_data, '{}'::jsonb) ||
    jsonb_build_object('requestedMinistryRoles', desired, 'ministryRoles', approved);
  return new;
end;
$$;

create function public.queue_ministry_roles() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  delete from public.ministry_role_requests where user_id = new.id
    and not (new.raw_user_meta_data->'requestedMinistryRoles' ? role);
  insert into public.ministry_role_requests(user_id, role)
  select new.id, value from jsonb_array_elements_text(new.raw_user_meta_data->'requestedMinistryRoles')
  on conflict do nothing;
  return new;
end;
$$;
create trigger guard_ministry_roles before insert or update of raw_user_meta_data on auth.users
for each row execute function public.guard_ministry_roles();
create trigger queue_ministry_roles after insert or update of raw_user_meta_data on auth.users
for each row execute function public.queue_ministry_roles();

create function public.review_ministry_role(p_admin uuid, p_user uuid, p_role text, p_status text)
returns boolean language plpgsql security definer set search_path = '' as $$
begin
  if not exists(select 1 from auth.users where id = p_admin and raw_app_meta_data->>'role' in ('admin','superadmin')) then
    raise exception 'Administrator access required';
  end if;
  if p_status not in ('approved', 'denied') then raise exception 'Invalid decision'; end if;
  -- Lock the user first, matching the auth-update -> role-row lock order.
  perform 1 from auth.users where id = p_user for update;
  update public.ministry_role_requests set status = p_status, reviewed_at = now(), reviewed_by = p_admin
  where user_id = p_user and role = p_role;
  if not found then return false; end if;
  -- The guard publishes only approved, still-selected roles.
  update auth.users set raw_user_meta_data = raw_user_meta_data where id = p_user;
  return true;
end;
$$;
revoke all on function public.guard_ministry_roles() from public, anon, authenticated;
revoke all on function public.queue_ministry_roles() from public, anon, authenticated;
revoke all on function public.review_ministry_role(uuid, uuid, text, text) from public, anon, authenticated;
grant execute on function public.review_ministry_role(uuid, uuid, text, text) to service_role;
