import { GameEngine } from '../GameEngine.js';
import { StormBolterMarine, SergeantMarine } from '../pieces/StormBolterMarine.js';
import { HeavyFlamerMarine } from '../pieces/HeavyFlamerMarine.js';
import type { Piece, Coord } from '../pieces/Piece.js';
import { canShoot } from '../board/vision.js';
import { DIR_VEC, chebyshev, facingToward, turnToward } from '../core/Direction.js';
import { closeCombat } from '../rules/combat.js';
import type { Board } from '../board/Board.js';

/**
 * A scripted marine player using only legal actions: shoot what is shootable,
 * fight what is in the face, open doors, walk a BFS path toward the mission
 * goal, and go on overwatch with spare AP. The heavy flamer never wastes ammo
 * on targets of opportunity — its six shots ARE the loss condition; it flames
 * only the objective. Deterministic for a given dice seed — used by the
 * autoplay demo and the pinned-seed playthrough tests.
 */
export function runMarineTurn(engine: GameEngine): void {
  const board = engine.state.board;
  const goal = engine.mission.objectivePoint ?? engine.mission.exitPoints?.[0];
  // Flame missions: the room must be torched from OUTSIDE its section, so the
  // escorts stage short of the objective (or they would stand in the fire),
  // and the flamer stops on the first square it can flame from.
  const flameMission = engine.mission.objective === 'flame-objective';
  const flamer = engine.marines.find(f => f instanceof HeavyFlamerMarine);
  // On flame missions the flamer LEADS the column — the approach corridors are
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
    let acts = 0;
    while (m.alive && m.ap > 0 && acts++ < 16 && engine.state.result === 'ongoing') {
      if (m instanceof HeavyFlamerMarine) {
        // Flame targets: the single objective (mission 1) or every not-yet-
        // cleansed Gene Bank (mission 4) — first one in range gets torched.
        const flamePoints = engine.mission.objective === 'flame-objectives'
          ? (engine.mission.objectivePoints ?? []).filter(p => !engine.cleansed.has(`${p.x},${p.y}`))
          : goal ? [goal] : [];
        const target = flamePoints.map(t => board.get(t.x, t.y)).find(sq => m.canFlame(sq));
        if (target) {
          m.flameAt(target);
          break;
        }
      }
      if (m instanceof StormBolterMarine && shootNearest(engine, m)) { engine.checkVictory(); continue; }
      const v = DIR_VEC[m.facing];
      const ahead = board.pieceAt({ c: m.pos.c + v.dc, r: m.pos.r + v.dr }) as Piece | undefined;
      if (ahead && ahead.kind !== 'marine') {
        if (closeCombat(m, ahead)) { engine.checkVictory(); continue; }
      }
      const door = m.findAdjacentDoor();
      if (door && !door.isOpen && m.useDoor()) continue;
      // With the horde close, bolters bank 2 AP for overwatch instead of
      // marching into claw range — the real Space Hulk advance-and-cover.
      if (m instanceof StormBolterMarine && m.ap === 2 && !m.overwatch && !m.jammed && enemiesNear()) {
        m.overwatchOn();
        break;
      }
      // Flame missions: the flamer leads and the escorts FOLLOW it — they
      // must never overtake into the objective approach (they would wall off
      // the one-square-wide firing corridor or stand inside the blast).
      // Kill-quota missions have no objective square: each marine marches on
      // its nearest entry point (the blockade win) and overwatches the flow.
      const target = flameMission && !(m instanceof HeavyFlamerMarine) && flamer?.alive
        ? { x: flamer.pos.c, y: flamer.pos.r }
        : quotaPosts ? quotaPosts.get(m.id) : (missionTarget(engine, m) ?? goal);
      if (target && advanceToward(board, m, target)) {
        engine.checkVictory();
        // Move-and-shoot: the move earned a free bolter shot — use it.
        if (m instanceof StormBolterMarine) shootNearest(engine, m);
        continue;
      }
      if (m instanceof StormBolterMarine && m.ap >= 2 && !m.overwatch && !m.jammed) { m.overwatchOn(); break; }
      break;
    }
    if (engine.state.result !== 'ongoing') return;
  }
}

/** One BFS step toward the goal: face the step direction, then move. */
function advanceToward(board: Board, m: Piece, goal: { x: number; y: number }): boolean {
  const next = nextStep(board, m.pos, { c: goal.x, r: goal.y });
  if (!next || board.isOccupied(next)) return false;
  if (!turnToward(m, facingToward(m.pos, next))) return false;
  return m.tryMove(next.c - m.pos.c, next.r - m.pos.r);
}

/** First step of a shortest 8-connected path; friendly pieces are transparent
 *  for pathing (the squad queues) but never stepped onto; closed doors are
 *  walked up to and opened on contact by the caller.
 *  KNOWN DIVERGENCE from StealerAI.nextStepOnPath (see ISA Decisions
 *  2026-08-17): this planner skips the diagonalBlockedByDoor corner rule and
 *  treats enemy pieces as transparent. A planned corner-cut tryMove refuses
 *  makes advanceToward return false (the marine overwatches instead of
 *  stalling). Left as-is deliberately — fixing it changes seeded playthroughs. */
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
      // Everyone converges on the exits — escaping escorts VACATE the one-wide
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
      return undefined; // hold the fort — the overwatch branch takes it from here
    case 'download': {
      // Sergeants make for the Data Room square; everyone else converges but
      // holds the perimeter (never parks ON the square the sergeant needs).
      const dp = engine.mission.downloadPoint;
      if (!dp) return undefined;
      if (!(m instanceof SergeantMarine)) {
        if (chebyshev({ c: dp.x, r: dp.y }, m.pos) <= 2) return undefined; // in position — overwatch from here
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
 *  metric), capped at `max` — returns max+1 when farther/disconnected. */
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

function shootNearest(engine: GameEngine, marine: StormBolterMarine): boolean {
  const board = engine.state.board;
  const targets = (board.pieces as Piece[])
    .filter(p => p.kind !== 'marine')
    .filter(p => {
      const sq = board.get(p.pos.c, p.pos.r);
      return sq !== undefined && canShoot(board, marine, sq);
    })
    .sort((a, b) =>
      Math.hypot(a.pos.c - marine.pos.c, a.pos.r - marine.pos.r) -
      Math.hypot(b.pos.c - marine.pos.c, b.pos.r - marine.pos.r));
  if (!targets[0]) return false;
  return marine.shoot(targets[0]) || true; // AP spent even on a miss
}

/** Play whole turns until the game resolves or the turn cap is hit. */
export function autoplay(engine: GameEngine, maxTurns = 30): void {
  while (engine.state.result === 'ongoing' && engine.turnNumber <= maxTurns) {
    runMarineTurn(engine);
    if (engine.state.result !== 'ongoing') return;
    engine.endMarinePhase();
  }
}
