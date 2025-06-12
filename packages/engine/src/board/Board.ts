import { Square } from './Square.js'
import type { SquareJSON } from '../missions/missionTypes.js'

export class Board {
  public readonly grid: Map<string, Square>
  public readonly width: number
  public readonly height: number

  constructor(width: number, height: number, squares: SquareJSON[]) {
    this.width = width; this.height = height
    this.grid = new Map<string, Square>()
    squares.forEach(sq => {
      const key = `${sq.x},${sq.y}`
      this.grid.set(key, new Square(sq.x, sq.y, sq.kind))
    })
  }

  allSquares(): Square[] { return [...this.grid.values()] }
  get(x: number, y: number): Square | undefined { return this.grid.get(`${x},${y}`) }
}
