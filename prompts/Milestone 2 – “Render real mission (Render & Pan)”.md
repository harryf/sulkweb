# Milestone 2 – “Render real mission (Render & Pan)”

You are adding the first real‐mission visuals.

**Goal:** render the full *Suicide Mission* board (corridor + rooms) in the
browser and let the user pan the camera.

- loads the full Suicide Mission JSON (corridor + room squares) in the engine package
- exposes it to the client package
- draws each square with the correct texture (square_corridor.png vs square_room.png)
- lets the user pan the camera with ⬆︎⬇︎⬅︎➡︎ (or WASD) keys
- adds automated tests (headless Phaser) that prove the map is rendered and scrollable without runtime errors.

When complete the manual test is:

1. `pnpm --filter client dev`
2. Browser opens `/packages/client/index.html`
3. Space-Hulk map appears (corridor squares grey, room squares brown)
↔ / ←→ / WASD pans the camera over the whole board
Console shows **no errors**.

Automated tests must still pass.

# Directory targets

```tsx
packages/
├─ engine/
│ ├─ missions/
│ │ ├─ space_hulk_1.json # NEW ➊
│ │ ├─ missionTypes.ts # updated schema
│ │ └─ missionLoader.ts # extended parser
│ ├─ board/ # existing
│ │ ├─ Square.ts # add .kind
│ │ └─ Board.ts # load Square.kind
│ └─ src/tests/mission.spec.ts# extra asserts
└─ client/
├─ src/
│ ├─ scenes/GameScene.ts # NEW ➋
│ └─ main.ts # wire scene
└─ vite.config.ts # alias “@engine”
```

---

## 1 Mission JSON ➊

Convert *MISH_space_hulk_1* Python into **pure-data** JSON.

Only squares, their type (“corridor” | “room”) and optional `doorFacing`
are needed; ignore pieces/blips now.

Example structure (shortened):

```tsx
{
  "name": "Suicide Mission",
  "width": 22,
  "height": 27,
  "squares": [
    { "x": 10, "y": 0, "kind": "corridor" },
    { "x": 10, "y": 5, "kind": "corridor", "doorFacing": "up" },
    { "x": 9,  "y": 6, "kind": "room",     "section": 1 },
    ...
  ]
}

```

*Hints*

- Width = max x + 1; height = max y + 1.
- Any square tuple that lived in a “#room” group in the original file → `"room"`.
- Everything else → `"corridor"`.
- 4 directional facings: `"up"|"right"|"down"|"left"`.

Commit the JSON under `engine/missions/space_hulk_1.json`.

## 2 engine changes

### `missionTypes.ts`

```tsx

export interface SquareJSON {
  x: number
  y: number
  kind: 'corridor' | 'room'
  section?: number      // optional, for future
  doorFacing?: 'up'|'right'|'down'|'left'
}

export interface RawMissionJSON_v2 {
  name: string
  width: number
  height: number
  squares: SquareJSON[]
}

export type CompiledMission = RawMissionJSON_v2   // identical for now

```

### `missionLoader.ts`

*Remove the old v1 loader code, keep signature.*

```tsx

import fs from 'fs'
import path from 'path'
import { RawMissionJSON_v2 as Raw, CompiledMission } from './missionTypes'

export function loadMissionSync(p: string): CompiledMission {
  const raw = JSON.parse(fs.readFileSync(path.resolve(p), 'utf8')) as Raw
  if (!raw.squares?.length) throw new Error('invalid mission: no squares')
  return raw
}

```

### `board/Square.ts`

Add property:

```tsx

export type SquareKind = 'corridor' | 'room'

export class Square {
  constructor(
    public readonly x: number,
    public readonly y: number,
    public readonly kind: SquareKind = 'corridor',
    ...
  ) {}
}

```

### `board/Board.ts`

Accept `kind` when building:

```tsx

constructor(width: number, height: number, squares: SquareJSON[]) {
  this.width = width; this.height = height
  this.grid = new Map<string, Square>()
  squares.forEach(sq => {
    const key = `${sq.x},${sq.y}`
    this.grid.set(key, new Square(sq.x, sq.y, sq.kind))
  })
}

```

Expose helper:

```tsx

allSquares(): Square[] { return [...this.grid.values()] }
get(x: number, y: number): Square | undefined { return this.grid.get(`${x},${y}`) }

```

### `GameEngine.ts`

Change ctor:

```tsx

constructor(mission: CompiledMission) {
  this.state = { board: new Board(mission.width, mission.height, mission.squares) }
}

```

---

## 3 client Phaser scene ➋

### `scenes/GameScene.ts`

```tsx

import Phaser from 'phaser'
import { GameEngine, loadMissionSync } from '@engine'
import boardImg   from '/assets/themes/default/square_corridor.png'
import roomImg    from '/assets/themes/default/square_room.png'

export class GameScene extends Phaser.Scene {
  private tileSize!: number
  private engine!: GameEngine

  preload () {
    this.load.image('corridor', boardImg)
    this.load.image('room', roomImg)
  }

  create () {
    // 1. boot engine
    const mission = loadMissionSync(
      new URL('@engine/missions/space_hulk_1.json', import.meta.url).pathname
    )
    this.engine = new GameEngine(mission)

    // 2. draw board
    const corridorTex = this.textures.get('corridor')
    this.tileSize = corridorTex.getSourceImage().width
    const grp = this.add.group()

    this.engine.state.board.allSquares().forEach(sq => {
      const key = sq.kind === 'room' ? 'room' : 'corridor'
      const img = this.add.image(sq.x * this.tileSize, sq.y * this.tileSize, key)
      img.setOrigin(0, 0)
      grp.add(img)
    })

    // 3. camera bounds & pan
    const w = mission.width  * this.tileSize
    const h = mission.height * this.tileSize
    this.cameras.main.setBounds(0, 0, w, h)
    this.cameras.main.centerOn(w / 2, h / 2)

    const cursors = this.input.keyboard.createCursorKeys()
    this.input.on('pointermove', p => {
      if (p.isDown) this.cameras.main.scrollX -= p.velocity.x
      if (p.isDown) this.cameras.main.scrollY -= p.velocity.y
    })

    this.events.on('update', () => {
      const cam = this.cameras.main
      const speed = 6
      if (cursors.left?.isDown)  cam.scrollX -= speed
      if (cursors.right?.isDown) cam.scrollX += speed
      if (cursors.up?.isDown)    cam.scrollY -= speed
      if (cursors.down?.isDown)  cam.scrollY += speed
    })
  }
}

```

### `main.ts`

```tsx

import Phaser from 'phaser'
import { GameScene } from './scenes/GameScene'

new Phaser.Game({
  type: Phaser.AUTO,
  width: 800,
  height: 600,
  backgroundColor: '#000',
  scene: [GameScene],
  render: { pixelArt: true }
})

```

### `vite.config.ts`

```tsx

import { defineConfig } from 'vite'
import tsconfigPaths from 'vite-tsconfig-paths'

export default defineConfig({
  plugins: [tsconfigPaths()],
  resolve: { alias: { '@engine': '/packages/engine' } }
})

```

---

## 4 Vitest updates

Extend `mission.spec.ts` inside engine:

```tsx

it('square kinds are parsed', () => {
  const sq = mission.squares.find(s => s.x === 10 && s.y === 7)
  expect(sq?.kind).toBe('room')
})

```

---

## 5 Manual QA script

1. `pnpm install`
2. `pnpm --filter engine test` → all green
3. `pnpm --filter client dev` and open browser:
    - Corridors (grey) and rooms (brown) appear exactly as the PDF map.
    - Arrow keys or drag pans.
    - No red console errors.

Done ✔︎