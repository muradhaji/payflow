# Payments (`US-PAY`)

A **payment** is one monthly part of an installment. It is either paid or not paid. There are no partial payments.

## US-PAY-01 Mark payments as paid
As a user, I can select one or more unpaid payments and mark them as paid in one step.
- I select payments with the checkbox on each row. **ALL** selects every payment on the page, and the checkbox in a card's header selects all payments of that installment.
- The **COMPLETE** button shows the total of the selected payments. It is disabled until something is selected.
- On success I see "Payments completed successfully.", the selection is cleared, and each payment gets **today** as its paid date.
- Available on the **Overdue**, **This month** and **Remaining** pages, and in the **Remaining** list on an installment's details.

## US-PAY-02 Undo a payment
As a user, I can mark paid payments as unpaid again, for example after a mistake.
- Same selection as [US-PAY-01](payments.md#us-pay-01-mark-payments-as-paid). The button is **CANCEL**.
- On success I see "Payments cancelled successfully." and the paid date is removed.
- Available on the **Paid** page and in the **Paid** list on an installment's details.

## US-PAY-03 See when I paid
As a user, I can see the paid date of each paid payment ("Paid: 5 Mar, 2026").

## Rules
- The paid date is always the moment I click. I cannot record a payment made on another day.
- Paid payments are locked when editing an installment (see [US-INST-04](installments.md#us-inst-04-edit-an-installment)).

## Known bugs
- **(bug)** The server **flips** each selected payment instead of setting it. Both buttons call the same action, so a double-click, a network retry or a second open tab can turn "mark as paid" into "mark as unpaid".
- **(bug)** The checkbox in a card's header can't clear that installment's selection unless every payment on the page is selected.
- **(bug)** If a selected payment no longer exists (for example after the installment was edited in another tab), it is skipped silently and the success message still shows.

## Screens
- The pages **Overdue**, **This month**, **Remaining** and **Paid** show one card per installment, each with its matching payments as rows. See [Dashboard and filters](dashboard.md).
- An installment's details have two cards, **Paid** and **Remaining**, each with **ALL** and its action button. See [US-INST-03](installments.md#us-inst-03-see-one-installment).
