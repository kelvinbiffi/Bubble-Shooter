# Bubble Blaster — Game Design Document (GDD)

**Version:** 1.0  
**Author:** Kelvin Biffi  
**Platform:** Web Browser (Desktop)  
**Engine:** Vanilla JavaScript + Canvas2D API + Vite  
**Genre:** Puzzle / Arcade  

---

## 1. Game Overview

### 1.1 Elevator Pitch
Bubble Blaster is a neon-themed bubble shooter where players aim and fire colored bubbles to match clusters of 3 or more, clearing the board through strategic shots and chain reactions.

### 1.2 Target Audience
- Casual puzzle game players
- Game development recruiters reviewing portfolio work
- Students studying game architecture patterns

### 1.3 Unique Selling Points
- Clean, modular codebase demonstrating professional game architecture
- Cyberpunk/neon visual theme with polished juice effects
- Progressive difficulty with combo and chain-reaction scoring
- Zero dependencies — pure browser APIs

---

## 2. Gameplay

### 2.1 Core Loop
```
AIM → SHOOT → MATCH → SCORE → REPEAT
```

1. **Aim** — Move mouse to rotate the launcher
2. **Shoot** — Click to fire the loaded bubble
3. **Match** — If 3+ same-color bubbles connect, they pop
4. **Chain** — Disconnected bubbles fall for bonus points
5. **Clear** — Pop all bubbles to advance to the next level

### 2.2 Win/Lose Conditions

| Condition | Trigger | Result |
|-----------|---------|--------|
| **Level Clear** | All grid bubbles popped | Advance to next level, shots refill, bonus score |
| **Game Over** | Shots reach 0 with bubbles remaining | Final score screen |
| **Game Over** | Any bubble crosses the danger zone | Final score screen |

### 2.3 Controls

| Input | Action |
|-------|--------|
| Mouse Move | Aim the launcher (angle follows cursor) |
| Left Click | Fire the current bubble |

Angle is clamped to the upper hemisphere (cannot shoot downward).

---

## 3. Game Systems

### 3.1 Hexagonal Grid

Bubbles are arranged in a honeycomb (hexagonal) pattern:
- Even rows: 7 bubbles, aligned to the left
- Odd rows: 6 bubbles, offset right by half a bubble diameter

This layout means each bubble has **6 neighbors** instead of 4 (square grid), creating more matching opportunities and strategic depth.

### 3.2 Matching Algorithm

Uses **Breadth-First Search (BFS) Flood Fill**:
1. When a bubble lands, check its grid position
2. Start BFS from that position, only traversing same-color neighbors
3. If the connected cluster has 3+ bubbles → pop them all
4. After popping, run a **connectivity check** from the top row
5. Any bubble not connected to the top → floating → drops for bonus

### 3.3 Scoring

| Action | Points | Notes |
|--------|--------|-------|
| Pop bubble | 100 each | Base score per bubble in cluster |
| Combo multiplier | ×N | N = consecutive successful matches |
| Floating drop | 50 each | Bubbles disconnected from ceiling |
| Level clear bonus | shots × 200 + level × 500 | Rewards efficiency |

**Combo System:**
- Each consecutive match increases the combo counter (×1, ×2, ×3...)
- A miss (no cluster of 3+) resets the combo to 0
- Score = cluster_size × 100 × combo_multiplier

### 3.4 Difficulty Progression

| Level | Grid Rows | Colors | Shot Count |
|-------|-----------|--------|------------|
| 1 | 5 | 3 | 20 |
| 2 | 6 | 3 | 20 |
| 3 | 7 | 4 | 20 |
| 4 | 8 | 4 | 20 |
| 5+ | 8 | 5-6 | 20 |

- **More rows** = more bubbles to clear
- **More colors** = harder to form clusters
- Shot count stays fixed — pressure comes from the growing puzzle

### 3.5 Projectile Physics

- Constant velocity: 12 pixels per frame
- Wall bouncing: X velocity reflects off left/right walls
- No gravity (flies in a straight line until hitting grid or ceiling)
- Only one shot in flight at a time

### 3.6 Danger Zone

A dashed red line at 100px from the bottom. If any grid bubble's center crosses this line, the game ends immediately. This creates urgency and prevents stalemates.

---

## 4. Visual Design

### 4.1 Art Direction
**Theme:** Cyberpunk / Neon Space  
**Color Palette:**
- Background: Deep space dark (#050510)
- Primary UI: Neon cyan (#00ffcc)
- Secondary: Neon pink (#ff3399)
- Reward/Score: Gold (#ffcc00)

### 4.2 Bubble Rendering (4-Layer Technique)
Each bubble is rendered with four visual layers:
1. **Glow aura** — Pulsing shadowBlur creates a neon halo
2. **Radial gradient** — Offset center simulates 3D sphere lighting
3. **Specular highlight** — Small bright dot mimics surface reflection
4. **Edge ring** — Thin stroke separates adjacent same-color bubbles

### 4.3 Particle Effects
- **Pop burst** — 14 particles per popped bubble, radial spread
- **Float drop** — 8 particles per dropped floating bubble
- Particles have gravity, fade-out, and size decay
- Color matches the popped bubble

### 4.4 UI Feedback
- **Score popups** — Float upward at the point of action
- **Combo text** — Gold "×N COMBO!" text appears for streaks
- **Drop text** — Orange "DROP!" text for chain reactions
- **Level clear** — Full-screen "CLEARED!" with glow
- **Aim line** — Dashed trajectory preview with wall bounces

### 4.5 Typography
- **Orbitron** — Geometric futuristic display font (scores, titles)
- **Space Mono** — Clean monospace (labels, body text)

---

## 5. Technical Architecture

### 5.1 Project Structure
```
Bubble-Shooter/
├── index.html              Entry point (Vite processes this)
├── package.json            Dependencies & build scripts
├── vite.config.js          Vite build configuration
├── css/
│   └── style.css           UI styling, theme variables, layout
├── js/
│   ├── main.js             Bootstrap — initializes game + stars
│   ├── constants.js        All tuning values and configuration
│   ├── Game.js             State machine, game loop, orchestration
│   ├── core/
│   │   ├── Vec2.js         2D vector math (position, velocity)
│   │   └── ObjectPool.js   Object recycling (GC optimization)
│   ├── entities/
│   │   ├── Bubble.js       Bubble data component
│   │   ├── Shooter.js      Player launcher + aim system
│   │   └── Projectile.js   Shot-in-flight physics
│   ├── systems/
│   │   ├── BubbleGrid.js   Hex grid, BFS matching, floating detection
│   │   ├── ParticleSystem.js  Visual effects emitter
│   │   └── FloatText.js    Score/combo popup text
│   └── rendering/
│       ├── BubbleRenderer.js  Bubble visual rendering (gradients, glow)
│       └── StarField.js       Background twinkling stars
├── docs/
│   └── GDD.md              This document
└── README.md               Project overview + how to run
```

### 5.2 Design Patterns Used

| Pattern | Where | Why |
|---------|-------|-----|
| **State Machine** | Game.js | Prevents invalid state transitions (e.g., shooting during animation) |
| **Object Pool** | ObjectPool.js → BubbleGrid | Eliminates GC pauses from constant bubble creation/destruction |
| **Entity-Component** | Bubble (data) + BubbleGrid (logic) + BubbleRenderer (view) | Separation of concerns — data, logic, and rendering are independent |
| **Game Loop** | Game._loop() | Fixed-timestep update/draw cycle synced to requestAnimationFrame |
| **BFS Flood Fill** | BubbleGrid.findCluster() | Efficient same-color cluster detection on hex grid |
| **Composition** | Projectile wraps Bubble | Adds physics behavior without modifying the Bubble class |

### 5.3 Key Algorithms

**BFS Flood Fill (Cluster Detection):**
- Time: O(n) — each cell visited once
- Space: O(n) — visited set + queue
- Used for: finding connected same-color groups

**BFS Connectivity (Floating Detection):**
- Time: O(n)
- Space: O(n)
- Used for: finding bubbles disconnected from the ceiling

**Hex Grid Neighbor Lookup:**
- Time: O(1) — fixed 6 directions
- Even/odd rows have different offset tables due to staggering

---

## 6. Future Improvements

### 6.1 Gameplay
- [ ] Power-up bubbles (bomb, rainbow/wildcard, laser)
- [ ] Ceiling descent timer (bubbles push down every N shots)
- [ ] High score persistence (localStorage)
- [ ] Touch/mobile support
- [ ] Sound effects and background music

### 6.2 Technical
- [ ] Migrate to PixiJS + TypeScript + Vite (production stack)
- [ ] Sprite atlas for bubble textures (GPU batching)
- [ ] WebGL particle system (handle 10,000+ particles)
- [ ] Unit tests for grid matching logic
- [ ] Accessibility: keyboard controls, screen reader announcements

### 6.3 Polish
- [ ] Screen shake on large combos
- [ ] Slow-motion effect on chain reactions
- [ ] Bubble squash/stretch on landing
- [ ] Trail effect on projectile
- [ ] Animated background (nebula, shooting stars)
