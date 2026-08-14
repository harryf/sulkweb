import { Square } from './Square.js'
import type { SquareJSON } from '../missions/missionTypes.js'
import { Door, DOOR_FACING } from '../rules/Door.js'
import { SeededRng, type DiceSource } from '../core/Dice.js'
import { PieceEvents } from '../events/PieceEvents.js'

/** Anything standing on squares — kept minimal to avoid circular imports. */
export interface BoardPiece {
  readonly id: string
  pos: { c: number; r: number }
}

export class Board {
  public readonly grid: Map<string, Square>
  public readonly width: number
  public readonly height: number
  public readonly pieces: BoardPiece[] = []
  /** d6 source used for all combat on this board — tests inject a RollQueue. */
  public dice: DiceSource = new SeededRng(Math.floor(Math.random() * 2147483647))
  /** Set when the game ends — pieces refuse further actions. */
  public locked = false
  private adjacentsCache: Map<Square, Square[]> = new Map()

  constructor(width: number, height: number, squares?: SquareJSON[] | number[][]) {
    this.width = width; this.height = height;
    this.grid = new Map<string, Square>();

    let populatedFromSquares = false;
    if (squares && squares.length > 0) {
      if (Array.isArray(squares[0])) {
        // Legacy format: number[][] (sectionMap)
        const sectionMap = squares as number[][];
        for (let y = 0; y < height; y++) {
          for (let x = 0; x < width; x++) {
            const sectionId = sectionMap[y]?.[x] ?? -1;
            const square = new Square(x, y, sectionId);
            this.grid.set(`${x},${y}`, square);
          }
        }
        populatedFromSquares = this.grid.size > 0;
      } else {
        // New format: SquareJSON[]
        (squares as SquareJSON[]).forEach(sq => {
          const key = `${sq.x},${sq.y}`;
          const square = new Square(sq.x, sq.y, sq.kind);
          if (sq.doorFacing) {
            square.features.add(new Door(square, DOOR_FACING[sq.doorFacing]));
          }
          this.grid.set(key, square);
        });
        populatedFromSquares = this.grid.size > 0;
      }
    }

    // If not populated from a valid 'squares' array, or if 'squares' was empty/undefined,
    // create a default grid. This ensures tests like new Board(3,3) work.
    if (!populatedFromSquares) {
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          // Assuming Square constructor makes it passable by default or handles undefined 'kind'
          const square = new Square(x, y);
          this.grid.set(`${x},${y}`, square);
        }
      }
    }
  }

  allSquares(): Square[] { return [...this.grid.values()] }
  get(x: number, y: number): Square | undefined { return this.grid.get(`${x},${y}`) }

  isPassable(coord: { c: number; r: number }): boolean {
    const square = this.get(coord.c, coord.r);
    if (!square || !square.passable) return false;
    for (const feature of square.features) {
      if (feature.blocksMove?.()) return false;
    }
    return true;
  }

  // ---- piece registry (occupancy) ----

  addPiece(piece: BoardPiece): void {
    if (this.pieces.includes(piece)) return;
    this.pieces.push(piece);
    const kind = (piece as { kind?: string }).kind ?? 'piece';
    const facing = (piece as { facing?: number }).facing ?? 0;
    PieceEvents.emit('pieceAdded', { pieceId: piece.id, kind, x: piece.pos.c, y: piece.pos.r, facing });
  }

  removePiece(piece: BoardPiece): void {
    const i = this.pieces.indexOf(piece);
    if (i >= 0) this.pieces.splice(i, 1);
  }

  pieceAt(coord: { c: number; r: number }): BoardPiece | undefined {
    return this.pieces.find(p => p.pos.c === coord.c && p.pos.r === coord.r);
  }

  isOccupied(coord: { c: number; r: number }): boolean {
    return this.pieceAt(coord) !== undefined;
  }

  /** First door anchored on the square at coord, if any. */
  doorAt(coord: { c: number; r: number }): Door | undefined {
    return this.doorsAt(coord)[0];
  }

  /** All doors anchored on the square at coord. */
  doorsAt(coord: { c: number; r: number }): Door[] {
    const square = this.get(coord.c, coord.r);
    if (!square) return [];
    const doors: Door[] = [];
    for (const feature of square.features) {
      if (feature instanceof Door) doors.push(feature);
    }
    return doors;
  }

  /** Every door on the board (edge-model: each sits between two squares). */
  allDoors(): Door[] {
    const doors: Door[] = [];
    for (const square of this.grid.values()) {
      for (const feature of square.features) {
        if (feature instanceof Door) doors.push(feature);
      }
    }
    return doors;
  }

  /** The door on the edge between two orthogonally-adjacent squares, if any. */
  doorBetween(a: { c: number; r: number }, b: { c: number; r: number }): Door | undefined {
    if (Math.abs(a.c - b.c) + Math.abs(a.r - b.r) !== 1) return undefined;
    for (const door of this.doorsAt(a)) {
      const far = door.otherSide();
      if (far.c === b.c && far.r === b.r) return door;
    }
    for (const door of this.doorsAt(b)) {
      const far = door.otherSide();
      if (far.c === a.c && far.r === a.r) return door;
    }
    return undefined;
  }
  
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
