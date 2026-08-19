import { describe, it, expect } from 'vitest';
import { GameEngine } from '../GameEngine.js';
import { loadMission } from '../missions/missionLoader.js';
import { Dir, FACING_WORD } from '../core/Direction.js';
import { SeededRng } from '../core/Dice.js';
import {
  DEPLOY_SECONDS_PER_SQUAD, deploySeconds, deploySquadCount,
  orderSquaresFrontToBack, autoDeployOrder,
} from '../rules/deploy.js';
import type { DeploySquareJSON, MarineType } from '../missions/missionTypes.js';

/** Two-squad fixture mirroring Decoy's geometry in miniature: Abraham walks
 *  right along a row, Harken walks left along another. */
const twoSquadMission = () => ({
  name: 'deploy-fixture',
  width: 12, height: 8,
  squares: Array.from({ length: 8 }, (_, r) =>
    Array.from({ length: 12 }, (_, c) => ({ x: c, y: r, kind: 'corridor' as const }))).flat(),
  marineDeployment: [
    { x: 0, y: 1, facing: 'right', type: 'heavy_flamer', squad: 'Abraham' },
    { x: 1, y: 1, facing: 'right', type: 'sergeant', squad: 'Abraham' },
    { x: 2, y: 1, facing: 'right', squad: 'Abraham' },
    { x: 9, y: 6, facing: 'left', type: 'sergeant', squad: 'Harken' },
    { x: 10, y: 6, facing: 'left', squad: 'Harken' },
    { x: 11, y: 6, facing: 'left', type: 'heavy_flamer', squad: 'Harken' },
  ] as DeploySquareJSON[],
  objective: 'exterminate' as const,
});

describe('deploy helpers (ISC-796/797)', () => {
  it('orders squares front to back along their own facing — left-facing squads reverse (ISC-796)', () => {
    const right: DeploySquareJSON[] = [
      { x: 10, y: 10, facing: 'right' }, { x: 12, y: 10, facing: 'right' }, { x: 11, y: 10, facing: 'right' }];
    expect(orderSquaresFrontToBack(right).map(s => s.x)).toEqual([12, 11, 10]);
    const left: DeploySquareJSON[] = [
      { x: 25, y: 13, facing: 'left' }, { x: 23, y: 13, facing: 'left' }, { x: 24, y: 13, facing: 'left' }];
    expect(orderSquaresFrontToBack(left).map(s => s.x)).toEqual([23, 24, 25]);
    const down: DeploySquareJSON[] = [
      { x: 10, y: 0 }, { x: 10, y: 4 }, { x: 10, y: 2 }]; // JSON default facing is down
    expect(orderSquaresFrontToBack(down).map(s => s.y)).toEqual([4, 2, 0]);
  });

  it('battle order: bolter point, sergeant second, heavy third, rest behind (ISC-797)', () => {
    const types: MarineType[] = ['heavy_flamer', 'sergeant', 'storm_bolter', 'storm_bolter', 'storm_bolter'];
    expect(autoDeployOrder(types)).toEqual([2, 1, 0, 3, 4]);
    // Missing roles skip without holes; sword sergeants count as sergeants.
    expect(autoDeployOrder(['sergeant_sword', 'chain_fist'])).toEqual([0, 1]);
    expect(autoDeployOrder(['storm_bolter', 'storm_bolter'])).toEqual([0, 1]);
    expect(autoDeployOrder([])).toEqual([]);
  });

  it('clock is 90 seconds per squad', () => {
    expect(DEPLOY_SECONDS_PER_SQUAD).toBe(90);
    expect(deploySquadCount(loadMission('space_hulk_1'))).toBe(1);
    expect(deploySeconds(loadMission('space_hulk_1'))).toBe(90);
    expect(deploySeconds(loadMission('space_hulk_5'))).toBe(180);
  });
});

describe('GameEngine deployment phase (ISC-798..811)', () => {
  it('beginDeployment lifts the whole squad into reserve, locks the board, enters Deploy (ISC-798)', () => {
    const e = new GameEngine(loadMission('space_hulk_1'));
    const ids = e.marines.map(m => m.id);
    expect(e.beginDeployment()).toBe(true);
    expect(e.phase).toBe('Deploy');
    expect(e.marines).toHaveLength(0);
    expect(e.reserve.map(m => m.id)).toEqual(ids); // deployment order kept
    expect(e.state.board.locked).toBe(true);
  });

  it('Anti: refuses re-entry, post-turn-1 entry, and single-square missions (ISC-799)', () => {
    const e = new GameEngine(loadMission('space_hulk_1'));
    expect(e.beginDeployment()).toBe(true);
    expect(e.beginDeployment()).toBe(false); // already deploying
    // endMarinePhase runs the whole turn synchronously and lands back at
    // MarineAction with turnNumber 2 — so THIS refusal is the turn guard,
    // not the phase guard (asserted explicitly to keep it that way).
    const live = new GameEngine(loadMission('space_hulk_1'), [], new SeededRng(1));
    live.endMarinePhase();
    expect(live.phase).toBe('MarineAction');
    expect(live.turnNumber).toBe(2);
    expect(live.beginDeployment()).toBe(false);
    const debug = new GameEngine(loadMission('debug_1')); // one deploy square
    expect(debug.beginDeployment()).toBe(false);
  });

  it('deployMarine places on a free squad square at the mission facing (ISC-800)', () => {
    const e = new GameEngine(twoSquadMission() as any);
    e.beginDeployment();
    const abraham = e.reserve.find(m => e.deploySquadOf(m.id) === 'Abraham')!;
    expect(e.deployMarine(abraham.id, 2, 1)).toBe(true);
    expect(abraham.pos).toEqual({ c: 2, r: 1 });
    expect(abraham.facing).toBe(Dir.E);
    expect(e.marines).toHaveLength(1);
    expect(e.reserve).not.toContain(abraham);
  });

  it('Anti: refuses non-deploy squares, occupied squares, deployed marines, wrong phase (ISC-801)', () => {
    const e = new GameEngine(twoSquadMission() as any);
    e.beginDeployment();
    const [a, b] = e.reserve.filter(m => e.deploySquadOf(m.id) === 'Abraham');
    expect(e.deployMarine(a.id, 5, 5)).toBe(false);   // not a deploy square
    expect(e.deployMarine(a.id, 0, 1)).toBe(true);
    expect(e.deployMarine(b.id, 0, 1)).toBe(false);   // occupied
    expect(e.deployMarine(a.id, 1, 1)).toBe(false);   // already deployed
    const live = new GameEngine(twoSquadMission() as any);
    expect(live.deployMarine(live.marines[0].id, 0, 1)).toBe(false); // not deploying
  });

  it('Anti: a marine cannot take another squad\'s square (ISC-802)', () => {
    const e = new GameEngine(twoSquadMission() as any);
    e.beginDeployment();
    const abraham = e.reserve.find(m => e.deploySquadOf(m.id) === 'Abraham')!;
    expect(e.deployMarine(abraham.id, 9, 6)).toBe(false); // Harken territory
    expect(e.marines).toHaveLength(0);
  });

  it('undeployMarine returns him to reserve and frees the square (ISC-803)', () => {
    const e = new GameEngine(twoSquadMission() as any);
    e.beginDeployment();
    const a = e.reserve[0];
    e.deployMarine(a.id, 0, 1);
    expect(e.undeployMarine(a.id)).toBe(true);
    expect(e.marines).toHaveLength(0);
    expect(e.reserve).toContain(a);
    expect(e.state.board.isOccupied({ c: 0, r: 1 })).toBe(false);
    expect(e.undeployMarine(a.id)).toBe(false); // already in reserve
  });

  it('turnDeployed rotates free of AP and emits a facing-only pieceMoved (ISC-804)', () => {
    const e = new GameEngine(twoSquadMission() as any);
    e.beginDeployment();
    const a = e.reserve[0];
    e.deployMarine(a.id, 0, 1);
    const apBefore = a.ap;
    expect(e.turnDeployed(a.id, 1)).toBe(true);
    expect(a.facing).toBe(Dir.S); // E + 1 clockwise
    expect(e.turnDeployed(a.id, -1)).toBe(true);
    expect(a.facing).toBe(Dir.E);
    expect(a.ap).toBe(apBefore);
    expect(e.turnDeployed(e.reserve[0].id, 1)).toBe(false); // reserve marines don't rotate
  });

  it('Anti: normal piece actions are dead during Deploy — the board is locked (ISC-805)', () => {
    const e = new GameEngine(twoSquadMission() as any);
    e.beginDeployment();
    const a = e.reserve[2]; // Abraham's storm bolter — the full verb surface
    e.deployMarine(a.id, 0, 1);
    expect(a.tryMove(1, 0)).toBe(false);
    expect(a.tryTurn(1)).toBe(false);
    expect(e.spendCP(a)).toBe(false);
    // The lock covers the quieter verbs too: overwatch, unjam, doors
    // (reviewer finding — these lacked the locked check the movers had).
    expect((a as any).overwatchOn()).toBe(false);
    expect((a as any).unjam()).toBe(false);
    expect(a.useDoor()).toBe(false);
    expect(a.ap).toBe(a.apInitial); // nothing above spent a point
    e.endMarinePhase(); // no-op in Deploy
    expect(e.phase).toBe('Deploy');
    expect(e.turnNumber).toBe(1);
  });

  it('a stray piece squatting a deploy square never strands a marine (reviewer F3)', async () => {
    const { Genestealer } = await import('../pieces/Genestealer.js');
    const e = new GameEngine(twoSquadMission() as any);
    // A stealer parks on one of Abraham's three squares BEFORE deployment.
    new Genestealer(e.state.board, { c: 1, r: 1 }, 0);
    e.beginDeployment();
    e.finishDeployment();
    expect(e.phase).toBe('MarineAction');
    expect(e.reserve).toHaveLength(0); // nobody left in limbo
    expect(e.marines).toHaveLength(6); // all six landed somewhere
    // The displaced marine took the nearest free passable square instead.
    const squares = new Set(e.marines.map(m => `${m.pos.c},${m.pos.r}`));
    expect(squares.size).toBe(6);
  });

  it('autoDeploy fills only free squares per squad; player placements untouched (ISC-806)', () => {
    const e = new GameEngine(twoSquadMission() as any);
    e.beginDeployment();
    // Player insists the flamer takes Abraham's point square (x=2, front for right-facing).
    const flamer = e.reserve.find(m =>
      e.deploySquadOf(m.id) === 'Abraham' && m.spriteKey === 'terminator_heavy_flamer')!;
    e.deployMarine(flamer.id, 2, 1);
    e.autoDeploy();
    expect(e.reserve).toHaveLength(0);
    expect(e.marines).toHaveLength(6);
    expect(flamer.pos).toEqual({ c: 2, r: 1 }); // never moved
    const at = (x: number, y: number) => e.state.board.pieceAt({ c: x, r: y }) as any;
    // Abraham's remaining squares fill around the manual placement, still in
    // battle order: bolter takes the best free square (x=1), sergeant behind.
    expect(at(1, 1).spriteKey).toBe('terminator_storm_bolter');
    expect(at(0, 1).spriteKey).toBe('terminator_sergeant');
    // Harken auto-order, front (x=9, left-facing) to back: bolter, sergeant, flamer.
    expect(at(9, 6).spriteKey).toBe('terminator_storm_bolter');
    expect(at(10, 6).spriteKey).toBe('terminator_sergeant');
    expect(at(11, 6).spriteKey).toBe('terminator_heavy_flamer');
  });

  it('scattered mixed-facing squads (Exterminate) fill completely, one marine per squad square', () => {
    // space_hulk_2's squad Constantine deploys one-per-room with right AND
    // down facings mixed — the hardest geometry for front-to-back ordering.
    // The pin: the phase always terminates with every square correctly held.
    const e = new GameEngine(loadMission('space_hulk_2'));
    e.beginDeployment();
    e.finishDeployment();
    expect(e.reserve).toHaveLength(0);
    expect(e.marines).toHaveLength(5);
    for (const d of e.mission.marineDeployment ?? []) {
      const p = e.state.board.pieceAt({ c: d.x, r: d.y }) as any;
      expect(p?.kind).toBe('marine');
      expect(p.facing).toBe(FACING_WORD[d.facing ?? 'down']); // mission default facing
    }
  });

  it('interleaved two-squad grids (Defend) respect squad squares; flamerAmmo survives reserve', () => {
    const e = new GameEngine(loadMission('space_hulk_6'));
    e.beginDeployment();
    e.finishDeployment();
    expect(e.reserve).toHaveLength(0);
    expect(e.marines).toHaveLength(10);
    // Every marine stands on a square tagged with HIS squad (Luther/Snow interleave).
    for (const m of e.marines) {
      const sq = e.deploySquareAt(m.pos.c, m.pos.r);
      expect(sq?.squad).toBe(e.deploySquadOf(m.id));
    }
    // The mission 6 post-deploy ammo override was applied at construction and
    // marines keep object identity through reserve — 4 shots, not 6.
    const flamers = e.marines.filter(m => m.spriteKey === 'terminator_heavy_flamer') as any[];
    expect(flamers.length).toBeGreaterThan(0);
    for (const f of flamers) expect(f.ammo).toBe(4);
  });

  it('finishDeployment deploys the rest, unlocks, and opens the marine phase (ISC-807)', () => {
    const e = new GameEngine(loadMission('space_hulk_1'));
    e.beginDeployment();
    e.finishDeployment();
    expect(e.phase).toBe('MarineAction');
    expect(e.state.board.locked).toBe(false);
    expect(e.marines).toHaveLength(5);
    expect(e.reserve).toHaveLength(0);
    expect(e.marines.every(m => m.ap === m.apInitial)).toBe(true);
    // The mission is live again: moves work (open fixture — no door in the way).
    const live = new GameEngine(twoSquadMission() as any);
    live.beginDeployment();
    live.finishDeployment();
    const front = live.state.board.pieceAt({ c: 2, r: 1 }) as any;
    expect(front.tryMove(1, 0)).toBe(true);
  });

  it('Suicide auto-deploy: bolter on point, sergeant behind, flamer third (ISC-808)', () => {
    const e = new GameEngine(loadMission('space_hulk_1'));
    e.beginDeployment();
    e.finishDeployment();
    // Squad Calvin walks DOWN column 10 — front is y=4.
    const at = (y: number) => (e.state.board.pieceAt({ c: 10, r: y }) as any).spriteKey;
    expect(at(4)).toBe('terminator_storm_bolter');
    expect(at(3)).toBe('terminator_sergeant');
    expect(at(2)).toBe('terminator_heavy_flamer');
    expect(at(1)).toBe('terminator_storm_bolter');
    expect(at(0)).toBe('terminator_storm_bolter');
  });

  it('Anti: checkVictory is inert during Deploy — an empty board is not a wipe (ISC-809)', () => {
    const e = new GameEngine(loadMission('space_hulk_1'));
    e.beginDeployment();
    e.checkVictory();
    expect(e.state.result).toBe('ongoing');
    e.finishDeployment();
    expect(e.state.result).toBe('ongoing');
  });

  it('Anti: deploy-phase facing changes never convert blips (ISC-810)', () => {
    const mission = { ...twoSquadMission(), entryPoints: [{ x: 11, y: 1 }], initialBlips: 1 } as any;
    const e = new GameEngine(mission);
    e.beginDeployment();
    const a = e.reserve.find(m => e.deploySquadOf(m.id) === 'Abraham')!;
    e.deployMarine(a.id, 2, 1); // facing E, open row toward the entry
    const blipsBefore = e.stealerSide.filter(p => p.kind === 'blip').length;
    expect(blipsBefore).toBe(1);
    e.turnDeployed(a.id, 1);
    e.turnDeployed(a.id, -1); // back to E, staring straight at the blip
    expect(e.stealerSide.filter(p => p.kind === 'blip').length).toBe(blipsBefore); // still hidden
  });

  it('deployment consumes no dice: same seed, rearranged squad, identical CP (ISC-811)', () => {
    const control = new GameEngine(loadMission('space_hulk_1'), [], new SeededRng(42));
    const deployed = new GameEngine(loadMission('space_hulk_1'), [], new SeededRng(42));
    deployed.beginDeployment();
    const a = deployed.reserve[0];
    deployed.deployMarine(a.id, 10, 2);
    deployed.turnDeployed(a.id, 1);
    deployed.undeployMarine(a.id);
    deployed.finishDeployment();
    expect(deployed.cp).toBe(control.cp);
    // Blip values drawn at construction match square for square.
    const blipVals = (e: GameEngine) => e.stealerSide.map(p => `${p.pos.c},${p.pos.r}:${(p as any).value ?? '?'}`).sort();
    expect(blipVals(deployed)).toEqual(blipVals(control));
  });

  it('deploy squares carry the mission default facing on placement (ISC-800 companion)', () => {
    const e = new GameEngine(loadMission('space_hulk_5'));
    e.beginDeployment();
    const abraham = e.reserve.find(m => e.deploySquadOf(m.id) === 'Abraham')!;
    expect(e.deployMarine(abraham.id, 12, 10)).toBe(true);
    expect(abraham.facing).toBe(FACING_WORD.right); // Decoy walks the corridor east
  });
});
