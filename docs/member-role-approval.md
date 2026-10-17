# Fivefold approval and required signup photos

New fivefold selections (Pastor, Teacher, Evangelist, Apostle, Prophet) are requests, including changes made after signup. Only approved roles are published in auth user metadata ministryRoles and shown on profiles and in the directory. requestedMinistryRoles stores the member's selections. The protected ministry_role_requests table owns approval state, reviewer, and review timestamps.

Admins review individual roles in Admin → Verification → Fivefold role approvals. Explicit role assignments in Admin → Members also approve those selections. Existing published roles are migrated as approved, with no retroactive verification claim about who reviewed them. Denied roles stay unpublished; a member can withdraw a denied selection, save, and request it again.

The shared additional-role options are Missionary, Intercessor, Pastoral, Teaching, Apostolic, Prophetic, and Artist. These are self-selected and do not grant fivefold status or permissions.

Every new account is forced into onboarding by a database trigger, even if the signup payload claims onboarding is complete. Completing onboarding requires an image object in the member's own avatars storage folder. Removing metadata flags cannot bypass this check. The upload is saved immediately, and signup cannot skip the photo step. Supported formats match the production avatar bucket: JPG, PNG, WebP, GIF, up to 5 MB. Completed accounts that predate the change are unaffected. The API refuses network access for incomplete accounts while allowing self-service account deletion.

Deploy migrations 202610170002 and 202610170003, dynamic-endpoint, and the frontend together. Run supabase/tests/ministry-role-approval.sql and supabase/tests/required-signup-photo.sql to verify the installed triggers; both roll back all test records. Standard client roles have no direct write access to approval records or approval RPCs.
