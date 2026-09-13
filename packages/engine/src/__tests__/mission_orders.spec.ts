import { describe, it, expect } from 'vitest';
import { GameEngine } from '../GameEngine.js';
import { SeededRng } from '../core/Dice.js';
import { PieceEvents } from '../events/PieceEvents.js';
import { loadMission } from '../missions/missionLoader.js';
import { missions } from '../missions/index.js';
import { SergeantMarine, StormBolterMarine } from '../pieces/StormBolterMarine.js';
import { HeavyFlamerMarine } from '../pieces/HeavyFlamerMarine.js';
import { facingToward, chebyshev } from '../core/Direction.js';
import { runMarineTurn, autoplay } from '../ai/MarineAutopilot.js';
import { AUTOPILOT } from '../ai/SquadAutopilot.js';
import { resolveObjective, objectiveTarget } from '../ai/objective.js';
import { planBlockade, postsReached, BLOCKADE_RANGE, squadOf } from '../ai/squad.js';
import { squadLabel, orderLabel } from '../ai/orders.js';
import { TUNING } from '../core/CostTables.js';
import type { CompiledMission, DeploySquareJSON } from '../missions/missionTypes.js';
import type { MarineCommand, SquadOrder } from '../core/Commands.js';
import type { Piece } from '../pieces/Piece.js';

/**
 * Mission orders (2.x stage 4 step 4): one command fanned out to every
 * squad inside the engine, the objective resolved per squad at receipt, the
 * blockade order for kill-quota, and the bot issuing the mission order after
 * its first defend. Quiet boards (the stealer side switched off) as in
 * squad.spec; space_hulk_2's eleven entries sit in two corner clusters that
 * two squares cover under the victory metric.
 */
const quietOf = (name: keyof typeof missions, patch: Partial<CompiledMission> = {}): CompiledMission =>
  ({ ...loadMission(name), initialBlips: 0, blipsPerTurn: 0, totalBlips: 0, ...patch });
const quiet = (deploy?: DeploySquareJSON[], patch: Partial<CompiledMission> = {}): CompiledMission => {
  const m = quietOf('space_hulk_1', patch);
  if (deploy) m.marineDeployment = deploy;
  return m;
};
function engineOn(mission: CompiledMission = quiet(), seed = 1): GameEngine {
  PieceEvents.all.clear();
  return new GameEngine(mission, [], new SeededRng(seed));
}
interface Issued { tick: number; pieceId: string; command: MarineCommand; ok: boolean }
function commandLog(): Issued[] {
  const log: Issued[] = [];
  PieceEvents.on('command', p => log.push(p as Issued));
  return log;
}
function changes(): { squad: string; order: SquadOrder | null; coordinated: boolean; dueTick: number }[] {
  const out: { squad: string; order: SquadOrder | null; coordinated: boolean; dueTick: number }[] = [];
  PieceEvents.on('squadOrderChanged', e => out.push(e));
  return out;
}
const key = (c: { c: number; r: number }) => `${c.c},${c.r}`;
const step = (engine: GameEngine, n = 1) => { for (let i = 0; i < n && engine.state.result === 'ongoing'; i++) { runMarineTurn(engine, 'squads'); engine.tick(); } };
const openAllDoors = (engine: GameEngine) => { for (const d of engine.state.board.allDoors()) d.open(true); };
const OBJECTIVE: MarineCommand = { type: 'missionOrder', order: { type: 'objective' } };
/** Two squads on the quiet space_hulk_1 board: Calvin with a sergeant, Rex without one. */
const twoSquads: DeploySquareJSON[] = [
  { x: 10, y: 0, facing: 'down', type: 'sergeant', squad: 'Calvin' },
  { x: 10, y: 1, facing: 'down', type: 'heavy_flamer', squad: 'Calvin' },
  { x: 10, y: 2, facing: 'down', type: 'storm_bolter', squad: 'Rex' },
  { x: 10, y: 3, facing: 'down', type: 'storm_bolter', squad: 'Rex' },
];

describe('the objective resolved per mission', () => {
  const sq = (engine: GameEngine, c: { c: number; r: number }) => engine.state.board.get(c.c, c.r)!;
  const near = (from: Piece, pts: { x: number; y: number }[]) => [...pts].sort((a, b) =>
    Math.hypot(a.x - from.pos.c, a.y - from.pos.r) - Math.hypot(b.x - from.pos.c, b.y - from.pos.r))[0];

  it('flame-objective: an advance to the threshold, the last square outside the objective room on the way', () => {
    const engine = engineOn();
    expect(resolveObjective(engine, engine.marines)).toEqual({ type: 'advance', x: 17, y: 20 });
    const obj = engine.mission.objectivePoint!;
    expect(sq(engine, { c: 17, r: 20 }).sectionId).not.toBe(sq(engine, { c: obj.x, r: obj.y }).sectionId);
  });

  it('flame-objectives: an advance to the threshold of the nearest uncleansed point; nothing once every point is cleansed', () => {
    const engine = engineOn(loadMission('space_hulk_4'));
    const o = resolveObjective(engine, engine.marines)!;
    expect(o.type).toBe('advance');
    const p = near(engine.marines[0], engine.mission.objectivePoints!);
    expect(sq(engine, { c: (o as { x: number }).x, r: (o as { y: number }).y }).sectionId).not.toBe(sq(engine, { c: p.x, r: p.y }).sectionId);
    for (const q of engine.mission.objectivePoints!) engine.cleansed.add(`${q.x},${q.y}`);
    expect(resolveObjective(engine, engine.marines)).toBeUndefined();
  });

  it('kill-quota: the blockade; none without entries to cover', () => {
    const engine = engineOn(loadMission('space_hulk_2'));
    expect(resolveObjective(engine, engine.marines)).toEqual({ type: 'blockade' });
    expect(objectiveTarget(engine, engine.marines)).toBeUndefined();
    const bare = engineOn(quietOf('space_hulk_2', { entryPoints: [] }));
    expect(resolveObjective(bare, bare.marines)).toBeUndefined();
  });

  it('escort-cat, escape-count and exterminate-or-exit: an advance to the nearest exit; download: the Data Room square; defend: a defend at the sergeant square', () => {
    for (const name of ['space_hulk_3', 'space_hulk_5', 'beta_1', 'debug_1'] as (keyof typeof missions)[]) {
      const engine = engineOn(loadMission(name));
      const e = near(engine.marines[0], engine.mission.exitPoints!);
      expect(resolveObjective(engine, engine.marines), name).toEqual({ type: 'advance', x: e.x, y: e.y });
    }
    const dl = engineOn(loadMission('beta_2'));
    expect(resolveObjective(dl, dl.marines)).toEqual({ type: 'advance', x: dl.mission.downloadPoint!.x, y: dl.mission.downloadPoint!.y });
    const def = engineOn(loadMission('space_hulk_6'));
    const sgt = def.marines.find(m => m instanceof SergeantMarine)!;
    expect(resolveObjective(def, def.marines)).toEqual({ type: 'defend', x: sgt.pos.c, y: sgt.pos.r });
    expect(resolveObjective(def, [])).toBeUndefined();
  });
});

describe('the mission order: one command, every squad', () => {
  it('squadOrder { objective } on one squad stores the concrete order and logs the request', () => {
    const engine = engineOn();
    const log = commandLog();
    expect(engine.command(engine.marines[0].id, { type: 'squadOrder', order: { type: 'objective' } })).toBe(true);
    expect(engine.squadState('Calvin')!.order).toEqual({ type: 'advance', x: 17, y: 20 });
    expect(log).toHaveLength(1);
    expect(log[0].command).toEqual({ type: 'squadOrder', order: { type: 'objective' } });
  });

  it('missionOrder fans out inside the engine: one command event, one squadOrderChanged per squad, the relay per squad', () => {
    const engine = engineOn(quiet(twoSquads));
    const log = commandLog();
    const ev = changes();
    engine.runTicks(3);
    const tick = engine.tickCount;
    expect(engine.command(engine.marines[0].id, { type: 'missionOrder', order: { type: 'defend', x: 10, y: 1 } })).toBe(true);
    expect(log.filter(e => e.command.type === 'missionOrder')).toHaveLength(1);
    expect(ev.map(e => e.squad)).toEqual(['Calvin', 'Rex']);
    // Calvin's sergeant relays it next tick; Rex has none: relayTicks later, uncoordinated.
    expect(engine.squadState('Calvin')).toMatchObject({ order: { type: 'defend', x: 10, y: 1 }, coordinated: true, dueTick: tick + 1 });
    expect(engine.squadState('Rex')).toMatchObject({ order: { type: 'defend', x: 10, y: 1 }, coordinated: false, dueTick: tick + TUNING.relayTicks });
  });

  it('objective per squad: two squads on space_hulk_3 each get an advance to their nearest exit', () => {
    const engine = engineOn(quietOf('space_hulk_3'));
    const ev = changes();
    expect(engine.command(engine.marines[0].id, OBJECTIVE)).toBe(true);
    expect(ev).toHaveLength(2);
    for (const name of engine.squadNames()) expect(engine.squadState(name)!.order!.type).toBe('advance');
  });

  it('a squad whose objective resolves to nothing is left alone; the command is refused when no squad takes it', () => {
    const engine = engineOn(loadMission('space_hulk_4'));
    for (const q of engine.mission.objectivePoints!) engine.cleansed.add(`${q.x},${q.y}`);
    const ev = changes();
    expect(engine.command(engine.marines[0].id, OBJECTIVE)).toBe(false);
    expect(ev).toHaveLength(0);
    for (const name of engine.squadNames()) expect(engine.squadState(name)).toBeUndefined();
    // A concrete order still fans out.
    expect(engine.command(engine.marines[0].id, { type: 'missionOrder', order: { type: 'defend', x: engine.marines[0].pos.c, y: engine.marines[0].pos.r } })).toBe(true);
    expect(ev).toHaveLength(2);
  });

  it('stamps no lease and drops no task on the addressee', () => {
    const engine = engineOn();
    engine.command(engine.marines[0].id, { type: 'squadOrder', order: { type: 'defend', x: 10, y: 4 } });
    engine.runTicks(2);
    const m = engine.marines[1];
    const task = m.task;
    expect(task).not.toBeNull();
    const before = m.lastCommandTick;
    // The same order again is a re-plan: the task stands.
    expect(engine.command(m.id, { type: 'missionOrder', order: { type: 'defend', x: 10, y: 4 } })).toBe(true);
    expect(m.lastCommandTick).toBe(before);
    expect(m.task).toEqual(task);
  });

  it('is idempotent per squad: the same mission order again, once the plan started, changes nothing; a different one clears the tasks', () => {
    const engine = engineOn();
    openAllDoors(engine);
    engine.command(engine.marines[0].id, OBJECTIVE);
    engine.runTicks(3);
    const st = engine.squadState('Calvin')!;
    const due = st.dueTick;
    const tasks = engine.marines.map(m => JSON.stringify(m.task));
    const ev = changes();
    expect(engine.command(engine.marines[0].id, OBJECTIVE)).toBe(true);
    expect(ev).toHaveLength(0);
    expect(st.dueTick).toBe(due);
    expect(st.started).toBe(true);
    expect(engine.marines.map(m => JSON.stringify(m.task))).toEqual(tasks);
    expect(engine.command(engine.marines[0].id, { type: 'missionOrder', order: { type: 'defend', x: 10, y: 4 } })).toBe(true);
    expect(ev).toHaveLength(1);
    for (const m of engine.marines) expect(m.task).toBeNull();
  });

  it('replays: a log with a mission order gives the same state hash on a second engine', () => {
    const play = () => {
      const engine = engineOn();
      engine.runTicks(5);
      engine.command(engine.marines[0].id, OBJECTIVE);
      engine.runTicks(40);
      return `${engine.tickCount}|${engine.stateHash()}`;
    };
    expect(play()).toBe(play());
  });
});

describe('the blockade', () => {
  const sh2 = () => engineOn(quietOf('space_hulk_2'));

  it('plans one post per marine, the posts covering every entry within the victory metric, each facing its nearest covered entry', () => {
    const engine = sh2();
    const board = engine.state.board;
    const posts = planBlockade(engine, engine.marines);
    expect(posts).toHaveLength(5);
    expect(new Set(posts.map(p => key(p.c))).size).toBe(5);
    for (const e of engine.mission.entryPoints!) {
      expect(posts.some(p => p.covers.has(`${e.x},${e.y}`)), `entry ${e.x},${e.y}`).toBe(true);
    }
    // The metric is the check's: raw adjacency within BLOCKADE_RANGE.
    for (const p of posts) {
      for (const ek of p.covers) {
        const [c, r] = ek.split(',').map(Number);
        const start = board.get(c, r)!;
        let frontier = [start]; const seen = new Set([start]); let found = start.x === p.c.c && start.y === p.c.r;
        for (let d = 1; d <= BLOCKADE_RANGE && !found; d++) {
          const next = [] as typeof frontier;
          for (const sq of frontier) for (const a of board.adjacentsOf(sq)) { if (seen.has(a)) continue; seen.add(a); next.push(a); if (a.x === p.c.c && a.y === p.c.r) found = true; }
          frontier = next;
        }
        expect(found, `post ${key(p.c)} within ${BLOCKADE_RANGE} of ${ek}`).toBe(true);
      }
      const nearest = [...p.covers].map(k => { const [c, r] = k.split(',').map(Number); return { c, r }; })
        .filter(e => e.c !== p.c.c || e.r !== p.c.r).sort((a, b) => chebyshev(a, p.c) - chebyshev(b, p.c))[0];
      if (nearest) expect(p.facing).toBe(facingToward(p.c, nearest));
    }
  });

  it('the order is valid only with entries; two blockades are the same order (a re-plan keeps the posts and the tasks)', () => {
    const bare = engineOn(quietOf('space_hulk_2', { entryPoints: [] }));
    expect(bare.command(bare.marines[0].id, { type: 'squadOrder', order: { type: 'blockade' } })).toBe(false);
    const engine = sh2();
    expect(engine.command(engine.marines[0].id, { type: 'squadOrder', order: { type: 'blockade' } })).toBe(true);
    engine.runTicks(2);
    const st = engine.squadState('Constantine')!;
    const posts = st.posts.map(p => key(p.c));
    expect(posts).toHaveLength(5);
    const tasks = engine.marines.map(m => JSON.stringify(m.task));
    expect(engine.command(engine.marines[0].id, { type: 'squadOrder', order: { type: 'blockade' } })).toBe(true);
    expect(st.posts.map(p => key(p.c))).toEqual(posts);
    expect(engine.marines.map(m => JSON.stringify(m.task))).toEqual(tasks);
    expect(squadLabel(st.order)).toBe('BLOCKADE');
    expect(orderLabel(engine.marines[0], st.order)).toBe('BLOCKADE');
  });

  it('every member walks to his post at once (no staging: the posts are far apart by design) and the quiet mission is won at a cycle boundary, before the reinforcement posts fill', () => {
    const engine = sh2();
    engine.command(engine.marines[0].id, { type: 'squadOrder', order: { type: 'blockade' } });
    engine.runTicks(1);
    const st = engine.squadState('Constantine')!;
    for (const m of engine.marines) {
      const p = st.posts.find(q => q.id === m.id)!;
      expect(m.task).toEqual({ type: 'moveTo', x: p.c.c, y: p.c.r, then: m instanceof HeavyFlamerMarine ? 'hold' : 'overwatch', facing: p.facing });
    }
    expect(postsReached(engine, 'Constantine')).toBe(false);
    engine.runTicks(200);
    expect(engine.state.result).toBe('win');
    expect(engine.tickCount % TUNING.cycleTicks).toBe(0);
    expect(engine.tickCount).toBeLessThanOrEqual(3 * TUNING.cycleTicks);
    for (const m of engine.marines) {
      const p = st.posts.find(q => q.id === m.id)!;
      if (m instanceof StormBolterMarine && m.pos.c === p.c.c && m.pos.r === p.c.r) expect(m.overwatch).toBe(true);
    }
  });

  it('every post is reached in time (the same board without the blockade win: the order held until every post is held)', () => {
    const engine = engineOn(quietOf('space_hulk_2', { objective: 'defend' }));
    engine.command(engine.marines[0].id, { type: 'squadOrder', order: { type: 'blockade' } });
    let reached = -1;
    for (let t = 0; t < 400 && reached < 0; t++) { engine.runTicks(1); if (postsReached(engine, 'Constantine')) reached = engine.tickCount; }
    expect(reached).toBeGreaterThan(0);
    expect(reached).toBeLessThanOrEqual(400);
    const st = engine.squadState('Constantine')!;
    for (const m of engine.marines) {
      const p = st.posts.find(q => q.id === m.id)!;
      expect({ c: m.pos.c, r: m.pos.r }).toEqual(p.c);
      if (m instanceof StormBolterMarine) expect(m.overwatch).toBe(true);
    }
  });

  it('re-plans when a member dies: his entries are covered again by the four left', () => {
    const engine = sh2();
    engine.command(engine.marines[0].id, { type: 'squadOrder', order: { type: 'blockade' } });
    engine.runTicks(2);
    const st = engine.squadState('Constantine')!;
    const dead = engine.marines[2];
    dead.die();
    engine.runTicks(1);
    expect(st.posts).toHaveLength(4);
    expect(st.posts.some(p => p.id === dead.id)).toBe(false);
    for (const e of engine.mission.entryPoints!) expect(st.posts.some(p => p.covers.has(`${e.x},${e.y}`))).toBe(true);
  });

  it('a member the player takes is left out of the plan', () => {
    const engine = sh2();
    engine.command(engine.marines[0].id, { type: 'squadOrder', order: { type: 'blockade' } });
    engine.runTicks(2);
    const taken = engine.marines[3];
    engine.command(taken.id, { type: 'order', order: { type: 'moveTo', x: taken.pos.c, y: taken.pos.r, then: 'hold' } });
    engine.runTicks(1);
    const st = engine.squadState('Constantine')!;
    expect(st.posts.some(p => p.id === taken.id)).toBe(false);
    expect(taken.task).toBeNull();
    expect(st.posts).toHaveLength(4);
  });

  it('clearSquadOrder empties it like any order', () => {
    const engine = sh2();
    engine.command(engine.marines[0].id, { type: 'squadOrder', order: { type: 'blockade' } });
    engine.runTicks(2);
    expect(engine.command(engine.marines[0].id, { type: 'clearSquadOrder' })).toBe(true);
    expect(engine.squadState('Constantine')!.order).toBeNull();
    for (const m of engine.marines) expect(m.task).toBeNull();
  });
});

describe('the bot issues the mission order', () => {
  it('on the quiet space_hulk_1 board: defend, the door cleared, then one missionOrder { objective } stored as the advance to the threshold; later re-issues are the squad own objective', () => {
    const engine = engineOn();
    const log = commandLog();
    const ev = changes();
    step(engine, AUTOPILOT.quietTicks + 8);
    const missions_ = log.filter(e => e.command.type === 'missionOrder');
    expect(missions_).toHaveLength(1);
    expect(missions_[0].command).toEqual(OBJECTIVE);
    expect(ev.filter(e => e.order).map(e => e.order!.type).slice(0, 3)).toEqual(['defend', 'clear', 'advance']);
    expect(ev.filter(e => e.order)[2].order).toEqual({ type: 'advance', x: 17, y: 20 });
    autoplay(engine, 60, 'squads');
    expect(engine.state.result).toBe('win');
    expect(log.filter(e => e.command.type === 'missionOrder')).toHaveLength(1);
    expect(log.filter(e => e.command.type === 'squadOrder' && e.command.order.type === 'objective').length).toBeGreaterThan(0);
  });

  it('kill-quota: the first call is the blockade itself (the mission order), the issuer never marches it, and the quiet space_hulk_2 is won by it', () => {
    const engine = engineOn(quietOf('space_hulk_2'));
    const log = commandLog();
    const ev = changes();
    step(engine, 1);
    expect(log.map(e => e.command)).toEqual([OBJECTIVE]);
    expect(engine.squadState('Constantine')!.order).toEqual({ type: 'blockade' });
    step(engine, 200);
    expect(ev.filter(e => e.order).map(e => e.order!.type)).toEqual(['blockade']);
    expect(engine.state.result).toBe('win');
  });

  it('two squads: the fan-out from the first squad past its gate is adopted by the other, which issues nothing on top of it', () => {
    const engine = engineOn(quietOf('space_hulk_3'));
    openAllDoors(engine);
    const log = commandLog();
    const ev = changes();
    step(engine, AUTOPILOT.quietTicks + 2);
    expect(log.filter(e => e.command.type === 'missionOrder')).toHaveLength(1);
    const names = engine.squadNames();
    for (const n of names) expect(engine.squadState(n)!.order!.type).toBe('advance');
    const before = ev.length;
    step(engine, 10);
    // Nothing overwrote either advance in the ten ticks after the fan-out.
    expect(ev.slice(before).filter(e => e.order && e.order.type !== 'advance')).toHaveLength(0);
    expect(log.filter(e => e.command.type === 'missionOrder')).toHaveLength(1);
    expect(squadOf(engine.marines[0])).toBe(names[0]);
  });
});
