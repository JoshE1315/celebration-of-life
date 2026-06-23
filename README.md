# Celebration of Life Website

A warm, dignified, and fully free invitation and RSVP website for a Celebration
of Life. It is built with plain HTML, CSS, and JavaScript, hosts for free on
GitHub Pages, and stores replies privately in a Google Sheet through Google
Apps Script. No frameworks, no databases, no paid services.

## What it does

- Presents a respectful invitation with a tribute, event details, and a
  schedule.
- Lets invited guests RSVP as attending, not attending, or tentative.
- Supports invitations for individuals, couples, and households, each with a
  maximum guest count enforced privately by the backend.
- Collects attendee names and optional dietary, accessibility, and memory
  information.
- Offers an Add to Calendar download.
- Works on phones, tablets, and computers, and meets basic accessibility needs.
- Keeps the guest list private. It is never placed in the website files.
- Runs in a safe demonstration mode before you connect anything.

## Quick start

1. Open `index.html` in a browser (or use the free Live Server extension in
   VS Code) to preview the site in demonstration mode.
2. Try the RSVP form with sample code `COL-001`.
3. Edit `js/config.js` to add your own details.
4. When ready, follow the docs to connect Google and publish.

## Project structure

```
celebration-of-life/
  index.html                  The page
  css/
    styles.css                Design system and styles (edit tokens at the top)
  js/
    config.js                 Your event details (edit this most)
    app.js                    Renders config into the page
    rsvp.js                   RSVP form behavior and demo mode
    calendar.js               Add to Calendar (.ics) feature
  assets/
    images/                   Your photos (with a README)
  google-apps-script/
    Code.gs                   The private backend
    appsscript.json           Backend manifest
    README.md                 Backend notes and the CORS explanation
  data/
    invitation-list-template.csv
    rsvp-responses-template.csv
    settings-template.csv
  docs/
    README.md                 Where to start
    SETUP.md
    GOOGLE-SHEETS-SETUP.md
    DEPLOYMENT.md
    CUSTOMIZATION.md
    PRIVACY.md
    TESTING.md
  README.md
  .gitignore
  LICENSE
```

## Documentation

Start with `docs/SETUP.md`. The full path is:

1. `docs/SETUP.md` - the big picture and local preview.
2. `docs/GOOGLE-SHEETS-SETUP.md` - the spreadsheet and backend.
3. `docs/DEPLOYMENT.md` - publishing with GitHub Pages.
4. `docs/CUSTOMIZATION.md` - changing words, colors, and photos.
5. `docs/PRIVACY.md` - the privacy design.
6. `docs/TESTING.md` - the testing checklist.

## A word on security

The website is public, so it never holds private data. The guest list, the
guest limits, and all trust live in the private Google Sheet and the Apps Script
backend. The website cannot keep secrets, and this project does not pretend it
can. See `google-apps-script/README.md` and `docs/PRIVACY.md`.

## Placeholders to replace

Search the project for the word `PLACEHOLDER`. Each one marks something for you
to fill in. The most important file is `js/config.js`. A full list is in the
final summary your developer notes, and in `docs/CUSTOMIZATION.md`.

## License

MIT. See `LICENSE`. The sample names in this project are fictional.
