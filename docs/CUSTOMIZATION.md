# Customization

Almost everything you will want to change lives in one friendly file:
`js/config.js`. Colors and fonts live at the top of `css/styles.css`. This guide
walks through both.

## Editing the words and details: js/config.js

Open `js/config.js`. Each setting has a comment explaining it. To edit a value,
change the text inside the quotation marks. Keep the quotation marks and the
commas. Save the file and refresh the page.

### The person being honored

- `deceased.fullName` - the full name. Replace the placeholder.
- `deceased.lifespan` - the years, for example "1947 to 2026". Set to "" to hide.
- `deceased.introMessage` - the warm opening line.
- `deceased.portrait` - the path to the hero photo, for example
  `assets/images/portrait.jpg`. Leave "" to show a placeholder.
- `deceased.portraitAlt` - a short description of the photo for screen readers.

### Tribute

- `tribute.paragraphs` - a list of paragraphs. Add or remove lines.
- `tribute.quote` and `tribute.quoteAttribution` - an optional quotation.
- `tribute.familyMessage` - a message from the family.
- `tribute.photo` and `tribute.photoAlt` - an optional second photo.

### Event details

- `event.date` and `event.dateISO` - keep both in sync. `dateISO` uses the
  format YYYY-MM-DD and is used by the calendar.
- `event.startTimeDisplay`, `event.endTimeDisplay` - friendly times, or "TBD".
- `event.startTime24`, `event.endTime24` - 24-hour times for the calendar, for
  example "14:00", or "TBD".
- `event.venueName`, `event.streetAddress`, `event.city`, `event.state`,
  `event.zip` - the location. Use "TBD" for anything not yet known.
- `event.parking`, `event.dressCode`, `event.accessibility`, `event.reception` -
  practical guidance.
- `event.mapLink` - a map link, or "" to hide the map button.

When the time or venue is "TBD", the site automatically shows a gentle "to be
announced" notice. Once you fill those in, the notice disappears.

### Schedule

`schedule` is a list of cards. Each card has a `time`, a `title`, and a
`description`. Add, remove, or reorder them freely. Use "TBD" for a time that is
not set yet.

### RSVP settings

- `rsvp.deadlineDisplay` - the reply-by date shown to guests.
- `rsvp.allowTentative` - set to `false` to remove the Tentative option.
- `rsvp.collectChildrenNames` - set to `false` to hide the children field.
- `rsvp.collectMemories` - set to `false` to hide the message field.
- `rsvp.maxMessageLength` - the maximum message length in characters.
- `rsvp.maxGuestsCeiling` - the largest number the dropdown will ever show. The
  real per-invitation limit comes from your private sheet.

### FAQ

`faqs` is a list of question and answer pairs. Edit, add, or remove them.

### Contact and footer

- `contact.name`, `contact.email`, `contact.phone` - how guests reach you.
  Leave email or phone as "" to hide them.
- `footer.closingLine` - a respectful closing line.
- `footer.lastUpdated` - update this when you change the site.

### Backend connection

- `appsScriptUrl` - your deployed backend URL. Leave "" to stay in demo mode.
- `demoMode` - `true` for demo, `false` for real submissions.
- `requireInvitationCode` - `true` to require a code, `false` to let anyone RSVP.

## Changing the look: css/styles.css

Open `css/styles.css`. The block at the very top called `:root` holds the design
tokens. Change a value there to restyle the whole site.

### Colors

The color variables use warm, soft neutrals. To shift the mood, change these:

- `--color-bg` - the page background.
- `--color-accent` and `--color-accent-dark` - buttons and highlights.
- `--color-heading` - heading and footer color.

Keep good contrast between text and background so the site stays readable.

### Fonts

- `--font-display` - used for headings (a serif by default).
- `--font-body` - used for body text (a sans-serif by default).

These use fonts already on the visitor's device, so the site stays fast and
private with no external font service.

### Spacing and shape

- `--container-width` - the maximum content width.
- `--radius` - the roundness of corners.
- The `--space-*` variables control spacing throughout.

## Adding photos

1. Put your image files in `assets/images/`.
2. Set `deceased.portrait` and, if you like, `tribute.photo` in `config.js` to
   the file paths.
3. Always fill in the matching `...Alt` description.

See `assets/images/README.md` for tips on sizing.

## A note on text style

To keep the tone consistent and clear, the site avoids the em dash in visible
text. If you add your own wording, commas, periods, or parentheses read just as
well.
