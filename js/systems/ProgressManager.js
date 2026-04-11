/**
 * =============================================================================
 * ProgressManager.js — Save/Load Player Progress (localStorage)
 * =============================================================================
 *
 * Persists world/level progress, stars earned, and total score.
 * Uses localStorage so progress survives page reloads and browser restarts.
 *
 * Data shape:
 *   { stars: { "0-0": 3, "0-1": 2, ... }, totalScore: 12500 }
 *   Keys are "worldIdx-levelIdx" → star count (0..3)
 * =============================================================================
 */

const STORAGE_KEY = 'bubble-blaster-progress';

export class ProgressManager {
  constructor() {
    this._data = this._load();
  }

  _load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return JSON.parse(raw);
    } catch { /* ignore corrupt data */ }
    return { stars: {}, totalScore: 0 };
  }

  _save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this._data));
    } catch { /* storage full or unavailable */ }
  }

  /** Get stars earned for a specific level (0 if not played) */
  getStars(worldIdx, levelIdx) {
    return this._data.stars[`${worldIdx}-${levelIdx}`] || 0;
  }

  /** Save stars for a level (only if better than previous best) */
  setStars(worldIdx, levelIdx, stars) {
    const key = `${worldIdx}-${levelIdx}`;
    const prev = this._data.stars[key] || 0;
    if (stars > prev) {
      this._data.stars[key] = stars;
      this._save();
    }
  }

  /** Is a level unlocked? Level 0 of world 0 is always unlocked. */
  isUnlocked(worldIdx, levelIdx) {
    if (worldIdx === 0 && levelIdx === 0) return true;
    // Previous level in same world must have >= 1 star
    if (levelIdx > 0) {
      return this.getStars(worldIdx, levelIdx - 1) >= 1;
    }
    // First level of a new world: last level of previous world must have >= 1 star
    const prevWorldLevels = 8; // All worlds have 8 levels
    return this.getStars(worldIdx - 1, prevWorldLevels - 1) >= 1;
  }

  /** Is a world accessible? */
  isWorldUnlocked(worldIdx) {
    if (worldIdx === 0) return true;
    return this.getStars(worldIdx - 1, 7) >= 1;
  }

  get totalScore() { return this._data.totalScore; }

  addScore(points) {
    this._data.totalScore += points;
    this._save();
  }

  /** Count total stars across all worlds */
  get totalStars() {
    return Object.values(this._data.stars).reduce((sum, s) => sum + s, 0);
  }
}
