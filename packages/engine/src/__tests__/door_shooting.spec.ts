import { describe, it, expect } from 'vitest';
import { Board } from '../board/Board.js';
import { StormBolterMarine } from '../pieces/StormBolterMarine.js';
import { AssaultCannonMarine } from '../pieces/AssaultCannonMarine.js';
import { HeavyFlamerMarine } from '../pieces/HeavyFlamerMarine.js';
import { Genestealer } from '../pieces/Genestealer.js';
import { Dir } from '../core/Direction.js';
import { RollQueue } from '../core/Dice.js';
import { PieceEvents } from '../events/PieceEvents.js';
import { canShoot } from '../board/vision.js';
import type { SquareJSON } from '../missions/missionTypes.js';

/** Corridor (1,0..4) → closed door edge (1,4)↔(1,5) → 3x3 room rows 5..7.
 *  The door ANCHOR square (1,5) sits BEHIND the closed edge as seen from the
 *  corridor — the exact geometry the far-side LOS rules must handle. */
function doorFixture(): Board {
  const sq: SquareJSON[] = [];
  for (let r = 0; r <= 4; r++) sq.push({ x: 1, y: r, kind: 'corridor', section: 0 });
  for (let r = 5; r <= 7; r++) for (let c = 0; c <= 2; c++) sq.push({ x: c, y: r, kind: 'room', section: 1 });
  sq.find(s => s.x === 1 && s.y === 5)!.doorFacing = 'up';
  return new Board(3, 8, sq);
}

const theDoor = (board: Board) => board.doorBetween({ c: 1, r: 4 }, { c: 1, r: 5 })!;

describe('aimed bolter fire at doors (ISC-348/349/350/352/353)', () => {
  it('destroys a closed door on a 6 — 1 AP, shot + doorDestroyed events (ISC-348/349)', () => {
    const board = doorFixture();
    const bolter = new StormBolterMarine(board, { c: 1, r: 1 }, Dir.S);
    board.dice = new RollQueue([6, 1]);
    const door = theDoor(board);
    expect(bolter.canShootDoor(door)).toBe(true);
    const stream = PieceEvents.capture(() => {
      expect(bolter.shootDoor(door)).toBe(true);
    });
    expect(door.destroyed).toBe(true);
    expect(door.isOpen).toBe(true);
    expect(bolter.ap).toBe(3);
    expect(stream.map(e => e.type)).toEqual(['shot', 'doorDestroyed']);
    const shot = stream[0].payload as { targetId: string; hit: boolean };
    expect(shot.targetId).toBe('door:1,5,0');
    expect(shot.hit).toBe(true);
  });

  it('misses accrue the sustained-fire bonus until the door splinters (ISC-350)', () => {
    const board = doorFixture();
    const bolter = new StormBolterMarine(board, { c: 1, r: 1 }, Dir.S);
    const door = theDoor(board);
    board.dice = new RollQueue([5, 4, /* miss, +1 */ 5, 1 /* 5+1=6 hit */]);
    expect(bolter.shootDoor(door)).toBe(false);
    expect(door.destroyed).toBe(false);
    expect(bolter.shootDoor(door)).toBe(true);
    expect(door.destroyed).toBe(true);
    expect(bolter.ap).toBe(2);
  });

  it('sustained bonus is lost on move/turn like any target (ISC-350)', () => {
    const board = doorFixture();
    const bolter = new StormBolterMarine(board, { c: 1, r: 1 }, Dir.S);
    const door = theDoor(board);
    board.dice = new RollQueue([5, 4, /* miss, +1 */ 5, 4 /* bonus reset: still a miss */]);
    expect(bolter.shootDoor(door)).toBe(false);
    bolter.tryTurn(1);
    bolter.tryTurn(-1); // face the door again
    expect(bolter.shootDoor(door)).toBe(false); // 5+0 < 6 — bonus was cleared
    expect(door.destroyed).toBe(false);
  });

  it('move-and-shoot: the free post-move shot works at doors (ISC-349)', () => {
    const board = doorFixture();
    const bolter = new StormBolterMarine(board, { c: 1, r: 1 }, Dir.S);
    expect(bolter.moveForward()).toBe(true); // (1,2), earns the free shot
    bolter.ap = 0;
    board.dice = new RollQueue([6, 1]);
    expect(bolter.shootDoor(theDoor(board))).toBe(true);
    expect(bolter.ap).toBe(0); // free
  });

  it('refuses doors out of the fire arc or with blocked LOS (ISC-352)', () => {
    const board = doorFixture();
    const away = new StormBolterMarine(board, { c: 1, r: 1 }, Dir.N); // door behind him
    expect(away.canShootDoor(theDoor(board))).toBe(false);
    const blocked = new StormBolterMarine(board, { c: 1, r: 0 }, Dir.S);
    new Genestealer(board, { c: 1, r: 2 }, Dir.S); // body in the corridor
    expect(blocked.canShootDoor(theDoor(board))).toBe(false);
  });

  it('point-blank: facing the adjacent door edge always qualifies (ISC-352.1)', () => {
    const board = doorFixture();
    const bolter = new StormBolterMarine(board, { c: 1, r: 4 }, Dir.S);
    const door = theDoor(board);
    // Sanity: neither flanking square passes canShoot from here — the anchor
    // ray crosses the door's own segment and the near square is his own.
    expect(canShoot(board, bolter, board.get(1, 5)!)).toBe(false);
    expect(bolter.canShootDoor(door)).toBe(true);
    board.dice = new RollQueue([6, 1]);
    expect(bolter.shootDoor(door)).toBe(true);
  });

  it('open and already-destroyed doors are not targets (ISC-353)', () => {
    const board = doorFixture();
    const bolter = new StormBolterMarine(board, { c: 1, r: 1 }, Dir.S);
    const door = theDoor(board);
    door.open();
    expect(bolter.canShootDoor(door)).toBe(false);
    door.close();
    door.destroy();
    expect(bolter.canShootDoor(door)).toBe(false);
    expect(bolter.canShootDoor(undefined)).toBe(false);
  });

  it('a door shot never kills a bystander piece (ISC-356)', () => {
    const board = doorFixture();
    const bolter = new StormBolterMarine(board, { c: 1, r: 1 }, Dir.S);
    const stealer = new Genestealer(board, { c: 1, r: 4 }, Dir.N); // on the near flank
    board.dice = new RollQueue([6, 6]);
    const stream = PieceEvents.capture(() => bolter.shootDoor(theDoor(board)));
    expect(theDoor(board).destroyed).toBe(true);
    expect(stealer.alive).toBe(true);
    expect(stream.some(e => e.type === 'pieceDied')).toBe(false);
  });
});

describe('aimed assault-cannon fire at doors (ISC-351)', () => {
  it('destroys on ≥5, spends 1 ammo, ticks the malfunction clock', () => {
    const board = doorFixture();
    const cannon = new AssaultCannonMarine(board, { c: 1, r: 1 }, Dir.S);
    board.dice = new RollQueue([5, 1, 2]);
    const door = theDoor(board);
    expect(cannon.shootDoor(door)).toBe(true);
    expect(door.destroyed).toBe(true);
    expect(cannon.ammo).toBe(AssaultCannonMarine.DRUM - 1);
    expect(cannon.shotsFired).toBe(1);
    expect(cannon.ap).toBe(3);
  });

  it('needs a round in the drum', () => {
    const board = doorFixture();
    const cannon = new AssaultCannonMarine(board, { c: 1, r: 1 }, Dir.S);
    cannon.ammo = 0;
    expect(cannon.canShootDoor(theDoor(board))).toBe(false);
  });

  it('4s bounce off — the bolter would need a 6 (higher cannon chance)', () => {
    const board = doorFixture();
    const cannon = new AssaultCannonMarine(board, { c: 1, r: 1 }, Dir.S);
    board.dice = new RollQueue([4, 4, 4]);
    expect(cannon.shootDoor(theDoor(board))).toBe(false);
    expect(theDoor(board).destroyed).toBe(false);
  });
});

describe('autofire vs far-side-anchor doors (ISC-354)', () => {
  it('shreds a closed door whose anchor square hides behind its own edge', () => {
    const board = doorFixture();
    const cannon = new AssaultCannonMarine(board, { c: 1, r: 1 }, Dir.S);
    // Regression: the old check used canShoot(anchor) only — the anchor (1,5)
    // is behind the closed edge, so this door was silently unshootable.
    expect(canShoot(board, cannon, board.get(1, 5)!)).toBe(false);
    board.dice = new RollQueue([3, 1, 1, /* pass 2 finds nothing */ 1, 1, 2]);
    expect(cannon.autofire()).toBe(true);
    expect(theDoor(board).destroyed).toBe(true);
  });
});

describe('flamer vs hidden stealers (ISC-342/345)', () => {
  it('kills a stealer around the corner — LOS to the SQUARE, never the target', () => {
    const board = doorFixture();
    const flamer = new HeavyFlamerMarine(board, { c: 1, r: 1 }, Dir.S);
    theDoor(board).open();
    // (0,5) hides behind solid rock at (0,4) — no sight line from the corridor.
    const hidden = new Genestealer(board, { c: 0, r: 5 }, Dir.N);
    const hiddenSq = board.get(0, 5)!;
    expect(canShoot(board, flamer, hiddenSq, HeavyFlamerMarine.RANGE)).toBe(false); // truly unseen
    board.dice = new RollQueue([6]);
    const target = board.get(1, 5)!; // visible mouth of the room
    expect(flamer.canFlame(target)).toBe(true);
    const kills = flamer.flameAt(target)!;
    expect(kills).toContain(hidden.id);
    expect(hidden.alive).toBe(false);
  });
});
