# PayFlow docs

| File | What it is |
|---|---|
| [`product/`](product/) | How the app works **now**: one file per feature, with user stories. Always kept up to date. |
| [`roadmap.md`](roadmap.md) | What we do next: goals and specs, in order. |
| [`specs/`](specs/) | One file per change: what, why, how and the task checklist. |
| [`architecture.md`](architecture.md) | Stack, apps, hosting. |
| [`cors.md`](cors.md) | Which websites may call the API, with diagrams. |
| [`smoke-test.md`](smoke-test.md) | 10-step manual check after a deploy. |
| [`archive/`](archive/) | Old documents kept as history. |

## How we work

1. **Pick** the next spec from `roadmap.md`.
2. **Write** `specs/NNN-name.md` from [`specs/_template.md`](specs/_template.md). Agree on it before coding.
3. **Do** the tasks one by one. Each change goes through a pull request.
4. **Update** the feature files in `product/` so they match the new behavior. This is the last task of every spec.
5. **Close:** mark the spec `done` in its file and in `roadmap.md`.

## Rules

- **IDs:** specs are `NNN-name` (one sequence, e.g. `004-shared-schemas`). User stories are `US-<AREA>-<nn>` (e.g. `US-PAY-02`), and IDs are never reused. Tasks are `T<n>` inside a spec.
- **Spec status:** `draft` → `approved` → `in progress` → `done` (or `dropped`).
- **Size:** a spec has at most about 15 tasks. If it needs more, split it.
- **Branches:** `NNN/short-name`, or `docs/short-name` for docs-only fixes.
- **Commits:** [Conventional Commits](https://www.conventionalcommits.org/) (`feat:`, `fix:`, `docs:`, `chore:`, `refactor:`, `test:`, `ci:`).

## Automation

These rules are enforced by GitHub, not by memory:

- `main` is protected: no direct pushes, no force pushes, no deletion. Changes arrive only by pull request.
- Pull requests can be merged only when the required CI checks pass (lint and build for the affected apps; added in spec 001).
- Every pull request starts from the [PR template](../.github/pull_request_template.md), which asks for the spec and task IDs.
