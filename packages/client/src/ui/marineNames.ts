import type { GameEngine, CompiledMission, MarineType } from '@sulk/engine/index.js';

/**
 * Static, deterministic marine identities for the roster panel. The name pool
 * is fixed; a mission always yields the same names (offset derived from the
 * mission name, then assignment follows deployment order). Squads come from
 * the mission JSON `squad` metadata (original MARINES rosters).
 */

export interface RosterEntry {
  id: string;
  /** Display name, e.g. "Sgt. Gideon" / "Bro. Zael". */
  name: string;
  squad: string;
  type: MarineType;
  spriteKey: string;
  /** Special-weapon label shown on the card; undefined for plain storm bolters. */
  special?: string;
}

/** Space Hulk-flavoured Deathwing name pool (≥ the 10-marine mission max). */
export const NAME_POOL = [
  'Lorenzo', 'Gideon', 'Claudio', 'Zael', 'Scipio', 'Valencio',
  'Omnio', 'Leon', 'Goriel', 'Noctis', 'Deino', 'Barachiel',
  'Cassius', 'Invictus', 'Raguel', 'Ortan', 'Mordred', 'Alaric',
  'Baldwin', 'Temperus', 'Vortimer', 'Hectarion', 'Sarpedon', 'Tyberos',
] as const;

const SPECIAL_LABEL: Partial<Record<MarineType, string>> = {
  heavy_flamer: 'Heavy Flamer',
  assault_cannon: 'Assault Cannon',
  chain_fist: 'Chain Fist',
  sergeant_sword: 'Power Sword',
};

const isSergeant = (t: MarineType) => t === 'sergeant' || t === 'sergeant_sword';

/** Stable per-mission offset into the pool — different missions feel distinct,
 *  the same mission is always identical. */
export function nameOffset(missionName: string): number {
  let h = 0;
  for (const ch of missionName) h = (h * 31 + ch.charCodeAt(0)) % 997;
  return h % NAME_POOL.length;
}

/** What each deployment type's engine piece renders as — used to cross-check
 *  the positional zip below. Mirrors GameEngine's MARINE_CLASSES mapping. */
const EXPECTED_SPRITE: Record<MarineType, string> = {
  storm_bolter: 'terminator_storm_bolter',
  sergeant: 'terminator_sergeant',
  sergeant_sword: 'terminator_sergeant_sword',
  heavy_flamer: 'terminator_heavy_flamer',
  assault_cannon: 'terminator_assault_cannon',
  chain_fist: 'terminator_chain_fist',
};

/**
 * Zip the engine's marines (deployment order — pieces are inserted in
 * marineDeployment order) with the mission deployment metadata, BY ID, at
 * scene start. Later deaths shrink `engine.marines` but never shift these.
 *
 * The pairing is positional, so it is CROSS-CHECKED per pair on a property
 * both sides carry independently — the weapon (deploy type vs the engine
 * piece's sprite). A silent permutation (e.g. a future deploy-order refactor)
 * would otherwise keep rendering plausible-but-wrong names; the mismatch
 * downgrades the card to an unmistakable "Unknown" instead. (Advisor 2026-08-15.)
 */
export function buildRoster(engine: GameEngine, mission: CompiledMission): RosterEntry[] {
  const deploy = mission.marineDeployment ?? [];
  const off = nameOffset(mission.name);
  return engine.marines.map((m, i) => {
    let type: MarineType = (deploy[i]?.type ?? 'storm_bolter') as MarineType;
    let squad = deploy[i]?.squad ?? 'Squad';
    if (EXPECTED_SPRITE[type] !== m.spriteKey) {
      console.warn(`roster zip mismatch at ${i}: deploy says ${type}, engine piece is ${m.spriteKey}`);
      type = 'storm_bolter';
      squad = 'Unknown';
    }
    const first = NAME_POOL[(off + i) % NAME_POOL.length];
    return {
      id: m.id,
      name: `${isSergeant(type) ? 'Sgt.' : 'Bro.'} ${first}`,
      squad,
      type,
      spriteKey: m.spriteKey,
      special: SPECIAL_LABEL[type],
    };
  });
}

/** Display order inside a squad row: sergeants, then specials, then bolters. */
export function displayOrder(entries: RosterEntry[]): RosterEntry[] {
  const rank = (t: MarineType) =>
    isSergeant(t) ? 0 : t === 'storm_bolter' ? 2 : 1;
  return [...entries].sort((a, b) => rank(a.type) - rank(b.type));
}

/**
 * Group by squad, preserving first-appearance order. Rows are TITLED after
 * their leader per the Space Hulk convention (the original names squads for
 * their sergeant — "Squad Lorenzo"): the display-ordered first member is the
 * sergeant when one exists, so his first name becomes the row title. The
 * mission's own squad key stays as the grouping identity (`squad`).
 */
export function groupBySquad(entries: RosterEntry[]): { squad: string; title: string; members: RosterEntry[] }[] {
  const rows: { squad: string; title: string; members: RosterEntry[] }[] = [];
  for (const e of entries) {
    let row = rows.find(r => r.squad === e.squad);
    if (!row) { row = { squad: e.squad, title: '', members: [] }; rows.push(row); }
    row.members.push(e);
  }
  for (const row of rows) {
    row.members = displayOrder(row.members);
    row.title = `Squad ${row.members[0].name.replace(/^(Sgt|Bro)\. /, '')}`;
  }
  return rows;
}

/** The ten digit keys in keyboard order — squad one gets 1-5, squad two 6-0. */
export const HOTKEY_LABELS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'] as const;

/**
 * Assign selection hotkeys by DISPLAYED position: the first squad row's
 * members (sergeant, specials, bolters — the card order) get 1-5, the second
 * row's get 6-0. Squad two always starts at 6 even when squad one is short;
 * a sixth-plus member or a third squad gets no key. Computed ONCE from the
 * scene-start roster, so numbers never reshuffle as marines die — a dead
 * marine's key simply goes inert (selectFromRoster's alive guard).
 */
export function assignHotkeys(entries: RosterEntry[]): Map<string, string> {
  const map = new Map<string, string>();
  groupBySquad(entries).slice(0, 2).forEach((row, squadIdx) => {
    row.members.slice(0, 5).forEach((m, i) => {
      map.set(m.id, HOTKEY_LABELS[squadIdx * 5 + i]);
    });
  });
  return map;
}
