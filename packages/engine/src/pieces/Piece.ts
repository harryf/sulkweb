import { Board } from '../board/Board.js';
import { Dir, DIR_VEC, turn } from '../core/Direction.js';
import { MOVE_COST, TURN_COST, AP_PER_TURN } from '../core/CostTables.js';

export type Coord = { c: number; r: number };

export abstract class Piece {
  readonly board: Board;
  pos: Coord;
  facing: Dir;
  ap: number = AP_PER_TURN;

  protected constructor(board: Board, start: Coord, facing: Dir) {
    this.board = board;
    this.pos = start;
    this.facing = facing;
  }

  // ---------- public API invoked by UI -----------
  /** Attempt forward/backward/side/diag move relative to current facing. */
  tryMove(dc: number, dr: number): boolean {
    const cost = MOVE_COST[`${dc},${dr}`];
    if (cost === undefined || cost > this.ap) return false;

    // Resolve relative dc, dr to absolute board coordinates based on facing
    // This part seems to be missing from the user's provided code for tryMove.
    // The user's tryMove directly uses dc, dr as if they are already world-relative.
    // However, the comment says "relative to current facing".
    // For now, I will implement it as provided, assuming dc, dr are world-relative for tryMove.
    // If they are meant to be piece-relative, this logic needs adjustment.
    // The moveForward/moveBackward methods correctly transform to world-relative.

    const dest = { c: this.pos.c + dc, r: this.pos.r + dr };
    if (!this.board.isPassable(dest)) return false;

    this.pos = dest;
    this.ap -= cost;
    return true;
  }

  /** Attempt turn: -1 = left, 1 = right, 2 = about-face */
  tryTurn(delta: -1 | 1 | 2): boolean {
    const key = delta === 2 ? 'ABOUT' : delta === -1 ? 'LEFT' : 'RIGHT';
    const cost = TURN_COST[key];
    if (cost > this.ap) return false;
    this.facing = turn(this.facing, delta);
    this.ap -= cost;
    return true;
  }

  /** Convenience helpers for UI */
  moveForward()   { return this.tryMove(...dirToDelta(this.facing)); }
  moveBackward()  { return this.tryMove(...dirToDelta(turn(this.facing, 2))); }

  resetAP() { this.ap = AP_PER_TURN; }
}

/** Convert facing dir to (dc,dr) pointing straight forward */
function dirToDelta(d: Dir): [number, number] {
  const v = DIR_VEC[d];
  return [v.dc, v.dr];
}
