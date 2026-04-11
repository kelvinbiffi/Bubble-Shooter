/**
 * =============================================================================
 * Game.js — Main Game State Machine & Loop
 * =============================================================================
 *
 * PURPOSE:
 *   The central orchestrator — owns the game loop, state machine, input
 *   handling, collision detection, scoring, and level progression.
 *   This is the "Director" of the game: it tells all other systems
 *   when to update, what to draw, and how to respond to events.
 *
 * GAME LOOP (The Heartbeat):
 *   Every game runs a loop that repeats ~60 times per second:
 *     1. Calculate delta time (time since last frame)
 *     2. Process input (already handled via event listeners)
 *     3. Update game state (move objects, check collisions, apply rules)
 *     4. Draw everything to the screen
 *     5. Request next frame
 *
 *   We use requestAnimationFrame (rAF) which:
 *   - Syncs to the monitor's refresh rate (usually 60Hz)
 *   - Pauses when the tab is hidden (saves battery/CPU)
 *   - Provides a high-resolution timestamp
 *
 *   In PixiJS: PIXI.Ticker handles this automatically.
 *   In Unity:  MonoBehaviour.Update() / FixedUpdate()
 *   In Godot:  _process(delta) / _physics_process(delta)
 *
 * STATE MACHINE:
 *   The game can be in one of these states:
 *
 *   IDLE ──────► PLAYING ──────► GAME_OVER
 *     │              │               │
 *     │              ▼               │
 *     │         ANIMATING            │
 *     │              │               │
 *     │              ▼               │
 *     │         LEVEL_CLEAR ─────────┘
 *     │              │
 *     └──────────────┘ (restart)
 *
 *   Using explicit states prevents bugs like:
 *   - Shooting while the pop animation plays
 *   - Processing input on the game-over screen
 *   - Multiple game loops running simultaneously
 *
 * COLLISION DETECTION:
 *   Uses circle-to-circle distance check:
 *     if (distance(bubbleA, bubbleB) < threshold) → collision!
 *
 *   The threshold (BUBBLE_R * 1.9) is slightly less than 2× radius
 *   because it feels better when bubbles snap slightly before touching.
 *   This is a common game dev trick — "generous" collision makes the
 *   game feel more responsive and forgiving.
 *
 * SCORING SYSTEM:
 *   - Base: cluster_size × 100 points
 *   - Combo multiplier: consecutive pops multiply score (×1, ×2, ×3...)
 *   - Floating bonus: 50 points per dropped bubble
 *   - Level clear bonus: remaining_shots × 200 + level × 500
 *   - Combo resets to 0 on a non-matching shot
 *
 * INPUT HANDLING:
 *   Supports both mouse (desktop) and touch (mobile):
 *   - mousemove / touchmove: Updates shooter angle
 *   - click / touchend: Fires the current bubble
 *   - Touch events use preventDefault to block scrolling/zooming
 *   - Angle is clamped to prevent shooting downward
 * =============================================================================
 */

import { Vec2 } from './core/Vec2.js';
import { CANVAS_W, CANVAS_H, BUBBLE_R, MAX_SHOTS, COLORS } from './constants.js';
import { BubbleGrid } from './systems/BubbleGrid.js';
import { ParticleSystem } from './systems/ParticleSystem.js';
import { SoundSystem } from './systems/SoundSystem.js';
import { FloatText } from './systems/FloatText.js';
import { Shooter } from './entities/Shooter.js';
import { Projectile } from './entities/Projectile.js';

export class Game {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx    = canvas.getContext('2d');

    // ---- State Machine ----
    this.state    = 'IDLE';

    // ---- Scoring ----
    this.score    = 0;
    this.level    = 1;
    this.shots    = MAX_SHOTS;
    this.combo    = 0;
    this.maxCombo = 0;

    // ---- Game Systems ----
    this.grid       = new BubbleGrid();
    this.shooter    = new Shooter();
    this.projectile = new Projectile();
    this.particles  = new ParticleSystem();
    this.sound      = new SoundSystem();
    this.floatTexts = [];

    // ---- Loop Timing ----
    this.lastTime = 0;
    this.raf      = null; // requestAnimationFrame ID

    this._bindEvents();
  }

  // ===========================================================================
  // INPUT HANDLING — Mouse + Touch
  // ===========================================================================

  /** Attach mouse AND touch event listeners to the canvas */
  _bindEvents() {
    // Desktop
    this.canvas.addEventListener('mousemove', (e) => this._onPointerMove(e));
    this.canvas.addEventListener('click', (e) => this._onPointerTap(e));

    // Mobile touch
    this.canvas.addEventListener('touchmove', (e) => {
      e.preventDefault(); // Prevent scroll/zoom while aiming
      this._onPointerMove(e.touches[0]);
    }, { passive: false });

    this.canvas.addEventListener('touchend', (e) => {
      e.preventDefault();
      this._onPointerTap(e.changedTouches[0]);
    }, { passive: false });
  }

  /** Convert any pointer event (mouse or touch) to canvas-local coordinates */
  _getPointerPos(e) {
    const rect = this.canvas.getBoundingClientRect();
    const scaleX = CANVAS_W / rect.width;
    const scaleY = CANVAS_H / rect.height;
    return new Vec2(
      (e.clientX - rect.left) * scaleX,
      (e.clientY - rect.top) * scaleY,
    );
  }

  /** Update aim angle based on pointer position */
  _onPointerMove(e) {
    if (this.state !== 'PLAYING') return;
    const pos   = this._getPointerPos(e);
    const dx    = pos.x - this.shooter.pos.x;
    const dy    = pos.y - this.shooter.pos.y;
    let angle   = Math.atan2(dy, dx);
    // Clamp angle to upper hemisphere — prevent shooting downward
    angle = Math.max(-Math.PI + 0.2, Math.min(-0.2, angle));
    this.shooter.angle = angle;
  }

  /** Handle tap/click — fire if allowed */
  _onPointerTap(e) {
    if (this.state !== 'PLAYING') return;
    if (this.projectile.active) return; // Wait for current shot to land
    // Update aim on tap (important for mobile where there's no mousemove)
    this._onPointerMove(e);
    if (this.shots <= 0) { this._gameOver(); return; }
    this._shoot();
  }

  // ===========================================================================
  // SHOOTING
  // ===========================================================================

  /** Fire the current bubble and prepare the next one */
  _shoot() {
    const b = this.shooter.currentBubble;
    if (!b) return;

    b.pos = this.shooter.pos.clone();
    this.projectile.launch(b, this.shooter.angle);
    this.shots--;
    this.sound.playShoot();

    // Cycle: current ← next, next ← new random
    this.shooter.currentBubble = this.shooter.nextBubble;
    this.shooter.nextBubble    = this.shooter.getNewBubble(
      this.grid.pool,
      Math.min(3 + this.level, COLORS.length),
    );
    this._updateHUD();
  }

  // ===========================================================================
  // COLLISION & MATCHING
  // ===========================================================================

  /** Check if the projectile hit the top wall or a grid bubble */
  _checkCollision() {
    const b = this.projectile.bubble;
    if (!b) return false;

    // Hit the ceiling
    if (b.pos.y - BUBBLE_R <= 40) {
      return this._snapBubble(b);
    }

    // Check against all grid bubbles (circle-to-circle distance)
    for (let r = 0; r < this.grid.grid.length; r++) {
      for (let c = 0; c < (this.grid.grid[r] || []).length; c++) {
        const gb = this.grid.grid[r]?.[c];
        if (!gb?.alive || gb.popping) continue;
        const dist = b.pos.distanceTo(gb.pos);
        if (dist < BUBBLE_R * 1.9) { // Generous threshold for better feel
          return this._snapBubble(b, gb, r, c);
        }
      }
    }
    return false;
  }

  /**
   * Snap a projectile into the grid and process match logic.
   * This is the core gameplay moment — where shooting meets puzzle.
   */
  _snapBubble(b, hitBubble, hitRow, hitCol) {
    this.projectile.active = false;

    // Convert landing position to grid coordinates
    const { row, col } = this.grid.worldToGrid(b.pos.x, b.pos.y);
    const placed = this.grid.placeBubble(b, row, col);

    // Find connected same-color cluster using BFS flood fill
    const cluster = this.grid.findCluster(placed.row, placed.col);

    if (cluster.length >= 3) {
      // ---- MATCH FOUND ----
      this.combo++;
      if (this.combo > this.maxCombo) this.maxCombo = this.combo;

      // Score: base × combo multiplier
      const basePoints = cluster.length * 100;
      const comboMult  = this.combo;
      const points     = basePoints * comboMult;
      this.score += points;

      // Sound: pop + combo bonus
      this.sound.playPop();
      if (this.combo > 1) this.sound.playCombo();

      // Trigger pop animation + particles for each bubble in the cluster
      for (const { row: r, col: c } of cluster) {
        const gb = this.grid.grid[r]?.[c];
        if (gb) {
          gb.popping     = true;
          gb.popProgress = 0;
          this.particles.emit(gb.pos.x, gb.pos.y, gb.color, 14);
        }
      }

      // Show score popup at cluster center
      const cx = cluster.reduce((s, n) => s + (this.grid.grid[n.row]?.[n.col]?.pos.x || 0), 0) / cluster.length;
      const cy = cluster.reduce((s, n) => s + (this.grid.grid[n.row]?.[n.col]?.pos.y || 0), 0) / cluster.length;
      this.floatTexts.push(new FloatText(cx, cy, `+${points}`, COLORS[b.colorIdx]));
      if (this.combo > 1) {
        this.floatTexts.push(new FloatText(cx, cy - 30, `x${this.combo} COMBO!`, '#ffcc00'));
      }

      // After a short delay, check for floating bubbles (chain reaction)
      setTimeout(() => {
        const floating = this.grid.findFloating();
        for (const { row: r, col: c } of floating) {
          const gb = this.grid.grid[r]?.[c];
          if (gb && !gb.popping) {
            this.score    += 50;
            gb.popping     = true;
            gb.popProgress = 0;
            this.particles.emit(gb.pos.x, gb.pos.y, gb.color, 8);
          }
        }
        if (floating.length > 0) {
          this.sound.playDrop();
          this.floatTexts.push(new FloatText(CANVAS_W / 2, CANVAS_H / 2, `DROP! +${floating.length * 50}`, '#ff6600'));
        }
        this._updateHUD();

        // Check for level clear or game over
        setTimeout(() => {
          if (this.grid.countAlive() === 0) this._levelClear();
          else if (this.shots <= 0) this._gameOver();
        }, 600);
      }, 300);
    } else {
      // ---- NO MATCH — combo resets ----
      this.combo = 0;
      if (this.shots <= 0) setTimeout(() => this._gameOver(), 500);
    }

    this._updateHUD();
    return true;
  }

  // ===========================================================================
  // LEVEL & GAME STATE TRANSITIONS
  // ===========================================================================

  /** All bubbles cleared — advance to next level */
  _levelClear() {
    this.state = 'LEVEL_CLEAR';
    this.level++;
    this.shots  = MAX_SHOTS;
    this.score += this.shots * 200 + this.level * 500; // Bonus
    this.sound.playLevelClear();
    this.floatTexts.push(new FloatText(CANVAS_W / 2, CANVAS_H / 2 - 20, `LEVEL ${this.level - 1} CLEAR!`, '#00ffcc'));
    setTimeout(() => this._startLevel(), 1500);
  }

  /** No shots left or bubbles reached danger zone */
  _gameOver() {
    this.state = 'GAME_OVER';
    this.sound.playGameOver();
    const overlay = document.getElementById('overlay');
    const muteIcon = this.sound.muted ? '🔇' : '🔊';
    overlay.innerHTML = `
      <div class="overlay-title" style="color:var(--accent2)">GAME</div>
      <div class="overlay-title" style="color:var(--accent2);margin-top:-12px">OVER</div>
      <div class="final-score">${this.score.toLocaleString()}</div>
      <div class="final-label">FINAL SCORE · LEVEL ${this.level} · BEST COMBO x${this.maxCombo}</div>
      <button class="btn" onclick="game.restart()">Play Again</button>
      <button class="btn mute-btn" onclick="game.toggleMute(this)">${muteIcon} Sound</button>
    `;
    overlay.classList.remove('hidden');
  }

  /** Initialize a new level — fill grid, prepare shooter */
  _startLevel() {
    const rows   = Math.min(4 + this.level, 8);
    const colors = Math.min(3 + Math.floor(this.level / 2), COLORS.length);
    this.grid.init(rows, colors);
    this.shooter.currentBubble = this.shooter.getNewBubble(this.grid.pool, colors);
    this.shooter.nextBubble    = this.shooter.getNewBubble(this.grid.pool, colors);
    this.projectile.active = false;
    this.state = 'PLAYING';
    this._updateHUD();
  }

  /** Start a new game from the title screen */
  start() {
    this.sound.init(); // Must be called from user gesture (click/tap)
    document.getElementById('overlay').classList.add('hidden');
    this.score = 0; this.level = 1; this.shots = MAX_SHOTS;
    this.combo = 0; this.maxCombo = 0;
    this._startLevel();
    if (!this.raf) this._loop(0);
  }

  /** Restart after game over */
  restart() {
    document.getElementById('overlay').classList.add('hidden');
    this.score = 0; this.level = 1; this.shots = MAX_SHOTS;
    this.combo = 0; this.maxCombo = 0;
    this._startLevel();
  }

  /** Toggle sound mute and update the button label */
  toggleMute(btnEl) {
    const muted = this.sound.toggleMute();
    if (btnEl) btnEl.textContent = (muted ? '🔇' : '🔊') + ' Sound';
  }

  /** Push score/level/shots/combo values to the HTML HUD */
  _updateHUD() {
    document.getElementById('scoreDisplay').textContent = this.score.toLocaleString();
    document.getElementById('levelDisplay').textContent = this.level;
    document.getElementById('shotsDisplay').textContent = this.shots;
    document.getElementById('comboDisplay').textContent = this.combo;
  }

  // ===========================================================================
  // GAME LOOP — The Heartbeat
  // ===========================================================================

  /**
   * Main loop — called ~60 times per second by requestAnimationFrame.
   * Delta time (dt) ensures consistent speed regardless of frame rate.
   */
  _loop(timestamp) {
    const dt = Math.min((timestamp - this.lastTime) / 1000, 0.05); // Cap at 50ms to prevent spiral of death
    this.lastTime = timestamp;

    this._update(dt);
    this._draw();

    this.raf = requestAnimationFrame((t) => this._loop(t));
  }

  /** Update all game systems */
  _update(dt) {
    if (this.state !== 'PLAYING' && this.state !== 'ANIMATING') return;

    this.grid.update(dt);
    this.particles.update();

    // Update floating texts (reverse iteration for safe removal)
    for (let i = this.floatTexts.length - 1; i >= 0; i--) {
      this.floatTexts[i].update();
      if (this.floatTexts[i].life <= 0) this.floatTexts.splice(i, 1);
    }

    // Move projectile and check for collisions
    if (this.projectile.active) {
      this.projectile.update();
      this._checkCollision();
    }

    // Danger zone check — bubbles reached the bottom
    for (const row of this.grid.grid) {
      for (const b of (row || [])) {
        if (b?.alive && !b.popping && b.pos.y > CANVAS_H - 100) {
          this._gameOver();
          return;
        }
      }
    }
  }

  /** Render the entire frame */
  _draw() {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);

    // Background gradient
    const bg = ctx.createLinearGradient(0, 0, 0, CANVAS_H);
    bg.addColorStop(0, '#050518');
    bg.addColorStop(1, '#020208');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

    // Danger zone line (dashed red)
    ctx.save();
    ctx.strokeStyle = 'rgba(255,51,100,0.2)';
    ctx.lineWidth   = 1;
    ctx.setLineDash([4, 6]);
    ctx.beginPath();
    ctx.moveTo(0, CANVAS_H - 100);
    ctx.lineTo(CANVAS_W, CANVAS_H - 100);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();

    // Draw layers (back to front)
    this.grid.draw(ctx);
    this.particles.draw(ctx);
    this.projectile.draw(ctx);
    this.shooter.draw(ctx);
    for (const ft of this.floatTexts) ft.draw(ctx);

    // Level indicator
    if (this.state === 'PLAYING') {
      ctx.save();
      ctx.font      = '9px Space Mono';
      ctx.fillStyle = 'rgba(0,255,204,0.2)';
      ctx.textAlign = 'right';
      ctx.fillText(`LVL ${this.level} · ${this.grid.countAlive()} bubbles`, CANVAS_W - 10, CANVAS_H - 8);
      ctx.restore();
    }

    // Level clear overlay animation
    if (this.state === 'LEVEL_CLEAR') {
      ctx.save();
      ctx.globalAlpha = 0.5;
      ctx.fillStyle   = '#050510';
      ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
      ctx.globalAlpha = 1;
      ctx.font        = 'bold 32px Orbitron, monospace';
      ctx.fillStyle   = '#00ffcc';
      ctx.shadowBlur  = 30;
      ctx.shadowColor = '#00ffcc';
      ctx.textAlign   = 'center';
      ctx.fillText('CLEARED!', CANVAS_W / 2, CANVAS_H / 2);
      ctx.restore();
    }
  }
}
