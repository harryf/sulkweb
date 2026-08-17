import { Board } from '../board/Board.js';
import { Piece, type Coord } from '../pieces/Piece.js';
import { StormBolterMarine } from '../pieces/StormBolterMarine.js';
import { visibleSquares, canShoot, type Viewer } from '../board/vision.js';
import { chebyshev } from '../core/Direction.js';

/**
 * HIVE LAYER — side-level planning for the stealer AI (AI1).
 *
 * AI0 was stateless per-piece greed: every piece BFS-beelined to the nearest
 * marine, straight through overwatch kill zones. The hive layer plans the turn
 * for the whole side: a threat map of watched/killable squares, threat-weighted
 * pathing around them, staging (mass out of sight, then strike in waves timed
 * against the reinforcement rate), straggler hunts, sacrifice blockers that
 * park in a fire lane so their body shuts the corridor behind them (pieces
 * block LOS), and door-shutting to go dark while massing.
 *
 * INVARIANT: the hive consumes NO dice. Unit tests script exact RollQueues;
 * any planning draw would re-baseline every scripted test. Tactic variety
 * comes from turn-number rotation, never from board.dice.
 */

/** Per-turn info the engine passes down (all optional — direct test calls omit them). */
export interface HiveContext {
  turnNumber?: number;
  /** Reinforcement blips still in the mission budget; undefined = uncapped. */
  blipsRemaining?: number;
  /** Squares the marines are trying to reach (objective points, exits, the
   *  data room, blockade entries). The hive doesn't know the win RULES — just
   *  where the marines want to go — and grows reckless as they get close. */
  objectives?: Coord[];
}

export type HiveRole = 'assault' | 'stage' | 'block' | 'hold';

export interface HivePlan {
  roles: Map<string, HiveRole>;
  /** Staging destination per stage-role piece. */
  stagingTarget: Map<string, Coord>;
  /** Straggler a hunting piece is assigned to (overrides normal goals). */
  huntTarget: Map<string, Coord>;
  /** Wave is live this turn — everyone staged goes in. */
  launched: boolean;
  /** Pieces that have sat doing nothing too long — hunger wins: they attack,
   *  and a frustrated blip may convert to break a deadlock (e.g. a queue
   *  head refusing an exposure door with the marines far away). */
  frustrated: Set<string>;
}

/** Squares marines threaten. `kill` = inside an un-jammed overwatcher's fire
 *  arc + LOS + range (stepping there eats reaction fire); `seen` = in any
 *  marine's vision (blips flip there; stealers are shot on the marine turn). */
export interface ThreatMap {
  kill: Set<string>;
  seen: Set<string>;
}

const key = (c: Coord) => `${c.c},${c.r}`;

/** Cost of entering an overwatched square vs. detouring around it. */
const KILL_PENALTY = 6;
/** Cost of entering a merely-seen square. */
const SEEN_PENALTY = 2;
/** Staging ring: hold unseen squares this close to the squad, no closer than 2. */
const STAGE_MAX = 8;
/** Turns of STALLED buildup (no force growth) before attacking anyway — a
 *  growing wave keeps massing; a stalled one is never left too long. */
const PATIENCE = 3;
/** A marine this far (chebyshev) from his nearest squad-mate is a straggler. */
const STRAGGLER_GAP = 4;
/** Graph distance within which pieces join a straggler hunt. */
const HUNT_RANGE = 8;
/** Hidden squares this close to a marine objective are worth camping — the
 *  buildup blocks the destination even before the marines get near it. */
const OBJ_RING = 6;
/** Marines this close to their objective end the massing game: all-in. */
const RECKLESS_DIST = 4;
/** Rough marine advance per turn (4 AP, some spent on doors/turns) — converts
 *  objective distance into "turns left" for wave budgeting. */
const MARINE_SPEED = 3;
/** A piece that has not moved for this many plans attacks — hunger wins. */
const IDLE_CAP = 3;
/** Absolute massing cap: growth resets patience, but never past this. Under
 *  uncapped reinforcements the force otherwise "grows" every turn forever. */
const HARD_PATIENCE = 6;

/** Persistent hive memory per board (wave patience, current blocker). */
interface HiveState {
  stagingTurns: number;
  /** Ready force seen by the previous plan — growth resets the patience clock. */
  lastForce: number;
  /** Total turns spent massing since the last launch (never reset by growth). */
  massingTurns: number;
  blockerId?: string;
  /** Where each piece stood at the previous plan, and how long it has idled. */
  lastPos: Map<string, Coord>;
  idle: Map<string, number>;
}
const hiveStates = new WeakMap<Board, HiveState>();

function hiveState(board: Board): HiveState {
  let s = hiveStates.get(board);
  if (!s) {
    s = { stagingTurns: 0, lastForce: 0, massingTurns: 0, lastPos: new Map(), idle: new Map() };
    hiveStates.set(board, s);
  }
  return s;
}

function marines(board: Board): Piece[] {
  return board.pieces.filter((p): p is Piece => (p as Piece).kind === 'marine');
}

/** Recompute what the marines watch and what they can kill RIGHT NOW.
 *  Recomputed per piece activation: a parked blocker or a died watcher
 *  changes the map mid-phase (pieces block LOS — that is the whole point
 *  of the sacrifice blocker). */
export function computeThreat(board: Board): ThreatMap {
  const seen = new Set<string>();
  const kill = new Set<string>();
  for (const p of board.pieces) {
    const m = p as Piece;
    if (m.kind !== 'marine' || !m.alive) continue;
    for (const sq of visibleSquares(board, m as Viewer)) seen.add(`${sq.x},${sq.y}`);
    if (m instanceof StormBolterMarine && m.overwatch && !m.jammed) {
      for (const sq of board.allSquares()) {
        if (canShoot(board, m as Viewer, sq, StormBolterMarine.OVERWATCH_RANGE)) {
          kill.add(`${sq.x},${sq.y}`);
        }
      }
    }
  }
  return { seen, kill };
}

export interface PathOpts {
  /** Squares that may never be entered (hard block). */
  avoid?: Set<string>;
  /** Extra cost for entering a square (threat weighting). */
  penalty?: (k: string) => number;
}

/**
 * Dijkstra over the board graph (8-connected), same traversal rules as the old
 * BFS: closed door EDGES are pathed through (opened on contact), friendly
 * pieces are transparent (the horde queues through chokepoints), marines are
 * solid, corner-cut diagonals a mover would refuse are pruned. With no
 * penalties this degenerates to the old shortest path (ties resolve in the
 * same neighbor order). Returns the first step and total cost, or undefined.
 */
export function pathStep(
  board: Board,
  from: Coord,
  isGoal: (c: Coord) => boolean,
  opts: PathOpts = {},
): { step: Coord; cost: number } | undefined {
  const marineAt = (c: Coord) => (board.pieceAt(c) as Piece | undefined)?.kind === 'marine';
  const dist = new Map<string, number>();
  const prev = new Map<string, Coord | null>();
  const open: { c: Coord; d: number; seq: number }[] = [];
  let seq = 0;
  dist.set(key(from), 0);
  prev.set(key(from), null);
  open.push({ c: from, d: 0, seq: seq++ });

  while (open.length > 0) {
    // extract-min; FIFO on ties keeps BFS-identical order for penalty-free runs
    let best = 0;
    for (let i = 1; i < open.length; i++) {
      if (open[i].d < open[best].d || (open[i].d === open[best].d && open[i].seq < open[best].seq)) best = i;
    }
    const { c: cur, d } = open.splice(best, 1)[0];
    if (d > (dist.get(key(cur)) ?? Infinity)) continue;

    if (isGoal(cur) && !(cur.c === from.c && cur.r === from.r)) {
      let step = cur;
      for (;;) {
        const back = prev.get(key(step));
        if (back === null || back === undefined) return { step, cost: d };
        if (back.c === from.c && back.r === from.r) return { step, cost: d };
        step = back;
      }
    }
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        if (dc === 0 && dr === 0) continue;
        const nxt = { c: cur.c + dc, r: cur.r + dr };
        const nk = key(nxt);
        if (!board.isPassable(nxt) || marineAt(nxt)) continue;
        if (opts.avoid?.has(nk)) continue;
        if (dc !== 0 && dr !== 0 && board.diagonalBlockedByDoor(cur, nxt)) continue;
        const nd = d + 1 + (opts.penalty?.(nk) ?? 0);
        if (nd >= (dist.get(nk) ?? Infinity)) continue;
        dist.set(nk, nd);
        prev.set(nk, cur);
        open.push({ c: nxt, d: nd, seq: seq++ });
      }
    }
  }
  return undefined;
}

/** Full least-cost distance map from `from` under the same traversal rules as
 *  pathStep — used to score staging targets by REAL approach cost (chebyshev
 *  lies whenever the route curls around rock). */
export function reachDistances(board: Board, from: Coord, opts: PathOpts = {}): Map<string, number> {
  const marineAt = (c: Coord) => (board.pieceAt(c) as Piece | undefined)?.kind === 'marine';
  const dist = new Map<string, number>();
  const open: { c: Coord; d: number; seq: number }[] = [];
  let seq = 0;
  dist.set(key(from), 0);
  open.push({ c: from, d: 0, seq: seq++ });
  while (open.length > 0) {
    let best = 0;
    for (let i = 1; i < open.length; i++) {
      if (open[i].d < open[best].d || (open[i].d === open[best].d && open[i].seq < open[best].seq)) best = i;
    }
    const { c: cur, d } = open.splice(best, 1)[0];
    if (d > (dist.get(key(cur)) ?? Infinity)) continue;
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        if (dc === 0 && dr === 0) continue;
        const nxt = { c: cur.c + dc, r: cur.r + dr };
        const nk = key(nxt);
        if (!board.isPassable(nxt) || marineAt(nxt)) continue;
        if (opts.avoid?.has(nk)) continue;
        if (dc !== 0 && dr !== 0 && board.diagonalBlockedByDoor(cur, nxt)) continue;
        const nd = d + 1 + (opts.penalty?.(nk) ?? 0);
        if (nd >= (dist.get(nk) ?? Infinity)) continue;
        dist.set(nk, nd);
        open.push({ c: nxt, d: nd, seq: seq++ });
      }
    }
  }
  return dist;
}

/** Threat penalty for a stealer: pay to cross fire lanes, a little to be seen. */
export function threatPenalty(threat: ThreatMap): (k: string) => number {
  return k => (threat.kill.has(k) ? KILL_PENALTY : 0) + (threat.seen.has(k) ? SEEN_PENALTY : 0);
}

/** Plain multi-source BFS distance to the nearest marine (pieces transparent,
 *  door edges traversable) — the "how close is this square to the fight" field. */
export function marineDistanceField(board: Board): Map<string, number> {
  return distanceField(board, marines(board).map(m => m.pos));
}

/** Multi-source BFS distance over the board graph (pieces transparent, door
 *  edges traversable) from any set of source squares. */
export function distanceField(board: Board, sources: Coord[]): Map<string, number> {
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
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        if (dc === 0 && dr === 0) continue;
        const nxt = { c: cur.c + dc, r: cur.r + dr };
        if (!board.isPassable(nxt) || dist.has(key(nxt))) continue;
        if (dc !== 0 && dr !== 0 && board.diagonalBlockedByDoor(cur, nxt)) continue;
        dist.set(key(nxt), d + 1);
        queue.push(nxt);
      }
    }
  }
  return dist;
}

/** Marines separated from every squad-mate by ≥ STRAGGLER_GAP (never the whole squad). */
export function findStragglers(board: Board): Piece[] {
  const squad = marines(board);
  if (squad.length < 2) return [];
  return squad.filter(m =>
    squad.every(o => o === m || chebyshev(o.pos, m.pos) >= STRAGGLER_GAP));
}

/** Octant of `c` around `origin` (0..7) — buckets staging areas into approach
 *  directions so the buildup spreads and marines must cover several of them. */
function octant(origin: Coord, c: Coord): number {
  const angle = Math.atan2(c.r - origin.r, c.c - origin.c);
  return ((Math.floor((angle + Math.PI) / (Math.PI / 4))) + 8) % 8;
}

/**
 * Plan the stealer turn. Roles:
 * - `assault`: charge (threat-weighted path) and fight. Everyone when the wave
 *   is live, when nothing threatens, when exposed anyway, or when hunting.
 * - `stage`: advance to an unseen, unwatched square near the squad and hold.
 * - `block`: walk the raw shortest path into the fire lane and PARK on the
 *   first watched square survived — the body blocks LOS for the mass behind.
 * - `hold`: the parked blocker keeps holding (no action, no overwatch trigger).
 */
export function planHive(board: Board, threat: ThreatMap, ctx: HiveContext = {}): HivePlan {
  const state = hiveState(board);
  const squad = marines(board);
  const pieces = board.pieces.filter(
    (p): p is Piece => (p as Piece).kind !== 'marine' && (p as Piece).alive);
  const roles = new Map<string, HiveRole>();
  const stagingTarget = new Map<string, Coord>();
  const huntTarget = new Map<string, Coord>();

  const distField = marineDistanceField(board);
  const noThreat = threat.kill.size === 0;

  // Idle bookkeeping: hunger is the default — a piece that has sat still for
  // IDLE_CAP plans stops being clever and attacks (a frustrated blip may also
  // convert to unjam a deadlocked queue; the executor handles that).
  const frustrated = new Set<string>();
  for (const p of pieces) {
    const last = state.lastPos.get(p.id);
    const idled = last !== undefined && last.c === p.pos.c && last.r === p.pos.r;
    const n = idled ? (state.idle.get(p.id) ?? 0) + 1 : 0;
    state.idle.set(p.id, n);
    if (n >= IDLE_CAP) frustrated.add(p.id);
  }
  state.lastPos = new Map(pieces.map(p => [p.id, { ...p.pos }]));

  // Objective awareness: the hive knows WHERE the marines are heading (not the
  // win rules). objField measures every square's distance to that destination;
  // the closest marine's value is the mission clock.
  const objField = ctx.objectives?.length ? distanceField(board, ctx.objectives) : undefined;
  const marineObjDist = objField && squad.length
    ? Math.min(...squad.map(m => objField.get(key(m.pos)) ?? 99))
    : undefined;
  const turnsLeft = marineObjDist !== undefined
    ? Math.max(1, Math.ceil(marineObjDist / MARINE_SPEED))
    : undefined;

  // A piece is "staged" when it sits hidden inside the strike ring around the
  // marines OR camps the ring around their destination (blocking force).
  const isStaged = (p: Piece) => {
    const k = key(p.pos);
    if (threat.seen.has(k) || threat.kill.has(k)) return false;
    const d = distField.get(k);
    if (d !== undefined && d <= STAGE_MAX) return true;
    return objField !== undefined && (objField.get(k) ?? 99) <= OBJ_RING;
  };
  // Blips hide 1-3 stealers (bag expectation ≈ 2) — they weigh double in the wave.
  const force = (p: Piece) => (p.kind === 'blip' ? 2 : 1);
  const readyForce = pieces.filter(isStaged).reduce((s, p) => s + force(p), 0);

  // Wave sizing: enough mass to swamp the squad, capped so a wave is never
  // hoarded; with the blip budget dry there is nothing to wait for. The
  // patience clock ticks only while the buildup is STALLED — as long as
  // reinforcements keep the wave growing, keep massing — but growth never
  // buys more than HARD_PATIENCE turns (uncapped reinforcements "grow" every
  // turn forever), and the mission clock overrides everything: the number of
  // waves the hive can still launch is turnsLeft — when that reads one or two,
  // "enough" is whatever it has. Sometimes the stealers just try their luck.
  const threshold = Math.max(3, Math.min(2 * squad.length, 8));
  const effThreshold = turnsLeft !== undefined
    ? Math.min(threshold, Math.max(2, turnsLeft))
    : threshold;
  const budgetDry = ctx.blipsRemaining !== undefined && ctx.blipsRemaining <= 0;
  const reckless = marineObjDist !== undefined && marineObjDist <= RECKLESS_DIST;
  if (readyForce > state.lastForce && (turnsLeft === undefined || turnsLeft > 3)) {
    state.stagingTurns = 0;
  }
  state.lastForce = readyForce;
  const launched =
    noThreat ||
    reckless ||
    readyForce >= effThreshold ||
    state.stagingTurns >= PATIENCE ||
    state.massingTurns >= HARD_PATIENCE ||
    (budgetDry && readyForce >= squad.length);
  state.stagingTurns = launched ? 0 : state.stagingTurns + 1;
  state.massingTurns = launched ? 0 : state.massingTurns + 1;

  // Straggler hunts fire regardless of wave state: ≥2 pieces in graph range
  // gang up on an isolated marine (his squad-mates cannot cover him).
  const hunters = new Set<string>();
  for (const straggler of findStragglers(board)) {
    const inRange = pieces.filter(p =>
      !hunters.has(p.id) && chebyshev(p.pos, straggler.pos) <= HUNT_RANGE);
    if (inRange.length < 2) continue;
    inRange.sort((a, b) => chebyshev(a.pos, straggler.pos) - chebyshev(b.pos, straggler.pos));
    for (const h of inRange.slice(0, 3)) {
      hunters.add(h.id);
      huntTarget.set(h.id, { ...straggler.pos });
      roles.set(h.id, 'assault');
    }
  }

  if (launched) {
    for (const p of pieces) if (!roles.has(p.id)) roles.set(p.id, 'assault');
    state.blockerId = undefined;
    return { roles, stagingTarget, huntTarget, launched, frustrated };
  }

  // Staging candidates: hidden, unwatched squares in the strike ring, bucketed
  // by approach octant around the squad centroid. Spreading pieces across up
  // to three octants (rotated by turn for variety) forces the marines to
  // cover several directions at once — blips massing on a flank ARE the decoy.
  const centroid = squad.length
    ? {
        c: Math.round(squad.reduce((s, m) => s + m.pos.c, 0) / squad.length),
        r: Math.round(squad.reduce((s, m) => s + m.pos.r, 0) / squad.length),
      }
    : { c: 0, r: 0 };
  const candidates: Coord[] = [];
  for (const sq of board.allSquares()) {
    const c = { c: sq.x, r: sq.y };
    const k = key(c);
    const d = distField.get(k);
    const nearSquad = d !== undefined && d >= 2 && d <= STAGE_MAX;
    // The destination ring: hidden squares near where the marines WANT to go
    // are worth holding long before they arrive — the buildup becomes the
    // roadblock (never closer than 2 to a marine already standing there).
    const nearObjective = objField !== undefined
      && (objField.get(k) ?? 99) <= OBJ_RING
      && (d === undefined || d >= 2);
    if (!nearSquad && !nearObjective) continue;
    if (threat.seen.has(k) || threat.kill.has(k)) continue;
    if (!board.isPassable(c)) continue;
    candidates.push(c);
  }
  const byOctant = new Map<number, Coord[]>();
  for (const c of candidates) {
    const o = octant(centroid, c);
    if (!byOctant.has(o)) byOctant.set(o, []);
    byOctant.get(o)!.push(c);
  }
  // Pick up to three approach vectors that are genuinely SEPARATED (≥2 octant
  // steps apart on the circle) — adjacent octants are the same corridor and
  // would collapse the buildup into one fat column. Rank by candidate count.
  const ranked = [...byOctant.keys()].sort((a, b) =>
    byOctant.get(b)!.length - byOctant.get(a)!.length || a - b);
  const circular = (a: number, b: number) => Math.min(Math.abs(a - b), 8 - Math.abs(a - b));
  const spread: number[] = [];
  for (const o of ranked) {
    if (spread.length >= 3) break;
    if (spread.every(s => circular(s, o) >= 2)) spread.push(o);
  }
  if (spread.length === 0 && ranked.length > 0) spread.push(ranked[0]);

  // A parked blocker from an earlier turn keeps holding while its lane is
  // still worth shutting (it stands watched/seen — its body IS the shield).
  let blockerPicked = false;
  const existingBlocker = state.blockerId
    ? pieces.find(p => p.id === state.blockerId)
    : undefined;
  if (existingBlocker && (threat.kill.has(key(existingBlocker.pos)) || threat.seen.has(key(existingBlocker.pos)))) {
    roles.set(existingBlocker.id, 'hold');
    blockerPicked = true;
  } else {
    state.blockerId = undefined;
  }

  const stuck: Piece[] = [];
  // Pieces take their NEAREST approach vector, but each vector has a quota so
  // the buildup genuinely splits instead of collapsing into one column. The
  // turn number rotates which vector wins ties, varying the pressure point.
  const turn = ctx.turnNumber ?? 0;
  const cap = Math.max(1, Math.ceil(pieces.length / Math.max(1, spread.length)));
  const vectorLoad = new Map<number, number>();
  for (const p of pieces) {
    if (roles.has(p.id)) continue;
    const k = key(p.pos);

    // Never loiter in a fire lane or in sight — if exposed, fight.
    if (threat.kill.has(k) || threat.seen.has(k)) {
      roles.set(p.id, 'assault');
      continue;
    }
    // Hunger override: a piece that has done nothing for IDLE_CAP plans stops
    // waiting for the perfect moment and attacks.
    if (frustrated.has(p.id)) {
      roles.set(p.id, 'assault');
      continue;
    }
    // Already in the ring and hidden: hold position (build the wave), unless a
    // useful door wants shutting — the executor handles that on 'stage'.
    const avoid = p.kind === 'blip'
      ? new Set([...threat.kill, ...threat.seen])
      : threat.kill;
    if (isStaged(p)) {
      roles.set(p.id, 'stage');
      stagingTarget.set(p.id, { ...p.pos });
      continue;
    }
    // Try to reach a staging square without entering a fire lane, scored by
    // REAL approach cost (a full safe-reachability map from this piece).
    const reach = spread.length > 0 ? reachDistances(board, p.pos, { avoid }) : undefined;
    let target: Coord | undefined;
    let targetVector: number | undefined;
    let bestScore = Infinity;
    for (let i = 0; i < spread.length; i++) {
      const o = spread[(i + turn) % spread.length]; // rotation breaks score ties per turn
      if ((vectorLoad.get(o) ?? 0) >= cap) continue;
      for (const c of byOctant.get(o)!) {
        const approach = reach!.get(key(c));
        if (approach === undefined) continue; // no fire-lane-free route to it
        // Proximity to the fight OR to the marines' destination — whichever is
        // nearer. Objective-ring squares score well even with the squad far.
        const proximity = Math.min(
          distField.get(key(c)) ?? 99,
          objField ? (objField.get(key(c)) ?? 99) : 99);
        const score = approach + 2 * proximity;
        if (score < bestScore) {
          bestScore = score;
          target = c;
          targetVector = o;
        }
      }
    }
    const canStage = target !== undefined;
    if (canStage) {
      roles.set(p.id, 'stage');
      stagingTarget.set(p.id, target!);
      if (targetVector !== undefined) vectorLoad.set(targetVector, (vectorLoad.get(targetVector) ?? 0) + 1);
      continue;
    }
    // Hidden but sealed off — every route to the ring crosses a fire lane.
    // Defer: a cohort of these earns a sacrifice blocker below.
    stuck.push(p);
  }

  // The blocker: a stuck cohort (blocker + ≥2 followers) spends ONE stealer to
  // soak the reaction bursts (each one a 1-in-6 jam roll — sacrifice as probe)
  // and park in the fire lane; its body blocks the sight line, the followers
  // hold hidden this turn and stage across behind it from the next activation
  // on. Too few to exploit a shield — or a blocker already parked — and the
  // stuck pieces simply assault: hiding while watched paths exist would stall
  // the horde forever (the patience cap launches the wave regardless).
  const blocker = !blockerPicked && threat.kill.size > 0 && stuck.length >= 3
    ? stuck.find(p => p.kind === 'stealer')
    : undefined;
  // While a shield is up (fresh or already parked), the rest of the cohort
  // advances to the DARKEST reachable square nearest the fight and holds —
  // the column builds up behind the blocker instead of charging past it.
  const dark: Coord[] = [];
  if (blocker || blockerPicked) {
    for (const sq of board.allSquares()) {
      const c = { c: sq.x, r: sq.y };
      const k = key(c);
      if (threat.seen.has(k) || threat.kill.has(k)) continue;
      if (distField.get(k) === undefined || !board.isPassable(c)) continue;
      dark.push(c);
    }
  }
  for (const p of stuck) {
    if (p === blocker) {
      roles.set(p.id, 'block');
      state.blockerId = p.id;
    } else if (blocker || blockerPicked) {
      const target = dark.reduce((best, c) =>
        !best || 2 * (distField.get(key(c)) ?? 99) + chebyshev(p.pos, c)
          < 2 * (distField.get(key(best)) ?? 99) + chebyshev(p.pos, best) ? c : best,
        undefined as Coord | undefined);
      roles.set(p.id, 'stage');
      stagingTarget.set(p.id, target ? { ...target } : { ...p.pos });
    } else {
      roles.set(p.id, 'assault');
    }
  }

  return { roles, stagingTarget, huntTarget, launched, frustrated };
}
