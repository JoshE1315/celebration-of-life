/* =============================================================================
 * memories.js  -  Public memory wall: load approved memories and submit new ones
 * =============================================================================
 *
 * Friends and family can post a short memory. Posts are saved by the backend
 * and, by default, appear here only after the family approves them (this keeps
 * the page free of spam or anything unkind). Approved memories are loaded from
 * the backend and shown newest first.
 *
 * In demo mode (no backend connected) this shows a couple of sample memories
 * and simulates posting, so you can see how it looks before going live.
 * ========================================================================== */

(function () {
  "use strict";

  var cfg, els;

  // Sample memories shown only in demo mode.
  var DEMO_MEMORIES = [
    { name: "A Friend", memory: "He always had the kindest words and the warmest smile. I will miss him dearly.", date: "" },
    { name: "Sample Guest", memory: "So many good times and good laughs. A truly wonderful person.", date: "" },
  ];

  function isDemoMode() {
    return cfg.demoMode === true || !cfg.appsScriptUrl;
  }

  // Light cleaning, same idea as the RSVP form. The backend cleans again.
  function clean(value) {
    return String(value == null ? "" : value).trim().replace(/[<>]/g, "");
  }

  // Build a text node based element safely (never inject raw HTML).
  function el(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text != null) node.textContent = text;
    return node;
  }

  function setError(field, message) {
    var msgEl = document.querySelector('[data-error-for="' + field + '"]');
    if (msgEl) msgEl.textContent = message || "";
    var input = document.getElementById(field === "memoryName" ? "memoryName" : "memoryText");
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

  /* ---------------------------------------------------------------------------
   * RENDER the list of approved memories
   * -------------------------------------------------------------------------*/
  function renderMemories(memories) {
    els.list.innerHTML = "";
    if (!memories || !memories.length) {
      els.list.appendChild(
        el("p", "memory-wall__empty",
          "No memories have been shared yet. Be the first to leave one above.")
      );
      return;
    }
    memories.forEach(function (m) {
      var card = el("figure", "memory-card");
      var quote = el("blockquote", "memory-card__text", m.memory);
      var cite = el("figcaption", "memory-card__author", m.name || "A friend");
      card.appendChild(quote);
      card.appendChild(cite);
      els.list.appendChild(card);
    });
  }

  function loadMemories() {
    if (isDemoMode()) {
      renderMemories(DEMO_MEMORIES);
      return;
    }
    var url = cfg.appsScriptUrl + "?action=memories";
    fetch(url, { method: "GET" })
      .then(function (res) { return res.json(); })
      .then(function (data) {
        renderMemories(data && data.ok ? data.memories : []);
      })
      .catch(function () {
        // Quietly show an empty state; the form still works.
        renderMemories([]);
      });
  }

  /* ---------------------------------------------------------------------------
   * SUBMIT a new memory
   * -------------------------------------------------------------------------*/
  var submitting = false;

  function setSubmitting(isLoading) {
    els.submit.disabled = isLoading;
    els.submitLabel.textContent = isLoading ? "Posting..." : (cfg.memoryWall.submitLabel || "Post Memory");
    els.spinner.hidden = !isLoading;
  }

  function validate() {
    setError("memoryName", "");
    setError("memoryText", "");
    var name = clean(els.form.memoryName.value);
    var memory = clean(els.form.memoryText.value);
    var firstBad = null;
    if (!name) { setError("memoryName", "Please add your name."); firstBad = els.form.memoryName; }
    if (!memory) { setError("memoryText", "Please write a short memory."); if (!firstBad) firstBad = els.form.memoryText; }
    else if (memory.length > cfg.memoryWall.maxLength) {
      setError("memoryText", "Please shorten your memory."); if (!firstBad) firstBad = els.form.memoryText;
    }
    if (firstBad) { firstBad.focus(); return false; }
    return true;
  }

  function send(payload) {
    if (isDemoMode()) {
      return new Promise(function (resolve) {
        setTimeout(function () {
          resolve({ ok: true, approved: false,
            message: "Demonstration mode: your memory was not sent. Connect the backend to collect real memories." });
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
      action: "memory",
      name: clean(els.form.memoryName.value),
      memory: clean(els.form.memoryText.value),
    };

    send(payload)
      .then(function (result) {
        if (result && result.ok) {
          announce("success", result.message ||
            "Thank you for sharing your memory.");
          els.form.reset();
          updateCount();
          // If it was approved instantly (or demo), refresh the list.
          if (result.approved) loadMemories();
        } else {
          announce("error", (result && result.message) ||
            "We could not post your memory. Please try again.");
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

  /* ---------------------------------------------------------------------------
   * Character count
   * -------------------------------------------------------------------------*/
  function updateCount() {
    if (!els.count) return;
    var len = els.form.memoryText.value.length;
    els.count.textContent = len + " of " + cfg.memoryWall.maxLength + " characters";
    els.count.style.color = len > cfg.memoryWall.maxLength ? "var(--color-error)" : "";
  }

  /* ---------------------------------------------------------------------------
   * INIT
   * -------------------------------------------------------------------------*/
  function init() {
    cfg = window.CONFIG;
    var section = document.getElementById("memories");
    var form = document.getElementById("memory-form");
    if (!cfg || !section || !form) return;

    // Respect the on/off switch in config.
    if (!cfg.memoryWall || cfg.memoryWall.enabled === false) {
      section.remove();
      var navItem = document.querySelector('#primary-nav a[href="#memories"]');
      if (navItem && navItem.parentElement) navItem.parentElement.remove();
      return;
    }

    section.hidden = false;

    els = {
      form: form,
      status: document.querySelector("[data-memory-status]"),
      list: document.querySelector("[data-memory-list]"),
      submit: document.querySelector("[data-memory-submit]"),
      submitLabel: document.querySelector("[data-memory-submit-label]"),
      spinner: document.querySelector("[data-memory-spinner]"),
      count: document.querySelector("[data-memory-count]"),
    };

    els.submitLabel.textContent = cfg.memoryWall.submitLabel || "Post Memory";
    els.form.memoryText.setAttribute("maxlength", String(cfg.memoryWall.maxLength));
    els.form.addEventListener("submit", handleSubmit);
    els.form.memoryText.addEventListener("input", updateCount);
    updateCount();

    loadMemories();
  }

  window.MemoriesFeature = { init: init };
})();
