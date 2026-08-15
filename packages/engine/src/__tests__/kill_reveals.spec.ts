import { it, expect, describe } from 'vitest';
import { GameEngine } from '../GameEngine.js';
import { Blip } from '../pieces/Blip.js';
import { Genestealer } from '../pieces/Genestealer.js';
import { RollQueue, SeededRng } from '../core/Dice.js';
import { PieceEvents } from '../events/PieceEvents.js';
import { closeCombat } from '../rules/combat.js';
import { Dir } from '../core/Direction.js';
import { loadMission } from '../missions/missionLoader.js';
import { autoplay } from '../ai/MarineAutopilot.js';
import { squareSeenByMarine } from '../ai/StealerAI.js';
import type { CompiledMission } from '../missions/missionTypes.js';

/**
 * Sulk rule follow-up (user report 2026-08-15): a death VACATES a square,
 * which can open sight lines — killing the stealer standing in front of a
 * blip must flip that blip immediately, whatever caused the death.
 */
const mission = (marineY: number) => ({
  name: 'kill-reveal-test', width: 9, height: 12,
  marineDeployment: [{ x: 4, y: marineY, facing: 'up' }],
  initialBlips: 0, entryPoints: [], objective: 'exterminate',
} as unknown as CompiledMission);

describe('deaths that open sight lines convert the revealed blips', () => {
  it('a storm-bolter kill reveals the blip behind the target — instant convert', () => {
    const engine = new GameEngine(mission(8));
    const board = engine.state.board;
    board.dice = new RollQueue([6, 1, 1, 1, 1, 1]);

    const stealer = new Genestealer(board, { c: 4, r: 6 }, Dir.S);
    const blip = new Blip(board, { c: 4, r: 4 }, 2); // hidden behind the stealer
    expect(blip.alive).toBe(true);

    const marine = engine.marines[0];
    // Negative guard (advisor 2026-08-15): a marine action that does NOT open
    // the sight line runs the sweep but must not over-convert the hidden blip.
    expect(marine.tryTurn(-1)).toBe(true);
    expect(marine.tryTurn(1)).toBe(true); // back to facing N — 2 AP spent
    expect(blip.alive).toBe(true); // still hidden behind the stealer

    expect(marine.shoot(stealer)).toBe(true); // 6 kills
    expect(stealer.alive).toBe(false);

    expect(blip.alive).toBe(false); // square vacated → seen → converted
    expect(board.pieces.filter(p => (p as any).kind === 'stealer')).toHaveLength(2); // value 2
  });

  it('a close-combat kill reveals the blip behind the loser — instant convert', () => {
    const engine = new GameEngine(mission(8));
    const board = engine.state.board;
    // marine 1d6 first, then stealer 3d6 (facing its attacker)
    board.dice = new RollQueue([6, 1, 1, 1, 1, 1]);

    const stealer = new Genestealer(board, { c: 4, r: 7 }, Dir.S); // directly ahead
    const blip = new Blip(board, { c: 4, r: 5 }, 1);
    expect(blip.alive).toBe(true);

    const marine = engine.marines[0];
    const result = closeCombat(marine, stealer);
    expect(result?.outcome).toBe('attacker');
    expect(stealer.alive).toBe(false);

    expect(blip.alive).toBe(false);
  });

  it('an overwatch kill INSIDE the captured stealer phase converts the revealed blip', () => {
    // capture() suppresses event handlers, so this path relies on the
    // engine-internal sight re-check in runStealerActions, not on pieceDied.
    const engine = new GameEngine(mission(8));
    const board = engine.state.board;
    // overwatch shot [6,1] (no double → no jam), then end-of-turn CP roll
    board.dice = new RollQueue([6, 1, 3, 1, 1, 1, 1, 1]);

    const stealer = new Genestealer(board, { c: 4, r: 4 }, Dir.S);
    const blip = new Blip(board, { c: 4, r: 2 }, 1); // hidden behind the stealer
    const marine = engine.marines[0];
    expect(marine.overwatchOn()).toBe(true);

    const events = PieceEvents.capture(() => engine.endMarinePhase());

    expect(stealer.alive).toBe(false); // overwatch killed it on its first step
    expect(blip.alive).toBe(false);    // reveal converted it despite capture
    expect(events.some(e => e.type === 'blipConverted')).toBe(true);
    expect(board.pieces.some(p => (p as any).kind === 'stealer')).toBe(true); // spawned
  });

  it('INVARIANT: no blip is ever inside marine sight at a marine-phase boundary (seeds 1-10)', () => {
    // Advisor 2026-08-15: trigger lists ("convert on move/door/death") are
    // always incomplete — prove the underlying invariant empirically instead.
    // At every settled phase boundary of full autoplayed games, every
    // surviving blip must be unseen; a seen one means a conversion trigger
    // was missed somewhere in the preceding phase.
    const violations: string[] = [];
    for (let seed = 1; seed <= 10; seed++) {
      const engine = new GameEngine(loadMission('space_hulk_1'), [], new SeededRng(seed));
      const check = ({ phase, turn }: { phase: string; turn: number }) => {
        if (phase !== 'MarineAction') return;
        for (const p of engine.state.board.pieces) {
          if ((p as any).kind === 'blip' && squareSeenByMarine(engine.state.board, p.pos)) {
            violations.push(`seed ${seed} turn ${turn}: visible blip at (${p.pos.c},${p.pos.r})`);
          }
        }
      };
      PieceEvents.on('phaseChanged', check);
      autoplay(engine, 60);
      PieceEvents.off('phaseChanged', check);
    }
    expect(violations).toEqual([]);
  }, 60000);

  it('a REPLAYED pieceDied never re-triggers conversion against the final board', () => {
    const engine = new GameEngine(mission(4));
    const board = engine.state.board;
    board.dice = new RollQueue([1, 1, 1, 1, 1, 1]);

    // Visible square, but created without any triggering event
    const blip = new Blip(board, { c: 4, r: 2 }, 1);
    expect(blip.alive).toBe(true);

    PieceEvents.replay({ type: 'pieceDied', payload: { pieceId: 'ghost', kind: 'stealer', x: 4, y: 3 } });
    expect(blip.alive).toBe(true); // replay = past state, no rule application

    PieceEvents.emit('pieceDied', { pieceId: 'ghost', kind: 'stealer', x: 4, y: 3 }); // live
    expect(blip.alive).toBe(false);
  });
});
