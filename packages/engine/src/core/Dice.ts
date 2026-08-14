/** Source of d6 rolls. Gameplay uses SeededRng; unit tests inject RollQueue. */
export interface DiceSource {
  /** Returns a d6 roll, 1-6. */
  roll(): number;
}

/** Deterministic mulberry32-based d6 stream. Same seed → same sequence. */
export class SeededRng implements DiceSource {
  private state: number;

  constructor(seed: number) {
    this.state = seed >>> 0;
  }

  roll(): number {
    this.state = (this.state + 0x6D2B79F5) >>> 0;
    let t = this.state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    const u = ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    return 1 + Math.floor(u * 6);
  }
}

/**
 * Scripted rolls for tests: legible intent ("[6,1]") and order-independent —
 * adding rolls elsewhere never re-baselines unrelated tests.
 */
export class RollQueue implements DiceSource {
  private queue: number[];

  constructor(rolls: number[]) {
    this.queue = [...rolls];
  }

  roll(): number {
    const next = this.queue.shift();
    if (next === undefined) throw new Error('RollQueue exhausted — test scripted too few rolls');
    return next;
  }

  get remaining(): number { return this.queue.length; }
}
