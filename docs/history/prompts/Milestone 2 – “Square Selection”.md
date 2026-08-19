# Milestone 2 – “Square Selection”

# Goal

- A single left click on a board square shows a green selection highlight
(texture **assets/themes/default/select.png**) at the square’s position.
- Clicking the *same* square again removes the highlight.
- Clicking a *different* square moves the highlight.
- Highlight tracks world scrolling automatically (because it lives in
world space).

## ✅ Demo check-list

1. `pnpm --filter client dev`
2. Click a square
→ green “select” sprite appears, centred on the square.
3. Camera pan (WASD)
→ highlight stays stuck to that square.
4. Click the same square
→ highlight disappears.
5. Click another square
→ highlight jumps to new square.

Zero console errors; existing tests keep passing.

Folder / file plan

```tsx
packages/
├─ engine/ # ← no change
└─ client/
├─ src/
│ ├─ utils/SelectionManager.ts # NEW (pure logic, unit-tested)
│ ├─ ui/HighlightSprite.ts # NEW (Phaser wrapper)
│ └─ scenes/GameScene.ts # UPDATED
└─ src/tests/selection.spec.ts# NEW tests (vitest)
```

## 1 Pure logic helper – `utils/SelectionManager.ts`

```
export interface Coord { c: number; r: number }        // column, row

/**
 * Tiny state container used by the scene; framework-agnostic.
 */
export class SelectionManager {
  private _current: Coord | null = null;

  /** Current selected square (null == none) */
  get current(): Coord | null { return this._current }

  /**
   * Toggle selection. Returns the new current selection or null.
   * If `coord` equals the current one => deselect (returns null).
   */
  toggle(coord: Coord): Coord | null {
    if (this._current &&
        this._current.c === coord.c &&
        this._current.r === coord.r) {
      this._current = null;
    } else {
      this._current = coord;
    }
    return this._current;
  }
}

```

## 2 Highlight display – `ui/HighlightSprite.ts`

```tsx

import { Coord } from '../utils/SelectionManager'

export class HighlightSprite extends Phaser.GameObjects.Image {
  constructor(scene: Phaser.Scene, tile: number) {
    super(scene, 0, 0, 'select')            // texture key loaded in GameScene
    this.setOrigin(0)                       // easier positioning: top-left
    this.setDisplaySize(tile, tile)         // stretch to tile size
    this.setDepth(2)                        // above the board
  }

  /** Move highlight so its top-left aligns with the square at Coord. */
  moveTo(coord: Coord, tile: number) {
    this.setPosition(coord.c * tile, coord.r * tile)
  }
}

```

## ──────────────────────────────────────────────────────────────────────────────
3 Scene update – `scenes/GameScene.ts`

**Additions**

```tsx

// top
import { SelectionManager, Coord } from '../utils/SelectionManager'
import { HighlightSprite } from '../ui/HighlightSprite'

// in class GameScene
private selection!: SelectionManager
private highlight!: HighlightSprite

```

**In `preload()`**

```
ts
CopyEdit
this.load.image('select', '/themes/default/select.png')

```

**In `create()` after the board is built**

```tsx

// Set-up selection
this.selection = new SelectionManager()
this.highlight = new HighlightSprite(this, this.tileSize)
this.highlight.setVisible(false)
this.add.existing(this.highlight)

// Input handler
this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
  if (pointer.leftButtonDown()) {
    const world = pointer.positionToCamera(this.cameras.main) as Phaser.Math.Vector2
    const col = Math.floor(world.x / this.tileSize)
    const row = Math.floor(world.y / this.tileSize)

    // guard rails — stay inside board
    if (col < 0 || row < 0 ||
        col >= this.engine.state.board.width ||
        row >= this.engine.state.board.height) return

    const next = this.selection.toggle({ c: col, r: row })
    if (next) {
      this.highlight.moveTo(next, this.tileSize)
      this.highlight.setVisible(true)
    } else {
      this.highlight.setVisible(false)
    }
  }
})

```

Nothing else changes – because `HighlightSprite` lives in world space it

automatically pans with the camera.

## 4 Vitest unit tests – `selection.spec.ts`

```tsx

import { SelectionManager } from '../utils/SelectionManager'

describe('SelectionManager', () => {
  it('selects when empty', () => {
    const sel = new SelectionManager()
    expect(sel.toggle({ c: 1, r: 2 })).toEqual({ c: 1, r: 2 })
    expect(sel.current).toEqual({ c: 1, r: 2 })
  })

  it('deselects on same square', () => {
    const sel = new SelectionManager()
    sel.toggle({ c: 3, r: 4 })          // selected
    expect(sel.toggle({ c: 3, r: 4 })).toBeNull()
    expect(sel.current).toBeNull()
  })

  it('moves highlight to different square', () => {
    const sel = new SelectionManager()
    sel.toggle({ c: 0, r: 0 })
    expect(sel.toggle({ c: 5, r: 5 })).toEqual({ c: 5, r: 5 })
    expect(sel.current).toEqual({ c: 5, r: 5 })
  })
})

```

## 5 Manual QA

- Load dev server → grid appears as before.
- Click several squares; highlight follows.
- Click same square twice – disappears.
- Pan to each edge; highlight remains glued to world square.