import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Determinism lint (docs/realtime-plan.md): the engine reads no clock. Any
 * `Date` or `performance` under packages/engine/src outside the tests and
 * the game logger (whose timestamps are file metadata with an injectable
 * `now`) is a bug. The same walk keeps the retired 1.x names out.
 */
const SRC = join(fileURLToPath(new URL('.', import.meta.url)), '..');

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) {
      if (name === '__tests__' || name === 'drafts') continue;
      out.push(...walk(p));
    } else if (p.endsWith('.ts') && !p.endsWith('.d.ts')) {
      out.push(p);
    }
  }
  return out;
}

const offenders = (re: RegExp, skip: string[] = []) =>
  walk(SRC)
    .filter(f => !skip.includes(relative(SRC, f)))
    .flatMap(f => readFileSync(f, 'utf8').split('\n')
      .map((line, i) => (re.test(line) ? `${relative(SRC, f)}:${i + 1}: ${line.trim()}` : null))
      .filter((x): x is string => x !== null));

describe('engine source lint', () => {
  it('reads no clock: no Date or performance outside log/GameLogger.ts', () => {
    expect(offenders(/\bDate\b|\bperformance\./, ['log/GameLogger.ts'])).toEqual([]);
  });

  it('carries no 1.x phase or clock names', () => {
    expect(offenders(/\bMarineAction\b|\bStealerAction\b|marinePhaseSeconds|timerBonus|MARINE_PHASE_SECONDS|\bendMarinePhase\b|\brunStealerActions\b/)).toEqual([]);
  });

  it('imports nothing from the browser or Phaser', () => {
    expect(offenders(/from ['"]phaser['"]|\bwindow\.|\bdocument\./)).toEqual([]);
  });
});
