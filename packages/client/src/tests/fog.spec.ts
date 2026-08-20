import { describe, it, expect } from 'vitest';
import { GameEngine, Blip, type CompiledMission } from '@sulk/engine/index.js';
import { computeMarineSight, threatRevealed, FOG } from '../utils/fog';

/**
 * Fog of war (user directive 2026-08-21): stealers hidden unless a marine
 * SEES their square or they creep within FOG.creepRadius; out-of-sight
 * squares dimmed. These are the pure decision rules the GameScene renders.
 */

// Open 9x9 room, one marine dead centre facing up (north).
const openMission = {
  name: 'fog-open', width: 9, height: 9,
  marineDeployment: [{ x: 4, y: 4, facing: 'up' }],
  initialBlips: 0, entryPoints: [], objective: 'exterminate',
} as unknown as CompiledMission;

// Corridor with a door edge (10,5)↑ and a marine at (10,4) facing it,
// identical fixture to the engine's conversion_on_sight suite.
const doorMission = {
  name: 'fog-door', width: 12, height: 10,
  squares: [
    { x: 10, y: 4, kind: 'corridor' },
    { x: 10, y: 5, kind: 'corridor', doorFacing: 'up' },
    { x: 10, y: 6, kind: 'corridor' },
    { x: 10, y: 7, kind: 'corridor' },
  ],
  marineDeployment: [{ x: 10, y: 4, facing: 'down' }],
  initialBlips: 0, entryPoints: [], objective: 'exterminate',
} as unknown as CompiledMission;

describe('computeMarineSight', () => {
  it('contains squares ahead of the marine and his own square', () => {
    const engine = new GameEngine(openMission);
    const sight = computeMarineSight(engine.state.board);
    expect(sight.has('4,2')).toBe(true);  // straight ahead
    expect(sight.has('2,3')).toBe(true);  // ahead-left diagonal
    expect(sight.has('4,4')).toBe(true);  // own square, never dimmed
  });

  it('excludes squares behind the marine (outside the 180 degree arc)', () => {
    const engine = new GameEngine(openMission);
    const sight = computeMarineSight(engine.state.board);
    expect(sight.has('4,6')).toBe(false);
    expect(sight.has('4,8')).toBe(false);
  });

  it('excludes squares behind a closed door, includes them once it opens', () => {
    const engine = new GameEngine(doorMission);
    const board = engine.state.board;
    expect(computeMarineSight(board).has('10,6')).toBe(false); // door shut
    expect(engine.marines[0].useDoor()).toBe(true);            // door open
    expect(computeMarineSight(board).has('10,6')).toBe(true);
  });

  it('unions sight over every living marine', () => {
    const engine = new GameEngine({
      ...openMission,
      marineDeployment: [
        { x: 4, y: 4, facing: 'up' },
        { x: 4, y: 5, facing: 'down' },
      ],
    } as unknown as CompiledMission);
    const sight = computeMarineSight(engine.state.board);
    expect(sight.has('4,2')).toBe(true); // seen by the north-facer
    expect(sight.has('4,7')).toBe(true); // seen by the south-facer
  });
});

describe('threatRevealed', () => {
  const setup = () => {
    const engine = new GameEngine(openMission);
    const board = engine.state.board;
    return { board, sight: computeMarineSight(board), marines: [{ c: 4, r: 4 }] };
  };

  it('reveals a stealer standing in a seen square', () => {
    const { sight, marines } = setup();
    expect(threatRevealed(sight, marines, 4, 2)).toBe(true);
  });

  it('reveals a stealer creeping up behind within the creep radius', () => {
    const { board, sight, marines } = setup();
    new Blip(board, { c: 4, r: 6 }, 1); // proves the square is out of sight
    expect(sight.has('4,6')).toBe(false);
    expect(FOG.creepRadius).toBe(2);
    expect(threatRevealed(sight, marines, 4, 6)).toBe(true);  // Chebyshev 2
    expect(threatRevealed(sight, marines, 6, 6)).toBe(true);  // diagonal 2
  });

  it('hides a stealer out of sight beyond the creep radius', () => {
    const { sight, marines } = setup();
    expect(threatRevealed(sight, marines, 4, 7)).toBe(false); // Chebyshev 3
    expect(threatRevealed(sight, marines, 7, 7)).toBe(false);
  });
});
