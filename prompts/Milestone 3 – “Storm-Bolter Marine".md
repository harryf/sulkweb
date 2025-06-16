# Milestone 3.a – “Storm-Bolter Marine (movement, AP, facing)”

# Goal

Implement a single controllable Terminator Marine armed with a Storm-Bolter.
It can **move, turn, spend AP,** and obey blocking rules.

- Start turn with 4 AP.
- Movement costs
• forward / forward-diagonals = **1 AP**
• backward / sideways / back-diagonals = **2 AP**
- Turning costs
• 90° left or right = **1 AP**
• 180° (about-face) = **2 AP**
- Cannot enter a Square whose `passable === false`.
- Cannot perform an action that would drive AP below 0.
- Sprite rotates to 0°, 90°, 180°, 270° for N-E-S-W axes.
- Keyboard mapping (client only)`W` = move forward `S` = move backward`A` = turn left `D` = turn right
- When AP hits 0 the marine stops responding until turn refresh (out-of-scope for this sub-milestone).

Deliverables must include:

- New **engine** classes (`Direction`, `Piece`, `StormBolterMarine`).
- Movement / turn logic & cost checking.
- **Vitest** unit tests proving rules.
- **client** wiring: GameScene moves the single marine on key-press and keeps sprite facing / AP in sync.
- No regressions in earlier tests.

# Directory / file plan

```
packages/
├─ engine/
│ └─ src/
│ ├─ core/
│ │ ├─ Direction.ts # NEW enum + helpers
│ │ └─ CostTables.ts # NEW constant maps (movemap, turnmap)
│ ├─ board/
│ │ └─ Board.ts # ← already exists, no API change
│ ├─ pieces/
│ │ ├─ Piece.ts # UPDATE (generic actions + AP)
│ │ └─ StormBolterMarine.ts # NEW
│ └─ tests/movement.spec.ts # NEW (rules unit tests)
└─ client/
└─ src/
└─ scenes/GameScene.ts # UPDATE (keyboard → engine actions)
```

## 1 `core/Direction.ts`

```tsx
/** Cardinal directions in clockwise order */
export enum Dir { N = 0, E = 1, S = 2, W = 3 }

/** Vector lookup in board coordinates (col,row) */
export const DIR_VEC: Record<Dir, { dc: number; dr: number }> = {
  [Dir.N]: { dc: 0, dr: -1 },
  [Dir.E]: { dc: 1, dr: 0 },
  [Dir.S]: { dc: 0, dr: 1 },
  [Dir.W]: { dc: -1, dr: 0 }
}

/** Returns new facing after turning (-1 = left, +1 = right, 2 = about-face) */
export function turn(facing: Dir, delta: -1 | 1 | 2): Dir {
  return ((facing + (delta === -1 ? 3 : delta)) % 4) as Dir
}

```

## 2 `core/CostTables.ts`

```tsx

import { Dir } from './Direction'

/** Movement cost by delta column & delta row (-1…1) */
export const MOVE_COST: Record<string, number> = {
  '0,-1': 1,  '1,-1': 1,  '-1,-1': 1,   // forward & f-diagonals
  '0,1': 2,   '1,1': 2,   '-1,1': 2,    // backward & b-diagonals
  '1,0': 2,   '-1,0': 2                    // side-steps
}

/** Turning costs */
export const TURN_COST: Record<'LEFT' | 'RIGHT' | 'ABOUT', number> = {
  LEFT: 1,
  RIGHT: 1,
  ABOUT: 2
}

/** AP per full turn */
export const AP_PER_TURN = 4

```

## 3 `pieces/Piece.ts` (update / skeleton)

```tsx

import { Board } from '../board/Board'
import { Dir, DIR_VEC, turn } from '../core/Direction'
import { MOVE_COST, TURN_COST, AP_PER_TURN } from '../core/CostTables'

export type Coord = { c: number; r: number }

export abstract class Piece {
  readonly board: Board
  pos: Coord
  facing: Dir
  ap: number = AP_PER_TURN

  protected constructor(board: Board, start: Coord, facing: Dir) {
    this.board = board
    this.pos = start
    this.facing = facing
  }

  // ---------- public API invoked by UI -----------
  /** Attempt forward/backward/side/diag move relative to current facing. */
  tryMove(dc: number, dr: number): boolean {
    const cost = MOVE_COST[`${dc},${dr}`]
    if (cost === undefined || cost > this.ap) return false

    const dest = { c: this.pos.c + dc, r: this.pos.r + dr }
    if (!this.board.isPassable(dest)) return false

    this.pos = dest
    this.ap -= cost
    return true
  }

  /** Attempt turn: -1 = left, 1 = right, 2 = about-face */
  tryTurn(delta: -1 | 1 | 2): boolean {
    const key = delta === 2 ? 'ABOUT' : delta === -1 ? 'LEFT' : 'RIGHT'
    const cost = TURN_COST[key]
    if (cost > this.ap) return false
    this.facing = turn(this.facing, delta)
    this.ap -= cost
    return true
  }

  /** Convenience helpers for UI */
  moveForward()   { return this.tryMove(...dirToDelta(this.facing)) }
  moveBackward()  { return this.tryMove(...dirToDelta(turn(this.facing, 2))) }

  resetAP() { this.ap = AP_PER_TURN }
}

/** Convert facing dir to (dc,dr) pointing straight forward */
function dirToDelta(d: Dir): [number, number] {
  const v = DIR_VEC[d]
  return [v.dc, v.dr]
}

```

## 4 `pieces/StormBolterMarine.ts`

```tsx

import { Piece, Coord } from './Piece'
import { Board } from '../board/Board'
import { Dir } from '../core/Direction'

export class StormBolterMarine extends Piece {
  constructor(board: Board, start: Coord, facing: Dir = Dir.N) {
    super(board, start, facing)
  }

  /** texture name for Phaser render-layer */
  static readonly SPRITE_KEY = 'terminator_storm_bolter'
}

```

## 5 Engine unit tests – `movement.spec.ts`

```tsx

import { describe, it, expect, beforeEach } from 'vitest'
import { Board } from '../board/Board'
import { StormBolterMarine } from '../pieces/StormBolterMarine'
import { Dir } from '../core/Direction'

/* 3×3 board, centre impassable */
let board: Board
beforeEach(() => {
  board = new Board(3, 3)
  board.get(1,1)!.passable = false         // wall in the middle
})

describe('Storm-Bolter Marine movement & AP', () => {
  it('moves forward and spends 1 AP', () => {
    const m = new StormBolterMarine(board, { c: 1, r: 2 }, Dir.N)
    const ok = m.moveForward()
    expect(ok).toBe(true)
    expect(m.pos).toEqual({ c: 1, r: 1 })
    expect(m.ap).toBe(3)
  })

  it('cannot enter impassable square', () => {
    const m = new StormBolterMarine(board, { c: 1, r: 2 }, Dir.N)
    // forward into wall at 1,1
    board.get(1,1)!.passable = false
    expect(m.moveForward()).toBe(false)
    expect(m.pos).toEqual({ c: 1, r: 2 })
    expect(m.ap).toBe(4)
  })

  it('turns right for 1 AP', () => {
    const m = new StormBolterMarine(board, { c: 0, r: 0 }, Dir.N)
    expect(m.tryTurn(1)).toBe(true)
    expect(m.facing).toBe(Dir.E)
    expect(m.ap).toBe(3)
  })

  it('can’t overspend AP', () => {
    const m = new StormBolterMarine(board, { c: 0, r: 0 }, Dir.N)
    // burn 4 AP with four left turns
    for (let i = 0; i < 4; i++) m.tryTurn(-1)
    expect(m.ap).toBe(0)
    // any further action should fail
    expect(m.tryTurn(-1)).toBe(false)
    expect(m.moveForward()).toBe(false)
  })
})

```

> Board stub for tests
> 
> 
> The existing `Board` class only needs minimal API: `width`, `height`,
> 
> `isPassable(coord)` and `get(c,r)` returning a `Square` with `.passable`
> 
> boolean. Windsurf can extend Board as necessary.
> 

## 6 Client side – `GameScene.ts` updates

- **Preload** a new texture key:

```tsx

this.load.image(
  StormBolterMarine.SPRITE_KEY,
  '/themes/default/terminator_storm_bolter.png'
)

```

- **Create** a marine & sprite:

```tsx

// 1× Marine for demo
this.marine = new StormBolterMarine(this.engine.state.board, { c: 4, r: 4 }, Dir.N)
this.engine.state.pieces = [this.marine]            // (simple array for now)

this.marineSprite = this.add.image(
  this.marine.pos.c * this.tileSize,
  this.marine.pos.r * this.tileSize,
  StormBolterMarine.SPRITE_KEY
).setOrigin(0).setDepth(1)

```

- **Keyboard events**

```tsx

const keys = this.input.keyboard.addKeys('W,S,A,D') as any

this.input.keyboard.on('keydown', () => {
  let acted = false
  if (keys.W.isDown) acted = this.marine.moveForward()
  else if (keys.S.isDown) acted = this.marine.moveBackward()
  else if (keys.A.isDown) acted = this.marine.tryTurn(-1)
  else if (keys.D.isDown) acted = this.marine.tryTurn(1)

  if (acted) refreshSprite()
})

const refreshSprite = () => {
  this.marineSprite.setPosition(
    this.marine.pos.c * this.tileSize,
    this.marine.pos.r * this.tileSize
  )
  this.marineSprite.setRotation(this.marine.facing * Math.PI / 2)
}

```

No HUD yet – AP feedback can be logged to console for the moment.

## 7 Manual QA

1. `pnpm --filter engine test` → vitest passes.
2. `pnpm --filter client dev` and load page.
3. Use **W,S,A,D**: observe marine moves / turns, stops once 4 AP are gone.
4. Try to walk into wall tile defined in JSON mission: movement is blocked, AP unchanged.
5. Sprite rotation aligns with facing.


# IMPLEMENTATION NOTES

The Storm-Bolter Marine implementation required several key components working together:

## Engine Implementation
- Created core direction handling with  enum and vector mapping in 
- Implemented movement cost tables in  to enforce AP rules
- Built the base  class with AP tracking and movement validation
- Added the specialized  class with appropriate sprite key
- Wrote comprehensive unit tests to verify movement, rotation, and AP constraints

## Client Integration
- Updated  to create and manage a marine instance
- Added keyboard handling for WASD controls to trigger marine actions
- Implemented sprite position and rotation updates to reflect marine state
- Created the  method to synchronize the visual representation

## Testing Challenges
- Phaser mocks required careful implementation to support method chaining
- Added missing mock methods (, , ) to fix test failures
- Updated mock objects to include necessary properties (, , )
- Added event handler mocks for keyboard input ()
- Updated test assertions to account for the additional marine sprite in image counts
- Ensured consistent mocking approach across test files by updating both inline mocks and the shared 

The implementation successfully integrates the game engine logic with the Phaser rendering, allowing the marine to move and rotate according to the Space Hulk rules while maintaining proper AP constraints.
