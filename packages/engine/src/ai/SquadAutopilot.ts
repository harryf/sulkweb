import type { GameEngine } from '../GameEngine.js';
import type { Board } from '../board/Board.js';
import type { Square } from '../board/Square.js';
import type { Piece, Coord } from '../pieces/Piece.js';
import type { SquadOrder, MarineOrder } from '../core/Commands.js';
import type { Door } from '../rules/Door.js';
import { SergeantMarine } from '../pieces/StormBolterMarine.js';
import { HeavyFlamerMarine } from '../pieces/HeavyFlamerMarine.js';
import { chebyshev, facingToward } from '../core/Direction.js';
import { inFireArc } from '../board/vision.js';
import { hasLineOfSight } from '../board/los.js';
import { distanceField } from './hive.js';
import { resolveObjective, objectiveTarget } from './objective.js';
import { TUNING } from '../core/CostTables.js';
import { nearestThreatInSight } from './MarineAI.js';
import { chooseStep } from './orders.js';
import { squadMembers, walk, flameJobPending, postsReached } from './squad.js';

/**
 * The squad-order issuer (2.x stage 4, the balance instrument). It gives
 * each squad the order a sensible player would give, one per change of
 * state, and lets the stage 3 planners (ai/squad.ts) do the rest:
 *
 *  - first call: defend the section the squad stands in;
 *  - nothing in sight within TUNING.contactRange of any member for
 *    AUTOPILOT.quietTicks and a mission target ahead: advance toward it.
 *    The first such advance in the game is the mission order (stage 4
 *    step 4): one `missionOrder { objective }` from the squad that passed
 *    the gate, fanned out by the engine to every squad (a blockade on
 *    kill-quota, an advance to the threshold, the Data Room or the nearest
 *    exit elsewhere, a defend on defend missions), so the bot plays the
 *    order the player has. Every later re-issue is that squad's own
 *    `squadOrder { objective }`: a mission order is one change of the
 *    mission's state and gets one issuer (the systems pass's finding), and
 *    a squad whose live order another squad's fan-out changed adopts it;
 *  - a threat in sight within contact range while advancing: nothing; the
 *    advance planner already holds the leader while it closes in, and a
 *    defend issued on contact would march the squad off overwatch to new
 *    posts under fire (the systems pass's "fixes that fail" loop);
 *  - the advancing leader's next step crosses a closed door edge: clear
 *    that door (at most AUTOPILOT.clearsPerDoor times per door), then
 *    advance again once the clear completes;
 *  - the advance completes: defend the target's section; on a flame
 *    mission the target is the threshold (the last square outside the
 *    objective's section on the way, so the squad never walks into the room
 *    it means to burn) and the squad holds there, no defend, while the
 *    flamer has a shot pending (a defend post in the doorway would stand in
 *    his line and in the fire);
 *  - the leader has made no progress for AUTOPILOT.stallTicks while
 *    nothing is in contact range: re-issue the advance (a re-plan), so a bot
 *    deadlock never reads as a loss; a contact hold is a pause, not a stall.
 *
 * The issuer never races the relay: while an order is issued but not yet
 * due it stays silent, so a squad without a sergeant gets the same one
 * order per state change, eight ticks later. Its constants live here, not
 * in TUNING: they are the bot's policy, not the game's rules, and the scan
 * compares tunings against a fixed policy.
 */
export const AUTOPILOT = {
  /** Ticks with nothing in contact range before a defending squad advances. */
  quietTicks: 16,
  /** Ticks without the leader closing on the target before the advance is re-issued. */
  stallTicks: 48,
  /** Clears issued on one door before the column just walks through it. */
  clearsPerDoor: 2,
  /** Walk distance within which the flamer leaves the column for a firing square. */
  flamerReach: 8,
  /** Ticks a defend may stay short of its posts before the issuer moves on anyway. */
  postWaitTicks: 80,
};

type Phase = 'defend' | 'advance' | 'clear' | 'blockade';

interface IssuerState {
  phase: Phase;
  started: boolean;
  lastContactTick: number;
  /** Key of the target the live advance was issued for. */
  targetKey: string | null;
  /** Key of the target an advance already completed for. */
  doneKey: string | null;
  clears: Map<string, number>;
  leaderDist: number;
  progressTick: number;
}

const key = (c: { c: number; r: number }) => `${c.c},${c.r}`;
const states = new WeakMap<GameEngine, Map<string, IssuerState>>();
/** Engines whose one mission order has gone out. */
const missionIssued = new WeakSet<GameEngine>();

function stateOf(engine: GameEngine, squad: string): IssuerState {
  let map = states.get(engine);
  if (!map) { map = new Map(); states.set(engine, map); }
  let st = map.get(squad);
  if (!st) {
    st = { phase: 'defend', started: false, lastContactTick: 0, targetKey: null, doneKey: null, clears: new Map(), leaderDist: Infinity, progressTick: 0 };
    map.set(squad, st);
  }
  return st;
}

/** The squad's head: the column's leader while one is fixed, else the
 *  member nearest the target (the column the planner is about to build
 *  starts with him, and his next step is the one the door check must see),
 *  else the sergeant, else the first member. */
export function squadLeader(engine: GameEngine, squad: string, members: Piece[], target?: Coord): Piece {
  const st = engine.squadState(squad);
  const head = st?.column[0];
  const fixed = members.find(m => m.id === head);
  if (fixed) return fixed;
  if (target) {
    const field = distanceField(engine.state.board, [target]);
    const d = (m: Piece) => field.get(key(m.pos)) ?? Infinity;
    return [...members].sort((a, b) => d(a) - d(b))[0];
  }
  return members.find(m => m instanceof SergeantMarine) ?? members[0];
}

/** Is a threat in sight within TUNING.contactRange of any member? */
export function squadInContact(board: Board, members: Piece[]): boolean {
  return members.some(m => {
    const t = nearestThreatInSight(board, m);
    return t !== undefined && chebyshev(t.pos, m.pos) <= TUNING.contactRange;
  });
}

/** The square the squad marches on for this mission (ai/objective.ts: the
 *  same reading the engine gives the `objective` request), or undefined
 *  when the job is to hold (defend, kill-quota's blockade). */
export function squadTarget(engine: GameEngine, members: Piece[]): Coord | undefined {
  return objectiveTarget(engine, members);
}

/** The closed door the leader's next step toward `target` would cross, if any. */
export function doorAhead(board: Board, leader: Piece, target: Coord): Door | undefined {
  const next = chooseStep(board, leader, c => c.c === target.c && c.r === target.r);
  if (!next || (next.c !== leader.pos.c && next.r !== leader.pos.r)) return undefined;
  const door = board.doorBetween(leader.pos, next);
  return door && !door.isOpen ? door : undefined;
}

/**
 * A square outside the target's section, within AUTOPILOT.flamerReach walk
 * squares of the flamer, from which the target is in flame reach once he
 * faces it; the nearest such square, or undefined. A closed door on the
 * target square rules the shot out (the clear order handles the door).
 */
export function firingSquare(board: Board, flamer: Piece, target: Square): Coord | undefined {
  if (board.doorsAt({ c: target.x, r: target.y }).some(d => !d.isOpen)) return undefined;
  const field = walk(board, [flamer.pos], AUTOPILOT.flamerReach);
  let best: Coord | undefined;
  let bestDist = Infinity;
  for (const [k, dist] of field) {
    if (dist >= bestDist) continue;
    const [c, r] = k.split(',').map(Number);
    const sq = board.get(c, r);
    if (!sq || sq.sectionId === target.sectionId) continue;
    if (chebyshev({ c, r }, { c: target.x, r: target.y }) > HeavyFlamerMarine.RANGE) continue;
    const holder = board.pieceAt({ c, r }) as Piece | undefined;
    if (holder && holder !== flamer) continue;
    // Geometric: bodies ignored (his squad is passing through the door he
    // will fire past; the shot itself waits for a clear line).
    if (!inFireArc({ pos: { c, r }, facing: facingToward({ c, r }, { c: target.x, r: target.y }) }, target)) continue;
    if (!hasLineOfSight(board, sq, target)) continue;
    best = { c, r };
    bestDist = dist;
  }
  return best;
}

/** The squad holds at the threshold instead of posting a defend while the
 *  flamer's job is pending (squad.ts flameJobPending). */
export const flamePending = flameJobPending;

/** No living marine stands in the target's section (a flame burns marines too). */
export function sectionClearOfMarines(engine: GameEngine, target: Square): boolean {
  return !engine.marines.some(m => m.alive && engine.state.board.get(m.pos.c, m.pos.r)?.sectionId === target.sectionId);
}

/** The flamer's individual order toward a firing square, or undefined. */
export function flamerApproach(board: Board, flamer: Piece, target: Square): MarineOrder | undefined {
  const fs = firingSquare(board, flamer, target);
  if (!fs) return undefined;
  const facing = facingToward(fs, { c: target.x, r: target.y });
  if (fs.c === flamer.pos.c && fs.r === flamer.pos.r) {
    return flamer.facing === facing ? undefined : { type: 'moveTo', x: fs.c, y: fs.r, then: 'hold', facing };
  }
  return { type: 'moveTo', x: fs.c, y: fs.r, then: 'hold', facing };
}

/** One squad order per squad per change of state; see the module comment. */
export function runSquadTurn(engine: GameEngine): void {
  const board = engine.state.board;
  const tick = engine.tickCount;
  for (const squad of engine.squadNames()) {
    if (engine.state.result !== 'ongoing') return;
    const members = squadMembers(engine, squad);
    if (members.length === 0) continue;
    const st = engine.squadState(squad);
    const is = stateOf(engine, squad);
    const live = st?.order ?? null;
    const objective = resolveObjective(engine, members);
    const target = objective?.type === 'advance' ? { c: objective.x, r: objective.y } : undefined;
    const leader = squadLeader(engine, squad, members, target);
    if (squadInContact(board, members)) is.lastContactTick = tick;
    const quiet = tick - is.lastContactTick >= AUTOPILOT.quietTicks;
    const tkey = target ? key(target) : null;
    const issue = (order: SquadOrder) => { engine.command(leader.id, { type: 'squadOrder', order }); };
    const defendHere = () => { issue({ type: 'defend', x: leader.pos.c, y: leader.pos.r }); is.phase = 'defend'; };
    // Adopt a live order this issuer did not place (another squad's mission
    // order changed it): the phase and the target key follow the engine.
    if (live) {
      const ph: Phase = live.type;
      if (ph !== is.phase) {
        is.phase = ph;
        if (live.type === 'advance') { is.targetKey = key({ c: live.x, r: live.y }); is.leaderDist = Infinity; is.progressTick = tick; }
        if (live.type === 'blockade') is.doneKey = 'blockade';
      }
    }
    // A closed door on the leader's next step is cleared first (at most
    // clearsPerDoor times; after that the column opens it on the march); the
    // check runs before an advance is issued too, because the leader opens
    // the door himself on the first tick of his march otherwise.
    const clearAhead = (t: Coord): boolean => {
      const door = doorAhead(board, leader, t);
      if (!door) return false;
      const dk = `${door.square.x},${door.square.y},${door.facing}`;
      const n = is.clears.get(dk) ?? 0;
      if (n >= AUTOPILOT.clearsPerDoor) return false;
      is.clears.set(dk, n + 1);
      issue({ type: 'clear', x: door.square.x, y: door.square.y, facing: door.facing });
      is.phase = 'clear';
      return true;
    };
    // The objective for this squad: the mission order the first time any
    // squad asks for it (the engine fans it out and resolves it per squad),
    // this squad's own objective request after that.
    const issueObjective = () => {
      if (!missionIssued.has(engine)) {
        missionIssued.add(engine);
        engine.command(leader.id, { type: 'missionOrder', order: { type: 'objective' } });
      } else {
        engine.command(leader.id, { type: 'squadOrder', order: { type: 'objective' } });
      }
    };
    const advanceTo = (t: Coord) => {
      is.targetKey = key(t); is.leaderDist = Infinity; is.progressTick = tick;
      if (clearAhead(t)) return;
      issueObjective();
      is.phase = 'advance';
    };
    // Never race the relay: an issued order that is not yet due stands.
    if (live && st && tick < st.dueTick) continue;
    // First call: defend the section the squad stands in; on kill-quota the
    // blockade at once (its posts are the mission's own defend, and the
    // squad deploys scattered: gathering first costs the cycles the
    // blockade needs to hold).
    if (!is.started) {
      is.started = true;
      if (objective?.type === 'blockade') { is.doneKey = 'blockade'; issueObjective(); is.phase = 'blockade'; }
      else defendHere();
      continue;
    }
    if (!live) {
      // Advance and clear complete; defend and blockade never do (only an
      // empty squad).
      if (is.phase === 'advance') {
        is.doneKey = is.targetKey;
        is.phase = 'defend';
        if (flamePending(engine, members)) continue; // hold at the threshold for the shot
        const t = target ?? leader.pos;
        issue({ type: 'defend', x: t.c, y: t.r });
        continue;
      }
      if (is.phase === 'clear') {
        if (target && key(target) !== is.doneKey) advanceTo(target);
        else { is.phase = 'defend'; if (!flamePending(engine, members)) defendHere(); }
        continue;
      }
    }
    if (is.phase === 'defend') {
      // The order is held until every post is reached (transit rule C).
      const posted = !live || postsReached(engine, squad) || (st !== undefined && tick - st.issuedTick >= AUTOPILOT.postWaitTicks);
      if (quiet && posted && target && tkey !== is.doneKey) advanceTo(target);
      else if (quiet && posted && objective?.type === 'blockade' && is.doneKey !== 'blockade') { is.doneKey = 'blockade'; issueObjective(); is.phase = 'blockade'; }
      else if (!live && !flamePending(engine, members)) defendHere();
      continue;
    }
    if (is.phase === 'advance') {
      if (!target) { defendHere(); continue; }
      if (tkey !== is.targetKey) { advanceTo(target); continue; }
      if (clearAhead(target)) continue;
      const d = chebyshev(leader.pos, target);
      if (d < is.leaderDist) { is.leaderDist = d; is.progressTick = tick; }
      if (quiet && tick - is.progressTick >= AUTOPILOT.stallTicks) advanceTo(target);
      continue;
    }
    if (is.phase === 'blockade') continue; // the planner re-plans on a death and at the cycle boundary
    // clear: wait for the planner; a clear that outlives three timeouts is abandoned.
    if (st && tick - st.issuedTick > TUNING.clearTimeoutTicks * 3) {
      if (target) advanceTo(target); else defendHere();
    }
  }
}
