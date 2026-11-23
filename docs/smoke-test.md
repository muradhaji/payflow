# Smoke test

A manual check of the main user flows. Run it before the migration (baseline), after each deploy change, and at the end of the watch week.

Use a throwaway account: username `smoketest01`, with a password you keep in your password manager. Do not write the password here.

| # | Step | Expected result | Baseline (date: –) | After cutover (date: 2026-11-24) |
|---|---|---|---|---|
| 1 | Open the production site. The first request may take up to 60 s while the free Render API wakes up. | The home page loads | not run | passed |
| 2 | Sign up as `smoketest01` | You are logged in and see the payments area | not run | passed |
| 3 | Log out, then log in again | Login works | not run | passed |
| 4 | Add an installment: title "Smoke test", 300 ₼, 3 months, start next month | 3 payments of 100 ₼ each. The details page opens. | not run | passed |
| 5 | Edit it: new title, amount 450 | The schedule updates to 3 × 150 ₼ and the details page shows the new title | not run | passed |
| 6 | Under **Remaining**, select one payment and mark it paid | Success notification; the payment appears under **Paid** with today's date | not run | passed |
| 7 | Under **Paid**, cancel that payment | It goes back to **Remaining** | not run | passed |
| 8 | Switch the language az ↔ en and the theme light ↔ dark | The UI updates; nothing breaks | not run | passed |
| 9 | Delete the installment | It disappears from **All** | not run | passed |
| 10 | Delete the account (user menu, enter password) | You are logged out; logging in again fails | not run | passed |

Notes on anything that failed already at baseline (so the migration is not blamed for it):

-
