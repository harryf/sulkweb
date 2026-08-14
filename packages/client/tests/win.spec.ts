import { test, expect } from '@playwright/test';

/**
 * Deterministic victory: a pinned seed with the marine autopilot (legal actions
 * only) wins Mission 1. Pinning the seed makes this a stable regression test
 * for the whole win path, overlay included.
 * Seed policy: found by scanning seeds offline (BFS-AI scan 2026-08-14: wins at
 * 29,42,44,56,70,…); re-scan if rules change dice consumption order.
 */
test('Mission 1 is winnable — pinned seed reaches MISSION COMPLETE', async ({ page }) => {
  test.setTimeout(120000);
  const errors: string[] = [];
  page.on('pageerror', (err: Error) => errors.push(err.message));
  await page.goto('/');
  await expect(page.locator('canvas')).toBeVisible();
  await page.waitForFunction(() => (window as any).sulk?.scene?.hud !== undefined, undefined, { timeout: 15000 });

  const result = await page.evaluate(() => {
    const { engine, SeededRng, autoplay } = (window as any).sulk;
    engine.state.board.dice = new SeededRng(29);
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
