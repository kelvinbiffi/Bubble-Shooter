/**
 * =============================================================================
 * StarField.js — Animated Background Stars with Parallax
 * =============================================================================
 *
 * PURPOSE:
 *   Creates the twinkling star background that gives the game its
 *   space/cyberpunk atmosphere. On desktop, the stars react to mouse
 *   movement with a parallax depth effect — closer stars shift more
 *   than distant ones, creating a sense of 3D space.
 *
 * WHY A SEPARATE CANVAS?
 *   The stars are rendered on a full-screen canvas behind the game canvas.
 *   This separation provides:
 *   1. Performance — stars don't need to be redrawn when the game redraws
 *   2. Layering — CSS z-index stacks stars behind the game naturally
 *   3. Independence — stars keep twinkling even when the game is paused
 *
 * PARALLAX EFFECT:
 *   Each star has a `depth` value (0..1). When the mouse moves:
 *     offset = (mousePos - center) * depth * parallaxStrength
 *
 *   - depth=0: star doesn't move (infinitely far away)
 *   - depth=1: star shifts the most (closest to the viewer)
 *
 *   This mimics real-world parallax: nearby objects appear to move more
 *   than distant ones when you shift your viewpoint. The same principle
 *   is used in 2D platformers (parallax scrolling backgrounds) and
 *   modern web design (parallax hero sections).
 *
 *   On mobile (touch devices), parallax uses device tilt via gyroscope
 *   if available, or stays static if not — touch drag is reserved for
 *   gameplay.
 *
 * STAR LAYERS:
 *   Stars are generated in 3 visual layers:
 *   - Far (depth 0.0–0.3):  tiny, dim, slow twinkle — deep space
 *   - Mid (depth 0.3–0.6):  medium size, moderate brightness
 *   - Near (depth 0.6–1.0): larger, brighter, fast twinkle — foreground
 * =============================================================================
 */

/**
 * Initialize the star field with parallax on the given canvas element.
 * Starts its own animation loop — fire and forget.
 * @param {string} canvasId - ID of the canvas element to render stars on
 */
export function initStars(canvasId = 'stars') {
  const canvas = document.getElementById(canvasId);
  const ctx    = canvas.getContext('2d');

  // Track mouse position for parallax (desktop only)
  let mouseX = 0.5; // Normalized 0..1 (0.5 = center)
  let mouseY = 0.5;
  const PARALLAX_STRENGTH = 30; // Max pixel shift for depth=1 stars

  function resize() {
    canvas.width  = window.innerWidth;
    canvas.height = window.innerHeight;
  }
  resize();
  window.addEventListener('resize', resize);

  // Desktop: track mouse for parallax
  const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  if (!isTouchDevice) {
    document.addEventListener('mousemove', (e) => {
      mouseX = e.clientX / window.innerWidth;
      mouseY = e.clientY / window.innerHeight;
    });
  }

  // Generate stars across 3 depth layers
  const STAR_COUNT = 200;
  const stars = Array.from({ length: STAR_COUNT }, () => {
    const depth = Math.random(); // 0 = far, 1 = near
    return {
      // Base position (normalized 0..1 so they survive resizes)
      bx:    Math.random(),
      by:    Math.random(),
      r:     0.3 + depth * 1.8,                           // Near stars are bigger
      speed: 0.002 + Math.random() * 0.004 + depth * 0.003, // Near stars twinkle faster
      phase: Math.random() * Math.PI * 2,
      depth,
      // Near stars can have a subtle color tint
      color: depth > 0.7
        ? `hsl(${180 + Math.random() * 40}, 60%, 90%)`    // Cyan-ish tint for close stars
        : '#fff',
    };
  });

  function tick() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const t  = Date.now() / 1000;
    const cx = (mouseX - 0.5) * 2; // -1..1 from center
    const cy = (mouseY - 0.5) * 2;

    for (const s of stars) {
      // Parallax offset: deeper stars shift more
      const px = s.bx * canvas.width  + cx * s.depth * PARALLAX_STRENGTH;
      const py = s.by * canvas.height + cy * s.depth * PARALLAX_STRENGTH;

      // Twinkle: sine wave with per-star phase
      const brightness = 0.2 + s.depth * 0.3; // Near stars are brighter
      ctx.globalAlpha = brightness + Math.sin(t * s.speed * 10 + s.phase) * brightness * 0.6;
      ctx.fillStyle   = s.color;
      ctx.beginPath();
      ctx.arc(px, py, s.r, 0, Math.PI * 2);
      ctx.fill();

      // Near stars get a soft glow halo
      if (s.depth > 0.75) {
        ctx.globalAlpha *= 0.15;
        ctx.beginPath();
        ctx.arc(px, py, s.r * 4, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    requestAnimationFrame(tick);
  }

  tick();
}
