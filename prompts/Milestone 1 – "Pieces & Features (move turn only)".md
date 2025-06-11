# Milestone 1 – Pieces & Features (move / turn only)

Extend the codebase under **packages/engine/src/** with minimal
implementations for moving pieces and for Doors as board features.

```
packages/engine/src/
├─ rules/ # new folder
│ ├─ directions.ts
│ ├─ Feature.ts
│ ├─ Door.ts
│ ├─ Piece.ts
│ └─ costTables.ts
└─ tests/piece_feature.spec.ts
```

──────────────────────────────────────────────────────────────────────────────

## 1 Directions helper (constants/directions.ts)

```tsx

export type Dir = 0 | 1 | 2 | 3        // 0=N,1=E,2=S,3=W
export const LEFT  = 3  // –90°
export const RIGHT = 1  // +90°
export const BACK  = 2  // +180°
export function rotate(facing: Dir, by: Dir): Dir
export function chebyshev(dx: number, dy: number): number
```

### 2 Movement cost tables – `costTables.ts`

```tsx

import type { Dir } from './directions'

export const MOVE_COST: Record<'F'|'FL'|'FR'|'B'|'L'|'R'|'BL'|'BR', number> = {
  F:1, B:2, L:2, R:2, FL:1, FR:1, BL:2, BR:2
}

export const TURN_COST: Record<Dir, number> = {
  1:1,        // RIGHT
  3:1,        // LEFT
  2:2,        // BACK
  0:0         // no-op
}

```

### 3 `Feature` base

```tsx

export abstract class Feature {
  readonly square: Square        // import from board
  protected constructor(square: Square) { this.square = square }

  /** If true this feature forbids entering its square. */
  abstract blocksMove(): boolean
  /** If true this feature blocks LOS through its square. */
  abstract blocksLOS(): boolean
}

```

### 4 `Door` feature – `Door.ts`

```tsx

export class Door extends Feature {
  private closed = true
  readonly facing: Dir

  constructor(square: Square, facing: Dir) { super(square); this.facing = facing }

  open(): void  { this.closed = false }
  close(): void { this.closed = true }

  toggle(): void { this.closed ? this.open() : this.close() }

  blocksMove() { return this.closed }
  blocksLOS()  { return this.closed }
}

```

*When a Door toggles, its `square.features` set is unchanged (the rules engine consults `blocksMove/LOS` each time).*

### 5 `Piece` base – `Piece.ts`

```tsx

import { Dir, rotate, RIGHT, LEFT, BACK } from './directions'
import { MOVE_COST, TURN_COST }          from './costTables'
import { Board } from '../board/Board'
import { Square } from '../board/Square'

export class Piece {
  readonly board: Board
  square: Square
  facing: Dir
  readonly ap = 4
  apRemaining = 4

  constructor(board: Board, square: Square, facing: Dir = 0) {
    this.board = board
    this.square = square
    this.facing = facing
  }

  /**
   * Returns AP cost to move; undefined if illegal.
   * Ignores diagonal-vs-orthogonal nuance already captured in MOVE_COST.
   */
  canMove(dest: Square): number | undefined {
    if (!this.square.isAdjacent(dest)) return
    const hdg = this.square.headingTo(dest, this.facing)   // returns 'F','FL',etc.
    const cost = MOVE_COST[hdg]
    if (cost === undefined) return
    if (!dest.features.every(f => !f.blocksMove())) return
    return cost <= this.apRemaining ? cost : undefined
  }

  move(dest: Square): boolean {
    const cost = this.canMove(dest)
    if (cost == null) return false
    this.apRemaining -= cost
    this.square = dest
    return true
  }

  canTurn(by: Dir): number | undefined {
    const cost = TURN_COST[by]
    return cost <= this.apRemaining ? cost : undefined
  }

  turn(by: Dir): boolean {
    const cost = this.canTurn(by)
    if (cost == null) return false
    this.apRemaining -= cost
    this.facing = rotate(this.facing, by)
    return true
  }
}

```

Add helper `headingTo` on `Square` (simple eight-way mapping).

### 6 Barrel export (`index.ts`)

```tsx

export * from './board'
export * from './rules/Piece'
export * from './rules/Feature'
export * from './rules/Door'

```

### 7 Unit tests – `__tests__/piece_feature.spec.ts`

Use Vitest to cover:

```tsx

// Build 3×3 board, centre square index (1,1)
const board = new Board(3,3,[ [0,0,0],[0,0,0],[0,0,0] ])
const centre = board.getSquare(1,1)!
const north  = board.getSquare(1,0)!
const east   = board.getSquare(2,1)!
const diag   = board.getSquare(2,0)!

describe('Piece movement & turn costs', () => {
  it('moves forward for 1 AP', () => { /* create piece, expect apRemaining==3 */ })
  it('cannot move without AP', () => { /* set apRemaining=0, expect move fails */ })
  it('turn right costs 1 AP, back costs 2', () => { /* verify */ })
})

describe('Door logic', () => {
  it('closed door blocks move/LOS', () => { /* place Door on north, expect canMove undefined, hasLineOfSight false */ })
  it('open door allows move/LOS', () => { /* door.open(); expect pass */ })
  it('toggle switches state', () => { /* door.toggle() twice give original state */ })
})

```

Aim for **100 % coverage** of `Piece`, `Door`, and cost tables.

### 8 Build & test scripts

No new runtime deps; ensure `packages/engine/package.json` already lists `vitest`.

Acceptance: `pnpm --filter ./packages/engine test` must show 100 % stmt/branch coverage for the new rules files.