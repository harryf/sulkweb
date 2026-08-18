import { describe, it, expect } from 'vitest';
import { Board } from '../board/Board.js';
import { canSee, squareSeenByMarine } from '../board/vision.js';
import { StormBolterMarine } from '../pieces/StormBolterMarine.js';
import { Blip } from '../pieces/Blip.js';
import { Genestealer } from '../pieces/Genestealer.js';
import { Dir } from '../core/Direction.js';
import { RollQueue } from '../core/Dice.js';
import { PieceEvents } from '../events/PieceEvents.js';
import type { SquareJSON } from '../missions/missionTypes.js';

/**
 * Closed-door CORNER rules (user playtest report 2026-08-18): a door edge's
 * endpoints are the doorway corners — solid frame. A diagonal sight line that
 * grazes one must be blocked (it used to see straight through), and a blip
 * conversion must never seat a stealer across a door edge or corner the blip
 * could not walk through.
 */

/** Room A rows 0..4 (x 0..4) → door edge (2,4)|(2,5) → doorway (2,5) → room B rows 6..9. */
function doorwayFixture(): Board {
  const sq: SquareJSON[] = [];
  for (let r = 0; r <= 4; r++) for (let c = 0; c <= 4; c++) sq.push({ x: c, y: r, kind: 'room', section: 0 });
  sq.push({ x: 2, y: 5, kind: 'corridor', section: 1, doorFacing: 'up' });
  for (let r = 6; r <= 9; r++) for (let c = 0; c <= 4; c++) sq.push({ x: c, y: r, kind: 'room', section: 2 });
  return new Board(5, 10, sq);
}
const theDoor = (b: Board) => b.doorBetween({ c: 2, r: 4 }, { c: 2, r: 5 })!;

describe('closed-door corner blocks LOS (ISC-604..606)', () => {
  it('a marine diagonal to the closed edge cannot see the square behind it', () => {
    const board = doorwayFixture();
    for (const pos of [{ c: 1, r: 4 }, { c: 3, r: 4 }]) {
      const m = new StormBolterMarine(board, pos, Dir.S);
      expect(canSee(board, m, board.get(2, 5)!)).toBe(false); // grazing the door corner
      board.removePiece(m);
    }
  });

  it('the same diagonals see through once the door opens', () => {
    const board = doorwayFixture();
    theDoor(board).open();
    for (const pos of [{ c: 1, r: 4 }, { c: 3, r: 4 }]) {
      const m = new StormBolterMarine(board, pos, Dir.S);
      expect(canSee(board, m, board.get(2, 5)!)).toBe(true);
      board.removePiece(m);
    }
  });

  it('straight-on sight is unchanged: blocked closed, clear open', () => {
    const board = doorwayFixture();
    const m = new StormBolterMarine(board, { c: 2, r: 3 }, Dir.S);
    expect(canSee(board, m, board.get(2, 5)!)).toBe(false);
    theDoor(board).open();
    expect(canSee(board, m, board.get(2, 5)!)).toBe(true);
  });

  it('Anti: a long diagonal through door-free corners stays visible', () => {
    // (0,0)→(4,4) threads corners (1,1)..(3,3) — none belongs to a door
    // segment, so the endpoint rule must not touch it.
    const board = doorwayFixture();
    const m = new StormBolterMarine(board, { c: 0, r: 0 }, Dir.S);
    expect(canSee(board, m, board.get(4, 4)!)).toBe(true);
  });

  it('an angled marine does NOT reveal a blip behind the closed door (conversion driver)', () => {
    const board = doorwayFixture();
    const m = new StormBolterMarine(board, { c: 1, r: 4 }, Dir.S);
    expect(squareSeenByMarine(board, { c: 2, r: 5 })).toBe(false);
    board.removePiece(m);
  });
});

describe('blip conversion never crosses a closed door (ISC-607..609)', () => {
  it('all emerging stealers stay on the blip side of the closed edge', () => {
    const board = doorwayFixture();
    board.dice = new RollQueue([]);
    const blip = new Blip(board, { c: 2, r: 5 }, 3);
    const stealers = blip.convert();
    expect(stealers.length).toBe(3); // room B offers legal seats
    for (const s of stealers) {
      expect(s.pos.r).toBeGreaterThanOrEqual(5); // never north of the closed edge
    }
  });

  it('with no legal seat beyond the origin, the extra stealer is LOST', () => {
    // Dead-end doorway: blip square (1,2) with the only exit through the closed
    // door edge (1,1)|(1,2) — the second stealer has nowhere legal to stand.
    const sq: SquareJSON[] = [
      { x: 1, y: 0, kind: 'corridor' },
      { x: 1, y: 1, kind: 'corridor' },
      { x: 1, y: 2, kind: 'corridor', doorFacing: 'up' },
    ];
    const board = new Board(3, 3, sq);
    board.dice = new RollQueue([]);
    const blip = new Blip(board, { c: 1, r: 2 }, 2);
    const events = PieceEvents.capture(() => {
      const stealers = blip.convert();
      expect(stealers.map(s => `${s.pos.c},${s.pos.r}`)).toEqual(['1,2']);
    });
    const converted = events.find(e => e.type === 'blipConverted')!.payload as { lost: number };
    expect(converted.lost).toBe(1);
  });

  it('an open door restores the seat across the edge', () => {
    const sq: SquareJSON[] = [
      { x: 1, y: 0, kind: 'corridor' },
      { x: 1, y: 1, kind: 'corridor' },
      { x: 1, y: 2, kind: 'corridor', doorFacing: 'up' },
    ];
    const board = new Board(3, 3, sq);
    board.dice = new RollQueue([]);
    board.doorBetween({ c: 1, r: 1 }, { c: 1, r: 2 })!.open();
    const blip = new Blip(board, { c: 1, r: 2 }, 2);
    const stealers = blip.convert();
    expect(stealers.map(s => `${s.pos.c},${s.pos.r}`).sort()).toEqual(['1,1', '1,2']);
  });

  it('occupied legal seats still exclude — conversion never stacks pieces', () => {
    const board = doorwayFixture();
    board.dice = new RollQueue([]);
    new Genestealer(board, { c: 2, r: 6 }, Dir.S); // camp the straight-ahead seat
    const blip = new Blip(board, { c: 2, r: 5 }, 2);
    const stealers = blip.convert();
    expect(stealers.length).toBe(2);
    const at = new Set(stealers.map(s => `${s.pos.c},${s.pos.r}`));
    expect(at.has('2,6')).toBe(false);
    for (const s of stealers) expect(s.pos.r).toBeGreaterThanOrEqual(5);
  });
});
