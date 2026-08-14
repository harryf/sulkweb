import { it, expect, describe, beforeEach } from 'vitest';
import { Board } from '../board/Board.js';
import { StormBolterMarine } from '../pieces/StormBolterMarine.js';
import { Genestealer } from '../pieces/Genestealer.js';
import { Blip } from '../pieces/Blip.js';
import { PieceEvents } from '../events/PieceEvents.js';
import { RollQueue } from '../core/Dice.js';

/**
 * Regression for the 2026-08-14 playtest bug: pieceAdded fired from the base
 * Piece constructor BEFORE subclass field initializers assigned `kind`, so
 * every listener saw kind === undefined and the client rendered reinforcement
 * blips and converted stealers with the marine texture (ISC-77).
 */
describe('pieceAdded event carries the correct kind at emit time', () => {
  let board: Board;

  beforeEach(() => {
    PieceEvents.all.clear();
    board = new Board(22, 27, [{ x: 5, y: 5 }, { x: 6, y: 5 }, { x: 7, y: 5 }]);
    board.dice = new RollQueue([1, 1, 1, 1, 1, 1]);
  });

  it.each([
    ['marine', (b: Board) => new StormBolterMarine(b, { c: 5, r: 5 })],
    ['stealer', (b: Board) => new Genestealer(b, { c: 6, r: 5 })],
    ['blip', (b: Board) => new Blip(b, { c: 7, r: 5 }, 1)],
  ])('%s', (expected, make) => {
    let seenKind: string | undefined = 'never-fired';
    let liveKind: string | undefined = 'never-fired';
    PieceEvents.on('pieceAdded', ({ pieceId, kind }: any) => {
      seenKind = kind; // payload at emit time
      liveKind = (board.pieces.find(p => p.id === pieceId) as any)?.kind; // what a listener reads off the piece
    });
    make(board);
    expect(seenKind).toBe(expected);
    expect(liveKind).toBe(expected);
  });
});
