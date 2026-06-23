/* =============================================================================
 * Code.gs  -  Google Apps Script backend for the Celebration of Life RSVP site
 * =============================================================================
 *
 * WHAT THIS DOES
 *   - Receives RSVP form submissions from the public website as JSON.
 *   - Optionally looks up an invitation code and returns only the small amount
 *     of information needed for that one invitation.
 *   - Validates and saves responses into your private Google Sheet.
 *   - Enforces the real per-invitation guest limit on the server, where the
 *     browser cannot change it.
 *
 * IMPORTANT SECURITY REALITY
 *   The website is hosted on GitHub Pages, which is PUBLIC. You cannot hide any
 *   secret in the website files. Therefore ALL trust and limits are enforced
 *   HERE, in this script, which runs privately on Google's servers. Never rely
 *   on numbers sent by the browser (such as the guest limit). This script reads
 *   the true limit from your private sheet every time.
 *
 * WHAT YOU MAY SAFELY EDIT
 *   - The CONFIG block immediately below (sheet/tab names, allowed origin).
 *   - The default Settings values in setupSheet().
 *   Everything else can be left as is.
 *
 * See google-apps-script/README.md for full step-by-step deployment help.
 * ========================================================================== */


/* ===========================================================================
 * CONFIG  -  safe to edit
 * ======================================================================== */
var CONFIG = {
  // Tab (worksheet) names inside your Google Sheet. Match these exactly.
  INVITATION_SHEET: "Invitation List",
  RESPONSE_SHEET: "RSVP Responses",
  SETTINGS_SHEET: "Settings",
  SUMMARY_SHEET: "Summary",

  // OPTIONAL allowlist for your live website origin. Apps Script cannot fully
  // block other origins (see the CORS note in the README), but recording the
  // expected origin is useful and you may reject obvious mismatches if you
  // choose. Leave as "" to skip this soft check.
  // Example: "https://yourname.github.io"
  ALLOWED_ORIGIN: "",

  // A simple guard against accidental flooding: ignore identical-looking
  // submissions for the same invitation within this many seconds.
  DUPLICATE_WINDOW_SECONDS: 5,

  // ---------------------------------------------------------------------------
  // EMAIL NOTIFICATIONS
  // Put the email addresses of the people who should be notified each time
  // someone RSVPs. Usually you, your brother, and your sister.
  // Example: ["you@gmail.com", "brother@gmail.com", "sister@gmail.com"]
  // Leave the list empty [] to turn notifications off.
  // NOTE: The emails are sent FROM the Google account that deploys this script,
  // so deploy it from the account you are comfortable sending from.
  // ---------------------------------------------------------------------------
  NOTIFY_EMAILS: ["joshe1315@gmail.com", "amie.ehlin@gmail.com", "shane.ehlin@gmail.com"],

  // Send a notification only for replies that affect the headcount
  // (Attending and Tentative). Set to true to also notify on "Not Attending".
  NOTIFY_ON_NOT_ATTENDING: true,

  // A friendly label used in the notification email subject line.
  EVENT_LABEL: "Celebration of Life",

  // ---------------------------------------------------------------------------
  // OPEN / SHARED GUEST CODES  -  let friends forward the invitation
  // Anyone who types one of these codes can RSVP, and EACH submission becomes
  // its own new row (it never overwrites someone else). Use this when you are
  // happy for friends to pass the link along to others.
  // Add or change the words below. They are matched in a case-insensitive way.
  // Leave the list empty [] to turn the shared option off.
  // ---------------------------------------------------------------------------
  OPEN_CODES: ["FRIEND"],

  // What a shared-code guest sees as their group name and their guest limit.
  OPEN_HOUSEHOLD_LABEL: "Guest of the Ehlin Family",
  OPEN_MAX_GUESTS: 6,
  OPEN_CHILDREN_ALLOWED: true,

  // ---------------------------------------------------------------------------
  // MEMORY WALL  -  public messages from friends and family
  // Visitors can post a short memory. To prevent spam or anything unkind from
  // showing automatically, posts are hidden until you approve them.
  // - true  = a memory shows on the site only after you set its Approved cell
  //           to Yes in the Memories tab. (Recommended.)
  // - false = memories appear on the site immediately. Use only if you are
  //           confident the audience is small and trusted.
  // ---------------------------------------------------------------------------
  MEMORIES_SHEET: "Memories",
  MEMORIES_REQUIRE_APPROVAL: false,
  MEMORIES_MAX_LENGTH: 2000,

  // ---------------------------------------------------------------------------
  // CONTACT FORM  -  "Contact the Family" messages
  // Messages are emailed to NOTIFY_EMAILS and also saved to this tab as a
  // record. The family can reply directly to the sender's email.
  // ---------------------------------------------------------------------------
  CONTACT_SHEET: "Contact Messages",
  CONTACT_MAX_LENGTH: 3000,

  // ---------------------------------------------------------------------------
  // PHOTO WALL  -  visitors submit photos that appear in the hero slideshow
  // Photos ALWAYS need your approval before they show, because images are
  // public and cannot be un-seen. Approve by setting the Approved cell to Yes
  // in the Photos tab. Uploaded files are stored in a Google Drive folder.
  // ---------------------------------------------------------------------------
  PHOTOS_SHEET: "Photos",
  PHOTOS_FOLDER_NAME: "Celebration of Life Photos",
  PHOTOS_MAX_BYTES: 10 * 1024 * 1024, // reject decoded images larger than this
  PHOTOS_MAX_RETURNED: 50,            // most photos to show in the slideshow

  // Who receives the photo-approval email. Because the photos live in the Drive
  // of whoever deployed this script, only that person can approve them, so
  // these emails go to just that person by default. (RSVP, memory, and contact
  // emails still go to everyone in NOTIFY_EMAILS.)
  PHOTOS_APPROVER_EMAILS: ["joshe1315@gmail.com"],

  // ---------------------------------------------------------------------------
  // TEXT MESSAGE ALERTS  -  a short text so you do not miss an email
  // This uses each carrier's free email-to-text gateway. Add an address in the
  // form number@gateway. Common gateways:
  //   T-Mobile:  number@tmomail.net
  //   AT&T:      number@txt.att.net
  //   Google Fi: number@msg.fi.google.com
  //   Cricket:   number@sms.cricketwireless.net
  //   Verizon:   number@vtext.com  (often unreliable; Verizon has limited this)
  // These gateways are free but carrier-dependent and not guaranteed.
  // ---------------------------------------------------------------------------
  SMS_ALERTS: {
    enabled: true,
    recipients: ["8503196229@tmomail.net"], // Josh, T-Mobile
    onRsvp: true,
    onPhoto: true,
    onContact: true,
    onMemory: false,
  },
};


/* ===========================================================================
 * COLUMN DEFINITIONS  -  the headers created by setupSheet()
 * Do not reorder casually; the code looks columns up by header name, so it is
 * resilient, but keeping these in sync with your sheet is clearest.
 * ======================================================================== */
var INVITATION_HEADERS = [
  "Invitation ID", "Household or Group Name", "Primary Contact Name",
  "Invited Guest Names", "Maximum Guests", "Children Allowed", "Email Address",
  "Mobile Number", "Preferred Delivery Method", "Invitation Sent", "Date Sent",
  "Current RSVP Status", "Confirmed Guest Count", "Follow-Up Needed",
  "Follow-Up Date", "Organizer Notes", "Active",
];

var RESPONSE_HEADERS = [
  "Submission Timestamp", "Invitation ID", "Household or Group Name",
  "Primary Guest Name", "Email Address", "Mobile Number", "RSVP Status",
  "Number Attending", "Attendee Names", "Children's Names", "Dietary Needs",
  "Accessibility Needs", "Guest Message or Memory", "Submission Source",
  "Last Updated", "Response ID",
];

var MEMORIES_HEADERS = [
  "Timestamp", "Name", "Memory", "Approved", "Memory ID",
];

var CONTACT_HEADERS = [
  "Timestamp", "Name", "Email", "Message", "Message ID",
];

var PHOTOS_HEADERS = [
  "Timestamp", "Name", "Caption", "File ID", "View URL", "Approved", "Photo ID",
];

var SETTINGS_DEFAULTS = [
  ["Setting", "Value"],
  ["RSVP Deadline", "August 1, 2026"],
  ["Organizer Contact Email", "PLACEHOLDER: family@example.com"],
  ["Organizer Contact Phone", "PLACEHOLDER: (555) 555-5555"],
  ["Event Date", "August 22, 2026"],
  ["Event Time", "TBD"],
  ["Venue Name", "TBD"],
  ["Venue Address", "Ocean City, New Jersey"],
  ["Maximum Message Length", "1000"],
  ["Allow Tentative Responses", "Yes"],
  ["Collect Children Names", "Yes"],
  ["Collect Memories", "Yes"],
];


/* ===========================================================================
 * WEB ENTRY POINTS
 * ======================================================================== */

/**
 * Handles GET requests. Used for invitation-code lookup:
 *   ...exec?action=lookup&code=COL-001
 */
function doGet(e) {
  try {
    var params = (e && e.parameter) || {};
    if (params.action === "lookup") {
      return jsonResponse(handleLookup(params.code));
    }
    if (params.action === "memories") {
      return jsonResponse(handleListMemories());
    }
    if (params.action === "photos") {
      return jsonResponse(handleListPhotos());
    }
    // One-click photo moderation from the approval email. These return a small
    // web page (not JSON) so the family sees a friendly confirmation.
    if (params.action === "approvePhoto") {
      return moderatePhotoFromLink(params.id, params.t, "Yes");
    }
    if (params.action === "declinePhoto") {
      return moderatePhotoFromLink(params.id, params.t, "Declined");
    }
    // A plain visit confirms the service is alive without leaking anything.
    return jsonResponse({ ok: true, service: "Celebration of Life RSVP", message: "Service is running." });
  } catch (err) {
    return jsonResponse({ ok: false, message: "Server error." });
  }
}

/**
 * Handles POST requests. Used for RSVP submissions.
 * The website sends the body as text/plain JSON to avoid a CORS preflight that
 * Apps Script cannot answer. We parse the raw body here.
 */
function doPost(e) {
  try {
    var body = {};
    if (e && e.postData && e.postData.contents) {
      body = JSON.parse(e.postData.contents);
    }

    if (body.action === "lookup") {
      return jsonResponse(handleLookup(body.code));
    }

    if (body.action === "memory") {
      return jsonResponse(handleMemory(body));
    }

    if (body.action === "contact") {
      return jsonResponse(handleContact(body));
    }

    if (body.action === "photo") {
      return jsonResponse(handlePhoto(body));
    }

    return jsonResponse(handleRsvp(body));
  } catch (err) {
    return jsonResponse({ ok: false, message: "We could not read your submission." });
  }
}


/* ===========================================================================
 * INVITATION LOOKUP
 * Returns ONLY the limited fields a guest needs. Never returns organizer notes,
 * other households, email addresses, or the full guest list.
 * ======================================================================== */
function handleLookup(rawCode) {
  var code = normalizeId(rawCode);
  if (!code) return { ok: false, reason: "not_found" };

  // A shared "guest pass" code: anyone may use it, each reply is its own row.
  if (isOpenCode(code)) {
    return {
      ok: true,
      invitation: {
        code: code,
        household: CONFIG.OPEN_HOUSEHOLD_LABEL,
        maxGuests: toPositiveInt(CONFIG.OPEN_MAX_GUESTS, 6),
        childrenAllowed: CONFIG.OPEN_CHILDREN_ALLOWED !== false,
        status: "",
      },
    };
  }

  var row = findInvitationRow(code);
  if (!row) return { ok: false, reason: "not_found" };

  if (!isTruthy(row["Active"])) return { ok: false, reason: "inactive" };

  return {
    ok: true,
    invitation: {
      code: code,
      household: String(row["Household or Group Name"] || ""),
      maxGuests: toPositiveInt(row["Maximum Guests"], 1),
      childrenAllowed: isTruthy(row["Children Allowed"]),
      status: String(row["Current RSVP Status"] || ""),
    },
  };
}


/* ===========================================================================
 * RSVP HANDLING
 * ======================================================================== */
function handleRsvp(data) {
  data = data || {};

  // --- 1. Validate required fields -----------------------------------------
  var errors = [];
  var primaryName = sanitizeText(data.primaryName, 120);
  var email = sanitizeText(data.email, 200);
  var rsvpStatus = sanitizeText(data.rsvpStatus, 30);

  if (!primaryName) errors.push("name");
  if (!email || !looksLikeEmail(email)) errors.push("email");
  if (["Attending", "Not Attending", "Tentative"].indexOf(rsvpStatus) === -1) errors.push("status");

  if (errors.length) {
    return { ok: false, message: "Please complete the required fields." };
  }

  // --- 2. Resolve the invitation (when codes are in use) -------------------
  var code = normalizeId(data.invitationCode);
  var invitationRow = null;
  var openCode = isOpenCode(code);
  var maxGuests = toPositiveInt(getSetting("Maximum Guests Fallback"), 0); // usually unused

  if (openCode) {
    // A shared "guest pass": no private row, generous default limit, and every
    // reply becomes its own new row (handled by forceInsert below).
    maxGuests = toPositiveInt(CONFIG.OPEN_MAX_GUESTS, 6);
  } else if (code) {
    invitationRow = findInvitationRow(code);
    if (!invitationRow) return { ok: false, message: "We could not find that invitation code." };
    if (!isTruthy(invitationRow["Active"])) return { ok: false, message: "This invitation is no longer active." };
    // The TRUE limit comes from the private sheet, never from the browser.
    maxGuests = toPositiveInt(invitationRow["Maximum Guests"], 1);
  }

  // --- 3. Enforce the guest limit on the server ----------------------------
  var attending = rsvpStatus !== "Not Attending";
  var numberAttending = attending ? toPositiveInt(data.numberAttending, 1) : 0;
  if (code && attending && numberAttending > maxGuests) {
    return {
      ok: false,
      message: "This invitation allows up to " + maxGuests + " guests.",
    };
  }

  // --- 4. Sanitize the rest ------------------------------------------------
  var maxMsg = toPositiveInt(getSetting("Maximum Message Length"), 1000);
  var record = {
    invitationId: code,
    household: invitationRow
      ? String(invitationRow["Household or Group Name"] || "")
      : (openCode ? CONFIG.OPEN_HOUSEHOLD_LABEL : sanitizeText(data.householdName, 120)),
    primaryName: primaryName,
    email: email,
    phone: sanitizeText(data.phone, 40),
    rsvpStatus: rsvpStatus,
    numberAttending: numberAttending,
    attendeeNames: sanitizeText(data.attendeeNames, 1000),
    childrenNames: sanitizeText(data.childrenNames, 1000),
    dietary: sanitizeText(data.dietary, 500),
    accessibility: sanitizeText(data.accessibility, 500),
    message: sanitizeText(data.message, maxMsg),
    source: sanitizeText(data.source, 40) || "website",
  };

  // --- 5. Save (insert or update) with a lock to avoid race conditions -----
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
  } catch (e) {
    return { ok: false, message: "The server is busy. Please try again in a moment." };
  }

  try {
    // Shared "guest pass" replies always become a NEW row so they never
    // overwrite each other. Personal codes update the existing row.
    var saved = saveResponse(record, { forceInsert: openCode });

    // Update the invitation's mirrored status for the organizer's convenience.
    if (invitationRow) {
      updateInvitationStatus(code, record.rsvpStatus, record.numberAttending);
    }

    // Compute the up-to-date running headcount from the whole sheet so it is
    // always correct, even when a guest changes their reply later.
    var totals = computeTotals();

    // Notify the family. We do this AFTER saving and we never let an email
    // problem fail the guest's RSVP, so this is wrapped in its own try/catch.
    try {
      sendRsvpNotification(record, totals, saved.updated);
    } catch (notifyErr) {
      // Intentionally ignored so the guest still sees success.
    }
    try {
      sendSmsAlert("New RSVP: " + record.primaryName + " (" + record.rsvpStatus + "). " +
        totals.confirmedGuests + " confirmed so far. Check your email.", "rsvp");
    } catch (smsErr) {}

    return { ok: true, responseId: saved.responseId, updated: saved.updated, confirmedGuests: totals.confirmedGuests };
  } catch (err) {
    return { ok: false, message: "We could not save your RSVP. Please try again." };
  } finally {
    lock.releaseLock();
  }
}


/**
 * Add up the running totals from the RSVP Responses sheet.
 * confirmedGuests increases by the NUMBER of people each attending guest brings
 * (not by 1 per reply), which is what the family wants to see.
 */
function computeTotals() {
  var sheet = getSheet(CONFIG.RESPONSE_SHEET);
  var values = sheet.getDataRange().getValues();
  var totals = {
    confirmedGuests: 0,   // total people from "Attending" replies
    tentativeGuests: 0,   // total people from "Tentative" replies
    attendingHouseholds: 0,
    tentativeHouseholds: 0,
    notAttendingHouseholds: 0,
  };
  if (values.length < 2) return totals;

  var col = headerIndexMap(values[0]);
  var statusCol = col["RSVP Status"];
  var countCol = col["Number Attending"];
  if (statusCol == null || countCol == null) return totals;

  for (var r = 1; r < values.length; r++) {
    var status = String(values[r][statusCol]).trim();
    var count = toPositiveInt(values[r][countCol], 0);
    if (status === "Attending") {
      totals.confirmedGuests += count;
      totals.attendingHouseholds += 1;
    } else if (status === "Tentative") {
      totals.tentativeGuests += count;
      totals.tentativeHouseholds += 1;
    } else if (status === "Not Attending") {
      totals.notAttendingHouseholds += 1;
    }
  }
  return totals;
}


/**
 * Email the family when someone RSVPs. The email shows who replied and the new
 * running headcount. Recipients are set in CONFIG.NOTIFY_EMAILS.
 */
function sendRsvpNotification(record, totals, wasUpdate) {
  var recipients = (CONFIG.NOTIFY_EMAILS || []).filter(function (e) {
    return e && looksLikeEmail(String(e).trim());
  });
  if (!recipients.length) return; // notifications are turned off

  if (record.rsvpStatus === "Not Attending" && !CONFIG.NOTIFY_ON_NOT_ATTENDING) {
    return;
  }

  var who = record.household ? (record.primaryName + " (" + record.household + ")") : record.primaryName;
  var verb = wasUpdate ? "updated their RSVP" : "RSVP'd";
  var subject = CONFIG.EVENT_LABEL + " RSVP: " + who + " - " + record.rsvpStatus +
    " | " + totals.confirmedGuests + " confirmed so far";

  var lines = [];
  lines.push(who + " " + verb + ".");
  lines.push("");
  lines.push("Reply: " + record.rsvpStatus);
  if (record.rsvpStatus !== "Not Attending") {
    lines.push("People in this party: " + record.numberAttending);
    if (record.attendeeNames) lines.push("Names: " + record.attendeeNames);
    if (record.childrenNames) lines.push("Children: " + record.childrenNames);
    if (record.dietary) lines.push("Dietary: " + record.dietary);
    if (record.accessibility) lines.push("Accessibility: " + record.accessibility);
  }
  if (record.email) lines.push("Email: " + record.email);
  if (record.phone) lines.push("Phone: " + record.phone);
  if (record.message) {
    lines.push("");
    lines.push("Message: " + record.message);
  }
  lines.push("");
  lines.push("-----------------------------------------");
  lines.push("RUNNING TOTALS");
  lines.push("Confirmed guests (people attending): " + totals.confirmedGuests);
  lines.push("Tentative guests (people): " + totals.tentativeGuests);
  lines.push("Households attending: " + totals.attendingHouseholds);
  lines.push("Households tentative: " + totals.tentativeHouseholds);
  lines.push("Households not attending: " + totals.notAttendingHouseholds);
  lines.push("-----------------------------------------");
  lines.push("");
  lines.push("This is an automatic message from your Celebration of Life RSVP site.");

  MailApp.sendEmail({
    to: recipients.join(","),
    subject: subject,
    body: lines.join("\n"),
  });
}


/**
 * Send a short text-message alert via the carrier email-to-text gateways listed
 * in CONFIG.SMS_ALERTS. eventType is "rsvp", "photo", "contact", or "memory".
 * This is best-effort: any failure is ignored so the main action still works.
 */
function sendSmsAlert(message, eventType) {
  var cfg = CONFIG.SMS_ALERTS;
  if (!cfg || cfg.enabled === false) return;
  var flags = { rsvp: cfg.onRsvp, photo: cfg.onPhoto, contact: cfg.onContact, memory: cfg.onMemory };
  if (eventType && flags[eventType] === false) return;

  var recipients = (cfg.recipients || []).filter(function (a) {
    return a && String(a).indexOf("@") !== -1;
  });
  if (!recipients.length) return;

  // Keep it short; carrier gateways truncate long texts.
  MailApp.sendEmail({
    to: recipients.join(","),
    subject: "",
    body: String(message).substring(0, 280),
  });
}


/* ===========================================================================
 * MEMORY WALL
 * ======================================================================== */

/**
 * Save a memory submitted by a visitor. Hidden until approved (unless approval
 * is turned off in CONFIG). Notifies the family so they can review it.
 */
function handleMemory(data) {
  data = data || {};
  var name = sanitizeText(data.name, 80);
  var memory = sanitizeText(data.memory, toPositiveInt(CONFIG.MEMORIES_MAX_LENGTH, 2000));

  if (!name) return { ok: false, message: "Please add your name." };
  if (!memory) return { ok: false, message: "Please write a short memory." };

  var lock = LockService.getScriptLock();
  try { lock.waitLock(10000); } catch (e) {
    return { ok: false, message: "The server is busy. Please try again in a moment." };
  }

  try {
    var sheet = getSheet(CONFIG.MEMORIES_SHEET);
    ensureHeaders(sheet, MEMORIES_HEADERS);

    var requireApproval = CONFIG.MEMORIES_REQUIRE_APPROVAL !== false;
    var memoryId = "MEM-" + Utilities.getUuid().substring(0, 8).toUpperCase();
    var approved = requireApproval ? "No" : "Yes";

    // Column order matches MEMORIES_HEADERS.
    sheet.appendRow([formatTimestamp(new Date()), name, memory, approved, memoryId]);

    try { sendMemoryNotification(name, memory, requireApproval); } catch (notifyErr) {}

    return {
      ok: true,
      approved: !requireApproval,
      message: requireApproval
        ? "Thank you. Your memory has been sent to the family and will appear once approved."
        : "Thank you for sharing your memory.",
    };
  } catch (err) {
    return { ok: false, message: "We could not save your memory. Please try again." };
  } finally {
    lock.releaseLock();
  }
}

/**
 * Return approved memories for public display: only the name, the memory text,
 * and the date. Never returns unapproved entries or any other column.
 */
function handleListMemories() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(CONFIG.MEMORIES_SHEET);
  if (!sheet) return { ok: true, memories: [] };

  var values = sheet.getDataRange().getValues();
  if (values.length < 2) return { ok: true, memories: [] };

  var col = headerIndexMap(values[0]);
  var list = [];
  for (var r = 1; r < values.length; r++) {
    if (!isTruthy(values[r][col["Approved"]])) continue;
    var memory = String(values[r][col["Memory"]] || "").trim();
    if (!memory) continue;
    list.push({
      name: String(values[r][col["Name"]] || "A friend"),
      memory: memory,
      date: String(values[r][col["Timestamp"]] || ""),
    });
  }
  // Newest first.
  list.reverse();
  return { ok: true, memories: list };
}

/** Email the family when a new memory is posted, so they can review it. */
function sendMemoryNotification(name, memory, requireApproval) {
  var recipients = (CONFIG.NOTIFY_EMAILS || []).filter(function (e) {
    return e && looksLikeEmail(String(e).trim());
  });
  if (!recipients.length) return;

  var subject = CONFIG.EVENT_LABEL + " memory from " + name +
    (requireApproval ? " (needs approval)" : "");
  var lines = [
    name + " shared a memory:",
    "",
    memory,
    "",
    "-----------------------------------------",
  ];
  if (requireApproval) {
    lines.push("To show this on the website, open the Memories tab in your");
    lines.push("spreadsheet and change this person's Approved cell to Yes.");
  } else {
    lines.push("This memory is now visible on the website.");
  }
  MailApp.sendEmail({ to: recipients.join(","), subject: subject, body: lines.join("\n") });
}


/* ===========================================================================
 * CONTACT FORM
 * ======================================================================== */

/**
 * Handle a "Contact the Family" message: email it to the family (with the
 * sender's address as reply-to) and save a copy to the Contact Messages tab.
 */
function handleContact(data) {
  data = data || {};
  var name = sanitizeText(data.name, 120);
  var email = sanitizeText(data.email, 200);
  var message = sanitizeText(data.message, toPositiveInt(CONFIG.CONTACT_MAX_LENGTH, 3000));

  if (!name) return { ok: false, message: "Please add your name." };
  if (!email || !looksLikeEmail(email)) return { ok: false, message: "Please add a valid email address." };
  if (!message) return { ok: false, message: "Please write a message." };

  var lock = LockService.getScriptLock();
  try { lock.waitLock(10000); } catch (e) {
    return { ok: false, message: "The server is busy. Please try again in a moment." };
  }

  try {
    // Save a record so nothing is lost even if email has an issue.
    var sheet = getSheet(CONFIG.CONTACT_SHEET);
    ensureHeaders(sheet, CONTACT_HEADERS);
    var messageId = "MSG-" + Utilities.getUuid().substring(0, 8).toUpperCase();
    sheet.appendRow([formatTimestamp(new Date()), name, email, message, messageId]);

    // Email the family. Reply-to is set to the sender so the family can reply.
    var recipients = (CONFIG.NOTIFY_EMAILS || []).filter(function (e) {
      return e && looksLikeEmail(String(e).trim());
    });
    if (recipients.length) {
      var body = [
        "You received a message through the Celebration of Life website.",
        "",
        "From: " + name,
        "Email: " + email,
        "",
        "Message:",
        message,
        "",
        "-----------------------------------------",
        "Reply directly to this email to respond to " + name + ".",
      ].join("\n");
      MailApp.sendEmail({
        to: recipients.join(","),
        replyTo: email,
        subject: CONFIG.EVENT_LABEL + " message from " + name,
        body: body,
      });
    }

    try { sendSmsAlert("New message from " + name + " via Contact the Family. Check your email.", "contact"); } catch (smsErr) {}

    return { ok: true, message: "Thank you. Your message has been sent to the family." };
  } catch (err) {
    return { ok: false, message: "We could not send your message. Please try again." };
  } finally {
    lock.releaseLock();
  }
}


/* ===========================================================================
 * PHOTO WALL
 * ======================================================================== */

/** Find the Drive folder for photos, creating it if it does not exist yet. */
function getPhotosFolder() {
  var name = CONFIG.PHOTOS_FOLDER_NAME;
  var existing = DriveApp.getFoldersByName(name);
  if (existing.hasNext()) return existing.next();
  return DriveApp.createFolder(name);
}

/**
 * Save a photo submitted by a visitor. The image arrives as base64 text. It is
 * stored in Drive, shared as view-only by link, and recorded as NOT approved.
 * It appears on the website only after the family sets Approved to Yes.
 */
function handlePhoto(data) {
  data = data || {};
  var name = sanitizeText(data.name, 80);
  var caption = sanitizeText(data.caption, 200);
  var mimeType = String(data.mimeType || "").toLowerCase();
  var base64 = String(data.dataBase64 || "");

  if (!name) return { ok: false, message: "Please add your name." };
  if (!base64) return { ok: false, message: "Please choose a photo." };
  if (mimeType.indexOf("image/") !== 0) {
    return { ok: false, message: "Please upload an image file (JPG or PNG)." };
  }

  // Decode and guard the size on the server.
  var bytes;
  try {
    bytes = Utilities.base64Decode(base64);
  } catch (e) {
    return { ok: false, message: "That photo could not be read. Please try another." };
  }
  if (bytes.length > toPositiveInt(CONFIG.PHOTOS_MAX_BYTES, 10485760)) {
    return { ok: false, message: "That photo is too large. Please choose a smaller one." };
  }

  var lock = LockService.getScriptLock();
  try { lock.waitLock(15000); } catch (e) {
    return { ok: false, message: "The server is busy. Please try again in a moment." };
  }

  try {
    var ext = mimeType.indexOf("png") !== -1 ? ".png" : ".jpg";
    var safeName = name.replace(/[^A-Za-z0-9 ]/g, "").substring(0, 40) || "guest";
    var fileName = "memory-" + safeName + "-" + new Date().getTime() + ext;

    var blob = Utilities.newBlob(bytes, mimeType, fileName);
    var folder = getPhotosFolder();
    var file = folder.createFile(blob);

    // Make it viewable by the website (anyone with the link can view).
    try {
      file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    } catch (shareErr) {
      // Some Workspace accounts restrict link sharing; the file is still saved.
    }

    var fileId = file.getId();
    var viewUrl = "https://drive.google.com/thumbnail?id=" + fileId + "&sz=w1600";
    var photoId = "PHO-" + Utilities.getUuid().substring(0, 8).toUpperCase();

    var sheet = getSheet(CONFIG.PHOTOS_SHEET);
    ensureHeaders(sheet, PHOTOS_HEADERS);
    // Column order matches PHOTOS_HEADERS. Approved starts as No.
    sheet.appendRow([formatTimestamp(new Date()), name, caption, fileId, viewUrl, "No", photoId]);

    try { sendPhotoNotification(name, caption, photoId, viewUrl, fileId); } catch (notifyErr) {}
    try { sendSmsAlert("New photo to approve for the Celebration of Life. Check your email to approve or decline.", "photo"); } catch (smsErr) {}

    return {
      ok: true,
      approved: false,
      message: "Thank you. Your photo has been sent to the family and will appear once approved.",
    };
  } catch (err) {
    return { ok: false, message: "We could not save your photo. Please try again." };
  } finally {
    lock.releaseLock();
  }
}

/** Return approved photos for the slideshow: only the image URL and caption. */
function handleListPhotos() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(CONFIG.PHOTOS_SHEET);
  if (!sheet) return { ok: true, photos: [] };

  var values = sheet.getDataRange().getValues();
  if (values.length < 2) return { ok: true, photos: [] };

  var col = headerIndexMap(values[0]);
  var list = [];
  for (var r = 1; r < values.length; r++) {
    if (!isTruthy(values[r][col["Approved"]])) continue;
    var url = String(values[r][col["View URL"]] || "").trim();
    if (!url) continue;
    list.push({
      url: url,
      caption: String(values[r][col["Caption"]] || ""),
      name: String(values[r][col["Name"]] || ""),
    });
  }
  list.reverse(); // newest first
  var max = toPositiveInt(CONFIG.PHOTOS_MAX_RETURNED, 50);
  if (list.length > max) list = list.slice(0, max);
  return { ok: true, photos: list };
}

/**
 * Email the photo approver when a new photo is posted. The email includes a
 * preview and one-click Approve and Decline buttons. Recipients come from
 * PHOTOS_APPROVER_EMAILS (defaults to the person who can actually approve).
 */
function sendPhotoNotification(name, caption, photoId, viewUrl, fileId) {
  var list = (CONFIG.PHOTOS_APPROVER_EMAILS && CONFIG.PHOTOS_APPROVER_EMAILS.length)
    ? CONFIG.PHOTOS_APPROVER_EMAILS : CONFIG.NOTIFY_EMAILS;
  var recipients = (list || []).filter(function (e) {
    return e && looksLikeEmail(String(e).trim());
  });
  if (!recipients.length) return;

  var base = "";
  try { base = ScriptApp.getService().getUrl(); } catch (e) { base = ""; }
  var token = approvalToken(photoId);
  var approveUrl = base + "?action=approvePhoto&id=" + encodeURIComponent(photoId) + "&t=" + token;
  var declineUrl = base + "?action=declinePhoto&id=" + encodeURIComponent(photoId) + "&t=" + token;
  // A reliable link to open the full photo in Google Drive.
  var openUrl = fileId ? ("https://drive.google.com/file/d/" + fileId + "/view") : viewUrl;

  var safeName = escapeHtml(name);
  var safeCaption = caption ? escapeHtml(caption) : "";

  var html =
    '<div style="font-family:Georgia,serif;color:#34302a;max-width:480px;margin:0 auto">' +
      '<h2 style="color:#2c4760;font-size:18px">New photo from ' + safeName + '</h2>' +
      (safeCaption ? '<p style="color:#6a6357">Caption: ' + safeCaption + '</p>' : '') +
      '<p><a href="' + openUrl + '"><img src="' + viewUrl + '" alt="Submitted photo" style="max-width:100%;border-radius:8px;border:1px solid #e4dac6"></a></p>' +
      '<p style="font-size:13px"><a href="' + openUrl + '" style="color:#2f4a63">View the full photo</a> (in case the preview above does not load)</p>' +
      '<p>Approve it to show it in the slideshow on the website, or decline to hide it.</p>' +
      '<p>' +
        '<a href="' + approveUrl + '" style="display:inline-block;background:#2f4a63;color:#fff;text-decoration:none;padding:10px 20px;border-radius:6px;margin-right:8px">Approve photo</a>' +
        '<a href="' + declineUrl + '" style="display:inline-block;background:#f4efe4;color:#7a3b50;text-decoration:none;padding:10px 20px;border-radius:6px;border:1px solid #e6c2cd">Decline</a>' +
      '</p>' +
      '<p style="font-size:12px;color:#9a9286">You can also open the Photos tab in your spreadsheet and set Approved to Yes.</p>' +
    '</div>';

  var text =
    safeName + " uploaded a photo" + (caption ? ": " + caption : ".") + "\n\n" +
    "View the photo: " + openUrl + "\n\n" +
    "Approve: " + approveUrl + "\n" +
    "Decline: " + declineUrl + "\n\n" +
    "Or open the Photos tab in your spreadsheet and set Approved to Yes.";

  MailApp.sendEmail({
    to: recipients.join(","),
    subject: CONFIG.EVENT_LABEL + " photo from " + name + " (needs your approval)",
    body: text,
    htmlBody: html,
  });
}

/* ---------------------------------------------------------------------------
 * One-click photo moderation from the approval email
 * -------------------------------------------------------------------------*/

/** Read or create a private secret used to sign approval links. */
function getApprovalSecret() {
  var props = PropertiesService.getScriptProperties();
  var secret = props.getProperty("APPROVAL_SECRET");
  if (!secret) {
    secret = Utilities.getUuid() + Utilities.getUuid();
    props.setProperty("APPROVAL_SECRET", secret);
  }
  return secret;
}

/** A short, unguessable token for a given photo id. */
function approvalToken(photoId) {
  var sig = Utilities.computeHmacSha256Signature(String(photoId), getApprovalSecret());
  return Utilities.base64EncodeWebSafe(sig).replace(/[^A-Za-z0-9]/g, "").substring(0, 18);
}

/** Set a photo's Approved cell (and trash the file when declined). */
function moderatePhotoFromLink(rawId, rawToken, newValue) {
  var id = String(rawId || "").trim();
  var token = String(rawToken || "").trim();
  if (!id || token !== approvalToken(id)) {
    return htmlPage("Link not valid", "This approval link is not valid. Please use the most recent email, or open the Photos tab in your spreadsheet.");
  }

  var sheet = getSheet(CONFIG.PHOTOS_SHEET);
  var values = sheet.getDataRange().getValues();
  var col = headerIndexMap(values[0]);
  var idCol = col["Photo ID"], approvedCol = col["Approved"], fileCol = col["File ID"];
  if (idCol == null || approvedCol == null) {
    return htmlPage("Something went wrong", "The Photos tab could not be read.");
  }

  for (var r = 1; r < values.length; r++) {
    if (String(values[r][idCol]).trim() === id) {
      sheet.getRange(r + 1, approvedCol + 1).setValue(newValue);
      if (newValue === "Declined" && fileCol != null) {
        try { DriveApp.getFileById(String(values[r][fileCol])).setTrashed(true); } catch (e) {}
      }
      if (newValue === "Yes") {
        return htmlPage("Photo approved", "Thank you. The photo now appears in the slideshow on the website.");
      }
      return htmlPage("Photo declined", "The photo has been hidden and will not appear on the website.");
    }
  }
  return htmlPage("Photo not found", "We could not find that photo. It may have already been removed.");
}

/** A small, friendly confirmation page in the site's style. */
function htmlPage(title, message) {
  var t = escapeHtml(title), m = escapeHtml(message);
  var html =
    '<!doctype html><html lang="en"><head><meta charset="utf-8">' +
    '<meta name="viewport" content="width=device-width,initial-scale=1">' +
    '<style>body{font-family:Georgia,serif;background:#f4efe4;color:#34302a;margin:0;' +
    'min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px}' +
    '.card{background:#fffdf8;border:1px solid #e4dac6;border-radius:10px;' +
    'box-shadow:0 10px 30px rgba(44,71,96,.1);padding:32px;max-width:420px;text-align:center}' +
    'h1{color:#2c4760;font-size:1.4rem;margin:0 0 12px}p{color:#6a6357;margin:0;line-height:1.6}</style>' +
    '</head><body><div class="card"><h1>' + t + '</h1><p>' + m + '</p></div></body></html>';
  return HtmlService.createHtmlOutput(html).setTitle(title);
}

/** Escape text for safe inclusion in HTML. */
function escapeHtml(value) {
  return String(value == null ? "" : value)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}


/**
 * Insert a new response row, or update the existing one for the same
 * invitation ID. Preserves the original Submission Timestamp and refreshes
 * Last Updated. When no invitation code is used, every submission is a new row.
 */
function saveResponse(record, options) {
  options = options || {};
  var sheet = getSheet(CONFIG.RESPONSE_SHEET);
  ensureHeaders(sheet, RESPONSE_HEADERS);

  var now = new Date();
  var nowText = formatTimestamp(now);
  var values = sheet.getDataRange().getValues();
  var headerRow = values[0];
  var col = headerIndexMap(headerRow);

  // Try to find an existing row for this invitation (only when a code is used).
  // Shared "guest pass" replies skip this so each one becomes its own new row.
  var existingRowNumber = -1;
  var existingResponseId = "";
  var existingTimestamp = "";

  if (record.invitationId && !options.forceInsert) {
    var idCol = col["Invitation ID"];
    for (var r = 1; r < values.length; r++) {
      if (normalizeId(values[r][idCol]) === record.invitationId) {
        existingRowNumber = r + 1; // sheet rows are 1-based
        existingResponseId = values[r][col["Response ID"]];
        existingTimestamp = values[r][col["Submission Timestamp"]];
        break;
      }
    }
  }

  // --- Soft duplicate guard for rapid repeat clicks ------------------------
  if (existingRowNumber !== -1 && existingTimestamp) {
    var prev = new Date(existingTimestamp);
    if (!isNaN(prev.getTime())) {
      var secs = (now.getTime() - prev.getTime()) / 1000;
      if (secs >= 0 && secs < CONFIG.DUPLICATE_WINDOW_SECONDS) {
        return { responseId: existingResponseId || createResponseId(), updated: true };
      }
    }
  }

  var responseId = existingResponseId || createResponseId();
  var submissionTimestamp = existingRowNumber !== -1 && existingTimestamp ? existingTimestamp : nowText;

  // Build the row in header order so column moves do not break it.
  var rowByHeader = {
    "Submission Timestamp": submissionTimestamp,
    "Invitation ID": record.invitationId,
    "Household or Group Name": record.household,
    "Primary Guest Name": record.primaryName,
    "Email Address": record.email,
    "Mobile Number": record.phone,
    "RSVP Status": record.rsvpStatus,
    "Number Attending": record.numberAttending,
    "Attendee Names": record.attendeeNames,
    "Children's Names": record.childrenNames,
    "Dietary Needs": record.dietary,
    "Accessibility Needs": record.accessibility,
    "Guest Message or Memory": record.message,
    "Submission Source": record.source,
    "Last Updated": nowText,
    "Response ID": responseId,
  };

  var rowArray = RESPONSE_HEADERS.map(function (h) { return rowByHeader[h]; });

  if (existingRowNumber !== -1) {
    sheet.getRange(existingRowNumber, 1, 1, rowArray.length).setValues([rowArray]);
    return { responseId: responseId, updated: true };
  } else {
    sheet.appendRow(rowArray);
    return { responseId: responseId, updated: false };
  }
}


/**
 * Mirror the latest status onto the Invitation List row for the organizer.
 */
function updateInvitationStatus(code, status, confirmedCount) {
  var sheet = getSheet(CONFIG.INVITATION_SHEET);
  var values = sheet.getDataRange().getValues();
  var col = headerIndexMap(values[0]);
  var idCol = col["Invitation ID"];
  if (idCol == null) return;

  for (var r = 1; r < values.length; r++) {
    if (normalizeId(values[r][idCol]) === code) {
      if (col["Current RSVP Status"] != null) {
        sheet.getRange(r + 1, col["Current RSVP Status"] + 1).setValue(status);
      }
      if (col["Confirmed Guest Count"] != null) {
        sheet.getRange(r + 1, col["Confirmed Guest Count"] + 1).setValue(confirmedCount);
      }
      return;
    }
  }
}


/* ===========================================================================
 * SHEET HELPERS
 * ======================================================================== */

function getSheet(name) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(name);
  if (!sheet) sheet = ss.insertSheet(name);
  return sheet;
}

/** Find an invitation row as an object keyed by header name. */
function findInvitationRow(code) {
  var sheet = getSheet(CONFIG.INVITATION_SHEET);
  var values = sheet.getDataRange().getValues();
  if (values.length < 2) return null;
  var headers = values[0];
  var idCol = headers.indexOf("Invitation ID");
  if (idCol === -1) return null;

  for (var r = 1; r < values.length; r++) {
    if (normalizeId(values[r][idCol]) === code) {
      var obj = {};
      for (var c = 0; c < headers.length; c++) obj[headers[c]] = values[r][c];
      return obj;
    }
  }
  return null;
}

/** Read a value from the Settings tab by its name. */
function getSetting(name) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG.SETTINGS_SHEET);
  if (!sheet) return "";
  var values = sheet.getDataRange().getValues();
  for (var r = 0; r < values.length; r++) {
    if (String(values[r][0]).trim() === name) return values[r][1];
  }
  return "";
}

/** Map header names to their column index (0-based). */
function headerIndexMap(headerRow) {
  var map = {};
  for (var c = 0; c < headerRow.length; c++) map[String(headerRow[c]).trim()] = c;
  return map;
}

/** Ensure the first row matches the expected headers; add them if the sheet is empty. */
function ensureHeaders(sheet, headers) {
  var firstRow = sheet.getRange(1, 1, 1, headers.length).getValues()[0];
  var hasHeaders = firstRow.some(function (v) { return String(v).trim() !== ""; });
  if (!hasHeaders) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.setFrozenRows(1);
  }
}


/* ===========================================================================
 * UTILITIES
 * ======================================================================== */

/** Normalize an invitation ID: uppercase, trim, remove inner spaces. */
function normalizeId(value) {
  return String(value == null ? "" : value).trim().toUpperCase().replace(/\s+/g, "");
}

/** Is this one of the shared "guest pass" codes that anyone may use? */
function isOpenCode(code) {
  var normalized = normalizeId(code);
  if (!normalized) return false;
  var list = CONFIG.OPEN_CODES || [];
  for (var i = 0; i < list.length; i++) {
    if (normalizeId(list[i]) === normalized) return true;
  }
  return false;
}

/** Remove control characters and angle brackets, then cap the length. */
function sanitizeText(value, maxLength) {
  var s = String(value == null ? "" : value);
  // Strip control characters but keep normal whitespace.
  s = s.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "");
  s = s.replace(/[<>]/g, "");  // strip HTML-looking brackets
  s = s.trim();
  if (maxLength && s.length > maxLength) s = s.substring(0, maxLength);
  return s;
}

function looksLikeEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value));
}

function toPositiveInt(value, fallback) {
  var n = parseInt(value, 10);
  if (isNaN(n) || n < 0) return fallback;
  return n;
}

/** Accept Yes/True/1/checkbox-true as truthy. */
function isTruthy(value) {
  if (value === true) return true;
  var s = String(value).trim().toLowerCase();
  return s === "yes" || s === "true" || s === "1" || s === "y";
}

function createResponseId() {
  return "RSP-" + Utilities.getUuid().substring(0, 8).toUpperCase();
}

function formatTimestamp(date) {
  var tz = Session.getScriptTimeZone() || "America/New_York";
  return Utilities.formatDate(date, tz, "yyyy-MM-dd HH:mm:ss");
}

/** Build a JSON response. (See README for why CORS headers are not set here.) */
function jsonResponse(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}


/* ===========================================================================
 * SETUP AND TEST FUNCTIONS  -  run these from the Apps Script editor
 * ======================================================================== */

/**
 * setupSheet()
 * Run this ONCE after pasting the script. It creates any missing worksheets
 * and adds the header rows and default settings. Safe to run again; it will
 * not overwrite existing data, only add missing headers.
 */
function setupSheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();

  // Invitation List
  var inv = getSheet(CONFIG.INVITATION_SHEET);
  ensureHeaders(inv, INVITATION_HEADERS);

  // RSVP Responses
  var resp = getSheet(CONFIG.RESPONSE_SHEET);
  ensureHeaders(resp, RESPONSE_HEADERS);

  // Memories (public memory wall)
  var memories = getSheet(CONFIG.MEMORIES_SHEET);
  ensureHeaders(memories, MEMORIES_HEADERS);

  // Contact Messages
  var contact = getSheet(CONFIG.CONTACT_SHEET);
  ensureHeaders(contact, CONTACT_HEADERS);

  // Photos (public photo wall). Creating the folder now also prompts for the
  // Drive permission during setup, so uploads work later.
  var photos = getSheet(CONFIG.PHOTOS_SHEET);
  ensureHeaders(photos, PHOTOS_HEADERS);
  getPhotosFolder();

  // Settings
  var settings = getSheet(CONFIG.SETTINGS_SHEET);
  var existing = settings.getDataRange().getValues();
  var hasSettings = existing.length > 1 && String(existing[0][0]).trim() !== "";
  if (!hasSettings) {
    settings.getRange(1, 1, SETTINGS_DEFAULTS.length, 2).setValues(SETTINGS_DEFAULTS);
    settings.setFrozenRows(1);
  }

  // Summary (formulas documented in GOOGLE-SHEETS-SETUP.md). We add labels and
  // formulas only if the sheet is empty.
  var summary = getSheet(CONFIG.SUMMARY_SHEET);
  if (summary.getDataRange().getValues().length < 2) {
    buildSummaryFormulas(summary);
  }

  SpreadsheetApp.getActiveSpreadsheet().toast("Setup complete. Worksheets and headers are ready.");
}

/**
 * Writes the Summary tab labels and formulas. These reference the other tabs
 * by name, so keep the tab names in CONFIG in sync if you rename them.
 */
function buildSummaryFormulas(summary) {
  var inv = "'" + CONFIG.INVITATION_SHEET + "'";
  var resp = "'" + CONFIG.RESPONSE_SHEET + "'";
  var mem = "'" + CONFIG.MEMORIES_SHEET + "'";
  var pho = "'" + CONFIG.PHOTOS_SHEET + "'";
  var con = "'" + CONFIG.CONTACT_SHEET + "'";

  var rows = [
    ["Summary (updates automatically)", ""],
    ["Invitations Issued", "=COUNTA(" + inv + "!A2:A)"],
    ["Households Attending", "=COUNTIF(" + resp + "!G2:G, \"Attending\")"],
    ["Households Tentative", "=COUNTIF(" + resp + "!G2:G, \"Tentative\")"],
    ["Households Not Attending", "=COUNTIF(" + resp + "!G2:G, \"Not Attending\")"],
    ["No Response Yet", "=COUNTA(" + inv + "!A2:A) - COUNTA(" + resp + "!B2:B)"],
    ["Total Confirmed Guests", "=SUMIF(" + resp + "!G2:G, \"Attending\", " + resp + "!H2:H)"],
    ["Total Tentative Guests", "=SUMIF(" + resp + "!G2:G, \"Tentative\", " + resp + "!H2:H)"],
    ["Dietary Requests", "=COUNTIF(" + resp + "!K2:K, \"?*\")"],
    ["Accessibility Requests", "=COUNTIF(" + resp + "!L2:L, \"?*\")"],
    ["Memories Posted", "=COUNTA(" + mem + "!A2:A)"],
    ["Photos Submitted", "=COUNTA(" + pho + "!A2:A)"],
    ["Contact Messages", "=COUNTA(" + con + "!A2:A)"],
  ];
  summary.getRange(1, 1, rows.length, 2).setValues(rows);
  summary.setFrozenRows(1);
}

/**
 * rebuildSummary()
 * Run this from the editor to wipe the Summary tab and write fresh, current
 * formulas. Use it any time the Summary looks wrong or out of date. It does not
 * touch any of your other data.
 */
function rebuildSummary() {
  var summary = getSheet(CONFIG.SUMMARY_SHEET);
  summary.clear();
  buildSummaryFormulas(summary);
  SpreadsheetApp.getActiveSpreadsheet().toast("Summary rebuilt with current formulas.");
}

/**
 * testAccess()
 * Run this to confirm the script can read your spreadsheet. Check the
 * execution log (View > Logs) for the result.
 */
function testAccess() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var names = ss.getSheets().map(function (s) { return s.getName(); });
  Logger.log("Spreadsheet: " + ss.getName());
  Logger.log("Worksheets found: " + names.join(", "));
  var inv = ss.getSheetByName(CONFIG.INVITATION_SHEET);
  Logger.log("Invitation rows (including header): " + (inv ? inv.getLastRow() : "MISSING"));
  return names;
}

/**
 * testLookup()
 * Quick check of the lookup logic. Change the code to one in your sheet.
 */
function testLookup() {
  Logger.log(JSON.stringify(handleLookup("COL-001")));
}

/**
 * testRsvp()
 * Simulates a submission so you can confirm rows are written. Uses a code that
 * must exist and be active in your Invitation List.
 */
function testRsvp() {
  var result = handleRsvp({
    invitationCode: "COL-001",
    primaryName: "Test Person",
    email: "test@example.com",
    rsvpStatus: "Attending",
    numberAttending: "2",
    attendeeNames: "Test Person, Guest Two",
    message: "Looking forward to it.",
    source: "test",
  });
  Logger.log(JSON.stringify(result));
}

/**
 * testTotals()
 * Logs the current running headcount computed from the RSVP Responses sheet.
 */
function testTotals() {
  Logger.log(JSON.stringify(computeTotals()));
}

/**
 * testSms()
 * Sends a sample text to the numbers in CONFIG.SMS_ALERTS so you can confirm
 * your carrier gateway works. If you do not receive it within a few minutes,
 * your carrier may have limited email-to-text and we can adjust.
 */
function testSms() {
  sendSmsAlert("Test alert from your Celebration of Life site. If you got this, text alerts are working.", "rsvp");
  Logger.log("Test text sent to: " + (CONFIG.SMS_ALERTS.recipients || []).join(", "));
}

/**
 * testNotify()
 * Sends a sample notification email to the addresses in CONFIG.NOTIFY_EMAILS so
 * you can confirm delivery. The first time you run this, Google will ask you to
 * authorize sending email. After authorizing, run it again.
 */
function testNotify() {
  if (!CONFIG.NOTIFY_EMAILS || !CONFIG.NOTIFY_EMAILS.length) {
    Logger.log("No NOTIFY_EMAILS are set. Add addresses in the CONFIG block first.");
    return;
  }
  sendRsvpNotification(
    {
      household: "Sample Family One",
      primaryName: "Sample Guest",
      email: "sample@example.com",
      phone: "",
      rsvpStatus: "Attending",
      numberAttending: 4,
      attendeeNames: "Sample Guest, Plus Three",
      childrenNames: "",
      dietary: "",
      accessibility: "",
      message: "This is a test notification.",
    },
    computeTotals(),
    false
  );
  Logger.log("Test notification sent to: " + CONFIG.NOTIFY_EMAILS.join(", "));
}
