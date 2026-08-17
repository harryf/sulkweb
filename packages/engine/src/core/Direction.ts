/** Cardinal directions in clockwise order */
export enum Dir { N = 0, E = 1, S = 2, W = 3 }

/** Vector lookup in board coordinates (col,row). Frozen: shared table, never mutate. */
export const DIR_VEC: Record<Dir, Readonly<{ dc: number; dr: number }>> = Object.freeze({
  [Dir.N]: Object.freeze({ dc: 0, dr: -1 }),
  [Dir.E]: Object.freeze({ dc: 1, dr: 0 }),
  [Dir.S]: Object.freeze({ dc: 0, dr: 1 }),
  [Dir.W]: Object.freeze({ dc: -1, dr: 0 })
})

/** Returns new facing after turning (-1 = left, +1 = right, 2 = about-face) */
export function turn(facing: Dir, delta: -1 | 1 | 2): Dir {
  return ((facing + (delta === -1 ? 3 : delta)) % 4) as Dir
}

/**
 * Rotate a world-space delta into a facing-relative frame, so that
 * "straight ahead" is always (0,-1) regardless of facing.
 */
export function toRelative(facing: Dir, dc: number, dr: number): { dc: number; dr: number } {
  let rc = dc, rr = dr;
  for (let i = 0; i < facing; i++) {
    const t = rc;
    rc = rr;
    rr = -t;
  }
  return { dc: rc, dr: rr };
}

/** Chebyshev (king-move) distance between two board coordinates — the game's range metric. */
export function chebyshev(a: { c: number; r: number }, b: { c: number; r: number }): number {
  return Math.max(Math.abs(a.c - b.c), Math.abs(a.r - b.r));
}

/** Facing that points from `from` most nearly toward `to`; horizontal wins ties. */
export function facingToward(from: { c: number; r: number }, to: { c: number; r: number }): Dir {
  const dc = to.c - from.c, dr = to.r - from.r;
  if (Math.abs(dc) >= Math.abs(dr)) return dc > 0 ? Dir.E : Dir.W;
  return dr > 0 ? Dir.S : Dir.N;
}

/**
 * Turn `piece` to face `dir` via the cheapest rotation. Returns tryTurn's
 * verdict (true when already facing, or the turn succeeded).
 */
export function turnToward(piece: { facing: Dir; tryTurn(delta: -1 | 1 | 2): boolean }, dir: Dir): boolean {
  if (piece.facing === dir) return true;
  const delta = ((dir - piece.facing + 4) % 4);
  return piece.tryTurn(delta === 1 ? 1 : delta === 3 ? -1 : 2);
}

/** The four orthogonal unit vectors in N/E/S/W order (the DIR_VEC values). Frozen. */
export const ORTHO_VECS: ReadonlyArray<Readonly<{ dc: number; dr: number }>> =
  Object.freeze([DIR_VEC[Dir.N], DIR_VEC[Dir.E], DIR_VEC[Dir.S], DIR_VEC[Dir.W]]);

/** Mission-JSON facing word → Dir (shared by piece deploys and door edges). Frozen. */
export const FACING_WORD: Readonly<Record<'up' | 'right' | 'down' | 'left', Dir>> = Object.freeze({
  up: Dir.N, right: Dir.E, down: Dir.S, left: Dir.W
});
