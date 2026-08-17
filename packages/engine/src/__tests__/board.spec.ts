import { describe, it, expect, beforeEach } from 'vitest';
import { Board } from '../board/Board.js';
import { chebyshev } from '../core/Direction.js';

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
      expect(jaggedBoard.get(0, 0)?.sectionId).toBe(0);
      expect(jaggedBoard.get(1, 0)?.sectionId).toBe(1);
      expect(jaggedBoard.get(0, 1)?.sectionId).toBe(2);
      expect(jaggedBoard.get(1, 1)?.sectionId).toBe(-1); // Handled by nullish coalescing
    });

    it('get should return undefined for out-of-bounds coordinates', () => {
      expect(board.get(-1, 0)).toBeUndefined();
      expect(board.get(0, -1)).toBeUndefined();
      expect(board.get(5, 0)).toBeUndefined();
      expect(board.get(0, 5)).toBeUndefined();
    });

    it('adjacentsOf should cache its results', () => {
      const square = board.get(2, 2)!;
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

  describe('chebyshev', () => {
    it('calculates the Chebyshev distance between coordinates', () => {
      expect(chebyshev({ c: 2, r: 2 }, { c: 4, r: 5 })).toBe(3); // dx=2, dy=3 -> max(2,3)=3
      expect(chebyshev({ c: 2, r: 2 }, { c: 2, r: 2 })).toBe(0);
    });
  });
});
