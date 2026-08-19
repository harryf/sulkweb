import { test, expect } from '@playwright/test';

/**
 * Number-key marine selection (ISC-654..666): 1-5 select the first squad row
 * and 6-0 the second, in the order the cards display (sergeant first). Each
 * card wears its key as an [n] badge, dead marines' keys go inert without
 * reshuffling anyone else's, and the whole game becomes playable without the
 * mouse. Real key events, 80ms+ apart (Phaser replay dedupe, see CLAUDE.md).
 */

const press = async (page: import('@playwright/test').Page, key: string) => {
  await page.keyboard.press(key);
  await page.waitForTimeout(90);
};

/** data-piece-id of the card wearing badge [label]. */
const cardIdFor = (page: import('@playwright/test').Page, label: string) =>
  page.evaluate((l) => {
    const badge = Array.from(document.querySelectorAll('.marine-card .m-hotkey'))
      .find(el => el.textContent === `[${l}]`);
    return badge ? (badge.closest('.marine-card') as HTMLElement).dataset.pieceId : undefined;
  }, label);

const selected = (page: import('@playwright/test').Page) =>
  page.evaluate(() => (window as any).sulk.Selection.get());

test('beta_2: every number selects the marine whose card wears that badge (ISC-654/655/661)', async ({ page }) => {
  await page.goto('/?deploy=0&mission=beta_2&seed=1');
  await page.waitForFunction(() => (window as any).sulk?.scene?.roster !== undefined, undefined, { timeout: 15000 });

  // All ten badges render, and the two squad rows carry 1-5 / 6-0 in card order.
  const badges = await page.evaluate(() =>
    Array.from(document.querySelectorAll('.squad-row')).map(row =>
      Array.from(row.querySelectorAll('.m-hotkey')).map(el => el.textContent)));
  expect(badges).toEqual([
    ['[1]', '[2]', '[3]', '[4]', '[5]'],
    ['[6]', '[7]', '[8]', '[9]', '[0]'],
  ]);

  await page.mouse.click(300, 300); // focus the canvas
  // Cross both squads and the 0 wrap: the badge IS the contract.
  for (const label of ['2', '6', '0', '1']) {
    await press(page, label);
    expect(await selected(page)).toBe(await cardIdFor(page, label));
  }
  // The [1] and [6] marines are the sergeants: cards lead with them.
  const sgt = await page.evaluate(() => {
    const name = (l: string) => Array.from(document.querySelectorAll('.marine-card'))
      .find(c => c.querySelector('.m-hotkey')?.textContent === `[${l}]`)!
      .querySelector('.m-name')!.textContent;
    return { one: name('1'), six: name('6') };
  });
  expect(sgt.one).toMatch(/^Sgt\. /);
  expect(sgt.six).toMatch(/^Sgt\. /);
});

test('a dead marine keeps nobody waiting: his key goes inert, others never reshuffle (ISC-657/658/662)', async ({ page }) => {
  await page.goto('/?deploy=0&mission=beta_2&seed=1');
  await page.waitForFunction(() => (window as any).sulk?.scene?.roster !== undefined, undefined, { timeout: 15000 });
  await page.mouse.click(300, 300);

  const id2 = await cardIdFor(page, '2');
  const id3 = await cardIdFor(page, '3');
  await press(page, '1'); // select the sergeant first
  const id1 = await selected(page);

  // Kill [2] at the engine level and let the roster hear about it.
  await page.evaluate((id) => {
    const { engine, PieceEvents } = (window as any).sulk;
    const p = engine.findPiece(id) ?? engine.state.pieces.find((q: any) => q.id === id);
    p.alive = false;
    PieceEvents.emit('pieceDied', { pieceId: id });
  }, id2);

  await press(page, '2'); // inert: selection stays where it was
  expect(await selected(page)).toBe(id1);
  await press(page, '3'); // and [3] still means the ORIGINAL third marine
  expect(await selected(page)).toBe(id3);
  // The dead card dropped its badge — the key it advertised is gone.
  expect(await cardIdFor(page, '2')).toBeUndefined();
});

test('a number press behaves like a card click: flamer aim disarms, pause blocks (ISC-660/666)', async ({ page }) => {
  await page.goto('/?deploy=0&mission=space_hulk_1&seed=1');
  await page.waitForFunction(() => (window as any).sulk?.scene?.roster !== undefined, undefined, { timeout: 15000 });
  await page.mouse.click(300, 300);

  // Arm the flamer, then select someone else by number: the aim must drop.
  await page.evaluate(() => {
    const { engine, Selection, PieceEvents } = (window as any).sulk;
    const flamer = engine.marines.find((m: any) => m.spriteKey === 'terminator_heavy_flamer');
    Selection.select(flamer.id);
    PieceEvents.emit('selected', { pieceId: flamer.id, ap: { apRemaining: 4, apInitial: 4 }, ammo: 6 });
  });
  await press(page, 'f');
  expect(await page.evaluate(() => (window as any).sulk.scene.flamerAiming)).toBe(true);
  await press(page, '1');
  expect(await page.evaluate(() => (window as any).sulk.scene.flamerAiming)).toBe(false);
  expect(await selected(page)).toBe(await cardIdFor(page, '1'));

  // Paused: numbers do nothing.
  await press(page, 'Escape');
  await press(page, '3');
  expect(await selected(page)).toBe(await cardIdFor(page, '1'));
  await press(page, 'Escape'); // unpause for a clean teardown

  // Single-squad mission: 6-0 were never bound — pressing 6 changes nothing.
  await press(page, '6');
  expect(await selected(page)).toBe(await cardIdFor(page, '1'));
});

test('the homepage backdrop ignores the number keys (ISC-665)', async ({ page }) => {
  await page.goto('/');
  await page.waitForFunction(() => (window as any).sulk?.scene !== undefined, undefined, { timeout: 15000 });
  await press(page, '1');
  expect(await page.evaluate(() => (window as any).sulk.Selection.get() ?? null)).toBeNull();
});
