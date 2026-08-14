/** Cardinal directions in clockwise order */
export enum Dir { N = 0, E = 1, S = 2, W = 3 }

/** Vector lookup in board coordinates (col,row) */
export const DIR_VEC: Record<Dir, { dc: number; dr: number }> = {
  [Dir.N]: { dc: 0, dr: -1 },
  [Dir.E]: { dc: 1, dr: 0 },
  [Dir.S]: { dc: 0, dr: 1 },
  [Dir.W]: { dc: -1, dr: 0 }
}

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
