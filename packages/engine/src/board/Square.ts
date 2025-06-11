import { Feature } from '../rules/Feature';
import { Dir } from '../rules/directions';

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
  public features: Set<Feature>;

  /**
   * @param x The x-coordinate.
   * @param y The y-coordinate.
   * @param sectionId The section ID.
   * @param features The set of features for this square.
   */
  constructor(x: number, y: number, sectionId: number, features: Set<Feature> = new Set()) {
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
   * Determines the heading from this square to another, relative to a given facing.
   * @param other The other square.
   * @param facing The current facing direction. 0=N, 1=E, 2=S, 3=W.
   * @returns The heading as a string like 'F', 'B', 'L', 'R', 'FL', 'FR', 'BL', 'BR'.
   */
  headingTo(other: Square, facing: Dir = 0): 'F' | 'R' | 'B' | 'L' | 'FL' | 'FR' | 'BL' | 'BR' | '' {
    if (!this.isAdjacent(other)) {
      return '';
    }

    const dx = other.coord[0] - this.coord[0];
    const dy = other.coord[1] - this.coord[1];

    // Map dx, dy to an absolute direction: 0:N, 1:NE, 2:E, 3:SE, 4:S, 5:SW, 6:W, 7:NW
    let absoluteDir = 0;
    if (dx === 0 && dy === -1) absoluteDir = 0; // N
    else if (dx === 1 && dy === -1) absoluteDir = 1; // NE
    else if (dx === 1 && dy === 0) absoluteDir = 2; // E
    else if (dx === 1 && dy === 1) absoluteDir = 3; // SE
    else if (dx === 0 && dy === 1) absoluteDir = 4; // S
    else if (dx === -1 && dy === 1) absoluteDir = 5; // SW
    else if (dx === -1 && dy === 0) absoluteDir = 6; // W
    else if (dx === -1 && dy === -1) absoluteDir = 7; // NW

    // The piece's facing is Dir (0:N, 1:E, 2:S, 3:W).
    // Each increment in Dir is a 90-degree clockwise turn.
    // Our absoluteDir is in 45-degree increments. So a facing of 1 (East) means we rotate the grid by 2 units (90 degrees).
    const rotation = facing * 2;
    const relativeDir = (absoluteDir - rotation + 8) % 8;

    const headings: ('F' | 'FR' | 'R' | 'BR' | 'B' | 'BL' | 'L' | 'FL')[] = ['F', 'FR', 'R', 'BR', 'B', 'BL', 'L', 'FL'];
    return headings[relativeDir];
  }
}
