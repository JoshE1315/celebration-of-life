# Privacy

This project is built to collect as little as needed and to keep it private.
This document explains the design so you can stand behind it, and so you can
adjust the visible privacy notice if you wish.

## What guests see

A plain-English privacy notice is built into the website footer, under the
"Privacy notice" button. It explains what is collected, why, where it is stored,
and how to ask for a correction or deletion. You can edit that wording in
`index.html` inside the `privacy-notice` block.

## What is collected

Only what a guest chooses to enter on the RSVP form:

- Name and reply (attending, not attending, or tentative).
- Number and names of those attending.
- Optional: email, phone, dietary needs, accessibility needs, and a short
  message or memory.

The site uses no advertising and no tracking cookies. There are no third party
analytics scripts. The page even asks search engines not to index it.

## Where it is stored

- The public web page is hosted on GitHub Pages.
- When a guest submits the form, Google Apps Script receives it and writes it to
  a Google Sheet that only the family can open.
- The guest list itself lives only in that private sheet. It is never placed in
  the website files.

## Privacy choices built into the code

- **The guest list is never public.** The website does not contain names,
  emails, phone numbers, or invitation records. Codes are checked by the private
  backend, which returns only the household name, the guest limit, whether
  children are allowed, and the current status.
- **Organizer notes stay private.** The backend never returns the Organizer
  Notes column or any other household's data.
- **No personal data in the browser console.** The scripts avoid logging
  personal details.
- **Light input cleaning on both sides.** The browser trims input and removes
  angle brackets; the backend cleans again and caps lengths. Never trust the
  browser alone, which is why the backend repeats the checks.
- **Public vs private is clearly separated.** Memories posted to the Memory
  Wall appear publicly on the page (immediately, unless you turn approval back
  on in the backend). Uploaded photos appear publicly only after the family
  approves them. Anything sent through Contact the Family, or the message box on
  the RSVP form, goes only to the family and is never posted publicly.
- **No-referrer and no-index hints.** The page sends a no-referrer policy and
  asks crawlers not to index it. These are courtesy measures, not guarantees.

## An honest limit

GitHub Pages is a public web host, and any website file can be read by anyone.
That is why this project never stores private data in the website. All trust and
all limits are enforced by the private Apps Script backend. We do not claim the
website can keep secrets, because it cannot. We keep secrets in the sheet.

## Corrections and deletion

A guest can update their own RSVP by submitting the form again with the same
invitation code. To correct or delete information by hand, the family opens the
private Google Sheet and edits or removes the relevant row. The visible privacy
notice tells guests to contact the family for this.

## What this project does not claim

This is a respectful family tool, not a legal compliance product. The privacy
notice avoids legal promises that cannot be guaranteed. If you have specific
legal obligations, seek your own advice. The notice is written to be honest and
clear rather than to make claims it cannot keep.
