import { GameEngine } from '../GameEngine.js';
import { StormBolterMarine, SergeantMarine } from '../pieces/StormBolterMarine.js';
import { HeavyFlamerMarine } from '../pieces/HeavyFlamerMarine.js';
import type { Piece } from '../pieces/Piece.js';
import { chebyshev } from '../core/Direction.js';
import type { Board } from '../board/Board.js';
import type { MarineCommand, MarineOrder } from '../core/Commands.js';

/**
 * The scripted order issuer (2.x stage 2). The autopilot no longer plays the
 * marines; it gives each one an individual order (ai/orders.ts) and lets the
 * default AI walk it, shoot on the way and cover on arrival. Per marine, per
 * call, it issues at most one command:
 *
 *  - the heavy flamer in reach of a flame target with 2 AP: the flame
 *    command (flaming is a direct action, never part of an order); one
 *    square short of the firing door he opens it with the door command,
 *    because the door square already belongs to the room's section;
 *  - a bolter with enemies within 10 squares: clearOrder while an order is
 *    live and no new order (the cover branch: the default list overwatches
 *    him; an ordered marine would leave overwatch and walk into the claws);
 *  - otherwise, a marine without a live order: moveTo the mission target
 *    (bolters then overwatch, the flamer then hold); flame-mission escorts
 *    follow the flamer (a target held by a marine completes when adjacent,
 *    so the escort re-orders as the flamer moves on).
 *
 * Deterministic for a seed: the pinned e2e fixtures and the seed scans ride
 * it. Doors on the route are opened by the order itself.
 */
export function runMarineTurn(engine: GameEngine): void {
  const board = engine.state.board;
  const goal = engine.mission.objectivePoint ?? engine.mission.exitPoints?.[0];
  const flameMission = engine.mission.objective === 'flame-objective';
  const flamer = engine.marines.find(f => f instanceof HeavyFlamerMarine);
  const enemiesNear = () => (board.pieces as Piece[]).some(p =>
    p.kind !== 'marine' && engine.marines.some(m => chebyshev(m.pos, p.pos) <= 10));
  const quotaPosts = engine.mission.objective === 'kill-quota' ? assignEntryPosts(engine) : undefined;

  for (const m of [...engine.marines]) {
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

/** The one command this marine gets now, or null. */
function chooseCommand(engine: GameEngine, m: Piece, ctx: TurnContext): MarineCommand | null {
  const board = engine.state.board;
  if (m instanceof HeavyFlamerMarine) {
    const flamePoints = engine.mission.objective === 'flame-objectives'
      ? (engine.mission.objectivePoints ?? []).filter(p => !engine.cleansed.has(`${p.x},${p.y}`))
      : ctx.goal ? [ctx.goal] : [];
    const inReach = flamePoints.map(t => board.get(t.x, t.y)).find(sq => m.ammo >= 1 && m.inFlameReach(sq));
    if (inReach) {
      // In reach: hold for the 2 AP (a step would spend them and walk him
      // into the room he means to burn), then fire.
      if (m.order) return { type: 'clearOrder' };
      return m.canFlame(inReach) ? { type: 'flame', x: inReach.x, y: inReach.y } : null;
    }
    // The firing door: a closed door in his front three whose opening puts a
    // flame target in reach is opened from HERE, one square short of it (the
    // room's section starts on the door square; a marine who walks onto it
    // stands inside the section he means to burn and can never flame it).
    const door = m.findAdjacentDoor();
    if (door && !door.isOpen) { // even at 0 AP: the refused command still parks him here until the AP arrives
      door.open(true);
      const wouldReach = flamePoints.map(t => board.get(t.x, t.y)).some(sq => m.inFlameReach(sq));
      door.close(true);
      if (wouldReach) return { type: 'door' };
    }
  }
  // Cover: with the horde inside 10 squares a bolter drops his march and
  // lets the default list overwatch; not on missions whose job is to leave
  // (reach-exit, escape-count), where stopping to cover is how a lone
  // marine dies: there he keeps walking and shoots on the way (rule 3).
  const leaving = engine.mission.objective === 'reach-exit' || engine.mission.objective === 'escape-count';
  if (m instanceof StormBolterMarine && !m.jammed && !leaving && ctx.enemiesNear()) {
    return m.order ? { type: 'clearOrder' } : null;
  }
  if (m.order) return null; // still working on it
  const target = ctx.flameMission && !(m instanceof HeavyFlamerMarine) && ctx.flamer?.alive
    ? { x: ctx.flamer.pos.c, y: ctx.flamer.pos.r }
    : ctx.quotaPosts ? ctx.quotaPosts.get(m.id) : (missionTarget(engine, m) ?? ctx.goal);
  if (!target) return null;
  if (target.x === m.pos.c && target.y === m.pos.r) return null; // there already: the default covers
  const order: MarineOrder = {
    type: 'moveTo', x: target.x, y: target.y,
    then: m instanceof StormBolterMarine ? 'overwatch' : 'hold',
  };
  return { type: 'order', order };
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
      return undefined; // hold the fort; the default list's overwatch takes it from here
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
 *  orders, one tick, repeat. */
export function autoplay(engine: GameEngine, maxCycles = 30): void {
  while (engine.state.result === 'ongoing' && engine.cycle <= maxCycles) {
    runMarineTurn(engine);
    if (engine.state.result !== 'ongoing') return;
    engine.tick();
  }
}
