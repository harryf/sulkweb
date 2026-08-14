import { describe, it, expect } from 'vitest';
import { Board } from '../board/Board.js';
import { StormBolterMarine } from '../pieces/StormBolterMarine.js';
import { Dir } from '../core/Direction.js';

/**
 * Movement cost must be computed relative to facing, not world axes.
 * Regression: a marine facing E used to pay the side-step cost (2) to walk forward.
 */
describe('facing-relative movement costs', () => {
  it('moving forward costs 1 AP whatever the facing', () => {
    for (const [facing, dest] of [
      [Dir.N, { c: 2, r: 1 }],
      [Dir.E, { c: 3, r: 2 }],
      [Dir.S, { c: 2, r: 3 }],
      [Dir.W, { c: 1, r: 2 }],
    ] as const) {
      const m = new StormBolterMarine(new Board(5, 5), { c: 2, r: 2 }, facing);
      expect(m.moveForward()).toBe(true);
      expect(m.pos).toEqual(dest);
      expect(m.ap).toBe(3);
    }
  });

  it('moving backward costs 2 AP whatever the facing', () => {
    for (const facing of [Dir.N, Dir.E, Dir.S, Dir.W]) {
      const m = new StormBolterMarine(new Board(5, 5), { c: 2, r: 2 }, facing);
      expect(m.moveBackward()).toBe(true);
      expect(m.ap).toBe(2);
    }
  });

  it('side-steps cost 2 AP', () => {
    const m = new StormBolterMarine(new Board(5, 5), { c: 2, r: 2 }, Dir.E);
    expect(m.stepLeft()).toBe(true);   // world N
    expect(m.pos).toEqual({ c: 2, r: 1 });
    expect(m.ap).toBe(2);
  });

  it('exposes apRemaining/apInitial for the UI layer', () => {
    const m = new StormBolterMarine(new Board(5, 5), { c: 2, r: 2 }, Dir.N);
    expect(m.apInitial).toBe(4);
    m.moveForward();
    expect(m.apRemaining).toBe(3);
  });
});
