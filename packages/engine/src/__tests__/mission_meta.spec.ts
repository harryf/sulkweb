import { describe, it, expect } from 'vitest';
import { missions } from '../missions/index.js';
import type { CompiledMission } from '../missions/missionTypes.js';

/**
 * Mission metadata for the roster/marker UI (ISC-271/274): every registered
 * mission carries entry/exit facings (original `efacing`) and squad names
 * (original MARINES rosters). Hermetic internal invariants — the extraction
 * itself is done by scripts/patchMissionMeta.ts against the original sources,
 * which aborts on any coordinate or roster-multiset mismatch.
 */

const ALL = Object.entries(missions) as [string, CompiledMission][];
const DIR: Record<string, [number, number]> = {
  up: [0, -1], right: [1, 0], down: [0, 1], left: [-1, 0],
};

describe('entry/exit facings (ISC-271)', () => {
  it('every entry point of every mission has a facing that points OFF the board', () => {
    for (const [key, m] of ALL) {
      const squares = new Set(m.squares.map(s => `${s.x},${s.y}`));
      for (const e of m.entryPoints ?? []) {
        expect(e.facing, `${key} entry (${e.x},${e.y})`).toBeDefined();
        const [dx, dy] = DIR[e.facing!];
        expect(squares.has(`${e.x + dx},${e.y + dy}`),
          `${key} entry (${e.x},${e.y}) facing ${e.facing} must point at rock`).toBe(false);
      }
    }
  });

  it('exit facings point off-board too; debug_1 mid-corridor EXIT is the lone flat marker', () => {
    for (const [key, m] of ALL) {
      const squares = new Set(m.squares.map(s => `${s.x},${s.y}`));
      for (const e of m.exitPoints ?? []) {
        if (key === 'debug_1') { expect(e.facing).toBeUndefined(); continue; } // documented adaptation
        expect(e.facing, `${key} exit (${e.x},${e.y})`).toBeDefined();
        const [dx, dy] = DIR[e.facing!];
        expect(squares.has(`${e.x + dx},${e.y + dy}`)).toBe(false);
      }
    }
  });
});

describe('doorway corners terminate in rock (ISC-616)', () => {
  it('every door-segment endpoint has at most 3 passable neighbours on every mission', () => {
    // The corner LOS rule (los.ts pointOnSegment) treats a door edge's
    // endpoints as solid doorway frame. That is only physics if no door is
    // ever authored into a fully-open 2-wide gap — this pins the property
    // the rule relies on, for all registered maps (review finding 2026-08-18).
    for (const [key, m] of ALL) {
      const squares = new Set(m.squares.map(s => `${s.x},${s.y}`));
      for (const s of m.squares) {
        if (!s.doorFacing) continue;
        const [dx, dy] = DIR[s.doorFacing];
        // Door edge between (s) and (s+d); its endpoints in grid units are the
        // two corners of that edge. The four squares meeting at each corner:
        const corners = dx === 0
          ? [[s.x, s.y + (dy + 1) / 2], [s.x + 1, s.y + (dy + 1) / 2]]   // horizontal edge
          : [[s.x + (dx + 1) / 2, s.y], [s.x + (dx + 1) / 2, s.y + 1]];  // vertical edge
        for (const [cx, cy] of corners) {
          const open = [[cx - 1, cy - 1], [cx, cy - 1], [cx - 1, cy], [cx, cy]]
            .filter(([x, y]) => squares.has(`${x},${y}`)).length;
          expect(open, `${key} door (${s.x},${s.y})${s.doorFacing} corner (${cx},${cy})`)
            .toBeLessThanOrEqual(3);
        }
      }
    }
  });
});

describe('deployment squad names (ISC-274)', () => {
  it('every deployment square of every mission names its squad', () => {
    for (const [key, m] of ALL) {
      for (const d of m.marineDeployment ?? []) {
        expect(d.squad, `${key} deploy (${d.x},${d.y})`).toBeTruthy();
      }
    }
  });

  it('original squad names and sizes survive (spot-checked against the rosters)', () => {
    const bySquad = (m: CompiledMission) => {
      const g = new Map<string, number>();
      for (const d of m.marineDeployment ?? []) g.set(d.squad!, (g.get(d.squad!) ?? 0) + 1);
      return Object.fromEntries(g);
    };
    expect(bySquad(missions.space_hulk_1)).toEqual({ Calvin: 5 });
    expect(bySquad(missions.space_hulk_2)).toEqual({ Constantine: 5 });
    expect(bySquad(missions.space_hulk_3)).toEqual({ Abel: 5, Ilyich: 5 });
    expect(bySquad(missions.space_hulk_4)).toEqual({ Pilgrim: 5, Stone: 5 });
    expect(bySquad(missions.space_hulk_5)).toEqual({ Abraham: 5, Harken: 5 });
    expect(bySquad(missions.space_hulk_6)).toEqual({ Luther: 5, Snow: 5 });
    expect(bySquad(missions.beta_1)).toEqual({ Lawer: 5 });
    expect(bySquad(missions.beta_2)).toEqual({ Sakharov: 5, Sternfeld: 5 });
    expect(bySquad(missions.debug_1)).toEqual({ Calvin: 1 });
  });

  it('squads hold together: each squad occupies one contiguous deployment chunk (except the arbitrated s6 interleave)', () => {
    for (const [key, m] of ALL) {
      if (key === 'space_hulk_6') continue; // hand-arbitrated column split — see patchMissionMeta.ts
      const seen: string[] = [];
      for (const d of m.marineDeployment ?? []) {
        if (seen[seen.length - 1] !== d.squad) {
          expect(seen, `${key}: squad ${d.squad} re-appears non-contiguously`).not.toContain(d.squad);
          seen.push(d.squad!);
        }
      }
    }
  });
});
