import type { GameEngine } from '../GameEngine.js';
import type { Board } from '../board/Board.js';
import type { Piece, Coord } from '../pieces/Piece.js';
import type { MarineOrder, SquadOrder } from '../core/Commands.js';
import { StormBolterMarine } from '../pieces/StormBolterMarine.js';
import { DIR_VEC, ORTHO_VECS, chebyshev, facingToward, turnToward, type Dir } from '../core/Direction.js';
import { pathStep } from './hive.js';
import type { MarineAiAction } from './MarineAI.js';
import { moveDirFor, nearestThreatInSight, preferredFacing } from './MarineAI.js';
import { PieceEvents } from '../events/PieceEvents.js';
import { canShoot } from '../board/vision.js';

/**
 * Individual orders (2.x stage 2, docs/realtime-plan.md "Stage 2"). An order
 * is standing intent kept in `Piece.order`: the default AI executes it one
 * action per tick until it completes, and the player takes the wheel back by
 * pressing any key (every direct command clears the slot). Two orders exist
 * at this level:
 *
 *  - moveTo: walk to a square (hive pathStep with marines as blockers, doors
 *    opened on contact, a turn before each change of direction so the facing
 *    follows the travel), then hold or go on overwatch; an optional facing is
 *    taken on arrival first. A target held by another marine completes when
 *    the walker stands next to it, so "go to him" orders resolve.
 *  - openDoor: walk to either flank of the door edge, face across it, open it.
 *
 * The reactions of the default list (unjam, shoot, adjacent fight, the flamer
 * last stand, and a turn toward a seen stealer when the turn brings him into
 * the fire arc) run before the order step; the default's parking rules
 * (door close, overwatch with spare AP) do not fire while an order is live,
 * and an order that cannot progress this tick holds its AP for the next.
 *
 * Stage 3 added a second slot, `Piece.task`, that only the squad planners
 * write (ai/squad.ts). The executor is the same: `activeOrder` reads the
 * player's order first, the squad's task second, so an individual order
 * always beats the squad's plan. One difference: completion clears the
 * player's slot, never the task. The planner is the task's single writer
 * (the SystemsThinking pass's completion pump: an executor that cleared the
 * slot would have the planner rewrite the same task on every trigger), so a
 * completed task keeps reporting 'done' and holds the marine to his post
 * facing; a task that cannot progress on a full pool lets the default list
 * run instead (MarineAI).
 */
export type OrderAction = MarineAiAction;

export type OrderLevel = 1 | 2;

/** The slot the AI executes this tick: the player's order, else the squad task. */
export function activeOrder(m: Piece): { order: MarineOrder; level: OrderLevel } | undefined {
  if (m.order) return { order: m.order, level: 1 };
  if (m.task) return { order: m.task, level: 2 };
  return undefined;
}

/** The squad word for a squad order. */
export function squadLabel(order: SquadOrder | null | undefined): 'DEFEND' | 'ADVANCE' | 'CLEAR' | '' {
  if (!order) return '';
  return order.type === 'defend' ? 'DEFEND' : order.type === 'advance' ? 'ADVANCE' : 'CLEAR';
}

/** The roster's one-word state for a marine: his own order first, then the
 *  squad word while a task is live, then his posture. */
export function orderLabel(m: Piece, squadOrder?: SquadOrder | null): 'MOVE' | 'DOOR' | 'OW' | 'HOLD' | 'DEFEND' | 'ADVANCE' | 'CLEAR' {
  if (m.order?.type === 'moveTo') return 'MOVE';
  if (m.order?.type === 'openDoor') return 'DOOR';
  if (m.task && squadOrder) return squadLabel(squadOrder) as 'DEFEND' | 'ADVANCE' | 'CLEAR';
  if (m.task) return 'MOVE';
  if (m instanceof StormBolterMarine && m.overwatch) return 'OW';
  return 'HOLD';
}

/** Validate an order against the board: the target square exists, the door
 *  edge exists. Pure; the command path calls it before storing. */
export function orderIsValid(board: Board, order: MarineOrder): boolean {
  if (order.type === 'moveTo') return board.get(order.x, order.y) !== undefined;
  return board.doorsAt({ c: order.x, r: order.y }).some(d => d.facing === order.facing);
}

/** Set, replace or clear the player's slot (level 1) and tell the client. */
export function setOrder(m: Piece, order: MarineOrder | null): void {
  m.order = order;
  m.orderStall = 0;
  PieceEvents.emit('orderChanged', { pieceId: m.id, order, level: 1 });
}

/** Set, replace or clear the squad task (level 2). Idempotent: the same task
 *  again is no event, so a planner may write its plan every tick. */
export function setTask(m: Piece, task: MarineOrder | null): void {
  if (sameOrder(m.task, task)) return;
  m.task = task;
  m.orderStall = 0;
  PieceEvents.emit('orderChanged', { pieceId: m.id, order: task, level: 2 });
}

/** Structural equality of two orders (or nulls). */
export function sameOrder(a: MarineOrder | null, b: MarineOrder | null): boolean {
  if (a === b) return true;
  if (!a || !b || a.type !== b.type || a.x !== b.x || a.y !== b.y) return false;
  if (a.type === 'moveTo' && b.type === 'moveTo') return a.then === b.then && a.facing === b.facing;
  if (a.type === 'openDoor' && b.type === 'openDoor') return a.facing === b.facing;
  return false;
}

/** Completion: the player's slot clears itself; the squad task stays until
 *  its planner rewrites or clears it. */
function clearLevel(m: Piece, level: OrderLevel): void {
  if (level === 1) setOrder(m, null);
}

/** Could the march toward `isGoal` take a step, turn or open a door this
 *  tick (path exists)? Pure. Lets an overwatching marine keep his overwatch
 *  while his task is blocked instead of dropping it every tick. */
function canMarch(board: Board, m: Piece, isGoal: (c: Coord) => boolean): boolean {
  return chooseStep(board, m, isGoal) !== undefined;
}

/** Turn toward `dir` (1 AP, or 2 for an about-face); true when a turn was spent. */
function faceDir(m: Piece, dir: Dir): boolean {
  if (m.facing === dir) return false;
  const before = m.facing;
  turnToward(m, dir);
  return m.facing !== before;
}

/**
 * The next square of a shortest path, preferring straight lines: the hive's
 * pathStep returns the first shortest path its BFS finds, which weaves
 * through diagonals across an open room; a terminator should walk the
 * corridor's line. Among the neighbours that lie on SOME shortest path the
 * square straight ahead wins, then the other orthogonals, then diagonals.
 */
export function chooseStep(board: Board, m: Piece, isGoal: (c: Coord) => boolean): Coord | undefined {
  const best = pathStep(board, m.pos, isGoal);
  if (!best) return undefined;
  const ahead = DIR_VEC[m.facing];
  const deltas = [
    { dc: ahead.dc, dr: ahead.dr },
    ...ORTHO_VECS.filter(v => v.dc !== ahead.dc || v.dr !== ahead.dr),
    { dc: -1, dr: -1 }, { dc: 1, dr: -1 }, { dc: -1, dr: 1 }, { dc: 1, dr: 1 },
  ];
  for (const d of deltas) {
    const c = { c: m.pos.c + d.dc, r: m.pos.r + d.dr };
    if (!board.isPassable(c) || (board.pieceAt(c) as Piece | undefined)?.kind === 'marine') continue;
    if (d.dc !== 0 && d.dr !== 0 && board.diagonalBlockedByDoor(m.pos, c)) continue;
    if (isGoal(c)) return c;
    const rest = pathStep(board, c, isGoal);
    if (rest && rest.cost + 1 === best.cost) return c;
  }
  return best.step;
}

/** One step of a march toward `isGoal`: turn to face the next square, open a
 *  closed door on the way, or move. Returns the action, or null when the
 *  marine could not progress this tick (no AP, no path, blocked by a marine). */
function marchStep(board: Board, m: Piece, isGoal: (c: Coord) => boolean): OrderAction | null {
  const next = chooseStep(board, m, isGoal);
  if (!next) return null;
  const dir = facingToward(m.pos, next);
  if (m.facing !== dir) return faceDir(m, dir) ? 'turn' : null;
  // A closed door edge between here and the next square: open it first.
  if (next.c === m.pos.c || next.r === m.pos.r) {
    const door = board.doorBetween(m.pos, next);
    if (door && !door.isOpen) return m.useDoor() ? 'openDoor' : null;
  }
  const moveDir = moveDirFor(m.facing, next.c - m.pos.c, next.r - m.pos.r);
  if (!moveDir) return null;
  const moved = (
    moveDir === 'forward' ? m.moveForward()
    : moveDir === 'forwardLeft' ? m.moveForwardLeft()
    : moveDir === 'forwardRight' ? m.moveForwardRight()
    : moveDir === 'backward' ? m.moveBackward()
    : moveDir === 'backLeft' ? m.moveBackLeft()
    : m.moveBackRight()
  );
  return moved ? 'step' : null;
}

/** The terminal of a moveTo: optional facing, then hold or overwatch. Returns
 *  'done' once the slot is cleared, an action while still working on it, or
 *  null when waiting for AP. */
function finishMove(board: Board, m: Piece, order: Extract<MarineOrder, { type: 'moveTo' }>, level: OrderLevel): OrderAction | null {
  if (order.facing !== undefined && m.facing !== order.facing) {
    return faceDir(m, order.facing as Dir) ? 'turn' : null;
  }
  // No ordered facing, going on overwatch, nothing in sight: take the facing
  // that shows the most squares first (the alpha.2 wall-facing overwatcher).
  if (order.facing === undefined && order.then === 'overwatch' && !nearestThreatInSight(board, m)) {
    const pf = preferredFacing(board, m);
    if (pf !== undefined) return faceDir(m, pf) ? 'turn' : null;
  }
  if (order.then === 'overwatch' && m instanceof StormBolterMarine) {
    if (m.overwatch) { clearLevel(m, level); return 'done'; }
    if (m.jammed) { clearLevel(m, level); return 'done'; } // the unjam reaction takes it from here
    if (!m.overwatchOn()) return null; // waits for the 2 AP
    clearLevel(m, level);
    return 'overwatch';
  }
  clearLevel(m, level);
  return 'done';
}

/**
 * One tick of the marine's live order or task. The caller
 * (MarineAI.marineTick) has already run the reactions and guarantees AP > 0
 * and a live slot; the player's order is executed before the squad's task.
 */
export function orderStep(engine: GameEngine, m: Piece): OrderAction | null {
  const board = engine.state.board;
  const active = activeOrder(m);
  if (!active) return null;
  const { order, level } = active;
  // An ordered marine on overwatch comes off it (free) so he can act, but
  // only when the order can progress: a blocked march keeps his overwatch.
  const offOverwatch = () => { if (m instanceof StormBolterMarine && m.overwatch) m.overwatchOff(); };
  if (order.type === 'moveTo') {
    const target = { c: order.x, r: order.y };
    const holder = board.pieceAt(target) as Piece | undefined;
    const heldByOther = holder !== undefined && holder !== m && holder.kind === 'marine';
    const arrived = heldByOther ? chebyshev(m.pos, target) <= 1 : (m.pos.c === target.c && m.pos.r === target.r);
    if (arrived) {
      if (m instanceof StormBolterMarine && m.overwatch) {
        // On overwatch at the target: done unless an ordered facing differs.
        if (order.then === 'overwatch' && (order.facing === undefined || m.facing === order.facing)) {
          clearLevel(m, level); return 'done';
        }
        offOverwatch();
      }
      return finishMove(board, m, order, level);
    }
    const isGoal = heldByOther
      ? (c: Coord) => chebyshev(c, target) <= 1
      : (c: Coord) => c.c === target.c && c.r === target.r;
    if (!canMarch(board, m, isGoal)) return null;
    offOverwatch();
    return marchStep(board, m, isGoal);
  }
  // openDoor
  const door = board.doorsAt({ c: order.x, r: order.y }).find(d => d.facing === order.facing);
  if (!door || door.isOpen) { clearLevel(m, level); return 'done'; }
  const a = { c: door.square.x, r: door.square.y };
  const b = door.otherSide();
  const at = (c: Coord) => (c.c === a.c && c.r === a.r) || (c.c === b.c && c.r === b.r);
  if (!at(m.pos)) {
    if (!canMarch(board, m, at)) return null;
    offOverwatch();
    return marchStep(board, m, at);
  }
  offOverwatch();
  // On a flank: face across the edge, then open.
  const across = m.pos.c === a.c && m.pos.r === a.r ? b : a;
  const dir = facingToward(m.pos, across);
  if (m.facing !== dir) return faceDir(m, dir) ? 'turn' : null;
  if (!m.useDoor()) return null;
  clearLevel(m, level);
  return 'openDoor';
}

/**
 * Stall guard (advisor, stage 3): a player's order that made no progress on
 * a full AP pool for TUNING.orderStallTicks ticks is dropped, so a blocked
 * walk or a door somebody else already opened never leaves a marine deaf to
 * his squad or to the default list. Called by marineTick after a null order
 * step on the level 1 slot; a stuck task instead lets the default list run.
 */
export function noteOrderStall(m: Piece, stallTicks: number): boolean {
  if (m.ap < m.apInitial) { m.orderStall = 0; return false; }
  m.orderStall += 1;
  if (m.orderStall < stallTicks) return false;
  setOrder(m, null);
  return true;
}

/** Would a turn to face `target` put it in this marine's fire lane (arc, line
 *  of fire, overwatch range not applied)? Used by the transit reaction: a
 *  marine under orders turns toward a seen stealer only when the turn makes
 *  the stealer shootable, so he never dithers between the march and a
 *  threat he could not hit anyway. */
export function turnWouldBearOn(board: Board, m: Piece, target: Piece): boolean {
  const dir = facingToward(m.pos, target.pos);
  if (dir === m.facing) return false;
  const sq = board.get(target.pos.c, target.pos.r);
  if (!sq) return false;
  // Same geometry as vision.canShoot, with the would-be facing.
  return canShoot(board, { pos: m.pos, facing: dir }, sq);
}
