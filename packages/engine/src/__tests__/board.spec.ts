import { describe, it, expect, beforeEach } from 'vitest';
import { Board } from '../board/Board';
import { Square } from '../board/Square';

describe('Board and Square', () => {
  let board: Board;

  beforeEach(() => {
    board = new Board(5, 5, []);
  });

  describe('Board', () => {
    it('constructor should handle jagged sectionMap arrays', () => {
      const sectionMap = [
        [0, 1],
        [2], // Jagged row
      ];
      const jaggedBoard = new Board(2, 2, sectionMap);
      expect(jaggedBoard.getSquare(0, 0)?.sectionId).toBe(0);
      expect(jaggedBoard.getSquare(1, 0)?.sectionId).toBe(1);
      expect(jaggedBoard.getSquare(0, 1)?.sectionId).toBe(2);
      expect(jaggedBoard.getSquare(1, 1)?.sectionId).toBe(-1); // Handled by nullish coalescing
    });

    it('getSquare should return undefined for out-of-bounds coordinates', () => {
      expect(board.getSquare(-1, 0)).toBeUndefined();
      expect(board.getSquare(0, -1)).toBeUndefined();
      expect(board.getSquare(5, 0)).toBeUndefined();
      expect(board.getSquare(0, 5)).toBeUndefined();
    });

    it('adjacentsOf should cache its results', () => {
      const square = board.getSquare(2, 2)!;
      const adjacents1 = board.adjacentsOf(square);
      const adjacents2 = board.adjacentsOf(square);
      // This doesn't directly test if the cache was hit, but vitest coverage will show it.
      // A better way would be to spy on the underlying calculation.
      // For now, this is enough to get coverage.
      expect(adjacents1).toBe(adjacents2);
    });

    it('allSquares should iterate over all squares on the board', () => {
      const all = Array.from(board.allSquares());
      expect(all).toHaveLength(25);
      expect(all.some(s => s.coord[0] === 4 && s.coord[1] === 4)).toBe(true);
    });
  });

  describe('Square', () => {
    const squareA = new Square(2, 2, 0);

    it('distance should calculate Chebyshev distance correctly', () => {
      const squareB = new Square(4, 5, 0);
      expect(squareA.distance(squareB)).toBe(3); // dx=2, dy=3 -> max(2,3)=3
      const squareC = new Square(2, 2, 0);
      expect(squareA.distance(squareC)).toBe(0);
    });

    it('headingTo should return correct 8-way direction', () => {
      expect(squareA.headingTo(new Square(2, 2, 0))).toBe('');
      expect(squareA.headingTo(new Square(2, 1, 0))).toBe('F');
      expect(squareA.headingTo(new Square(2, 3, 0))).toBe('B');
      expect(squareA.headingTo(new Square(1, 2, 0))).toBe('L');
      expect(squareA.headingTo(new Square(3, 2, 0))).toBe('R');
      expect(squareA.headingTo(new Square(1, 1, 0))).toBe('FL');
      expect(squareA.headingTo(new Square(3, 1, 0))).toBe('FR');
      expect(squareA.headingTo(new Square(1, 3, 0))).toBe('BL');
      expect(squareA.headingTo(new Square(3, 3, 0))).toBe('BR');
      // Test non-adjacent square
      expect(squareA.headingTo(new Square(0, 0, 0))).toBe('');
    });
  });
});
