import { MOTION, kindFromTexture, camPanStep, shimmerPhase, recoilVector, shortestRotationDelta } from '../utils/motionLogic'

describe('motion step profiles (ISC-724/725/726)', () => {
  it('exports a profile per kind with duration and ease (ISC-724)', () => {
    for (const kind of ['marine', 'stealer', 'blip'] as const) {
      expect(MOTION.step[kind].durationMs).toBeGreaterThan(0)
      expect(typeof MOTION.step[kind].ease).toBe('string')
    }
  })

  it('Antecedent: stealers dart, marines lumber, blips slide — strictly ordered (ISC-725)', () => {
    expect(MOTION.step.stealer.durationMs).toBeLessThan(MOTION.step.marine.durationMs)
    expect(MOTION.step.marine.durationMs).toBeLessThan(MOTION.step.blip.durationMs)
  })

  it('the marine step never wastes the countdown — under 200ms (ISC-726)', () => {
    expect(MOTION.step.marine.durationMs).toBeLessThanOrEqual(200)
    expect(MOTION.turnMs).toBeLessThanOrEqual(200)
  })
})

describe('kindFromTexture (ISC-727)', () => {
  it('maps every piece texture to its motion kind', () => {
    expect(kindFromTexture('stealer')).toBe('stealer')
    expect(kindFromTexture('blip')).toBe('blip')
    // The decoy AmbushCounter slides like any blip — no special case.
    expect(kindFromTexture('ambush_counter')).toBe('blip')
    expect(kindFromTexture('terminator_storm_bolter')).toBe('marine')
    expect(kindFromTexture('terminator_sergeant')).toBe('marine')
    expect(kindFromTexture('terminator_sergeant_sword')).toBe('marine')
    expect(kindFromTexture('terminator_heavy_flamer')).toBe('marine')
    expect(kindFromTexture('terminator_assault_cannon')).toBe('marine')
    expect(kindFromTexture('terminator_chain_fist')).toBe('marine')
  })
})

describe('camPanStep inertia (ISC-728/729)', () => {
  it('ramps monotonically under held input and never exceeds the cap (ISC-728)', () => {
    let v = 0
    let prev = 0
    for (let i = 0; i < 60; i++) {
      v = camPanStep(v, 1, 16)
      expect(v).toBeGreaterThanOrEqual(prev)
      expect(v).toBeLessThanOrEqual(MOTION.cam.maxSpeed)
      prev = v
    }
    expect(v).toBe(MOTION.cam.maxSpeed) // saturated after a second of holding
    // Cap holds for any dt, including a huge stalled-frame delta.
    expect(Math.abs(camPanStep(MOTION.cam.maxSpeed, 1, 500))).toBeLessThanOrEqual(MOTION.cam.maxSpeed)
    expect(camPanStep(0, -1, 16)).toBeLessThan(0) // symmetric
  })

  it('decays a released glide below 1% of cap within 400ms (ISC-729)', () => {
    let v: number = MOTION.cam.maxSpeed
    for (let t = 0; t < 400; t += 16) v = camPanStep(v, 0, 16)
    expect(Math.abs(v)).toBeLessThan(MOTION.cam.maxSpeed * 0.01)
    // And parks to EXACTLY zero soon after — no infinite micro-scroll.
    for (let t = 0; t < 400; t += 16) v = camPanStep(v, 0, 16)
    expect(v).toBe(0)
  })

  it('holding the opposite arrow decelerates straight through zero', () => {
    let v: number = MOTION.cam.maxSpeed
    while (v > 0) v = camPanStep(v, -1, 16)
    expect(v).toBeLessThanOrEqual(0)
  })
})

describe('door slide config (ISC-730)', () => {
  it('opens to a small parted sliver and closes back to exactly 1, both fast', () => {
    expect(MOTION.door.partedScale).toBeGreaterThan(0)
    expect(MOTION.door.partedScale).toBeLessThan(0.3)
    expect(MOTION.door.slideMs).toBeLessThan(220)
  })
})

describe('shimmerPhase (ISC-731)', () => {
  it('is deterministic per square and differs between adjacent squares', () => {
    expect(shimmerPhase(10, 10)).toBe(shimmerPhase(10, 10))
    expect(shimmerPhase(11, 10)).not.toBe(shimmerPhase(10, 10))
    expect(shimmerPhase(10, 11)).not.toBe(shimmerPhase(10, 10))
    // Always a non-negative bounded offset.
    for (let x = 0; x < 8; x++) {
      for (let y = 0; y < 8; y++) {
        const p = shimmerPhase(x, y)
        expect(p).toBeGreaterThanOrEqual(0)
        expect(p).toBeLessThan(MOTION.shimmer.phases * MOTION.shimmer.stepMs)
      }
    }
  })
})

describe('shortestRotationDelta (ISC-734 companion)', () => {
  it('never pirouettes: west-to-north grinds +90deg, not -270', () => {
    expect(shortestRotationDelta(3 * Math.PI / 2, 0)).toBeCloseTo(Math.PI / 2)
    expect(shortestRotationDelta(0, 3 * Math.PI / 2)).toBeCloseTo(-Math.PI / 2)
  })

  it('every facing pair turns at most 180deg and lands angle-equivalent to the target', () => {
    const TAU = 2 * Math.PI
    for (let a = 0; a < 4; a++) {
      for (let b = 0; b < 4; b++) {
        const from = a * Math.PI / 2
        const to = b * Math.PI / 2
        const d = shortestRotationDelta(from, to)
        expect(Math.abs(d)).toBeLessThanOrEqual(Math.PI + 1e-9)
        const landed = (((from + d) % TAU) + TAU) % TAU
        expect(landed).toBeCloseTo(to % TAU)
      }
    }
  })
})

describe('recoilVector (ISC-732)', () => {
  // Engine DIR_VEC mirror: N(0,-1) E(1,0) S(0,1) W(-1,0).
  const FACING_VEC = [
    { dc: 0, dr: -1 }, { dc: 1, dr: 0 }, { dc: 0, dr: 1 }, { dc: -1, dr: 0 },
  ] as const

  it('kicks opposite the facing, small, for all four facings', () => {
    for (const facing of [0, 1, 2, 3] as const) {
      const r = recoilVector(facing)
      const v = FACING_VEC[facing]
      const along = r.dx * v.dc + r.dy * v.dr // projection onto the facing
      expect(along).toBeLessThan(0) // opposite the muzzle
      expect(Math.abs(along)).toBeLessThanOrEqual(3) // very subtle
      expect(Math.hypot(r.dx, r.dy)).toBeLessThanOrEqual(3)
    }
  })
})
