# Installments (`US-INST`)

An **installment** is one purchase paid over several months: a title, a total amount and a schedule of monthly payments. The UI calls it a "payment" or a "debt" in different places (see Screens).

## US-INST-01 Add an installment
As a user, I can add an installment, and the app creates the monthly schedule for me.
- I enter a **title**, a **total amount**, a **start date** (default: the 1st of next month) and the **number of months** (default: 1).
- The schedule appears as I type: one payment per month, on the same day of the month as the start date.
- The total is split evenly, rounded down to the cent, and the leftover cents go to the **last** payment. Example: 100 ₼ over 3 months gives 33.33, 33.33 and 33.34.
- I can change each payment's amount, and its date within the same month.
- I can only save if the payments add up exactly to the total. Otherwise I see "Sum of monthly payments (X ₼) must equal total amount (Y ₼)."
- On success I am taken to the installment's details.

## US-INST-02 See all my installments
As a user, I can see all my installments as cards, newest first.
- Each card shows: title, a **PAID** or **ACTIVE** badge, total amount, monthly amount (the most common payment amount), amount paid so far, and a progress bar with a percentage.
- Clicking a card opens its details.
- With no installments, I see "You have not added any payments yet."

## US-INST-03 See one installment
As a user, I can open an installment and see everything about it.
- It shows the title, amount, start date, created and updated time, and two lists: **Paid** and **Remaining** payments.
- It has **Edit** and **Delete** buttons.

## US-INST-04 Edit an installment
As a user, I can change an installment's title, total amount and number of months.
- The start date cannot be changed.
- Paid payments are locked: their date and amount cannot be changed.
- Changing the total or the number of months rebuilds the **unpaid** payments: the remaining amount is split evenly over the remaining months, using the same rounding as [US-INST-01](installments.md#us-inst-01-add-an-installment).
- The number of months cannot be lower than the number of paid payments.
- **(bug)** The rebuild assumes the paid payments are the earliest months. If a later month was paid first, the rebuilt dates shift or overlap.
- **(bug)** Saving replaces the whole schedule. Unpaid payments get new IDs, and the server accepts whatever paid status and paid date the app sends.

## US-INST-05 Delete an installment
As a user, I can delete an installment with all its payments.
- A dialog asks "Are you sure you want to delete this payment? This action cannot be undone."
- On success I am taken back to **Payments**.

## Rules
| Field | Rule |
|---|---|
| Title | 3–50 characters |
| Total amount | More than 0, at most 2 decimals in the form, in AZN (₼) only |
| Number of months | Whole number, at least 1, no upper limit |
| Dates | Format `YYYY-MM-DD` |
| Monthly payments | Count equals the number of months, and the sum equals the total |

- **(bug)** The server checks the title length after trimming spaces, but saves the title with the spaces. The app does not trim at all.
- **(bug)** The server accepts impossible dates: `2024-02-31` is saved as 2 March.
- **(bug)** Dates are stored with a time. In time zones west of UTC they can show one day earlier.
- **(bug)** The server accepts amounts with more than 2 decimals, and it adds up payments slightly differently from the app, so in rare cases the app accepts a schedule that the server rejects.

## Screens
| Screen | Route | Title shown in the app |
|---|---|---|
| All installments | `/payments/all` | "All Debts" |
| Add | `/payments/add` | "Add Payment" |
| Details | `/payments/details/:id` | "Payment Details" |
| Edit | `/payments/edit/:id` | "Edit Payment" |

- Add and Edit use the same form: the fields at the top, and below them the schedule as rows of date and amount.
- The mix of "payment" and "debt" for the same thing is a naming issue to fix in the redesign (G3).
