import { GameEngine } from '../GameEngine.js';
import { StormBolterMarine } from '../pieces/StormBolterMarine.js';
import { HeavyFlamerMarine } from '../pieces/HeavyFlamerMarine.js';
import type { Piece, Coord } from '../pieces/Piece.js';
import { canShoot } from '../board/vision.js';
import { Dir, DIR_VEC } from '../core/Direction.js';
import { closeCombat } from '../rules/combat.js';
import type { Board } from '../board/Board.js';

/**
 * A scripted marine player using only legal actions: shoot what is shootable,
 * fight what is in the face, open doors, walk a BFS path toward the mission
 * goal, and go on overwatch with spare AP. The heavy flamer never wastes ammo
 * on targets of opportunity — its six shots ARE the loss condition; it flames
 * only the objective. Deterministic for a given dice seed — used by the
 * autoplay demo and the pinned-seed playthrough tests.
 */
export function runMarineTurn(engine: GameEngine): void {
  const board = engine.state.board;
  const goal = engine.mission.objectivePoint ?? engine.mission.exitPoints?.[0];
  // Flame missions: the room must be torched from OUTSIDE its section, so the
  // escorts stage short of the objective (or they would stand in the fire),
  // and the flamer stops on the first square it can flame from.
  const flameMission = engine.mission.objective === 'flame-objective';
  const flamer = engine.marines.find(f => f instanceof HeavyFlamerMarine);
  // On flame missions the flamer LEADS the column — the approach corridors are
  // one square wide, and escorts parked ahead of it would wall off the firing
  // position. On other missions bolters clear the way first.
  const flamerFirst = engine.mission.objective === 'flame-objective' ? -1 : 1;
  const marines = [...engine.marines].sort((a, b) =>
    (Number(a instanceof HeavyFlamerMarine) - Number(b instanceof HeavyFlamerMarine)) * flamerFirst);

  const enemiesNear = () => (board.pieces as Piece[]).some(p =>
    p.kind !== 'marine' && engine.marines.some(m =>
      Math.max(Math.abs(m.pos.c - p.pos.c), Math.abs(m.pos.r - p.pos.r)) <= 10));

  for (const m of marines) {
    let acts = 0;
    while (m.alive && m.ap > 0 && acts++ < 16 && engine.state.result === 'ongoing') {
      if (m instanceof HeavyFlamerMarine && goal) {
        const objSquare = board.get(goal.x, goal.y);
        if (m.canFlame(objSquare)) {
          m.flameAt(objSquare);
          break;
        }
      }
      if (m instanceof StormBolterMarine && shootNearest(engine, m)) { engine.checkVictory(); continue; }
      const v = DIR_VEC[m.facing];
      const ahead = board.pieceAt({ c: m.pos.c + v.dc, r: m.pos.r + v.dr }) as Piece | undefined;
      if (ahead && ahead.kind !== 'marine') {
        if (closeCombat(m, ahead)) { engine.checkVictory(); continue; }
      }
      const door = m.findAdjacentDoor();
      if (door && !door.isOpen && m.useDoor()) continue;
      // With the horde close, bolters bank 2 AP for overwatch instead of
      // marching into claw range — the real Space Hulk advance-and-cover.
      if (m instanceof StormBolterMarine && m.ap === 2 && !m.overwatch && !m.jammed && enemiesNear()) {
        m.overwatchOn();
        break;
      }
      // Flame missions: the flamer leads and the escorts FOLLOW it — they
      // must never overtake into the objective approach (they would wall off
      // the one-square-wide firing corridor or stand inside the blast).
      const target = flameMission && !(m instanceof HeavyFlamerMarine) && flamer?.alive
        ? { x: flamer.pos.c, y: flamer.pos.r }
        : goal;
      if (target && advanceToward(board, m, target)) {
        engine.checkVictory();
        // Move-and-shoot: the move earned a free bolter shot — use it.
        if (m instanceof StormBolterMarine) shootNearest(engine, m);
        continue;
      }
      if (m instanceof StormBolterMarine && m.ap >= 2 && !m.overwatch && !m.jammed) { m.overwatchOn(); break; }
      break;
    }
    if (engine.state.result !== 'ongoing') return;
  }
}

/** One BFS step toward the goal: face the step direction, then move. */
function advanceToward(board: Board, m: Piece, goal: { x: number; y: number }): boolean {
  const next = nextStep(board, m.pos, { c: goal.x, r: goal.y });
  if (!next || board.isOccupied(next)) return false;
  const dir = facingToward(m.pos, next);
  if (m.facing !== dir) {
    const delta = ((dir - m.facing + 4) % 4);
    if (!m.tryTurn(delta === 1 ? 1 : delta === 3 ? -1 : 2)) return false;
  }
  return m.tryMove(next.c - m.pos.c, next.r - m.pos.r);
}

/** First step of a shortest 8-connected path; friendly pieces are transparent
 *  for pathing (the squad queues) but never stepped onto; closed doors are
 *  walked up to and opened on contact by the caller. */
function nextStep(board: Board, from: Coord, to: Coord): Coord | undefined {
  const key = (c: Coord) => `${c.c},${c.r}`;
  const prev = new Map<string, Coord | null>();
  prev.set(key(from), null);
  const queue: Coord[] = [from];
  while (queue.length > 0) {
    const cur = queue.shift()!;
    if (cur.c === to.c && cur.r === to.r && !(cur.c === from.c && cur.r === from.r)) {
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
        if (!board.isPassable(nxt)) continue;
        prev.set(key(nxt), cur);
        queue.push(nxt);
      }
    }
  }
  return undefined;
}

function facingToward(from: Coord, to: Coord): Dir {
  const dc = to.c - from.c, dr = to.r - from.r;
  if (Math.abs(dc) >= Math.abs(dr)) return dc > 0 ? Dir.E : Dir.W;
  return dr > 0 ? Dir.S : Dir.N;
}

function shootNearest(engine: GameEngine, marine: StormBolterMarine): boolean {
  const board = engine.state.board;
  const targets = (board.pieces as Piece[])
    .filter(p => p.kind !== 'marine')
    .filter(p => {
      const sq = board.get(p.pos.c, p.pos.r);
      return sq !== undefined && canShoot(board, marine, sq);
    })
    .sort((a, b) =>
      Math.hypot(a.pos.c - marine.pos.c, a.pos.r - marine.pos.r) -
      Math.hypot(b.pos.c - marine.pos.c, b.pos.r - marine.pos.r));
  if (!targets[0]) return false;
  return marine.shoot(targets[0]) || true; // AP spent even on a miss
}

/** Play whole turns until the game resolves or the turn cap is hit. */
export function autoplay(engine: GameEngine, maxTurns = 30): void {
  while (engine.state.result === 'ongoing' && engine.turnNumber <= maxTurns) {
    runMarineTurn(engine);
    if (engine.state.result !== 'ongoing') return;
    engine.endMarinePhase();
  }
}
