# Bubble Blaster

A neon-themed bubble shooter built with vanilla JavaScript and Canvas2D, structured with professional game architecture patterns and bundled with Vite.

**[Game Design Document](docs/GDD.md)**

---

## What Is This?

A fully playable bubble shooter game that demonstrates:

- **Hexagonal grid system** with BFS flood-fill matching
- **Object pooling** for GC-free performance
- **State machine** game loop with delta-time updates
- **Entity-Component separation** (data / logic / rendering)
- **Particle effects** and polished "game juice"
- **Vite build pipeline** for production-ready bundles

Aim with mouse, click to shoot. Match 3+ same-color bubbles to pop them. Chain reactions drop disconnected bubbles for bonus points. Clear the board to level up.

---

## Getting Started

```bash
# Install dependencies
npm install

# Development server (hot reload, open browser automatically)
npm run dev

# Production build (outputs to dist/)
npm run build

# Preview the production build locally
npm run preview
```

### Commands

| Command | What it does |
|---------|-------------|
| `npm run dev` | Starts Vite dev server with HMR at `http://localhost:5173` |
| `npm run build` | Bundles all JS + CSS into `dist/` (minified, hashed filenames) |
| `npm run preview` | Serves the `dist/` folder to test the production build |

### Build Output

```
dist/
├── index.html              Processed HTML with injected script/style tags
└── assets/
    ├── index-XXXXX.css     Bundled & minified CSS (~3 KB)
    └── index-XXXXX.js      Bundled & minified JS (~15 KB)
```

The `dist/` folder is fully self-contained — deploy it to any static host (Vercel, Netlify, GitHub Pages, S3).

---

## Project Structure

```
Bubble-Shooter/
├── index.html                 HTML entry point (Vite processes this)
├── package.json               Dependencies & scripts
├── vite.config.js             Vite build configuration
├── css/
│   └── style.css              Theme, layout, HUD styling
├── js/
│   ├── main.js                Bootstrap — imports CSS, initializes game
│   ├── constants.js           All tuning values in one place
│   ├── Game.js                State machine + game loop + orchestration
│   ├── core/
│   │   ├── Vec2.js            2D vector math (position, velocity, distance)
│   │   └── ObjectPool.js      Object recycling pattern (GC optimization)
│   ├── entities/
│   │   ├── Bubble.js          Bubble data class (what a bubble IS)
│   │   ├── Shooter.js         Player launcher + aim line + next preview
│   │   └── Projectile.js      Shot-in-flight physics + wall bouncing
│   ├── systems/
│   │   ├── BubbleGrid.js      Hex grid, BFS matching, floating detection
│   │   ├── ParticleSystem.js  Pop explosion particle emitter
│   │   └── FloatText.js       Score/combo popup text
│   └── rendering/
│       ├── BubbleRenderer.js  4-layer bubble rendering (gradient, glow, specular)
│       └── StarField.js       Background twinkling star animation
├── docs/
│   └── GDD.md                 Full Game Design Document
└── README.md
```

### Architecture Map

Each folder maps to a responsibility in game architecture:

| Folder | Role | Game Engine Equivalent |
|--------|------|----------------------|
| `core/` | Reusable math & utility classes | Engine internals |
| `entities/` | Game object data (what things ARE) | GameObjects / Actors |
| `systems/` | Game logic (what things DO) | Systems / Managers |
| `rendering/` | Visual output (how things LOOK) | Renderers / Shaders |

This mirrors the **Entity-Component-System (ECS)** pattern used by Unity, Unreal, and modern engines — simplified for a Canvas2D project.

### Dependency Graph

```
main.js
├── css/style.css          (Vite injects as <style> in dev, extracts in build)
├── Game.js
│   ├── core/Vec2.js
│   ├── constants.js
│   ├── systems/BubbleGrid.js
│   │   ├── core/Vec2.js
│   │   ├── core/ObjectPool.js
│   │   ├── entities/Bubble.js
│   │   └── rendering/BubbleRenderer.js
│   ├── systems/ParticleSystem.js
│   ├── systems/FloatText.js
│   ├── entities/Shooter.js
│   │   └── rendering/BubbleRenderer.js
│   └── entities/Projectile.js
│       └── rendering/BubbleRenderer.js
└── rendering/StarField.js
```

---

## Key Concepts Demonstrated

### Hexagonal Grid
Bubbles sit on a honeycomb layout where each cell has 6 neighbors. Even/odd rows have different column offsets (staggered grid). See [BubbleGrid.js](js/systems/BubbleGrid.js) for the neighbor lookup tables and coordinate conversion.

### BFS Flood Fill
When a bubble lands, a Breadth-First Search finds all connected same-color bubbles. If 3+ are found, they pop. A second BFS from the top row detects floating (disconnected) bubbles that drop for bonus points. See `findCluster()` and `findFloating()` in [BubbleGrid.js](js/systems/BubbleGrid.js).

### Object Pool
Bubbles are recycled instead of created/destroyed to avoid garbage collection stuttering. See [ObjectPool.js](js/core/ObjectPool.js) for the pattern and comments explaining why it matters in 60fps games.

### Game State Machine
The game uses explicit states (`IDLE`, `PLAYING`, `ANIMATING`, `LEVEL_CLEAR`, `GAME_OVER`) to prevent invalid actions like shooting during animations. See [Game.js](js/Game.js).

### Particle System
Pop effects use a simple emitter with gravity, fade, and size decay. Demonstrates the core concepts behind professional particle systems (PIXI.ParticleContainer, Unity ParticleSystem). See [ParticleSystem.js](js/systems/ParticleSystem.js).

### 4-Layer Bubble Rendering
Each bubble uses radial gradients, specular highlights, glow aura, and edge rings to create a polished 3D-sphere look with pure Canvas2D. See [BubbleRenderer.js](js/rendering/BubbleRenderer.js).

---

## Design Patterns

| Pattern | File | Purpose |
|---------|------|---------|
| State Machine | [Game.js](js/Game.js) | Controls game flow, prevents invalid state transitions |
| Object Pool | [ObjectPool.js](js/core/ObjectPool.js) | Recycles objects to avoid GC pauses |
| Entity-Component | Bubble + BubbleGrid + BubbleRenderer | Separates data, logic, and rendering |
| Game Loop | [Game.js](js/Game.js) `_loop()` | Delta-time update/draw cycle via requestAnimationFrame |
| BFS Flood Fill | [BubbleGrid.js](js/systems/BubbleGrid.js) | Graph traversal for cluster matching |
| Composition | [Projectile.js](js/entities/Projectile.js) | Wraps Bubble with physics behavior |

---

## Scoring

| Action | Points |
|--------|--------|
| Pop bubble | 100 × combo multiplier |
| Drop floating bubble | 50 |
| Level clear bonus | remaining shots × 200 + level × 500 |

Combo multiplier increases with consecutive successful matches and resets on a miss.

---

## Tech Stack

| Tool | Role |
|------|------|
| **Vite** | Dev server + production bundler (HMR, minification, hashing) |
| **JavaScript ES Modules** | Clean imports, tree-shaking |
| **Canvas2D API** | All game rendering (no WebGL dependency) |
| **CSS Custom Properties** | Consistent neon theme system |
| **Google Fonts** | Orbitron + Space Mono typography |

Single dev dependency (Vite). Zero runtime dependencies.

---

## Author

**Kelvin Biffi** — Game Development Portfolio  
Demonstrating Canvas2D game architecture, design patterns, and modern build tooling.
