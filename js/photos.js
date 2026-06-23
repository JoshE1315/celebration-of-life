/* =============================================================================
 * photos.js  -  Hero slideshow and visitor photo uploads
 * =============================================================================
 *
 * Two jobs:
 *   1. SLIDESHOW: loads approved photos from the backend and adds them to the
 *      hero photo area so they rotate alongside the main portrait.
 *   2. UPLOAD: lets a visitor submit a photo. The image is shrunk in the
 *      browser first (so it uploads quickly), then sent to the backend, which
 *      stores it and holds it for the family to approve.
 *
 * In demo mode uploads are simulated and no slideshow photos are loaded.
 * ========================================================================== */

(function () {
  "use strict";

  var cfg, els;
  var submitting = false;

  function isDemoMode() {
    return cfg.demoMode === true || !cfg.appsScriptUrl;
  }

  function clean(value) {
    return String(value == null ? "" : value).trim().replace(/[<>]/g, "");
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

  /* ---------------------------------------------------------------------------
   * SLIDESHOW
   * -------------------------------------------------------------------------*/
  var slides = [];   // array of slide elements
  var captions = []; // matching captions
  var current = 0;
  var timer = null;

  function prefersReducedMotion() {
    return window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }

  function showSlide(index) {
    if (!slides.length) return;
    current = (index + slides.length) % slides.length;
    slides.forEach(function (s, i) {
      if (i === current) s.classList.add("is-active");
      else s.classList.remove("is-active");
    });
    var cap = document.querySelector("[data-slideshow-caption]");
    if (cap) cap.textContent = captions[current] || "";
  }

  function nextSlide() { showSlide(current + 1); }
  function prevSlide() { showSlide(current - 1); }

  function startAuto() {
    if (prefersReducedMotion() || slides.length < 2) return;
    stopAuto();
    timer = setInterval(nextSlide, 5000);
  }
  function stopAuto() { if (timer) { clearInterval(timer); timer = null; } }

  function buildSlideshow(photos) {
    var container = document.querySelector("[data-slideshow-slides]");
    if (!container) return;

    // The portrait slide is already present (added by app.js).
    slides = Array.prototype.slice.call(container.querySelectorAll(".slideshow__slide"));
    captions = slides.map(function () { return ""; });

    photos.forEach(function (p) {
      var img = new Image();
      img.src = p.url;
      img.alt = p.caption ? p.caption : ("A photo shared by " + (p.name || "a friend"));
      img.loading = "lazy";
      img.className = "slideshow__slide";
      img.referrerPolicy = "no-referrer";
      container.appendChild(img);
      slides.push(img);
      captions.push(p.caption || "");
    });

    if (slides.length > 1) {
      var prev = document.querySelector("[data-slideshow-prev]");
      var next = document.querySelector("[data-slideshow-next]");
      if (prev) { prev.hidden = false; prev.addEventListener("click", function () { prevSlide(); startAuto(); }); }
      if (next) { next.hidden = false; next.addEventListener("click", function () { nextSlide(); startAuto(); }); }

      var show = document.querySelector("[data-slideshow]");
      if (show) {
        show.addEventListener("mouseenter", stopAuto);
        show.addEventListener("mouseleave", startAuto);
        show.addEventListener("focusin", stopAuto);
        show.addEventListener("focusout", startAuto);
      }
      showSlide(0);
      startAuto();
    }
  }

  function loadPhotos() {
    if (isDemoMode()) return; // nothing to load in demo mode
    fetch(cfg.appsScriptUrl + "?action=photos", { method: "GET" })
      .then(function (res) { return res.json(); })
      .then(function (data) {
        if (data && data.ok && data.photos && data.photos.length) {
          buildSlideshow(data.photos);
        }
      })
      .catch(function () { /* slideshow simply stays as the single portrait */ });
  }

  /* ---------------------------------------------------------------------------
   * UPLOAD
   * -------------------------------------------------------------------------*/

  // Shrink an image file in the browser. Returns a Promise of
  // { mimeType, dataBase64 } where dataBase64 has no data-url prefix.
  function shrinkImage(file) {
    return new Promise(function (resolve, reject) {
      var reader = new FileReader();
      reader.onerror = function () { reject(new Error("read")); };
      reader.onload = function () {
        var img = new Image();
        img.onerror = function () { reject(new Error("decode")); };
        img.onload = function () {
          var max = cfg.photos.maxDimension || 1600;
          var w = img.width, h = img.height;
          if (w > max || h > max) {
            if (w >= h) { h = Math.round(h * (max / w)); w = max; }
            else { w = Math.round(w * (max / h)); h = max; }
          }
          var canvas = document.createElement("canvas");
          canvas.width = w; canvas.height = h;
          var ctx = canvas.getContext("2d");
          // White background so any transparency does not turn black.
          ctx.fillStyle = "#ffffff";
          ctx.fillRect(0, 0, w, h);
          ctx.drawImage(img, 0, 0, w, h);
          var dataUrl = canvas.toDataURL("image/jpeg", 0.85);
          resolve({ mimeType: "image/jpeg", dataBase64: dataUrl.split(",")[1] });
        };
        img.src = reader.result;
      };
      reader.readAsDataURL(file);
    });
  }

  function setSubmitting(isLoading) {
    els.submit.disabled = isLoading;
    els.submitLabel.textContent = isLoading ? "Uploading..." : (cfg.photos.submitLabel || "Upload Photo");
    els.spinner.hidden = !isLoading;
  }

  function handleSubmit(event) {
    event.preventDefault();
    if (submitting) return;
    els.status.innerHTML = "";
    setError("photoName", "");
    setError("photoFile", "");

    var name = clean(els.form.photoName.value);
    var caption = clean(els.form.photoCaption.value);
    var file = els.form.photoFile.files && els.form.photoFile.files[0];

    var firstBad = null;
    if (!name) { setError("photoName", "Please add your name."); firstBad = els.form.photoName; }
    if (!file) { setError("photoFile", "Please choose a photo."); if (!firstBad) firstBad = els.form.photoFile; }
    else if (file.type.indexOf("image/") !== 0) {
      setError("photoFile", "Please choose an image file."); if (!firstBad) firstBad = els.form.photoFile;
    }
    if (firstBad) { firstBad.focus(); return; }

    submitting = true;
    setSubmitting(true);

    shrinkImage(file)
      .then(function (image) {
        var payload = {
          action: "photo",
          name: name,
          caption: caption,
          mimeType: image.mimeType,
          dataBase64: image.dataBase64,
        };
        if (isDemoMode()) {
          return new Promise(function (resolve) {
            setTimeout(function () {
              resolve({ ok: true, message: "Demonstration mode: your photo was not sent. Connect the backend to collect photos." });
            }, 700);
          });
        }
        return fetch(cfg.appsScriptUrl, {
          method: "POST",
          headers: { "Content-Type": "text/plain;charset=utf-8" },
          body: JSON.stringify(payload),
        }).then(function (res) { return res.json(); });
      })
      .then(function (result) {
        if (result && result.ok) {
          announce("success", result.message || "Thank you. Your photo has been sent to the family.");
          els.form.reset();
        } else {
          announce("error", (result && result.message) || "We could not upload your photo. Please try again.");
        }
      })
      .catch(function () {
        announce("error", "We could not upload your photo. Please try a different image or try again.");
      })
      .finally(function () {
        submitting = false;
        setSubmitting(false);
      });
  }

  /* ---------------------------------------------------------------------------
   * INIT
   * -------------------------------------------------------------------------*/
  function init() {
    cfg = window.CONFIG;
    if (!cfg) return;

    // Always try to load approved photos into the slideshow.
    loadPhotos();

    // The upload form only appears if photos are enabled.
    var wrap = document.querySelector("[data-photo-upload]");
    var form = document.getElementById("photo-form");
    if (!cfg.photos || cfg.photos.enabled === false || !wrap || !form) {
      if (wrap) wrap.remove();
      return;
    }
    wrap.hidden = false;

    els = {
      form: form,
      status: document.querySelector("[data-photo-status]"),
      submit: document.querySelector("[data-photo-submit]"),
      submitLabel: document.querySelector("[data-photo-submit-label]"),
      spinner: document.querySelector("[data-photo-spinner]"),
    };
    els.submitLabel.textContent = cfg.photos.submitLabel || "Upload Photo";
    form.addEventListener("submit", handleSubmit);
  }

  window.PhotosFeature = { init: init };
})();
