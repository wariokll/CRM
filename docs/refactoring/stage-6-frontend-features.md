# Stage 6: Frontend feature extraction

## Changes

- Split the application shell into navigation, sidebar, page header, page content, dashboard, and account-status modules. `src/App.tsx` and `src/types.ts` are below 250 lines; `types.ts` re-exports split domain types for compatibility.
- Extracted store details, store creation, and store groups; staff access dialog; template editor; request creation fields, request summary and request history; board canvas, toolbar, access and layout dialogs; and knowledge article list/view/edit/import dialogs.
- Added per-feature `queries.ts` modules for auth, boards, knowledge, layout, organizations, reports, requests, staff, stores, Telegram, and templates. UI components no longer call the shared API transport directly.
- Split report URL state and data queries from report views and statistics. Reports remain URL-addressable by view, dates, and component.
- Added a report URL-state test. Updated two existing E2E URL expectations with the user's approval.

## Verification

- Full `npm run verify` passes: frontend unit tests 4/4, backend integration tests 82/82, frontend and backend production builds, production SPA fallback checks, and Playwright 11/11. ESLint and Prettier pass without warnings.

## Remaining size deviations

- `src/features/boards/BoardsPage.tsx` and `src/features/knowledge/KnowledgePage.tsx` exceed the approximate 200-line component-file guideline. Their dialogs, canvas, toolbar, and article views are separate feature components; page containers retain state coordination to avoid changing established mutation and drag-and-drop behavior.
- Board selection, knowledge section/search/article selection, request filters and detail modal, and store selection are URL-backed and covered by reload smoke checks.
- The existing frontend shell test now mounts the required router/auth/query providers. Two prior E2E URL expectations were updated with the user's approval; additional reload assertions cover request filters, board selection, and knowledge article selection.
