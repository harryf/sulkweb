/**
 * Represents a single square on the game board.
 */
export class Square {
  /**
   * Integer grid coordinates (x right, y down).
   */
  public readonly coord: readonly [number, number];

  /**
   * Identifier of the room this square belongs to (`0` = corridor).
   */
  public sectionId: number;

  /**
   * Minimal flags so LOS can consult obstacles.
   */
  public features: Set<'BLOCK_MOVE' | 'BLOCK_LOS'>;

  /**
   * @param x The x-coordinate.
   * @param y The y-coordinate.
   * @param sectionId The section ID.
   * @param features The set of features for this square.
   */
  constructor(x: number, y: number, sectionId: number, features: Set<'BLOCK_MOVE' | 'BLOCK_LOS'> = new Set()) {
    this.coord = [x, y];
    this.sectionId = sectionId;
    this.features = features;
  }

  /**
   * Checks if this square is adjacent to another square (8-directional).
   * @param other The other square.
   * @returns True if the squares are adjacent, false otherwise.
   */
  isAdjacent(other: Square): boolean {
    const [x1, y1] = this.coord;
    const [x2, y2] = other.coord;
    const dx = Math.abs(x1 - x2);
    const dy = Math.abs(y1 - y2);
    return dx <= 1 && dy <= 1 && (dx !== 0 || dy !== 0);
  }

  /**
   * Calculates the Chebyshev distance to another square.
   * @param other The other square.
   * @returns The distance.
   */
  distance(other: Square): number {
    const [x1, y1] = this.coord;
    const [x2, y2] = other.coord;
    return Math.max(Math.abs(x1 - x2), Math.abs(y1 - y2));
  }

  /**
   * Determines the heading from this square to another.
   * @param other The other square.
   * @returns The heading as a string like 'F', 'B', 'L', 'R', 'FL', 'FR', 'BL', 'BR'.
   */
  headingTo(other: Square): 'F' | 'R' | 'B' | 'L' | 'FL' | 'FR' | 'BL' | 'BR' | '' {
    if (!this.isAdjacent(other)) {
      return '';
    }

    const dx = other.coord[0] - this.coord[0];
    const dy = other.coord[1] - this.coord[1];

    const angle = Math.atan2(dy, dx);

    switch (true) {
      case (angle > -Math.PI / 8 && angle <= Math.PI / 8): return 'R';
      case (angle > Math.PI / 8 && angle <= 3 * Math.PI / 8): return 'BR';
      case (angle > 3 * Math.PI / 8 && angle <= 5 * Math.PI / 8): return 'B';
      case (angle > 5 * Math.PI / 8 && angle <= 7 * Math.PI / 8): return 'BL';
      case (angle > 7 * Math.PI / 8 || angle <= -7 * Math.PI / 8): return 'L';
      case (angle > -7 * Math.PI / 8 && angle <= -5 * Math.PI / 8): return 'FL';
      case (angle > -5 * Math.PI / 8 && angle <= -3 * Math.PI / 8): return 'F';
      case (angle > -3 * Math.PI / 8 && angle <= -Math.PI / 8): return 'FR';
      /* v8 ignore next 2 */
      default:
        return ''; // Should be unreachable
    }
  }
}
