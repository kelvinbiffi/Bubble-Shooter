/**
 * =============================================================================
 * ParticleSystem.js — Visual Effects Particle Emitter
 * =============================================================================
 *
 * PURPOSE:
 *   Creates and manages particle explosions when bubbles pop.
 *   Particles are small colored dots that burst outward, fall with gravity,
 *   and fade out — providing satisfying visual feedback ("juice").
 *
 * WHY PARTICLES MATTER — "GAME JUICE":
 *   "Juice" is the game design term for effects that make actions feel
 *   impactful and satisfying. Compare:
 *     Without particles: bubble disappears instantly (feels empty)
 *     With particles:    bubble explodes in a colorful burst (feels GREAT)
 *
 *   Famous GDC talk: "Juice It or Lose It" by Martin Jonasson & Petri Purho
 *   demonstrates how particles transform a boring game into an exciting one.
 *
 * HOW IT WORKS:
 *   1. emit(x, y, color, count) — Creates particles in a radial burst
 *      Each particle gets a random angle around a full circle,
 *      a random speed, and a random decay rate.
 *
 *   2. update() — Each frame, particles move, fall (gravity), and fade.
 *      Dead particles (life <= 0) are removed via reverse-iteration splice.
 *
 *   3. draw() — Renders each particle as a glowing circle that shrinks
 *      and fades as life decreases.
 *
 * REVERSE ITERATION PATTERN:
 *   When removing items from an array while iterating, you MUST go backwards
 *   (i = length-1 to 0). Going forward would skip elements:
 *     [A, B, C, D] — remove B at index 1
 *     [A, C, D]    — C is now at index 1, but i moves to 2 → C is skipped!
 *   Reverse iteration avoids this because removals only affect indices
 *   we've already visited.
 *
 * IN A REAL PixiJS PROJECT:
 *   - Use PIXI.ParticleContainer for batch rendering (10x faster)
 *   - Or @pixi/particle-emitter for a full-featured particle system
 *   - WebGL particle systems can handle 100,000+ particles
 *   - Canvas2D starts struggling around 1,000 particles
 *
 * PERFORMANCE NOTE:
 *   splice() is O(n) because it shifts all subsequent elements.
 *   For a high-performance system, you'd use a swap-and-pop pattern
 *   (swap the dead particle with the last one, then pop). We keep
 *   splice here for clarity since particle counts are low (~100).
 * =============================================================================
 */

export class ParticleSystem {
  constructor() {
    this.particles = []; // Active particle array
  }

  /**
   * Emit a burst of particles from a point (e.g., where a bubble popped).
   * Particles spread in a full circle with slight randomization.
   *
   * @param {number} x     - Emission center X
   * @param {number} y     - Emission center Y
   * @param {string} color - CSS color for the particles
   * @param {number} count - Number of particles to emit (default: 12)
   */
  emit(x, y, color, count = 12) {
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 / count) * i + Math.random() * 0.5;
      const speed = 2 + Math.random() * 4;
      this.particles.push({
        x, y,
        vx:    Math.cos(angle) * speed,       // Horizontal velocity
        vy:    Math.sin(angle) * speed,        // Vertical velocity
        color,
        life:  1,                              // 1 = just born, 0 = dead
        decay: 0.03 + Math.random() * 0.03,   // How fast it fades
        size:  3 + Math.random() * 4,          // Radius in pixels
      });
    }
  }

  /** Update all particles: move, apply gravity, fade, remove dead ones */
  update() {
    // Reverse iteration — safe to splice while looping
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x    += p.vx;
      p.y    += p.vy;
      p.vy   += 0.15;   // Gravity pulls particles downward
      p.life -= p.decay;
      if (p.life <= 0) this.particles.splice(i, 1);
    }
  }

  /** Render all living particles as glowing circles */
  draw(ctx) {
    for (const p of this.particles) {
      ctx.save();
      ctx.globalAlpha  = p.life;             // Fade out as life decreases
      ctx.fillStyle    = p.color;
      ctx.shadowBlur   = 10;
      ctx.shadowColor  = p.color;            // Glow matches particle color
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2); // Shrinks as it dies
      ctx.fill();
      ctx.restore();
    }
  }
}
