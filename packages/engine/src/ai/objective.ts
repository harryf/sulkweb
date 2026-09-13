import type { GameEngine } from '../GameEngine.js';
import type { Piece, Coord } from '../pieces/Piece.js';
import type { SquadOrder } from '../core/Commands.js';
import { SergeantMarine } from '../pieces/StormBolterMarine.js';
import { distanceField } from './hive.js';
import { downhill } from './squad.js';

/**
 * The mission's objective read at squad level (2.x stage 4 step 4). One
 * reading for the engine (the `objective` request resolved at receipt) and
 * the bot (its march target): the threshold square for the flame missions
 * (the last square outside the objective's section on the way, so the squad
 * never walks into the room it means to burn), the Data Room square for
 * download, the nearest exit for the missions that leave, nothing for
 * defend (the job is the section you stand in) and kill-quota (the job is
 * the entries: a blockade, see resolveObjective).
 */

/** The last square outside `obj`'s section on the walk from `from`; the
 *  objective itself when the walker already stands inside or has no path. */
export function thresholdSquare(engine: GameEngine, from: Coord, obj: Coord): Coord {
  const board = engine.state.board;
  const section = board.get(obj.c, obj.r)?.sectionId;
  const field = distanceField(board, [obj]);
  let cur: Coord = from;
  if (board.get(cur.c, cur.r)?.sectionId === section || field.get(`${cur.c},${cur.r}`) === undefined) return obj;
  for (let guard = 0; guard < 400; guard++) {
    const next = downhill(board, field, cur);
    if (!next) return obj;
    if (board.get(next.c, next.r)?.sectionId === section) return cur;
    cur = next;
  }
  return obj;
}

/** The square the squad marches on for this mission, or undefined when the
 *  job is to hold (defend, kill-quota) or nothing is left to march on. */
export function objectiveTarget(engine: GameEngine, members: Piece[]): Coord | undefined {
  const lead = members[0];
  if (!lead) return undefined;
  const near = (pts: { x: number; y: number }[]): Coord | undefined => {
    const p = [...pts].sort((a, b) =>
      Math.hypot(a.x - lead.pos.c, a.y - lead.pos.r) - Math.hypot(b.x - lead.pos.c, b.y - lead.pos.r))[0];
    return p ? { c: p.x, r: p.y } : undefined;
  };
  const mission = engine.mission;
  switch (mission.objective) {
    case 'flame-objective':
      return mission.objectivePoint ? thresholdSquare(engine, lead.pos, { c: mission.objectivePoint.x, r: mission.objectivePoint.y }) : undefined;
    case 'flame-objectives': {
      const p = near((mission.objectivePoints ?? []).filter(p => !engine.cleansed.has(`${p.x},${p.y}`)));
      return p ? thresholdSquare(engine, lead.pos, p) : undefined;
    }
    case 'download':
      return mission.downloadPoint ? { c: mission.downloadPoint.x, r: mission.downloadPoint.y } : undefined;
    case 'defend':
    case 'kill-quota':
      return undefined;
    default:
      return near(mission.exitPoints ?? []);
  }
}

/**
 * The concrete order `objective` means for this squad now: blockade on
 * kill-quota (when the mission has entries), defend at the sergeant's square
 * (the first member's without one) on defend missions, an advance to the
 * objective target everywhere else; undefined when nothing is left to do,
 * and the command is refused for that squad.
 */
export function resolveObjective(engine: GameEngine, members: Piece[]): SquadOrder | undefined {
  const lead = members[0];
  if (!lead) return undefined;
  const mission = engine.mission;
  if (mission.objective === 'kill-quota') return (mission.entryPoints?.length ?? 0) > 0 ? { type: 'blockade' } : undefined;
  if (mission.objective === 'defend') {
    const l = members.find(m => m instanceof SergeantMarine) ?? lead;
    return { type: 'defend', x: l.pos.c, y: l.pos.r };
  }
  const t = objectiveTarget(engine, members);
  return t ? { type: 'advance', x: t.c, y: t.r } : undefined;
}
