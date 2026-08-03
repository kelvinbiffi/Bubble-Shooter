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
import { CANVAS_W, CANVAS_H, BUBBLE_R, COLORS, SHOOT_SPEED, BOMB_RADIUS } from './constants.js';
import { WORLDS } from './themes.js';
import { BubbleGrid } from './systems/BubbleGrid.js';
import { ParticleSystem } from './systems/ParticleSystem.js';
import { SoundSystem } from './systems/SoundSystem.js';
import { ProgressManager } from './systems/ProgressManager.js';
import { FloatText } from './systems/FloatText.js';
import { Shooter } from './entities/Shooter.js';
import { Projectile } from './entities/Projectile.js';
import { setThemeEmojis, setThemeSprites, setHintColorIdx, updateHintTime } from './rendering/BubbleRenderer.js';
import { setStarFieldTheme } from './rendering/StarField.js';
import * as Leaderboard from './systems/Leaderboard.js';

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
    this.spriteCache = new Map(); // worldIdx -> HTMLImageElement[]

    // ---- Loop Timing ----
    this.lastTime  = 0;
    this.gameTime  = 0;
    this.raf       = null;

    // ---- Juice ----
    this.shake  = 0;   // intensidade do screenshake (px)
    this.slowmo = 0;   // segundos restantes de slow-mo

    // ---- Onboarding ----
    this.showHint = false; // instrução na primeira partida, some no primeiro tiro

    this._bindEvents();
    this._bindHudButtons();
  }

  _bindHudButtons() {
    const mute = document.getElementById('btnHudMute');
    const map  = document.getElementById('btnHudMap');
    if (mute) {
      mute.textContent = this.sound.muted ? '🔇' : '🔊';
      mute.addEventListener('click', () => {
        const m = this.sound.toggleMute();
        mute.textContent = m ? '🔇' : '🔊';
      });
    }
    map?.addEventListener('click', () => {
      if (this.state !== 'PLAYING') return;
      this.showMap();
    });
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
    document.getElementById('btnHudMap')?.classList.add('hidden');

    const LEVELS_PER_WORLD = 8;
    const TOTAL = WORLDS.length * LEVELS_PER_WORLD;

    // Fronteira: último nível destravado (onde o jogador está na jornada)
    let frontier = 0;
    for (let i = 0; i < TOTAL; i++) {
      if (this.progress.isUnlocked(Math.floor(i / LEVELS_PER_WORLD), i % LEVELS_PER_WORLD)) frontier = i;
    }
    setStarFieldTheme(WORLDS[Math.floor(frontier / LEVELS_PER_WORLD)]);

    const overlay = document.getElementById('overlay');
    overlay.classList.remove('hidden');
    overlay.classList.add('map-mode');

    // Geometria da jornada (trilha vertical serpenteando, nível 1 embaixo)
    const JW   = 340;
    const STEP = 92;
    const H    = TOTAL * STEP + 280;
    const nodeXY = (i) => ({
      x: JW / 2 + Math.sin(i * 1.05) * (JW / 2 - 60),
      y: H - 160 - i * STEP,
    });

    // Path serpenteando por todos os nós + rabo até o coming soon
    const pts = Array.from({ length: TOTAL }, (_, i) => nodeXY(i));
    const soon = { x: JW / 2, y: pts[TOTAL - 1].y - STEP };
    let d = `M ${pts[0].x.toFixed(1)} ${pts[0].y}`;
    for (let i = 1; i < TOTAL; i++) {
      const a = pts[i - 1], b = pts[i];
      const my = (a.y + b.y) / 2;
      d += ` C ${a.x.toFixed(1)} ${my}, ${b.x.toFixed(1)} ${my}, ${b.x.toFixed(1)} ${b.y}`;
    }
    const lm = (pts[TOTAL - 1].y + soon.y) / 2;
    d += ` C ${pts[TOTAL - 1].x.toFixed(1)} ${lm}, ${soon.x} ${lm}, ${soon.x} ${soon.y}`;

    let html = `<div class="map-screen v2"><div class="map-journey" style="width:${JW}px;height:${H}px">`;
    html += `<svg class="map-path" width="${JW}" height="${H}" viewBox="0 0 ${JW} ${H}">`;
    html += `<path d="${d}" fill="none" stroke="rgba(0,255,204,0.25)" stroke-width="3" stroke-dasharray="1 10" stroke-linecap="round"/>`;
    html += `</svg>`;

    // Decoração temática de cada região (emojis do mundo espalhados na seção)
    for (let w = 0; w < WORLDS.length; w++) {
      const world = WORLDS[w];
      for (let k = 0; k < 6; k++) {
        const i = w * LEVELS_PER_WORLD + (k * 1.33 + 0.4);
        const y = H - 160 - i * STEP;
        const x = JW / 2 - Math.sin(i * 1.05) * (JW / 2 - 45); // lado oposto ao nó
        const emoji = world.emojis[k % world.emojis.length];
        const size = 22 + ((k * 7) % 14);
        html += `<div class="map-deco" style="left:${x.toFixed(0)}px;top:${y.toFixed(0)}px;font-size:${size}px">${emoji}</div>`;
      }
    }

    // Banner de entrada de cada mundo (embaixo do primeiro nó da região)
    for (let w = 0; w < WORLDS.length; w++) {
      const p = nodeXY(w * LEVELS_PER_WORLD);
      const unlockedWorld = this.progress.isWorldUnlocked(w);
      html += `<div class="world-banner${unlockedWorld ? '' : ' locked'}" style="left:${JW / 2}px;top:${p.y + 52}px">`;
      html += `${WORLDS[w].icon} ${WORLDS[w].name}</div>`;
    }

    // Nós dos níveis
    for (let i = 0; i < TOTAL; i++) {
      const w = Math.floor(i / LEVELS_PER_WORLD);
      const l = i % LEVELS_PER_WORLD;
      const p = pts[i];
      const stars    = this.progress.getStars(w, l);
      const unlocked = this.progress.isUnlocked(w, l);
      const cls      = stars > 0 ? 'completed' : unlocked ? 'unlocked' : 'locked';
      const isFrontier = i === frontier && stars === 0;
      if (unlocked) {
        html += `<button type="button" class="map-node abs ${cls}${isFrontier ? ' frontier' : ''}" data-idx="${i}" style="left:${p.x.toFixed(0)}px;top:${p.y}px">`;
        html += `<span class="map-node-num">${l + 1}</span></button>`;
      } else {
        html += `<div class="map-node abs ${cls}" style="left:${p.x.toFixed(0)}px;top:${p.y}px">`;
        html += `<span class="map-node-num">🔒</span></div>`;
      }
      if (stars > 0) {
        html += `<div class="map-node-stars abs" style="left:${p.x.toFixed(0)}px;top:${p.y + 30}px">${'⭐'.repeat(stars)}</div>`;
      }
    }

    // A jornada continua: coming soon no topo
    html += `<div class="map-node abs soon" style="left:${soon.x}px;top:${soon.y}px">🚀</div>`;
    html += `<div class="world-banner locked" style="left:${JW / 2}px;top:${soon.y - 46}px">MORE WORLDS SOON</div>`;

    html += `</div>`; // .map-journey
    html += `<div class="map-scorebar">⭐ ${this.progress.totalStars} Stars · Score: ${this.progress.totalScore.toLocaleString()}` +
      ` <button type="button" class="hud-btn lb-btn" id="btnTop10" title="Top 10">🏆</button></div>`;
    html += `</div>`;
    overlay.innerHTML = html;

    document.getElementById('btnTop10')?.addEventListener('click', () => this._showLeaderboard());

    // Clique no nível: converte índice global em mundo+nível
    overlay.querySelectorAll('.map-node.unlocked, .map-node.completed').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = parseInt(btn.dataset.idx);
        this.currentWorld = Math.floor(idx / LEVELS_PER_WORLD);
        this.currentLevel = idx % LEVELS_PER_WORLD;
        this._startLevel();
      });
    });

    // Auto-scroll até a fronteira do jogador (centralizada)
    const fNode = overlay.querySelector('.map-node.frontier') ||
                  overlay.querySelectorAll('.map-node.unlocked, .map-node.completed')[0];
    if (fNode) {
      const y = parseInt(fNode.style.top) - overlay.clientHeight / 2;
      overlay.scrollTop = Math.max(0, Math.min(y, H - overlay.clientHeight));
    }
  }

  // ===========================================================================
  // SHOOTING
  // ===========================================================================

  _shoot() {
    const b = this.shooter.currentBubble;
    if (!b) return;
    this.showHint = false;
    b.pos = this.shooter.pos.clone();
    this.projectile.launch(b, this.shooter.angle);
    this.shots--;
    this.sound.playShoot();

    this.shooter.currentBubble = this.shooter.nextBubble;
    const world = WORLDS[this.currentWorld];
    const lvl   = world.levels[this.currentLevel];
    this.shooter.nextBubble = this.shooter.getNewBubble(this.grid, lvl.colors);
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

    // Contato com bolha existente tem PRIORIDADE sobre o teto (senão tiros
    // rasantes no topo viravam bolha fantasma desconectada na fileira 1)
    for (let r = 0; r < this.grid.grid.length; r++) {
      for (let c = 0; c < (this.grid.grid[r] || []).length; c++) {
        const gb = this.grid.grid[r]?.[c];
        if (!gb?.alive || gb.popping) continue;
        if (b.pos.distanceTo(gb.pos) < BUBBLE_R * 1.9) {
          return this._snapBubble(b, gb, r, c);
        }
      }
    }

    // Teto: só quando o centro alcança a faixa da fileira 0
    if (b.pos.y <= 44) return this._snapBubble(b);
    return false;
  }

  _snapBubble(b, contactBubble, contactRow, contactCol) {
    this.projectile.active = false;
    let { row, col } = this.grid.worldToGrid(b.pos.x, b.pos.y);
    if (!contactBubble) row = 0; // snap de teto gruda SEMPRE na fileira 0
    const placed = this.grid.placeBubble(
      b, row, col,
      contactBubble ? { row: contactRow, col: contactCol } : null,
    );
    const pb = this.grid.grid[placed.row][placed.col];

    // RAINBOW: adota a cor do maior grupo vizinho antes de resolver o match
    if (b.power === 'rainbow' && pb) {
      let best = null;
      for (const n of this.grid.getNeighbors(placed.row, placed.col)) {
        if (n.bubble.popping || n.bubble === pb) continue;
        const cl = this.grid.findCluster(n.row, n.col).length;
        if (!best || cl > best.len) best = { len: cl, colorIdx: n.bubble.colorIdx, color: n.bubble.color };
      }
      if (best) {
        pb.colorIdx = best.colorIdx;
        pb.color = best.color;
        this.floatTexts.push(new FloatText(pb.pos.x, pb.pos.y - 22, 'RAINBOW!', '#ffffff'));
      }
    }

    // Quem estoura neste tiro: raio da bomba, ou cluster 3+ normal
    const isBomb = b.power === 'bomb';
    let popCells = [];
    if (isBomb) {
      const blast = BOMB_RADIUS * BUBBLE_R * 2;
      for (let r = 0; r < this.grid.grid.length; r++) {
        for (let c = 0; c < (this.grid.grid[r] || []).length; c++) {
          const gb = this.grid.grid[r]?.[c];
          if (!gb?.alive || gb.popping) continue;
          if (gb.pos.distanceTo(pb.pos) <= blast) popCells.push({ row: r, col: c });
        }
      }
    } else {
      const cluster = this.grid.findCluster(placed.row, placed.col);
      if (cluster.length >= 3) popCells = cluster;
    }

    if (popCells.length) {
      this.combo++;
      if (this.combo > this.maxCombo) this.maxCombo = this.combo;
      if (popCells.length >= 5 || this.combo >= 3 || isBomb) {
        this.shake = Math.min(isBomb ? 12 : 8, popCells.length + this.combo + (isBomb ? 4 : 0));
      }
      const points = popCells.length * 100 * this.combo;
      this.score += points;

      this.sound.playPop(popCells.length);
      if (isBomb) this.sound.playDrop();
      if (this.combo > 1) this.sound.playCombo();

      for (const { row: r, col: c } of popCells) {
        const gb = this.grid.grid[r]?.[c];
        if (gb) {
          gb.popping = true; gb.popProgress = 0;
          this.particles.emit(gb.pos.x, gb.pos.y, isBomb ? '#ff6600' : gb.color, isBomb ? 18 : 14);
        }
      }

      const cx = popCells.reduce((s, n) => s + (this.grid.grid[n.row]?.[n.col]?.pos.x || 0), 0) / popCells.length;
      const cy = popCells.reduce((s, n) => s + (this.grid.grid[n.row]?.[n.col]?.pos.y || 0), 0) / popCells.length;
      this.floatTexts.push(new FloatText(cx, cy, `+${points}`, isBomb ? '#ff6600' : COLORS[pb?.colorIdx] || '#ffffff'));
      if (isBomb) this.floatTexts.push(new FloatText(cx, cy - 25, 'BOOM!', '#ff6600'));
      if (this.combo > 1) {
        this.floatTexts.push(new FloatText(cx, cy - (isBomb ? 45 : 25), `x${this.combo} COMBO!`, '#ffcc00'));
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
          if (floating.length >= 4) {
            this.slowmo = 0.5;                       // momento clipável: chuva de bolhas em câmera lenta
            this.shake = Math.min(10, this.shake + floating.length);
          }
        }
        this._updateHUD();
        setTimeout(() => {
          // Vassoura anti-fantasma: qualquer bolha que sobrou desconectada cai
          const strays = this.grid.findFloating();
          if (strays.length) {
            for (const { row: sr, col: sc } of strays) {
              const sb = this.grid.grid[sr]?.[sc];
              if (sb && !sb.popping) {
                this.score += 50;
                sb.popping = true; sb.popProgress = 0;
                this.particles.emit(sb.pos.x, sb.pos.y, sb.color, 8);
              }
            }
            this.sound.playDrop();
            this._updateHUD();
            setTimeout(() => {
              if (this.grid.countAlive() === 0) this._levelClear();
              else if (this.shots <= 0) this._gameOver();
            }, 400);
            return;
          }
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
    setThemeSprites(this._getWorldSprites(this.currentWorld));
    setStarFieldTheme(world);
    this._initBgEmojis(world);
    this.sound.playMusic(this.currentWorld);

    // Reset level state
    this.score    = 0;
    this.shots    = lvl.shots;
    this.maxShots = lvl.shots;
    this.combo    = 0;
    this.maxCombo = 0;

    // Init grid
    this.grid.init(lvl.rows, lvl.colors);
    this.shooter.currentBubble = this.shooter.getNewBubble(this.grid, lvl.colors);
    this.shooter.nextBubble    = this.shooter.getNewBubble(this.grid, lvl.colors);
    this.projectile.active     = false;
    this._updateHintColor();

    // Onboarding: instrução só na primeiríssima partida do jogador
    this.showHint = this.currentWorld === 0 && this.currentLevel === 0 && this.progress.totalStars === 0;

    // Botão de mapa visível durante a partida
    document.getElementById('btnHudMap')?.classList.remove('hidden');

    // Hide overlay, start playing
    const overlayEl = document.getElementById('overlay');
    overlayEl.classList.add('hidden');
    overlayEl.classList.remove('map-mode');
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

    // Level clear bonus (GDD §3.3): remaining shots x 200 + level x 500
    const bonus = this.shots * 200 + (this.currentLevel + 1) * 500;
    this.score += bonus;
    this._updateHUD();

    // Save progress
    this.progress.setStars(this.currentWorld, this.currentLevel, stars);
    this.progress.addScore(this.score);

    this.floatTexts.push(new FloatText(CANVAS_W / 2, CANVAS_H / 2 - 20, `CLEAR!`, '#00ffcc'));
    this.floatTexts.push(new FloatText(CANVAS_W / 2, CANVAS_H / 2 + 15, `BONUS +${bonus}`, '#ffcc00'));

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
    html += `<div class="rank-box" id="rankBox"></div>`;
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

    this._initRankBox();
  }

  /** Caixa de ranking nas telas de resultado: pede nick 1x, depois auto-envia. */
  _initRankBox() {
    const box = document.getElementById('rankBox');
    if (!box) return;
    const total = this.progress.totalScore;
    if (!total) { box.remove(); return; }
    const nick = Leaderboard.getNick();
    if (nick) {
      box.innerHTML = `<span class="rank-status dim">enviando score...</span>`;
      Leaderboard.submitScore(total, this.progress.totalStars).then((r) => {
        const el = document.getElementById('rankBox');
        if (!el) return;
        el.innerHTML = r?.ok
          ? `<span class="rank-status">\uD83C\uDFC6 ${nick} \u00B7 GLOBAL RANK #${r.rank}</span>`
          : `<span class="rank-status dim">ranking offline</span>`;
      });
    } else {
      box.innerHTML = `<input id="nickInput" maxlength="14" placeholder="NICK (3-14)" autocomplete="off">` +
        `<button type="button" class="btn rank-btn" id="btnNick">RANK ME</button>`;
      document.getElementById('btnNick').addEventListener('click', () => {
        const v = document.getElementById('nickInput').value.trim();
        if (!Leaderboard.setNick(v)) {
          document.getElementById('nickInput').classList.add('bad');
          return;
        }
        this._initRankBox();
      });
    }
  }

  /** Painel TOP 10 global (aberto pelo trof\u00E9u do mapa). */
  _showLeaderboard() {
    const overlay = document.getElementById('overlay');
    overlay.classList.remove('map-mode');
    overlay.innerHTML = `<div class="results-screen">` +
      `<div class="overlay-title" style="font-size:26px">\uD83C\uDFC6 TOP 10</div>` +
      `<div class="lb-list" id="lbList">carregando...</div>` +
      `<button type="button" class="btn" id="btnLbBack">\u25C0 Back</button></div>`;
    document.getElementById('btnLbBack').addEventListener('click', () => this.showMap());
    Leaderboard.fetchTop(10).then((top) => {
      const el = document.getElementById('lbList');
      if (!el) return;
      if (!top || !top.length) { el.textContent = 'sem scores ainda'; return; }
      el.innerHTML = top.map((r, i) =>
        `<div class="lb-row"><span class="lb-pos">#${i + 1}</span><span class="lb-nick">${r.nick}</span>` +
        `<span class="lb-score">${(r.score || 0).toLocaleString()}</span><span class="lb-stars">\u2B50${r.wave || 0}</span></div>`,
      ).join('');
    });
  }

  _updateHUD() {
    document.getElementById('scoreDisplay').textContent = this.score.toLocaleString();
    document.getElementById('levelDisplay').textContent = `${this.currentWorld + 1}-${this.currentLevel + 1}`;
    document.getElementById('shotsDisplay').textContent = this.shots;
    document.getElementById('comboDisplay').textContent = this.combo;
  }

  /**
   * Simula a trajetória do tiro atual (com ricochetes) e devolve o centro
   * da célula onde ele vai assentar. Mesma física do _checkCollision.
   */
  _previewLanding() {
    if (!this.shooter.currentBubble) return null;
    let x = this.shooter.pos.x, y = this.shooter.pos.y;
    let dx = Math.cos(this.shooter.angle), dy = Math.sin(this.shooter.angle);
    for (let i = 0; i < 400; i++) {
      x += dx * 6; y += dy * 6;
      if (x - BUBBLE_R < 0) { x = BUBBLE_R; dx = Math.abs(dx); }
      if (x + BUBBLE_R > CANVAS_W) { x = CANVAS_W - BUBBLE_R; dx = -Math.abs(dx); }
      for (let r = 0; r < this.grid.grid.length; r++) {
        for (let c = 0; c < (this.grid.grid[r] || []).length; c++) {
          const gb = this.grid.grid[r]?.[c];
          if (!gb?.alive || gb.popping) continue;
          if (Math.abs(gb.pos.y - y) > BUBBLE_R * 2.2) continue;
          const ddx = gb.pos.x - x, ddy = gb.pos.y - y;
          if (ddx * ddx + ddy * ddy < (BUBBLE_R * 1.9) ** 2) {
            const spot = this.grid._freeCellAdjacentTo(r, c, { x, y }) ||
                         this.grid._nearestFreeCell(this.grid.worldToGrid(x, y).row, this.grid.worldToGrid(x, y).col, { x, y });
            return this.grid.gridToWorld(spot.row, spot.col);
          }
        }
      }
      if (y <= 44) {
        const wg = this.grid.worldToGrid(x, 40);
        const spot = this.grid._nearestFreeCell(0, wg.col, { x, y: 40 });
        return this.grid.gridToWorld(spot.row, spot.col);
      }
    }
    return null;
  }

  /** Pixel art icons do mundo (lazy, cacheado). */
  _getWorldSprites(worldIdx) {
    if (!this.spriteCache.has(worldIdx)) {
      const imgs = Array.from({ length: 6 }, (_, i) => {
        const img = new Image();
        img.src = `assets/sprites/world${worldIdx}-slot${i}.png`;
        return img;
      });
      this.spriteCache.set(worldIdx, imgs);
    }
    return this.spriteCache.get(worldIdx);
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

    // Juice: decaimento do shake e do slow-mo em tempo real
    if (this.shake > 0.1) this.shake *= Math.pow(0.0001, dt); else this.shake = 0;
    if (this.slowmo > 0) this.slowmo -= dt;
    if (this.slowmo > 0) dt *= 0.35; // câmera lenta na chuva de bolhas

    this.grid.update(dt);
    this.particles.update();
    this._updateBgEmojis(dt);

    for (let i = this.floatTexts.length - 1; i >= 0; i--) {
      this.floatTexts[i].update();
      if (this.floatTexts[i].life <= 0) this.floatTexts.splice(i, 1);
    }

    if (this.projectile.active) {
      // Substeps: nunca mover mais que ~meio raio por checagem (evita tunneling)
      const steps = Math.max(1, Math.ceil((SHOOT_SPEED * dt) / (BUBBLE_R * 0.75)));
      for (let i = 0; i < steps && this.projectile.active; i++) {
        this.projectile.update(dt / steps);
        this._checkCollision();
      }
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

    // Screenshake: desloca o mundo inteiro por alguns frames
    const shaking = this.shake > 0;
    if (shaking) {
      ctx.save();
      ctx.translate(
        (Math.random() - 0.5) * this.shake,
        (Math.random() - 0.5) * this.shake,
      );
    }

    // Themed background gradient
    const world = WORLDS[this.currentWorld];
    const bg = ctx.createLinearGradient(0, 0, 0, CANVAS_H);
    bg.addColorStop(0, world?.bgGradient?.[0] || '#050518');
    bg.addColorStop(1, world?.bgGradient?.[1] || '#020208');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

    // Floating themed emojis (behind everything)
    this._drawBgEmojis(ctx);

    // Danger zone line (pulsa vermelho quando a pilha chega perto)
    let dangerNear = false;
    for (const row of this.grid.grid) {
      for (const b of (row || [])) {
        if (b?.alive && !b.popping && b.pos.y > CANVAS_H - 100 - 65) { dangerNear = true; break; }
      }
      if (dangerNear) break;
    }
    ctx.save();
    if (dangerNear) {
      const pulse = 0.35 + Math.abs(Math.sin(this.gameTime * 5)) * 0.45;
      ctx.strokeStyle = `rgba(255,51,100,${pulse})`;
      ctx.lineWidth = 2;
      ctx.shadowBlur = 8;
      ctx.shadowColor = '#ff3364';
    } else {
      ctx.strokeStyle = 'rgba(255,51,100,0.2)';
      ctx.lineWidth = 1;
    }
    ctx.setLineDash([4, 6]);
    ctx.beginPath();
    ctx.moveTo(0, CANVAS_H - 100);
    ctx.lineTo(CANVAS_W, CANVAS_H - 100);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();

    // Instrução da primeira partida (some no primeiro tiro)
    if (this.showHint && this.state === 'PLAYING') {
      ctx.save();
      const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
      ctx.font = 'bold 13px Orbitron, monospace';
      ctx.textAlign = 'center';
      ctx.fillStyle = `rgba(0,255,204,${0.55 + Math.sin(this.gameTime * 3) * 0.25})`;
      ctx.shadowBlur = 12;
      ctx.shadowColor = '#00ffcc';
      ctx.fillText(isTouch ? 'TAP TO SHOOT' : 'AIM WITH MOUSE · CLICK TO SHOOT', CANVAS_W / 2, CANVAS_H / 2 + 40);
      ctx.font = '10px "Space Mono", monospace';
      ctx.fillStyle = 'rgba(255,255,255,0.5)';
      ctx.shadowBlur = 0;
      ctx.fillText('MATCH 3 OR MORE OF THE SAME COLOR', CANVAS_W / 2, CANVAS_H / 2 + 62);
      ctx.restore();
    }

    // Game layers
    this.grid.draw(ctx);
    this.particles.draw(ctx);

    // Fantasminha de pouso: onde o tiro atual vai assentar
    if (this.state === 'PLAYING' && !this.projectile.active && this.shooter.currentBubble) {
      const lp = this._previewLanding();
      if (lp) {
        const cur = this.shooter.currentBubble;
        const previewColor = cur.power ? '#ffffff' : cur.color;
        ctx.save();
        ctx.globalAlpha = 0.4 + Math.sin(this.gameTime * 4) * 0.15;
        ctx.strokeStyle = previewColor;
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);
        ctx.beginPath();
        ctx.arc(lp.x, lp.y, BUBBLE_R - 2, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.globalAlpha = 0.12;
        ctx.fillStyle = previewColor;
        ctx.fill();
        ctx.restore();
      }
    }

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

    if (shaking) ctx.restore();
  }
}
