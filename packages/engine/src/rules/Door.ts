
import { Feature } from './Feature.js';
import { Square } from '../board/Square.js';
import { Dir } from './directions'

export class Door extends Feature {
  private closed = true
  readonly facing: Dir

  constructor(square: Square, facing: Dir) { super(square); this.facing = facing }

  open(): void  { this.closed = false }
  close(): void { this.closed = true }

  toggle(): void { this.closed ? this.open() : this.close() }

  blocksMove() { return this.closed }
  blocksLOS()  { return this.closed }
}
