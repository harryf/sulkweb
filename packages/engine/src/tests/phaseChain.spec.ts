import { describe, it, expect } from 'vitest'
import { GameCycle } from '../GameCycle.js'

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
