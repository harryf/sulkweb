import { describe, it, expect, beforeEach } from 'vitest';
import { Board } from '../board/Board.js';
import { Door } from '../rules/Door.js';
import { StormBolterMarine } from '../pieces/StormBolterMarine.js';
import { Dir } from '../core/Direction.js';
import { hasLineOfSight } from '../board/los.js';

function addDoor(board: Board, x: number, y: number): Door {
  const square = board.get(x, y)!;
  const door = new Door(square, Dir.N);
  square.features.add(door);
  return door;
}

describe('Board door construction', () => {
  it('builds a Door feature from SquareJSON doorFacing', () => {
    const board = new Board(3, 3, [
      { x: 0, y: 0, kind: 'corridor' },
      { x: 1, y: 0, kind: 'corridor', doorFacing: 'up' },
      { x: 2, y: 0, kind: 'corridor' },
    ]);
    const door = board.doorAt({ c: 1, r: 0 });
    expect(door).toBeInstanceOf(Door);
    expect(door!.isOpen).toBe(false);
  });
});

describe('Doors and movement/LOS', () => {
  let board: Board;
  let door: Door;

  beforeEach(() => {
    board = new Board(5, 5);
    door = addDoor(board, 2, 1);
  });

  it('closed door blocks movement into its square', () => {
    const m = new StormBolterMarine(board, { c: 2, r: 2 }, Dir.N);
    expect(m.moveForward()).toBe(false);
    expect(m.pos).toEqual({ c: 2, r: 2 });
  });

  it('open door allows movement', () => {
    door.open();
    const m = new StormBolterMarine(board, { c: 2, r: 2 }, Dir.N);
    expect(m.moveForward()).toBe(true);
    expect(m.pos).toEqual({ c: 2, r: 1 });
  });

  it('closed door blocks LOS through its square, open door does not', () => {
    const from = board.get(2, 2)!;
    const beyond = board.get(2, 0)!;
    expect(hasLineOfSight(board, from, beyond)).toBe(false);
    door.open();
    expect(hasLineOfSight(board, from, beyond)).toBe(true);
  });
});

describe('Piece.useDoor', () => {
  let board: Board;

  beforeEach(() => {
    board = new Board(5, 5);
  });

  it('toggles the door straight ahead for 1 AP', () => {
    const door = addDoor(board, 2, 1);
    const m = new StormBolterMarine(board, { c: 2, r: 2 }, Dir.N);
    expect(m.useDoor()).toBe(true);
    expect(door.isOpen).toBe(true);
    expect(m.ap).toBe(3);
    expect(m.useDoor()).toBe(true);
    expect(door.isOpen).toBe(false);
    expect(m.ap).toBe(2);
  });

  it('reaches doors on the front diagonals', () => {
    const door = addDoor(board, 3, 1); // front-right of (2,2) facing N
    const m = new StormBolterMarine(board, { c: 2, r: 2 }, Dir.N);
    expect(m.useDoor()).toBe(true);
    expect(door.isOpen).toBe(true);
  });

  it('cannot reach a door behind the piece', () => {
    addDoor(board, 2, 3); // south of piece facing N
    const m = new StormBolterMarine(board, { c: 2, r: 2 }, Dir.N);
    expect(m.useDoor()).toBe(false);
    expect(m.ap).toBe(4);
  });

  it('fails without AP', () => {
    addDoor(board, 2, 1);
    const m = new StormBolterMarine(board, { c: 2, r: 2 }, Dir.N);
    m.ap = 0;
    expect(m.useDoor()).toBe(false);
  });

  it('cannot close an open door under another piece', () => {
    const door = addDoor(board, 2, 1);
    door.open();
    new StormBolterMarine(board, { c: 2, r: 1 }, Dir.N); // standing in the doorway
    const m = new StormBolterMarine(board, { c: 2, r: 2 }, Dir.N);
    expect(m.useDoor()).toBe(false);
    expect(door.isOpen).toBe(true);
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
