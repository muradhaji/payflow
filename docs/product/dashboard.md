# Dashboard and filters (`US-DASH`)

The **Payments** page (`/payments`) is the dashboard. It shows totals and links to filtered lists of payments. Everything is calculated in the browser from all of the user's installments.

## US-DASH-01 See my totals
As a user, I can see how much I owe in total, how much I have paid and how much remains.
- A card shows **TOTAL DEBT**, with a bar split into **PAID** and **REMAINING**, each with its amount and percentage.
- The total is the sum of all payments of all installments.

## US-DASH-02 Jump to a filtered list
As a user, I can open a list of exactly the payments I care about.
- The dashboard has one card per filter, each showing its amount and its share of the total:

| Card | Page | Shows |
|---|---|---|
| OVERDUE | `/payments/overdue` | Unpaid payments from **previous** months |
| THIS MONTH | `/payments/current` | Unpaid payments in the selected month (default: this month) |
| UNPAID | `/payments/remaining` | All unpaid payments |
| PAID | `/payments/paid` | All paid payments |
| ALL | `/payments/all` | All installments (see [US-INST-02](installments.md#us-inst-02-see-all-my-installments)) |

- The **OVERDUE** card is hidden when nothing is overdue.
- Each filter page shows the total of its payments, and one card per installment with the matching payments as rows. From here I can mark payments paid or unpaid (see [Payments](payments.md)).
- Each filter page has its own empty message, e.g. "You have no overdue payments for previous months."

## US-DASH-03 Look at another month
As a user, on **THIS MONTH** I can pick another month and see its unpaid payments.
- The month picker only offers months between my first and last payment.

## US-DASH-04 See payments per month
As a user, I can see how much is due in each month of a year.
- One tile per month that has payments, showing the month and the total of **all** payments in it, paid and unpaid.
- Arrows switch between the years that have payments. It starts at the year closest to today.
- A year without payments shows "No debts recorded for the year 2027."

## Rules
- "Overdue" means **before the current month**. A payment due earlier this month but not yet paid counts as "this month", not overdue.
- Months are compared in the browser's local time, so the date bug in [Installments](installments.md#rules) can move a payment into the previous month.

## Known bugs
- **(bug)** The page is named "This month" but can show any month, and the picked month resets to the current month when I leave the page.
- **(bug)** The monthly tiles mix paid and unpaid amounts, so they don't show what is still due in a month.

## Other pages
- **Home** (`/`): a short intro, **Get started** (goes to Sign up) and **View other projects** (an external link to the author's site).
- **Not found** (any unknown address): "Nothing to see here" with a button back to Home.
