import { Board } from '../board/Board.js';
import { Dir, DIR_VEC, turn } from '../core/Direction.js';
import { MOVE_COST, TURN_COST, AP_PER_TURN } from '../core/CostTables.js';

export type Coord = { c: number; r: number };

export abstract class Piece {
  private static nextId = 0;
  readonly id: string;
  readonly board: Board;
  pos: Coord;
  facing: Dir;
  ap: number;

  protected constructor(board: Board, start: Coord, facing: Dir, apPerTurn: number = AP_PER_TURN) {
    this.id = `p_${Piece.nextId++}`;
    this.board = board;
    this.pos = start;
    this.facing = facing;
    this.apInitial = apPerTurn;
    this.ap = apPerTurn;
  }

  /** Full AP pool at the start of each turn. */
  readonly apInitial: number;

  /** AP left this turn — alias kept in sync with `ap` for UI consumers. */
  get apRemaining(): number { return this.ap; }

  // ---------- public API invoked by UI -----------
  /**
   * Attempt a move by world-space delta (dc, dr). The AP cost is determined
   * by the delta *relative to the piece's facing* (forward 1, back/side 2).
   */
  tryMove(dc: number, dr: number): boolean {
    const rel = this.toRelative(dc, dr);
    const cost = this.moveCost(rel);
    if (cost === undefined || cost > this.ap) return false;

    const dest = { c: this.pos.c + dc, r: this.pos.r + dr };
    if (!this.board.isPassable(dest)) return false;

    this.pos = dest;
    this.ap -= cost;
    return true;
  }

  /** Attempt turn: -1 = left, 1 = right, 2 = about-face */
  tryTurn(delta: -1 | 1 | 2): boolean {
    const key = delta === 2 ? 'ABOUT' : delta === -1 ? 'LEFT' : 'RIGHT';
    const cost = this.turnCost(key);
    if (cost > this.ap) return false;
    this.facing = turn(this.facing, delta);
    this.ap -= cost;
    return true;
  }

  /** Convenience helpers for UI */
  moveForward()   { return this.tryMove(...dirToDelta(this.facing)); }
  moveBackward()  { return this.tryMove(...dirToDelta(turn(this.facing, 2))); }
  stepLeft()      { return this.tryMove(...dirToDelta(turn(this.facing, -1))); }
  stepRight()     { return this.tryMove(...dirToDelta(turn(this.facing, 1))); }

  resetAP() { this.ap = this.apInitial; }

  /** Movement cost for a facing-relative delta — subclasses override (e.g. blips). */
  protected moveCost(rel: { dc: number; dr: number }): number | undefined {
    return MOVE_COST[`${rel.dc},${rel.dr}`];
  }

  /** Turning cost — subclasses override (e.g. genestealers turn free). */
  protected turnCost(key: 'LEFT' | 'RIGHT' | 'ABOUT'): number {
    return TURN_COST[key];
  }

  /**
   * Rotate a world-space delta into the piece's facing-relative frame,
   * so that "straight ahead" is always (0,-1) regardless of facing.
   */
  private toRelative(dc: number, dr: number): { dc: number; dr: number } {
    let rc = dc, rr = dr;
    for (let i = 0; i < this.facing; i++) {
      const t = rc;
      rc = rr;
      rr = -t;
    }
    return { dc: rc, dr: rr };
  }
}

/** Convert facing dir to (dc,dr) pointing straight forward */
function dirToDelta(d: Dir): [number, number] {
  const v = DIR_VEC[d];
  return [v.dc, v.dr];
}
