import { Board } from '../board/Board.js';
import { Piece, type Coord } from '../pieces/Piece.js';
import { Blip } from '../pieces/Blip.js';
import { StormBolterMarine } from '../pieces/StormBolterMarine.js';
import { closeCombat } from '../rules/combat.js';
import { canSee } from '../board/vision.js';
import { Dir, DIR_VEC } from '../core/Direction.js';

const chebyshev = (a: Coord, b: Coord) => Math.max(Math.abs(a.c - b.c), Math.abs(a.r - b.r));

function marines(board: Board): Piece[] {
  return board.pieces.filter((p): p is Piece => (p as Piece).kind === 'marine');
}

function nearestMarine(board: Board, from: Coord): Piece | undefined {
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
    if (marine instanceof StormBolterMarine && marine.overwatch && !marine.jammed) {
      marine.overwatchShot(target);
    }
  }
}

function facingToward(from: Coord, to: Coord): Dir {
  const dc = to.c - from.c, dr = to.r - from.r;
  if (Math.abs(dc) >= Math.abs(dr)) return dc > 0 ? Dir.E : Dir.W;
  return dr > 0 ? Dir.S : Dir.N;
}

/**
 * BFS over the board graph (8-connected). Closed-door squares count as
 * traversable — the AI walks up and opens them on contact. Occupied squares
 * block (other pieces are solid); goal squares are given by `isGoal`.
 * Returns the FIRST step of a shortest path from `from`, or undefined when
 * no goal is reachable. (Greedy stepping was refuted in playtest: it dead-ends
 * permanently in concave room pockets — see ISA Changelog 2026-08-14.)
 */
function nextStepOnPath(board: Board, from: Coord, isGoal: (c: Coord) => boolean): Coord | undefined {
  // Edge-model doors do not block squares; a closed edge on the path is fine —
  // the piece opens it on contact in stepToward.
  const traversable = (c: Coord) => board.isPassable(c);
  // Friendly stealer-side pieces are transparent for PATHING (the horde queues
  // through chokepoints instead of idling when a friend holds the only goal
  // square); marines are solid obstacles. The caller refuses to actually STEP
  // onto any occupied square — a blocked first step just means "wait in line".
  const marineAt = (c: Coord) => {
    const occupant = board.pieceAt(c) as Piece | undefined;
    return occupant?.kind === 'marine';
  };
  const key = (c: Coord) => `${c.c},${c.r}`;
  const prev = new Map<string, Coord | null>();
  prev.set(key(from), null);
  const queue: Coord[] = [from];
  while (queue.length > 0) {
    const cur = queue.shift()!;
    if (isGoal(cur) && !(cur.c === from.c && cur.r === from.r)) {
      // walk back to the step right after `from`
      let step = cur;
      for (;;) {
        const back = prev.get(key(step));
        if (back === null || back === undefined) return step;
        if (back.c === from.c && back.r === from.r) return step;
        step = back;
      }
    }
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        if (dc === 0 && dr === 0) continue;
        const nxt = { c: cur.c + dc, r: cur.r + dr };
        if (prev.has(key(nxt))) continue;
        if (!traversable(nxt) || marineAt(nxt)) continue;
        prev.set(key(nxt), cur);
        queue.push(nxt);
      }
    }
  }
  return undefined;
}

/** One step along a real shortest path toward a close-combat lineup square
 * (orthogonally adjacent to ANY marine — the nearest marine's own adjacency can
 * be fully blocked by its squad-mates).
 * 'acted' = moved or opened a door on the path; 'wait' = path exists but the
 * next square is held by a friend (queue in place, do NOT open side doors);
 * 'none' = no path at all. */
function stepToward(board: Board, piece: Piece, targets: Coord[]): 'acted' | 'wait' | 'none' {
  const orthoAdjacent = (c: Coord) => targets.some(t => Math.abs(c.c - t.c) + Math.abs(c.r - t.r) === 1);
  const anyAdjacent = (c: Coord) => targets.some(t => chebyshev(c, t) === 1);
  const next = nextStepOnPath(board, piece.pos, orthoAdjacent)
    ?? nextStepOnPath(board, piece.pos, anyAdjacent);
  if (!next) return 'none';
  if (board.isOccupied(next)) return 'wait'; // a friend holds the next square — wait in line

  const door = board.doorBetween(piece.pos, next);
  if (door && !door.isOpen) {
    if (piece.ap < 1) return 'wait';
    // A blip may not open a door that would expose it to marine sight
    // (original Blip.can_use_door "pretend it's open" check).
    if (piece.kind === 'blip') {
      door.open();
      const exposed = squareSeenByMarine(board, piece.pos);
      door.close();
      if (exposed) return 'wait';
    }
    door.open();
    piece.ap -= 1;
    PieceEvents.emit('doorToggled', { x: door.square.x, y: door.square.y, facing: door.facing, open: true });
    return 'acted';
  }

  // Face the direction of travel first (free/cheap for stealers), then move
  const dir = facingToward(piece.pos, next);
  if (piece.facing !== dir && piece.kind === 'stealer') {
    const delta = ((dir - piece.facing + 4) % 4);
    piece.tryTurn(delta === 1 ? 1 : delta === 3 ? -1 : 2);
  }
  return piece.tryMove(next.c - piece.pos.c, next.r - piece.pos.r) ? 'acted' : 'wait';
}

import { PieceEvents } from '../events/PieceEvents.js';

/** Open a closed door on an edge of the piece's own square (1 AP). Stealer side ignores facing for doors. */
function openAdjacentDoor(board: Board, piece: Piece): boolean {
  if (piece.ap < 1) return false;
  const ORTHO = [{ dc: 0, dr: -1 }, { dc: 1, dr: 0 }, { dc: 0, dr: 1 }, { dc: -1, dr: 0 }];
  for (const v of ORTHO) {
    const door = board.doorBetween(piece.pos, { c: piece.pos.c + v.dc, r: piece.pos.r + v.dr });
    if (door && !door.isOpen) {
      door.open();
      piece.ap -= 1;
      PieceEvents.emit('doorToggled', { x: door.square.x, y: door.square.y, facing: door.facing, open: true });
      return true;
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
      const squad = marines(board);
      if (squad.length === 0) return;
      // Attack any adjacent marine (orthogonal first — that's the CC lineup),
      // not just the array-order "nearest" one.
      const marine = squad.find(m => Math.abs(m.pos.c - p.pos.c) + Math.abs(m.pos.r - p.pos.r) === 1)
        ?? squad.find(m => chebyshev(m.pos, p.pos) === 1)
        ?? nearestMarine(board, p.pos)!;

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
          const survived = closeCombat(p, marine);
          // A CC death vacates a square — sight lines may open onto a blip.
          // This runs inside capture() during the animated phase, where event
          // handlers are suppressed, so the sight re-check must live HERE.
          convertRevealedBlips(board);
          if (!survived) break;
          overwatchReactions(board, p);
          convertRevealedBlips(board);
          continue;
        }
      }

      const step = stepToward(board, p, marines(board).map(m => m.pos));
      if (p.kind === 'blip' && step !== 'acted') {
        // The blip cannot advance (marine sight / adjacency bars it, or it is
        // boxed in). Original play: convert voluntarily — legal only while the
        // blip has taken no action — once marines are near (within 6 squares),
        // so the stealers inside can charge from cover next turn.
        const blip = p as Blip;
        const near = marines(board).some(m => chebyshev(m.pos, p.pos) <= 6);
        if (near && blip.canConvert()) {
          blip.convert();
          convertRevealedBlips(board);
        }
        break;
      }
      if (step === 'wait') break; // queued behind a friend — hold, don't burn AP or flap doors
      if (step === 'none') {
        // No path at all — last-resort safety net: open any adjacent door.
        if (!openAdjacentDoor(board, p)) break;
        convertRevealedBlips(board); // the opened door may expose a blip
        continue; // door opened; try stepping again next iteration
      }
      overwatchReactions(board, p);
      // The step (and any door it opened, and any overwatch death) changed
      // sight lines — convert every blip a marine now sees, including p itself
      // if it just stepped into view. Idempotent; converted pieces go !alive.
      convertRevealedBlips(board);
      if (!p.alive) break;
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
