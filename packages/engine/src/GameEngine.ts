import { Board } from './board/Board.js'
import { CompiledMission } from './missions/missionTypes.js'

export interface EngineState {
  board: Board
}

export class GameEngine {
  state: EngineState

  constructor(mission: CompiledMission) {
    const sectionMap = Array.from({ length: mission.height }, () =>
      Array.from({ length: mission.width }, () => -1) // Initialize with -1 (or another value for non-mission squares)
    )
    // mark squares present in mission.coords
    mission.coords.forEach(([x, y]: [number, number]) => { sectionMap[y][x] = 0 }) // sectionId = 0 for corridor
    this.state = {
      board: new Board(mission.width, mission.height, sectionMap)
    }
  }
}
