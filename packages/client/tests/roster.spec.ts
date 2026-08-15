import { test, expect } from '@playwright/test';

/**
 * Marine roster panel + themed entry markers (ISC-270..273, 277..284):
 * squad-grouped cards right of the canvas with live AP/state, two-way
 * selection sync with camera pan, KIA greying, and the original off-board
 * entry triangles replacing the purple squares.
 */

test('space_hulk_2: entry triangles render; cards select, update, and grey out on death', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (err: Error) => errors.push(err.message));
  await page.goto('/?mission=space_hulk_2&seed=1');
  await page.waitForFunction(() => (window as any).sulk?.scene?.roster !== undefined, undefined, { timeout: 15000 });

  // Entry triangles: 11 ENTRY squares → 11 off-board triangle images; no purple rects (ISC-270/272)
  const markers = await page.evaluate(() => {
    const { scene } = (window as any).sulk;
    return {
      triangles: scene.children.list.filter((o: any) => o.name === 'entry-triangle').length,
      texLoaded: scene.textures.exists('entry') && scene.textures.exists('exit'),
    };
  });
  expect(markers.triangles).toBe(11);
  expect(markers.texLoaded).toBe(true);

  // Panel: one squad row (Constantine), five cards, sergeant first (ISC-277/278)
  await expect(page.locator('#roster-panel .squad-row')).toHaveCount(1);
  await expect(page.locator('.squad-row h3')).toHaveText('Squad Constantine');
  const cards = page.locator('.marine-card');
  await expect(cards).toHaveCount(5);
  await expect(cards.nth(0).locator('.m-name')).toContainText('Sgt.');
  await expect(cards.nth(1).locator('.m-weapon')).toHaveText('Heavy Flamer');
  await expect(cards.nth(0).locator('.m-stats')).toHaveText('AP 4/4');
  await expect(cards.nth(1).locator('.m-stats')).toContainText('Ammo 6');

  // Card click → engine selection + camera pans toward the marine (ISC-280)
  const before = await page.evaluate(() => {
    const cam = (window as any).sulk.scene.cameras.main;
    return { x: cam.scrollX, y: cam.scrollY };
  });
  await cards.nth(0).click();
  const picked = await page.evaluate(() => (window as any).sulk.Selection.get());
  const sgtId = await page.evaluate(() =>
    (window as any).sulk.engine.marines.find((m: any) => m.timerBonus > 0).id);
  expect(picked).toBe(sgtId);
  await expect(cards.nth(0)).toHaveClass(/selected/);
  await page.waitForTimeout(400); // pan tween
  const after = await page.evaluate(() => {
    const cam = (window as any).sulk.scene.cameras.main;
    return { x: cam.scrollX, y: cam.scrollY };
  });
  expect(after.x !== before.x || after.y !== before.y).toBe(true);

  // Map-side selection change syncs the highlight to the other card (ISC-281)
  await page.evaluate(() => {
    const { engine, Selection, PieceEvents } = (window as any).sulk;
    const flamer = engine.marines.find((m: any) => m.ammo !== undefined);
    Selection.select(flamer.id);
    PieceEvents.emit('selected', { pieceId: flamer.id });
  });
  await expect(page.locator('.marine-card.selected')).toHaveCount(1);
  await expect(page.locator('.marine-card.selected .m-weapon')).toHaveText('Heavy Flamer');

  // Death: card greys out, shows KIA, stops selecting (ISC-279)
  const victimId = await page.evaluate(() => {
    const m = (window as any).sulk.engine.marines.find((x: any) => x.timerBonus === 0 && x.ammo === undefined);
    m.die();
    return m.id;
  });
  const victimCard = page.locator(`[data-piece-id="${victimId}"]`);
  await expect(victimCard).toHaveClass(/dead/);
  await expect(victimCard.locator('.m-state')).toHaveText('KIA');
  await victimCard.click({ force: true });
  const stillSelected = await page.evaluate(() => (window as any).sulk.Selection.get());
  expect(stillSelected).not.toBe(victimId);

  expect(errors).toHaveLength(0);
});

test('space_hulk_3: exit arrows render off-board at the EXIT squares (ISC-273)', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (err: Error) => errors.push(err.message));
  await page.goto('/?mission=space_hulk_3&seed=1');
  await page.waitForFunction(() => (window as any).sulk?.scene?.roster !== undefined, undefined, { timeout: 15000 });
  const r = await page.evaluate(() => {
    const s = (window as any).sulk.scene;
    return {
      arrows: s.children.list.filter((o: any) => o.name === 'exit-arrow')
        .map((o: any) => [o.x / 40 - 0.5, o.y / 40 - 0.5]),
      exits: (window as any).sulk.engine.mission.exitPoints,
    };
  });
  // Both EXIT:DOWN squares get an arrow one square BELOW them (off-board)
  expect(r.exits).toHaveLength(2);
  for (const e of r.exits) {
    expect(e.facing).toBe('down');
    expect(r.arrows).toContainEqual([e.x, e.y + 1]);
  }
  expect(errors).toHaveLength(0);
});

test('beta_2: two squad rows with all special-weapon labels; overwatch badge live (ISC-277/284)', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (err: Error) => errors.push(err.message));
  await page.goto('/?mission=beta_2&seed=1');
  await page.waitForFunction(() => (window as any).sulk?.scene?.roster !== undefined, undefined, { timeout: 15000 });

  const rows = page.locator('#roster-panel .squad-row');
  await expect(rows).toHaveCount(2);
  await expect(rows.nth(0).locator('h3')).toHaveText('Squad Sakharov');
  await expect(rows.nth(1).locator('h3')).toHaveText('Squad Sternfeld');
  await expect(page.locator('.marine-card')).toHaveCount(10);
  const weapons = await page.locator('.m-weapon').allTextContents();
  expect(weapons.sort()).toEqual(['Assault Cannon', 'Chain Fist', 'Heavy Flamer', 'Power Sword']);

  // Overwatch badge appears on the card when the engine flips the flag
  const owId = await page.evaluate(() => {
    const m = (window as any).sulk.engine.marines.find((x: any) => x.overwatchOn && x.timerBonus === 0 && x.ammo === undefined);
    m.overwatchOn();
    return m.id;
  });
  await expect(page.locator(`[data-piece-id="${owId}"] .m-badges`)).toContainText('OW');

  expect(errors).toHaveLength(0);
});
