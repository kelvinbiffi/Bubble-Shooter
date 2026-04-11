/**
 * =============================================================================
 * ObjectPool.js — Object Pooling Pattern for Performance
 * =============================================================================
 *
 * PURPOSE:
 *   Recycles objects instead of creating/destroying them repeatedly.
 *   This is one of the most critical performance patterns in game development.
 *
 * THE PROBLEM IT SOLVES:
 *   In a bubble shooter, bubbles are constantly being created (new shots)
 *   and destroyed (popped clusters). In JavaScript:
 *     - `new Bubble()` allocates memory on the heap
 *     - When a bubble is "destroyed", it becomes garbage
 *     - The Garbage Collector (GC) must eventually clean it up
 *     - GC pauses cause frame drops — visible as stuttering/jank
 *
 *   In a 60fps game, you have only ~16.6ms per frame. A GC pause of even
 *   5ms can cause a noticeable hitch.
 *
 * HOW IT WORKS:
 *   1. Objects are created once and stored in a "pool" (array)
 *   2. When you need an object: pool.get() — pops from the pool (or creates new if empty)
 *   3. When done with an object: pool.release(obj) — resets it and pushes back to pool
 *   4. The object is never actually destroyed — it's just recycled
 *
 *   Think of it like a library: books aren't destroyed when returned,
 *   they go back on the shelf for the next reader.
 *
 * WHERE THIS PATTERN IS USED:
 *   - PixiJS:    PIXI.ParticleContainer recycles sprites internally
 *   - Unity:     UnityEngine.Pool.ObjectPool<T>
 *   - Unreal:    Actor pooling / FActorPoolingSubsystem
 *   - Phaser:    Phaser.GameObjects.Group with maxSize
 *   - Bullet hell games: thousands of bullets, all pooled
 *
 * CONSTRUCTOR PARAMETERS:
 *   - factory: () => T          — Creates a brand new instance
 *   - reset:   (obj: T) => void — Resets an instance to "like new" state
 *
 * EXAMPLE USAGE:
 *   const bulletPool = new ObjectPool(
 *     () => new Bullet(),           // factory: how to make one
 *     (b) => { b.x = 0; b.y = 0; } // reset: clean it for reuse
 *   );
 *   const bullet = bulletPool.get();     // grab from pool (or create)
 *   bulletPool.release(bullet);          // return to pool when done
 * =============================================================================
 */

export class ObjectPool {
  /**
   * @param {Function} factory - Creates a new object instance
   * @param {Function} reset   - Resets an object to its initial state for reuse
   */
  constructor(factory, reset) {
    this._pool    = [];      // Stack of available (recycled) objects
    this._factory = factory; // Function to create new instances
    this._reset   = reset;   // Function to clean objects before reuse
  }

  /**
   * Retrieve an object from the pool.
   * If the pool is empty, creates a new one via the factory.
   * Uses pop() (stack behavior) for O(1) retrieval.
   */
  get() {
    return this._pool.length > 0
      ? this._pool.pop()
      : this._factory();
  }

  /**
   * Return an object to the pool after use.
   * The reset function clears any state so the next consumer
   * gets a "clean" object — no leftover data from previous use.
   */
  release(obj) {
    this._reset(obj);
    this._pool.push(obj);
  }
}
