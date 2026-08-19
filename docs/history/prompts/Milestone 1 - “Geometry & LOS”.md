# Milestone 1 - “Geometry & LOS”

You are generating the *engine-only* logic (no Phaser) for Sulk-Web.

Implement a pure-TypeScript `board/` module under **packages/engine/src/** that provides:

```jsx
└─ packages/engine/src/
├─ board/
│ ├─ Square.ts
│ ├─ Section.ts
│ ├─ Board.ts
│ └─ los.ts
├─ index.ts // barrel export
└─ tests/los.spec.ts // Vitest unit suite
```

### 1 Geometry primitives

### 1.1 `Square`

| Property | Type | Description |
| --- | --- | --- |
| `coord` | `readonly [number, number]` | Integer grid coordinates *(x right, y down)*. |
| `sectionId` | `number` | Identifier of the room this square belongs to (`0` = corridor). |
| `features` | `Set<'BLOCK_MOVE' \| 'BLOCK_LOS'>` | Minimal flags so LOS can consult obstacles. |

Helpers:

```tsx
isAdjacent(other: Square): boolean            // 8-direction adjacency
distance(other: Square): number              // Chebyshev distance
headingTo(other: Square): 'F'|'R'|'B'|'L'|... // F,FL,FR,... (for future use)

```

### 1.2 `Section`

Simple wrapper:

```tsx

export interface Section { id: number; squares: Square[] }

```

### 1.3 `Board`

Constructor accepts:

```tsx

new Board(width: number, height: number, sectionMap: number[][])

```

- Builds `Square` instances row-major.
- Populates an internal `coordMap: Map<string, Square>`.
- Exposes:

```tsx

getSquare(x: number, y: number): Square | undefined
adjacentsOf(square: Square): Square[]                  // cached
allSquares(): Iterable<Square>

```

### 2 LOS algorithm – `los.ts`

Export a single pure function:

```tsx

/**
 * True iff a straight-line LOS exists from a -> b.
 *  - Uses integer square centres.
 *  - Blocks if *either* square contains a 'BLOCK_LOS' feature (except endpoints).
 */
export function hasLineOfSight(board: Board, a: Square, b: Square): boolean

```

Rules:

1. Same square → `true`.
2. Orthogonal & diagonal rays: walk Bresenham line (8-way).
3. For *oblique* angles (non-45°), step along line at `max(|dx|,|dy|)` samples.
4. If any intermediate sample lands in a Square whose `features`
    
    contains `'BLOCK_LOS'`, return `false`.
    

*(No path-finding yet; only LOS.)*

### 3 Exports

`packages/engine/src/index.ts`

```tsx

export * from './board/Board'
export * from './board/Square'
export * from './board/Section'
export { hasLineOfSight } from './board/los'

```

### 4 Unit tests – `__tests__/los.spec.ts`

- Use Vitest (already installed).
- Build a **5 × 5 test board**:

```

0 0 0 0 0
0 x 0 x 0
0 0 A 0 0
0 x 0 x 0
0 0 0 0 0

```

`x` squares contain `'BLOCK_LOS'`.

Test matrix (expectations):

| Case | Coord A | Coord B | Expected |
| --- | --- | --- | --- |
| Orthogonal clear | (2,2) | (2,0) | `true` |
| Orthogonal blocked | (2,2) | (2,4) crosses (2,3) with blocker | `false` |
| Diagonal clear | (2,2) | (0,0) | `true` |
| Diagonal blocked | (2,2) | (4,4) crosses (3,3) blocker | `false` |
| Oblique clear | (0,2) | (4,3) | `true` |
| Oblique blocked | (0,1) | (4,2) crosses (2,2) blocker | `false` |
| Same square | (2,2) | (2,2) | `true` |

Add an assertion that **every `Square.isAdjacent()`** matches expected 8-way neighbourhood for centre square (2,2).

Ensure test coverage reports 100 % across `board/` and `los.ts`.

### 5 Package wiring

- `packages/engine/tsconfig.json` – add `"composite": true` so client can import.
- No runtime deps. Add `"vitest": "^1.4.2"` to `devDependencies` of root if not already.

### 6 Done criteria

- `pnpm --filter ./packages/engine test` → all green, 100 % coverage.
- *No* file in `engine` imports Phaser or browser APIs.
- `hasLineOfSight` returns correct results for truth-table.

Document every public class or function with TSDoc so later code-gen can read hints.