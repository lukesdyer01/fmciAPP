# Feed comment threads

Implemented October 30, 2026. The UI is in the working tree; website publishing and a new native build are separate release steps.

- Comment counts open the discussion for reading; Comment opens the composer with focus.
- Root comments support oldest/newest sorting, 20 at a time. Replies start collapsed and expand in batches. Replies to replies stay at one visual indentation level and retain the original reply target.
- Amen, Praying, and Bless are available on posts and comments through a compact picker. The arrow is keyboard accessible; holding the main reaction opens the same choices.
- The composer includes emoji insertion, a cancelable reply target, and failed-send draft retention. Ctrl/Cmd+Enter sends; Enter adds a line.
- The mobile panel follows the visual viewport to keep its composer above the keyboard. Light/dark styles use existing theme tokens.

## Backend and verification

Migration `202610300002_comment_threads.sql` and `dynamic-endpoint` deployed to linked project `jbtlmdrmysrgvdpbveyu`. Existing embedded comments remain intact. New comment writes use a database row lock; reactions are normalized per caller and comment. Service-only RPCs enforce author/admin deletion and cascade parent deletion through replies.

`npm run typecheck`, all 64 Node tests, and `npm run build` pass. `tests/sql/comment-threads.sql` passed against the applied migration with fixtures rolled back. It covers reply flattening, parent validation, deletion authorization, reaction restoration, deletion cleanup, and RPC permissions. Browser fixture checks covered reply expansion, reply targeting, emoji insertion, failed-send draft retention, and light/dark rendering. A physical iPhone keyboard test has not been performed.
