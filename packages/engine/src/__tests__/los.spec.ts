import { describe, it, expect, beforeEach } from 'vitest';
import { Board } from '../board/Board.js';
import { Square } from '../board/Square.js';
import { hasLineOfSight } from '../board/los.js';
import { Feature } from '../rules/Feature.js';

// A concrete implementation of Feature for testing purposes
class MockFeature extends Feature {
  constructor(square: Square, private _blocksMove = false, private _blocksLOS = false) {
    super(square);
  }
  blocksMove(): boolean { return this._blocksMove; }
  blocksLOS(): boolean { return this._blocksLOS; }
}

describe('Geometry & LOS', () => {
  let board: Board;

  beforeEach(() => {
    // Create a clean 5x5 board for each test
    board = new Board(5, 5, []);
  });

  describe('Square', () => {
    it('isAdjacent() should correctly identify an 8-way neighbourhood for the centre square', () => {
      const centerSquare = board.getSquare(2, 2)!;
      const expectedAdjacents = [
        [1, 1], [2, 1], [3, 1],
        [1, 2],         [3, 2],
        [1, 3], [2, 3], [3, 3],
      ];

      const actualAdjacents = board.adjacentsOf(centerSquare).map(s => s.coord);

      expect(actualAdjacents).toHaveLength(expectedAdjacents.length);
      expect(actualAdjacents).toEqual(expect.arrayContaining(expectedAdjacents));

      // Also test the method on the Square class directly
      for (let y = 0; y < 5; y++) {
        for (let x = 0; x < 5; x++) {
          const otherSquare = board.getSquare(x, y)!;
          const isAdjacent = centerSquare.isAdjacent(otherSquare);
          const expected = expectedAdjacents.some(([ex, ey]) => ex === x && ey === y);
          expect(isAdjacent).toBe(expected);
        }
      }
    });
  });

  describe('hasLineOfSight', () => {
    // Test matrix: [name, start, end, expected, blocker?]
    const testCases: [string, [number, number], [number, number], boolean, [number, number]?][] = [
      ['Orthogonal clear',   [2, 2], [2, 0], true,  undefined],
      ['Orthogonal clear horizontal', [0, 2], [4, 2], true,  undefined],
      ['Orthogonal blocked', [2, 2], [2, 4], false, [2, 3]],
      ['Diagonal clear',     [2, 2], [0, 0], true,  undefined],
      ['Diagonal blocked',   [2, 2], [4, 4], false, [3, 3]],
      ['Oblique clear',      [0, 2], [4, 3], true,  undefined],
      ['Oblique blocked',    [0, 1], [4, 2], false, [2, 2]], // As per prompt, (2,2) blocks
      ['Same square',        [2, 2], [2, 2], true,  undefined],
      ['Non-oblique line',   [0, 0], [0, 4], true,  undefined],
    ];

    for (const [name, aCoord, bCoord, expected, blockerCoord] of testCases) {
      it(`${name}: ${aCoord} -> ${bCoord} should be ${expected}`, () => {
        // Set blocker if one is specified for this test case
        if (blockerCoord) {
          const blocker = board.getSquare(blockerCoord[0], blockerCoord[1])!;
          blocker.features.add(new MockFeature(blocker, false, true));
        }

        const squareA = board.getSquare(aCoord[0], aCoord[1])!;
        const squareB = board.getSquare(bCoord[0], bCoord[1])!;
        const result = hasLineOfSight(board, squareA, squareB);

        expect(result).toBe(expected);
      });
    }
  });
});
