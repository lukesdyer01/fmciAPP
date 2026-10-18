# FMCI Network — App Store submission readiness

Audited October 17, 2026 against the source code and the signed 1.0.2 (3) archive. This is a readiness assessment, not an approval guarantee. The initial audit preceded implementation. Subsequent fixes, deployment, build upload, and live App Store Connect findings are recorded below.

## Confirmed submission decisions

User confirmed October 17, 2026:

- Authorization to publish FMCI Network and represent FMCI: confirmed. Match the legal publisher/copyright name to the authorized entity and Apple developer account; the exact entity name was not supplied in this confirmation.
- Monitored support contact: Luke Dyer, luke@dyerplex.com.
- Intended minimum age: 18 and older.
- Initial App Store availability: United States only.
- Commercial model: entirely free; no paid memberships, paid content, subscriptions, or in-app purchases.

These decisions were subsequently applied to signup and policy pages; the live store settings verified below reflect the current state. The App Store age questionnaire must still accurately reflect the actual content and features.

## Current position

- Signed iPhone archive 1.0.2 (3) exists and Xcode reported Uploaded to Apple.
- Bundle identifier: network.fmci.app. Project targets iPhone, not an iPad-native release.
- Invite-only registration, required signup photo, fivefold role approval, reporting, blocking, and an account-deletion entry point are implemented.
- These features still need the fixes and device verification below. Successful upload does not establish App Review readiness.

## Fix before submission

| Priority | Finding and evidence | Required outcome |
| --- | --- | --- |
| High | The archived app has Capacitor/Cordova privacy manifests with empty required-reason API lists. There is no app privacy manifest declaring UserDefaults, although Capacitor Preferences uses it for native authentication storage. | Add a PrivacyInfo.xcprivacy to the app target with the accurate required-reason declaration. Capacitor documents NSPrivacyAccessedAPICategoryUserDefaults and CA92.1. Check the generated privacy report and the next archive. |
| High | The account-deletion endpoint purges content and deletes the Auth user but never removes uploaded Storage objects. Required profile photos make this especially important. | Delete owned files through the Storage API, including replaced avatars and other uploads, before deleting Auth. Test with an account that has uploaded a photo, posted, commented, and sent messages. Confirm retries do not strand a partially deleted account. |
| High | Onboarding blocks access to Edit Profile, which is where Delete Account lives. The backend permits self-deletion during onboarding, but the onboarding screen has no deletion action. | Provide a discoverable cancellation/account-deletion action before onboarding finishes, including after photo permission refusal or abandoned upload. |
| High | Reporting and blocking exist, but no pre-publication objectionable-content filter was found in posting. Reporting is incomplete across other content surfaces. | Implement a server-enforced filtering or pre-publication review method; cover text and uploaded media. Add reporting across relevant content, including articles, event/resource discussions, and direct messages. Verify blocking and moderator actions across all affected screens. Document who monitors reports and how timely responses are handled. |
| High | Public checks returned HTTP 404 for /privacy, /support, and /terms. /privacy has a JavaScript SPA fallback, but the URL itself initially returns 404. Support and terms are not implemented destinations. | Publish reliable, signed-out-accessible pages with successful HTTP responses. Support must provide actual contact details. Keep privacy accessible in the app. Publish community rules and explain prohibited content and enforcement. A separate custom terms document/checkbox is a product/legal decision, not a universal Apple checkbox requirement. |
| High | PrivacyPolicyView contains draft instructions and hypothetical features; for example, “this section must be replaced” in the children section. | Replace the template with a policy describing actual required photos, religious affiliations/roles, messaging, analytics, subprocessors, retention, public visibility, and deletion. Update its date. Confirm the operating entity and support/privacy contacts. |
| High | Forgot Password sends a recovery email, but no password-recovery screen, PASSWORD_RECOVERY handling, or password update flow was found. | Complete and test the reset-link → choose-new-password → sign-in flow, on the website and from iPhone email. A recovery session must not simply enter the feed. |
| High | callerRole() falls back to user-editable user_metadata.role, and several administrative routes trust that helper. Some read endpoints return public records without a signed-in caller despite the private-network positioning. | Use trusted app_metadata/database permissions consistently for authorization. Test denial of administrative actions after forged profile metadata. Decide and enforce precisely which posts/events/resources are public; align the policy and store description with the result. |
| Medium | Analytics records a user-linked session/device summary and sends the visitor IP to ip-api.com over HTTP for country lookup. | Remove unnecessary geolocation or use an appropriate secured service. Disclose actual analytics and third-party processing, and determine the consent/withdrawal experience. Do not mark the app Data Not Collected. |

Apple's UGC requirements cover filtering, reporting with timely responses, blocking, and published contact details. See [Guideline 1.2](https://developer.apple.com/app-store/review/guidelines/#user-generated-content). These are distinct from being invite only.

Apple requires in-app account deletion for apps with account creation, including associated user content: [account-deletion guidance](https://developer.apple.com/support/offering-account-deletion-in-your-app/). Supabase specifically warns that Auth deletion can fail while a user owns Storage objects: [Supabase user management](https://supabase.com/docs/guides/auth/managing-user-data).

For the manifest, see [Capacitor Preferences](https://capacitorjs.com/docs/apis/preferences) and [Apple privacy manifest documentation](https://developer.apple.com/documentation/bundleresources/privacy-manifest-files).

## App Store Connect checklist — verify existing values

- [ ] Active Apple Developer membership and no outstanding account agreements. Check Business for any requested tax/banking information applicable to the chosen commercial model; a free app is not automatically an in-app-purchase app.
- [ ] Correct seller identity and permission to publish FMCI's name, logo, and content. Retain authorization from FMCI if publishing through a separate individual developer account.
- [ ] Correct app record and platform version. After the fixes, upload a new, uniquely numbered build and select it for the submission. 1.0.2 (3) is the currently uploaded baseline, not a promise that it contains these future fixes.
- [ ] App name, appropriate primary/secondary categories, primary language, distribution territories, and free/paid availability. The current Xcode category is Lifestyle; Social Networking is another candidate to assess against the primary experience.
- [ ] Accurate description, keywords, copyright owner/year, and What’s New if this is an update. State clearly that signup requires an invitation.
- [ ] Support URL and Privacy Policy URL. A marketing URL is optional.
- [ ] App icon is final, readable, and legitimately licensed. A 1024-pixel icon asset is present; verify its actual appearance and final store rendering.
- [ ] Screenshots from the actual iOS build for every required iPhone slot. The current Apple table requires a Dynamic Island medium-display set; confirm exact accepted dimensions in App Store Connect. Provide an iPad set only if adding native iPad support. App previews are optional.
- [ ] Content Rights declaration covering material displayed or linked in the app, including ministry logos, articles, photographs, videos, and resources.
- [ ] Current age-rating questionnaire answered for social feed, user-generated content, messaging, moderation, and any external web access. The confirmed minimum age is 18+. Update the policy’s old under-16 language and implement signup eligibility; do not assume the questionnaire enforces it.
- [ ] App Privacy answers based on actual app and partner behavior; see the draft mapping below.
- [ ] Encryption/export-compliance questions. The project declares ITSAppUsesNonExemptEncryption=false; validate that ordinary platform HTTPS/authentication accurately fits the exemption before relying on it.
- [ ] EU DSA trader/non-trader declaration and applicable verification if distributing in the EU. Do not guess this classification from the app being free or ministry-related.
- [ ] App Review contact name, reachable phone, and email.
- [ ] Working review login and clear notes covering invitation-only access, required signup photo, pending ministry roles, moderation, and deletion.
- [ ] Release choice selected deliberately. Manual release is recommended here to allow a final check after approval.

References: [platform-version fields](https://developer.apple.com/help/app-store-connect/reference/app-information/platform-version-information/), [screenshots](https://developer.apple.com/help/app-store-connect/reference/app-information/screenshot-specifications), [age rating](https://developer.apple.com/help/app-store-connect/manage-app-information/set-an-app-age-rating/), [DSA declarations](https://developer.apple.com/help/app-store-connect/manage-compliance-information/manage-european-union-digital-services-act-trader-requirements/).

## Draft privacy-label mapping — confirm before entering

This is a proposed inventory from the code, not completed App Store Connect declarations. Most member content is linked to an account. Required photos, persistent profiles, posts, and routine analytics should not be treated as infrequent optional support submissions.

| Data category to assess | Evidence in FMCI | Likely purpose to assess |
| --- | --- | --- |
| Name, email, optional phone | Auth and editable member profile | Account/app functionality |
| User ID and notification/device identifiers | Auth IDs, push tokens | App functionality |
| Photos/videos and other user content | Required avatar, posts, comments, articles, resources | App functionality |
| Messages | Direct conversations stored server-side | App functionality |
| Sensitive information | Religious ministry roles and affiliations | App functionality; review whether other declared categories apply |
| Coarse location | Profile location and IP-derived country | Functionality and/or analytics, according to actual use |
| Product interaction | Session, screen views, heartbeats, device/browser summaries | Analytics |
| Support/moderation submissions | Content reports and support notes | Functionality; evaluate applicable disclosure exceptions individually |
| Third-party embedded content | YouTube, map tiles/geocoding, externally hosted media | Audit the services' actual collection and linkage before final answers |

Do not automatically declare tracking solely because first-party analytics exists. Tracking has a specific Apple definition; determine actual cross-company use and partner behavior. Likewise, do not select No Tracking without auditing embedded services. [Apple's data-type definitions and disclosure rules](https://developer.apple.com/app-store/app-privacy-details/).

## Reviewer access and notes

Create a dedicated, non-production-personal review identity with an uploaded profile image, completed onboarding, and access to realistic sample content. It must remain usable throughout review without depending on a seven-day invitation. Provide a restricted reviewer/admin account if Apple needs to exercise the administration features; do not hand out the real superadmin account.

Include a way to test registration and deletion, using reviewer-specific invitations as needed, without asking Apple to contact a person to unlock the app. Ensure deleting the disposable test identity does not permanently remove the only usable review login. Do not put passwords or invitation secrets in this repository.

Draft notes to finalize after fixes and device testing:

> FMCI Network is an invitation-only community for members, churches, ministries, and leaders. Use the supplied review account to access the member experience. New registrations require a profile image; selected fivefold ministry roles remain pending until an administrator approves them. The additional roles are self-selected and grant no administrative access. The member navigation includes feed, ministries, groups, articles, prayer, events, resources, messaging, and invitations. Content reporting, blocking, and account deletion are available through the documented paths below.
>
> Review login: enter securely in App Store Connect.
> Registration test instructions: provide separately.
> Report/block path: verify and describe the final interface.
> Account deletion path: Profile → Edit Profile → Delete Account; include the new onboarding cancellation path after implementing it.
> Administrator review path: Admin → Verification → Fivefold role approvals.
> Purchases/subscriptions: FMCI Network is entirely free. There are no paid memberships, paid content, subscriptions, or in-app purchases.
> Intended audience and availability: adults 18+, United States.
> Support contact: Luke Dyer, luke@dyerplex.com.

Apple asks for functioning review credentials and explanations of non-obvious features: [complete-review guidance](https://developer.apple.com/help/app-review/before-submitting-for-review/complete-review).

## Device acceptance tests before the final upload

Use the installed TestFlight build on a real iPhone, including a smaller supported display. A successful command-line build is not equivalent to these checks.

- [ ] Fresh install, signed-out launch, invitation signup, invalid/expired/reused invitations.
- [ ] Required photo from library and camera if offered; denied permission, unsupported format, large image, failed upload, resume after force-close, and account cancellation before completion.
- [ ] Fivefold request stays private; admin approves/denies; member sees the decision and directory reflects only approved roles.
- [ ] Sign out/in, persistent native session, expired session handling, and complete password recovery from an email link.
- [ ] Feed posting, comments, groups, article/resource discussions, RSVP, messages, reporting and blocking. Test the actual moderation/filter response.
- [ ] Native push allowed and denied, receiving a notification, and opening its intended destination on the TestFlight/production APNs environment.
- [ ] Account deletion removes owned uploads and associated content, signs out locally, and prevents later sign-in. Use disposable identities only.
- [ ] Keyboard, safe areas, text wrapping, scrolling, back navigation, external links, slow/offline network, and interrupted requests.
- [ ] VoiceOver labels, readable contrast, larger text, and touch targets. Claim accessibility support in the store only after testing it.
- [ ] No placeholders, blank core sections, developer errors, install-PWA prompts on native, or inaccessible policy/support links.

The native camera/library/push features and substantial community workflows should be demonstrated in review notes. Capacitor alone is not a rejection reason, but the app must meet Apple's minimum-functionality standard. Email/password alone does not trigger the third-party-login requirement to add an equivalent privacy-preserving login. Reassess payment rules if adding paid digital access. [Guidelines 4.2, 4.8, and 3.1](https://developer.apple.com/app-store/review/guidelines/).

## Remaining information and materials

1. Match the exact legal publisher/copyright name to the authorized entity and developer account. FMCI authorization is confirmed.
2. Apple review-contact phone number. Support name/email are confirmed as Luke Dyer, luke@dyerplex.com. Identify who monitors moderation reports; support monitoring alone does not establish moderation coverage.
3. Existing App Store Connect screenshots, description, privacy answers, build-processing notices, and any previous rejection messages.
4. Review identities/credentials entered through a secure channel, not committed files.

Age (18+), territory (United States), and free pricing are confirmed above and do not need to be requested again.

Recommended sequence: fix the high-priority findings → run disposable-account/device tests → finalize pages and privacy disclosures → capture screenshots and supply reviewer access → archive/upload a new build → select it in App Store Connect and submit with manual release.

## Implementation update — October 17, 2026

The source now includes adult declarations for new and existing accounts, Luke Dyer's support details, shared privacy/support/community-rule content and static public pages, a UserDefaults privacy manifest, password recovery, deletion actions during unfinished signup, owned-upload cleanup, private API access, trusted administrator authorization (including database RPCs), protected verification/status claims, first-line text filtering, general safety reporting, and direct-message blocking enforcement. Optional first-party analytics can be disabled; IP geolocation has been removed.

These changes do not automatically configure App Store Connect. Prepared listing values are in app-store-submission.json. Automated text filtering does not classify images or guarantee that every abusive phrase is detected: reports and ongoing human moderation remain necessary. Validate external-media provider privacy behavior, recovery-email delivery, and production push on device before claiming those checks complete.


## App Store Connect findings from the live account

The app record is 6809304019. The earlier iOS 1.0 submission was rejected under 2.1 (Information Needed), rather than an observed 4.2 rejection. Apple's September 7 message explicitly requests: (1) a recording on a physical device running the latest operating system, starting with launch and showing registration/login/deletion and UGC reporting/blocking; (2) purpose and audience; (3) setup/feature instructions and review credentials; (4) external service list; (5) regional behavior; and (6) relevant authorization/rights documentation. No physical iPhone was connected during preparation; available devices were simulators, which do not satisfy that recording request.

The live account also displays an updated Apple Developer Program License Agreement requiring Account Holder review and acceptance before submission. No agreement was accepted by the assistant. Draft a response to the existing review message and duplicate the requested information in Review Notes once the recording and credentials are ready. Do not claim the video has been provided before it exists.

Verified October 17: version 1.0.2 build 4 was signed and uploaded successfully (Xcode EXPORT SUCCEEDED). App Store processing and final build selection remain pending verification. USA-only availability is saved (1 available, 174 unavailable); current US price is $0.00. The age-rating questionnaire now records age assurance and an 18+ override, with https://fmci.network/terms/ as the age-suitability URL. The existing questionnaire content-frequency answers were retained and should be reviewed against actual moderated content before submission. Remaining listing fields and App Privacy declarations have not been finalized. A response draft is saved in apple-review-response-draft.md; it has not been sent to Apple.
