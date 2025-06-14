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
