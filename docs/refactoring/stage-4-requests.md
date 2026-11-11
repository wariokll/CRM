# Stage 4: Requests

## Changes

- Moved the request HTTP router into `backend/src/modules/requests/` alongside the existing policy, contracts, include, and reports service.
- Updated imports and app registration without changing API behavior.
- Reused Stage 1 API characterization for request endpoint role access and stats behavior.

## Verification

- Full `npm run verify` after the move: passed; 3 frontend tests, 82 backend tests, and 10 Playwright smoke tests.
- Existing lint warnings and the documented database schema drift remain.
