import { describe, it, expect } from 'vitest';
import { GameEngine } from '../GameEngine.js';
import { SeededRng } from '../core/Dice.js';
import { PieceEvents } from '../events/PieceEvents.js';
import { loadMission } from '../missions/missionLoader.js';
import { TUNING } from '../core/CostTables.js';
import { HeavyFlamerMarine } from '../pieces/HeavyFlamerMarine.js';
import { StormBolterMarine, SergeantMarine } from '../pieces/StormBolterMarine.js';
import { Genestealer } from '../pieces/Genestealer.js';
import { Dir } from '../core/Direction.js';
import { chebyshev } from '../core/Direction.js';
import { orderLabel, squadLabel } from '../ai/orders.js';
import { planDefend, entrancesCovered, entrancesOf, defendArea, laneOf, planClear, battleOrder } from '../ai/squad.js';
import { GameLogger } from '../log/GameLogger.js';
import type { CompiledMission, DeploySquareJSON } from '../missions/missionTypes.js';
import type { MarineOrder, SquadOrder } from '../core/Commands.js';
import type { Piece } from '../pieces/Piece.js';
import { hasLineOfSight } from '../board/los.js';
import { inFireArc } from '../board/vision.js';
import { corridor } from './rt.fixtures.js';

/**
 * Squad orders and the chain of command (2.x stage 3, docs/realtime-plan.md
 * "Squad AI" and "Sergeant loss"). space_hulk_1 with the stealer side
 * switched off is the board: the start corridor (10,0)..(10,4), the door
 * square (10,5), room section 1 at (9..11, 6..8) with doors west (8,7) and
 * south (10,9), and the long corridor south of it.
 */
function quiet(deploy?: DeploySquareJSON[]): CompiledMission {
  const m = { ...loadMission('space_hulk_1'), initialBlips: 0, blipsPerTurn: 0, totalBlips: 0 };
  if (deploy) m.marineDeployment = deploy;
  return m;
}
const column = (): DeploySquareJSON[] => loadMission('space_hulk_1').marineDeployment!;
const noSergeant = (): DeploySquareJSON[] => column().map(d => d.type === 'sergeant' ? { ...d, type: 'storm_bolter' as const } : d);
const inRoom = (): DeploySquareJSON[] => [
  { x: 9, y: 6, facing: 'down', type: 'storm_bolter', squad: 'Calvin' },
  { x: 10, y: 6, facing: 'down', type: 'storm_bolter', squad: 'Calvin' },
  { x: 11, y: 6, facing: 'down', type: 'storm_bolter', squad: 'Calvin' },
  { x: 10, y: 7, facing: 'down', type: 'sergeant', squad: 'Calvin' },
  { x: 11, y: 8, facing: 'down', type: 'heavy_flamer', squad: 'Calvin' },
];
function engineOn(deploy?: DeploySquareJSON[], seed = 1): GameEngine {
  PieceEvents.all.clear();
  return new GameEngine(quiet(deploy), [], new SeededRng(seed));
}
const defend = (x: number, y: number): SquadOrder => ({ type: 'defend', x, y });
const advance = (x: number, y: number): SquadOrder => ({ type: 'advance', x, y });
const at = (m: Piece, x: number, y: number) => m.pos.c === x && m.pos.r === y;
const ow = (m: Piece) => m instanceof StormBolterMarine && m.overwatch;
const taskOf = (m: Piece) => m.task as MarineOrder | null;

describe('squad orders: the command, the slot and the relay', () => {
  it('a squadOrder through any member sets the squad state and emits squadOrderChanged with the due tick', () => {
    const engine = engineOn();
    const seen: unknown[] = [];
    PieceEvents.on('squadOrderChanged', p => seen.push(p));
    expect(engine.command(engine.marines[4].id, { type: 'squadOrder', order: defend(10, 7) })).toBe(true);
    const st = engine.squadState('Calvin')!;
    expect(st.order).toEqual(defend(10, 7));
    expect(st.coordinated).toBe(true);
    expect(st.dueTick).toBe(1);
    expect(seen).toEqual([{ squad: 'Calvin', order: defend(10, 7), coordinated: true, dueTick: 1 }]);
    expect(engine.squadNames()).toEqual(['Calvin']);
  });

  it('refuses a square off the board and a door edge that does not exist', () => {
    const engine = engineOn();
    expect(engine.command(engine.marines[0].id, { type: 'squadOrder', order: defend(99, 99) })).toBe(false);
    expect(engine.command(engine.marines[0].id, { type: 'squadOrder', order: { type: 'clear', x: 10, y: 2, facing: Dir.S } })).toBe(false);
    expect(engine.squadState('Calvin')).toBeUndefined();
  });

  it('never stamps the lease and never clears a live player order at issue', () => {
    const engine = engineOn();
    const m = engine.marines[3];
    engine.command(m.id, { type: 'order', order: { type: 'moveTo', x: 10, y: 6, then: 'hold' } });
    engine.command(m.id, { type: 'squadOrder', order: defend(10, 7) });
    expect(m.lastCommandTick).toBe(-Infinity);
    expect(m.order).toEqual({ type: 'moveTo', x: 10, y: 6, then: 'hold' });
  });

  it('when the order takes effect it supersedes the members\' earlier player orders (the deaf-marine rule)', () => {
    const engine = engineOn();
    const m = engine.marines[3];
    engine.command(m.id, { type: 'order', order: { type: 'moveTo', x: 10, y: 6, then: 'hold' } });
    engine.command(m.id, { type: 'squadOrder', order: defend(10, 7) });
    engine.tick();
    expect(m.order).toBeNull();
    expect(taskOf(m)).not.toBeNull();
  });

  it('with a living sergeant every member has a task on the tick after the command', () => {
    const engine = engineOn();
    engine.command(engine.marines[0].id, { type: 'squadOrder', order: defend(10, 7) });
    expect(engine.marines.every(m => m.task === null)).toBe(true);
    engine.tick();
    expect(engine.marines.every(m => m.task !== null)).toBe(true);
  });

  it('without a sergeant nothing happens until TUNING.relayTicks have passed, and the plan is uncoordinated', () => {
    const engine = engineOn(noSergeant());
    engine.command(engine.marines[0].id, { type: 'squadOrder', order: advance(10, 13) });
    const st = engine.squadState('Calvin')!;
    expect(st.coordinated).toBe(false);
    expect(st.dueTick).toBe(TUNING.relayTicks);
    engine.runTicks(TUNING.relayTicks - 1);
    expect(engine.marines.every(m => m.task === null)).toBe(true);
    engine.tick();
    // Uncoordinated advance: everyone walks to the target on his own.
    expect(engine.marines.every(m => m.task?.type === 'moveTo' && m.task.x === 10 && m.task.y === 13)).toBe(true);
  });

  it('a sergeant killed mid-order does not cancel it; the next order carries the delay', () => {
    const engine = engineOn();
    const sgt = engine.marines.find(m => m instanceof SergeantMarine)!;
    engine.command(engine.marines[0].id, { type: 'squadOrder', order: defend(10, 7) });
    engine.runTicks(3);
    sgt.die();
    engine.runTicks(3);
    const st = engine.squadState('Calvin')!;
    expect(st.order).toEqual(defend(10, 7));
    expect(st.coordinated).toBe(true);
    expect(engine.marines.filter(m => m.alive).every(m => m.task !== null)).toBe(true);
    engine.command(engine.marines[0].id, { type: 'squadOrder', order: advance(10, 13) });
    expect(st.coordinated).toBe(false);
    expect(st.dueTick).toBe(engine.tickCount + TUNING.relayTicks);
  });

  it('clearSquadOrder clears the squad slot and every task, emits null, and refuses when nothing is live', () => {
    const engine = engineOn();
    expect(engine.command(engine.marines[0].id, { type: 'clearSquadOrder' })).toBe(false);
    engine.command(engine.marines[0].id, { type: 'squadOrder', order: defend(10, 7) });
    engine.tick();
    const seen: unknown[] = [];
    PieceEvents.on('squadOrderChanged', p => seen.push(p));
    expect(engine.command(engine.marines[2].id, { type: 'clearSquadOrder' })).toBe(true);
    expect(engine.squadState('Calvin')!.order).toBeNull();
    expect(engine.marines.every(m => m.task === null)).toBe(true);
    expect(seen).toHaveLength(1);
    expect((seen[0] as { order: unknown }).order).toBeNull();
  });

  it('a direct command clears the player order only; the task survives and resumes after the lease', () => {
    const engine = engineOn();
    engine.command(engine.marines[0].id, { type: 'squadOrder', order: defend(10, 7) });
    engine.tick();
    const m = engine.marines[3];
    const task = taskOf(m);
    engine.command(m.id, { type: 'order', order: { type: 'moveTo', x: 10, y: 2, then: 'hold' } });
    engine.command(m.id, { type: 'turn', delta: 1 });
    expect(m.order).toBeNull();
    expect(taskOf(m)).toEqual(task);
    const facing = m.facing;
    engine.runTicks(TUNING.leaseTicks - 1);
    expect(m.facing).toBe(facing); // leased: the AI leaves him alone
  });

  it('individual beats squad: a later player order is executed first, the task once it completes', () => {
    const engine = engineOn(inRoom());
    engine.command(engine.marines[0].id, { type: 'squadOrder', order: defend(10, 7) });
    engine.tick();
    const m = engine.marines[0];
    engine.command(m.id, { type: 'order', order: { type: 'moveTo', x: 9, y: 8, then: 'hold' } });
    engine.runTicks(12);
    expect(chebyshev(m.pos, { c: 9, r: 8 })).toBeLessThanOrEqual(1); // a held target completes beside it
    expect(m.order).toBeNull();
    expect(taskOf(m)).not.toBeNull(); // the plan for him is still live
  });

  it('a player order given after the squad order survives the next re-plan (the cycle boundary)', () => {
    const engine = engineOn(inRoom());
    engine.command(engine.marines[0].id, { type: 'squadOrder', order: defend(10, 7) });
    engine.tick();
    const m = engine.marines[0];
    const far: MarineOrder = { type: 'moveTo', x: 10, y: 20, then: 'hold' };
    const level1: (MarineOrder | null)[] = [];
    PieceEvents.on('orderChanged', ({ pieceId, order, level }) => { if (pieceId === m.id && level === 1) level1.push(order); });
    engine.command(m.id, { type: 'order', order: far });
    engine.runTicks(TUNING.cycleTicks + 2); // crosses a cycle boundary re-plan
    // The planner writes level 2 only: the player's slot saw the set and, at
    // most, its own clear (here the stall guard: the south post plugs his
    // route), never a replacement.
    expect(level1[0]).toEqual(far);
    expect(level1.slice(1).every(o => o === null)).toBe(true);
    expect(taskOf(m)).not.toBeNull();
  });

  it('the relay counts engine ticks, so a paused clock freezes it and an order issued while paused starts on resume', () => {
    const engine = engineOn(noSergeant());
    engine.runTicks(5);
    engine.command(engine.marines[0].id, { type: 'squadOrder', order: advance(10, 13) });
    // No ticks run (the client is paused); nothing changes however long the wall clock waits.
    expect(engine.squadState('Calvin')!.dueTick).toBe(5 + TUNING.relayTicks);
    expect(engine.marines.every(m => m.task === null)).toBe(true);
    engine.runTicks(TUNING.relayTicks - 1);
    expect(engine.marines.every(m => m.task === null)).toBe(true);
    engine.tick();
    expect(engine.marines.some(m => m.task !== null)).toBe(true);
  });

  it('a wiped squad completes its order', () => {
    const engine = engineOn();
    engine.command(engine.marines[0].id, { type: 'squadOrder', order: defend(10, 7) });
    engine.tick();
    for (const m of [...engine.marines]) m.die();
    engine.state.result = 'ongoing';
    engine.tick();
    expect(engine.squadState('Calvin')!.order).toBeNull();
  });
});

describe('defend: entrances, lanes, posts', () => {
  it('a square defends its section (rooms and corridors both carry one); a section-less square its walk radius', () => {
    const engine = engineOn();
    const board = engine.state.board;
    const room = defendArea(board, 10, 7);
    expect(room.has('9,6')).toBe(true);
    expect(room.has('11,8')).toBe(true);
    expect(room.has('10,4')).toBe(false);
    // The start corridor is section 0: five squares, the door square belongs to the room.
    expect([...defendArea(board, 10, 2)].sort()).toEqual(['10,0', '10,1', '10,2', '10,3', '10,4'].sort());
    PieceEvents.all.clear();
    const bare = new GameEngine(corridor(12));
    expect([...defendArea(bare.state.board, 1, 5)].sort()).toEqual(['1,2', '1,3', '1,4', '1,5', '1,6', '1,7', '1,8'].sort());
  });

  it('section 1 has three entrances, each with a non-empty lane outside the area', () => {
    const engine = engineOn();
    const board = engine.state.board;
    const area = defendArea(board, 10, 7);
    const entrances = entrancesOf(board, area);
    expect(entrances).toEqual([{ c: 10, r: 4 }, { c: 7, r: 7 }, { c: 10, r: 10 }]);
    for (const e of entrances) {
      const lane = laneOf(board, e, area);
      expect(lane.size).toBeGreaterThan(0);
      for (const k of lane.keys()) expect(area.has(k)).toBe(false);
    }
  });

  it('every entrance square lies in the fire lane of at least one assigned bolter post (the set cover)', () => {
    const engine = engineOn();
    const posts = planDefend(engine, engine.marines, 10, 7);
    expect(posts).toHaveLength(5);
    expect(entrancesCovered(engine.state.board, 10, 7, posts)).toBe(true);
    expect(new Set(posts.map(p => `${p.c.c},${p.c.r}`)).size).toBe(5); // distinct posts
    // Each entrance is covered by a bolter (not the flamer).
    const flamer = engine.marines.find(m => m instanceof HeavyFlamerMarine)!;
    for (const e of [{ c: 10, r: 4 }, { c: 7, r: 7 }, { c: 10, r: 10 }]) {
      expect(posts.some(p => p.id !== flamer.id && p.covers.has(`${e.c},${e.r}`))).toBe(true);
    }
  });

  it('a post facing a closed entrance door scores that door\'s lane (doors are peeked open)', () => {
    const engine = engineOn();
    const posts = planDefend(engine, engine.marines, 10, 7);
    const south = posts.find(p => p.c.c === 10 && p.c.r === 9)!;
    expect(south).toBeDefined();
    expect(south.facing).toBe(Dir.S);
    expect(south.covers.has('10,10')).toBe(true);
    expect(engine.state.board.doorsAt({ c: 10, r: 9 })[0].isOpen).toBe(false); // put back
  });

  it('the flamer takes the interior square that sees the fewest lane squares', () => {
    const engine = engineOn();
    const posts = planDefend(engine, engine.marines, 10, 7);
    const flamer = engine.marines.find(m => m instanceof HeavyFlamerMarine)!;
    const fp = posts.find(p => p.id === flamer.id)!;
    const most = Math.max(...posts.filter(p => p.id !== flamer.id).map(p => p.covers.size));
    expect(fp.covers.size).toBeLessThan(most);
  });

  it('a column filing into the room sends its head deepest and its tail to the door it came through', () => {
    const engine = engineOn();
    const posts = planDefend(engine, engine.marines, 10, 7);
    const rear = engine.marines[0]; // (10,0), the tail of the column
    const p = posts.find(q => q.id === rear.id)!;
    expect(p.c).toEqual({ c: 10, r: 5 });
    expect(p.facing).toBe(Dir.N);
  });

  it('the tasks are moveTo the post with the facing: overwatch for bolters, hold for the flamer', () => {
    const engine = engineOn();
    engine.command(engine.marines[0].id, { type: 'squadOrder', order: defend(10, 7) });
    engine.tick();
    for (const m of engine.marines) {
      const t = taskOf(m)!;
      expect(t.type).toBe('moveTo');
      if (t.type !== 'moveTo') continue;
      expect(t.facing).toBeDefined();
      expect(t.then).toBe(m instanceof HeavyFlamerMarine ? 'hold' : 'overwatch');
    }
  });

  it('with no stealers the members reach their posts and stand on overwatch facing the assigned way', () => {
    const engine = engineOn();
    engine.command(engine.marines[0].id, { type: 'squadOrder', order: defend(10, 7) });
    engine.runTicks(80);
    for (const m of engine.marines) {
      const t = taskOf(m)!;
      expect(t.type).toBe('moveTo');
      if (t.type !== 'moveTo') continue;
      expect(at(m, t.x, t.y)).toBe(true);
      expect(m.facing).toBe(t.facing);
      if (!(m instanceof HeavyFlamerMarine)) expect(ow(m)).toBe(true);
    }
    expect(entrancesCovered(engine.state.board, 10, 7, planDefend(engine, engine.marines, 10, 7))).toBe(true);
  });

  it('a quiet cycle re-plans without emitting: the tasks do not change', () => {
    const engine = engineOn();
    engine.command(engine.marines[0].id, { type: 'squadOrder', order: defend(10, 7) });
    engine.runTicks(80);
    let n = 0;
    PieceEvents.on('orderChanged', () => { n += 1; });
    engine.runTicks(TUNING.cycleTicks * 2);
    expect(n).toBe(0);
  });

  it('a member death re-plans at once', () => {
    const engine = engineOn();
    engine.command(engine.marines[0].id, { type: 'squadOrder', order: defend(10, 7) });
    engine.runTicks(80);
    const south = engine.marines.find(m => taskOf(m)?.type === 'moveTo' && (taskOf(m) as { y: number }).y === 9)!;
    const before = engine.marines.filter(m => m.alive).map(m => JSON.stringify(m.task));
    south.die();
    engine.tick();
    // Somebody else now covers the south door: the plan changed and every entrance is still covered.
    const after = engine.marines.filter(m => m.alive).map(m => JSON.stringify(m.task));
    expect(after).not.toEqual(before.filter((_, i) => engine.marines[i]?.alive));
    expect(entrancesCovered(engine.state.board, 10, 7, planDefend(engine, engine.marines.filter(m => m.alive), 10, 7))).toBe(true);
  });

  it('uncoordinated defend: no member gets a task; the squad order stays live', () => {
    const engine = engineOn(noSergeant());
    engine.command(engine.marines[0].id, { type: 'squadOrder', order: defend(10, 7) });
    engine.runTicks(TUNING.relayTicks + 2);
    expect(engine.marines.every(m => m.task === null)).toBe(true);
    expect(engine.squadState('Calvin')!.order).toEqual(defend(10, 7));
  });

  it('a member steered by the player this cycle keeps his square as his post', () => {
    const engine = engineOn(inRoom());
    engine.command(engine.marines[0].id, { type: 'squadOrder', order: defend(10, 7) });
    engine.runTicks(30);
    const m = engine.marines[1];
    engine.command(m.id, { type: 'move', dir: 'backward' });
    const here = { ...m.pos };
    engine.runTicks(TUNING.leaseTicks + 1);
    const t = taskOf(m)!;
    expect(t.type === 'moveTo' && t.x === here.c && t.y === here.r).toBe(true);
  });
});

describe('advance: the column, the leapfrog, the rear guard', () => {
  it('battle order is bolter, sergeant, heavy, then the rest', () => {
    const engine = engineOn();
    const types = battleOrder(engine.marines).map(m => m instanceof HeavyFlamerMarine ? 'F' : m instanceof SergeantMarine ? 'S' : 'B');
    expect(types).toEqual(['B', 'S', 'F', 'B', 'B']);
  });

  it('the column reaches the target: leader on it, everyone closed up, the order clears itself', () => {
    const engine = engineOn();
    const seen: unknown[] = [];
    PieceEvents.on('squadOrderChanged', p => seen.push(p));
    engine.command(engine.marines[0].id, { type: 'squadOrder', order: advance(10, 13) });
    engine.runTicks(120);
    expect(engine.squadState('Calvin')!.order).toBeNull();
    expect(engine.marines.some(m => at(m, 10, 13))).toBe(true);
    const rows = engine.marines.map(m => m.pos.r).sort((a, b) => a - b);
    expect(rows[rows.length - 1] - rows[0]).toBeLessThanOrEqual(8);
    expect((seen[seen.length - 1] as { order: unknown }).order).toBeNull();
  });

  it('the rear guard stands on overwatch facing away from the target whenever he is not closing up', () => {
    const engine = engineOn();
    engine.command(engine.marines[0].id, { type: 'squadOrder', order: advance(10, 13) });
    let guarded = 0;
    for (let t = 0; t < 120; t++) {
      engine.tick();
      if (!engine.squadState('Calvin')!.order) break;
      const col = engine.squadState('Calvin')!.column;
      const rear = engine.marines.find(m => m.id === col[col.length - 1])!;
      const task = taskOf(rear);
      if (task?.type === 'moveTo' && at(rear, task.x, task.y)) {
        // Posture task: his own square, facing back (north, away from row 13).
        expect(task.facing).toBe(Dir.N);
        if (ow(rear)) { expect(rear.facing).toBe(Dir.N); guarded += 1; }
      }
    }
    expect(guarded).toBeGreaterThan(10);
  });

  it('the heavy flamer never leads once another marine can pass him', () => {
    const engine = engineOn();
    engine.command(engine.marines[0].id, { type: 'squadOrder', order: advance(10, 13) });
    const flamer = engine.marines.find(m => m instanceof HeavyFlamerMarine)!;
    engine.runTicks(20);
    const col = engine.squadState('Calvin')!.column;
    expect(col[0]).not.toBe(flamer.id);
    engine.runTicks(100);
    expect(engine.marines.find(m => at(m, 10, 13))).not.toBe(flamer);
  });

  it('a threat closing within TUNING.contactRange suspends the leader; the march resumes after the hold', () => {
    const engine = engineOn(inRoom());
    engine.command(engine.marines[0].id, { type: 'squadOrder', order: advance(10, 13) });
    engine.runTicks(6);
    const leaderId = engine.squadState('Calvin')!.column[0];
    const leader = engine.marines.find(m => m.id === leaderId)!;
    expect(taskOf(leader)).not.toBeNull();
    // A stealer in sight three squares down the corridor.
    const s = new Genestealer(engine.state.board, { c: 10, r: leader.pos.r + 3 }, Dir.N);
    engine.tick();
    expect(taskOf(leader)).toBeNull();
    s.die();
    engine.runTicks(TUNING.contactHoldTicks + 1);
    expect(taskOf(leader)).not.toBeNull();
  });
});

describe('clear: covers, opener, flamer', () => {
  it('from inside the room: a cover with a line of fire through the door, the nearest marine opens, the flamer one back', () => {
    const engine = engineOn(inRoom());
    const door = engine.state.board.doorsAt({ c: 10, r: 9 })[0];
    const plan = planClear(engine, engine.marines, 10, 9, door.facing)!;
    expect(plan.near).toEqual({ c: 10, r: 8 });
    expect(plan.far).toEqual({ c: 10, r: 9 });
    expect(plan.covers.length).toBeGreaterThanOrEqual(1);
    for (const cv of plan.covers) {
      // Geometry: the fire cone and a clear line through the (peeked) door;
      // bodies are ignored because the opener will stand in the doorway.
      const board = engine.state.board;
      door.open(true);
      const target = board.get(10, 10)!;
      const sees = inFireArc({ pos: cv.c, facing: cv.facing }, target) && hasLineOfSight(board, board.get(cv.c.c, cv.c.r)!, target);
      door.close(true);
      expect(sees).toBe(true);
    }
    expect(plan.opener).toBe(engine.marines[3].id); // the sergeant at (10,7), nearest the near flank
    expect(plan.flamer!.c).toEqual({ c: 10, r: 7 });
    expect(plan.flamer!.facing).toBe(Dir.S);
  });

  it('the opener waits for the covers, then opens; the order completes when the door is open', () => {
    const engine = engineOn(inRoom());
    const door = engine.state.board.doorsAt({ c: 10, r: 9 })[0];
    engine.command(engine.marines[0].id, { type: 'squadOrder', order: { type: 'clear', x: 10, y: 9, facing: door.facing } });
    engine.runTicks(40);
    expect(door.isOpen).toBe(true);
    expect(engine.squadState('Calvin')!.order).toBeNull();
    expect(engine.marines.every(m => m.task === null)).toBe(true);
  });

  it('a column in a corridor: the head opens, the covers behind him stand on overwatch', () => {
    const engine = engineOn();
    const door = engine.state.board.doorsAt({ c: 10, r: 5 })[0];
    const plan = planClear(engine, engine.marines, 10, 5, door.facing)!;
    expect(plan.opener).toBe(engine.marines[4].id); // the flamer at the head
    engine.command(engine.marines[0].id, { type: 'squadOrder', order: { type: 'clear', x: 10, y: 5, facing: door.facing } });
    engine.runTicks(30);
    expect(door.isOpen).toBe(true);
    expect(engine.squadState('Calvin')!.order).toBeNull();
  });

  it('the opener goes after TUNING.clearTimeoutTicks even if a cover never posts', () => {
    const engine = engineOn(inRoom());
    const door = engine.state.board.doorsAt({ c: 10, r: 9 })[0];
    engine.command(engine.marines[0].id, { type: 'squadOrder', order: { type: 'clear', x: 10, y: 9, facing: door.facing } });
    engine.tick();
    // Keep the covers off overwatch and dry of AP every tick so they never
    // post; the opener still goes after the timeout.
    const plan = planClear(engine, engine.marines, 10, 9, door.facing)!;
    const covers = plan.covers.map(cv => engine.marines.find(x => x.id === cv.id) as StormBolterMarine);
    const starve = () => { for (const m of covers) { m.overwatchOff(); m.ap = 0; } };
    for (let t = 0; t < TUNING.clearTimeoutTicks - 2; t++) { starve(); engine.tick(); }
    expect(door.isOpen).toBe(false);
    for (let t = 0; t < 14; t++) { starve(); engine.tick(); }
    expect(door.isOpen).toBe(true);
    expect(engine.squadState('Calvin')!.order).toBeNull();
  });

  it('uncoordinated clear: the nearest marine gets openDoor, nobody else a task', () => {
    const engine = engineOn(noSergeant());
    const door = engine.state.board.doorsAt({ c: 10, r: 5 })[0];
    engine.command(engine.marines[0].id, { type: 'squadOrder', order: { type: 'clear', x: 10, y: 5, facing: door.facing } });
    engine.runTicks(TUNING.relayTicks);
    const tasks = engine.marines.map(m => taskOf(m));
    expect(tasks.filter(t => t?.type === 'openDoor')).toHaveLength(1);
    expect(tasks.filter(t => t !== null)).toHaveLength(1);
    expect(taskOf(engine.marines[4])?.type).toBe('openDoor');
  });

  it('an open door completes the order at once', () => {
    const engine = engineOn(inRoom());
    const door = engine.state.board.doorsAt({ c: 10, r: 9 })[0];
    door.open();
    engine.command(engine.marines[0].id, { type: 'squadOrder', order: { type: 'clear', x: 10, y: 9, facing: door.facing } });
    engine.tick();
    expect(engine.squadState('Calvin')!.order).toBeNull();
  });
});

describe('labels, the log, the pins', () => {
  it('orderLabel: the player\'s word first, then the squad word, then the posture', () => {
    const engine = engineOn();
    const m = engine.marines[3];
    expect(orderLabel(m)).toBe('HOLD');
    engine.command(engine.marines[0].id, { type: 'squadOrder', order: defend(10, 7) });
    engine.tick();
    expect(orderLabel(m, engine.squadState('Calvin')!.order)).toBe('DEFEND');
    expect(orderLabel(m)).toBe('MOVE');
    engine.command(m.id, { type: 'order', order: { type: 'openDoor', x: 10, y: 5, facing: Dir.N } });
    expect(orderLabel(m, engine.squadState('Calvin')!.order)).toBe('DOOR');
    expect(squadLabel(advance(1, 1))).toBe('ADVANCE');
    expect(squadLabel({ type: 'clear', x: 1, y: 1, facing: 0 })).toBe('CLEAR');
    expect(squadLabel(null)).toBe('');
  });

  it('the gameplay log records squadOrder and clearSquadOrder commands', () => {
    const engine = engineOn();
    const logger = new GameLogger(engine, { mission: 'space_hulk_1', seed: 1 });
    engine.command(engine.marines[0].id, { type: 'squadOrder', order: defend(10, 7) });
    engine.runTicks(3);
    engine.command(engine.marines[0].id, { type: 'clearSquadOrder' });
    const log = logger.toJSON();
    const cmds = log.events.filter(e => e.type === 'command').map(e => (e as unknown as { command: { type: string } }).command.type);
    expect(cmds).toEqual(['squadOrder', 'clearSquadOrder']);
    expect(log.events.some(e => e.type === 'squadOrderChanged')).toBe(true);
    logger.detach();
  });

  it('determinism: one seed and one command log with squad orders replay to the same state hash', () => {
    const play = (): string[] => {
      const engine = engineOn(undefined, 7);
      const ids = engine.marines.map(m => m.id);
      const out: string[] = [];
      for (let t = 0; t < 120; t++) {
        if (t === 0) engine.command(ids[0], { type: 'squadOrder', order: defend(10, 7) });
        if (t === 60) engine.command(ids[1], { type: 'squadOrder', order: advance(10, 13) });
        if (t === 90) engine.command(ids[2], { type: 'move', dir: 'forward' });
        engine.tick();
        out.push(engine.stateHash());
      }
      return out;
    };
    expect(play()).toEqual(play());
  });

  it('an untagged marine answers to the squad "Squad" and, alone, relays nothing', () => {
    PieceEvents.all.clear();
    const engine = new GameEngine(corridor(8));
    expect(engine.squadNames()).toEqual(['Squad']);
    expect(engine.command(engine.marines[0].id, { type: 'squadOrder', order: defend(1, 0) })).toBe(true);
    expect(engine.squadState('Squad')!.coordinated).toBe(false);
  });
});
