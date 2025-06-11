import { Board } from './Board';
import { Square } from './Square';

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
export function hasLineOfSight(board: Board, a: Square, b: Square): boolean {
  const [x0, y0] = a.coord;
  const [x1, y1] = b.coord;

  if (x0 === x1 && y0 === y1) {
    return true;
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
    if (square?.features.has('BLOCK_LOS')) {
      return false;
    }
  }

  return true;
}
