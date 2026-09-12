/**
 * The balance instrument. Plays autopilot games over a seed range and prints
 * win rates with 95% Wilson score intervals, so two policies (or two tunings)
 * can be compared on the same seeds instead of on impressions.
 *
 *   bun packages/engine/scripts/scan.ts --missions space_hulk_1,space_hulk_2 \
 *     --seeds 60 --policy both --cycles 60 --tuning regen.marine:3
 */
import { fileURLToPath } from 'node:url';
import {
  GameEngine, loadMission, SeededRng, PieceEvents, autoplay,
  missions, TUNING, applyTuning, parseTuning,
} from '../src/index.js';

type Policy = 'orders' | 'squads';
type MissionName = keyof typeof missions;
const USAGE = `usage: bun scripts/scan.ts [--missions a,b,c] [--seeds N|A-B] [--policy orders|squads|both]
                          [--cycles N] [--tuning k:v,...] [--help]
defaults: missions space_hulk_1,space_hulk_2, seeds 60 (meaning 1..60), policy both, cycles 60
missions: ${Object.keys(missions).join(', ')}`;

/** Wilson score interval for wins/n, as fractions in [0, 1]. */
export function wilson(wins: number, n: number, z = 1.96): { lo: number; hi: number } {
  if (n <= 0) return { lo: 0, hi: 0 };
  const p = wins / n;
  const z2 = z * z;
  const denom = 1 + z2 / n;
  const centre = p + z2 / (2 * n);
  const margin = z * Math.sqrt((p * (1 - p)) / n + z2 / (4 * n * n));
  return { lo: Math.max(0, (centre - margin) / denom), hi: Math.min(1, (centre + margin) / denom) };
}

type Game = { result: string; cycle: number; marines: number; ticks: number; hash: string };

/** One autopilot game from one seed. The event bus is global, so clear it first. */
function playOne(mission: MissionName, seed: number, cycles: number, policy: Policy): Game {
  PieceEvents.all.clear();
  const engine = new GameEngine(loadMission(mission), [], new SeededRng(seed));
  autoplay(engine, cycles, policy);
  return {
    result: engine.state.result, cycle: engine.cycle, marines: engine.marines.length,
    ticks: engine.tickCount, hash: engine.stateHash(),
  };
}

type Row = {
  mission: MissionName; policy: Policy; n: number; w: number; l: number; d: number; o: number;
  meanCycle: number; meanMarines: number; det: boolean; winners: number[];
};

function scanRow(mission: MissionName, policy: Policy, seeds: number[], cycles: number): Row {
  const row: Row = { mission, policy, n: seeds.length, w: 0, l: 0, d: 0, o: 0, meanCycle: 0, meanMarines: 0, det: true, winners: [] };
  let cycleSum = 0, marineSum = 0;
  for (const seed of seeds) {
    const g = playOne(mission, seed, cycles, policy);
    if (g.result === 'win') { row.w++; row.winners.push(seed); }
    else if (g.result === 'loss') row.l++;
    else if (g.result === 'draw') row.d++;
    else row.o++;
    cycleSum += g.cycle;
    marineSum += g.marines;
  }
  if (seeds.length > 0) {
    row.meanCycle = cycleSum / seeds.length;
    row.meanMarines = marineSum / seeds.length;
    // Determinism probe: the first seed replayed twice must agree on the final
    // state hash and the final tick count.
    const a = playOne(mission, seeds[0], cycles, policy);
    const b = playOne(mission, seeds[0], cycles, policy);
    row.det = a.hash === b.hash && a.ticks === b.ticks;
  }
  return row;
}

const pct = (x: number) => (x * 100).toFixed(1);
/** Column widths, shared by the header and every row. */
const COLS = [14, 7, 4, 4, 4, 3, 3, 22, 7, 8, 4];
function line(cells: (string | number)[]): string {
  return cells.map((c, i) => (i < 2 ? String(c).padEnd(COLS[i]) : String(c).padStart(COLS[i]))).join(' ');
}

function formatRow(r: Row): string {
  const { lo, hi } = wilson(r.w, r.n);
  const rate = `${pct(r.w / Math.max(1, r.n))} [${pct(lo)}, ${pct(hi)}]`;
  return line([r.mission, r.policy, r.n, r.w, r.l, r.d, r.o, rate,
    r.meanCycle.toFixed(1), r.meanMarines.toFixed(2), r.det ? 'yes' : 'no'])
    + '  ' + (r.winners.length > 0 ? r.winners.join(',') : '-');
}

function fail(message: string): never {
  console.error(`${message}\n${USAGE}`);
  process.exit(2);
}

function parseSeeds(raw: string): { seeds: number[]; label: string } {
  const range = raw.match(/^(\d+)-(\d+)$/);
  const from = range ? Number(range[1]) : 1;
  const to = range ? Number(range[2]) : Number(raw);
  if (!Number.isInteger(from) || !Number.isInteger(to) || from < 1 || to < from) fail(`bad --seeds: ${raw}`);
  return { seeds: Array.from({ length: to - from + 1 }, (_, i) => from + i), label: `${from}-${to}` };
}

const KNOWN = ['missions', 'seeds', 'policy', 'cycles', 'tuning'];

function parseArgs(argv: string[]) {
  const flags = new Map<string, string>();
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--help' || arg === '-h') { console.log(USAGE); process.exit(0); }
    if (!arg.startsWith('--')) fail(`unexpected argument: ${arg}`);
    const key = arg.slice(2);
    if (!KNOWN.includes(key)) fail(`unknown flag: ${arg}`);
    const value = argv[++i];
    if (value === undefined) fail(`flag ${arg} needs a value`);
    flags.set(key, value);
  }

  const names = (flags.get('missions') ?? 'space_hulk_1,space_hulk_2').split(',').map(s => s.trim()).filter(Boolean);
  if (names.length === 0) fail('--missions is empty');
  for (const name of names) if (!(name in missions)) fail(`unknown mission: ${name}`);
  const { seeds, label } = parseSeeds(flags.get('seeds') ?? '60');
  const policy = flags.get('policy') ?? 'both';
  if (!['orders', 'squads', 'both'].includes(policy)) fail(`unknown policy: ${policy}`);
  const cycles = Number(flags.get('cycles') ?? '60');
  if (!Number.isInteger(cycles) || cycles < 1) fail(`bad --cycles: ${flags.get('cycles')}`);
  const tuning = flags.get('tuning') ?? '';
  if (tuning) try { applyTuning(parseTuning(tuning)) } catch (err) { fail(`bad --tuning: ${(err as Error).message}`) }
  return {
    missionNames: names as MissionName[], seeds, cycles, seedLabel: label, tuning,
    policies: (policy === 'both' ? ['orders', 'squads'] : [policy]) as Policy[],
  };
}

function main(argv: string[]): void {
  const o = parseArgs(argv);
  console.log(`scan ${new Date().toISOString().slice(0, 10)}  seeds ${o.seedLabel} (${o.seeds.length})  cycles ${o.cycles}  tuning ${o.tuning || '(default)'}  cycleTicks ${TUNING.cycleTicks}  regen.marine ${TUNING.regen.marine}`);
  console.log(line(['mission', 'policy', 'N', 'W', 'L', 'D', 'O', 'rate [lo, hi] %', 'cycle', 'marines', 'det']) + '  winners');

  const rows: Row[] = [];
  for (const mission of o.missionNames) {
    for (const policy of o.policies) {
      const row = scanRow(mission, policy, o.seeds, o.cycles);
      rows.push(row);
      console.log(formatRow(row));
    }
  }

  if (o.policies.length < 2) return;
  for (const mission of o.missionNames) {
    const find = (p: Policy) => rows.find(r => r.mission === mission && r.policy === p);
    const squads = find('squads'), orders = find('orders');
    if (!squads || !orders || squads.n === 0) continue;
    const delta = (squads.w - orders.w) / squads.n;
    console.log(`delta ${mission}: squads ${pct(squads.w / squads.n)} minus orders ${pct(orders.w / orders.n)} = ${delta >= 0 ? '+' : ''}${pct(delta)} points`);
  }
}

// Run only when invoked as the script, so a test can import wilson() safely.
if (process.argv[1] === fileURLToPath(import.meta.url)) main(process.argv.slice(2));
