# Stage 4: Stores

## Changes

- Moved store and access-secret HTTP routes under `backend/src/modules/stores/` and updated their imports and app mount.
- Preserved current membership checks, moderation behavior, encrypted secret handling, and response presentation.
- Added characterization coverage for pending store creation and client visibility scoping.

## Verification

- Store characterization tests: 2 passed before and after the move.
- Full `npm run verify`: passed; 3 frontend tests, 78 backend tests, 10 Playwright smoke tests.
- Existing ESLint warnings and documented database schema drift remain unchanged.
