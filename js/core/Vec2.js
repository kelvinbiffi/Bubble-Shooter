/**
 * =============================================================================
 * Vec2.js — 2D Vector Mathematics
 * =============================================================================
 *
 * PURPOSE:
 *   Provides an immutable-style 2D vector class for all spatial math:
 *   positions, velocities, directions, and distances.
 *
 * WHY IT EXISTS:
 *   Games constantly manipulate 2D coordinates. Without a Vector class,
 *   you end up with scattered x/y arithmetic that's error-prone and hard
 *   to read. Every game framework has one:
 *     - PixiJS:  PIXI.Point / PIXI.ObservablePoint
 *     - Phaser:  Phaser.Math.Vector2
 *     - Unity:   Vector2
 *     - Godot:   Vector2
 *
 * DESIGN DECISIONS:
 *   - Immutable operations (add/sub/scale return NEW Vec2 instances)
 *     This prevents accidental mutation bugs like:
 *       bubble.pos.add(velocity)  // doesn't modify bubble.pos
 *     You must explicitly assign: bubble.pos = bubble.pos.add(velocity)
 *
 *   - No operator overloading (JS doesn't support it), so we use methods.
 *
 *   - clone() is essential — without it, two objects sharing the same Vec2
 *     reference would move together (a classic game dev bug).
 *
 * KEY CONCEPTS FOR STUDENTS:
 *   - Vector addition:    position + velocity = new position
 *   - Vector subtraction: target - origin     = direction vector
 *   - Normalization:      direction / magnitude = unit vector (length 1)
 *   - Magnitude:          sqrt(x² + y²) = distance from origin (Pythagorean theorem)
 *   - Scaling:            vector * scalar = faster/slower movement
 * =============================================================================
 */

export class Vec2 {
  /**
   * @param {number} x - Horizontal component (right is positive)
   * @param {number} y - Vertical component (DOWN is positive in screen space!)
   */
  constructor(x = 0, y = 0) {
    this.x = x;
    this.y = y;
  }

  /** Create an independent copy — prevents shared-reference bugs */
  clone() {
    return new Vec2(this.x, this.y);
  }

  /** Vector addition: combines two vectors (e.g., position + velocity) */
  add(v) {
    return new Vec2(this.x + v.x, this.y + v.y);
  }

  /** Vector subtraction: finds difference (e.g., target - origin = direction) */
  sub(v) {
    return new Vec2(this.x - v.x, this.y - v.y);
  }

  /** Scalar multiplication: scales the vector (e.g., direction * speed) */
  scale(s) {
    return new Vec2(this.x * s, this.y * s);
  }

  /** Length of the vector — Pythagorean theorem: sqrt(x² + y²) */
  magnitude() {
    return Math.sqrt(this.x * this.x + this.y * this.y);
  }

  /**
   * Returns a unit vector (length = 1) pointing in the same direction.
   * Used to separate "direction" from "speed":
   *   velocity = direction.normalize().scale(speed)
   * Returns zero vector if magnitude is 0 (avoids division by zero).
   */
  normalize() {
    const m = this.magnitude();
    return m ? new Vec2(this.x / m, this.y / m) : new Vec2();
  }

  /** Euclidean distance to another point — used for collision detection */
  distanceTo(v) {
    return this.sub(v).magnitude();
  }
}
