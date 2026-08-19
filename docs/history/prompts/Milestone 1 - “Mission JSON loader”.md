# Milestone 1 - “Mission JSON loader”

You are extending **packages/engine**.

Implement the ability to read **one simple mission JSON** (board only) and
construct a Board through a new `GameEngine`.

# Project additions

```
packages/engine/
├─ missions/
│ ├─ sampleMission.json # 10×10 corridor demo
│ ├─ missionTypes.ts
│ └─ missionLoader.ts
├─ GameEngine.ts
└─ src/tests/mission.spec.ts
```

---

## 1 Mission JSON format

`sampleMission.json`

```json
{
  "name": "Demo Board",
  "board": [
    /* list of [x,y] coords; every square is corridor, sectionId = 0 */
    [0,0],[1,0],[2,0],[3,0],[4,0],
    [0,1],[1,1],[2,1],[3,1],[4,1],
    [0,2],[1,2],[2,2],[3,2],[4,2],
    [0,3],[1,3],[2,3],[3,3],[4,3],
    [0,4],[1,4],[2,4],[3,4],[4,4]
  ]
}

```

Five-by-five grid is enough to prove the loader.

## 2 Type definitions — `missionTypes.ts`

```tsx

export interface RawMissionJSON {
  name: string
  board: [number, number][]
}

export interface CompiledMission {
  name: string
  width: number
  height: number
  coords: [number, number][]
}

```

---

## 3 `missionLoader.ts`

```tsx

import fs from 'node:fs'
import path from 'node:path'
import { RawMissionJSON, CompiledMission } from './missionTypes'

/** Throws if JSON invalid. */
export function loadMissionSync(jsonPath: string): CompiledMission {
  const raw = JSON.parse(
    fs.readFileSync(path.resolve(jsonPath), 'utf-8')
  ) as RawMissionJSON

  // basic validation
  if (!raw.board?.length) throw new Error('board missing/empty')

  const xs = raw.board.map(c => c[0])
  const ys = raw.board.map(c => c[1])
  const width  = Math.max(...xs) + 1
  const height = Math.max(...ys) + 1

  return {
    name: raw.name,
    width,
    height,
    coords: raw.board
  }
}

```

No runtime `fs` in browser—this util is Node-only and used during tests or build-time.

---

## 4 `GameEngine.ts`

```tsx

import { Board } from './src/board/Board'
import { CompiledMission } from './missions/missionTypes'

export interface EngineState {
  board: Board
}

export class GameEngine {
  state: EngineState

  constructor(mission: CompiledMission) {
    const sectionMap = Array.from({ length: mission.height }, () =>
      Array.from({ length: mission.width }, () => 0)
    )
    // mark squares present in mission.coords
    mission.coords.forEach(([x, y]) => { sectionMap[y][x] = 0 })
    this.state = {
      board: new Board(mission.width, mission.height, sectionMap)
    }
  }
}

```

*All squares are corridor (`sectionId 0`); that’s sufficient for now.*

Export `GameEngine` from root `index.ts`.

---

## 5 Unit tests — `src/__tests__/mission.spec.ts`

```tsx

import { describe, it, expect } from 'vitest'
import { loadMissionSync } from '../../missions/missionLoader'
import { GameEngine } from '../../GameEngine'

const missionPath = new URL('../../missions/sampleMission.json', import.meta.url).pathname

describe('Mission loader + GameEngine', () => {
  const mission = loadMissionSync(missionPath)

  it('parses mission JSON', () => {
    expect(mission.name).toBe('Demo Board')
    expect(mission.coords.length).toBe(25)
    expect(mission.width).toBe(5)
    expect(mission.height).toBe(5)
  })

  it('GameEngine builds a board', () => {
    const engine = new GameEngine(mission)
    expect(engine.state.board.allSquares().length).toBeGreaterThan(0)
  })
})

```

---

## 6 Exports

Update `src/index.ts`:

```tsx

export * from './GameEngine'
export { loadMissionSync } from './missions/missionLoader'
export * from './missions/missionTypes'

```

---

## 7 Acceptance checklist

- `pnpm --filter ./packages/engine test` passes.
- `GameEngine` takes the compiled mission and produces a non-empty board.
- No Phaser or browser globals imported.