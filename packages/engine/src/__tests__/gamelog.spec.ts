import { it, expect, describe } from 'vitest';
import { PieceEvents, type CapturedEvent, type PieceEventsType } from '../events/PieceEvents.js';
import { GameLogger, GAMELOG_FORMAT_VERSION, type LoggerEngine } from '../log/GameLogger.js';
import { GameEngine } from '../GameEngine.js';
import { loadMission } from '../missions/missionLoader.js';
import { SeededRng } from '../core/Dice.js';
import { autoplay } from '../ai/MarineAutopilot.js';

/** A minimal structural engine so envelope fields are fully controlled. */
function stubEngine(): LoggerEngine {
  return {
    turnNumber: 2,
    phase: 'MarineAction',
    mission: { name: 'Stub Mission' },
    state: {
      pieces: [
        { id: 'p_1', kind: 'marine', spriteKey: 'terminator_storm_bolter', pos: { c: 1, r: 2 }, facing: 0 },
        { id: 'p_2', kind: 'blip', spriteKey: 'blip', pos: { c: 5, r: 9 }, facing: 2 },
      ],
    },
  };
}

describe('Emitter taps (the logger capture hook)', () => {
  it('taps observe emissions inside capture() exactly once, and never their replay', () => {
    const seen: CapturedEvent<PieceEventsType>[] = [];
    const tap = (ev: CapturedEvent<PieceEventsType>) => seen.push(ev);
    PieceEvents.tap(tap);
    try {
      const stream = PieceEvents.capture(() => {
        PieceEvents.emit('cpChanged', { cp: 3 });
        PieceEvents.emit('cpChanged', { cp: 2 });
      });
      expect(stream).toHaveLength(2); // still buffered for the animation replay
      expect(seen).toHaveLength(2); // tapped at real emit time despite suppression
      for (const ev of stream) PieceEvents.replay(ev);
      expect(seen).toHaveLength(2); // replay is not a new game event
    } finally {
      PieceEvents.untap(tap);
    }
  });

  it('a throwing tap never aborts handler delivery, other taps, or the capture buffer', () => {
    const seen: string[] = [];
    const bad = () => { throw new Error('logger bug'); };
    const good = () => seen.push('good');
    const handler = () => seen.push('handler');
    PieceEvents.tap(bad);
    PieceEvents.tap(good);
    PieceEvents.on('cpChanged', handler);
    try {
      PieceEvents.emit('cpChanged', { cp: 2 });
      expect(seen).toEqual(['good', 'handler']);
      const stream = PieceEvents.capture(() => PieceEvents.emit('cpChanged', { cp: 1 }));
      expect(stream).toHaveLength(1); // buffer intact despite the throwing tap
    } finally {
      PieceEvents.untap(bad);
      PieceEvents.untap(good);
      PieceEvents.off('cpChanged', handler);
    }
  });

  it('untap stops observation; live (uncaptured) emissions are tapped too', () => {
    const seen: CapturedEvent<PieceEventsType>[] = [];
    const tap = (ev: CapturedEvent<PieceEventsType>) => seen.push(ev);
    PieceEvents.tap(tap);
    PieceEvents.emit('cpChanged', { cp: 1 });
    expect(seen).toHaveLength(1);
    PieceEvents.untap(tap);
    PieceEvents.emit('cpChanged', { cp: 0 });
    expect(seen).toHaveLength(1);
  });
});

describe('GameLogger', () => {
  it('records an envelope of seq, turn, phase, type plus the payload fields', () => {
    const log = new GameLogger(stubEngine(), { mission: 'debug_1' });
    try {
      PieceEvents.emit('pieceMoved', { pieceId: 'p_1', x: 3, y: 4, facing: 1 });
      expect(log.events).toHaveLength(1);
      expect(log.events[0]).toMatchObject({
        seq: 0, turn: 2, phase: 'MarineAction', type: 'pieceMoved',
        pieceId: 'p_1', x: 3, y: 4, facing: 1,
      });
    } finally {
      log.detach();
    }
  });

  it("skips the UI-noise events 'selected' and 'apChanged', records the rest", () => {
    const log = new GameLogger(stubEngine(), { mission: 'debug_1' });
    try {
      PieceEvents.emit('selected', { pieceId: 'p_1' });
      PieceEvents.emit('apChanged', { pieceId: 'p_1', apRemaining: 3, apInitial: 4 });
      PieceEvents.emit('doorToggled', { x: 1, y: 1, facing: 0, open: true });
      PieceEvents.emit('cpChanged', { cp: 4 });
      expect(log.events.map(e => e.type)).toEqual(['doorToggled', 'cpChanged']);
    } finally {
      log.detach();
    }
  });

  it('meta carries formatVersion, mission key, display name, seed, version, startedAt', () => {
    const now = new Date('2026-08-20T10:00:00Z');
    const log = new GameLogger(stubEngine(), { mission: 'debug_1', seed: 42, version: 'v0.5.1', now });
    log.detach();
    expect(log.meta).toMatchObject({
      formatVersion: GAMELOG_FORMAT_VERSION,
      mission: 'debug_1',
      missionName: 'Stub Mission',
      seed: 42,
      version: 'v0.5.1',
      startedAt: '2026-08-20T10:00:00.000Z',
      endedAt: null,
      result: null,
    });
    const bare = new GameLogger(stubEngine(), { mission: 'debug_1' });
    bare.detach();
    expect(bare.meta.seed).toBeNull();
    expect(bare.meta.version).toBe('unknown');
  });

  it('snapshots the initial piece layout at construction', () => {
    const log = new GameLogger(stubEngine(), { mission: 'debug_1' });
    log.detach();
    expect(log.initialPieces).toEqual([
      { id: 'p_1', kind: 'marine', sprite: 'terminator_storm_bolter', x: 1, y: 2, facing: 0 },
      { id: 'p_2', kind: 'blip', sprite: 'blip', x: 5, y: 9, facing: 2 },
    ]);
  });

  it('gameOver stamps result and endedAt on the meta', () => {
    const log = new GameLogger(stubEngine(), { mission: 'debug_1' });
    try {
      PieceEvents.emit('gameOver', { result: 'win' });
      expect(log.meta.result).toBe('win');
      expect(log.meta.endedAt).not.toBeNull();
    } finally {
      log.detach();
    }
  });

  it('serialize embeds the player notes and round-trips through JSON.parse', () => {
    const log = new GameLogger(stubEngine(), { mission: 'debug_1' });
    try {
      PieceEvents.emit('cpChanged', { cp: 5 });
      log.notes = 'Stealers camped the west door; never flanked.';
      const parsed = JSON.parse(log.serialize());
      expect(parsed.notes).toBe('Stealers camped the west door; never flanked.');
      expect(parsed.meta.mission).toBe('debug_1');
      expect(parsed.events).toHaveLength(1);
    } finally {
      log.detach();
    }
  });

  it('filename is sulk-log_<mission>_<local timestamp>.json, deterministic for a passed Date', () => {
    const log = new GameLogger(stubEngine(), { mission: 'space_hulk_1' });
    log.detach();
    expect(log.filename(new Date(2026, 7, 20, 9, 5, 3)))
      .toBe('sulk-log_space_hulk_1_2026-08-20_09-05-03.json');
  });

  it('envelope fields always win a key collision with payload fields', () => {
    const log = new GameLogger(stubEngine(), { mission: 'debug_1' }); // stub: turn 2, MarineAction
    try {
      PieceEvents.emit('phaseChanged', { phase: 'SomethingElse', turn: 99 });
      expect(log.events[0].phase).toBe('MarineAction'); // engine truth, not payload
      expect(log.events[0].turn).toBe(2);
      expect(log.events[0].type).toBe('phaseChanged');
    } finally {
      log.detach();
    }
  });

  it('logged payloads are immune to later mutation of the emitted object (deep copy)', () => {
    const log = new GameLogger(stubEngine(), { mission: 'debug_1' });
    try {
      const payload = { shooterId: 'p_1', targetId: 'p_2', x: 3, y: 4, rolls: [5, 2], hit: true };
      PieceEvents.emit('shot', payload);
      payload.rolls[0] = 1; // rewrite the nested array after emit
      payload.hit = false;
      expect(log.events[0].rolls).toEqual([5, 2]);
      expect(log.events[0].hit).toBe(true);
    } finally {
      log.detach();
    }
  });

  it('detach stops recording', () => {
    const log = new GameLogger(stubEngine(), { mission: 'debug_1' });
    PieceEvents.emit('cpChanged', { cp: 3 });
    log.detach();
    PieceEvents.emit('cpChanged', { cp: 2 });
    expect(log.events).toHaveLength(1);
  });

  it('a full seeded autoplay game produces a coherent, duplicate-free log', () => {
    // space_hulk_1, not debug_1: the autopilot's post-move checkVictory reads
    // debug_1's empty turn-1 board as exterminated (instant win, 3 events),
    // a pre-existing autopilot quirk this logger surfaced. The real mission
    // gives a full game: ~200+ events with actual combat and deaths.
    const engine = new GameEngine(loadMission('space_hulk_1'), [], new SeededRng(1));
    const log = new GameLogger(engine, { mission: 'space_hulk_1', seed: 1 });
    try {
      autoplay(engine, 60);
    } finally {
      log.detach();
    }
    expect(engine.state.result).not.toBe('ongoing');
    expect(log.meta.result).toBe(engine.state.result);
    expect(log.events.filter(e => e.type === 'pieceMoved').length).toBeGreaterThan(0);
    expect(log.events.filter(e => e.type === 'pieceDied').length).toBeGreaterThan(0);
    expect(log.events.filter(e => e.type === 'gameOver')).toHaveLength(1);
    // seq is strictly increasing with no duplicates: exactly-once capture.
    log.events.forEach((e, i) => expect(e.seq).toBe(i));
    // The noise filter held across the whole game.
    expect(log.events.some(e => e.type === 'selected' || e.type === 'apChanged')).toBe(false);
    // And the whole thing survives a serialize round-trip.
    const parsed = JSON.parse(log.serialize());
    expect(parsed.events.length).toBe(log.events.length);
    // Envelope phase integrity: every event between phaseChanged markers
    // carries the phase that marker announced (the corpus's core dimension).
    let announced = 'MarineAction';
    for (const e of log.events) {
      if (e.type === 'phaseChanged') announced = e.phase as string;
      expect(e.phase, `seq ${e.seq} (${e.type})`).toBe(announced);
    }
    // Shots embed their actual rolls: hit-rate analysis never re-simulates.
    const shots = log.events.filter(e => e.type === 'shot');
    expect(shots.length).toBeGreaterThan(0);
    for (const s of shots) expect(Array.isArray(s.rolls) && (s.rolls as number[]).length > 0).toBe(true);
  });

  it('deployment-phase placements land in the log with phase Deploy', () => {
    const engine = new GameEngine(loadMission('space_hulk_1'), [], new SeededRng(1));
    const log = new GameLogger(engine, { mission: 'space_hulk_1', seed: 1 });
    try {
      expect(engine.beginDeployment()).toBe(true);
      engine.finishDeployment(); // auto-deploys the whole reserve
    } finally {
      log.detach();
    }
    const deployEvents = log.events.filter(e => e.phase === 'Deploy');
    expect(deployEvents.some(e => e.type === 'pieceAdded')).toBe(true);
  });
});
