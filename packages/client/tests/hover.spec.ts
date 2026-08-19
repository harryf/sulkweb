import { test, expect, type Page } from '@playwright/test';

async function waitForGame(page: Page) {
  await page.goto('/?deploy=0&mission=debug_1&seed=1'); // pinned board — deterministic contents
  await expect(page.locator('canvas')).toBeVisible();
  await page.waitForFunction(() => (window as any).sulk?.scene?.hud !== undefined, undefined, { timeout: 15000 });
}

/** Screen pixel at the center of a board tile, accounting for camera scroll. */
async function tileCenter(page: Page, x: number, y: number) {
  return page.evaluate(([tx, ty]) => {
    const cam = (window as any).sulk.scene.cameras.main;
    const T = 40;
    return { px: tx * T + T / 2 - cam.scrollX, py: ty * T + T / 2 - cam.scrollY };
  }, [x, y]);
}

test('hover readout shows square coordinate and contents in the HUD (ISC-106..109)', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (err: Error) => errors.push(err.message));
  await waitForGame(page);

  const stateSnapshot = () => page.evaluate(() => {
    const { engine } = (window as any).sulk;
    return engine.state.board.pieces.map((p: any) => `${p.id}:${p.pos.c},${p.pos.r}:${p.ap}`).join('|');
  });
  const before = await stateSnapshot();

  // The marine deploys on the original M squares — north corridor (10,4).
  await page.evaluate(() => (window as any).sulk.scene.cameras.main.setScroll(0, 0));
  let { px, py } = await tileCenter(page, 10, 4);
  await page.mouse.move(px, py);
  await page.waitForFunction(() => (window as any).sulk.scene.hoverInfo.includes('(10,4)'), undefined, { timeout: 5000 });
  const marineInfo = await page.evaluate(() => (window as any).sulk.scene.hoverInfo);
  expect(marineInfo).toContain('(10,4)');
  expect(marineInfo).toContain('corridor tile');
  expect(marineInfo).toContain('marine');

  // Door anchor square at (13,15) shows its edge (ISC-108)
  ({ px, py } = await tileCenter(page, 13, 15));
  await page.mouse.move(px, py);
  await page.waitForFunction(() => (window as any).sulk.scene.hoverInfo.includes('(13,15)'), undefined, { timeout: 5000 });
  const doorInfo = await page.evaluate(() => (window as any).sulk.scene.hoverInfo);
  expect(doorInfo).toContain('door');
  expect(doorInfo).toContain('closed');

  // The HUD text object displays the readout, positioned below the map legend
  // (ISC-106; keyboard controls moved to the roster panel's collapsible help)
  const hudCheck = await page.evaluate(() => {
    const hud = (window as any).sulk.scene.hud;
    const hover = hud.list.find((c: any) => c.text && c.text.startsWith('(13,15)'));
    const legend = hud.list.find((c: any) => c.text && c.text.includes('Map: ▲'));
    return hover && legend ? { hoverY: hover.y, legendY: legend.y, text: hover.text } : null;
  });
  expect(hudCheck).not.toBeNull();
  expect(hudCheck!.hoverY).toBeGreaterThan(hudCheck!.legendY); // below the legend
  await page.screenshot({ path: 'test-results/hover-readout.png' });

  // Old-map residue reads as rock — (15,13) held a door in the invented map (ISC-119)
  ({ px, py } = await tileCenter(page, 15, 13));
  await page.mouse.move(px, py);
  await page.waitForFunction(() => (window as any).sulk.scene.hoverInfo.includes('rock'), undefined, { timeout: 5000 });

  // A stealer entry square names itself (ISC-108) — scroll south to reach it
  await page.evaluate(() => (window as any).sulk.scene.cameras.main.setScroll(0, 500));
  ({ px, py } = await tileCenter(page, 14, 26));
  await page.mouse.move(px, py);
  await page.waitForFunction(() => (window as any).sulk.scene.hoverInfo.includes('stealer entry'), undefined, { timeout: 5000 });

  // ISC-109 Anti: the mousemove sweep changed no game state
  expect(await stateSnapshot()).toBe(before);
  expect(errors).toEqual([]);
});
