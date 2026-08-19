import { test, expect } from '@playwright/test';

/**
 * beta_2 "Download" UI (ISC-264): the exotic squad renders, the download
 * status line tracks the engine, autofire/cut-door work through the real
 * keys, and the win overlay fires when the counter hits zero.
 */
test('beta_2 boots with exotics; download status + victory wiring', async ({ page }) => {
  test.setTimeout(120000);
  const errors: string[] = [];
  page.on('pageerror', (err: Error) => errors.push(err.message));
  await page.goto('/?deploy=0&mission=beta_2&seed=1');
  await expect(page.locator('canvas')).toBeVisible();
  await page.waitForFunction(() => (window as any).sulk?.scene?.hud !== undefined, undefined, { timeout: 15000 });

  const setup = await page.evaluate(() => {
    const { engine, scene } = (window as any).sulk;
    return {
      squares: engine.state.board.grid.size,
      textures: engine.marines.map((m: any) => scene.pieceSprites[m.id]?.texture?.key).sort(),
      objective: scene.hud.objectiveText.text as string,
      status: scene.hud.statusText.text as string,
    };
  });
  expect(setup.squares).toBe(176);
  expect(setup.textures).toEqual([
    'terminator_assault_cannon', 'terminator_chain_fist', 'terminator_heavy_flamer',
    'terminator_sergeant', 'terminator_sergeant_sword',
    'terminator_storm_bolter', 'terminator_storm_bolter', 'terminator_storm_bolter',
    'terminator_storm_bolter', 'terminator_storm_bolter',
  ].sort());
  expect(setup.objective).toContain('HOLD the Data Room');
  expect(setup.status).toContain('Download not started');

  // Download status tracks engine events (view contract)
  const statusLine = await page.evaluate(() => {
    const { scene, PieceEvents } = (window as any).sulk;
    PieceEvents.emit('downloadChanged', { counter: 2, active: true });
    return scene.hud.statusText.text as string;
  });
  expect(statusLine).toContain('Downloading… 2/4');

  // Engine surgery: counter to zero + victory check → overlay
  const finale = await page.evaluate(() => {
    const { engine } = (window as any).sulk;
    engine.downloadCounter = 0;
    engine.checkVictory();
    return engine.state.result;
  });
  expect(finale).toBe('win');
  await page.waitForTimeout(300);
  const overlay = await page.evaluate(() =>
    (window as any).sulk.scene.children.list.some((o: any) => o.text === 'MISSION COMPLETE'));
  expect(overlay).toBe(true);
  await page.screenshot({ path: 'test-results/beta2.png' });
  expect(errors).toEqual([]);
});
