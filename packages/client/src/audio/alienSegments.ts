import type { AlienSegment } from './audioManifest.js';

/**
 * Cut list + role classification for the Alien: Isolation vocalisation reel
 * (youtube qiyXFQKheOU, by Bradley Cypser). Segments were found by
 * ffmpeg silence-detection (-38dB / 0.45s) and classified HEURISTICALLY from
 * duration + RMS loudness:
 *
 *   −48…−50 dB shorts  → skitters/taps        → stealer_move
 *   −21…−27 dB hisses  → close hisses         → stealer_move / stealer_door
 *   −36 dB soft growls → distant vent-creaks  → stealer_door (blip reveal)
 *   −14…−17 dB roars   → attack snarls        → stealer_attack
 *   −18…−23 dB screams → death cries          → stealer_death
 *
 * Every entry is `guess: true` until confirmed by ear — edit `role`, flip
 * `guess`, re-run `pnpm fetch-audio` (already-cut files are kept; only role
 * mapping changes take effect immediately). `unused` segments are cut for
 * auditioning but never loaded by the game.
 */
export const ALIEN_SEGMENTS: AlienSegment[] = [
  // ── stealer_move: quiet, sub-second skitters and hisses ────────────────
  { file: 'alien_move_01.wav', start: 47.82, secs: 0.33, role: 'stealer_move', guess: true, note: 'very quiet tap (-50dB)' },
  { file: 'alien_move_02.wav', start: 51.56, secs: 0.31, role: 'stealer_move', guess: true, note: 'very quiet tap (-48dB)' },
  { file: 'alien_move_03.wav', start: 58.63, secs: 0.32, role: 'stealer_move', guess: true, note: 'very quiet tap (-48dB)' },
  { file: 'alien_move_04.wav', start: 4.90, secs: 0.38, role: 'stealer_move', guess: true, note: 'short hiss (-27dB)' },
  { file: 'alien_move_05.wav', start: 8.71, secs: 0.39, role: 'stealer_move', guess: true, note: 'short hiss (-23dB)' },
  // ── stealer_door: hisses + soft vent-creak growls (used for blip reveal) ─
  { file: 'alien_door_01.wav', start: 3.14, secs: 1.13, role: 'stealer_door', guess: true, note: 'drawn hiss (-27dB)' },
  { file: 'alien_door_02.wav', start: 6.87, secs: 1.17, role: 'stealer_door', guess: true, note: 'drawn hiss (-22dB)' },
  { file: 'alien_door_03.wav', start: 16.87, secs: 1.57, role: 'stealer_door', guess: true, note: 'distant creak-growl (-36dB)' },
  { file: 'alien_door_04.wav', start: 22.42, secs: 1.55, role: 'stealer_door', guess: true, note: 'distant creak-growl (-36dB)' },
  // ── stealer_attack: loud snarls and roars ──────────────────────────────
  { file: 'alien_attack_01.wav', start: 62.15, secs: 0.45, role: 'stealer_attack', guess: true, note: 'sharp snarl (-16dB)' },
  { file: 'alien_attack_02.wav', start: 66.02, secs: 0.50, role: 'stealer_attack', guess: true, note: 'sharp snarl (-14dB)' },
  { file: 'alien_attack_03.wav', start: 84.33, secs: 1.96, role: 'stealer_attack', guess: true, note: 'full roar (-15dB)' },
  { file: 'alien_attack_04.wav', start: 96.88, secs: 1.64, role: 'stealer_attack', guess: true, note: 'full roar (-17dB)' },
  { file: 'alien_attack_05.wav', start: 108.44, secs: 2.14, role: 'stealer_attack', guess: true, note: 'full roar (-15dB)' },
  { file: 'alien_attack_06.wav', start: 133.02, secs: 3.40, role: 'stealer_attack', guess: true, note: 'long roar (-16dB)' },
  // ── stealer_death: long screams ────────────────────────────────────────
  { file: 'alien_death_01.wav', start: 120.94, secs: 3.50, role: 'stealer_death', guess: true, note: 'scream, trimmed from 10s take (-18dB)' },
  { file: 'alien_death_02.wav', start: 228.79, secs: 3.00, role: 'stealer_death', guess: true, note: 'scream (-23dB)' },
  { file: 'alien_death_03.wav', start: 243.91, secs: 3.00, role: 'stealer_death', guess: true, note: 'scream (-23dB)' },
  { file: 'alien_death_04.wav', start: 39.26, secs: 3.00, role: 'stealer_death', guess: true, note: 'shriek + rumble (-20dB)' },
  // ── auditioning material, not loaded ───────────────────────────────────
  { file: 'alien_extra_01.wav', start: 144.95, secs: 3.61, role: 'unused', guess: true, note: 'quiet breathing (-39dB) — maybe ambience' },
  { file: 'alien_extra_02.wav', start: 149.58, secs: 3.91, role: 'unused', guess: true, note: 'quiet breathing (-34dB) — maybe ambience' },
  { file: 'alien_extra_03.wav', start: 193.35, secs: 3.67, role: 'unused', guess: true, note: 'mid growl (-29dB) — maybe attack' },
];
