/**
 * Transcribe an ORIGINAL Sulk mission source (MISH_*.py) into a mission JSON
 * board. Generalizes addSections.ts: parses the BOARD tuple by paren depth
 * (each depth-2 sublist is one board SECTION), reads per-square tags
 * (M = marine deploy → kind 'room'; DOOR:dir; ENTRY:dir), and writes/patches
 * the target JSON's board fields: width, height, squares, entryPoints.
 * Non-board fields (name, marineDeployment, blips, objective, …) in an
 * existing target are preserved — rerunning is idempotent.
 *
 *   bun scripts/transcribeMission.ts <MISH_*.py> <target.json>
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';

const [srcPath, outPath] = process.argv.slice(2);
if (!srcPath || !outPath) {
  console.error('usage: bun scripts/transcribeMission.ts <MISH_*.py> <target.json>');
  process.exit(1);
}

const py = readFileSync(srcPath, 'utf8').replace(/#[^\n]*/g, ''); // strip comments
const open = py.indexOf('(', py.indexOf('BOARD'));

// Walk the BOARD tuple by paren depth. Depth 1 = the BOARD tuple itself; each
// depth-2 group is one SECTION sublist; deeper parens are the square tuples.
const sections: string[] = [];
let depth = 1, cur = '';
for (let i = open + 1; i < py.length && depth > 0; i++) {
  const ch = py[i];
  if (ch === '(') {
    depth++;
    if (depth === 2) { cur = ''; continue; }
  } else if (ch === ')') {
    depth--;
    if (depth === 1) { sections.push(cur); continue; }
    if (depth === 0) break;
  }
  if (depth >= 2) cur += ch;
}

interface Sq { x: number; y: number; kind: 'corridor' | 'room'; section: number; doorFacing?: string }
const FACING: Record<string, string> = { UP: 'up', RIGHT: 'right', DOWN: 'down', LEFT: 'left' };

const squares: Sq[] = [];
const entryPoints: { x: number; y: number }[] = [];
sections.forEach((body, i) => {
  // Square tuples look like "(x, y)" (trailing comma tolerated) optionally
  // followed by ",{TAG:DIR}" — e.g. "(5, 14),{M:None}" or "(29, 5,),".
  for (const m of body.matchAll(/\(\s*(\d+)\s*,\s*(\d+)\s*,?\s*\)\s*,?\s*(?:\{\s*(\w+)\s*:\s*(\w+)\s*\})?/g)) {
    const x = Number(m[1]), y = Number(m[2]);
    const tag = m[3], dir = m[4];
    const sq: Sq = { x, y, kind: tag === 'M' ? 'room' : 'corridor', section: i };
    if (tag === 'DOOR') sq.doorFacing = FACING[dir];
    squares.push(sq);
    if (tag === 'ENTRY') entryPoints.push({ x, y });
  }
});

const width = Math.max(...squares.map(s => s.x)) + 1;
const height = Math.max(...squares.map(s => s.y)) + 1;

const json = existsSync(outPath) ? JSON.parse(readFileSync(outPath, 'utf8')) : {};
Object.assign(json, { width, height, squares, entryPoints });
// Keep a stable field order: meta/forces first, board data last.
const { name, marineDeployment, initialBlips, blipsPerTurn, totalBlips, objective, killQuota, objectivePoint, exitPoints, ...rest } = json;
const out = { name, objective, killQuota, objectivePoint, exitPoints, marineDeployment, initialBlips, blipsPerTurn, totalBlips, ...rest };
for (const k of Object.keys(out)) if ((out as Record<string, unknown>)[k] === undefined) delete (out as Record<string, unknown>)[k];

writeFileSync(outPath, JSON.stringify(out, null, 2) + '\n');
console.log(`${outPath}: ${squares.length} squares, ${sections.length} sections, ` +
  `${squares.filter(s => s.doorFacing).length} doors, ${entryPoints.length} entries, ` +
  `${squares.filter(s => s.kind === 'room').length} M/room squares, bbox ${width}x${height}`);
