import { describe, it, expect } from 'vitest';
import { GameEngine } from '../GameEngine.js';
import { RollQueue, SeededRng } from '../core/Dice.js';
import { Genestealer } from '../pieces/Genestealer.js';
import { StormBolterMarine } from '../pieces/StormBolterMarine.js';
import { HeavyFlamerMarine } from '../pieces/HeavyFlamerMarine.js';
import { AssaultCannonMarine, ChainFistMarine } from '../pieces/AssaultCannonMarine.js';
import { Dir } from '../core/Direction.js';
import { PieceEvents } from '../events/PieceEvents.js';
import { TUNING } from '../core/CostTables.js';
import { loadMission } from '../missions/missionLoader.js';
import type { MarineCommand } from '../core/Commands.js';
import type { SquareJSON } from '../missions/missionTypes.js';
import { corridor, room, missStream } from './rt.fixtures.js';

describe('engine.command: the one way the player acts', () => {
  it('applies a command at once, between ticks, and reports whether the piece acted', () => {
    const engine = new GameEngine(corridor(6));
    const marine = engine.marines[0];
    expect(engine.command(marine.id, { type: 'move', dir: 'forward' })).toBe(true);
    expect(marine.pos).toEqual({ c: 1, r: 1 });
    expect(marine.ap).toBe(3);
    expect(engine.tickCount).toBe(0);
    expect(engine.command(marine.id, { type: 'move', dir: 'backLeft' })).toBe(false); // rock
  });

  it('refuses unknown, dead and stealer ids, deployment, game over and a locked board', () => {
    const engine = new GameEngine(corridor(6));
    const marine = engine.marines[0];
    const stealer = new Genestealer(engine.state.board, { c: 1, r: 4 }, Dir.N);
    expect(engine.command('nobody', { type: 'door' })).toBe(false);
    expect(engine.command(stealer.id, { type: 'move', dir: 'forward' })).toBe(false);
    engine.state.board.locked = true;
    expect(engine.command(marine.id, { type: 'turn', delta: 1 })).toBe(false);
    engine.state.board.locked = false;
    marine.die();
    expect(engine.command(marine.id, { type: 'turn', delta: 1 })).toBe(false);

    const deploying = new GameEngine(loadMission('space_hulk_1'), [], new SeededRng(1));
    const id = deploying.marines[0].id;
    deploying.beginDeployment();
    expect(deploying.command(id, { type: 'overwatch', on: true })).toBe(false);

    const over = new GameEngine(corridor(6));
    over.marines[0].die();
    over.checkVictory();
    expect(over.state.result).toBe('loss');
  });

  it('every command type reaches its piece method', () => {
    const squares: SquareJSON[] = [];
    for (let y = 0; y < 7; y++) for (let x = 0; x < 5; x++) squares.push({ x, y, kind: 'room', section: 1 });
    // A closed door edge between (4,4) and (4,3), away from the diagonal moves
    // (a closed door on a corner blocks the diagonal squeezing past it).
    squares.find(s => s.x === 4 && s.y === 4)!.doorFacing = 'up';
    const mission = room(5, 7, { x: 2, y: 3, facing: 'up' }, { squares });
    const engine = new GameEngine(mission);
    const board = engine.state.board;
    board.dice = new RollQueue(missStream());
    const m = engine.marines[0] as StormBolterMarine;
    const cmd = (c: MarineCommand) => engine.command(m.id, c);

    // Moves: forward (up), the two forward diagonals, backward, the two back diagonals.
    expect(cmd({ type: 'move', dir: 'forward' })).toBe(true);      expect(m.pos).toEqual({ c: 2, r: 2 });
    expect(cmd({ type: 'move', dir: 'forwardLeft' })).toBe(true);  expect(m.pos).toEqual({ c: 1, r: 1 });
    expect(cmd({ type: 'move', dir: 'forwardRight' })).toBe(true); expect(m.pos).toEqual({ c: 2, r: 0 });
    m.ap = 4;
    expect(cmd({ type: 'move', dir: 'backward' })).toBe(true);     expect(m.pos).toEqual({ c: 2, r: 1 });
    expect(cmd({ type: 'move', dir: 'backLeft' })).toBe(true);     expect(m.pos).toEqual({ c: 1, r: 2 });
    m.ap = 4;
    expect(cmd({ type: 'move', dir: 'backRight' })).toBe(true);    expect(m.pos).toEqual({ c: 2, r: 3 });
    m.ap = 4;
    expect(cmd({ type: 'turn', delta: 1 })).toBe(true);  expect(m.facing).toBe(Dir.E);
    expect(cmd({ type: 'turn', delta: 2 })).toBe(true);  expect(m.facing).toBe(Dir.W);
    expect(cmd({ type: 'turn', delta: -1 })).toBe(true); expect(m.facing).toBe(Dir.S);
    m.ap = 4;
    // Door: stand at (4,4) facing north, the edge to (4,3) is the closed door.
    m.pos = { c: 4, r: 4 }; m.facing = Dir.N;
    const door = board.doorBetween({ c: 4, r: 4 }, { c: 4, r: 3 })!;
    expect(cmd({ type: 'door' })).toBe(true); expect(door.isOpen).toBe(true);
    expect(cmd({ type: 'door' })).toBe(true); expect(door.isOpen).toBe(false);
    // Shoot the door (edge straight ahead), then a stealer.
    m.ap = 4;
    expect(cmd({ type: 'shootDoor', x: 4, y: 4, facing: Dir.N })).toBe(true); // a miss still acts
    expect(cmd({ type: 'shootDoor', x: 2, y: 1, facing: Dir.N })).toBe(false); // no such door
    m.pos = { c: 2, r: 5 }; m.facing = Dir.N; m.ap = 4;
    const stealer = new Genestealer(board, { c: 2, r: 2 }, Dir.S);
    expect(cmd({ type: 'shoot', targetId: stealer.id })).toBe(true);
    expect(m.ap).toBe(3);
    expect(cmd({ type: 'shoot', targetId: 'ghost' })).toBe(false);
    // Overwatch on, off, unjam, the pause bill.
    expect(cmd({ type: 'overwatch', on: true })).toBe(true);  expect(m.overwatch).toBe(true);
    expect(cmd({ type: 'overwatch', on: false })).toBe(true); expect(m.overwatch).toBe(false);
    expect(cmd({ type: 'overwatch', on: false })).toBe(false);
    m.jammed = true;
    expect(cmd({ type: 'unjam' })).toBe(true); expect(m.jammed).toBe(false);
    const poolBefore = engine.pausePool;
    expect(cmd({ type: 'pauseSpent', ms: 1000 })).toBe(true);
    expect(engine.pausePool).toBe(poolBefore - 1000);
    // Melee: the stealer directly ahead.
    m.ap = 4; m.pos = { c: 2, r: 3 };
    expect(cmd({ type: 'melee' })).toBe(true);
    // Wrong-type commands are refused with nothing spent.
    m.ap = 4;
    expect(cmd({ type: 'flame', x: 2, y: 0 })).toBe(false);
    expect(cmd({ type: 'selfDestruct' })).toBe(false);
    expect(cmd({ type: 'autofire' })).toBe(false);
    expect(cmd({ type: 'reload' })).toBe(false);
    expect(cmd({ type: 'cutDoor' })).toBe(false);
    expect(m.ap).toBe(4);
  });

  it('flame, selfDestruct, autofire, reload and cutDoor reach the special weapons', () => {
    const squares: SquareJSON[] = [];
    for (let y = 0; y < 8; y++) squares.push({ x: 1, y, kind: 'corridor', section: y < 4 ? 1 : 2 });
    const flamerMission = corridor(8, { squares, marineDeployment: [{ x: 1, y: 1, facing: 'down', type: 'heavy_flamer' }] });
    const fe = new GameEngine(flamerMission);
    fe.state.board.dice = new RollQueue(new Array(40).fill(6));
    const flamer = fe.marines[0] as HeavyFlamerMarine;
    expect(fe.command(flamer.id, { type: 'flame', x: 1, y: 5 })).toBe(true);
    expect(flamer.ammo).toBe(5);
    expect(fe.state.board.isFlaming({ c: 1, r: 5 })).toBe(true);
    expect(fe.command(flamer.id, { type: 'flame', x: 1, y: 2 })).toBe(false); // own section
    expect(fe.command(flamer.id, { type: 'selfDestruct' })).toBe(true);
    expect(flamer.alive).toBe(false);

    const ce = new GameEngine(corridor(8, { marineDeployment: [{ x: 1, y: 0, facing: 'down', type: 'assault_cannon' }] }));
    ce.state.board.dice = new RollQueue(missStream());
    const cannon = ce.marines[0] as AssaultCannonMarine;
    new Genestealer(ce.state.board, { c: 1, r: 4 }, Dir.N);
    expect(ce.command(cannon.id, { type: 'autofire' })).toBe(true);
    expect(cannon.ammo).toBe(5);
    cannon.ammo = 0; cannon.ap = 4;
    expect(ce.command(cannon.id, { type: 'reload' })).toBe(true);
    expect(cannon.ammo).toBe(10);

    const doorSquares: SquareJSON[] = Array.from({ length: 6 }, (_, y) => ({ x: 1, y, kind: 'corridor' }));
    doorSquares[1].doorFacing = 'down';
    const fistE = new GameEngine(corridor(6, { squares: doorSquares, marineDeployment: [{ x: 1, y: 1, facing: 'down', type: 'chain_fist' }] }));
    const fist = fistE.marines[0] as ChainFistMarine;
    expect(fistE.command(fist.id, { type: 'cutDoor' })).toBe(true);
    expect(fistE.state.board.doorBetween({ c: 1, r: 1 }, { c: 1, r: 2 })!.destroyed).toBe(true);
  });

  it('emits a command event with the tick it followed, plus apChanged on success', () => {
    const engine = new GameEngine(corridor(6));
    const marine = engine.marines[0];
    marine.lastCommandTick = 1e9; // the AI must not spend for him first
    engine.runTicks(3);
    const commands: unknown[] = [];
    const aps: number[] = [];
    const hc = (p: unknown) => commands.push(p);
    const ha = (p: { pieceId: string; apRemaining: number }) => aps.push(p.apRemaining);
    PieceEvents.on('command', hc);
    PieceEvents.on('apChanged', ha);
    engine.command(marine.id, { type: 'turn', delta: 1 });
    engine.command(marine.id, { type: 'move', dir: 'backLeft' }); // refused
    PieceEvents.off('command', hc);
    PieceEvents.off('apChanged', ha);
    expect(commands).toEqual([
      { tick: 3, pieceId: marine.id, command: { type: 'turn', delta: 1 }, ok: true },
      { tick: 3, pieceId: marine.id, command: { type: 'move', dir: 'backLeft' }, ok: false },
    ]);
    expect(aps).toEqual([3]);
  });

  it('stamps the direct-control lease: the default AI leaves the marine alone for TUNING.leaseTicks', () => {
    const engine = new GameEngine(corridor(10));
    engine.state.board.dice = new RollQueue(missStream());
    const marine = engine.marines[0];
    new Genestealer(engine.state.board, { c: 1, r: 6 }, Dir.N);
    engine.state.board.locked = false;
    engine.command(marine.id, { type: 'turn', delta: 1 }); // faces east: sees nothing; the lease starts at tick 0
    engine.command(marine.id, { type: 'turn', delta: -1 }); // back to south, target in arc
    expect(marine.lastCommandTick).toBe(0);
    const shots: number[] = [];
    const h = (p: { shooterId: string }) => { if (p.shooterId === marine.id) shots.push(engine.tickCount); };
    PieceEvents.on('shot', h);
    engine.runTicks(TUNING.leaseTicks - 1);
    expect(shots).toEqual([]); // leased: the AI does not fire for him
    engine.tick();
    PieceEvents.off('shot', h);
    expect(shots).toEqual([TUNING.leaseTicks]);
  });

  it('a command issued from inside a tick is deferred to the next tick, never nested', () => {
    const engine = new GameEngine(corridor(6));
    const marine = engine.marines[0];
    marine.lastCommandTick = 1e9;
    let accepted: boolean | undefined;
    const h = () => { if (engine.tickCount === 2 && accepted === undefined) accepted = engine.command(marine.id, { type: 'move', dir: 'forward' }); };
    PieceEvents.on('tick', h);
    engine.runTicks(2);
    PieceEvents.off('tick', h);
    expect(accepted).toBe(true);
    // The tick event fires after the tick's work, so the deferred move lands in tick 3's step 2.
    expect(marine.pos).toEqual({ c: 1, r: 0 });
    engine.tick();
    expect(marine.pos).toEqual({ c: 1, r: 1 });
  });

  it('checks victory after a successful command: stepping onto the exit wins at once', () => {
    const engine = new GameEngine(corridor(6, { objective: 'reach-exit', exitPoints: [{ x: 1, y: 1 }] }));
    const marine = engine.marines[0];
    engine.command(marine.id, { type: 'move', dir: 'forward' });
    expect(engine.state.result).toBe('win');
  });

  it('stateHash is a short stable probe that changes with the board', () => {
    const a = new GameEngine(corridor(6), [], new SeededRng(4));
    const b = new GameEngine(corridor(6), [], new SeededRng(4));
    expect(a.stateHash()).toMatch(/^[0-9a-f]{8}$/);
    expect(a.stateHash()).toBe(b.stateHash());
    a.command(a.marines[0].id, { type: 'turn', delta: 1 });
    expect(a.stateHash()).not.toBe(b.stateHash());
  });
});
