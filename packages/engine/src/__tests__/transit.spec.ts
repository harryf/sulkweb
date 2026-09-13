import { describe, it, expect } from 'vitest';
import { GameEngine } from '../GameEngine.js';
import { SeededRng, RollQueue } from '../core/Dice.js';
import { PieceEvents } from '../events/PieceEvents.js';
import { loadMission } from '../missions/missionLoader.js';
import { TUNING } from '../core/CostTables.js';
import { HeavyFlamerMarine } from '../pieces/HeavyFlamerMarine.js';
import { StormBolterMarine } from '../pieces/StormBolterMarine.js';
import { Genestealer } from '../pieces/Genestealer.js';
import { Dir } from '../core/Direction.js';
import { isPinned, isSteered, postsReached, planDefend } from '../ai/squad.js';
import { runMarineTurn } from '../ai/MarineAutopilot.js';
import { AUTOPILOT } from '../ai/SquadAutopilot.js';
import type { CompiledMission, DeploySquareJSON } from '../missions/missionTypes.js';
import type { MarineOrder, SquadOrder } from '../core/Commands.js';
import type { Piece } from '../pieces/Piece.js';

/**
 * The transit rules (2.x stage 4 step 2, Harry's decisions on the step 1
 * scan): a bolter keeps his overwatch while moving in formation; defend
 * posts in two stages and the order is held until every post is reached; a
 * marine the player orders or steers drops all previous orders; on contact
 * the whole column holds on overwatch facing the threat. The board is
 * space_hulk_1 with the stealer side switched off (see squad.spec).
 */
function quiet(deploy?: DeploySquareJSON[], patch: Partial<CompiledMission> = {}): CompiledMission {
  const m = { ...loadMission('space_hulk_1'), initialBlips: 0, blipsPerTurn: 0, totalBlips: 0, ...patch };
  if (deploy) m.marineDeployment = deploy;
  return m;
}
const inRoom = (): DeploySquareJSON[] => [
  { x: 9, y: 6, facing: 'down', type: 'storm_bolter', squad: 'Calvin' },
  { x: 10, y: 6, facing: 'down', type: 'storm_bolter', squad: 'Calvin' },
  { x: 11, y: 6, facing: 'down', type: 'storm_bolter', squad: 'Calvin' },
  { x: 10, y: 7, facing: 'down', type: 'sergeant', squad: 'Calvin' },
  { x: 11, y: 8, facing: 'down', type: 'heavy_flamer', squad: 'Calvin' },
];
function engineOn(mission: CompiledMission = quiet(inRoom()), dice: SeededRng | RollQueue = new SeededRng(1)): GameEngine {
  PieceEvents.all.clear();
  return new GameEngine(mission, [], dice);
}
const defend = (x: number, y: number): SquadOrder => ({ type: 'defend', x, y });
const advance = (x: number, y: number): SquadOrder => ({ type: 'advance', x, y });
const at = (m: Piece, x: number, y: number) => m.pos.c === x && m.pos.r === y;
const taskOf = (m: Piece) => m.task as MarineOrder | null;
const bolters = (engine: GameEngine) => engine.marines.filter((m): m is StormBolterMarine => m instanceof StormBolterMarine);
const posts = (engine: GameEngine) => engine.squadState('Calvin')!.posts;
const postOf = (engine: GameEngine, m: Piece) => posts(engine).find(p => p.id === m.id);
const atPost = (engine: GameEngine, m: Piece) => { const p = postOf(engine, m); return p !== undefined && at(m, p.c.c, p.c.r); };

describe('transit rule A: overwatch kept while moving in formation', () => {
  it('a bolter on overwatch keeps it through every step and turn of his walk to a defend post', () => {
    const engine = engineOn();
    for (const b of bolters(engine)) expect(b.overwatchOn()).toBe(true);
    engine.command(engine.marines[0].id, { type: 'squadOrder', order: defend(10, 7) });
    let moved = 0;
    for (let t = 0; t < 60; t++) {
      const before = bolters(engine).map(b => `${b.pos.c},${b.pos.r},${b.facing}`);
      engine.tick();
      bolters(engine).forEach((b, i) => {
        if (`${b.pos.c},${b.pos.r},${b.facing}` !== before[i]) { moved += 1; expect(b.overwatch).toBe(true); }
      });
    }
    expect(moved).toBeGreaterThan(3);
  });

  it('the same walk under a player order drops overwatch on the first action', () => {
    const engine = engineOn();
    const m = engine.marines[0] as StormBolterMarine;
    expect(m.overwatchOn()).toBe(true);
    engine.command(m.id, { type: 'order', order: { type: 'moveTo', x: 9, y: 8, then: 'hold' } });
    engine.tick();
    expect(m.overwatch).toBe(false);
  });

  it('a marching overwatcher still reacts: mid-walk his overwatch shot at a stealer in his lane is legal and lands', () => {
    // Hits only: a 6 on each die, so the reaction kills. The trigger itself
    // (StealerAI's reaction chain after a stealer acts) is unchanged code;
    // what is new is that the flag survives the march.
    const engine = engineOn(quiet(inRoom()), new RollQueue(Array.from({ length: 200 }, () => 6)));
    const m = engine.marines[1] as StormBolterMarine; // (10,6), facing S
    expect(m.overwatchOn()).toBe(true);
    engine.state.board.doorsAt({ c: 10, r: 9 }).forEach(d => d.open(true));
    engine.command(m.id, { type: 'squadOrder', order: advance(10, 13) });
    for (let t = 0; t < 20 && m.pos.r === 6; t++) engine.tick(); // he follows the head down the corridor
    expect(m.overwatch).toBe(true);
    expect(m.pos.r).toBeGreaterThan(6); // he has walked
    const s = new Genestealer(engine.state.board, { c: 10, r: m.pos.r + 3 }, Dir.N);
    const shots: string[] = [];
    PieceEvents.on('shot', p => shots.push(p.shooterId));
    expect(m.overwatchShot(s)).toBe(true);
    expect(shots).toContain(m.id);
    expect(s.alive).toBe(false);
  });

  it('Anti: manual control still clears overwatch, and a squad task re-arms a bolter who lost it before he walks on', () => {
    const engine = engineOn();
    const m = engine.marines[0] as StormBolterMarine;
    expect(m.overwatchOn()).toBe(true);
    engine.command(m.id, { type: 'turn', delta: 1 });
    expect(m.overwatch).toBe(false);
    // Off the lease and with a squad task: he arms before stepping.
    engine.runTicks(TUNING.cycleTicks);
    engine.command(engine.marines[3].id, { type: 'squadOrder', order: advance(10, 13) });
    engine.runTicks(3);
    expect(m.overwatch || m.ap < 2).toBe(true);
  });
});

describe('transit rules B and C: staged posting, the order held until every post is reached', () => {
  /** A stealer in sight of the room, put back on his square after every
   *  tick so the hive cannot walk him: contact without a fight. */
  function parkedThreat(engine: GameEngine): () => void {
    engine.state.board.doorsAt({ c: 10, r: 9 }).forEach(d => d.open(true));
    const spot = { c: 10, r: 11 };
    const s = new Genestealer(engine.state.board, spot, Dir.N);
    return () => { s.pos = { ...spot }; engine.state.board.touch(); };
  }

  it('with nothing in sight everyone walks at once: staging is a safety under fire, not a delay', () => {
    const engine = engineOn();
    engine.command(engine.marines[0].id, { type: 'squadOrder', order: defend(10, 7) });
    engine.tick();
    expect(engine.squadState('Calvin')!.stage).toBe('all');
    for (const m of engine.marines) { const t = taskOf(m)!; const p = postOf(engine, m)!; expect(t.type === 'moveTo' && t.x === p.c.c && t.y === p.c.r).toBe(true); }
  });

  it('under contact the plan names a first post; in stage 1 only its member (and anyone in his way) walks, the rest hold their squares', () => {
    const engine = engineOn();
    parkedThreat(engine);
    engine.command(engine.marines[0].id, { type: 'squadOrder', order: defend(10, 7) });
    engine.tick();
    const st = engine.squadState('Calvin')!;
    expect(st.stage).toBe('first');
    expect(st.firstPostId).not.toBeNull();
    for (const m of engine.marines) {
      const t = taskOf(m)!;
      const p = postOf(engine, m)!;
      if (m.id === st.firstPostId) expect(t.type === 'moveTo' && t.x === p.c.c && t.y === p.c.r).toBe(true);
      else if (!at(m, p.c.c, p.c.r)) expect(t.type === 'moveTo' && at(m, t.x, t.y) || (t.type === 'moveTo' && t.x === p.c.c && t.y === p.c.r)).toBe(true);
    }
  });

  it('stage 2 opens once the first post is held: the rest walk to their posts and the order is reached when all are held', () => {
    const engine = engineOn();
    const park = parkedThreat(engine);
    engine.command(engine.marines[0].id, { type: 'squadOrder', order: defend(10, 7) });
    let opened = -1;
    for (let t = 0; t < 120; t++) {
      engine.tick(); park();
      const st = engine.squadState('Calvin')!;
      if (opened < 0 && st.stage === 'all') { opened = engine.tickCount; expect(postsReached(engine, 'Calvin')).toBe(false); }
      if (postsReached(engine, 'Calvin')) break;
    }
    expect(opened).toBeGreaterThan(0);
    expect(postsReached(engine, 'Calvin')).toBe(true);
    for (const m of engine.marines) expect(atPost(engine, m)).toBe(true);
  });

  it('the first post\'s member dying before he arrives re-plans with a new first post', () => {
    const engine = engineOn();
    parkedThreat(engine);
    engine.command(engine.marines[0].id, { type: 'squadOrder', order: defend(10, 7) });
    engine.tick();
    const st = engine.squadState('Calvin')!;
    const first = st.firstPostId!;
    engine.marines.find(m => m.id === first)!.die();
    engine.tick();
    expect(st.firstPostId).not.toBe(first);
    expect(st.firstPostId).not.toBeNull();
  });

  it('the same defend order re-issued keeps the stage; a different one restarts it', () => {
    const engine = engineOn();
    engine.command(engine.marines[0].id, { type: 'squadOrder', order: defend(10, 7) });
    for (let t = 0; t < 120 && !postsReached(engine, 'Calvin'); t++) engine.tick();
    expect(engine.squadState('Calvin')!.stage).toBe('all');
    engine.command(engine.marines[0].id, { type: 'squadOrder', order: defend(10, 7) });
    expect(engine.squadState('Calvin')!.stage).toBe('all');
    engine.command(engine.marines[0].id, { type: 'squadOrder', order: defend(10, 3) });
    expect(engine.squadState('Calvin')!.stage).toBe('first'); // restarted; opens at once when quiet
  });

  it('the issuer advances only once the posts are reached (or postWaitTicks have passed) and the quiet count has run', () => {
    const engine = engineOn(quiet(inRoom()));
    const orders: SquadOrder[] = [];
    PieceEvents.on('command', p => { if (p.command.type === 'squadOrder') orders.push((p.command as { order: SquadOrder }).order); });
    let reachedAt = -1;
    for (let t = 0; t < 200 && orders.length < 2; t++) {
      runMarineTurn(engine, 'squads');
      engine.tick();
      if (reachedAt < 0 && postsReached(engine, 'Calvin')) reachedAt = engine.tickCount;
    }
    expect(orders[0].type).toBe('defend');
    expect(orders[1].type).toMatch(/advance|clear/);
    expect(reachedAt).toBeGreaterThan(0);
    expect(engine.tickCount).toBeGreaterThanOrEqual(Math.min(reachedAt, AUTOPILOT.postWaitTicks));
    expect(engine.tickCount).toBeGreaterThanOrEqual(AUTOPILOT.quietTicks);
  });

  it('a corridor column is never handed a rotation of its own squares: the plan holds and the order is reached at once', () => {
    const engine = engineOn(quiet());
    engine.command(engine.marines[0].id, { type: 'squadOrder', order: defend(10, 4) });
    engine.runTicks(12);
    expect(postsReached(engine, 'Calvin')).toBe(true);
    for (const m of engine.marines) expect(m.pos.c).toBe(10);
  });

  it('the executable-plan rule bites only without slack: the corridor plan sends nobody to a squad-mate\'s square, the room plan keeps a post for everyone', () => {
    const corridor = engineOn(quiet());
    const cp = planDefend(corridor, corridor.marines, 10, 4);
    for (const p of cp) {
      const holder = corridor.marines.find(m => at(m, p.c.c, p.c.r));
      expect(holder === undefined || holder.id === p.id).toBe(true);
    }
    const room = engineOn();
    const rp = planDefend(room, room.marines, 10, 7);
    expect(rp).toHaveLength(room.marines.length);
  });
});

describe('the rider: a marine the player takes drops all previous orders', () => {
  it('isPinned covers a live player order as well as the wheel; isSteered only the wheel', () => {
    const engine = engineOn();
    const m = engine.marines[0];
    expect(isPinned(engine, m)).toBe(false);
    engine.command(m.id, { type: 'order', order: { type: 'moveTo', x: 9, y: 8, then: 'hold' } });
    expect(isPinned(engine, m)).toBe(true);
    expect(isSteered(engine, m)).toBe(false);
    engine.command(m.id, { type: 'turn', delta: 1 });
    expect(isSteered(engine, m)).toBe(true);
  });

  it('an order or a direct command drops the squad task at once, and the advance column leaves him out', () => {
    const engine = engineOn();
    engine.command(engine.marines[0].id, { type: 'squadOrder', order: advance(10, 13) });
    engine.runTicks(3);
    expect(engine.squadState('Calvin')!.column).toHaveLength(5);
    const m = engine.marines[2];
    expect(taskOf(m)).not.toBeNull();
    engine.command(m.id, { type: 'order', order: { type: 'moveTo', x: 11, y: 7, then: 'hold' } });
    expect(taskOf(m)).toBeNull();
    engine.tick();
    expect(engine.squadState('Calvin')!.column).toHaveLength(4);
    expect(engine.squadState('Calvin')!.column.includes(m.id)).toBe(false);
    const n = engine.marines[1];
    engine.command(n.id, { type: 'move', dir: 'backward' });
    expect(taskOf(n)).toBeNull();
  });
});

describe('transit rule E: the column covers on contact', () => {
  it('on contact every member holds his own square, on overwatch, the ones who see the threat facing it', () => {
    const engine = engineOn();
    engine.command(engine.marines[0].id, { type: 'squadOrder', order: advance(10, 13) });
    engine.runTicks(6);
    const leader = engine.marines.find(m => m.id === engine.squadState('Calvin')!.column[0])!;
    const s = new Genestealer(engine.state.board, { c: 10, r: leader.pos.r + 3 }, Dir.N);
    engine.tick();
    for (const m of engine.marines) {
      const t = taskOf(m)!;
      expect(t.type === 'moveTo' && at(m, t.x, t.y)).toBe(true);
      const sees = engine.state.board.get(s.pos.c, s.pos.r) !== undefined && (t as { facing?: number }).facing === Dir.S;
      if (m === leader) expect(sees).toBe(true);
    }
    engine.runTicks(4);
    for (const b of bolters(engine)) expect(b.overwatch || b.ap < 2).toBe(true);
  });

  it('a parked threat does not re-arm the hold as the column steps toward it; its own step closer does', () => {
    const engine = engineOn();
    engine.state.board.doorsAt({ c: 10, r: 9 }).forEach(d => d.open(true));
    engine.command(engine.marines[0].id, { type: 'squadOrder', order: advance(10, 13) });
    engine.runTicks(4);
    const st = engine.squadState('Calvin')!;
    const leader = engine.marines.find(m => m.id === st.column[0])!;
    const parkedAt = { c: 10, r: leader.pos.r + 5 };
    const s = new Genestealer(engine.state.board, parkedAt, Dir.N);
    // Parked: the hive would walk him, so he is put back after every tick.
    const park = () => { s.pos = { ...parkedAt }; engine.state.board.touch(); };
    engine.tick(); park();
    const armed = st.contactTick;
    expect(armed).toBe(engine.tickCount);
    for (let t = 0; t < TUNING.contactHoldTicks + 2; t++) { engine.tick(); park(); }
    expect(st.contactTick).toBe(armed); // the column moved, the stealer did not: no re-arm
    // The hold lapsed with the threat parked: the column is marching again.
    expect(engine.marines.some(m => { const t = taskOf(m); return t?.type === 'moveTo' && !at(m, t.x, t.y); })).toBe(true);
    s.pos = { c: parkedAt.c, r: parkedAt.r - 1 }; // his own step closer
    engine.state.board.touch();
    engine.tick();
    expect(st.contactTick).toBe(engine.tickCount);
  });
});
