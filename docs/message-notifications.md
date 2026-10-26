# Message notification navigation

New direct-message pushes include a relative URL containing the sender ID and message ID. Native notification taps and web-push clicks open the conversation, scroll to the referenced message, and highlight it. Cold starts retain the destination until the signed-in app is ready. Conversation access remains enforced by the authenticated API. If the referenced message is no longer present, the conversation opens at its latest messages.

The backend is deployed. Frontend implementation commit: 90e28c9. Production GitHub Pages deployment 40262176568 succeeded. All 43 automated tests pass, including URL validation, native Capacitor URLs, and web notification clicks with an existing or closed window.

Version 1.0.2 build 9 archived and uploaded successfully to App Store Connect. Build 8 was uploaded before the final native URL fix and is superseded by build 9. Apple processing/TestFlight availability has not been verified. No physical iPhone was connected, so native end-to-end verification remains outstanding.

Once build 9 is available in TestFlight, install it and use two authorized test accounts to verify a received-message notification while the app is in the background and fully closed. Tapping should open the sender's conversation at the highlighted message. Also verify tapping while a different conversation is open, tapping an older notification, and tapping while signed out followed by signing into the recipient account. Notifications delivered before this backend update still point to the home page.
