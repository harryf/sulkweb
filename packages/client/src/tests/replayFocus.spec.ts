import { FOCUS, planReplayFocus, replayOffsets, type StreamEvent } from '../utils/replayFocus'
import { Genestealer } from '@sulk/engine/index.js'

const move = (pieceId: string, x: number, y: number, facing = 0): StreamEvent =>
  ({ type: 'pieceMoved', payload: { pieceId, x, y, facing } })
const added = (pieceId: string, x: number, y: number): StreamEvent =>
  ({ type: 'pieceAdded', payload: { pieceId, kind: 'stealer', x, y, facing: 0 } })
const combat = (attackerId: string, defenderId: string): StreamEvent =>
  ({ type: 'closeCombat', payload: { attackerId, defenderId, attackerRolls: [6], defenderRolls: [1], outcome: 'attacker' } })

const MARINE = [{ x: 10, y: 10 }]

describe('replay focus planner (ISC-772..778)', () => {
  it('exports the FOCUS config with the tuning surface (ISC-772)', () => {
    expect(FOCUS.nearDist).toBeGreaterThan(0)
    expect(FOCUS.retargetDist).toBeLessThan(FOCUS.nearDist)
    for (const k of ['panMs', 'facingOnlyDelayMs'] as const) expect(FOCUS[k]).toBeGreaterThan(0)
    expect(FOCUS.vignette.alpha).toBeLessThan(1)
    expect(FOCUS.lunge.px).toBeLessThanOrEqual(20)
  })

  it('annotates near-marine moves with focus points (ISC-773)', () => {
    const plan = planReplayFocus([move('s1', 8, 8)], { s1: { x: 7, y: 7 } }, MARINE)
    expect(plan[0]?.focus).toEqual({ x: 8, y: 8 })
  })

  it('far moves produce no focus (ISC-774)', () => {
    const plan = planReplayFocus([move('s1', 30, 30)], { s1: { x: 29, y: 29 } }, MARINE)
    expect(plan[0]).toBeNull()
  })

  it('spawn events never pan; a far reinforcement marching in is silent until it is near (ISC-775)', () => {
    const plan = planReplayFocus(
      [added('s9', 30, 30), move('s9', 29, 29), move('s9', 12, 12)],
      {}, MARINE)
    expect(plan[0]).toBeNull()             // the spawn itself
    expect(plan[1]).toBeNull()             // still far
    expect(plan[2]?.focus).toEqual({ x: 12, y: 12 }) // now inside the tension radius
  })

  it('retarget throttle: nearby follow-up action re-pans only after real relocation (ISC-776)', () => {
    const plan = planReplayFocus(
      [move('s1', 8, 8), move('s2', 9, 9), move('s3', 8, 14)],
      { s1: { x: 7, y: 7 }, s2: { x: 9, y: 8 }, s3: { x: 8, y: 13 } }, MARINE)
    expect(plan[0]?.focus).toBeTruthy()
    expect(plan[1]).toBeNull()                        // 1 square from the current focus — hold
    expect(plan[2]?.focus).toEqual({ x: 8, y: 14 })   // 6 rows away — re-pan
  })

  it('closeCombat always focuses and stages the attack from tracked squares (ISC-777)', () => {
    const plan = planReplayFocus(
      [combat('s1', 'm1')],
      { s1: { x: 10, y: 11 }, m1: { x: 10, y: 10 } }, MARINE)
    expect(plan[0]?.attack).toEqual({ x: 10, y: 10, ax: 10, ay: 11, attackerId: 's1', defenderId: 'm1' })
    expect(plan[0]?.focus).toEqual({ x: 10, y: 10 })
  })

  it('the tracker follows the stream: move then attack stages from the NEW square (ISC-778)', () => {
    const plan = planReplayFocus(
      [move('s1', 10, 11), combat('s1', 'm1')],
      { s1: { x: 12, y: 13 }, m1: { x: 10, y: 10 } }, MARINE)
    expect(plan[1]?.attack?.ax).toBe(10)
    expect(plan[1]?.attack?.ay).toBe(11)
  })

  it('facing-only moves are annotated for fast pacing and never pan (ISC-787 companion)', () => {
    const plan = planReplayFocus([move('s1', 8, 8, 2)], { s1: { x: 8, y: 8 } }, MARINE)
    expect(plan[0]).toEqual({ facingOnly: true })
  })

  it('door toggles and deaths near the squad focus; throttled or unknown ones stay silent', () => {
    const plan = planReplayFocus(
      [{ type: 'doorToggled', payload: { x: 9, y: 9, facing: 0, open: true } },
       { type: 'pieceDied', payload: { pieceId: 's1' } },        // 1 square from focus — throttled
       { type: 'pieceDied', payload: { pieceId: 'ghost' } },     // untracked id — silent
       { type: 'doorToggled', payload: { x: 40, y: 40, facing: 0, open: true } }], // far — silent
      { s1: { x: 9, y: 10 } }, MARINE)
    expect(plan[0]?.focus).toEqual({ x: 9, y: 9 })
    expect(plan[1]).toBeNull()
    expect(plan[2]).toBeNull()
    expect(plan[3]).toBeNull()
  })

  it('replayOffsets: facing-only spins pace fast, everything else by type, end appended', () => {
    const delays = { pieceMoved: 110, closeCombat: 260 }
    const stream = [move('s1', 8, 8), move('s1', 8, 8, 2), combat('s1', 'm1')]
    const plan = planReplayFocus(stream, { s1: { x: 7, y: 8 }, m1: { x: 8, y: 7 } }, MARINE)
    const offsets = replayOffsets(stream.map(e => e.type), plan, delays)
    // move fires at 80, spin at 80+110, combat at that + facingOnly 40; the
    // extra final element is the timeline end for finishReplay scheduling.
    expect(offsets).toEqual([80, 190, 190 + FOCUS.facingOnlyDelayMs, 190 + FOCUS.facingOnlyDelayMs + 260])
    // Unknown types cost zero, never NaN.
    const weird = replayOffsets(['cpChanged'], [null], delays)
    expect(weird).toEqual([80, 80])
  })

  it('the client tension radius and the engine charge radius are the SAME concept', () => {
    // If CHARGE_DIST is ever retuned, stealers would spin off camera: the
    // planner must pan wherever the engine charges. Diverge only on purpose.
    expect(FOCUS.nearDist).toBe(Genestealer.CHARGE_DIST)
  })

  it('unknown ids and event types degrade to null, never throw', () => {
    const plan = planReplayFocus(
      [combat('ghost', 'm1'), { type: 'cpChanged', payload: { cp: 3 } },
       { type: 'blipConverted', payload: { blipId: 'b1' } }],
      { b1: { x: 9, y: 9 } }, MARINE)
    expect(plan[0]).toBeNull()
    expect(plan[1]).toBeNull()
    expect(plan[2]?.focus).toEqual({ x: 9, y: 9 }) // conversion near the squad focuses
  })
})
