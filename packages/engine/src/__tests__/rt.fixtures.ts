import type { CompiledMission, MarineType, SquareJSON } from '../missions/missionTypes.js';

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

/** Dice that never double and never kill: a bolter misses forever. */
export function missStream(n = 400): number[] {
  return Array.from({ length: n }, (_, i) => (i % 2 === 0 ? 1 : 2));
}
