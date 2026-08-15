import { it, expect, describe } from 'vitest';
import { loadMission } from '../missions/missionLoader.js';
import { missions } from '../missions/index.js';
import { GameEngine } from '../GameEngine.js';

/**
 * MISH_debug_1.py ("Suicide Mission with no forces") fidelity note, 2026-08-15.
 * Source: sulk-0.29-snapshot-20030623/data/missions/debug/MISH_debug_1.py.
 * Its BOARD literal is byte-identical to MISH_space_hulk_1's (verified by
 * diffing the two files with whitespace stripped; neither mutates the map
 * after the BOARD definition), so the identity assertion below is transitive
 * provenance: space_hulk_1 is pinned to its transcribed golden in
 * mission1_fidelity.spec, and debug_1 is pinned to space_hulk_1. If the two
 * ever legitimately diverge, split this into its own golden.
 * Forces per source: one storm-bolter marine at BEGINPLACE, BLIPS = (0, 1).
 * Documented deviations (same as space_hulk_1): reach-Launch-Control stands in
 * for the flame objective; `totalBlips: 10` caps the source's uncapped trickle
 * so extermination stays theoretically winnable; loss = squad wiped (the
 * source's debug victory_check has no stealer-win clause at all).
 */
describe('debug_1 mission (MISH_debug_1)', () => {
  const debug = loadMission('debug_1');
  const hulk = loadMission('space_hulk_1');

  it('board is square/door/entry/section-identical to space_hulk_1 (ISC-121)', () => {
    // Objective fields intentionally differ (documented adaptation) — the
    // BOARD identity covers squares, doors, entries, sections, dimensions.
    const shape = (m: typeof debug) => ({
      squares: m.squares!.map(s => `${s.x},${s.y}:${s.kind}:${s.doorFacing ?? '-'}:${s.section}`).sort(),
      entries: m.entryPoints!.map(e => `${e.x},${e.y}`).sort(),
      width: m.width, height: m.height,
    });
    expect(shape(debug)).toEqual(shape(hulk));
  });

  it('forces per source: one marine on an original M square, blips 0 initial + 1/turn (ISC-122/146)', () => {
    expect(debug.marineDeployment).toEqual([{ x: 10, y: 4, facing: 'down' }]);
    expect(debug.initialBlips).toBe(0);
    expect(debug.blipsPerTurn).toBe(1);
    expect(debug.name).toBe('Suicide Mission with no forces');
  });

  it('boots: one marine, zero enemies on turn 1 (ISC-120/122)', () => {
    const engine = new GameEngine(debug);
    expect(engine.marines).toHaveLength(1);
    expect(engine.marines[0].pos).toEqual({ c: 10, r: 4 });
    expect(engine.stealerSide).toHaveLength(0);
    expect(engine.state.board.allDoors()).toHaveLength(7);
  });

  it('first reinforcement arrives at end of turn 1 (ISC-122)', () => {
    const engine = new GameEngine(debug);
    engine.endMarinePhase();
    expect(engine.stealerSide.length).toBe(1); // the (0,1) trickle
  });

  it('registry manifest: every registered mission compiles, boots, and is no draft (ISC-120/200)', () => {
    // The guard that matters as migrated missions land: each entry parses,
    // passes the board validator, deploys its marines without throwing, and is
    // FINISHED — batch-migrator drafts (draft flag / todo list / no objective)
    // must never be registered. The registry is the playability gate.
    const names = Object.keys(missions) as (keyof typeof missions)[];
    expect(names.length).toBeGreaterThanOrEqual(3);
    for (const name of names) {
      const m = loadMission(name);
      expect(m.squares!.length).toBeGreaterThan(0);
      expect(m.name!.length).toBeGreaterThan(0);
      expect((m as Record<string, unknown>).draft, `${name} is a draft`).toBeUndefined();
      expect((m as Record<string, unknown>).todo, `${name} has open todos`).toBeUndefined();
      expect(m.objective, `${name} has no victory rule`).toBeDefined();
      const engine = new GameEngine(m);
      expect(engine.marines.length).toBe(m.marineDeployment!.length);
    }
  });
});
