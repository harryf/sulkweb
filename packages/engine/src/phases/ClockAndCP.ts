import { Phase } from './Phase'
import { GameCycle } from '../GameCycle'
import { MarineAction } from './MarineAction'

export class ClockAndCP extends Phase {
  readonly name = 'ClockAndCP'
  next(_ctx: GameCycle) { return new MarineAction() }
}
