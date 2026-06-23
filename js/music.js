/* =============================================================================
 * music.js  -  Background song with a floating Pause / Play control
 * =============================================================================
 *
 * Plays the configured YouTube song in the background. Because browsers block
 * sound from starting before a visitor interacts with the page, the song
 * begins muted and is unmuted (or started) at the visitor's first tap, click,
 * key press, or scroll. A small floating button lets anyone pause or resume.
 *
 * Uses the official YouTube IFrame Player API. No paid services.
 * ========================================================================== */

(function () {
  "use strict";

  var cfg, music, videoId;
  var player = null;
  var apiReady = false;
  var unlocked = false; // has the visitor interacted yet?
  var btn, label;

  // Pull a YouTube video id out of a full link or a bare id.
  function youTubeId(value) {
    var v = String(value || "").trim();
    if (!v) return "";
    if (/^[A-Za-z0-9_-]{11}$/.test(v)) return v;
    var m = v.match(/(?:youtu\.be\/|v=|\/embed\/|\/shorts\/)([A-Za-z0-9_-]{11})/);
    return m ? m[1] : "";
  }

  // Load the IFrame API once, then resolve.
  function loadApi() {
    return new Promise(function (resolve) {
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
        document.head.appendChild(s);
      }
    });
  }

  function isPlaying() {
    return player && player.getPlayerState && player.getPlayerState() === 1; // 1 = playing
  }

  function setButtonState(playing) {
    if (!btn) return;
    btn.setAttribute("aria-pressed", playing ? "true" : "false");
    btn.classList.toggle("is-playing", playing);
    label.textContent = playing ? (music.pauseLabel || "Pause music") : (music.playLabel || "Play music");
  }

  // Start audible playback (called on first interaction or button press).
  function startAudible() {
    if (!player) return;
    try {
      player.unMute();
      player.setVolume(100);
      player.playVideo();
    } catch (e) { /* ignore */ }
  }

  function toggle() {
    if (!player) return;
    if (isPlaying()) {
      try { player.pauseVideo(); } catch (e) {}
    } else {
      startAudible();
    }
  }

  // The first time the visitor interacts, unmute and play.
  function onFirstInteraction() {
    if (unlocked) return;
    unlocked = true;
    removeInteractionListeners();
    if (music.autoplay !== false) startAudible();
  }

  var interactionEvents = ["pointerdown", "touchstart", "keydown", "scroll", "click"];
  function addInteractionListeners() {
    interactionEvents.forEach(function (ev) {
      window.addEventListener(ev, onFirstInteraction, { once: false, passive: true });
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
    icon.textContent = "♪"; // musical note

    label = document.createElement("span");
    label.className = "music-toggle__label";
    label.textContent = music.playLabel || "Play music";

    btn.appendChild(icon);
    btn.appendChild(label);
    btn.addEventListener("click", toggle);
    document.body.appendChild(btn);
  }

  function createPlayer() {
    // A real but offscreen container, since display:none can stop playback.
    var holder = document.createElement("div");
    holder.id = "music-player-holder";
    holder.setAttribute("aria-hidden", "true");
    var inner = document.createElement("div");
    inner.id = "music-player-frame";
    holder.appendChild(inner);
    document.body.appendChild(holder);

    player = new window.YT.Player("music-player-frame", {
      videoId: videoId,
      width: "320",
      height: "180",
      playerVars: {
        autoplay: 1,        // allowed because we also start muted
        mute: 1,            // muted autoplay is permitted by browsers
        controls: 0,
        playsinline: 1,
        rel: 0,
        modestbranding: 1,
        loop: music.loop !== false ? 1 : 0,
        playlist: music.loop !== false ? videoId : undefined, // loop needs this
      },
      events: {
        onReady: function () {
          // Begin muted right away; sound turns on at first interaction.
          try { player.playVideo(); } catch (e) {}
        },
        onStateChange: function (e) {
          setButtonState(e.data === 1);
          // Safety net for looping if playlist loop does not engage.
          if (e.data === 0 && music.loop !== false) {
            try { player.seekTo(0); player.playVideo(); } catch (err) {}
          }
        },
      },
    });
  }

  function init() {
    cfg = window.CONFIG;
    if (!cfg) return;
    music = cfg.music || {};
    if (music.enabled === false) return;
    videoId = youTubeId(music.youTube);
    if (!videoId) return; // no song set

    buildControl();
    addInteractionListeners();

    loadApi().then(function () {
      apiReady = true;
      createPlayer();
    });
  }

  window.MusicFeature = { init: init };
})();
