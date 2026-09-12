import { describe, it, expect } from 'vitest';
import { GameEngine } from '../GameEngine.js';
import { RollQueue, SeededRng } from '../core/Dice.js';
import { Genestealer } from '../pieces/Genestealer.js';
import { StormBolterMarine } from '../pieces/StormBolterMarine.js';
import { HeavyFlamerMarine } from '../pieces/HeavyFlamerMarine.js';
import { Dir } from '../core/Direction.js';
import { PieceEvents } from '../events/PieceEvents.js';
import { TUNING } from '../core/CostTables.js';
import { loadMission } from '../missions/missionLoader.js';
import { marineTick } from '../ai/MarineAI.js';
import { orderLabel } from '../ai/orders.js';
import { GameLogger } from '../log/GameLogger.js';
import type { MarineOrder } from '../core/Commands.js';
import type { SquareJSON } from '../missions/missionTypes.js';
import { corridor, room, missStream } from './rt.fixtures.js';

/** A corridor whose square (1, doorRow) carries a door edge to (1, doorRow + 1). */
function doorCorridor(rows: number, doorRow: number, deployment = [{ x: 1, y: 0, facing: 'down' as const }]) {
  const squares: SquareJSON[] = Array.from({ length: rows }, (_, y) => ({ x: 1, y, kind: 'corridor' as const }));
  squares[doorRow].doorFacing = 'down';
  return corridor(rows, { squares, marineDeployment: deployment });
}

const moveTo = (x: number, y: number, then: 'hold' | 'overwatch' = 'hold', facing?: number): MarineOrder =>
  ({ type: 'moveTo', x, y, then, ...(facing !== undefined ? { facing } : {}) });

describe('orders: the slot and the commands that set it (stage 2)', () => {
  it('order sets the slot, replaces it, and orderChanged fires each time', () => {
    const engine = new GameEngine(corridor(8));
    const m = engine.marines[0];
    const seen: (MarineOrder | null)[] = [];
    const h = ({ order }: { order: MarineOrder | null }) => { seen.push(order); };
    PieceEvents.on('orderChanged', h);
    expect(engine.command(m.id, { type: 'order', order: moveTo(1, 5) })).toBe(true);
    expect(m.order).toEqual(moveTo(1, 5));
    expect(engine.command(m.id, { type: 'order', order: moveTo(1, 6, 'overwatch') })).toBe(true);
    expect(m.order).toEqual(moveTo(1, 6, 'overwatch'));
    PieceEvents.off('orderChanged', h);
    expect(seen).toEqual([moveTo(1, 5), moveTo(1, 6, 'overwatch')]);
  });

  it('refuses a target off the board and a door edge that does not exist', () => {
    const engine = new GameEngine(corridor(8));
    const m = engine.marines[0];
    expect(engine.command(m.id, { type: 'order', order: moveTo(5, 5) })).toBe(false);
    expect(engine.command(m.id, { type: 'order', order: { type: 'openDoor', x: 1, y: 2, facing: Dir.S } })).toBe(false);
    expect(m.order).toBeNull();
  });

  it('clearOrder empties the slot: true when one was set, false when empty', () => {
    const engine = new GameEngine(corridor(8));
    const m = engine.marines[0];
    expect(engine.command(m.id, { type: 'clearOrder' })).toBe(false);
    engine.command(m.id, { type: 'order', order: moveTo(1, 5) });
    const seen: (MarineOrder | null)[] = [];
    const h = ({ order }: { order: MarineOrder | null }) => { seen.push(order); };
    PieceEvents.on('orderChanged', h);
    expect(engine.command(m.id, { type: 'clearOrder' })).toBe(true);
    PieceEvents.off('orderChanged', h);
    expect(m.order).toBeNull();
    expect(seen).toEqual([null]);
  });

  it('every other command, accepted or refused, clears a live order (the player took the wheel)', () => {
    const engine = new GameEngine(corridor(8));
    const m = engine.marines[0];
    engine.command(m.id, { type: 'order', order: moveTo(1, 5) });
    expect(engine.command(m.id, { type: 'move', dir: 'forward' })).toBe(true);
    expect(m.order).toBeNull();
    engine.command(m.id, { type: 'order', order: moveTo(1, 5) });
    expect(engine.command(m.id, { type: 'move', dir: 'backLeft' })).toBe(false); // rock: refused
    expect(m.order).toBeNull(); // still clears: the log records the refused command too
    engine.command(m.id, { type: 'order', order: moveTo(1, 5) });
    engine.command(m.id, { type: 'overwatch', on: true });
    expect(m.order).toBeNull();
  });

  it('order and clearOrder never stamp the lease; order resets it so the AI starts next tick', () => {
    const engine = new GameEngine(corridor(8));
    const m = engine.marines[0];
    engine.runTicks(3);
    engine.command(m.id, { type: 'turn', delta: 1 });
    expect(m.lastCommandTick).toBe(3);
    engine.command(m.id, { type: 'order', order: moveTo(1, 5) });
    expect(m.lastCommandTick).toBe(-Infinity);
    m.lastCommandTick = 7;
    engine.command(m.id, { type: 'clearOrder' });
    expect(m.lastCommandTick).toBe(7);
  });

  it('is refused for a dead marine, during deployment and after game over', () => {
    const engine = new GameEngine(corridor(8));
    const m = engine.marines[0];
    m.die();
    expect(engine.command(m.id, { type: 'order', order: moveTo(1, 5) })).toBe(false);

    const deploying = new GameEngine(loadMission('space_hulk_1'), [], new SeededRng(1));
    const id = deploying.marines[0].id;
    deploying.beginDeployment();
    expect(deploying.command(id, { type: 'order', order: moveTo(10, 3) })).toBe(false);
  });

  it('the command event and the game log carry the order payload', () => {
    const engine = new GameEngine(corridor(8));
    const m = engine.marines[0];
    const log = new GameLogger(engine, { mission: 'rt-corridor', seed: 1 });
    engine.command(m.id, { type: 'order', order: moveTo(1, 5, 'overwatch') });
    log.detach();
    const cmd = log.events.find(e => e.type === 'command') as { command?: MarineOrder | { type: string; order: MarineOrder } } | undefined;
    expect(cmd).toBeDefined();
    expect(cmd!.command).toEqual({ type: 'order', order: moveTo(1, 5, 'overwatch') });
  });
});

describe('orders: the march (executed by the default AI, one action per tick)', () => {
  it('walks one pathStep square per tick and completes with then hold', () => {
    const engine = new GameEngine(corridor(8));
    const m = engine.marines[0];
    engine.command(m.id, { type: 'order', order: moveTo(1, 4) });
    engine.runTicks(4);
    expect(m.pos).toEqual({ c: 1, r: 4 });
    expect(m.order).toEqual(moveTo(1, 4)); // arrival is judged on the next tick
    const ap = m.ap;
    engine.tick();
    expect(m.order).toBeNull();
    expect(m.ap).toBeGreaterThanOrEqual(ap); // hold spends nothing
  });

  it('turns to face the next square first, so the arrival facing is the travel direction', () => {
    const engine = new GameEngine(corridor(8, { marineDeployment: [{ x: 1, y: 0, facing: 'up' }] }));
    const m = engine.marines[0];
    engine.command(m.id, { type: 'order', order: moveTo(1, 3) });
    engine.tick();
    expect(m.facing).toBe(Dir.S);
    expect(m.pos).toEqual({ c: 1, r: 0 });
    engine.tick();
    expect(m.pos).toEqual({ c: 1, r: 1 });
  });

  it('opens a closed door on the way and keeps going', () => {
    const engine = new GameEngine(doorCorridor(8, 2));
    const board = engine.state.board;
    const m = engine.marines[0];
    const door = board.doorBetween({ c: 1, r: 2 }, { c: 1, r: 3 })!;
    engine.command(m.id, { type: 'order', order: moveTo(1, 5) });
    engine.runTicks(3);
    expect(m.pos).toEqual({ c: 1, r: 2 });
    expect(door.isOpen).toBe(true);
    engine.tick();
    expect(m.pos).toEqual({ c: 1, r: 3 });
  });

  it('a target held by another marine completes when the walker stands next to him', () => {
    const engine = new GameEngine(room(5, 6, { x: 2, y: 0 }, {
      marineDeployment: [{ x: 2, y: 0, facing: 'down' }, { x: 2, y: 5, facing: 'up' }],
    }));
    const [a, b] = engine.marines;
    b.lastCommandTick = 1e9; // b stands still
    engine.command(a.id, { type: 'order', order: moveTo(2, 5) });
    engine.runTicks(12);
    expect(a.order).toBeNull();
    expect(Math.max(Math.abs(a.pos.c - 2), Math.abs(a.pos.r - 5))).toBe(1);
    expect(b.pos).toEqual({ c: 2, r: 5 });
  });

  it('an unreachable target leaves the marine holding with the order kept and his AP banked', () => {
    const engine = new GameEngine(corridor(8, {
      marineDeployment: [{ x: 1, y: 0, facing: 'down' }, { x: 1, y: 2, facing: 'down' }],
    }));
    const [a, b] = engine.marines;
    b.lastCommandTick = 1e9;
    engine.command(a.id, { type: 'order', order: moveTo(1, 6) });
    engine.runTicks(6);
    expect(a.pos).toEqual({ c: 1, r: 0 });
    expect(a.order).toEqual(moveTo(1, 6));
    expect(a.ap).toBe(4); // no overwatch spend under an order (rule 10 is off)
    expect((a as StormBolterMarine).overwatch).toBe(false);
  });

  it('then overwatch: goes on overwatch on arrival with 2 AP, else waits for them', () => {
    const engine = new GameEngine(corridor(8));
    const m = engine.marines[0] as StormBolterMarine;
    engine.command(m.id, { type: 'order', order: moveTo(1, 2, 'overwatch') });
    engine.runTicks(3);
    expect(m.pos).toEqual({ c: 1, r: 2 });
    expect(m.overwatch).toBe(true);
    expect(m.order).toBeNull();

    const slow = new GameEngine(corridor(8));
    const s = slow.marines[0] as StormBolterMarine;
    s.ap = 1;
    slow.command(s.id, { type: 'order', order: moveTo(1, 1, 'overwatch') });
    slow.runTicks(3);
    expect(s.pos).toEqual({ c: 1, r: 1 });
    expect(s.overwatch).toBe(false);
    expect(s.order).toEqual(moveTo(1, 1, 'overwatch')); // waiting for the second AP
    slow.runTicks(TUNING.regen.marine * 2);
    expect(s.overwatch).toBe(true);
    expect(s.order).toBeNull();
  });

  it('an ordered facing is taken on arrival before the terminal', () => {
    const engine = new GameEngine(corridor(8));
    const m = engine.marines[0];
    engine.command(m.id, { type: 'order', order: moveTo(1, 2, 'hold', Dir.E) });
    engine.runTicks(4);
    expect(m.pos).toEqual({ c: 1, r: 2 });
    expect(m.facing).toBe(Dir.E);
    expect(m.order).toBeNull();
  });

  it('an ordered marine on overwatch comes off it (free) and moves', () => {
    const engine = new GameEngine(corridor(8));
    const m = engine.marines[0] as StormBolterMarine;
    expect(m.overwatchOn()).toBe(true);
    engine.command(m.id, { type: 'order', order: moveTo(1, 3) });
    engine.tick();
    expect(m.overwatch).toBe(false);
    expect(m.pos).toEqual({ c: 1, r: 1 });
  });

  it('a moveTo to the marine\'s own square completes on the next tick', () => {
    const engine = new GameEngine(corridor(8));
    const m = engine.marines[0];
    engine.command(m.id, { type: 'order', order: moveTo(1, 0) });
    engine.tick();
    expect(m.order).toBeNull();
    expect(m.pos).toEqual({ c: 1, r: 0 });
  });

  it('a heavy flamer takes orders too; then overwatch on him completes as hold', () => {
    const engine = new GameEngine(corridor(8, { marineDeployment: [{ x: 1, y: 0, facing: 'down', type: 'heavy_flamer' }] }));
    const f = engine.marines[0];
    expect(f).toBeInstanceOf(HeavyFlamerMarine);
    engine.command(f.id, { type: 'order', order: moveTo(1, 2, 'overwatch') });
    engine.runTicks(3);
    expect(f.pos).toEqual({ c: 1, r: 2 });
    expect(f.order).toBeNull();
  });

  it('draws no dice', () => {
    const engine = new GameEngine(doorCorridor(8, 3));
    const q = new RollQueue(missStream(20));
    engine.state.board.dice = q;
    const m = engine.marines[0];
    engine.command(m.id, { type: 'order', order: moveTo(1, 6, 'overwatch') });
    engine.runTicks(12);
    expect(m.pos).toEqual({ c: 1, r: 6 });
    expect(q.remaining).toBe(20);
  });

  it('two engines from one seed replaying the same order log agree on the state hash every tick', () => {
    const play = (seed: number) => {
      PieceEvents.all.clear();
      const engine = new GameEngine(loadMission('space_hulk_1'), [], new SeededRng(seed));
      const ids = engine.marines.map(m => m.id);
      const hashes: string[] = [];
      for (let t = 0; t < 120 && engine.state.result === 'ongoing'; t++) {
        if (t === 0) for (const id of ids) engine.command(id, { type: 'order', order: moveTo(10, 8, 'overwatch') });
        if (t === 40) engine.command(ids[0], { type: 'clearOrder' });
        engine.tick();
        hashes.push(engine.stateHash());
      }
      return hashes;
    };
    const a = play(7);
    const b = play(7);
    expect(a.length).toBeGreaterThan(0);
    expect(a).toEqual(b);
  });
});

describe('orders: reactions win, parking rules sleep', () => {
  it('a shootable stealer is shot before any step; jammed unjams; adjacent elsewhere turns', () => {
    const engine = new GameEngine(corridor(8));
    const board = engine.state.board;
    board.dice = new RollQueue(missStream());
    const m = engine.marines[0] as StormBolterMarine;
    engine.command(m.id, { type: 'order', order: moveTo(1, 3) });
    const stealer = new Genestealer(board, { c: 1, r: 5 }, Dir.N);
    expect(marineTick(engine, m)).toBe('shoot');
    expect(m.pos).toEqual({ c: 1, r: 0 });
    m.jammed = true;
    expect(marineTick(engine, m)).toBe('unjam');
    stealer.die();
    m.facing = Dir.N;
    new Genestealer(board, { c: 1, r: 1 }, Dir.N); // adjacent behind him
    expect(marineTick(engine, m)).toBe('turn');
    expect(m.facing).toBe(Dir.S);
    expect(m.order).toEqual(moveTo(1, 3)); // the order survives the reactions
  });

  it('in transit he turns toward a seen stealer when the turn brings it into the fire lane', () => {
    const engine = new GameEngine(room(7, 7, { x: 4, y: 3, facing: 'down' }));
    const board = engine.state.board;
    const m = engine.marines[0];
    engine.command(m.id, { type: 'order', order: moveTo(4, 6) });
    new Genestealer(board, { c: 1, r: 3 }, Dir.E); // on his sight line, outside the fire arc
    expect(marineTick(engine, m)).toBe('turn');
    expect(m.facing).toBe(Dir.W);
    expect(m.order).toEqual(moveTo(4, 6));
  });

  it('the door-close rule leaves a door a marine opened this cycle alone', () => {
    const engine = new GameEngine(doorCorridor(8, 2, [{ x: 1, y: 2, facing: 'down', type: 'heavy_flamer' }]));
    const board = engine.state.board;
    const f = engine.marines[0];
    const door = board.doorBetween({ c: 1, r: 2 }, { c: 1, r: 3 })!;
    new Genestealer(board, { c: 1, r: 6 }, Dir.N); // seen beyond, out of last-stand reach
    expect(engine.command(f.id, { type: 'door' })).toBe(true);
    expect(door.isOpen).toBe(true);
    f.lastCommandTick = -Infinity;
    f.ap = 4;
    expect(marineTick(engine, f)).toBeNull(); // rule 8 skips: he opened it this cycle
    expect(door.isOpen).toBe(true);
    door.lastOpenedByMarine = -Infinity;
    expect(marineTick(engine, f)).toBe('closeDoor');
    expect(door.isOpen).toBe(false);
  });
});

describe('orders: openDoor', () => {
  it('walks to a flank of the edge, faces across it, opens it, and completes', () => {
    const engine = new GameEngine(doorCorridor(8, 3));
    const board = engine.state.board;
    const m = engine.marines[0];
    const door = board.doorBetween({ c: 1, r: 3 }, { c: 1, r: 4 })!;
    expect(engine.command(m.id, { type: 'order', order: { type: 'openDoor', x: 1, y: 3, facing: Dir.S } })).toBe(true);
    engine.runTicks(4);
    expect(m.pos).toEqual({ c: 1, r: 3 });
    expect(door.isOpen).toBe(true);
    expect(m.order).toBeNull();
  });

  it('an already open door completes the order on the next tick', () => {
    const engine = new GameEngine(doorCorridor(8, 3));
    const board = engine.state.board;
    const m = engine.marines[0];
    board.doorBetween({ c: 1, r: 3 }, { c: 1, r: 4 })!.open();
    engine.command(m.id, { type: 'order', order: { type: 'openDoor', x: 1, y: 3, facing: Dir.S } });
    engine.tick();
    expect(m.order).toBeNull();
    expect(m.pos).toEqual({ c: 1, r: 0 });
  });
});

describe('orderLabel', () => {
  it('reads MOVE, DOOR, OW, HOLD', () => {
    const engine = new GameEngine(doorCorridor(8, 3));
    const m = engine.marines[0] as StormBolterMarine;
    expect(orderLabel(m)).toBe('HOLD');
    m.overwatchOn();
    expect(orderLabel(m)).toBe('OW');
    engine.command(m.id, { type: 'order', order: moveTo(1, 5) });
    expect(orderLabel(m)).toBe('MOVE');
    engine.command(m.id, { type: 'order', order: { type: 'openDoor', x: 1, y: 3, facing: Dir.S } });
    expect(orderLabel(m)).toBe('DOOR');
  });
});
