import { Piece, type Coord } from './Piece.js';
import { Board } from '../board/Board.js';
import { Dir, turn } from '../core/Direction.js';
import { PieceEvents } from '../events/PieceEvents.js';

/**
 * Genestealer: 6 AP, fast mover, free 90° turns, deadly in close combat
 * (3 dice from the front, 2 from side/rear). Cannot shoot.
 * Free-turn limit per the original: the SAME 90° direction twice in a row
 * costs 1 AP the second time (`just_turned`); any other action resets it.
 */
export class Genestealer extends Piece {

  static readonly SPRITE_KEY = 'stealer';
  static readonly AP = 6;

  /** Direction of the last free 90° turn (-1 left / 1 right), if unbroken by another action. */
  private lastFreeTurn: -1 | 1 | null = null;

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

  override tryTurn(delta: -1 | 1 | 2): boolean {
    if (this.board.locked) return false;
    const repeat = delta !== 2 && this.lastFreeTurn === delta;
    const cost = delta === 2 ? 1 : repeat ? 1 : 0;
    if (cost > this.ap) return false;
    this.facing = turn(this.facing, delta);
    this.ap -= cost;
    this.lastFreeTurn = delta !== 2 && cost === 0 ? delta : null;
    PieceEvents.emit('pieceMoved', { pieceId: this.id, x: this.pos.c, y: this.pos.r, facing: this.facing });
    return true;
  }

  protected override onActed(_action: 'move' | 'turn' | 'door'): void {
    this.lastFreeTurn = null; // a move/door between turns re-earns the free turn
  }

  override resetAP(): void {
    super.resetAP();
    this.lastFreeTurn = null;
  }

  protected override turnCost(key: 'LEFT' | 'RIGHT' | 'ABOUT'): number {
    return key === 'ABOUT' ? 1 : 0;
  }
}
