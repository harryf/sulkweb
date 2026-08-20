import { PieceEvents, type PieceEventsType, type CapturedEvent, type Tap } from '../events/PieceEvents.js';

/**
 * Gameplay log recorder: taps the raw PieceEvents emission stream and builds a
 * downloadable per-game record (see docs/gamelog-format.md). The purpose is a
 * growing corpus of real games per mission that stealer-AI improvements can be
 * mined from as MISSION-GENERIC rules; nothing here feeds back into play.
 *
 * Capture semantics: the Emitter's tap fires at real emit time, inside
 * capture() sections (where ordinary handlers are suppressed for the animated
 * stealer phase) and never for replayed re-emissions, so every game event is
 * recorded exactly once, in true chronological order.
 */

export const GAMELOG_FORMAT_VERSION = 1;

/** UI-only chatter excluded from the log: selection changes carry no game
 *  state, and per-AP-spend ticks are derivable from the logged actions. */
const SKIP_EVENTS: ReadonlySet<keyof PieceEventsType> = new Set(['selected', 'apChanged'] as const);

/** The slice of GameEngine the logger reads. Structural, so unit tests can
 *  drive a stub without building a full engine. */
export interface LoggerEngine {
  turnNumber: number;
  phase: string;
  mission: { name: string };
  state: {
    pieces: { id: string; kind: string; spriteKey: string; pos: { c: number; r: number }; facing: number }[];
  };
}

export interface LoggedEvent {
  /** Monotonic per-game sequence number: chronological order, no gaps. */
  seq: number;
  /** Engine turn and phase AT emission time. */
  turn: number;
  phase: string;
  type: string;
  [key: string]: unknown;
}

export interface GameLogMeta {
  formatVersion: number;
  /** Mission REGISTRY key (space_hulk_1...): groups logs for analysis. */
  mission: string;
  /** Display title ("Suicide Mission"). */
  missionName: string;
  /** The ?seed pin, or null for an unseeded game. Shot/combat events embed
   *  their actual rolls either way, so hit-rate analysis never re-simulates. */
  seed: number | null;
  /** App build version (__APP_VERSION__), 'unknown' outside the client. */
  version: string;
  startedAt: string;
  endedAt: string | null;
  result: string | null;
}

export interface GameLog {
  meta: GameLogMeta;
  /** Board layout at logger attach time: reserves and reinforcements arrive
   *  later as pieceAdded events, deployment placements as pieceMoved. */
  initialPieces: { id: string; kind: string; sprite: string; x: number; y: number; facing: number }[];
  events: LoggedEvent[];
  /** Free-text player impressions, typed into the end dialog. */
  notes: string;
}

export class GameLogger {
  readonly meta: GameLogMeta;
  readonly initialPieces: GameLog['initialPieces'];
  readonly events: LoggedEvent[] = [];
  notes = '';

  private seq = 0;
  private readonly engine: LoggerEngine;
  private readonly tapFn: Tap<PieceEventsType>;

  constructor(engine: LoggerEngine, opts: { mission: string; seed?: number | null; version?: string; now?: Date }) {
    this.engine = engine;
    this.meta = {
      formatVersion: GAMELOG_FORMAT_VERSION,
      mission: opts.mission,
      missionName: engine.mission.name,
      seed: opts.seed ?? null,
      version: opts.version ?? 'unknown',
      startedAt: (opts.now ?? new Date()).toISOString(),
      endedAt: null,
      result: null,
    };
    this.initialPieces = engine.state.pieces.map(p => ({
      id: p.id, kind: p.kind, sprite: p.spriteKey, x: p.pos.c, y: p.pos.r, facing: p.facing,
    }));
    this.tapFn = ev => this.record(ev);
    PieceEvents.tap(this.tapFn);
  }

  private record(ev: CapturedEvent<PieceEventsType>): void {
    if (SKIP_EVENTS.has(ev.type)) return;
    this.events.push({
      // Deep copy: payloads embed arrays (rolls, squares, stealerIds); a
      // shallow spread would alias them, and any later mutation would rewrite
      // history in the record (advisor finding, 2026-08-20).
      ...structuredClone(ev.payload as Record<string, unknown>),
      // Envelope AFTER the payload so it always wins a key collision: the
      // envelope is engine truth at emit time (phaseChanged's own phase/turn
      // fields must never be able to shadow it, nor any future payload field
      // named seq or type).
      seq: this.seq++,
      turn: this.engine.turnNumber,
      phase: this.engine.phase,
      type: ev.type as string,
    });
    if (ev.type === 'gameOver') {
      this.meta.result = (ev.payload as PieceEventsType['gameOver']).result;
      this.meta.endedAt = new Date().toISOString();
    }
  }

  /** Stop recording (scene teardown); the accumulated log stays readable. */
  detach(): void {
    PieceEvents.untap(this.tapFn);
  }

  toJSON(): GameLog {
    return { meta: this.meta, initialPieces: this.initialPieces, events: this.events, notes: this.notes };
  }

  /** The downloadable file body. Indent 1 keeps it diffable and greppable
   *  without doubling the size the way indent 2 would on thousands of events. */
  serialize(): string {
    return JSON.stringify(this.toJSON(), null, 1);
  }

  /** sulk-log_<missionKey>_<YYYY-MM-DD_HH-MM-SS>.json: mission plus wall
   *  clock keeps a collected corpus unique and sortable. Local time: the
   *  filename is for the human collecting files; startedAt/endedAt in the
   *  log body stay UTC ISO for analysis. */
  filename(date: Date = new Date()): string {
    const p = (n: number) => String(n).padStart(2, '0');
    const stamp = `${date.getFullYear()}-${p(date.getMonth() + 1)}-${p(date.getDate())}` +
      `_${p(date.getHours())}-${p(date.getMinutes())}-${p(date.getSeconds())}`;
    return `sulk-log_${this.meta.mission}_${stamp}.json`;
  }
}
