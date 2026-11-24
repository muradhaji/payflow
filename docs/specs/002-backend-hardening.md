# 002 — Backend hardening

**Status:** in progress · **Goal:** G2 · **Affects:** api, web (error messages), infra, tooling · **Stories:** changes US-AUTH-02, adds US-AUTH-07

## Why
The API in production has known safety problems (details in [`archive/assessment-2026-11.md`](../archive/assessment-2026-11.md)):
- **Anyone can crash it** (C1). Express 4 does not catch errors thrown in `async` handlers, so one malformed request ends the process. Examples: a password sent as an array, an invalid installment id in the URL, two sign-ups with the same name at once.
- **Known-vulnerable dependencies** (H1). `npm audit` reports 1 critical (`mongoose`) and 6 high (`express`, `axios`, `react-router-dom` and their dependencies). All have fixes within the current major versions.
- **Login can be brute-forced and leaks usernames** (H4). There is no attempt limit, and "User not found" vs "Incorrect password" tells an attacker which usernames exist.
- **Any website may call the API** (M6). CORS is open to every origin, and there are no security headers.
- **No shared code formatting.** Editors format files differently (seen in 001), which makes diffs noisy.

## What
- The API no longer crashes on bad input or database errors. It answers with an error code instead.
- Dependencies are updated to the latest version within their major version, and `npm audit` shows no critical or high findings.
- Login answers the same "Incorrect username or password" for both mistakes, and repeated attempts are limited.
- Only PayFlow's own web addresses (production, previews, localhost) may call the API, and responses carry standard security headers.
- One Prettier config for the repo, matching today's style (single quotes), checked in CI.

**Not included:** shared schemas and full validation (004), payment toggle fix (005), dates and money (006), tests (003), staging.

## Done when
1. These requests get an error response and the API keeps running:
   - `POST /api/auth/signup` with a password that is an array → `400`
   - `GET /api/installments/abc` with a valid token → `404 INSTALLMENT_NOT_FOUND`
   - two sign-ups with the same new username at the same time → one `201`, one `400 USERNAME_EXISTS`
2. `npm audit --omit=dev` shows 0 critical and 0 high.
3. Login with an unknown username and with a wrong password both return `401 INVALID_CREDENTIALS`, and the web app shows "Incorrect username or password".
4. After 10 failed logins from one IP within 15 minutes, the next attempt gets `429 TOO_MANY_REQUESTS`, and the web app shows a clear message.
5. A request with `Origin: https://example.com` gets no CORS permission; `payflow-live.vercel.app`, its preview URLs and `localhost:5173` do. Responses include `helmet` headers and no `X-Powered-By`.
6. `npm run format:check` passes, and CI runs it.
7. Production passes [`smoke-test.md`](../smoke-test.md) after deploy.

## How
- **Order:** formatting first, so later diffs only show real changes. Then dependencies, then the code changes one at a time, each with its own commit.
- **Prettier:** a root `.prettierrc` that matches the current code (single quotes, semicolons, 2 spaces), `.prettierignore` for build output, and `format`/`format:check` scripts. If the existing code doesn't fully match, one separate "format only" commit.
- **Dependencies:** `npm update` within major versions for both apps, then exact pins replaced by `^` ranges again. Build, lint and the local round trip must still pass.
- **Crash fix with Express 5:** upgrade `express` from 4 to 5. Express 5 passes errors from `async` handlers to the error middleware by itself, so no wrapper is needed on any route. One error-handling middleware at the end logs the error and answers `500 UNKNOWN`. This was first done with an `asyncHandler` wrapper on every route; it was replaced because each new route would need it, and forgetting it brings the crash back. The routes use no Express features that changed in version 5, and `@types/express` is already version 5.
- **Input guards:** `username` and `password` must be strings (`400 USERNAME_INVALID` / `PASSWORD_INVALID`). Invalid ObjectIds answer `404`. A duplicate-key error from MongoDB answers `400 USERNAME_EXISTS`. Full validation with schemas comes in 004.
- **Login:** one error code `INVALID_CREDENTIALS` (`401`) for unknown user and wrong password. The web app gets the new message in AZ and EN.
- **Rate limit:** `express-rate-limit` on `/api/auth/login` and `/api/auth/signup`: 10 requests per 15 minutes per IP, answering `429 TOO_MANY_REQUESTS`. `app.set('trust proxy', 1)`, because Render sits in front of the API and otherwise every user looks like the same IP.
- **CORS:** allowed origins come from a `CORS_ORIGINS` environment variable (comma-separated), plus a pattern for Vercel preview URLs of this project. Local default: `http://localhost:5173`.
- **Headers:** `helmet` with its defaults, which also removes `X-Powered-By`. The Swagger page at `/api-docs` must keep working.
- **Deploy:** merging to `main` deploys the API through Render after CI passes. `CORS_ORIGINS` must be set on Render **before** that merge, or the live site loses access to the API.
- **Rollback:** in Render, redeploy the previous deploy; in GitHub, revert the merge.

## Tasks
- [x] T1 Add Prettier config and `format`/`format:check` scripts; add the check to CI. Separate commit if existing files need reformatting.
- [x] T2 Update dependencies within major versions for both apps, restore `^` ranges; build, lint and local round trip pass; `npm audit` clean.
- [x] T3 API: upgrade to Express 5, plus a final error handler (`500 UNKNOWN`).
- [ ] T4 API: string checks for username and password, `404` for invalid ids, `400 USERNAME_EXISTS` on duplicate key.
- [ ] T5 API + web: single `401 INVALID_CREDENTIALS` for login; new message in AZ and EN.
- [ ] T6 API + web: rate limit on login and sign-up with `trust proxy`; `429` message in AZ and EN.
- [ ] T7 API: CORS allowlist from `CORS_ORIGINS` plus the preview pattern; `helmet`; `.env.example` and `render.yaml` updated.
- [ ] T8 Run every "Done when" check locally against `payflow-dev`.
- [ ] T9 (Murad) Set `CORS_ORIGINS` on Render, then merge; check the live API and run the smoke test.
- [ ] T10 Update `product/auth.md` (US-AUTH-02, new US-AUTH-07, fixed bugs removed), `architecture.md` and `roadmap.md`; set status to `done`.
- [x] T11 Swagger: use the relative server URL `/api`. Found during T3: Swagger still pointed to the deleted old Render service, so "Try it out" failed locally and in production.
