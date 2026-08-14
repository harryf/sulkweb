import { Board } from '../board/Board.js';
import { Dir, DIR_VEC, turn, toRelative } from '../core/Direction.js';
import { MOVE_COST, TURN_COST, AP_PER_TURN } from '../core/CostTables.js';
import { PieceEvents } from '../events/PieceEvents.js';

export type Coord = { c: number; r: number };

export type PieceKind = 'marine' | 'stealer' | 'blip';

export abstract class Piece {
  abstract readonly kind: PieceKind;
  alive = true;
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
    board.addPiece(this);
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
    const rel = toRelative(this.facing, dc, dr);
    const cost = this.moveCost(rel);
    if (cost === undefined || cost > this.ap) return false;

    const dest = { c: this.pos.c + dc, r: this.pos.r + dr };
    if (!this.board.isPassable(dest) || this.board.isOccupied(dest)) return false;

    this.pos = dest;
    this.ap -= cost;
    this.onActed('move');
    PieceEvents.emit('pieceMoved', { pieceId: this.id, x: this.pos.c, y: this.pos.r, facing: this.facing });
    return true;
  }

  /**
   * Toggle a door in one of the three squares ahead (straight, front-left,
   * front-right — per the Sulk manual). Straight ahead wins if several exist.
   * Costs 1 AP.
   */
  useDoor(): boolean {
    if (this.ap < 1) return false;
    const door = this.findAdjacentDoor();
    if (!door) return false;
    // A door under a piece cannot close on it
    if (door.isOpen && this.board.isOccupied({ c: door.square.x, r: door.square.y })) return false;
    door.toggle();
    this.ap -= 1;
    PieceEvents.emit('doorToggled', { x: door.square.x, y: door.square.y, open: door.isOpen });
    return true;
  }

  /** The door this piece could operate, if any (front 3 squares). */
  findAdjacentDoor() {
    const fwd = DIR_VEC[this.facing];
    const left = DIR_VEC[turn(this.facing, -1)];
    const right = DIR_VEC[turn(this.facing, 1)];
    const candidates = [
      { c: this.pos.c + fwd.dc, r: this.pos.r + fwd.dr },
      { c: this.pos.c + fwd.dc + left.dc, r: this.pos.r + fwd.dr + left.dr },
      { c: this.pos.c + fwd.dc + right.dc, r: this.pos.r + fwd.dr + right.dr },
    ];
    for (const coord of candidates) {
      const door = this.board.doorAt(coord);
      if (door) return door;
    }
    return undefined;
  }

  /** Attempt turn: -1 = left, 1 = right, 2 = about-face */
  tryTurn(delta: -1 | 1 | 2): boolean {
    const key = delta === 2 ? 'ABOUT' : delta === -1 ? 'LEFT' : 'RIGHT';
    const cost = this.turnCost(key);
    if (cost > this.ap) return false;
    this.facing = turn(this.facing, delta);
    this.ap -= cost;
    this.onActed('turn');
    PieceEvents.emit('pieceMoved', { pieceId: this.id, x: this.pos.c, y: this.pos.r, facing: this.facing });
    return true;
  }

  /** Remove this piece from play. */
  die(): void {
    if (!this.alive) return;
    this.alive = false;
    this.board.removePiece(this);
    PieceEvents.emit('pieceDied', { pieceId: this.id, kind: this.kind, x: this.pos.c, y: this.pos.r });
  }

  /** Hook fired after a successful move/turn — combat state reacts (sustained fire, overwatch). */
  protected onActed(_action: 'move' | 'turn'): void {}

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

}

/** Convert facing dir to (dc,dr) pointing straight forward */
function dirToDelta(d: Dir): [number, number] {
  const v = DIR_VEC[d];
  return [v.dc, v.dr];
}
