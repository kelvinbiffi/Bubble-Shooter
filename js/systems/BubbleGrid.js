/**
 * =============================================================================
 * BubbleGrid.js — Hexagonal Grid & Match Logic
 * =============================================================================
 *
 * PURPOSE:
 *   Manages the bubble grid — the core data structure of the game.
 *   Handles placement, neighbor-finding, cluster matching, and floating
 *   detection. This is where the "puzzle" part of "puzzle game" lives.
 *
 * HEXAGONAL GRID SYSTEM:
 *   Bubbles are arranged in a hex grid (like a honeycomb), not a square grid.
 *   This is standard for bubble shooters because:
 *   1. Circles pack tighter in hex — less wasted space
 *   2. Each bubble has 6 neighbors (not 4) — more matching possibilities
 *   3. Offset rows create natural "nesting" that looks organic
 *
 *   Layout:
 *     Row 0 (even): ○ ○ ○ ○ ○ ○ ○      (7 bubbles, aligned left)
 *     Row 1 (odd):   ○ ○ ○ ○ ○ ○        (6 bubbles, offset right by half a bubble)
 *     Row 2 (even): ○ ○ ○ ○ ○ ○ ○
 *     Row 3 (odd):   ○ ○ ○ ○ ○ ○
 *
 *   Storage: 2D array this.grid[row][col]
 *     - Even rows have COLS (7) bubbles
 *     - Odd rows have COLS-1 (6) bubbles
 *
 * NEIGHBOR DIRECTIONS (hex grid):
 *   Even rows: [NW, NE, W, E, SW, SE] = [(-1,-1),(-1,0),(0,-1),(0,1),(1,-1),(1,0)]
 *   Odd rows:  [NW, NE, W, E, SW, SE] = [(-1,0),(-1,1),(0,-1),(0,1),(1,0),(1,1)]
 *
 *   The difference between even/odd is because of the half-bubble offset.
 *   Getting this wrong is one of the most common bugs in hex-grid games.
 *
 * KEY ALGORITHMS:
 *
 *   1. findCluster(row, col) — BFS Flood Fill
 *      Starting from a placed bubble, finds all connected same-color bubbles.
 *      Uses Breadth-First Search (BFS) with a visited set to avoid cycles.
 *      If cluster.length >= 3, those bubbles get popped.
 *
 *   2. findFloating() — Connectivity Check
 *      After popping a cluster, some bubbles may no longer be connected
 *      to the top row (they're "floating"). BFS from the top row marks
 *      all reachable bubbles. Any alive bubble NOT reached is floating
 *      and should fall (bonus points!).
 *
 *      This is essentially finding connected components in a graph —
 *      the same algorithm used in social network analysis, image
 *      segmentation, and maze solving.
 *
 * COORDINATE SYSTEMS:
 *   - Grid space: (row, col) integers — used for game logic
 *   - World space: (x, y) pixels — used for rendering and collision
 *   - gridToWorld(): converts grid → pixel position
 *   - worldToGrid(): converts pixel position → nearest grid cell
 *
 * IN A REAL PixiJS PROJECT:
 *   This would be a Scene Manager or Container that holds PIXI.Sprite children.
 *   The grid logic would be identical — only the rendering changes.
 * =============================================================================
 */

import { Vec2 } from '../core/Vec2.js';
import { ObjectPool } from '../core/ObjectPool.js';
import { Bubble } from '../entities/Bubble.js';
import { COLS, BUBBLE_R, COLORS } from '../constants.js';
import { drawBubble } from '../rendering/BubbleRenderer.js';

export class BubbleGrid {
  constructor() {
    this.grid = []; // 2D array: this.grid[row][col] = Bubble | null
    this.pool = new ObjectPool(
      () => new Bubble(),
      (b) => b.reset(),
    );
  }

  /**
   * Fill the grid with random bubbles for a new level.
   * @param {number} rows   - How many rows to fill
   * @param {number} colors - How many colors to use (increases with level)
   */
  init(rows, colors) {
    this.grid = [];
    for (let r = 0; r < rows; r++) {
      this.grid[r] = [];
      const cols = r % 2 === 0 ? COLS : COLS - 1; // Hex offset
      for (let c = 0; c < cols; c++) {
        const b    = this.pool.get();
        b.colorIdx = Math.floor(Math.random() * colors);
        b.color    = COLORS[b.colorIdx];
        b.pos      = this.gridToWorld(r, c);
        b.alive    = true;
        this.grid[r][c] = b;
      }
    }
  }

  /**
   * Convert grid coordinates to pixel (world) position.
   * Odd rows are offset by one bubble radius to create hex pattern.
   */
  gridToWorld(row, col) {
    const offsetX = row % 2 === 0 ? BUBBLE_R : BUBBLE_R * 2;
    const x = offsetX + col * BUBBLE_R * 2;
    const y = 40 + row * (BUBBLE_R * 1.72); // 1.72 ≈ sqrt(3) for hex vertical spacing
    return new Vec2(x, y);
  }

  /**
   * Convert pixel position to the nearest grid cell.
   * Used when a projectile lands to determine where to snap it.
   */
  worldToGrid(x, y) {
    const row = Math.round((y - 40) / (BUBBLE_R * 1.72));
    const col = row % 2 === 0
      ? Math.round((x - BUBBLE_R) / (BUBBLE_R * 2))
      : Math.round((x - BUBBLE_R * 2) / (BUBBLE_R * 2));
    return { row, col };
  }

  /**
   * Get all living neighbors of a cell in the hex grid.
   * The direction offsets differ between even and odd rows
   * because of the half-bubble offset in hex layout.
   */
  getNeighbors(row, col) {
    const neighbors = [];
    const even = row % 2 === 0;

    // Six directions: NW, NE, W, E, SW, SE
    // Even/odd rows have different column offsets due to hex staggering
    const dirs = even
      ? [[-1, -1], [-1, 0], [0, -1], [0, 1], [1, -1], [1, 0]]
      : [[-1, 0], [-1, 1], [0, -1], [0, 1], [1, 0], [1, 1]];

    for (const [dr, dc] of dirs) {
      const nr = row + dr;
      const nc = col + dc;
      if (nr >= 0 && nr < this.grid.length && nc >= 0) {
        const rowArr = this.grid[nr];
        if (rowArr && rowArr[nc] && rowArr[nc].alive) {
          neighbors.push({ row: nr, col: nc, bubble: rowArr[nc] });
        }
      }
    }
    return neighbors;
  }

  /**
   * BFS Flood Fill — find all connected same-color bubbles.
   *
   * Algorithm:
   *   1. Start at the placed bubble
   *   2. Add it to a queue and mark as visited
   *   3. For each queued cell, check all 6 hex neighbors
   *   4. If a neighbor is alive and same color, add to queue
   *   5. Repeat until queue is empty
   *   6. Return the cluster (all connected same-color cells)
   *
   * Time complexity: O(n) where n = grid cells (each visited at most once)
   * Space complexity: O(n) for the visited set
   */
  findCluster(row, col) {
    const target = this.grid[row]?.[col];
    if (!target || !target.alive) return [];

    const visited = new Set();
    const queue   = [{ row, col }];
    const cluster = [];

    while (queue.length) {
      const curr = queue.shift(); // Dequeue (FIFO = BFS)
      const key  = `${curr.row},${curr.col}`;
      if (visited.has(key)) continue;
      visited.add(key);
      cluster.push(curr);

      for (const n of this.getNeighbors(curr.row, curr.col)) {
        if (!visited.has(`${n.row},${n.col}`) && n.bubble.colorIdx === target.colorIdx) {
          queue.push({ row: n.row, col: n.col });
        }
      }
    }
    return cluster;
  }

  /**
   * Find all "floating" bubbles — bubbles not connected to the top row.
   *
   * Algorithm:
   *   1. Seed a BFS from every alive bubble in row 0 (top)
   *   2. Traverse all reachable (connected) bubbles
   *   3. Any alive bubble NOT in the connected set is floating
   *
   * This is a graph connectivity problem. In graph theory terms:
   * "Find all nodes not in the connected component containing the top row."
   *
   * Game Design Significance:
   *   Floating bubbles drop for bonus points, creating chain reactions.
   *   This mechanic rewards strategic shooting — pop a "bridge" cluster
   *   to drop a large section below it. It's one of the most satisfying
   *   moments in bubble shooter gameplay.
   */
  findFloating() {
    const connected = new Set();
    const queue     = [];

    // Seed BFS from the top row
    const topRow = this.grid[0] || [];
    for (let c = 0; c < topRow.length; c++) {
      if (topRow[c]?.alive) {
        queue.push({ row: 0, col: c });
        connected.add(`0,${c}`);
      }
    }

    // BFS traversal — mark all reachable bubbles
    while (queue.length) {
      const { row, col } = queue.shift();
      for (const n of this.getNeighbors(row, col)) {
        const key = `${n.row},${n.col}`;
        if (!connected.has(key)) {
          connected.add(key);
          queue.push({ row: n.row, col: n.col });
        }
      }
    }

    // Any alive bubble NOT in the connected set is floating
    const floating = [];
    for (let r = 0; r < this.grid.length; r++) {
      for (let c = 0; c < (this.grid[r] || []).length; c++) {
        if (this.grid[r][c]?.alive && !connected.has(`${r},${c}`)) {
          floating.push({ row: r, col: c, bubble: this.grid[r][c] });
        }
      }
    }
    return floating;
  }

  /**
   * Find the nearest FREE cell to (row, col), measured from the impact point.
   * Never overwrites an occupied cell (QA-01-03): BFS outward through
   * occupied neighbors until a free cell appears, pick the closest to `pos`.
   */
  _nearestFreeCell(row, col, pos) {
    const maxC = (r) => (r % 2 === 0 ? COLS : COLS - 1);
    if (row < 0) row = 0;
    col = Math.max(0, Math.min(col, maxC(row) - 1));
    const isOccupied = (r, c) => !!this.grid[r]?.[c]?.alive;
    if (!isOccupied(row, col)) return { row, col };

    const visited = new Set([`${row},${col}`]);
    let frontier = [{ row, col }];
    while (frontier.length) {
      const next = [];
      const free = [];
      for (const cell of frontier) {
        const dirs = cell.row % 2 === 0
          ? [[-1, -1], [-1, 0], [0, -1], [0, 1], [1, -1], [1, 0]]
          : [[-1, 0], [-1, 1], [0, -1], [0, 1], [1, 0], [1, 1]];
        for (const [dr, dc] of dirs) {
          const r = cell.row + dr;
          const c = cell.col + dc;
          if (r < 0 || r > this.grid.length || c < 0 || c >= maxC(r)) continue;
          const key = `${r},${c}`;
          if (visited.has(key)) continue;
          visited.add(key);
          if (isOccupied(r, c)) next.push({ row: r, col: c });
          else free.push({ row: r, col: c });
        }
      }
      if (free.length) {
        free.sort((a, b) =>
          this.gridToWorld(a.row, a.col).distanceTo(pos) -
          this.gridToWorld(b.row, b.col).distanceTo(pos));
        return free[0];
      }
      frontier = next;
    }
    return { row: this.grid.length, col: 0 };
  }

  /**
   * Place a bubble into the grid at the nearest free cell.
   * Clamps to valid grid bounds.
   */
  placeBubble(bubble, row, col) {
    ({ row, col } = this._nearestFreeCell(row, col, bubble.pos));
    if (!this.grid[row]) this.grid[row] = [];

    const b    = this.pool.get();
    b.colorIdx = bubble.colorIdx;
    b.color    = bubble.color;
    b.pos      = this.gridToWorld(row, col);
    b.alive    = true;
    b.scale    = 1.28; // squash de encaixe, volta pra 1 no update
    this.grid[row][col] = b;

    return { row, col };
  }

  /** Count all alive (non-popping, non-dead) bubbles */
  countAlive() {
    let n = 0;
    for (const row of this.grid) {
      for (const b of (row || [])) {
        if (b?.alive) n++;
      }
    }
    return n;
  }

  /**
   * Update all bubble animations (glow pulse, pop animation).
   * @param {number} dt - Delta time in seconds
   */
  update(dt) {
    for (const row of this.grid) {
      for (const b of (row || [])) {
        if (!b?.alive) continue;
        b.glowPulse += dt * 2; // Advance glow sine wave

        // Squash de encaixe: escala volta suave pra 1
        if (!b.popping && b.scale !== 1) {
          b.scale += (1 - b.scale) * Math.min(1, dt * 12);
          if (Math.abs(b.scale - 1) < 0.01) b.scale = 1;
        }

        // Pop animation: scale up + fade out
        if (b.popping) {
          b.popProgress += dt * 4;
          b.scale = 1 + b.popProgress * 0.5;  // Grow 50% during pop
          b.alpha = 1 - b.popProgress;          // Fade to transparent
          if (b.popProgress >= 1) {
            b.alive   = false;
            b.popping = false;
          }
        }
      }
    }
  }

  /** Draw all bubbles in the grid */
  draw(ctx) {
    for (const row of this.grid) {
      for (const b of (row || [])) {
        if (!b) continue;
        drawBubble(ctx, b);
      }
    }
  }
}
