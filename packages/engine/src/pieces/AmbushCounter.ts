import { Blip } from './Blip.js';
import { Board } from '../board/Board.js';
import { Piece, type Coord } from './Piece.js';
import type { Genestealer } from './Genestealer.js';
import { PieceEvents } from '../events/PieceEvents.js';
import { StormBolterMarine } from './StormBolterMarine.js';
import { canSee, squareSeenByMarine } from '../board/vision.js';

/** Original get_ambush_counter_val: choice((0, 0, 1)) — two in three are
 *  FALSE ALARMS. d6 keeps it on the seeded stream: 5-6 → a real stealer. */
export function drawAmbushValue(board: Board): number {
  return board.dice.roll() >= 5 ? 1 : 0;
}

/**
 * Ambush counter (original Ambush_Counter(Blip), beta_2 USE_AMBUSH_COUNTERS):
 * a sensor decoy the stealer side drops behind the lines — at most TWO on the
 * board, deployed at the end of each stealer phase on a square no marine is
 * near (within 6) or can see. Unlike a blip it moves FREELY — straight into
 * marine sight, which is the point:
 * - value 1 → it was real: converts to a genestealer when sighted
 * - value 0 → false alarm: it vanishes, and every OVERWATCHING marine that
 *   sees it reflex-fires at nothing (bolters can jam; an assault cannon burns
 *   a round and risks its malfunction) — original try_to_jam_guns
 */
export class AmbushCounter extends Blip {
  static override readonly SPRITE_KEY: string = 'ambush_counter';

  constructor(board: Board, start: Coord, value?: number) {
    super(board, start, value ?? drawAmbushValue(board));
  }

  /** Counters use the ordinary movement rules — no blip sight/adjacency bars. */
  override tryMove(dc: number, dr: number): boolean {
    return Piece.prototype.tryMove.call(this, dc, dr);
  }

  /** Counters never convert voluntarily — only when sighted. */
  override canConvert(): boolean {
    return false;
  }

  override convert(): Genestealer[] {
    const board = this.board;
    const origin = { ...this.pos };
    if (this.value >= 1) {
      return super.convert(); // a real one: the hidden stealer bursts out
    }
    // False alarm — vanish (NODEATH: no casualty credit)…
    board.removePiece(this);
    this.alive = false;
    PieceEvents.emit('blipConverted', { blipId: this.id, x: origin.c, y: origin.r, stealerIds: [], lost: 0 });
    // …and rattle every overwatcher who had eyes on it.
    const sq = board.get(origin.c, origin.r);
    if (sq) {
      for (const p of [...board.pieces] as Piece[]) {
        if (p instanceof StormBolterMarine && p.overwatch && !p.jammed && canSee(board, p, sq)) {
          p.fireAtNothing();
        }
      }
    }
    return [];
  }
}

/**
 * End-of-stealer-phase deployment (original Stealer_Action_Phase._end): with
 * the mission flag set and fewer than two counters alive, place ONE on a
 * random legal square — passable, unoccupied, no marine within 6 board-walk
 * squares, no marine line of sight. Square choice and value ride the seeded
 * dice stream.
 */
export function deployAmbushCounter(board: Board): AmbushCounter | undefined {
  const counters = board.pieces.filter(p => p instanceof AmbushCounter);
  if (counters.length >= 2) return undefined;
  const legal = board.allSquares().filter(sq => {
    const c = { c: sq.x, r: sq.y };
    if (!board.isPassable(c) || board.isOccupied(c)) return false;
    if (board.pieceNear(c, 6, p => (p as Piece).kind === 'marine')) return false;
    return !squareSeenByMarine(board, c);
  });
  if (legal.length === 0) return undefined;
  const idx = ((board.dice.roll() - 1) * 36 + (board.dice.roll() - 1) * 6 + (board.dice.roll() - 1)) % legal.length;
  const spot = legal[idx];
  return new AmbushCounter(board, { c: spot.x, r: spot.y });
}
