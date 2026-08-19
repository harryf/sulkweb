/**
 * Replay action camera: pure planner that walks a captured stealer-phase
 * event stream and decides where the camera should look. Everything here is
 * deterministic and jsdom-testable; GameScene only schedules what the plan
 * says. Positions are BOARD SQUARES throughout.
 */

export const FOCUS = {
  /** Action within this Chebyshev distance of any marine is worth watching. */
  nearDist: 6,
  /** The action must move this far from the current focus before re-panning. */
  retargetDist: 4,
  panMs: 180,
  shake: { durationMs: 150, intensity: 0.006 },
  vignette: { alpha: 0.55, inMs: 120, holdMs: 420, outMs: 260, scale: 2.2 },
  lunge: { px: 10, durationMs: 70 },
  /** Replay pacing for facing-only pieceMoved events (charge spins, path
   *  turns) — a fraction of the full move delay keeps replays brisk. */
  facingOnlyDelayMs: 40,
} as const

export type Square = { x: number; y: number }

export type StreamEvent = { type: string; payload: Record<string, unknown> }

export type FocusAnnotation = {
  /** Pan the camera here when this event replays. */
  focus?: Square
  /** Close combat: full staging for shake + vignette + attacker lunge. */
  attack?: Square & { ax: number; ay: number; attackerId: string; defenderId: string }
  /** pieceMoved that only changed facing — pace it faster. */
  facingOnly?: boolean
}

const cheb = (a: Square, b: Square) => Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y))

/**
 * Annotate a captured stream with camera focus decisions.
 * - Moves/door toggles/conversions/deaths near a marine get a focus point,
 *   throttled so the camera only re-pans when the action genuinely relocates.
 * - closeCombat ALWAYS focuses (it is by definition on a marine) and carries
 *   the attack staging; the internal tracker supplies the squares the event
 *   payloads do not (positions as of THAT moment in the stream, not final
 *   engine state — the payload-not-engine invariant).
 * - Spawn events themselves never pan; far-off reinforcements are already
 *   excluded by the near filter as they march in.
 */
/**
 * Fire times for every event in the replay timeline, plus the end time as the
 * final extra element. Facing-only spins pace at facingOnlyDelayMs; every
 * other event uses its type's delay from the pacing table. Pure, so the
 * scheduling arithmetic is pinned by unit tests instead of clock sampling.
 */
export function replayOffsets(
  types: readonly string[],
  plan: readonly (FocusAnnotation | null)[],
  delays: Readonly<Record<string, number>>,
  baseMs = 80,
  cfg: typeof FOCUS = FOCUS,
): number[] {
  const out: number[] = []
  let at = baseMs
  types.forEach((t, i) => {
    out.push(at)
    at += plan[i]?.facingOnly ? cfg.facingOnlyDelayMs : (delays[t] ?? 0)
  })
  out.push(at)
  return out
}

export function planReplayFocus(
  stream: readonly StreamEvent[],
  seedPositions: Record<string, Square>,
  marineSquares: readonly Square[],
  cfg: typeof FOCUS = FOCUS,
): (FocusAnnotation | null)[] {
  const pos: Record<string, Square> = { ...seedPositions }
  let lastFocus: Square | null = null
  const nearMarine = (s: Square) => marineSquares.some(m => cheb(s, m) <= cfg.nearDist)
  const throttled = (s: Square) => lastFocus !== null && cheb(s, lastFocus) <= cfg.retargetDist

  return stream.map((ev) => {
    const p = ev.payload as any
    switch (ev.type) {
      case 'pieceAdded': {
        pos[p.pieceId] = { x: p.x, y: p.y }
        return null
      }
      case 'pieceMoved': {
        const prev = pos[p.pieceId]
        const here = { x: p.x, y: p.y }
        pos[p.pieceId] = here
        const facingOnly = prev !== undefined && prev.x === here.x && prev.y === here.y
        if (facingOnly) return { facingOnly: true }
        if (!nearMarine(here) || throttled(here)) return null
        lastFocus = here
        return { focus: here }
      }
      case 'doorToggled':
      case 'pieceDied':
      case 'blipConverted': {
        const here: Square | undefined =
          ev.type === 'doorToggled' ? { x: p.x, y: p.y } : pos[p.pieceId ?? p.blipId]
        if (!here || !nearMarine(here) || throttled(here)) return null
        lastFocus = here
        return { focus: here }
      }
      case 'closeCombat': {
        const a = pos[p.attackerId]
        const d = pos[p.defenderId]
        if (!a || !d) return null
        lastFocus = d
        return { focus: d, attack: { x: d.x, y: d.y, ax: a.x, ay: a.y, attackerId: p.attackerId, defenderId: p.defenderId } }
      }
      default:
        return null
    }
  })
}
