import { describe, it, expect } from 'vitest';
import { Board } from '../board/Board.js';
import { Genestealer } from '../pieces/Genestealer.js';
import { StormBolterMarine } from '../pieces/StormBolterMarine.js';
import { Dir } from '../core/Direction.js';
import { RollQueue } from '../core/Dice.js';
import { runStealerActions, spawnBlips } from '../ai/StealerAI.js';
import { Blip } from '../pieces/Blip.js';
import { computeThreat, pathStep, threatPenalty, findStragglers, planHive, marineDistanceField } from '../ai/hive.js';
import { PieceEvents } from '../events/PieceEvents.js';

/** Column of squares c, rows r0..r1 inclusive. */
const col = (c: number, r0: number, r1: number) =>
  Array.from({ length: r1 - r0 + 1 }, (_, i) => ({ x: c, y: r0 + i }));
/** Row of squares r, cols c0..c1 inclusive. */
const row = (r: number, c0: number, c1: number) =>
  Array.from({ length: c1 - c0 + 1 }, (_, i) => ({ x: c0 + i, y: r }));

describe('hive threat map', () => {
  it('an overwatcher owns his fire lane; a jammed one owns nothing (kill zones)', () => {
    const board = new Board(3, 10, col(1, 0, 9) as any);
    const marine = new StormBolterMarine(board, { c: 1, r: 0 }, Dir.S);
    marine.overwatchOn();
    let threat = computeThreat(board);
    expect(threat.kill.has('1,5')).toBe(true);
    expect(threat.kill.has('1,9')).toBe(true);
    expect(threat.seen.has('1,5')).toBe(true);

    (marine as any).jammed = true;
    threat = computeThreat(board);
    expect(threat.kill.size).toBe(0);      // a jammed bolter threatens nobody
    expect(threat.seen.has('1,5')).toBe(true); // but the marine still sees
  });
});

describe('hive pathing', () => {
  // Two parallel corridors joined top and bottom; the overwatcher watches the
  // east one. Plain pathing takes the short watched lane; threat-weighted
  // pathing detours through the dark west lane.
  const twoLanes = () =>
    new Board(3, 7, [...col(0, 0, 6), ...col(2, 0, 6), { x: 1, y: 0 }, { x: 1, y: 6 }] as any);

  it('threat-weighted steps detour around a watched corridor (plain path would not)', () => {
    const board = twoLanes();
    const marine = new StormBolterMarine(board, { c: 2, r: 0 }, Dir.S);
    marine.overwatchOn();
    const threat = computeThreat(board);
    expect(threat.kill.has('2,4')).toBe(true);
    expect(threat.kill.has('0,4')).toBe(false); // rock blocks the sight line

    const goal = (c: { c: number; r: number }) =>
      Math.abs(c.c - 2) + Math.abs(c.r - 0) === 1; // ortho-adjacent to the marine
    const plain = pathStep(board, { c: 1, r: 6 }, goal, {})!;
    const wary = pathStep(board, { c: 1, r: 6 }, goal, { penalty: threatPenalty(threat) })!;
    expect(plain.step.c).toBe(2); // shortest lane runs straight up the fire lane
    expect(wary.step.c).toBe(0);  // the hive crosses to the dark lane instead
  });

  it('stealers stage hidden near the squad and strike as a wave when patience runs out', () => {
    const board = twoLanes();
    board.dice = new RollQueue(new Array(40).fill(1)); // CC draws only — staging consumes no dice
    const marine = new StormBolterMarine(board, { c: 2, r: 0 }, Dir.S);
    marine.overwatchOn();
    const stealer = new Genestealer(board, { c: 1, r: 6 }, Dir.N);

    runStealerActions(board); // staged already (hidden, in the ring) — holds
    expect(stealer.pos).toEqual({ c: 1, r: 6 });
    stealer.resetAP();
    runStealerActions(board); // patience 1 — still massing
    expect(stealer.pos).toEqual({ c: 1, r: 6 });
    stealer.resetAP();
    runStealerActions(board); // patience 2 — still massing
    expect(stealer.pos).toEqual({ c: 1, r: 6 });
    stealer.resetAP();
    runStealerActions(board); // patience cap: the wave launches
    // Six AP of dark-lane running: it flanks all the way to the marine's side
    // square without ever entering the fire lane — not one reaction die drawn.
    expect(stealer.pos).toEqual({ c: 1, r: 0 });
    expect((board.dice as RollQueue).remaining).toBe(40);
  });

  it('the horde floods the lane the moment the watcher jams (jam rush)', () => {
    const board = new Board(3, 9, col(1, 0, 8) as any);
    board.dice = new RollQueue(new Array(20).fill(1));
    const marine = new StormBolterMarine(board, { c: 1, r: 0 }, Dir.S);
    marine.overwatchOn();
    (marine as any).jammed = true; // bolter fouled — the lane is free
    const stealer = new Genestealer(board, { c: 1, r: 6 }, Dir.N);
    runStealerActions(board);
    // No kill zone anywhere → instant launch, straight down the corridor to CC
    expect(stealer.pos).toEqual({ c: 1, r: 1 });
    expect(stealer.alive).toBe(true);
  });
});

describe('hive objective awareness', () => {
  it('marines closing on their objective flip the hive reckless — no more massing', () => {
    // Same two-lane board as the staging test, but the hive is told the marine
    // stands almost on top of his destination: it attacks on the FIRST call
    // instead of massing for three.
    const board = new Board(3, 7, [...col(0, 0, 6), ...col(2, 0, 6), { x: 1, y: 0 }, { x: 1, y: 6 }] as any);
    board.dice = new RollQueue(new Array(40).fill(1));
    const marine = new StormBolterMarine(board, { c: 2, r: 0 }, Dir.S);
    marine.overwatchOn();
    const stealer = new Genestealer(board, { c: 1, r: 6 }, Dir.N);
    runStealerActions(board, { objectives: [{ c: 2, r: 1 }] }); // destination 1 square from him
    expect(stealer.pos).not.toEqual({ c: 1, r: 6 }); // reckless: charged immediately
  });

  it('a far buildup camps the ring around the marines DESTINATION, not the marines', () => {
    // Marine far north; his destination far south-east. The stealer stages
    // into the hidden ring around the destination and holds there — the
    // buildup becomes the roadblock before the marine ever arrives.
    const board = new Board(12, 12, [
      ...col(1, 0, 11),                 // marine's corridor (watched)
      ...row(11, 1, 10),                // southern transit
      ...col(10, 6, 11), ...row(6, 8, 10), // approach to the objective pocket
      { x: 8, y: 5 }, { x: 9, y: 5 },   // hidden pocket beside the objective
    ] as any);
    board.dice = new RollQueue(new Array(10).fill(1));
    const marine = new StormBolterMarine(board, { c: 1, r: 0 }, Dir.S);
    marine.overwatchOn();
    const objective = { c: 10, r: 6 };
    const stealer = new Genestealer(board, { c: 4, r: 11 }, Dir.E);
    for (let t = 0; t < 3; t++) {
      runStealerActions(board, { objectives: [objective] });
      stealer.resetAP();
    }
    const dist = Math.max(Math.abs(stealer.pos.c - objective.c), Math.abs(stealer.pos.r - objective.r));
    expect(dist).toBeLessThanOrEqual(6);            // parked inside the destination ring
    const threat = computeThreat(board);
    expect(threat.seen.has(`${stealer.pos.c},${stealer.pos.r}`)).toBe(false); // out of sight
    expect((board.dice as RollQueue).remaining).toBe(10); // never crossed the fire lane
  });
});

describe('hive zigzag advance', () => {
  it('a charge into overwatch weaves through side alcoves, eating one burst instead of four', () => {
    // Corridor col1 watched top-to-bottom; alcove pockets on the west side.
    // The threat-weighted path alternates corridor/alcove — only the corridor
    // squares draw reaction fire, and the scripted queue holds EXACTLY one
    // burst (a second shot would throw RollQueue-exhausted).
    const board = new Board(3, 9, [
      ...col(1, 0, 8),
      { x: 0, y: 2 }, { x: 0, y: 4 }, { x: 0, y: 6 },
    ] as any);
    const marine = new StormBolterMarine(board, { c: 1, r: 0 }, Dir.S);
    marine.overwatchOn();
    const threat = computeThreat(board);
    expect(threat.kill.has('1,5')).toBe(true);
    expect(threat.kill.has('0,4')).toBe(false); // the alcove is out of the lane

    const wary = pathStep(board, { c: 1, r: 5 },
      c => Math.abs(c.c - 1) + Math.abs(c.r - 1) === 1, { penalty: threatPenalty(threat) })!;
    expect(wary.step).toEqual({ c: 0, r: 4 }); // steps OUT of the lane, not up it

    board.dice = new RollQueue([2, 3]); // one overwatch burst: miss, no double
    const stealer = new Genestealer(board, { c: 1, r: 7 }, Dir.N);
    let shots = 0;
    PieceEvents.on('shot', () => { shots++; });
    runStealerActions(board);
    expect(stealer.alive).toBe(true);
    expect(stealer.pos.c).toBe(0); // ends tucked in an alcove, not standing in the lane
    expect(shots).toBe(1); // the INVARIANT: one burst for the whole advance, not one per step
  });
});

describe('hive pinning (staged pieces are exempt from hunger)', () => {
  it('a staged flank-holder keeps holding past the idle cap while the wave still builds', () => {
    const board = new Board(3, 7, [...col(0, 0, 6), ...col(2, 0, 6), { x: 1, y: 0 }, { x: 1, y: 6 }] as any);
    const m1 = new StormBolterMarine(board, { c: 2, r: 0 }, Dir.S);
    m1.overwatchOn();
    new StormBolterMarine(board, { c: 0, r: 0 }, Dir.N); // second marine: threshold 4
    const pinner = new Genestealer(board, { c: 1, r: 6 }, Dir.N);

    for (let t = 1; t <= 3; t++) planHive(board, computeThreat(board), {}); // idle 0,1,2
    // Fresh force arrives (a hidden staged blip) — growth resets the wave
    // clock, so the launch caps have NOT fired when the pinner's idle counter
    // crosses the hunger cap.
    board.dice = new RollQueue([1, 1]);
    new Blip(board, { c: 0, r: 4 }, 2);
    const plan = planHive(board, computeThreat(board), {});
    expect(plan.launched).toBe(false);
    expect(plan.frustrated.has(pinner.id)).toBe(true);  // idle 3 — hungry…
    expect(plan.roles.get(pinner.id)).toBe('stage');    // …but pinning IS its job
  });
});

describe('hive blood in the water', () => {
  it('marine losses tighten the hidden ring — the pack creeps closer for the kill', () => {
    // Dark west lane, watched east lane (rock between). The stealer holds at
    // graph distance 7 while the squad is whole; after half the squad dies it
    // is outside the TIGHTENED ring and creeps up the dark lane.
    const board = new Board(3, 12, [
      ...col(0, 0, 11), ...col(2, 0, 11), { x: 1, y: 0 }, { x: 1, y: 11 },
    ] as any);
    board.dice = new RollQueue(new Array(10).fill(1));
    const watcher = new StormBolterMarine(board, { c: 2, r: 0 }, Dir.S);
    watcher.overwatchOn();
    new StormBolterMarine(board, { c: 1, r: 0 }, Dir.N);
    const m3 = new StormBolterMarine(board, { c: 0, r: 0 }, Dir.N);
    const m4 = new StormBolterMarine(board, { c: 0, r: 1 }, Dir.N);
    const stealer = new Genestealer(board, { c: 0, r: 8 }, Dir.N);

    runStealerActions(board); // full squad: dist ~7 is inside the ring — holds
    expect(stealer.pos).toEqual({ c: 0, r: 8 });

    m3.die();
    m4.die(); // half the squad down — blood in the water
    stealer.resetAP();
    runStealerActions(board);
    stealer.resetAP();
    runStealerActions(board);
    const dist = marineDistanceField(board).get(`${stealer.pos.c},${stealer.pos.r}`)!;
    expect(dist).toBeLessThanOrEqual(4); // crept into the tightened ring
    expect(stealer.pos.c).toBe(0);       // still in the dark lane
    const threat = computeThreat(board);
    expect(threat.kill.has(`${stealer.pos.c},${stealer.pos.r}`)).toBe(false);
  });
});

describe('hive entry strategy', () => {
  it('the bulk spawns at the entry nearest the marines objective; the feint turn spawns at the entry nearest the MARINES', () => {
    const entries = [{ c: 0, r: 0 }, { c: 10, r: 0 }];
    const objectives = [{ c: 11, r: 0 }];
    const make = () => {
      const board = new Board(12, 12);
      board.dice = new RollQueue([1, 1]);
      new StormBolterMarine(board, { c: 2, r: 3 }, Dir.S); // faces away from both entries
      return board;
    };
    const mainTurn = spawnBlips(make(), entries, 1, 2, objectives);
    expect(mainTurn[0].pos).toEqual({ c: 10, r: 0 }); // strategic entry, beside the objective
    const feintTurn = spawnBlips(make(), entries, 1, 4, objectives); // 4 % 3 === 1
    expect(feintTurn[0].pos).toEqual({ c: 0, r: 0 }); // cheap standing threat near the squad
  });
});

describe('hive hunger (idle frustration)', () => {
  it('a blip parked at an exposure door with marines far away converts after idling', () => {
    // The space_hulk_1 (3,7) stack in miniature: the queue head is a blip that
    // legally refuses the door (opening would expose it) and the marines are
    // too far for the old within-6 voluntary conversion. After IDLE_CAP plans
    // of sitting still, hunger wins: it converts, and the stealers inside have
    // no door caution — the deadlock breaks.
    const board = new Board(3, 11, [
      ...col(1, 0, 6),
      { x: 1, y: 7, doorFacing: 'up' }, { x: 1, y: 8 }, { x: 1, y: 9 }, { x: 1, y: 10 },
    ] as any);
    board.dice = new RollQueue([1, 1, 1, 1]); // one blip-value draw only
    const marine = new StormBolterMarine(board, { c: 1, r: 0 }, Dir.S);
    marine.overwatchOn();
    const blip = new Blip(board, { c: 1, r: 9 }, 2);
    const door = board.doorBetween({ c: 1, r: 7 }, { c: 1, r: 6 })!;

    runStealerActions(board); // advances to the door, refuses it
    expect(blip.pos).toEqual({ c: 1, r: 7 });
    expect(door.isOpen).toBe(false);
    // The plan samples positions BEFORE pieces move, so the arrival call still
    // reads as movement; three further stationary plans reach the idle cap.
    for (let t = 0; t < 4; t++) {
      blip.resetAP();
      runStealerActions(board); // settled, idle 1, idle 2, idle 3 → frustrated
    }
    expect(blip.alive).toBe(false); // converted from cover despite marines being 7 away
    const stealers = board.pieces.filter(p => (p as any).kind === 'stealer');
    expect(stealers.length).toBe(2);
  });
});

describe('spawn fan-out', () => {
  it('startIndex rotates the entry round-robin across turns', () => {
    const entries = [{ c: 0, r: 0 }, { c: 4, r: 0 }, { c: 8, r: 0 }];
    for (let start = 0; start < 3; start++) {
      const board = new Board(9, 3);
      board.dice = new RollQueue([1, 1]);
      const [blip] = spawnBlips(board, entries, 1, start);
      expect(blip.pos).toEqual(entries[start]); // a different entry each turn
    }
  });

  it('entries in marine sight are used last — blips are not born converted', () => {
    // Two entries; rock between them blocks sight to the second.
    const board = new Board(9, 5, [...col(0, 0, 4), { x: 8, y: 0 }] as any);
    board.dice = new RollQueue([1, 1]);
    new StormBolterMarine(board, { c: 0, r: 4 }, Dir.N); // stares straight up at entry[0]
    const entries = [{ c: 0, r: 0 }, { c: 8, r: 0 }];
    const [blip] = spawnBlips(board, entries, 1, 0);
    expect(blip.pos).toEqual({ c: 8, r: 0 }); // the watched entry was skipped
    expect(blip.alive).toBe(true);
  });
});

describe('hive approach spread', () => {
  it('the buildup splits across access vectors — marines must cover two directions', () => {
    // A watched central lane; dark approach arms curl in from west AND east
    // (rock blocks the sight lines). Two stealers entering from the south are
    // assigned different approach octants and mass on OPPOSITE flanks.
    const board = new Board(11, 14, [
      { x: 5, y: 0 }, ...col(5, 1, 9),          // marine + his fire lane
      ...row(2, 1, 4), ...row(2, 6, 9),          // west and east approach arms
      ...col(1, 2, 13), ...col(9, 2, 13),        // dark side corridors
      ...row(13, 1, 9),                          // southern transit
    ] as any);
    board.dice = new RollQueue(new Array(10).fill(1));
    const marine = new StormBolterMarine(board, { c: 5, r: 0 }, Dir.S);
    marine.overwatchOn();
    const s1 = new Genestealer(board, { c: 4, r: 13 }, Dir.N);
    const s2 = new Genestealer(board, { c: 6, r: 13 }, Dir.N);

    for (let t = 0; t < 3; t++) {
      runStealerActions(board);
      for (const s of [s1, s2]) s.resetAP();
    }
    const sides = [s1, s2].map(s => (s.pos.c <= 4 ? 'west' : s.pos.c >= 6 ? 'east' : 'lane'));
    expect(sides.sort()).toEqual(['east', 'west']); // one flank each — not one fat column
    const threat = computeThreat(board);
    for (const s of [s1, s2]) {
      expect(threat.kill.has(`${s.pos.c},${s.pos.r}`)).toBe(false); // massing in the dark
      expect(threat.seen.has(`${s.pos.c},${s.pos.r}`)).toBe(false);
    }
    expect((board.dice as RollQueue).remaining).toBe(10); // approach cost zero reaction dice
  });
});

describe('hive straggler hunt', () => {
  it('pieces gang up on an isolated marine even when another marine is closer', () => {
    const board = new Board(12, 12);
    board.dice = new RollQueue(new Array(100).fill(1)); // every CC a draw
    new StormBolterMarine(board, { c: 1, r: 1 }, Dir.N);  // buddy pair — covered
    new StormBolterMarine(board, { c: 2, r: 1 }, Dir.N);
    const straggler = new StormBolterMarine(board, { c: 10, r: 10 }, Dir.S);
    expect(findStragglers(board).map(m => m.pos)).toEqual([{ c: 10, r: 10 }]);

    const s1 = new Genestealer(board, { c: 5, r: 5 }, Dir.S);
    const s2 = new Genestealer(board, { c: 5, r: 6 }, Dir.S);
    const before1 = Math.max(Math.abs(s1.pos.c - 10), Math.abs(s1.pos.r - 10));
    const before2 = Math.max(Math.abs(s2.pos.c - 10), Math.abs(s2.pos.r - 10));
    runStealerActions(board);
    const after1 = Math.max(Math.abs(s1.pos.c - straggler.pos.c), Math.abs(s1.pos.r - straggler.pos.r));
    const after2 = Math.max(Math.abs(s2.pos.c - straggler.pos.c), Math.abs(s2.pos.r - straggler.pos.r));
    expect(after1).toBeLessThan(before1); // both hunters converged on the straggler…
    expect(after2).toBeLessThan(before2);
    expect(after1).toBeLessThanOrEqual(1); // …instead of the nearer buddy pair
  });
});

describe('hive sacrifice blocker', () => {
  // A long watched corridor separates the western pocket from the rest of the
  // map; a transit row crosses it at r10. The blocker walks into the fire
  // lane, soaks the reaction burst, and PARKS — its body blocks the sight
  // line, and the corridor behind it goes dark for the mass to build up.
  const crossing = () =>
    new Board(5, 13, [
      ...col(2, 0, 12),               // watched corridor
      ...row(10, 0, 4),               // transit row crossing at (2,10)
      { x: 0, y: 11 }, { x: 1, y: 11 }, // western pocket
      { x: 3, y: 9 }, { x: 4, y: 9 }, { x: 3, y: 11 }, { x: 4, y: 11 }, // eastern rooms
    ] as any);

  it('one stealer soaks the burst, parks in the lane, and shuts it for the rest', () => {
    const board = crossing();
    board.dice = new RollQueue([1, 2]); // one overwatch reaction: miss, no double
    const marine = new StormBolterMarine(board, { c: 2, r: 0 }, Dir.S);
    marine.overwatchOn();
    const blocker = new Genestealer(board, { c: 1, r: 10 }, Dir.E);
    const f1 = new Genestealer(board, { c: 0, r: 10 }, Dir.E);
    const f2 = new Genestealer(board, { c: 0, r: 11 }, Dir.E);

    expect(computeThreat(board).kill.has('2,11')).toBe(true); // lane live end to end
    runStealerActions(board);

    expect(blocker.alive).toBe(true);
    expect(blocker.pos.c).toBe(2);          // stepped INTO the fire lane…
    expect(blocker.ap).toBeGreaterThan(0);  // …and parked with AP in hand
    const after = computeThreat(board);
    expect(after.kill.has(`2,${blocker.pos.r}`)).toBe(true); // the blocker square stays hot
    expect(after.kill.has('2,11')).toBe(false); // but behind its body the lane is dark
    expect(after.kill.has('2,12')).toBe(false);
    // The followers advanced only through dark squares — the scripted queue
    // held exactly the blocker's one reaction burst, and nothing more.
    for (const f of [f1, f2]) {
      expect(after.kill.has(`${f.pos.c},${f.pos.r}`)).toBe(false);
      expect(after.seen.has(`${f.pos.c},${f.pos.r}`)).toBe(false);
    }
    expect((board.dice as RollQueue).remaining).toBe(0);

    // Next activation: the blocker holds; the column keeps building behind the
    // shield without drawing a single further reaction.
    for (const p of [blocker, f1, f2]) p.resetAP();
    runStealerActions(board);
    expect(blocker.pos).toEqual({ c: 2, r: 9 }); // parked — holding, not charging
    const later = computeThreat(board);
    for (const f of [f1, f2]) {
      expect(later.kill.has(`${f.pos.c},${f.pos.r}`)).toBe(false);
    }
  });
});

describe('hive door play', () => {
  it('a staging stealer shuts the open door a marine watches through (goes dark)', () => {
    const board = new Board(3, 7, [
      ...col(1, 0, 6),
      { x: 0, y: 3 }, { x: 0, y: 4 },
    ].map(s => (s.x === 1 && s.y === 3 ? { ...s, doorFacing: 'up' } : s)) as any);
    const door = board.doorBetween({ c: 1, r: 3 }, { c: 1, r: 2 })!;
    door.open(); // the marines opened it earlier
    const marine = new StormBolterMarine(board, { c: 1, r: 0 }, Dir.S);
    marine.overwatchOn();
    const stealer = new Genestealer(board, { c: 0, r: 3 }, Dir.N);
    // Fixture premise: the stealer is hidden, the doorway is watched.
    expect(computeThreat(board).seen.has('0,3')).toBe(false);
    expect(computeThreat(board).kill.has('1,4')).toBe(true);

    runStealerActions(board);
    expect(door.isOpen).toBe(false);       // shut it — massing goes dark behind it
    expect(stealer.pos).toEqual({ c: 0, r: 3 }); // without leaving cover
    expect(computeThreat(board).kill.has('1,4')).toBe(false); // the lane is gone
  });
});
