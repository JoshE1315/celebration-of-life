/* =============================================================================
 * config.js  -  CENTRAL EVENT CONFIGURATION
 * =============================================================================
 *
 * This is the ONE file a non-developer will edit most often.
 *
 * Everything in here is PUBLIC. This file is downloaded by every visitor's
 * web browser, so NEVER put private information here:
 *   - Do NOT put the guest list here.
 *   - Do NOT put invitation codes here.
 *   - Do NOT put email addresses or phone numbers of guests here.
 *   - Do NOT put organizer private notes here.
 *
 * The private guest list lives only inside your Google Sheet (see the docs
 * folder). The website asks the Google Apps Script backend to look up an
 * invitation code; the code never lives in this file.
 *
 * HOW TO EDIT:
 *   - Replace any text inside quotation marks.
 *   - Keep the quotation marks and the commas.
 *   - Lines that begin with // are comments and are ignored by the website.
 *   - Anything written as "PLACEHOLDER ..." must be replaced by you.
 *
 * After you change this file, save it, then refresh the website in your
 * browser to see the change.
 * ========================================================================== */

const CONFIG = {

  /* ---------------------------------------------------------------------------
   * 1. BACKEND CONNECTION
   * -------------------------------------------------------------------------*/

  // Paste your Google Apps Script Web App URL here once you have deployed it.
  // See docs/GOOGLE-SHEETS-SETUP.md and docs/DEPLOYMENT.md.
  // While this is left blank, the site runs in safe DEMO MODE and does not
  // send any data anywhere.
  appsScriptUrl: "https://script.google.com/macros/s/AKfycbxVl4n7ZC4THB6EJdhM-qvP36b_Z-UhRUF6FkGh9xSDczaBHP8R9Krsaro2yLhN-lwXbQ/exec",

  // Demo mode lets you test the form before the backend is connected.
  // - true  = nothing is sent to Google; submissions are simulated locally.
  // - false = real submissions are sent to appsScriptUrl above.
  // If appsScriptUrl is empty, demo mode is forced on automatically.
  demoMode: false,

  // If true, the website will ask the backend to look up an invitation code
  // before showing the RSVP form. If false, anyone may RSVP without a code.
  // In demo mode this uses the sample codes listed in demoInvitations below.
  requireInvitationCode: true,


  /* ---------------------------------------------------------------------------
   * 2. THE PERSON BEING HONORED
   * -------------------------------------------------------------------------*/

  deceased: {
    // The introductory line shown above the name.
    eyebrow: "Celebrating the Life of",

    // PLACEHOLDER: replace with the full name.
    fullName: "Stanley Irving Ehlin",

    // PLACEHOLDER: replace with the years of life, for example "1947 to 2026".
    // Leave as an empty string "" to hide this line.
    lifespan: "August 22, 1956 to April 11, 2026",

    // A short, warm introductory message shown in the hero section.
    introMessage:
      "Please join us as we gather with family and friends to remember, " +
      "honor, and celebrate a life that meant so much to so many.",

    // Portrait photo for the hero section.
    // Put your image file inside assets/images/ and update the path below.
    // Leave portrait as "" to show a tasteful placeholder instead.
    portrait: "assets/images/portrait.jpg",
    portraitAlt: "Stanley Irving Ehlin in a tuxedo, smiling and speaking into a microphone", // describe the photo for screen readers
  },


  /* ---------------------------------------------------------------------------
   * 3. TRIBUTE SECTION
   * -------------------------------------------------------------------------*/

  tribute: {
    heading: "A Life Well Lived",

    // The biography or tribute. You may use several short paragraphs.
    // Each item in this list becomes its own paragraph.
    paragraphs: [
      "Stanley Irving Ehlin lived a life full of love, laughter, and the kind " +
        "of warmth that stayed with you long after you left his side. He had a " +
        "gift for making the people around him feel welcome, valued, and seen.",
      "He gave freely of his time, his humor, and his heart, and he found his " +
        "greatest joy in the people he loved. The memories he leaves behind are " +
        "many, and each one is a reminder of how deeply he cared and how fully " +
        "he lived.",
      "Words can never quite capture all that he meant to us. So we hold close " +
        "the moments we shared, the lessons he taught, and the love that remains. " +
        "He will be carried in our hearts always.",
    ],

    // An optional quotation. Leave quote as "" to hide this block.
    quote: "",
    quoteAttribution: "",

    // An editable message from the family.
    familyMessageHeading: "A Message From the Family",
    familyMessage:
      "To our family and friends, thank you for the love and kindness you " +
      "showed our dad throughout his life. Your presence at his Celebration of " +
      "Life means the world to us. We hope this day is filled not with sorrow " +
      "alone, but with the warmth, the stories, and the laughter he gave so " +
      "freely. It brings us comfort to remember him together, surrounded by the " +
      "people he cared about.",

    // The closing sign-off, shown on its own line beneath the family message.
    familySignature: "With love and gratitude, Shane, Josh and Amie",

    // Optional tribute photo. Leave as "" to hide.
    photo: "", // PLACEHOLDER: e.g. "assets/images/tribute.jpg"
    photoAlt: "A cherished photograph",
  },


  /* ---------------------------------------------------------------------------
   * 4. EVENT DETAILS
   * -------------------------------------------------------------------------*/

  // IMPORTANT: When a value below is left as "TBD" the website automatically
  // shows a friendly "to be announced" message instead of a blank space.
  event: {
    name: "Celebration of Life",

    // Date of the event.
    date: "August 22, 2026",
    // Machine-readable date used by the calendar feature. Format: YYYY-MM-DD.
    dateISO: "2026-08-22",

    // Times. Use "TBD" until the time is known.
    // When known, use 24-hour format for startTime24/endTime24 so the
    // calendar file is correct, and friendly text for startTimeDisplay.
    startTimeDisplay: "1:00 PM",
    endTimeDisplay: "4:00 PM",
    startTime24: "13:00",
    endTime24: "16:00",

    // Venue. Use "TBD" until known.
    venueName: "Ove's Restaurant",
    streetAddress: "4th Street and Boardwalk",
    city: "Ocean City",
    state: "New Jersey",
    zip: "", // PLACEHOLDER: add the ZIP code if you would like it shown (Ocean City is 08226)

    // Practical guidance. These may be left as friendly placeholders.
    parking: "Street parking is available.",
    dressCode:
      "Comfortable, respectful attire. There is no formal dress requirement.",
    accessibility:
      "The venue is wheelchair accessible.",
    reception:
      "Details to follow.",

    // A map link. Leave as "" to hide the map button.
    // When the venue is set, paste a Google Maps share link here.
    mapLink: "https://www.google.com/maps/search/?api=1&query=Ove%27s+Restaurant+Ocean+City+NJ", // please confirm this opens the right place

    // Shown anywhere a value is still TBD.
    tbdMessage: "Time and venue details will be announced.",
  },


  /* ---------------------------------------------------------------------------
   * 5. SCHEDULE
   * -------------------------------------------------------------------------*/

  // Each card has a time and a description. Use "" for time to show a dash.
  // Add, remove, or reorder cards freely.
  schedule: [
    { time: "TBD", title: "Guest Arrival", description: "Please arrive a little early to find a seat and settle in." },
    { time: "TBD", title: "Celebration of Life Ceremony", description: "We gather to remember and honor a cherished life." },
    { time: "TBD", title: "Family Remarks and Shared Memories", description: "Family and friends are invited to share words and memories." },
    { time: "TBD", title: "Closing", description: "A few closing words to bring our gathering together." },
    { time: "TBD", title: "Reception and Refreshments", description: "Please stay to share stories, food, and fellowship." },
  ],


  /* ---------------------------------------------------------------------------
   * 5b. MEMORY WALL  -  public messages from friends and family
   * -------------------------------------------------------------------------*/

  memoryWall: {
    // Turn the whole section on or off.
    enabled: true,

    heading: "Share a Memory",
    intro:
      "We would love to hear from you. Share a memory, a story, or a few kind " +
      "words about Stanley below, and they will appear here for everyone to read.",

    // The label on the submit button.
    submitLabel: "Post Memory",

    // The most characters a memory may contain (must match the backend value).
    maxLength: 2000,
  },

  /* ---------------------------------------------------------------------------
   * 5c. PHOTO SLIDESHOW  -  visitors can submit photos for the hero slideshow
   * -------------------------------------------------------------------------*/

  photos: {
    // Turn photo uploads on or off.
    enabled: true,

    heading: "Share a Photo",
    intro:
      "Have a favorite photo of Stanley? Add it here. Once the family approves " +
      "it, it will join the slideshow at the top of this page.",

    submitLabel: "Upload Photo",

    // Photos are shrunk in the browser before uploading so they send quickly.
    // This is the longest edge in pixels. 1600 looks crisp and stays small.
    maxDimension: 1600,
  },

  /* ---------------------------------------------------------------------------
   * 5d. MUSIC  -  an optional song people can press play to hear
   * -------------------------------------------------------------------------*/

  music: {
    // Turn the music player on or off.
    enabled: true,

    // Start the song on its own. Because browsers block sound from starting
    // before a visitor interacts, the song begins at the visitor's first tap,
    // click, or scroll. A floating button lets anyone pause it.
    // Set to false to require pressing the button before any music plays.
    autoplay: true,

    // Text shown on the floating music button.
    playLabel: "Play music",
    pauseLabel: "Pause music",

    // Loop the song so it keeps playing while the page is open.
    loop: true,

    // Paste the YouTube link or video ID of the song you choose.
    // Example link: https://www.youtube.com/watch?v=XXXXXXXXXXX
    // Leave blank to turn the music off until you add a song.
    youTube: "https://youtu.be/M8AeV8Jbx6M",
  },


  /* ---------------------------------------------------------------------------
   * 6. RSVP SETTINGS
   * -------------------------------------------------------------------------*/

  rsvp: {
    heading: "Kindly Respond",
    intro:
      "Your response helps us plan a comfortable gathering for everyone. " +
      "Please reply by the date below.",

    // PLACEHOLDER: the date you would like replies by.
    deadlineDisplay: "August 1, 2026",

    // Allow guests to choose "Tentative" as a response.
    allowTentative: true,

    // Collect the names of children attending.
    collectChildrenNames: true,

    // Collect an optional memory or message.
    collectMemories: true,

    // Maximum length of the optional message, in characters.
    maxMessageLength: 1000,

    // The largest number a single invitation could ever bring. This is only
    // an upper bound for the dropdown. The REAL per-invitation limit is
    // enforced privately by the backend and cannot be changed by the browser.
    maxGuestsCeiling: 12,
  },


  /* ---------------------------------------------------------------------------
   * 7. FREQUENTLY ASKED QUESTIONS
   * -------------------------------------------------------------------------*/

  faqs: [
    {
      question: "May I bring a guest, or share this with a friend?",
      answer:
        "Yes. Your personal invitation code lets you add the guests reserved " +
        "for you. If you would like to invite another friend of the family, " +
        "you are welcome to forward this page to them and ask them to use the " +
        "code FRIEND when they RSVP. Each person who uses the FRIEND code gets " +
        "their own reply, so nothing is overwritten.",
    },
    {
      question: "Are children welcome?",
      answer:
        "Children are welcome when your invitation includes them. The RSVP " +
        "form will let you add children's names where applicable.",
    },
    {
      question: "What should I wear?",
      answer:
        "Comfortable, respectful attire is perfect. There is no formal dress " +
        "requirement. Please come as you feel most at ease.",
    },
    {
      question: "Where should I park?",
      answer:
        "Parking details will be shared closer to the date once the venue is " +
        "confirmed. Please check back for the latest information.",
    },
    {
      question: "Will food be served?",
      answer:
        "Light refreshments are planned. Final details will be added here " +
        "once they are confirmed.",
    },
    {
      question: "Is the venue accessible?",
      answer:
        "We are committed to a welcoming gathering. Accessibility details " +
        "will be confirmed once the venue is set. If you have specific needs, " +
        "please note them on the RSVP form so we can help.",
    },
    {
      question: "What happens if my plans change?",
      answer:
        "You may update your RSVP by returning to this page and submitting " +
        "the form again with the same invitation code. Your most recent reply " +
        "is the one we keep.",
    },
    {
      question: "Who should I contact with questions?",
      answer:
        "Please reach out to the family using the contact details in the " +
        "footer of this page. We are glad to help.",
    },
  ],


  /* ---------------------------------------------------------------------------
   * 8. CONTACT AND FOOTER
   * -------------------------------------------------------------------------*/

  contact: {
    // PLACEHOLDER: how guests should reach the family.
    name: "The Family", // e.g. "Jane Doe (daughter)"
    email: "", // PLACEHOLDER: e.g. "family@example.com" - leave "" to hide
    phone: "", // PLACEHOLDER: e.g. "(555) 555-5555" - leave "" to hide
  },

  footer: {
    closingLine: "Held in loving memory.",
    // Updated automatically is not possible without a build step, so set the
    // date you last edited the site. Format is up to you.
    lastUpdated: "June 2026",
  },

};

// Make the config available to the other scripts. Do not edit below this line.
if (typeof window !== "undefined") {
  window.CONFIG = CONFIG;
}
