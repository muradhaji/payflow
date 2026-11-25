# Auth (`US-AUTH`)

Accounts use a **username and password** only. There is no email, no password reset and no password change.

## US-AUTH-01 Sign up
As a visitor, I can create an account, so that my payments are saved.
- The form has username, password and confirm password.
- On success I am logged in and taken to **Payments**.
- If the username is taken, I see "Username already exists."

## US-AUTH-02 Log in
As a user, I can log in with my username and password.
- On success I am taken to **Payments**.
- If I am already logged in and open `/login`, I am sent to **Payments**.
- The form uses the same field rules as sign-up, so even a wrong password must meet the password rules.
- An unknown username and a wrong password show the same message, "Incorrect username or password.", so the page does not reveal which usernames exist. *(Changed in 002.)*

## US-AUTH-03 Stay logged in
As a user, I stay logged in after closing the browser, for **30 days**.
- **(bug)** When the session expires, the app still shows me as logged in, but requests fail. I have to log out and in by hand.

## US-AUTH-04 Log out
As a user, I can log out from the user menu.
- If I am on a private page, I am sent to **Log in**. Otherwise I stay where I am.
- **(bug)** The previous user's installments stay in memory until the next load, so they can flash briefly for the next user on the same browser tab.

## US-AUTH-05 Delete my account
As a user, I can delete my account and all my installments.
- I open **Delete account** from the user menu, and a dialog asks for my password.
- On success I see a confirmation and I am logged out. **This cannot be undone.**
- With a wrong password I see "Incorrect password." and nothing is deleted.

## US-AUTH-06 Private pages
As a visitor, I cannot see payment pages without logging in.
- Every page under `/payments` sends a logged-out visitor to **Log in**.
- **(bug)** A logged-in user can still open `/signup`, and the home page **Get started** button always goes there.

## US-AUTH-07 Protection against password guessing
As a user, my account is protected from someone trying many passwords. *(Added in 002.)*
- After **10 failed logins** from one internet address within **15 minutes**, further login attempts from that address are refused for the rest of the 15 minutes, and the page shows "Too many attempts. Please try again in a few minutes."
- Successful logins do not count, so normal use is never blocked.
- Sign-up has the same limit, counting every attempt, to slow down mass account creation.
- Other people are not affected: the limit applies per internet address.

## Rules
| Field | Rule |
|---|---|
| Username | 6–20 characters, only lowercase letters `a–z` and digits `0–9`, unique |
| Password | 8–20 characters, at least one letter and one digit, no spaces |
| Confirm password | Must match the password (sign-up only) |

- Field errors appear under each field. Errors from the server appear under the submit button.
- **(bug)** A server error from one form stays visible after switching to the other form (e.g. a login error shows on **Sign up**).

## Screens
- **Log in** (`/login`) and **Sign up** (`/signup`): a centered card with the form and a link to the other form.
- **User menu** (top right of the header): shows the username when logged in, otherwise "Menu". It holds Payments, language and theme switches, then **Delete account** and **Log out**, or **Log in** when logged out.
- **Delete account dialog**: a warning that all data is removed permanently, a password field, and **Cancel** and **Confirm** buttons.
