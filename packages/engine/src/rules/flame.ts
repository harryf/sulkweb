import { Board } from '../board/Board.js';
import type { Square } from '../board/Square.js';
import type { Piece } from '../pieces/Piece.js';
import { PieceEvents } from '../events/PieceEvents.js';

/** All squares in the same board section as `sq`. */
export function sectionSquares(board: Board, sq: Square): Square[] {
  return board.allSquares().filter(s => s.sectionId === sq.sectionId && s.sectionId !== -1);
}

/**
 * Flame flood per the original `Square.flame(SPREAD)`: starting at the target
 * square, spread orthogonally within the SAME SECTION, stopped by closed door
 * edges (translation of "no effect if a closed Door is on the square").
 */
export function flameFlood(board: Board, target: Square): Square[] {
  const inSection = (s: Square | undefined): s is Square =>
    s !== undefined && s.sectionId === target.sectionId;
  const seen = new Set<Square>([target]);
  const queue: Square[] = [target];
  const ORTHO = [[0, -1], [1, 0], [0, 1], [-1, 0]] as const;
  while (queue.length) {
    const cur = queue.shift()!;
    for (const [dc, dr] of ORTHO) {
      const nxt = board.get(cur.x + dc, cur.y + dr);
      if (!inSection(nxt) || seen.has(nxt)) continue;
      const door = board.doorBetween({ c: cur.x, r: cur.y }, { c: nxt.x, r: nxt.y });
      if (door && !door.isOpen) continue;
      seen.add(nxt);
      queue.push(nxt);
    }
  }
  return [...seen];
}

/**
 * Set squares alight and roll for every piece standing on them: d6 ≥ 2 kills
 * (`fl_kill_scorereq = 2` for marines and stealers alike). When `silent` is
 * true (self-destruct), every piece dies outright with no roll.
 */
import { looseCatPos, destroyCat } from './exotic.js';
import { TUNING } from '../core/CostTables.js';

export function igniteSquares(board: Board, shooterId: string, squares: Square[], silent = false): string[] {
  const kills: string[] = [];
  // Every square of one blast burns until the same tick: the original's
  // end-phase dispersal becomes a per-flame lifetime on the board clock.
  const expiry = board.tick + TUNING.flameTicks;
  for (const sq of squares) {
    const piece = board.pieceAt({ c: sq.x, r: sq.y }) as Piece | undefined;
    if (piece?.alive) {
      if (silent || board.dice.roll() >= 2) {
        kills.push(piece.id);
        piece.die();
      }
    }
    board.flaming.set(`${sq.x},${sq.y}`, expiry);
  }
  board.touch();
  // A loose C.A.T. caught in the blast dies outright (original update()).
  const catPos = looseCatPos(board);
  if (catPos && board.isFlaming(catPos)) destroyCat(board);
  PieceEvents.emit('sectionFlamed', {
    shooterId,
    squares: squares.map(s => ({ x: s.x, y: s.y })),
    kills,
  });
  return kills;
}

/** Put out the given flame keys and announce them. */
function douse(board: Board, keys: string[]): void {
  if (keys.length === 0) return;
  const squares = keys.map(k => {
    const [x, y] = k.split(',').map(Number);
    return { x, y };
  });
  for (const k of keys) board.flaming.delete(k);
  board.touch();
  PieceEvents.emit('flamesCleared', { squares });
}

/** Sweep out every flame whose expiry tick has arrived (engine tick step 5).
 *  Returns how many squares went out. */
export function expireFlames(board: Board): number {
  if (board.flaming.size === 0) return 0;
  const due = [...board.flaming].filter(([, expiry]) => expiry <= board.tick).map(([k]) => k);
  douse(board, due);
  return due.length;
}

/** Put every flame out at once (the original end-phase dispersal; kept for
 *  tests and any mission rule that clears the board). */
export function clearFlames(board: Board): void {
  douse(board, [...board.flaming.keys()]);
}
