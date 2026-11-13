# Stage 8.2 — Coverage baseline and thresholds

## Configuration

- Frontend and backend use the already installed `@vitest/coverage-v8`; no dependency was added.
- `npm run verify` now runs both Vitest suites with coverage enabled.
- Each suite writes text and JSON summary reports to a separate directory: `coverage/frontend` and `coverage/backend`.
- The root `.gitignore` excludes generated coverage output.
- Thresholds protect the measured baseline for statements, branches, functions and lines across each project. Backend also has a line threshold for the aggregate `src/modules/**` glob.

## Measured baseline

| Scope | Statements | Branches | Functions | Lines |
| --- | ---: | ---: | ---: | ---: |
| Frontend project | 39.40% | 29.74% | 24.79% | 39.79% |
| Backend project | 62.47% | 38.69% | 72.72% | 63.80% |
| `backend/src/modules/**` aggregate | — | — | — | 63.76% |

The requested 80% line target for `backend/src/modules` is not met yet. Its current threshold is recorded at 63.76%; it is not lowered. The lowest module line rates are requests 39.42%, staff 32.25%, boards 53.12%, and knowledge 61.49%. Organizations is 78.75% and stores is 71.95%.

## Growth plan

In stage 8.3, expand characterization coverage in the ordered domains from the specification: requests, boards, knowledge, stores, organizations, and Telegram. Include route error paths and service branches where endpoint tests alone do not exercise them. Add coverage for staff, shared error formatting, and knowledge import parsing as part of that test work. Keep the current global and module thresholds in place throughout; raise them when coverage improves. Re-measure the module aggregate after each coverage increment, aiming for at least 80% lines without excluding production modules from the denominator.

## Verification

Coverage-enabled frontend run: 2 test files, 4 tests passed. Coverage-enabled backend run: 22 test files, 84 tests passed. The baseline report was generated before threshold enforcement was added. Full `npm run verify` with the new thresholds is the final stage 8.2 check.
