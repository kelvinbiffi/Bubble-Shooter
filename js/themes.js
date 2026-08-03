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
    starTint: 'rgba(255,180,60,0.07)',
    // One emoji per color index (maps to COLORS array)
    emojis: ['🦕', '🦖', '🦎', '🐊', '🦴', '🌿'],
    // Curva validada no SIM-01 (bot decente + smart-colors): 97% -> ~52%
    levels: [
      { rows: 3, colors: 2, shots: 30 },
      { rows: 3, colors: 3, shots: 32 },
      { rows: 4, colors: 3, shots: 32 },
      { rows: 4, colors: 3, shots: 30 },
      { rows: 5, colors: 3, shots: 32 },
      { rows: 5, colors: 3, shots: 30 },
      { rows: 4, colors: 4, shots: 42 },
      { rows: 5, colors: 4, shots: 44 },
    ],
  },
  {
    name: 'Kaiju Island',
    icon: '🐉',
    bgGradient: ['#2a0a1a', '#1a0520'],
    starTint: 'rgba(255,80,50,0.07)',
    emojis: ['🐉', '🦑', '🔥', '⚡', '🌋', '🦂'],
    // SIM-01: ~73% -> ~35%
    levels: [
      { rows: 5, colors: 3, shots: 32 },
      { rows: 5, colors: 3, shots: 30 },
      { rows: 5, colors: 4, shots: 44 },
      { rows: 5, colors: 4, shots: 42 },
      { rows: 6, colors: 4, shots: 46 },
      { rows: 6, colors: 4, shots: 44 },
      { rows: 6, colors: 4, shots: 42 },
      { rows: 7, colors: 4, shots: 44 },
    ],
  },
  {
    name: 'Deep Ocean',
    icon: '🐙',
    bgGradient: ['#040a20', '#021a2a'],
    starTint: 'rgba(60,180,255,0.07)',
    emojis: ['🐙', '🦈', '🐠', '🐳', '🐚', '🦀'],
    // SIM-01: ~49% -> ~25%; 5 cores só em grid curto (parede comprovada em grid alto)
    levels: [
      { rows: 6, colors: 4, shots: 46 },
      { rows: 6, colors: 4, shots: 44 },
      { rows: 7, colors: 4, shots: 46 },
      { rows: 7, colors: 4, shots: 44 },
      { rows: 8, colors: 4, shots: 48 },
      { rows: 8, colors: 4, shots: 46 },
      { rows: 4, colors: 5, shots: 46 },
      { rows: 5, colors: 5, shots: 50 },
    ],
  },
];
