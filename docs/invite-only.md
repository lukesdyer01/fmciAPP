# Invite-only rollout

Apply supabase/migrations/202610170001_invite_only.sql to the hosted database, deploy the dynamic-endpoint Edge Function, and deploy the frontend together. The SQL trigger enforces invitations directly on auth.users; hiding signup alone provides no protection.

Keep email signup enabled so invited members can submit their code through signUp. Enable Confirm Email in Supabase Authentication settings so possession of an invitation does not bypass email ownership verification. Configure production SMTP and redirect URLs. Disable anonymous sign-ins if enabled.

Admins with an app_metadata role of admin or superadmin can create invitations in Admin → Settings. Roles in editable user_metadata do not authorize this endpoint. Each code is bound to a normalized email, expires in seven days, and is stored only as a SHA-256 hash. Creating a replacement invalidates the old code. Share the displayed message privately; the app does not send invitation emails.

Existing accounts are unaffected. Existing spam accounts must be reviewed separately. Admin-created accounts in Members also receive an internal single-use authorization; they do not bypass the database trigger. These accounts are explicitly confirmed by the trusted administrator; use invitation codes when members should verify their own email.

Verify in staging before rollout:
- Direct Supabase signup without a code fails, even when user_metadata claims an admin role.
- Wrong email, wrong code, and expired code fail.
- Correct code creates an account; a second attempt cannot reuse it.
- Concurrent attempts with one code allow at most one committed account.
- Failed account creation rolls back invitation consumption.
- Existing member sign-in, reset password, and onboarding work.
- Members cannot create invitations; trusted admins can.
- Admin Members account creation preserves the administrator’s session.

Production uses Supabase project jbtlmdrmysrgvdpbveyu and GitHub Pages for fmci.network, deployed by .github/workflows/deploy.yml on pushes to main. Supabase authentication is provided by the local CLI login; no deployment secrets are committed. Run supabase/tests/invite-only.sql in a transaction to verify invitation behavior; all test records are rolled back.


## Member invitation links

Signed-in members can open Invite someone from the desktop sidebar or mobile More menu. POST /invitations accepts a recipient email and creates a seven-day, single-use invitation. Anonymous and suspended accounts cannot issue invitations. Members cannot replace another invitation for the same email; administrators can replace invitations from Settings. The member endpoint never accepts a role or creator id from the request.

Links use https://fmci.network/#invite=TOKEN&email=EMAIL so the secret is not sent in HTTP requests or referrers. The signup screen captures the fragment, clears it from the address bar, and fills in the email and code. The database still checks both values when creating the account. Admin invitation messages use the same link format. Creating a link does not send an email.
