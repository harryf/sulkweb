
import { describe, it, expect, beforeEach } from 'vitest';
import { Board } from '../board/Board';
import { Square } from '../board/Square';
import { Piece } from '../rules/Piece';
import { Door } from '../rules/Door';
import { RIGHT, BACK, Dir, chebyshev } from '../rules/directions';

// Build 5x5 board for testing adjacency
const board = new Board(5, 5, Array(5).fill(null).map(() => Array(5).fill(0)));
const centre = board.getSquare(2, 2)!;
const north = board.getSquare(2, 1)!;
const east = board.getSquare(3, 2)!;
const diag = board.getSquare(3, 1)!; // NE of centre

describe('Piece movement & turn costs', () => {
  let piece: Piece;

  beforeEach(() => {
    piece = new Piece(board, centre, 0); // Facing North
  });

  it('moves forward for 1 AP', () => {
    const cost = piece.canMove(north);
    expect(cost).toBe(1);
    expect(piece.move(north)).toBe(true);
    expect(piece.apRemaining).toBe(3);
    expect(piece.square).toBe(north);
  });

  it('moves diagonally forward for 1 AP', () => {
    piece.facing = 1; // Face East
    const cost = piece.canMove(diag);
    expect(cost).toBe(1);
    expect(piece.move(diag)).toBe(true);
    expect(piece.apRemaining).toBe(3);
    expect(piece.square).toBe(diag);
  });

  it('cannot move without AP', () => {
    piece.apRemaining = 0;
    const cost = piece.canMove(north);
    expect(cost).toBeUndefined();
    expect(piece.move(north)).toBe(false);
    expect(piece.apRemaining).toBe(0);
  });

  it('cannot move to non-adjacent square', () => {
    const farSquare = board.getSquare(0,0)!;
    const cost = piece.canMove(farSquare);
    expect(cost).toBeUndefined();
    expect(piece.move(farSquare)).toBe(false);
  });

  it('turn right costs 1 AP, back costs 2', () => {
    const turnRightCost = piece.canTurn(RIGHT);
    expect(turnRightCost).toBe(1);
    expect(piece.turn(RIGHT)).toBe(true);
    expect(piece.apRemaining).toBe(3);
    expect(piece.facing).toBe(1); // East

    const turnBackCost = piece.canTurn(BACK);
    expect(turnBackCost).toBe(2);
    expect(piece.turn(BACK)).toBe(true);
    expect(piece.apRemaining).toBe(1);
    expect(piece.facing).toBe(3); // West
  });

  it('cannot turn without AP', () => {
    piece.apRemaining = 0;
    const cost = piece.canTurn(RIGHT);
    expect(cost).toBeUndefined();
    expect(piece.turn(RIGHT)).toBe(false);
  });

  it('cannot move if heading is invalid', () => {
    const originalHeadingTo = piece.square.headingTo;
    piece.square.headingTo = () => 'INVALID' as any;
    const cost = piece.canMove(north);
    expect(cost).toBeUndefined();
    piece.square.headingTo = originalHeadingTo; // Restore original method
  });

  it('cannot move if heading is empty', () => {
    const originalHeadingTo = piece.square.headingTo;
    piece.square.headingTo = () => '';
    const cost = piece.canMove(north);
    expect(cost).toBeUndefined();
    piece.square.headingTo = originalHeadingTo; // Restore original method
  });
});

describe('Door logic', () => {
  let piece: Piece;
  let door: Door;

  beforeEach(() => {
    // Clear features before each test
    north.features.clear();
    piece = new Piece(board, centre, 0); // Facing North
    door = new Door(north, 0); // Door on the north square, facing North
    north.features.add(door);
  });

  it('closed door blocks move/LOS', () => {
    expect(door.blocksMove()).toBe(true);
    expect(door.blocksLOS()).toBe(true);
    const cost = piece.canMove(north);
    expect(cost).toBeUndefined();
    expect(piece.move(north)).toBe(false);
  });

  it('open door allows move/LOS', () => {
    door.open();
    expect(door.blocksMove()).toBe(false);
    expect(door.blocksLOS()).toBe(false);
    const cost = piece.canMove(north);
    expect(cost).toBe(1);
    expect(piece.move(north)).toBe(true);
  });

  it('toggle switches state', () => {
    expect(door.blocksMove()).toBe(true);
    door.toggle();
    expect(door.blocksMove()).toBe(false);
    door.toggle();
    expect(door.blocksMove()).toBe(true);
  });

  it('close works as expected', () => {
    door.open();
    expect(door.blocksMove()).toBe(false);
    door.close();
    expect(door.blocksMove()).toBe(true);
  });
});

describe('Directions helpers', () => {
  it('chebyshev distance is correct', () => {
    expect(chebyshev(3, 5)).toBe(5);
    expect(chebyshev(-3, -5)).toBe(5);
    expect(chebyshev(3, -5)).toBe(5);
    expect(chebyshev(0, 0)).toBe(0);
  });
});
