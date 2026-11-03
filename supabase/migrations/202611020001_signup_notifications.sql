-- Signup alerts have their own inbox because they do not target a post.
create table public.network_signup_notifications (
 id uuid primary key default gen_random_uuid(),
 recipient_id uuid not null references auth.users(id) on delete cascade,
 actor_id uuid not null references auth.users(id) on delete cascade,
 created_at timestamptz not null default now(),
 read_at timestamptz,
 unique(recipient_id,actor_id)
);
create index network_signup_notifications_inbox on public.network_signup_notifications(recipient_id,created_at desc);
alter table public.network_signup_notifications enable row level security;
revoke all on public.network_signup_notifications from public,anon,authenticated;
grant all on public.network_signup_notifications to service_role;

create function public.notify_superadmins_of_signup() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 insert into public.network_signup_notifications(recipient_id,actor_id)
 select id,new.id from auth.users
 where raw_app_meta_data->>'role'='superadmin' and id<>new.id
 on conflict(recipient_id,actor_id) do nothing;
 return new;
end;$$;
revoke all on function public.notify_superadmins_of_signup() from public,anon,authenticated;
create trigger network_signup_notification after insert on auth.users
 for each row execute function public.notify_superadmins_of_signup();
