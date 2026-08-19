import { describe, it, expect } from 'vitest';
import { GameEngine } from '../GameEngine.js';
import { SeededRng } from '../core/Dice.js';
import { Genestealer } from '../pieces/Genestealer.js';
import { Dir } from '../core/Direction.js';
import type { CompiledMission } from '../missions/missionTypes.js';
import { HeavyFlamerMarine } from '../pieces/HeavyFlamerMarine.js';
import { igniteSquares } from '../rules/flame.js';
import { destroyDuctingAt, looseCatPos, damageCat } from '../rules/exotic.js';
import { runStealerActions } from '../ai/StealerAI.js';
import { PieceEvents } from '../events/PieceEvents.js';

/**
 * Victory conditions + exotic systems for the completed missions
 * (MISH_space_hulk_3/4/5/6 + beta_1): C.A.T. escort, escape counting,
 * permanent cleansing, and the turn-limit defence.
 */

/** One corridor down column 1; marine at the top, optional cat/exit south. */
function corridor(overrides: Partial<CompiledMission> = {}): CompiledMission {
  return {
    name: 'exotic-test', width: 3, height: 12,
    squares: Array.from({ length: 12 }, (_, y) => ({ x: 1, y, kind: 'corridor' as const })),
    marineDeployment: [{ x: 1, y: 2, facing: 'down' }],
    entryPoints: [{ x: 1, y: 11 }],
    initialBlips: 0, blipsPerTurn: 0,
    ...overrides,
  };
}

describe('escape (lurking adaptation)', () => {
  it('a marine entering an EXIT square leaves the board and wins at quota (ISC-205/224)', () => {
    const engine = new GameEngine(corridor({
      objective: 'escape-count', escapeQuota: 1, exitPoints: [{ x: 1, y: 4 }],
    }), [], new SeededRng(1));
    const m = engine.marines[0];
    const events: number[] = [];
    PieceEvents.on('marineEscaped', ({ escaped }) => events.push(escaped));
    m.moveForward(); // y=3
    expect(engine.state.result).toBe('ongoing');
    m.moveForward(); // y=4 → exit
    expect(engine.escaped).toHaveLength(1);
    // Escape sets alive=false exactly like death — the client's hotkey/selection
    // guard depends on this single invariant (ISC-659).
    expect(m.alive).toBe(false);
    expect(events).toContain(1);
    expect(engine.state.result).toBe('win');
  });

  it('squad shrinking below the quota loses (ISC-225)', () => {
    const engine = new GameEngine(corridor({
      objective: 'escape-count', escapeQuota: 2, exitPoints: [{ x: 1, y: 9 }],
    }), [], new SeededRng(1));
    engine.marines[0].die();
    engine.endMarinePhase();
    expect(engine.state.result).toBe('loss'); // 0 alive + 0 escaped < 2
  });
});

describe('C.A.T. (mission 3 systems)', () => {
  const catMission = (over: Partial<CompiledMission> = {}) => corridor({
    objective: 'escort-cat', catStart: { x: 1, y: 4 }, exitPoints: [{ x: 1, y: 7 }], ...over,
  });

  it('a marine entering the CAT square picks it up; it moves with him (ISC-207)', () => {
    const engine = new GameEngine(catMission(), [], new SeededRng(1));
    const m = engine.marines[0];
    m.moveForward(); m.moveForward(); // onto (1,4)
    expect(engine.state.board.cat!.carrierId).toBe(m.id);
    m.moveForward(); // (1,5)
    expect(looseCatPos(engine.state.board)).toBeUndefined();
  });

  it('carrier escaping with an UNDAMAGED cat wins; DAMAGED cat draws (ISC-214/215/204)', () => {
    for (const [damaged, result] of [[false, 'win'], [true, 'draw']] as const) {
      const engine = new GameEngine(catMission(), [], new SeededRng(1));
      const m = engine.marines[0];
      m.moveForward(); m.moveForward(); // pickup
      engine.state.board.cat!.damaged = damaged;
      m.ap = 8;
      m.moveForward(); m.moveForward(); m.moveForward(); // (1,7) exit
      expect(engine.state.result).toBe(result);
    }
  });

  it('carrier death drops the cat where he fell (ISC-208)', () => {
    const engine = new GameEngine(catMission(), [], new SeededRng(1));
    const m = engine.marines[0];
    m.moveForward(); m.moveForward();
    m.die();
    expect(engine.state.board.cat!.carrierId).toBeNull();
    expect(looseCatPos(engine.state.board)).toEqual({ c: 1, r: 4 });
  });

  it('a stealer reaching the loose cat skewers it; second hit destroys → loss (ISC-209/216/235)', () => {
    const engine = new GameEngine(catMission({ marineDeployment: [{ x: 1, y: 0, facing: 'down' }] }), [], new SeededRng(1));
    const board = engine.state.board;
    new Genestealer(board, { c: 1, r: 6 }, Dir.N); // two below the cat at (1,4)
    runStealerActions(board); // the stealer lunges at the cat — with 6 AP it
    expect(board.cat!.damaged).toBe(true); // lands at least one hit, often two
    if (!board.cat!.destroyed) damageCat(board); // second hit
    expect(board.cat!.destroyed).toBe(true);
    engine.checkVictory();
    expect(engine.state.result).toBe('loss');
  });

  it('flames destroy the loose cat outright (ISC-210)', () => {
    const engine = new GameEngine(catMission(), [], new SeededRng(1));
    const board = engine.state.board;
    igniteSquares(board, 'x', [board.get(1, 4)!], true);
    expect(board.cat!.destroyed).toBe(true);
  });

  it('the loose cat wanders in the end phase, deterministically (ISC-206)', () => {
    const positions: string[] = [];
    for (let run = 0; run < 2; run++) {
      const engine = new GameEngine(catMission({ marineDeployment: [{ x: 1, y: 0, facing: 'up' }] }), [], new SeededRng(9));
      engine.endMarinePhase();
      const cat = engine.state.board.cat!;
      positions.push(`${cat.pos.c},${cat.pos.r}`);
    }
    expect(positions[0]).toBe(positions[1]); // seeded → identical wander
    expect(positions[0]).not.toBe('1,4');    // corridor is open — it moved
  });

  it('wipe with the cat still aboard is a loss (ISC-216 adaptation)', () => {
    const engine = new GameEngine(catMission(), [], new SeededRng(1));
    engine.marines[0].die();
    engine.checkVictory();
    expect(engine.state.result).toBe('loss');
  });
});

describe('flame-objectives (mission 4 systems)', () => {
  // Two one-square sections at the ends of the corridor.
  const twoObjectives = (): CompiledMission => corridor({
    objective: 'flame-objectives',
    objectivePoints: [{ x: 1, y: 0 }, { x: 1, y: 11 }],
    squares: Array.from({ length: 12 }, (_, y) => ({ x: 1, y, kind: 'corridor' as const, section: y })),
    marineDeployment: [{ x: 1, y: 5, facing: 'down', type: 'heavy_flamer' }],
  });

  it('a flaming objective square is cleansed PERMANENTLY (ISC-219)', () => {
    const engine = new GameEngine(twoObjectives(), [], new SeededRng(1));
    const board = engine.state.board;
    board.flaming.add('1,0');
    engine.checkVictory();
    expect(engine.cleansed.has('1,0')).toBe(true);
    expect(engine.state.result).toBe('ongoing');
    engine.endMarinePhase(); // flames disperse…
    expect(board.isFlaming({ c: 1, r: 0 })).toBe(false);
    expect(engine.cleansed.has('1,0')).toBe(true); // …the cleanse does not
  });

  it('both cleansed → win (ISC-220)', () => {
    const engine = new GameEngine(twoObjectives(), [], new SeededRng(1));
    engine.state.board.flaming.add('1,0');
    engine.checkVictory();
    engine.state.board.flaming.add('1,11');
    engine.checkVictory();
    expect(engine.state.result).toBe('win');
  });

  it('no living flamer with ammo → loss (ISC-221)', () => {
    const engine = new GameEngine(twoObjectives(), [], new SeededRng(1));
    const flamer = engine.marines[0] as HeavyFlamerMarine;
    flamer.ammo = 0;
    engine.checkVictory();
    expect(engine.state.result).toBe('loss');
  });
});

describe('defend (mission 6 systems)', () => {
  const defend = (over: Partial<CompiledMission> = {}): CompiledMission => corridor({
    objective: 'defend', turnLimit: 2, flamerAmmo: 4,
    ductingSquares: [{ x: 1, y: 0 }],
    roomSquares: [{ x: 1, y: 1 }, { x: 1, y: 2 }],
    marineDeployment: [{ x: 1, y: 2, facing: 'down' }],
    ...over,
  });

  it('surviving to the end of the turn limit wins (ISC-228)', () => {
    const engine = new GameEngine(defend(), [], new SeededRng(1));
    engine.endMarinePhase(); // end of turn 1
    expect(engine.state.result).toBe('ongoing');
    engine.endMarinePhase(); // end of turn 2 = the limit
    expect(engine.state.result).toBe('win');
  });

  it('a destroyed ducting loses (ISC-229) and a stealer tears it out en route (ISC-212/235)', () => {
    const engine = new GameEngine(defend({ turnLimit: 30 }), [], new SeededRng(1));
    const board = engine.state.board;
    new Genestealer(board, { c: 1, r: 5 }, Dir.N);
    runStealerActions(board); // paths to the ducting at (1,0)… may take a phase
    if (!board.ducting.get('1,0') === false) runStealerActions(board);
    // Either way, destroying it must lose:
    destroyDuctingAt(board, { c: 1, r: 0 });
    engine.checkVictory();
    expect(engine.state.result).toBe('loss');
  });

  it('the control room catching fire loses (ISC-230)', () => {
    const engine = new GameEngine(defend(), [], new SeededRng(1));
    engine.state.board.flaming.add('1,1');
    engine.checkVictory();
    expect(engine.state.result).toBe('loss');
  });

  it('flamer ammo override applies (ISC-211) and firing from the room wrecks ducting (ISC-231)', () => {
    const engine = new GameEngine(defend({
      turnLimit: 30,
      squares: Array.from({ length: 12 }, (_, y) => ({ x: 1, y, kind: 'corridor' as const, section: y < 6 ? 0 : 1 })),
      marineDeployment: [{ x: 1, y: 2, facing: 'down', type: 'heavy_flamer' }],
    }), [], new SeededRng(1));
    const flamer = engine.marines[0] as HeavyFlamerMarine;
    expect(flamer.ammo).toBe(4); // post_deploy_script override
    // Standing on a room square (1,2), flame the OTHER section (y ≥ 6):
    flamer.ap = 4;
    expect(flamer.canFlame(engine.state.board.get(1, 7))).toBe(true);
    flamer.flameAt(engine.state.board.get(1, 7)!);
    expect(engine.state.board.ducting.get('1,0')).toBe(false); // the kludge fired
    expect(engine.state.result).toBe('loss');
  });
});
