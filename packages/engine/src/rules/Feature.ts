
import { Square } from '../board/Square';

export abstract class Feature {
  readonly square: Square        // import from board
  protected constructor(square: Square) { this.square = square }

  /** If true this feature forbids entering its square. */
  abstract blocksMove(): boolean
  /** If true this feature blocks LOS through its square. */
  abstract blocksLOS(): boolean
}
