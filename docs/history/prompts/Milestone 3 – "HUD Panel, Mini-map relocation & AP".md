# Milestone 3 – “HUD Panel, Mini-map relocation & AP Counter”

# Goal

Transform the UI so that:

1. **Right-hand HUD panel** (fixed-width, full canvas height):
    - **Mini-map** sits at the top (same interactive object you already have, just re-parented).
    - Under the mini-map draw a header strip “Marine Info”.
    - Beneath that a **bitmap-text AP counter** that shows`AP: <currentPiece.apRemaining>/<currentPiece.apInitial>` – auto-updates on selection or after every move/turn.
    - Reserve the remaining vertical space for future widgets (blank for now).
2. Layout: the main board camera stays scrollable in the **left area**.
    
    HUD never scrolls; highlight & pieces remain in the board layer.
    

## Deliverables

```tsx
packages/
├─ client/
│ └─ src/
│ ├─ ui/
│ │ ├─ HudPanel.ts # NEW
│ │ └─ tests/hud.spec.ts
│ └─ scenes/GameScene.ts # UPDATE
└─ engine/
└─ src/
└─ events/PieceEvents.ts # NEW tiny pub/sub util
```

## Implementation Steps

### 1 Constants

Add to `client/src/config.ts` (or create if absent):

```
export const HUD_WIDTH = 200
export const HUD_BG = 0x1b1b1b
export const HUD_TEXT_COLOR = '#c3c3c3'
export const HUD_HEADER_COLOR = '#2c2c2c'
export const MINI_MAP_MARGIN = 8

```

### 2 Pub/Sub for AP changes (`PieceEvents.ts`)

```
ts
CopyEdit
import { EventEmitter } from 'events'
export const PieceEvents = new EventEmitter()
// topics: 'selected', {pieceId}
//         'apChanged', {pieceId, apRemaining, apInitial}

```

*Emit* `selected` in your selection handler and `apChanged` inside the `Piece.move/turn` method (engine layer).

### 3 `HudPanel.ts`

```
ts
CopyEdit
import Phaser from 'phaser'
import { PieceEvents } from '@/engine/events/PieceEvents'
import { HUD_WIDTH, HUD_BG, HUD_HEADER_COLOR, HUD_TEXT_COLOR, MINI_MAP_MARGIN } from '@/config'

export class HudPanel extends Phaser.GameObjects.Container {
  private bg: Phaser.GameObjects.Rectangle
  private apText: Phaser.GameObjects.BitmapText
  private miniMap: Phaser.GameObjects.Container

  constructor(scene: Phaser.Scene, miniMap: Phaser.GameObjects.Container) {
    super(scene, 0, 0)
    this.setScrollFactor(0)          // stick to camera
    scene.add.existing(this)

    // background
    this.bg = scene.add.rectangle(0, 0, HUD_WIDTH, scene.scale.height, HUD_BG)
      .setOrigin(0)
    this.add(this.bg)

    // Mini-map re-parent
    this.miniMap = miniMap
    this.miniMap.setPosition(MINI_MAP_MARGIN, MINI_MAP_MARGIN)
    this.add(this.miniMap)

    // header strip
    const header = scene.add.rectangle(0, this.miniMap.y + this.miniMap.height + MINI_MAP_MARGIN,
      HUD_WIDTH, 24, HUD_HEADER_COLOR).setOrigin(0)
    this.add(header)
    scene.add.bitmapText(header.x + 8, header.y + 4, '8px', 'Marine Info', HUD_TEXT_COLOR)
      .setTintFill()

    // AP bitmap text
    this.apText = scene.add.bitmapText(header.x + 8, header.y + 32, '8px', 'AP: --/--', HUD_TEXT_COLOR)
    this.add(this.apText)

    // subscribe
    PieceEvents.on('selected', ({ pieceId }) => this.updateFor(pieceId))
    PieceEvents.on('apChanged', ({ pieceId, apRemaining, apInitial }) => {
      if (pieceId === this.currentId) this.setAP(apRemaining, apInitial)
    })
  }
  private currentId: string|null = null
  private updateFor(id: string|null) {
    this.currentId = id
    if (!id) { this.apText.setText('AP: --/--'); return }
    const pc = window.engine.findPiece(id)
    this.setAP(pc.apRemaining, pc.apInitial)
  }
  private setAP(rem: number, init: number) {
    this.apText.setText(`AP: ${rem}/${init}`)
  }
}

```

### 4 `GameScene.ts` changes

1. **Resize** canvas: `config.width = boardWidth + HUD_WIDTH`.
2. In `create()` after building mini-map:
    
    ```
    ts
    CopyEdit
    this.hud = new HudPanel(this, this.miniMapContainer)
    
    ```
    
    *Remove* mini-map from its old parent.
    
3. Adjust input camera bounds so it does **not** pan into HUD area:
    
    ```
    ts
    CopyEdit
    this.cameras.main.setBounds(0, 0, boardPixelW, boardPixelH)
    
    ```
    
    (canvas size already limits rightmost pan)
    
4. When changing selection & after each successful move/turn: emit
    
    ```
    ts
    CopyEdit
    PieceEvents.emit('selected', {pieceId})          // toggle handler
    PieceEvents.emit('apChanged',{pieceId, apRemaining, apInitial})
    
    ```
    

### 5 Bitmap font

- Pre-load a tiny pixel font once in `preload()`:
    
    ```
    ts
    CopyEdit
    this.load.bitmapFont('8px', '/fonts/8px.png', '/fonts/8px.fnt')
    
    ```
    

### 6 Tests

`hud.spec.ts` (Vitest):

```
ts
CopyEdit
import { HudPanel } from '../HudPanel'
import { PieceEvents } from '@/engine/events/PieceEvents'
import { describe, it, expect, beforeEach } from 'vitest'
import { SceneMock } from 'phaser-mock'

describe('HudPanel', () => {
  let hud: HudPanel
  beforeEach(() => {
    const scene = new SceneMock()
    hud = new HudPanel(scene, scene.add.container())
  })
  it('updates AP text on selection', () => {
    // simulate engine piece lookup
    (window as any).engine = { findPiece: () => ({ apRemaining: 3, apInitial: 4 }) }
    PieceEvents.emit('selected', { pieceId: 'm1' })
    expect(hud['apText'].text).toBe('AP: 3/4')
  })
  it('clears on deselect', () => {
    PieceEvents.emit('selected', { pieceId: null })
    expect(hud['apText'].text).toBe('AP: --/--')
  })
})

```

### 7 Manual QA / Definition-of-Done

- Run `pnpm dev` – canvas now wider; right panel static grey background.
- Mini-map relocated at panel top.
- Click marine → AP text shows e.g. `AP: 4/4`.
- Move with `W` → decrements to `3/4`, outline follows.
- Deselect → AP display resets to `-/--`.
- Pan board with arrows – HUD stays fixed; no blank gaps or scrolling bleed.
- All unit tests (new + prior) pass using
    - `pnpm --filter ./packages/client test`
    - `pnpm --filter ./packages/client e2e`
    - `pnpm --filter ./packages/engine test`