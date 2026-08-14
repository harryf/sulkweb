import { describe, it, expect } from 'vitest';
import { Board } from '../board/Board.js';
import { StormBolterMarine } from '../pieces/StormBolterMarine.js';
import { Genestealer } from '../pieces/Genestealer.js';
import { Dir } from '../core/Direction.js';
import { RollQueue, SeededRng } from '../core/Dice.js';

function setup(rolls: number[]) {
  const board = new Board(9, 16);
  board.dice = new RollQueue(rolls);
  const marine = new StormBolterMarine(board, { c: 4, r: 10 }, Dir.N);
  const stealer = new Genestealer(board, { c: 4, r: 5 }, Dir.S);
  return { board, marine, stealer };
}

describe('SeededRng', () => {
  it('same seed reproduces the same dice sequence', () => {
    const a = new SeededRng(42), b = new SeededRng(42);
    const seqA = Array.from({ length: 20 }, () => a.roll());
    const seqB = Array.from({ length: 20 }, () => b.roll());
    expect(seqA).toEqual(seqB);
    expect(seqA.every(r => r >= 1 && r <= 6)).toBe(true);
    const c = new SeededRng(43);
    expect(Array.from({ length: 20 }, () => c.roll())).not.toEqual(seqA);
  });
});

describe('storm bolter shooting', () => {
  it('kills on a 6, costs 1 AP', () => {
    const { board, marine, stealer } = setup([6, 1]);
    expect(marine.shoot(stealer)).toBe(true);
    expect(stealer.alive).toBe(false);
    expect(board.pieceAt({ c: 4, r: 5 })).toBeUndefined();
    expect(marine.ap).toBe(3);
  });

  it('misses below 6', () => {
    const { marine, stealer } = setup([5, 5]);
    expect(marine.shoot(stealer)).toBe(false);
    expect(stealer.alive).toBe(true);
  });

  it('sustained fire: +1 per consecutive miss at same target, max +3', () => {
    // misses at raw 5,5 → next shot 4+1=5 miss → next 3+2=5 miss → next 3+3=6 HIT
    const { marine, stealer } = setup([5, 5, 4, 1, 3, 1, 3, 1]);
    expect(marine.shoot(stealer)).toBe(false); // bonus 0
    expect(marine.shoot(stealer)).toBe(false); // bonus 1 → 5
    expect(marine.shoot(stealer)).toBe(false); // bonus 2 → 5
    expect(marine.shoot(stealer)).toBe(true);  // bonus 3 → 6
    expect(marine.ap).toBe(0);
  });

  it('sustained bonus is lost on turning', () => {
    const { marine, stealer } = setup([5, 5, 5, 5]);
    marine.shoot(stealer);          // miss, bonus builds
    marine.tryTurn(1);
    marine.tryTurn(-1);             // back to facing N, bonus should be gone
    expect(marine.shoot(stealer)).toBe(false); // raw 5,5 + no bonus
  });

  it('rejects a target outside the fire arc or LOS', () => {
    const board = new Board(9, 16);
    board.dice = new RollQueue([6, 6]);
    const marine = new StormBolterMarine(board, { c: 4, r: 10 }, Dir.S); // facing away
    const stealer = new Genestealer(board, { c: 4, r: 5 }, Dir.S);
    expect(marine.shoot(stealer)).toBe(false);
    expect(marine.ap).toBe(4); // no AP spent on an illegal shot
  });

  it('rejects a shot beyond range 12', () => {
    const board = new Board(3, 20);
    board.dice = new RollQueue([6, 6]);
    const marine = new StormBolterMarine(board, { c: 1, r: 15 }, Dir.N);
    const stealer = new Genestealer(board, { c: 1, r: 1 }, Dir.S); // 14 away
    expect(marine.shoot(stealer)).toBe(false);
  });
});

describe('overwatch and jams', () => {
  it('overwatch costs 2 AP and is cleared by moving', () => {
    const { marine } = setup([]);
    expect(marine.overwatchOn()).toBe(true);
    expect(marine.overwatch).toBe(true);
    expect(marine.ap).toBe(2);
    marine.moveForward();
    expect(marine.overwatch).toBe(false);
  });

  it('overwatch shot is free and jams on doubles', () => {
    const { marine, stealer } = setup([3, 3]); // double → jam, miss
    marine.overwatchOn();
    expect(marine.overwatchShot(stealer)).toBe(false);
    expect(marine.jammed).toBe(true);
    expect(marine.overwatch).toBe(false); // jam knocks off overwatch
    expect(marine.ap).toBe(2);            // shot itself was free
  });

  it('jammed bolter cannot shoot until unjammed for 1 AP', () => {
    const { marine, stealer } = setup([3, 3, 6, 1]);
    marine.overwatchOn();
    marine.overwatchShot(stealer);        // jams
    expect(marine.shoot(stealer)).toBe(false);
    expect(marine.unjam()).toBe(true);
    expect(marine.ap).toBe(1);
    expect(marine.shoot(stealer)).toBe(true); // 6 kills
  });

  it('a killing double still jams', () => {
    const { marine, stealer } = setup([6, 6]);
    marine.overwatchOn();
    expect(marine.overwatchShot(stealer)).toBe(true);
    expect(stealer.alive).toBe(false);
    expect(marine.jammed).toBe(true);
  });
});
