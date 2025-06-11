import { GameCycle } from '../GameCycle.js';

/**
 * Abstract phase in the Sulk turn loop.
 * Sub-classes implement `next()` to return the subsequent phase.
 */
export abstract class Phase {
  /** Human-readable phase name. */
  abstract readonly name: string

  /** Called exactly once when the phase becomes active.  Stub for now. */
  onEnter(): void {}

  /**
   * Produces the next phase object.
   * Must never return `this`.
   */
  abstract next(context: GameCycle): Phase
}
