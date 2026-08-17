/**
 * Pure audio decision logic — no Phaser, no DOM. The AudioManager adapter
 * feeds events in and obeys the numbers that come out, so every audible
 * behaviour (ducking targets, tracker cadence, event→sound routing, replay
 * throttling) is unit-testable in jsdom.
 */

/** All gain/cadence knobs in one place. Music stays BACKGROUND: its loud
 *  (stealer-phase) ceiling is half the SFX gain by design (ISC-327). */
export const AUDIO_CONFIG = {
  /** Music volume during the interactive marine phase — barely-there bed. */
  musicQuiet: 0.16,
  /** Music volume while the stealers act — noticeably up, still under SFX. */
  musicLoud: 0.38,
  /** Every one-shot SFX plays at this base gain. */
  sfxGain: 0.8,
  /** Duck crossfade duration; a cut under 500ms reads as a glitch. */
  fadeMs: 900,
  /** Music entrance fade (mission start, tab returning to focus) — slower
   *  than a duck so the bed rises rather than arrives. */
  musicFadeInMs: 1800,
  tracker: {
    /** Ping cadence at (and inside) panic range. */
    minMs: 300,
    /** Ping cadence when the nearest threat is at/beyond calm range. */
    maxMs: 2400,
    /** Chebyshev squares considered "on top of you". */
    nearDist: 2,
    /** Chebyshev squares considered "all quiet". */
    farDist: 20,
    /** Extra cents of pitch at panic range (0 at calm). */
    detuneMax: 500,
    /** Ping gain — a tick, not a klaxon. */
    gain: 0.33,
  },
};

/** Marine phase = quiet bed; stealer phase = the hulk wakes up. */
export function duckTarget(phase: string): number {
  return phase === 'StealerAction' ? AUDIO_CONFIG.musicLoud : AUDIO_CONFIG.musicQuiet;
}

/** Storm bolters (incl. sergeants + chain fist) fire the Aliens pulse-rifle
 *  burst; the two heavy weapons keep their original Sulk voices. */
export function shotSfx(shooterSpriteKey: string | undefined): string {
  if (shooterSpriteKey === 'terminator_heavy_flamer') return 'sfx_flamer';
  if (shooterSpriteKey === 'terminator_assault_cannon') return 'sfx_cannon';
  return 'sfx_bolter';
}

/** Death voice by piece kind: stealers get the Isolation cry, marines the
 *  original skewered scream. Blips die silently (they are un-revealed). */
export function deathSfx(kind: string): string | null {
  if (kind === 'stealer') return 'sfx_stealer_death';
  if (kind === 'marine') return 'sfx_marine_death';
  return null;
}

/** Close combat: chain-fist attackers rev the fist, everyone else thumps. */
export function combatSfx(attackerSpriteKey: string | undefined): string {
  return attackerSpriteKey === 'terminator_chain_fist' ? 'sfx_chain_fist' : 'sfx_cc';
}

/**
 * Motion-tracker cadence: linear map of nearest-threat Chebyshev distance
 * onto [minMs, maxMs], clamped. Monotonic — closer is always faster.
 * `null` distance (no threats on the board) parks the tracker.
 */
export function trackerIntervalMs(dist: number | null): number | null {
  if (dist === null) return null;
  const { minMs, maxMs, nearDist, farDist } = AUDIO_CONFIG.tracker;
  if (dist <= nearDist) return minMs;
  if (dist >= farDist) return maxMs;
  const t = (dist - nearDist) / (farDist - nearDist);
  return Math.round(minMs + t * (maxMs - minMs));
}

/** Tracker pitch: +detuneMax cents at panic range, 0 at calm — the ping
 *  itself tightens as the blips close in. */
export function trackerDetune(dist: number | null): number {
  if (dist === null) return 0;
  const { nearDist, farDist, detuneMax } = AUDIO_CONFIG.tracker;
  if (dist <= nearDist) return detuneMax;
  if (dist >= farDist) return 0;
  const t = (dist - nearDist) / (farDist - nearDist);
  return Math.round(detuneMax * (1 - t));
}

/** Chebyshev distance of the closest threat to any living marine. */
export function nearestThreatDistance(
  marines: { x: number; y: number }[],
  threats: { x: number; y: number }[],
): number | null {
  if (!marines.length || !threats.length) return null;
  let best = Infinity;
  for (const m of marines) {
    for (const t of threats) {
      const d = Math.max(Math.abs(m.x - t.x), Math.abs(m.y - t.y));
      if (d < best) best = d;
    }
  }
  return best;
}

/**
 * Replay-spam throttle: at most one accepted trigger per `windowMs` per key.
 * A 20-step stealer replay skitters a few times, not twenty. Clock injected
 * for tests.
 */
export class SfxThrottle {
  private last = new Map<string, number>();
  constructor(private windowMs = 150, private clock: () => number = () => performance.now()) {}
  accept(key: string): boolean {
    const now = this.clock();
    const prev = this.last.get(key);
    if (prev !== undefined && now - prev < this.windowMs) return false;
    this.last.set(key, now);
    return true;
  }
}
