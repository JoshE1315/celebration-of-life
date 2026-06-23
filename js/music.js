/* =============================================================================
 * music.js  -  Background song with a floating Pause / Play control
 * =============================================================================
 *
 * Plays the configured YouTube song in the background. Because browsers block
 * sound from starting before a visitor interacts, the song begins muted and is
 * unmuted at the visitor's first tap, click, key press, or scroll. A small
 * floating button lets anyone pause or resume.
 *
 * SELF-HEALING: some YouTube uploads do not allow playback on other websites,
 * and some networks block YouTube entirely. If the embedded player cannot play,
 * the floating button automatically turns into a "Listen on YouTube" link so
 * the song is always reachable.
 *
 * Uses the official YouTube IFrame Player API. No paid services.
 * ========================================================================== */

(function () {
  "use strict";

  var cfg, music, videoId, watchUrl;
  var player = null;
  var playerReady = false;
  var fallback = false;
  var unlocked = false;
  var readyTimer = null;
  var btn, label;

  function youTubeId(value) {
    var v = String(value || "").trim();
    if (!v) return "";
    if (/^[A-Za-z0-9_-]{11}$/.test(v)) return v;
    var m = v.match(/(?:youtu\.be\/|v=|\/embed\/|\/shorts\/)([A-Za-z0-9_-]{11})/);
    return m ? m[1] : "";
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

  // Switch the button into a plain "Listen on YouTube" link.
  function enterFallback() {
    if (fallback) return;
    fallback = true;
    playerReady = false;
    if (readyTimer) { clearTimeout(readyTimer); readyTimer = null; }
    removeInteractionListeners();
    if (btn) {
      btn.classList.remove("is-playing");
      btn.removeAttribute("aria-pressed");
      label.textContent = "Listen on YouTube";
      btn.title = "Opens the song on YouTube in a new tab";
    }
    var holder = document.getElementById("music-player-holder");
    if (holder) holder.parentNode.removeChild(holder);
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
        autoplay: 1,
        mute: 1,
        controls: 0,
        playsinline: 1,
        rel: 0,
        modestbranding: 1,
        loop: music.loop !== false ? 1 : 0,
        playlist: music.loop !== false ? videoId : undefined,
      },
      events: {
        onReady: function () {
          playerReady = true;
          if (readyTimer) { clearTimeout(readyTimer); readyTimer = null; }
          try { player.playVideo(); } catch (e) {}
          // If the visitor already interacted before the player was ready,
          // start the sound now.
          if (unlocked && music.autoplay !== false) startAudible();
        },
        onStateChange: function (e) {
          setButtonState(e.data === 1);
          if (e.data === 0 && music.loop !== false) {
            try { player.seekTo(0); player.playVideo(); } catch (err) {}
          }
        },
        onError: function () {
          // 101 and 150 mean the upload disallows embedding; others are
          // unavailable/private. In every case, fall back to a link.
          enterFallback();
        },
      },
    });

    // If the player never becomes ready (network blocked, etc.), fall back.
    readyTimer = setTimeout(function () {
      if (!playerReady) enterFallback();
    }, 8000);
  }

  function init() {
    cfg = window.CONFIG;
    if (!cfg) return;
    music = cfg.music || {};
    if (music.enabled === false) return;
    videoId = youTubeId(music.youTube);
    if (!videoId) return;
    watchUrl = "https://www.youtube.com/watch?v=" + videoId;

    buildControl();
    addInteractionListeners();

    loadApi().then(function () {
      createPlayer();
    }).catch(function () {
      enterFallback();
    });
  }

  window.MusicFeature = { init: init };
})();
