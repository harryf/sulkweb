import { it, expect, describe } from 'vitest';
import { GameEngine } from '../GameEngine.js';
import { Blip } from '../pieces/Blip.js';
import { Genestealer } from '../pieces/Genestealer.js';
import { Dir, facingToward } from '../core/Direction.js';
import { StormBolterMarine } from '../pieces/StormBolterMarine.js';
import { AssaultCannonMarine } from '../pieces/AssaultCannonMarine.js';
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

    expect(blip.alive).toBe(false); // converted on sight, no cycle boundary involved
    expect(board.pieces.filter(p => (p as any).kind === 'blip')).toHaveLength(0);
    expect(board.pieces.filter(p => (p as any).kind === 'stealer')).toHaveLength(2); // value 2 → both spawn
  });

  it('converted stealers emerge facing their nearest marine (2026-09-12)', () => {
    // Marine at (4,4); a value-3 blip due west of him at (1,4). On conversion
    // one stealer stands on the blip square and two on adjacent free squares,
    // and every one faces its nearest marine (east-ish) instead of the old
    // fixed south. The one on the blip square is unambiguous: due east.
    const mission = {
      name: 'convert-facing', width: 9, height: 9,
      marineDeployment: [{ x: 4, y: 4, facing: 'up' }],
      initialBlips: 0, entryPoints: [], objective: 'exterminate',
    } as unknown as CompiledMission;
    const engine = new GameEngine(mission);
    const board = engine.state.board;
    board.dice = new RollQueue([1, 1, 1, 1, 1, 1]);
    const marine = engine.marines[0];
    const blip = new Blip(board, { c: 1, r: 4 }, 3);
    expect(marine.tryTurn(-1)).toBe(true); // face west: the sweep sees the blip, it converts on the spot
    expect(blip.alive).toBe(false);
    const stealers = board.pieces.filter(p => (p as any).kind === 'stealer') as Genestealer[];
    expect(stealers).toHaveLength(3);
    const onBlipSquare = stealers.find(s => s.pos.c === 1 && s.pos.r === 4)!;
    expect(onBlipSquare.facing).toBe(Dir.E);
    for (const s of stealers) expect(s.facing).toBe(facingToward(s.pos, marine.pos));
  });

  it('a blip behind a stealer converts the moment the sight line reaches it (2026-09-12)', () => {
    // Stealer bodies no longer block LOS: the marine sees past the front
    // stealer, so the blip queued behind it is revealed and converts.
    const mission = {
      name: 'sight-through-stealer', width: 9, height: 9,
      marineDeployment: [{ x: 4, y: 4, facing: 'up' }],
      initialBlips: 0, entryPoints: [], objective: 'exterminate',
    } as unknown as CompiledMission;
    const engine = new GameEngine(mission);
    const board = engine.state.board;
    board.dice = new RollQueue([1, 1, 1, 1, 1, 1]);
    new Genestealer(board, { c: 4, r: 6 }, Dir.N); // behind the marine, in front of the blip
    const blip = new Blip(board, { c: 4, r: 7 }, 1);
    expect(blip.alive).toBe(true); // both behind the north-facing marine
    expect(engine.marines[0].tryTurn(2)).toBe(true); // about-face: stealer, then blip, straight ahead
    expect(blip.alive).toBe(false); // converted through the stealer's body
    expect(board.pieces.filter(p => (p as any).kind === 'stealer')).toHaveLength(2);
  });

  // Corridor fixture with a door edge (10,5)↑ and a marine at (10,4) facing it
  const doorMission = {
    name: 'door-sight-test', width: 12, height: 10,
    squares: [
      { x: 10, y: 4, kind: 'corridor' },
      { x: 10, y: 5, kind: 'corridor', doorFacing: 'up' },
      { x: 10, y: 6, kind: 'corridor' },
      { x: 10, y: 7, kind: 'corridor' },
    ],
    marineDeployment: [{ x: 10, y: 4, facing: 'down' }],
    initialBlips: 0, entryPoints: [], objective: 'exterminate',
  } as unknown as CompiledMission;

  it('REPLAYED events never re-trigger conversion against the final board', () => {
    // Advisor finding 2026-08-14: the client re-emits captured stealer-phase
    // events for animation; those describe PAST states and must not run the
    // sight-conversion rule against the (already final) board.
    const engine = new GameEngine(doorMission);
    const board = engine.state.board;
    board.dice = new RollQueue([1, 1, 1, 1, 1, 1]);
    const marine = engine.marines[0];
    marine.useDoor(); // open (10,5)↑ — no blip behind yet
    const blip = new Blip(board, { c: 10, r: 7 }, 1);
    // Craft the situation: blip IS currently visible through the open door, so a
    // LIVE doorToggled would convert it. A REPLAYED one must not.
    PieceEvents.replay({ type: 'doorToggled', payload: { x: 10, y: 5, facing: 0, open: true } });
    expect(blip.alive).toBe(true); // untouched by the replay
    PieceEvents.emit('doorToggled', { x: 10, y: 5, facing: 0, open: true }); // live event → rule applies
    expect(blip.alive).toBe(false);
  });

  it('shooting a door apart that reveals a blip converts it on the spot', () => {
    // User playtest report 2026-08-21: blip behind a door stayed a blip after
    // the door was shot away. Destruction emits doorDestroyed, not doorToggled.
    const engine = new GameEngine(doorMission);
    const board = engine.state.board;
    board.dice = new RollQueue([6, 6]); // door shot: 2 dice, any >= 6 destroys
    const marine = engine.marines[0] as StormBolterMarine;
    const blip = new Blip(board, { c: 10, r: 6 }, 1); // behind the closed door edge (10,5) up
    const door = board.doorBetween({ c: 10, r: 4 }, { c: 10, r: 5 })!;
    expect(blip.alive).toBe(true); // closed door blocks LOS

    expect(marine.shootDoor(door)).toBe(true); // demolished

    expect(blip.alive).toBe(false); // seen through the wreckage, converted
    expect(board.pieces.some(p => (p as any).kind === 'stealer' && p.pos.c === 10 && p.pos.r === 6)).toBe(true);
  });

  it('a blip exposed mid-autofire converts during the sweep and the fresh stealer is a pass-2 target', () => {
    // The doorDestroyed handler fires INSIDE autofire's repeat-pass loop, so
    // conversion mutates the board while the sweep is iterating. Reviewer
    // finding 2026-08-21: this interleaving was unexercised (the existing
    // autofire test hides a pre-placed stealer, not a blip).
    const engine = new GameEngine({
      name: 'autofire-blip-test', width: 3, height: 14,
      squares: Array.from({ length: 14 }, (_, y) =>
        ({ x: 1, y, kind: 'corridor' as const, doorFacing: y === 5 ? 'down' as const : undefined })),
      marineDeployment: [{ x: 1, y: 2, facing: 'down', type: 'assault_cannon' }],
      initialBlips: 0, entryPoints: [], objective: 'exterminate',
    } as unknown as CompiledMission);
    const board = engine.state.board;
    const ac = engine.marines[0] as AssaultCannonMarine;
    const blip = new Blip(board, { c: 1, r: 7 }, 1); // hidden behind the closed door
    const door = board.doorBetween({ c: 1, r: 5 }, { c: 1, r: 6 })!;
    // Pass 1: door (3,1,1) shredded → handler converts the blip on the spot.
    // Pass 2: the converted stealer is exposed, (3,1,1) kills. Pass 3: empty.
    // Then the malfunction-check dice (no triple).
    board.dice = new RollQueue([3, 1, 1, 3, 1, 1, 1, 2, 1]);
    expect(ac.autofire()).toBe(true);
    expect(door.destroyed).toBe(true);
    expect(blip.alive).toBe(false); // converted mid-sweep, not left as a blip
    expect(board.pieces.filter(p => (p as any).kind === 'blip')).toHaveLength(0);
    expect(board.pieces.filter(p => (p as any).kind === 'stealer')).toHaveLength(0); // pass 2 killed it
  });

  it('REPLAYED doorDestroyed events never re-trigger conversion', () => {
    const engine = new GameEngine(doorMission);
    const board = engine.state.board;
    const marine = engine.marines[0]; // useDoor consumes no dice

    marine.useDoor(); // open the door first, THEN place the blip in plain sight
    const blip = new Blip(board, { c: 10, r: 6 }, 1);
    PieceEvents.replay({ type: 'doorDestroyed', payload: { x: 10, y: 5, facing: 0, cause: 'shot' } });
    expect(blip.alive).toBe(true); // untouched by the replay
    PieceEvents.emit('doorDestroyed', { x: 10, y: 5, facing: 0, cause: 'shot' });
    expect(blip.alive).toBe(false); // live event applies the sight rule
  });

  it('opening a door that reveals a blip converts it on the spot', () => {
    const engine = new GameEngine(doorMission);
    const board = engine.state.board;
    board.dice = new RollQueue([1, 1, 1, 1, 1, 1]);
    const marine = engine.marines[0];
    const blip = new Blip(board, { c: 10, r: 6 }, 1); // behind the closed door edge (10,5)↑
    expect(blip.alive).toBe(true); // door blocks LOS

    expect(marine.useDoor()).toBe(true); // open the door ahead

    expect(blip.alive).toBe(false); // seen through the open door — converted
    expect(board.pieces.some(p => (p as any).kind === 'stealer' && p.pos.c === 10 && p.pos.r === 6)).toBe(true);
  });
});
