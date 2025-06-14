import { Piece, Coord } from './Piece.js';
import { Board } from '../board/Board.js';
import { Dir } from '../core/Direction.js';

export class StormBolterMarine extends Piece {
  constructor(board: Board, start: Coord, facing: Dir = Dir.N) {
    super(board, start, facing);
  }

  /** texture name for Phaser render-layer */
  static readonly SPRITE_KEY = 'terminator_storm_bolter';
}
