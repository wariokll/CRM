# Stage 4: Knowledge

## Changes

- Moved the knowledge router into `backend/src/modules/knowledge/` and extracted text/DOCX import parsing into `import-parser.ts`.
- Preserved multipart limits, import duplicate handling, image attachment persistence, response shapes, and permissions.
- Added characterization for section/article creation, article excerpts, UTF-8 TXT import, and duplicate import skipping.

## Verification

- Knowledge characterization tests: 2 passed before and after the move.
- Full `npm run verify`: passed; 3 frontend tests, 80 backend tests, and 10 Playwright smoke tests.
- Existing lint warnings and database schema drift are unchanged.
