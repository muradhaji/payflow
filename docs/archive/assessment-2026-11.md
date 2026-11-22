# PayFlow Assessment

_Date: 2026-11-21. Scope: `payflow-frontend/` and `payflow-backend/` as found on disk (frontend `main` @ `65b071d`, backend `main` @ `14a227f`). Nothing was modified._

---

## 1. Overview

PayFlow is an installment / payment-schedule tracker: a user creates an "installment" (title, total amount, number of months, start date), the app splits it into monthly payments, and the user marks payments as paid. Filter views show overdue, current-month, remaining and paid payments plus monthly stats. UI is bilingual (az/en), currency is AZN (₼).

### Both projects are already TypeScript

Point 6 of your plan is moot: both repos are **TypeScript with `strict: true`**. There is no JS to migrate. The question for the monorepo is module format, not language (see "Migration complications").

### Frontend (`payflow-frontend`)

| Area | Details |
|---|---|
| Build | **Vite 6.3.5** (not CRA), `@vitejs/plugin-react`, ESM (`"type": "module"`) |
| Language | TS 5.8, `moduleResolution: bundler`, `verbatimModuleSyntax`, `erasableSyntaxOnly`, strict |
| UI | React 19.1, Mantine 8.2 (core/dates/modals/notifications), Tailwind 3.4 (barely used), CSS modules, Tabler icons |
| State | Redux Toolkit 2.8 + `redux-persist` (auth slice only), hand-written `createAsyncThunk`s |
| HTTP | axios 1.9, single instance in `src/api.ts`, Bearer token from `localStorage` |
| Forms | react-hook-form 7.57 + **yup** 1.6 via `@hookform/resolvers` |
| Routing | react-router-dom 7.6 (declarative `BrowserRouter`, SPA mode) |
| i18n | i18next + browser language detector, `az` default, `en`; dayjs locales |
| Lint/format | ESLint 9 flat config (Vite template), no Prettier config, no type-aware rules |
| Tests | **None** |
| Deploy | Vercel, `vercel.json` only has an SPA rewrite to `/index.html` |
| Env | `import.meta.env.API_BASE_URL` (broken, see H5), fallback hard-coded to `https://payflow-backend-2aid.onrender.com/` |
| Git | 74 commits (2025-06-13 → 2025-09-06). 8 remote branches, all fully merged into `main` (0 commits ahead). **Uncommitted change**: `package-lock.json` (−394 lines). |

### Backend (`payflow-backend`)

| Area | Details |
|---|---|
| Runtime | Node + **Express 4.21.2**, CommonJS output (`module: CommonJS`), `tsc` to `dist/`, `ts-node-dev` for dev |
| DB | MongoDB Atlas via **Mongoose 8.15** |
| Auth | `bcryptjs` (cost 10) + `jsonwebtoken` (HS256, 30-day expiry), Bearer header |
| Validation | Hand-written Express middlewares per field |
| CORS | `cors()` with no options (any origin) |
| Lint/format/tests | **None** (`npm test` is the npm placeholder) |
| Deploy | Render. **No `render.yaml`** in the repo, so build/start/env are configured in the Render dashboard. No `engines` field, so the Node version is whatever Render defaults to. |
| Env | `dotenv`; uses `MONGO_URI`, `JWT_SECRET`, `PORT` |
| Git | 14 commits (2025-04-30 → 2025-09-06). `origin/feature/swagger` has 1 unmerged commit ("Swagger initialized", JSDoc annotations on routes + `src/swagger.ts`). |

### Secrets

No `.env` files on disk or in the history of either repo, and no connection strings, JWT secrets or API keys in any commit (all branches scanned). The only hard-coded value is the public Render URL, which is not a secret.

---

## 2. Data model comparison

There are three entities: **User**, **Installment** and its embedded **MonthlyPayment**, plus two request DTOs (**installment create/update**, **payment toggle**). Backend source: `payflow-backend/src/models/*.ts`. Frontend source: `payflow-frontend/src/types/*.ts`.

### User

| Field | Backend (`IUser` / schema) | Frontend (`AuthResponse`, `AuthSliceState.user`) | Notes |
|---|---|---|---|
| `_id` | `Types.ObjectId` | `string` | Expected (wire serialization) |
| `username` | `string`, required, unique | `string` | OK |
| `password` | `string` (bcrypt hash) | not present (only in `AuthCredentials`) | OK. Never returned by the API. |
| `token` | not on model, added to auth responses | `string` on `AuthResponse`, `token: string \| null` in slice | OK |
| `createdAt` / `updatedAt` | Set by `timestamps: true` but **missing from `IUser`** | absent | Minor typing gap |

### Installment

| Field | Backend (`IInstallment`) | Frontend (`IInstallment`) | Notes |
|---|---|---|---|
| `_id` | `ObjectId` (from `Document`) | `string` | Expected |
| `user` | `ObjectId`, ref `User`, required | `string` | Expected. The frontend never uses it. |
| `title` | `string`, required | `string` | Backend validates the **trimmed** length but stores the untrimmed value. The frontend does not trim. |
| `amount` | `number`, required | `number` | Float money on both sides (see M2) |
| `monthCount` | `number`, required | `number` | Neither side requires an integer or sets a maximum |
| `startDate` | `Date` | `string` | Request sends `YYYY-MM-DD`, DB stores a UTC-midnight `Date`, response returns an ISO datetime. Three representations of one value (see M1). |
| `monthlyPayments` | `IMonthlyPayment[]` | `IMonthlyPayment[]` | |
| `createdAt` / `updatedAt` | `Date` | `string` | Expected |
| `__v` | Returned by the API (Mongoose version key) | not typed | Leaks into the frontend |

### MonthlyPayment (embedded subdocument)

| Field | Backend | Frontend | Notes |
|---|---|---|---|
| `_id` | `ObjectId`, **optional** | `string`, **required** | Mismatch in optionality |
| `date` | `Date`, required | `string` | Same 3-representation problem as `startDate` |
| `amount` | `number`, required | `number` | |
| `paid` | `boolean`, default `false` | `boolean` | **Accepted from the client** on create/update (see H2) |
| `paidDate` | `Date \| null`, default `null` | `string \| null` | **Accepted from the client** on update |

### Request DTOs

| DTO | Backend | Frontend | Notes |
|---|---|---|---|
| Create/update installment | Untyped `req.body`, checked field by field in `installment.middleware.ts` | `InstallmentSchema` = `{title, amount, monthCount, startDate, monthlyPayments: {date, amount, paid?}[]}` plus a yup schema in `constants/schema.ts` | On edit, the frontend actually sends `_id` and `paidDate` per payment too (the form spreads the server object, `EditInstallment.tsx:114-116`). The type does not reflect this. |
| Toggle payments | `IPaymentUpdate = {installmentId, paymentId}` | `IPaymentUpdate = {installmentId, paymentId, paymentAmount}` | `paymentAmount` is client-only (used for totals) but sent over the wire and ignored |
| Login / signup | `{username, password}` | `AuthCredentials` + signup form `confirmPassword` (client only) | OK |
| Delete me | `{password}` | `DeleteCredentials` | OK |

### Duplicated constants

These files are **byte-identical or near-identical** in both repos and are natural first candidates for the shared lib:

| File | Differences |
|---|---|
| `constants/regex.ts` | identical |
| `constants/validation.ts` | identical |
| `constants/authMessages.ts` | Frontend adds `CONFIRM_PASSWORD_REQUIRED`, `CONFIRM_PASSWORD_MATCH` |
| `constants/installmentMessages.ts` | identical |
| `constants/messages.ts` | Frontend adds `SUCCESS_MESSAGES.COMMON` |

### Validation rule comparison

| Rule | Backend | Frontend (yup) |
|---|---|---|
| Title length 3–50 | on trimmed value | on raw value |
| Amount > 0 | yes (`!amount` also rejects 0) | yes |
| monthCount ≥ 1 | yes | yes, **plus** `monthCount >= paidCount` (edit only) |
| monthCount integer / max | no | no |
| Date format `YYYY-MM-DD` | regex + `Date.parse` (lenient: `2024-02-31` is accepted and becomes 2 March, verified) | regex only |
| payments.length === monthCount | yes | yes |
| Sum of payments === amount | naive float `reduce` then `toFixed(2)` | cent-rounded `sumByKeyDecimal` then `toFixed(2)`. The two algorithms can disagree. |
| username / password type is string | **no** (leads to C1) | implicit |

---

## 3. API endpoints

Base: `https://payflow-backend-2aid.onrender.com`. All errors use the shape `{ message: ERROR_CODE }` (plus `index` for per-payment errors). The frontend translates codes via i18n, which works well and should be kept.

| Method | Path | Auth | Middleware chain | Request | Success | Errors |
|---|---|---|---|---|---|---|
| GET | `/` | – | – | – | `200` text "PayFlow API is running!" | – |
| POST | `/api/auth/signup` | – | validateUsername, checkDuplicateUsername, validatePassword | `{username, password}` | `201 {_id, username, token}` | 400 `USERNAME_*`, `USERNAME_EXISTS`, `PASSWORD_*` |
| POST | `/api/auth/login` | – | validateUsername, checkUserExists, validatePassword | `{username, password}` | `200 {_id, username, token}` | 400 validation, **404 `USER_NOT_FOUND`**, **401 `PASSWORD_INCORRECT`** |
| DELETE | `/api/auth/me` | Bearer | protect | `{password}` | `200 {message: USER_DELETED}` (cascades installments) | 400, 401, 500 |
| GET | `/api/installments` | Bearer | protect | – | `200 Installment[]`, sorted `createdAt` desc, unpaginated | 401, 500 |
| POST | `/api/installments` | Bearer | protect, 5 validators | create DTO | `201 Installment` | 400 validation, 500 |
| POST | `/api/installments/toggle` | Bearer | protect | `[{installmentId, paymentId}]` | `200 Installment[]` (only the installments touched; unknown ids silently skipped) | 400 `UPDATE_PAYMENTS_ARRAY`, 500 |
| GET | `/api/installments/:id` | Bearer | protect, checkInstallmentExists | – | `200 Installment` | 404, **crash on malformed id** (C1) |
| PUT | `/api/installments/:id` | Bearer | protect, checkInstallmentExists, 5 validators | full DTO (replaces everything, including `monthlyPayments`) | `200 Installment` | 400, 404, 500 |
| DELETE | `/api/installments/:id` | Bearer | protect, checkInstallmentExists | – | `200 {message: INSTALLMENT_DELETED}` | 404, 500 |

**Auth flow.** Signup/login return a JWT `{id}` signed HS256 with `JWT_SECRET`, valid 30 days. The frontend stores it **twice** in `localStorage` (`PAYFLOW_USER` written by the auth slice, and `persist:auth` written by redux-persist). The axios interceptor reads `PAYFLOW_USER`. `protect` verifies the token and loads the user on each request. There is no refresh, no revocation, no server-side logout, and the frontend has no 401 handling (`store.ts:27` has a TODO).

**Frontend data flow.** Components dispatch thunks in `installmentsSlice.ts` and `authSlice.ts`. Each thunk has its own `{loading, error}` slot. Mutations do not update the cache. Instead they refetch (`fetchInstallments` after delete) or merge (`updateInstallments` after toggle). `InstallmentsLayout` fetches the full list on mount. All filtering and stats are computed client-side from the full list.

---

## 4. Findings

### Critical

**C1. Any client can crash the API process (unauthenticated remote DoS).** Verified locally against the installed Express 4.21.2 and bcryptjs.
Express 4 does not catch rejected promises from `async` handlers. Several handlers and middlewares have no `try/catch`, so a rejection becomes an `unhandledRejection`, and since Node 15 that **terminates the process**. Render restarts it, but a loop of requests keeps the API down.
- `payflow-backend/src/controllers/auth.controller.ts:14` (`signup`): `bcrypt.hash(password)` rejects when `password` is not a string.
- `payflow-backend/src/middleware/auth.middleware.ts:107`: the password regex is tested against `String(password)`. An array of 8 one-character strings such as `["a","1","a",…]` stringifies to `a,1,a,…`, which **passes** the regex because `\S` matches the comma. Exploit: `POST /api/auth/signup` with `{"username":"anyname1","password":["a","1","a","a","a","a","a","a"]}`. No account needed.
- `payflow-backend/src/controllers/auth.controller.ts:27` (`login`): same issue with `bcrypt.compare`.
- `payflow-backend/src/middleware/installment.middleware.ts:245` (`checkInstallmentExists`): `GET /api/installments/abc` throws a Mongoose `CastError` and crashes the process. Any logged-in user can trigger it.
- `payflow-backend/src/middleware/auth.middleware.ts:124,141`, `auth.controller.ts:15`: any Mongo hiccup, or two concurrent signups with the same username (`E11000` from the unique index), also crash the process.

**Fix:** a central error handler, plus either Express 5 (which forwards async rejections natively) or an `asyncHandler` wrapper. Add strict type validation of the body (Zod solves this by construction), and return 400/404 for an invalid ObjectId.

### High

**H1. Known-vulnerable dependencies** (`npm audit --omit=dev`).
- Backend: `mongoose` 8.15 (critical, fixed in later 8.x), `express` 4.21.2 and transitive `body-parser`, `path-to-regexp`, `qs`, `proxy-addr` (critical), and `jws` (high, a `jsonwebtoken` dependency). See `payflow-backend/package.json:15-21`.
- Frontend: `react-router-dom` 7.6.2 (several advisories; most target SSR/framework mode, but the open-redirect ones apply to SPA `<Link>`/`useNavigate`), `axios` 1.9.0 (high), `form-data` (critical, transitive via axios), `vite` 6.3.5 and `postcss` (dev-server and build only). See `payflow-frontend/package.json:21,30,49`.
- All are fixable within the current major versions (`npm audit fix`), so the risk of upgrading is low.

**H2. Payment status is controlled by the client, and edits can rewrite payment history.**
`payflow-backend/src/controllers/installment.controller.ts:14-22` and `:65-75` pass `monthlyPayments` straight from the body to Mongoose. Each item may carry `paid`, `paidDate` and `_id`, and the validators (`installment.middleware.ts:145-236`) do not strip them. A client can create an installment that is already "paid" on arbitrary dates. `PUT` replaces the whole array, so the server keeps no authoritative history of what was paid when. The frontend relies on this: `EditInstallment.tsx:114-116` round-trips server objects through the form, and `:121-163` regenerates unpaid payments with **new `_id`s**. Any selection held in another tab then refers to ids that no longer exist (silently skipped by `toggle`). There is also no optimistic-concurrency check, so a `PUT` racing a `toggle` loses one of the updates.

**H3. `toggle` is not idempotent.**
`payflow-backend/src/controllers/installment.controller.ts:118-123` flips `paid`. The frontend uses the same endpoint for both "complete" and "cancel" (`payflow-frontend/src/features/installments/installmentsSlice.ts:99-135`). A double-click, a network retry, or a stale second tab turns "mark as paid" into "mark as unpaid". For payment state, the endpoint should say what the new state is, e.g. `PATCH .../payments` with `{ids, paid: true}`.

**H4. No brute-force protection, and user enumeration.**
There is no rate limiting anywhere (`payflow-backend/src/index.ts`). `/login` returns `404 USER_NOT_FOUND` vs `401 PASSWORD_INCORRECT` (`auth.middleware.ts:141-146`, `auth.controller.ts:29-31`), which tells an attacker which usernames exist. `DELETE /api/auth/me` is a password oracle for anyone holding a token. Fix: `express-rate-limit` on `/api/auth/*`, a single `INVALID_CREDENTIALS` response, and `app.set('trust proxy', 1)` on Render so limits apply per client IP.

**H5. Frontend environment configuration never takes effect, so every build talks to production.**
`payflow-frontend/src/api.ts:6` reads `import.meta.env.API_BASE_URL`, but Vite only exposes variables prefixed `VITE_`. The value is always `undefined` and the hard-coded production URL is used. Local `npm run dev` and every Vercel preview deployment read and write the **production database**. This also blocks per-environment config in Nx. Fix: use `VITE_API_BASE_URL`, type it in `vite-env.d.ts`, and fail the build if it is missing.

### Medium

**M1. Calendar dates are stored as instants.**
`startDate` and payment `date` are calendar dates sent as `YYYY-MM-DD`, stored as UTC-midnight `Date`, and returned as ISO datetimes that `dayjs(p.date)` parses in **local time**. This works in Baku (UTC+4) but shows the previous day in any negative-offset timezone, and month bucketing (overdue/current filters, `FilterOverdue.tsx:54-57`, `Filters.tsx:49-65`) can shift. Validation is also lenient: `Date.parse('2024-02-31')` is accepted and becomes 2 March (`installment.middleware.ts:132-135,190-193`). This matters for the shared schemas: define dates on the wire as `YYYY-MM-DD` strings (`z.iso.date()` in Zod 4, or a regex plus a real-date refine) and keep them as strings, or normalize explicitly at the boundary.

**M2. Money is stored as floating point, and the two sides disagree on rounding.**
`amount` is a JS `number`. The backend total check (`installment.middleware.ts:226-228`) uses a raw float sum, while the frontend uses a cent-rounded sum (`utils/math.ts:9-18`). With many payments the two can disagree, and the user then gets `MONTHLY_PAYMENTS_TOTAL_MISMATCH` from the server after the client said the form was valid. Neither side limits values to 2 decimals (`0.001` is accepted). The usual fix is integer minor units (qəpik) everywhere, or at least a shared `money` schema with `multipleOf(0.01)` and one shared summing function.

**M3. Backend validation gaps beyond C1.**
- No `typeof === 'string'` check for username/password (`auth.middleware.ts:56-82,90-115`).
- `monthCount` is not required to be an integer and has no maximum (`installment.middleware.ts:85-108`).
- `title` is validated trimmed but stored untrimmed (`installment.middleware.ts:30`, `installment.controller.ts:69`).
- Items in the `toggle` body are unvalidated (`installment.controller.ts:89`).
- `amount.toFixed` would throw if `amount` were not a number, but the earlier middleware covers this. The ordering is fragile.

All of this goes away with Zod schemas on every route.

**M4. Edit-schedule regeneration assumes paid payments come first.**
`payflow-frontend/src/componenets/installments/EditInstallment/EditInstallment.tsx:121-163` keeps the paid payments and adds `paidPayments.length` months to `startDate` for the rest. If month 3 was paid but months 1–2 were not, the regenerated dates collide with or skip months. The `useCallback` dependencies (`:163`) omit `startDate` and `monthlyPayments`, so changing the start date on edit does not regenerate the schedule (stale closure). This is domain logic that belongs in a shared, tested pure function.

**M5. Token handling on the frontend.**
- The token is stored twice (`authSlice.ts:100,120` and redux-persist `store.ts:8-12`).
- The interceptor calls `JSON.parse` without `try` (`api.ts:16`), so a corrupted `localStorage` breaks every request.
- 30-day tokens have no expiry handling (`store.ts:27` TODO): an expired session shows generic errors instead of redirecting to login.
- `localStorage` tokens are exposed to any XSS. React escaping makes XSS unlikely today, but it is a reason to keep dependencies current.

**M6. Wide-open CORS and no security headers.**
`payflow-backend/src/index.ts:13` allows any origin. Because auth uses a Bearer header and not cookies, the impact is limited, but an allowlist (Vercel production and preview domains, localhost) is cheap. There is no `helmet`. `x-powered-by` is on.

**M7. Startup and operations.**
`connectDB()` is not awaited before `listen` (`index.ts:10,23`), so early requests fail during a cold start, which is common on Render. There is no DB-aware health endpoint for Render's health check, no graceful shutdown, no request logging, and raw errors go to `console.error`.

**M8. Type packages conflict with runtime versions.**
- `@types/express@^5` is used with `express@^4` (`payflow-backend/package.json:26`).
- `@types/mongoose@5` is a deprecated stub, and Mongoose 8 ships its own types (`:28`).
- `@types/axios` is a deprecated stub (`payflow-frontend/package.json:36`).

These will cause confusing type errors once Nx hoists dependencies into one root `package.json`.

**M9. No tests, no backend linting, no Prettier, no CI.**
This makes every refactor below riskier than it needs to be. Add characterization tests for the API before changing validation (see roadmap step 2).

### Low

- **L1. Naming hazards.**
  - `src/componenets/` is a typo.
  - `src/componenets/installments/InstallmentDetails.tsx/` is a *directory* with a `.tsx` suffix. It matches `**/*.tsx` globs, which already broke `wc` during this review and will confuse ESLint, Vitest and Nx inference.
  - `useInstallmenstsDateRange` (`hooks/useInstallmentsDateRange.tsx:6`) is misspelled.
  - The backend `package.json:2` name is `"new-folder"` and `main` is `index.js`.
  - The frontend `README.md` is the unmodified Vite template.
- **L2. Duplication.** `FilterOverdue/Current/Remaining/Paid.tsx` are about 190–220 lines each and differ mainly in a predicate and labels. They can become one component with a config.
- **L3.** Inline predicate functions passed to `useFilteredInstallments` (e.g. `FilterOverdue.tsx:54`) change on every render, so its `useMemo` (`useFilteredInstallments.tsx:11-24`) never caches.
- **L4.** Logout (`LogOutButton.tsx:17-20`) does not clear the installments slice, so the next user in the same tab briefly sees the previous user's data until the refetch completes.
- **L5.** `GET /api/installments` is unbounded. `toggle` runs one `findOne` + `save` per installment sequentially (`installment.controller.ts:108-127`). This is fine at the current scale.
- **L6.** `serializableCheck: false` is set globally (`store.ts:23`), which hides real mistakes. Only redux-persist actions need to be ignored.
- **L7.** The password policy allows at most 20 characters and uses a restrictive charset regex (`regex.ts:4`). Modern guidance is a long maximum and few composition rules.
- **L8.** There is no `engines.node`, and the Render Node version is not pinned.
- **L9.** Repository hygiene:
  - Uncommitted `package-lock.json` change in the frontend.
  - 8 stale, fully merged remote branches in the frontend.
  - The unmerged backend `feature/swagger` branch is superseded if you generate OpenAPI from Zod.
- **L10.** The theme color-scheme key is the template default `'my-app-color-scheme'` (`App.tsx:51,58`).

---

## 5. Plan review

Overall the plan is sound and well-sized for these codebases. The two apps really do share almost all their data shapes and every validation constant, so the shared-schema payoff is real and immediate. Specific comments, in plan order:

### 1. Nx monorepo with `nx import` → `apps/web`, `apps/api`

Agree. Adjustments:

- **Make both repos clean first.** Commit or discard the frontend `package-lock.json` change. Decide whether only `main` is imported. I would delete the stale merged branches and close `feature/swagger`.
- **Fix the naming hazards (L1) before importing.** History stays intact either way, but renaming before the import keeps the first monorepo commits about structure only.
- **Backend build:** use `@nx/node` with **esbuild bundling** (`@nx/esbuild`) and CommonJS output. Shared libs are then inlined at build time, and you avoid the CJS-backend-consuming-ESM-lib problem entirely. Switching the API to native ESM (`NodeNext`) is also possible but is extra churn with no benefit now.
- **Consider Express 5 during the migration.** It fixes the async-error class of bugs (C1) natively. Its breaking changes, mostly path syntax and `req.query` handling, barely affect this small API.
- **Render:** there is currently no `render.yaml`. Commit a Blueprint (`render.yaml`) so deploy config is versioned. Path-based build filters cannot know that a change to `libs/shared/schemas` affects the API unless you list every lib path by hand. A more accurate option: **turn off Render auto-deploy and call a Render deploy hook from GitHub Actions when `nx affected -t build` includes `api`**. This is the same idea as `nx-ignore` on Vercel, driven by the real project graph.
- **Vercel:** keep the project and point it at the monorepo. Use `npx nx-ignore web` as the Ignored Build Step and `nx build web` as the build command, with output in `dist/apps/web`. Move the SPA rewrite to `apps/web/vercel.json`, or set the root directory to `apps/web`.
- Add **CI from day one** (lint, typecheck, test and build via `nx affected`). There is none today.

### 2. Single source of truth with Zod

Agree, with four refinements:

- **Separate wire schemas from persistence types.** On the wire, ids are `string` and dates are `YYYY-MM-DD` strings. In Mongo they are `ObjectId` and `Date` (or keep dates as strings, see M1). "Mongoose models typed against shared types" should mean a **mapped type** in `libs/api/data-access` (e.g. `InstallmentDoc = Omit<Installment, '_id' | 'user'> & { _id: Types.ObjectId; user: Types.ObjectId }`) plus a `toDto()` mapper, not `interface IInstallment extends Installment`. Optionally parse responses with the response schema in development to catch drift.
- **Split request and response schemas.** `CreateInstallmentInput` must not allow `paid`, `paidDate` or `_id` (this fixes H2). The `Installment` response schema includes them. Zod's `.pick/.omit/.extend` keeps these in one file.
- **Error codes and validation constants** move into the shared lib along with the schemas. Use Zod custom messages that are your existing error codes (`z.string().min(3, { error: 'TITLE_MIN_LENGTH' })`), so the frontend i18n keeps working unchanged. Replace **yup with Zod** in react-hook-form (`zodResolver`). Forms then use exactly the same schema as the server.
- **OpenAPI:** Zod 4 has native `z.toJSONSchema()`, and libraries such as `zod-openapi` build on it. This supersedes the `feature/swagger` JSDoc branch.

### 3. Future-proofing (Expo mobile)

Agree with the layout. Additions:

- **Add a `libs/shared/domain` lib** (pure TS, no React, DOM or Node). Schedule generation (`AddInstallment.tsx:89-113`, `EditInstallment.tsx:121-163`), money math (`utils/math.ts`), and payment-status predicates (overdue/current/remaining/paid) are business logic currently buried in components. Mobile needs exactly these. Extracting them also makes M2 and M4 testable.
- **`libs/shared/api-client` must be platform-neutral.** It should take a `getToken()` / `onUnauthorized()` adapter instead of reading `localStorage` (web uses `localStorage`, mobile uses SecureStore). Prefer `fetch` (available in React Native) over axios, or keep axios but without browser-specific code.
- **Data fetching layer:** decide before building `api-client`. Either RTK Query (fits the existing Redux) or TanStack Query. Both work on React Native. Hand-written thunks with per-call loading slots will not scale to a second client.
- **Module boundaries:** tag libs (`scope:shared|web|api|mobile`, `type:schemas|domain|data-access|ui|feature`) and enforce them with `@nx/enforce-module-boundaries`, so `shared` can never import `react-dom`, `mongoose` or `node:*`.
- **Single-version policy:** Expo SDKs pin a specific React version. When `apps/mobile` arrives, web must use the same React version, or you must adopt Nx's multi-version setup. Not an issue today, just a known constraint.
- Package manager: npm workspaces are the lowest-friction choice with Expo. pnpm works but needs `node-linker=hoisted` or extra Metro configuration. Your choice (open question).

### 4. Spec-driven development

Agree. Notes:

- This document plus a one-page `docs/current-state.md` (stack, endpoints, entities, deploy) is a sufficient baseline. Retro-speccing would be wasted effort.
- Keep specs small: one deployable outcome each. The roadmap below is cut that way.
- Add a lightweight `docs/adr/` for decisions that outlive a spec (Zod, esbuild/CJS, dates-as-strings, money units, deploy-hook strategy). Specs describe *work*; ADRs describe *why the system is the way it is*.
- Each spec's `tasks.md` should include its tests, so test coverage grows with the work instead of as a separate effort.

### 5. TypeScript

Already done: both apps are strict TS. Instead, tighten it:
- Add type-aware ESLint (`recommendedTypeChecked`) to the frontend.
- Add ESLint to the backend.
- Remove the stale `@types/*` packages (M8).
- Add `noUncheckedIndexedAccess` in the shared libs.

---

## 6. Prioritized roadmap

### Before the migration (in the current repos, deployed via current pipelines)

These are urgent, small, and should not wait for the monorepo:

1. **Backend hotfix:**
   - Central error handler plus async wrapper (or `express-async-errors`).
   - `typeof` string checks on username/password.
   - Invalid ObjectId returns 404.
   - Catch `E11000` and return `USERNAME_EXISTS`.
   - Fixes **C1**.
2. **Dependency updates** within majors on both sides (`npm audit fix`, then retest). Fixes **H1**.
3. **Auth hardening:**
   - Rate limit `/api/auth/*`.
   - Single `INVALID_CREDENTIALS` response.
   - `trust proxy`.
   - CORS allowlist and `helmet`.

   The error-code change needs a matching frontend i18n key, which is a small coordinated deploy. Fixes **H4** and **M6**.
4. **Frontend env fix:** `VITE_API_BASE_URL` set per Vercel environment. Point previews at a staging API or a separate Atlas DB if you can. Fixes **H5**.
5. **Hygiene:**
   - Commit or discard the lockfile change.
   - Delete merged branches and close `feature/swagger`.
   - Rename `componenets` → `components` and `InstallmentDetails.tsx/` → `InstallmentDetails/`.
   - Fix the backend `package.json` name.

### During the migration (as part of or immediately after `001`)

6. Nx workspace, `nx import` both apps, CI, Vercel and Render rewired, `render.yaml` committed.
7. Pin the Node version (`engines` and `.nvmrc`), shared ESLint/Prettier config, remove the stale `@types`.
8. Test harness: Vitest for libs and web, Vitest + Supertest + `mongodb-memory-server` for the API.

### After the migration (each its own spec)

9. API characterization tests, then shared schemas (Zod), then backend Zod validation, then frontend yup → Zod.
10. Payment-state integrity: server-owned `paid`/`paidDate`, idempotent "set paid" endpoint, stable payment ids on edit, optimistic concurrency. Fixes **H2**, **H3**, **M4**.
11. Dates and money: decide representation, write the data migration, add the shared domain functions. Fixes **M1**, **M2**.
12. API client lib and data-fetching layer, plus 401 handling and a single token store. Fixes **M5**.
13. OpenAPI generation from Zod.
14. Frontend cleanup: filter-page consolidation, logout state reset, Redux `serializableCheck`. Fixes **L2**–**L6**.

### Can wait

Pagination, Express 5 (if not done during step 6), refresh tokens and token revocation, password policy changes, mobile app, Tailwind removal (Mantine covers styling), observability.

### Proposed spec sequence

| # | Spec | Outcome | Depends on |
|---|---|---|---|
| 000 | `000-pre-migration-hardening` (optional: may be done as plain commits in the old repos) | C1, H1, H4, H5, M6, hygiene fixed in production | – |
| 001 | `001-nx-migration` | Monorepo with `apps/web` and `apps/api`, history preserved, CI, both deploys working from the monorepo, **no behavior change** | 000 |
| 002 | `002-api-contract-tests` | Supertest suite pinning the current API behavior (status codes, error codes, shapes) | 001 |
| 003 | `003-shared-schemas` | `libs/shared/schemas` (Zod, error codes, constants), API validates with Zod, web forms use Zod, duplicate constants deleted | 002 |
| 004 | `004-api-data-access` | Mongoose models in `libs/api/data-access`, typed via mapped types, `toDto` mappers, `__v` not leaked | 003 |
| 005 | `005-payment-state-integrity` | Idempotent set-paid endpoint, server-owned paid state, stable ids on edit, concurrency guard | 004 |
| 006 | `006-dates-and-money` | Calendar-date and money representation decided (ADR), data migration script, `libs/shared/domain` with schedule and money functions, fully unit-tested | 003 (can run in parallel with 005, but both touch payments, so sequential is safer) |
| 007 | `007-api-client` | `libs/shared/api-client` (platform-neutral, token adapter), RTK Query or TanStack Query, 401 handling, single token storage | 003 |
| 008 | `008-openapi` | Spec generated from Zod, served at `/docs` | 003 |
| 009 | `009-web-cleanup` | Filter consolidation, logout reset, lint warnings fixed | 007 |
| 010+ | `010-mobile-foundation` … | `apps/mobile` (Expo) consuming schemas, domain, api-client | 006, 007 |

---

## 7. Open questions for you

1. **Hotfixes first?** Should C1/H1/H4/H5 be fixed in the old repos before `001` (my recommendation, since C1 is exploitable today), or folded into `001`?
2. **Frontend `package-lock.json`:** the uncommitted change removes 394 lines. Was that intentional (commit it) or an accident (discard it)?
3. **Branches:** OK to import only `main` and delete the 8 merged frontend branches? Should `feature/swagger` be dropped in favor of Zod-generated OpenAPI?
4. **Real data:** are there real users and installments in the production Atlas DB? This decides whether 006 needs a careful data migration and whether changing auth error codes or token lifetimes affects anyone.
5. **Render setup:** which plan (free instances sleep, which affects cold starts and health checks), which Node version, and are you OK moving config into a committed `render.yaml` with deploy hooks triggered from GitHub Actions?
6. **Vercel/Render projects:** reconnect the existing projects to the new monorepo (keeps domains and env vars), or create new ones? Should the old repos be archived afterwards?
7. **GitHub:** a new repo (e.g. `muradhaji/payflow`) for the monorepo?
8. **Package manager:** stay on npm (simplest, Expo-friendly) or switch to pnpm?
9. **Data fetching:** keep Redux and adopt RTK Query, or move server state to TanStack Query and keep Redux only for UI/auth?
10. **Express 5:** acceptable to upgrade during `001`, or keep `001` strictly behavior-preserving and upgrade later?
11. **Staging:** do you want a separate staging API and database for Vercel previews, or should previews keep hitting production (not recommended)?
12. **Currency:** is PayFlow AZN-only for the foreseeable future? This affects the money representation (006).
