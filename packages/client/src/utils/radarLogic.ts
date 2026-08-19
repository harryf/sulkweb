/**
 * Pure radar decision logic for the minimap auspex — no Phaser, no DOM.
 * The Minimap renders what these numbers say, so echo styling, wavefront
 * timing, and the sergeant gate are all unit-testable in jsdom (ISC-683/689).
 */

/** All radar knobs in one place. Stealer echoes read SOLID, blip echoes
 *  (real and decoy alike — both are kind 'blip') read faint and indistinct. */
export const RADAR = {
  /** Peak echo alpha per contact kind — the solidity contrast (ISC-683). */
  stealerAlpha: 0.9,
  blipAlpha: 0.38,
  /** Echo image size in minimap px; blips smear wider than stealers. */
  stealerSizePx: 11,
  blipSizePx: 15,
  /** Living marines: small hard red dots. */
  marineDotRadiusPx: 2.5,
  marineDotColor: 0xff4040,
  /** Pulse ring stroke. */
  ringColor: 0x7cff9e,
  /** The ring sweep occupies most of the interval but never drags: at panic
   *  cadence (300ms pings) the sweep compresses with it. */
  ringFraction: 0.9,
  ringMaxMs: 700,
  /** Echo ramp-up once the wavefront arrives. */
  fadeInMs: 110,
  /** An echo always gets a visible dwell before the next pulse eats it. */
  minFadeMs: 250,
} as const;

/** The slice of an engine piece the radar reads (never mutates). */
export interface RadarPieceView {
  id: string;
  kind: string;
  alive: boolean;
  spriteKey: string;
  pos: { c: number; r: number };
}

/** The auspex is sergeant-carried: both sergeant types share the
 *  terminator_sergeant sprite prefix (sergeant, sergeant_sword). */
export function isSergeant(p: Pick<RadarPieceView, 'kind' | 'alive' | 'spriteKey'>): boolean {
  return p.kind === 'marine' && p.alive && p.spriteKey.startsWith('terminator_sergeant');
}

/** How long one pulse ring takes to sweep the whole minimap. */
export function ringDurationMs(intervalMs: number): number {
  return Math.min(Math.round(intervalMs * RADAR.ringFraction), RADAR.ringMaxMs);
}

/**
 * Wavefront timing for one echo: the reveal is delayed by its distance from
 * the pulse origin as a fraction of the ring sweep (so contacts light up AS
 * the ring passes them), then the echo fades until the next pulse refreshes
 * it. The whole envelope — delay + fadeInMs ramp + fade — is budgeted against
 * the interval: the delay yields first (the wavefront collapses toward
 * instant at panic cadence), so every echo gets its full ramp and at least
 * minFadeMs of dwell. A blink is not a radar return.
 */
export function pulseTimings(
  distPx: number,
  maxPx: number,
  intervalMs: number,
): { delayMs: number; fadeMs: number } {
  const ring = ringDurationMs(intervalMs);
  const frac = maxPx > 0 ? Math.min(1, Math.max(0, distPx / maxPx)) : 0;
  const delayCap = Math.max(0, intervalMs - RADAR.fadeInMs - RADAR.minFadeMs);
  const delayMs = Math.min(Math.round(frac * ring), delayCap);
  const fadeMs = Math.max(RADAR.minFadeMs, intervalMs - delayMs - RADAR.fadeInMs);
  return { delayMs, fadeMs };
}

/** Peak alpha for a contact echo — stealers solid, blips see-through. */
export function echoAlpha(kind: string): number {
  return kind === 'stealer' ? RADAR.stealerAlpha : RADAR.blipAlpha;
}
