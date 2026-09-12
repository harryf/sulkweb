import { describe, it, expect } from 'vitest';
import { GameEngine } from '../GameEngine.js';
import { RollQueue, SeededRng } from '../core/Dice.js';
import { Genestealer } from '../pieces/Genestealer.js';
import { StormBolterMarine } from '../pieces/StormBolterMarine.js';
import { HeavyFlamerMarine } from '../pieces/HeavyFlamerMarine.js';
import { AssaultCannonMarine, ChainFistMarine } from '../pieces/AssaultCannonMarine.js';
import { Dir } from '../core/Direction.js';
import { PieceEvents } from '../events/PieceEvents.js';
import { marineTick, runMarineAI } from '../ai/MarineAI.js';
import { autoplay } from '../ai/MarineAutopilot.js';
import { loadMission } from '../missions/missionLoader.js';
import type { CompiledMission, SquareJSON } from '../missions/missionTypes.js';
import { room, corridor, missStream } from './rt.fixtures.js';

/** A 5x9 room, marine at (2,6) facing north, misses forever. */
function scene(type?: 'heavy_flamer' | 'assault_cannon' | 'chain_fist', overrides: Partial<CompiledMission> = {}) {
  const engine = new GameEngine(room(5, 9, { x: 2, y: 6, facing: 'up', type }, overrides));
  engine.state.board.dice = new RollQueue(missStream());
  return { engine, board: engine.state.board, marine: engine.marines[0] };
}

describe('marine default AI: the decision list, first match wins', () => {
  it('jammed: unjam first', () => {
    const { engine, board, marine } = scene();
    (marine as StormBolterMarine).jammed = true;
    new Genestealer(board, { c: 2, r: 2 }, Dir.S);
    expect(marineTick(engine, marine)).toBe('unjam');
    expect((marine as StormBolterMarine).jammed).toBe(false);
    expect(marine.ap).toBe(3);
  });

  it('on overwatch: hold, even with a shootable stealer in view', () => {
    const { engine, board, marine } = scene();
    (marine as StormBolterMarine).overwatchOn();
    new Genestealer(board, { c: 2, r: 2 }, Dir.S);
    expect(marineTick(engine, marine)).toBeNull();
    expect(marine.ap).toBe(2);
  });

  it('a stealer in the fire arc with line of fire: shoot', () => {
    const { engine, board, marine } = scene();
    new Genestealer(board, { c: 2, r: 2 }, Dir.S);
    const shots: string[] = [];
    const h = (p: { shooterId: string }) => shots.push(p.shooterId);
    PieceEvents.on('shot', h);
    expect(marineTick(engine, marine)).toBe('shoot');
    PieceEvents.off('shot', h);
    expect(shots).toEqual([marine.id]);
    expect(marine.ap).toBe(3);
  });

  it('first match wins: an adjacent stealer straight ahead is shot, not fought', () => {
    const { engine, board, marine } = scene();
    new Genestealer(board, { c: 2, r: 5 }, Dir.S);
    expect(marineTick(engine, marine)).toBe('shoot');
  });

  it('adjacent ahead and no shot possible (a flamer): close combat', () => {
    const { engine, board, marine } = scene('heavy_flamer');
    new Genestealer(board, { c: 2, r: 5 }, Dir.S); // own section: no flame either
    const fights: string[] = [];
    const h = (p: { attackerId: string }) => fights.push(p.attackerId);
    PieceEvents.on('closeCombat', h);
    expect(marineTick(engine, marine)).toBe('melee');
    PieceEvents.off('closeCombat', h);
    expect(fights).toEqual([marine.id]);
  });

  it('adjacent elsewhere: turn toward it', () => {
    const { engine, board, marine } = scene();
    new Genestealer(board, { c: 2, r: 7 }, Dir.N); // directly behind
    expect(marineTick(engine, marine)).toBe('turn');
    expect(marine.facing).not.toBe(Dir.N);
    expect(marine.ap).toBe(2); // an about-face
  });

  it('visible but outside the fire arc: turn toward the nearest', () => {
    const { engine, board, marine } = scene();
    new Genestealer(board, { c: 4, r: 5 }, Dir.W); // in the front 180, outside the 90 cone
    expect(marineTick(engine, marine)).toBe('turn');
    expect(marine.facing).toBe(Dir.E);
  });

  it('not on overwatch with 2 AP or more: overwatch on; then hold', () => {
    const { engine, marine } = scene();
    expect(marineTick(engine, marine)).toBe('overwatch');
    expect((marine as StormBolterMarine).overwatch).toBe(true);
    expect(marineTick(engine, marine)).toBeNull();
    const poor = scene();
    poor.marine.ap = 1;
    expect(marineTick(poor.engine, poor.marine)).toBeNull();
  });

  it('door rule: an open door ahead with a stealer seen beyond and no friendly beyond is closed', () => {
    const squares: SquareJSON[] = Array.from({ length: 10 }, (_, y) => ({ x: 1, y, kind: 'corridor', section: y < 5 ? 1 : 2 }));
    squares[4].doorFacing = 'down'; // edge between (1,4) and (1,5)
    const engine = new GameEngine(corridor(10, { squares, marineDeployment: [{ x: 1, y: 4, facing: 'down', type: 'heavy_flamer' }] }));
    const board = engine.state.board;
    const door = board.doorBetween({ c: 1, r: 4 }, { c: 1, r: 5 })!;
    door.open();
    new Genestealer(board, { c: 1, r: 9 }, Dir.N); // five squares out: beyond a last stand
    expect(marineTick(engine, engine.marines[0])).toBe('closeDoor');
    expect(door.isOpen).toBe(false);
    // With a battle-brother beyond the door the flamer leaves it open.
    door.open();
    engine.marines[0].ap = 4;
    new StormBolterMarine(board, { c: 1, r: 6 }, Dir.S);
    expect(marineTick(engine, engine.marines[0])).not.toBe('closeDoor');
    expect(door.isOpen).toBe(true);
  });

  it('Anti: the default never opens a door', () => {
    const squares: SquareJSON[] = Array.from({ length: 8 }, (_, y) => ({ x: 1, y, kind: 'corridor' }));
    squares[2].doorFacing = 'down';
    const engine = new GameEngine(corridor(8, { squares, marineDeployment: [{ x: 1, y: 2, facing: 'down' }] }));
    const door = engine.state.board.doorBetween({ c: 1, r: 2 }, { c: 1, r: 3 })!;
    new Genestealer(engine.state.board, { c: 1, r: 6 }, Dir.N); // unseen behind the door
    engine.state.board.locked = false;
    for (let i = 0; i < 3; i++) marineTick(engine, engine.marines[0]);
    expect(door.isOpen).toBe(false);
  });

  it('heavy flamer: never overwatches and never fires on its own outside the last stand', () => {
    const { engine, board, marine } = scene('heavy_flamer');
    expect(marineTick(engine, marine)).toBeNull();
    expect((marine as unknown as { overwatch?: boolean }).overwatch).toBeUndefined();
    new Genestealer(board, { c: 2, r: 1 }, Dir.S); // five squares out, same section anyway
    const flamer = marine as HeavyFlamerMarine;
    marineTick(engine, marine);
    expect(flamer.ammo).toBe(6);
  });

  it('flamer last stand: a stealer within 2 in a section with no marine and nothing to keep intact', () => {
    const squares: SquareJSON[] = Array.from({ length: 10 }, (_, y) => ({ x: 1, y, kind: 'corridor', section: y < 3 ? 1 : 2 }));
    const build = (overrides: Partial<CompiledMission> = {}) => {
      const engine = new GameEngine(corridor(10, { squares, marineDeployment: [{ x: 1, y: 1, facing: 'down', type: 'heavy_flamer' }], ...overrides }));
      engine.state.board.dice = new RollQueue(new Array(20).fill(6));
      return engine;
    };
    const engine = build();
    new Genestealer(engine.state.board, { c: 1, r: 3 }, Dir.N);
    expect(marineTick(engine, engine.marines[0])).toBe('flame');
    expect((engine.marines[0] as HeavyFlamerMarine).ammo).toBe(5);
    expect(engine.state.board.isFlaming({ c: 1, r: 5 })).toBe(true);

    const guarded = build({ roomSquares: [{ x: 1, y: 8 }] }); // the control room is in the blast
    new Genestealer(guarded.state.board, { c: 1, r: 3 }, Dir.N);
    expect(marineTick(guarded, guarded.marines[0])).not.toBe('flame');
    expect((guarded.marines[0] as HeavyFlamerMarine).ammo).toBe(6);

    const crowded = build();
    new Genestealer(crowded.state.board, { c: 1, r: 3 }, Dir.N);
    new StormBolterMarine(crowded.state.board, { c: 1, r: 6 }, Dir.N); // a brother in the section
    expect(marineTick(crowded, crowded.marines[0])).not.toBe('flame');
  });

  it('assault cannon: reloads on its own only when empty and nothing is in sight; never dry overwatch', () => {
    const { engine, marine } = scene('assault_cannon');
    const cannon = marine as AssaultCannonMarine;
    cannon.ammo = 0;
    expect(marineTick(engine, marine)).toBe('reload');
    expect(cannon.ammo).toBe(10);
    const seen = scene('assault_cannon');
    const dry = seen.marine as AssaultCannonMarine;
    dry.ammo = 0;
    new Genestealer(seen.board, { c: 2, r: 1 }, Dir.S);
    expect(marineTick(seen.engine, seen.marine)).toBeNull();
    expect(dry.overwatch).toBe(false);
  });

  it('Anti: the AI never autofires the cannon and never cuts a door with the chain fist', () => {
    const { engine, board, marine } = scene('assault_cannon');
    new Genestealer(board, { c: 2, r: 2 }, Dir.S);
    new Genestealer(board, { c: 1, r: 1 }, Dir.S);
    expect(marineTick(engine, marine)).toBe('shoot');
    expect((marine as AssaultCannonMarine).ammo).toBe(9); // one round, not five

    const squares: SquareJSON[] = Array.from({ length: 8 }, (_, y) => ({ x: 1, y, kind: 'corridor' }));
    squares[2].doorFacing = 'down';
    const fistE = new GameEngine(corridor(8, { squares, marineDeployment: [{ x: 1, y: 2, facing: 'down', type: 'chain_fist' }] }));
    const door = fistE.state.board.doorBetween({ c: 1, r: 2 }, { c: 1, r: 3 })!;
    expect(fistE.marines[0]).toBeInstanceOf(ChainFistMarine);
    expect(marineTick(fistE, fistE.marines[0])).toBe('overwatch');
    expect(door.destroyed).toBe(false);
  });

  it('runMarineAI: one action per unleased marine per tick; a leased marine is skipped', () => {
    const engine = new GameEngine(room(5, 9, { x: 1, y: 6, facing: 'up' }, {
      marineDeployment: [{ x: 1, y: 6, facing: 'up' }, { x: 3, y: 6, facing: 'up' }],
    }));
    const board = engine.state.board;
    board.dice = new RollQueue(missStream());
    new Genestealer(board, { c: 1, r: 1 }, Dir.S);
    new Genestealer(board, { c: 3, r: 1 }, Dir.S);
    const shots: string[] = [];
    const h = (p: { shooterId: string }) => shots.push(p.shooterId);
    PieceEvents.on('shot', h);
    runMarineAI(engine);
    expect(shots).toHaveLength(2); // each fired once, not until dry
    engine.marines[0].lastCommandTick = engine.tickCount;
    runMarineAI(engine);
    PieceEvents.off('shot', h);
    expect(shots).toHaveLength(3);
    expect(shots[2]).toBe(engine.marines[1].id);
  });

  it('the autopilot issues commands and drives a whole game to a result', () => {
    const engine = new GameEngine(loadMission('debug_1'), [], new SeededRng(30));
    let commands = 0;
    const h = () => { commands += 1; };
    PieceEvents.on('command', h);
    autoplay(engine, 60);
    PieceEvents.off('command', h);
    expect(commands).toBeGreaterThan(20);
    expect(engine.state.result).toBe('win'); // the pinned e2e win seed (re-pinned 2026-09-12)
  }, 30000);
});
