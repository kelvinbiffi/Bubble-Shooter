/**
 * =============================================================================
 * Shooter.js — Player Launcher Entity
 * =============================================================================
 *
 * PURPOSE:
 *   The player's bubble launcher — the "cannon" at the bottom of the screen.
 *   Manages aiming, the current bubble to shoot, and the next bubble preview.
 *
 * GAME DESIGN ROLE:
 *   The shooter is the player's primary interaction point. It provides:
 *   1. Visual feedback — barrel rotates to show aim direction
 *   2. Aim assist — dashed trajectory line with wall bounce prediction
 *   3. Next bubble preview — lets players plan ahead (strategic depth)
 *
 * IN A REAL PixiJS PROJECT:
 *   This would be a PIXI.Container with child sprites:
 *     - Base platform (PIXI.Graphics or sprite)
 *     - Rotating barrel (PIXI.Sprite with pivot point)
 *     - Aim line (PIXI.Graphics redrawn each frame)
 *     - Current bubble (PIXI.Sprite child positioned at barrel tip)
 *     - Next bubble preview (PIXI.Sprite, smaller scale)
 *
 * AIMING SYSTEM:
 *   The aim line simulates wall bounces to show where the bubble will go.
 *   This is done by ray-marching: stepping forward along the aim direction
 *   and reflecting the X component when hitting a side wall.
 *   Professional games might use actual raycasting against the grid,
 *   but the visual approximation is good enough for player feedback.
 *
 * KEY CONCEPTS:
 *   - atan2(dy, dx): converts mouse position to angle (radians)
 *   - Angle clamping: prevents shooting downward (would break gameplay)
 *   - Double buffering (current + next): classic puzzle game pattern
 *     (Tetris has "next piece", Puyo Puyo has "next pair")
 * =============================================================================
 */

import { Vec2 } from '../core/Vec2.js';
import { CANVAS_W, CANVAS_H, BUBBLE_R, COLORS } from '../constants.js';
import { drawBubble } from '../rendering/BubbleRenderer.js';

export class Shooter {
  constructor() {
    this.pos           = new Vec2(CANVAS_W / 2, CANVAS_H - 50);
    this.angle         = -Math.PI / 2; // Default: straight up
    this.currentBubble = null;         // Bubble loaded in the launcher
    this.nextBubble    = null;         // Preview of the next bubble
  }

  /**
   * Create a new random bubble from the object pool.
   * Color count increases with level for progressive difficulty.
   * @param {ObjectPool} pool   - Bubble pool to draw from
   * @param {number}     colors - How many colors are in play this level
   */
  getNewBubble(pool, colors) {
    const b = pool.get();
    b.colorIdx = Math.floor(Math.random() * colors);
    b.color    = COLORS[b.colorIdx];
    b.pos      = this.pos.clone();
    b.alive    = true;
    return b;
  }

  /**
   * Render the launcher: base platform, rotating barrel, aim line, next preview.
   * @param {CanvasRenderingContext2D} ctx
   */
  draw(ctx) {
    ctx.save();
    ctx.translate(this.pos.x, this.pos.y);

    // Base platform — ellipse to suggest 3D perspective
    ctx.fillStyle   = 'rgba(0,255,204,0.08)';
    ctx.strokeStyle = 'rgba(0,255,204,0.3)';
    ctx.lineWidth   = 1;
    ctx.beginPath();
    ctx.ellipse(0, 8, 36, 12, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Barrel — rotates with mouse angle
    ctx.rotate(this.angle + Math.PI / 2);
    ctx.fillStyle   = 'rgba(0,255,204,0.6)';
    ctx.strokeStyle = '#00ffcc';
    ctx.lineWidth   = 2;
    ctx.shadowBlur  = 10;
    ctx.shadowColor = '#00ffcc';
    ctx.beginPath();
    ctx.roundRect(-5, -32, 10, 28, 3);
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    // Dashed aim line with wall-bounce prediction
    if (this.currentBubble) {
      const dx = Math.cos(this.angle);
      const dy = Math.sin(this.angle);
      ctx.save();
      ctx.strokeStyle = 'rgba(0,255,204,0.15)';
      ctx.lineWidth   = 1;
      ctx.setLineDash([6, 8]);
      ctx.beginPath();
      ctx.moveTo(this.pos.x, this.pos.y);

      // Simple wall-bounce ray march (up to 3 bounces)
      let ax = this.pos.x, ay = this.pos.y;
      let adx = dx, ady = dy;
      for (let i = 0; i < 3; i++) {
        const steps = 200;
        const ex = ax + adx * steps;
        const ey = ay + ady * steps;
        if (ex < BUBBLE_R) {
          ctx.lineTo(BUBBLE_R, ay + ady * ((BUBBLE_R - ax) / adx));
          ax = BUBBLE_R;
          ay += ady * ((BUBBLE_R - ax) / adx);
          adx = -adx; // Reflect X
        } else if (ex > CANVAS_W - BUBBLE_R) {
          const tx = CANVAS_W - BUBBLE_R;
          ctx.lineTo(tx, ay + ady * ((tx - ax) / adx));
          ay = ay + ady * ((tx - ax) / adx);
          ax = tx;
          adx = -adx; // Reflect X
        } else {
          ctx.lineTo(ex, ey);
          break;
        }
      }
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();
    }

    // Next bubble preview (small, to the right)
    if (this.nextBubble) {
      ctx.save();
      ctx.font      = '8px Space Mono';
      ctx.fillStyle = 'rgba(255,255,255,0.3)';
      ctx.fillText('NEXT', this.pos.x + 50, this.pos.y - 10);
      const nb = this.nextBubble;
      const previewBubble = {
        pos: new Vec2(this.pos.x + 60, this.pos.y),
        color: nb.color, colorIdx: nb.colorIdx,
        radius: 16, alpha: 0.8, scale: 0.6,
        popping: false, glowPulse: 0,
      };
      drawBubble(ctx, previewBubble);
      ctx.restore();
    }
  }
}
