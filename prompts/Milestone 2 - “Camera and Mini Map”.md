# Milestone 2 - “Camera and Mini Map”

In this slice we add smooth keyboard panning **plus** a live mini-map that shows a white
rectangle representing the current camera window.

✅ Acceptance demo

1. `pnpm --filter client dev`
2. Use **Arrow / WASD** or drag-mouse to pan.
    - Main view never shows “void” beyond the board.
3. Bottom-right overlay shows a scaled “mini” board (corridor = grey #666,
room = brown #A56).
    - A thin white rect follows the camera.
    - The rect never escapes the mini-map.

No console errors; engine tests still green.

# Folder targets

```tsx
packages/
├─ engine/ # ← no changes
└─ client/
├─ src/
│ ├─ scenes/GameScene.ts # update
│ ├─ ui/Minimap.ts # NEW 🅐
│ └─ utils/cameraBox.ts # NEW (pure fn, unit-tested)
└─ src/tests/minimap.spec.ts# NEW tests
```

──────────────────────────────────────────────────────────────────────────────

## 1 Mini-square asset

Reuse `assets/themes/default/mini_square.png`.

Load via the scene’s `preload()`.

──────────────────────────────────────────────────────────────────────────────

## 2 Pure math helper (`utils/cameraBox.ts`)

```tsx
export interface CamRect { x: number; y: number; w: number; h: number }
export interface MiniRect { x: number; y: number; w: number; h: number }
export function projectCamToMini(
  cam: CamRect,          // in world px
  board: { w: number; h: number }, // world size px
  mini: MiniRect         // mini-map bounds px
): MiniRect

```

Return the mini-box with clamped x/y so it never leaves the mini rect.

## 3 `ui/Minimap.ts` 🅐

Lightweight Phaser container:

```tsx

export class Minimap extends Phaser.GameObjects.Container {
  constructor(
     scene: Phaser.Scene,
     engine: GameEngine,
     opts: { tile: number; width: number }   // tile=full tile px, width mini px
  )

  updateCam(cam: Phaser.Cameras.Scene2D.Camera): void
}

```

Implementation hints

- Compute scale = opts.width / (engine.state.board.width * opts.tile)
- For every Square create an `Image` with mini texture at scaled x/y.
    
    Use a second Graphics rectangle (`this.viewportBox`) set to `lineStyle(2, 0xFFFFFF)`.
    
- `updateCam()` calls `projectCamToMini()` and redraws `viewportBox`.

──────────────────────────────────────────────────────────────────────────────

## 4 `scenes/GameScene.ts`

- Keep existing panning logic.
- **Clamp** camera each `update()`:

```tsx

cam.scrollX = Phaser.Math.Clamp(cam.scrollX, 0, worldW - cam.width)
cam.scrollY = Phaser.Math.Clamp(cam.scrollY, 0, worldH - cam.height)

```

- Create Minimap after board is drawn:

```tsx

const minimap = new Minimap(this, this.engine, { tile: this.tileSize, width: 200 })
this.add.existing(minimap)
minimap.setScrollFactor(0)        // fixed to screen
minimap.setPosition(this.cameras.main.width - 210, this.cameras.main.height - 210)

this.events.on('update', () => minimap.updateCam(this.cameras.main))

```

──────────────────────────────────────────────────────────────────────────────

## 5 Vitest unit tests

### `minimap.spec.ts`

```tsx

import { projectCamToMini } from '../utils/cameraBox'

describe('projectCamToMini', () => {
  const board = { w: 1000, h: 1000 }
  const mini  = { x: 0, y: 0, w: 100, h: 100 }

  it('maps centre correctly', () => {
    const box = projectCamToMini({ x: 250, y: 250, w: 500, h: 500 }, board, mini)
    expect(box).toEqual({ x: 25, y: 25, w: 50, h: 50 })
  })

  it('clamps left/top', () => {
    const b = projectCamToMini({ x: -20, y: -20, w: 300, h: 300 }, board, mini)
    expect(b.x).toBe(0); expect(b.y).toBe(0)
  })

  it('clamps right/bottom', () => {
    const b = projectCamToMini({ x: 900, y: 900, w: 200, h: 200 }, board, mini)
    expect(b.x + b.w).toBeLessThanOrEqual(mini.w)
    expect(b.y + b.h).toBeLessThanOrEqual(mini.h)
  })
})

```

──────────────────────────────────────────────────────────────────────────────

## 6 Manual QA checklist

- **Pan** fully to each edge; main camera never shows blank space.
- Mini-box tracks and never exits its overlay.
- At max zoom-out (future) the box still visible – but zoom isn’t implemented yet, that’s okay.