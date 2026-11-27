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
2. **Write** `specs/NNN-name.md` from [`specs/_template.md`](specs/_template.md). Agree on it before coding. In the same pull request, link the spec in its `roadmap.md` row and change every `[NNN](roadmap.md)` link for it to the new file (search `docs/` for `[NNN](`). No check does this for you.
3. **Do** the tasks one by one. Each change goes through a pull request.
4. **Update** the feature files in `product/` so they match the new behavior. This is the last task of every spec.
5. **Close:** mark the spec `done` in its file and in `roadmap.md`.

## Rules

- **IDs:** specs are `NNN-name` (one sequence, e.g. `004-shared-schemas`). User stories are `US-<AREA>-<nn>` (e.g. `US-PAY-02`), and IDs are never reused. Tasks are `T<n>` inside their own spec and `NNN/Tn` (e.g. `002/T7`) anywhere else.
- **Links:** whenever you mention one of these, link it, so no one has to search:

  | Mention | Link to | Example |
  |---|---|---|
  | a spec | its file | [spec 002](specs/002-backend-hardening.md) |
  | a planned spec (not written yet) | [`roadmap.md`](roadmap.md), with the number as link text | `[NNN](roadmap.md)` |
  | a task outside its own spec | the spec's Tasks section | [002/T7](specs/002-backend-hardening.md#tasks) |
  | a user story | its heading in `product/` | [US-AUTH-07](product/auth.md#us-auth-07-protection-against-password-guessing) |
  | an assessment finding (C1, H4, …) | the assessment's Findings section | [C1](archive/assessment-2026-11.md#4-findings) |

  Inside a spec, its own tasks need no link. In PR descriptions use full GitHub URLs (`https://github.com/muradhaji/payflow/blob/main/docs/…`), because relative links don't work there. CI checks every link and anchor (see [Automation](#automation)).
- **Spec status:** `draft` → `approved` → `in progress` → `done` (or `dropped`).
- **Size:** a spec has at most about 15 tasks. If it needs more, split it.
- **Branches:** `NNN/short-name`, `docs/short-name` for docs-only fixes, or `ci/short-name` for CI changes outside a spec.
- **Commits:** [Conventional Commits](https://www.conventionalcommits.org/) (`feat:`, `fix:`, `docs:`, `chore:`, `refactor:`, `test:`, `ci:`).

## Automation

These rules are enforced by GitHub, not by memory:

- `main` is protected: no direct pushes, no force pushes, no deletion. Changes arrive only by pull request.
- Pull requests can be merged only when the required check `ci-ok` passes: formatting, doc links, and lint, build and tests for the affected apps (CI added in [spec 001](specs/001-nx-migration.md); jobs in [`architecture.md`](architecture.md#ci-and-branch-rules)).
- Every pull request starts from the [PR template](../.github/pull_request_template.md), which asks for the spec and task IDs.
- CI runs `npm run docs:links` ([remark-validate-links](https://github.com/remarkjs/remark-validate-links)): a pull request fails if a link in `docs/` points to a missing file or heading. It does **not** know when a planned spec gets written; that step is manual (see [How we work](#how-we-work), step 2).
