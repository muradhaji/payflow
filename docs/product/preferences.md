# Preferences (`US-PREF`)

Language and theme are set from the user menu. They work without logging in and are remembered **in this browser only**, not in the account.

## US-PREF-01 Choose the language
As a user, I can switch the app between **Azerbaijani (AZ)** and **English (EN)**.
- On the first visit, the app uses the browser's language if it is AZ or EN. Otherwise it uses Azerbaijani.
- The language switch in the user menu shows the current language and lists AZ and EN.
- Month and day names in dates follow the chosen language.

## US-PREF-02 Choose light or dark theme
As a user, I can switch between a light and a dark theme with the **THEME** switch in the user menu.
- The default is **light**. It does not follow the device's dark mode setting.
- The browser's address bar color on mobile follows the theme.

## Known bugs
- **(bug)** The "THEME" label is always in English.
- **(bug)** The page always declares Azerbaijani as its language (`<html lang="az">`), even in English. This affects screen readers and browser translation.
- **(bug)** Amounts are formatted inconsistently: the monthly tiles use the browser's number format (e.g. `1,500`), and everything else shows plain numbers (`1500`).
