# Stage 4: Boards

## Changes

- Moved the board HTTP router into `backend/src/modules/boards/` and mounted it with the existing board policy and service.
- Kept route behavior and role checks unchanged.
- Added HTTP characterization for personal board creation/listing and client denial.

## Verification

- Board route tests: 2 passed before and after the move.
- Full `npm run verify`: passed; 3 frontend tests, 82 backend tests, and 10 Playwright smoke tests.
