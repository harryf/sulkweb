# Milestone 1 - “Turn-phase skeleton”

Create the minimal turn-state machinery under **packages/engine/src**.

### Project tree additions

```tsx
packages/engine/src/
├─ phases/
│ ├─ Phase.ts
│ ├─ ClockAndCP.ts
│ ├─ MarineAction.ts
│ ├─ StealerAction.ts
│ └─ EndPhase.ts
├─ GameCycle.ts
└─ tests/phaseChain.spec.ts
```

---

## 1 `Phase` base – `phases/Phase.ts`

```tsx
/**
 * Abstract phase in the Sulk turn loop.
 * Sub-classes implement `next()` to return the subsequent phase.
 */
export abstract class Phase {
  /** Human-readable phase name. */
  abstract readonly name: string

  /** Called exactly once when the phase becomes active.  Stub for now. */
  onEnter(): void {}

  /**
   * Produces the next phase object.
   * Must never return `this`.
   */
  abstract next(context: GameCycle): Phase
}

```

(add `import { GameCycle } from '../GameCycle'` once GameCycle is created).

## 2 Concrete phase classes

Each lives in its own file, e.g. `ClockAndCP.ts`:

```tsx

import { Phase } from './Phase'
import { GameCycle } from '../GameCycle'

export class ClockAndCP extends Phase {
  readonly name = 'ClockAndCP'
  next(ctx: GameCycle) { return new MarineAction() }
}

export class MarineAction extends Phase {
  readonly name = 'MarineAction'
  next(ctx: GameCycle) { return new StealerAction() }
}

export class StealerAction extends Phase {
  readonly name = 'StealerAction'
  next(ctx: GameCycle) { return new EndPhase() }
}

export class EndPhase extends Phase {
  readonly name = 'EndPhase'
  onEnter() { /* turn ends */ }
  next(ctx: GameCycle) {
    ctx.turnNumber += 1          // advance turn counter here
    return new ClockAndCP()
  }
}

```

*(Each file should import the specific “next” class it returns.)*

---

## 3 `GameCycle` controller – `GameCycle.ts`

```tsx

import { Phase } from './phases/Phase'
import { ClockAndCP } from './phases/ClockAndCP'

export class GameCycle {
  /** Incremented every time EndPhase rolls to ClockAndCP. */
  turnNumber = 1
  phase: Phase

  constructor(initialPhase: Phase = new ClockAndCP()) {
    this.phase = initialPhase
    this.phase.onEnter()
  }

  /** Advance exactly one phase. */
  step(): void {
    this.phase = this.phase.next(this)
    this.phase.onEnter()
  }
}

```

---

## 4 Barrel exports – modify `src/index.ts`

```tsx

export * from './GameCycle'
export * from './phases/Phase'
export * from './phases/ClockAndCP'
export * from './phases/MarineAction'
export * from './phases/StealerAction'
export * from './phases/EndPhase'

```

---

## 5 Unit tests – `__tests__/phaseChain.spec.ts`

```tsx

import { describe, it, expect } from 'vitest'
import { GameCycle } from '../GameCycle'

/**
 * Helper to serialise phase names after N steps.
 */
function phaseSequence(steps: number): string[] {
  const g = new GameCycle()
  const seq = [g.phase.name]
  for (let i = 0; i < steps; i++) {
    g.step()
    seq.push(g.phase.name)
  }
  return seq
}

describe('Turn-phase chain', () => {
  it('follows Clock → Marine → Stealer → End → Clock pattern', () => {
    const seq = phaseSequence(4)
    expect(seq).toEqual([
      'ClockAndCP',
      'MarineAction',
      'StealerAction',
      'EndPhase',
      'ClockAndCP'
    ])
  })

  it('increments turn counter only after EndPhase', () => {
    const g = new GameCycle()
    expect(g.turnNumber).toBe(1)
    g.step()   // Marine
    g.step()   // Stealer
    g.step()   // End
    expect(g.turnNumber).toBe(1) // still old turn
    g.step()   // back to Clock → turn++
    expect(g.turnNumber).toBe(2)
  })

  it('loops correctly for two full cycles', () => {
    const seq = phaseSequence(8)   // two complete loops
    expect(seq[0]).toBe('ClockAndCP')
    expect(seq[4]).toBe('ClockAndCP')
    expect(seq[8]).toBe('ClockAndCP')
  })
})

```

Coverage should show 100 % over every phase file and `GameCycle.ts`.

---

## 6 Acceptance

- `pnpm --filter ./packages/engine test` → all green, 100 % coverage.
- External imports: **no Phaser, no browser globals**.
- `new GameCycle().step()` chain repeats indefinitely without throwing.