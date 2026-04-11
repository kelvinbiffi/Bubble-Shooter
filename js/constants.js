/**
 * =============================================================================
 * constants.js — Game Configuration & Tuning Parameters
 * =============================================================================
 *
 * PURPOSE:
 *   Centralizes every magic number and tuning value the game uses.
 *   Changing a value here propagates everywhere — no hunting through
 *   scattered files. In production game engines (Unity, Unreal, Godot)
 *   these would live in a ScriptableObject or config asset.
 *
 * WHY A SEPARATE FILE?
 *   - Single source of truth for game balance tweaking
 *   - Designers can adjust values without touching game logic
 *   - Makes A/B testing and difficulty curves easy to implement
 *   - Prevents bugs from inconsistent duplicated values
 *
 * HOW IT WORKS:
 *   All values are exported as named constants using `export const`.
 *   Other modules import only what they need:
 *     import { COLS, ROWS, BUBBLE_R } from './constants.js';
 *
 * GAME DESIGN NOTES:
 *   - BUBBLE_R (28px) was chosen so 7 columns fit in 420px with spacing
 *   - SHOOT_SPEED (12px/frame) balances responsiveness vs. readability
 *   - MAX_SHOTS (20) creates tension without being frustrating
 *   - Colors are ordered by visual contrast for accessibility
 * =============================================================================
 */

// ---- Grid Layout ----
export const COLS       = 7;        // Bubbles per even row (odd rows = COLS - 1 for hex offset)
export const ROWS       = 8;        // Maximum rows the grid can grow to
export const BUBBLE_R   = 28;       // Bubble radius in pixels — controls entire grid scale

// ---- Canvas Dimensions ----
export const CANVAS_W   = 420;      // Playfield width  (COLS * BUBBLE_R * 2 + padding)
export const CANVAS_H   = 540;      // Playfield height (enough for ROWS + shooter area)

// ---- Physics ----
export const SHOOT_SPEED = 12;      // Projectile velocity in pixels per frame

// ---- Game Rules ----
export const MAX_SHOTS   = 20;      // Shots per level — refills on level clear
export const MIN_CLUSTER = 3;       // Minimum connected same-color bubbles to pop

// ---- Bubble Palette ----
// Hex colors used for rendering. Index position maps to COLOR_NAMES.
// New colors unlock as levels increase: min(3 + floor(level/2), COLORS.length)
export const COLORS = [
  '#ff3366',  // Red     — high contrast, urgency
  '#00ccff',  // Blue    — cool, calming
  '#ffcc00',  // Yellow  — warm, attention
  '#00ffaa',  // Green   — natural, balanced
  '#ff6600',  // Orange  — energetic, late-game
  '#cc44ff',  // Purple  — mysterious, late-game
];

export const COLOR_NAMES = [
  'Red', 'Blue', 'Yellow', 'Green', 'Orange', 'Purple',
];
