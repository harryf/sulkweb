import { Piece, type Coord } from './Piece.js';
import { Board } from '../board/Board.js';
import { Dir } from '../core/Direction.js';

/**
 * Genestealer: 6 AP, fast mover, free 90° turns, deadly in close combat
 * (3 dice from the front, 2 from side/rear). Cannot shoot.
 */
export class Genestealer extends Piece {

  static readonly SPRITE_KEY = 'stealer';
  static readonly AP = 6;

  constructor(board: Board, start: Coord, facing: Dir = Dir.S) {
    super('stealer', board, start, facing, Genestealer.AP);
  }

  protected override moveCost(rel: { dc: number; dr: number }): number | undefined {
    const key = `${rel.dc},${rel.dr}`;
    const COSTS: Record<string, number> = {
      '0,-1': 1, '1,-1': 1, '-1,-1': 1,  // forward & forward diagonals
      '1,0': 1, '-1,0': 1,               // side-steps
      '0,1': 2, '1,1': 2, '-1,1': 2,     // backward & backward diagonals
    };
    return COSTS[key];
  }

  protected override turnCost(key: 'LEFT' | 'RIGHT' | 'ABOUT'): number {
    return key === 'ABOUT' ? 1 : 0;
  }
}
