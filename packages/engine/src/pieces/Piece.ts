import { Board } from '../board/Board.js';
import { Dir, DIR_VEC, turn, toRelative } from '../core/Direction.js';
import { MOVE_COST, TURN_COST, AP_PER_TURN } from '../core/CostTables.js';
import { PieceEvents } from '../events/PieceEvents.js';
import { dropCat } from '../rules/exotic.js';

export type Coord = { c: number; r: number };

export type PieceKind = 'marine' | 'stealer' | 'blip';

export abstract class Piece {
  // Assigned in the constructor (not a subclass field initializer): the base
  // constructor calls board.addPiece(this), which emits pieceAdded — kind must
  // already be set at emit time or every listener sees `undefined`.
  readonly kind: PieceKind;
  alive = true;
  private static nextId = 0;
  readonly id: string;
  readonly board: Board;
  pos: Coord;
  facing: Dir;
  ap: number;

  protected constructor(kind: PieceKind, board: Board, start: Coord, facing: Dir, apPerTurn: number = AP_PER_TURN) {
    this.kind = kind;
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

  /** Power-sword parry (beta_2 sword sergeant): may force one reroll of the
   *  opponent's best close-combat die when losing or tied. */
  readonly parry: boolean = false;
  /** Flat bonus added to every close-combat die (sergeant +1, etc). */
  readonly ccBonus: number = 0;

  /** Extra marine-phase seconds this piece grants while alive (sergeant +30). */
  readonly timerBonus: number = 0;

  /** Client texture key — subclasses override via their static SPRITE_KEY. */
  get spriteKey(): string {
    return (this.constructor as { SPRITE_KEY?: string }).SPRITE_KEY ?? this.kind;
  }

  /** AP left this turn — alias kept in sync with `ap` for UI consumers. */
  get apRemaining(): number { return this.ap; }

  // ---------- public API invoked by UI -----------
  /**
   * Attempt a move by world-space delta (dc, dr). The AP cost is determined
   * by the delta *relative to the piece's facing* (forward 1, back/side 2).
   */
  tryMove(dc: number, dr: number): boolean {
    if (this.board.locked) return false;
    const rel = toRelative(this.facing, dc, dr);
    const cost = this.moveCost(rel);
    if (cost === undefined || cost > this.ap) return false;

    const dest = { c: this.pos.c + dc, r: this.pos.r + dr };
    // A piece already standing in flames may move through/out of burning
    // squares; everyone else is barred from entering them (original rule).
    const ignoreFlames = this.board.isFlaming(this.pos);
    if (!this.board.isPassable(dest, ignoreFlames) || this.board.isOccupied(dest)) return false;
    // Edge-model doors: an orthogonal move crossing a closed door edge is
    // blocked. (Diagonals cannot cross an edge's interior — corridors here are
    // one square wide, so no diagonal bypass exists on the shipped missions.)
    if (dc === 0 || dr === 0) {
      const door = this.board.doorBetween(this.pos, dest);
      if (door && !door.isOpen) return false;
    }

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
    door.toggle();
    this.ap -= 1;
    this.onActed('door');
    PieceEvents.emit('doorToggled', { x: door.square.x, y: door.square.y, facing: door.facing, open: door.isOpen });
    return true;
  }

  /**
   * The door edge this piece could operate: the edge to the square straight
   * ahead wins; otherwise any door edge incident to one of the three front
   * squares (Sulk manual front-3 rule, translated to edges). Edges purely
   * behind the piece are unreachable.
   */
  findAdjacentDoor() {
    const fwd = DIR_VEC[this.facing];
    const left = DIR_VEC[turn(this.facing, -1)];
    const right = DIR_VEC[turn(this.facing, 1)];
    const ahead = { c: this.pos.c + fwd.dc, r: this.pos.r + fwd.dr };
    const direct = this.board.doorBetween(this.pos, ahead);
    if (direct) return direct;

    const fronts = [
      ahead,
      { c: ahead.c + left.dc, r: ahead.r + left.dr },
      { c: ahead.c + right.dc, r: ahead.r + right.dr },
    ];
    const ORTHO = [{ dc: 0, dr: -1 }, { dc: 1, dr: 0 }, { dc: 0, dr: 1 }, { dc: -1, dr: 0 }];
    for (const f of fronts) {
      for (const v of ORTHO) {
        const n = { c: f.c + v.dc, r: f.r + v.dr };
        const door = this.board.doorBetween(f, n);
        if (door) return door;
      }
    }
    return undefined;
  }

  /** Attempt turn: -1 = left, 1 = right, 2 = about-face */
  tryTurn(delta: -1 | 1 | 2): boolean {
    if (this.board.locked) return false;
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
    // A dying C.A.T. carrier drops it where he fell (original dead_drop).
    if (this.board.cat?.carrierId === this.id) {
      dropCat(this.board, this.pos);
    }
    // Original teams.py casualty counting (every kill() path lands here, so a
    // single counting point covers shots, CC, flames and self-destruct; blip
    // CONVERSION removes via board.removePiece and never counts).
    if (this.kind !== 'marine') {
      this.board.stealerCasualties += this.casualtyWorth;
      PieceEvents.emit('casualtiesChanged', { casualties: this.board.stealerCasualties });
    }
    PieceEvents.emit('pieceDied', { pieceId: this.id, kind: this.kind, x: this.pos.c, y: this.pos.r });
  }

  /** Kill-quota credit for this piece's death — blips override with their VALUE. */
  protected get casualtyWorth(): number { return 1; }

  /** Hook fired after a successful move/turn/door — combat state reacts (sustained fire, overwatch, move-and-shoot). */
  protected onActed(_action: 'move' | 'turn' | 'door'): void {}

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
