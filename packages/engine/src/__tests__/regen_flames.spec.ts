import { describe, it, expect } from 'vitest';
import { GameEngine } from '../GameEngine.js';
import { Board } from '../board/Board.js';
import { Genestealer } from '../pieces/Genestealer.js';
import { Blip } from '../pieces/Blip.js';
import { StormBolterMarine } from '../pieces/StormBolterMarine.js';
import { Dir } from '../core/Direction.js';
import { PieceEvents } from '../events/PieceEvents.js';
import { TUNING, applyTuning, parseTuning } from '../core/CostTables.js';
import { igniteSquares, expireFlames, clearFlames } from '../rules/flame.js';
import { corridor } from './rt.fixtures.js';

describe('AP regeneration', () => {
  it('a marine gains one AP every TUNING.regen.marine ticks, a stealer every TUNING.regen.stealer', () => {
    const engine = new GameEngine(corridor(10, { marineDeployment: [{ x: 1, y: 0, facing: 'up' }] }));
    const board = engine.state.board;
    const marine = engine.marines[0];
    marine.lastCommandTick = 1e9; // keep the AI off him
    marine.ap = 0;
    board.locked = true; // the stealer below stays put and spends nothing
    const stealer = new Genestealer(board, { c: 1, r: 8 }, Dir.N);
    stealer.ap = 0;
    engine.runTicks(2);
    expect(marine.ap).toBe(0);
    expect(stealer.ap).toBe(1);
    engine.runTicks(2);
    expect(marine.ap).toBe(1);
    expect(stealer.ap).toBe(2);
    expect(TUNING.regen).toEqual({ marine: 4, stealer: 2, blip: 2 });
  });

  it('never regenerates past the cap, and a full pool banks nothing toward the next AP', () => {
    const engine = new GameEngine(corridor(6, { marineDeployment: [{ x: 1, y: 0, facing: 'up' }] }));
    const marine = engine.marines[0];
    marine.lastCommandTick = 1e9;
    engine.runTicks(TUNING.cycleTicks);
    expect(marine.ap).toBe(4);
    marine.ap = 3; // spent right after a long full stretch
    engine.runTicks(3);
    expect(marine.ap).toBe(3); // a whole interval must pass
    engine.tick();
    expect(marine.ap).toBe(4);
  });

  it('applyTuning changes the regeneration the engine reads, and rejects unknown keys', () => {
    const before = TUNING.regen.marine;
    try {
      applyTuning(parseTuning('regen.marine:2'));
      const engine = new GameEngine(corridor(6, { marineDeployment: [{ x: 1, y: 0, facing: 'up' }] }));
      const marine = engine.marines[0];
      marine.lastCommandTick = 1e9;
      marine.ap = 0;
      engine.runTicks(2);
      expect(marine.ap).toBe(1);
    } finally {
      applyTuning({ regen: { marine: before } });
    }
    expect(() => applyTuning({ nonsense: 1 } as never)).toThrow(/Unknown tuning key/);
    expect(() => applyTuning(parseTuning('regen.owl:3'))).toThrow(/regen.owl/);
    expect(parseTuning('overwatchCooldown:1,regen.blip:3')).toEqual({ overwatchCooldown: 1, regen: { blip: 3 } });
  });

  it('a blip may convert while fresh, not after acting, and again once idle or refilled', () => {
    const board = new Board(3, 6, Array.from({ length: 6 }, (_, y) => ({ x: 1, y })) as never);
    const blip = new Blip(board, { c: 1, r: 4 }, 1);
    expect(blip.canConvert()).toBe(true);
    expect(blip.tryMove(0, 1)).toBe(true);
    expect(blip.canConvert()).toBe(false);
    for (let i = 0; i < TUNING.blipIdleTicks - 1; i++) blip.onTick(i);
    expect(blip.canConvert()).toBe(false);
    blip.onTick(99);
    expect(blip.canConvert()).toBe(true);
    const other = new Blip(board, { c: 1, r: 1 }, 1);
    other.tryMove(0, 1);
    expect(other.canConvert()).toBe(false);
    other.resetAP(); // the pool is full again: a fresh activation
    expect(other.canConvert()).toBe(true);
  });
});

describe('flames burn on the board clock', () => {
  const lit = () => {
    const engine = new GameEngine(corridor(6, { marineDeployment: [{ x: 1, y: 0, facing: 'up' }] }));
    const board = engine.state.board;
    engine.runTicks(5);
    igniteSquares(board, 'test', [board.get(1, 3)!, board.get(1, 4)!]);
    return { engine, board };
  };

  it('igniteSquares stamps expiry board.tick + TUNING.flameTicks on every square', () => {
    const { board } = lit();
    expect(board.flaming.get('1,3')).toBe(5 + TUNING.flameTicks);
    expect(board.flaming.get('1,4')).toBe(5 + TUNING.flameTicks);
    expect(board.isFlaming({ c: 1, r: 3 })).toBe(true);
  });

  it('a flame lit at tick 5 still burns at tick 44 and is out at tick 45', () => {
    const { engine, board } = lit();
    engine.runTicks(39);
    expect(engine.tickCount).toBe(44);
    expect(board.isFlaming({ c: 1, r: 3 })).toBe(true);
    engine.tick();
    expect(board.isFlaming({ c: 1, r: 3 })).toBe(false);
    expect(board.flaming.size).toBe(0);
  });

  it('expireFlames clears only expired squares and announces exactly those', () => {
    const { engine, board } = lit();
    engine.runTicks(15); // tick 20
    igniteSquares(board, 'test', [board.get(1, 1)!]); // expires at 60
    const cleared: { x: number; y: number }[][] = [];
    const h = (p: { squares: { x: number; y: number }[] }) => cleared.push(p.squares);
    PieceEvents.on('flamesCleared', h);
    engine.runTicks(25); // tick 45
    PieceEvents.off('flamesCleared', h);
    expect(cleared).toEqual([[{ x: 1, y: 3 }, { x: 1, y: 4 }]]);
    expect(board.isFlaming({ c: 1, r: 1 })).toBe(true);
    expect(expireFlames(board)).toBe(0);
  });

  it('clearFlames still puts every flame out at once', () => {
    const { board } = lit();
    clearFlames(board);
    expect(board.flaming.size).toBe(0);
  });

  it('Board.version bumps on the changes the threat map depends on', () => {
    const board = new Board(4, 6, Array.from({ length: 6 }, (_, y) => ({ x: 1, y })) as never);
    const marine = new StormBolterMarine(board, { c: 1, r: 0 }, Dir.S);
    let v = board.version;
    const bumped = () => { const b = board.version > v; v = board.version; return b; };
    expect(marine.tryTurn(1)).toBe(true); expect(bumped()).toBe(true);
    marine.facing = Dir.S;
    expect(marine.moveForward()).toBe(true); expect(bumped()).toBe(true);
    expect(marine.overwatchOn()).toBe(true); expect(bumped()).toBe(true);
    marine.overwatchOff(); expect(bumped()).toBe(true);
    igniteSquares(board, 'x', [board.get(1, 4)!]); expect(bumped()).toBe(true);
    board.tick = 999; expireFlames(board); expect(bumped()).toBe(true);
    const stealer = new Genestealer(board, { c: 1, r: 5 }, Dir.N); expect(bumped()).toBe(true);
    stealer.die(); expect(bumped()).toBe(true);
  });
});
