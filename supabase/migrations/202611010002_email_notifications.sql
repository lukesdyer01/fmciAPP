create table public.network_email_preferences (
 user_id uuid primary key references auth.users(id) on delete cascade,
 enabled boolean not null default true,
 messages boolean not null default true,
 mentions boolean not null default true,
 wall boolean not null default true,
 replies boolean not null default true,
 unsubscribe_token uuid not null unique default gen_random_uuid()
);
create table public.network_email_jobs (
 id uuid primary key default gen_random_uuid(),
 recipient_id uuid not null references auth.users(id) on delete cascade,
 actor_id uuid not null references auth.users(id) on delete cascade,
 kind text not null check(kind in ('mention','wall_post','wall_comment','comment','reply','direct','group')),
 source_key text not null,
 notification_id uuid references public.network_reaction_notifications(id) on delete cascade,
 conversation_id text,
 message_id text,
 created_at timestamptz not null default now(),
 due_at timestamptz not null default now()+interval '5 minutes',
 attempts integer not null default 0,
 lease_until timestamptz,
 state text not null default 'pending' check(state in ('pending','sent','skipped','failed')),
 provider_id text,
 delivery_state text,
 unique(recipient_id,source_key)
);
create index network_email_due on public.network_email_jobs(due_at) where state='pending';
alter table public.network_email_preferences enable row level security;
alter table public.network_email_jobs enable row level security;
revoke all on public.network_email_preferences,public.network_email_jobs from anon,authenticated;
grant all on public.network_email_preferences,public.network_email_jobs to service_role;
-- Master switch stays off until credentials, DNS, and a test delivery are ready.
insert into public.kv_store_5bb4c08d(key,value) values('notification_email_enabled','false') on conflict do nothing;

create function public.enqueue_network_activity_email() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if new.kind='reaction' then return new;end if;
 insert into public.network_email_jobs(recipient_id,actor_id,kind,source_key,notification_id)
 values(new.recipient_id,new.actor_id,new.kind,'activity:'||new.id,new.id) on conflict do nothing;
 return new;
end;$$;
create trigger network_activity_email after insert on public.network_reaction_notifications for each row execute function public.enqueue_network_activity_email();

create function public.enqueue_network_message_email() returns trigger language plpgsql security definer set search_path='' as $$
declare conv jsonb; prior jsonb; msg jsonb; uid text; recipient uuid;
begin
 if tg_table_name='network_group_messages' then
  insert into public.network_email_jobs(recipient_id,actor_id,kind,source_key,conversation_id,message_id)
  select user_id,new.sender_id,'group','group:'||new.id,new.conversation_id::text,new.id::text
  from public.network_group_members where conversation_id=new.conversation_id and user_id<>new.sender_id and not muted on conflict do nothing;
 else
  for conv in select value from jsonb_array_elements(new.value) loop
   select value into prior from jsonb_array_elements(case when tg_op='UPDATE' then old.value else '[]'::jsonb end) where value->>'id'=conv->>'id';
   if prior=conv then continue;end if;
   for msg in select value from jsonb_array_elements(coalesce(conv->'messages','[]')) loop
    if exists(select from jsonb_array_elements(coalesce(prior->'messages','[]')) m where m->>'id'=msg->>'id') then continue;end if;
    for uid in select jsonb_array_elements_text(conv->'participantIds') loop
     select id into recipient from auth.users where id::text=uid and id::text<>msg->>'senderId';
     if recipient is not null and exists(select from auth.users where id::text=msg->>'senderId') then
      insert into public.network_email_jobs(recipient_id,actor_id,kind,source_key,conversation_id,message_id)
      values(recipient,(msg->>'senderId')::uuid,'direct','direct:'||(conv->>'id')||':'||(msg->>'id'),conv->>'id',msg->>'id') on conflict do nothing;
     end if;
    end loop;
   end loop;
  end loop;
 end if;
 return new;
end;$$;
create trigger network_direct_email after insert or update on public.kv_store_5bb4c08d for each row when(new.key='conversations') execute function public.enqueue_network_message_email();
create trigger network_group_email after insert on public.network_group_messages for each row execute function public.enqueue_network_message_email();

-- Atomic leases prevent concurrent scheduler invocations claiming the same jobs.
create function public.claim_network_email_jobs() returns setof public.network_email_jobs language sql security definer set search_path='' as $$
 with expired as (update public.network_email_jobs set state='failed',lease_until=null where state='pending' and attempts>=8 and coalesce(lease_until,'-infinity')<now())
 update public.network_email_jobs set lease_until=now()+interval '5 minutes',attempts=attempts+1
 where id in(select candidate.id from public.network_email_jobs candidate where candidate.state='pending' and candidate.due_at<=now() and coalesce(candidate.lease_until,'-infinity')<now() and candidate.attempts<8 and not exists(select from public.network_email_jobs leased where leased.recipient_id=candidate.recipient_id and leased.state='pending' and leased.lease_until>now()) and candidate.id=(select first_job.id from public.network_email_jobs first_job where first_job.recipient_id=candidate.recipient_id and first_job.state='pending' and first_job.attempts<8 order by first_job.due_at,first_job.id limit 1) order by candidate.due_at for update skip locked limit 25)
 returning *;
$$;
revoke all on function public.enqueue_network_activity_email(),public.enqueue_network_message_email(),public.claim_network_email_jobs() from public,anon,authenticated;
grant execute on function public.claim_network_email_jobs() to service_role;

create function public.run_network_email_notifications() returns bigint language plpgsql security definer set search_path='' as $$
declare endpoint text; token text; result bigint;
begin
 if not exists(select from public.kv_store_5bb4c08d where key='notification_email_enabled' and value='true'::jsonb) then return null;end if;
 select decrypted_secret into endpoint from vault.decrypted_secrets where name='fmci_email_worker_url';
 select decrypted_secret into token from vault.decrypted_secrets where name='fmci_email_worker_secret';
 if endpoint is null or token is null then return null;end if;
 select net.http_post(url:=endpoint,headers:=jsonb_build_object('Content-Type','application/json','x-email-worker-secret',token),body:='{}'::jsonb,timeout_milliseconds:=60000) into result;
 return result;
end;$$;
revoke all on function public.run_network_email_notifications() from public,anon,authenticated;
select cron.schedule('fmci-notification-emails','* * * * *','select public.run_network_email_notifications()');
