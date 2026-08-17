import { describe, it, expect, beforeEach } from 'vitest';
import { Board } from '../board/Board.js';
import { StormBolterMarine } from '../pieces/StormBolterMarine.js';
import { Dir } from '../core/Direction.js';

/* 3×3 board, centre impassable */
let board: Board;
beforeEach(() => {
  board = new Board(3, 3);
  // Assuming Board.get() returns a Square-like object with a 'passable' property.
  // If Board.get() might return undefined (e.g., out of bounds), this needs a null check.
  // For now, following the user's provided test structure.
  const centerSquare = board.get(1, 1);
  if (centerSquare) {
    centerSquare.passable = false; // wall in the middle
  } else {
    // This case should ideally not happen if Board is constructed with 3x3
    // and get(1,1) is a valid coordinate.
    console.warn('Could not get center square (1,1) for board setup in test');
  }
});

describe('Storm-Bolter Marine movement & AP', () => {
  it('moves forward and spends 1 AP', () => {
    const m = new StormBolterMarine(board, { c: 1, r: 2 }, Dir.N);
    // The piece is at (1,2) facing N. Forward is (1,1).
    // The test setup makes (1,1) impassable. This test expects to move to (1,1).
    // Let's make (1,1) passable for this specific test case, overriding beforeEach.
    const centerSquare = board.get(1, 1);
    if (centerSquare) centerSquare.passable = true;

    const ok = m.moveForward();
    expect(ok).toBe(true);
    expect(m.pos).toEqual({ c: 1, r: 1 }); // N is {dc:0, dr:-1}, so (1, 2-1) = (1,1)
                                        // Oh, wait. The user's test code has {c:1, r:1} as expected position.
                                        // DIR_VEC[Dir.N] is { dc: 0, dr: -1 }.
                                        // If starting at {c:1, r:2} and moving N, new pos is {c: 1, r: 2 + (-1)} = {c:1, r:1}.
                                        // The user's provided test code has `expect(m.pos).toEqual({ c: 1, r: 1 })`
                                        // This seems correct. My calculation was off. Let's stick to the user's expectation.

    expect(m.ap).toBe(3);
  });

  it('cannot enter impassable square', () => {
    const m = new StormBolterMarine(board, { c: 1, r: 2 }, Dir.N);
    // forward into wall at 1,1. beforeEach already sets (1,1) to impassable.
    // board.get(1,1)!.passable = false; // This line is redundant due to beforeEach
    expect(m.moveForward()).toBe(false);
    expect(m.pos).toEqual({ c: 1, r: 2 });
    expect(m.ap).toBe(4);
  });

  it('turns right for 1 AP', () => {
    const m = new StormBolterMarine(board, { c: 0, r: 0 }, Dir.N);
    expect(m.tryTurn(1)).toBe(true); // 1 is 'RIGHT'
    expect(m.facing).toBe(Dir.E);
    expect(m.ap).toBe(3);
  });

  it('can’t overspend AP', () => {
    const m = new StormBolterMarine(board, { c: 0, r: 0 }, Dir.N);
    // burn 4 AP with four left turns
    for (let i = 0; i < 4; i++) {
      const turned = m.tryTurn(-1); // -1 is 'LEFT'
      expect(turned).toBe(true); // Each turn should succeed until AP is 0
    }
    expect(m.ap).toBe(0);
    // any further action should fail
    expect(m.tryTurn(-1)).toBe(false);
    expect(m.moveForward()).toBe(false);
    expect(m.ap).toBe(0); // AP should remain 0
  });
});
