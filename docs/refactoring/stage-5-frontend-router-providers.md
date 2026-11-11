# Stage 5: Frontend router and providers

## Changes

- Added React Router, TanStack Query, a shared query client, and an auth context that restores the current session.
- Synced the selected CRM section to a hash route, guarded unavailable sections, and kept organization-specific store navigation in the URL.
- Added shared query keys and migrated report queries and report filters (`view`, date range, component) to URL-backed state and TanStack Query.
- Updated two existing E2E URL expectations with the user's approval; added a reload check for a directly addressable section.

## Verification

- Full `npm run verify`: passed; frontend unit tests 3/3, backend tests 82/82, Playwright 10/10.
- Frontend production build passed. Existing lint warnings and known database schema drift remain unchanged.
