import { projectCamToMini, miniToWorld } from '../utils/cameraBox'
import { RADAR, echoAlpha, isSergeant, pulseTimings, ringDurationMs } from '../utils/radarLogic'

describe('projectCamToMini', () => {
  const board = { w: 1000, h: 1000 }
  const mini  = { x: 0, y: 0, w: 100, h: 100 }

  it('maps centre correctly', () => {
    const box = projectCamToMini({ x: 250, y: 250, w: 500, h: 500 }, board, mini, 2)
    expect(box).toEqual({ x: 25, y: 25, w: 50, h: 50 })
  })

  it('clamps left/top', () => {
    const b = projectCamToMini({ x: -20, y: -20, w: 300, h: 300 }, board, mini, 2)
    expect(b.x).toBe(1); expect(b.y).toBe(1) // Clamped to mini.x + halfLineWidth
  })

  it('clamps right/bottom', () => {
    const b = projectCamToMini({ x: 900, y: 900, w: 200, h: 200 }, board, mini, 2)
    // Ensure the right edge of the projected box is within or at the right edge of the minimap
    expect(b.x + b.w).toBeLessThanOrEqual(mini.x + mini.w - 1) // Clamped to mini.x + mini.w - halfLineWidth
    // Ensure the bottom edge of the projected box is within or at the bottom edge of the minimap
    expect(b.y + b.h).toBeLessThanOrEqual(mini.y + mini.h - 1) // Clamped to mini.y + mini.h - halfLineWidth
  })

  it('clamps WIDTH when the camera sees more world than a narrow board contains (ISC-376)', () => {
    // Camera viewport wider than the whole board: box must shrink to the
    // minimap span, not spill past the right edge.
    const b = projectCamToMini({ x: 0, y: 0, w: 2000, h: 500 }, board, mini, 2)
    expect(b.w).toBeLessThanOrEqual(mini.w - 2)
    expect(b.x + b.w).toBeLessThanOrEqual(mini.x + mini.w - 1)
    // STROKE extents (path ± halfLine) must also stay inside — the drawn line
    // straddles the path, so path-only assertions can hide a half-line spill.
    expect(b.x - 1).toBeGreaterThanOrEqual(mini.x)
    expect(b.x + b.w + 1).toBeLessThanOrEqual(mini.x + mini.w)
  })

  it('clamps HEIGHT symmetrically for boards shorter than the camera view (ISC-377)', () => {
    const b = projectCamToMini({ x: 0, y: 0, w: 500, h: 2000 }, board, mini, 2)
    expect(b.h).toBeLessThanOrEqual(mini.h - 2)
    expect(b.y + b.h).toBeLessThanOrEqual(mini.y + mini.h - 1)
  })

  it('space_hulk_1 real geometry: 22x27-tile board, 184px minimap, camera wider than board (ISC-378)', () => {
    // 22×27 tiles at 40px; minimap width HUD_WIDTH(200) − 2×8 = 184.
    const boardPx = { w: 22 * 40, h: 27 * 40 }
    const m = { x: 0, y: 0, w: 184, h: (27 * 40) * (184 / (22 * 40)) }
    const b = projectCamToMini({ x: 0, y: 0, w: 1080, h: 720 }, boardPx, m, 2)
    expect(b.x + b.w + 1).toBeLessThanOrEqual(m.x + m.w) // stroke extent inside
    expect(b.y + b.h + 1).toBeLessThanOrEqual(m.y + m.h)
    expect(b.x - 1).toBeGreaterThanOrEqual(m.x)
  })

  it('beta_2 real geometry: 23x33-tile board (ISC-379)', () => {
    const boardPx = { w: 23 * 40, h: 33 * 40 }
    const m = { x: 0, y: 0, w: 184, h: (33 * 40) * (184 / (23 * 40)) }
    const b = projectCamToMini({ x: 0, y: 0, w: 1080, h: 720 }, boardPx, m, 2)
    expect(b.x + b.w + 1).toBeLessThanOrEqual(m.x + m.w) // stroke extent inside
    expect(b.y + b.h + 1).toBeLessThanOrEqual(m.y + m.h)
    expect(b.x - 1).toBeGreaterThanOrEqual(m.x)
  })

  it('Anti: width/height never negative even when the minimap is smaller than the stroke (ISC-381)', () => {
    const b = projectCamToMini({ x: 0, y: 0, w: 100, h: 100 }, board, { x: 0, y: 0, w: 1, h: 1 }, 4)
    expect(b.w).toBeGreaterThanOrEqual(0)
    expect(b.h).toBeGreaterThanOrEqual(0)
  })
})

describe('miniToWorld (ISC-677)', () => {
  it('inverts the minimap projection: local px / mapScale = world px', () => {
    // space_hulk_1 geometry: 22 tiles * 40px board width, 184px minimap.
    const mapScale = 184 / (22 * 40)
    const w = miniToWorld(92, 46, mapScale)
    expect(w.x).toBeCloseTo(440) // half the board width
    expect(w.y).toBeCloseTo(220)
    // Corners map to corners.
    expect(miniToWorld(0, 0, mapScale)).toEqual({ x: 0, y: 0 })
    expect(miniToWorld(184, 184, mapScale).x).toBeCloseTo(880)
  })
})

describe('radar logic (ISC-683/684/689/690)', () => {
  it('stealer echoes are strictly more solid than blip echoes (ISC-683)', () => {
    expect(echoAlpha('stealer')).toBe(RADAR.stealerAlpha)
    expect(echoAlpha('blip')).toBe(RADAR.blipAlpha)
    expect(RADAR.stealerAlpha).toBeGreaterThan(RADAR.blipAlpha)
    // And blips smear wider — bigger, fainter, more indistinct.
    expect(RADAR.blipSizePx).toBeGreaterThan(RADAR.stealerSizePx)
  })

  it('the sergeant predicate covers both sergeant types and gates on alive (ISC-684 companion)', () => {
    const base = { kind: 'marine', alive: true }
    expect(isSergeant({ ...base, spriteKey: 'terminator_sergeant' })).toBe(true)
    expect(isSergeant({ ...base, spriteKey: 'terminator_sergeant_sword' })).toBe(true)
    expect(isSergeant({ ...base, spriteKey: 'terminator_storm_bolter' })).toBe(false)
    expect(isSergeant({ kind: 'marine', alive: false, spriteKey: 'terminator_sergeant' })).toBe(false)
    expect(isSergeant({ kind: 'stealer', alive: true, spriteKey: 'terminator_sergeant' })).toBe(false)
  })

  it('Antecedent: reveal delay grows with distance from the pulse origin (ISC-689)', () => {
    const interval = 1200
    const max = 260
    const near = pulseTimings(0, max, interval)
    const mid = pulseTimings(130, max, interval)
    const far = pulseTimings(260, max, interval)
    expect(near.delayMs).toBe(0)
    expect(mid.delayMs).toBeGreaterThan(near.delayMs)
    expect(far.delayMs).toBeGreaterThan(mid.delayMs)
    // The farthest contact lights up exactly when the ring finishes its sweep.
    expect(far.delayMs).toBe(ringDurationMs(interval))
    // Beyond-max distances clamp instead of overshooting.
    expect(pulseTimings(9999, max, interval).delayMs).toBe(ringDurationMs(interval))
    expect(pulseTimings(50, 0, interval).delayMs).toBe(0) // degenerate map never divides by zero
  })

  it('echoes fade over the pulse interval, never under the visible floor (ISC-690)', () => {
    // The whole envelope (delay + fade-in ramp + fade) budgets the interval.
    const t = pulseTimings(130, 260, 2400)
    expect(t.fadeMs).toBe(2400 - t.delayMs - RADAR.fadeInMs)
    expect(t.delayMs + RADAR.fadeInMs + t.fadeMs).toBeLessThanOrEqual(2400)
    // Panic cadence: the DELAY yields (wavefront collapses toward instant) so
    // every echo still gets its full ramp plus the floor dwell — the next
    // pulse must never catch an echo mid-ramp (review round finding 4).
    const panic = pulseTimings(260, 260, 300)
    expect(panic.delayMs).toBe(0)
    expect(panic.fadeMs).toBe(RADAR.minFadeMs)
  })

  it('the ring sweep compresses with the ping but never drags past its cap', () => {
    expect(ringDurationMs(300)).toBe(270)
    expect(ringDurationMs(2400)).toBe(RADAR.ringMaxMs)
  })
})
