import { Board } from '../board/Board.js';
import { Piece, type Coord } from '../pieces/Piece.js';
import { Blip } from '../pieces/Blip.js';
import { StormBolterMarine } from '../pieces/StormBolterMarine.js';
import { closeCombat } from '../rules/combat.js';
import { canSee } from '../board/vision.js';
import { Dir, DIR_VEC } from '../core/Direction.js';

const chebyshev = (a: Coord, b: Coord) => Math.max(Math.abs(a.c - b.c), Math.abs(a.r - b.r));

function marines(board: Board): StormBolterMarine[] {
  return board.pieces.filter((p): p is StormBolterMarine => (p as Piece).kind === 'marine');
}

function nearestMarine(board: Board, from: Coord): StormBolterMarine | undefined {
  return marines(board).sort((a, b) => chebyshev(a.pos, from) - chebyshev(b.pos, from))[0];
}

/** Any marine currently sees this square → blips there must convert. */
export function squareSeenByMarine(board: Board, coord: Coord): boolean {
  const sq = board.get(coord.c, coord.r);
  if (!sq) return false;
  return marines(board).some(m => canSee(board, m, sq));
}

/** Convert every blip that a marine can currently see. Returns converted count. */
export function convertRevealedBlips(board: Board): number {
  let converted = 0;
  for (const piece of [...board.pieces]) {
    if ((piece as Piece).kind === 'blip' && squareSeenByMarine(board, piece.pos)) {
      (piece as Blip).convert();
      converted++;
    }
  }
  return converted;
}

/** After a stealer acts, every overwatching marine that sees it reacts with free fire. */
function overwatchReactions(board: Board, target: Piece): void {
  for (const marine of marines(board)) {
    if (!target.alive) return;
    if (marine.overwatch && !marine.jammed) {
      marine.overwatchShot(target);
    }
  }
}

function facingToward(from: Coord, to: Coord): Dir {
  const dc = to.c - from.c, dr = to.r - from.r;
  if (Math.abs(dc) >= Math.abs(dr)) return dc > 0 ? Dir.E : Dir.W;
  return dr > 0 ? Dir.S : Dir.N;
}

/** One greedy step toward the target; returns true if the piece moved. */
function stepToward(board: Board, piece: Piece, target: Coord): boolean {
  const options: { coord: Coord; d: number; e: number }[] = [];
  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      if (dc === 0 && dr === 0) continue;
      const coord = { c: piece.pos.c + dc, r: piece.pos.r + dr };
      if (!board.isPassable(coord) || board.isOccupied(coord)) continue;
      options.push({ coord, d: chebyshev(coord, target), e: Math.hypot(coord.c - target.c, coord.r - target.r) });
    }
  }
  // Chebyshev decides progress; Euclidean tie-break keeps the path straight
  options.sort((a, b) => a.d - b.d || a.e - b.e);
  const here = chebyshev(piece.pos, target);
  const hereE = Math.hypot(piece.pos.c - target.c, piece.pos.r - target.r);
  for (const opt of options) {
    // Progress = smaller Chebyshev, or equal Chebyshev with strictly smaller
    // Euclidean (walks the diagonal plateau where max(dx,dy) stays constant).
    const progress = opt.d < here || (opt.d === here && opt.e < hereE - 1e-9);
    if (!progress && !(here === 1 && opt.d === 1)) break;
    // Face the direction of travel first (free/cheap for stealers), then move
    const dir = facingToward(piece.pos, opt.coord);
    if (piece.facing !== dir && piece.kind === 'stealer') {
      const delta = ((dir - piece.facing + 4) % 4);
      piece.tryTurn(delta === 1 ? 1 : delta === 3 ? -1 : 2);
    }
    if (piece.tryMove(opt.coord.c - piece.pos.c, opt.coord.r - piece.pos.r)) return true;
  }
  return false;
}

import { PieceEvents } from '../events/PieceEvents.js';

/** Open a closed door adjacent to the piece (1 AP). Stealer side ignores facing for doors. */
function openAdjacentDoor(board: Board, piece: Piece): boolean {
  if (piece.ap < 1) return false;
  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      if (dc === 0 && dr === 0) continue;
      const door = board.doorAt({ c: piece.pos.c + dc, r: piece.pos.r + dr });
      if (door && !door.isOpen) {
        door.open();
        piece.ap -= 1;
        PieceEvents.emit('doorToggled', { x: door.square.x, y: door.square.y, open: true });
        return true;
      }
    }
  }
  return false;
}

/**
 * AI0 — the whole stealer side takes its actions:
 * - stealers adjacent (ahead) of a marine attack in close combat
 * - otherwise stealers and blips step greedily toward the nearest marine
 * - blips convert when they end in marine sight
 * - every stealer action triggers overwatch reactions
 */
export function runStealerActions(board: Board): void {
  for (const piece of [...board.pieces]) {
    const p = piece as Piece;
    if (p.kind === 'marine' || !p.alive) continue;

    let guard = 0;
    while (p.alive && p.ap > 0 && guard++ < 20) {
      const marine = nearestMarine(board, p.pos);
      if (!marine) return;

      if (p.kind === 'stealer' && chebyshev(p.pos, marine.pos) === 1) {
        // Face the marine, then rend
        const dir = facingToward(p.pos, marine.pos);
        if (p.facing !== dir) {
          const delta = ((dir - p.facing + 4) % 4);
          p.tryTurn(delta === 1 ? 1 : delta === 3 ? -1 : 2);
        }
        // Diagonal adjacency: CC needs the marine straight ahead — step around instead
        const v = DIR_VEC[p.facing];
        const ahead = { c: p.pos.c + v.dc, r: p.pos.r + v.dr };
        if (ahead.c === marine.pos.c && ahead.r === marine.pos.r) {
          if (!closeCombat(p, marine)) break;
          overwatchReactions(board, p);
          continue;
        }
      }

      let moved = stepToward(board, p, marine.pos);
      if (!moved) {
        // Blocked — likely a closed door on the path. Any adjacent door: open it.
        moved = openAdjacentDoor(board, p);
        if (!moved) break;
        continue; // door opened; try stepping again next iteration
      }
      overwatchReactions(board, p);
      if (!p.alive) break;
      if (p.kind === 'blip' && squareSeenByMarine(board, p.pos)) {
        (p as Blip).convert();
        break;
      }
    }
  }
}

/** Place reinforcement blips on free entry squares. Returns the blips created. */
export function spawnBlips(board: Board, entryPoints: Coord[], count: number): Blip[] {
  const blips: Blip[] = [];
  let i = 0;
  for (let n = 0; n < count && entryPoints.length > 0; n++) {
    // round-robin over entry points, skipping occupied ones
    let placed = false;
    for (let tries = 0; tries < entryPoints.length && !placed; tries++) {
      const entry = entryPoints[(i + tries) % entryPoints.length];
      if (board.isPassable(entry) && !board.isOccupied(entry)) {
        blips.push(new Blip(board, { ...entry }));
        placed = true;
        i = (i + tries + 1) % entryPoints.length;
      }
    }
    if (!placed) break;
  }
  return blips;
}
