import { describe, it, expect } from 'vitest';
import { GameEngine } from '../GameEngine.js';
import { RollQueue, SeededRng } from '../core/Dice.js';
import { Genestealer } from '../pieces/Genestealer.js';
import { Dir } from '../core/Direction.js';
import { PieceEvents } from '../events/PieceEvents.js';
import { TUNING } from '../core/CostTables.js';
import { loadMission } from '../missions/missionLoader.js';
import { corridor, missStream } from './rt.fixtures.js';

describe('the engine clock (2.x stage 1)', () => {
  it('starts at tick 0, cycle 1, phase Live; each tick() adds one tick', () => {
    const engine = new GameEngine(corridor(6));
    expect(engine.tickCount).toBe(0);
    expect(engine.cycle).toBe(1);
    expect(engine.turnNumber).toBe(1); // alias of cycle
    expect(engine.phase).toBe('Live');
    engine.tick();
    engine.tick();
    expect(engine.tickCount).toBe(2);
    expect(engine.state.board.tick).toBe(2);
  });

  it('tick() is a no-op during deployment and after game over', () => {
    const deploying = new GameEngine(loadMission('space_hulk_1'), [], new SeededRng(1));
    expect(deploying.beginDeployment()).toBe(true);
    deploying.tick();
    expect(deploying.tickCount).toBe(0);

    const over = new GameEngine(corridor(6, { objective: 'reach-exit', exitPoints: [{ x: 1, y: 5 }] }));
    over.marines[0].pos = { c: 1, r: 5 };
    over.checkVictory();
    expect(over.state.result).toBe('win');
    over.tick();
    expect(over.tickCount).toBe(0);
  });

  it('runTicks(n) runs n ticks and stops early at game over', () => {
    const engine = new GameEngine(corridor(6));
    engine.runTicks(7);
    expect(engine.tickCount).toBe(7);
    const dying = new GameEngine(corridor(6, { objective: 'reach-exit', exitPoints: [{ x: 1, y: 5 }] }));
    // Attacker 6,6,6 against a defender's 1, every fight: the stealer wins.
    dying.state.board.dice = new RollQueue(Array.from({ length: 80 }, (_, i) => (i % 4 === 3 ? 1 : 6)));
    dying.marines[0].lastCommandTick = 1e9; // no AI reaction: the marine just stands there
    new Genestealer(dying.state.board, { c: 1, r: 2 }, Dir.N);
    dying.runTicks(40);
    expect(dying.state.result).toBe('loss');
    expect(dying.tickCount).toBeLessThan(40);
  });

  it('emits one tick event per tick carrying tick and cycle', () => {
    const engine = new GameEngine(corridor(6));
    const seen: { tick: number; cycle: number }[] = [];
    const h = (p: { tick: number; cycle: number }) => seen.push(p);
    PieceEvents.on('tick', h);
    engine.runTicks(3);
    PieceEvents.off('tick', h);
    expect(seen).toEqual([{ tick: 1, cycle: 1 }, { tick: 2, cycle: 1 }, { tick: 3, cycle: 1 }]);
  });

  it('the cycle boundary every TUNING.cycleTicks ticks advances the cycle and rolls CP', () => {
    const engine = new GameEngine(corridor(6));
    engine.state.board.dice = new RollQueue([5, ...missStream()]); // first draw after construction: the boundary CP roll
    engine.runTicks(TUNING.cycleTicks - 1);
    expect(engine.cycle).toBe(1);
    engine.tick();
    expect(engine.cycle).toBe(2);
    expect(engine.cp).toBe(5);
  });

  it('runTicks(TUNING.cycleTicks) is exactly one cycle: the boundary fires on the last tick', () => {
    const engine = new GameEngine(corridor(6));
    engine.runTicks(TUNING.cycleTicks);
    expect(engine.tickCount).toBe(TUNING.cycleTicks);
    expect(engine.turnNumber).toBe(2);
  });

  it('Anti: no AP reset at the boundary; a spent marine gets regeneration only', () => {
    const engine = new GameEngine(corridor(8));
    const marine = engine.marines[0];
    marine.facing = Dir.N; // nothing to see, nothing to do: the AI holds at 2 AP? No: it overwatches
    // Take the marine out of the AI's hands with a lease and spend two AP.
    engine.command(marine.id, { type: 'move', dir: 'forward' }); // north is rock: refused, but the lease stamps
    marine.ap = 2;
    marine.lastCommandTick = 1e9; // a lease that never expires: pure regeneration
    engine.runTicks(TUNING.regen.marine - 1);
    expect(marine.ap).toBe(2);
    engine.tick();
    expect(marine.ap).toBe(3); // one AP per TUNING.regen.marine ticks (3 since the stage 2 scan)
    engine.runTicks(TUNING.cycleTicks);
    expect(marine.ap).toBe(4); // capped, never reset
  });

  it('apChanged fires on every AP gained', () => {
    const engine = new GameEngine(corridor(8));
    const marine = engine.marines[0];
    marine.lastCommandTick = 1e9;
    marine.ap = 1;
    const gains: number[] = [];
    const h = (p: { pieceId: string; apRemaining: number }) => { if (p.pieceId === marine.id) gains.push(p.apRemaining); };
    PieceEvents.on('apChanged', h);
    engine.runTicks(8);
    PieceEvents.off('apChanged', h);
    expect(gains).toEqual([2, 3]);
  });
});

describe('reinforcements ride the cycle at per-entry slots', () => {
  const twoEntries = () => corridor(12, {
    entryPoints: [{ x: 1, y: 11 }, { x: 1, y: 10 }],
    blipsPerTurn: 2,
    marineDeployment: [{ x: 1, y: 0, facing: 'up' }], // faces the rock: sees no entry
  });

  it('two entries land at ticks 40 and 45 (entry index times spawnOffsetTicks)', () => {
    const engine = new GameEngine(twoEntries(), [], new SeededRng(1));
    engine.marines[0].lastCommandTick = 1e9; // under the player's hand: the booking is what is measured
    engine.runTicks(TUNING.cycleTicks - 1);
    expect(engine.stealerSide).toHaveLength(0); // cycle 1 spawns nothing
    engine.tick(); // the boundary: entry index 0 has offset 0
    expect(engine.stealerSide).toHaveLength(1);
    engine.runTicks(TUNING.spawnOffsetTicks - 1);
    expect(engine.stealerSide).toHaveLength(1);
    engine.tick(); // tick 45: entry index 1
    expect(engine.stealerSide).toHaveLength(2);
  });

  it('a blocked entry retries until the cycle ends, then takes another ranked entry', () => {
    const engine = new GameEngine(corridor(12, {
      entryPoints: [{ x: 1, y: 6 }, { x: 1, y: 11 }],
      blipsPerTurn: 1,
      marineDeployment: [{ x: 1, y: 0, facing: 'up' }],
    }), [], new SeededRng(1));
    const board = engine.state.board;
    // Entry 0 is the nearer (higher ranked) one; a stealer squats on it and a
    // locked board keeps every piece where it stands.
    new Genestealer(board, { c: 1, r: 6 }, Dir.N);
    board.locked = true;
    engine.runTicks(TUNING.cycleTicks * 2 - 2); // tick 78: the blip booked at 40 still waits
    expect(engine.stealerSide).toHaveLength(1);
    engine.tick(); // tick 79, the cycle's last tick: fallback to the free entry
    expect(engine.stealerSide).toHaveLength(2);
    expect(engine.stealerSide.some(p => p.kind === 'blip' && p.pos.r === 11)).toBe(true);
  });

  it('a spawn budget is honoured across cycles and dropped blips are never charged', () => {
    const engine = new GameEngine(corridor(12, {
      entryPoints: [{ x: 1, y: 11 }],
      blipsPerTurn: 3,
      totalBlips: 4,
      marineDeployment: [{ x: 1, y: 0, facing: 'up' }],
    }), [], new SeededRng(2));
    engine.state.board.locked = true; // nobody moves: the entry stays occupied after the first blip
    engine.runTicks(TUNING.cycleTicks * 3);
    // Cycle 2 books 3, lands 1 (the other two wait on the occupied square and
    // are dropped at the cycle's end); cycle 3 books the remaining budget again.
    expect(engine.stealerSide.length).toBe(1);
  });

  it('extermination needs an empty board, nothing booked and no budget left', () => {
    const trickle = new GameEngine(corridor(12, {
      objective: 'exterminate',
      entryPoints: [{ x: 1, y: 11 }],
      blipsPerTurn: 1, totalBlips: 1,
      marineDeployment: [{ x: 1, y: 0, facing: 'up' }],
    }), [], new SeededRng(1));
    trickle.marines[0].lastCommandTick = 1e9; // leased: the budget rule is what is measured
    trickle.tick();
    expect(trickle.state.result).toBe('ongoing'); // the empty opening board is not a win
    trickle.runTicks(TUNING.cycleTicks);
    expect(trickle.stealerSide.length).toBe(1);
    for (const p of [...trickle.stealerSide]) p.die();
    expect(trickle.state.result).toBe('ongoing'); // kill-quota style instant checks do not apply
    trickle.tick();
    expect(trickle.state.result).toBe('win'); // budget spent, board empty: exterminated
  });
});
