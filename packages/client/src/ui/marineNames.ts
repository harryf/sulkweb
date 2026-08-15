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

/**
 * Zip the engine's marines (deployment order — pieces are inserted in
 * marineDeployment order) with the mission deployment metadata, BY ID, at
 * scene start. Later deaths shrink `engine.marines` but never shift these.
 */
export function buildRoster(engine: GameEngine, mission: CompiledMission): RosterEntry[] {
  const deploy = mission.marineDeployment ?? [];
  const off = nameOffset(mission.name);
  return engine.marines.map((m, i) => {
    const type: MarineType = (deploy[i]?.type ?? 'storm_bolter') as MarineType;
    const first = NAME_POOL[(off + i) % NAME_POOL.length];
    return {
      id: m.id,
      name: `${isSergeant(type) ? 'Sgt.' : 'Bro.'} ${first}`,
      squad: deploy[i]?.squad ?? 'Squad',
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

/** Group by squad, preserving first-appearance order. */
export function groupBySquad(entries: RosterEntry[]): { squad: string; members: RosterEntry[] }[] {
  const rows: { squad: string; members: RosterEntry[] }[] = [];
  for (const e of entries) {
    let row = rows.find(r => r.squad === e.squad);
    if (!row) { row = { squad: e.squad, members: [] }; rows.push(row); }
    row.members.push(e);
  }
  for (const row of rows) row.members = displayOrder(row.members);
  return rows;
}
