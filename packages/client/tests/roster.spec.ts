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
  // Row titled after its leader (Space Hulk convention) — the sergeant's own name
  const leader = (await page.locator('.marine-card .m-name').first().textContent())!.replace(/^Sgt\. /, '');
  await expect(page.locator('.squad-row h3')).toHaveText(`Squad ${leader}`);
  await expect(page.locator('.squad-row').first()).toHaveAttribute('data-squad', 'Constantine'); // original key kept as identity
  await expect(page.locator('#roster-panel h2')).toHaveText('Marine Roster');
  const cards = page.locator('.marine-card');
  await expect(cards).toHaveCount(5);
  await expect(cards.nth(0).locator('.m-name')).toContainText('Sgt.');
  await expect(cards.nth(1).locator('.m-weapon')).toHaveText('Heavy Flamer');
  // AP + team CP pool share the stats line; ammo sits on its OWN line (ISC-289/290)
  await expect(cards.nth(0).locator('.m-stats')).toContainText('AP 4/4 · CP ');
  await expect(cards.nth(1).locator('.m-ammo')).toHaveText('Ammo 6');
  await expect(cards.nth(1).locator('.m-stats')).not.toContainText('Ammo');
  // Facing arrow renders and follows a turn (ISC-288)
  const face = cards.nth(0).locator('.m-face');
  const before0 = await face.textContent();
  expect(['↑', '→', '↓', '←']).toContain(before0);
  await page.evaluate(() => {
    const sgt = (window as any).sulk.engine.marines.find((m: any) => m.timerBonus > 0);
    sgt.tryTurn(1);
  });
  await expect(face).not.toHaveText(before0!);

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
  for (const i of [0, 1]) {
    const sgtName = (await rows.nth(i).locator('.m-name').first().textContent())!.replace(/^Sgt\. /, '');
    await expect(rows.nth(i).locator('h3')).toHaveText(`Squad ${sgtName}`);
  }
  await expect(rows.nth(0)).toHaveAttribute('data-squad', 'Sakharov');
  await expect(rows.nth(1)).toHaveAttribute('data-squad', 'Sternfeld');
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

test('keyboard help draws staggered keycap rows, collapses on click; Credits sit below (ISC-384/390..396)', async ({ page }) => {
  await page.goto('/?mission=space_hulk_1&seed=1');
  await page.waitForFunction(() => (window as any).sulk?.scene?.roster !== undefined, undefined, { timeout: 15000 });

  // Canvas HUD header renamed; AP/CP gone from it; mission info retained (ISC-384/385/387)
  const hud = await page.evaluate(() => {
    const h = (window as any).sulk.scene.hud;
    const texts = h.list.filter((c: any) => c.text).map((c: any) => c.text as string);
    return { texts, apText: (h as any).apText, cpText: (h as any).cpText };
  });
  expect(hud.apText).toBeUndefined();
  expect(hud.cpText).toBeUndefined();
  expect(hud.texts).toContain('Mission Status');
  expect(hud.texts.some((t: string) => t.startsWith('Turn 1:'))).toBe(true);
  expect(hud.texts.some((t: string) => t.startsWith('Kills:'))).toBe(true);
  expect(hud.texts.some((t: string) => t.includes('Map: ▲'))).toBe(true);
  expect(hud.texts.some((t: string) => t.startsWith('AP:') || t.startsWith('CP:'))).toBe(false);

  // Keycap rows mirror the keyboard: 3 letter rows + special row, staggered (ISC-390)
  const help = page.locator('#roster-panel .kb-help');
  await expect(help.locator('summary')).toHaveText('Keyboard controls');
  const rows = help.locator('.kb-row');
  await expect(rows).toHaveCount(4);
  await expect(rows.nth(0).locator('.keycap kbd').first()).toHaveText('Q');
  await expect(rows.nth(1).locator('.keycap kbd').first()).toHaveText('A');
  await expect(rows.nth(2).locator('.keycap kbd').first()).toHaveText('Z');
  const stagger = await page.evaluate(() => {
    const [r1, r2, r3] = Array.from(document.querySelectorAll('.kb-help .kb-row')).slice(0, 3);
    return [r1, r2, r3].map(r => parseFloat((r as HTMLElement).style.paddingLeft));
  });
  expect(stagger[1]).toBeGreaterThan(stagger[0]);
  expect(stagger[2]).toBeGreaterThan(stagger[1]);
  await expect(help.locator('.keycap.unbound')).toHaveCount(5); // Y I J V N spacers (K is mute now)
  // W keycap carries its action label ("fwd" also contains a w — match the <b> exactly)
  const wLabel = help.locator('.keycap').filter({ has: page.locator('kbd', { hasText: /^W$/ }) }).locator('i');
  await expect(wLabel).toHaveText('forward');

  // Collapsible via the native details arrow (ISC-391)
  expect(await help.evaluate(el => (el as HTMLDetailsElement).open)).toBe(true);
  await help.locator('summary').click();
  expect(await help.evaluate(el => (el as HTMLDetailsElement).open)).toBe(false);
  await expect(help.locator('.kb-board')).toBeHidden();
  await help.locator('summary').click();
  expect(await help.evaluate(el => (el as HTMLDetailsElement).open)).toBe(true);
  // Toggling must drop focus from the summary: Enter is a gameplay key (end
  // turn) and a focused summary would re-toggle instead (advisor 2026-08-16).
  // The toggle event (and its blur) fires async — poll, don't race it.
  await page.waitForFunction(() => document.activeElement?.tagName !== 'SUMMARY');
  await page.keyboard.press('Enter');
  await page.waitForTimeout(150);
  expect(await help.evaluate(el => (el as HTMLDetailsElement).open)).toBe(true); // unchanged

  // Credits below the help: Sulk link, single music credit, inspiration, legal collapsed (ISC-393..396)
  const credits = page.locator('#roster-panel .credits');
  await expect(credits.locator('h3')).toHaveText('Credits');
  await expect(credits.locator('a[href="https://sulk.sourceforge.net/"]')).toHaveText('Sulk');
  await expect(credits).toContainText('Toby Woodwark');
  await expect(page.locator('a[href="https://www.youtube.com/@Musicof40K"]')).toHaveCount(1); // no duplicate credit
  await expect(credits).toContainText('Space Hulk™, first edition');
  await expect(credits).toContainText('board game published by Games Workshop');
  const legal = credits.locator('details.legal');
  expect(await legal.evaluate(el => (el as HTMLDetailsElement).open)).toBe(false);
  await legal.locator('summary').click();
  await expect(legal).toContainText('no way endorsed by Games Workshop Limited');
  await expect(legal).toContainText('Genestealers');
  // help precedes credits in the panel (Credits "below the keyboard help")
  const order = await page.evaluate(() => {
    const kids = Array.from(document.getElementById('roster-panel')!.children).map(c => c.className || c.tagName);
    return { kb: kids.findIndex(k => String(k).includes('kb-help')), cr: kids.findIndex(k => String(k).includes('credits')) };
  });
  expect(order.kb).toBeGreaterThanOrEqual(0);
  expect(order.cr).toBeGreaterThan(order.kb);
});

test('weapon keys dim when no such marine is deployed: space_hulk_1 greys R/T/G (ISC-643/644)', async ({ page }) => {
  await page.goto('/?mission=space_hulk_1&seed=1');
  await page.waitForFunction(() => (window as any).sulk?.scene?.roster !== undefined, undefined, { timeout: 15000 });
  // No assault cannon and no chain fist in this mission: all three caps dim.
  const disabled = page.locator('#roster-panel .kb-help .keycap.disabled');
  await expect(disabled).toHaveCount(3);
  await expect(disabled.locator('kbd')).toHaveText(['R', 'T', 'G']);
  // The weapon qualifier renders in brackets under the action word.
  await expect(disabled.nth(0).locator('small')).toHaveText('(assault cannon)');
  await expect(disabled.nth(2).locator('small')).toHaveText('(chain fist)');
  await expect(disabled.nth(0)).toHaveAttribute('title', 'No assault cannon in this mission');
});

test('weapon keys stay live when the specialists ARE deployed: beta_2 dims nothing (ISC-645)', async ({ page }) => {
  await page.goto('/?mission=beta_2&seed=1');
  await page.waitForFunction(() => (window as any).sulk?.scene?.roster !== undefined, undefined, { timeout: 15000 });
  await expect(page.locator('#roster-panel .kb-help .keycap.disabled')).toHaveCount(0);
  // Sub-labels still render on the live caps.
  const gCap = page.locator('#roster-panel .kb-help .keycap', { has: page.locator('kbd', { hasText: /^G$/ }) });
  await expect(gCap.locator('small')).toHaveText('(chain fist)');
});
