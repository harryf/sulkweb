import { describe, it, expect } from 'vitest';
import { Board } from '../board/Board.js';
import { Blip } from '../pieces/Blip.js';
import { Genestealer } from '../pieces/Genestealer.js';
import { StormBolterMarine } from '../pieces/StormBolterMarine.js';
import { Dir } from '../core/Direction.js';
import { RollQueue } from '../core/Dice.js';
import { runStealerActions, spawnBlips, convertRevealedBlips } from '../ai/StealerAI.js';
import { loadMission } from '../missions/missionLoader.js';

describe('Blip', () => {
  it('moves any direction for 1 AP and has 6 AP', () => {
    const board = new Board(7, 7);
    const blip = new Blip(board, { c: 3, r: 3 }, 2);
    expect(blip.apInitial).toBe(6);
    expect(blip.tryMove(1, 1)).toBe(true);   // diagonal back-right in world terms
    expect(blip.ap).toBe(5);
    expect(blip.tryMove(-1, 0)).toBe(true);
    expect(blip.ap).toBe(4);
  });

  it('converts to its hidden number of stealers around its square', () => {
    const board = new Board(7, 7);
    const blip = new Blip(board, { c: 3, r: 3 }, 3);
    const stealers = blip.convert();
    expect(stealers).toHaveLength(3);
    expect(board.pieces.filter(p => (p as Genestealer).kind === 'stealer')).toHaveLength(3);
    expect(board.pieceAt({ c: 3, r: 3 })).toBeDefined(); // one on the origin square
    expect(blip.alive).toBe(false);
  });

  it('loses stealers that do not fit', () => {
    // 1x1 island: only the blip square exists
    const board = new Board(3, 3, [{ x: 1, y: 1, kind: 'corridor' }]);
    const blip = new Blip(board, { c: 1, r: 1 }, 3);
    const stealers = blip.convert();
    expect(stealers).toHaveLength(1);
  });

  it('draws its value from the original 8/4/9 blip bag via two-dice sampling (ISC-134)', () => {
    // v = (d1-1)*6 + d2 → 1..8 = value 1, 9..12 = value 2, 13..21 = value 3, >21 redraw
    const board = new Board(5, 3);
    board.dice = new RollQueue([
      1, 1,       // v=1  → 1
      2, 3,       // v=9  → 2
      3, 3,       // v=15 → 3
      6, 6, 1, 2, // v=36 rejected, redraw v=2 → 1
    ]);
    expect(new Blip(board, { c: 0, r: 0 }).value).toBe(1);
    expect(new Blip(board, { c: 1, r: 0 }).value).toBe(2);
    expect(new Blip(board, { c: 2, r: 0 }).value).toBe(3);
    expect(new Blip(board, { c: 3, r: 0 }).value).toBe(1);
  });
});

describe('convertRevealedBlips', () => {
  it('converts blips in marine sight, leaves hidden ones', () => {
    const board = new Board(9, 9);
    new StormBolterMarine(board, { c: 4, r: 4 }, Dir.N);
    const seen = new Blip(board, { c: 4, r: 1 }, 2);   // straight ahead
    const hidden = new Blip(board, { c: 4, r: 8 }, 1); // behind the marine
    const converted = convertRevealedBlips(board);
    expect(converted).toBe(1);
    expect(seen.alive).toBe(false);
    expect(hidden.alive).toBe(true);
  });
});

describe('runStealerActions (AI0)', () => {
  it('stealer closes on the nearest marine and attacks it', () => {
    const board = new Board(3, 12);
    // Marine facing away so no overwatch/defence surprises; scripted CC dice
    const marine = new StormBolterMarine(board, { c: 1, r: 2 }, Dir.S);
    const stealer = new Genestealer(board, { c: 1, r: 8 }, Dir.N);
    // stealer walks 5 forward (5 AP), then CC (1 AP): stealer 3 dice vs marine 1
    board.dice = new RollQueue([6, 5, 4, 1]);
    runStealerActions(board);
    expect(stealer.pos).toEqual({ c: 1, r: 3 });
    expect(marine.alive).toBe(false);
    expect(stealer.alive).toBe(true);
  });

  it('blip never steps into marine sight — it converts voluntarily from cover (ISC-135/136)', () => {
    // An open corridor watched by the marine: every forward square is seen, so
    // the blip may not advance. It is within 6 squares → voluntary conversion.
    const board = new Board(3, 12);
    new StormBolterMarine(board, { c: 1, r: 2 }, Dir.S); // looking south down the corridor
    const blip = new Blip(board, { c: 1, r: 7 }, 2);
    board.dice = new RollQueue([1, 1, 1, 1, 1, 1, 1, 1]);
    runStealerActions(board);
    expect(blip.alive).toBe(false); // converted in place, not exposed by movement
    const stealers = board.pieces.filter(p => (p as Genestealer).kind === 'stealer');
    expect(stealers.length).toBe(2);
    // conversion happened at/behind the blip square — never inside a closer, seen square
    expect(Math.min(...stealers.map(s => (s as Genestealer).pos.r))).toBeGreaterThanOrEqual(6);
  });

  it('an unseen far-away blip advances as a blip and does not convert (ISC-136)', () => {
    const board = new Board(3, 20);
    new StormBolterMarine(board, { c: 1, r: 2 }, Dir.N); // facing AWAY — corridor unseen
    const blip = new Blip(board, { c: 1, r: 18 }, 2);    // 16 squares away — not "near"
    runStealerActions(board);
    expect(blip.alive).toBe(true);       // still hidden
    expect(blip.pos.r).toBeLessThan(18); // but it closed the distance
  });

  it('overwatching marine gets reaction shots as the stealer approaches', () => {
    const board = new Board(3, 12);
    const marine = new StormBolterMarine(board, { c: 1, r: 2 }, Dir.S);
    marine.overwatchOn();
    const stealer = new Genestealer(board, { c: 1, r: 8 }, Dir.N);
    // First reaction shot kills: 6,1 (no double)
    board.dice = new RollQueue([6, 1]);
    runStealerActions(board);
    expect(stealer.alive).toBe(false);
    expect(marine.alive).toBe(true);
  });
});

describe('spawnBlips', () => {
  it('places blips round-robin on free entry squares', () => {
    const board = new Board(9, 9);
    board.dice = new RollQueue([1, 3, 3, 2]); // two bag-draws: v=3 → 1, v=14 → 3
    const entries = [{ c: 0, r: 0 }, { c: 8, r: 8 }];
    const blips = spawnBlips(board, entries, 2);
    expect(blips).toHaveLength(2);
    expect(board.pieceAt({ c: 0, r: 0 })).toBeDefined();
    expect(board.pieceAt({ c: 8, r: 8 })).toBeDefined();
    // occupied entries are skipped
    const more = spawnBlips(board, entries, 2);
    expect(more).toHaveLength(0);
  });
});

describe('mission schema', () => {
  it('space_hulk_1 carries deployment, entries and the ORIGINAL flame objective', () => {
    const m = loadMission('space_hulk_1');
    expect(m.marineDeployment).toHaveLength(5);
    expect(m.entryPoints!.length).toBeGreaterThanOrEqual(3);
    expect(m.objective).toBe('flame-objective');
    expect(m.objectivePoint).toEqual({ x: 20, y: 20 }); // Launch Control
    expect(m.exitPoints).toBeUndefined();               // original has no EXIT squares
    expect(m.totalBlips).toBeUndefined();               // reinforcements uncapped per source
    expect(m.blipsPerTurn).toBe(1); // original BLIPS = (2, 1)
  });
});
