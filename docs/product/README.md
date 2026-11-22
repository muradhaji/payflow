# Product: how PayFlow works now

PayFlow tracks installment purchases: you enter a total amount and a number of months, the app splits it into monthly payments, and you mark payments as paid.

One file per feature. Each file lists **user stories** ("As a user I can…") with acceptance criteria, then the **rules** and the **screens**. Known bugs are marked **(bug)**, so later specs can fix them on purpose. These files always describe the current app: every spec updates them in its last task.

| Feature | Stories | Status |
|---|---|---|
| [Auth](auth.md) | `US-AUTH` | done |
| [Installments](installments.md) | `US-INST` | done |
| [Payments](payments.md) | `US-PAY` | done |
| [Dashboard and filters](dashboard.md) | `US-DASH` | done |
| [Preferences](preferences.md) | `US-PREF` | to write |

## Glossary

| Term | Meaning |
|---|---|
| Installment | One purchase paid over several months. The app UI calls it "payment" or "debt". |
| Payment | One monthly part of an installment, with a date, an amount and a paid flag. |
