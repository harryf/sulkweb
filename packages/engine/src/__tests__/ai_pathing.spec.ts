import { it, expect, describe } from 'vitest';
import { GameEngine } from '../GameEngine.js';
import { Blip } from '../pieces/Blip.js';
import { Genestealer } from '../pieces/Genestealer.js';
import { Board } from '../board/Board.js';
import { StormBolterMarine } from '../pieces/StormBolterMarine.js';
import { loadMission } from '../missions/missionLoader.js';
import { runStealerActions } from '../ai/StealerAI.js';
import { RollQueue } from '../core/Dice.js';

describe('AI pathing on the real mission map', () => {
  it('a far-north blip walks the long corridor toward the squad', () => {
    const engine = new GameEngine({ ...loadMission('space_hulk_1'), initialBlips: 0 });
    const blip = new Blip(engine.state.board, { c: 10, r: 0 }, 1);
    runStealerActions(engine.state.board);
    expect(blip.pos.r).toBeGreaterThan(0); // regression: used to stall at equal max(dx,dy)
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

  it('a blip that opens a door INTO marine sight converts on the spot', () => {
    // The col-13 corridor is watched by the deployed squad: opening the door
    // edge (13,15)↑ exposes the blip — the sight sweep must flip it mid-phase.
    const engine = new GameEngine({ ...loadMission('space_hulk_1'), initialBlips: 0 });
    const board = engine.state.board;
    const blip = new Blip(board, { c: 13, r: 14 }, 1);
    runStealerActions(board);
    expect(board.doorAt({ c: 13, r: 15 })!.isOpen).toBe(true);
    expect(blip.alive).toBe(false); // seen the moment the door opened
    expect(board.pieces.some(p => (p as any).kind === 'stealer')).toBe(true);
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
    // and over a few activations it makes real progress toward the squad at the X-junction
    for (let t = 0; t < 3; t++) { blip.ap = 6; runStealerActions(board); }
    const dist = Math.max(Math.abs(blip.pos.c - 13), Math.abs(blip.pos.r - 20));
    expect(dist).toBeLessThan(Math.max(Math.abs(0 - 13), Math.abs(6 - 20)));
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
      expect(engine.marines).toHaveLength(0); // the horde wiped the idle squad
      return;
    }
    const nearest = Math.min(...engine.stealerSide.map(p =>
      Math.min(...engine.marines.map(m => Math.max(Math.abs(m.pos.c - p.pos.c), Math.abs(m.pos.r - p.pos.r))))));
    expect(engine.stealerSide.length).toBeGreaterThan(4);
    expect(nearest).toBeLessThanOrEqual(3);
  });
});
