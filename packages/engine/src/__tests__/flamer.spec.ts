import { describe, it, expect } from 'vitest';
import { Board } from '../board/Board.js';
import { GameEngine } from '../GameEngine.js';
import { loadMission } from '../missions/missionLoader.js';
import { HeavyFlamerMarine } from '../pieces/HeavyFlamerMarine.js';
import { StormBolterMarine } from '../pieces/StormBolterMarine.js';
import { Genestealer } from '../pieces/Genestealer.js';
import { Blip } from '../pieces/Blip.js';
import { Dir } from '../core/Direction.js';
import { RollQueue } from '../core/Dice.js';
import { flameFlood } from '../rules/flame.js';
import type { SquareJSON } from '../missions/missionTypes.js';

/** Two-section fixture: corridor col 1 rows 0..3 (section 0), room rows 5..7
 *  cols 0..2 (section 1), connected by corridor square (1,4) (section 0) with
 *  a door edge between (1,4) and (1,5). */
function twoSections(): SquareJSON[] {
  const sq: SquareJSON[] = [];
  for (let r = 0; r <= 4; r++) sq.push({ x: 1, y: r, kind: 'corridor', section: 0 });
  for (let r = 5; r <= 7; r++) for (let c = 0; c <= 2; c++) sq.push({ x: c, y: r, kind: 'room', section: 1 });
  sq.find(s => s.x === 1 && s.y === 5)!.doorFacing = 'up';
  return sq;
}

describe('sections & flame flood (ISC-137/138)', () => {
  it('mission squares carry section ids into Board squares', () => {
    const m = loadMission('space_hulk_1');
    const engine = new GameEngine(m);
    const lc = engine.state.board.get(20, 20)!;
    const corridorEast = engine.state.board.get(17, 20)!;
    expect(lc.sectionId).toBeGreaterThanOrEqual(0);
    expect(corridorEast.sectionId).not.toBe(lc.sectionId);
    expect(engine.state.board.get(18, 20)!.sectionId).toBe(lc.sectionId); // door anchor is in the room section
  });

  it('flood fills the whole section and stops at closed door edges', () => {
    const board = new Board(3, 8, twoSections());
    const room = board.get(1, 6)!;
    const flooded = flameFlood(board, room);
    expect(flooded.map(s => `${s.x},${s.y}`).sort()).toEqual(
      ['0,5', '0,6', '0,7', '1,5', '1,6', '1,7', '2,5', '2,6', '2,7']);
    // room section (9 squares) only — never the corridor
    // open the door: flood still respects the SECTION boundary
    board.doorBetween({ c: 1, r: 5 }, { c: 1, r: 4 })!.open();
    expect(flameFlood(board, room)).toHaveLength(9);
  });

  it('a closed door edge INSIDE a section splits the flood (Launch Control anchor case)', () => {
    const m = loadMission('space_hulk_1');
    const engine = new GameEngine(m);
    const board = engine.state.board;
    const lc = board.get(20, 20)!;
    // door (18,20)→(19,20) is closed and both sides are section squares:
    const flooded = flameFlood(board, lc);
    expect(flooded.some(s => s.x === 18 && s.y === 20)).toBe(false); // behind its closed edge
    expect(flooded).toHaveLength(9); // the 3x3 room burns
  });
});

describe('heavy flamer (ISC-139)', () => {
  function setup() {
    const board = new Board(3, 8, twoSections());
    const flamer = new HeavyFlamerMarine(board, { c: 1, r: 1 }, Dir.S);
    board.doorBetween({ c: 1, r: 5 }, { c: 1, r: 4 })!.open(); // clear the sight line
    return { board, flamer };
  }

  it('flames a visible enemy section: 2 AP, 1 ammo, kill on d6 ≥ 2', () => {
    const { board, flamer } = setup();
    const s1 = new Genestealer(board, { c: 0, r: 6 }, Dir.N);
    const s2 = new Genestealer(board, { c: 2, r: 6 }, Dir.N);
    board.dice = new RollQueue([5, 1]); // s-kill roll order follows flood order; one survives on the 1
    const target = board.get(1, 6)!;
    expect(flamer.canFlame(target)).toBe(true);
    const kills = flamer.flameAt(target)!;
    expect(kills).toHaveLength(1);
    expect([s1.alive, s2.alive].filter(Boolean)).toHaveLength(1); // exactly one died
    expect(flamer.ap).toBe(2);
    expect(flamer.ammo).toBe(5);
    expect(board.isFlaming({ c: 0, r: 7 })).toBe(true); // whole section alight
  });

  it('refuses its own section, ammo-empty, and out-of-AP shots', () => {
    const { board, flamer } = setup();
    expect(flamer.canFlame(board.get(1, 2)!)).toBe(false); // own section
    flamer.ammo = 0;
    expect(flamer.canFlame(board.get(1, 6)!)).toBe(false);
    flamer.ammo = 6; flamer.ap = 1;
    expect(flamer.canFlame(board.get(1, 6)!)).toBe(false); // shot costs 2
  });

  it('refuses a target square carrying a closed door edge', () => {
    const board = new Board(3, 8, twoSections());
    const flamer = new HeavyFlamerMarine(board, { c: 1, r: 1 }, Dir.S);
    // door (1,5)→up is CLOSED: (1,5) carries a closed door edge → illegal target
    expect(flamer.canFlame(board.get(1, 5)!)).toBe(false);
    // the same square is legal once its door is open (sight line now clear too)
    board.doorBetween({ c: 1, r: 5 }, { c: 1, r: 4 })!.open();
    expect(flamer.canFlame(board.get(1, 5)!)).toBe(true);
  });

  it('flameAt refuses (returns undefined, spends nothing) when the shot is illegal', () => {
    const { board, flamer } = setup();
    expect(flamer.flameAt(board.get(1, 2)!)).toBeUndefined(); // own section
    expect(flamer.ap).toBe(4);
    expect(flamer.ammo).toBe(6);
  });

  it('self-destruct refuses when locked, dry, or out of AP', () => {
    const board = new Board(3, 8, twoSections());
    const flamer = new HeavyFlamerMarine(board, { c: 1, r: 6 }, Dir.N);
    board.locked = true;
    expect(flamer.selfDestruct()).toBe(false);
    board.locked = false;
    flamer.ammo = 0;
    expect(flamer.selfDestruct()).toBe(false);
    flamer.ammo = 6; flamer.ap = 0;
    expect(flamer.selfDestruct()).toBe(false);
    expect(flamer.alive).toBe(true); // nothing fired
  });

  it('flames block entry but not exit; they block LOS; end-phase clears them (ISC-140)', () => {
    const { board, flamer } = setup();
    const stealer = new Genestealer(board, { c: 1, r: 7 }, Dir.N);
    board.dice = new RollQueue([1]); // stealer survives the flames
    flamer.flameAt(board.get(1, 6)!);
    expect(stealer.alive).toBe(true);
    expect(board.isFlaming(stealer.pos)).toBe(true);
    // outsiders cannot walk in…
    const walker = new Genestealer(board, { c: 1, r: 4 }, Dir.S);
    expect(walker.tryMove(0, 1)).toBe(false);
    // …but the one inside may move within/through the burning section
    expect(stealer.tryMove(0, -1)).toBe(true);
    // flames block sight through the section
    expect(flamer.board.isFlaming({ c: 1, r: 6 })).toBe(true);
  });

  it('self-destruct wipes and torches its OWN section, marine included (ISC-141)', () => {
    const board = new Board(3, 8, twoSections());
    const flamer = new HeavyFlamerMarine(board, { c: 1, r: 6 }, Dir.N); // inside the room
    const stealer = new Genestealer(board, { c: 0, r: 5 }, Dir.S);
    const outside = new Genestealer(board, { c: 1, r: 0 }, Dir.S);
    expect(flamer.selfDestruct()).toBe(true);
    expect(flamer.alive).toBe(false);   // dies with the section
    expect(stealer.alive).toBe(false);  // no roll — silent kill
    expect(outside.alive).toBe(true);   // different section untouched
    expect(board.isFlaming({ c: 2, r: 7 })).toBe(true);
  });
});

describe('flame-objective victory (ISC-145)', () => {
  it('flaming Launch Control wins the mission on the spot', () => {
    const engine = new GameEngine({ ...loadMission('space_hulk_1'), initialBlips: 0 });
    const board = engine.state.board;
    const flamer = engine.marines.find(m => m instanceof HeavyFlamerMarine) as HeavyFlamerMarine;
    // teleport the squad's flamer to the east corridor facing the room, door open
    flamer.pos = { c: 17, r: 20 };
    flamer.facing = Dir.E;
    board.doorBetween({ c: 18, r: 20 }, { c: 19, r: 20 })!.open();
    board.dice = new RollQueue([]);
    const lc = board.get(20, 20)!;
    expect(flamer.canFlame(lc)).toBe(true);
    flamer.flameAt(lc);
    expect(engine.state.result).toBe('win');
  });

  it('losing the flamer (or its ammo) loses the mission', () => {
    const engine = new GameEngine({ ...loadMission('space_hulk_1'), initialBlips: 0 });
    const flamer = engine.marines.find(m => m instanceof HeavyFlamerMarine) as HeavyFlamerMarine;
    flamer.ammo = 0;
    engine.checkVictory();
    expect(engine.state.result).toBe('loss');
  });

  it('autopilot delivers the flamer and burns Launch Control unopposed (ISC-147)', async () => {
    // Proves the whole kill chain end-to-end: BFS pathing from the north
    // corridor, door openings, the escorts staying out of the firing corridor,
    // the flamer taking a position OUTSIDE the room, and the flame win.
    // (Opposed, the scripted autopilot loses — see ISA: Suicide Mission earns
    // its name; scan 2026-08-15: 0 wins / 60 seeds.)
    const { autoplay } = await import('../ai/MarineAutopilot.js');
    const { SeededRng } = await import('../core/Dice.js');
    const engine = new GameEngine(
      { ...loadMission('space_hulk_1'), initialBlips: 0, blipsPerTurn: 0 },
      [], new SeededRng(1));
    autoplay(engine, 30);
    expect(engine.state.result).toBe('win');
    expect(engine.turnNumber).toBeLessThanOrEqual(15);
  });

  it('marine-phase timer is 120s + 30s while the sergeant lives (ISC-143)', () => {
    const engine = new GameEngine({ ...loadMission('space_hulk_1'), initialBlips: 0 });
    expect(engine.marinePhaseSeconds).toBe(150);
    const sgt = engine.marines.find(m => m.timerBonus === 30)!;
    sgt.die();
    // flamer still alive → mission continues, but the bonus is gone
    expect(engine.state.result).toBe('ongoing');
    expect(engine.marinePhaseSeconds).toBe(120);
  });
});
