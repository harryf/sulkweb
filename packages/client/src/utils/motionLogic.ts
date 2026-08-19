/**
 * Main-map motion vocabulary — every duration, ease, and physical constant for
 * piece steps, door slides, flame shimmer, shot recoil, and camera inertia.
 * Pure data + functions so the feel is unit-testable; GameScene consumes it.
 * The minimap deliberately imports NOTHING from here (radar stays motionless).
 */

export type MoveKind = 'marine' | 'stealer' | 'blip'

export const MOTION = {
  /** Per-kind step profiles. Marine: a heavy machine easing its mass into
   *  motion and thudding to a stop. Stealer: a fast darting pounce. Blip: a
   *  slow suggestive slide — an unknown contact drifting through the dark. */
  step: {
    marine: { durationMs: 170, ease: 'Sine.easeInOut' },
    stealer: { durationMs: 80, ease: 'Cubic.easeOut' },
    blip: { durationMs: 240, ease: 'Sine.easeInOut' },
  } as Record<MoveKind, { durationMs: number; ease: string }>,
  /** Marine turn-in-place: the torso grinds through the rotation. */
  turnMs: 130,
  /** Arrival squash for the marine thud (local-axis scale, yoyo). */
  squash: { scaleX: 1.05, scaleY: 0.95, durationMs: 55 },
  /** Stealer dash stretch: slight scale pulse over the move (yoyo). */
  stealerPulse: { scale: 1.07 },
  /** Bulkhead doors part in the middle: long-axis scale collapses to the
   *  parted sliver, then the texture swap reveals the open frame. */
  door: { slideMs: 180, partedScale: 0.14, crumbleMs: 220 },
  /** Flame shimmer: looping alpha/scale/angle wobble; per-square phase
   *  offsets keep neighbors deliberately out of sync. */
  shimmer: { alphaLow: 0.72, scaleHigh: 1.06, angleDeg: 3, baseMs: 320, stepMs: 40, phases: 5 },
  /** Shot recoil: a subtle kick opposite the muzzle with a hair of side
   *  jitter, sprung back (yoyo). "Very subtle" is the spec. */
  recoil: { offsetPx: 2.5, sidePx: 0.8, durationMs: 40 },
  /** Death flourish: red wash, crumple, fade. */
  death: { scale: 0.75, tint: 0xff6666 },
  cam: {
    /** px/ms² acceleration while an arrow is held. */
    accel: 0.004,
    /** px/ms velocity cap (~400 px/s — a touch brisker than the old fixed 300). */
    maxSpeed: 0.66,
    /** Exponential decay time-constant (ms) once input releases. */
    decayTauMs: 85,
    /** Velocity below this parks to exactly zero (px/ms). */
    stopBelow: 0.005,
    /** Drag-release momentum: carried fraction of the tracked drag velocity,
     *  its cap, and the minimum speed that counts as a fling at all. */
    flingCarry: 0.85,
    flingMax: 1.4,
    flingMin: 0.08,
    /** A release more than this long after the last drag sample is a park,
     *  not a fling. */
    flingWindowMs: 50,
  },
} as const

/**
 * Piece kind from the sprite's own texture key — the only payload-truthful
 * kind source during the stealer-phase replay: pieceMoved events carry no
 * kind, and a blip that converts later in the phase has already vanished
 * from the engine's FINAL state (its stealer gets a NEW id). The decoy
 * AmbushCounter wears 'ambush_counter' and slides like any blip.
 * DEFAULT IS MARINE: any future non-marine piece texture must be added here
 * or it silently lumbers instead of darting/sliding.
 */
export function kindFromTexture(key: string): MoveKind {
  if (key === 'stealer') return 'stealer'
  if (key === 'blip' || key === 'ambush_counter') return 'blip'
  return 'marine'
}

/**
 * One integration step of the camera inertia model (velocity in px/ms).
 * Held input accelerates toward the cap; no input decays exponentially and
 * parks to zero below the stop threshold. Holding the opposite arrow
 * decelerates straight through zero.
 */
export function camPanStep(vel: number, dir: -1 | 0 | 1, dtMs: number): number {
  if (dir !== 0) {
    const v = vel + dir * MOTION.cam.accel * dtMs
    return Math.max(-MOTION.cam.maxSpeed, Math.min(MOTION.cam.maxSpeed, v))
  }
  const v = vel * Math.exp(-dtMs / MOTION.cam.decayTauMs)
  return Math.abs(v) < MOTION.cam.stopBelow ? 0 : v
}

/** Deterministic shimmer phase (extra ms of period) per board square. */
export function shimmerPhase(x: number, y: number): number {
  return (Math.abs(x * 7 + y * 13) % MOTION.shimmer.phases) * MOTION.shimmer.stepMs
}

/** Facing unit vectors, mirroring the engine's DIR_VEC (N/E/S/W). */
const FACING_VEC = [
  { dc: 0, dr: -1 },
  { dc: 1, dr: 0 },
  { dc: 0, dr: 1 },
  { dc: -1, dr: 0 },
] as const

/**
 * Signed shortest rotation (radians) from one angle to another — a marine
 * turning 270° by the numbers must grind through the 90° the OTHER way,
 * never pirouette. Result is always in (-π, π].
 */
export function shortestRotationDelta(fromRad: number, toRad: number): number {
  const TAU = Math.PI * 2
  let d = (toRad - fromRad) % TAU
  if (d > Math.PI) d -= TAU
  if (d <= -Math.PI) d += TAU
  return d
}

/** Recoil kick: opposite the facing, with a perpendicular hair of jitter. */
export function recoilVector(facing: 0 | 1 | 2 | 3): { dx: number; dy: number } {
  const v = FACING_VEC[facing]
  return {
    dx: -v.dc * MOTION.recoil.offsetPx + -v.dr * MOTION.recoil.sidePx,
    dy: -v.dr * MOTION.recoil.offsetPx + v.dc * MOTION.recoil.sidePx,
  }
}
