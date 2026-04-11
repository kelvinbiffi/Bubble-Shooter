/**
 * =============================================================================
 * StarField.js — Animated Background with Parallax & Themed Floating Emojis
 * =============================================================================
 *
 * Stars twinkle with mouse parallax. Themed emojis float in the background,
 * changing when the player enters a different world.
 * =============================================================================
 */

let _floatingEmojis = [];
let _themeTint = null;

/**
 * Update the theme — changes floating emojis and background tint.
 * Called by Game.js when starting a level.
 */
export function setStarFieldTheme(theme) {
  if (!theme) return;
  _themeTint = theme.starTint || null;

  // Create floating emoji objects
  _floatingEmojis = Array.from({ length: 10 }, () => ({
    emoji: theme.emojis[Math.floor(Math.random() * theme.emojis.length)],
    x: Math.random(),         // normalized 0..1
    y: Math.random(),
    size: 20 + Math.random() * 30,
    speed: 0.008 + Math.random() * 0.012,
    wobblePhase: Math.random() * Math.PI * 2,
    wobbleAmp: 0.01 + Math.random() * 0.02,
    alpha: 0.04 + Math.random() * 0.04,
    depth: 0.1 + Math.random() * 0.3,
  }));
}

export function initStars(canvasId = 'stars') {
  const canvas = document.getElementById(canvasId);
  const ctx    = canvas.getContext('2d');

  let mouseX = 0.5, mouseY = 0.5;
  const PARALLAX_STRENGTH = 30;

  function resize() {
    canvas.width  = window.innerWidth;
    canvas.height = window.innerHeight;
  }
  resize();
  window.addEventListener('resize', resize);

  const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  if (!isTouchDevice) {
    document.addEventListener('mousemove', (e) => {
      mouseX = e.clientX / window.innerWidth;
      mouseY = e.clientY / window.innerHeight;
    });
  }

  // Generate stars
  const stars = Array.from({ length: 200 }, () => {
    const depth = Math.random();
    return {
      bx: Math.random(), by: Math.random(),
      r: 0.3 + depth * 1.8,
      speed: 0.002 + Math.random() * 0.004 + depth * 0.003,
      phase: Math.random() * Math.PI * 2,
      depth,
      color: depth > 0.7
        ? `hsl(${180 + Math.random() * 40}, 60%, 90%)`
        : '#fff',
    };
  });

  function tick() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const t  = Date.now() / 1000;
    const cx = (mouseX - 0.5) * 2;
    const cy = (mouseY - 0.5) * 2;

    // Optional theme tint overlay
    if (_themeTint) {
      ctx.fillStyle = _themeTint;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    // Stars
    for (const s of stars) {
      const px = s.bx * canvas.width  + cx * s.depth * PARALLAX_STRENGTH;
      const py = s.by * canvas.height + cy * s.depth * PARALLAX_STRENGTH;
      const brightness = 0.2 + s.depth * 0.3;
      ctx.globalAlpha = brightness + Math.sin(t * s.speed * 10 + s.phase) * brightness * 0.6;
      ctx.fillStyle   = s.color;
      ctx.beginPath();
      ctx.arc(px, py, s.r, 0, Math.PI * 2);
      ctx.fill();
      if (s.depth > 0.75) {
        ctx.globalAlpha *= 0.15;
        ctx.beginPath();
        ctx.arc(px, py, s.r * 4, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Floating themed emojis
    for (const e of _floatingEmojis) {
      e.y -= e.speed * 0.016; // drift upward
      if (e.y < -0.1) { e.y = 1.1; e.x = Math.random(); }
      const wobble = Math.sin(t * 0.5 + e.wobblePhase) * e.wobbleAmp;
      const ex = (e.x + wobble) * canvas.width  + cx * e.depth * PARALLAX_STRENGTH;
      const ey = e.y * canvas.height + cy * e.depth * PARALLAX_STRENGTH;
      ctx.globalAlpha = e.alpha;
      ctx.font = `${e.size}px serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(e.emoji, ex, ey);
    }

    ctx.globalAlpha = 1;
    requestAnimationFrame(tick);
  }

  tick();
}
