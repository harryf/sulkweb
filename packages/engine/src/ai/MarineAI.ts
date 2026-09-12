import type { GameEngine } from '../GameEngine.js';
import type { Board } from '../board/Board.js';
import { Piece, type Coord } from '../pieces/Piece.js';
import { StormBolterMarine } from '../pieces/StormBolterMarine.js';
import { HeavyFlamerMarine } from '../pieces/HeavyFlamerMarine.js';
import { AssaultCannonMarine } from '../pieces/AssaultCannonMarine.js';
import { canSee, inFireArc } from '../board/vision.js';
import { hasLineOfSight } from '../board/los.js';
import type { Dir } from '../core/Direction.js';
import { DIR_VEC, chebyshev, facingToward, toRelative, turnToward } from '../core/Direction.js';
import { closeCombat } from '../rules/combat.js';
import { flameFlood } from '../rules/flame.js';
import { looseCatPos } from '../rules/exotic.js';
import { TUNING } from '../core/CostTables.js';
import { orderStep, turnWouldBearOn } from './orders.js';

/**
 * Marine default AI (2.x, docs/realtime-plan.md "Default behaviour"): what a
 * marine does with his AP every tick nobody is steering him. It is a
 * self-defence list, not a mission player: an unordered marine never walks
 * toward the objective and never opens a door. First match wins.
 *
 *  1. Jammed: unjam.
 *  2. On overwatch: hold. Reaction fire IS his action (free, one shot per
 *     TUNING.overwatchCooldown ticks, which out-rates aimed fire at 1 AP).
 *     Unless nothing is in his fire arc, the nearest threat in sight stands
 *     outside it and a turn would put it in his line of fire: then he turns
 *     (overwatch drops, rule 10 re-arms him) rather than watch a wall
 *     (alpha.2 playtest, 2026-09-13). A threat already in the arc vetoes
 *     every turn, so two threats on two sides never spin him unarmed.
 *  3. A stealer in the fire arc with line of fire: shoot (bolter, cannon
 *     aimed fire, chain fist's bolter). Shooting an adjacent stealer is
 *     legal and lands on 11/36 per shot; a marine's close combat lands on
 *     roughly 1 in 12 against three dice, so the shot comes first.
 *  4. Adjacent stealer straight ahead and no shot possible (flamer, dry
 *     cannon): close combat.
 *  5. Adjacent stealer elsewhere: turn toward it (rule 3 or 4 next tick).
 *  6. Heavy flamer last stand: a stealer within 2 squares, ammo left, and
 *     the blast section holds no marine and nothing the mission needs.
 *  7. A threat in sight but outside the fire arc: turn toward the nearest.
 *     "In sight" is a clear sight line from his square in ANY direction,
 *     blips included; rock, closed doors and marine bodies hide (a marine
 *     hears the corridor behind him, not the room behind a door).
 *  8. An open door directly ahead with a stealer seen beyond it and no
 *     friendly marine beyond it: close it, unless a marine opened that door
 *     within the last cycle (an openDoor order must not be undone by its
 *     own executor the tick after).
 *  9. Assault cannon with an empty drum and no stealer in sight: reload.
 *  9b. Nothing in sight and a facing whose fire cone covers more squares
 *     than his (by more than one): turn to it, so he never arms overwatch
 *     into a bulkhead. A closed door straight ahead counts what it would
 *     show. The current facing wins ties and near-ties (no dithering).
 * 10. Not on overwatch, AP >= 2, weapon can overwatch: overwatch on.
 * 11. Hold.
 *
 * Per type: the storm bolter IS the default; the sergeant is a bolter with
 * +1 CC; the heavy flamer never overwatches (it cannot) and never fires on
 * its own except rule 6; the assault cannon never autofires here and never
 * overwatches with an empty drum; the chain fist never cuts a door here.
 * Autofire, flaming and cutting are order or direct-control actions.
 *
 * Orders (stage 2, ai/orders.ts): a live order is read between rule 6 and
 * rule 7. Rules 1 and 3 to 6 (the reactions) still win; rule 2 is skipped
 * because the order step takes the marine off overwatch itself; the transit
 * version of rule 7 fires only when the turn would bring the seen stealer
 * into the fire lane; rules 8 to 11 never fire while an order is live.
 */
export type MarineAiAction =
  | 'unjam' | 'shoot' | 'melee' | 'turn' | 'flame' | 'closeDoor' | 'reload' | 'overwatch'
  | 'step' | 'openDoor' | 'done';

/** Living stealer-side pieces, board order. */
export function threatsOn(board: Board): Piece[] {
  return board.pieces.filter((p): p is Piece => (p as Piece).kind !== 'marine' && (p as Piece).alive);
}

const nearestFirst = (from: Coord) => (a: Piece, b: Piece) =>
  Math.hypot(a.pos.c - from.c, a.pos.r - from.r) - Math.hypot(b.pos.c - from.c, b.pos.r - from.r);

/** The nearest enemy this marine could shoot right now (engine legality
 *  mirror: fire arc, line of fire, AP or free shot, ammo, jam). Board-order
 *  tie-break inside equal distances keeps replays deterministic. */
export function nearestShootable(board: Board, m: StormBolterMarine): Piece | undefined {
  return threatsOn(board).filter(t => m.canShootPiece(t)).sort(nearestFirst(m.pos))[0];
}

/** The nearest enemy this marine can see (vision arc plus line of sight). */
export function nearestSeen(board: Board, m: Piece): Piece | undefined {
  return threatsOn(board)
    .filter(t => { const sq = board.get(t.pos.c, t.pos.r); return sq !== undefined && canSee(board, m, sq); })
    .sort(nearestFirst(m.pos))[0];
}

/** The nearest stealer-side piece with a clear sight line from the marine's
 *  square in ANY direction (rock, closed doors and marine bodies block; the
 *  vision arc does not apply): what an idle marine turns to face. */
export function nearestThreatInSight(board: Board, m: Piece): Piece | undefined {
  const from = board.get(m.pos.c, m.pos.r);
  if (!from) return undefined;
  return threatsOn(board)
    .filter(t => { const sq = board.get(t.pos.c, t.pos.r); return sq !== undefined && hasLineOfSight(board, from, sq, { piecesBlock: 'marines' }); })
    .sort(nearestFirst(m.pos))[0];
}

/** Squares inside a fire cone with a clear sight line: what the marine
 *  could shoot from that facing. The 180 degree vision arc counts the whole
 *  flank line as seen, which in a corridor would rank a wall-facing as
 *  well as the corridor itself; the 90 degree fire cone is what overwatch
 *  actually covers. Marine bodies block, stealer bodies do not (they are
 *  the threat rule's business). */
function fireLane(board: Board, viewer: { pos: Coord; facing: Dir }): number {
  const from = board.get(viewer.pos.c, viewer.pos.r);
  if (!from) return 0;
  let n = 0;
  for (const sq of board.allSquares()) {
    if (!inFireArc(viewer, sq)) continue;
    if (hasLineOfSight(board, from, sq, { piecesBlock: 'marines' })) n += 1;
  }
  return n;
}

/** Is any stealer-side piece inside the marine's fire cone with a sight
 *  line? While one is, no facing rule turns him: he holds his lane and the
 *  shot or the reaction fire deals with it (blips or stealers elsewhere wait
 *  their turn; two threats on two sides must not make him spin unarmed). */
export function threatInArc(board: Board, m: Piece): boolean {
  const from = board.get(m.pos.c, m.pos.r);
  if (!from) return false;
  return threatsOn(board).some(t => {
    const sq = board.get(t.pos.c, t.pos.r);
    return sq !== undefined && inFireArc(m, sq) && hasLineOfSight(board, from, sq, { piecesBlock: 'marines' });
  });
}

/** The facing whose fire cone covers the most squares, or undefined when his
 *  current facing is within one square of the best: ties and near-ties keep
 *  him still, so a symmetric room never makes him dither. Candidates are
 *  tried N, E, S, W; the first strictly better one wins. */
export function preferredFacing(board: Board, m: Piece): Dir | undefined {
  // A closed door straight ahead is a window in waiting: count what it would
  // show (a silent peek), so a marine posted at a door keeps covering it.
  const count = (facing: Dir) => {
    const v = DIR_VEC[facing];
    const door = board.doorBetween(m.pos, { c: m.pos.c + v.dc, r: m.pos.r + v.dr });
    const peek = door !== undefined && !door.isOpen;
    if (peek) door.open(true);
    const n = fireLane(board, { pos: m.pos, facing });
    if (peek) door.close(true);
    return n;
  };
  const current = count(m.facing);
  let best = m.facing;
  let bestCount = current;
  for (const f of [0, 1, 2, 3] as Dir[]) {
    if (f === m.facing) continue;
    const c = count(f);
    if (c > bestCount) { best = f; bestCount = c; }
  }
  return bestCount - current > 1 ? best : undefined;
}

/** Turn toward `dir` if not already facing it; true when a turn was taken. */
function faceIfNeeded(m: Piece, dir: number): boolean {
  if (m.facing === dir) return false;
  const before = m.facing;
  turnToward(m, dir);
  return m.facing !== before;
}

/** Rule 6: the flamer's one autonomous shot. Returns the square to flame. */
function lastStandTarget(engine: GameEngine, m: HeavyFlamerMarine): ReturnType<Board['get']> {
  const board = engine.state.board;
  if (m.ammo < 1) return undefined;
  const mission = engine.mission;
  const keepIntact = new Set<string>();
  for (const s of mission.roomSquares ?? []) keepIntact.add(`${s.x},${s.y}`);
  for (const s of mission.ductingSquares ?? []) keepIntact.add(`${s.x},${s.y}`);
  if (mission.downloadPoint) keepIntact.add(`${mission.downloadPoint.x},${mission.downloadPoint.y}`);
  const cat = looseCatPos(board);
  if (cat) keepIntact.add(`${cat.c},${cat.r}`);
  const near = threatsOn(board).filter(t => chebyshev(t.pos, m.pos) <= 2).sort(nearestFirst(m.pos));
  for (const t of near) {
    const sq = board.get(t.pos.c, t.pos.r);
    if (!m.canFlame(sq)) continue;
    const blast = flameFlood(board, sq);
    const safe = blast.every(s => {
      if (keepIntact.has(`${s.x},${s.y}`)) return false;
      const occupant = board.pieceAt({ c: s.x, r: s.y }) as Piece | undefined;
      return !(occupant?.alive && occupant.kind === 'marine');
    });
    if (safe) return sq;
  }
  return undefined;
}

/** Rule 8: an open door straight ahead, a stealer seen through it, no
 *  friendly marine beyond it. "Beyond" = ahead of the marine inside his
 *  fire cone (the door edge sits on his facing line). */
function shouldCloseDoorAhead(board: Board, m: Piece): boolean {
  const v = DIR_VEC[m.facing];
  const ahead = { c: m.pos.c + v.dc, r: m.pos.r + v.dr };
  const door = board.doorBetween(m.pos, ahead);
  if (!door || !door.isOpen || door.destroyed) return false;
  if (board.tick - door.lastOpenedByMarine < TUNING.cycleTicks) return false;
  const beyond = (p: Piece) => inFireArc(m, { x: p.pos.c, y: p.pos.r });
  const seenBeyond = threatsOn(board).some(t => {
    const sq = board.get(t.pos.c, t.pos.r);
    return sq !== undefined && beyond(t) && canSee(board, m, sq);
  });
  if (!seenBeyond) return false;
  const friendlyBeyond = board.pieces.some(p =>
    (p as Piece).kind === 'marine' && p !== m && beyond(p as Piece));
  return !friendlyBeyond;
}

/**
 * One tick of the default list for one marine. Returns the action taken, or
 * null for hold. Spends at most one action; the caller guarantees the marine
 * is alive, has AP, and is not under a direct-control lease.
 */
export function marineTick(engine: GameEngine, m: Piece): MarineAiAction | null {
  const board = engine.state.board;
  if (!m.alive || m.ap <= 0) return null;
  const bolter = m instanceof StormBolterMarine ? m : undefined;

  // 1. jammed: unjam
  if (bolter?.jammed) return bolter.unjam() ? 'unjam' : null;
  // 2. on overwatch: hold, the reaction fire is his action (an ordered
  //    marine skips this: the order step takes him off overwatch); a threat
  //    in sight outside the arc that a turn would bring into the line of
  //    fire is worth the re-arm
  if (bolter?.overwatch && !m.order) {
    const t = nearestThreatInSight(board, m);
    if (t && !threatInArc(board, m) && turnWouldBearOn(board, m, t)
        && faceIfNeeded(m, facingToward(m.pos, t.pos))) return 'turn';
    return null;
  }
  // 3. shoot what can be shot
  if (bolter) {
    const target = nearestShootable(board, bolter);
    if (target) { bolter.shoot(target); return 'shoot'; }
  }
  // 4. adjacent ahead and no shot: close combat
  const v = DIR_VEC[m.facing];
  const ahead = board.pieceAt({ c: m.pos.c + v.dc, r: m.pos.r + v.dr }) as Piece | undefined;
  if (ahead?.alive && ahead.kind !== 'marine') {
    if (closeCombat(m, ahead)) return 'melee';
  }
  // 5. adjacent elsewhere: turn toward it (orthogonal neighbours first, the CC lineup)
  const adjacent = threatsOn(board).filter(t => chebyshev(t.pos, m.pos) === 1)
    .sort((a, b) => {
      const ortho = (p: Piece) => (Math.abs(p.pos.c - m.pos.c) + Math.abs(p.pos.r - m.pos.r) === 1 ? 0 : 1);
      return ortho(a) - ortho(b);
    })[0];
  if (adjacent && faceIfNeeded(m, facingToward(m.pos, adjacent.pos))) return 'turn';
  // 6. flamer last stand
  if (m instanceof HeavyFlamerMarine) {
    const sq = lastStandTarget(engine, m);
    if (sq && m.flameAt(sq) !== undefined) return 'flame';
  }
  // Orders: transit reaction, then the order step; nothing below fires.
  if (m.order) {
    const seenInTransit = nearestSeen(board, m);
    if (seenInTransit && turnWouldBearOn(board, m, seenInTransit)
        && faceIfNeeded(m, facingToward(m.pos, seenInTransit.pos))) return 'turn';
    return orderStep(engine, m);
  }
  // 7. in sight (any direction) but not shootable: turn toward the nearest,
  //    never away from a threat already in the fire arc (the advisor's veto:
  //    a nearer blip behind him must not swing him off a stealer in his lane)
  const seen = nearestThreatInSight(board, m);
  if (seen && !threatInArc(board, m) && faceIfNeeded(m, facingToward(m.pos, seen.pos))) return 'turn';
  // 8. close the door ahead on a seen threat
  if (shouldCloseDoorAhead(board, m) && m.useDoor()) return 'closeDoor';
  // 9. dry cannon: reload when nothing is in sight; never overwatch dry
  if (m instanceof AssaultCannonMarine && m.ammo < 1) {
    if (!seen && m.reload()) return 'reload';
    return null;
  }
  // 9b. nothing in sight: face the direction that shows the most squares
  if (!seen) {
    const pf = preferredFacing(board, m);
    if (pf !== undefined && faceIfNeeded(m, pf)) return 'turn';
  }
  // 10. overwatch with 2 AP
  if (bolter && m.ap >= 2 && bolter.overwatchOn()) return 'overwatch';
  // 11. hold
  return null;
}

/** Tick step 3: every living marine with AP and no live direct-control
 *  lease runs the default list once. Snapshot iteration: a flame or a
 *  malfunction can remove marines mid-loop. */
export function runMarineAI(engine: GameEngine): void {
  for (const m of [...engine.marines]) {
    if (!m.alive || m.ap <= 0) continue;
    if (engine.tickCount - m.lastCommandTick < TUNING.leaseTicks) continue;
    marineTick(engine, m);
    if (engine.state.result !== 'ongoing') return;
  }
}

/** Facing-relative MoveDir for a world delta, or undefined for an illegal
 *  (side-step) delta. Shared by the autopilot's command issuing. */
export function moveDirFor(facing: number, dc: number, dr: number):
  'forward' | 'backward' | 'forwardLeft' | 'forwardRight' | 'backLeft' | 'backRight' | undefined {
  const rel = toRelative(facing as 0 | 1 | 2 | 3, dc, dr);
  const key = `${rel.dc},${rel.dr}`;
  const map: Record<string, 'forward' | 'backward' | 'forwardLeft' | 'forwardRight' | 'backLeft' | 'backRight'> = {
    '0,-1': 'forward', '-1,-1': 'forwardLeft', '1,-1': 'forwardRight',
    '0,1': 'backward', '-1,1': 'backLeft', '1,1': 'backRight',
  };
  return map[key];
}
