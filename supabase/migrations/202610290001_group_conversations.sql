-- Group conversations are separate from legacy direct-message storage.
create table public.network_group_conversations (
 id uuid primary key default gen_random_uuid(),
 name text not null check (length(trim(name)) between 1 and 80),
 owner_id uuid not null references auth.users(id),
 created_at timestamptz not null default now()
);
create table public.network_group_members (
 conversation_id uuid not null references public.network_group_conversations(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade,
 joined_at timestamptz not null default clock_timestamp(),
 history_after bigint not null default 0,
 last_read_id bigint not null default 0,
 muted boolean not null default false,
 archived boolean not null default false,
 hidden_after bigint,
 primary key(conversation_id,user_id)
);
create table public.network_group_messages (
 id bigint generated always as identity primary key,
 conversation_id uuid not null references public.network_group_conversations(id) on delete cascade,
 sender_id uuid not null references auth.users(id) on delete cascade,
 text text not null check(length(trim(text)) between 1 and 4000),
 created_at timestamptz not null default clock_timestamp()
);
create index network_group_messages_page on public.network_group_messages(conversation_id,id desc);
create index network_group_member_inbox on public.network_group_members(user_id,conversation_id);
alter table public.network_group_conversations enable row level security;
alter table public.network_group_members enable row level security;
alter table public.network_group_messages enable row level security;
revoke all on public.network_group_conversations,public.network_group_members,public.network_group_messages from anon,authenticated;
grant all on public.network_group_conversations,public.network_group_members,public.network_group_messages to service_role;
grant usage,select on sequence public.network_group_messages_id_seq to service_role;
alter table public.network_member_preferences add column group_messages boolean not null default true;
-- Remains disabled until the complete group-chat implementation is deployed.
insert into public.kv_store_5bb4c08d(key,value) values('group_messages_enabled','0'::jsonb) on conflict(key) do nothing;
