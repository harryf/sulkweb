import { Board } from './Board.js';
import { Square } from './Square.js';
import { toRelative, type Dir } from '../core/Direction.js';
import { hasLineOfSight } from './los.js';

export interface Viewer {
  pos: { c: number; r: number };
  facing: Dir;
}

/**
 * Vision arc: the front 180° — every square strictly ahead of the line
 * through the viewer perpendicular to its facing, plus that line itself.
 */
export function inVisionArc(viewer: Viewer, target: { x: number; y: number }): boolean {
  const rel = toRelative(viewer.facing, target.x - viewer.pos.c, target.y - viewer.pos.r);
  if (rel.dc === 0 && rel.dr === 0) return false;
  return rel.dr < 0 || (rel.dr === 0 && rel.dc !== 0);
}

/**
 * Fire arc: the front 90° cone. Targets exactly on the 45° edges count
 * as inside (per the Sulk manual).
 */
export function inFireArc(viewer: Viewer, target: { x: number; y: number }): boolean {
  const rel = toRelative(viewer.facing, target.x - viewer.pos.c, target.y - viewer.pos.r);
  return rel.dr < 0 && Math.abs(rel.dc) <= Math.abs(rel.dr);
}

/** True when the viewer can see the target square: vision arc + clear LOS. */
export function canSee(board: Board, viewer: Viewer, target: Square): boolean {
  if (!inVisionArc(viewer, target)) return false;
  const from = board.get(viewer.pos.c, viewer.pos.r);
  if (!from) return false;
  return hasLineOfSight(board, from, target, { piecesBlock: true });
}

/** True when the viewer could shoot the target square: fire arc + clear LOS + range. */
export function canShoot(board: Board, viewer: Viewer, target: Square, range = Infinity): boolean {
  if (!inFireArc(viewer, target)) return false;
  const from = board.get(viewer.pos.c, viewer.pos.r);
  if (!from) return false;
  const distance = Math.max(Math.abs(target.x - viewer.pos.c), Math.abs(target.y - viewer.pos.r));
  if (distance > range) return false;
  return hasLineOfSight(board, from, target, { piecesBlock: true });
}

/** Every board square the viewer currently sees. */
export function visibleSquares(board: Board, viewer: Viewer): Square[] {
  return board.allSquares().filter(sq => canSee(board, viewer, sq));
}
