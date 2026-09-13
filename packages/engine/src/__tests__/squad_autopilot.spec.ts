import { describe, it, expect } from 'vitest';
import { GameEngine } from '../GameEngine.js';
import { SeededRng } from '../core/Dice.js';
import { PieceEvents } from '../events/PieceEvents.js';
import { loadMission } from '../missions/missionLoader.js';
import { missions } from '../missions/index.js';
import { HeavyFlamerMarine } from '../pieces/HeavyFlamerMarine.js';
import { StormBolterMarine } from '../pieces/StormBolterMarine.js';
import { Genestealer } from '../pieces/Genestealer.js';
import { Dir } from '../core/Direction.js';
import { runMarineTurn, autoplay, assignEntryPosts } from '../ai/MarineAutopilot.js';
import { runSquadTurn, squadTarget, AUTOPILOT, firingSquare, sectionClearOfMarines } from '../ai/SquadAutopilot.js';
import { resolveObjective } from '../ai/objective.js';
import { planClear, walk, flameJobPending } from '../ai/squad.js';
import type { CompiledMission, DeploySquareJSON } from '../missions/missionTypes.js';
import type { MarineCommand, SquadOrder } from '../core/Commands.js';
import type { Piece } from '../pieces/Piece.js';

/**
 * The squad-order issuer (2.x stage 4, the balance instrument): the orders
 * a sensible player would give, one per change of state, on top of the
 * stage 3 planners. space_hulk_1 with the stealer side switched off is the
 * board (see squad.spec for its shape); its objective room is at (18..21,
 * 19..21) behind the door at (18,20) east, so the squad's threshold square
 * is (17,20).
 */
function quiet(deploy?: DeploySquareJSON[], patch: Partial<CompiledMission> = {}): CompiledMission {
  const m = { ...loadMission('space_hulk_1'), initialBlips: 0, blipsPerTurn: 0, totalBlips: 0, ...patch };
  if (deploy) m.marineDeployment = deploy;
  return m;
}
function engineOn(mission: CompiledMission = quiet(), seed = 1): GameEngine {
  PieceEvents.all.clear();
  return new GameEngine(mission, [], new SeededRng(seed));
}
interface Issued { tick: number; pieceId: string; command: MarineCommand; ok: boolean; /** a concrete squad order the engine stored (squadOrderChanged) */ stored?: SquadOrder }
function commandLog(): Issued[] {
  const log: Issued[] = [];
  PieceEvents.on('command', p => log.push(p as Issued));
  // The squad orders as stored: the issuer's objective goes out as a request
  // (missionOrder or squadOrder { objective }) and the engine resolves it.
  PieceEvents.on('squadOrderChanged', ({ order }) => { if (order) log.push({ tick: -1, pieceId: '', command: { type: 'clearSquadOrder' }, ok: true, stored: order }); });
  return log;
}
const squadOrders = (log: Issued[]): SquadOrder[] => log.flatMap(e => e.stored ? [e.stored] : []);
/** One issuer call, one tick: the autoplay loop's step under the squads policy. */
function step(engine: GameEngine, n = 1): void {
  for (let i = 0; i < n && engine.state.result === 'ongoing'; i++) { runMarineTurn(engine, 'squads'); engine.tick(); }
}
const openAllDoors = (engine: GameEngine) => { for (const d of engine.state.board.allDoors()) d.open(true); };
const flamerOf = (engine: GameEngine) => engine.marines.find(m => m instanceof HeavyFlamerMarine) as HeavyFlamerMarine;

describe('squad issuer: defend first, advance when quiet, clear the door ahead', () => {
  it('the first call gives every squad a defend order at the square of its member nearest the target', () => {
    const deploy: DeploySquareJSON[] = [
      { x: 10, y: 0, facing: 'down', type: 'sergeant', squad: 'Calvin' },
      { x: 10, y: 1, facing: 'down', type: 'heavy_flamer', squad: 'Calvin' }, // a flame mission without a flamer is lost at once
      { x: 10, y: 2, facing: 'down', type: 'storm_bolter', squad: 'Rex' },
      { x: 10, y: 3, facing: 'down', type: 'storm_bolter', squad: 'Rex' },
    ];
    const engine = engineOn(quiet(deploy));
    const log = commandLog();
    runSquadTurn(engine);
    const orders = squadOrders(log);
    expect(orders).toHaveLength(2);
    expect(orders.every(o => o.type === 'defend')).toBe(true);
    expect(engine.squadState('Calvin')!.order).toEqual({ type: 'defend', x: 10, y: 1 });
    expect(engine.squadState('Rex')!.order).toEqual({ type: 'defend', x: 10, y: 3 });
  });

  it('with nothing in sight for AUTOPILOT.quietTicks the defend becomes a march toward the threshold square: the door right ahead is cleared first, then the advance', () => {
    const engine = engineOn();
    const log = commandLog();
    step(engine, AUTOPILOT.quietTicks);
    expect(squadOrders(log)).toEqual([{ type: 'defend', x: 10, y: 4 }]);
    step(engine);
    expect(squadOrders(log)).toHaveLength(2);
    expect(squadOrders(log)[1]).toEqual({ type: 'clear', x: 10, y: 5, facing: Dir.N });
    step(engine, 6);
    expect(squadOrders(log)[2]).toEqual({ type: 'advance', x: 17, y: 20 });
  });

  it('a threat in sight within contact range restarts the quiet count: the advance comes quietTicks after the contact, not after the start', () => {
    const engine = engineOn();
    const log = commandLog();
    step(engine, 4);
    // A stealer in sight four squares down the start corridor for one tick
    // (any longer and he is at the flamer's throat).
    engine.state.board.doorsAt({ c: 10, r: 5 }).forEach(d => d.open(true));
    const s = new Genestealer(engine.state.board, { c: 10, r: 8 }, Dir.N);
    runMarineTurn(engine, 'squads');
    s.die();
    engine.tick();
    const contactTick = 4;
    step(engine, contactTick + AUTOPILOT.quietTicks - engine.tickCount - 1);
    expect(squadOrders(log).map(o => o.type)).toEqual(['defend']);
    step(engine, 2);
    expect(squadOrders(log).map(o => o.type)).toEqual(['defend', 'advance']);
  });

  it('a closed door on the leader next step is cleared before the advance is issued, and again on the way (the room door at (10,9))', () => {
    const engine = engineOn();
    const log = commandLog();
    step(engine, 40);
    const types = squadOrders(log);
    expect(types[0]).toEqual({ type: 'defend', x: 10, y: 4 });
    expect(types[1]).toEqual({ type: 'clear', x: 10, y: 5, facing: Dir.N });
    expect(types[2]).toEqual({ type: 'advance', x: 17, y: 20 });
    expect(types[3]).toEqual({ type: 'clear', x: 10, y: 9, facing: Dir.N });
    expect(types[4]).toEqual({ type: 'advance', x: 17, y: 20 });
    expect(engine.state.board.doorsAt({ c: 10, r: 5 })[0].isOpen).toBe(true);
    expect(engine.state.board.doorsAt({ c: 10, r: 9 })[0].isOpen).toBe(true);
  });

  it('a door is cleared at most AUTOPILOT.clearsPerDoor times; after that the column opens it on the march', () => {
    const engine = engineOn();
    const log = commandLog();
    const door = engine.state.board.doorsAt({ c: 10, r: 5 })[0];
    const clears = () => squadOrders(log).filter(o => o.type === 'clear' && o.x === 10 && o.y === 5).length;
    const until = (pred: () => boolean, max = 60) => { for (let t = 0; t < max && !pred(); t++) step(engine); expect(pred()).toBe(true); };
    // Each time a clear has opened it, shut it again behind the planners' back.
    until(() => clears() === 1 && engine.squadState('Calvin')!.order?.type !== 'clear' && door.isOpen);
    door.close(true);
    until(() => clears() === 2 && engine.squadState('Calvin')!.order?.type !== 'clear' && door.isOpen);
    door.close(true);
    step(engine, 30);
    expect(clears()).toBe(AUTOPILOT.clearsPerDoor);
    // The third closing is undone by the leader himself (the march opens doors).
    expect(door.isOpen).toBe(true);
    expect(engine.marines.some(m => m.pos.r > 5)).toBe(true);
  });

  it('never re-issues a live order: sixty quiet ticks with every door open hold exactly one defend and one advance', () => {
    const engine = engineOn();
    openAllDoors(engine);
    const log = commandLog();
    step(engine, 60);
    expect(squadOrders(log).map(o => o.type)).toEqual(['defend', 'advance']);
  });

  it('the individual pass gives no order to a bolter or a sergeant under the squads policy', () => {
    PieceEvents.all.clear();
    const engine = new GameEngine(loadMission('space_hulk_1'), [], new SeededRng(1));
    const log = commandLog();
    step(engine, 120);
    const toBolters = log.filter(e => e.command.type === 'order' && engine.state.pieces.find(p => p.id === e.pieceId) instanceof StormBolterMarine);
    expect(toBolters).toHaveLength(0);
  });
});

describe('squad issuer: the mission target per objective', () => {
  const near = (from: Piece, pts: { x: number; y: number }[]) => [...pts].sort((a, b) =>
    Math.hypot(a.x - from.pos.c, a.y - from.pos.r) - Math.hypot(b.x - from.pos.c, b.y - from.pos.r))[0];
  const sq = (engine: GameEngine, c: { c: number; r: number }) => engine.state.board.get(c.c, c.r)!;

  it('flame-objective: the threshold, the last square outside the objective room on the way', () => {
    const engine = engineOn();
    expect(squadTarget(engine, engine.marines)).toEqual({ c: 17, r: 20 });
    const obj = engine.mission.objectivePoint!;
    expect(sq(engine, { c: 17, r: 20 }).sectionId).not.toBe(sq(engine, { c: obj.x, r: obj.y }).sectionId);
  });

  it('flame-objectives: the threshold of the nearest uncleansed point, in another section than it', () => {
    PieceEvents.all.clear();
    const engine = new GameEngine(loadMission('space_hulk_4'), [], new SeededRng(1));
    const t = squadTarget(engine, engine.marines)!;
    const p = near(engine.marines[0], engine.mission.objectivePoints!);
    expect(t).toBeDefined();
    expect(sq(engine, t).sectionId).not.toBe(sq(engine, { c: p.x, r: p.y }).sectionId);
  });

  it('kill-quota: no march target; the objective is the blockade (stage 4 step 4), the individual bot keeps its own entry posts', () => {
    PieceEvents.all.clear();
    const engine = new GameEngine(loadMission('space_hulk_2'), [], new SeededRng(1));
    expect(squadTarget(engine, engine.marines)).toBeUndefined();
    expect(resolveObjective(engine, engine.marines)).toEqual({ type: 'blockade' });
    expect(assignEntryPosts(engine).get(engine.marines[0].id)).toBeDefined();
  });

  it('escort-cat, escape-count and exterminate-or-exit: the nearest exit; download: the Data Room square; defend: none', () => {
    for (const name of ['space_hulk_3', 'space_hulk_5', 'beta_1', 'debug_1'] as (keyof typeof missions)[]) {
      PieceEvents.all.clear();
      const engine = new GameEngine(loadMission(name), [], new SeededRng(1));
      const e = near(engine.marines[0], engine.mission.exitPoints!);
      expect(squadTarget(engine, engine.marines), name).toEqual({ c: e.x, r: e.y });
    }
    PieceEvents.all.clear();
    const dl = new GameEngine(loadMission('beta_2'), [], new SeededRng(1));
    expect(squadTarget(dl, dl.marines)).toEqual({ c: dl.mission.downloadPoint!.x, r: dl.mission.downloadPoint!.y });
    PieceEvents.all.clear();
    const def = new GameEngine(loadMission('space_hulk_6'), [], new SeededRng(1));
    expect(squadTarget(def, def.marines)).toBeUndefined();
  });
});

describe('squad issuer: arrival, the flamer, determinism', () => {
  it('a completed advance is followed by a defend at the target when no flame job is pending', () => {
    // The same board as a download mission: the Data Room square is the
    // target (and no objective point, or the flamer would walk to it alone).
    const engine = engineOn(quiet(undefined, { objective: 'download', downloadPoint: { x: 17, y: 20 }, objectivePoint: undefined }));
    openAllDoors(engine);
    const log = commandLog();
    step(engine, 200);
    const orders = squadOrders(log);
    expect(orders.map(o => o.type)).toEqual(['defend', 'advance', 'defend']);
    expect(orders[2]).toEqual({ type: 'defend', x: 17, y: 20 });
  });

  it('on a flame mission the column keeps the flamer at its head while his job is pending, and demotes him once it is not', () => {
    const engine = engineOn();
    engine.command(engine.marines[0].id, { type: 'squadOrder', order: { type: 'advance', x: 10, y: 13 } });
    engine.runTicks(20);
    expect(flameJobPending(engine, engine.marines)).toBe(true);
    expect(engine.squadState('Calvin')!.column[0]).toBe(flamerOf(engine).id);
    const plain = engineOn(quiet(undefined, { objective: 'defend' }));
    plain.command(plain.marines[0].id, { type: 'squadOrder', order: { type: 'advance', x: 10, y: 13 } });
    plain.runTicks(20);
    expect(flameJobPending(plain, plain.marines)).toBe(false);
    expect(plain.squadState('Calvin')!.column[0]).not.toBe(flamerOf(plain).id);
  });

  it('the flamer holds his fire while a squad-mate stands in the target section, parked by a refused command, and fires once it is clear', () => {
    const deploy: DeploySquareJSON[] = [
      { x: 10, y: 3, facing: 'down', type: 'heavy_flamer', squad: 'Calvin' },
      { x: 10, y: 7, facing: 'down', type: 'storm_bolter', squad: 'Calvin' },
    ];
    const engine = engineOn(quiet(deploy, { objectivePoint: { x: 10, y: 7 } }));
    engine.state.board.doorsAt({ c: 10, r: 5 }).forEach(d => d.open(true));
    const flamer = flamerOf(engine);
    const room = engine.state.board.get(10, 7)!;
    expect(flamer.inFlameReach(room)).toBe(true);
    expect(sectionClearOfMarines(engine, room)).toBe(false);
    const log = commandLog();
    runMarineTurn(engine, 'squads');
    expect(log.some(e => e.command.type === 'flame')).toBe(false);
    expect(flamer.lastCommandTick).toBe(engine.tickCount); // parked
    engine.marines[1].die();
    runMarineTurn(engine, 'squads');
    expect(log.some(e => e.command.type === 'flame' && e.ok)).toBe(true);
  });

  it('firingSquare: the nearest square outside the target section with a line to it, undefined behind a closed door', () => {
    const engine = engineOn();
    const flamer = flamerOf(engine);
    const room = engine.state.board.get(10, 7)!;
    expect(firingSquare(engine.state.board, flamer, room)).toBeUndefined(); // (10,5) closed
    engine.state.board.doorsAt({ c: 10, r: 5 }).forEach(d => d.open(true));
    const fs = firingSquare(engine.state.board, flamer, room);
    expect(fs).toBeDefined();
    expect(engine.state.board.get(fs!.c, fs!.r)!.sectionId).not.toBe(room.sectionId);
  });

  it('a clear posts its covers within three walk squares of the near flank (space_hulk_1 side passage door)', () => {
    const deploy: DeploySquareJSON[] = [
      { x: 13, y: 14, facing: 'down', type: 'heavy_flamer', squad: 'Calvin' },
      { x: 12, y: 14, facing: 'right', type: 'storm_bolter', squad: 'Calvin' },
      { x: 11, y: 14, facing: 'right', type: 'sergeant', squad: 'Calvin' },
      { x: 10, y: 14, facing: 'right', type: 'storm_bolter', squad: 'Calvin' },
      { x: 10, y: 13, facing: 'down', type: 'storm_bolter', squad: 'Calvin' },
    ];
    const engine = engineOn(quiet(deploy));
    const plan = planClear(engine, engine.marines, 13, 15, Dir.N)!;
    expect(plan.near).toEqual({ c: 13, r: 14 });
    const nearSide = walk(engine.state.board, [{ c: 13, r: 14 }], 3, new Set(['13,15']));
    for (const c of plan.covers) expect(nearSide.has(`${c.c.c},${c.c.r}`)).toBe(true);
  });

  it('the quiet space_hulk_1 game is won by the squads policy: three doors cleared, the room burned from the threshold', () => {
    const engine = engineOn();
    const log = commandLog();
    autoplay(engine, 60, 'squads');
    expect(engine.state.result).toBe('win');
    expect(engine.tickCount).toBeLessThan(200);
    expect(squadOrders(log).filter(o => o.type === 'clear').map(o => `${o.x},${o.y}`)).toEqual(['10,5', '10,9', '13,15']);
    expect(log.some(e => e.command.type === 'flame' && e.ok)).toBe(true);
    expect(engine.marines).toHaveLength(5);
  });

  it('two squads-policy games on one seed end on the same tick with the same state hash', () => {
    const play = () => {
      PieceEvents.all.clear();
      const engine = new GameEngine(loadMission('space_hulk_1'), [], new SeededRng(2));
      autoplay(engine, 60, 'squads');
      return `${engine.tickCount}|${engine.state.result}|${engine.stateHash()}`;
    };
    expect(play()).toBe(play());
  });
});
