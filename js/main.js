/**
 * =============================================================================
 * main.js — Application Entry Point (Bootstrap)
 * =============================================================================
 *
 * PURPOSE:
 *   The first JavaScript file that runs. Initializes the game systems
 *   and wires up the UI. In framework terms, this is the "boot" or
 *   "main" function — like main() in C/C++ or App.tsx in React.
 *
 * WHY A SEPARATE ENTRY POINT?
 *   1. Clean separation of "setup" from "logic"
 *   2. In a real project (PixiJS + Vite), this is where you'd:
 *      - Initialize the PixiJS Application
 *      - Load assets (textures, sounds, fonts) via PIXI.Loader
 *      - Set up the scene graph
 *      - Start the game loop
 *   3. Makes it easy to swap the game canvas (e.g., for testing)
 *
 * MODULE SYSTEM:
 *   This file uses ES Modules (import/export). The index.html loads it with:
 *     <script type="module" src="js/main.js"></script>
 *
 *   ES Modules provide:
 *   - Explicit dependency declarations (import)
 *   - Encapsulation (no global scope pollution)
 *   - Static analysis (bundlers can tree-shake unused code)
 *   - Deferred execution (modules run after DOM is parsed)
 *
 *   Note: ES Modules require a web server — they don't work with file://
 *   Use: npx serve, VS Code Live Server, or Python's http.server
 *
 * BUILD SYSTEM (Vite):
 *   In development: `npm run dev` — Vite serves ES modules directly (fast HMR)
 *   For production:  `npm run build` — Vite bundles all JS + CSS into dist/
 *   To preview build: `npm run preview` — serves the dist/ folder locally
 *
 *   Vite processes this file as the entry point because index.html references it:
 *     <script type="module" src="/js/main.js"></script>
 *   It then follows every import to build the full dependency graph.
 *   The CSS import below tells Vite to include the stylesheet in the bundle.
 * =============================================================================
 */

// CSS import — Vite injects this as a <style> tag in dev, and extracts to a
// separate .css file in production builds. This is how modern bundlers handle CSS.
import '../css/style.css';

import { Game } from './Game.js';
import { initStars } from './rendering/StarField.js';

// ---- Initialize background stars ----
initStars('stars');

// ---- Create the game instance ----
const canvas = document.getElementById('gameCanvas');
const game   = new Game(canvas);

// Expose to global scope for the onclick handler in the game-over overlay
// In a real project, you'd use event delegation instead of inline onclick
window.game = game;

// ---- Wire up the start button ----
document.getElementById('startBtn').addEventListener('click', () => game.start());

// ---- Parallax: shift game wrapper, HUD, and title with mouse ----
// Creates a subtle floating depth effect on the entire game UI.
// The game canvas, HUD, and title all shift slightly in the opposite
// direction of the mouse — making the stars behind feel further away.
const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
if (!isTouchDevice) {
  const parallaxEls = [
    { el: document.getElementById('gameWrapper'), strength: 8 },
    { el: document.querySelector('.hud'),         strength: 12 },
    { el: document.querySelector('.title'),       strength: 15 },
  ];

  // Smooth interpolation target (avoids jarring snaps)
  let targetX = 0, targetY = 0;
  let currentX = 0, currentY = 0;

  document.addEventListener('mousemove', (e) => {
    // Normalize to -1..1 from viewport center
    targetX = (e.clientX / window.innerWidth  - 0.5) * 2;
    targetY = (e.clientY / window.innerHeight - 0.5) * 2;
  });

  function animateParallax() {
    // Lerp for buttery smooth movement (ease factor 0.08)
    currentX += (targetX - currentX) * 0.08;
    currentY += (targetY - currentY) * 0.08;

    for (const { el, strength } of parallaxEls) {
      if (!el) continue;
      const tx = -currentX * strength;
      const ty = -currentY * strength;
      el.style.transform = `translate3d(${tx}px, ${ty}px, 0)`;
    }
    requestAnimationFrame(animateParallax);
  }
  animateParallax();
}

// ---- Dismiss splash screen ----
// By the time this module executes, all JS has been parsed, the game object
// is constructed, and the CSS has been injected. The game is ready.
const splash = document.getElementById('splash');
if (splash) {
  splash.classList.add('fade-out');
  splash.addEventListener('transitionend', () => splash.remove());
}
