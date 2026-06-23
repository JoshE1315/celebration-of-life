/* =============================================================================
 * music.js  -  Background song with a floating Pause / Play control
 * =============================================================================
 *
 * Two ways to provide the song, chosen in config.js:
 *
 *   1. audioFile (recommended)  -  a music file hosted in your own project,
 *      for example "assets/audio/amazing-grace.mp3". This is the most reliable
 *      option: it is never blocked by networks or YouTube embedding rules.
 *
 *   2. youTube  -  a YouTube link or id, with optional backups. Used only when
 *      audioFile is empty. Some uploads block playback on other sites and some
 *      networks block YouTube, so this is less reliable.
 *
 * Either way: because browsers block sound from starting before a visitor
 * interacts, the song begins at the visitor's first tap, click, key press, or
 * scroll. A small floating button lets anyone pause or resume.
 * ========================================================================== */

(function () {
  "use strict";

  var cfg, music, btn, label;
  var unlocked = false;
  var onButtonClick = function () {};
  var startPlayback = function () {};

  /* ---------------------------------------------------------------------------
   * SHARED CONTROL BUTTON
   * -------------------------------------------------------------------------*/
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
    btn.addEventListener("click", function () { onButtonClick(); });
    document.body.appendChild(btn);
  }

  function setButtonState(playing, overrideLabel) {
    if (!btn) return;
    btn.setAttribute("aria-pressed", playing ? "true" : "false");
    btn.classList.toggle("is-playing", playing);
    label.textContent = overrideLabel != null ? overrideLabel
      : (playing ? (music.pauseLabel || "Pause music") : (music.playLabel || "Play music"));
  }

  function removeControl() {
    if (btn && btn.parentNode) btn.parentNode.removeChild(btn);
    btn = null;
  }

  /* ---------------------------------------------------------------------------
   * FIRST-INTERACTION UNLOCK
   * -------------------------------------------------------------------------*/
  var interactionEvents = ["pointerdown", "touchstart", "keydown", "scroll", "click"];
  function onFirstInteraction() {
    if (unlocked) return;
    unlocked = true;
    removeInteractionListeners();
    if (music.autoplay !== false) startPlayback();
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

  function startVolumeFraction() {
    var v = typeof music.startVolume === "number" ? music.startVolume : 100;
    if (v < 0) v = 0; if (v > 100) v = 100;
    return v / 100;
  }

  /* ===========================================================================
   * MODE 1: HOSTED AUDIO FILE  (recommended)
   * ======================================================================== */
  function initAudioMode() {
    var audio = document.createElement("audio");
    audio.src = music.audioFile;
    audio.loop = music.loop !== false;
    audio.preload = "auto";
    audio.volume = startVolumeFraction();
    audio.setAttribute("aria-hidden", "true");
    document.body.appendChild(audio);

    onButtonClick = function () {
      if (audio.paused) { audio.play().catch(function () {}); }
      else { audio.pause(); }
    };
    startPlayback = function () { audio.play().catch(function () {}); };

    audio.addEventListener("play", function () { setButtonState(true); });
    audio.addEventListener("pause", function () { setButtonState(false); });
    audio.addEventListener("error", function () {
      // The file path is wrong or the file is missing. Hide the control.
      removeControl();
    });

    buildControl();
    addInteractionListeners();
  }

  /* ===========================================================================
   * MODE 2: YOUTUBE  (fallback when no audioFile is set)
   * ======================================================================== */
  var candidates, watchUrl, player = null, index = 0, playerReady = false,
      ytFallback = false, attemptTimer = null;

  function youTubeId(value) {
    var v = String(value || "").trim();
    if (!v) return "";
    if (/^[A-Za-z0-9_-]{11}$/.test(v)) return v;
    var m = v.match(/(?:youtu\.be\/|v=|\/embed\/|\/shorts\/)([A-Za-z0-9_-]{11})/);
    return m ? m[1] : "";
  }

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

  function ytIsPlaying() {
    return player && player.getPlayerState && player.getPlayerState() === 1;
  }
  function ytStartAudible() {
    if (!player) return;
    try { player.unMute(); player.setVolume(Math.round(startVolumeFraction() * 100)); player.playVideo(); }
    catch (e) {}
  }
  function clearAttemptTimer() { if (attemptTimer) { clearTimeout(attemptTimer); attemptTimer = null; } }

  function enterYtFallback() {
    if (ytFallback) return;
    ytFallback = true;
    playerReady = false;
    clearAttemptTimer();
    if (btn) {
      btn.classList.remove("is-playing");
      btn.removeAttribute("aria-pressed");
      label.textContent = "Listen on YouTube";
      btn.title = "Opens the song on YouTube in a new tab";
    }
    var holder = document.getElementById("music-player-holder");
    if (holder && holder.parentNode) holder.parentNode.removeChild(holder);
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
  }

  function tryCandidate() {
    if (ytFallback) return;
    if (index >= candidates.length) { enterYtFallback(); return; }
    playerReady = false;
    clearAttemptTimer();
    if (player && player.destroy) { try { player.destroy(); } catch (e) {} player = null; }
    ensureHolder();

    var id = candidates[index];
    player = new window.YT.Player("music-player-frame", {
      videoId: id,
      width: "320", height: "180",
      playerVars: {
        autoplay: 1, mute: 1, controls: 0, playsinline: 1, rel: 0, modestbranding: 1,
        loop: music.loop !== false ? 1 : 0,
        playlist: music.loop !== false ? id : undefined,
      },
      events: {
        onReady: function () {
          playerReady = true;
          clearAttemptTimer();
          try { player.playVideo(); } catch (e) {}
          if (unlocked && music.autoplay !== false) ytStartAudible();
        },
        onStateChange: function (e) {
          setButtonState(e.data === 1);
          if (e.data === 0 && music.loop !== false) {
            try { player.seekTo(0); player.playVideo(); } catch (err) {}
          }
        },
        onError: function () { ytAdvance(); },
      },
    });

    attemptTimer = setTimeout(function () { if (!playerReady) ytAdvance(); }, 6000);
  }
  function ytAdvance() { clearAttemptTimer(); index += 1; tryCandidate(); }

  function initYouTubeMode() {
    candidates = buildCandidates();
    if (!candidates.length) return;
    watchUrl = "https://www.youtube.com/watch?v=" + candidates[candidates.length - 1];

    onButtonClick = function () {
      if (ytFallback) { window.open(watchUrl, "_blank", "noopener"); return; }
      if (!player || !playerReady) return;
      if (ytIsPlaying()) { try { player.pauseVideo(); } catch (e) {} }
      else { ytStartAudible(); }
    };
    startPlayback = function () { if (music.autoplay !== false) ytStartAudible(); };

    buildControl();
    addInteractionListeners();

    loadApi().then(function () { tryCandidate(); }).catch(function () { enterYtFallback(); });
  }

  /* ---------------------------------------------------------------------------
   * START
   * -------------------------------------------------------------------------*/
  function init() {
    cfg = window.CONFIG;
    if (!cfg) return;
    music = cfg.music || {};
    if (music.enabled === false) return;

    if (music.audioFile) initAudioMode();
    else initYouTubeMode();
  }

  window.MusicFeature = { init: init };
})();
