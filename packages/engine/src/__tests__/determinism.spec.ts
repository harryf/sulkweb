import { describe, it, expect } from 'vitest';
import { GameEngine } from '../GameEngine.js';
import { SeededRng } from '../core/Dice.js';
import { PieceEvents } from '../events/PieceEvents.js';
import { loadMission } from '../missions/missionLoader.js';
import type { MarineCommand } from '../core/Commands.js';

/**
 * The replay unit is (tick, marineId, command). Two engines built from one
 * seed and fed one command log must agree on the state hash at every tick.
 */
const script: { tick: number; marine: number; cmd: MarineCommand }[] = [
  { tick: 0, marine: 0, cmd: { type: 'overwatch', on: true } },
  { tick: 0, marine: 1, cmd: { type: 'move', dir: 'forward' } },
  { tick: 5, marine: 1, cmd: { type: 'turn', delta: 1 } },
  { tick: 12, marine: 2, cmd: { type: 'move', dir: 'forward' } },
  { tick: 30, marine: 3, cmd: { type: 'overwatch', on: true } },
  { tick: 41, marine: 4, cmd: { type: 'move', dir: 'forward' } },
  { tick: 90, marine: 1, cmd: { type: 'move', dir: 'backward' } },
];

function play(seed: number, ticks: number): string[] {
  PieceEvents.all.clear();
  const engine = new GameEngine(loadMission('space_hulk_1'), [], new SeededRng(seed));
  const ids = engine.marines.map(m => m.id);
  const hashes: string[] = [];
  for (let t = 0; t < ticks && engine.state.result === 'ongoing'; t++) {
    for (const s of script) if (s.tick === t) engine.command(ids[s.marine], s.cmd);
    engine.tick();
    hashes.push(engine.stateHash());
  }
  return hashes;
}

describe('determinism: seed plus command log replays tick for tick', () => {
  it('same seed, same log: identical state hash at every tick for 200 ticks', () => {
    const a = play(11, 200);
    const b = play(11, 200);
    expect(a.length).toBeGreaterThan(0);
    expect(a).toEqual(b);
  });

  it('a different seed diverges (the probe is not blind)', () => {
    const a = play(11, 120);
    const c = play(12, 120);
    expect(a).not.toEqual(c);
  });
});
