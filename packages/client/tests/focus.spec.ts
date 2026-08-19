import { test, expect, type Page } from '@playwright/test';

/**
 * Replay action camera + charging stealers (ISC-780..786). Assertions run on
 * the focusLog / lastAttackFx / motionLog probes plus settle-exact camera and
 * facing checks — no mid-tween sampling.
 */

async function boot(page: Page, url = '/?mission=space_hulk_1&seed=1') {
  await page.goto(url);
  await expect(page.locator('canvas')).toBeVisible();
  await page.waitForFunction(() => (window as any).sulk?.scene?.minimap !== undefined, undefined, { timeout: 15000 });
}

/** Spawn a stealer relative to the squad, then run the stealer phase.
 *  'adjacent' = an orthogonal free square with no closed door between (the
 *  hive lines up and strikes this phase); 'near' = a free square 4-5 out. */
const runReplay = async (page: Page, spawnAt: 'adjacent' | 'near') => {
  const spawned = await page.evaluate((mode: string) => {
    const { sulk } = window as any;
    const b = sulk.engine.state.board;
    const spots = mode === 'adjacent'
      ? [[0, 1], [0, -1], [1, 0], [-1, 0]]
      : [[0, 4], [4, 0], [0, -4], [-4, 0], [0, 5], [5, 0], [3, 3], [-3, 3]];
    let id: string | null = null;
    outer: for (const m of sulk.engine.marines) {
      if (!m.alive) continue;
      for (const [dc, dr] of spots) {
        const c = { c: m.pos.c + dc, r: m.pos.r + dr };
        if (!b.get(c.c, c.r) || b.isOccupied(c)) continue;
        if (mode === 'adjacent') {
          const door = b.doorBetween(m.pos, c);
          if (door && !door.isOpen) continue;
        }
        id = new sulk.Genestealer(b, c, 0).id;
        break outer;
      }
    }
    sulk.scene.motionLog.length = 0;
    sulk.scene.endTurn();
    return id;
  }, spawnAt);
  expect(spawned).not.toBeNull();
  await page.waitForFunction(() => !(window as any).sulk.scene.animating, undefined, { timeout: 30000 });
  return spawned!;
};

test('the camera follows near-marine stealer action during the replay (ISC-780)', async ({ page }) => {
  await boot(page, '/?mission=debug_1&seed=1');
  await runReplay(page, 'adjacent');
  await page.waitForTimeout(350); // let the final pan land
  const probe = await page.evaluate(() => {
    const scene = (window as any).sulk.scene;
    const cam = scene.cameras.main;
    const log = scene.focusLog;
    const last = log[log.length - 1];
    return {
      log,
      view: { contains: last ? cam.worldView.contains(last.x * 40 + 20, last.y * 40 + 20) : false },
    };
  });
  expect(probe.log.length).toBeGreaterThan(0);
  // The camera parked with the LAST focus target in view (bounds clamping on
  // small maps means "centred" can be physically impossible — IN VIEW is the
  // contract the player needs: seeing what the stealers did).
  const last = probe.log[probe.log.length - 1];
  expect(probe.view.contains).toBe(true);
  expect(last).toBeTruthy();
});

test('an attack gets the full treatment: focus, shake, spotlight, lunge (ISC-781/782/783)', async ({ page }) => {
  await boot(page, '/?mission=debug_1&seed=1');
  await runReplay(page, 'adjacent');
  const probe = await page.evaluate(() => {
    const scene = (window as any).sulk.scene;
    return {
      attacks: scene.focusLog.filter((f: any) => f.attack),
      fx: scene.lastAttackFx,
      lunges: scene.motionLog.filter((e: any) => e.kind === 'lunge').length,
      vignetteTexture: scene.textures.exists('fx_vignette'),
      vignetteLive: scene.children.list.some((o: any) => o.name === 'fx_vignette' && o.active),
    };
  });
  expect(probe.attacks.length).toBeGreaterThan(0);
  expect(probe.fx).not.toBeNull();
  expect(probe.attacks.some((a: any) => a.x === probe.fx.x && a.y === probe.fx.y)).toBe(true);
  expect(probe.lunges).toBeGreaterThan(0);
  expect(probe.vignetteTexture).toBe(true);  // the spotlight fired...
  expect(probe.vignetteLive).toBe(false);    // ...and finishReplay cleared it
});

test('close-in stealers end the phase facing their prey, sprite and engine agreeing (ISC-784)', async ({ page }) => {
  await boot(page, '/?mission=debug_1&seed=1');
  // A full wave spawned 8-10 squares out: big enough that the hive charges
  // (a lone stealer stages away instead), far enough that nobody reaches the
  // marine this phase — survivors END the phase close, prey still alive.
  await page.evaluate(() => {
    const { sulk } = window as any;
    const b = sulk.engine.state.board;
    const m = sulk.engine.marines.find((x: any) => x.alive);
    let placed = 0;
    for (let dr = 8; dr <= 11 && placed < 10; dr++) {
      for (let dc = -3; dc <= 3 && placed < 10; dc++) {
        const c = { c: m.pos.c + dc, r: m.pos.r + dr };
        if (b.get(c.c, c.r) && !b.isOccupied(c)) { new sulk.Genestealer(b, c, 0); placed++; }
      }
    }
    sulk.scene.endTurn();
  });
  await page.waitForFunction(() => !(window as any).sulk.scene.animating, undefined, { timeout: 30000 });
  const checked = await page.evaluate(() => {
    const { engine, scene } = (window as any).sulk;
    const marines = engine.marines.filter((m: any) => m.alive);
    const cheb = (a: any, b: any) => Math.max(Math.abs(a.c - b.c), Math.abs(a.r - b.r));
    const out: string[] = [];
    let count = 0;
    for (const p of engine.state.board.pieces) {
      if (p.kind !== 'stealer' || !p.alive) continue;
      const near = marines.map((m: any) => ({ m, d: cheb(p.pos, m.pos) })).sort((a: any, b: any) => a.d - b.d)[0];
      if (!near || near.d > 6) continue;
      count++;
      // facingToward mirror: |dc| >= |dr| picks E/W, else N/S (N=0 E=1 S=2 W=3).
      const dc = near.m.pos.c - p.pos.c, dr = near.m.pos.r - p.pos.r;
      const expected = Math.abs(dc) >= Math.abs(dr) ? (dc > 0 ? 1 : 3) : (dr > 0 ? 2 : 0);
      if (p.facing !== expected) { out.push(`${p.id}:engine ${p.facing}!=${expected}`); continue; }
      const spr = scene.pieceSprites[p.id];
      const norm = ((spr.rotation % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
      if (Math.abs(norm - expected * Math.PI / 2) > 1e-6) out.push(`${p.id}:sprite`);
    }
    return { out, count };
  });
  expect(checked.count).toBeGreaterThan(0); // the invariant must not pass vacuously
  expect(checked.out).toEqual([]);
});

test('back-to-back attacks keep the spotlight lifecycle clean; marine actions never pan (synthetic attackFx)', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (err: Error) => errors.push(err.message));
  await boot(page, '/?mission=debug_1&seed=1');
  // Marine-phase probe guard: acting during the marine phase must not touch
  // the focus log — replayPan is only reachable from the replay schedule.
  const marinePhase = await page.evaluate(() => {
    const { sulk } = window as any;
    const m = sulk.engine.marines.find((x: any) => x.alive);
    for (const [dc, dr] of [[0, -1], [0, 1], [-1, 0], [1, 0]]) if (m.tryMove(dc, dr)) break;
    return sulk.scene.focusLog.length;
  });
  expect(marinePhase).toBe(0);
  // Two attacks in rapid succession: the second spotlight must replace the
  // first (killTweensOf before destroy) — one live vignette, then zero.
  const mid = await page.evaluate(() => {
    const { sulk } = window as any;
    const scene = sulk.scene;
    const m = sulk.engine.marines.find((x: any) => x.alive);
    const s = new sulk.Genestealer(sulk.engine.state.board, { c: m.pos.c + 2, r: m.pos.r }, 0);
    scene.attackFx({ x: m.pos.c, y: m.pos.r, ax: s.pos.c, ay: s.pos.r, attackerId: s.id, defenderId: m.id });
    scene.attackFx({ x: m.pos.c, y: m.pos.r + 1, ax: s.pos.c, ay: s.pos.r, attackerId: s.id, defenderId: m.id });
    return {
      live: scene.children.list.filter((o: any) => o.name === 'fx_vignette' && o.active).length,
      attacks: scene.focusLog.filter((f: any) => f.attack).length,
    };
  });
  expect(mid.live).toBe(1); // the second replaced the first, no ghost pair
  expect(mid.attacks).toBe(2);
  // The surviving spotlight fades itself out completely.
  await page.waitForFunction(() => {
    const scene = (window as any).sulk.scene;
    return scene.children.list.filter((o: any) => o.name === 'fx_vignette' && o.active).length === 0;
  }, undefined, { timeout: 5000 });
  expect(errors).toEqual([]);
});

test('Anti: far movers and spawn corners never pull the camera (ISC-785)', async ({ page }) => {
  await boot(page);
  await page.evaluate(() => {
    const { sulk } = window as any;
    new sulk.Genestealer(sulk.engine.state.board, { c: 1, r: 1 }, 0); // far-corner reinforcement
    sulk.scene.endTurn();
  });
  await page.waitForFunction(() => !(window as any).sulk.scene.animating, undefined, { timeout: 30000 });
  const clean = await page.evaluate(() => {
    const { engine, scene } = (window as any).sulk;
    const marines = engine.marines.map((m: any) => ({ c: m.pos.c, r: m.pos.r }));
    const cheb = (a: any, b: any) => Math.max(Math.abs(a.x - b.c), Math.abs(a.y - b.r));
    return {
      nearCorner: scene.focusLog.filter((f: any) => Math.max(Math.abs(f.x - 1), Math.abs(f.y - 1)) <= 2).length,
      allNearMarines: scene.focusLog.every((f: any) => marines.some((m: any) => cheb(f, m) <= 6)),
    };
  });
  expect(clean.nearCorner).toBe(0);
  expect(clean.allNearMarines).toBe(true);
});

test('Anti: reduced motion replays instantly with no pans, effects, or drift (ISC-786)', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await boot(page);
  const probe = await page.evaluate(() => {
    const { sulk } = window as any;
    const m = sulk.engine.marines.find((x: any) => x.alive);
    new sulk.Genestealer(sulk.engine.state.board, { c: m.pos.c, r: m.pos.r + 1 }, 0);
    sulk.scene.endTurn(); // instant path — synchronous
    const { scene, engine } = sulk;
    const bad: string[] = [];
    for (const p of engine.state.board.pieces) {
      const spr = scene.pieceSprites[p.id];
      if (!spr) { bad.push(`${p.id}:none`); continue; }
      if (spr.x !== p.pos.c * 40 + 20 || spr.y !== p.pos.r * 40 + 20) bad.push(`${p.id}:pos`);
    }
    return {
      bad,
      focusCount: scene.focusLog.length,
      fx: scene.lastAttackFx,
      vignetteLive: scene.children.list.some((o: any) => o.name === 'fx_vignette' && o.active),
    };
  });
  expect(probe.bad).toEqual([]);
  expect(probe.focusCount).toBe(0);
  expect(probe.fx).toBeNull();
  expect(probe.vignetteLive).toBe(false);
});
