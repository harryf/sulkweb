import { describe, it, expect } from 'vitest';
import { GameEngine } from '../GameEngine.js';
import { RollQueue, SeededRng } from '../core/Dice.js';
import { Genestealer } from '../pieces/Genestealer.js';
import { Dir } from '../core/Direction.js';
import type { CompiledMission } from '../missions/missionTypes.js';
import { AssaultCannonMarine, ChainFistMarine } from '../pieces/AssaultCannonMarine.js';
import { SwordSergeantMarine, StormBolterMarine } from '../pieces/StormBolterMarine.js';
import { PieceEvents } from '../events/PieceEvents.js';
import { AmbushCounter, deployAmbushCounter } from '../pieces/AmbushCounter.js';
import { closeCombat } from '../rules/combat.js';
import { PieceEvents } from '../events/PieceEvents.js';

/** One corridor down column 1 with a door and room for targets. */
function corridor(overrides: Partial<CompiledMission> = {}): CompiledMission {
  return {
    name: 'beta2-test', width: 3, height: 14,
    squares: Array.from({ length: 14 }, (_, y) => ({ x: 1, y, kind: 'corridor' as const })),
    marineDeployment: [{ x: 1, y: 2, facing: 'down', type: 'assault_cannon' }],
    entryPoints: [{ x: 1, y: 13 }],
    initialBlips: 0, blipsPerTurn: 0,
    objective: 'download', downloadPoint: { x: 1, y: 0 }, downloadTurns: 4,
    ...overrides,
  };
}

describe('assault cannon (ISC-246..251)', () => {
  it('aimed shot: 3 dice, kill on any ≥ 5, ammo spent (ISC-246)', () => {
    const engine = new GameEngine(corridor(), []);
    const board = engine.state.board;
    const ac = engine.marines[0] as AssaultCannonMarine;
    const s = new Genestealer(board, { c: 1, r: 6 }, Dir.N);
    board.dice = new RollQueue([4, 4, 5]); // third die kills
    expect(ac.shoot(s)).toBe(true);
    expect(s.alive).toBe(false);
    expect(ac.ammo).toBe(9);
    expect(ac.ap).toBe(3);
  });

  it('sustained fire lowers the requirement by 1 per aimed miss, floor 1 (ISC-247)', () => {
    const engine = new GameEngine(corridor(), []);
    const board = engine.state.board;
    const ac = engine.marines[0] as AssaultCannonMarine;
    ac.ap = 6;
    const s = new Genestealer(board, { c: 1, r: 6 }, Dir.N);
    board.dice = new RollQueue([4, 4, 4, /*miss*/ 4, 4, 4, /*bonus1: req4 → hit*/]);
    expect(ac.shoot(s)).toBe(false); // 4s vs 5 — miss
    expect(ac.shoot(s)).toBe(true);  // 4s vs 5-1=4 — kill
  });

  it('autofire sweeps marines, doors, then freshly-exposed stealers in repeat passes (ISC-248/251)', () => {
    const engine = new GameEngine(corridor({
      // A closed door across the corridor at the (1,5)-(1,6) edge.
      squares: Array.from({ length: 14 }, (_, y) =>
        ({ x: 1, y, kind: 'corridor' as const, doorFacing: y === 5 ? 'down' as const : undefined })),
      marineDeployment: [
        { x: 1, y: 2, facing: 'down', type: 'assault_cannon' },
        { x: 1, y: 4, facing: 'down' }, // a battle-brother in the line of fire
      ],
    }), []);
    const board = engine.state.board;
    const ac = engine.marines[0] as AssaultCannonMarine;
    const brother = engine.marines[1];
    const s = new Genestealer(board, { c: 1, r: 7 }, Dir.N); // hidden behind the door
    const door = board.doorBetween({ c: 1, r: 5 }, { c: 1, r: 6 })!;
    expect(door.isOpen).toBe(false);
    // Pass 1: brother (3,1,1) dies, stealer INVISIBLE (closed door), door
    // (3,1,1) shredded. Pass 2: the stealer is now exposed — (3,1,1) kills.
    // Pass 3: nothing. Then the malfunction-check dice (no triple).
    board.dice = new RollQueue([3, 1, 1, 3, 1, 1, 3, 1, 1, 1, 2, 1]);
    expect(ac.autofire()).toBe(true);
    expect(brother.alive).toBe(false);   // friendly fire is REAL on full auto
    expect(door.destroyed).toBe(true);
    expect(door.isOpen).toBe(true);      // permanently open
    expect(s.alive).toBe(false);         // killed through the doorway it opened
    expect(ac.ammo).toBe(5);
    expect(ac.ap).toBe(2);
  });

  it('malfunction on a triple past ten shots: adjacent d6 ≥ 4/5, cannon dies (ISC-249)', () => {
    const engine = new GameEngine(corridor({
      marineDeployment: [
        { x: 1, y: 2, facing: 'down', type: 'assault_cannon' },
        { x: 1, y: 1, facing: 'down' }, // adjacent brother (req 5)
      ],
    }), []);
    const board = engine.state.board;
    const ac = engine.marines[0] as AssaultCannonMarine;
    const brother = engine.marines[1];
    const s = new Genestealer(board, { c: 1, r: 3 }, Dir.N); // adjacent stealer (req 4)
    ac.shotsFired = 11;
    const kills: string[][] = [];
    PieceEvents.on('malfunction', ({ kills: k }) => kills.push(k));
    board.dice = new RollQueue([2, 2, 2, /*triple miss*/ 5, /*brother dies ≥5*/ 4 /*stealer dies ≥4*/]);
    ac.shoot(s);
    expect(ac.alive).toBe(false);
    expect(brother.alive).toBe(false);
    expect(s.alive).toBe(false);
    expect(kills.flat()).toContain(ac.id);
  });

  it('reload: once, 4 AP, drum back to 10 (ISC-250)', () => {
    const engine = new GameEngine(corridor(), []);
    const ac = engine.marines[0] as AssaultCannonMarine;
    ac.ammo = 0;
    expect(ac.reload()).toBe(true);
    expect(ac.ammo).toBe(10);
    expect(ac.ap).toBe(0);
    ac.ap = 4;
    expect(ac.reload()).toBe(false); // only one spare drum
  });
});

describe('chain fist + power sword (ISC-252/253)', () => {
  it('chain fist cuts the door ahead for 1 AP — permanently (ISC-252)', () => {
    const engine = new GameEngine(corridor({
      squares: [
        ...Array.from({ length: 14 }, (_, y) => ({ x: 1, y, kind: 'corridor' as const, doorFacing: y === 3 ? 'up' as const : undefined })),
      ],
      marineDeployment: [{ x: 1, y: 2, facing: 'down', type: 'chain_fist' }],
    }), [], new SeededRng(1));
    const board = engine.state.board;
    const cf = engine.marines[0] as ChainFistMarine;
    const door = board.doorBetween({ c: 1, r: 2 }, { c: 1, r: 3 })!;
    const stream = PieceEvents.capture(() => expect(cf.cutDoor()).toBe(true));
    expect(door.destroyed).toBe(true);
    // Audio routing: the CUT is the chainsaw voice (ISC-622).
    const destroyed = stream.find(e => e.type === 'doorDestroyed')!;
    expect((destroyed.payload as { cause: string }).cause).toBe('cut');
    expect(cf.ap).toBe(3);
    door.close(); // cannot be closed again
    expect(door.isOpen).toBe(true);
    expect(cf.cutDoor()).toBe(false); // nothing left to cut
  });

  it('sword sergeant parries: the winning stealer rerolls its best die (ISC-253)', () => {
    const engine = new GameEngine(corridor({
      marineDeployment: [{ x: 1, y: 2, facing: 'down', type: 'sergeant_sword' }],
    }), []);
    const board = engine.state.board;
    const sgt = engine.marines[0] as SwordSergeantMarine;
    expect(sgt.parry).toBe(true);
    expect(sgt.ccBonus).toBe(1);
    const s = new Genestealer(board, { c: 1, r: 3 }, Dir.N); // ahead of the sergeant, facing him
    // Stealer attacks (3 dice front): 6,1,1 → best 6; sergeant rolls 4+1=5 →
    // losing, attacker in his front arc → PARRY: the 6 is rerolled → 1 →
    // stealer's best drops to 1 < 5 → the sergeant wins the exchange.
    board.dice = new RollQueue([6, 1, 1, /*stealer*/ 4, /*sgt 4+1=5*/ 1 /*parry reroll*/]);
    const result = closeCombat(s, sgt)!;
    expect(result.outcome).toBe('defender');
    expect(s.alive).toBe(false); // attacker directly ahead of the sergeant — struck down
    expect(sgt.alive).toBe(true);
  });
});

describe('ambush counters (ISC-254..257)', () => {
  it('value drawn from the dice: 5-6 → real, else fake (ISC-255)', () => {
    const engine = new GameEngine(corridor(), []);
    const board = engine.state.board;
    board.dice = new RollQueue([5, 2]);
    expect(new AmbushCounter(board, { c: 1, r: 10 }).value).toBe(1);
    expect(new AmbushCounter(board, { c: 1, r: 11 }).value).toBe(0);
  });

  it('moves freely into marine sight — no blip bars (ISC-257)', () => {
    const engine = new GameEngine(corridor(), [], new SeededRng(1));
    const board = engine.state.board;
    const counter = new AmbushCounter(board, { c: 1, r: 8 }, 1);
    // Marine at (1,2) faces down — square (1,7) is in full view; a Blip would refuse.
    expect(counter.tryMove(0, -1)).toBe(true);
    expect(counter.pos).toEqual({ c: 1, r: 7 });
  });

  it('a sighted REAL counter converts to a stealer (ISC-256)', () => {
    const engine = new GameEngine(corridor(), []);
    const board = engine.state.board;
    const real = new AmbushCounter(board, { c: 1, r: 9 }, 1);
    real.convert();
    expect(real.alive).toBe(false);
    expect(board.pieces.some(p => (p as Genestealer).kind === 'stealer')).toBe(true);
  });

  it('a sighted FAKE vanishes: watching bolter jams, watching cannon burns a round (ISC-256)', () => {
    // Two separate engines so each overwatcher has CLEAR line of sight — a
    // piece between them would soak the reflex fire (pieces block LOS).
    const bolterGame = new GameEngine(corridor(), []);
    const bolter = bolterGame.marines[0] as unknown as StormBolterMarine;
    // corridor() deploys an assault cannon by default — still a bolter subclass
    bolterGame.state.board.dice = new RollQueue([2, 2, 2, 2, 2, 2]);
    bolter.overwatchOn();
    const fake = new AmbushCounter(bolterGame.state.board, { c: 1, r: 8 }, 0);
    const ammoBefore = (bolter as AssaultCannonMarine).ammo;
    fake.convert();
    expect(fake.alive).toBe(false);
    // The cannon reflex-fires: one round gone, three dice rolled.
    expect((bolter as AssaultCannonMarine).ammo).toBe(ammoBefore - 1);

    const plainGame = new GameEngine(corridor({
      marineDeployment: [{ x: 1, y: 2, facing: 'down', type: 'storm_bolter' }],
    }), []);
    const plain = plainGame.marines[0] as StormBolterMarine;
    plain.overwatchOn();
    plainGame.state.board.dice = new RollQueue([3, 3]); // double → jam
    new AmbushCounter(plainGame.state.board, { c: 1, r: 8 }, 0).convert();
    expect(plain.jammed).toBe(true);
  });

  it('deploys at most two, on squares no marine is near or can see (ISC-254)', () => {
    // Marine faces UP so the south end of the corridor is out of sight.
    const engine = new GameEngine(corridor({
      marineDeployment: [{ x: 1, y: 2, facing: 'up', type: 'storm_bolter' }],
    }), [], new SeededRng(3));
    const board = engine.state.board;
    const c1 = deployAmbushCounter(board);
    expect(c1).toBeDefined();
    // Must be beyond 6 board-walk squares of the marine AND unseen (behind him).
    expect(c1!.pos.r - 2).toBeGreaterThan(6);
    const c2 = deployAmbushCounter(board);
    expect(c2).toBeDefined();
    expect(deployAmbushCounter(board)).toBeUndefined(); // two alive — no third
  });

  it('no legal square → no deployment, no crash (deviation: original random.choice would throw)', () => {
    // Marine faces DOWN the single corridor: every far square is in sight.
    const engine = new GameEngine(corridor({
      marineDeployment: [{ x: 1, y: 2, facing: 'down', type: 'storm_bolter' }],
    }), [], new SeededRng(1));
    expect(deployAmbushCounter(engine.state.board)).toBeUndefined();
  });

  it('tie below max is NOT auto-parried (the original asks the player; we decline the gamble)', () => {
    const engine = new GameEngine(corridor({
      marineDeployment: [{ x: 1, y: 2, facing: 'down', type: 'sergeant_sword' }],
    }), []);
    const board = engine.state.board;
    const sgt = engine.marines[0];
    const s = new Genestealer(board, { c: 1, r: 3 }, Dir.N);
    // Stealer best 4; sergeant 3+1=4 → tie below max → NO parry dice consumed.
    board.dice = new RollQueue([4, 1, 1, 3]);
    const result = closeCombat(s, sgt)!;
    expect(result.outcome).toBe('draw'); // an exhausted queue would have thrown
  });
});
