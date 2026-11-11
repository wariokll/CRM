# Stage 4: Organizations

## Changes

- Moved the organizations HTTP router under `backend/src/modules/organizations/` and mounted it from `app.ts` through the feature module.
- Preserved current permissions, membership visibility, approval and rejection cascades, validation, and response shapes.
- Added characterization coverage for pending client creation/list membership and client deletion denial.

## Verification

- Organization characterization tests: 2 passed before and after the move.
- Full `npm run verify`: passed; 3 frontend tests, 78 backend tests, 10 Playwright smoke tests.
- Existing ESLint warnings and documented database schema drift remain unchanged.
