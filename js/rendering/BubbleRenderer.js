/**
 * =============================================================================
 * BubbleRenderer.js — Bubble Visual Rendering
 * =============================================================================
 *
 * PURPOSE:
 *   Contains all rendering logic for individual bubbles — gradients, glow,
 *   specular highlights, and edge rings. Separated from entity data to
 *   follow the Single Responsibility Principle.
 *
 * WHY SEPARATE RENDERING?
 *   In game architecture, rendering is decoupled from game logic because:
 *   1. You might swap renderers (Canvas2D → WebGL → PixiJS) without
 *      changing any game logic
 *   2. Rendering code is visually complex but logically simple — keeping
 *      it separate makes both files easier to reason about
 *   3. In multiplayer games, the server runs game logic WITHOUT rendering
 *
 *   This is the "View" in Model-View-Controller (MVC), or the "Render
 *   System" in Entity-Component-System (ECS) architecture.
 *
 * VISUAL TECHNIQUES USED:
 *
 *   1. Radial Gradient — Creates the 3D sphere illusion
 *      A flat circle looks like a disc. A radial gradient from light (top-left)
 *      to dark (bottom-right) tricks the eye into seeing a sphere.
 *      The gradient center is offset from the bubble center to simulate
 *      a light source at the upper-left.
 *
 *   2. Specular Highlight — The bright "dot" on the bubble
 *      Real shiny surfaces have a sharp bright spot where light reflects
 *      directly toward the viewer. We fake this with a small white
 *      radial gradient, positioned toward the light source.
 *
 *   3. Glow (shadowBlur) — The neon aura around each bubble
 *      Canvas2D's shadowBlur creates a gaussian blur glow effect.
 *      The pulse is driven by a sine wave for a living, breathing feel.
 *      In PixiJS, you'd use a PIXI.filters.GlowFilter instead.
 *
 *   4. Edge Ring — Subtle white stroke for definition
 *      Without an edge, adjacent same-color bubbles blend together.
 *      A thin semi-transparent stroke provides visual separation.
 *
 * HELPER FUNCTIONS:
 *   lighten(hex, amt) — Shifts RGB toward white (for highlights)
 *   darken(hex, amt)  — Shifts RGB toward black (for shadows)
 *   These are simplified versions of color manipulation. In production,
 *   you'd use HSL color space for perceptually uniform adjustments.
 * =============================================================================
 */

import { BUBBLE_R } from '../constants.js';

/**
 * Shift a hex color toward white.
 * @param {string} hex - Color like '#ff3366'
 * @param {number} amt - Amount 0..1 (0 = no change, 1 = white)
 */
export function lighten(hex, amt) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgb(${Math.min(255, r + amt * 255)},${Math.min(255, g + amt * 255)},${Math.min(255, b + amt * 255)})`;
}

/**
 * Shift a hex color toward black.
 * @param {string} hex - Color like '#ff3366'
 * @param {number} amt - Amount 0..1 (0 = no change, 1 = black)
 */
export function darken(hex, amt) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgb(${Math.max(0, r - amt * 255)},${Math.max(0, g - amt * 255)},${Math.max(0, b - amt * 255)})`;
}

/**
 * Render a single bubble with full visual effects.
 *
 * @param {CanvasRenderingContext2D} ctx - Canvas context to draw on
 * @param {Object} b - Bubble data object with: pos, color, radius, alpha, scale, glowPulse, alive, popping
 */
export function drawBubble(ctx, b) {
  if (!b || (!b.alive && !b.popping)) return;

  const { x, y } = b.pos;
  const r     = (b.radius || BUBBLE_R) * (b.scale || 1);
  const alpha = b.alpha !== undefined ? b.alpha : 1;
  if (alpha <= 0) return;

  ctx.save();
  ctx.globalAlpha = alpha;

  // ---- Layer 1: Glow aura (pulsing via sine wave) ----
  ctx.shadowBlur  = 16 + Math.sin(b.glowPulse || 0) * 4;
  ctx.shadowColor = b.color;

  // ---- Layer 2: Main bubble body (radial gradient for 3D look) ----
  // Gradient center is offset upper-left to simulate a top-left light source
  const grad = ctx.createRadialGradient(
    x - r * 0.3, y - r * 0.3, r * 0.1, // Inner circle (bright, upper-left)
    x, y, r,                              // Outer circle (dark, full radius)
  );
  grad.addColorStop(0, lighten(b.color, 0.6));  // Bright highlight
  grad.addColorStop(0.4, b.color);               // True color at ~40%
  grad.addColorStop(1, darken(b.color, 0.5));    // Dark edge
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fillStyle = grad;
  ctx.fill();

  // ---- Layer 3: Specular highlight (small bright spot) ----
  ctx.shadowBlur = 0; // Disable glow for the highlight
  const specGrad = ctx.createRadialGradient(
    x - r * 0.35, y - r * 0.35, 0,       // Pinpoint bright center
    x - r * 0.2, y - r * 0.2, r * 0.45,  // Fades to transparent
  );
  specGrad.addColorStop(0, 'rgba(255,255,255,0.7)');
  specGrad.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fillStyle = specGrad;
  ctx.fill();

  // ---- Layer 4: Edge ring (separation between adjacent bubbles) ----
  ctx.strokeStyle = 'rgba(255,255,255,0.25)';
  ctx.lineWidth   = 1.5;
  ctx.stroke();

  ctx.restore();
}
