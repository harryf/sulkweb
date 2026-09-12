import { Piece, type Coord } from './Piece.js';
import { Board } from '../board/Board.js';
import { Dir, chebyshev, facingToward } from '../core/Direction.js';
import { Genestealer } from './Genestealer.js';
import { PieceEvents } from '../events/PieceEvents.js';
import { squareSeenByMarine } from '../board/vision.js';
import { TUNING } from '../core/CostTables.js';

/**
 * The original blip bag (`BLIP_SET_BASIC = {1:8, 2:4, 3:9}`): draw with
 * replacement, weighted 8/4/9 over 21. Sampled from the board dice source so
 * seeded games stay deterministic: two d6 form a uniform 1..36; values above
 * 21 are redrawn (rejection sampling keeps the weights exact).
 */
export function drawBlipValue(board: Board): number {
  for (;;) {
    const v = (board.dice.roll() - 1) * 6 + board.dice.roll(); // uniform 1..36
    if (v <= 8) return 1;
    if (v <= 12) return 2;
    if (v <= 21) return 3;
  }
}

/**
 * A blip: sensor contact hiding 1-3 genestealers. 6 AP, moves any direction
 * for 1 AP, no facing, cannot fight. May never voluntarily step into marine
 * sight or next to a marine (original rule); converts to genestealers the
 * moment a marine sees it.
 */
export class Blip extends Piece {

  static readonly SPRITE_KEY: string = 'blip';

  /** Hidden stealer count (1-3), secret from the marine player. */
  readonly value: number;

  /** Ticks since the blip last moved (2.x); never acted = still fresh. */
  private idleTicks = 0;
  private acted = false;

  constructor(board: Board, start: Coord, value?: number) {
    super('blip', board, start, Dir.S);
    this.value = value ?? drawBlipValue(board);
  }

  override onTick(): void { this.idleTicks += 1; }

  protected override onActed(): void {
    this.acted = true;
    this.idleTicks = 0;
  }

  /** A full pool is a fresh activation: the original "taken no action" rule
   *  reads as "spent nothing since the pool was last full". */
  protected override onRefilled(): void { this.acted = false; }

  /** A killed blip credits its full hidden VALUE (original pieces.py kill()). */
  protected override get casualtyWorth(): number { return this.value; }

  protected override moveCost(): number | undefined {
    return 1; // any of the 8 directions
  }

  protected override turnCost(): number {
    return 0; // no facing — turning is meaningless but harmless
  }

  /** Blips may not move into marine LOS or adjacent (8-way) to a marine. */
  override tryMove(dc: number, dr: number): boolean {
    const dest = { c: this.pos.c + dc, r: this.pos.r + dr };
    if (blipBarredFrom(this.board, dest)) return false;
    return super.tryMove(dc, dr);
  }

  /** Voluntary conversion is legal while the blip has spent nothing since
   *  its pool was last full (the original "taken no action" rule) or, in
   *  real time, once it has sat idle for TUNING.blipIdleTicks ticks (a blip
   *  parked at a door it will not open must still break the deadlock). */
  canConvert(): boolean {
    return !this.acted || this.idleTicks >= TUNING.blipIdleTicks;
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
        if (!board.isPassable(coord) || board.isOccupied(coord)) continue;
        // Emerging stealers must be one LEGAL step from the blip square: a
        // closed door edge (or its corner, for diagonals) is a wall — a blip
        // must never split itself across a door it could not walk through.
        const diagonal = coord.c !== origin.c && coord.r !== origin.r;
        if (diagonal
          ? board.diagonalBlockedByDoor(origin, coord)
          : board.doorBetween(origin, coord)?.isOpen === false) continue;
        spots.push(coord);
      }
    }
    // Each emerging stealer faces its nearest living marine (Chebyshev,
    // board-order tie), the same orientation the hive's charge sweep would
    // give it at phase end: a contact that just burst out of hiding is
    // already turned toward its prey (2026-09-12). No marine on the board
    // (engine tests, exotic missions): keep the historical south facing.
    const prey = board.pieces
      .filter((p): p is Piece => (p as Piece).kind === 'marine' && (p as Piece).alive)
      .sort((a, b) => chebyshev(a.pos, origin) - chebyshev(b.pos, origin))[0];
    const stealers: Genestealer[] = [];
    for (let i = 0; i < this.value && i < spots.length; i++) {
      const facing = prey ? facingToward(spots[i], prey.pos) : Dir.S;
      stealers.push(new Genestealer(board, spots[i], facing));
    }
    PieceEvents.emit('blipConverted', {
      blipId: this.id, x: origin.c, y: origin.r,
      stealerIds: stealers.map(s => s.id), lost: this.value - stealers.length
    });
    return stealers;
  }
}

/** True when a blip may not voluntarily occupy `coord`: any marine sees it,
 *  or a marine stands adjacent (8-way). */
export function blipBarredFrom(board: Board, coord: Coord): boolean {
  const sq = board.get(coord.c, coord.r);
  if (!sq) return true;
  for (const p of board.pieces) {
    const piece = p as Piece;
    if (piece.kind !== 'marine') continue;
    if (chebyshev(piece.pos, coord) <= 1) return true;
  }
  return squareSeenByMarine(board, coord);
}
