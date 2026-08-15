import { it, expect, describe } from 'vitest';
import { GameEngine } from '../GameEngine.js';
import { Blip } from '../pieces/Blip.js';
import { Genestealer } from '../pieces/Genestealer.js';
import { Board } from '../board/Board.js';
import { StormBolterMarine } from '../pieces/StormBolterMarine.js';
import { loadMission } from '../missions/missionLoader.js';
import { runStealerActions } from '../ai/StealerAI.js';
import { RollQueue } from '../core/Dice.js';
import { Dir } from '../core/Direction.js';
import { HeavyFlamerMarine } from '../pieces/HeavyFlamerMarine.js';

describe('AI pathing on the real mission map', () => {
  it('a far-south blip walks the long corridor toward the squad (now deployed north)', () => {
    const engine = new GameEngine({ ...loadMission('space_hulk_1'), initialBlips: 0 });
    const blip = new Blip(engine.state.board, { c: 10, r: 12 }, 1);
    runStealerActions(engine.state.board);
    // The squad is boxed in behind the closed door edge (10,5)↑, so the
    // corridor is unseen: the blip closes distance without converting.
    expect(blip.pos.r).toBeLessThan(12);
    expect(blip.alive).toBe(true);
  });

  it('a blip blocked by a closed door opens it and keeps moving', () => {
    const engine = new GameEngine({ ...loadMission('space_hulk_1'), initialBlips: 0 });
    const board = engine.state.board;
    // Western room, out of marine sight: path east crosses the door edge (3,7)→
    const blip = new Blip(board, { c: 2, r: 7 }, 1);
    runStealerActions(board);
    expect(board.doorBetween({ c: 3, r: 7 }, { c: 4, r: 7 })!.isOpen).toBe(true);
    expect(blip.alive).toBe(true); // no marine can see this corridor
    expect(blip.pos.c).toBeGreaterThanOrEqual(4); // crossed the opened edge
  });

  it('a blip REFUSES a door that would expose it, then converts from cover (ISC-135/136)', () => {
    // Original Blip.can_use_door: pretend the door is open — if any marine
    // would see the blip, the door stays shut. The blip advances to the door,
    // holds, and converts voluntarily on its next fresh activation.
    const board = new Board(3, 7, [
      { x: 1, y: 0 }, { x: 1, y: 1 }, { x: 1, y: 2 },
      { x: 1, y: 3, doorFacing: 'up' }, { x: 1, y: 4 }, { x: 1, y: 5 }, { x: 1, y: 6 },
    ] as any);
    board.dice = new RollQueue(new Array(20).fill(1));
    new StormBolterMarine(board, { c: 1, r: 0 }, Dir.S); // watching down the corridor
    const blip = new Blip(board, { c: 1, r: 5 }, 2);
    const door = board.doorBetween({ c: 1, r: 3 }, { c: 1, r: 2 })!;

    runStealerActions(board);
    expect(door.isOpen).toBe(false);   // exposure check refused the door
    expect(blip.alive).toBe(true);     // moved this turn → may not convert yet
    expect(blip.pos).toEqual({ c: 1, r: 3 }); // parked at the door, out of sight

    blip.resetAP();
    runStealerActions(board);
    expect(door.isOpen).toBe(false);
    expect(blip.alive).toBe(false);    // fresh activation, blocked, near → converted
    expect(board.pieces.filter(p => (p as any).kind === 'stealer')).toHaveLength(2);
  });

  it('a blip in a concave room-corner pocket paths out instead of stalling (ISC-80)', () => {
    // Playtest 2026-08-14: greedy stepping stranded blips in concave pockets —
    // every passable neighbor has equal-or-worse Chebyshev distance to the squad.
    const engine = new GameEngine({ ...loadMission('space_hulk_1'), initialBlips: 0 });
    const board = engine.state.board;
    const blip = new Blip(board, { c: 0, r: 6 }, 1); // NW corner of the western room
    const start = { ...blip.pos };
    runStealerActions(board);
    expect(blip.pos).not.toEqual(start); // escaped the pocket
    // and over a few activations it makes real progress toward the squad (north corridor)
    for (let t = 0; t < 3; t++) { blip.ap = 6; runStealerActions(board); }
    const dist = Math.max(Math.abs(blip.pos.c - 10), Math.abs(blip.pos.r - 4));
    expect(dist).toBeLessThan(Math.max(Math.abs(0 - 10), Math.abs(6 - 4)));
  });

  it('a stealer diagonally adjacent to a marine lines up orthogonally and attacks (ISC-82)', () => {
    // Map-independent fixture: the new deployment packs the X-junction so no
    // free diagonal exists next to a deployed marine on the real map.
    const board = new Board(5, 5);
    board.dice = new RollQueue(new Array(30).fill(1)); // CC draws — nobody dies
    const marine = new StormBolterMarine(board, { c: 2, r: 2 });
    const stealer = new Genestealer(board, { c: 3, r: 3 });
    runStealerActions(board);
    // Drawn CC dice keep everyone alive: the stealer must have stepped off the
    // diagonal into orthogonal adjacency — never left stranded on the corner.
    expect(marine.alive).toBe(true);
    const manhattan = Math.abs(stealer.pos.c - marine.pos.c) + Math.abs(stealer.pos.r - marine.pos.r);
    expect(manhattan).toBe(1);
  });

  it('a stealer queued behind a friend holds in line — no side-door flapping', () => {
    // Advisor finding 2026-08-14: waiting-in-line pieces must not fall through
    // to the open-any-adjacent-door fallback and pointlessly open off-path doors.
    const board = new Board(5, 3, [
      { x: 0, y: 1 }, { x: 1, y: 1 }, { x: 2, y: 1 }, { x: 3, y: 1 }, { x: 4, y: 1 },
      { x: 2, y: 0, doorFacing: 'down' },
    ] as any);
    board.dice = new RollQueue(new Array(60).fill(1)); // every CC is a draw — the queue never advances
    new StormBolterMarine(board, { c: 0, r: 1 });
    new Genestealer(board, { c: 1, r: 1 }); // front of the queue, holds the CC slot
    const queued = new Genestealer(board, { c: 2, r: 1 });
    const sideDoor = board.doorAt({ c: 2, r: 0 })!;
    const apBefore = queued.ap;
    runStealerActions(board);
    expect(sideDoor.isOpen).toBe(false); // did NOT flap the off-path door
    expect(queued.pos).toEqual({ c: 2, r: 1 }); // held in line
    expect(queued.ap).toBe(apBefore); // and burned no AP doing it
  });

  it('several turns of the real mission bring the horde to the squad', () => {
    const engine = new GameEngine(loadMission('space_hulk_1'));
    for (let t = 0; t < 6; t++) engine.endMarinePhase();
    // Marines never moved: expect stealers/blips to have closed most of the map
    if (engine.state.result === 'loss') {
      // flame-objective loss = the flamer (or the whole squad) went down
      const flamerAlive = engine.marines.some(m => m instanceof HeavyFlamerMarine);
      expect(flamerAlive).toBe(false);
      return;
    }
    const nearest = Math.min(...engine.stealerSide.map(p =>
      Math.min(...engine.marines.map(m => Math.max(Math.abs(m.pos.c - p.pos.c), Math.abs(m.pos.r - p.pos.r))))));
    expect(engine.stealerSide.length).toBeGreaterThan(4);
    expect(nearest).toBeLessThanOrEqual(3);
  });
});
