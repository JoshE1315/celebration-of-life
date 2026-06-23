# Testing Checklist

Use this checklist to confirm the site works before and after you publish. You
can do all of this for free. Check each box as you go.

## How to test on different screens

- **Desktop**: open the site in your browser at full width.
- **Mobile and tablet**: either open the live link on your phone, or in a
  desktop browser press F12 to open developer tools and click the small device
  icon to simulate a phone. Try a narrow width and a tablet width.

## Display

- [ ] Desktop layout looks balanced, with the photo and text side by side.
- [ ] Mobile layout stacks neatly, and the menu button appears.
- [ ] The mobile menu opens and closes, and a link closes it.
- [ ] Text is readable and nothing overflows the screen.
- [ ] The "to be announced" notice shows while time and venue are TBD.
- [ ] After you set a time and venue in config.js, the notice disappears.

## Keyboard and screen reader

- [ ] Press Tab repeatedly from the top. Focus moves through the skip link,
      navigation, buttons, and every form field in a sensible order.
- [ ] A clear focus outline is visible on whatever is focused.
- [ ] The "Skip to main content" link appears when you Tab once, and works.
- [ ] Every form field has a label you can read.
- [ ] If you use a screen reader (Narrator on Windows, VoiceOver on Mac), the
      success and error messages are announced when they appear.

## RSVP form: validation

- [ ] Submit with empty required fields. Clear errors appear and focus moves to
      the first problem field.
- [ ] Enter an invalid email like `abc`. An email error appears.
- [ ] Enter an unknown code like `ZZZ-999`. A "could not find that code" message
      appears.
- [ ] Enter the inactive sample code `COL-004`. A "no longer active" message
      appears.
- [ ] Look up `COL-002` (limit 1) and try to choose more guests than allowed.
      The dropdown only offers up to the allowed number, and the server also
      rejects an over-limit value.

## RSVP form: behavior

- [ ] Look up `COL-001` and submit an **Attending** reply. A success message
      appears.
- [ ] Submit a **Not Attending** reply. The attendance fields hide, and a polite
      success message appears.
- [ ] Submit a **Tentative** reply (if enabled). A matching success message
      appears.
- [ ] Click the submit button quickly several times. Only one submission is
      processed (the button shows a loading state and is disabled).
- [ ] After connecting Google, submit again with the same code. The existing row
      is updated rather than duplicated.

## Special cases

- [ ] Enter a name with special characters, such as an accent or an apostrophe.
      It is accepted and stored correctly.
- [ ] Type a very long message. The counter warns you, and you cannot exceed the
      maximum length.
- [ ] Turn off your internet connection, then submit (with Google connected).
      A failure message appears with alternative contact instructions.

## Calendar

- [ ] Click "Add to Calendar". A `.ics` file downloads.
- [ ] Open the file. While the time is TBD, it appears as an all-day event on
      the event date.
- [ ] After you set a real time in config.js, the downloaded event shows the
      correct start and end times.

## Backend (after connecting Google)

- [ ] In the Apps Script editor, run `testAccess` and confirm the log lists your
      tabs.
- [ ] Run `testLookup` and confirm it returns a household.
- [ ] Run `testRsvp` and confirm a row appears in RSVP Responses.
- [ ] Cause a backend error on purpose (for example, temporarily rename a tab)
      and confirm the website shows a graceful failure message rather than
      breaking. Then restore the tab name.

## Final review

- [ ] Every placeholder in config.js has been replaced or intentionally left.
- [ ] The footer "Last updated" date is current.
- [ ] The sample household rows in the sheet have been replaced with real ones,
      or removed.
- [ ] You have tested the live link on a real phone.
