import { describe, it, expect, vi } from 'vitest';
import { GameEngine } from '../GameEngine.js';
import { Board } from '../board/Board.js';
import { RollQueue } from '../core/Dice.js';
import { Genestealer } from '../pieces/Genestealer.js';
import { StormBolterMarine } from '../pieces/StormBolterMarine.js';
import { Dir } from '../core/Direction.js';
import { PieceEvents } from '../events/PieceEvents.js';
import { TUNING } from '../core/CostTables.js';
import { corridor, missStream } from './rt.fixtures.js';

const col = (n: number) => Array.from({ length: n }, (_, y) => ({ x: 1, y }));

describe('persistent overwatch with a fire-rate gate', () => {
  it('persists across cycle boundaries with no action taken', () => {
    const engine = new GameEngine(corridor(6));
    const marine = engine.marines[0] as StormBolterMarine;
    expect(engine.command(marine.id, { type: 'overwatch', on: true })).toBe(true);
    engine.runTicks(TUNING.cycleTicks * 2);
    expect(marine.overwatch).toBe(true);
    expect(marine.ap).toBe(4); // regenerated under overwatch, nothing spent
  });

  it('one reaction shot per TUNING.overwatchCooldown ticks: the shot in between is withheld', () => {
    const engine = new GameEngine(corridor(12));
    const board = engine.state.board;
    board.dice = new RollQueue(missStream()); // no kills, no doubles
    const marine = engine.marines[0] as StormBolterMarine;
    marine.overwatchOn();
    const stealer = new Genestealer(board, { c: 1, r: 8 }, Dir.N);
    const shots: number[] = [];
    const h = (p: { shooterId: string }) => { if (p.shooterId === marine.id) shots.push(engine.tickCount); };
    PieceEvents.on('shot', h);
    engine.runTicks(4); // the stealer steps every tick
    PieceEvents.off('shot', h);
    expect(stealer.pos.r).toBe(4);
    expect(shots).toEqual([1, 3]); // tick 2 fell inside the cooldown
    expect(marine.owReadyTick).toBe(3 + TUNING.overwatchCooldown);
  });

  it('the cooldown is an absolute tick stamp: a board-only test at tick 0 fires once, then again once the clock passes', () => {
    const board = new Board(3, 10, col(10) as never);
    board.dice = new RollQueue(missStream());
    const marine = new StormBolterMarine(board, { c: 1, r: 0 }, Dir.S);
    marine.overwatchOn();
    const stealer = new Genestealer(board, { c: 1, r: 5 }, Dir.N);
    expect(marine.overwatchShot(stealer)).toBe(false); // a miss, but it fired
    const fired = (board.dice as RollQueue).remaining;
    expect(marine.overwatchShot(stealer)).toBe(false);
    expect((board.dice as RollQueue).remaining).toBe(fired); // withheld: no dice drawn
    board.tick = TUNING.overwatchCooldown;
    marine.overwatchShot(stealer);
    expect((board.dice as RollQueue).remaining).toBe(fired - 2);
  });

  it('jam on doubles still ends overwatch', () => {
    const engine = new GameEngine(corridor(12));
    const board = engine.state.board;
    board.dice = new RollQueue([3, 3, ...missStream()]);
    const marine = engine.marines[0] as StormBolterMarine;
    marine.overwatchOn();
    new Genestealer(board, { c: 1, r: 8 }, Dir.N);
    engine.tick();
    expect(marine.jammed).toBe(true);
    expect(marine.overwatch).toBe(false);
  });

  it('the sustained-fire bonus decays after TUNING.sustainedDecayTicks idle ticks', () => {
    const board = new Board(3, 10, col(10) as never);
    const marine = new StormBolterMarine(board, { c: 1, r: 0 }, Dir.S);
    const stealer = new Genestealer(board, { c: 1, r: 5 }, Dir.N);
    const rolls: number[][] = [];
    const h = (p: { rolls: number[] }) => rolls.push(p.rolls);
    PieceEvents.on('shot', h);
    board.dice = new RollQueue([1, 2, 1, 2, 1, 2]);
    marine.shoot(stealer); // miss: bonus becomes 1
    marine.shoot(stealer); // rolls carry the +1
    expect(rolls[1]).toEqual([2, 3]);
    for (let t = 0; t < TUNING.sustainedDecayTicks; t++) marine.onTick(t);
    marine.ap = 4;
    marine.shoot(stealer); // the bonus is forgotten
    PieceEvents.off('shot', h);
    expect(rolls[2]).toEqual([1, 2]);
  });

  it('a direct command cancels overwatch first, at no AP cost', () => {
    const engine = new GameEngine(corridor(6));
    const marine = engine.marines[0] as StormBolterMarine;
    engine.command(marine.id, { type: 'overwatch', on: true });
    expect(marine.ap).toBe(2);
    engine.command(marine.id, { type: 'move', dir: 'forward' });
    expect(marine.overwatch).toBe(false);
    expect(marine.ap).toBe(1);
  });

  it('a stealer arriving directly ahead eats one reaction shot, then attacks on its next action tick', () => {
    const engine = new GameEngine(corridor(8));
    const board = engine.state.board;
    board.dice = new RollQueue([1, 2, ...new Array(40).fill(1)]); // reaction miss; every CC a draw
    const marine = engine.marines[0] as StormBolterMarine;
    marine.overwatchOn();
    new Genestealer(board, { c: 1, r: 2 }, Dir.N);
    const log: string[] = [];
    const hs = (p: { shooterId: string }) => log.push(`shot@${engine.tickCount}`);
    const hc = () => log.push(`cc@${engine.tickCount}`);
    PieceEvents.on('shot', hs);
    PieceEvents.on('closeCombat', hc);
    engine.runTicks(2);
    PieceEvents.off('shot', hs);
    PieceEvents.off('closeCombat', hc);
    expect(log).toEqual(['shot@1', 'cc@2']);
    expect(marine.overwatch).toBe(true); // the AI holds overwatch through the fight
  });

  it('Piece.onTick runs for every living piece each tick', () => {
    const engine = new GameEngine(corridor(8));
    const stealer = new Genestealer(engine.state.board, { c: 1, r: 6 }, Dir.N);
    stealer.ap = 0;
    engine.state.board.locked = true;
    const spy = vi.spyOn(stealer, 'onTick');
    engine.runTicks(5);
    expect(spy).toHaveBeenCalledTimes(5);
    expect(spy).toHaveBeenLastCalledWith(5);
  });
});
