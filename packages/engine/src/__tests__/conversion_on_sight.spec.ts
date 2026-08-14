import { it, expect, describe } from 'vitest';
import { GameEngine } from '../GameEngine.js';
import { loadMission } from '../missions/missionLoader.js';
import { Blip } from '../pieces/Blip.js';
import { RollQueue } from '../core/Dice.js';
import { PieceEvents } from '../events/PieceEvents.js';
import type { CompiledMission } from '../missions/missionTypes.js';

/**
 * Sulk rule: a blip converts the MOMENT any marine sees it — including when
 * the marine's own action (turn, move, door) creates the sight line, not just
 * at phase boundaries (user playtest report, 2026-08-14).
 */
describe('blips convert immediately when a marine action reveals them', () => {
  it('an about-face that brings a blip into view converts it on the spot', () => {
    const mission = {
      name: 'sight-test', width: 9, height: 9,
      marineDeployment: [{ x: 4, y: 4, facing: 'up' }],
      initialBlips: 0, entryPoints: [], objective: 'exterminate',
    } as unknown as CompiledMission;
    const engine = new GameEngine(mission);
    const board = engine.state.board;
    board.dice = new RollQueue([1, 1, 1, 1, 1, 1]);

    const blip = new Blip(board, { c: 4, r: 6 }, 2); // behind the north-facing marine
    expect(board.pieces.filter(p => (p as any).kind === 'blip')).toHaveLength(1); // not seen yet

    const marine = engine.marines[0];
    expect(marine.tryTurn(2)).toBe(true); // about-face to south — blip now straight ahead

    expect(blip.alive).toBe(false); // converted, no endMarinePhase involved
    expect(board.pieces.filter(p => (p as any).kind === 'blip')).toHaveLength(0);
    expect(board.pieces.filter(p => (p as any).kind === 'stealer')).toHaveLength(2); // value 2 → both spawn
  });

  it('REPLAYED events never re-trigger conversion against the final board', () => {
    // Advisor finding 2026-08-14: the client re-emits captured stealer-phase
    // events for animation; those describe PAST states and must not run the
    // sight-conversion rule against the (already final) board.
    const engine = new GameEngine({ ...loadMission('space_hulk_1'), initialBlips: 0 });
    const board = engine.state.board;
    board.dice = new RollQueue([1, 1, 1, 1, 1, 1]);
    const marine = engine.marines.find(m => m.pos.c === 10 && m.pos.r === 4)!;
    marine.useDoor(); // open (10,5) — no blip behind yet
    const blip = new Blip(board, { c: 10, r: 7 }, 1);
    // Craft the situation: blip IS currently visible through the open door, so a
    // LIVE doorToggled would convert it. A REPLAYED one must not.
    PieceEvents.replay({ type: 'doorToggled', payload: { x: 10, y: 5, open: true } });
    expect(blip.alive).toBe(true); // untouched by the replay
    PieceEvents.emit('doorToggled', { x: 10, y: 5, open: true }); // live event → rule applies
    expect(blip.alive).toBe(false);
  });

  it('opening a door that reveals a blip converts it on the spot', () => {
    const engine = new GameEngine({ ...loadMission('space_hulk_1'), initialBlips: 0 });
    const board = engine.state.board;
    board.dice = new RollQueue([1, 1, 1, 1, 1, 1]);
    const marine = engine.marines.find(m => m.pos.c === 10 && m.pos.r === 4)!;
    const blip = new Blip(board, { c: 10, r: 6 }, 1); // behind the closed door at (10,5)
    expect(blip.alive).toBe(true); // door blocks LOS

    expect(marine.useDoor()).toBe(true); // open the door ahead

    expect(blip.alive).toBe(false); // seen through the open door — converted
    expect(board.pieces.some(p => (p as any).kind === 'stealer' && p.pos.c === 10 && p.pos.r === 6)).toBe(true);
  });
});
