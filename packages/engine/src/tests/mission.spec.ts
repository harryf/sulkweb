import { describe, it, expect } from 'vitest'
import { loadMissionSync } from '../missions/missionLoader.js'
import { GameEngine } from '../GameEngine.js'

const missionPath = new URL('../missions/sampleMission.json', import.meta.url).pathname

describe('Mission loader + GameEngine', () => {
  const mission = loadMissionSync(missionPath)

  it('parses mission JSON', () => {
    expect(mission.name).toBe('Suicide Mission')
    expect(mission.squares.length).toBeGreaterThan(0)
    expect(mission.width).toBeGreaterThan(0)
    expect(mission.height).toBeGreaterThan(0)
  })

  it('GameEngine builds a board', () => {
    const engine = new GameEngine(mission)
    expect(Array.from(engine.state.board.allSquares()).length).toBeGreaterThan(0)
  })
})
