# Stage 4: Telegram

## Changes

- Moved Telegram integration, chat, message, and chat-link routes into `backend/src/modules/telegram/` with route, controller, service, schema, and mapper files.
- Kept authentication, `VIEW_TELEGRAM`, `SEND_TELEGRAM`, request validation, response shapes, and existing error text in place.
- Added route characterization for replacing chat links, missing link targets, active integration message behavior, and unknown chats.
- Preserved the current `501` response for sending messages while the integration is active; sending is still disabled by the existing product behavior.

## Verification

- Telegram route tests: 4 passed.
- Full `npm run verify`: passed; 3 frontend tests, 74 backend tests, and 10 Playwright smoke tests.
- Existing 10 ESLint warnings remain. The known `organization_contacts.full_name` and `phone` schema drift remains unchanged per task constraints.
