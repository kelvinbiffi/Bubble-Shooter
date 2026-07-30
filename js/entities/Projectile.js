/**
 * =============================================================================
 * Projectile.js — Shot Bubble in Flight
 * =============================================================================
 *
 * PURPOSE:
 *   Manages a bubble after it's been shot — handles movement and wall bouncing.
 *   Only one projectile exists at a time (the game waits for it to land).
 *
 * WHY SEPARATE FROM BUBBLE?
 *   A Bubble is a static grid entity. A Projectile adds physics behavior:
 *   - Constant velocity movement
 *   - Wall collision and reflection
 *   - Active/inactive state toggle
 *
 *   This follows the Composition pattern: instead of making Bubble handle
 *   both "sitting in grid" and "flying through air" (which leads to messy
 *   if/else branches), we wrap a Bubble in a Projectile when it's in flight.
 *
 * PHYSICS — WALL BOUNCING:
 *   When the bubble hits a side wall:
 *   1. Clamp position to wall boundary (prevent going out of bounds)
 *   2. Flip the X velocity component (reflection)
 *   3. Y velocity is unchanged (bubble continues moving upward)
 *
 *   This is the simplest form of physics reflection:
 *     v_reflected = v - 2(v · n)n   (general formula)
 *     For vertical walls: just negate vx (since normal is horizontal)
 *
 * DESIGN NOTE:
 *   The game only allows one shot at a time (this.active flag).
 *   Some bubble shooters allow rapid fire, but single-shot creates
 *   more strategic, thoughtful gameplay. Each shot matters more
 *   when you can't spam.
 * =============================================================================
 */

import { Vec2 } from '../core/Vec2.js';
import { BUBBLE_R, CANVAS_W, SHOOT_SPEED } from '../constants.js';
import { drawBubble } from '../rendering/BubbleRenderer.js';

export class Projectile {
  constructor() {
    this.bubble = null;       // Reference to the Bubble entity being shot
    this.vel    = new Vec2(); // Velocity vector (direction + speed)
    this.active = false;      // Is a shot currently in flight?
  }

  /**
   * Fire a bubble at the given angle.
   * @param {Bubble} bubble - The bubble to launch
   * @param {number} angle  - Direction in radians (from atan2)
   */
  launch(bubble, angle) {
    this.bubble = bubble;
    this.vel    = new Vec2(
      Math.cos(angle) * SHOOT_SPEED,
      Math.sin(angle) * SHOOT_SPEED,
    );
    this.active = true;
    this.trail  = [];
  }

  /** Move the bubble and handle wall reflections. dt in seconds. */
  update(dt) {
    if (!this.active) return;

    // Apply velocity scaled by delta time (frame-rate independent)
    this.bubble.pos.x += this.vel.x * dt;
    this.bubble.pos.y += this.vel.y * dt;

    // Trail: rastro curto e esmaecente atrás do tiro
    this.trail.push({ x: this.bubble.pos.x, y: this.bubble.pos.y });
    if (this.trail.length > 10) this.trail.shift();

    // Left wall bounce
    if (this.bubble.pos.x - BUBBLE_R < 0) {
      this.bubble.pos.x = BUBBLE_R;
      this.vel.x = Math.abs(this.vel.x); // Force positive (rightward)
    }

    // Right wall bounce
    if (this.bubble.pos.x + BUBBLE_R > CANVAS_W) {
      this.bubble.pos.x = CANVAS_W - BUBBLE_R;
      this.vel.x = -Math.abs(this.vel.x); // Force negative (leftward)
    }
  }

  /** Render the bubble while in flight */
  draw(ctx) {
    if (!this.active || !this.bubble) return;
    if (this.trail?.length) {
      ctx.save();
      for (let i = 0; i < this.trail.length; i++) {
        const t = this.trail[i];
        const f = (i + 1) / this.trail.length;
        ctx.globalAlpha = f * 0.18;
        ctx.fillStyle = this.bubble.color;
        ctx.beginPath();
        ctx.arc(t.x, t.y, BUBBLE_R * 0.55 * f, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }
    drawBubble(ctx, this.bubble);
  }
}
