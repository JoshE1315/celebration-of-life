/* =============================================================================
 * app.js  -  Renders config.js into the page and wires up the interface
 * =============================================================================
 *
 * This script reads values from config.js and places them into the HTML. It
 * also builds the schedule and FAQ, handles the mobile menu, the calendar
 * button, and the privacy notice toggle.
 *
 * The page is written so that the core invitation is readable even if this
 * script fails. This script enhances the page rather than creating it.
 * ========================================================================== */

(function () {
  "use strict";

  // Read a value from a dotted path like "event.date" out of CONFIG.
  function getByPath(obj, path) {
    return path.split(".").reduce(function (acc, key) {
      return acc == null ? undefined : acc[key];
    }, obj);
  }

  // Treat "TBD" (any case) and empty values as "not yet known".
  function isTBD(value) {
    return value == null || value === "" || String(value).trim().toUpperCase() === "TBD";
  }

  /* ---------------------------------------------------------------------------
   * SIMPLE TEXT BINDINGS  -  elements with data-config="path"
   * -------------------------------------------------------------------------*/
  function applyTextBindings(cfg) {
    document.querySelectorAll("[data-config]").forEach(function (el) {
      var value = getByPath(cfg, el.getAttribute("data-config"));
      if (value == null || value === "") {
        // Leave the existing fallback text in place rather than blanking it.
        return;
      }
      el.textContent = value;
    });
  }

  /* ---------------------------------------------------------------------------
   * HERO PORTRAIT
   * -------------------------------------------------------------------------*/
  function applyPortrait(cfg) {
    var fig = document.querySelector("[data-portrait-figure]");
    var slides = document.querySelector("[data-slideshow-slides]");
    var placeholder = document.querySelector("[data-portrait-placeholder]");
    if (!fig) return;
    var src = cfg.deceased.portrait;
    if (src) {
      var img = new Image();
      img.src = src;
      img.alt = cfg.deceased.portraitAlt || "";
      img.loading = "eager";
      img.className = "slideshow__slide is-active";
      if (placeholder) placeholder.remove();
      (slides || fig).appendChild(img);
    }
    // If lifespan is empty, hide that line.
    if (isTBD(cfg.deceased.lifespan)) {
      var ls = document.querySelector(".hero__lifespan");
      if (ls && !cfg.deceased.lifespan) ls.hidden = true;
    }
  }

  /* ---------------------------------------------------------------------------
   * LOCATION (hero) and EVENT DETAILS
   * -------------------------------------------------------------------------*/
  function applyLocationAndDetails(cfg) {
    var ev = cfg.event;

    // Hero location line: "City, State" with sensible fallback.
    var loc = [ev.city, ev.state].filter(function (x) { return !isTBD(x); }).join(", ");
    var locEl = document.querySelector("[data-config-location]");
    if (locEl && loc) locEl.textContent = loc;

    // Time
    var timeEl = document.querySelector("[data-detail-time]");
    if (timeEl) {
      if (isTBD(ev.startTimeDisplay)) {
        timeEl.textContent = "To be announced";
      } else if (isTBD(ev.endTimeDisplay)) {
        timeEl.textContent = ev.startTimeDisplay;
      } else {
        timeEl.textContent = ev.startTimeDisplay + " to " + ev.endTimeDisplay;
      }
    }

    // Venue
    var venueEl = document.querySelector("[data-detail-venue]");
    if (venueEl) venueEl.textContent = isTBD(ev.venueName) ? "To be announced" : ev.venueName;

    // Address
    var addressEl = document.querySelector("[data-detail-address]");
    if (addressEl) {
      var line1 = isTBD(ev.streetAddress) ? "" : ev.streetAddress;
      var cityLine = [ev.city, ev.state].filter(function (x) { return !isTBD(x); }).join(", ");
      if (!isTBD(ev.zip)) cityLine += " " + ev.zip;
      var full = [line1, cityLine].filter(function (x) { return x && x.trim(); }).join(", ");
      addressEl.textContent = full || "To be announced";
    }

    // Contact line in details
    var contactEl = document.querySelector("[data-detail-contact]");
    if (contactEl) {
      var bits = [cfg.contact.name];
      if (cfg.contact.email) bits.push(cfg.contact.email);
      if (cfg.contact.phone) bits.push(cfg.contact.phone);
      contactEl.textContent = bits.filter(Boolean).join(" - ");
    }

    // TBD notice: shown if time OR venue is still unknown.
    var tbdNotice = document.querySelector("[data-tbd-notice]");
    if (tbdNotice && (isTBD(ev.startTimeDisplay) || isTBD(ev.venueName))) {
      tbdNotice.hidden = false;
    }

    // Map link
    var mapLink = document.querySelector("[data-map-link]");
    if (mapLink && ev.mapLink) {
      mapLink.href = ev.mapLink;
      mapLink.target = "_blank";
      mapLink.rel = "noopener noreferrer";
      mapLink.hidden = false;
    }
  }

  /* ---------------------------------------------------------------------------
   * TRIBUTE
   * -------------------------------------------------------------------------*/
  function applyTribute(cfg) {
    var t = cfg.tribute;

    var paraWrap = document.querySelector("[data-tribute-paragraphs]");
    if (paraWrap && Array.isArray(t.paragraphs)) {
      paraWrap.innerHTML = "";
      t.paragraphs.forEach(function (text) {
        var p = document.createElement("p");
        p.textContent = text;
        paraWrap.appendChild(p);
      });
    }

    var quoteWrap = document.querySelector("[data-tribute-quote]");
    if (quoteWrap) {
      if (t.quote && !isTBD(t.quote)) {
        quoteWrap.hidden = false;
        var cite = quoteWrap.querySelector("cite");
        if (cite && !t.quoteAttribution) cite.hidden = true;
      } else {
        quoteWrap.hidden = true;
      }
    }

    var photoFig = document.querySelector("[data-tribute-photo-figure]");
    var photoImg = document.querySelector("[data-tribute-photo]");
    if (photoFig && photoImg && t.photo) {
      photoImg.src = t.photo;
      photoImg.alt = t.photoAlt || "";
      photoImg.loading = "lazy";
      photoFig.hidden = false;
    }
  }

  /* ---------------------------------------------------------------------------
   * SCHEDULE
   * -------------------------------------------------------------------------*/
  function applySchedule(cfg) {
    var list = document.querySelector("[data-schedule-list]");
    if (!list || !Array.isArray(cfg.schedule)) return;
    list.innerHTML = "";
    cfg.schedule.forEach(function (item) {
      var li = document.createElement("li");
      li.className = "schedule__card";

      var time = document.createElement("div");
      time.className = "schedule__time";
      time.textContent = isTBD(item.time) ? "Time TBD" : item.time;

      var body = document.createElement("div");
      var title = document.createElement("h3");
      title.className = "schedule__title";
      title.textContent = item.title;
      var desc = document.createElement("p");
      desc.className = "schedule__desc";
      desc.textContent = item.description || "";

      body.appendChild(title);
      body.appendChild(desc);
      li.appendChild(time);
      li.appendChild(body);
      list.appendChild(li);
    });
  }

  /* ---------------------------------------------------------------------------
   * FAQ
   * -------------------------------------------------------------------------*/
  function applyFaq(cfg) {
    var wrap = document.querySelector("[data-faq-list]");
    if (!wrap || !Array.isArray(cfg.faqs)) return;
    wrap.innerHTML = "";
    cfg.faqs.forEach(function (item) {
      var details = document.createElement("details");
      details.className = "faq__item";

      var summary = document.createElement("summary");
      summary.textContent = item.question;

      var answer = document.createElement("div");
      answer.className = "faq__answer";
      var p = document.createElement("p");
      p.textContent = item.answer;
      p.style.margin = "0";
      answer.appendChild(p);

      details.appendChild(summary);
      details.appendChild(answer);
      wrap.appendChild(details);
    });
  }

  /* ---------------------------------------------------------------------------
   * FOOTER CONTACT
   * -------------------------------------------------------------------------*/
  function applyFooterContact(cfg) {
    var el = document.querySelector("[data-footer-contact]");
    if (!el) return;
    var c = cfg.contact;
    var parts = [];
    if (c.name) parts.push("Contact " + c.name);
    if (c.email) parts.push(c.email);
    if (c.phone) parts.push(c.phone);
    el.textContent = parts.join(" · ");
  }

  /* ---------------------------------------------------------------------------
   * MOBILE MENU
   * -------------------------------------------------------------------------*/
  function wireNavToggle() {
    var toggle = document.querySelector(".nav-toggle");
    var nav = document.getElementById("primary-nav");
    if (!toggle || !nav) return;
    toggle.addEventListener("click", function () {
      var open = nav.classList.toggle("is-open");
      toggle.setAttribute("aria-expanded", String(open));
    });
    // Close the menu after choosing a link on mobile.
    nav.querySelectorAll("a").forEach(function (a) {
      a.addEventListener("click", function () {
        nav.classList.remove("is-open");
        toggle.setAttribute("aria-expanded", "false");
      });
    });
  }

  /* ---------------------------------------------------------------------------
   * MUSIC  -  optional YouTube player (click to play, never autoplay)
   * -------------------------------------------------------------------------*/

  // Pull a YouTube video id out of a full link or a bare id.
  function youTubeId(value) {
    var v = String(value || "").trim();
    if (!v) return "";
    // Already looks like a bare id.
    if (/^[A-Za-z0-9_-]{11}$/.test(v)) return v;
    var m = v.match(/(?:youtu\.be\/|v=|\/embed\/|\/shorts\/)([A-Za-z0-9_-]{11})/);
    return m ? m[1] : "";
  }

  function wireMusic(cfg) {
    var section = document.getElementById("music");
    if (!section) return;
    var music = cfg.music;
    var id = music && music.enabled !== false ? youTubeId(music.youTube) : "";
    if (!id) { section.remove(); return; } // hidden until a song is added

    var holder = section.querySelector("[data-music-embed]");
    if (!holder) return;
    var iframe = document.createElement("iframe");
    iframe.src = "https://www.youtube-nocookie.com/embed/" + id;
    iframe.title = music.heading || "A song in memory";
    iframe.loading = "lazy";
    iframe.setAttribute("allow", "encrypted-media; picture-in-picture");
    iframe.setAttribute("allowfullscreen", "");
    iframe.referrerPolicy = "no-referrer";
    holder.appendChild(iframe);
    section.hidden = false;
  }

  /* ---------------------------------------------------------------------------
   * CALENDAR BUTTON
   * -------------------------------------------------------------------------*/
  function wireCalendar() {
    var btn = document.querySelector("[data-add-to-calendar]");
    if (btn && window.CalendarFeature) {
      btn.addEventListener("click", function () { window.CalendarFeature.download(); });
    }
  }

  /* ---------------------------------------------------------------------------
   * PRIVACY NOTICE TOGGLE
   * -------------------------------------------------------------------------*/
  function wirePrivacyToggle() {
    var btn = document.querySelector("[data-privacy-toggle]");
    var notice = document.getElementById("privacy-notice");
    if (!btn || !notice) return;
    btn.addEventListener("click", function () {
      var open = notice.hidden;
      notice.hidden = !open;
      btn.setAttribute("aria-expanded", String(open));
      if (open) notice.scrollIntoView({ behavior: "smooth", block: "nearest" });
    });
  }

  /* ---------------------------------------------------------------------------
   * START
   * -------------------------------------------------------------------------*/
  function start() {
    var cfg = window.CONFIG;
    if (!cfg) return;

    applyTextBindings(cfg);
    applyPortrait(cfg);
    applyLocationAndDetails(cfg);
    applyTribute(cfg);
    applySchedule(cfg);
    applyFaq(cfg);
    applyFooterContact(cfg);

    wireNavToggle();
    wireCalendar();
    wirePrivacyToggle();
    wireMusic(cfg);

    // Update the document title with the name once known.
    if (cfg.deceased.fullName && cfg.deceased.fullName.indexOf("Full Name") === -1) {
      document.title = cfg.event.name + " - " + cfg.deceased.fullName;
    }

    // Initialize the RSVP form behavior.
    if (window.RsvpFeature) window.RsvpFeature.init();

    // Initialize the memory wall.
    if (window.MemoriesFeature) window.MemoriesFeature.init();

    // Initialize the contact dialog.
    if (window.ContactFeature) window.ContactFeature.init();

    // Initialize the photo slideshow and uploads.
    if (window.PhotosFeature) window.PhotosFeature.init();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start);
  } else {
    start();
  }
})();
