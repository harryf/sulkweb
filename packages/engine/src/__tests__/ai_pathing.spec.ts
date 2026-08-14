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
  it('east-arm blip walks the Chebyshev plateau toward the squad', () => {
    const engine = new GameEngine({ ...loadMission('space_hulk_1'), initialBlips: 0 });
    const blip = new Blip(engine.state.board, { c: 15, r: 5 }, 1);
    runStealerActions(engine.state.board);
    expect(blip.pos.c).toBeLessThan(15); // regression: used to stall at equal max(dx,dy)
  });

  it('a blip blocked by a closed door opens it and keeps moving', () => {
    const engine = new GameEngine({ ...loadMission('space_hulk_1'), initialBlips: 0 });
    const board = engine.state.board;
    const blip = new Blip(board, { c: 10, r: 18 }, 1); // below the closed door at (10,16)
    runStealerActions(board);
    expect(board.doorAt({ c: 10, r: 16 })!.isOpen).toBe(true);
    expect(blip.pos.r).toBeLessThanOrEqual(16);
  });

  it('a blip in a concave side-room pocket paths out instead of stalling (ISC-80)', () => {
    // Playtest 2026-08-14: greedy stepping stranded blips at (6,12) forever —
    // every passable neighbor has equal-or-worse Chebyshev distance to the squad.
    const engine = new GameEngine({ ...loadMission('space_hulk_1'), initialBlips: 0 });
    const board = engine.state.board;
    const blip = new Blip(board, { c: 6, r: 12 }, 1);
    const start = { ...blip.pos };
    runStealerActions(board);
    expect(blip.pos).not.toEqual(start); // escaped the pocket
    // and over a few activations it makes real progress toward the marines at col 10, rows 0-4
    for (let t = 0; t < 3; t++) { blip.ap = 6; runStealerActions(board); }
    const dist = Math.max(Math.abs(blip.pos.c - 10), Math.abs(blip.pos.r - 4));
    expect(dist).toBeLessThan(Math.max(Math.abs(6 - 10), Math.abs(12 - 4)));
  });

  it('a stealer diagonally adjacent to a marine lines up orthogonally and attacks (ISC-82)', () => {
    const engine = new GameEngine({ ...loadMission('space_hulk_1'), initialBlips: 0 });
    const board = engine.state.board;
    const marine = engine.marines.find(m => m.pos.c === 10 && m.pos.r === 4)!;
    const stealer = new Genestealer(board, { c: 11, r: 5 });
    runStealerActions(board);
    // Either the marine died to the lined-up attack, or the stealer now sits
    // orthogonally adjacent to it — never still stranded on the diagonal.
    if (marine.alive) {
      const manhattan = Math.abs(stealer.pos.c - marine.pos.c) + Math.abs(stealer.pos.r - marine.pos.r);
      expect(manhattan).toBe(1);
    } else {
      expect(engine.marines).not.toContain(marine);
    }
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
