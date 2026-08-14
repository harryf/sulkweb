import { GameEngine } from '../GameEngine.js';
import { StormBolterMarine } from '../pieces/StormBolterMarine.js';
import type { Piece } from '../pieces/Piece.js';
import { canShoot } from '../board/vision.js';
import { DIR_VEC } from '../core/Direction.js';
import { closeCombat } from '../rules/combat.js';

/**
 * A scripted marine player using only legal actions: shoot what is shootable,
 * fight what is in the face, open doors, advance, and go on overwatch with
 * spare AP. Deterministic for a given dice seed — used by the autoplay demo
 * and the pinned-seed win verification test.
 */
export function runMarineTurn(engine: GameEngine): void {
  const board = engine.state.board;
  const marines = [...engine.marines].sort((a, b) => b.pos.r - a.pos.r); // front first
  for (const m of marines) {
    let acts = 0;
    while (m.ap > 0 && acts++ < 12 && engine.state.result === 'ongoing') {
      if (shootNearest(engine, m)) { engine.checkVictory(); continue; }
      const v = DIR_VEC[m.facing];
      const ahead = board.pieceAt({ c: m.pos.c + v.dc, r: m.pos.r + v.dr }) as Piece | undefined;
      if (ahead && ahead.kind !== 'marine') {
        if (closeCombat(m, ahead)) { engine.checkVictory(); continue; }
      }
      const door = m.findAdjacentDoor();
      if (door && !door.isOpen && m.useDoor()) continue;
      if (m.ap >= 2 && !m.overwatch && !m.jammed) { m.overwatchOn(); break; }
      if (m.moveForward()) { engine.checkVictory(); continue; }
      break;
    }
    if (engine.state.result !== 'ongoing') return;
  }
}

function shootNearest(engine: GameEngine, marine: StormBolterMarine): boolean {
  const board = engine.state.board;
  const targets = (board.pieces as Piece[])
    .filter(p => p.kind !== 'marine')
    .filter(p => {
      const sq = board.get(p.pos.c, p.pos.r);
      return sq !== undefined && canShoot(board, marine, sq, StormBolterMarine.RANGE);
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
