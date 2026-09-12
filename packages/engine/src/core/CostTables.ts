
/** Marine movement cost by facing-relative delta. Side-steps are ILLEGAL for
 *  terminators per the original (`_movemap` L/R = None) — no entry = no move. */
export const MOVE_COST: Record<string, number> = {
  '0,-1': 1,  '1,-1': 1,  '-1,-1': 1,   // forward & f-diagonals
  '0,1': 2,   '1,1': 2,   '-1,1': 2     // backward & b-diagonals
};

/** Turning costs */
export const TURN_COST: Record<'LEFT' | 'RIGHT' | 'ABOUT', number> = {
  LEFT: 1,
  RIGHT: 1,
  ABOUT: 2
};

/** AP cap of a marine (the original's AP per turn). */
export const AP_PER_TURN = 4;

/**
 * Real-time tuning (2.x). Starting values from docs/realtime-plan.md. The
 * 2026-09-12 stage 2 scan (autopilot, seeds 1 to 30, three missions) chose
 * regen.marine 3: space_hulk_2 went from 0 to 3 wins in 30 and debug_1 lost
 * nothing it was winning; overwatchCooldown 1 moved nothing and stays 2;
 * cycleTicks 60 cost space_hulk_2 two wins and stays 40. Every other value
 * is still unvalidated; the balance sweep owns them. They are data, not constants: the client applies
 * `?tuning=` overrides through applyTuning() before the engine is built, so a
 * playtest can vary them without a rebuild. Every tick-denominated number in
 * the engine reads from here.
 */
export interface Tuning {
  /** Client-side tick interval in milliseconds (the engine never reads a clock). */
  tickMs: number;
  /** Ticks per cycle: the turn-equivalent period every per-turn mission number fires on. */
  cycleTicks: number;
  /** Ticks between one AP of regeneration, per piece kind. */
  regen: { marine: number; stealer: number; blip: number };
  /** AP pool cap per piece kind. */
  apCap: { marine: number; stealer: number; blip: number };
  /** Minimum ticks between two overwatch reaction shots by one marine. */
  overwatchCooldown: number;
  /** Ticks a flamed square burns. */
  flameTicks: number;
  /** Ticks between hive plans (a marine death forces one sooner). */
  hivePlanTicks: number;
  /** Idle ticks after which a blip may convert voluntarily again. */
  blipIdleTicks: number;
  /** Idle ticks after which the sustained-fire bonus is forgotten. */
  sustainedDecayTicks: number;
  /** Ticks after a direct command during which the default AI leaves the marine alone. */
  leaseTicks: number;
  /** Ticks between the spawn slots of consecutive entry points inside a cycle. */
  spawnOffsetTicks: number;
  /** Tick inside the cycle (0 = the boundary) at which each cycle event fires. */
  offsets: { cat: number; download: number; ambush: number };
}

export const TUNING: Tuning = {
  tickMs: 250,
  cycleTicks: 40,
  regen: { marine: 3, stealer: 2, blip: 2 },
  apCap: { marine: 4, stealer: 6, blip: 6 },
  overwatchCooldown: 2,
  flameTicks: 40,
  hivePlanTicks: 8,
  blipIdleTicks: 8,
  sustainedDecayTicks: 40,
  leaseTicks: 8,
  spawnOffsetTicks: 5,
  offsets: { cat: 10, download: 20, ambush: 30 },
};

/** Nested partial of Tuning: every leaf optional. */
export type TuningPatch = {
  [K in keyof Tuning]?: Tuning[K] extends object ? Partial<Tuning[K]> : Tuning[K];
};

/**
 * Merge overrides into TUNING in place (the engine reads TUNING live, so an
 * override applied before construction shapes the whole game). Unknown keys
 * throw: a typo in `?tuning=` must be loud, not a silent no-op. Returns TUNING.
 */
export function applyTuning(patch: TuningPatch): Tuning {
  const target = TUNING as unknown as Record<string, unknown>;
  for (const [key, value] of Object.entries(patch)) {
    if (!(key in target)) throw new Error(`Unknown tuning key: ${key}`);
    const current = target[key];
    if (typeof current === 'object' && current !== null) {
      if (typeof value !== 'object' || value === null) throw new Error(`Tuning key ${key} expects an object`);
      const group = current as Record<string, number>;
      for (const [sub, v] of Object.entries(value as Record<string, unknown>)) {
        if (!(sub in group)) throw new Error(`Unknown tuning key: ${key}.${sub}`);
        if (typeof v !== 'number' || !Number.isFinite(v)) throw new Error(`Tuning ${key}.${sub} must be a number`);
        group[sub] = v;
      }
    } else {
      if (typeof value !== 'number' || !Number.isFinite(value)) throw new Error(`Tuning ${key} must be a number`);
      target[key] = value;
    }
  }
  return TUNING;
}

/**
 * Parse the `?tuning=` query form: comma-separated `dotted.key:value` pairs,
 * e.g. `regen.marine:3,overwatchCooldown:1`. Pure; the caller applies it.
 */
export function parseTuning(text: string): TuningPatch {
  const patch: Record<string, unknown> = {};
  for (const pair of text.split(',')) {
    if (!pair.trim()) continue;
    const [path, raw] = pair.split(':');
    const value = Number(raw);
    if (!path || !Number.isFinite(value)) throw new Error(`Bad tuning pair: ${pair}`);
    const [head, sub] = path.trim().split('.');
    if (sub) {
      const group = (patch[head] ??= {}) as Record<string, number>;
      group[sub] = value;
    } else {
      patch[head] = value;
    }
  }
  return patch as TuningPatch;
}
