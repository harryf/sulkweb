import { describe, it, expect } from 'vitest';
import { GameEngine } from '../GameEngine.js';
import { RollQueue, SeededRng } from '../core/Dice.js';
import { Genestealer } from '../pieces/Genestealer.js';
import { Dir } from '../core/Direction.js';
import type { CompiledMission } from '../missions/missionTypes.js';
import { loadMission } from '../missions/missionLoader.js';

/** Tiny 1-corridor mission: marines north, entry south, exit south. */
function tinyMission(overrides: Partial<CompiledMission> = {}): CompiledMission {
  return {
    name: 'tiny', width: 3, height: 10,
    squares: Array.from({ length: 10 }, (_, y) => ({ x: 1, y, kind: 'corridor' as const })),
    marineDeployment: [{ x: 1, y: 0, facing: 'down' }],
    entryPoints: [{ x: 1, y: 9 }],
    exitPoints: [{ x: 1, y: 9 }],
    initialBlips: 0,
    blipsPerTurn: 0,
    objective: 'exterminate-or-exit',
    ...overrides,
  };
}

describe('GameEngine turn flow', () => {
  it('deploys marines from the mission and rolls CP 1-6', () => {
    const engine = new GameEngine(tinyMission());
    expect(engine.marines).toHaveLength(1);
    expect(engine.marines[0].pos).toEqual({ c: 1, r: 0 });
    expect(engine.cp).toBeGreaterThanOrEqual(1);
    expect(engine.cp).toBeLessThanOrEqual(6);
    expect(engine.phase).toBe('Live');
    expect(engine.turnNumber).toBe(1);
  });

  it('endMarinePhase advances the turn and resets AP', () => {
    const engine = new GameEngine(tinyMission({ objective: 'reach-exit' }));
    const marine = engine.marines[0];
    marine.moveForward();
    expect(marine.ap).toBe(3);
    engine.endMarinePhase();
    expect(engine.turnNumber).toBe(2);
    expect(engine.phase).toBe('Live');
    expect(marine.ap).toBe(4);
  });

  it('spawns reinforcement blips each stealer phase', () => {
    const engine = new GameEngine(tinyMission({ blipsPerTurn: 1, objective: 'reach-exit' }));
    engine.state.board.dice = new SeededRng(7);
    expect(engine.stealerSide).toHaveLength(0);
    engine.endMarinePhase();
    expect(engine.stealerSide.length).toBeGreaterThanOrEqual(1);
  });

  it('CP spend grants a marine one extra AP', () => {
    const engine = new GameEngine(tinyMission());
    const marine = engine.marines[0];
    const cpBefore = engine.cp;
    expect(engine.spendCP(marine)).toBe(true);
    expect(engine.cp).toBe(cpBefore - 1);
    expect(marine.ap).toBe(5);
  });

  it('win: marine reaches the exit square', () => {
    const engine = new GameEngine(tinyMission({ objective: 'reach-exit' }));
    const marine = engine.marines[0];
    marine.pos = { c: 1, r: 9 };
    engine.checkVictory();
    expect(engine.state.result).toBe('win');
  });

  it('win: extermination when no stealers remain', () => {
    const engine = new GameEngine(tinyMission({ objective: 'exterminate' }));
    engine.checkVictory();
    expect(engine.state.result).toBe('win'); // no stealers ever existed
  });

  it('loss: all marines dead', () => {
    const engine = new GameEngine(tinyMission());
    engine.marines[0].die();
    engine.checkVictory();
    expect(engine.state.result).toBe('loss');
  });

  it('after game over, actions are rejected', () => {
    const engine = new GameEngine(tinyMission({ objective: 'reach-exit' }));
    const marine = engine.marines[0];
    marine.pos = { c: 1, r: 9 };
    engine.checkVictory();
    expect(engine.state.result).toBe('win');
    expect(marine.moveForward()).toBe(false);
    expect(marine.tryTurn(1)).toBe(false);
    engine.endMarinePhase();
    expect(engine.turnNumber).toBe(1); // no further turns
  });

  it('the stealer side closes on the squad under the clock, one square per action tick', () => {
    const engine = new GameEngine(tinyMission({ initialBlips: 0, blipsPerTurn: 0, objective: 'reach-exit' }));
    const board = engine.state.board;
    // The marine faces AWAY (north), so his default AI never sees the stealer
    // and never shoots it: this pins the stealer's approach, not the duel.
    engine.marines[0].facing = Dir.N;
    const stealer = new Genestealer(board, { c: 1, r: 5 }, Dir.N);
    board.dice = new RollQueue(new Array(60).fill(1)); // every CC a draw; CP rolls
    engine.runTicks(2);
    expect(stealer.pos.r).toBe(3); // full pool at the start: one step per tick
    engine.runTicks(2);
    expect(stealer.pos.r).toBe(1); // adjacent: the next action is the attack
    engine.runTicks(1);
    expect(stealer.pos.r).toBe(1);
    expect(engine.marines[0].alive).toBe(true); // all-ones dice: a draw, both stand
  });

  it('a full marine acts before the stealers in a tick and shoots what it sees', () => {
    const engine = new GameEngine(tinyMission({ initialBlips: 0, blipsPerTurn: 0, objective: 'reach-exit' }));
    const board = engine.state.board;
    const stealer = new Genestealer(board, { c: 1, r: 5 }, Dir.N);
    board.dice = new RollQueue([6, 6, ...new Array(20).fill(1)]); // the first aimed shot kills
    engine.tick();
    expect(stealer.alive).toBe(false);
    expect(engine.marines[0].ap).toBe(3); // one AP on the shot, no regeneration owed
  });

  it('loads the real Mission 1 and deploys the squad of five', () => {
    const engine = new GameEngine(loadMission('space_hulk_1'));
    expect(engine.marines).toHaveLength(5);
    expect(engine.stealerSide.length).toBe(2); // initial blips
  });
});
