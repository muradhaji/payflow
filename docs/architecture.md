# Architecture

_How PayFlow is built and deployed today. Updated: 2026-11-27 (end of [spec 003](specs/003-api-contract-tests.md)). The pre-monorepo review is in [`archive/assessment-2026-11.md`](archive/assessment-2026-11.md)._

## What it does

Installment tracker. A user creates an installment (title, total amount in AZN, number of months, start date). The app splits it into monthly payments, and the user marks payments as paid. Views: overdue, current month, remaining, paid, monthly stats. UI in Azerbaijani (default) and English.

## Repository

One Nx monorepo, `muradhaji/payflow`, using npm workspaces. Nx runs and caches each app's own `package.json` scripts; there are no Nx plugins yet.

```
apps/
  web/    @payflow/web   React web app        (was muradhaji/payflow-frontend, archived)
  api/    @payflow/api   Express API          (was muradhaji/payflow-backend, archived)
libs/     shared code (none yet)
docs/     product docs, specs, roadmap, this file
render.yaml                 API deploy config
.github/workflows/ci.yml    CI
```

- **One lockfile** at the root. Dependencies use `^` ranges, updated within their major versions in [002/T2](specs/002-backend-hardening.md#tasks).
- **Node 22**, pinned in `.nvmrc` and `engines`.
- **Root scripts:** `npm run dev`, `npm run build` and `npm run lint` run across all apps.

## Apps

| | Web (`apps/web`) | API (`apps/api`) |
|---|---|---|
| Stack | React 19, Vite 6, Mantine 8, Redux Toolkit + redux-persist, axios, react-hook-form + yup, i18next, dayjs | Node, Express 5, Mongoose 8 (MongoDB Atlas), bcryptjs, jsonwebtoken, Swagger (`swagger-jsdoc`, `swagger-ui-express`), `helmet`, `express-rate-limit` |
| Language | TypeScript (strict), ESM | TypeScript (strict), compiled to CommonJS with `tsc` |
| Config | `VITE_API_BASE_URL` (baked into the build) | `PORT`, `MONGO_URI`, `JWT_SECRET`; `MONGO_URI_TEST` for the tests only |
| Tests / lint | ESLint only, no tests | Vitest + supertest contract tests ([below](#api-tests-spec-003)), no lint |

## Hosting

| | Web | API |
|---|---|---|
| Provider | Vercel (Hobby) | Render (free web service, Oregon) |
| URL | https://payflow-live.vercel.app | https://payflow-api-gpwu.onrender.com |
| Config | Vercel dashboard (below) + `apps/web/vercel.json` (SPA rewrite) | [`render.yaml`](../render.yaml) |
| Deploys | every push to `main` that affects `@payflow/web` (`nx-ignore`) | every push to `main` that touches `apps/api/**` or root config, after CI passes |

**Vercel settings** (Settings → Build and Deployment):
- Root directory `apps/web`, with "Include files outside the root directory" on
- Install: `cd ../.. && npm ci --workspace=@payflow/web --include-workspace-root --include=dev`
- Build: `npx nx build @payflow/web`, output `dist`
- Ignored build step: `cd ../.. && npx nx-ignore@latest @payflow/web`. Vercel runs it inside `apps/web`; without `cd ../..` it cannot find `nx.json`, crashes, and Vercel builds every commit.
- Node.js 22.x; env `VITE_API_BASE_URL` = the API URL (Production and Preview)

**Render** starts the API with `cd apps/api && node dist/index.js`, because Swagger reads `src/routes/*.ts` relative to the start folder. The free plan sleeps after about 15 minutes idle, so the first request can take up to a minute.

## CI and branch rules

- **CI** (GitHub Actions, [`ci.yml`](../.github/workflows/ci.yml)): on every PR and push to `main`, three jobs run in parallel: `quality` (format and doc links), `build` (lint and build) and `test` (API tests), for the apps a change affects. A gate job, `ci-ok`, passes only if all three succeeded. How it works, with diagrams: [`ci.md`](ci.md).
- **Formatting:** Prettier with `.prettierrc.json` (single quotes, trailing commas "es5"). Markdown is not formatted. Editors with a Prettier extension pick up the config automatically.
- **`main` is protected** (ruleset `protect-main`): changes only via pull request, `ci-ok` must pass on an up-to-date branch, no force push, no deletion. The owner merges.

## Databases

MongoDB Atlas, one cluster (AWS us-west-2, Oregon), one database per environment:

| Environment | Database | Used by |
|---|---|---|
| Production | `payflow-prod` | the API on Render |
| Local development | `payflow-dev` | `apps/api/.env` (gitignored) |
| Tests | `payflow-test` | the API tests, locally and in CI, through `MONGO_URI_TEST` |

Each environment has its own Atlas user. The tests use `payflow-ci`, which has `readWrite` on `payflow-test` only, so the CI secret cannot read other data.

Atlas only accepts connections from IP addresses on its access list, currently `0.0.0.0/0` (see [Known issues](#known-issues)).

## Local development

1. `nvm use` (Node 22), then `npm ci`.
2. Copy `apps/api/.env.example` to `apps/api/.env` and fill in the `payflow-dev` connection string and a dev `JWT_SECRET`.
3. Copy `apps/web/.env.example` to `apps/web/.env.local`.
4. `npm run dev` starts the web app on http://localhost:5173 and the API on http://localhost:5050. Port 5000 is taken by AirPlay Receiver on macOS.
5. API tests: add `MONGO_URI_TEST` (the `payflow-ci` connection string) to `apps/api/.env`, then run `npx nx test @payflow/api`.

## Entities

- **User**: `username` (unique, 6–20 chars, `[a-z0-9]`), `password` (bcrypt hash).
- **Installment**: `user`, `title` (3–50), `amount`, `monthCount`, `startDate`, `monthlyPayments[]`, timestamps.
- **MonthlyPayment** (embedded): `date`, `amount`, `paid`, `paidDate`.

## API

| Method | Path | Auth |
|---|---|---|
| POST | `/api/auth/signup`, `/api/auth/login` | – |
| DELETE | `/api/auth/me` | Bearer JWT |
| GET, POST | `/api/installments` | Bearer JWT |
| POST | `/api/installments/toggle` | Bearer JWT |
| GET, PUT, DELETE | `/api/installments/:id` | Bearer JWT |

**API docs:** Swagger UI at [`/api-docs`](https://payflow-api-gpwu.onrender.com/api-docs), built at startup from JSDoc comments in `src/routes/*.ts`.

Errors are returned as `{ message: ERROR_CODE }`. The web app translates the codes with i18n. JWTs are HS256 and valid for 30 days, stored in `localStorage`.

## API safety (spec 002)

- **Errors** ([002/T3](specs/002-backend-hardening.md#tasks), [002/T4](specs/002-backend-hardening.md#tasks)): Express 5 passes errors from `async` handlers to one error handler (`middleware/error.middleware.ts`), which answers `500 UNKNOWN` and logs the error. A duplicate username at the database answers `400 USERNAME_EXISTS`. A request without a JSON body gets `req.body = {}`.
- **Input guards** ([002/T4](specs/002-backend-hardening.md#tasks)): username and password must be strings; invalid ids answer `404`.
- **Login** ([002/T5](specs/002-backend-hardening.md#tasks)): unknown user and wrong password both answer `401 INVALID_CREDENTIALS`.
- **Rate limit** ([002/T6](specs/002-backend-hardening.md#tasks)): login (failed attempts only) and sign-up (all attempts): 10 per IP in 15 minutes, then `429 TOO_MANY_REQUESTS`. Counts are kept in memory, which fits one server. `trust proxy` is set to 1 for Render's proxy.
- **CORS** ([002/T7](specs/002-backend-hardening.md#tasks)): browsers may call the API only from `CORS_ORIGINS` (exact origins), origins matching `CORS_ORIGIN_PATTERN` (Vercel previews), and the API's own origin (Swagger). Values are in `render.yaml`; local default is `http://localhost:5173`. How it works, with diagrams: [`cors.md`](cors.md).
- **Headers** ([002/T7](specs/002-backend-hardening.md#tasks)): `helmet` defaults (CSP, HSTS, `nosniff`, frame and referrer policies); no `X-Powered-By`.

## API tests (spec 003)

Contract tests in `apps/api/test/` check the status code, error code and response shape of every route. They describe the API as it works today. How they work: [spec 003](specs/003-api-contract-tests.md#how).

- **Run:** `npx nx test @payflow/api` (Vitest). Never cached by Nx, because results depend on the database. In CI they run when the API is affected; a failing test blocks the merge and the Render deploy.
- **Database:** only `payflow-test`. A global setup stops the run before any request if `MONGO_URI_TEST` points anywhere else. `JWT_SECRET` is random per run.
- **Requests** go to the app in memory with supertest (`src/app.ts`, no port). `src/index.ts` only connects and listens.
- **Test data:** each file creates users with random names (`t` + 12 hex characters) and deletes them through `DELETE /api/auth/me`, which also deletes their installments. A full run leaves nothing behind.
- **Rules for new tests:**
  - Compare error codes as plain strings (`'INVALID_CREDENTIALS'`), not the constants: the web app relies on the exact text.
  - Keep each file under 10 sign-ups and 10 failed logins: the rate-limit counts live in memory, per test file. The limits themselves are tested in `rate-limit.test.ts`.
  - A known bug is pinned as today's behavior with a "known bug" comment, listed below, and changed on purpose by the spec that fixes it.

## Known issues

Still open (details in the [assessment findings](archive/assessment-2026-11.md#4-findings); the [roadmap](roadmap.md) says which spec addresses each):

- [H2/H3](archive/assessment-2026-11.md#4-findings): payment state is client-controlled, and toggling it is not idempotent. Also, a `null` item in the toggle request answers `500 UNKNOWN` instead of `400` (found in [003/T7](specs/003-api-contract-tests.md#tasks)). [005](roadmap.md) reworks this route.
- [M1/M2](archive/assessment-2026-11.md#4-findings): dates and money representation.
- Creating or updating an installment with a monthly payment that is not an object (e.g. `null`) answers `500 UNKNOWN` instead of `400`; the API keeps running. Found by the tests in [003/T6](specs/003-api-contract-tests.md#tasks); the shared schemas in [004](specs/004-shared-schemas.md) fix it.
- The API has no lint setup (no ESLint config or `lint` script), so `nx affected -t lint` checks only the web app.
- `npm audit`: 4 moderate findings in `i18next` and `swagger-jsdoc` (and their dependencies); fixes need major upgrades.
- **Atlas Network Access allows all IP addresses (`0.0.0.0/0`).** Three things connect from changing IPs: local development, GitHub Actions runners (the API tests from [spec 003](specs/003-api-contract-tests.md)), and Render (the free plan has no single fixed outbound IP). The protection today is the database users: password, TLS, and each user limited to its own database. Ways to close it later:
  1. **Allow the runner's IP only during CI:** a CI step adds the runner's IP through the Atlas Admin API before the tests and removes it afterwards. Needs an Atlas API key as a second GitHub secret. Works on the free cluster. Best fit for PayFlow.
  2. **Self-hosted runner** with a fixed IP: allow only that IP. Costs a machine to maintain.
  3. **GitHub larger runners with static IPs:** allow their IP range. Paid.

  Any of these goes together with allowing only Render's published outbound IP ranges for production, and the developer's current IP (the Atlas "Add current IP address" button) for local development.

Fixed in [spec 002](specs/002-backend-hardening.md): [C1, H1, H4, M6](archive/assessment-2026-11.md#4-findings) (crash on async errors, critical/high dependencies, no login limit and username leak, open CORS and no security headers), and no shared formatting. Fixed in [spec 003](specs/003-api-contract-tests.md): no automated API tests.
