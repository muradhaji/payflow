# Roadmap

Goals run in order: **G1**, then **G2**, then **G3**.

| # | Spec | Goal | Status |
|---|---|---|---|
| – | Write [`product/`](product/) (current features and user stories, one file each) | Foundation | done |
| [001](specs/001-nx-migration.md) | Nx migration: one repo, CI, deploys (no behavior change) | G1 Nx | done |
| [002](specs/002-backend-hardening.md) | Backend hardening: crash fix, dependency updates, rate limiting, CORS, shared Prettier config | G2 Backend | done |
| – | *Optional:* evaluate moving the API from Render to Vercel (serverless). Gains per-PR API previews and no 60 s wake-up; costs a startup rework (reuse the database connection; the app is already exported since [003/T1](specs/003-api-contract-tests.md#tasks), bundle `src/routes` for Swagger) and a shared rate-limit store. May be skipped. | G2 Backend | optional |
| [003](specs/003-api-contract-tests.md) | API contract tests | G2 Backend | done |
| – | CI: split the single `lint-and-build` job into parallel jobs (quality, build, test) behind one required gate check `ci-ok`, and update the ruleset | G2 Backend | done |
| [004](specs/004-shared-schemas.md) | Shared schemas (Zod) for validation and types, used by web and API | G2 Backend | in progress |
| 005 | Payment state integrity: server-owned paid state, safe updates | G2 Backend | planned |
| 006 | Dates and money representation | G2 Backend | planned |
| 007 | API client lib and data fetching for the web app | G3 Frontend | planned |
| 008 | Design system and layout (redesign foundation) | G3 Frontend | planned |
| 009+ | Page redesigns and feature changes (one spec each, defined later) | G3 Frontend | planned |

**Later:** generate the API docs from the shared schemas, replacing today's hand-written Swagger comments; mobile app (Expo); staging environment; move the API from CommonJS to native ESM (today it loads the ESM shared library through Node 22's `require(esm)`, see [spec 004](specs/004-shared-schemas.md#how)); close Atlas `0.0.0.0/0` (options in [`architecture.md`](architecture.md#known-issues)).
