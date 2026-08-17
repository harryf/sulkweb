import { Board } from '../board/Board.js';
import { Piece, type Coord } from '../pieces/Piece.js';
import { Blip } from '../pieces/Blip.js';
import { StormBolterMarine } from '../pieces/StormBolterMarine.js';
import { closeCombat } from '../rules/combat.js';
import { squareSeenByMarine } from '../board/vision.js';
import { looseCatPos, intactDucting, stealerExoticInteractions } from '../rules/exotic.js';
import { DIR_VEC, ORTHO_VECS, chebyshev, facingToward, turnToward } from '../core/Direction.js';
import { openDoorWithEvent, closeDoorWithEvent } from '../rules/Door.js';
import {
  computeThreat, planHive, pathStep, threatPenalty,
  type HiveContext, type HivePlan, type ThreatMap, type PathOpts,
} from './hive.js';

export { squareSeenByMarine };
export type { HiveContext };

function marines(board: Board): Piece[] {
  return board.pieces.filter((p): p is Piece => (p as Piece).kind === 'marine');
}

function nearestMarine(board: Board, from: Coord): Piece | undefined {
  return marines(board).sort((a, b) => chebyshev(a.pos, from) - chebyshev(b.pos, from))[0];
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

/** One step along a least-cost path (see hive.pathStep) toward `isGoal`.
 * 'acted' = moved or opened a door on the path; 'wait' = path exists but the
 * next square is held by a friend (queue in place, do NOT open side doors);
 * 'none' = no path at all. */
function stepAlong(board: Board, piece: Piece, isGoal: (c: Coord) => boolean, opts: PathOpts): 'acted' | 'wait' | 'none' {
  const found = pathStep(board, piece.pos, isGoal, opts);
  if (!found) return 'none';
  const next = found.step;
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
    openDoorWithEvent(door, piece);
    return 'acted';
  }

  // Face the direction of travel first (free/cheap for stealers), then move
  if (piece.kind === 'stealer') {
    turnToward(piece, facingToward(piece.pos, next));
  }
  return piece.tryMove(next.c - piece.pos.c, next.r - piece.pos.r) ? 'acted' : 'wait';
}

/** Close-combat lineup step: an orthogonal-adjacency square first (the CC
 * lineup), falling back to any adjacency — the nearest marine's own adjacency
 * can be fully blocked by its squad-mates. Threat-weighted per piece kind:
 * stealers pay to cross fire lanes (and detour around watched corridors);
 * blips prefer a fully hidden route and fall back to the plain path (their
 * tryMove refuses exposed squares anyway, which parks them — old behavior). */
function stepToward(board: Board, piece: Piece, targets: Coord[], threat?: ThreatMap): 'acted' | 'wait' | 'none' {
  const orthoAdjacent = (c: Coord) => targets.some(t => Math.abs(c.c - t.c) + Math.abs(c.r - t.r) === 1);
  const anyAdjacent = (c: Coord) => targets.some(t => chebyshev(c, t) === 1);
  let opts: PathOpts = {};
  if (threat && piece.kind === 'stealer') opts = { penalty: threatPenalty(threat) };
  if (threat && piece.kind === 'blip') {
    const avoid = new Set([...threat.kill, ...threat.seen]);
    const hidden = stepAlongFirst(board, piece, [orthoAdjacent, anyAdjacent], { avoid });
    if (hidden !== 'none') return hidden;
    opts = {};
  }
  return stepAlongFirst(board, piece, [orthoAdjacent, anyAdjacent], opts);
}

function stepAlongFirst(board: Board, piece: Piece, goals: ((c: Coord) => boolean)[], opts: PathOpts): 'acted' | 'wait' | 'none' {
  for (const isGoal of goals) {
    const r = stepAlong(board, piece, isGoal, opts);
    if (r !== 'none') return r;
  }
  return 'none';
}

/** Open a closed door on an edge of the piece's own square (1 AP). Stealer side ignores facing for doors. */
function openAdjacentDoor(board: Board, piece: Piece): boolean {
  if (piece.ap < 1) return false;
  for (const v of ORTHO_VECS) {
    const door = board.doorBetween(piece.pos, { c: piece.pos.c + v.dc, r: piece.pos.r + v.dr });
    if (door && !door.isOpen) {
      openDoorWithEvent(door, piece);
      return true;
    }
  }
  return false;
}

/** A staging piece shuts an adjacent open door when that takes the doorway
 * dark (silent peek first, like the blip door-exposure probe) — the hive goes
 * back to massing behind doors the marines opened. */
function tryCloseUsefulDoor(board: Board, piece: Piece): boolean {
  if (piece.ap < 1) return false;
  // Reach = door edges incident to the piece's own square or any neighbor
  // (manual front-3 rule; stealer 90° turns are free, so every neighbor can
  // be a front square — same facing-agnostic treatment as openAdjacentDoor).
  const anchors: Coord[] = [piece.pos];
  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      if (dc !== 0 || dr !== 0) anchors.push({ c: piece.pos.c + dc, r: piece.pos.r + dr });
    }
  }
  const tried = new Set<unknown>();
  for (const a of anchors) {
    for (const v of ORTHO_VECS) {
      const other = { c: a.c + v.dc, r: a.r + v.dr };
      const door = board.doorBetween(a, other);
      if (!door || tried.has(door) || !door.isOpen || door.destroyed) continue;
      tried.add(door);
      const flanks = [{ c: door.square.x, r: door.square.y }, door.otherSide()];
      const seenNow = (c: Coord) => squareSeenByMarine(board, c);
      const beforePiece = seenNow(piece.pos);
      const beforeFlanks = flanks.map(seenNow);
      if (!beforePiece && !beforeFlanks.some(Boolean)) continue; // nothing peers through
      door.close(); // silent peek, like the blip door-exposure probe
      const afterPiece = seenNow(piece.pos);
      // The marine-side flank never goes dark — what matters is that OUR side
      // of the doorway flips out of sight and we ourselves end hidden.
      const flipped = flanks.some((f, i) => beforeFlanks[i] && !seenNow(f));
      door.open();
      if (afterPiece || !flipped) continue; // closing would not take us dark
      closeDoorWithEvent(door, piece);
      return true;
    }
  }
  return false;
}

/**
 * AI1 — the whole stealer side takes its actions as a hive (see ai/hive.ts):
 * - a per-turn plan assigns each piece assault / stage / block / hold
 * - assault pieces charge (threat-weighted) and fight adjacent marines
 * - stage pieces mass on hidden squares near the squad and shut doors
 * - the blocker walks into the fire lane and parks — its body blocks LOS
 * - blips convert when they end in marine sight; every action triggers
 *   overwatch reactions and a sight re-check (unchanged AI0 invariants)
 */
export function runStealerActions(board: Board, ctx: HiveContext = {}): void {
  if (marines(board).length === 0) return;
  const plan: HivePlan = planHive(board, computeThreat(board), ctx);

  // Activation order: board order (test-stable), except a wave striking into
  // live fire lanes goes nearest-first so the column unwinds front-to-back.
  let order = [...board.pieces];
  if (plan.launched && computeThreat(board).kill.size > 0) {
    const near = (p: Piece) => {
      const m = nearestMarine(board, p.pos);
      return m ? chebyshev(m.pos, p.pos) : 999;
    };
    order = order.slice().sort((a, b) => near(a as Piece) - near(b as Piece));
  }

  for (const piece of order) {
    const p = piece as Piece;
    if (p.kind === 'marine' || !p.alive) continue;
    const role = plan.roles.get(p.id) ?? 'assault';
    if (role === 'hold') continue; // the parked blocker keeps blocking — no action, no reaction fire
    // Fresh threat per activation: parked blockers, opened/closed doors and
    // dead watchers all change the map mid-phase.
    const threat = computeThreat(board);
    const hunt = plan.huntTarget.get(p.id);

    let guard = 0;
    while (p.alive && p.ap > 0 && guard++ < 20) {
      const squad = marines(board);
      if (squad.length === 0) return;
      // Attack any adjacent marine (orthogonal first — that's the CC lineup),
      // not just the array-order "nearest" one.
      const marine = squad.find(m => Math.abs(m.pos.c - p.pos.c) + Math.abs(m.pos.r - p.pos.r) === 1)
        ?? squad.find(m => chebyshev(m.pos, p.pos) === 1)
        ?? nearestMarine(board, p.pos)!;

      // Exotic objectives: an adjacent loose C.A.T. or intact ducting square
      // is stepped ONTO (they don't occupy) — skewering the cat / tearing the
      // duct out (mission 3 / mission 6).
      if (p.kind === 'stealer') {
        const exoticSpots = [looseCatPos(board), ...intactDucting(board)]
          .filter((t): t is Coord => t !== undefined);
        const spot = exoticSpots.find(t =>
          chebyshev(p.pos, t) === 1 && board.isPassable(t) && !board.isOccupied(t));
        if (spot) {
          turnToward(p, facingToward(p.pos, spot));
          if (p.tryMove(spot.c - p.pos.c, spot.r - p.pos.r)) {
            stealerExoticInteractions(board, p);
            overwatchReactions(board, p);
            convertRevealedBlips(board);
            if (!p.alive) break;
            continue;
          }
        }
      }

      if (p.kind === 'stealer' && chebyshev(p.pos, marine.pos) === 1) {
        // Face the marine, then rend
        turnToward(p, facingToward(p.pos, marine.pos));
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

      // ---- role movement ----
      let step: 'acted' | 'wait' | 'none';
      if (role === 'stage') {
        const target = plan.stagingTarget.get(p.id) ?? p.pos;
        if (target.c === p.pos.c && target.r === p.pos.r) {
          // In position: shut a useful door if one is at hand, then hold.
          tryCloseUsefulDoor(board, p);
          break;
        }
        const avoid = p.kind === 'blip'
          ? new Set([...threat.kill, ...threat.seen])
          : threat.kill;
        step = stepAlong(board, p, c => c.c === target.c && c.r === target.r,
          { avoid, penalty: threatPenalty(threat) });
        if (step === 'none') {
          // The safe route vanished mid-phase (a door, a death) — hold hidden
          // rather than blunder into the open; the plan re-evaluates next turn.
          tryCloseUsefulDoor(board, p);
          break;
        }
      } else if (role === 'block') {
        // Raw shortest path into the fire lane — the sacrifice takes the
        // reaction bursts (each one a jam roll) and parks on the first watched
        // square it survives, shutting the corridor behind its body.
        const goals: Coord[] = marines(board).map(m => m.pos);
        step = stepToward(board, p, goals);
      } else {
        const goals: Coord[] = hunt ? [hunt] : marines(board).map(m => m.pos);
        if (p.kind === 'stealer' && !hunt) {
          const cat = looseCatPos(board);
          if (cat) goals.push(cat);
          goals.push(...intactDucting(board));
        }
        step = stepToward(board, p, goals, threat);
      }

      if (p.kind === 'blip' && step !== 'acted') {
        // The blip cannot advance (marine sight / adjacency bars it, or it is
        // boxed in). Original play: convert voluntarily — legal only while the
        // blip has taken no action — once marines are near (within 6 squares),
        // so the stealers inside can charge from cover next turn. A FRUSTRATED
        // blip (idle for turns) converts even with the marines far: stealers
        // have no exposure caution, so they unjam the queue and go hunting —
        // the fix for a blip parked forever at a door it refuses to open.
        const blip = p as Blip;
        const near = marines(board).some(m => chebyshev(m.pos, p.pos) <= 6);
        if ((near || plan.frustrated.has(p.id)) && blip.canConvert()) {
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
      // A path step can land on the cat / a ducting square in passing.
      stealerExoticInteractions(board, p);
      // The step (and any door it opened, and any overwatch death) changed
      // sight lines — convert every blip a marine now sees, including p itself
      // if it just stepped into view. Idempotent; converted pieces go !alive.
      convertRevealedBlips(board);
      if (!p.alive) break;
      // The blocker parks on the first fire-lane square it survives: from here
      // its body blocks the sight line and the mass builds up behind it.
      if (role === 'block' && threat.kill.has(`${p.pos.c},${p.pos.r}`)) break;
    }
  }
}

/** Place reinforcement blips on free entry squares. Returns the blips created.
 *  `startIndex` rotates the round-robin origin (the engine passes the turn
 *  number) so successive turns fan out across DIFFERENT entry points instead
 *  of hammering the first free one every turn; entries no marine currently
 *  sees are preferred — a blip born in sight converts on the spot. */
export function spawnBlips(board: Board, entryPoints: Coord[], count: number, startIndex = 0): Blip[] {
  const blips: Blip[] = [];
  if (entryPoints.length === 0) return blips;
  const rotated = entryPoints.map((_, n) => entryPoints[(startIndex + n) % entryPoints.length]);
  const ordered = [
    ...rotated.filter(e => !squareSeenByMarine(board, e)),
    ...rotated.filter(e => squareSeenByMarine(board, e)),
  ];
  let i = 0;
  for (let n = 0; n < count; n++) {
    // round-robin over entry points, skipping occupied ones
    let placed = false;
    for (let tries = 0; tries < ordered.length && !placed; tries++) {
      const entry = ordered[(i + tries) % ordered.length];
      if (board.isPassable(entry) && !board.isOccupied(entry)) {
        blips.push(new Blip(board, { ...entry }));
        placed = true;
        i = (i + tries + 1) % ordered.length;
      }
    }
    if (!placed) break;
  }
  return blips;
}
