import { GameEngine } from '../GameEngine.js';
import { StormBolterMarine, SergeantMarine } from '../pieces/StormBolterMarine.js';
import { HeavyFlamerMarine } from '../pieces/HeavyFlamerMarine.js';
import type { Piece, Coord } from '../pieces/Piece.js';
import { DIR_VEC, chebyshev, facingToward } from '../core/Direction.js';
import type { Board } from '../board/Board.js';
import type { MarineCommand } from '../core/Commands.js';
import { nearestShootable, moveDirFor } from './MarineAI.js';

/**
 * A scripted marine player using only legal actions, issued as COMMANDS
 * through GameEngine.command (2.x): shoot what is shootable, fight what is
 * in the face, open doors, walk a BFS path toward the mission goal, and go
 * on overwatch with spare AP. The heavy flamer never wastes ammo on targets
 * of opportunity; its six shots ARE the loss condition; it flames only the
 * objective. Deterministic for a given dice seed: the autoplay demo and the
 * pinned-seed e2e fixtures ride it. Because every action is a command, the
 * marines it drives hold a direct-control lease and the default AI leaves
 * them alone. Stage 2 turns this into the scripted order issuer.
 */
export function runMarineTurn(engine: GameEngine): void {
  const board = engine.state.board;
  const goal = engine.mission.objectivePoint ?? engine.mission.exitPoints?.[0];
  // Flame missions: the room must be torched from OUTSIDE its section, so the
  // escorts stage short of the objective (or they would stand in the fire),
  // and the flamer stops on the first square it can flame from.
  const flameMission = engine.mission.objective === 'flame-objective';
  const flamer = engine.marines.find(f => f instanceof HeavyFlamerMarine);
  // On flame missions the flamer LEADS the column: the approach corridors are
  // one square wide, and escorts parked ahead of it would wall off the firing
  // position. On other missions bolters clear the way first.
  const flamerFirst = engine.mission.objective === 'flame-objective' ? -1 : 1;
  const marines = [...engine.marines].sort((a, b) =>
    (Number(a instanceof HeavyFlamerMarine) - Number(b instanceof HeavyFlamerMarine)) * flamerFirst);

  const enemiesNear = () => (board.pieces as Piece[]).some(p =>
    p.kind !== 'marine' && engine.marines.some(m => chebyshev(m.pos, p.pos) <= 10));

  // Kill-quota missions: the blockade win needs EVERY entry within 6 of some
  // marine, so marines split into posts by greedy set-cover, not nearest-entry
  // (which clumps the squad on one cluster and leaves far entries open).
  const quotaPosts = engine.mission.objective === 'kill-quota' ? assignEntryPosts(engine) : undefined;

  for (const m of marines) {
    if (!m.alive || engine.state.result !== 'ongoing') continue;
    const cmd = chooseCommand(engine, m, { goal, flameMission, flamer, quotaPosts, enemiesNear });
    if (cmd) engine.command(m.id, cmd);
    if (engine.state.result !== 'ongoing') return;
  }
}

interface TurnContext {
  goal: { x: number; y: number } | undefined;
  flameMission: boolean;
  flamer: Piece | undefined;
  quotaPosts: Map<string, { x: number; y: number }> | undefined;
  enemiesNear: () => boolean;
}

/** The one command this marine issues now, or null to hold. */
function chooseCommand(engine: GameEngine, m: Piece, ctx: TurnContext): MarineCommand | null {
  const board = engine.state.board;
  if (m instanceof HeavyFlamerMarine) {
    // Flame targets: the single objective (mission 1) or every not-yet-
    // cleansed Gene Bank (mission 4); the first one in range gets torched.
    const flamePoints = engine.mission.objective === 'flame-objectives'
      ? (engine.mission.objectivePoints ?? []).filter(p => !engine.cleansed.has(`${p.x},${p.y}`))
      : ctx.goal ? [ctx.goal] : [];
    // In reach: fire when the 2 AP are there, otherwise HOLD for them. In
    // real time an AP arrives every few ticks and a step would spend it, so
    // a flamer that kept walking would enter the room it means to burn.
    const inReach = flamePoints.map(t => board.get(t.x, t.y)).find(sq => m.ammo >= 1 && m.inFlameReach(sq));
    if (inReach) return m.canFlame(inReach) ? { type: 'flame', x: inReach.x, y: inReach.y } : null;
  }
  if (m instanceof StormBolterMarine) {
    const target = nearestShootable(board, m);
    if (target) return { type: 'shoot', targetId: target.id };
  }
  const v = DIR_VEC[m.facing];
  const ahead = board.pieceAt({ c: m.pos.c + v.dc, r: m.pos.r + v.dr }) as Piece | undefined;
  if (ahead && ahead.kind !== 'marine' && m.ap >= 1) return { type: 'melee' };
  const door = m.findAdjacentDoor();
  if (door && !door.isOpen && m.ap >= 1) return { type: 'door' };
  // With the horde close, bolters cover instead of marching into claw
  // range: bank AP until overwatch is affordable, then hold on it and let
  // reaction fire work (the real Space Hulk advance-and-cover; in real time
  // a marine who spends each AP the moment it arrives walks blind).
  if (m instanceof StormBolterMarine && !m.jammed && ctx.enemiesNear()) {
    if (m.overwatch) return null;
    if (m.ap >= 2) return { type: 'overwatch', on: true };
    return null;
  }
  // Flame missions: the flamer leads and the escorts FOLLOW it; they must
  // never overtake into the objective approach (they would wall off the
  // one-square-wide firing corridor or stand inside the blast).
  // Kill-quota missions have no objective square: each marine marches on
  // its post (the blockade win) and overwatches the flow.
  const target = ctx.flameMission && !(m instanceof HeavyFlamerMarine) && ctx.flamer?.alive
    ? { x: ctx.flamer.pos.c, y: ctx.flamer.pos.r }
    : ctx.quotaPosts ? ctx.quotaPosts.get(m.id) : (missionTarget(engine, m) ?? ctx.goal);
  if (target) {
    const step = advanceCommand(board, m, target);
    if (step) return step;
  }
  if (m instanceof StormBolterMarine && m.ap >= 2 && !m.overwatch && !m.jammed) return { type: 'overwatch', on: true };
  return null;
}

/** One BFS step toward the goal as a command: face the step direction first,
 *  then move (a turn and a move are two commands, two calls). */
function advanceCommand(board: Board, m: Piece, goal: { x: number; y: number }): MarineCommand | null {
  const next = nextStep(board, m.pos, { c: goal.x, r: goal.y });
  if (!next || board.isOccupied(next)) return null;
  const dir = facingToward(m.pos, next);
  if (m.facing !== dir) {
    const delta = ((dir - m.facing + 4) % 4);
    return { type: 'turn', delta: delta === 1 ? 1 : delta === 3 ? -1 : 2 };
  }
  const moveDir = moveDirFor(m.facing, next.c - m.pos.c, next.r - m.pos.r);
  return moveDir ? { type: 'move', dir: moveDir } : null;
}

/** First step of a shortest 8-connected path; friendly pieces are transparent
 *  for pathing (the squad queues) but never stepped onto; closed doors are
 *  walked up to and opened on contact by the caller.
 *  KNOWN DIVERGENCE from the hive's pathStep (see ISA Decisions
 *  2026-08-17): this planner skips the diagonalBlockedByDoor corner rule and
 *  treats enemy pieces as transparent. A planned corner-cut the move refuses
 *  makes the advance command fail (the marine overwatches instead of
 *  stalling). Left as-is deliberately. */
function nextStep(board: Board, from: Coord, to: Coord): Coord | undefined {
  const key = (c: Coord) => `${c.c},${c.r}`;
  const prev = new Map<string, Coord | null>();
  prev.set(key(from), null);
  const queue: Coord[] = [from];
  while (queue.length > 0) {
    const cur = queue.shift()!;
    if (cur.c === to.c && cur.r === to.r && !(cur.c === from.c && cur.r === from.r)) {
      let step = cur;
      for (;;) {
        const back = prev.get(key(step));
        if (back === null || back === undefined) return step;
        if (back.c === from.c && back.r === from.r) return step;
        step = back;
      }
    }
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        if (dc === 0 && dr === 0) continue;
        const nxt = { c: cur.c + dc, r: cur.r + dr };
        if (prev.has(key(nxt))) continue;
        if (!board.isPassable(nxt)) continue;
        prev.set(key(nxt), cur);
        queue.push(nxt);
      }
    }
  }
  return undefined;
}

/** Per-mission movement target for one marine (undefined = hold/overwatch or
 *  fall back to the generic goal). */
function missionTarget(engine: GameEngine, m: Piece): { x: number; y: number } | undefined {
  const board = engine.state.board;
  const nearest = (pts: { x: number; y: number }[]) => [...pts].sort((a, b) =>
    Math.hypot(a.x - m.pos.c, a.y - m.pos.r) - Math.hypot(b.x - m.pos.c, b.y - m.pos.r))[0];
  switch (engine.mission.objective) {
    case 'kill-quota':
      return assignEntryPosts(engine).get(m.id);
    case 'escape-count':
      return nearest(engine.mission.exitPoints ?? []);
    case 'escort-cat': {
      // Everyone converges on the exits; escaping escorts VACATE the one-wide
      // corridors instead of walling the carrier in (the mission-1 marching
      // lesson). Only the marine closest to a loose cat detours to fetch it.
      const cat = board.cat;
      if (cat && !cat.destroyed && cat.carrierId === null) {
        const fetcher = [...engine.marines].sort((a, b) =>
          Math.hypot(a.pos.c - cat.pos.c, a.pos.r - cat.pos.r) -
          Math.hypot(b.pos.c - cat.pos.c, b.pos.r - cat.pos.r))[0];
        if (fetcher?.id === m.id) return { x: cat.pos.c, y: cat.pos.r };
      }
      return nearest(engine.mission.exitPoints ?? []);
    }
    case 'flame-objectives': {
      const open = (engine.mission.objectivePoints ?? []).filter(p => !engine.cleansed.has(`${p.x},${p.y}`));
      if (m instanceof HeavyFlamerMarine) return nearest(open);
      const flamers = engine.marines.filter(f => f instanceof HeavyFlamerMarine);
      const f = flamers.sort((a, b) =>
        Math.hypot(a.pos.c - m.pos.c, a.pos.r - m.pos.r) - Math.hypot(b.pos.c - m.pos.c, b.pos.r - m.pos.r))[0];
      return f ? { x: f.pos.c, y: f.pos.r } : undefined;
    }
    case 'defend':
      return undefined; // hold the fort; the overwatch branch takes it from here
    case 'download': {
      // Sergeants make for the Data Room square; everyone else converges but
      // holds the perimeter (never parks ON the square the sergeant needs).
      const dp = engine.mission.downloadPoint;
      if (!dp) return undefined;
      if (!(m instanceof SergeantMarine)) {
        if (chebyshev({ c: dp.x, r: dp.y }, m.pos) <= 2) return undefined; // in position: overwatch from here
      }
      return { x: dp.x, y: dp.y };
    }
    default:
      return undefined;
  }
}

/**
 * Greedy entry-post assignment for kill-quota missions: each marine (in squad
 * order) takes its nearest still-uncovered entry; standing there covers every
 * entry within 6 board-walk squares (the blockade metric), which are removed
 * from the pool. Marines left over reinforce their nearest entry.
 */
function assignEntryPosts(engine: GameEngine): Map<string, { x: number; y: number }> {
  const board = engine.state.board;
  const entries = engine.mission.entryPoints ?? [];
  const posts = new Map<string, { x: number; y: number }>();
  const uncovered = [...entries];
  for (const m of engine.marines) {
    const pool = uncovered.length > 0 ? uncovered : entries;
    const target = [...pool].sort((a, b) =>
      Math.hypot(a.x - m.pos.c, a.y - m.pos.r) - Math.hypot(b.x - m.pos.c, b.y - m.pos.r))[0];
    if (!target) break;
    posts.set(m.id, target);
    for (let i = uncovered.length - 1; i >= 0; i--) {
      if (walkDist(board, target, uncovered[i], 6) <= 6) uncovered.splice(i, 1);
    }
  }
  return posts;
}

/** Board-walk distance (8-way over existing squares, the get_team_is_near
 *  metric), capped at `max`; returns max+1 when farther/disconnected. */
function walkDist(board: Board, a: { x: number; y: number }, b: { x: number; y: number }, max: number): number {
  if (a.x === b.x && a.y === b.y) return 0;
  const start = board.get(a.x, a.y);
  if (!start) return max + 1;
  let frontier = [start];
  const seen = new Set([start]);
  for (let dist = 1; dist <= max; dist++) {
    const next = [];
    for (const sq of frontier) {
      for (const adj of board.adjacentsOf(sq)) {
        if (seen.has(adj)) continue;
        if (adj.x === b.x && adj.y === b.y) return dist;
        seen.add(adj);
        next.push(adj);
      }
    }
    frontier = next;
  }
  return max + 1;
}

/** Play until the game resolves or the cycle cap is hit: one round of
 *  commands, one tick, repeat. */
export function autoplay(engine: GameEngine, maxCycles = 30): void {
  while (engine.state.result === 'ongoing' && engine.cycle <= maxCycles) {
    runMarineTurn(engine);
    if (engine.state.result !== 'ongoing') return;
    engine.tick();
  }
}
