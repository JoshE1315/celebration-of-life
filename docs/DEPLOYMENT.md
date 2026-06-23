# Deployment with GitHub Pages

This guide puts your website online for free using GitHub Pages. Anyone with the
link will be able to view the invitation and RSVP.

You will need a free GitHub account.

## Before you start

Decide whether to connect Google first. You can publish in demonstration mode
and connect Google later, or connect Google first (see GOOGLE-SHEETS-SETUP.md)
and then publish. Either order works.

## Step 1: Create a GitHub account

1. Go to https://github.com and click Sign up.
2. Follow the prompts to create a free account and verify your email.

## Step 2: Create a repository

1. Once signed in, click the plus sign at the top right and choose
   **New repository**.
2. Give it a name, for example `celebration-of-life`.
3. Choose **Public**. (GitHub Pages on the free plan serves public sites. The
   page is public anyway; remember not to put private data in the website
   files.)
4. Leave the other options as they are and click **Create repository**.

## Step 3: Upload the files

You have two easy options.

### Option A: Upload in the browser (no software needed)

1. On the new repository page, click **uploading an existing file**.
2. Open this project folder on your computer. Select all the files and folders
   inside it (`index.html`, the `css`, `js`, `assets`, `data`, `docs`, and
   `google-apps-script` folders, plus `README.md`, `.gitignore`, and `LICENSE`).
3. Drag them into the browser upload area.
4. At the bottom, type a short message like "Add website", then click
   **Commit changes**.

### Option B: Use Git on your computer

If you have Git installed, open a terminal in the project folder and run:

```
git init
git add .
git commit -m "Add Celebration of Life website"
git branch -M main
git remote add origin https://github.com/YOUR-USERNAME/celebration-of-life.git
git push -u origin main
```

Replace `YOUR-USERNAME` with your GitHub username.

## Step 4: Turn on GitHub Pages

1. In your repository, click **Settings**.
2. In the left menu, click **Pages**.
3. Under "Build and deployment", set Source to **Deploy from a branch**.
4. Set the branch to **main** and the folder to **/ (root)**.
5. Click **Save**.

## Step 5: Find your website address

1. Wait one to two minutes.
2. Refresh the Pages settings screen. It will show a message like
   "Your site is live at https://YOUR-USERNAME.github.io/celebration-of-life/".
3. Click the link to view your live site.

Share that link in your invitations.

## Step 6: Record your origin for the backend (optional)

Your site origin is the first part of that address, for example
`https://YOUR-USERNAME.github.io`. If you wish, open `google-apps-script/Code.gs`,
set `ALLOWED_ORIGIN` to that origin in the `CONFIG` block, save, and redeploy.
See the note in `google-apps-script/README.md` about why this is a soft signal
rather than a hard block.

## Step 7: Test the live site

Open the live link on a phone and on a computer. Walk through the testing
checklist in **TESTING.md**. Try a real RSVP using a sample code and confirm the
row appears in your spreadsheet.

## Updating the site later

Whenever you change a file (for example, when the venue and time are confirmed):

- If you uploaded in the browser, open the file in your repository, click the
  pencil icon to edit, paste the new content, and commit. Or use "Add file >
  Upload files" to replace files.
- If you use Git, run `git add .`, then `git commit -m "Update details"`, then
  `git push`.

GitHub Pages republishes automatically within a minute or two.

## When the venue and time are finalized

1. Open `js/config.js`.
2. Replace the `TBD` values for `startTimeDisplay`, `endTimeDisplay`,
   `startTime24`, `endTime24`, `venueName`, `streetAddress`, and `zip`.
3. Add a `mapLink` if you have one.
4. Save, commit, and push (or upload) the change.

The "to be announced" notice disappears automatically once those values are
filled in, and the calendar download switches from an all-day event to a timed
event.
