import { it, expect, describe } from 'vitest';
import { GameEngine } from '../GameEngine.js';
import { Blip } from '../pieces/Blip.js';
import { loadMission } from '../missions/missionLoader.js';
import { runStealerActions } from '../ai/StealerAI.js';

describe('AI pathing on the real mission map', () => {
  it('east-arm blip walks the Chebyshev plateau toward the squad', () => {
    const engine = new GameEngine({ ...loadMission('space_hulk_1'), initialBlips: 0 });
    const blip = new Blip(engine.state.board, { c: 15, r: 5 }, 1);
    runStealerActions(engine.state.board);
    expect(blip.pos.c).toBeLessThan(15); // regression: used to stall at equal max(dx,dy)
  });

  it('a blip blocked by a closed door opens it and keeps moving', () => {
    const engine = new GameEngine({ ...loadMission('space_hulk_1'), initialBlips: 0 });
    const board = engine.state.board;
    const blip = new Blip(board, { c: 10, r: 18 }, 1); // below the closed door at (10,16)
    runStealerActions(board);
    expect(board.doorAt({ c: 10, r: 16 })!.isOpen).toBe(true);
    expect(blip.pos.r).toBeLessThanOrEqual(16);
  });

  it('several turns of the real mission bring the horde to the squad', () => {
    const engine = new GameEngine(loadMission('space_hulk_1'));
    for (let t = 0; t < 6; t++) engine.endMarinePhase();
    // Marines never moved: expect stealers/blips to have closed most of the map
    if (engine.state.result === 'loss') {
      expect(engine.marines).toHaveLength(0); // the horde wiped the idle squad
      return;
    }
    const nearest = Math.min(...engine.stealerSide.map(p =>
      Math.min(...engine.marines.map(m => Math.max(Math.abs(m.pos.c - p.pos.c), Math.abs(m.pos.r - p.pos.r))))));
    expect(engine.stealerSide.length).toBeGreaterThan(4);
    expect(nearest).toBeLessThanOrEqual(3);
  });
});
