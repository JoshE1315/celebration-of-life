/* =============================================================================
 * music.js  -  Background song with a floating Pause / Play control
 * =============================================================================
 *
 * Plays the music file set in config.js (music.audioFile), hosted right in this
 * project, so it is never blocked by networks or third-party rules.
 *
 * Because browsers and phones block sound from starting before a visitor
 * interacts, the song begins at the visitor's first tap, click, key press, or
 * scroll. On phones, the operating system requires a direct tap, so visitors
 * may need to press the floating button once. That button also lets anyone
 * pause or resume at any time.
 * ========================================================================== */

(function () {
  "use strict";

  var cfg, music, audio, btn, label;
  var unlocked = false;

  function startVolumeFraction() {
    var v = typeof music.startVolume === "number" ? music.startVolume : 100;
    if (v < 0) v = 0;
    if (v > 100) v = 100;
    return v / 100;
  }

  function setButtonState(playing) {
    if (!btn) return;
    btn.setAttribute("aria-pressed", playing ? "true" : "false");
    btn.classList.toggle("is-playing", playing);
    label.textContent = playing
      ? (music.pauseLabel || "Pause music")
      : (music.playLabel || "Play music");
  }

  function buildControl() {
    btn = document.createElement("button");
    btn.type = "button";
    btn.className = "music-toggle";
    btn.setAttribute("aria-pressed", "false");

    var icon = document.createElement("span");
    icon.className = "music-toggle__icon";
    icon.setAttribute("aria-hidden", "true");
    icon.textContent = "♪";

    label = document.createElement("span");
    label.className = "music-toggle__label";
    label.textContent = music.playLabel || "Play music";

    btn.appendChild(icon);
    btn.appendChild(label);
    btn.addEventListener("click", togglePlay);
    document.body.appendChild(btn);
  }

  function togglePlay() {
    if (!audio) return;
    if (audio.paused) { audio.play().catch(function () {}); }
    else { audio.pause(); }
  }

  // The first time the visitor interacts with the page, start the song.
  var interactionEvents = ["pointerdown", "touchstart", "keydown", "scroll", "click"];
  function onFirstInteraction() {
    if (unlocked || music.autoplay === false) return;
    var p = audio.play();
    if (p && p.then) {
      // Only stop listening once playback actually starts. If the first tap
      // happens before the file has buffered (common on phones), the next
      // interaction tries again.
      p.then(function () { unlocked = true; removeInteractionListeners(); })
       .catch(function () { /* keep listening and retry on next interaction */ });
    } else {
      unlocked = true;
      removeInteractionListeners();
    }
  }
  function addInteractionListeners() {
    interactionEvents.forEach(function (ev) {
      window.addEventListener(ev, onFirstInteraction, { passive: true });
    });
  }
  function removeInteractionListeners() {
    interactionEvents.forEach(function (ev) {
      window.removeEventListener(ev, onFirstInteraction, { passive: true });
    });
  }

  function init() {
    cfg = window.CONFIG;
    if (!cfg) return;
    music = cfg.music || {};
    if (music.enabled === false || !music.audioFile) return;

    audio = document.createElement("audio");
    audio.src = music.audioFile;
    audio.loop = music.loop !== false;
    audio.preload = "auto";
    audio.volume = startVolumeFraction();
    audio.setAttribute("aria-hidden", "true");
    document.body.appendChild(audio);

    audio.addEventListener("play", function () { setButtonState(true); });
    audio.addEventListener("pause", function () { setButtonState(false); });
    audio.addEventListener("error", function () {
      // If the file is missing or cannot play, remove the control quietly.
      if (btn && btn.parentNode) btn.parentNode.removeChild(btn);
      btn = null;
    });

    buildControl();
    addInteractionListeners();
  }

  window.MusicFeature = { init: init };
})();
