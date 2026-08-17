import { DIR_VEC, DOOR_FACING } from '@sulk/engine/index.js';
import type { CompiledMission } from '@sulk/engine/index.js';

/**
 * Renders a mission's board as a standalone SVG string, straight from the
 * mission JSON the engine itself plays — the manual's maps can never drift
 * from the game. Pure string builder: no DOM, unit-testable in isolation.
 *
 * One tile of margin all round so off-board entry triangles and exit arrows
 * are visible, exactly like the in-game camera.
 */

/** SVG units per board square. */
const S = 16;

const COLORS = {
  corridor: '#3a3a40',
  room: '#2b3340',
  grid: '#17171c',
  door: '#d08030',
  entry: '#e04040',
  exit: '#40c040',
  deploy: '#5aa0e8',
  objective: '#e8c840',
  ducting: '#e8e840',
  cat: '#e8e8e8',
  download: '#40c8c8',
} as const;

function vec(facing: 'up' | 'right' | 'down' | 'left'): { dc: number; dr: number } {
  return DIR_VEC[DOOR_FACING[facing]];
}

/** Triangle centered in cell (cx,cy) (board coords), pointing INTO the board. */
function triangle(cx: number, cy: number, facing: 'up' | 'right' | 'down' | 'left', color: string, cls: string): string {
  const { dc, dr } = vec(facing); // direction OFF the board
  const x = (cx + 1) * S + S / 2, y = (cy + 1) * S + S / 2;
  const tipX = x - dc * S * 0.35, tipY = y - dr * S * 0.35; // tip toward the board
  const baseX = x + dc * S * 0.3, baseY = y + dr * S * 0.3;
  // Perpendicular for the base corners
  const px = -dr, py = dc;
  const p1 = `${baseX + px * S * 0.32},${baseY + py * S * 0.32}`;
  const p2 = `${baseX - px * S * 0.32},${baseY - py * S * 0.32}`;
  return `<polygon class="${cls}" points="${tipX},${tipY} ${p1} ${p2}" fill="${color}"/>`;
}

export function missionMapSVG(mission: CompiledMission): string {
  const w = (mission.width + 2) * S;
  const h = (mission.height + 2) * S;
  const parts: string[] = [];
  parts.push(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" role="img" aria-label="Map of ${mission.name}">`);
  parts.push(`<rect width="${w}" height="${h}" fill="#0d0d0d"/>`);

  // Board squares
  for (const sq of mission.squares) {
    const x = (sq.x + 1) * S, y = (sq.y + 1) * S;
    parts.push(`<rect class="sq-${sq.kind}" x="${x}" y="${y}" width="${S}" height="${S}" fill="${COLORS[sq.kind]}" stroke="${COLORS.grid}" stroke-width="1"/>`);
  }

  // Door edges (squares carrying doorFacing) — a thick tick on that edge
  for (const sq of mission.squares) {
    if (!sq.doorFacing) continue;
    const { dc, dr } = vec(sq.doorFacing);
    const cx = (sq.x + 1) * S + S / 2, cy = (sq.y + 1) * S + S / 2;
    const ex = cx + dc * S / 2, ey = cy + dr * S / 2; // midpoint of the door edge
    const px = -dr, py = dc; // along the edge
    parts.push(`<line class="door" x1="${ex - px * S * 0.45}" y1="${ey - py * S * 0.45}" x2="${ex + px * S * 0.45}" y2="${ey + py * S * 0.45}" stroke="${COLORS.door}" stroke-width="3"/>`);
  }

  // Marine deployment squares
  for (const d of mission.marineDeployment ?? []) {
    const x = (d.x + 1) * S + S / 2, y = (d.y + 1) * S + S / 2;
    parts.push(`<circle class="deploy" cx="${x}" cy="${y}" r="${S * 0.3}" fill="${COLORS.deploy}"/>`);
  }

  // Entry points: red triangle one square OFF-board (the efacing direction)
  for (const e of mission.entryPoints ?? []) {
    const f = e.facing ?? 'up';
    const { dc, dr } = vec(f);
    parts.push(triangle(e.x + dc, e.y + dr, f, COLORS.entry, 'entry'));
  }

  // Exit points: green triangle off-board, pointing OUT (the escape direction)
  for (const e of mission.exitPoints ?? []) {
    const f = e.facing ?? 'up';
    const { dc, dr } = vec(f);
    const flip = { up: 'down', down: 'up', left: 'right', right: 'left' } as const;
    parts.push(triangle(e.x + dc, e.y + dr, flip[f], COLORS.exit, 'exit'));
  }

  // Objective squares (flame targets), diamond markers
  const objectives = [
    ...(mission.objectivePoint ? [mission.objectivePoint] : []),
    ...(mission.objectivePoints ?? []),
    ...(mission.downloadPoint ? [mission.downloadPoint] : []),
  ];
  for (const o of objectives) {
    const x = (o.x + 1) * S + S / 2, y = (o.y + 1) * S + S / 2;
    const r = S * 0.38;
    const color = mission.downloadPoint === o ? COLORS.download : COLORS.objective;
    parts.push(`<polygon class="objective" points="${x},${y - r} ${x + r},${y} ${x},${y + r} ${x - r},${y}" fill="${color}"/>`);
  }

  // Ducting + C.A.T. specials
  for (const d of mission.ductingSquares ?? []) {
    const x = (d.x + 1) * S, y = (d.y + 1) * S;
    parts.push(`<rect class="ducting" x="${x + 2}" y="${y + 2}" width="${S - 4}" height="${S - 4}" fill="none" stroke="${COLORS.ducting}" stroke-width="2"/>`);
  }
  if (mission.catStart) {
    const x = (mission.catStart.x + 1) * S + S / 2, y = (mission.catStart.y + 1) * S + S / 2;
    parts.push(`<circle class="cat" cx="${x}" cy="${y}" r="${S * 0.25}" fill="none" stroke="${COLORS.cat}" stroke-width="2"/>`);
  }

  parts.push('</svg>');
  return parts.join('');
}

/** Legend rows for the manual: symbol swatch (mini-SVG) + meaning. */
export const MAP_LEGEND: ReadonlyArray<{ swatch: string; label: string }> = [
  { swatch: `<svg viewBox="0 0 16 16"><rect x="1" y="1" width="14" height="14" fill="${COLORS.corridor}"/></svg>`, label: 'Corridor square' },
  { swatch: `<svg viewBox="0 0 16 16"><rect x="1" y="1" width="14" height="14" fill="${COLORS.room}"/></svg>`, label: 'Room square' },
  { swatch: `<svg viewBox="0 0 16 16"><line x1="2" y1="8" x2="14" y2="8" stroke="${COLORS.door}" stroke-width="3"/></svg>`, label: 'Door' },
  { swatch: `<svg viewBox="0 0 16 16"><polygon points="8,3 3,13 13,13" fill="${COLORS.entry}"/></svg>`, label: 'Genestealer entry point' },
  { swatch: `<svg viewBox="0 0 16 16"><polygon points="8,13 3,3 13,3" fill="${COLORS.exit}"/></svg>`, label: 'Marine exit' },
  { swatch: `<svg viewBox="0 0 16 16"><circle cx="8" cy="8" r="5" fill="${COLORS.deploy}"/></svg>`, label: 'Marine deployment square' },
  { swatch: `<svg viewBox="0 0 16 16"><polygon points="8,2 14,8 8,14 2,8" fill="${COLORS.objective}"/></svg>`, label: 'Objective square' },
  { swatch: `<svg viewBox="0 0 16 16"><rect x="3" y="3" width="10" height="10" fill="none" stroke="${COLORS.ducting}" stroke-width="2"/></svg>`, label: 'Ducting (mission 6)' },
  { swatch: `<svg viewBox="0 0 16 16"><circle cx="8" cy="8" r="4" fill="none" stroke="${COLORS.cat}" stroke-width="2"/></svg>`, label: 'C.A.T. start (Rescue)' },
];
