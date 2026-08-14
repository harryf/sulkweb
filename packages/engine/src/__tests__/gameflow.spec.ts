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
    expect(engine.phase).toBe('MarineAction');
    expect(engine.turnNumber).toBe(1);
  });

  it('endMarinePhase advances the turn and resets AP', () => {
    const engine = new GameEngine(tinyMission({ objective: 'reach-exit' }));
    const marine = engine.marines[0];
    marine.moveForward();
    expect(marine.ap).toBe(3);
    engine.endMarinePhase();
    expect(engine.turnNumber).toBe(2);
    expect(engine.phase).toBe('MarineAction');
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

  it('stealer AI attacks during the stealer phase of a real turn', () => {
    const engine = new GameEngine(tinyMission({ initialBlips: 0, blipsPerTurn: 0, objective: 'reach-exit' }));
    const board = engine.state.board;
    // Drop a stealer down the corridor and run a turn
    const stealer = new Genestealer(board, { c: 1, r: 5 }, Dir.N);
    board.dice = new RollQueue([6, 6, 6, 1, 1]); // stealer CC wins; extra rolls for CP
    engine.endMarinePhase();
    expect(stealer.pos.r).toBeLessThanOrEqual(2); // it closed the distance
  });

  it('loads the real Mission 1 and deploys the squad of five', () => {
    const engine = new GameEngine(loadMission('space_hulk_1'));
    expect(engine.marines).toHaveLength(5);
    expect(engine.stealerSide.length).toBe(2); // initial blips
  });
});
