import { Feature } from './Feature.js';
import type { Square } from '../board/Square.js';
import { Dir, DIR_VEC } from '../core/Direction.js';

/**
 * EDGE-MODEL door: the door lives on the BOUNDARY between its anchor square
 * and the neighbor in `facing` — it does not occupy a square. Movement checks
 * the edge in `Piece.tryMove`, sight checks it in `board/los.ts`, the AI opens
 * it on contact in `StealerAI`. The Feature registration on the anchor square
 * exists only so `Board.doorsAt()` can find it.
 */
export class Door extends Feature {
  private closed = true
  /** Which neighbor of the anchor square the door edge borders. */
  readonly facing: Dir

  constructor(square: Square, facing: Dir = Dir.N) { super(square); this.facing = facing }

  get isOpen(): boolean { return !this.closed }

  /** The square on the far side of the edge from the anchor. */
  otherSide(): { c: number; r: number } {
    const v = DIR_VEC[this.facing]
    return { c: this.square.x + v.dc, r: this.square.y + v.dr }
  }

  open(): void  { this.closed = false }
  close(): void { this.closed = true }

  toggle(): void { this.closed = !this.closed }

  // The edge blocks; the anchor square itself never does.
  blocksMove() { return false }
  blocksLOS()  { return false }
}

export const DOOR_FACING: Record<'up' | 'right' | 'down' | 'left', Dir> = {
  up: Dir.N, right: Dir.E, down: Dir.S, left: Dir.W
}
