import type { GameEngine } from '../GameEngine.js';
import type { Board } from '../board/Board.js';
import { Piece, type Coord } from '../pieces/Piece.js';
import { StormBolterMarine } from '../pieces/StormBolterMarine.js';
import { HeavyFlamerMarine } from '../pieces/HeavyFlamerMarine.js';
import { AssaultCannonMarine } from '../pieces/AssaultCannonMarine.js';
import { canSee, inFireArc } from '../board/vision.js';
import { DIR_VEC, chebyshev, facingToward, toRelative, turnToward } from '../core/Direction.js';
import { closeCombat } from '../rules/combat.js';
import { flameFlood } from '../rules/flame.js';
import { looseCatPos } from '../rules/exotic.js';
import { TUNING } from '../core/CostTables.js';

/**
 * Marine default AI (2.x, docs/realtime-plan.md "Default behaviour"): what a
 * marine does with his AP every tick nobody is steering him. It is a
 * self-defence list, not a mission player: an unordered marine never walks
 * toward the objective and never opens a door. First match wins.
 *
 *  1. Jammed: unjam.
 *  2. On overwatch: hold. Reaction fire IS his action (free, one shot per
 *     TUNING.overwatchCooldown ticks, which out-rates aimed fire at 1 AP).
 *  3. A stealer in the fire arc with line of fire: shoot (bolter, cannon
 *     aimed fire, chain fist's bolter). Shooting an adjacent stealer is
 *     legal and lands on 11/36 per shot; a marine's close combat lands on
 *     roughly 1 in 12 against three dice, so the shot comes first.
 *  4. Adjacent stealer straight ahead and no shot possible (flamer, dry
 *     cannon): close combat.
 *  5. Adjacent stealer elsewhere: turn toward it (rule 3 or 4 next tick).
 *  6. Heavy flamer last stand: a stealer within 2 squares, ammo left, and
 *     the blast section holds no marine and nothing the mission needs.
 *  7. A stealer visible but outside the fire arc: turn toward the nearest.
 *  8. An open door directly ahead with a stealer seen beyond it and no
 *     friendly marine beyond it: close it.
 *  9. Assault cannon with an empty drum and no stealer in sight: reload.
 * 10. Not on overwatch, AP >= 2, weapon can overwatch: overwatch on.
 * 11. Hold.
 *
 * Per type: the storm bolter IS the default; the sergeant is a bolter with
 * +1 CC; the heavy flamer never overwatches (it cannot) and never fires on
 * its own except rule 6; the assault cannon never autofires here and never
 * overwatches with an empty drum; the chain fist never cuts a door here.
 * Autofire, flaming and cutting are order or direct-control actions.
 */
export type MarineAiAction =
  | 'unjam' | 'shoot' | 'melee' | 'turn' | 'flame' | 'closeDoor' | 'reload' | 'overwatch';

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
  // 2. on overwatch: hold, the reaction fire is his action
  if (bolter?.overwatch) return null;
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
  // 7. seen but not shootable: turn toward the nearest
  const seen = nearestSeen(board, m);
  if (seen && faceIfNeeded(m, facingToward(m.pos, seen.pos))) return 'turn';
  // 8. close the door ahead on a seen threat
  if (shouldCloseDoorAhead(board, m) && m.useDoor()) return 'closeDoor';
  // 9. dry cannon: reload when nothing is in sight; never overwatch dry
  if (m instanceof AssaultCannonMarine && m.ammo < 1) {
    if (!seen && m.reload()) return 'reload';
    return null;
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
