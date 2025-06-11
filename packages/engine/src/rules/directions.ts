
export type Dir = 0 | 1 | 2 | 3        // 0=N,1=E,2=S,3=W
export const LEFT  = 3  // –90°
export const RIGHT = 1  // +90°
export const BACK  = 2  // +180°
export function rotate(facing: Dir, by: Dir): Dir {
    return (facing + by) % 4 as Dir;
}

export function chebyshev(dx: number, dy: number): number {
    return Math.max(Math.abs(dx), Math.abs(dy));
}
