/**
 * =============================================================================
 * themes.js — World & Level Definitions
 * =============================================================================
 *
 * Each world has a theme (emojis inside bubbles, background colors) and
 * 8 levels of increasing difficulty. Stars are earned per level:
 *   1 star:  complete the level
 *   2 stars: best combo >= 3
 *   3 stars: finish with >= 40% shots remaining
 * =============================================================================
 */

export const WORLDS = [
  {
    name: 'Dinosaur Valley',
    icon: '🦕',
    bgGradient: ['#1a0e2e', '#0d1b1a'],
    starTint: 'rgba(255,180,60,0.4)',
    // One emoji per color index (maps to COLORS array)
    emojis: ['🦕', '🦖', '🦎', '🐊', '🦴', '🌿'],
    levels: [
      { rows: 4, colors: 3, shots: 30 },
      { rows: 4, colors: 3, shots: 28 },
      { rows: 5, colors: 3, shots: 28 },
      { rows: 5, colors: 4, shots: 26 },
      { rows: 6, colors: 4, shots: 26 },
      { rows: 6, colors: 4, shots: 24 },
      { rows: 7, colors: 4, shots: 24 },
      { rows: 7, colors: 5, shots: 22 },
    ],
  },
  {
    name: 'Kaiju Island',
    icon: '🐉',
    bgGradient: ['#2a0a1a', '#1a0520'],
    starTint: 'rgba(255,80,50,0.4)',
    emojis: ['🐉', '🦑', '🔥', '⚡', '🌋', '🦂'],
    levels: [
      { rows: 5, colors: 3, shots: 28 },
      { rows: 5, colors: 4, shots: 26 },
      { rows: 6, colors: 4, shots: 26 },
      { rows: 6, colors: 4, shots: 24 },
      { rows: 7, colors: 4, shots: 24 },
      { rows: 7, colors: 5, shots: 22 },
      { rows: 8, colors: 5, shots: 22 },
      { rows: 8, colors: 5, shots: 20 },
    ],
  },
  {
    name: 'Deep Ocean',
    icon: '🐙',
    bgGradient: ['#040a20', '#021a2a'],
    starTint: 'rgba(60,180,255,0.4)',
    emojis: ['🐙', '🦈', '🐠', '🐳', '🐚', '🦀'],
    levels: [
      { rows: 6, colors: 4, shots: 26 },
      { rows: 6, colors: 4, shots: 24 },
      { rows: 7, colors: 4, shots: 24 },
      { rows: 7, colors: 5, shots: 22 },
      { rows: 7, colors: 5, shots: 22 },
      { rows: 8, colors: 5, shots: 20 },
      { rows: 8, colors: 6, shots: 20 },
      { rows: 8, colors: 6, shots: 18 },
    ],
  },
];
