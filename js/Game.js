/**
 * =============================================================================
 * Game.js — Main Game State Machine & Loop
 * =============================================================================
 *
 * States: MAP → PLAYING → LEVEL_CLEAR / GAME_OVER → MAP
 *
 * The MAP state shows a Candy-Crush-style world trail where the player
 * selects a level. Completing levels earns stars and unlocks the next.
 * Three themed worlds: Dinosaurs, Kaijus, Deep Ocean.
 * =============================================================================
 */

import { Vec2 } from './core/Vec2.js';
import { CANVAS_W, CANVAS_H, BUBBLE_R, COLORS } from './constants.js';
import { WORLDS } from './themes.js';
import { BubbleGrid } from './systems/BubbleGrid.js';
import { ParticleSystem } from './systems/ParticleSystem.js';
import { SoundSystem } from './systems/SoundSystem.js';
import { ProgressManager } from './systems/ProgressManager.js';
import { FloatText } from './systems/FloatText.js';
import { Shooter } from './entities/Shooter.js';
import { Projectile } from './entities/Projectile.js';
import { setThemeEmojis, setHintColorIdx, updateHintTime } from './rendering/BubbleRenderer.js';
import { setStarFieldTheme } from './rendering/StarField.js';

export class Game {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx    = canvas.getContext('2d');

    // ---- State Machine ----
    this.state = 'MAP'; // MAP | PLAYING | ANIMATING | LEVEL_CLEAR | GAME_OVER

    // ---- Progress ----
    this.progress    = new ProgressManager();
    this.currentWorld = 0;
    this.currentLevel = 0;

    // ---- Level State ----
    this.score    = 0;
    this.shots    = 0;
    this.maxShots = 0;
    this.combo    = 0;
    this.maxCombo = 0;

    // ---- Game Systems ----
    this.grid       = new BubbleGrid();
    this.shooter    = new Shooter();
    this.projectile = new Projectile();
    this.particles  = new ParticleSystem();
    this.sound      = new SoundSystem();
    this.floatTexts = [];
    this.bgEmojis   = []; // Floating themed emojis on game canvas

    // ---- Loop Timing ----
    this.lastTime  = 0;
    this.gameTime  = 0;
    this.raf       = null;

    this._bindEvents();
  }

  // ===========================================================================
  // INPUT — Mouse + Touch
  // ===========================================================================

  _bindEvents() {
    this.canvas.addEventListener('mousemove', (e) => this._onPointerMove(e));
    this.canvas.addEventListener('click', (e) => this._onPointerTap(e));
    this.canvas.addEventListener('touchmove', (e) => {
      e.preventDefault();
      this._onPointerMove(e.touches[0]);
    }, { passive: false });
    this.canvas.addEventListener('touchend', (e) => {
      e.preventDefault();
      this._onPointerTap(e.changedTouches[0]);
    }, { passive: false });
  }

  _getPointerPos(e) {
    const rect   = this.canvas.getBoundingClientRect();
    const scaleX = CANVAS_W / rect.width;
    const scaleY = CANVAS_H / rect.height;
    return new Vec2(
      (e.clientX - rect.left) * scaleX,
      (e.clientY - rect.top) * scaleY,
    );
  }

  _onPointerMove(e) {
    if (this.state !== 'PLAYING') return;
    const pos   = this._getPointerPos(e);
    const dx    = pos.x - this.shooter.pos.x;
    const dy    = pos.y - this.shooter.pos.y;
    let angle   = Math.atan2(dy, dx);
    angle = Math.max(-Math.PI + 0.2, Math.min(-0.2, angle));
    this.shooter.angle = angle;
  }

  _onPointerTap(e) {
    if (this.state !== 'PLAYING') return;
    if (this.projectile.active) return;
    this._onPointerMove(e);
    if (this.shots <= 0) { this._gameOver(); return; }
    this._shoot();
  }

  // ===========================================================================
  // MAP SCREEN — World Trail
  // ===========================================================================

  showMap() {
    this.state = 'MAP';
    const world = WORLDS[this.currentWorld];
    setStarFieldTheme(world);

    const overlay = document.getElementById('overlay');
    overlay.classList.remove('hidden');

    // Build map HTML
    let html = `<div class="map-screen">`;

    // World header with navigation
    html += `<div class="map-header">`;
    if (this.currentWorld > 0) {
      html += `<button type="button" class="map-nav" data-dir="-1">\u25C0</button>`;
    } else {
      html += `<div class="map-nav-spacer"></div>`;
    }
    html += `<div class="map-world-title">${world.icon} ${world.name}</div>`;
    if (this.currentWorld < WORLDS.length - 1 && this.progress.isWorldUnlocked(this.currentWorld + 1)) {
      html += `<button type="button" class="map-nav" data-dir="1">\u25B6</button>`;
    } else {
      html += `<div class="map-nav-spacer"></div>`;
    }
    html += `</div>`;

    // Level trail — zigzag: 4 per row
    html += `<div class="map-trail">`;
    const levels = world.levels;
    const perRow = 4;
    for (let i = 0; i < levels.length; i += perRow) {
      const rowLevels = [];
      for (let j = i; j < Math.min(i + perRow, levels.length); j++) {
        rowLevels.push(j);
      }
      const isReversed = Math.floor(i / perRow) % 2 === 1;
      if (isReversed) rowLevels.reverse();

      html += `<div class="map-row${isReversed ? ' reverse' : ''}">`;
      for (const lvlIdx of rowLevels) {
        const stars    = this.progress.getStars(this.currentWorld, lvlIdx);
        const unlocked = this.progress.isUnlocked(this.currentWorld, lvlIdx);
        const cls      = stars > 0 ? 'completed' : unlocked ? 'unlocked' : 'locked';
        const starStr  = stars > 0 ? '\u2B50'.repeat(stars) : '';

        html += `<div class="map-node-wrapper">`;
        if (unlocked) {
          html += `<button type="button" class="map-node ${cls}" data-level="${lvlIdx}">`;
          html += `<span class="map-node-num">${lvlIdx + 1}</span>`;
          html += `</button>`;
        } else {
          html += `<div class="map-node ${cls}">`;
          html += `<span class="map-node-num">\uD83D\uDD12</span>`;
          html += `</div>`;
        }
        if (starStr) html += `<div class="map-node-stars">${starStr}</div>`;
        html += `</div>`;

        // Connecting line between nodes
        const actualIdx = isReversed ? rowLevels[rowLevels.indexOf(lvlIdx)] : lvlIdx;
        if (rowLevels.indexOf(lvlIdx) < rowLevels.length - 1) {
          html += `<div class="map-line"></div>`;
        }
      }
      html += `</div>`;

      // Vertical connector between rows
      if (i + perRow < levels.length) {
        const align = isReversed ? 'left' : 'right';
        html += `<div class="map-vline ${align}"></div>`;
      }
    }
    html += `</div>`;

    // Score display
    html += `<div class="map-score">`;
    html += `\u2B50 ${this.progress.totalStars} Stars \u00B7 Score: ${this.progress.totalScore.toLocaleString()}`;
    html += `</div>`;

    html += `</div>`;
    overlay.innerHTML = html;

    // Wire up events
    overlay.querySelectorAll('.map-nav').forEach(btn => {
      btn.addEventListener('click', () => {
        const dir = parseInt(btn.dataset.dir);
        this.currentWorld += dir;
        this.showMap();
      });
    });

    overlay.querySelectorAll('.map-node.unlocked, .map-node.completed').forEach(btn => {
      btn.addEventListener('click', () => {
        this.currentLevel = parseInt(btn.dataset.level);
        this._startLevel();
      });
    });
  }

  // ===========================================================================
  // SHOOTING
  // ===========================================================================

  _shoot() {
    const b = this.shooter.currentBubble;
    if (!b) return;
    b.pos = this.shooter.pos.clone();
    this.projectile.launch(b, this.shooter.angle);
    this.shots--;
    this.sound.playShoot();

    this.shooter.currentBubble = this.shooter.nextBubble;
    const world = WORLDS[this.currentWorld];
    const lvl   = world.levels[this.currentLevel];
    this.shooter.nextBubble = this.shooter.getNewBubble(this.grid.pool, lvl.colors);
    this._updateHintColor();
    this._updateHUD();
  }

  /** Set the hint color to match the current shooter bubble */
  _updateHintColor() {
    if (this.shooter.currentBubble) {
      setHintColorIdx(this.shooter.currentBubble.colorIdx);
    } else {
      setHintColorIdx(-1);
    }
  }

  // ===========================================================================
  // COLLISION & MATCHING
  // ===========================================================================

  _checkCollision() {
    const b = this.projectile.bubble;
    if (!b) return false;

    if (b.pos.y - BUBBLE_R <= 40) return this._snapBubble(b);

    for (let r = 0; r < this.grid.grid.length; r++) {
      for (let c = 0; c < (this.grid.grid[r] || []).length; c++) {
        const gb = this.grid.grid[r]?.[c];
        if (!gb?.alive || gb.popping) continue;
        if (b.pos.distanceTo(gb.pos) < BUBBLE_R * 1.9) {
          return this._snapBubble(b, gb, r, c);
        }
      }
    }
    return false;
  }

  _snapBubble(b) {
    this.projectile.active = false;
    const { row, col } = this.grid.worldToGrid(b.pos.x, b.pos.y);
    const placed = this.grid.placeBubble(b, row, col);
    const cluster = this.grid.findCluster(placed.row, placed.col);

    if (cluster.length >= 3) {
      this.combo++;
      if (this.combo > this.maxCombo) this.maxCombo = this.combo;
      const points = cluster.length * 100 * this.combo;
      this.score += points;

      this.sound.playPop();
      if (this.combo > 1) this.sound.playCombo();

      for (const { row: r, col: c } of cluster) {
        const gb = this.grid.grid[r]?.[c];
        if (gb) {
          gb.popping = true; gb.popProgress = 0;
          this.particles.emit(gb.pos.x, gb.pos.y, gb.color, 14);
        }
      }

      const cx = cluster.reduce((s, n) => s + (this.grid.grid[n.row]?.[n.col]?.pos.x || 0), 0) / cluster.length;
      const cy = cluster.reduce((s, n) => s + (this.grid.grid[n.row]?.[n.col]?.pos.y || 0), 0) / cluster.length;
      this.floatTexts.push(new FloatText(cx, cy, `+${points}`, COLORS[b.colorIdx]));
      if (this.combo > 1) {
        this.floatTexts.push(new FloatText(cx, cy - 25, `x${this.combo} COMBO!`, '#ffcc00'));
      }

      setTimeout(() => {
        const floating = this.grid.findFloating();
        for (const { row: r, col: c } of floating) {
          const gb = this.grid.grid[r]?.[c];
          if (gb && !gb.popping) {
            this.score += 50;
            gb.popping = true; gb.popProgress = 0;
            this.particles.emit(gb.pos.x, gb.pos.y, gb.color, 8);
          }
        }
        if (floating.length > 0) {
          this.sound.playDrop();
          this.floatTexts.push(new FloatText(CANVAS_W / 2, CANVAS_H / 2, `DROP! +${floating.length * 50}`, '#ff6600'));
        }
        this._updateHUD();
        setTimeout(() => {
          if (this.grid.countAlive() === 0) this._levelClear();
          else if (this.shots <= 0) this._gameOver();
        }, 600);
      }, 300);
    } else {
      this.combo = 0;
      if (this.shots <= 0) setTimeout(() => this._gameOver(), 500);
    }

    this._updateHUD();
    return true;
  }

  // ===========================================================================
  // LEVEL & STATE TRANSITIONS
  // ===========================================================================

  _startLevel() {
    this.sound.init(); // Must be from user gesture

    const world = WORLDS[this.currentWorld];
    const lvl   = world.levels[this.currentLevel];

    // Apply theme
    setThemeEmojis(world.emojis);
    setStarFieldTheme(world);
    this._initBgEmojis(world);

    // Reset level state
    this.score    = 0;
    this.shots    = lvl.shots;
    this.maxShots = lvl.shots;
    this.combo    = 0;
    this.maxCombo = 0;

    // Init grid
    this.grid.init(lvl.rows, lvl.colors);
    this.shooter.currentBubble = this.shooter.getNewBubble(this.grid.pool, lvl.colors);
    this.shooter.nextBubble    = this.shooter.getNewBubble(this.grid.pool, lvl.colors);
    this.projectile.active     = false;
    this._updateHintColor();

    // Hide overlay, start playing
    document.getElementById('overlay').classList.add('hidden');
    this.state = 'PLAYING';
    this._updateHUD();
    if (!this.raf) this._loop(0);
  }

  _levelClear() {
    this.state = 'LEVEL_CLEAR';
    this.sound.playLevelClear();

    // Calculate stars
    let stars = 1; // 1 star for completing
    if (this.maxCombo >= 3) stars = 2;
    if (this.shots / this.maxShots >= 0.4) stars = 3;

    // Save progress
    this.progress.setStars(this.currentWorld, this.currentLevel, stars);
    this.progress.addScore(this.score);

    this.floatTexts.push(new FloatText(CANVAS_W / 2, CANVAS_H / 2 - 20, `CLEAR!`, '#00ffcc'));

    setTimeout(() => {
      this._showResults(stars, false);
    }, 1200);
  }

  _gameOver() {
    if (this.state === 'GAME_OVER') return; // Prevent double-fire
    this.state = 'GAME_OVER';
    this.sound.playGameOver();
    setTimeout(() => {
      this._showResults(0, true);
    }, 500);
  }

  _showResults(stars, isGameOver) {
    const overlay = document.getElementById('overlay');
    const world   = WORLDS[this.currentWorld];
    const starStr = stars > 0 ? '\u2B50'.repeat(stars) : '';
    const emptyStr = stars < 3 ? '\u2606'.repeat(3 - stars) : '';

    let html = `<div class="results-screen">`;
    if (isGameOver) {
      html += `<div class="overlay-title" style="color:var(--accent2)">GAME OVER</div>`;
    } else {
      html += `<div class="overlay-title">LEVEL ${this.currentLevel + 1} CLEAR!</div>`;
    }
    html += `<div class="results-world">${world.icon} ${world.name} · Level ${this.currentLevel + 1}</div>`;
    html += `<div class="final-score">${this.score.toLocaleString()}</div>`;
    html += `<div class="final-label">SCORE · COMBO x${this.maxCombo}</div>`;
    if (stars > 0) {
      html += `<div class="results-stars">${starStr}${emptyStr}</div>`;
    }
    html += `<button type="button" class="btn" id="btnMap">\u25C0 World Map</button>`;
    if (!isGameOver && this.currentLevel < world.levels.length - 1 && stars > 0) {
      html += `<button type="button" class="btn" id="btnNext">Next Level \u25B6</button>`;
    }
    if (isGameOver) {
      html += `<button type="button" class="btn" id="btnRetry">\u21BB Retry</button>`;
    }
    html += `<button type="button" class="btn mute-btn" id="btnMute">${this.sound.muted ? '\uD83D\uDD07' : '\uD83D\uDD0A'} Sound</button>`;
    html += `</div>`;

    overlay.innerHTML = html;
    overlay.classList.remove('hidden');

    // Wire events
    document.getElementById('btnMap')?.addEventListener('click', () => this.showMap());
    document.getElementById('btnNext')?.addEventListener('click', () => {
      this.currentLevel++;
      this._startLevel();
    });
    document.getElementById('btnRetry')?.addEventListener('click', () => {
      this._startLevel();
    });
    document.getElementById('btnMute')?.addEventListener('click', (e) => {
      const muted = this.sound.toggleMute();
      e.target.textContent = (muted ? '\uD83D\uDD07' : '\uD83D\uDD0A') + ' Sound';
    });
  }

  _updateHUD() {
    document.getElementById('scoreDisplay').textContent = this.score.toLocaleString();
    document.getElementById('levelDisplay').textContent = `${this.currentWorld + 1}-${this.currentLevel + 1}`;
    document.getElementById('shotsDisplay').textContent = this.shots;
    document.getElementById('comboDisplay').textContent = this.combo;
  }

  // ===========================================================================
  // FLOATING BACKGROUND EMOJIS (game canvas layer)
  // ===========================================================================

  _initBgEmojis(world) {
    this.bgEmojis = Array.from({ length: 6 }, () => ({
      emoji: world.emojis[Math.floor(Math.random() * world.emojis.length)],
      x: Math.random() * CANVAS_W,
      y: Math.random() * CANVAS_H,
      size: 25 + Math.random() * 25,
      speed: 0.15 + Math.random() * 0.25,
      wobblePhase: Math.random() * Math.PI * 2,
      alpha: 0.035 + Math.random() * 0.03,
    }));
  }

  _updateBgEmojis(dt) {
    for (const e of this.bgEmojis) {
      e.y -= e.speed;
      if (e.y < -40) {
        e.y = CANVAS_H + 40;
        e.x = Math.random() * CANVAS_W;
      }
    }
  }

  _drawBgEmojis(ctx) {
    const t = this.gameTime;
    for (const e of this.bgEmojis) {
      const wobble = Math.sin(t * 0.5 + e.wobblePhase) * 15;
      ctx.globalAlpha = e.alpha;
      ctx.font = `${e.size}px serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(e.emoji, e.x + wobble, e.y);
    }
    ctx.globalAlpha = 1;
  }

  // ===========================================================================
  // GAME LOOP
  // ===========================================================================

  _loop(timestamp) {
    const dt = Math.min((timestamp - this.lastTime) / 1000, 0.05);
    this.lastTime = timestamp;
    this.gameTime += dt;

    this._update(dt);
    this._draw();

    this.raf = requestAnimationFrame((t) => this._loop(t));
  }

  _update(dt) {
    // Update hint pulse time (always, for smooth animation)
    updateHintTime(this.gameTime);

    if (this.state !== 'PLAYING' && this.state !== 'ANIMATING') return;

    this.grid.update(dt);
    this.particles.update();
    this._updateBgEmojis(dt);

    for (let i = this.floatTexts.length - 1; i >= 0; i--) {
      this.floatTexts[i].update();
      if (this.floatTexts[i].life <= 0) this.floatTexts.splice(i, 1);
    }

    if (this.projectile.active) {
      this.projectile.update();
      this._checkCollision();
    }

    for (const row of this.grid.grid) {
      for (const b of (row || [])) {
        if (b?.alive && !b.popping && b.pos.y > CANVAS_H - 100) {
          this._gameOver(); return;
        }
      }
    }
  }

  _draw() {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);

    // Themed background gradient
    const world = WORLDS[this.currentWorld];
    const bg = ctx.createLinearGradient(0, 0, 0, CANVAS_H);
    bg.addColorStop(0, world?.bgGradient?.[0] || '#050518');
    bg.addColorStop(1, world?.bgGradient?.[1] || '#020208');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

    // Floating themed emojis (behind everything)
    this._drawBgEmojis(ctx);

    // Danger zone line
    ctx.save();
    ctx.strokeStyle = 'rgba(255,51,100,0.2)';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 6]);
    ctx.beginPath();
    ctx.moveTo(0, CANVAS_H - 100);
    ctx.lineTo(CANVAS_W, CANVAS_H - 100);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();

    // Game layers
    this.grid.draw(ctx);
    this.particles.draw(ctx);
    this.projectile.draw(ctx);
    this.shooter.draw(ctx);
    for (const ft of this.floatTexts) ft.draw(ctx);

    // Level indicator
    if (this.state === 'PLAYING') {
      ctx.save();
      ctx.font = '9px Space Mono';
      ctx.fillStyle = 'rgba(0,255,204,0.2)';
      ctx.textAlign = 'right';
      ctx.fillText(`W${this.currentWorld + 1} L${this.currentLevel + 1} · ${this.grid.countAlive()} left`, CANVAS_W - 10, CANVAS_H - 8);
      ctx.restore();
    }

    if (this.state === 'LEVEL_CLEAR') {
      ctx.save();
      ctx.globalAlpha = 0.5;
      ctx.fillStyle = '#050510';
      ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
      ctx.globalAlpha = 1;
      ctx.font = 'bold 28px Orbitron, monospace';
      ctx.fillStyle = '#00ffcc';
      ctx.shadowBlur = 30;
      ctx.shadowColor = '#00ffcc';
      ctx.textAlign = 'center';
      ctx.fillText('CLEARED!', CANVAS_W / 2, CANVAS_H / 2);
      ctx.restore();
    }
  }
}
