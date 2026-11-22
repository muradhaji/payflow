# Architecture

_Snapshot: 2026-11-21. This describes the system as it is before the monorepo. It is not a spec. Details and findings are in [`archive/assessment-2026-11.md`](archive/assessment-2026-11.md)._

## What it does

Installment tracker. A user creates an installment (title, total amount in AZN, number of months, start date). The app splits it into monthly payments, and the user marks payments as paid. Views: overdue, current month, remaining, paid, monthly stats. UI in Azerbaijani (default) and English.

## Apps

| | Web | API |
|---|---|---|
| Former repo | `muradhaji/payflow-frontend` | `muradhaji/payflow-backend` |
| Stack | React 19, Vite 6, Mantine 8, Redux Toolkit + redux-persist, axios, react-hook-form + yup, i18next, dayjs | Node, Express 4, Mongoose 8 (MongoDB Atlas), bcryptjs, jsonwebtoken, Swagger (`swagger-jsdoc`, `swagger-ui-express`) |
| Language | TypeScript (strict), ESM | TypeScript (strict), compiled to CommonJS with `tsc` |
| Hosting | Vercel (Hobby), SPA rewrite in `vercel.json` | Render (free web service) |
| Tests / lint | ESLint only | none |

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

**API docs:** Swagger UI at `/api-docs`. It is built at startup from JSDoc comments in `src/routes/*.ts`, read relative to the folder the server starts in.

Errors are returned as `{ message: ERROR_CODE }`. The web app translates the codes with i18n. JWTs are HS256 and valid for 30 days, stored in `localStorage`.

## Known issues carried into the monorepo

These are deliberately not fixed in 001 (see the assessment for details). Spec 002 addresses them first:

- C1: unhandled async errors crash the API.
- H1: vulnerable dependencies.
- H2/H3: payment state is client-controlled, and toggling it is not idempotent.
- H4: no rate limiting; usernames can be enumerated.
- M1/M2: dates and money representation.
