import { it, expect, describe } from 'vitest';
import { loadMission } from '../missions/missionLoader.js';
import { GameEngine } from '../GameEngine.js';
import { SeededRng } from '../core/Dice.js';
import { StormBolterMarine, SergeantMarine } from '../pieces/StormBolterMarine.js';
import { HeavyFlamerMarine } from '../pieces/HeavyFlamerMarine.js';

/**
 * Fidelity against the ORIGINAL Sulk mission 2 "Exterminate"
 * (MISH_space_hulk_2.py). The expected data below was transcribed
 * INDEPENDENTLY of scripts/transcribeMission.ts (separate manual read of the
 * source, 2026-08-15) so a parser bug shows up as a diff, exactly like the
 * mission-1 fidelity guard.
 */

// Every square of the original BOARD as "x,y", grouped by section (file order).
const EXPECTED_SECTIONS: string[][] = [
  ['0,19', '1,19', '0,20'],
  ['2,19', '3,19', '4,19'],
  ['6,18', '5,19', '6,19', '6,20'],
  ['5,14', '6,14', '7,14', '5,15', '6,15', '7,15', '8,15', '5,16', '6,16', '7,16', '6,17'],
  ['9,15', '10,15'],
  ['13,13', '12,14', '13,14', '14,14', '11,15', '12,15', '13,15', '14,15', '15,15', '12,16', '13,16', '14,16'],
  ['16,15', '17,15', '18,15', '19,15', '20,15'],
  ['13,9', '13,10', '13,11', '13,12'],
  ['13,6', '12,7', '13,7', '14,7', '13,8'],
  ['8,6', '9,6', '10,6', '8,7', '9,7', '10,7', '11,7', '8,8', '9,8', '10,8'],
  ['13,4', '13,5'],
  ['12,0', '13,0', '14,0', '12,1', '13,1', '14,1', '15,1', '12,2', '13,2', '14,2', '13,3'],
  ['16,1', '17,1', '18,1'],
  ['19,1', '20,1', '21,1', '20,2'],
  ['22,1', '23,1', '23,2'],
  ['20,3', '20,4', '20,5'],
  ['23,3', '23,4', '24,4', '23,5'],
  ['25,4', '26,4', '27,4'],
  ['29,3', '28,4', '29,4', '30,4', '29,5'],
  ['29,0', '29,1', '30,1', '29,2'],
  ['25,7', '26,7', '27,7'],
  ['29,6', '28,7', '29,7', '30,7', '29,8'],
  ['23,6', '22,7', '23,7', '24,7'],
  ['20,6', '19,7', '20,7', '21,7'],
  ['15,7', '16,7', '17,7', '18,7'],
  ['6,21', '5,22', '6,22', '7,22', '5,23', '6,23', '7,23', '8,23', '5,24', '6,24', '7,24', '6,25'],
  ['9,23', '10,23', '11,23', '12,23', '13,23'],
  ['15,22', '16,22', '17,22', '14,23', '15,23', '16,23', '17,23', '15,24', '16,24', '17,24', '16,25'],
  ['16,26', '16,27', '17,27'],
  ['6,26', '5,27', '6,27', '7,27', '6,28'],
  ['0,21', '0,22', '0,23', '0,24', '0,25'],
  ['0,26', '0,27', '1,27'],
  ['2,27', '3,27', '4,27'],
  ['8,27', '9,27', '9,28'],
  ['6,29', '6,30', '6,31', '6,32'],
  ['6,33', '6,34', '6,35', '6,36', '6,37'],
  ['9,29', '9,30'],
  ['9,31', '9,32', '9,33', '9,34'],
  ['9,35', '9,36', '10,36', '9,37'],
  ['9,38', '8,39', '9,39', '10,39', '9,40'],
  ['6,38', '5,39', '6,39', '7,39', '6,40'],
  ['2,39', '3,39', '4,39', '3,40'],
];

const EXPECTED_DOORS = [
  '8,15:right', '6,17:up', '13,13:up', '11,15:right', '15,15:right',
  '12,7:right', '14,7:right', '15,1:right', '19,1:right', '24,4:right',
  '26,7:right', '20,6:up', '6,21:up', '8,23:right', '6,25:up',
  '14,23:right', '16,25:up', '5,27:right', '7,27:right',
];

const EXPECTED_ENTRIES = [
  '30,4', '29,0', '30,1', '30,7', '29,8',
  '10,36', '10,39', '9,40', '6,40', '2,39', '3,40',
];

// All 55 original M: deployment squares, spanning the six rooms.
const EXPECTED_M = [
  '5,14', '6,14', '7,14', '5,15', '6,15', '7,15', '5,16', '6,16', '7,16',
  '12,14', '13,14', '14,14', '12,15', '13,15', '14,15', '12,16', '13,16', '14,16',
  '8,6', '9,6', '10,6', '8,7', '9,7', '10,7', '8,8', '9,8', '10,8',
  '12,0', '13,0', '14,0', '12,1', '13,1', '14,1', '12,2', '13,2', '14,2', '13,3',
  '5,22', '6,22', '7,22', '5,23', '6,23', '7,23', '5,24', '6,24', '7,24',
  '15,22', '16,22', '17,22', '15,23', '16,23', '17,23', '15,24', '16,24', '17,24',
];

describe('Mission 2 fidelity vs original Sulk BOARD', () => {
  const m = loadMission('space_hulk_2');

  it('square set matches the original exactly — 204 squares (ISC-159)', () => {
    const expected = EXPECTED_SECTIONS.flat().sort();
    const actual = m.squares.map(s => `${s.x},${s.y}`).sort();
    expect(actual).toEqual(expected);
    expect(m.squares).toHaveLength(204);
  });

  it('42 sections partition the squares identically to the source sublists (ISC-160)', () => {
    expect(new Set(m.squares.map(s => s.section)).size).toBe(42);
    // Same-section in source ⇔ same-section in JSON (ids are file-ordered).
    for (const [i, section] of EXPECTED_SECTIONS.entries()) {
      const ids = new Set(section.map(key => {
        const [x, y] = key.split(',').map(Number);
        return m.squares.find(s => s.x === x && s.y === y)!.section;
      }));
      expect(ids, `section ${i}`).toEqual(new Set([i]));
    }
  });

  it('all 19 doors present with source facings (ISC-161)', () => {
    const actual = m.squares.filter(s => s.doorFacing).map(s => `${s.x},${s.y}:${s.doorFacing}`).sort();
    expect(actual).toEqual([...EXPECTED_DOORS].sort());
  });

  it('all 11 ENTRY squares present as entryPoints (ISC-162)', () => {
    const actual = (m.entryPoints ?? []).map(e => `${e.x},${e.y}`).sort();
    expect(actual).toEqual([...EXPECTED_ENTRIES].sort());
  });

  it('force is squad Constantine: 3 storm bolters + sergeant + heavy flamer (ISC-163)', () => {
    const types = (m.marineDeployment ?? []).map(d => d.type ?? 'storm_bolter').sort();
    expect(types).toEqual(['heavy_flamer', 'sergeant', 'storm_bolter', 'storm_bolter', 'storm_bolter']);
    const engine = new GameEngine(m, [], new SeededRng(1));
    expect(engine.marines.filter(p => p instanceof SergeantMarine)).toHaveLength(1);
    expect(engine.marines.filter(p => p instanceof HeavyFlamerMarine)).toHaveLength(1);
    expect(engine.marines.filter(p => p instanceof StormBolterMarine && !(p instanceof SergeantMarine))).toHaveLength(3);
    expect(engine.marinePhaseSeconds).toBe(150); // sergeant +30s
  });

  it('every deployment square is an original M square, one marine per room (ISC-164/165)', () => {
    const deploys = m.marineDeployment ?? [];
    for (const d of deploys) {
      expect(EXPECTED_M, `(${d.x},${d.y}) must be M-tagged`).toContain(`${d.x},${d.y}`);
    }
    // pre_deploy_rule: each marine's room SECTION holds no other marine.
    const sections = deploys.map(d => m.squares.find(s => s.x === d.x && s.y === d.y)!.section);
    expect(new Set(sections).size).toBe(deploys.length);
  });

  it('blips per BLIPS=(0,2): start 0, 2 per turn, uncapped (ISC-166)', () => {
    expect(m.initialBlips ?? 0).toBe(0);
    expect(m.blipsPerTurn).toBe(2);
    expect(m.totalBlips).toBeUndefined();
  });

  it('objective is kill-quota 30 (ISC-171)', () => {
    expect(m.objective).toBe('kill-quota');
    expect(m.killQuota).toBe(30);
    expect(m.exitPoints ?? []).toHaveLength(0);
    expect(m.objectivePoint).toBeUndefined();
  });

  it('registry loads it by name (ISC-158)', () => {
    expect(m.name).toBe('space_hulk_2');
    expect(m.width).toBe(31);
    expect(m.height).toBe(41);
  });
});
