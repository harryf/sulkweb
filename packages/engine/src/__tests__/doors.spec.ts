import { describe, it, expect, beforeEach } from 'vitest';
import { Board } from '../board/Board.js';
import { Door } from '../rules/Door.js';
import { StormBolterMarine } from '../pieces/StormBolterMarine.js';
import { Dir } from '../core/Direction.js';
import { hasLineOfSight } from '../board/los.js';

/**
 * EDGE-MODEL doors (2026-08-14): a door sits on the BOUNDARY between its
 * anchor square and the neighbor in `facing` — it does not occupy a square.
 */
function addDoor(board: Board, x: number, y: number, facing: Dir): Door {
  const square = board.get(x, y)!;
  const door = new Door(square, facing);
  square.features.add(door);
  return door;
}

describe('Board door construction', () => {
  it('builds an edge door from SquareJSON doorFacing', () => {
    const board = new Board(3, 3, [
      { x: 1, y: 0, kind: 'corridor', doorFacing: 'down' },
      { x: 1, y: 1, kind: 'corridor' },
    ]);
    const door = board.doorAt({ c: 1, r: 0 });
    expect(door).toBeInstanceOf(Door);
    expect(door!.isOpen).toBe(false);
    expect(door!.otherSide()).toEqual({ c: 1, r: 1 });
    expect(board.doorBetween({ c: 1, r: 0 }, { c: 1, r: 1 })).toBe(door);
    expect(board.doorBetween({ c: 1, r: 1 }, { c: 1, r: 0 })).toBe(door); // either direction
  });

  it('the anchor square itself is passable — the door blocks only the edge', () => {
    const board = new Board(5, 5);
    addDoor(board, 2, 1, Dir.S);
    expect(board.isPassable({ c: 2, r: 1 })).toBe(true);
  });
});

describe('Doors and movement/LOS', () => {
  let board: Board;
  let door: Door;

  beforeEach(() => {
    board = new Board(5, 5);
    door = addDoor(board, 2, 1, Dir.S); // edge between (2,1) and (2,2)
  });

  it('closed door blocks movement across its edge', () => {
    const m = new StormBolterMarine(board, { c: 2, r: 2 }, Dir.N);
    expect(m.moveForward()).toBe(false);
    expect(m.pos).toEqual({ c: 2, r: 2 });
  });

  it('open door allows movement across the edge', () => {
    door.open();
    const m = new StormBolterMarine(board, { c: 2, r: 2 }, Dir.N);
    expect(m.moveForward()).toBe(true);
    expect(m.pos).toEqual({ c: 2, r: 1 });
  });

  it('movement parallel to the door edge is unaffected', () => {
    const m = new StormBolterMarine(board, { c: 1, r: 1 }, Dir.E);
    expect(m.moveForward()).toBe(true); // (1,1)→(2,1): enters the anchor square along the corridor
    expect(m.pos).toEqual({ c: 2, r: 1 });
  });

  it('closed door blocks LOS across its edge — including the square right behind it', () => {
    const from = board.get(2, 2)!;
    expect(hasLineOfSight(board, from, board.get(2, 0)!)).toBe(false); // beyond
    expect(hasLineOfSight(board, from, board.get(2, 1)!)).toBe(false); // directly behind the edge
    door.open();
    expect(hasLineOfSight(board, from, board.get(2, 0)!)).toBe(true);
    expect(hasLineOfSight(board, from, board.get(2, 1)!)).toBe(true);
  });

  it('LOS parallel to the door edge is unaffected', () => {
    expect(hasLineOfSight(board, board.get(0, 1)!, board.get(4, 1)!)).toBe(true); // along the row through the anchor
  });
});

describe('Piece.useDoor (edge model)', () => {
  let board: Board;

  beforeEach(() => {
    board = new Board(5, 5);
  });

  it('toggles the door edge straight ahead for 1 AP', () => {
    const door = addDoor(board, 2, 1, Dir.S); // edge (2,1)-(2,2)
    const m = new StormBolterMarine(board, { c: 2, r: 2 }, Dir.N);
    expect(m.useDoor()).toBe(true);
    expect(door.isOpen).toBe(true);
    expect(m.ap).toBe(3);
    expect(m.useDoor()).toBe(true);
    expect(door.isOpen).toBe(false);
    expect(m.ap).toBe(2);
  });

  it('reaches door edges incident to the front-diagonal squares', () => {
    const door = addDoor(board, 3, 1, Dir.S); // edge (3,1)-(3,2), incident to front-right of (2,2) facing N
    const m = new StormBolterMarine(board, { c: 2, r: 2 }, Dir.N);
    expect(m.useDoor()).toBe(true);
    expect(door.isOpen).toBe(true);
  });

  it('cannot reach a door edge behind the piece', () => {
    addDoor(board, 2, 3, Dir.S); // edge (2,3)-(2,4), fully behind
    addDoor(board, 2, 2, Dir.S); // edge (2,2)-(2,3), on the piece's own rear edge
    const m = new StormBolterMarine(board, { c: 2, r: 2 }, Dir.N);
    expect(m.useDoor()).toBe(false);
    expect(m.ap).toBe(4);
  });

  it('fails without AP', () => {
    addDoor(board, 2, 1, Dir.S);
    const m = new StormBolterMarine(board, { c: 2, r: 2 }, Dir.N);
    m.ap = 0;
    expect(m.useDoor()).toBe(false);
  });

  it('closes freely with pieces on both sides — no doorway square exists', () => {
    const door = addDoor(board, 2, 1, Dir.S);
    door.open();
    new StormBolterMarine(board, { c: 2, r: 1 }, Dir.N); // on the far side
    const m = new StormBolterMarine(board, { c: 2, r: 2 }, Dir.N);
    expect(m.useDoor()).toBe(true);
    expect(door.isOpen).toBe(false);
  });
});

describe('LOS symmetry across door edges (property)', () => {
  it('hasLineOfSight(a,b) === hasLineOfSight(b,a) for every pair, doors in all four orientations', () => {
    // Advisor finding: segment-intersection LOS is exactly where visibility
    // asymmetry creeps in. Brute-force every ordered pair on a fixture with a
    // door edge in each orientation.
    const board = new Board(5, 5);
    addDoor(board, 2, 1, Dir.S); // edge (2,1)-(2,2)
    addDoor(board, 1, 2, Dir.E); // edge (1,2)-(2,2)
    addDoor(board, 2, 3, Dir.N); // edge (2,3)-(2,2)
    addDoor(board, 3, 2, Dir.W); // edge (3,2)-(2,2)
    const squares = board.allSquares();
    for (const a of squares) {
      for (const b of squares) {
        expect(hasLineOfSight(board, a, b)).toBe(hasLineOfSight(board, b, a));
      }
    }
  });
});

describe('Door map validation', () => {
  it('rejects a door edge pointing into rock', () => {
    expect(() => new Board(3, 3, [
      { x: 1, y: 1, kind: 'corridor', doorFacing: 'up' }, // (1,0) does not exist
    ])).toThrow(/faces into rock/);
  });

  it('rejects the same edge authored from both sides', () => {
    expect(() => new Board(3, 3, [
      { x: 1, y: 0, kind: 'corridor', doorFacing: 'down' },
      { x: 1, y: 1, kind: 'corridor', doorFacing: 'up' }, // same boundary, inverse anchor
    ])).toThrow(/Duplicate door/);
  });
});

describe('Occupancy', () => {
  it('a piece cannot move onto an occupied square', () => {
    const board = new Board(5, 5);
    new StormBolterMarine(board, { c: 2, r: 1 }, Dir.N);
    const m = new StormBolterMarine(board, { c: 2, r: 2 }, Dir.N);
    expect(m.moveForward()).toBe(false);
    expect(m.pos).toEqual({ c: 2, r: 2 });
  });

  it('board registers and removes pieces', () => {
    const board = new Board(3, 3);
    const m = new StormBolterMarine(board, { c: 1, r: 1 }, Dir.N);
    expect(board.pieceAt({ c: 1, r: 1 })?.id).toBe(m.id);
    board.removePiece(m);
    expect(board.pieceAt({ c: 1, r: 1 })).toBeUndefined();
  });
});
