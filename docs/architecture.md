# Architecture

_How PayFlow is built and deployed today. Updated: 2026-11-26 (end of spec 002). The pre-monorepo review is in [`archive/assessment-2026-11.md`](archive/assessment-2026-11.md)._

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

- **One lockfile** at the root. Direct dependencies are pinned to exact versions until spec 002 upgrades them.
- **Node 22**, pinned in `.nvmrc` and `engines`.
- **Root scripts:** `npm run dev`, `npm run build` and `npm run lint` run across all apps.

## Apps

| | Web (`apps/web`) | API (`apps/api`) |
|---|---|---|
| Stack | React 19, Vite 6, Mantine 8, Redux Toolkit + redux-persist, axios, react-hook-form + yup, i18next, dayjs | Node, Express 5, Mongoose 8 (MongoDB Atlas), bcryptjs, jsonwebtoken, Swagger (`swagger-jsdoc`, `swagger-ui-express`), `helmet`, `express-rate-limit` |
| Language | TypeScript (strict), ESM | TypeScript (strict), compiled to CommonJS with `tsc` |
| Config | `VITE_API_BASE_URL` (baked into the build) | `PORT`, `MONGO_URI`, `JWT_SECRET` |
| Tests / lint | ESLint only | none |

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

- **CI** (GitHub Actions, job `lint-and-build`): on every PR and push to `main`, runs `npm run format:check` (Prettier) and `npx nx affected -t lint build`, so only the apps a change touches are built.
- **Formatting:** Prettier with `.prettierrc.json` (single quotes, trailing commas "es5"). Markdown is not formatted. Editors with a Prettier extension pick up the config automatically.
- **`main` is protected** (ruleset `protect-main`): changes only via pull request, `lint-and-build` must pass on an up-to-date branch, no force push, no deletion. The owner merges.

## Databases

MongoDB Atlas, one cluster (AWS us-west-2, Oregon), one database per environment:

| Environment | Database | Used by |
|---|---|---|
| Production | `payflow-prod` | the API on Render |
| Local development | `payflow-dev` | `apps/api/.env` (gitignored) |

Atlas only accepts connections from IP addresses on its access list. When working from a new network, add the current IP in Atlas → Network Access.

## Local development

1. `nvm use` (Node 22), then `npm ci`.
2. Copy `apps/api/.env.example` to `apps/api/.env` and fill in the `payflow-dev` connection string and a dev `JWT_SECRET`.
3. Copy `apps/web/.env.example` to `apps/web/.env.local`.
4. `npm run dev` starts the web app on http://localhost:5173 and the API on http://localhost:5050. Port 5000 is taken by AirPlay Receiver on macOS.

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

- **Errors:** Express 5 passes errors from `async` handlers to one error handler (`middleware/error.middleware.ts`), which answers `500 UNKNOWN` and logs the error. A duplicate username at the database answers `400 USERNAME_EXISTS`. A request without a JSON body gets `req.body = {}`.
- **Input guards:** username and password must be strings; invalid ids answer `404`.
- **Login:** unknown user and wrong password both answer `401 INVALID_CREDENTIALS`.
- **Rate limit:** login (failed attempts only) and sign-up (all attempts): 10 per IP in 15 minutes, then `429 TOO_MANY_REQUESTS`. Counts are kept in memory, which fits one server. `trust proxy` is set to 1 for Render's proxy.
- **CORS:** browsers may call the API only from `CORS_ORIGINS` (exact origins), origins matching `CORS_ORIGIN_PATTERN` (Vercel previews), and the API's own origin (Swagger). Values are in `render.yaml`; local default is `http://localhost:5173`.
- **Headers:** `helmet` defaults (CSP, HSTS, `nosniff`, frame and referrer policies); no `X-Powered-By`.

## Known issues

Still open (details in the assessment; the roadmap says which spec addresses each):

- H2/H3: payment state is client-controlled, and toggling it is not idempotent.
- M1/M2: dates and money representation.
- `npm audit`: 4 moderate findings in `i18next` and `swagger-jsdoc` (and their dependencies); fixes need major upgrades.
- Atlas Network Access allows all IP addresses (`0.0.0.0/0`), because local development runs from changing IPs. The database users' passwords are the only protection; keep them strong and limited to their own database.

Fixed in spec 002: C1 (crash on async errors), H1 (critical/high dependencies), H4 (no login limit, username leak), M6 (open CORS, no security headers), no shared formatting.
