# Photo Stories

Stories appear above the home-feed composer, separately from permanent posts. Eligible members can publish one photo at a time with a 300-character optional caption. Stories are visible across FMCI, subject to either-direction blocks and individual reports. No videos, archive, replies, highlights, music, or permanent feed copies are created.

## Limits and storage

- Client converts JPEG/PNG/WebP still photos to JPEG, strips metadata, preserves proportions, and limits the longest side to 1920 pixels and upload bytes to 500,000. Input photos are limited to 20 MB; unsupported formats and animations are rejected.
- Backend bounds the upload stream, parses dimensions before allocation, validates JPEG decoding with memory/pixel limits, removes auxiliary metadata, and enforces the byte limit. Original photos never leave the client.
- `stories` is a private bucket. Restrictive storage RLS prevents direct authenticated/anonymous client access, even alongside permissive legacy policies. API-issued media URLs live for at most 60 seconds, bounded by Story expiration. Already downloaded photos cannot be revoked from a viewer's device.
- Reservations and publications are relational and atomic. Maximum 10 publications per rolling 24 hours, counting deleted Stories; short-lived pending reservations count toward the cap. Retry the same UUID to avoid duplicate publication.
- Visible lifetime is exactly 24 hours using server time. No archive exists. Cleanup runs every five minutes, using the Storage API rather than deleting storage metadata directly. Failures retry; pending abandoned uploads and orphan objects are swept. Photos can remain stored briefly during a provider outage without becoming visible again.

## API

All routes are under `/functions/v1/dynamic-endpoint` and require an eligible member session:

- `GET /stories`: active visible Story metadata, current-user seen/reaction state, and current author name/avatar. Does not return permanent media URLs.
- `POST /stories/uploads` with `{id: UUID}`: reserve an upload idempotently.
- `PUT /stories/:id/photo`: binary JPEG body with URI-encoded `X-Story-Caption` header; validates, stores, and publishes.
- `GET /stories/:id/media`: short-lived private media URL after access checks.
- `POST /stories/:id/view`: idempotent unique viewer record (owners excluded).
- `PUT /stories/:id/reaction` with `{reaction: 'heart' | 'amen' | 'pray' | null}`: replace/remove the caller's reaction.
- `GET /stories/:id/viewers`: owner-only viewer list and reactions.
- `DELETE /stories/:id`: owner or trusted admin/moderator removal; removes bytes and queues retries on storage failure while retaining the quota ledger.

Existing `/reports` accepts `targetType: 'story'`. The author is resolved server-side. Reporting hides the Story for the reporter. Moderators see active previews and an explicit remove action; expired/deleted photos are not secretly retained as report evidence. Account deletion removes owned Story uploads and cascades Story/view/reaction records.

## Operations

Migrations `202610170006` and `202610170007` provision the schema, private bucket, service-only RPCs, restrictive RLS, Cron/pg_net, and `fmci-photo-story-cleanup` job (`*/5 * * * *`). The separate `story-cleanup` function has JWT gateway verification disabled because it authenticates the high-entropy `x-story-cleanup-secret` itself. No browser receives that secret.

Provision matching `STORY_CLEANUP_SECRET` in Edge secrets and `fmci_story_cleanup_secret` in Vault; Vault's `fmci_story_cleanup_url` is the project's `/functions/v1/story-cleanup` URL. Never commit values. `public.run_story_cleanup()` invokes the same path as Cron. Check `cron.job_run_details`, `net._http_response`, worker logs, bucket bytes, and oldest cleanup candidates when investigating failures. Deploy a schema-compatible backend and working cleanup before exposing the UI.

## Verification performed

- All 15 Node tests passed, covering cleanup failure/retry safety, bounded JPEG headers, malformed/spoofed/oversized data, metadata stripping, API session recovery and existing invitation/content filtering.
- Rolled-back database checks cover private-table/RPC privileges, ownership, lifetime, retry idempotency, and quota accounting after deletion.
- Disposable production identities verified publication, duplicate retries, invalid media rejection, private bucket access, unique viewers, reaction replacement, owner-only viewers, unauthorized deletion, author-side blocking, quota enforcement, server expiration, actual object deletion, cleanup authentication, and account/photo cleanup.
- Cron/Vault/network invocation returned HTTP 200; the five-minute job is active.
- Browser visual check covers feed placement, creation dialog, photo selection/compressed preview, playback/pause, saved reaction feedback, and focus return. The separate disposable playback identity and its photos were then removed; no Story was published from the real review identity.

Physical-iPhone acceptance testing remains necessary for library format conversion, orientation, touch/hold playback, background/resume, accessibility, and weak/offline connections. The App Review physical-device demonstration and final privacy questionnaire remain separate submission requirements.
