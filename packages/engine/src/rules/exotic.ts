import type { Board } from '../board/Board.js';
import type { Coord, Piece } from '../pieces/Piece.js';
import { PieceEvents } from '../events/PieceEvents.js';

/**
 * Exotic board objects from the original src/sprites/exotic.py + mission 6:
 *
 * C.A.T. — a neutral crawling recorder (mission 3 "Rescue"). Board-level
 * state, not a Piece: it never occupies its square (original blocksmove =
 * False), marines pick it up by entering its square, stealers damage it by
 * entering (first hit = damaged marker, second = destroyed — original
 * damage()), flames kill it outright (original update()), and when loose and
 * undamaged it wanders up to 3 squares in the end phase (ap=3, may_wander).
 *
 * DUCTING — destructible features on mission 6's O:2 squares. A stealer
 * stepping onto one tears it out; the marines lose the moment any ducting is
 * destroyed.
 */

export interface CatState {
  pos: Coord;
  /** Marine currently carrying the CAT (moves with it), or null when loose. */
  carrierId: string | null;
  damaged: boolean;
  destroyed: boolean;
  /** Set when a carrier escapes off-board with it. */
  escaped: boolean;
}

export function initCat(board: Board, start: Coord): void {
  board.cat = { pos: { ...start }, carrierId: null, damaged: false, destroyed: false, escaped: false };
}

/** The CAT's square when it is loose on the board (not carried/destroyed/escaped). */
export function looseCatPos(board: Board): Coord | undefined {
  const cat = board.cat;
  if (!cat || cat.carrierId !== null || cat.destroyed || cat.escaped) return undefined;
  return cat.pos;
}

export function pickUpCat(board: Board, marine: Piece): void {
  const cat = board.cat!;
  cat.carrierId = marine.id;
  cat.pos = { ...marine.pos };
  PieceEvents.emit('catPickedUp', { carrierId: marine.id });
}

/** Carrier died (or otherwise released it): the CAT lands on the given square.
 *  Landing in flames destroys it on the spot (original update(): flaming → kill). */
export function dropCat(board: Board, pos: Coord): void {
  const cat = board.cat!;
  cat.carrierId = null;
  cat.pos = { ...pos };
  PieceEvents.emit('catDropped', { x: pos.c, y: pos.r });
  if (board.isFlaming(pos)) destroyCat(board);
}

export function damageCat(board: Board): void {
  const cat = board.cat!;
  if (cat.destroyed) return;
  if (cat.damaged) {
    destroyCat(board);
  } else {
    cat.damaged = true;
    PieceEvents.emit('catDamaged', { x: cat.pos.c, y: cat.pos.r, destroyed: false });
  }
}

export function destroyCat(board: Board): void {
  const cat = board.cat!;
  if (cat.destroyed) return;
  cat.destroyed = true;
  PieceEvents.emit('catDamaged', { x: cat.pos.c, y: cat.pos.r, destroyed: true });
}

/**
 * End-phase wander (original may_wander: loose, undamaged, alive; ap 3, every
 * direction costs 1, never turns). Deterministic under a seeded dice source.
 * The CAT drifts without purpose — pick each step with the board dice; it
 * refuses occupied/flaming squares and stops when boxed in.
 */
export function wanderCat(board: Board): void {
  const cat = board.cat;
  if (!cat || cat.carrierId !== null || cat.damaged || cat.destroyed || cat.escaped) return;
  for (let step = 0; step < 3; step++) {
    const options: Coord[] = [];
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        if (dc === 0 && dr === 0) continue;
        const c = { c: cat.pos.c + dc, r: cat.pos.r + dr };
        if (board.isPassable(c) && !board.isOccupied(c)) options.push(c);
      }
    }
    if (options.length === 0) return;
    // d6-based index keeps the whole game reproducible from one seed.
    const pick = options[(board.dice.roll() - 1) % options.length];
    cat.pos = { ...pick };
    PieceEvents.emit('catMoved', { x: cat.pos.c, y: cat.pos.r });
  }
}

// ---- Ducting (mission 6 "Defend") ----

export function initDucting(board: Board, squares: Coord[]): void {
  for (const s of squares) board.ducting.set(`${s.c},${s.r}`, true);
}

export function intactDucting(board: Board): Coord[] {
  const out: Coord[] = [];
  for (const [key, intact] of board.ducting) {
    if (!intact) continue;
    const [c, r] = key.split(',').map(Number);
    out.push({ c, r });
  }
  return out;
}

export function anyDuctingDestroyed(board: Board): boolean {
  for (const intact of board.ducting.values()) if (!intact) return true;
  return false;
}

export function destroyDuctingAt(board: Board, pos: Coord): boolean {
  const key = `${pos.c},${pos.r}`;
  if (board.ducting.get(key) !== true) return false;
  board.ducting.set(key, false);
  PieceEvents.emit('ductingDestroyed', { x: pos.c, y: pos.r });
  return true;
}

/**
 * Post-action interactions for a stealer that just moved: entering the loose
 * CAT's square skewers it; entering an intact ducting square tears the duct
 * out. Called from runStealerActions after each successful move (event
 * handlers are suppressed inside the captured stealer phase, so this cannot
 * live on a pieceMoved handler).
 */
export function stealerExoticInteractions(board: Board, stealer: Piece): void {
  if (stealer.kind !== 'stealer') return;
  const catPos = looseCatPos(board);
  if (catPos && catPos.c === stealer.pos.c && catPos.r === stealer.pos.r) damageCat(board);
  destroyDuctingAt(board, stealer.pos);
}
