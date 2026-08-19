import type { CompiledMission, DeploySquareJSON, MarineType } from '../missions/missionTypes.js'
import { Dir, DIR_VEC, FACING_WORD } from '../core/Direction.js'

/** Deployment-phase clock: 90 seconds per squad (1.5 minutes), summed. */
export const DEPLOY_SECONDS_PER_SQUAD = 90

const HEAVY: ReadonlySet<MarineType> =
  new Set(['heavy_flamer', 'assault_cannon', 'chain_fist'])
const SERGEANT: ReadonlySet<MarineType> =
  new Set(['sergeant', 'sergeant_sword'])

/** Default facing of a deploy square (mission word → Dir; JSON default down). */
export function deployFacing(sq: DeploySquareJSON): Dir {
  return FACING_WORD[sq.facing ?? 'down']
}

/** Distinct squads in the mission's deployment (untagged squares = one squad). */
export function deploySquadCount(mission: CompiledMission): number {
  const squads = new Set((mission.marineDeployment ?? []).map(d => d.squad))
  return Math.max(1, squads.size)
}

/** Total deployment clock for the mission: 90s per squad. */
export function deploySeconds(mission: CompiledMission): number {
  return DEPLOY_SECONDS_PER_SQUAD * deploySquadCount(mission)
}

/**
 * Order one squad's deploy squares FRONT to back. The front is the square
 * furthest along its own default facing (the direction the squad will walk):
 * a down-facing column puts the highest row first, a left-facing row the
 * lowest column. Ties keep authored order — deterministic either way.
 */
export function orderSquaresFrontToBack(squares: DeploySquareJSON[]): DeploySquareJSON[] {
  const advance = (d: DeploySquareJSON): number => {
    const v = DIR_VEC[deployFacing(d)]
    return d.x * v.dc + d.y * v.dr
  }
  return [...squares].sort((a, b) => advance(b) - advance(a))
}

/**
 * Sensible battle order for a squad's reserves: a storm bolter takes point,
 * the sergeant second, a heavy weapon third (protected but ready), everyone
 * else behind in roster order. Returns indices into `types`, front to back.
 * Missing roles just skip — a squad of five bolters deploys in roster order.
 */
export function autoDeployOrder(types: MarineType[]): number[] {
  const remaining = types.map((t, i) => ({ t, i }))
  const takeFirst = (pred: (t: MarineType) => boolean): number | undefined => {
    const k = remaining.findIndex(x => pred(x.t))
    return k >= 0 ? remaining.splice(k, 1)[0].i : undefined
  }
  const out: number[] = []
  for (const role of [
    (t: MarineType) => t === 'storm_bolter',
    (t: MarineType) => SERGEANT.has(t),
    (t: MarineType) => HEAVY.has(t),
  ]) {
    const idx = takeFirst(role)
    if (idx !== undefined) out.push(idx)
  }
  out.push(...remaining.map(x => x.i))
  return out
}
