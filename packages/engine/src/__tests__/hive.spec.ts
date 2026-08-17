import { describe, it, expect } from 'vitest';
import { Board } from '../board/Board.js';
import { Genestealer } from '../pieces/Genestealer.js';
import { StormBolterMarine } from '../pieces/StormBolterMarine.js';
import { Dir } from '../core/Direction.js';
import { RollQueue } from '../core/Dice.js';
import { runStealerActions } from '../ai/StealerAI.js';
import { computeThreat, pathStep, threatPenalty, findStragglers } from '../ai/hive.js';

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
