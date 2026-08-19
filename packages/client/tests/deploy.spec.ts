import { test, expect, type Page } from '@playwright/test';

/**
 * Pre-mission deployment phase (ISC-814..831). Deployment is the DEFAULT
 * player flow — these tests boot without deploy=0. Assertions run on engine
 * state, the deploy-x markers, and roster card classes; board clicks are real
 * canvas clicks computed from the live camera.
 */

async function boot(page: Page, url = '/?mission=space_hulk_1&seed=1') {
  await page.goto(url);
  await expect(page.locator('canvas')).toBeVisible();
  await page.waitForFunction(() => (window as any).sulk?.scene?.minimap !== undefined, undefined, { timeout: 15000 });
}

/** Click the centre of board square (bx, by) through the live camera. */
async function clickSquare(page: Page, bx: number, by: number) {
  const pt = await page.evaluate(([x, y]) => {
    const cam = (window as any).sulk.scene.cameras.main;
    return { x: x * 40 + 20 - cam.worldView.x, y: y * 40 + 20 - cam.worldView.y };
  }, [bx, by]);
  await page.locator('canvas').click({ position: pt });
}

const probe = (page: Page) => page.evaluate(() => {
  const { sulk } = window as any;
  return {
    deployMode: sulk.scene.deployMode,
    phase: sulk.engine.phase,
    marines: sulk.engine.marines.length,
    reserve: sulk.engine.reserve.length,
    markers: sulk.scene.children.list.filter((o: any) => o.name === 'deploy-x' && o.active).length,
    autoBtn: (sulk.scene.hud as any).list.some((o: any) => o.name === 'auto-deploy-btn' && o.active),
    phaseText: (sulk.scene.hud as any).phaseText.text,
    deployRemaining: (sulk.scene as any).deployRemaining,
  };
});

test('missions boot into the deployment phase; deploy=0 skips it (ISC-814/821/830)', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (err: Error) => errors.push(err.message));
  await boot(page);
  const p = await probe(page);
  expect(p.deployMode).toBe(true);
  expect(p.phase).toBe('Deploy');
  expect(p.marines).toBe(0);
  expect(p.reserve).toBe(5);
  expect(p.markers).toBe(5);          // an X on every free deploy square
  expect(p.autoBtn).toBe(true);
  expect(p.phaseText).toBe('DEPLOYMENT');
  expect(p.deployRemaining).toBe(90); // one squad = 1.5 minutes
  await expect(page.locator('.marine-card.reserve')).toHaveCount(5);

  await boot(page, '/?deploy=0&mission=space_hulk_1&seed=1');
  const off = await probe(page);
  expect(off.deployMode).toBe(false);
  expect(off.phase).toBe('MarineAction');
  expect(off.marines).toBe(5);
  expect(off.markers).toBe(0);
  expect(errors).toEqual([]);
});

test('two-squad missions get 3 minutes; attract mode never deploys (ISC-815/821)', async ({ page }) => {
  await boot(page, '/?mission=space_hulk_5&seed=1');
  expect((await probe(page)).deployRemaining).toBe(180);
  await page.goto('/');
  await page.waitForFunction(() => (window as any).sulk?.scene?.hud !== undefined, undefined, { timeout: 15000 });
  const home = await page.evaluate(() => ({
    deployMode: (window as any).sulk.scene.deployMode,
    marines: (window as any).sulk.engine.marines.length,
  }));
  expect(home.deployMode).toBe(false);
  expect(home.marines).toBe(5); // the attract backdrop plays fully deployed
});

test('clicking a free deploy square places the squad\'s next reserve marine at the mission facing (ISC-816/817/831)', async ({ page }) => {
  await boot(page);
  await clickSquare(page, 10, 4);
  const state = await page.evaluate(() => {
    const { sulk } = window as any;
    const m = sulk.engine.marines[0];
    return {
      marines: sulk.engine.marines.length,
      reserve: sulk.engine.reserve.length,
      markers: sulk.scene.children.list.filter((o: any) => o.name === 'deploy-x' && o.active).length,
      pos: { x: m.pos.c, y: m.pos.r },
      facing: m.facing,
      sprite: m.spriteKey,
      selected: sulk.Selection.get() === m.id,
    };
  });
  expect(state.marines).toBe(1);
  expect(state.reserve).toBe(4);
  expect(state.markers).toBe(4); // the occupied square lost its X
  expect(state.pos).toEqual({ x: 10, y: 4 });
  expect(state.facing).toBe(2); // Suicide's column walks DOWN
  expect(state.sprite).toBe('terminator_storm_bolter'); // reserve order: bolters first
  expect(state.selected).toBe(true); // placed marine is selected for A/D
  await expect(page.locator('.marine-card.reserve')).toHaveCount(4);
});

test('a roster card arms a specific marine for the next square click (ISC-820)', async ({ page }) => {
  await boot(page);
  await page.locator('.marine-card.reserve', { has: page.locator('.m-weapon', { hasText: 'Heavy Flamer' }) }).click();
  await clickSquare(page, 10, 0);
  const placed = await page.evaluate(() => {
    const m = (window as any).sulk.engine.marines[0];
    return { sprite: m.spriteKey, pos: { x: m.pos.c, y: m.pos.r } };
  });
  expect(placed.sprite).toBe('terminator_heavy_flamer');
  expect(placed.pos).toEqual({ x: 10, y: 0 });
});

test('clicking a deployed marine picks him back up; A/D rotates for free (ISC-818/819/827)', async ({ page }) => {
  await boot(page);
  await clickSquare(page, 10, 4);
  // A/D rotate the placed (selected) marine without touching AP.
  const before = await page.evaluate(() => (window as any).sulk.engine.marines[0].ap);
  await page.keyboard.press('D');
  let facing = await page.evaluate(() => (window as any).sulk.engine.marines[0].facing);
  expect(facing).toBe(3); // S turned clockwise → W
  await page.keyboard.press('A');
  facing = await page.evaluate(() => (window as any).sulk.engine.marines[0].facing);
  expect(facing).toBe(2); // back to S
  // Action keys are dead: W must not move him, F must not arm anything.
  await page.keyboard.press('W');
  await page.keyboard.press('F');
  const mid = await page.evaluate(() => {
    const m = (window as any).sulk.engine.marines[0];
    return { pos: { x: m.pos.c, y: m.pos.r }, ap: m.ap, aiming: (window as any).sulk.scene.flamerAiming };
  });
  expect(mid.pos).toEqual({ x: 10, y: 4 });
  expect(mid.ap).toBe(before);
  expect(mid.aiming).toBe(false);
  // Pick him back up.
  await clickSquare(page, 10, 4);
  const after = await probe(page);
  expect(after.marines).toBe(0);
  expect(after.reserve).toBe(5);
  expect(after.markers).toBe(5); // the X returned
  await expect(page.locator('.marine-card.reserve')).toHaveCount(5);
});

test('AUTO DEPLOY fills the line in battle order — flamer no longer on point (ISC-824 + ISC-808 live)', async ({ page }) => {
  await boot(page);
  await page.evaluate(() => {
    const scene = (window as any).sulk.scene;
    const btn = (scene.hud as any).list.find((o: any) => o.name === 'auto-deploy-btn');
    btn.emit('pointerdown');
  });
  const order = await page.evaluate(() => {
    const b = (window as any).sulk.engine.state.board;
    return [4, 3, 2, 1, 0].map((y: number) => (b.pieceAt({ c: 10, r: y }) as any).spriteKey);
  });
  expect(order).toEqual([
    'terminator_storm_bolter', 'terminator_sergeant', 'terminator_heavy_flamer',
    'terminator_storm_bolter', 'terminator_storm_bolter',
  ]);
  const p = await probe(page);
  expect(p.reserve).toBe(0);
  expect(p.markers).toBe(0);
  expect(p.deployMode).toBe(true); // auto-deploy places; it does not start the mission
});

test('Done (Enter) starts the mission and every deploy control disappears (ISC-822/823/825)', async ({ page }) => {
  await boot(page);
  await clickSquare(page, 10, 4); // one manual placement survives the auto-fill
  await page.keyboard.press('Enter');
  const p = await probe(page);
  expect(p.deployMode).toBe(false);
  expect(p.phase).toBe('MarineAction');
  expect(p.marines).toBe(5);
  expect(p.reserve).toBe(0);
  expect(p.markers).toBe(0);
  expect(p.autoBtn).toBe(false);
  expect(p.phaseText).toContain('Marines');
  await expect(page.locator('.marine-card.reserve')).toHaveCount(0);
  // The marine clock took over (120s + 30s sergeant = 2:30).
  const timer = await page.evaluate(() => (window as any).sulk.scene.hud ? ((window as any).sulk.scene as any).timerRemaining : 0);
  expect(timer).toBe(150);
  // Normal play works: the board is unlocked and turning costs AP again.
  const live = await page.evaluate(() => {
    const { sulk } = window as any;
    const front = sulk.engine.state.board.pieceAt({ c: 10, r: 4 });
    return {
      locked: sulk.engine.state.board.locked,
      turned: front.tryTurn(1),
      apSpent: front.ap < front.apInitial,
    };
  });
  expect(live.locked).toBe(false);
  expect(live.turned).toBe(true);
  expect(live.apSpent).toBe(true);
});

test('the deploy clock expiring auto-deploys and starts the mission (ISC-822)', async ({ page }) => {
  await boot(page);
  await page.evaluate(() => { ((window as any).sulk.scene as any).deployRemaining = 1; });
  await page.waitForFunction(() => (window as any).sulk.scene.deployMode === false, undefined, { timeout: 6000 });
  const p = await probe(page);
  expect(p.phase).toBe('MarineAction');
  expect(p.marines).toBe(5);
  expect(p.markers).toBe(0);
});

test('ESC pauses deployment: clicks are inert until resume (ISC-826)', async ({ page }) => {
  await boot(page);
  await page.keyboard.press('Escape');
  await clickSquare(page, 10, 4);
  expect((await probe(page)).marines).toBe(0); // paused — nothing deployed
  await page.keyboard.press('Escape');
  await clickSquare(page, 10, 4);
  expect((await probe(page)).marines).toBe(1);
});

test('squads never mix: an armed Harken marine cannot take an Abraham square (ISC-817 squad rule)', async ({ page }) => {
  await boot(page, '/?mission=space_hulk_5&seed=1');
  // Arm a Harken reserve card, then click Abraham's row.
  await page.locator('.squad-row[data-squad="Harken"] .marine-card.reserve').first().click();
  await clickSquare(page, 12, 10);
  const placed = await page.evaluate(() => {
    const { sulk } = window as any;
    const m = sulk.engine.marines[0];
    return m ? { squad: sulk.engine.deploySquadOf(m.id), facing: m.facing } : null;
  });
  // The fallback deploys Abraham's own next marine instead — facing RIGHT
  // down the corridor (the Decoy data fix, ISC-812).
  expect(placed).not.toBeNull();
  expect(placed!.squad).toBe('Abraham');
  expect(placed!.facing).toBe(1);
});

test('Anti: reduced motion deploys instantly and exactly (ISC-829)', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await boot(page);
  await clickSquare(page, 10, 4);
  await page.keyboard.press('Enter');
  const clean = await page.evaluate(() => {
    const { sulk } = window as any;
    const bad: string[] = [];
    // Position truth via the reconciled sprites the e2e motion suite uses.
    for (const p of sulk.engine.state.board.pieces) {
      const spr = (sulk.scene as any).pieceSprites[p.id];
      if (!spr) { bad.push(`${p.id}:none`); continue; }
      if (spr.x !== p.pos.c * 40 + 20 || spr.y !== p.pos.r * 40 + 20) bad.push(`${p.id}:pos`);
    }
    return { bad, marines: sulk.engine.marines.length };
  });
  expect(clean.marines).toBe(5);
  expect(clean.bad).toEqual([]);
});
