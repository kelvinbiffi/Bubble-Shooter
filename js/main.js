/**
 * =============================================================================
 * main.js — Application Entry Point
 * =============================================================================
 *
 * Bootstraps the game: imports CSS, initializes star background, creates the
 * Game instance, sets up parallax, dismisses splash screen, and shows the
 * world map.
 * =============================================================================
 */

import '../css/style.css';

import { Game } from './Game.js';
import { initStars } from './rendering/StarField.js';

// ---- Initialize background stars ----
initStars('stars');

// ---- Create the game instance ----
const canvas = document.getElementById('gameCanvas');
const game   = new Game(canvas);
window.game  = game;

// ---- Parallax: shift game wrapper, HUD, and title with mouse ----
const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
if (!isTouchDevice) {
  const parallaxEls = [
    { el: document.getElementById('gameWrapper'), strength: 8 },
    { el: document.querySelector('.hud'),         strength: 12 },
    { el: document.querySelector('.title'),       strength: 15 },
  ];

  let targetX = 0, targetY = 0;
  let currentX = 0, currentY = 0;

  document.addEventListener('mousemove', (e) => {
    targetX = (e.clientX / window.innerWidth  - 0.5) * 2;
    targetY = (e.clientY / window.innerHeight - 0.5) * 2;
  });

  function animateParallax() {
    currentX += (targetX - currentX) * 0.08;
    currentY += (targetY - currentY) * 0.08;
    for (const { el, strength } of parallaxEls) {
      if (!el) continue;
      el.style.transform = `translate3d(${-currentX * strength}px, ${-currentY * strength}px, 0)`;
    }
    requestAnimationFrame(animateParallax);
  }
  animateParallax();
}

// ---- Dismiss splash screen, then show world map ----
const splash = document.getElementById('splash');
let mapShown = false;

function showMapOnce() {
  if (mapShown) return;
  mapShown = true;
  if (splash?.parentNode) splash.remove();
  game.showMap();
}

if (splash) {
  splash.classList.add('fade-out');
  // transitionend can be unreliable — use both listener AND timeout
  splash.addEventListener('transitionend', showMapOnce, { once: true });
  setTimeout(showMapOnce, 800); // fallback if transitionend doesn't fire
} else {
  showMapOnce();
}
