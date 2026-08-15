import { describe, it, expect } from 'vitest';
import { Board } from '../board/Board.js';
import { StormBolterMarine } from '../pieces/StormBolterMarine.js';
import { Genestealer } from '../pieces/Genestealer.js';
import { Dir } from '../core/Direction.js';
import { RollQueue } from '../core/Dice.js';
import { closeCombat, isFacing } from '../rules/combat.js';

function duel(rolls: number[], stealerFacing: Dir = Dir.S) {
  const board = new Board(5, 5);
  board.dice = new RollQueue(rolls);
  const marine = new StormBolterMarine(board, { c: 2, r: 3 }, Dir.N);
  const stealer = new Genestealer(board, { c: 2, r: 2 }, stealerFacing);
  return { board, marine, stealer };
}

describe('close combat', () => {
  it('stealer defends with 3 dice when facing its attacker', () => {
    // marine rolls 1 die, stealer 3 — script: marine 4; stealer 1,2,3 → marine wins
    const { marine, stealer, board } = duel([4, 1, 2, 3]);
    const result = closeCombat(marine, stealer)!;
    expect(result.attackerRolls).toEqual([4]);
    expect(result.defenderRolls).toEqual([1, 2, 3]);
    expect(result.outcome).toBe('attacker');
    expect(stealer.alive).toBe(false);
    expect(marine.ap).toBe(3);
    expect(board.pieceAt({ c: 2, r: 2 })).toBeUndefined();
  });

  it('stealer defends with only 2 dice from behind — and DIES when it loses (ISC-127)', () => {
    // Original cc(): attacker-win kills the defender regardless of its facing.
    const { marine, stealer } = duel([6, 1, 2], Dir.N); // stealer faces away
    expect(isFacing(stealer, marine)).toBe(false);
    const result = closeCombat(marine, stealer)!;
    expect(result.defenderRolls).toEqual([1, 2]);
    expect(result.outcome).toBe('attacker');
    expect(stealer.alive).toBe(false);
  });

  it('defender wins from behind: attacker SURVIVES, defender spins to face (ISC-128)', () => {
    // Defender can only kill an attacker standing directly ahead of it.
    const { marine, stealer } = duel([2, 5, 6], Dir.N); // stealer faces away, rolls higher
    const result = closeCombat(marine, stealer)!;
    expect(result.outcome).toBe('defender');
    expect(marine.alive).toBe(true);         // stealer couldn't strike back
    expect(stealer.alive).toBe(true);
    expect(stealer.facing).toBe(Dir.S);      // now facing the marine
  });

  it('draw rotates a non-facing defender toward the attacker (ISC-129)', () => {
    const { marine, stealer } = duel([5, 5, 4], Dir.N); // stealer faces away, best ties
    const result = closeCombat(marine, stealer)!;
    expect(result.outcome).toBe('draw');
    expect(marine.alive).toBe(true);
    expect(stealer.alive).toBe(true);
    expect(stealer.facing).toBe(Dir.S);
  });

  it('defender wins: attacker dies', () => {
    const { marine, stealer } = duel([2, 6, 1, 1]);
    const result = closeCombat(marine, stealer)!;
    expect(result.outcome).toBe('defender');
    expect(marine.alive).toBe(false);
    expect(stealer.alive).toBe(true);
  });

  it('tie: both survive', () => {
    const { marine, stealer } = duel([5, 5, 1, 2]);
    const result = closeCombat(marine, stealer)!;
    expect(result.outcome).toBe('draw');
    expect(marine.alive).toBe(true);
    expect(stealer.alive).toBe(true);
  });

  it('can only attack the square directly ahead', () => {
    const board = new Board(5, 5);
    board.dice = new RollQueue([6, 1, 1, 1]);
    const marine = new StormBolterMarine(board, { c: 2, r: 3 }, Dir.E); // facing away from stealer
    const stealer = new Genestealer(board, { c: 2, r: 2 }, Dir.S);
    expect(closeCombat(marine, stealer)).toBeUndefined();
    expect(marine.ap).toBe(4);
  });

  it('stealer attacking a marine: marine defends with 1 die', () => {
    const board = new Board(5, 5);
    board.dice = new RollQueue([1, 2, 6, 3]);
    const stealer = new Genestealer(board, { c: 2, r: 2 }, Dir.S);
    const marine = new StormBolterMarine(board, { c: 2, r: 3 }, Dir.N);
    const result = closeCombat(stealer, marine)!;
    expect(result.attackerRolls).toEqual([1, 2, 6]); // 3 dice, facing
    expect(result.defenderRolls).toEqual([3]);
    expect(marine.alive).toBe(false);
  });
});

describe('genestealer movement economy', () => {
  it('has 6 AP, free 90° turns, 1 AP side-steps', () => {
    const board = new Board(7, 7);
    const s = new Genestealer(board, { c: 3, r: 3 }, Dir.S);
    expect(s.apInitial).toBe(6);
    expect(s.tryTurn(1)).toBe(true);
    expect(s.ap).toBe(6);          // free turn
    expect(s.tryTurn(2)).toBe(true);
    expect(s.ap).toBe(5);          // about-face costs 1
    expect(s.stepLeft()).toBe(true);
    expect(s.ap).toBe(4);          // side-step costs 1
    expect(s.moveBackward()).toBe(true);
    expect(s.ap).toBe(2);          // backward costs 2
  });

  it('second consecutive same-direction 90° turn costs 1 AP (ISC-133)', () => {
    const board = new Board(7, 7);
    const s = new Genestealer(board, { c: 3, r: 3 }, Dir.S);
    expect(s.tryTurn(1)).toBe(true);
    expect(s.ap).toBe(6);          // first right turn free
    expect(s.tryTurn(1)).toBe(true);
    expect(s.ap).toBe(5);          // SAME direction again — pays 1
    expect(s.tryTurn(-1)).toBe(true);
    expect(s.ap).toBe(5);          // alternating direction is free again
    expect(s.tryTurn(-1)).toBe(true);
    expect(s.ap).toBe(4);          // repeat left — pays
    // a move in between re-earns the free turn
    expect(s.moveForward()).toBe(true);
    expect(s.ap).toBe(3);          // move cost 1
    expect(s.tryTurn(-1)).toBe(true);
    expect(s.ap).toBe(3);          // turn free again after acting
  });
});

describe('sergeant close combat (ISC-142)', () => {
  it('adds +1 to every CC die', async () => {
    const { SergeantMarine } = await import('../pieces/StormBolterMarine.js');
    const board = new Board(5, 5);
    board.dice = new RollQueue([5, 1, 2, 5]); // sgt 5+1=6 vs stealer best 5 → sgt wins
    const sgt = new SergeantMarine(board, { c: 2, r: 3 }, Dir.N);
    const stealer = new Genestealer(board, { c: 2, r: 2 }, Dir.S);
    const result = closeCombat(sgt, stealer)!;
    expect(result.attackerRolls).toEqual([6]);   // 5 raw + 1 bonus
    expect(result.outcome).toBe('attacker');
    expect(stealer.alive).toBe(false);
    expect(sgt.spriteKey).toBe('terminator_sergeant');
    expect(sgt.timerBonus).toBe(30);
  });
});
