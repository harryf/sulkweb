# Milestone 3 – “Piece Selection Handler”

# Goal

- **Mouse-click** on a Storm-Bolter Marine selects/deselects it.
– A green outline (“select.png”) appears centred on the piece sprite.
- **Arrow-/WASD** keys now control **the currently-selected** piece (instead of a hard-wired marine).
- After every successful move/turn the selection outline stays glued to the piece’s new position & rotation.

## Functional Spec

| Action | Expected Result |
| --- | --- |
| Click on marine sprite when none selected | Marine becomes *selected*.Selection outline sprite appears (alpha = 0.8). |
| Click the same marine again | Marine becomes *unselected*. Outline sprite is destroyed. |
| Click a *different* marine (future-proofing) | Selection transfers: old outline removed, new one shown. |
| Keyboard movement with **no** selected piece | Ignored (no errors). |
| Movement blocked (wall / 0 AP) | Outline remains where marine is (no lag). |

## Deliverables

- **Engine / state**: `SelectionStore` singleton or simple property that holds `selectedPieceId:string | null`.
- **Client**: input system registers `pointerdown`, does hit-test against `Phaser.GameObjects.Image`, calls `engine.selectPiece(id)`.
- New asset pre-load (`select.png`) and separate **Phaser image** for highlight (render depth just below piece).
- Tests:
    - **engine** unit tests verifying `selectPiece`, `togglePiece`, `deselect`.
    - **client** integration mock (Vitest + @phaser-esbuild-mock) to assert: after selection, `highlightSprite.visible === true` and its position updates after `piece.tryMove`.
        - keep test lightweight – stub out sprite with `{x,y,visible}`.
- All previous Milestone tests still pass.

## Implementation Notes

### Directory / file changes

```tsx
packages/
├─ engine/
│ └─ src/
│ ├─ ui/Selection.ts # NEW – pure state (no Phaser)
│ └─ tests/selection.spec.ts
└─ client/
└─ src/
├─ scenes/GameScene.ts # UPDATE (pointer + highlight handling)
└─ ui/Highlight.ts # NEW – class wraps highlight sprite
```

### 1 `ui/Selection.ts`

```tsx
/** Centralised selection state for the current turn */
export class Selection {
  private static current: string | null = null
  /** returns previously-selected id (or null) */
  static select(id: string) {
    const prev = this.current
    this.current = id
    return prev
  }
  static toggle(id: string) {
    if (this.current === id) this.current = null
    else this.current = id
  }
  static clear() { this.current = null }
  static get(): string | null { return this.current }
}

```

### 2 `selection.spec.ts`

```tsx

import { describe,it,expect } from 'vitest'
import { Selection } from '../ui/Selection'

describe('Selection store', () => {
  it('toggles same id', () => {
    Selection.toggle('p1')
    expect(Selection.get()).toBe('p1')
    Selection.toggle('p1')
    expect(Selection.get()).toBeNull()
  })
  it('switches to new id', () => {
    Selection.select('p1')
    const prev = Selection.select('p2')
    expect(prev).toBe('p1')
    expect(Selection.get()).toBe('p2')
  })
})

```

### 3 Client – `Highlight.ts`

```tsx

import Phaser from 'phaser'
export class Highlight {
  private img: Phaser.GameObjects.Image
  constructor(scene: Phaser.Scene) {
    this.img = scene.add.image(0,0,'select')
       .setVisible(false)
       .setAlpha(0.8)
       .setDepth(0.5)
       .setOrigin(0)
  }
  follow(target: Phaser.GameObjects.Image) {
    this.img.setPosition(target.x, target.y)
            .setRotation(target.rotation)
            .setVisible(true)
  }
  hide() { this.img.setVisible(false) }
}

```

### 4 `GameScene.ts` (diff-summary)

- **preload**
    
    ```tsx
    
    this.load.image('select', '/themes/default/select.png')
    
    ```
    
- **create**
    
    ```tsx
    
    this.highlight = new Highlight(this)
    // pointer
    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      const hit = this.children.getByName('piece')  // if you named sprites, else iterate
                    ?.find(obj => obj.getBounds().contains(p.worldX,p.worldY))
      if (!hit) return
      const id = (hit as any).pieceId
      Selection.toggle(id)
      this.updateHighlight()
    })
    
    ```
    
- **updateHighlight()**
    
    ```tsx
    
    const id = Selection.get()
    if (!id) { this.highlight.hide(); return }
    const obj = this.pieceSprites[id]
    if (obj) this.highlight.follow(obj)
    
    ```
    
- **after each successful move/turn** call `updateHighlight()` again.

### 5 Movement input change

Replace direct `this.marine` reference with:

```tsx

const active = Selection.get() ? this.engine.findPiece(Selection.get()!) : null
if (!active) return
// then attempt moves as before

```

### 6 Client integration test (simplified)

Write `GameScene.spec.ts` that mounts a minimal Phaser stub scene, injects two sprites, fires pointer events, asserts `highlight.visible` & position changes.

You may use `vitest.mock('phaser', () => require('phaser-mock'))` or similar.

──────────────────────────────────────────────────────────────────────────────

Checklist / Definition-of-Done

- `pnpm test -r` green → selection & prior suites.
- Running client:
    1. No piece selected → arrow keys do nothing.
    2. Click a marine → outline appears.
    3. Press `W` → marine moves, outline follows.
    4. Click same marine again → outline disappears.
    5. No gaps / runtime errors in console.