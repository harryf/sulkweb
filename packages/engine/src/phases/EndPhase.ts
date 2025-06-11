import { Phase } from './Phase'
import { GameCycle } from '../GameCycle'
import { ClockAndCP } from './ClockAndCP'

export class EndPhase extends Phase {
  readonly name = 'EndPhase'
  onEnter() { /* turn ends */ }
  next(ctx: GameCycle) {
    ctx.turnNumber += 1          // advance turn counter here
    return new ClockAndCP()
  }
}
