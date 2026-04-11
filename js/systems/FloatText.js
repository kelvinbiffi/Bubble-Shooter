/**
 * =============================================================================
 * FloatText.js — Floating Score/Combo Text
 * =============================================================================
 *
 * PURPOSE:
 *   Shows animated text that floats upward and fades out — used for
 *   score popups (+300), combo indicators (x3 COMBO!), and events (DROP!).
 *
 * WHY THIS EXISTS — UI FEEDBACK:
 *   Players need immediate, contextual feedback for their actions:
 *   - "+300" appears WHERE the bubbles popped (spatial feedback)
 *   - "x3 COMBO!" tells them chaining shots is being rewarded
 *   - The floating + fading animation draws attention without blocking gameplay
 *
 *   This is a standard pattern in games called "damage numbers" or
 *   "score popups". You see it in RPGs (damage floating above enemies),
 *   fighting games (combo counters), and puzzle games (score feedback).
 *
 * ANIMATION:
 *   - Moves upward at constant velocity (vy = -1.5 px/frame)
 *   - Fades out linearly (life decreases by 0.02 per frame)
 *   - Rendered with glow (shadowBlur) matching the text color
 *   - Removed from the game when life reaches 0
 *
 * IN A REAL PixiJS PROJECT:
 *   This would be a PIXI.Text with a gsap or tweenjs animation:
 *     gsap.to(scoreText, { y: "-=60", alpha: 0, duration: 1, onComplete: () => scoreText.destroy() });
 * =============================================================================
 */

export class FloatText {
  /**
   * @param {number} x     - Starting X position (usually center of popped cluster)
   * @param {number} y     - Starting Y position
   * @param {string} text  - Text to display ("+300", "x2 COMBO!", etc.)
   * @param {string} color - CSS color for the text and glow
   */
  constructor(x, y, text, color = '#fff') {
    this.x     = x;
    this.y     = y;
    this.text  = text;
    this.color = color;
    this.life  = 1;      // 1 = just created, 0 = done (ready to remove)
    this.vy    = -1.5;   // Float upward (negative Y = up in screen space)
  }

  /** Advance animation — move up and fade */
  update() {
    this.y    += this.vy;
    this.life -= 0.02;
  }

  /** Render the floating text with glow effect */
  draw(ctx) {
    if (this.life <= 0) return;
    ctx.save();
    ctx.globalAlpha  = this.life;
    ctx.font         = 'bold 20px Orbitron, monospace';
    ctx.fillStyle    = this.color;
    ctx.shadowBlur   = 12;
    ctx.shadowColor  = this.color;
    ctx.textAlign    = 'center';
    ctx.fillText(this.text, this.x, this.y);
    ctx.restore();
  }
}
