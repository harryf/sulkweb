import { describe, it, expect } from 'vitest';
import { Board } from '../board/Board.js';
import { GameEngine } from '../GameEngine.js';
import { loadMission } from '../missions/missionLoader.js';
import { StormBolterMarine } from '../pieces/StormBolterMarine.js';
import { HeavyFlamerMarine } from '../pieces/HeavyFlamerMarine.js';
import { Dir } from '../core/Direction.js';
import { RollQueue } from '../core/Dice.js';
import { MOVE_COST } from '../core/CostTables.js';
import type { SquareJSON } from '../missions/missionTypes.js';

/** 5x5 open room, marine in the middle at (2,2). */
function openRoom(): Board {
  const sq: SquareJSON[] = [];
  for (let r = 0; r < 5; r++) for (let c = 0; c < 5; c++) sq.push({ x: c, y: r, kind: 'room', section: 0 });
  return new Board(5, 5, sq);
}

describe('marine diagonal movement (ISC-361..364/367)', () => {
  it('forward diagonals cost 1 AP and keep facing (original movemap F_L/F_R=1)', () => {
    const board = openRoom();
    const m = new StormBolterMarine(board, { c: 2, r: 2 }, Dir.N);
    expect(m.moveForwardLeft()).toBe(true);
    expect(m.pos).toEqual({ c: 1, r: 1 });
    expect(m.facing).toBe(Dir.N);
    expect(m.ap).toBe(3);
    expect(m.moveForwardRight()).toBe(true);
    expect(m.pos).toEqual({ c: 2, r: 0 });
    expect(m.ap).toBe(2);
  });

  it('backward diagonals cost 2 AP and keep facing (original B_L/B_R=2)', () => {
    const board = openRoom();
    const m = new StormBolterMarine(board, { c: 2, r: 2 }, Dir.N);
    expect(m.moveBackLeft()).toBe(true);
    expect(m.pos).toEqual({ c: 1, r: 3 });
    expect(m.facing).toBe(Dir.N);
    expect(m.ap).toBe(2);
    expect(m.moveBackRight()).toBe(true);
    expect(m.pos).toEqual({ c: 2, r: 4 });
    expect(m.ap).toBe(0);
  });

  it('diagonals are facing-relative — an east-facing marine mirrors the deltas', () => {
    const board = openRoom();
    const m = new StormBolterMarine(board, { c: 2, r: 2 }, Dir.E);
    expect(m.moveForwardLeft()).toBe(true); // forward=+x, left=-y
    expect(m.pos).toEqual({ c: 3, r: 1 });
    expect(m.facing).toBe(Dir.E);
  });

  it('a diagonal move grants move-and-shoot and breaks overwatch (ISC-364)', () => {
    const board = openRoom();
    const m = new StormBolterMarine(board, { c: 2, r: 2 }, Dir.N);
    expect(m.overwatchOn()).toBe(true);
    expect(m.moveForwardLeft()).toBe(true);
    expect(m.overwatch).toBe(false);   // move cancels overwatch
    expect(m.freeShot).toBe(true);     // move-and-shoot earned
  });

  it('strafing stays impossible — no sideways cost entry, helpers refuse (ISC-365)', () => {
    const board = openRoom();
    const m = new StormBolterMarine(board, { c: 2, r: 2 }, Dir.N);
    expect(MOVE_COST['-1,0']).toBeUndefined();
    expect(MOVE_COST['1,0']).toBeUndefined();
    expect(m.stepLeft()).toBe(false);
    expect(m.stepRight()).toBe(false);
    expect(m.ap).toBe(4);
    expect(m.pos).toEqual({ c: 2, r: 2 });
  });

  it('cost table matches the original marine movemap exactly (ISC-367)', () => {
    expect(MOVE_COST).toEqual({
      '0,-1': 1, '1,-1': 1, '-1,-1': 1,   // F, F_R, F_L
      '0,1': 2, '1,1': 2, '-1,1': 2,      // B, B_R, B_L
    });
  });
});

describe('diagonal corner-cut vs closed doors (ISC-366)', () => {
  it('cannot slip into Launch Control past its closed door; legal once open', () => {
    const engine = new GameEngine({ ...loadMission('space_hulk_1'), initialBlips: 0 });
    const board = engine.state.board;
    board.dice = new RollQueue([]);
    const m = engine.marines.find(x => x instanceof HeavyFlamerMarine)!;
    m.pos = { c: 18, r: 20 };
    m.facing = Dir.E;
    // (18,20)→(19,19): the diagonal squeezes past the end of the closed
    // (18,20)|(19,20) door edge — the original's door SQUARE filled that gap.
    expect(m.moveForwardLeft()).toBe(false);
    expect(m.pos).toEqual({ c: 18, r: 20 });
    board.doorBetween({ c: 18, r: 20 }, { c: 19, r: 20 })!.open();
    expect(m.moveForwardLeft()).toBe(true);
    expect(m.pos).toEqual({ c: 19, r: 19 });
  });

  it('an ordinary diagonal nowhere near a door is unaffected', () => {
    const board = openRoom();
    const m = new StormBolterMarine(board, { c: 2, r: 2 }, Dir.N);
    expect(m.moveForwardLeft()).toBe(true);
  });
});
