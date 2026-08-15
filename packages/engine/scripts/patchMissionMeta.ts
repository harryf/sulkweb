/**
 * Patch registered mission JSONs with metadata from the ORIGINAL sources:
 *   - entryPoints[].facing / exitPoints[].facing — the `efacing` off-board
 *     direction of each ENTRY:/EXIT: tag (drives the EntryTriangle/ExitArrow
 *     rendering, misc.py).
 *   - marineDeployment[].squad — original MARINES roster squad names, matched
 *     to the deployment order by per-squad type-MULTISET equality (deployment
 *     squares were hand-finalized, so in-chunk order may differ from roster).
 *
 * Idempotent: re-running rewrites the same values. Aborts loudly on any
 * coordinate or roster mismatch — never guesses.
 *
 *   bun scripts/patchMissionMeta.ts
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseMish, facingOf } from './lib/parseMish.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const SRC_ROOT = join(process.env.HOME!, 'Code/personal/sulk/archive/sulk-0.29-snapshot-20030623/data/missions');
const OUT_ROOT = join(HERE, '../src/missions');

const TYPE_MAP: Record<string, string> = {
  TERMINATOR_MARINE_WITH_STORM_BOLTER: 'storm_bolter',
  TERMINATOR_MARINE_SERGEANT: 'sergeant',
  TERMINATOR_MARINE_WITH_HEAVY_FLAMER: 'heavy_flamer',
  TERMINATOR_MARINE_WITH_ASSAULT_CANNON: 'assault_cannon',
  TERMINATOR_MARINE_WITH_CHAIN_FIST: 'chain_fist',
  TERMINATOR_MARINE_SERGEANT_WITH_SWORD: 'sergeant_sword',
};

const MISSIONS = [
  { family: 'space_hulk', file: 'MISH_space_hulk_1.py', key: 'space_hulk_1' },
  { family: 'space_hulk', file: 'MISH_space_hulk_2.py', key: 'space_hulk_2' },
  { family: 'space_hulk', file: 'MISH_space_hulk_3.py', key: 'space_hulk_3' },
  { family: 'space_hulk', file: 'MISH_space_hulk_4.py', key: 'space_hulk_4' },
  { family: 'space_hulk', file: 'MISH_space_hulk_5.py', key: 'space_hulk_5' },
  { family: 'space_hulk', file: 'MISH_space_hulk_6.py', key: 'space_hulk_6' },
  { family: 'beta', file: 'MISH_beta_1.py', key: 'beta_1' },
  { family: 'beta', file: 'MISH_beta_2.py', key: 'beta_2' },
  { family: 'debug', file: 'MISH_debug_1.py', key: 'debug_1' },
];

const bag = (types: string[]) => [...types].sort().join('|');

/** Hand-arbitrated squad splits where positional chunking is ambiguous.
 *  space_hulk_6: the finalized deployment interleaves Luther/Snow (identical
 *  rosters) across the west/east columns — split follows the columns. */
const SQUAD_OVERRIDES: Record<string, Record<string, number[]>> = {
  space_hulk_6: { Luther: [0, 1, 3, 6, 8], Snow: [2, 4, 5, 7, 9] },
};

const DIRS = [['up', 0, -1], ['right', 1, 0], ['down', 0, 1], ['left', -1, 0]] as const;

let failures = 0;
for (const m of MISSIONS) {
  const mish = parseMish(readFileSync(join(SRC_ROOT, m.family, m.file), 'utf8'));
  const jsonPath = join(OUT_ROOT, m.family, `${m.key}.json`);
  const mission = JSON.parse(readFileSync(jsonPath, 'utf8'));
  const notes: string[] = [];

  // ---- entry/exit facings, matched by coordinate ----
  for (const [tag, listName] of [['ENTRY', 'entryPoints'], ['EXIT', 'exitPoints']] as const) {
    const src = new Map(
      mish.squares.filter(s => tag in s.tags).map(s => [`${s.x},${s.y}`, facingOf(s.tags[tag])]));
    for (const p of mission[listName] ?? []) {
      let facing = src.get(`${p.x},${p.y}`);
      if (!facing) {
        // Adapted point with no source tag (debug_1's added EXIT): derive the
        // off-board direction — the side with no board square.
        const squares = new Set(mission.squares.map((s: { x: number; y: number }) => `${s.x},${s.y}`));
        facing = DIRS.find(([, dx, dy]) => !squares.has(`${p.x + dx},${p.y + dy}`))?.[0];
        if (!facing) {
          // Fully surrounded adapted point (debug_1's mid-corridor EXIT): no
          // off-board arrow is possible — leave facing unset, client keeps the
          // flat marker. Warning only, not a failure.
          notes.push(`${listName} (${p.x},${p.y}): adapted mid-board point, no facing (flat marker)`);
          delete p.facing;
          continue;
        }
        notes.push(`${listName} (${p.x},${p.y}): adapted point, facing '${facing}' derived from rock neighbor`);
      }
      p.facing = facing;
    }
    const jsonCoords = new Set((mission[listName] ?? []).map((p: { x: number; y: number }) => `${p.x},${p.y}`));
    for (const coord of src.keys()) {
      if (!jsonCoords.has(coord)) { notes.push(`source ${tag} ${coord} missing from JSON ${listName}`); failures++; }
    }
  }

  // ---- squad names: chunk deployment by roster sizes, verify type multisets ----
  // All marine pieces count, INCLUDING mission 2's STEALERTEAM-placed marines
  // (they are still squad members occupying deployment squares); only the
  // C.A.T. (not in TYPE_MAP) is excluded.
  const squads = mish.squads
    .map(sq => ({
      name: sq.name,
      types: sq.pieces.filter(p => TYPE_MAP[p.type]).map(p => TYPE_MAP[p.type]),
    }))
    .filter(sq => sq.types.length > 0);
  const deployment: { type?: string; squad?: string }[] = mission.marineDeployment ?? [];
  const total = squads.reduce((n, s) => n + s.types.length, 0);
  const override = SQUAD_OVERRIDES[m.key];
  if (total !== deployment.length) {
    notes.push(`roster ${total} marines vs ${deployment.length} deployment squares`); failures++;
  } else if (override) {
    for (const sq of squads) {
      const idx = override[sq.name] ?? [];
      if (bag(idx.map(i => deployment[i]?.type ?? 'storm_bolter')) !== bag(sq.types)) {
        notes.push(`squad ${sq.name}: OVERRIDE indices types != roster`); failures++;
      } else {
        for (const i of idx) deployment[i].squad = sq.name;
      }
    }
  } else {
    let offset = 0;
    for (const sq of squads) {
      const chunk = deployment.slice(offset, offset + sq.types.length);
      if (bag(chunk.map(d => d.type ?? 'storm_bolter')) !== bag(sq.types)) {
        notes.push(`squad ${sq.name}: deployment chunk types != roster (offset ${offset})`); failures++;
      } else {
        for (const d of chunk) d.squad = sq.name;
      }
      offset += sq.types.length;
    }
  }

  writeFileSync(jsonPath, JSON.stringify(mission, null, 2) + '\n');
  console.log(`${m.key}: entries ${mission.entryPoints?.length ?? 0}, exits ${mission.exitPoints?.length ?? 0}, ` +
    `squads [${squads.map(s => `${s.name}:${s.types.length}`).join(', ')}]` +
    (notes.length ? `\n  !! ${notes.join('\n  !! ')}` : ''));
}
if (failures) { console.error(`\n${failures} mismatches — fix by hand before trusting the metadata`); process.exit(1); }
