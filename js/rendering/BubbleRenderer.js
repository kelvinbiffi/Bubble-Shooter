/**
 * =============================================================================
 * BubbleRenderer.js — Bubble Visual Rendering with Emojis & Color Hint
 * =============================================================================
 *
 * Renders each bubble with: radial gradient, specular highlight, glow,
 * edge ring, themed emoji inside, and a pulsing hint ring for matching colors.
 * =============================================================================
 */

import { BUBBLE_R } from '../constants.js';

// Theme state — updated by the game when a level starts
let _themeEmojis = null;   // e.g. ['🦕','🦖','🦎','🐊','🦴','🌿'] (fallback)
let _themeSprites = null;  // HTMLImageElement[] pixel art icons (preferred)
let _hintColorIdx = -1;    // colorIdx of the current shooter bubble (-1 = no hint)
let _hintTime = 0;         // global time for hint animation

export function setThemeEmojis(emojis) { _themeEmojis = emojis; }
export function setThemeSprites(images) { _themeSprites = images; }
export function setHintColorIdx(idx) { _hintColorIdx = idx; }
export function updateHintTime(t) { _hintTime = t; }

export function lighten(hex, amt) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgb(${Math.min(255, r + amt * 255)},${Math.min(255, g + amt * 255)},${Math.min(255, b + amt * 255)})`;
}

export function darken(hex, amt) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgb(${Math.max(0, r - amt * 255)},${Math.max(0, g - amt * 255)},${Math.max(0, b - amt * 255)})`;
}

/**
 * Render a single bubble with full visual effects + emoji + hint.
 */
export function drawBubble(ctx, b) {
  if (!b || (!b.alive && !b.popping)) return;

  const { x, y } = b.pos;
  const r     = (b.radius || BUBBLE_R) * (b.scale || 1);
  const alpha = b.alpha !== undefined ? b.alpha : 1;
  if (alpha <= 0) return;

  ctx.save();
  ctx.globalAlpha = alpha;

  // ---- Hint pulse: matching color ring ----
  const isHinted = _hintColorIdx >= 0 && b.colorIdx === _hintColorIdx && !b.popping;
  if (isHinted) {
    const pulse = 0.3 + Math.sin(_hintTime * 4) * 0.25; // 0.05..0.55
    ctx.save();
    ctx.globalAlpha = alpha * pulse;
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth   = 3;
    ctx.shadowBlur  = 12;
    ctx.shadowColor = '#ffffff';
    ctx.beginPath();
    ctx.arc(x, y, r + 3, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  // ---- Glow aura ----
  ctx.shadowBlur  = 12 + Math.sin(b.glowPulse || 0) * 3;
  ctx.shadowColor = b.color;

  // ---- Main body: radial gradient ----
  const grad = ctx.createRadialGradient(
    x - r * 0.3, y - r * 0.3, r * 0.1,
    x, y, r,
  );
  grad.addColorStop(0, lighten(b.color, 0.6));
  grad.addColorStop(0.4, b.color);
  grad.addColorStop(1, darken(b.color, 0.5));
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fillStyle = grad;
  ctx.fill();

  // ---- Pixel art icon inside the bubble (emoji as fallback while loading) ----
  const sprite = _themeSprites?.[b.colorIdx];
  if (sprite && sprite.complete && sprite.naturalWidth > 0) {
    ctx.shadowBlur = 0;
    ctx.globalAlpha = alpha * 0.95;
    const size = Math.round(r * 1.45);
    const prevSmoothing = ctx.imageSmoothingEnabled;
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(sprite, Math.round(x - size / 2), Math.round(y - size / 2), size, size);
    ctx.imageSmoothingEnabled = prevSmoothing;
    ctx.globalAlpha = alpha;
  } else if (_themeEmojis && b.colorIdx != null && _themeEmojis[b.colorIdx]) {
    ctx.shadowBlur = 0;
    ctx.globalAlpha = alpha * 0.85;
    const fontSize = Math.round(r * 1.1);
    ctx.font = `${fontSize}px serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(_themeEmojis[b.colorIdx], x, y + 1);
    ctx.globalAlpha = alpha;
  }

  // ---- Specular highlight ----
  ctx.shadowBlur = 0;
  const specGrad = ctx.createRadialGradient(
    x - r * 0.35, y - r * 0.35, 0,
    x - r * 0.2, y - r * 0.2, r * 0.45,
  );
  specGrad.addColorStop(0, 'rgba(255,255,255,0.5)');
  specGrad.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fillStyle = specGrad;
  ctx.fill();

  // ---- Edge ring ----
  ctx.strokeStyle = 'rgba(255,255,255,0.2)';
  ctx.lineWidth   = 1;
  ctx.stroke();

  ctx.restore();
}
