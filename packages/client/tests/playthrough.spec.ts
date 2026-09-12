import { test, expect } from '@playwright/test';
import { waitForGame } from './harness';

/**
 * Full-mission playthrough on the clock: the autopilot issues commands, the
 * test steps the engine a cycle at a time, and the game must reach a result.
 * Also the one real click on the HUD's button, which is PAUSE now.
 */
test('Mission 1 plays start to finish and reaches a result', async ({ page }) => {
  test.setTimeout(120000);
  // Seed 3 pinned 2026-09-12 (real time): the flamer-led autopilot column
  // loses space_hulk_1 on every scanned seed; this keeps the defeat-path
  // regression, win.spec covers victory. Rescan if dice order changes.
  const errors = await waitForGame(page, 'mission=space_hulk_1&seed=3');

  // Click the PAUSE button once for real: it is the interactive rectangle in
  // the HUD. Paused, the clock stops; a second click resumes.
  const box = await page.locator('canvas').boundingBox();
  expect(box).not.toBeNull();
  const pos = await page.evaluate(() => {
    const { scene } = (window as any).sulk;
    const hud = scene.hud;
    const btn = hud.list.find((o: any) => o.type === 'Rectangle' && o.input?.enabled);
    return btn ? { x: hud.x + btn.x + btn.width / 2, y: hud.y + btn.y + btn.height / 2 } : null;
  });
  expect(pos).not.toBeNull();
  const gameW = await page.evaluate(() => (window as any).sulk.scene.scale.width);
  const scale = box!.width / gameW;
  await page.mouse.click(box!.x + pos!.x * scale, box!.y + pos!.y * scale);
  await page.waitForTimeout(200);
  expect(await page.evaluate(() => (window as any).sulk.scene.isPaused)).toBe(true);
  await page.mouse.click(box!.x + pos!.x * scale, box!.y + pos!.y * scale);
  await page.waitForTimeout(200);
  expect(await page.evaluate(() => (window as any).sulk.scene.isPaused)).toBe(false);

  // Deterministic completion: one round of autopilot commands, one tick,
  // a cycle at a time, until the game resolves (at most 60 cycles).
  let result = 'ongoing';
  for (let cycle = 0; cycle < 60 && result === 'ongoing'; cycle++) {
    result = await page.evaluate(() => {
      const { engine, runMarineTurn } = (window as any).sulk;
      for (let t = 0; t < 40 && engine.state.result === 'ongoing'; t++) {
        runMarineTurn(engine);
        engine.tick();
      }
      return engine.state.result as string;
    });
  }
  const probe = await page.evaluate(() => {
    const { engine, scene } = (window as any).sulk;
    return { result: engine.state.result, cycle: engine.cycle, marinesLeft: engine.marines.length, kills: scene.hud.casualtyText.text };
  });
  expect(probe.result).toBe('loss'); // pinned defeat path
  expect(errors).toHaveLength(0);
  await page.screenshot({ path: 'test-results/playthrough-final.png' });
  console.log('PLAYTHROUGH:', JSON.stringify(probe));
});
