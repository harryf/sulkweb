import { Square } from './Square.js';

/**
 * Represents the game board, containing all squares.
 */
export class Board {
  public readonly width: number;
  public readonly height: number;
  private readonly coordMap: Map<string, Square> = new Map();
  private readonly adjacencyCache: Map<Square, Square[]> = new Map();

  /**
   * @param width The width of the board.
   * @param height The height of the board.
   * @param sectionMap A 2D array defining the section ID for each square.
   */
  constructor(width: number, height: number, sectionMap: number[][]) {
    this.width = width;
    this.height = height;

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const sectionId = sectionMap[y]?.[x] ?? -1;
        const square = new Square(x, y, sectionId);
        this.coordMap.set(`${x},${y}`, square);
      }
    }
  }

  /**
   * Retrieves a square by its coordinates.
   * @param x The x-coordinate.
   * @param y The y-coordinate.
   * @returns The square at the given coordinates, or undefined if out of bounds.
   */
  getSquare(x: number, y: number): Square | undefined {
    return this.coordMap.get(`${x},${y}`);
  }

  /**
   * Gets all squares adjacent to the given square (8-directional).
   * Results are cached for performance.
   * @param square The square to find adjacents of.
   * @returns An array of adjacent squares.
   */
  adjacentsOf(square: Square): Square[] {
    if (this.adjacencyCache.has(square)) {
      return this.adjacencyCache.get(square)!;
    }

    const adjacents: Square[] = [];
    const [x, y] = square.coord;

    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (dx === 0 && dy === 0) continue;
        const newX = x + dx;
        const newY = y + dy;
        const adjacentSquare = this.getSquare(newX, newY);
        if (adjacentSquare) {
          adjacents.push(adjacentSquare);
        }
      }
    }

    this.adjacencyCache.set(square, adjacents);
    return adjacents;
  }

  /**
   * @returns An iterable of all squares on the board.
   */
  allSquares(): Iterable<Square> {
    return this.coordMap.values();
  }
}
