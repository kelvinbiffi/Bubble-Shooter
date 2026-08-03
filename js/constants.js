/**
 * =============================================================================
 * constants.js — Game Configuration & Tuning Parameters
 * =============================================================================
 *
 * Centralizes every magic number and tuning value the game uses.
 * Bubble size reduced from 28→18 and columns increased 7→11 for
 * denser grids and longer, more strategic gameplay.
 * =============================================================================
 */

// ---- Grid Layout ----
export const COLS       = 11;       // Bubbles per even row (odd rows = COLS - 1)
export const ROWS       = 10;       // Maximum possible rows
export const BUBBLE_R   = 18;       // Bubble radius in pixels

// ---- Canvas Dimensions ----
export const CANVAS_W   = 420;      // Playfield width
export const CANVAS_H   = 540;      // Playfield height

// ---- Physics ----
export const SHOOT_SPEED = 600;     // Projectile velocity in px/SECOND (frame-rate independent)

// ---- Game Rules ----
export const MIN_CLUSTER = 3;       // Minimum connected same-color bubbles to pop

// ---- Power-ups ----
export const BOMB_CHANCE    = 0.05; // chance do tiro vir bomba
export const RAINBOW_CHANCE = 0.05; // chance do tiro vir arco-iris
export const BOMB_RADIUS    = 2.15; // raio da explosao em diametros de bolha

// ---- Bubble Palette ----
export const COLORS = [
  '#ff3366',  // Red
  '#00ccff',  // Blue
  '#ffcc00',  // Yellow
  '#00ffaa',  // Green
  '#ff6600',  // Orange
  '#cc44ff',  // Purple
];

export const COLOR_NAMES = [
  'Red', 'Blue', 'Yellow', 'Green', 'Orange', 'Purple',
];
