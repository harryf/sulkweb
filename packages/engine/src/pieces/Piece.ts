import { Board } from '../board/Board.js';
import { Dir, DIR_VEC, ORTHO_VECS, turn, toRelative } from '../core/Direction.js';
import { MOVE_COST, TURN_COST, TUNING } from '../core/CostTables.js';
import { PieceEvents } from '../events/PieceEvents.js';
import { dropCat } from '../rules/exotic.js';
import type { MarineOrder } from '../core/Commands.js';

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

  protected constructor(kind: PieceKind, board: Board, start: Coord, facing: Dir, apCap?: number) {
    this.kind = kind;
    this.id = `p_${Piece.nextId++}`;
    this.board = board;
    this.pos = start;
    this.facing = facing;
    this.apInitial = apCap ?? TUNING.apCap[kind];
    this.ap = this.apInitial;
    board.addPiece(this);
  }

  /** AP pool cap (2.x): regeneration stops here. Also the full pool a piece
   *  starts with. The name predates the clock; UI consumers read it. */
  readonly apInitial: number;

  /** Ticks accumulated toward the next regenerated AP (2.x). */
  private regenCounter = 0;

  /** Tick of the last direct player command: the default AI leaves a marine
   *  alone for TUNING.leaseTicks after it (the direct-control lease). */
  lastCommandTick = -Infinity;
  /** Set by the order executor around a squad-task action (2.x stage 4
   *  transit rule A): a bolter moving in formation keeps his overwatch. */
  inFormation = false;

  /** The live individual order (2.x stage 2), executed by the default AI;
   *  null when the marine is on his own. Set only through GameEngine.command
   *  and ai/orders.ts setOrder so the orderChanged event never lies. */
  order: MarineOrder | null = null;

  /** The squad task (2.x stage 3): the L2 slot, written only by the squad
   *  planners (ai/squad.ts) and executed exactly like an order once the L1
   *  slot is empty. A direct command never touches it. */
  task: MarineOrder | null = null;

  /** Ticks the live order or task has made no progress on a full AP pool;
   *  TUNING.orderStallTicks of them drop it (a blocked walk, a door someone
   *  else opened). */
  orderStall = 0;

  /** Deployment squad tag (mission roster grouping); undefined for pieces
   *  placed outside the deployment list. Set by GameEngine at construction. */
  squad: string | undefined = undefined;

  /**
   * One tick of AP regeneration (engine tick step 1): +1 AP every
   * TUNING.regen[kind] ticks up to the cap. A full piece banks nothing: the
   * counter holds at zero, so a spend always restarts a whole interval.
   * Returns true when an AP was gained.
   */
  regenerate(): boolean {
    if (!this.alive) return false;
    if (this.ap >= this.apInitial) { this.regenCounter = 0; return false; }
    this.regenCounter += 1;
    if (this.regenCounter < TUNING.regen[this.kind]) return false;
    this.regenCounter = 0;
    this.ap += 1;
    if (this.ap >= this.apInitial) this.onRefilled();
    return true;
  }

  /** The pool just reached its cap (regeneration or a test refill): a fresh
   *  activation in 1.x terms. Blips clear their "has acted" flag here. */
  protected onRefilled(): void {}

  /** Per-tick bookkeeping hook (engine tick step 5): subclasses age their
   *  timers here (sustained fire, blip idleness). Absolute tick passed in. */
  onTick(_tick: number): void {}

  /** Power-sword parry (beta_2 sword sergeant): may force one reroll of the
   *  opponent's best close-combat die when losing or tied. */
  readonly parry: boolean = false;
  /** Flat bonus added to every close-combat die (sergeant +1, etc). */
  readonly ccBonus: number = 0;

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
    // blocked. A diagonal move crosses the CORNER shared by four edges — if
    // any of them carries a closed door, the move squeezes past the door's
    // end through a gap the original's door SQUARE physically filled (e.g.
    // (18,20)→(19,19) would slip into Launch Control past its closed door).
    if (dc === 0 || dr === 0) {
      const door = this.board.doorBetween(this.pos, dest);
      if (door && !door.isOpen) return false;
    } else if (this.board.diagonalBlockedByDoor(this.pos, dest)) {
      return false;
    }

    this.pos = dest;
    this.ap -= cost;
    this.board.touch();
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
    if (this.board.locked || this.ap < 1) return false;
    const door = this.findAdjacentDoor();
    if (!door) return false;
    door.toggle();
    if (door.isOpen && this.kind === 'marine') door.lastOpenedByMarine = this.board.tick;
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
    for (const f of fronts) {
      for (const v of ORTHO_VECS) {
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
    this.board.touch();
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

  /** Diagonal moves, facing-relative (original numpad KP7/KP9/KP1/KP3).
   *  Costs come from MOVE_COST: forward diagonals price as a forward move,
   *  backward diagonals as a backward move. Facing never changes. */
  private moveDiag(side: -1 | 1, dir: 1 | -1): boolean {
    const f = DIR_VEC[dir === 1 ? this.facing : turn(this.facing, 2)];
    const s = DIR_VEC[turn(this.facing, side)];
    return this.tryMove(f.dc + s.dc, f.dr + s.dr);
  }
  moveForwardLeft()  { return this.moveDiag(-1, 1); }
  moveForwardRight() { return this.moveDiag(1, 1); }
  moveBackLeft()     { return this.moveDiag(-1, -1); }
  moveBackRight()    { return this.moveDiag(1, -1); }

  /** Refill the pool. No longer called by the engine (2.x regenerates per
   *  tick); kept for direct-driven unit tests that stage a piece's next
   *  activation. */
  resetAP() { this.ap = this.apInitial; this.onRefilled(); }

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
