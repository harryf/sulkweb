import { describe, it, expect } from 'vitest';
import { Board } from '../board/Board.js';
import { Dir } from '../core/Direction.js';
import { StormBolterMarine } from '../pieces/StormBolterMarine.js';
import { Genestealer } from '../pieces/Genestealer.js';
import { Blip } from '../pieces/Blip.js';
import { chargeOrientation, runStealerActions } from '../ai/StealerAI.js';
import { PieceEvents } from '../events/PieceEvents.js';
import { RollQueue } from '../core/Dice.js';

/** Row of squares at r, cols c0..c1 inclusive. */
const row = (r: number, c0: number, c1: number) =>
  Array.from({ length: c1 - c0 + 1 }, (_, i) => ({ x: c0 + i, y: r }));

const openBoard = (w: number, h: number) =>
  new Board(w, h, Array.from({ length: h }, (_, r) => row(r, 0, w - 1)).flat() as any);

describe('charge orientation: stealers end the phase facing their prey (ISC-763..770)', () => {
  it('a stealer within the charge radius faces the NEAREST living marine (ISC-763/764)', () => {
    const board = openBoard(14, 14);
    new StormBolterMarine(board, { c: 2, r: 2 }, Dir.S);       // 3 away
    new StormBolterMarine(board, { c: 10, r: 5 }, Dir.S);      // 5 away
    const s = new Genestealer(board, { c: 5, r: 5 }, Dir.S);
    chargeOrientation(board);
    // Nearest is (2,2): dc=-3, dr=-3, |dc|>=|dr| → W.
    expect(s.facing).toBe(Dir.W);
  });

  it('a stealer beyond the charge radius keeps its path facing (ISC-765)', () => {
    const board = openBoard(14, 14);
    new StormBolterMarine(board, { c: 0, r: 0 }, Dir.S);
    const s = new Genestealer(board, { c: 9, r: 9 }, Dir.E); // Chebyshev 9 > 6
    chargeOrientation(board);
    expect(s.facing).toBe(Dir.E);
  });

  it('nearest is Chebyshev-minimal with a deterministic board-order tie (ISC-766)', () => {
    const board = openBoard(14, 14);
    const west = new StormBolterMarine(board, { c: 2, r: 5 }, Dir.S);  // 3 west
    new StormBolterMarine(board, { c: 8, r: 5 }, Dir.S);               // 3 east
    const s = new Genestealer(board, { c: 5, r: 5 }, Dir.S);
    chargeOrientation(board);
    // Tie at distance 3: board order wins — the first-added (west) marine.
    expect(west.pos.c).toBe(2);
    expect(s.facing).toBe(Dir.W);
  });

  it('orientation is FREE: AP untouched and the free-turn bookkeeping preserved (ISC-767)', () => {
    const board = openBoard(14, 14);
    new StormBolterMarine(board, { c: 5, r: 2 }, Dir.S);
    const s = new Genestealer(board, { c: 5, r: 5 }, Dir.E);
    expect(s.tryTurn(-1)).toBe(true);      // free 90, arms the repeat rule
    const apBefore = s.ap;
    chargeOrientation(board);
    expect(s.ap).toBe(apBefore);           // the spin costs nothing
    s.tryTurn(-1);                          // SAME direction again...
    expect(s.ap).toBe(apBefore - 1);       // ...still costs 1: bookkeeping untouched
  });

  it('Anti: blips never charge-face (ISC-768)', () => {
    const board = openBoard(14, 14);
    new StormBolterMarine(board, { c: 5, r: 2 }, Dir.S);
    const b = new Blip(board, { c: 5, r: 5 }, 2);
    chargeOrientation(board);
    expect(b.facing).toBe(Dir.S); // blips are born facing S and stay put
  });

  it('Anti: dead marines are never charge targets (ISC-769)', () => {
    const board = openBoard(14, 14);
    const dead = new StormBolterMarine(board, { c: 5, r: 3 }, Dir.S);
    dead.alive = false;
    new StormBolterMarine(board, { c: 10, r: 5 }, Dir.S); // 5 east, the only LIVING one
    const s = new Genestealer(board, { c: 5, r: 5 }, Dir.S);
    chargeOrientation(board);
    expect(s.facing).toBe(Dir.E); // toward the living marine, not the corpse above
  });

  it('emits a facing-only pieceMoved ONLY when the facing changes (ISC-770)', () => {
    const board = openBoard(14, 14);
    new StormBolterMarine(board, { c: 5, r: 2 }, Dir.S);
    const already = new Genestealer(board, { c: 5, r: 5 }, Dir.N); // already facing prey
    const turning = new Genestealer(board, { c: 7, r: 5 }, Dir.S);
    const events: { pieceId: string; x: number; y: number }[] = [];
    const h = (e: any) => events.push(e);
    PieceEvents.on('pieceMoved', h);
    chargeOrientation(board);
    PieceEvents.off('pieceMoved', h);
    expect(events.filter(e => e.pieceId === already.id)).toHaveLength(0);
    const turned = events.filter(e => e.pieceId === turning.id);
    expect(turned).toHaveLength(1);
    expect(turned[0]).toMatchObject({ x: 7, y: 5 }); // facing-only: position unchanged
  });

  it('integration: runStealerActions leaves every close-in stealer facing a marine (ISC-763)', () => {
    const board = openBoard(10, 10);
    board.dice = new RollQueue(new Array(40).fill(3));
    const m = new StormBolterMarine(board, { c: 1, r: 1 }, Dir.S);
    const s = new Genestealer(board, { c: 6, r: 6 }, Dir.S);
    runStealerActions(board);
    // Vacuity guard: all-3s dice draw every combat — nobody dies, so the
    // facing assertion below MUST run (a silent skip here would leave the
    // runStealerActions call site of the sweep completely unpinned).
    expect(s.alive && m.alive).toBe(true);
    // Wherever the activation parked it, the epilogue points it at prey.
    const dc = m.pos.c - s.pos.c, dr = m.pos.r - s.pos.r;
    const expected = Math.abs(dc) >= Math.abs(dr) ? (dc > 0 ? Dir.E : Dir.W) : (dr > 0 ? Dir.S : Dir.N);
    expect(s.facing).toBe(expected);
  });

  it('combat consequence pinned: a charge-faced stealer strikes back on a defender win (documented buff)', async () => {
    const { closeCombat } = await import('../rules/combat.js');
    const board = openBoard(8, 8);
    const m = new StormBolterMarine(board, { c: 3, r: 3 }, Dir.E); // facing the stealer
    const s = new Genestealer(board, { c: 4, r: 3 }, Dir.W);       // charge-faced back at him
    chargeOrientation(board);
    expect(s.facing).toBe(Dir.W); // the sweep confirms the face-off
    // Marine attacks and LOSES: with the stealer facing him, directlyAhead
    // holds and the strike-back kills the attacker — the rules-live half of
    // the charge buff, alongside the 3-dice front defense.
    board.dice = new RollQueue([1, 6, 6, 6]); // marine 1; stealer 3 dice all 6
    const result = closeCombat(m, s)!;
    expect(result.outcome).toBe('defender');
    expect(m.alive).toBe(false);
    expect(s.alive).toBe(true);
  });

  it('the sweep rides the CAPTURED stream exactly once, as the tail, after every action (ISC-770 companion)', () => {
    // A pocket stealer on an isolated island square: it cannot act, so its
    // ONLY event in the whole phase must be the single phase-end spin. A
    // mobile stealer alongside proves the spin lands AFTER all activity.
    const board = new Board(8, 3, [
      ...row(1, 0, 3),
      { x: 5, y: 1 }, // disconnected pocket, distance 4 from the marine
    ] as any);
    board.dice = new RollQueue(new Array(20).fill(2)); // all draws — everyone lives
    new StormBolterMarine(board, { c: 1, r: 1 }, Dir.E);
    const mobile = new Genestealer(board, { c: 3, r: 1 }, Dir.W);
    const pocket = new Genestealer(board, { c: 5, r: 1 }, Dir.E); // facing AWAY from prey
    const stream = PieceEvents.capture(() => runStealerActions(board));
    const pocketEvents = stream.filter((e: any) => e.payload?.pieceId === pocket.id);
    expect(pocketEvents).toHaveLength(1); // captured once — never live, never doubled
    const spin = pocketEvents[0] as any;
    expect(spin.type).toBe('pieceMoved');
    expect(spin.payload).toMatchObject({ x: 5, y: 1, facing: Dir.W }); // spun toward prey, no move
    expect(pocket.facing).toBe(Dir.W); // applied to the board exactly once
    // Tail ordering: the spin comes after EVERY position-changing or combat
    // event in the stream — a mid-loop sweep would break this.
    const spinIdx = stream.indexOf(pocketEvents[0]);
    stream.forEach((e: any, i: number) => {
      if (e.type === 'closeCombat') expect(i).toBeLessThan(spinIdx);
      if (e.type === 'pieceMoved' && e.payload.pieceId === mobile.id) expect(i).toBeLessThan(spinIdx);
    });
    expect(stream.some((e: any) => e.payload?.pieceId === mobile.id)).toBe(true); // the phase really had action
  });
});
