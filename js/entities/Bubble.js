/**
 * =============================================================================
 * Bubble.js — Bubble Entity (Data Component)
 * =============================================================================
 *
 * PURPOSE:
 *   Represents a single bubble in the game — both grid bubbles and shot bubbles.
 *   This is a "data class" or "component" — it holds state but minimal logic.
 *
 * ARCHITECTURE PATTERN — Entity-Component:
 *   In professional game development, entities are often split into:
 *     - Data (this file):  What the bubble IS (position, color, state)
 *     - Logic (BubbleGrid): What the bubble DOES (matching, popping)
 *     - Rendering (BubbleRenderer): How the bubble LOOKS (gradients, glow)
 *
 *   This separation is the foundation of the Entity-Component-System (ECS)
 *   pattern used by Unity, Unreal, and modern game engines:
 *     - Entity   = just an ID (or this class)
 *     - Component = data (position, color, health)
 *     - System   = logic that operates on components (physics, rendering)
 *
 * IN A REAL PixiJS PROJECT:
 *   This would extend PIXI.Sprite or be a PIXI.Container:
 *     class Bubble extends PIXI.Sprite {
 *       constructor(texture) {
 *         super(texture);
 *         this.colorIdx = 0;
 *         ...
 *       }
 *     }
 *
 * PROPERTIES:
 *   pos        — Vec2 world position (pixel coordinates)
 *   vel        — Vec2 velocity (only used when falling)
 *   color      — Hex string for rendering ('#ff3366')
 *   colorIdx   — Integer index into COLORS array (for matching logic)
 *   radius     — Collision/render radius in pixels
 *   alive      — Is this bubble active in the game?
 *   popping    — Is the pop animation playing?
 *   popProgress— 0..1 animation progress
 *   alpha      — Transparency (1 = opaque, 0 = invisible)
 *   scale      — Size multiplier (grows during pop animation)
 *   glowPulse  — Phase offset for the glow shimmer effect
 *
 * WHY reset() EXISTS:
 *   Works with ObjectPool — when a bubble is recycled, reset() clears
 *   all state so it behaves like a brand new instance.
 * =============================================================================
 */

import { Vec2 } from '../core/Vec2.js';
import { BUBBLE_R, COLORS } from '../constants.js';

export class Bubble {
  constructor() {
    this.reset();
  }

  /** Restore to factory-default state. Called by ObjectPool on release. */
  reset() {
    this.pos         = new Vec2();
    this.vel         = new Vec2();
    this.color       = COLORS[0];
    this.colorIdx    = 0;
    this.radius      = BUBBLE_R;
    this.alive       = false;
    this.popping     = false;
    this.popProgress = 0;
    this.alpha       = 1;
    this.scale       = 1;
    this.power       = null; // null | 'bomb' | 'rainbow'
    this.glowPulse   = Math.random() * Math.PI * 2; // Random phase so bubbles don't pulse in sync
  }
}
