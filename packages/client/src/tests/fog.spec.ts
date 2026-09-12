import { describe, it, expect } from 'vitest';
import { GameEngine, Blip, Genestealer, Dir, type CompiledMission } from '@sulk/engine/index.js';
import { computeMarineSight, threatRevealed, threatVisible, FOG } from '../utils/fog';
import { radarActive } from '../utils/radarLogic';

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

  it('a dead marine casts no sight; a wiped squad leaves an empty set', () => {
    // The module leans on the engine invariant that board.pieces holds only
    // living pieces (die() splices). If a refactor ever keeps corpses with
    // alive=false, this catches the corpse projecting vision forever.
    const engine = new GameEngine(openMission);
    const board = engine.state.board;
    expect(computeMarineSight(board).has('4,2')).toBe(true);
    engine.marines[0].die();
    const sight = computeMarineSight(board);
    expect(sight.size).toBe(0);
    expect(threatRevealed(sight, [], 4, 2)).toBe(false); // no throw, no reveal
  });

  it('non-marine pieces cast no sight', () => {
    const engine = new GameEngine(openMission);
    const board = engine.state.board;
    new Blip(board, { c: 4, r: 6 }, 1); // behind the marine, "sees" down the room
    const sight = computeMarineSight(board);
    expect(sight.has('4,8')).toBe(false); // only the blip could see this
  });

  it('stealer bodies do not block sight: the column behind stays in the set (2026-09-12)', () => {
    const engine = new GameEngine(openMission);
    const board = engine.state.board;
    new Genestealer(board, { c: 4, r: 3 }, Dir.S); // nose to nose with the marine
    new Genestealer(board, { c: 4, r: 2 }, Dir.S);
    const sight = computeMarineSight(board);
    expect(sight.has('4,3')).toBe(true);
    expect(sight.has('4,2')).toBe(true); // behind the first stealer
    expect(sight.has('4,0')).toBe(true); // behind both
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

describe('radar gate on blips (2026-09-12)', () => {
  const sergeantMission = {
    ...openMission,
    marineDeployment: [
      { x: 4, y: 4, facing: 'up', type: 'sergeant' },
      { x: 4, y: 5, facing: 'up' },
    ],
  } as unknown as CompiledMission;

  it('radarActive is true while a sergeant lives and false once he dies', () => {
    const engine = new GameEngine(sergeantMission);
    const pieces = () => engine.state.pieces as any;
    expect(radarActive(pieces())).toBe(true);
    const sergeant = engine.marines.find(m => m.spriteKey.startsWith('terminator_sergeant'))!;
    expect(sergeant).toBeDefined();
    sergeant.die();
    expect(engine.marines).toHaveLength(1); // the plain bolter survives
    expect(radarActive(pieces())).toBe(false);
  });

  it('a squad with no sergeant never has radar (debug_1 shape)', () => {
    const engine = new GameEngine(openMission);
    expect(radarActive(engine.state.pieces as any)).toBe(false);
  });

  it('a blip shows only while the radar is up, wherever it stands', () => {
    const engine = new GameEngine(openMission);
    const sight = computeMarineSight(engine.state.board);
    const marines = [{ c: 4, r: 4 }];
    expect(threatVisible('blip', true, sight, marines, 8, 8)).toBe(true);   // out of sight, radar up
    expect(threatVisible('blip', false, sight, marines, 4, 5)).toBe(false); // adjacent, radar down
    expect(threatVisible('blip', false, sight, marines, 4, 2)).toBe(false); // in sight, radar down (converts anyway)
  });

  it('the radar gate never touches stealers', () => {
    const engine = new GameEngine(openMission);
    const sight = computeMarineSight(engine.state.board);
    const marines = [{ c: 4, r: 4 }];
    expect(threatVisible('stealer', false, sight, marines, 4, 2)).toBe(true);  // seen
    expect(threatVisible('stealer', true, sight, marines, 4, 7)).toBe(false);  // unseen, beyond creep
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

  it('a melee attacker is ALWAYS revealed, whatever the creep radius', () => {
    // Design invariant, not arithmetic fallout: every stealer-side attack is
    // adjacent (Chebyshev 1). If FOG.creepRadius is ever tuned below 1, a
    // stealer could kill while invisible, the worst failure of this feature.
    const { sight, marines } = setup();
    expect(FOG.creepRadius).toBeGreaterThanOrEqual(1);
    expect(threatRevealed(sight, marines, 4, 5)).toBe(true); // directly behind
  });

  it('hides a stealer out of sight beyond the creep radius', () => {
    const { sight, marines } = setup();
    expect(threatRevealed(sight, marines, 4, 7)).toBe(false); // Chebyshev 3
    expect(threatRevealed(sight, marines, 7, 7)).toBe(false);
  });
});
