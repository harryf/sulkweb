import { test, expect, type Page } from '@playwright/test';

async function waitForGame(page: Page) {
  await page.goto('/?seed=1'); // pinned board — deterministic contents
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

  // Scroll the camera to the top-left so the deployment area is on screen
  await page.evaluate(() => (window as any).sulk.scene.cameras.main.setScroll(0, 0));

  // A marine stands at (10,4) in mission 1 — hover it (ISC-107 + ISC-108 occupant)
  let { px, py } = await tileCenter(page, 10, 4);
  await page.mouse.move(px, py);
  await page.waitForFunction(() => (window as any).sulk.scene.hoverInfo.includes('(10,4)'), undefined, { timeout: 5000 });
  const marineInfo = await page.evaluate(() => (window as any).sulk.scene.hoverInfo);
  expect(marineInfo).toContain('(10,4)');
  expect(marineInfo).toContain('corridor tile');
  expect(marineInfo).toContain('marine');

  // Door anchor square at (10,5) shows its edge (ISC-108)
  ({ px, py } = await tileCenter(page, 10, 5));
  await page.mouse.move(px, py);
  await page.waitForFunction(() => (window as any).sulk.scene.hoverInfo.includes('(10,5)'), undefined, { timeout: 5000 });
  const doorInfo = await page.evaluate(() => (window as any).sulk.scene.hoverInfo);
  expect(doorInfo).toContain('door');
  expect(doorInfo).toContain('closed');

  // The HUD text object displays the readout, positioned below the controls (ISC-106)
  const hudCheck = await page.evaluate(() => {
    const hud = (window as any).sulk.scene.hud;
    const hover = hud.list.find((c: any) => c.text && c.text.startsWith('(10,5)'));
    const controls = hud.list.find((c: any) => c.text && c.text.includes('Click marine to select'));
    return hover && controls ? { hoverY: hover.y, controlsY: controls.y, text: hover.text } : null;
  });
  expect(hudCheck).not.toBeNull();
  expect(hudCheck!.hoverY).toBeGreaterThan(hudCheck!.controlsY); // below the instructions
  await page.screenshot({ path: 'test-results/hover-readout.png' });

  // Off-map square reads as rock (ISC-107 boundary case)
  ({ px, py } = await tileCenter(page, 0, 0));
  await page.mouse.move(px, py);
  await page.waitForFunction(() => (window as any).sulk.scene.hoverInfo.includes('rock'), undefined, { timeout: 5000 });

  // ISC-109 Anti: the mousemove sweep changed no game state
  expect(await stateSnapshot()).toBe(before);
  expect(errors).toEqual([]);
});
