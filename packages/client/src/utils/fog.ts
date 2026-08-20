/**
 * Pure fog-of-war decision logic: no Phaser, no DOM (same pattern as
 * radarLogic). The GameScene renders what these sets say, so the sight
 * union and the creep-reveal rule are unit-testable against a real
 * engine board.
 *
 * The rule set (user directive, 2026-08-21):
 *  - A stealer renders on the main board only when some marine SEES its
 *    square (vision arc + clear LOS), or when it is within CREEP_RADIUS
 *    squares of any marine (creeping up behind; you hear it in the
 *    bulkheads, walls deliberately do not block the creep sense).
 *  - Squares no marine sees get a dimming overlay.
 *  - Blips, marines, doors, flames, and the C.A.T. are never hidden;
 *    the minimap auspex stays the primary detection instrument.
 */
import { visibleSquares, type Board, type Piece } from '@sulk/engine/index.js';

/** All fog knobs in one place. */
export const FOG = {
  /** Dimming overlay alpha on out-of-sight squares: "slight", not blackout. */
  overlayAlpha: 0.42,
  overlayColor: 0x000008,
  /** Chebyshev reveal radius around every marine, walls ignored (hearing). */
  creepRadius: 2,
} as const;

const key = (x: number, y: number): string => `${x},${y}`;

/**
 * Every square some living marine currently sees, PLUS each marine's own
 * square (inVisionArc excludes the viewer's own square, but dimming the
 * squad's own footing would read as a bug, not atmosphere).
 */
export function computeMarineSight(board: Board): Set<string> {
  const sight = new Set<string>();
  for (const p of board.pieces) {
    if ((p as { kind?: string }).kind !== 'marine') continue;
    const m = p as Piece;
    sight.add(key(m.pos.c, m.pos.r));
    for (const sq of visibleSquares(board, m)) sight.add(key(sq.x, sq.y));
  }
  return sight;
}

/**
 * True when a threat standing on (c, r) is revealed to the marine player:
 * in the sight union, or creeping within CREEP_RADIUS of any marine.
 */
export function threatRevealed(
  sight: Set<string>,
  marines: ReadonlyArray<{ c: number; r: number }>,
  c: number,
  r: number,
): boolean {
  if (sight.has(key(c, r))) return true;
  return marines.some(m =>
    Math.max(Math.abs(m.c - c), Math.abs(m.r - r)) <= FOG.creepRadius);
}
