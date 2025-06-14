import { Dir } from './Direction.js';

/** Movement cost by delta column & delta row (-1…1) */
export const MOVE_COST: Record<string, number> = {
  '0,-1': 1,  '1,-1': 1,  '-1,-1': 1,   // forward & f-diagonals
  '0,1': 2,   '1,1': 2,   '-1,1': 2,    // backward & b-diagonals
  '1,0': 2,   '-1,0': 2                    // side-steps
};

/** Turning costs */
export const TURN_COST: Record<'LEFT' | 'RIGHT' | 'ABOUT', number> = {
  LEFT: 1,
  RIGHT: 1,
  ABOUT: 2
};

/** AP per full turn */
export const AP_PER_TURN = 4;
