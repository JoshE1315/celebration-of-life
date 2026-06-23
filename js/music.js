/* =============================================================================
 * music.js  -  Background song with a floating Pause / Play control
 * =============================================================================
 *
 * Plays the configured YouTube song in the background. Because browsers block
 * sound from starting before a visitor interacts, the song begins muted and is
 * unmuted at the visitor's first tap, click, key press, or scroll. A small
 * floating button lets anyone pause or resume.
 *
 * SELF-HEALING: some YouTube uploads do not allow playback on other websites.
 * The config provides a main song plus backups. This module tries each one in
 * order until it finds a version that is allowed to play. If none can play (or
 * the network blocks YouTube), the floating button becomes a "Listen on
 * YouTube" link so the song is always reachable.
 *
 * Uses the official YouTube IFrame Player API. No paid services.
 * ========================================================================== */

(function () {
  "use strict";

  var cfg, music, candidates, watchUrl;
  var player = null;
  var index = 0;
  var playerReady = false;
  var fallback = false;
  var unlocked = false;
  var attemptTimer = null;
  var btn, label;

  function youTubeId(value) {
    var v = String(value || "").trim();
    if (!v) return "";
    if (/^[A-Za-z0-9_-]{11}$/.test(v)) return v;
    var m = v.match(/(?:youtu\.be\/|v=|\/embed\/|\/shorts\/)([A-Za-z0-9_-]{11})/);
    return m ? m[1] : "";
  }

  // Build the ordered, de-duplicated list of candidate video ids.
  function buildCandidates() {
    var raw = [];
    if (Array.isArray(music.youTube)) raw = raw.concat(music.youTube);
    else if (music.youTube) raw.push(music.youTube);
    if (Array.isArray(music.alternates)) raw = raw.concat(music.alternates);

    var seen = {}, list = [];
    raw.forEach(function (item) {
      var id = youTubeId(item);
      if (id && !seen[id]) { seen[id] = true; list.push(id); }
    });
    return list;
  }

  function loadApi() {
    return new Promise(function (resolve, reject) {
      if (window.YT && window.YT.Player) { resolve(); return; }
      var prev = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = function () {
        if (typeof prev === "function") { try { prev(); } catch (e) {} }
        resolve();
      };
      if (!document.getElementById("yt-iframe-api")) {
        var s = document.createElement("script");
        s.id = "yt-iframe-api";
        s.src = "https://www.youtube.com/iframe_api";
        s.onerror = function () { reject(new Error("api")); };
        document.head.appendChild(s);
      }
    });
  }

  function isPlaying() {
    return player && player.getPlayerState && player.getPlayerState() === 1;
  }

  function setButtonState(playing) {
    if (!btn || fallback) return;
    btn.setAttribute("aria-pressed", playing ? "true" : "false");
    btn.classList.toggle("is-playing", playing);
    label.textContent = playing ? (music.pauseLabel || "Pause music") : (music.playLabel || "Play music");
  }

  function startAudible() {
    if (!player) return;
    try {
      player.unMute();
      player.setVolume(typeof music.startVolume === "number" ? music.startVolume : 100);
      player.playVideo();
    } catch (e) { /* ignore */ }
  }

  function toggle() {
    if (fallback) { window.open(watchUrl, "_blank", "noopener"); return; }
    if (!player || !playerReady) return;
    if (isPlaying()) { try { player.pauseVideo(); } catch (e) {} }
    else { startAudible(); }
  }

  function enterFallback() {
    if (fallback) return;
    fallback = true;
    playerReady = false;
    clearAttemptTimer();
    removeInteractionListeners();
    if (btn) {
      btn.classList.remove("is-playing");
      btn.removeAttribute("aria-pressed");
      label.textContent = "Listen on YouTube";
      btn.title = "Opens the song on YouTube in a new tab";
    }
    var holder = document.getElementById("music-player-holder");
    if (holder && holder.parentNode) holder.parentNode.removeChild(holder);
  }

  function clearAttemptTimer() {
    if (attemptTimer) { clearTimeout(attemptTimer); attemptTimer = null; }
  }

  function onFirstInteraction() {
    if (unlocked || fallback) return;
    unlocked = true;
    removeInteractionListeners();
    if (music.autoplay !== false) startAudible();
  }

  var interactionEvents = ["pointerdown", "touchstart", "keydown", "scroll", "click"];
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
    btn.addEventListener("click", toggle);
    document.body.appendChild(btn);
  }

  function ensureHolder() {
    var holder = document.getElementById("music-player-holder");
    if (!holder) {
      holder = document.createElement("div");
      holder.id = "music-player-holder";
      holder.setAttribute("aria-hidden", "true");
      document.body.appendChild(holder);
    }
    holder.innerHTML = '<div id="music-player-frame"></div>';
    return holder;
  }

  // Try the candidate at the current index. Advance on error or timeout.
  function tryCandidate() {
    if (fallback) return;
    if (index >= candidates.length) { enterFallback(); return; }

    playerReady = false;
    clearAttemptTimer();
    if (player && player.destroy) { try { player.destroy(); } catch (e) {} player = null; }
    ensureHolder();

    var id = candidates[index];
    player = new window.YT.Player("music-player-frame", {
      videoId: id,
      width: "320",
      height: "180",
      playerVars: {
        autoplay: 1,
        mute: 1,
        controls: 0,
        playsinline: 1,
        rel: 0,
        modestbranding: 1,
        loop: music.loop !== false ? 1 : 0,
        playlist: music.loop !== false ? id : undefined,
      },
      events: {
        onReady: function () {
          playerReady = true;
          clearAttemptTimer();
          try { player.playVideo(); } catch (e) {}
          if (unlocked && music.autoplay !== false) startAudible();
        },
        onStateChange: function (e) {
          setButtonState(e.data === 1);
          if (e.data === 0 && music.loop !== false) {
            try { player.seekTo(0); player.playVideo(); } catch (err) {}
          }
        },
        onError: function () {
          // This upload will not play here. Move on to the next backup.
          advance();
        },
      },
    });

    // If this candidate does not become ready in time, move on.
    attemptTimer = setTimeout(function () {
      if (!playerReady) advance();
    }, 6000);
  }

  function advance() {
    clearAttemptTimer();
    index += 1;
    tryCandidate();
  }

  function init() {
    cfg = window.CONFIG;
    if (!cfg) return;
    music = cfg.music || {};
    if (music.enabled === false) return;

    candidates = buildCandidates();
    if (!candidates.length) return;
    watchUrl = "https://www.youtube.com/watch?v=" + candidates[candidates.length - 1];

    buildControl();
    addInteractionListeners();

    loadApi().then(function () {
      tryCandidate();
    }).catch(function () {
      enterFallback();
    });
  }

  window.MusicFeature = { init: init };
})();
