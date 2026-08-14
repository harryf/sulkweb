import { describe, it, expect } from 'vitest';
import { Board } from '../board/Board.js';
import { Door } from '../rules/Door.js';
import { StormBolterMarine } from '../pieces/StormBolterMarine.js';
import { Dir } from '../core/Direction.js';
import { inVisionArc, inFireArc, canSee, canShoot, visibleSquares } from '../board/vision.js';

const at = (c: number, r: number, facing: Dir) => {
  const board = new Board(9, 9);
  return { board, viewer: new StormBolterMarine(board, { c, r }, facing) };
};

describe('vision arc (front 180°)', () => {
  it('facing N sees ahead and the flank line, not behind', () => {
    const { viewer } = at(4, 4, Dir.N);
    expect(inVisionArc(viewer, { x: 4, y: 3 })).toBe(true);   // ahead
    expect(inVisionArc(viewer, { x: 6, y: 2 })).toBe(true);   // ahead-right
    expect(inVisionArc(viewer, { x: 2, y: 4 })).toBe(true);   // flank line (left)
    expect(inVisionArc(viewer, { x: 6, y: 4 })).toBe(true);   // flank line (right)
    expect(inVisionArc(viewer, { x: 4, y: 5 })).toBe(false);  // behind
    expect(inVisionArc(viewer, { x: 6, y: 6 })).toBe(false);  // behind-right
    expect(inVisionArc(viewer, { x: 4, y: 4 })).toBe(false);  // self
  });

  it('rotates with facing', () => {
    const { viewer } = at(4, 4, Dir.E);
    expect(inVisionArc(viewer, { x: 6, y: 4 })).toBe(true);   // ahead (east)
    expect(inVisionArc(viewer, { x: 2, y: 4 })).toBe(false);  // behind (west)
    expect(inVisionArc(viewer, { x: 4, y: 2 })).toBe(true);   // flank line
  });
});

describe('fire arc (front 90°, 45° edges included)', () => {
  it('facing N: cone ahead only', () => {
    const { viewer } = at(4, 4, Dir.N);
    expect(inFireArc(viewer, { x: 4, y: 2 })).toBe(true);    // straight
    expect(inFireArc(viewer, { x: 5, y: 3 })).toBe(true);    // 45° edge
    expect(inFireArc(viewer, { x: 2, y: 2 })).toBe(true);    // 45° edge left
    expect(inFireArc(viewer, { x: 6, y: 3 })).toBe(false);   // outside cone
    expect(inFireArc(viewer, { x: 5, y: 4 })).toBe(false);   // flank
    expect(inFireArc(viewer, { x: 4, y: 6 })).toBe(false);   // behind
  });
});

describe('canSee / canShoot integration', () => {
  it('closed door blocks sight; open door restores it', () => {
    const { board, viewer } = at(4, 4, Dir.N);
    const doorSquare = board.get(4, 2)!;
    const door = new Door(doorSquare, Dir.N);
    doorSquare.features.add(door);
    const beyond = board.get(4, 0)!;
    expect(canSee(board, viewer, beyond)).toBe(false);
    door.open();
    expect(canSee(board, viewer, beyond)).toBe(true);
  });

  it('an intervening piece blocks sight', () => {
    const { board, viewer } = at(4, 4, Dir.N);
    new StormBolterMarine(board, { c: 4, r: 2 }, Dir.N);
    expect(canSee(board, viewer, board.get(4, 0)!)).toBe(false);
    expect(canSee(board, viewer, board.get(4, 2)!)).toBe(true); // the blocker itself is visible
  });

  it('canShoot enforces range', () => {
    const { board, viewer } = at(4, 8, Dir.N);
    expect(canShoot(board, viewer, board.get(4, 0)!, 12)).toBe(true);
    expect(canShoot(board, viewer, board.get(4, 0)!, 5)).toBe(false);
  });

  it('walls (missing squares) block LOS — no seeing through rock', () => {
    // Sparse board: two corridors joined only via a doorway column.
    const board = new Board(5, 8, [
      { x: 2, y: 0, kind: 'corridor' }, { x: 2, y: 1, kind: 'corridor' },
      { x: 1, y: 1, kind: 'room' }, { x: 3, y: 1, kind: 'room' },
      { x: 2, y: 2, kind: 'corridor', doorFacing: 'up' }, // closed door
      { x: 1, y: 3, kind: 'corridor' }, { x: 2, y: 3, kind: 'corridor' }, { x: 3, y: 3, kind: 'corridor' },
    ]);
    const viewer = new StormBolterMarine(board, { c: 2, r: 0 }, Dir.S);
    // Straight line is blocked by the door; the diagonal to (1,3)/(3,3)
    // crosses nonexistent squares and must ALSO be blocked.
    expect(canSee(board, viewer, board.get(2, 3)!)).toBe(false);
    expect(canSee(board, viewer, board.get(1, 3)!)).toBe(false);
    expect(canSee(board, viewer, board.get(3, 3)!)).toBe(false);
  });

  it('visibleSquares excludes everything behind', () => {
    const { board, viewer } = at(4, 4, Dir.N);
    const seen = visibleSquares(board, viewer);
    expect(seen.some(sq => sq.y > 4)).toBe(false);
    expect(seen.some(sq => sq.x === 4 && sq.y === 3)).toBe(true);
  });
});
