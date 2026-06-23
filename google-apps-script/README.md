# Google Apps Script Backend

This folder holds the private backend that records RSVP responses into your
Google Sheet. The website talks to this script. The script enforces the real
rules, because the website itself is public and cannot keep secrets.

## Files

- `Code.gs` - the full backend script. Paste this into the Apps Script editor.
- `appsscript.json` - the project manifest (timezone, runtime, web app access).
  This is optional to copy; the editor manages it for you, but it is here for
  reference and so the settings are documented.

## What the script does

1. Looks up an invitation code and returns only the household name, the maximum
   guests, whether children are allowed, and the current status. It never
   returns organizer notes, other households, or the full guest list.
2. Validates required fields for an RSVP.
3. Normalizes the invitation ID (uppercase, trims spaces).
4. Confirms the invitation exists and is marked Active.
5. Enforces the maximum guest limit using the value from your private sheet,
   not the value sent by the browser.
6. Creates a unique response ID.
7. Inserts a new response, or updates the existing one for the same invitation.
8. Keeps the original submission time and refreshes the last updated time.
9. Returns clear JSON for success or failure.

## Functions you can run from the editor

Open the editor, choose a function from the dropdown, then click Run.

- `setupSheet` - run this once. Creates any missing worksheets and adds the
  header rows, default settings, and summary formulas. Safe to run again.
- `testAccess` - confirms the script can read your spreadsheet. Check
  View > Logs for the result.
- `testLookup` - tries an invitation lookup. Edit the code inside first.
- `testRsvp` - simulates a submission so you can confirm rows are written.

## Deploying as a web app (short version)

Full beginner steps are in `docs/DEPLOYMENT.md`. In brief:

1. In the spreadsheet, choose Extensions > Apps Script.
2. Replace the default code with the contents of `Code.gs`.
3. Run `setupSheet` once and authorize when prompted.
4. Click Deploy > New deployment > Web app.
5. Set "Execute as" to **Me** and "Who has access" to **Anyone**.
6. Copy the web app URL (it ends in `/exec`).
7. Paste that URL into `js/config.js` as `appsScriptUrl`, and set
   `demoMode: false`.

## Why "Anyone" access is required, and why that is safe

A public website with no Google login must be able to reach the script, so the
web app access must be "Anyone". This does not expose your spreadsheet. Only the
small, controlled responses this script chooses to return are visible. The
spreadsheet itself stays private to your Google account. The script never
returns the guest list or organizer notes.

## The CORS situation, explained plainly

Browsers protect users by limiting cross-site requests. A normal JSON POST with
`Content-Type: application/json` would trigger a "preflight" check that Google
Apps Script cannot answer, and the request would fail.

The safe, free, widely used workaround is what this project does:

- The website sends the body as `Content-Type: text/plain`. This is treated as a
  "simple request" by browsers, so no preflight is needed, and Apps Script
  receives it fine. The script reads the raw text and parses it as JSON.
- Apps Script web apps return responses that the browser can read for this
  pattern, so the success and error messages work.

Because of how Apps Script works, you cannot set custom response headers such as
`Access-Control-Allow-Origin` to a specific site. That means you cannot use CORS
headers to limit which site may call the script. This is a known limitation of
the free platform.

## Abuse prevention guidance

Since the endpoint is public, consider these free measures:

- The script already locks during writes to avoid race conditions and ignores
  near-instant duplicate submissions for the same invitation.
- Requiring an invitation code (the default) means only people who received a
  code can create meaningful entries.
- You can set `ALLOWED_ORIGIN` in the CONFIG block to your site origin. Note the
  CORS limitation above means this is a soft signal, not a hard block, but it
  documents intent and you may extend the script to reject clear mismatches.
- If you ever see spam, you can redeploy with a new URL (which retires the old
  one), then update `config.js`. You can also add a simple shared secret word
  to the payload and check it in the script.
- Keep the spreadsheet itself private. Never share edit access publicly.

## What you may safely edit

- The `CONFIG` block at the top of `Code.gs` (tab names, allowed origin,
  duplicate window).
- The default values inside `SETTINGS_DEFAULTS`.

Everything else can be left as is.
