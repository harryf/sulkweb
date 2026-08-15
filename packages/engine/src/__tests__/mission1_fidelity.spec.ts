import { it, expect, describe } from 'vitest';
import { loadMission } from '../missions/missionLoader.js';
import { GameEngine } from '../GameEngine.js';

/**
 * Fidelity against the ORIGINAL Sulk Pygame mission (MISH_space_hulk_1.py,
 * supplied by the user 2026-08-15). The expected data below is transcribed
 * independently from the mission JSON so a typo in one shows up as a diff.
 */

// Every square of the original BOARD, section by section, as "x,y".
const EXPECTED_SQUARES = [
  // #5 north corridor
  '10,0', '10,1', '10,2', '10,3', '10,4',
  // #3room (door squares (10,5)/(8,7)/(10,9) included)
  '10,5', '9,6', '10,6', '11,6', '8,7', '9,7', '10,7', '11,7', '9,8', '10,8', '11,8', '10,9',
  // #4 corridor
  '4,7', '5,7', '6,7', '7,7',
  // #2room (+ door squares (3,7)/(1,9))
  '0,6', '1,6', '2,6', '0,7', '1,7', '2,7', '3,7', '0,8', '1,8', '2,8', '1,9',
  // #T west
  '1,10', '0,11', '1,11', '2,11',
  // #3
  '10,10', '10,11', '10,12',
  // #T mid
  '10,13', '10,14', '11,14', '10,15',
  // #corner (+ door (13,15))
  '12,14', '13,14', '13,15',
  // #3 + #3
  '10,16', '10,17', '10,18', '13,16', '13,17', '13,18',
  // #X + #X
  '10,19', '9,20', '10,20', '11,20', '10,21', '13,19', '12,20', '13,20', '14,20', '13,21',
  // #5 south corridor
  '4,20', '5,20', '6,20', '7,20', '8,20',
  // #T southwest
  '2,19', '2,20', '3,20', '2,21',
  // #3 + #3
  '10,22', '10,23', '10,24', '13,22', '13,23', '13,24',
  // #T south pair
  '10,25', '9,26', '10,26', '11,26', '13,25', '12,26', '13,26', '14,26',
  // #3 east
  '15,20', '16,20', '17,20',
  // #1room Launch Control (+ door (18,20))
  '19,19', '20,19', '21,19', '18,20', '19,20', '20,20', '21,20', '19,21', '20,21', '21,21',
];

const EXPECTED_DOORS = ['10,5:up', '8,7:right', '10,9:up', '3,7:right', '1,9:up', '13,15:up', '18,20:right'];

const EXPECTED_ENTRIES = ['0,11', '2,11', '2,19', '2,21', '9,26', '14,26'];

const EXPECTED_ROOMS = [
  '9,6', '10,6', '11,6', '9,7', '10,7', '11,7', '9,8', '10,8', '11,8',          // 3room
  '0,6', '1,6', '2,6', '0,7', '1,7', '2,7', '0,8', '1,8', '2,8',                // 2room
  '19,19', '20,19', '21,19', '19,20', '20,20', '21,20', '19,21', '20,21', '21,21', // Launch Control
];

describe('Mission 1 fidelity vs original Sulk BOARD', () => {
  const m = loadMission('space_hulk_1');

  it('square set matches the original exactly — 98 squares (ISC-111)', () => {
    const actual = m.squares!.map(s => `${s.x},${s.y}`).sort();
    expect(actual).toEqual([...EXPECTED_SQUARES].sort());
    expect(actual).toHaveLength(98);
  });

  it('all seven door edges match (ISC-112)', () => {
    const actual = m.squares!.filter(s => s.doorFacing).map(s => `${s.x},${s.y}:${s.doorFacing}`).sort();
    expect(actual).toEqual([...EXPECTED_DOORS].sort());
  });

  it('all six stealer entry points match (ISC-113)', () => {
    const actual = m.entryPoints!.map(e => `${e.x},${e.y}`).sort();
    expect(actual).toEqual([...EXPECTED_ENTRIES].sort());
  });

  it('room squares are exactly the three 3x3 blocks; everything else corridor (ISC-114)', () => {
    const rooms = m.squares!.filter(s => s.kind === 'room').map(s => `${s.x},${s.y}`).sort();
    expect(rooms).toEqual([...EXPECTED_ROOMS].sort());
    for (const s of m.squares!) expect(['room', 'corridor']).toContain(s.kind);
  });

  it('five marines deploy on the ORIGINAL M squares — the north corridor (ISC-115/144)', () => {
    // Source truth (2026-08-15 re-audit): the five {M:None} squares are
    // (10,0)..(10,4). BEGINPLACE (14,20) is DEAD CODE in the original —
    // its only consumers in board.py are commented out; it was the intended
    // initial camera position, not a deployment site.
    expect(m.marineDeployment).toHaveLength(5);
    const squares = m.marineDeployment!.map(d => `${d.x},${d.y}`).sort();
    expect(squares).toEqual(['10,0', '10,1', '10,2', '10,3', '10,4']);
    for (const d of m.marineDeployment!) expect(d.facing).toBe('down');
    // FORCES: 3 storm bolters, the sergeant, the heavy flamer (flamer leads)
    const types = m.marineDeployment!.map(d => d.type ?? 'storm_bolter');
    expect(types.filter(t => t === 'storm_bolter')).toHaveLength(3);
    expect(m.marineDeployment!.find(d => d.type === 'sergeant')).toEqual({ x: 10, y: 3, facing: 'down', type: 'sergeant' });
    expect(m.marineDeployment!.find(d => d.type === 'heavy_flamer')).toEqual({ x: 10, y: 4, facing: 'down', type: 'heavy_flamer' });
  });

  it('ORIGINAL objective: flame Launch Control (20,20); blip flow 2 initial + 1/turn, uncapped (ISC-116/145)', () => {
    expect(m.objective).toBe('flame-objective');
    expect(m.objectivePoint).toEqual({ x: 20, y: 20 });
    expect(m.exitPoints).toBeUndefined();
    expect(m.totalBlips).toBeUndefined();
    expect(m.initialBlips).toBe(2);
    expect(m.blipsPerTurn).toBe(1);
  });

  it('per-square sections mirror the original BOARD sublists (ISC-137)', () => {
    // 20 sections; every square has one
    const ids = new Set(m.squares!.map(s => s.section));
    expect(ids.has(undefined as never)).toBe(false);
    expect(ids.size).toBe(20);
    // the north corridor is one section…
    const northSec = m.squares!.find(s => s.x === 10 && s.y === 0)!.section;
    const north = m.squares!.filter(s => s.section === northSec).map(s => `${s.x},${s.y}`).sort();
    expect(north).toEqual(['10,0', '10,1', '10,2', '10,3', '10,4']);
    // …and Launch Control (room + its door anchor (18,20)) is one section
    const lcSec = m.squares!.find(s => s.x === 20 && s.y === 20)!.section;
    const lc = m.squares!.filter(s => s.section === lcSec).map(s => `${s.x},${s.y}`).sort();
    expect(lc).toEqual(['18,20', '19,19', '19,20', '19,21', '20,19', '20,20', '20,21', '21,19', '21,20', '21,21']);
  });

  it('the board constructs cleanly — validator accepts all door edges (ISC-117)', () => {
    const engine = new GameEngine(m);
    expect(engine.state.board.allDoors()).toHaveLength(7);
    expect(engine.marines).toHaveLength(5);
  });
});
