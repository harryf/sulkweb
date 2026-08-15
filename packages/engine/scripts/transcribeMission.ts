/**
 * Transcribe an ORIGINAL Sulk mission source (MISH_*.py) into a mission JSON
 * board, via the shared parser (scripts/lib/parseMish.ts). Writes/patches the
 * target JSON's board fields: width, height, squares, entryPoints (and
 * exitPoints when the source has EXIT squares). Non-board fields (name,
 * marineDeployment, blips, objective, …) in an existing target are preserved —
 * rerunning is idempotent.
 *
 *   bun scripts/transcribeMission.ts <MISH_*.py> <target.json>
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { parseMish, facingOf } from './lib/parseMish.ts';

const [srcPath, outPath] = process.argv.slice(2);
if (!srcPath || !outPath) {
  console.error('usage: bun scripts/transcribeMission.ts <MISH_*.py> <target.json>');
  process.exit(1);
}

const mish = parseMish(readFileSync(srcPath, 'utf8'));

const squares = mish.squares.map(sq => {
  const out: Record<string, unknown> = {
    x: sq.x, y: sq.y,
    kind: 'M' in sq.tags ? 'room' : 'corridor',
    section: sq.section,
  };
  if (sq.tags.DOOR) out.doorFacing = facingOf(sq.tags.DOOR);
  return out;
});
const entryPoints = mish.squares.filter(s => 'ENTRY' in s.tags).map(s => ({ x: s.x, y: s.y }));
const exitSquares = mish.squares.filter(s => 'EXIT' in s.tags).map(s => ({ x: s.x, y: s.y }));

const width = Math.max(...mish.squares.map(s => s.x)) + 1;
const height = Math.max(...mish.squares.map(s => s.y)) + 1;

const json = existsSync(outPath) ? JSON.parse(readFileSync(outPath, 'utf8')) : {};
Object.assign(json, { width, height, squares, entryPoints });
if (exitSquares.length > 0) json.exitPoints = exitSquares;
// Keep a stable field order: meta/forces first, board data last.
const { name, marineDeployment, initialBlips, blipsPerTurn, totalBlips, objective, killQuota, objectivePoint, exitPoints, ...rest } = json;
const out = { name, objective, killQuota, objectivePoint, exitPoints, marineDeployment, initialBlips, blipsPerTurn, totalBlips, ...rest };
for (const k of Object.keys(out)) if ((out as Record<string, unknown>)[k] === undefined) delete (out as Record<string, unknown>)[k];

writeFileSync(outPath, JSON.stringify(out, null, 2) + '\n');
console.log(`${outPath}: ${squares.length} squares, ${mish.sections.length} sections, ` +
  `${squares.filter(s => s.doorFacing).length} doors, ${entryPoints.length} entries, ` +
  `${exitSquares.length} exits, ${squares.filter(s => s.kind === 'room').length} M/room squares, bbox ${width}x${height}`);
