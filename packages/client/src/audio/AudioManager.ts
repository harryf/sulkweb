import Phaser from 'phaser';
import { PieceEvents } from '@sulk/engine/index.js';
import type { GameEngine, PieceEventsType } from '@sulk/engine/index.js';
import {
  AUDIO_CONFIG, duckTarget, shotSfx, deathSfx, combatSfx, distanceGainFactor,
  trackerIntervalMs, trackerDetune, nearestThreatDistance, SfxThrottle,
} from './audioLogic.js';
import { musicFile, trackForMission } from './audioManifest.js';
import { ALIEN_SEGMENTS } from './alienSegments.js';

/** Local piece shape we read (never mutate) off the engine. */
interface PieceView { id: string; kind: string; alive: boolean; spriteKey?: string; pos: { c: number; r: number } }

const MUTE_KEY = 'sulk_muted';

/**
 * All game audio: one looping ambient track per mission (ducked quiet on the
 * marine phase, up while the stealers act), event-driven SFX, and the Aliens
 * motion tracker whose ping cadence + pitch follow the nearest threat.
 *
 * Runs entirely off PieceEvents + read-only engine snapshots. Every play is
 * guarded on cache presence, so a clone that never ran `pnpm fetch-audio`
 * boots and plays silently (ISC-328).
 */
export class AudioManager {
  private music?: Phaser.Sound.BaseSound;
  private trackerTimer?: Phaser.Time.TimerEvent;
  private throttle = new SfxThrottle();
  private lastPos = new Map<string, string>();
  /** Living-marine positions, driven by event PAYLOADS so it stays truthful
   *  through the stealer-phase replay (seeded from the engine at boot). */
  private marineMirror = new Map<string, { x: number; y: number }>();
  private subs: [string, (p: never) => void][] = [];
  private over = false;
  /** e2e probe surface. */
  readonly trackKey: string;
  /** Last one-shot actually played (key + final gain) — e2e probe surface. */
  lastPlay: { key: string; volume: number } | null = null;
  /** Fired on every motion-tracker cycle with the ping interval — the minimap
   *  radar pulse rides THIS callback, so sight and sound share one clock. */
  onPing?: (intervalMs: number) => void;
  muted = false;

  /** Queue every audio file for this mission. Missing files are tolerated —
   *  Phaser logs a loaderror and the cache guard keeps us silent. */
  static queueLoads(scene: Phaser.Scene, mission: string): void {
    if (trackForMission(mission)) scene.load.audio(`music_${mission}`, musicFile(mission));
    // Original Sulk set (committed, public domain — assets/sounds/).
    const original: [string, string][] = [
      ['sfx_flamer', 'marine_shoot_flamer.wav'], ['sfx_cannon', 'assault_cannon_burst.wav'],
      ['sfx_cc', 'marine_cc.wav'], ['sfx_chain_fist', 'chain_fist.wav'],
      ['sfx_jam', 'marine_jam.wav'], ['sfx_marine_death', 'marine_kill_skewered.wav'],
      ['sfx_move', 'marine_move.wav'], ['sfx_door', 'door_open.wav'],
      ['sfx_selfdestruct', 'marine_selfdestruct_flamer.wav'],
    ];
    for (const [key, file] of original) scene.load.audio(key, `assets/sounds/${file}`);
    // Generated cuts (committed under assets/audio/sfx/, credited on /credits.html).
    scene.load.audio('sfx_bolter', 'assets/audio/sfx/bolter_fire.wav');
    scene.load.audio('sfx_tracker_ping', 'assets/audio/sfx/tracker_ping.wav');
    // Fallback voice for bolters when the fetched pulse-rifle cut is absent.
    scene.load.audio('sfx_bolter_orig', 'assets/sounds/marine_shoot_bolter.wav');
    for (const seg of ALIEN_SEGMENTS) {
      if (seg.role !== 'unused') scene.load.audio(`alien_${seg.file}`, `assets/audio/alien/${seg.file}`);
    }
  }

  /** `missionKey` is the REGISTRY key (space_hulk_1…), matching the manifest —
   *  never `mission.name`, which is a display title ("Suicide Mission").
   *  `onPing` is taken here, not assigned after construction: when the sound
   *  system is already unlocked, startAll fires the first tracker cycle
   *  SYNCHRONOUSLY and a late-assigned listener would miss it. */
  constructor(
    private scene: Phaser.Scene, private engine: GameEngine, missionKey: string,
    onPing?: (intervalMs: number) => void,
  ) {
    this.trackKey = `music_${missionKey}`;
    this.onPing = onPing;
    // localStorage can throw (private mode / storage disabled) — audio prefs
    // are never worth crashing the boot for.
    try { this.muted = localStorage.getItem(MUTE_KEY) === '1'; } catch { /* default unmuted */ }
    scene.sound.mute = this.muted;

    // Positional attenuation reads THIS mirror, not the live engine: during
    // the stealer-phase replay the engine already holds the final board, and
    // a marine who dies on the phase's first event must keep anchoring full
    // volume until his death actually plays (payload-not-engine invariant).
    for (const p of this.engine.state.pieces as unknown as PieceView[]) {
      if (p.kind === 'marine' && p.alive) this.marineMirror.set(p.id, { x: p.pos.c, y: p.pos.r });
      // Seed the step-vs-turn dedupe too: unseeded, a piece's very FIRST
      // turn-in-place plays the footstep SFX (deploy-phase rotations made
      // this audible; the first-turn clank predates them).
      this.lastPos.set(p.id, `${p.pos.c},${p.pos.r}`);
    }

    const startAll = () => { this.startMusic(); this.scheduleTracker(); };
    if (scene.sound.locked) scene.sound.once(Phaser.Sound.Events.UNLOCKED, startAll);
    else startAll();

    document.addEventListener('visibilitychange', this.onVisibility);

    // Brave (and some Chrome states) can leave the AudioContext 'suspended'
    // even when Phaser reports unlocked — everything then "plays" silently.
    // Resume on any real gesture until the context is running.
    const resumeCtx = () => {
      const ctx = (scene.sound as { context?: AudioContext }).context;
      if (ctx && ctx.state === 'suspended') void ctx.resume();
    };
    resumeCtx();
    scene.input.on('pointerdown', resumeCtx);
    scene.input.keyboard?.on('keydown', resumeCtx);

    this.on('phaseChanged', ({ phase }) => this.duckTo(duckTarget(phase)));
    this.on('shot', ({ shooterId }) => {
      const key = shotSfx(this.piece(shooterId)?.spriteKey);
      this.play(key === 'sfx_bolter' && !this.has('sfx_bolter') ? 'sfx_bolter_orig' : key);
    });
    // A self-destruct kills its own shooter — that gets the big boom.
    this.on('sectionFlamed', ({ shooterId, kills }) =>
      this.play(kills.includes(shooterId) ? 'sfx_selfdestruct' : 'sfx_flamer'));
    this.on('malfunction', () => this.play('sfx_selfdestruct'));
    // Positional: a door creaking far from the squad plays quiet (you hear
    // the stealers moving through the hulk); a marine's own door is adjacent
    // to him, so it stays at full gain by the same rule.
    this.on('doorToggled', ({ x, y }) => this.playAt('sfx_door', x, y));
    // Chainsaw ONLY for the chain-fist cut — a shot-destroyed door already
    // played its weapon's firing SFX with the shot event (user report: bolter
    // door kills sounded like the chainsaw).
    this.on('doorDestroyed', ({ cause }) => { if (cause === 'cut') this.play('sfx_chain_fist'); });
    this.on('jammed', ({ jammed }) => { if (jammed) this.play('sfx_jam'); });
    this.on('closeCombat', ({ attackerId }) => {
      const attacker = this.piece(attackerId);
      // A stealer attack is adjacent to a marine, so the positional rule
      // leaves it at full gain — routed anyway for the one-rule invariant.
      if (attacker?.kind === 'stealer') this.playAlien('stealer_attack', attacker.pos.c, attacker.pos.r);
      else this.play(combatSfx(attacker?.spriteKey));
    });
    this.on('blipConverted', ({ x, y }) => this.playAlien('stealer_door', x, y));
    this.on('pieceDied', ({ pieceId, kind, x, y }) => {
      if (kind === 'marine') this.marineMirror.delete(pieceId);
      const key = deathSfx(kind);
      if (!key) return;
      // A flame template can kill several pieces in one tick — one cry, not a
      // clipping chorus (Advisor 2026-08-15).
      if (!this.throttle.accept(key)) return;
      if (key === 'sfx_stealer_death') this.playAlien('stealer_death', x, y);
      else this.play(key);
    });
    this.on('pieceMoved', ({ pieceId, x, y }) => {
      if (this.marineMirror.has(pieceId)) this.marineMirror.set(pieceId, { x, y });
      const at = `${x},${y}`;
      if (this.lastPos.get(pieceId) === at) return; // facing turn, not a step
      this.lastPos.set(pieceId, at);
      const kind = this.piece(pieceId)?.kind;
      if (kind === 'stealer' && this.throttle.accept('skitter')) this.playAlien('stealer_move', x, y);
      else if (kind === 'marine' && this.throttle.accept('clank')) this.play('sfx_move', 0.35);
    });
    this.on('pieceAdded', ({ pieceId, kind, x, y }) => {
      if (kind === 'marine') this.marineMirror.set(pieceId, { x, y });
      this.lastPos.set(pieceId, `${x},${y}`); // arrival square — a first spin is a turn, not a step
    });
    // Parity with the original inline layer this manager replaced:
    this.on('catDamaged', () => this.play('sfx_cc', 0.4));
    this.on('ductingDestroyed', () => this.play('sfx_marine_death', 0.5));
    this.on('marineEscaped', ({ pieceId }) => {
      this.marineMirror.delete(pieceId); // off the board = off the anchor set
      this.play('sfx_move', 0.4);
    });
    this.on('gameOver', () => {
      this.over = true;
      this.duckTo(0, 2500);
      this.trackerTimer?.remove();
    });
  }

  /** K key. Persisted; flips Phaser's global mute. */
  toggleMute(): boolean {
    this.muted = !this.muted;
    this.scene.sound.mute = this.muted;
    try { localStorage.setItem(MUTE_KEY, this.muted ? '1' : '0'); } catch { /* session-only */ }
    return this.muted;
  }

  destroy(): void {
    for (const [type, fn] of this.subs) PieceEvents.off(type as never, fn);
    document.removeEventListener('visibilitychange', this.onVisibility);
    this.trackerTimer?.remove();
    this.music?.stop();
  }

  // ── internals ──────────────────────────────────────────────────────────

  private on<K extends keyof PieceEventsType>(
    type: K, fn: (payload: PieceEventsType[K]) => void,
  ): void {
    PieceEvents.on(type, fn);
    this.subs.push([type as string, fn as (p: never) => void]);
  }

  private piece(id: string): PieceView | undefined {
    return (this.engine.state.pieces as unknown as PieceView[]).find(p => p.id === id);
  }

  private has(key: string): boolean {
    return this.scene.cache.audio.exists(key);
  }

  private play(key: string, gain = AUDIO_CONFIG.sfxGain, detune = 0): void {
    if (!this.has(key)) return;
    this.lastPlay = { key, volume: gain };
    this.scene.sound.play(key, { volume: gain, detune });
  }

  /** Chebyshev distance from board square (x, y) to the nearest living
   *  marine — read from the payload-driven mirror, never the live engine,
   *  so replayed sounds attenuate against the board AS SHOWN (a marine
   *  dying mid-replay anchors full volume until his death event plays). */
  private nearestMarineDist(x: number, y: number): number | null {
    let best: number | null = null;
    for (const m of this.marineMirror.values()) {
      const d = Math.max(Math.abs(m.x - x), Math.abs(m.y - y));
      if (best === null || d < best) best = d;
    }
    return best;
  }

  /** Positional one-shot: gain scales with distance from the squad — the
   *  SINGLE ingestion point for the far-quiet/near-full rule (ISC-701). */
  private playAt(key: string, x: number, y: number, gain = AUDIO_CONFIG.sfxGain): void {
    this.play(key, gain * distanceGainFactor(this.nearestMarineDist(x, y)));
  }

  /** Play a random classified alien segment for the given role. With a board
   *  position, the segment attenuates by distance from the squad. */
  private playAlien(role: string, x?: number, y?: number): void {
    const pool = ALIEN_SEGMENTS.filter(s => s.role === role);
    if (!pool.length) return;
    const seg = pool[Math.floor(Math.random() * pool.length)];
    const gain = AUDIO_CONFIG.sfxGain * 0.7;
    if (x !== undefined && y !== undefined) this.playAt(`alien_${seg.file}`, x, y, gain);
    else this.play(`alien_${seg.file}`, gain);
  }

  private startMusic(): void {
    if (!this.has(this.trackKey)) return;
    // Fade in from silence rather than cutting in at full bed level. The
    // tween's explicit `from: 0` is load-bearing: play() (and the unlock
    // queue's deferred play) resets the sound's volume to its config value,
    // clobbering any setVolume(0) done here — a from-less tween then captures
    // volume 1 and fades DOWN. `from` re-asserts silence at tween start.
    this.music = this.scene.sound.add(this.trackKey, { loop: true, volume: 0 });
    this.music.play();
    this.fadeIn();
  }

  /** Backgrounded tabs must go quiet: Phaser's blur-pause only catches sounds
   *  already playing at blur time, and a looping Web Audio source happily
   *  outlives the frozen RAF loop — so two open tabs bleed ambiences over
   *  each other. Pause is immediate (tweens are RAF-driven and frozen while
   *  hidden); the return trip fades back in. */
  private readonly onVisibility = (): void => {
    if (!this.music) return;
    if (document.visibilityState === 'hidden') {
      this.scene.tweens.killTweensOf(this.music);
      if (this.music.isPlaying) this.music.pause();
    } else if (this.music.isPaused) {
      this.music.resume();
      this.fadeIn();
    }
  };

  /** Rise from silence to the current phase's duck target. */
  private fadeIn(): void {
    if (!this.music) return;
    this.scene.tweens.killTweensOf(this.music);
    this.scene.tweens.add({
      targets: this.music,
      volume: { from: 0, to: duckTarget(this.engine.phase) },
      duration: AUDIO_CONFIG.musicFadeInMs,
      ease: 'Sine.easeInOut',
    });
  }

  /** Tween the ambient bed to a new level — never a hard cut (ISC-313).
   *  Prior tween is killed first: a phase flip faster than the fade must not
   *  leave two tweens fighting over the same volume (Advisor 2026-08-15). */
  private duckTo(volume: number, ms = AUDIO_CONFIG.fadeMs): void {
    if (!this.music) return;
    this.scene.tweens.killTweensOf(this.music);
    this.scene.tweens.add({ targets: this.music, volume, duration: ms, ease: 'Sine.easeInOut' });
  }

  /** Self-rescheduling ping: each tick recomputes threat distance so the
   *  cadence + pitch tighten as blips close in (ISC-322/323). */
  private scheduleTracker(): void {
    if (this.over) return;
    const dist = this.threatDistance();
    const interval = trackerIntervalMs(dist);
    if (interval === null) {
      // Nothing on the scope — check again lazily.
      this.trackerTimer = this.scene.time.delayedCall(1500, () => this.scheduleTracker());
      return;
    }
    this.play('sfx_tracker_ping', AUDIO_CONFIG.tracker.gain, trackerDetune(dist));
    // Pulse listeners fire even when the ping WAV is absent from cache — the
    // radar sweep is scheduling, not sound (ISC-687).
    this.onPing?.(interval);
    this.trackerTimer = this.scene.time.delayedCall(interval, () => this.scheduleTracker());
  }

  private threatDistance(): number | null {
    const pieces = this.engine.state.pieces as unknown as PieceView[];
    const marines = pieces.filter(p => p.kind === 'marine' && p.alive)
      .map(p => ({ x: p.pos.c, y: p.pos.r }));
    const threats = pieces.filter(p => (p.kind === 'stealer' || p.kind === 'blip') && p.alive)
      .map(p => ({ x: p.pos.c, y: p.pos.r }));
    return nearestThreatDistance(marines, threats);
  }
}
