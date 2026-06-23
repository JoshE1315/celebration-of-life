/* =============================================================================
 * contact.js  -  "Contact the Family" dialog and form
 * =============================================================================
 *
 * Opens an accessible popup form. When submitted, the message is sent to the
 * backend, which emails the family (Shane, Amie, and Josh) just like the RSVP
 * notifications. In demo mode the send is simulated.
 * ========================================================================== */

(function () {
  "use strict";

  var cfg, dialog, form, els;
  var submitting = false;

  function isDemoMode() {
    return cfg.demoMode === true || !cfg.appsScriptUrl;
  }

  function clean(value) {
    return String(value == null ? "" : value).trim().replace(/[<>]/g, "");
  }

  function isValidEmail(value) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  }

  function setError(field, message) {
    var msgEl = document.querySelector('[data-error-for="' + field + '"]');
    if (msgEl) msgEl.textContent = message || "";
    var input = document.getElementById(field);
    if (input) {
      if (message) input.setAttribute("aria-invalid", "true");
      else input.removeAttribute("aria-invalid");
    }
  }

  function announce(type, message) {
    els.status.innerHTML =
      '<div class="alert alert--' + type + '" tabindex="-1"><p>' + clean(message) + "</p></div>";
    var alert = els.status.querySelector(".alert");
    if (alert) alert.focus();
  }

  // Open the dialog, remembering what had focus so we can restore it on close.
  var lastFocused = null;
  function openDialog() {
    lastFocused = document.activeElement;
    els.status.innerHTML = "";
    if (typeof dialog.showModal === "function") {
      dialog.showModal();
    } else {
      // Very old browser fallback: show inline.
      dialog.setAttribute("open", "");
    }
    var first = document.getElementById("contactName");
    if (first) first.focus();
  }

  function closeDialog() {
    if (typeof dialog.close === "function") dialog.close();
    else dialog.removeAttribute("open");
    if (lastFocused && lastFocused.focus) lastFocused.focus();
  }

  function setSubmitting(isLoading) {
    els.submit.disabled = isLoading;
    els.submitLabel.textContent = isLoading ? "Sending..." : "Send Message";
    els.spinner.hidden = !isLoading;
  }

  function validate() {
    setError("contactName", "");
    setError("contactEmail", "");
    setError("contactMessage", "");
    var name = clean(form.contactName.value);
    var email = clean(form.contactEmail.value);
    var message = clean(form.contactMessage.value);
    var firstBad = null;
    if (!name) { setError("contactName", "Please add your name."); firstBad = form.contactName; }
    if (!email) { setError("contactEmail", "Please add your email."); if (!firstBad) firstBad = form.contactEmail; }
    else if (!isValidEmail(email)) { setError("contactEmail", "Please enter a valid email."); if (!firstBad) firstBad = form.contactEmail; }
    if (!message) { setError("contactMessage", "Please write a message."); if (!firstBad) firstBad = form.contactMessage; }
    if (firstBad) { firstBad.focus(); return false; }
    return true;
  }

  function send(payload) {
    if (isDemoMode()) {
      return new Promise(function (resolve) {
        setTimeout(function () {
          resolve({ ok: true, message: "Demonstration mode: your message was not sent. Connect the backend to deliver messages." });
        }, 600);
      });
    }
    return fetch(cfg.appsScriptUrl, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(payload),
    }).then(function (res) { return res.json(); });
  }

  function handleSubmit(event) {
    event.preventDefault();
    if (submitting) return;
    els.status.innerHTML = "";
    if (!validate()) return;

    submitting = true;
    setSubmitting(true);

    var payload = {
      action: "contact",
      name: clean(form.contactName.value),
      email: clean(form.contactEmail.value),
      message: clean(form.contactMessage.value),
    };

    send(payload)
      .then(function (result) {
        if (result && result.ok) {
          announce("success", result.message || "Thank you. Your message has been sent.");
          form.reset();
        } else {
          announce("error", (result && result.message) || "We could not send your message. Please try again.");
        }
      })
      .catch(function () {
        announce("error", "We could not reach the server. Please try again in a moment.");
      })
      .finally(function () {
        submitting = false;
        setSubmitting(false);
      });
  }

  function init() {
    cfg = window.CONFIG;
    dialog = document.getElementById("contact-dialog");
    form = document.getElementById("contact-form");
    if (!cfg || !dialog || !form) return;

    els = {
      status: document.querySelector("[data-contact-status]"),
      submit: document.querySelector("[data-contact-submit]"),
      submitLabel: document.querySelector("[data-contact-submit-label]"),
      spinner: document.querySelector("[data-contact-spinner]"),
    };

    // Any button with data-contact-open opens the dialog.
    document.querySelectorAll("[data-contact-open]").forEach(function (btn) {
      btn.addEventListener("click", openDialog);
    });

    var cancel = document.querySelector("[data-contact-cancel]");
    if (cancel) cancel.addEventListener("click", closeDialog);

    form.addEventListener("submit", handleSubmit);

    // Close when clicking the dark backdrop outside the dialog.
    dialog.addEventListener("click", function (e) {
      if (e.target === dialog) closeDialog();
    });
  }

  window.ContactFeature = { init: init };
})();
