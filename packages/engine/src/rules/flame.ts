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

export function igniteSquares(board: Board, shooterId: string, squares: Square[], silent = false): string[] {
  const kills: string[] = [];
  for (const sq of squares) {
    const piece = board.pieceAt({ c: sq.x, r: sq.y }) as Piece | undefined;
    if (piece?.alive) {
      if (silent || board.dice.roll() >= 2) {
        kills.push(piece.id);
        piece.die();
      }
    }
    board.flaming.add(`${sq.x},${sq.y}`);
  }
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

/** End-phase flame dispersal (original Flames `persist = False`). */
export function clearFlames(board: Board): void {
  if (board.flaming.size === 0) return;
  const squares = [...board.flaming].map(k => {
    const [x, y] = k.split(',').map(Number);
    return { x, y };
  });
  board.flaming.clear();
  PieceEvents.emit('flamesCleared', { squares });
}
