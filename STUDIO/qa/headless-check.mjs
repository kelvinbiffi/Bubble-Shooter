// Validação headless das correções do QA-01 (roda com: node STUDIO/qa/headless-check.mjs)
import { BubbleGrid } from '../../js/systems/BubbleGrid.js';
import { Projectile } from '../../js/entities/Projectile.js';
import { Bubble } from '../../js/entities/Bubble.js';
import { SHOOT_SPEED, BUBBLE_R, CANVAS_W } from '../../js/constants.js';

let fail = 0;
const check = (name, cond, extra = '') => {
  console.log(`${cond ? 'PASS' : 'FAIL'} ${name}${extra ? ' ' + extra : ''}`);
  if (!cond) fail++;
};

// T-05: placeBubble nunca sobrescreve
const g = new BubbleGrid();
g.init(4, 3);
const before = g.countAlive();
const nb = g.pool.get();
nb.colorIdx = 0; nb.alive = true; nb.pos = g.gridToWorld(0, 0);
const spot = g.placeBubble(nb, 0, 0); // célula ocupada
check('T-05 célula ocupada vira vizinha livre', g.countAlive() === before + 1, `(${before}->${g.countAlive()}, spot ${spot.row},${spot.col})`);
check('T-05 spot não era a célula original', !(spot.row === 0 && spot.col === 0));
const occupiedStill = g.grid[0][0].alive;
check('T-05 bolha original intacta', occupiedStill);

// grid denso: acha célula mesmo cercado
const g2 = new BubbleGrid();
g2.init(10, 3);
const nb2 = g2.pool.get();
nb2.colorIdx = 1; nb2.alive = true; nb2.pos = g2.gridToWorld(5, 5);
const before2 = g2.countAlive();
const spot2 = g2.placeBubble(nb2, 5, 5);
check('T-05 grid denso acha célula livre (nova fileira)', g2.countAlive() === before2 + 1, `(spot ${spot2.row},${spot2.col})`);

// T-04: projétil frame-rate independente
const flight = (fps) => {
  const p = new Projectile();
  const b = new Bubble();
  b.alive = true; b.pos.x = CANVAS_W / 2; b.pos.y = 490;
  p.launch(b, -Math.PI / 2); // reto pra cima
  let t = 0;
  const dt = 1 / fps;
  while (b.pos.y > 40 && t < 10) { p.update(dt); t += dt; }
  return t;
};
const t60 = flight(60), t120 = flight(120);
check('T-04 tempo de voo 60fps ~= 120fps', Math.abs(t60 - t120) < 0.05, `(60fps: ${t60.toFixed(3)}s, 120fps: ${t120.toFixed(3)}s)`);
check('T-04 velocidade ~600px/s', Math.abs(t60 - (490 - 40) / SHOOT_SPEED) < 0.05, `(esperado ${(450 / SHOOT_SPEED).toFixed(3)}s)`);

// T-04: bounce na parede continua funcionando
const p3 = new Projectile();
const b3 = new Bubble();
b3.alive = true; b3.pos.x = CANVAS_W - BUBBLE_R - 2; b3.pos.y = 400;
p3.launch(b3, -Math.PI / 4); // 45 graus pra direita
for (let i = 0; i < 30; i++) p3.update(1 / 60);
check('T-04 bounce parede direita inverte X', p3.vel.x < 0, `(vel.x ${p3.vel.x.toFixed(1)})`);

process.exit(fail ? 1 : 0);
