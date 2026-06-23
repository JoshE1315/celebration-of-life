/* =============================================================================
 * rsvp.js  -  RSVP form: validation, submission, demo mode, invite lookup
 * =============================================================================
 *
 * SECURITY NOTE (please read):
 *   GitHub Pages is a PUBLIC web host. Anything in these JavaScript files can
 *   be read by anyone. You cannot hide secrets here. All real security and the
 *   real guest limit are enforced by the Google Apps Script backend, which is
 *   private. This file only provides a friendly, convenient experience.
 *
 * This script:
 *   - Looks up an invitation code through the backend (or demo data).
 *   - Validates the form on the visitor's device for quick feedback.
 *   - Sanitizes input lightly and never logs personal data to the console.
 *   - Prevents duplicate submissions when the button is clicked repeatedly.
 *   - Submits as JSON to the Apps Script web app, or simulates it in demo mode.
 * ========================================================================== */

(function () {
  "use strict";

  /* ---------------------------------------------------------------------------
   * DEMO DATA
   * These sample invitations are used ONLY when demo mode is on. They are
   * clearly fictional and contain no real personal information. In production,
   * the backend looks codes up in your private Google Sheet instead.
   * -------------------------------------------------------------------------*/
  var DEMO_INVITATIONS = {
    "COL-001": { household: "Sample Family One", maxGuests: 4, childrenAllowed: true,  active: true,  status: "" },
    "COL-002": { household: "Sample Guest Two", maxGuests: 1, childrenAllowed: false, active: true,  status: "" },
    "COL-003": { household: "Example Household Three", maxGuests: 6, childrenAllowed: true,  active: true,  status: "Attending" },
    "COL-004": { household: "Inactive Example Four", maxGuests: 2, childrenAllowed: false, active: false, status: "" },
  };

  /* ---------------------------------------------------------------------------
   * STATE
   * -------------------------------------------------------------------------*/
  var state = {
    invitation: null,   // details returned from lookup
    submitting: false,  // guard against duplicate submissions
  };

  var cfg, els;

  /* ---------------------------------------------------------------------------
   * HELPERS
   * -------------------------------------------------------------------------*/

  // Is the site effectively in demo mode? Forced on when no endpoint is set.
  function isDemoMode() {
    return cfg.demoMode === true || !cfg.appsScriptUrl;
  }

  // Light sanitizing: trim and strip angle brackets so nothing looks like HTML.
  // The backend sanitizes again; never trust the browser alone.
  function clean(value) {
    return String(value == null ? "" : value).trim().replace(/[<>]/g, "");
  }

  // Basic email check. Intentionally simple and permissive.
  function isValidEmail(value) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  }

  // Normalize an invitation code: uppercase, trim, collapse spaces.
  function normalizeCode(value) {
    return clean(value).toUpperCase().replace(/\s+/g, "");
  }

  function show(el) { if (el) el.hidden = false; }
  function hide(el) { if (el) el.hidden = true; }

  // Set or clear an inline error message for a field, and mark it invalid.
  function setError(fieldName, message) {
    var msgEl = document.querySelector('[data-error-for="' + fieldName + '"]');
    if (msgEl) msgEl.textContent = message || "";
    var input = els.form.querySelector('[name="' + fieldName + '"]');
    if (input) {
      if (message) input.setAttribute("aria-invalid", "true");
      else input.removeAttribute("aria-invalid");
    }
  }

  function clearAllErrors() {
    els.form.querySelectorAll("[data-error-for]").forEach(function (n) { n.textContent = ""; });
    els.form.querySelectorAll('[aria-invalid="true"]').forEach(function (n) { n.removeAttribute("aria-invalid"); });
  }

  // Announce a status message in the aria-live region (success or error).
  function announce(type, title, htmlBody) {
    els.status.innerHTML =
      '<div class="alert alert--' + type + '" tabindex="-1">' +
      "<h3>" + title + "</h3>" + htmlBody + "</div>";
    var alert = els.status.querySelector(".alert");
    if (alert) alert.focus();
  }

  function clearStatus() { els.status.innerHTML = ""; }

  /* ---------------------------------------------------------------------------
   * INVITATION LOOKUP
   * -------------------------------------------------------------------------*/

  // Perform the lookup, either against demo data or the live backend.
  function lookupInvitation(code) {
    if (isDemoMode()) {
      return new Promise(function (resolve) {
        // Simulate a brief network delay for a realistic demo.
        setTimeout(function () {
          var record = DEMO_INVITATIONS[code];
          if (!record) {
            resolve({ ok: false, reason: "not_found" });
          } else if (!record.active) {
            resolve({ ok: false, reason: "inactive" });
          } else {
            resolve({
              ok: true,
              invitation: {
                code: code,
                household: record.household,
                maxGuests: record.maxGuests,
                childrenAllowed: record.childrenAllowed,
                status: record.status,
              },
            });
          }
        }, 500);
      });
    }

    // Live lookup: GET request with the code as a query parameter.
    var url = cfg.appsScriptUrl + "?action=lookup&code=" + encodeURIComponent(code);
    return fetch(url, { method: "GET" })
      .then(function (res) { return res.json(); })
      .then(function (data) {
        if (data && data.ok && data.invitation) {
          return { ok: true, invitation: data.invitation };
        }
        return { ok: false, reason: (data && data.reason) || "not_found" };
      });
  }

  function handleLookup() {
    var code = normalizeCode(els.codeInput.value);
    setError("invitationCode", "");

    if (!code) {
      setError("invitationCode", "Please enter your invitation code.");
      els.codeInput.focus();
      return;
    }

    els.lookupButton.disabled = true;
    els.lookupButton.textContent = "Checking...";

    lookupInvitation(code)
      .then(function (result) {
        if (!result.ok) {
          var message = result.reason === "inactive"
            ? "This invitation is no longer active. Please contact the family."
            : "We could not find that code. Please check it and try again.";
          setError("invitationCode", message);
          hide(els.rsvpMain);
          hide(els.inviteSummary);
          els.codeInput.focus();
          return;
        }
        applyInvitation(result.invitation);
      })
      .catch(function () {
        setError("invitationCode",
          "We could not reach the server. Please try again, or contact the family.");
      })
      .finally(function () {
        els.lookupButton.disabled = false;
        els.lookupButton.textContent = "Find my invitation";
      });
  }

  // Configure the form based on the looked-up invitation.
  function applyInvitation(invitation) {
    state.invitation = invitation;

    // Greeting and limit summary.
    els.inviteGreeting.textContent = "Welcome, " + invitation.household + ".";
    var limitText = invitation.maxGuests === 1
      ? "This invitation is reserved for 1 guest."
      : "This invitation is reserved for up to " + invitation.maxGuests + " guests.";
    if (!invitation.childrenAllowed) limitText += " (Adults only.)";
    els.inviteLimit.textContent = limitText;
    show(els.inviteSummary);

    // Store the household name in a hidden field for submission.
    els.householdNameInput.value = invitation.household;

    // Build the "number attending" dropdown up to the allowed maximum.
    buildAttendingOptions(invitation.maxGuests);

    // Show or hide the children field.
    if (invitation.childrenAllowed && cfg.rsvp.collectChildrenNames) {
      show(els.childrenField);
    } else {
      hide(els.childrenField);
    }

    show(els.rsvpMain);
    clearStatus();

    // Move focus to the first real field for convenience.
    var firstField = document.getElementById("primaryName");
    if (firstField) firstField.focus();
  }

  // Populate the number-attending <select> with 1..max.
  function buildAttendingOptions(max) {
    var ceiling = Math.min(max || 1, cfg.rsvp.maxGuestsCeiling || 12);
    els.numberAttending.innerHTML = "";
    var placeholder = document.createElement("option");
    placeholder.value = "";
    placeholder.textContent = "Please choose";
    els.numberAttending.appendChild(placeholder);
    for (var i = 1; i <= ceiling; i++) {
      var opt = document.createElement("option");
      opt.value = String(i);
      opt.textContent = String(i);
      els.numberAttending.appendChild(opt);
    }
  }

  /* ---------------------------------------------------------------------------
   * RSVP STATUS BEHAVIOR
   * Hide attendance fields when "Not Attending" is chosen.
   * -------------------------------------------------------------------------*/
  function handleStatusChange() {
    var selected = els.form.querySelector('input[name="rsvpStatus"]:checked');
    var notAttending = selected && selected.value === "Not Attending";
    if (notAttending) {
      hide(els.attendanceFields);
    } else {
      show(els.attendanceFields);
    }
  }

  /* ---------------------------------------------------------------------------
   * VALIDATION
   * Returns true if valid; otherwise sets inline errors and returns false.
   * -------------------------------------------------------------------------*/
  function validateForm() {
    clearAllErrors();
    var firstInvalid = null;
    function fail(name, message) {
      setError(name, message);
      if (!firstInvalid) firstInvalid = els.form.querySelector('[name="' + name + '"]');
    }

    // Invitation code is required when the site requires one.
    if (cfg.requireInvitationCode) {
      var code = normalizeCode(els.codeInput.value);
      if (!code) fail("invitationCode", "Please enter your invitation code.");
      else if (!state.invitation) fail("invitationCode", "Please select Find my invitation first.");
    }

    var name = clean(els.form.primaryName.value);
    if (!name) fail("primaryName", "Please enter your name.");

    var email = clean(els.form.email.value);
    if (!email) fail("email", "Please enter your email address.");
    else if (!isValidEmail(email)) fail("email", "Please enter a valid email address.");

    var status = els.form.querySelector('input[name="rsvpStatus"]:checked');
    if (!status) fail("rsvpStatus", "Please let us know if you can attend.");

    // Attendance details are only required when attending or tentative.
    if (status && status.value !== "Not Attending") {
      var count = parseInt(els.numberAttending.value, 10);
      if (!count) {
        fail("numberAttending", "Please choose how many will attend.");
      } else if (state.invitation && count > state.invitation.maxGuests) {
        // The backend enforces this too; this is a friendly early warning.
        fail("numberAttending",
          "This invitation allows up to " + state.invitation.maxGuests + " guests.");
      }

      var attendeeNames = clean(els.form.attendeeNames.value);
      if (!attendeeNames) fail("attendeeNames", "Please list the names of those attending.");
    }

    // Message length guard.
    if (els.message) {
      var msg = els.form.message.value;
      if (msg && msg.length > cfg.rsvp.maxMessageLength) {
        fail("message", "Please shorten your message.");
      }
    }

    if (!els.form.consent.checked) {
      fail("consent", "Please confirm your information is correct.");
    }

    if (firstInvalid) {
      firstInvalid.focus();
      return false;
    }
    return true;
  }

  /* ---------------------------------------------------------------------------
   * SUBMISSION
   * -------------------------------------------------------------------------*/

  // Gather the form values into a plain object for the backend.
  function collectPayload() {
    var status = els.form.querySelector('input[name="rsvpStatus"]:checked');
    var attending = status && status.value !== "Not Attending";
    return {
      action: "rsvp",
      invitationCode: cfg.requireInvitationCode ? normalizeCode(els.codeInput.value) : "",
      householdName: clean(els.householdNameInput.value),
      primaryName: clean(els.form.primaryName.value),
      email: clean(els.form.email.value),
      phone: clean(els.form.phone.value),
      rsvpStatus: status ? status.value : "",
      numberAttending: attending ? clean(els.numberAttending.value) : "0",
      attendeeNames: attending ? clean(els.form.attendeeNames.value) : "",
      childrenNames: attending && els.childrenField && !els.childrenField.hidden
        ? clean(els.form.childrenNames.value) : "",
      dietary: attending ? clean(els.form.dietary.value) : "",
      accessibility: attending ? clean(els.form.accessibility.value) : "",
      message: els.message ? clean(els.form.message.value) : "",
      source: "website",
    };
  }

  function sendToBackend(payload) {
    if (isDemoMode()) {
      // Simulate a successful save without sending anything anywhere.
      return new Promise(function (resolve) {
        setTimeout(function () { resolve({ ok: true, demo: true }); }, 700);
      });
    }

    // Apps Script web apps accept a simple POST. We use text/plain to avoid a
    // CORS preflight request, which Apps Script does not handle. The backend
    // reads the raw body and parses it as JSON. See google-apps-script/README.
    return fetch(cfg.appsScriptUrl, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(payload),
    }).then(function (res) {
      return res.json();
    });
  }

  function handleSubmit(event) {
    event.preventDefault();

    // Guard against duplicate submissions from rapid clicks.
    if (state.submitting) return;

    clearStatus();
    if (!validateForm()) {
      announce("error", "Please check the form",
        "<p>Some required information is missing or needs a small fix. " +
        "The fields with a warning above need your attention.</p>");
      return;
    }

    state.submitting = true;
    setSubmitting(true);

    var payload = collectPayload();

    sendToBackend(payload)
      .then(function (result) {
        if (result && result.ok) {
          showSuccess(payload, result);
        } else {
          showFailure(result && result.message);
        }
      })
      .catch(function () {
        // Do not log personal data. A generic message is enough.
        showFailure();
      })
      .finally(function () {
        state.submitting = false;
        setSubmitting(false);
      });
  }

  // Toggle the loading state of the submit button.
  function setSubmitting(isLoading) {
    els.submitButton.disabled = isLoading;
    els.submitLabel.textContent = isLoading ? "Sending..." : "Send RSVP";
    if (isLoading) show(els.spinner); else hide(els.spinner);
  }

  function showSuccess(payload, result) {
    var attending = payload.rsvpStatus === "Attending";
    var tentative = payload.rsvpStatus === "Tentative";
    var lead = attending
      ? "Thank you. We have recorded your reply and look forward to seeing you."
      : tentative
        ? "Thank you. We have noted your tentative reply and hope you can join us."
        : "Thank you for letting us know. You will be missed.";

    var demoNote = (result && result.demo)
      ? "<p><em>Demonstration mode: this reply was not sent anywhere. " +
        "Connect the backend to record real responses.</em></p>"
      : "";

    announce("success", "Your RSVP was received", "<p>" + lead + "</p>" + demoNote);

    // Reset the form for a clean state, but keep the invitation in place so a
    // guest can update again if needed.
    els.form.reset();
    if (state.invitation) {
      els.householdNameInput.value = state.invitation.household;
      buildAttendingOptions(state.invitation.maxGuests);
    }
    handleStatusChange();
    updateMessageCount();
  }

  function showFailure(message) {
    var contactBits = [];
    if (cfg.contact && cfg.contact.email) {
      contactBits.push('email <a href="mailto:' + cfg.contact.email + '">' + cfg.contact.email + "</a>");
    }
    if (cfg.contact && cfg.contact.phone) {
      contactBits.push("call " + cfg.contact.phone);
    }
    var contactLine = contactBits.length
      ? "<p>Please try again in a moment, or reach the family directly: " +
        contactBits.join(" or ") + ".</p>"
      : "<p>Please try again in a moment, or reach the family directly using the contact details on this page.</p>";

    announce("error", "We could not send your RSVP",
      "<p>" + (message ? clean(message) : "Something went wrong while sending your reply.") + "</p>" + contactLine);
  }

  /* ---------------------------------------------------------------------------
   * MESSAGE CHARACTER COUNT
   * -------------------------------------------------------------------------*/
  function updateMessageCount() {
    if (!els.message || !els.messageCount) return;
    var max = cfg.rsvp.maxMessageLength;
    var len = els.message.value.length;
    els.messageCount.textContent = len + " of " + max + " characters";
    if (len > max) els.messageCount.style.color = "var(--color-error)";
    else els.messageCount.style.color = "";
  }

  /* ---------------------------------------------------------------------------
   * INITIALIZATION  -  called by app.js after config is rendered
   * -------------------------------------------------------------------------*/
  function init() {
    cfg = window.CONFIG;
    var form = document.getElementById("rsvp-form");
    if (!cfg || !form) return;

    els = {
      form: form,
      status: document.querySelector("[data-form-status]"),
      codeInput: document.getElementById("invitationCode"),
      lookupButton: document.querySelector("[data-lookup-button]"),
      inviteGroup: document.querySelector("[data-invite-group]"),
      inviteSummary: document.querySelector("[data-invite-summary]"),
      inviteGreeting: document.querySelector("[data-invite-greeting]"),
      inviteLimit: document.querySelector("[data-invite-limit]"),
      rsvpMain: document.querySelector("[data-rsvp-main]"),
      householdNameInput: document.querySelector("[data-household-name]"),
      attendanceFields: document.querySelector("[data-attendance-fields]"),
      childrenField: document.querySelector("[data-children-field]"),
      numberAttending: document.getElementById("numberAttending"),
      message: document.getElementById("message"),
      messageCount: document.querySelector("[data-message-count]"),
      submitButton: document.querySelector("[data-submit-button]"),
      submitLabel: document.querySelector("[data-submit-label]"),
      spinner: document.querySelector("[data-spinner]"),
      demoBanner: document.querySelector("[data-demo-banner]"),
      tentativeOption: document.querySelector("[data-tentative-option]"),
    };

    // Show the demo banner when appropriate.
    if (isDemoMode()) show(els.demoBanner);

    // Hide or show the tentative option per config.
    if (els.tentativeOption && !cfg.rsvp.allowTentative) hide(els.tentativeOption);

    // Hide the memory field if memories are not collected.
    if (!cfg.rsvp.collectMemories) {
      var memoryField = document.querySelector("[data-memory-field]");
      if (memoryField) hide(memoryField);
    }

    // When an invitation code is NOT required, show the main fields right away
    // and hide the lookup group.
    if (!cfg.requireInvitationCode) {
      hide(els.inviteGroup);
      buildAttendingOptions(cfg.rsvp.maxGuestsCeiling);
      if (cfg.rsvp.collectChildrenNames) show(els.childrenField);
      show(els.rsvpMain);
    }

    // Wire up events.
    if (els.lookupButton) els.lookupButton.addEventListener("click", handleLookup);
    if (els.codeInput) {
      els.codeInput.addEventListener("keydown", function (e) {
        if (e.key === "Enter") { e.preventDefault(); handleLookup(); }
      });
    }
    els.form.addEventListener("submit", handleSubmit);
    els.form.querySelectorAll('input[name="rsvpStatus"]').forEach(function (r) {
      r.addEventListener("change", handleStatusChange);
    });
    if (els.message) {
      els.message.setAttribute("maxlength", String(cfg.rsvp.maxMessageLength));
      els.message.addEventListener("input", updateMessageCount);
      updateMessageCount();
    }

    handleStatusChange();
  }

  window.RsvpFeature = { init: init };
})();
