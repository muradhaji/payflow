# Roadmap

Goals run in order: **G1**, then **G2**, then **G3**.

| # | Spec | Goal | Status |
|---|---|---|---|
| – | Write [`product/`](product/) (current features and user stories, one file each) | Foundation | done |
| [001](specs/001-nx-migration.md) | Nx migration: one repo, CI, deploys (no behavior change) | G1 Nx | done |
| 002 | Backend hardening: crash fix, dependency updates, rate limiting, CORS, shared Prettier config | G2 Backend | planned |
| 003 | API contract tests | G2 Backend | planned |
| 004 | Shared schemas (Zod) for validation and types, used by web and API | G2 Backend | planned |
| 005 | Payment state integrity: server-owned paid state, safe updates | G2 Backend | planned |
| 006 | Dates and money representation | G2 Backend | planned |
| 007 | API client lib and data fetching for the web app | G3 Frontend | planned |
| 008 | Design system and layout (redesign foundation) | G3 Frontend | planned |
| 009+ | Page redesigns and feature changes (one spec each, defined later) | G3 Frontend | planned |

**Later:** generate the API docs from the shared schemas, replacing today's hand-written Swagger comments; mobile app (Expo); staging environment.
