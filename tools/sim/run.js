// Simulador headless do Bubble Blaster
// Usa os MESMOS módulos do jogo (BubbleGrid, constants, themes).
// node tools/sim/run.js --runs 200 --seed-base 1000 [--table proposta.json]
import { BubbleGrid } from '../../js/systems/BubbleGrid.js';
import { WORLDS } from '../../js/themes.js';
import { COLS, BUBBLE_R, CANVAS_W, CANVAS_H, COLORS } from '../../js/constants.js';
import { readFileSync } from 'node:fs';

const args = process.argv.slice(2);
const opt = (name, def) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : def;
};
const RUNS = parseInt(opt('runs', '200'));
const SEED_BASE = parseInt(opt('seed-base', '1000'));
const TABLE_FILE = opt('table', null);
// --smart-colors: sorteia a cor do tiro só entre cores AINDA VIVAS no grid (mecânica proposta)
const SMART_COLORS = args.includes('--smart-colors');

// tabela alternativa (proposta) sem mexer no themes.js
const worlds = TABLE_FILE
  ? JSON.parse(readFileSync(TABLE_FILE, 'utf8'))
  : WORLDS.map(w => ({ name: w.name, levels: w.levels }));

// PRNG seedado (mulberry32), injetado no Math.random dos módulos do jogo
function mulberry32(a) {
  return function () {
    let t = (a += 0x6D2B79F5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const SHOOTER = { x: CANVAS_W / 2, y: CANVAS_H - 50 };
const DANGER_Y = CANVAS_H - 100;
const ANGLES = 51;

// marcha do projétil com bounce: retorna ponto de impacto
function march(grid, angle) {
  let x = SHOOTER.x, y = SHOOTER.y;
  let dx = Math.cos(angle), dy = Math.sin(angle);
  const step = 6;
  for (let i = 0; i < 400; i++) {
    x += dx * step; y += dy * step;
    if (x - BUBBLE_R < 0) { x = BUBBLE_R; dx = Math.abs(dx); }
    if (x + BUBBLE_R > CANVAS_W) { x = CANVAS_W - BUBBLE_R; dx = -Math.abs(dx); }
    if (y - BUBBLE_R <= 40) return { x, y };
    for (let r = 0; r < grid.grid.length; r++) {
      for (let c = 0; c < (grid.grid[r] || []).length; c++) {
        const b = grid.grid[r]?.[c];
        if (!b?.alive) continue;
        if (Math.abs(b.pos.y - y) > BUBBLE_R * 2.2) continue;
        const ddx = b.pos.x - x, ddy = b.pos.y - y;
        if (ddx * ddx + ddy * ddy < (BUBBLE_R * 1.9) ** 2) return { x, y };
      }
    }
  }
  return { x, y };
}

// avalia um pouso hipotético sem mutar o grid de verdade
function evaluate(grid, colorIdx, impact) {
  const { row, col } = grid.worldToGrid(impact.x, impact.y);
  const spot = grid._nearestFreeCell(row, col, { x: impact.x, y: impact.y, distanceTo(p) { return Math.hypot(this.x - p.x, this.y - p.y); } });
  // hack: Vec2-like pro sort interno
  const fake = { alive: true, colorIdx, pos: grid.gridToWorld(spot.row, spot.col), popping: false };
  if (!grid.grid[spot.row]) grid.grid[spot.row] = [];
  const prev = grid.grid[spot.row][spot.col];
  grid.grid[spot.row][spot.col] = fake;
  const cluster = grid.findCluster(spot.row, spot.col).length;
  // valor de preparação: vizinhos da mesma cor (montar par pro próximo tiro)
  const sameNeighbors = grid.getNeighbors(spot.row, spot.col)
    .filter(n => n.bubble !== fake && n.bubble.colorIdx === colorIdx).length;
  grid.grid[spot.row][spot.col] = prev === undefined ? undefined : prev;
  return { spot, cluster, sameNeighbors };
}

function popAt(grid, colorIdx, impact) {
  const { row, col } = grid.worldToGrid(impact.x, impact.y);
  const b = grid.pool.get();
  b.colorIdx = colorIdx; b.color = COLORS[colorIdx]; b.alive = true;
  b.pos.x = impact.x; b.pos.y = impact.y;
  const spot = grid.placeBubble(b, row, col);
  const cluster = grid.findCluster(spot.row, spot.col);
  let popped = 0, dropped = 0;
  if (cluster.length >= 3) {
    for (const { row: r, col: c } of cluster) {
      const gb = grid.grid[r]?.[c];
      if (gb) { gb.alive = false; popped++; }
    }
    const floating = grid.findFloating();
    for (const { row: r, col: c } of floating) {
      const gb = grid.grid[r]?.[c];
      if (gb) { gb.alive = false; dropped++; }
    }
  }
  return { popped, dropped };
}

function simulateLevel(lvl, seed) {
  const rand = mulberry32(seed);
  const origRandom = Math.random;
  Math.random = rand;
  const grid = new BubbleGrid();
  grid.init(lvl.rows, lvl.colors);
  let shots = lvl.shots;
  const drawColor = () => {
    if (!SMART_COLORS) return Math.floor(rand() * lvl.colors);
    const present = new Set();
    for (const row of grid.grid) for (const b of (row || [])) if (b?.alive) present.add(b.colorIdx);
    const pool = [...present];
    if (!pool.length) return Math.floor(rand() * lvl.colors);
    return pool[Math.floor(rand() * pool.length)];
  };
  let current = drawColor();
  let next = drawColor();
  let result = null;

  while (result === null) {
    if (grid.countAlive() === 0) { result = 'win'; break; }
    if (shots <= 0) { result = 'lose-shots'; break; }
    // escolhe o melhor ângulo pra cor atual (política caUtelosa-gulosa mista)
    let best = null;
    for (let a = 0; a < ANGLES; a++) {
      const angle = -Math.PI + 0.25 + (a / (ANGLES - 1)) * (Math.PI - 0.5);
      const impact = march(grid, angle);
      const ev = evaluate(grid, current, impact);
      const pops = ev.cluster >= 3 ? ev.cluster : 0;
      // pop imediato >> montar par >> attach alto
      const score = pops * 100 + (pops ? 0 : ev.sameNeighbors * 25) - ev.spot.row * 3;
      if (!best || score > best.score) best = { angle, score, pops };
    }
    // ruído humano de mira: ~1.5 graus
    const noisy = best.angle + (rand() + rand() + rand() - 1.5) * 0.035;
    const clamped = Math.max(-Math.PI + 0.2, Math.min(-0.2, noisy));
    const impact = march(grid, clamped);
    popAt(grid, current, impact);
    shots--;
    current = next;
    next = drawColor();
    // danger zone
    for (const row of grid.grid) {
      for (const b of (row || [])) {
        if (b?.alive && b.pos.y > DANGER_Y) { result = 'lose-danger'; break; }
      }
      if (result) break;
    }
    if (!result && grid.countAlive() === 0) result = 'win';
  }
  Math.random = origRandom;
  return { result, shotsLeft: shots, remaining: grid.countAlive() };
}

console.log(`# SIM bubble-blaster · ${RUNS} runs/nível · seed-base ${SEED_BASE}${TABLE_FILE ? ' · tabela ' + TABLE_FILE : ' · tabela ATUAL (themes.js)'}\n`);
console.log('| Nível | rows | cores | tiros | win% | perdeu tiros% | perdeu danger% | tiros sobrando (win) |');
console.log('|---|---|---|---|---|---|---|---|');
for (let w = 0; w < worlds.length; w++) {
  for (let l = 0; l < worlds[w].levels.length; l++) {
    const lvl = worlds[w].levels[l];
    let wins = 0, loseShots = 0, loseDanger = 0, shotsLeftSum = 0;
    for (let run = 0; run < RUNS; run++) {
      const r = simulateLevel(lvl, SEED_BASE + w * 100000 + l * 1000 + run);
      if (r.result === 'win') { wins++; shotsLeftSum += r.shotsLeft; }
      else if (r.result === 'lose-shots') loseShots++;
      else loseDanger++;
    }
    const pct = (n) => ((n / RUNS) * 100).toFixed(0) + '%';
    console.log(`| ${w + 1}-${l + 1} | ${lvl.rows} | ${lvl.colors} | ${lvl.shots} | ${pct(wins)} | ${pct(loseShots)} | ${pct(loseDanger)} | ${wins ? (shotsLeftSum / wins).toFixed(1) : '-'} |`);
  }
}
