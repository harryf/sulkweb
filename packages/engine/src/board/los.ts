import { Board } from './Board.js';
import { Square } from './Square.js';
import type { Door } from '../rules/Door.js';
import { DIR_VEC } from '../core/Direction.js';

/** A door edge as a segment in grid units (square (x,y) spans x..x+1, y..y+1). */
function doorSegment(door: Door): [number, number, number, number] {
  const { x, y } = door.square;
  const v = DIR_VEC[door.facing];
  if (v.dr === -1) return [x, y, x + 1, y];             // boundary above the anchor
  if (v.dr === 1) return [x, y + 1, x + 1, y + 1];      // below
  if (v.dc === -1) return [x, y, x, y + 1];             // left
  return [x + 1, y, x + 1, y + 1];                      // right
}

const EPS = 1e-9;
const cross = (ox: number, oy: number, ax: number, ay: number, bx: number, by: number) =>
  (ax - ox) * (by - oy) - (ay - oy) * (bx - ox);

/** Proper (interior) intersection of segments AB and CD — endpoint grazing does not count. */
function segmentsCross(
  ax: number, ay: number, bx: number, by: number,
  cx: number, cy: number, dx: number, dy: number,
): boolean {
  const d1 = cross(ax, ay, bx, by, cx, cy);
  const d2 = cross(ax, ay, bx, by, dx, dy);
  const d3 = cross(cx, cy, dx, dy, ax, ay);
  const d4 = cross(cx, cy, dx, dy, bx, by);
  return ((d1 > EPS && d2 < -EPS) || (d1 < -EPS && d2 > EPS))
    && ((d3 > EPS && d4 < -EPS) || (d3 < -EPS && d4 > EPS));
}

/**
 * Checks if a straight-line Line of Sight (LOS) exists between two squares.
 *
 * This function determines visibility by tracing a line between the centers of the start and end squares.
 * It uses Bresenham's line algorithm to find all integer grid coordinates along this path.
 *
 * Rules for LOS:
 * 1. An LOS always exists if the start and end squares are the same.
 * 2. For all other cases, the line is traced. If any intermediate square on the path
 *    (not including the start or end squares) has the 'BLOCK_LOS' feature, the
 *    line of sight is blocked, and the function returns `false`.
 * 3. If the line is traced without hitting any blocking squares, the function returns `true`.
 *
 * @param board The game board instance.
 * @param a The starting square.
 * @param b The destination square.
 * @returns `true` if a clear line of sight exists, `false` otherwise.
 */
export interface LosOptions {
  /** When true, an intermediate square occupied by any piece blocks LOS. */
  piecesBlock?: boolean;
}

export function hasLineOfSight(board: Board, a: Square, b: Square, opts: LosOptions = {}): boolean {
  const [x0, y0] = a.coord;
  const [x1, y1] = b.coord;

  if (x0 === x1 && y0 === y1) {
    return true;
  }

  // Edge-model doors: a CLOSED door blocks any sight line that crosses its
  // boundary segment — including sight into the square directly behind it.
  const sx = x0 + 0.5, sy = y0 + 0.5, ex = x1 + 0.5, ey = y1 + 0.5;
  for (const door of board.allDoors()) {
    if (door.isOpen) continue;
    const [dx0, dy0, dx1, dy1] = doorSegment(door);
    if (segmentsCross(sx, sy, ex, ey, dx0, dy0, dx1, dy1)) return false;
  }

  const dx = x1 - x0;
  const dy = y1 - y0;
  const points: [number, number][] = [];

  const isOblique = dx !== 0 && dy !== 0 && Math.abs(dx) !== Math.abs(dy);

  if (isOblique) {
    // Oblique lines: sample at intervals
    const steps = Math.max(Math.abs(dx), Math.abs(dy));
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const x = Math.round(x0 + t * dx);
      const y = Math.round(y0 + t * dy);
      /* v8 ignore next 3 */
      if (points.length === 0 || points[points.length - 1][0] !== x || points[points.length - 1][1] !== y) {
        points.push([x, y]);
      }
    }
  } else {
    // Orthogonal and diagonal lines: simple step-by-step
    let currentX = x0;
    let currentY = y0;
    const sx = Math.sign(dx);
    const sy = Math.sign(dy);

    while (true) {
      points.push([currentX, currentY]);
      if (currentX === x1 && currentY === y1) break;
      if (dx !== 0) currentX += sx;
      if (dy !== 0) currentY += sy;
    }
  }

  // Exclude start and end points from blocking check
  const intermediatePoints = points.slice(1, -1);

  for (const [x, y] of intermediatePoints) {
    const square = board.getSquare(x, y);
    // A missing or impassable square is solid rock — sight never crosses it.
    if (!square || !square.passable) {
      return false;
    }
    for (const feature of square.features) {
      if (feature.blocksLOS()) {
        return false;
      }
    }
    if (opts.piecesBlock && board.isOccupied({ c: x, r: y })) {
      return false;
    }
    // Burning squares block sight through (original Flames blockslos).
    if (board.isFlaming({ c: x, r: y })) {
      return false;
    }
  }

  return true;
}
