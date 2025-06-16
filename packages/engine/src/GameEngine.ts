import { Piece } from './pieces/Piece.js';
import { Board } from './board/Board.js'
import { CompiledMission } from './missions/missionTypes.js'

export interface EngineState {
  board: Board;
  pieces: Piece[];
}

export class GameEngine {
  public readonly state: EngineState

  constructor(mission: CompiledMission, pieces: Piece[] = []) {
    this.state = {
      board: new Board(mission.width, mission.height, mission.squares),
      pieces
    }
  }

  findPiece(id: string): Piece | undefined {
    return this.state.pieces.find(p => p.id === id)
  }
}
