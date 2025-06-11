import { Dir, rotate } from './directions.js';
import { MOVE_COST, TURN_COST } from './costTables.js';
import { Board } from '../board/Board.js';
import { Square } from '../board/Square.js';

export class Piece {
  readonly board: Board
  square: Square
  facing: Dir
  readonly ap = 4
  apRemaining = 4

  constructor(board: Board, square: Square, facing: Dir = 0) {
    this.board = board
    this.square = square
    this.facing = facing
  }

  /**
   * Returns AP cost to move; undefined if illegal.
   * Ignores diagonal-vs-orthogonal nuance already captured in MOVE_COST.
   */
  canMove(dest: Square): number | undefined {
    if (!this.square.isAdjacent(dest)) return
    const hdg = this.square.headingTo(dest, this.facing)   // returns 'F','FL',etc.
    if (hdg === '') return; // Should not happen if isAdjacent is true
    const cost = MOVE_COST[hdg];

    
    for (const feature of dest.features) {
      if (feature.blocksMove()) {
        return undefined;
      }
    }

    return cost <= this.apRemaining ? cost : undefined
  }

  move(dest: Square): boolean {
    const cost = this.canMove(dest)
    if (cost == null) return false
    this.apRemaining -= cost
    this.square = dest
    return true
  }

  canTurn(by: Dir): number | undefined {
    const cost = TURN_COST[by]
    return cost <= this.apRemaining ? cost : undefined
  }

  turn(by: Dir): boolean {
    const cost = this.canTurn(by)
    if (cost == null) return false
    this.apRemaining -= cost
    this.facing = rotate(this.facing, by)
    return true
  }
}
