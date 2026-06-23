# Google Sheets and Backend Setup

This guide creates the private spreadsheet that stores replies, and the backend
script that connects it to the website. Take your time. Every step is spelled
out.

You will need a free Google account.

## Part A: Create the spreadsheet

1. Go to https://sheets.google.com and sign in.
2. Click the empty "Blank spreadsheet" to make a new sheet.
3. At the top left, click the name "Untitled spreadsheet" and rename it to
   something like **Celebration of Life RSVPs**.

## Part B: Add the four worksheets (tabs)

Your spreadsheet needs four tabs with these exact names:

- `Invitation List`
- `RSVP Responses`
- `Settings`
- `Summary`

The good news: you do not have to create the columns by hand. The backend can
build the headers for you in Part D. For now, just create the four tabs:

1. At the bottom, you will see one tab named "Sheet1". Double click it and
   rename it to `Invitation List`.
2. Click the small plus sign at the bottom left to add a new tab. Rename it to
   `RSVP Responses`.
3. Add another tab named `Settings`.
4. Add another tab named `Summary`.

Spelling and capitalization must match. If you prefer different names, you can
change them, but you must also update the names in the `CONFIG` block at the top
of `Code.gs`.

## Part C: Fill in your invitation list

Open the `Invitation List` tab. After Part D runs, it will have these column
headers:

Invitation ID, Household or Group Name, Primary Contact Name, Invited Guest
Names, Maximum Guests, Children Allowed, Email Address, Mobile Number, Preferred
Delivery Method, Invitation Sent, Date Sent, Current RSVP Status, Confirmed
Guest Count, Follow-Up Needed, Follow-Up Date, Organizer Notes, Active.

You can paste your households in now or after Part D. A ready example is in
`data/invitation-list-template.csv`. To import it:

1. In the spreadsheet, choose File > Import.
2. Choose Upload, then pick `data/invitation-list-template.csv`.
3. Under "Import location", choose "Replace data at selected cell" and select the
   `Invitation List` tab, cell A1. (Or "Replace current sheet".)
4. Click Import.

Important columns:

- **Invitation ID**: a short code like `COL-001`. Each household gets one. This
  is what guests type on the website.
- **Maximum Guests**: the true limit for that household. The backend enforces
  this. The browser cannot change it.
- **Children Allowed**: `Yes` or `No`.
- **Active**: `Yes` to accept replies for this invitation, `No` to turn it off.

The sample rows are clearly fictional. Replace them with your real households,
or delete them before going live.

## Part D: Add the backend script and build the headers

1. In the spreadsheet, choose **Extensions > Apps Script**. A new tab opens.
2. You will see a file called `Code.gs` with a small default function. Select
   all of that code and delete it.
3. Open `google-apps-script/Code.gs` from this project, copy everything, and
   paste it into the Apps Script editor.
4. Click the Save icon (the floppy disk) near the top.
5. At the top, find the function dropdown (it may say `doGet`). Choose
   **setupSheet**. Click **Run**.
6. The first time you run, Google asks you to authorize the script. Click
   **Review permissions**, choose your Google account, and allow access. If you
   see a screen that says the app is not verified, click **Advanced**, then
   **Go to (your project)**. This is normal for your own private script.
7. After it runs, switch back to the spreadsheet. The four tabs now have their
   headers, the `Settings` tab has default values, and the `Summary` tab has
   formulas.

## Part E: Test the backend

Still in the Apps Script editor:

1. Choose **testAccess** in the function dropdown and click Run. Then open
   **View > Logs** (or the Execution log). You should see your spreadsheet name
   and the four tab names.
2. Make sure your `Invitation List` has at least one active row with a code like
   `COL-001`. Then run **testLookup**. The log should show the household.
3. Run **testRsvp**. Check the `RSVP Responses` tab for a new row.

## Part F: Deploy as a web app

1. In the Apps Script editor, click **Deploy > New deployment**.
2. Click the gear icon next to "Select type" and choose **Web app**.
3. Fill in:
   - Description: anything, for example "RSVP backend".
   - Execute as: **Me**.
   - Who has access: **Anyone**.
4. Click **Deploy**. Authorize again if asked.
5. Copy the **Web app URL**. It ends in `/exec`.

Keep that URL handy for the next part.

## Part G: Connect the website to the backend

1. Open `js/config.js` in VS Code.
2. Paste your web app URL into `appsScriptUrl`, between the quotation marks.
3. Change `demoMode` from `true` to `false`.
4. Save the file.

Now the website sends real replies to your spreadsheet.

## Part H: Turn on email notifications for the family

Each time someone RSVPs, the backend can email you, your brother, and your
sister. The email shows who replied and the new running headcount. The headcount
counts PEOPLE, so if a guest brings four, the total goes up by four.

1. In the Apps Script editor, find the `CONFIG` block near the top of `Code.gs`.
2. Set `NOTIFY_EMAILS` to your three email addresses, like this:

   ```
   NOTIFY_EMAILS: ["you@gmail.com", "brother@gmail.com", "sister@gmail.com"],
   ```

3. Save the script.
4. The first time the script sends email it needs one extra permission. Choose
   the function `testNotify` in the dropdown and click Run, then authorize when
   asked. A sample email should arrive at all three addresses within a minute.
   (Check the spam folder the first time, then mark it "not spam".)
5. Because you changed the script, redeploy it: choose
   **Deploy > Manage deployments**, edit the existing deployment, and click
   **Deploy**. This keeps the same web app URL, so you do not need to change
   `config.js`.

Notes:

- The emails are sent FROM the Google account that deploys the script. Deploy
  from the account you are comfortable sending from.
- To see the totals any time without waiting for an email, open the `Summary`
  tab, which shows the confirmed guest count and more.
- To stop notifications, set `NOTIFY_EMAILS` back to `[]` and redeploy.
- A free Gmail account can send to plenty of recipients per day for an event
  like this, so the limit will not be a concern.

## About the Settings tab

The `Settings` tab lets you control a few values the backend reads, such as the
maximum message length and whether tentative replies are allowed. Edit the
Value column next to each setting. The website also has its own matching values
in `config.js` for the parts it shows.

## About the Summary tab

The `Summary` tab has formulas that count attending households, confirmed
guests, dietary requests, and more. These update automatically as replies come
in. If a count looks off, confirm your tab names match the ones in the `CONFIG`
block of `Code.gs`.

## If you change tab names later

If you rename a tab, also update the matching name in the `CONFIG` block at the
top of `Code.gs`, then save and redeploy (Deploy > Manage deployments > edit >
Deploy).

## Updating the script later

When you change `Code.gs`, save it, then choose **Deploy > Manage deployments**,
edit the existing deployment, and click **Deploy** again so the live URL uses
your new code. Creating a brand new deployment instead would give you a new URL,
which you would then need to paste into `config.js`.
