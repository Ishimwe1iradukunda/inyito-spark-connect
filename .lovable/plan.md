# Broadcast quick actions and backend reliability

## What changes
- Turn the home “Go live” card into a clear **Broadcast** action that opens stream mode directly.
- Add prominent **Broadcast** buttons to desktop navigation and the mobile menu/sidebar, using the same direct stream-mode link.
- Keep sign-in and destination setup requirements explicit; the buttons will not pretend a stream started before devices, destinations, and the relay confirm it.

## Backend improvements
- Require an owned broadcast session for status and stop requests instead of trusting a caller-supplied relay ID.
- Validate destination URLs, stream keys, titles, and action payloads more strictly.
- Clean up the relay input when every destination fails or session storage fails, avoiding orphaned relay resources.
- Return clearer errors and preserve real provider status updates for the Live Dashboard.

## Verification
- Add focused tests for broadcast status behavior and any extracted validation helpers.
- Check the home card and desktop/mobile Broadcast navigation in the browser.
- Exercise backend rejection paths without starting a real broadcast; Cloudflare delivery remains dependent on valid relay credentials.
