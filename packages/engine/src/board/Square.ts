export type SquareKind = 'corridor' | 'room'

export class Square {
  public readonly coord: [number, number]
  public readonly features: Set<any> = new Set()
  public readonly sectionId: number = -1

  constructor(
    public readonly x: number,
    public readonly y: number,
    public readonly kind: SquareKind | number = 'corridor',
  ) {
    this.coord = [x, y]
    // Handle legacy tests that pass a number as sectionId instead of SquareKind
    if (typeof kind === 'number') {
      this.sectionId = kind
    }
  }

  /**
   * Calculate Chebyshev distance (max of dx, dy) to another square
   */
  distance(other: Square): number {
    const dx = Math.abs(this.x - other.x)
    const dy = Math.abs(this.y - other.y)
    return Math.max(dx, dy)
  }

  /**
   * Check if another square is adjacent (including diagonals)
   */
  isAdjacent(other: Square): boolean {
    return this.distance(other) <= 1 && this !== other
  }

  /**
   * Get the heading direction to another square as a string
   * F=Forward (North), B=Back (South), L=Left (West), R=Right (East)
   * Can be combined like FL, FR, BL, BR for diagonals
   * Returns empty string if squares are not adjacent or are the same
   */
  headingTo(other: Square): string {
    if (this === other || this.distance(other) > 1) return ''
    
    let heading = ''
    if (other.y < this.y) heading += 'F'
    if (other.y > this.y) heading += 'B'
    if (other.x < this.x) heading += 'L'
    if (other.x > this.x) heading += 'R'
    
    return heading
  }
}
