
import type { Dir } from './directions.js';

export const MOVE_COST: Record<'F'|'FL'|'FR'|'B'|'L'|'R'|'BL'|'BR', number> = {
  F:1, B:2, L:2, R:2, FL:1, FR:1, BL:2, BR:2
}

export const TURN_COST: Record<Dir, number> = {
  1:1,        // RIGHT
  3:1,        // LEFT
  2:2,        // BACK
  0:0         // no-op
}
