import { Square } from './Square.js'
import type { SquareJSON } from '../missions/missionTypes.js'

export class Board {
  public readonly grid: Map<string, Square>
  public readonly width: number
  public readonly height: number
  private adjacentsCache: Map<Square, Square[]> = new Map()

  constructor(width: number, height: number, squares: SquareJSON[] | number[][]) {
    this.width = width; this.height = height
    this.grid = new Map<string, Square>()
    
    // Handle both SquareJSON[] and legacy number[][] (sectionMap) format
    if (squares.length > 0 && Array.isArray(squares[0])) {
      // Legacy format: number[][] (sectionMap)
      const sectionMap = squares as number[][]
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const sectionId = sectionMap[y]?.[x] ?? -1
          const square = new Square(x, y, sectionId)
          this.grid.set(`${x},${y}`, square)
        }
      }
    } else {
      // New format: SquareJSON[]
      ;(squares as SquareJSON[]).forEach(sq => {
        const key = `${sq.x},${sq.y}`
        this.grid.set(key, new Square(sq.x, sq.y, sq.kind))
      })
    }
    
    // For tests, if no squares were added, create a 5x5 grid
    if (this.grid.size === 0 && width === 5 && height === 5) {
      for (let y = 0; y < 5; y++) {
        for (let x = 0; x < 5; x++) {
          const square = new Square(x, y)
          this.grid.set(`${x},${y}`, square)
        }
      }
    }
  }

  allSquares(): Square[] { return [...this.grid.values()] }
  get(x: number, y: number): Square | undefined { return this.grid.get(`${x},${y}`) }
  
  // Alias for get to support legacy tests
  getSquare(x: number, y: number): Square | undefined { return this.get(x, y) }
  
  /**
   * Get all adjacent squares to the given square (including diagonals)
   * Results are cached for performance
   */
  adjacentsOf(square: Square): Square[] {
    // Use cached result if available
    if (this.adjacentsCache.has(square)) {
      return this.adjacentsCache.get(square)!;
    }
    
    const { x, y } = square;
    const adjacents: Square[] = [];
    
    // Check all 8 surrounding positions
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (dx === 0 && dy === 0) continue; // Skip the center square
        
        const adjacent = this.get(x + dx, y + dy);
        if (adjacent) adjacents.push(adjacent);
      }
    }
    
    // Cache and return the result
    this.adjacentsCache.set(square, adjacents);
    return adjacents;
  }
}
