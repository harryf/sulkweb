import type { GameEngine } from '../GameEngine.js';
import type { Board } from '../board/Board.js';
import type { Square } from '../board/Square.js';
import type { Piece, Coord } from '../pieces/Piece.js';
import type { MarineOrder, SquadOrder } from '../core/Commands.js';
import type { MarineType } from '../missions/missionTypes.js';
import { StormBolterMarine, SergeantMarine, SwordSergeantMarine } from '../pieces/StormBolterMarine.js';
import { HeavyFlamerMarine } from '../pieces/HeavyFlamerMarine.js';
import { AssaultCannonMarine, ChainFistMarine } from '../pieces/AssaultCannonMarine.js';
import { chebyshev, facingToward, turn, type Dir } from '../core/Direction.js';
import { inFireArc } from '../board/vision.js';
import { hasLineOfSight } from '../board/los.js';
import { distanceField, pathStep } from './hive.js';
import { autoDeployOrder } from '../rules/deploy.js';
import { TUNING } from '../core/CostTables.js';
import { setOrder, setTask } from './orders.js';
import { nearestThreatInSight } from './MarineAI.js';
import { PieceEvents } from '../events/PieceEvents.js';

/**
 * Squad orders (2.x stage 3, docs/realtime-plan.md "Squad AI"). A squad
 * order is standing intent for a whole squad. Its planner runs every tick
 * (GameEngine.tick step 3, before the marine AI) once the order is due and
 * writes each member's squad task (`Piece.task`, the level 2 slot): the
 * order executor in ai/orders.ts walks it exactly like a player's order,
 * behind any live player's order. The planner is the task's single writer:
 * it rewrites a task only when its plan changes (setTask is idempotent), so
 * a posted marine keeps his post through completion and a re-plan that
 * changes nothing emits nothing.
 *
 * The chain of command: a squad order is relayed through a living sergeant
 * and takes effect on the next tick; without one it takes effect after
 * TUNING.relayTicks and is executed without coordination (defend: hold
 * where you stand; advance: everyone walks on his own; clear: the nearest
 * marine opens). Coordination is fixed when the order is issued, so a
 * sergeant killed mid-order degrades the next order, not this one.
 *
 * Direct control pins a member: for a cycle after his last key press the
 * defend planner takes his square and facing as his post, and the other
 * planners leave him alone, so the player's placement is not undone the
 * moment the lease ends.
 */
export interface SquadState {
  squad: string;
  order: SquadOrder | null;
  /** Tick the order was received. */
  issuedTick: number;
  /** First tick the planner acts on it. */
  dueTick: number;
  /** A living sergeant relayed it (fixed at issue). */
  coordinated: boolean;
  /** Re-plan key of the last plan (defend). */
  planKey: string;
  /** advance: nearest contact distance seen and when it last closed in. */
  contactDist: number;
  contactTick: number;
  /** clear: the tick the covers' tasks were issued (the opener's timeout). */
  coverIssuedTick: number;
  /** The planner has acted on the order at least once. */
  started: boolean;
  /** advance: the column, front to back, fixed at the first plan (the heavy
   *  flamer may be demoted once, never promoted, so the order never flips). */
  column: string[];
}

export function newSquadState(squad: string): SquadState {
  return {
    squad, order: null, issuedTick: -1, dueTick: -1, coordinated: true,
    planKey: '', contactDist: Infinity, contactTick: -Infinity, coverIssuedTick: -1, started: false, column: [],
  };
}

const key = (c: { c: number; r: number }) => `${c.c},${c.r}`;
/** Walk distance from the near flank within which a clear's covers are posted. */
const COVER_RADIUS = 3;
const sqCoord = (sq: Square): Coord => ({ c: sq.x, r: sq.y });
const DIRS: Dir[] = [0, 1, 2, 3] as Dir[];

/** The squad a marine answers to: his deployment tag, or "Squad" for an
 *  untagged mission (debug_1's lone marine). */
export function squadOf(m: Piece): string {
  return m.squad ?? 'Squad';
}

/** Living members of a squad, board order. */
export function squadMembers(engine: GameEngine, squad: string): Piece[] {
  return engine.marines.filter(m => m.alive && squadOf(m) === squad);
}

export function hasSergeant(members: Piece[]): boolean {
  return members.some(m => m instanceof SergeantMarine);
}

/** A member the player steered within the last cycle keeps his ground. */
export function isPinned(engine: GameEngine, m: Piece): boolean {
  return engine.tickCount - m.lastCommandTick < TUNING.cycleTicks;
}

function marineType(m: Piece): MarineType {
  if (m instanceof SwordSergeantMarine) return 'sergeant_sword';
  if (m instanceof SergeantMarine) return 'sergeant';
  if (m instanceof HeavyFlamerMarine) return 'heavy_flamer';
  if (m instanceof AssaultCannonMarine) return 'assault_cannon';
  if (m instanceof ChainFistMarine) return 'chain_fist';
  return 'storm_bolter';
}

/** Members in battle order: bolter, sergeant, heavy weapon, the rest. */
export function battleOrder(members: Piece[]): Piece[] {
  return autoDeployOrder(members.map(marineType)).map(i => members[i]);
}

/** Squares within `max` walk of `sources`, pieces transparent, never
 *  entering `avoid`. Keys to distances. */
export function walk(board: Board, sources: Coord[], max: number, avoid?: Set<string>): Map<string, number> {
  const dist = new Map<string, number>();
  const queue: Coord[] = [];
  for (const s of sources) {
    if (!board.get(s.c, s.r) || dist.has(key(s))) continue;
    dist.set(key(s), 0);
    queue.push(s);
  }
  while (queue.length > 0) {
    const cur = queue.shift()!;
    const d = dist.get(key(cur))!;
    if (d >= max) continue;
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        if (dc === 0 && dr === 0) continue;
        const nxt = { c: cur.c + dc, r: cur.r + dr };
        const k = key(nxt);
        if (!board.isPassable(nxt, true) || dist.has(k) || avoid?.has(k)) continue;
        if (dc !== 0 && dr !== 0 && board.diagonalBlockedByDoor(cur, nxt)) continue;
        dist.set(k, d + 1);
        queue.push(nxt);
      }
    }
  }
  return dist;
}

/** A square a member may stand on: passable and free, or held by a member. */
function standable(board: Board, c: Coord, members: Piece[]): boolean {
  if (!board.isPassable(c, true)) return false;
  const p = board.pieceAt(c) as Piece | undefined;
  return !p || members.includes(p);
}

/** A moveTo task to a post with a facing. */
const postTask = (m: Piece, c: Coord, facing: Dir): MarineOrder => ({
  type: 'moveTo', x: c.c, y: c.r, facing,
  then: m instanceof HeavyFlamerMarine ? 'hold' : 'overwatch',
});

/** Run `fn` with the given doors peeked open (silently: no board version bump). */
function withDoorsOpen<T>(board: Board, doors: Set<string>, fn: () => T): T {
  const opened = board.allDoors().filter(d => !d.isOpen && doors.has(`${d.square.x},${d.square.y},${d.facing}`));
  for (const d of opened) d.open(true);
  try { return fn(); } finally { for (const d of opened) d.close(true); }
}

/** The lane squares a viewer at `c` facing `f` could fire on (geometry only:
 *  the fire cone plus a clear line through rock and closed doors; bodies
 *  ignored because the squad is about to move). */
function coverFrom(board: Board, c: Coord, f: Dir, lane: Map<string, Square>): Set<string> {
  const from = board.get(c.c, c.r)!;
  const out = new Set<string>();
  const viewer = { pos: c, facing: f };
  for (const [k, sq] of lane) {
    if (inFireArc(viewer, sq) && hasLineOfSight(board, from, sq)) out.add(k);
  }
  return out;
}

// ---------------------------------------------------------------- defend --

/** The defended area: the clicked square's room section, else the squares
 *  within TUNING.defendRadius walk of it. */
export function defendArea(board: Board, x: number, y: number): Set<string> {
  const sq = board.get(x, y);
  if (!sq) return new Set();
  if (sq.sectionId >= 0) {
    return new Set(board.allSquares().filter(s => s.sectionId === sq.sectionId).map(s => key(sqCoord(s))));
  }
  return new Set(walk(board, [{ c: x, r: y }], TUNING.defendRadius).keys());
}

/** Squares outside the area adjacent to it (door edges included). */
export function entrancesOf(board: Board, area: Set<string>): Coord[] {
  const out = new Map<string, Coord>();
  for (const k of area) {
    const [c, r] = k.split(',').map(Number);
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        if (dc === 0 && dr === 0) continue;
        const n = { c: c + dc, r: r + dr };
        const nk = key(n);
        if (area.has(nk) || out.has(nk) || !board.isPassable(n, true)) continue;
        if (dc !== 0 && dr !== 0 && board.diagonalBlockedByDoor({ c, r }, n)) continue;
        out.set(nk, n);
      }
    }
  }
  return [...out.values()].sort((a, b) => a.r - b.r || a.c - b.c);
}

/** An entrance's lane: the squares outside the area within TUNING.laneDepth
 *  walk of it, the area never entered. Keys to squares, the entrance first. */
export function laneOf(board: Board, entrance: Coord, area: Set<string>): Map<string, Square> {
  const lane = new Map<string, Square>();
  for (const k of walk(board, [entrance], TUNING.laneDepth, area).keys()) {
    const [c, r] = k.split(',').map(Number);
    lane.set(k, board.get(c, r)!);
  }
  return lane;
}

/** The door edges between the area and its entrances (peeked open when scoring). */
function entranceDoors(board: Board, area: Set<string>, entrances: Coord[]): Set<string> {
  const out = new Set<string>();
  for (const e of entrances) {
    for (const v of [{ dc: 0, dr: -1 }, { dc: 1, dr: 0 }, { dc: 0, dr: 1 }, { dc: -1, dr: 0 }]) {
      const a = { c: e.c + v.dc, r: e.r + v.dr };
      if (!area.has(key(a))) continue;
      const d = board.doorBetween(a, e);
      if (d) out.add(`${d.square.x},${d.square.y},${d.facing}`);
    }
  }
  return out;
}

export interface DefendPost { id: string; c: Coord; facing: Dir; covers: Set<string> }

/**
 * The defend plan in two steps. First the posts: a greedy set cover of the
 * entrance lanes by (square, facing) candidates inside the area, one post
 * per bolter-armed member, each the candidate covering the most
 * still-uncovered lane squares (an entrance square itself weighs as four,
 * the choke); a post already held by a member scores one extra so equal
 * posts never swap across re-plans. Then the members: the assault cannon
 * takes the post with the longest lane; the rest are matched deepest post
 * first to the nearest member, so a column filing into a room sends its
 * head to the far door and its tail to the door it came through (the
 * first probe had the rear man assigned the far post and the corridor
 * plugged by his own squad). The heavy flamer goes last to the interior
 * square that sees the fewest lane squares, facing the most. A pinned
 * member (steered by the player this cycle) keeps his square and facing.
 */
export function planDefend(engine: GameEngine, members: Piece[], x: number, y: number): DefendPost[] {
  const board = engine.state.board;
  const area = defendArea(board, x, y);
  if (area.size === 0) return [];
  const entrances = entrancesOf(board, area);
  const lane = new Map<string, Square>();
  const weight = new Map<string, number>();
  for (const e of entrances) {
    for (const [k, sq] of laneOf(board, e, area)) {
      lane.set(k, sq);
      weight.set(k, Math.max(weight.get(k) ?? 0, k === key(e) ? 4 : 1));
    }
  }
  const doors = entranceDoors(board, area, entrances);
  const squares = [...area].map(k => { const [c, r] = k.split(',').map(Number); return { c, r }; })
    .filter(c => standable(board, c, members));
  // Score every candidate once, doors peeked.
  const cover = new Map<string, Set<string>>();
  withDoorsOpen(board, doors, () => {
    for (const c of squares) for (const f of DIRS) cover.set(`${key(c)}|${f}`, coverFrom(board, c, f, lane));
  });
  const uncovered = new Set(lane.keys());
  const taken = new Set<string>();
  const posts: DefendPost[] = [];
  const gain = (set: Set<string>) => { let g = 0; for (const k of set) if (uncovered.has(k)) g += weight.get(k) ?? 1; return g; };
  const commit = (m: Piece, c: Coord, f: Dir) => {
    const covers = cover.get(`${key(c)}|${f}`) ?? new Set<string>();
    for (const k of covers) uncovered.delete(k);
    taken.add(key(c));
    posts.push({ id: m.id, c, facing: f, covers });
  };
  // Pinned members first: their ground is the plan.
  const pinned = members.filter(m => isPinned(engine, m));
  for (const m of pinned) {
    if (!area.has(key(m.pos))) continue;
    if (!cover.has(`${key(m.pos)}|${m.facing}`)) {
      withDoorsOpen(board, doors, () => cover.set(`${key(m.pos)}|${m.facing}`, coverFrom(board, m.pos, m.facing, lane)));
    }
    commit(m, m.pos, m.facing);
  }
  const rest = members.filter(m => !pinned.includes(m) || !area.has(key(m.pos)));
  const cannons = rest.filter(m => m instanceof AssaultCannonMarine);
  const flamers = rest.filter(m => m instanceof HeavyFlamerMarine);
  const bolters = rest.filter(m => !(m instanceof AssaultCannonMarine) && !(m instanceof HeavyFlamerMarine));
  const armed = [...cannons, ...bolters];
  // Step 1: the post set.
  const centre = members.length > 0
    ? { c: Math.round(members.reduce((a, m) => a + m.pos.c, 0) / members.length), r: Math.round(members.reduce((a, m) => a + m.pos.r, 0) / members.length) }
    : { c: x, r: y };
  const fromSquad = walk(board, [centre], 400);
  const held = new Set(members.flatMap(m => m.task?.type === 'moveTo' ? [`${m.task.x},${m.task.y}|${m.task.facing}`] : []));
  const chosen: { c: Coord; f: Dir; covers: Set<string>; depth: number }[] = [];
  for (let n = 0; n < armed.length; n++) {
    let best: { c: Coord; f: Dir; score: number; d: number } | undefined;
    for (const c of squares) {
      if (taken.has(key(c))) continue;
      const d = fromSquad.get(key(c)) ?? Infinity;
      for (const f of DIRS) {
        const score = gain(cover.get(`${key(c)}|${f}`)!) + (held.has(`${key(c)}|${f}`) ? 1 : 0);
        if (!best || score > best.score || (score === best.score && d < best.d)) best = { c, f, score, d };
      }
    }
    if (!best) break;
    const covers = cover.get(`${key(best.c)}|${best.f}`)!;
    for (const k of covers) uncovered.delete(k);
    taken.add(key(best.c));
    chosen.push({ c: best.c, f: best.f, covers, depth: best.d });
  }
  // Step 2: members to posts. The cannon takes the longest lane; then the
  // deepest post goes to the nearest free member.
  const free = new Set(armed);
  const dists = new Map(armed.map(m => [m.id, walk(board, [m.pos], 400)] as const));
  const assign = (post: typeof chosen[number], m: Piece) => { free.delete(m); posts.push({ id: m.id, c: post.c, facing: post.f, covers: post.covers }); };
  const remaining = [...chosen];
  for (const cannon of cannons) {
    const longest = [...remaining].sort((a, b) => b.covers.size - a.covers.size)[0];
    if (!longest) break;
    remaining.splice(remaining.indexOf(longest), 1);
    assign(longest, cannon);
  }
  remaining.sort((a, b) => b.depth - a.depth);
  for (const post of remaining) {
    const m = [...free].sort((a, b) => (dists.get(a.id)!.get(key(post.c)) ?? Infinity) - (dists.get(b.id)!.get(key(post.c)) ?? Infinity))[0];
    if (!m) break;
    assign(post, m);
  }
  for (const m of flamers) {
    // Interior: the square with the fewest lane squares in view over all
    // facings; he faces whichever way shows the most from there.
    const dist = walk(board, [m.pos], 200);
    let best: { c: Coord; f: Dir; seen: number; d: number; incumbent: boolean } | undefined;
    for (const c of squares) {
      if (taken.has(key(c))) continue;
      const d = dist.get(key(c)) ?? Infinity;
      let seen = 0; let f: Dir = m.facing; let most = -1;
      for (const g of DIRS) {
        const n = cover.get(`${key(c)}|${g}`)!.size;
        seen = Math.max(seen, n);
        if (n > most) { most = n; f = g; }
      }
      const incumbent = m.task?.type === 'moveTo' && m.task.x === c.c && m.task.y === c.r;
      if (!best || seen < best.seen || (seen === best.seen && (incumbent || d < best.d) && !best.incumbent)) best = { c, f, seen, d, incumbent };
    }
    if (best) commit(m, best.c, best.f);
  }
  return posts;
}

/** Every entrance square in the fire lane of at least one post: the plan's
 *  exit criterion for defend. */
export function entrancesCovered(board: Board, x: number, y: number, posts: DefendPost[]): boolean {
  const area = defendArea(board, x, y);
  return entrancesOf(board, area).every(e => posts.some(p => p.covers.has(key(e))));
}

function runDefend(engine: GameEngine, st: SquadState, members: Piece[], order: Extract<SquadOrder, { type: 'defend' }>): void {
  if (!st.coordinated) { for (const m of members) setTask(m, null); return; } // hold where you stand
  const pins = members.filter(m => isPinned(engine, m)).map(m => m.id).join(',');
  const planKey = `${members.map(m => m.id).join(',')}|${pins}|${engine.cycle}`;
  if (planKey === st.planKey) return;
  st.planKey = planKey;
  const posts = planDefend(engine, members, order.x, order.y);
  for (const m of members) {
    const p = posts.find(q => q.id === m.id);
    setTask(m, p ? postTask(m, p.c, p.facing) : null);
  }
}

// --------------------------------------------------------------- advance --

const STEPS: ReadonlyArray<{ dc: number; dr: number }> = [
  { dc: 0, dr: -1 }, { dc: 1, dr: 0 }, { dc: 0, dr: 1 }, { dc: -1, dr: 0 },
  { dc: -1, dr: -1 }, { dc: 1, dr: -1 }, { dc: -1, dr: 1 }, { dc: 1, dr: 1 },
];

/** The neighbour that descends the field most, orthogonals before
 *  diagonals on ties (a column walks the corridor's line); undefined at a
 *  minimum. */
export function downhill(board: Board, field: Map<string, number>, c: Coord): Coord | undefined {
  const here = field.get(key(c)) ?? Infinity;
  let best: Coord | undefined; let bestD = here;
  for (const { dc, dr } of STEPS) {
    const n = { c: c.c + dc, r: c.r + dr };
    const d = field.get(key(n));
    if (d === undefined || d >= bestD) continue;
    if (dc !== 0 && dr !== 0 && board.diagonalBlockedByDoor(c, n)) continue;
    best = n; bestD = d;
  }
  return best;
}

/** A follower can reach a square beside his predecessor (marines solid). */
function canCloseUp(board: Board, m: Piece, pred: Piece): boolean {
  return pathStep(board, m.pos, c => chebyshev(c, pred.pos) <= 1) !== undefined;
}

/** The facing away from the target: toward the neighbour highest on the field. */
function backFacing(field: Map<string, number>, m: Piece, ahead: Coord | undefined): Dir {
  let best: Coord | undefined; let bestD = field.get(key(m.pos)) ?? -1;
  for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
    if (dc === 0 && dr === 0) continue;
    const n = { c: m.pos.c + dc, r: m.pos.r + dr };
    const d = field.get(key(n));
    if (d === undefined || d <= bestD) continue;
    best = n; bestD = d;
  }
  if (best) return facingToward(m.pos, best);
  return ahead ? turn(facingToward(m.pos, ahead), 2) : turn(m.facing, 2);
}

/**
 * Column order for an advance: by distance to the target, role as the
 * tie-break (bolter, sergeant, heavy, rest). Computed once per order (the
 * first probe re-sorted every tick and the column flipped as it moved);
 * the only later change is the heavy flamer's demotion behind the next
 * marine once that marine can get past him, which never reverses.
 */
export function columnOrder(members: Piece[], field: Map<string, number>): Piece[] {
  const rank = new Map(battleOrder(members).map((m, i) => [m.id, i]));
  return [...members].sort((a, b) =>
    (field.get(key(a.pos)) ?? Infinity) - (field.get(key(b.pos)) ?? Infinity) || rank.get(a.id)! - rank.get(b.id)!);
}

/** A flame mission with an uncleansed objective and a flamer who still has
 *  ammo: the job the squad exists for is his, so the column keeps him at
 *  its head (the stage 4 instrument's finding: demoted behind the column in
 *  a one-wide corridor he can never reach the door he must burn through). */
export function flameJobPending(engine: GameEngine, members: Piece[]): boolean {
  const mission = engine.mission;
  if (!members.some(m => m instanceof HeavyFlamerMarine && m.ammo >= 1)) return false;
  if (mission.objective === 'flame-objective') return mission.objectivePoint !== undefined && engine.cleansed.size === 0;
  if (mission.objective === 'flame-objectives') return (mission.objectivePoints ?? []).some(p => !engine.cleansed.has(`${p.x},${p.y}`));
  return false;
}

/** The heavy flamer leads only while nobody can pass him, except on a flame
 *  mission with his job still pending, where the column is his. */
function demoteFlamer(engine: GameEngine, board: Board, col: Piece[], field: Map<string, number>): void {
  if (col.length > 1 && flameJobPending(engine, col)) {
    const i = col.findIndex(m => m instanceof HeavyFlamerMarine && m.ammo >= 1);
    if (i > 0) { const [f] = col.splice(i, 1); col.unshift(f); }
    return;
  }
  if (col.length > 1 && col[0] instanceof HeavyFlamerMarine) {
    const way = downhill(board, field, col[0].pos);
    const canPass = way !== undefined && pathStep(board, col[1].pos, c => c.c === way.c && c.r === way.r) !== undefined;
    if (canPass) [col[0], col[1]] = [col[1], col[0]];
  }
}

function runAdvance(engine: GameEngine, st: SquadState, members: Piece[], order: Extract<SquadOrder, { type: 'advance' }>): void {
  const board = engine.state.board;
  const target = { c: order.x, r: order.y };
  if (!st.coordinated) {
    for (const m of members) if (!isPinned(engine, m)) setTask(m, { type: 'moveTo', x: target.c, y: target.r, then: m instanceof HeavyFlamerMarine ? 'hold' : 'overwatch' });
    return;
  }
  const field = distanceField(board, [target]);
  const alive = new Set(members.map(m => m.id));
  let col = st.column.map(id => members.find(m => m.id === id)).filter((m): m is Piece => m !== undefined);
  if (col.length !== members.length || !st.column.every(id => alive.has(id))) col = columnOrder(members, field);
  const at = (m: Piece, c: Coord) => m.pos.c === c.c && m.pos.r === c.r;
  // The one re-sort after the first plan: the leader's waypoint held by his
  // own column (a corner pocket where the follower behind him waits for his
  // square while he waits for the follower's) is a deadlock the stage 4
  // instrument found; sorting by the field puts the member nearest the
  // target in front, and his downhill square can never be a squad-mate's.
  const head = col[0];
  const wp0 = head?.task?.type === 'moveTo' ? { c: head.task.x, r: head.task.y } : undefined;
  if (head && wp0 && !at(head, wp0) && members.some(m => m !== head && at(m, wp0))) col = columnOrder(members, field);
  demoteFlamer(engine, board, col, field);
  st.column = col.map(m => m.id);
  const leader = col[0];
  const closed = col.every((m, i) => i === 0 || chebyshev(m.pos, col[i - 1].pos) <= 2);
  // The leader waits for the column to close up, unless the column cannot:
  // a follower with no path to his predecessor is walled off by the column
  // itself (the leader parked in a doorway), and the cure is to move on.
  const plugged = !closed && col.some((m, i) => i > 0 && chebyshev(m.pos, col[i - 1].pos) > 2 && !canCloseUp(board, m, col[i - 1]));
  // Completion: the leader on the target (or beside it when a marine holds
  // it) and the column closed up.
  const holder = board.pieceAt(target) as Piece | undefined;
  const leaderThere = at(leader, target) || (holder !== undefined && holder !== leader && chebyshev(leader.pos, target) <= 1);
  if (leaderThere && closed) { completeSquadOrder(engine, st, members); return; }
  // Contact: a threat in sight within TUNING.contactRange of a member
  // suspends the leader's march while it is closing in.
  let d = Infinity;
  for (const m of members) {
    const t = nearestThreatInSight(board, m);
    if (t) d = Math.min(d, chebyshev(t.pos, m.pos));
  }
  if (d <= TUNING.contactRange) {
    if (d < st.contactDist) { st.contactDist = d; st.contactTick = engine.tickCount; }
  } else {
    st.contactDist = Infinity;
  }
  const suspended = engine.tickCount - st.contactTick < TUNING.contactHoldTicks;
  for (let i = 0; i < col.length; i++) {
    const m = col[i];
    if (isPinned(engine, m)) continue;
    if (i === 0) {
      // Leader: the next waypoint two steps down the field once the column
      // has closed up; his current waypoint until then.
      const walking = m.task?.type === 'moveTo' && !at(m, { c: m.task.x, r: m.task.y });
      if (suspended) { setTask(m, null); continue; }
      if (walking || (!closed && !plugged)) continue;
      let wp: Coord = m.pos;
      for (let s = 0; s < 2; s++) { const n = downhill(board, field, wp); if (!n) break; wp = n; }
      if (at(m, wp)) continue;
      setTask(m, { type: 'moveTo', x: wp.c, y: wp.r, then: m instanceof HeavyFlamerMarine ? 'hold' : 'overwatch' });
      continue;
    }
    const pred = col[i - 1];
    const rear = i === col.length - 1 && col.length > 1;
    const gap = chebyshev(m.pos, pred.pos);
    if (rear && gap <= 2) {
      // Rear guard: stand on overwatch facing back until the column pulls away.
      setTask(m, postTask(m, m.pos, backFacing(field, m, pred.pos)));
      continue;
    }
    // Followers walk to their predecessor's square (a held square completes
    // on adjacency). Adjacent already, the task still names his current
    // square, so a stale target never walks the follower backward.
    const follow: MarineOrder = { type: 'moveTo', x: pred.pos.c, y: pred.pos.r, then: m instanceof HeavyFlamerMarine ? 'hold' : 'overwatch' };
    if (gap <= 1 && (m.task?.type !== 'moveTo' || (m.task.x === pred.pos.c && m.task.y === pred.pos.r))) continue;
    setTask(m, follow);
  }
}

// ----------------------------------------------------------------- clear --

export interface ClearPlan { covers: { id: string; c: Coord; facing: Dir }[]; opener: string | undefined; flamer: { id: string; c: Coord; facing: Dir } | undefined; near: Coord; far: Coord }

/**
 * The clear plan for a door: the near flank is the side nearer the squad;
 * the lane is what lies beyond the far flank. The marine nearest the near
 * flank is the opener (any type: a column in a one-wide corridor cannot
 * swap its head, and the flamer at the head of a column is exactly who
 * wants that door open); up to two bolters among the rest take posts on
 * the near side with a line of fire through the door edge; the heavy
 * flamer, when not the opener, waits one square behind the opener facing
 * the door if a path exists past his squad-mates, else where he stands. Covers required:
 * min(2, bolters left, posts that see anything), so a two-man squad still
 * clears.
 */
export function planClear(engine: GameEngine, members: Piece[], x: number, y: number, facing: number): ClearPlan | undefined {
  const board = engine.state.board;
  const door = board.doorsAt({ c: x, r: y }).find(d => d.facing === facing);
  if (!door) return undefined;
  const a = { c: door.square.x, r: door.square.y };
  const b = door.otherSide();
  const field = distanceField(board, members.map(m => m.pos));
  const [near, far] = (field.get(key(a)) ?? Infinity) <= (field.get(key(b)) ?? Infinity) ? [a, b] : [b, a];
  const lane = new Map<string, Square>();
  for (const k of walk(board, [far], TUNING.laneDepth, new Set([key(near)])).keys()) {
    const [c, r] = k.split(',').map(Number);
    lane.set(k, board.get(c, r)!);
  }
  // Cover posts stand close behind and beside the door: a lane that loops
  // back to meet the near side (space_hulk_1's side passage) would otherwise
  // post a cover a nine-square detour away, on the far side of the loop,
  // and split the squad (the stage 4 instrument's finding).
  const nearSide = walk(board, [near], COVER_RADIUS, new Set([key(far)]));
  const squares = [...nearSide.keys()].filter(k => k !== key(near))
    .map(k => { const [c, r] = k.split(',').map(Number); return { c, r }; })
    .filter(c => standable(board, c, members));
  const doorKey = new Set([`${door.square.x},${door.square.y},${door.facing}`]);
  const cover = new Map<string, Set<string>>();
  withDoorsOpen(board, doorKey, () => {
    for (const c of squares) for (const f of DIRS) cover.set(`${key(c)}|${f}`, coverFrom(board, c, f, lane));
  });
  const feasible = [...cover.values()].filter(s => s.size > 0).length;
  const toNear = walk(board, [near], 400);
  const byDist = (list: Piece[]) => [...list].sort((p, q) => (toNear.get(key(p.pos)) ?? Infinity) - (toNear.get(key(q.pos)) ?? Infinity));
  const usable = byDist(members.filter(m => !isPinned(engine, m)));
  const opener = usable[0]?.id;
  const nonFlamers = usable.filter(m => m.id !== opener && !(m instanceof HeavyFlamerMarine));
  const flamers = usable.filter(m => m.id !== opener && m instanceof HeavyFlamerMarine);
  const needed = Math.min(2, nonFlamers.length, feasible);
  const covers: ClearPlan['covers'] = [];
  const uncovered = new Set(lane.keys());
  const taken = new Set<string>();
  const pool = [...nonFlamers];
  for (let n = 0; n < needed; n++) {
    let best: { m: Piece; c: Coord; f: Dir; score: number; d: number } | undefined;
    for (const m of pool) {
      const dist = walk(board, [m.pos], 200);
      for (const c of squares) {
        if (taken.has(key(c))) continue;
        const d = dist.get(key(c)) ?? Infinity;
        for (const f of DIRS) {
          let score = 0;
          for (const k of cover.get(`${key(c)}|${f}`)!) if (uncovered.has(k)) score += 1;
          if (score === 0) continue;
          if (m.task?.type === 'moveTo' && m.task.x === c.c && m.task.y === c.r && m.task.facing === f) score += 1;
          if (!best || score > best.score || (score === best.score && d < best.d)) best = { m, c, f, score, d };
        }
      }
    }
    if (!best) break;
    for (const k of cover.get(`${key(best.c)}|${best.f}`)!) uncovered.delete(k);
    taken.add(key(best.c));
    covers.push({ id: best.m.id, c: best.c, facing: best.f });
    pool.splice(pool.indexOf(best.m), 1);
  }
  let flamer: ClearPlan['flamer'];
  const f0 = flamers[0];
  if (f0) {
    // One square behind the opener: straight back from the door if he can
    // stand there, else the nearest square beside the near flank.
    // Reachable: a path to the square or to a square beside it (a
    // squad-mate standing on it is about to move to his own post).
    const reachable = (c: Coord) => chebyshev(c, f0.pos) <= 1
      || pathStep(board, f0.pos, q => chebyshev(q, c) <= 1) !== undefined;
    const behind = { c: near.c + (near.c - far.c), r: near.r + (near.r - far.r) };
    const back = squares.filter(c => nearSide.get(key(c)) === 1 && !taken.has(key(c)) && reachable(c));
    const dist = walk(board, [f0.pos], 200);
    const c = back.find(q => q.c === behind.c && q.r === behind.r)
      ?? back.sort((p, q) => (dist.get(key(p)) ?? Infinity) - (dist.get(key(q)) ?? Infinity))[0];
    if (c) flamer = { id: f0.id, c, facing: facingToward(c, near) };
  }
  return { covers, opener, flamer, near, far };
}

function runClear(engine: GameEngine, st: SquadState, members: Piece[], order: Extract<SquadOrder, { type: 'clear' }>): void {
  const board = engine.state.board;
  const door = board.doorsAt({ c: order.x, r: order.y }).find(d => d.facing === order.facing);
  if (!door || door.isOpen) { completeSquadOrder(engine, st, members); return; }
  const openTask: MarineOrder = { type: 'openDoor', x: order.x, y: order.y, facing: order.facing };
  if (!st.coordinated) {
    const field = distanceField(board, [{ c: door.square.x, r: door.square.y }]);
    const nearest = [...members].filter(m => !isPinned(engine, m))
      .sort((p, q) => (field.get(key(p.pos)) ?? Infinity) - (field.get(key(q.pos)) ?? Infinity))[0];
    for (const m of members) setTask(m, m === nearest ? openTask : null);
    return;
  }
  const plan = planClear(engine, members, order.x, order.y, order.facing);
  if (!plan) { completeSquadOrder(engine, st, members); return; }
  if (st.coverIssuedTick < 0) st.coverIssuedTick = engine.tickCount;
  const posted = plan.covers.every(cv => {
    const m = members.find(x => x.id === cv.id)!;
    return m.pos.c === cv.c.c && m.pos.r === cv.c.r && m instanceof StormBolterMarine && m.overwatch;
  });
  const go = posted || engine.tickCount - st.coverIssuedTick >= TUNING.clearTimeoutTicks;
  for (const m of members) {
    if (isPinned(engine, m)) continue;
    const cv = plan.covers.find(x => x.id === m.id);
    if (cv) { setTask(m, postTask(m, cv.c, cv.facing)); continue; }
    if (m.id === plan.opener) {
      setTask(m, go ? openTask : { type: 'moveTo', x: plan.near.c, y: plan.near.r, then: 'hold', facing: facingToward(plan.near, plan.far) });
      continue;
    }
    if (plan.flamer && m.id === plan.flamer.id) { setTask(m, postTask(m, plan.flamer.c, plan.flamer.facing)); continue; }
    setTask(m, null);
  }
}

// -------------------------------------------------------------- the tick --

/** Clear every member's task and the squad slot; tell the client. */
export function completeSquadOrder(engine: GameEngine, st: SquadState, members: Piece[]): void {
  for (const m of members) setTask(m, null);
  st.order = null;
  st.planKey = '';
  st.coverIssuedTick = -1;
  st.contactDist = Infinity;
  st.contactTick = -Infinity;
  st.started = false;
  st.column = [];
  PieceEvents.emit('squadOrderChanged', { squad: st.squad, order: null, coordinated: st.coordinated, dueTick: engine.tickCount });
}

/** Tick step 3 (before the marine AI): every squad with a due order plans.
 *  The first plan of an order clears the members' player orders (the squad
 *  command supersedes what was given before it, at the moment it takes
 *  effect: the advisor's "deaf marine" case). */
export function squadTick(engine: GameEngine): void {
  for (const st of engine.squads.values()) {
    if (!st.order || engine.tickCount < st.dueTick) continue;
    const members = squadMembers(engine, st.squad);
    if (members.length === 0) { completeSquadOrder(engine, st, members); continue; }
    if (!st.started) {
      st.started = true;
      for (const m of members) if (m.order && !isPinned(engine, m)) setOrder(m, null);
    }
    const order = st.order;
    if (order.type === 'defend') runDefend(engine, st, members, order);
    else if (order.type === 'advance') runAdvance(engine, st, members, order);
    else runClear(engine, st, members, order);
  }
}
