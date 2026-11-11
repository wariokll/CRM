# CRM architecture

This document describes the current source layout and runtime boundaries.

## Frontend

- `src/main.tsx` installs the Query client, authentication provider, and `RouterProvider`.
- `src/router.tsx` declares browser routes; `src/App.tsx` composes the authenticated CRM shell and applies the existing role checks.
- `src/features/layout/` contains the sidebar, header, page composition, shared dashboard data queries, and account status screen.
- `src/features/<feature>/` contains feature pages, presentation components, and `queries.ts` modules for feature API operations. Feature pages are loaded lazily. Search filters and selected entities that should survive reloads are stored in route paths or query parameters.
- `src/shared/http.ts` owns cookies, access-token refresh, API errors, and JSON/file requests. `src/api.ts` is a compatibility re-export.
- `src/shared/queryKeys.ts` centralizes shared cache keys. Server state uses TanStack Query and mutations invalidate or refresh affected keys.
- `src/types.ts` is a compatibility re-export. Domain types live in `src/types/`.

## Backend

- `backend/src/server.ts` validates startup configuration, creates the app, and owns the HTTP listener and scheduled jobs.
- `backend/src/app.ts` is a `createApp(deps)` composition root. It registers middleware, health endpoints, feature routers, static assets, and the SPA fallback without calling `listen()`.
- `backend/src/config.ts` validates environment values with Zod; `backend/src/db.ts` owns the Prisma client.
- `backend/src/shared/` contains cross-feature errors and Express middleware.
- `backend/src/modules/<feature>/` owns feature routes, controllers, services, schemas, policies, mappers, and tests as each feature is extracted. Prisma is used directly in services; repositories are reserved for shared complex queries.
- `backend/src/telegram/` contains the Telegram bot transport and update lifecycle; feature operations are shared through Telegram module services.

## Runtime and routing

The Express production server serves `dist/` and returns `index.html` for non-API paths so direct browser routes work after reload. `/api/*` remains reserved for the API. Vite provides the development SPA fallback and `/api` proxy.

## Verification

Run `npm run verify` at the repository root. It checks frontend and backend TypeScript, ESLint, Prettier, frontend unit tests, backend integration tests against the isolated MariaDB test database, production builds, and Playwright smoke tests. Deployment scripts and Docker Compose are documented in `DEPLOYMENT.md` and `docker-compose.production.yml`.
