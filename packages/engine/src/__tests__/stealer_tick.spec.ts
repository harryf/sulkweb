import { describe, it, expect, vi, afterEach } from 'vitest';
import { GameEngine } from '../GameEngine.js';
import { RollQueue } from '../core/Dice.js';
import { Genestealer } from '../pieces/Genestealer.js';
import { StormBolterMarine } from '../pieces/StormBolterMarine.js';
import { Dir } from '../core/Direction.js';
import { PieceEvents } from '../events/PieceEvents.js';
import { TUNING } from '../core/CostTables.js';
import * as hive from '../ai/hive.js';
import { corridor, missStream } from './rt.fixtures.js';
import type { CompiledMission } from '../missions/missionTypes.js';

afterEach(() => vi.restoreAllMocks());

/** Two parallel lanes joined top and bottom (hive.spec's twoLanes), as a mission. */
function twoLanes(): CompiledMission {
  const col = (x: number) => Array.from({ length: 7 }, (_, y) => ({ x, y, kind: 'corridor' as const }));
  return corridor(7, {
    width: 3,
    squares: [...col(0), ...col(2), { x: 1, y: 0, kind: 'corridor' }, { x: 1, y: 6, kind: 'corridor' }],
    marineDeployment: [{ x: 2, y: 0, facing: 'down' }],
  });
}

describe('stealerTick: one action per piece per tick', () => {
  it('a stealer six squares out closes exactly one square per tick', () => {
    const engine = new GameEngine(corridor(10, { marineDeployment: [{ x: 1, y: 0, facing: 'up' }] }));
    engine.marines[0].lastCommandTick = 1e9; // leased: he would turn and shoot (facing rule), the stealer's pace is what is measured
    const stealer = new Genestealer(engine.state.board, { c: 1, r: 7 }, Dir.N);
    for (let expected = 6; expected >= 1; expected--) {
      engine.tick();
      expect(stealer.pos.r).toBe(expected);
    }
  });

  it('the plan is cached: recomputed every TUNING.hivePlanTicks ticks, and at once when a marine dies', () => {
    const plan = vi.spyOn(hive, 'planHive');
    const engine = new GameEngine(corridor(12, { marineDeployment: [{ x: 1, y: 0, facing: 'up' }, { x: 1, y: 1, facing: 'up' }] }));
    engine.state.board.dice = new RollQueue(missStream());
    new Genestealer(engine.state.board, { c: 1, r: 11 }, Dir.N);
    engine.runTicks(TUNING.hivePlanTicks);
    expect(plan).toHaveBeenCalledTimes(1);
    engine.tick(); // tick 9: due again
    expect(plan).toHaveBeenCalledTimes(2);
    engine.runTicks(2);
    expect(plan).toHaveBeenCalledTimes(2);
    engine.marines[1].die(); // a marine down: replan next tick
    engine.tick();
    expect(plan).toHaveBeenCalledTimes(3);
  });

  it('Anti: the threat map is not recomputed on a quiet tick', () => {
    const threat = vi.spyOn(hive, 'computeThreat');
    const engine = new GameEngine(corridor(12, { marineDeployment: [{ x: 1, y: 0, facing: 'up' }] }));
    const board = engine.state.board;
    const stealer = new Genestealer(board, { c: 1, r: 11 }, Dir.N);
    stealer.ap = 0;
    board.locked = true; // nothing can move: a quiet hulk
    engine.marines[0].lastCommandTick = 1e9;
    engine.runTicks(2); // the first tick computes once (no cache yet)
    const after = threat.mock.calls.length;
    expect(after).toBeGreaterThanOrEqual(1);
    engine.runTicks(10);
    expect(threat.mock.calls.length).toBe(after);
  });

  it('a board change is seen through the version: the next tick recomputes once', () => {
    const threat = vi.spyOn(hive, 'computeThreat');
    const engine = new GameEngine(corridor(12, { marineDeployment: [{ x: 1, y: 0, facing: 'up' }] }));
    const board = engine.state.board;
    new Genestealer(board, { c: 1, r: 11 }, Dir.N).ap = 0;
    board.locked = true;
    engine.marines[0].lastCommandTick = 1e9;
    engine.runTicks(3);
    const before = threat.mock.calls.length;
    board.touch();
    engine.tick();
    expect(threat.mock.calls.length).toBe(before + 1);
  });

  it('hive patience counts cycles, not plans: the wave waits out its turns under the clock', () => {
    const engine = new GameEngine(twoLanes());
    const board = engine.state.board;
    board.dice = new RollQueue(new Array(60).fill(1));
    const marine = engine.marines[0] as StormBolterMarine;
    marine.overwatchOn();
    marine.lastCommandTick = 1e9; // no default-AI action can move him off overwatch anyway
    const stealer = new Genestealer(board, { c: 1, r: 6 }, Dir.N);
    // hive.spec: staged already, then patience 1, 2, and the wave on the
    // fourth PLAN. Per cycle now: cycles 1..3 hold (fifteen plans), and the
    // first plan of cycle 4 (tick 121) launches.
    engine.runTicks(TUNING.cycleTicks * 3);
    expect(stealer.pos).toEqual({ c: 1, r: 6 });
    engine.tick();
    expect(stealer.pos).not.toEqual({ c: 1, r: 6 });
    expect((board.dice as RollQueue).remaining).toBe(60); // nothing draws a die: the boundary rolls no command points since stage 4 step 5
  });

  it('charge orientation runs at the cycle boundary, free, even for a piece that cannot move', () => {
    const engine = new GameEngine(corridor(10, { marineDeployment: [{ x: 1, y: 0, facing: 'up' }] }));
    const board = engine.state.board;
    const stealer = new Genestealer(board, { c: 1, r: 4 }, Dir.S); // facing away, within CHARGE_DIST
    board.locked = true;
    engine.runTicks(TUNING.cycleTicks - 1);
    expect(stealer.facing).toBe(Dir.S);
    const turns: string[] = [];
    const h = (p: { pieceId: string; facing: number }) => { if (p.pieceId === stealer.id) turns.push(`f${p.facing}`); };
    PieceEvents.on('pieceMoved', h);
    engine.tick();
    PieceEvents.off('pieceMoved', h);
    expect(stealer.facing).toBe(Dir.N);
    expect(stealer.ap).toBe(6);
    expect(turns).toEqual(['f0']);
  });
});
