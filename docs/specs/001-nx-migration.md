# 001 — Nx migration

**Status:** in progress · **Goal:** G1 · **Affects:** infra, web, api, docs · **Stories:** none (no behavior change)

## Why
The frontend and backend live in two repos with duplicated models, validation and error codes. A change to both needs two PRs and two deploys in the right order, and there is no CI.

## What
Both apps in one Nx monorepo with their git history, CI on every PR, and both deployed from here. **Behavior stays exactly the same.**

Two small fixes are included because the move needs them anyway:
- The web app reads the API URL from `VITE_API_BASE_URL`. Today the env var is ignored and every build talks to production.
- Folder renames: `componenets` → `components`, `InstallmentDetails.tsx/` → `InstallmentDetails/`.

**Not included:** security fixes (002), dependency upgrades, shared libs (004), Nx plugins, tests, staging.

## Done when
1. `git log --follow apps/web/src/App.tsx` and `apps/api/src/index.ts` show the original 2025 commits.
2. On a fresh clone, `npm ci && npx nx run-many -t build` works, and the second run comes from the cache.
3. A PR that changes only `apps/api` builds only the API in CI, and Vercel skips the web build.
4. Production web (same Vercel domain) uses the new Render API and passes [`smoke-test.md`](../smoke-test.md).
5. Logged-in users stay logged in after the switch (same `JWT_SECRET`), and `/api-docs` on the new API lists all endpoints.
6. Direct pushes to `main` are rejected, and PRs can't be merged until CI passes.
7. The old Render service is deleted and the old repos are archived.

## How
- **Repo:** public `muradhaji/payflow`. Public, because GitHub Free only enforces branch rules on public repos. The old repos are public too, and their history has no secrets. Old repos get **archived, not deleted**.
- **Workspace:** created with `nx init` in an empty repo, plus npm workspaces (`apps/*`, `libs/*`). No plugins: each app keeps its own `package.json` scripts, and Nx runs and caches them.
- **Import:** `nx import` brings each repo in with history, as `apps/web` and `apps/api`. Projects are named `@payflow/web` and `@payflow/api`.
- **One lockfile:** after import, compare installed versions against the old repos (`npm ls --depth=0`) and pin any direct dependency that drifted. Upgrades happen in 002, on purpose.
- **Node:** pinned in `.nvmrc` to the version Render uses today.
- **CI:** GitHub Actions runs `nx affected -t lint build` on every PR. It becomes a required check on `main`.
- **API on Render (free):** a **new** service from a committed `render.yaml`.
  - Build: `npm ci --workspace=@payflow/api --include-workspace-root --include=dev && npx nx build @payflow/api`. `--include=dev` keeps TypeScript installed even if Render sets `NODE_ENV=production`.
  - Start: `cd apps/api && node dist/index.js`. Swagger reads `src/routes/*.ts` relative to the start folder, so starting from the repo root would leave `/api-docs` empty.
  - It rebuilds only when `apps/api/**` or the root config changes (build filter).
  - It uses the same `MONGO_URI` and `JWT_SECRET` as the old service, entered in the dashboard and never committed.
- **Web on Vercel (Hobby):** the **existing** project is reconnected to this repo, so the domain stays.
  - Root directory: `apps/web`
  - Build: `npx nx build @payflow/web`
  - Output: `dist`
  - Ignored build step: `npx nx-ignore@latest @payflow/web`
  - `VITE_API_BASE_URL` = the new Render URL
- **Switch with no downtime:**
  1. The new API runs next to the old one; both use the same database.
  2. Point Vercel at the new API.
  3. Watch for about a week.
  4. Delete the old service.
- **Rollback:**
  - API problem: set `VITE_API_BASE_URL` back to the old API and redeploy.
  - Web problem: in Vercel, promote the previous deployment.

## Tasks

**Who does what:** Claude does one task at a time and asks before every commit. A yes covers commit, push and PR. Murad merges. Tasks marked **(Murad)** need a dashboard or secret values.

**Prepare**
- [x] T1 Clean both old repos. The only change was a stale `sass` section in the frontend lockfile, which was discarded.
- [ ] T2 (Murad) Send the old Render and Vercel settings: region, build/start commands, root directory, Node version, env var **names** only.
- [ ] T3 (Murad) Run `smoke-test.md` once on today's production.

**Repo**
- [x] T4 Create the workspace (`nx init`, npm workspaces). Commit `5cb35ff`.
- [x] T5 Create the public GitHub repo and protect `main` (ruleset `protect-main`: PR required, threads resolved, no force push, no deletion).
- [x] T6 Add the docs and PR template. Branch `001/docs`.

**Import** (branch `001/import-apps`)
- [x] T7 `nx import` both repos from GitHub into `apps/web` and `apps/api`, with history kept. First, `feature/swagger` was merged into the old backend `main` ([payflow-backend#1](https://github.com/muradhaji/payflow-backend/pull/1)), because production already ran it.
- [x] T8 Rename the packages to `@payflow/web` and `@payflow/api`. Keep one root lockfile, and pin any direct dependency that drifted.
- [x] T9 Build both apps, and start both locally against a non-production database. Done against `payflow-dev`: builds, cache and lint pass, and the API passed a signup-to-delete round trip.

**Config** (branch `001/nx-config`)
- [x] T10 Cache `build` outputs (`{projectRoot}/dist`). Pin Node in `.nvmrc`. Add root `dev`/`build`/`lint` scripts.
- [x] T11 Read the API URL from `VITE_API_BASE_URL`. Add `.env.example` files, with local `PORT=5050`: on macOS, port 5000 is taken by AirPlay Receiver.
- [x] T12 Folder renames, as two separate commits.

**CI** (branch `001/ci`)
- [x] T13 Add a workflow that runs `nx affected -t lint build`, then make it a required check on `main`.

**Deploy**
- [ ] T14 Add `render.yaml`. (Murad) Create the service from it in Render and enter the secrets. Check that the API answers.
- [ ] T15 (Murad) In Vercel: set `VITE_API_BASE_URL`, reconnect the project to this repo and apply the settings above. Deploy and run the smoke test.

**Finish**
- [ ] T16 After a stable week: delete the old Render service, and archive both old repos with a "moved to payflow" README.
- [ ] T17 Update `architecture.md` and `roadmap.md`, and set status to `done`.
