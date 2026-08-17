import { describe, it, expect } from 'vitest';
import { missions, loadMission } from '@sulk/engine/index.js';
import { missionMapSVG, MAP_LEGEND } from '../missionMapSVG';

describe('missionMapSVG', () => {
  it('renders one rect per board square for space_hulk_1', () => {
    const mission = loadMission('space_hulk_1');
    const svg = missionMapSVG(mission);
    const squareRects = (svg.match(/class="sq-(corridor|room)"/g) ?? []).length;
    expect(squareRects).toBe(mission.squares.length);
  });

  it('renders entry, deploy, and objective markers matching the JSON (space_hulk_1)', () => {
    const mission = loadMission('space_hulk_1');
    const svg = missionMapSVG(mission);
    expect((svg.match(/class="entry"/g) ?? []).length).toBe(mission.entryPoints!.length);
    expect((svg.match(/class="deploy"/g) ?? []).length).toBe(mission.marineDeployment!.length);
    // flame-objective mission: exactly one objective diamond (Launch Control)
    expect((svg.match(/class="objective"/g) ?? []).length).toBe(1);
  });

  it('renders door ticks for every doorFacing square', () => {
    const mission = loadMission('space_hulk_1');
    const svg = missionMapSVG(mission);
    const doors = mission.squares.filter(sq => sq.doorFacing).length;
    expect(doors).toBeGreaterThan(0);
    expect((svg.match(/class="door"/g) ?? []).length).toBe(doors);
  });

  it('renders mission-specific specials: exits (5), ducting (6), C.A.T. (3), download (beta_2)', () => {
    expect((missionMapSVG(loadMission('space_hulk_5')).match(/class="exit"/g) ?? []).length)
      .toBe(loadMission('space_hulk_5').exitPoints!.length);
    expect((missionMapSVG(loadMission('space_hulk_6')).match(/class="ducting"/g) ?? []).length)
      .toBe(loadMission('space_hulk_6').ductingSquares!.length);
    expect(missionMapSVG(loadMission('space_hulk_3'))).toContain('class="cat"');
    expect(missionMapSVG(loadMission('beta_2'))).toContain('class="objective"');
  });

  it('produces a well-formed standalone SVG for every registered mission', () => {
    for (const key of Object.keys(missions) as (keyof typeof missions)[]) {
      const svg = missionMapSVG(loadMission(key));
      expect(svg.startsWith('<svg ')).toBe(true);
      expect(svg.endsWith('</svg>')).toBe(true);
      expect(svg).toContain('viewBox');
      expect(svg).toContain(`aria-label="Map of ${loadMission(key).name}"`);
    }
  });

  it('exports a legend covering the core symbols', () => {
    const labels = MAP_LEGEND.map(l => l.label.toLowerCase()).join(' ');
    for (const term of ['corridor', 'room', 'door', 'entry', 'exit', 'deployment', 'objective']) {
      expect(labels).toContain(term);
    }
  });
});
