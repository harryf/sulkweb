/**
 * Regenerate mission JSONs with per-square section IDs derived from the
 * ORIGINAL Sulk source: BOARD is a tuple of section-lists — each sublist is
 * one board section (rooms/corridor segments). Sections drive the heavy
 * flamer (flames fill a section) and self-destruct.
 *
 *   bun scripts/addSections.ts
 *
 * Reads MISH_space_hulk_1.py, extracts (x,y) -> section index, and patches
 * both mission JSONs in place (their boards are byte-identical per source).
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const SRC = join(
  process.env.HOME!,
  'Code/personal/sulk/archive/sulk-0.29-snapshot-20030623/data/missions/space_hulk/MISH_space_hulk_1.py'
);

const py = readFileSync(SRC, 'utf8').replace(/#[^\n]*/g, ''); // strip comments
const open = py.indexOf('(', py.indexOf('BOARD'));

// Walk the whole BOARD tuple by paren depth. Depth 1 = the BOARD tuple
// itself; each depth-2 group is one SECTION sublist; deeper parens are the
// square tuples. Stop when the BOARD tuple closes.
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

const sectionOf = new Map<string, number>();
sections.forEach((body, i) => {
  // Square tuples look like "(x, y)" possibly followed by ", {TAGS}"
  for (const m of body.matchAll(/\(\s*(\d+)\s*,\s*(\d+)\s*,?\s*\)/g)) {
    const key = `${m[1]},${m[2]}`;
    if (!sectionOf.has(key)) sectionOf.set(key, i);
  }
});

console.log(`sections: ${sections.length}, squares mapped: ${sectionOf.size}`);

for (const rel of ['../src/missions/space_hulk/space_hulk_1.json', '../src/missions/debug/debug_1.json']) {
  const path = join(here, rel);
  const json = JSON.parse(readFileSync(path, 'utf8'));
  let missing = 0;
  for (const sq of json.squares) {
    const s = sectionOf.get(`${sq.x},${sq.y}`);
    if (s === undefined) { missing++; continue; }
    sq.section = s;
  }
  writeFileSync(path, JSON.stringify(json, null, 2) + '\n');
  console.log(`${rel}: patched, ${missing} squares missing a section`);
}
