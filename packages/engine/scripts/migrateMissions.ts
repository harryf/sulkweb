/**
 * Batch-migrate every remaining ORIGINAL Sulk mission (space_hulk 3–6 and
 * beta 1–2) from Python source into structured DRAFT mission JSONs at
 * src/missions/drafts/. Everything mechanical is converted: board (squares,
 * sections, kinds, doors), entries, exits, objective squares, ducting,
 * comments, blips, squad rosters, name/info/story, plus a default
 * one-marine-per-room deployment. What a script CANNOT convert — each
 * mission's victory_check (arbitrary Python) and unbuilt engine features —
 * lands in the draft's `todo` list for per-mission hand-finishing.
 *
 * Drafts are NOT registered in missions/index.ts: the registry is the
 * playability gate. Finishing a mission = implement its todos, move the JSON
 * into its family folder, register it, and add a fidelity spec whose expected
 * data comes from an INDEPENDENT reading of the source (see mission 1/2).
 *
 *   bun scripts/migrateMissions.ts
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseMish, facingOf, type ParsedMish } from './lib/parseMish.ts';

const here = dirname(fileURLToPath(import.meta.url));
const SRC_ROOT = join(process.env.HOME!, 'Code/personal/sulk/archive/sulk-0.29-snapshot-20030623/data/missions');
const OUT_DIR = join(here, '../src/missions/drafts');

/** Original piece constants → our MarineType (or a flagged placeholder). */
const TYPE_MAP: Record<string, { type: string; implemented: boolean }> = {
  TERMINATOR_MARINE_WITH_STORM_BOLTER: { type: 'storm_bolter', implemented: true },
  TERMINATOR_MARINE_SERGEANT: { type: 'sergeant', implemented: true },
  TERMINATOR_MARINE_WITH_HEAVY_FLAMER: { type: 'heavy_flamer', implemented: true },
  TERMINATOR_MARINE_WITH_ASSAULT_CANNON: { type: 'assault_cannon', implemented: false },
  TERMINATOR_MARINE_WITH_CHAIN_FIST: { type: 'chain_fist', implemented: false },
  TERMINATOR_MARINE_SERGEANT_WITH_SWORD: { type: 'sergeant_sword', implemented: false },
  CAT: { type: 'cat', implemented: false },
};

/** Per-mission semantic remainder a script cannot convert (victory_check is
 *  arbitrary Python; these summaries mirror each source's INFO + functions). */
const SEMANTIC_TODO: Record<string, string[]> = {
  space_hulk_3: [
    'victory: escort the CAT to an EXIT (FLAGS=(CAT,)) — CAT piece not implemented',
    'draw state exists in the original victory_check — engine has win/loss only',
    'check pre_deploy_rule for deployment constraints before finalizing marineDeployment',
  ],
  space_hulk_4: [
    'victory: flame BOTH Gene Bank objective squares (O:1 at (9,6) and (9,17)) — needs multi-point flame-objective with per-point cleansed persistence',
    'TWO squads (Pilgrim, Stone) deploy — engine deploys a flat marine list; squad identity is cosmetic so far',
    'check pre_deploy_rule before finalizing marineDeployment',
  ],
  space_hulk_5: [
    'victory: ≥5 marines LURKING off-board win (get_numlurking) — lurking/exit-arrow limbo not implemented',
    'end_script + pre_deploy_rule hooks unread in depth — read before finalizing',
  ],
  space_hulk_6: [
    'victory: marines win by surviving to turn 16 (sulkgame.turnnumber == 16) — engine has no turn-limit objective',
    'O:1 Control-room squares + O:2 DUCTING squares drive the defend rule — DUCTING feature not implemented',
    'post_deploy_script overrides heavy-flamer ammo to 4 — engine has no per-mission ammo override',
    'nearly the whole map is M-tagged (deploy almost anywhere) — the kind:room heuristic mis-paints it; hand-review square kinds',
  ],
  beta_1: [
    'victory: ANY marine lurking off-board wins (Messenger) — lurking not implemented',
    'post_deploy_script / post_action_script hooks present — read before finalizing',
  ],
  beta_2: [
    'equipment: assault cannon (+autofire/reload/malfunction), chain fist, sergeant-with-sword not implemented',
    'FLAGS=(USE_AMBUSH_COUNTERS,) — ambush counters not implemented',
    'victory: hold the Data Room square (O:1 at (12,22)) for 4 turns (init/end_script counter) — not implemented',
  ],
};

const MISSIONS: { family: string; file: string; key: string }[] = [
  { family: 'space_hulk', file: 'MISH_space_hulk_3.py', key: 'space_hulk_3' },
  { family: 'space_hulk', file: 'MISH_space_hulk_4.py', key: 'space_hulk_4' },
  { family: 'space_hulk', file: 'MISH_space_hulk_5.py', key: 'space_hulk_5' },
  { family: 'space_hulk', file: 'MISH_space_hulk_6.py', key: 'space_hulk_6' },
  { family: 'beta', file: 'MISH_beta_1.py', key: 'beta_1' },
  { family: 'beta', file: 'MISH_beta_2.py', key: 'beta_2' },
];

mkdirSync(OUT_DIR, { recursive: true });

for (const { family, file, key } of MISSIONS) {
  const mish: ParsedMish = parseMish(readFileSync(join(SRC_ROOT, family, file), 'utf8'));
  const todo: string[] = [...(SEMANTIC_TODO[key] ?? [])];

  const squares = mish.squares.map(sq => {
    const out: Record<string, unknown> = {
      x: sq.x, y: sq.y,
      kind: 'M' in sq.tags ? 'room' : 'corridor',
      section: sq.section,
    };
    if (sq.tags.DOOR) out.doorFacing = facingOf(sq.tags.DOOR);
    return out;
  });

  const byTag = (tag: string) => mish.squares.filter(s => tag in s.tags);
  const entryPoints = byTag('ENTRY').map(s => ({ x: s.x, y: s.y }));
  const exitPoints = byTag('EXIT').map(s => ({ x: s.x, y: s.y }));
  const objectiveSquares = byTag('O').map(s => ({ x: s.x, y: s.y, id: Number(s.tags.O) }));
  const ducting = byTag('DUCTING').map(s => ({ x: s.x, y: s.y, facing: facingOf(s.tags.DUCTING) }));
  const comments = mish.squares.filter(s => 'COMMENT' in s.tags).map(s => ({ x: s.x, y: s.y, text: s.tags.COMMENT }));

  // Squad rosters mapped to our types; unknowns and stealer-placed flagged.
  const squads = mish.squads.map(sq => ({
    name: sq.name,
    pieces: sq.pieces.map(p => {
      const mapped = TYPE_MAP[p.type] ?? { type: p.type, implemented: false };
      if (!mapped.implemented) todo.push(`piece type not implemented: ${p.type} (${sq.name})`);
      return {
        type: mapped.type,
        ...(p.team === 'STEALERTEAM' ? { stealerPlaced: true } : {}),
      };
    }),
  }));
  if (squads.some(s => s.pieces.some(p => (p as { stealerPlaced?: boolean }).stealerPlaced))) {
    todo.push('stealer-placed pieces need adversarial fixed placement (see mission 2 Decisions)');
  }

  // Default deployment: original deploy pops the roster from the END; assign
  // each popped piece the first free M square in a not-yet-used room section,
  // falling back to any free M square (missions with more marines than rooms).
  const roster = squads.flatMap(s => s.pieces.map(p => p.type));
  const popped = [...roster].reverse();
  const mSquares = byTag('M');
  const usedRooms = new Set<number>();
  const usedSquares = new Set<string>();
  const marineDeployment: Record<string, unknown>[] = [];
  for (const type of popped) {
    const pick = mSquares.find(s => !usedRooms.has(s.section) && !usedSquares.has(`${s.x},${s.y}`))
      ?? mSquares.find(s => !usedSquares.has(`${s.x},${s.y}`));
    if (!pick) break;
    usedRooms.add(pick.section);
    usedSquares.add(`${pick.x},${pick.y}`);
    marineDeployment.push({ x: pick.x, y: pick.y, facing: 'down', ...(type !== 'storm_bolter' ? { type } : {}) });
  }
  if (marineDeployment.length < roster.length) todo.push(`deployment: only ${marineDeployment.length}/${roster.length} default squares assigned`);
  todo.push('deployment squares + facings are mechanical defaults — hand-review against pre_deploy_rule and the mission tactics');
  todo.push('victory rule not migrated — implement from victory_check, then register in missions/index.ts + fidelity spec');

  const draft = {
    name: key,
    draft: true,
    originalName: mish.name,
    family,
    info: mish.info,
    story: mish.story,
    flags: mish.flags,
    squads,
    marineDeployment,
    initialBlips: mish.blips?.initial ?? 0,
    blipsPerTurn: mish.blips?.perTurn ?? 0,
    ...(exitPoints.length ? { exitPoints } : {}),
    ...(objectiveSquares.length ? { objectiveSquares } : {}),
    ...(ducting.length ? { ducting } : {}),
    ...(comments.length ? { comments } : {}),
    todo,
    width: Math.max(...mish.squares.map(s => s.x)) + 1,
    height: Math.max(...mish.squares.map(s => s.y)) + 1,
    squares,
    entryPoints,
  };

  const outPath = join(OUT_DIR, `${key}.json`);
  writeFileSync(outPath, JSON.stringify(draft, null, 2) + '\n');
  console.log(`${key}: ${squares.length} sq / ${mish.sections.length} sec / ` +
    `${squares.filter(s => s.doorFacing).length} doors / ${entryPoints.length} entry / ${exitPoints.length} exit / ` +
    `${objectiveSquares.length} obj / ${ducting.length} duct / ${mSquares.length} M / ` +
    `${roster.length} marines in ${squads.length} squad(s) / blips ${mish.blips?.initial},${mish.blips?.perTurn} / ` +
    `bbox ${draft.width}x${draft.height} / ${todo.length} todos`);
}
console.log(`\ndrafts written to ${OUT_DIR} — NOT registered (registry = playability gate)`);
