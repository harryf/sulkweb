import type { CompiledMission, MarineType, SquareJSON } from '../missions/missionTypes.js';
import type { GameEngine } from '../GameEngine.js';
import type { Board } from '../board/Board.js';
import type { HiveContext } from '../ai/hive.js';
import { TUNING } from '../core/CostTables.js';
import { stealerTick, chargeOrientation } from '../ai/StealerAI.js';

/**
 * Small missions for the real-time (2.x) specs. Every square is a corridor
 * unless a section is given; entries and exits are optional; the default
 * objective is 'reach-exit' with no exits and no reinforcements, so a
 * scenario is exactly the pieces a test places and the game only ends on a
 * squad wipe (or an exit the test adds).
 */

/** A one-square-wide corridor down column `c`, rows 0..rows-1. */
export function corridor(rows: number, overrides: Partial<CompiledMission> = {}, c = 1): CompiledMission {
  return {
    name: 'rt-corridor', width: c + 2, height: rows,
    squares: Array.from({ length: rows }, (_, y) => ({ x: c, y, kind: 'corridor' as const })),
    marineDeployment: [{ x: c, y: 0, facing: 'down' }],
    entryPoints: [],
    initialBlips: 0,
    blipsPerTurn: 0,
    objective: 'reach-exit',
    ...overrides,
  };
}

/** An open w by h room with a single marine at (mx, my). */
export function room(w: number, h: number, marine: { x: number; y: number; facing?: 'up' | 'right' | 'down' | 'left'; type?: MarineType } = { x: 2, y: 2 }, overrides: Partial<CompiledMission> = {}): CompiledMission {
  const squares: SquareJSON[] = [];
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) squares.push({ x, y, kind: 'room' });
  return {
    name: 'rt-room', width: w, height: h,
    squares,
    marineDeployment: [{ x: marine.x, y: marine.y, facing: marine.facing ?? 'down', type: marine.type }],
    entryPoints: [],
    initialBlips: 0,
    blipsPerTurn: 0,
    objective: 'reach-exit',
    ...overrides,
  };
}

/**
 * One cycle of real ticks (TUNING.cycleTicks); the cycle boundary fires on
 * the last one. The 1.x specs' "end the marine phase" became this when the
 * stage 1 shim was deleted (stage 2): a turn is now exactly one cycle.
 */
export function runCycle(engine: GameEngine): void {
  engine.runTicks(TUNING.cycleTicks);
}

/**
 * One whole stealer activation on a bare board (no engine): the real
 * per-tick driver, stealerTick, called TUNING.hivePlanTicks times with
 * board.tick stepped the way GameEngine.tick steps it, then the cycle
 * boundary's charge sweep. Why hivePlanTicks: after that many ticks the
 * cached plan is due again, so every activation begins with a fresh hive
 * plan exactly as the 1.x whole-activation loop did; and each stealer-side
 * piece acts at most once per tick, so with an AP cap of 6 (< 8) every
 * piece drains its pool inside one activation. Nothing here re-implements
 * the activation loop; what runs is what the engine runs.
 */
export function stealerActivation(board: Board, ctx: HiveContext = {}): void {
  for (let i = 0; i < TUNING.hivePlanTicks; i++) {
    board.tick += 1;
    stealerTick(board, ctx);
  }
  chargeOrientation(board);
}

/** Dice that never double and never kill: a bolter misses forever. */
export function missStream(n = 400): number[] {
  return Array.from({ length: n }, (_, i) => (i % 2 === 0 ? 1 : 2));
}
