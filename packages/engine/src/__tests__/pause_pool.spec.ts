import { describe, it, expect, afterEach } from 'vitest';
import { GameEngine } from '../GameEngine.js';
import { SeededRng } from '../core/Dice.js';
import { PieceEvents } from '../events/PieceEvents.js';
import { loadMission } from '../missions/missionLoader.js';
import { TUNING, applyTuning } from '../core/CostTables.js';
import type { CompiledMission, DeploySquareJSON } from '../missions/missionTypes.js';
import type { MarineCommand } from '../core/Commands.js';
import { corridor } from './rt.fixtures.js';

/**
 * The metered command pause (2.x stage 4 step 5): a pool of milliseconds on
 * the engine that starts full, recharges every tick by the plan's per-cycle
 * amount scaled by living sergeants, caps by the same count, and is spent by
 * the client's `pauseSpent` bill at the resume tick. The engine never reads
 * a clock; the log carries the bill, so a replay reproduces the pool.
 */
const quiet = (deploy?: DeploySquareJSON[]): CompiledMission => {
  const m: CompiledMission = { ...loadMission('space_hulk_1'), initialBlips: 0, blipsPerTurn: 0, totalBlips: 0 };
  if (deploy) m.marineDeployment = deploy;
  return m;
};
/** Two sergeants (one with the sword), a bolter and the flamer the flame
 *  mission needs alive, one squad. */
const twoSergeants: DeploySquareJSON[] = [
  { x: 10, y: 0, facing: 'down', type: 'sergeant', squad: 'Calvin' },
  { x: 10, y: 1, facing: 'down', type: 'sergeant_sword', squad: 'Calvin' },
  { x: 10, y: 2, facing: 'down', type: 'storm_bolter', squad: 'Calvin' },
  { x: 10, y: 3, facing: 'down', type: 'heavy_flamer', squad: 'Calvin' },
];
function engineOn(mission: CompiledMission = quiet(), seed = 1): GameEngine {
  PieceEvents.all.clear();
  return new GameEngine(mission, [], new SeededRng(seed));
}
const bill = (ms: number): MarineCommand => ({ type: 'pauseSpent', ms });
const CYCLE_MS = TUNING.pausePool.rechargeBase * 1000; // per cycle with no sergeant

describe('the pause pool: tuning, cap and start', () => {
  afterEach(() => applyTuning({ pausePool: { base: 10, perSergeant: 10, rechargeBase: 1, rechargePerSergeant: 1 }, cycleTicks: 40 }));

  it('TUNING carries the plan\'s numbers and applyTuning accepts the group', () => {
    expect(TUNING.pausePool).toEqual({ base: 10, perSergeant: 10, rechargeBase: 1, rechargePerSergeant: 1 });
    applyTuning({ pausePool: { base: 30 } });
    expect(TUNING.pausePool.base).toBe(30);
    expect(engineOn().pausePool).toBe(40000);
    expect(() => applyTuning({ pausePool: { seconds: 3 } } as any)).toThrow(/pausePool\.seconds/);
  });

  it('starts at the cap: 20 s with one sergeant, 10 s with none, 30 s with two (the sword sergeant counts)', () => {
    expect(engineOn().pausePool).toBe(20000);
    expect(engineOn().pausePoolCap()).toBe(20000);
    expect(engineOn(corridor(6)).pausePool).toBe(10000);
    const two = engineOn(quiet(twoSergeants));
    expect(two.livingSergeants()).toBe(2);
    expect(two.pausePool).toBe(30000);
  });

  it('a sergeant\'s death lowers the cap and the recharge; the banked surplus is kept, never recharged', () => {
    const engine = engineOn(quiet(twoSergeants));
    expect(engine.pausePoolRecharge()).toBe(3000);
    engine.marines[0].die();
    expect(engine.livingSergeants()).toBe(1);
    expect(engine.pausePoolCap()).toBe(20000);
    expect(engine.pausePoolRecharge()).toBe(2000);
    engine.runTicks(5);
    expect(engine.pausePool).toBe(30000); // above the cap: kept, not clamped, not recharged
    expect(engine.command(engine.marines[1].id, bill(15000))).toBe(true);
    expect(engine.pausePool).toBe(15000);
    engine.runTicks(TUNING.cycleTicks);
    expect(engine.pausePool).toBe(17000); // the new rate: 2 s a cycle
  });
});

describe('the pause pool: recharge', () => {
  afterEach(() => applyTuning({ cycleTicks: 40 }));

  it('recharges 50 ms a tick with one sergeant, 2 s over a cycle, and stops at the cap', () => {
    const engine = engineOn();
    const m = engine.marines[0];
    expect(engine.command(m.id, bill(20000))).toBe(true);
    expect(engine.pausePool).toBe(0);
    engine.tick();
    expect(engine.pausePool).toBe(50);
    engine.runTicks(TUNING.cycleTicks - 1);
    expect(engine.pausePool).toBe(2000);
    engine.runTicks(TUNING.cycleTicks * 9);
    expect(engine.pausePool).toBe(20000);
    engine.runTicks(3);
    expect(engine.pausePool).toBe(20000);
  });

  it('is exact for a cycle length that does not divide the per-cycle amount (the remainder accumulates)', () => {
    applyTuning({ cycleTicks: 30 });
    const engine = engineOn(corridor(6)); // no sergeant: 1 s a cycle over 30 ticks
    expect(engine.command(engine.marines[0].id, bill(10000))).toBe(true);
    engine.runTicks(30);
    expect(engine.pausePool).toBe(CYCLE_MS);
    engine.runTicks(30);
    expect(engine.pausePool).toBe(2 * CYCLE_MS);
  });

  it('the remainder carries exactly when the rate drops mid-cycle (a sergeant dies)', () => {
    applyTuning({ cycleTicks: 30 });
    const engine = engineOn(quiet(twoSergeants)); // 3 s a cycle: 100 ms a tick over 30 ticks
    expect(engine.command(engine.marines[2].id, bill(25000))).toBe(true);
    engine.runTicks(10);
    expect(engine.pausePool).toBe(6000);
    engine.marines[0].die(); // 2 s a cycle: 66.67 ms a tick, carried as a remainder
    engine.runTicks(30);
    expect(engine.pausePool).toBe(8000);
    engine.runTicks(3);
    expect(engine.pausePool).toBe(8200);
  });

  it('the recharge is silent: no pausePoolChanged over a cycle without a spend', () => {
    const engine = engineOn();
    const seen: unknown[] = [];
    PieceEvents.on('pausePoolChanged', e => seen.push(e));
    engine.command(engine.marines[0].id, bill(1000));
    expect(seen).toEqual([{ pool: 19000, cap: 20000 }]);
    engine.runTicks(TUNING.cycleTicks);
    expect(seen).toHaveLength(1);
  });
});

describe('the pauseSpent command', () => {
  it('subtracts the bill, clamps at zero, and refuses anything but a positive safe integer', () => {
    const engine = engineOn();
    const m = engine.marines[0];
    expect(engine.command(m.id, bill(2500))).toBe(true);
    expect(engine.pausePool).toBe(17500);
    expect(engine.command(m.id, bill(100000))).toBe(true);
    expect(engine.pausePool).toBe(0);
    engine.runTicks(2);
    for (const bad of [0, -5, 1.5, NaN, Infinity, 2 ** 53]) {
      expect(engine.command(m.id, bill(bad))).toBe(false);
    }
    expect(engine.pausePool).toBe(100);
  });

  it('is refused when the game is not live (deployment) and logged like any command', () => {
    const engine = engineOn();
    const log: { command: MarineCommand; ok: boolean }[] = [];
    PieceEvents.on('command', p => log.push({ command: p.command, ok: p.ok }));
    engine.beginDeployment();
    expect(engine.command(engine.reserve[0].id, bill(1000))).toBe(false);
    engine.finishDeployment();
    expect(engine.command(engine.marines[0].id, bill(1000))).toBe(true);
    expect(log).toEqual([{ command: { type: 'pauseSpent', ms: 1000 }, ok: true }]);
  });

  it('stamps no lease and drops no task on the marine it is addressed to', () => {
    const engine = engineOn();
    const m = engine.marines[0];
    expect(engine.command(m.id, { type: 'squadOrder', order: { type: 'defend', x: 10, y: 2 } })).toBe(true);
    engine.runTicks(3);
    const task = m.task;
    const lease = m.lastCommandTick;
    expect(task).not.toBeNull();
    expect(engine.command(m.id, bill(400))).toBe(true);
    expect(m.task).toBe(task);
    expect(m.lastCommandTick).toBe(lease);
  });

  it('the command point command is gone', () => {
    const engine = engineOn();
    expect((engine as any).cp).toBeUndefined();
    expect((engine as any).spendCP).toBeUndefined();
    expect(engine.command(engine.marines[0].id, { type: 'cp' } as any)).toBe(false);
  });
});

describe('the pause pool replays', () => {
  it('two engines from one seed and one log agree on a hash that carries the pool', () => {
    const a = engineOn(loadMission('space_hulk_1'), 7);
    const log: { tick: number; pieceIdx: number; command: MarineCommand }[] = [];
    const idx = (id: string) => a.marines.findIndex(m => m.id === id);
    PieceEvents.on('command', p => { if (p.ok) log.push({ tick: p.tick, pieceIdx: idx(p.pieceId), command: p.command }); });
    const play = (t: number) => {
      if (t === 5) a.command(a.marines[0].id, bill(3000));
      if (t === 12) a.command(a.marines[1].id, bill(500));
      if (t === 20) a.command(a.marines[0].id, bill(20000)); // past the pool: clamps
    };
    const hashes: string[] = [a.stateHash()];
    for (let t = 0; t < 60; t++) { play(t); a.tick(); hashes.push(a.stateHash()); }
    expect(a.pausePool).toBeLessThan(20000);
    // The hash carries the pool: a fresh engine that has only spent differs at tick 0.
    PieceEvents.all.clear();
    const spent = new GameEngine(loadMission('space_hulk_1'), [], new SeededRng(7));
    spent.command(spent.marines[0].id, bill(1));
    expect(spent.stateHash()).not.toBe(hashes[0]);

    PieceEvents.all.clear();
    const b = new GameEngine(loadMission('space_hulk_1'), [], new SeededRng(7));
    expect(b.stateHash()).toBe(hashes[0]);
    for (let t = 0; t < 60; t++) {
      for (const e of log) if (e.tick === t) expect(b.command(b.marines[e.pieceIdx].id, e.command)).toBe(true);
      b.tick();
      expect(b.stateHash()).toBe(hashes[t + 1]);
    }
    expect(b.pausePool).toBe(a.pausePool);
  });
});
