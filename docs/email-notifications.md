# Resend notification emails

Sender: `FMCI Network <notifications@fmci.network>`. The fmci.network domain is verified in Resend. A sending-only API key restricted to that domain is stored in Supabase Edge secrets, never in Git or the browser bundle. The approved setup email to luke@dyerplex.com was marked Delivered by Resend on November 1, 2026 (UTC), provider ID `01a1953e-22d9-7cb9-a5ad-c8367b14bcae`.

## Behavior

New tags, wall posts/comments, post comments, replies, and direct/group messages enqueue durable jobs in the write transaction. Existing historical activity is not backfilled. Email reminders wait five minutes; activity already read is skipped. Group mutes/history boundaries, blocks in either direction, removed targets, reported content, private ministry membership, account eligibility, and per-category email preferences are checked before delivery. Consecutive message jobs for one conversation collapse to the newest queued event. At most one job per recipient is leased at a time; recently emailed members wait at least 15 minutes before another reminder.

Emails contain generic activity descriptions and app links, without names, private message text, or post excerpts. Post activity links open the notification and its exact comment when available; message links reuse existing conversation routing. Settings has email enable/category controls, separate from device push controls. Defaults are enabled; every email has an unsubscribe link and RFC 8058 one-click headers. Link scanners cannot unsubscribe with GET: it redirects to a signed-out static confirmation page, and changes require POST. Unsubscribe only disables email, preserving category choices and in-app/push behavior.

`network_email_jobs` and `network_email_preferences` are private under RLS. Deleting a user cascades both. Deleted activity notifications cascade queued jobs. The worker has no public arbitrary-recipient send route. The setup test route requires the scheduler secret and sends only to the configured operator.

## Operations

- Migration: `202611010002_email_notifications.sql`.
- Worker: `email-notifications`, deployed with `--no-verify-jwt`. Requests require `x-email-worker-secret`; only token-based unsubscribe and Svix-signed Resend callbacks are public exceptions.
- Edge secrets: `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, `RESEND_WEBHOOK_SECRET`, `EMAIL_WORKER_SECRET`, `EMAIL_TEST_RECIPIENT`.
- Vault names: `fmci_email_worker_url`, `fmci_email_worker_secret`. The worker secret must match the Edge secret.
- Global switch: KV `notification_email_enabled`, JSON boolean. Cron `fmci-notification-emails` runs every minute; `public.run_network_email_notifications()` invokes the same authenticated worker path.
- Webhook: `https://jbtlmdrmysrgvdpbveyu.supabase.co/functions/v1/email-notifications?webhook=1`, configured for sent, delivered, delivery delayed, failed, bounced, complained, and suppressed events. It verifies the raw body signature. Bounce/complaint/suppression disables email for the affected account only when the event address still matches its email.
- Job leases last five minutes. Each job uses a stable Resend idempotency key. Retries back off, stop after eight attempts or 23 hours, and never extend past the provider's 24-hour idempotency window. Exhausted leases become failed on the next claim. `provider_id` and `delivery_state` track accepted and subsequent delivery events; sent means accepted by Resend, not guaranteed inbox delivery.
- Inspect private job counts/state and Cron/pg_net responses for operational checks. Do not print recipient lists or credentials. Stop delivery by setting the global switch false; queued jobs remain available until their expiry checks.

## Validation

73 Node tests, TypeScript, and production build pass. Rollback-only SQL tests passed before migration and again against the installed schema. They cover transactional enqueueing, duplicate avoidance, reaction exclusion, direct/group jobs, leases, and privileges. Unit checks cover visibility, blocks, read state, group eligibility, preferences scoped to the caller, retry cutoff, and non-mutating unsubscribe GET. The setup email was delivered; physical-iPhone email-link behavior has not been tested.
