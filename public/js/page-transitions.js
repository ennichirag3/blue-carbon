/**
 * Blue Carbon 3D Page Transitions & Spatial Audio
 * Enables cinematic 3D perspective camera movements when transitioning between pages and during login.
 */

(function () {
  // --- TACTILE SPATIAL AUDIO FEEDBACK ---
  let audioCtx = null;
  function playTransitionSound(type = "click") {
    try {
      if (!audioCtx) {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (AudioContext) audioCtx = new AudioContext();
      }
      if (audioCtx && audioCtx.state === "suspended") {
        audioCtx.resume();
      }
      if (!audioCtx) return;

      const t = audioCtx.currentTime;
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.destination);

      if (type === "click") {
        osc.type = "sine";
        osc.frequency.setValueAtTime(420, t);
        osc.frequency.exponentialRampToValueAtTime(160, t + 0.05);
        gain.gain.setValueAtTime(0.06, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.05);
        osc.start(t);
        osc.stop(t + 0.05);
      } else if (type === "warp") {
        // High-tech rising 3D warp sweep for Login
        osc.type = "triangle";
        osc.frequency.setValueAtTime(220, t);
        osc.frequency.exponentialRampToValueAtTime(740, t + 0.28);
        gain.gain.setValueAtTime(0.08, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.32);
        osc.start(t);
        osc.stop(t + 0.32);
      }
    } catch (e) {}
  }

  // --- 3D PAGE EXIT INTERCEPTOR ---
  function initPageTransitions() {
    const container = document.querySelector(".page-container");

    document.addEventListener("click", (e) => {
      // Find closest anchor tag
      const link = e.target.closest("a");
      if (!link) return;

      const href = link.getAttribute("href");
      if (!href) return;

      // Ignore external links, mailto, tel, hash anchors, or modified clicks
      if (
        href.startsWith("#") ||
        href.startsWith("http://") ||
        href.startsWith("https://") ||
        href.startsWith("mailto:") ||
        e.metaKey ||
        e.ctrlKey ||
        e.shiftKey ||
        link.target === "_blank"
      ) {
        return;
      }

      // Intercept internal page navigation
      e.preventDefault();
      playTransitionSound("click");

      if (container) {
        container.classList.add("page-3d-exit");
      }

      // Smooth 3D delay matching exit keyframe
      setTimeout(() => {
        window.location.href = href;
      }, 280);
    });
  }

  // --- 3D CARD TILT MICRO-INTERACTIONS ---
  function initCardTilt() {
    const cards = document.querySelectorAll(".glass-card, .stat-card, .project-item");
    cards.forEach((card) => {
      card.addEventListener("mousemove", (e) => {
        const rect = card.getBoundingClientRect();
        const x = e.clientX - rect.left - rect.width / 2;
        const y = e.clientY - rect.top - rect.height / 2;
        const rotateX = (-y / (rect.height / 2)) * 4;
        const rotateY = (x / (rect.width / 2)) * 4;
        card.style.transform = `perspective(1000px) rotateX(${rotateX.toFixed(2)}deg) rotateY(${rotateY.toFixed(2)}deg) scale3d(1.008, 1.008, 1.008)`;
      });

      card.addEventListener("mouseleave", () => {
        card.style.transform = "perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)";
      });
    });
  }

  window.play3DWarpSound = () => playTransitionSound("warp");

  document.addEventListener("DOMContentLoaded", () => {
    initPageTransitions();
    initCardTilt();
  });
})();
