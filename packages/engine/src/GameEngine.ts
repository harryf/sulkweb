import { Board } from './board/Board.js'
import { CompiledMission } from './missions/missionTypes.js'

export interface EngineState {
  board: Board
}

export class GameEngine {
  public readonly state: EngineState

  constructor(mission: CompiledMission) {
    this.state = { board: new Board(mission.width, mission.height, mission.squares) }
  }
}
