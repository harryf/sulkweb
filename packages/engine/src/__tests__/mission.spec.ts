import { describe, it, expect } from 'vitest'
import { loadMission } from '../missions/missionLoader.js'
import { GameEngine } from '../GameEngine.js'

describe('Mission loader + GameEngine', () => {
  it('parses a registered mission', () => {
    const mission = loadMission('space_hulk_1')
    expect(mission.name).toBeTruthy()
    expect(mission.squares.length).toBeGreaterThan(0)
    expect(mission.width).toBeGreaterThan(0)
    expect(mission.height).toBeGreaterThan(0)
  })

  it('caches compiled missions (same object on repeat load)', () => {
    expect(loadMission('space_hulk_1')).toBe(loadMission('space_hulk_1'))
  })

  it('throws on an unknown mission name', () => {
    expect(() => loadMission('no_such_mission' as never)).toThrow(/Mission not found/)
  })

  it('GameEngine builds a board from a compiled mission', () => {
    const engine = new GameEngine(loadMission('debug_1'))
    expect(Array.from(engine.state.board.allSquares()).length).toBeGreaterThan(0)
  })
})
