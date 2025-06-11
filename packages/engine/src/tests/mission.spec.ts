import { describe, it, expect } from 'vitest'
import { loadMissionSync } from '../missions/missionLoader.js'
import { GameEngine } from '../GameEngine.js'

const missionPath = new URL('../missions/sampleMission.json', import.meta.url).pathname

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
    expect(Array.from(engine.state.board.allSquares()).length).toBeGreaterThan(0)
  })
})
