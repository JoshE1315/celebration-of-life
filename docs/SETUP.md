# Setup

Welcome. This guide gives you the big picture and shows how to preview the site
on your own computer. You do not need to be a developer.

## How the project fits together

There are three parts.

1. **The website** (the `index.html`, `css`, and `js` folders). This is what
   guests see. It is plain HTML, CSS, and JavaScript. No frameworks, no
   accounts, no cost.
2. **The spreadsheet** (a Google Sheet you create). This privately stores your
   guest list and the replies. Only you can open it.
3. **The backend** (a Google Apps Script you paste in). This is the safe bridge
   between the public website and your private spreadsheet.

You can use the website by itself in demonstration mode right away. The Google
parts are added when you are ready to collect real replies.

## What you need

- A web browser (you already have one).
- A free GitHub account, later, to publish the site.
- A free Google account, later, for the spreadsheet and backend.
- The free VS Code editor, which you are using now.

## Step 1: Preview the site in demonstration mode

The site ships in demonstration mode, so nothing is sent anywhere yet.

The simplest way to preview:

1. In VS Code, install the free "Live Server" extension if you wish, or simply
   open the file directly.
2. To open directly, find `index.html` in the file list, right click it, and
   choose "Reveal in File Explorer" (Windows) or "Reveal in Finder" (Mac), then
   double click the file to open it in your browser.

A note about opening the file directly: most features work, but the calendar
download and the form behave best when the page is served by a small local
server. The free "Live Server" extension does this with one click. After
installing it, right click `index.html` and choose "Open with Live Server".

## Step 2: Try the demonstration

On the page:

- Read the invitation, tribute, details, and schedule.
- Click "Add to Calendar" to download a calendar file.
- Scroll to RSVP. Enter one of the sample codes and click "Find my invitation":
  - `COL-001` (Sample Family One, up to 4 guests, children allowed)
  - `COL-002` (Sample Guest Two, 1 guest, adults only)
  - `COL-003` (Example Household Three, up to 6 guests)
  - `COL-004` (an inactive example, used to test the "not active" message)
- Fill in the form and submit. In demonstration mode you will see a success
  message that confirms nothing was actually sent.

## Step 3: Make it yours

Open `js/config.js` and replace the placeholders with your real details. See
**CUSTOMIZATION.md** for a guided tour of every setting. Save the file and
refresh the page to see your changes.

## Step 4: Connect Google (when ready)

Follow **GOOGLE-SHEETS-SETUP.md** to create the spreadsheet and backend, then
paste the backend URL into `config.js`.

## Step 5: Publish (when ready)

Follow **DEPLOYMENT.md** to put the site online for free with GitHub Pages.

## Quick reference: which file holds what

- Event words, dates, schedule, FAQ, contact: `js/config.js`
- Colors, fonts, spacing: the top of `css/styles.css`
- Page structure: `index.html`
- Form behavior: `js/rsvp.js`
- Calendar file: `js/calendar.js`
- Backend rules: `google-apps-script/Code.gs`

You will mostly edit `js/config.js`.
