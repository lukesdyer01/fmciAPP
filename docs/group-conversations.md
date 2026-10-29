# Group conversations

Messages → Group chats → New group. Name the group and select 2–24 other members. Group entries also appear in the main inbox and Archived list. Participant controls live inside a group under Participants.

Superadmins can disable or restore group messaging in Admin → Settings → Group messaging. `groupMessagesEnabled` is numeric 0/1, defaults to off, and is enforced in the API middleware and transactional database function. Disabling retains messages/membership/settings, hides group inbox entries and creation, unmounts open group views, and suppresses group pushes. Direct messaging remains independent.

New tables are private under RLS, with access only through the eligible-member API and service-role RPC. Group operations lock the conversation row. Maximum 25 participants, 80-character names, 4,000-character text messages. History pagination loads 50 messages at a time. Joining records a message-ID boundary; leaving/removal ends access and rejoining starts at a new boundary. Blocking filters both directions, including older cached messages after the next refresh. Per-chat mute and the group-message push preference are independent of unread counts.

Only the creator can rename, add/remove participants, or transfer ownership. Transfer before leaving if others remain. A sole creator can leave and delete the empty group. Account deletion transfers ownership to the oldest remaining participant and cascades authored messages and membership. Group report submissions verify membership and message visibility and capture the reported text for the existing moderator queue.

Migration order: 202610290001, then 202610290002. Deploy the backend, then web/native clients, and set `group_messages_enabled` to JSON number 1 once ready. Existing direct-message endpoints and storage remain compatible. Group endpoints are GET/POST `/group-conversations`, GET `/:id/messages?before=ID`, and POST `/:id/actions` with a validated action. Only the backend supplies the caller ID to `group_chat`.

Verification: run the Node test suite and `supabase/tests/group-conversations.sql` against an already-migrated database. The SQL test requires an existing superadmin and rolls back every fixture. It covers ownership checks, concurrent-safe append storage, join history, removal, blocking in both directions, mute/archive, runtime disable and account cleanup. Native push URLs support `/?groupConversation=UUID&message=ID`; cold-start parsing uses the same origin checks as direct messages. Physical-device notification verification remains necessary.
