# 004 — Shared schemas (Zod)

**Status:** in progress · **Goal:** G2 · **Affects:** libs (new `@payflow/schemas`), api (validation), web (forms, types), infra (Nx, Render build filter) · **Stories:** none (no behavior change for users)

<!-- Link every spec, story and finding you mention; see "Links" in docs/README.md. -->

## Why
- **The same rules live in two places.** The API checks requests with hand-written middleware (`apps/api/src/middleware/auth.middleware.ts`, `installment.middleware.ts`); the web app checks forms with yup (`apps/web/src/constants/schema.ts`). The limits, regexes and error codes are copied into both apps (`constants/validation.ts`, `regex.ts`, `*Messages.ts`). A change in one app is easy to forget in the other.
- **The API validators miss cases.** A monthly payment that is not an object (e.g. `null`) answers `500 UNKNOWN` instead of `400` ([Known issues](../architecture.md#known-issues), pinned in [003/T6](003-api-contract-tests.md#tasks)).
- **Types are copied too.** The web app writes the API's request and response shapes by hand in `apps/web/src/types/`.

## What
- A new shared library `libs/schemas` (`@payflow/schemas`) holds, once:
  - the **error codes** (`USERNAME_INVALID`, `TITLE_MIN_LENGTH`, …), with the same text as today;
  - the **limits and regexes** (username 6–20 `[a-z0-9]`, title 3–50, …);
  - **Zod schemas** for every request body the API validates: sign-up, login, delete account, create and update installment;
  - **TypeScript types**: request types inferred from the schemas, and the JSON response shapes (user with token, installment, monthly payment, `{ message }`).
- The **API** validates those bodies with the shared schemas through one middleware. Every error code and status stays the same as today, except the bug below.
- The **web app** validates its forms with the same schemas (react-hook-form + `zodResolver`) and imports its API types from the library. yup is removed.
- **Bug fixed:** a monthly payment that is not an object answers `400 MONTHLY_PAYMENT_INVALID` with its `index`, like the other payment errors.

**Not included:** the payment toggle body and its `null` item bug ([005](../roadmap.md) reworks that route), dates and money representation ([006](../roadmap.md)), an API client for the web app ([007](../roadmap.md)), generating the Swagger docs from the schemas (roadmap "Later"), checking responses at runtime, an ESLint setup for the API or the library.

## Done when
1. `npx nx build @payflow/api` and `npx nx build @payflow/web` build the library first and pass, from a clean checkout.
2. `npx nx test @payflow/api` passes. The only test changed on purpose is the "known bug" null-payment test, which now expects `400 MONTHLY_PAYMENT_INVALID` with `index`.
3. `grep -rn "yup" apps/web/src` and `grep -rn "VALIDATION = \|REGEX = \|_ERROR_MESSAGES = " apps` find nothing: the rules, limits and codes exist only in `libs/schemas`.
4. The web app's sign-up, login, delete-account, add and edit forms show the same error messages as before for: empty fields, too short and too long values, invalid characters, a wrong payment total and a wrong payment count (manual check on the Vercel preview).
5. A change in `libs/schemas` alone triggers both the Render deploy and the Vercel build; a change in `docs/` alone triggers neither.
6. After deploy, the [smoke test](../smoke-test.md) passes on production.

## How
- **Zod 4** for the schemas: it gives runtime checks and TypeScript types from one definition, and `@hookform/resolvers` (already in the web app) supports it. yup cannot be shared as easily with types, and the API has no schema library today.
- **Library package:** `libs/schemas` is an npm workspace (the root `package.json` already lists `libs/*`) named `@payflow/schemas`, with `zod` as its only dependency. Both apps add `"@payflow/schemas": "*"`.
- **Build:** the library compiles with `tsc` to ESM plus `.d.ts` files in `libs/schemas/dist`. The apps import the built package, not its source:
  - The API compiles to CommonJS with `rootDir: src`, so it cannot compile files outside its own folder. Node 22 loads an ESM package from CommonJS (`require(esm)`), so the API's `require('@payflow/schemas')` works as is. Checked in T1 on Node 22 locally; the first Render deploy that uses the library (T2) confirms it there. If it fails there, the library also emits a CommonJS build.
  - Vite handles ESM packages without extra config.
  - In `nx.json`, `build`, `dev` and `test` depend on `^build`, so Nx builds the library before any app that uses it, and caches it.
- **Deploys:**
  - Render: `libs/**` is added to `buildFilter` in `render.yaml`. The install command (`--workspace=@payflow/api`) must also install the library's `zod`. T1 checked this in a clean folder: npm installs a workspace's linked workspaces with their dependencies, so the command stays the same.
  - Vercel: `nx-ignore` already follows the Nx project graph, so a library change builds the web app. The install command in the Vercel dashboard stays the same, for the same reason (checked in T1).
- **Same error codes as today.** The web app translates codes with i18n, and the tests compare plain strings. So every Zod message is an error code from the library, and the API middleware answers the **first** issue as `{ message: CODE }` (plus `index` when the issue is inside `monthlyPayments`). The schema lists fields in today's check order (title, amount, monthCount, startDate, monthlyPayments), and keeps today's quirks the tests pin: a missing, `null`, empty or `0` value answers `…_REQUIRED`, and a title is measured after trimming.
- **Login keeps its order:** username format, then the user lookup (`401 INVALID_CREDENTIALS`), then password format. So the login route uses two small schemas around `checkUserExists`, not one.
- **Parsed data:** after validation, controllers read the values from the parsed result, not from `req.body`. Unknown fields are dropped. Today's controllers already pick fields one by one, so stored data stays the same.
- **Web-only rule:** the edit form also checks that the month count is not lower than the number of paid payments. The API does not check this today (payment state is [005](../roadmap.md)'s topic), so the web app extends the shared schema with this rule instead of moving it into the library.
- **Tests first for the bug:** the null-payment test is changed to `400 MONTHLY_PAYMENT_INVALID` in the same pull request that adds the installment schemas, and is seen failing before the fix.
- **Rollback:** the API change goes live with the deploy. If the API misbehaves, redeploy the previous deploy in Render and revert the merge. The web app rolls back with Vercel's "Promote to production" on the previous deployment.

## Tasks
- [x] T1 Library: create `libs/schemas` (package, `tsconfig`, `build` and `dev` scripts, one placeholder export), `^build` in `nx.json`, `libs/**` in `render.yaml`. Prove the API (CommonJS) and the web app both import it, locally and with the Render and Vercel install commands in a clean folder. (Node 22: the compiled API `require`s the ESM library; both install commands install `zod` without changes.)
- [ ] T2 Library: move the error codes, limits and regexes into the library; the API and the web app import them and delete their copies. No behavior change; tests pass.
- [ ] T3 Library + API: auth schemas (sign-up, login username, login password, delete account) and one `validate(schema)` middleware that answers the first issue as `{ message }`. Replace the auth validators. Tests pass unchanged.
- [ ] T4 Library + API: installment schemas (create and update, with the count and total checks). Change the null-payment test first, add `MONTHLY_PAYMENT_INVALID` (library and web i18n), replace the installment validators, controllers use the parsed data. Tests pass.
- [ ] T5 Library: response types (auth response, installment, monthly payment, message body) and request types inferred from the schemas.
- [ ] T6 Web: sign-up, login and delete-account forms use the shared schemas with `zodResolver`. Manual check of the error messages.
- [ ] T7 Web: add and edit installment forms use the shared schemas (edit adds the paid-count rule); remove yup. Manual check of the error messages.
- [ ] T8 Web: import API types from the library; delete the copies in `apps/web/src/types/`.
- [ ] T9 Deploys: check a library-only change builds both apps and a docs-only change builds neither (the install commands need no change, shown in T1).
- [ ] T10 Update [`architecture.md`](../architecture.md) (libs, build order, Known issues) and `roadmap.md`; run the smoke test after deploy; set status to `done`.
