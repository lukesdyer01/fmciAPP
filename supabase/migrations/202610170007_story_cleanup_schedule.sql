create extension if not exists pg_cron with schema pg_catalog;
create extension if not exists pg_net with schema extensions;
-- Secrets are provisioned in Vault before this migration; no credential is
-- embedded in git, scheduled SQL, logs, or a browser bundle.
create function public.run_story_cleanup() returns bigint
language plpgsql security definer set search_path='' as $$
declare endpoint text; token text; result bigint;
begin
 select decrypted_secret into endpoint from vault.decrypted_secrets where name='fmci_story_cleanup_url';
 select decrypted_secret into token from vault.decrypted_secrets where name='fmci_story_cleanup_secret';
 if endpoint is null or token is null then raise exception 'Story cleanup secrets are not configured'; end if;
 select net.http_post(url:=endpoint,headers:=jsonb_build_object('Content-Type','application/json','x-story-cleanup-secret',token),body:='{}'::jsonb,timeout_milliseconds:=60000) into result;
 return result;
end $$;
revoke all on function public.run_story_cleanup() from public,anon,authenticated;
select cron.schedule('fmci-photo-story-cleanup','*/5 * * * *','select public.run_story_cleanup()');
