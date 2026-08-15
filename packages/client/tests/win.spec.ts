import { test, expect } from '@playwright/test';

/**
 * Deterministic victory: a pinned seed with the marine autopilot (legal actions
 * only) wins Mission 1. Pinning the seed makes this a stable regression test
 * for the whole win path, overlay included.
 * Runs the DEFAULT mission (debug_1: lone marine vs the blip trickle).
 * Seed policy: found by scanning seeds offline (2026-08-15 debug_1 scan:
 * 30W/30L over 60, wins at 1,2,3,4,6,…); re-scan if rules change dice
 * consumption order.
 */
test('debug_1 is winnable — pinned seed reaches MISSION COMPLETE', async ({ page }) => {
  test.setTimeout(120000);
  const errors: string[] = [];
  page.on('pageerror', (err: Error) => errors.push(err.message));
  // ?seed pins the WHOLE game — construction rolls (blip values, CP) included
  await page.goto('/?seed=1');
  await expect(page.locator('canvas')).toBeVisible();
  await page.waitForFunction(() => (window as any).sulk?.scene?.hud !== undefined, undefined, { timeout: 15000 });

  const result = await page.evaluate(() => {
    const { engine, autoplay } = (window as any).sulk;
    autoplay(engine, 60);
    return { result: engine.state.result, turn: engine.turnNumber, marines: engine.marines.length };
  });
  expect(result.result).toBe('win');
  expect(result.marines).toBeGreaterThan(0);
  await page.waitForTimeout(300);
  await page.screenshot({ path: 'test-results/mission-complete.png' });
  const overlayShown = await page.evaluate(() =>
    (window as any).sulk.scene.children.list.some((o: any) => o.text === 'MISSION COMPLETE'));
  expect(overlayShown).toBe(true);
  expect(errors).toHaveLength(0);
});
