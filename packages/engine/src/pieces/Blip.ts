import { Piece, type Coord } from './Piece.js';
import { Board } from '../board/Board.js';
import { Dir } from '../core/Direction.js';
import { Genestealer } from './Genestealer.js';
import { PieceEvents } from '../events/PieceEvents.js';

/**
 * A blip: sensor contact hiding 1-3 genestealers. 6 AP, moves any direction
 * for 1 AP, no facing, cannot fight. Converts to genestealers when revealed.
 */
export class Blip extends Piece {

  static readonly SPRITE_KEY = 'blip';

  /** Hidden stealer count (1-3), secret from the marine player. */
  readonly value: number;

  constructor(board: Board, start: Coord, value?: number) {
    super('blip', board, start, Dir.S, 6);
    this.value = value ?? Math.ceil(board.dice.roll() / 2); // d6 → 1-3 stealers
  }

  protected override moveCost(): number | undefined {
    return 1; // any of the 8 directions
  }

  protected override turnCost(): number {
    return 0; // no facing — turning is meaningless but harmless
  }

  /**
   * Replace this blip with its genestealers: one on the blip square, the rest
   * on adjacent free squares. Stealers that don't fit are lost (and do NOT
   * count as marine kills). Returns the new stealers.
   */
  convert(): Genestealer[] {
    const board = this.board;
    const origin = { ...this.pos };
    // Remove the blip silently — conversion is not a death
    board.removePiece(this);
    this.alive = false;

    const spots: Coord[] = [origin];
    const around = board.get(origin.c, origin.r);
    if (around) {
      for (const sq of board.adjacentsOf(around)) {
        const coord = { c: sq.x, r: sq.y };
        if (board.isPassable(coord) && !board.isOccupied(coord)) spots.push(coord);
      }
    }
    const stealers: Genestealer[] = [];
    for (let i = 0; i < this.value && i < spots.length; i++) {
      stealers.push(new Genestealer(board, spots[i], Dir.S));
    }
    PieceEvents.emit('blipConverted', {
      blipId: this.id, x: origin.c, y: origin.r,
      stealerIds: stealers.map(s => s.id), lost: this.value - stealers.length
    });
    return stealers;
  }
}
