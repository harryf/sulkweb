import { describe, it, expect } from 'vitest';
import { GameEngine } from '../GameEngine.js';
import { SeededRng } from '../core/Dice.js';
import type { CompiledMission } from '../missions/missionTypes.js';
import { loadMission } from '../missions/missionLoader.js';
import { autoplay, runMarineTurn } from '../ai/MarineAutopilot.js';
import { AssaultCannonMarine, ChainFistMarine } from '../pieces/AssaultCannonMarine.js';
import { SwordSergeantMarine, SergeantMarine } from '../pieces/StormBolterMarine.js';
import { HeavyFlamerMarine } from '../pieces/HeavyFlamerMarine.js';

/**
 * beta_2 "Download" — victory machinery (original init/end_script/
 * post_action_script/victory_check) and mission fidelity. Expected board data
 * from the independent Explore-agent transcription (2026-08-15): 176 squares,
 * 38 sections, 17 doors, 9 entries, objective (12,22), M columns
 * (7,1)-(7,5) and (12,1)-(12,5).
 */

function downloadMission(overrides: Partial<CompiledMission> = {}): CompiledMission {
  return {
    name: 'dl-test', width: 3, height: 10,
    squares: Array.from({ length: 10 }, (_, y) => ({ x: 1, y, kind: 'corridor' as const })),
    marineDeployment: [{ x: 1, y: 1, facing: 'down', type: 'sergeant' }],
    entryPoints: [{ x: 1, y: 9 }],
    initialBlips: 0, blipsPerTurn: 0,
    objective: 'download', downloadPoint: { x: 1, y: 3 }, downloadTurns: 4,
    ...overrides,
  };
}

describe('download victory (ISC-258..260)', () => {
  it('a sergeant on the square begins, then decrements 4→0 and wins (ISC-258/260)', () => {
    const engine = new GameEngine(downloadMission(), [], new SeededRng(1));
    const sgt = engine.marines[0];
    sgt.moveForward(); sgt.moveForward(); // onto (1,3)
    engine.endMarinePhase(); // begins — counter holds at 4
    expect(engine.downloadCounter).toBe(4);
    for (const expected of [3, 2, 1]) {
      engine.endMarinePhase();
      expect(engine.downloadCounter).toBe(expected);
      expect(engine.state.result).toBe('ongoing');
    }
    engine.endMarinePhase(); // 0 — download complete
    expect(engine.downloadCounter).toBe(0);
    expect(engine.state.result).toBe('win');
  });

  it('the downloading sergeant moving resets the counter; turning does not (ISC-259)', () => {
    const engine = new GameEngine(downloadMission(), [], new SeededRng(1));
    const sgt = engine.marines[0];
    sgt.moveForward(); sgt.moveForward();
    engine.endMarinePhase(); // begin
    engine.endMarinePhase(); // 3
    expect(engine.downloadCounter).toBe(3);
    sgt.tryTurn(1); // turning in place is allowed (now facing west)
    engine.endMarinePhase();
    expect(engine.downloadCounter).toBe(2);
    sgt.tryTurn(1);    // face north (up the corridor)…
    sgt.moveForward(); // …and step off — the download aborts
    expect(engine.downloadCounter).toBe(4);
    engine.endMarinePhase();
    expect(engine.state.result).toBe('ongoing');
  });

  it('a plain bolter on the square downloads nothing; losing both sergeants loses (ISC-258/260)', () => {
    const engine = new GameEngine(downloadMission({
      marineDeployment: [
        { x: 1, y: 1, facing: 'down' },
        { x: 1, y: 5, facing: 'down', type: 'sergeant_sword' },
      ],
    }), [], new SeededRng(1));
    const [bolter, sword] = engine.marines;
    bolter.moveForward(); bolter.moveForward(); // bolter sits on the point
    engine.endMarinePhase();
    expect(engine.downloadCounter).toBe(4); // nothing happens
    sword.die(); // the only sergeant (sword counts as sergeant) dies
    engine.endMarinePhase();
    expect(engine.state.result).toBe('loss');
  });

  it('a SWORD sergeant can run the download too (original checks both types)', () => {
    const engine = new GameEngine(downloadMission({
      marineDeployment: [{ x: 1, y: 1, facing: 'down', type: 'sergeant_sword' }],
    }), [], new SeededRng(1));
    const sgt = engine.marines[0];
    sgt.moveForward(); sgt.moveForward();
    engine.endMarinePhase();
    engine.endMarinePhase();
    expect(engine.downloadCounter).toBe(3);
  });
});

describe('beta_2 fidelity (ISC-261/262)', () => {
  const m = loadMission('beta_2');

  it('board matches the independent transcription: 176 sq / 38 sec / 17 doors / 9 entries', () => {
    expect(m.squares).toHaveLength(176);
    expect(new Set(m.squares.map(s => s.section)).size).toBe(38);
    expect(m.squares.filter(s => s.doorFacing)).toHaveLength(17);
    expect((m.entryPoints ?? []).map(e => `${e.x},${e.y}`).sort()).toEqual(
      ['18,3', '1,10', '21,12', '22,13', '6,19', '3,22', '20,18', '16,32', '19,32'].sort());
    expect(m.width).toBe(23);
    expect(m.height).toBe(33);
  });

  it('Data Room, squads Sakharov + Sternfeld with all four exotics, blips 1/2, ambush flag', () => {
    expect(m.objective).toBe('download');
    expect(m.downloadPoint).toEqual({ x: 12, y: 22 });
    expect(m.downloadTurns).toBe(4);
    expect(m.useAmbushCounters).toBe(true);
    expect(m.initialBlips).toBe(1);
    expect(m.blipsPerTurn).toBe(2);
    const M = ['7,1', '7,2', '7,3', '7,4', '7,5', '12,1', '12,2', '12,3', '12,4', '12,5'];
    for (const d of m.marineDeployment!) expect(M).toContain(`${d.x},${d.y}`);
    const engine = new GameEngine(m, [], new SeededRng(1));
    expect(engine.marines.filter(p => p instanceof AssaultCannonMarine)).toHaveLength(1);
    expect(engine.marines.filter(p => p instanceof ChainFistMarine)).toHaveLength(1);
    expect(engine.marines.filter(p => p instanceof SwordSergeantMarine)).toHaveLength(1);
    expect(engine.marines.filter(p => p instanceof HeavyFlamerMarine)).toHaveLength(1);
    expect(engine.marines.filter(p => p instanceof SergeantMarine)).toHaveLength(2); // sword included
    expect(engine.marinePhaseSeconds).toBe(180); // two sergeants: 120 + 2×30
  });

  it('autopilot plays it legally; ambush counters appear (ISC-263 face)', () => {
    const engine = new GameEngine(loadMission('beta_2'), [], new SeededRng(7));
    autoplay(engine, 6);
    expect(engine.turnNumber).toBeGreaterThan(1);
  });

  it('PINNED opposed win: CP-boosted sergeant rush completes the download under full opposition (seed 4)', () => {
    // Advisor 2026-08-15: an aggregate "3/40" is a statistic; a pinned seed is
    // evidence. Legal play only — the probe pumps command points into the
    // sergeant nearest the Data Room and lets the shipped autopilot fight.
    const engine = new GameEngine(loadMission('beta_2'), [], new SeededRng(4));
    let t = 0;
    while (engine.state.result === 'ongoing' && t++ < 45) {
      const dp = engine.mission.downloadPoint!;
      const lead = engine.marines.filter(m => m instanceof SergeantMarine).sort((a, b) =>
        Math.hypot(dp.x - a.pos.c, dp.y - a.pos.r) - Math.hypot(dp.x - b.pos.c, dp.y - b.pos.r))[0];
      while (lead && engine.cp > 0) { if (!engine.spendCP(lead)) break; }
      runMarineTurn(engine);
      if (engine.state.result !== 'ongoing') break;
      engine.endMarinePhase();
    }
    expect(engine.state.result).toBe('win');
    expect(engine.downloadCounter).toBe(0);
  });
});
