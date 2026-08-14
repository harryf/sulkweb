import { Feature } from './Feature.js';
import type { Square } from '../board/Square.js';
import { Dir } from '../core/Direction.js';

export class Door extends Feature {
  private closed = true
  /** Orientation the door face points at — drives sprite rotation only. */
  readonly facing: Dir

  constructor(square: Square, facing: Dir = Dir.N) { super(square); this.facing = facing }

  get isOpen(): boolean { return !this.closed }

  open(): void  { this.closed = false }
  close(): void { this.closed = true }

  toggle(): void { this.closed = !this.closed }

  blocksMove() { return this.closed }
  blocksLOS()  { return this.closed }
}

export const DOOR_FACING: Record<'up' | 'right' | 'down' | 'left', Dir> = {
  up: Dir.N, right: Dir.E, down: Dir.S, left: Dir.W
}
