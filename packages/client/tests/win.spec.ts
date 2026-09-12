import { test, expect } from '@playwright/test';
import { waitForGame } from './harness';

/**
 * Deterministic victory: a pinned seed with the marine autopilot (legal
 * commands only, ticking the engine between them) wins debug_1. Pinning the
 * seed makes this a stable regression test for the whole win path, overlay
 * included.
 * Seed policy: found by scanning seeds offline (2026-09-12 real-time scan at
 * the default tuning: 1 win in 30, seed 30); re-scan if rules change dice
 * consumption order or the regeneration constants.
 */
test('debug_1 is winnable: the pinned seed reaches MISSION COMPLETE', async ({ page }) => {
  test.setTimeout(120000);
  // ?seed pins the WHOLE game (construction rolls included); ?tick=0 hands the clock to autoplay.
  const errors = await waitForGame(page, 'mission=debug_1&seed=30');

  const result = await page.evaluate(() => {
    const { engine, autoplay } = (window as any).sulk;
    autoplay(engine, 60);
    return { result: engine.state.result, cycle: engine.cycle, tick: engine.tickCount, marines: engine.marines.length };
  });
  expect(result.result).toBe('win');
  expect(result.marines).toBeGreaterThan(0);
  expect(result.tick).toBeGreaterThan(0);
  await page.waitForTimeout(300);
  await page.screenshot({ path: 'test-results/mission-complete.png' });
  const overlayShown = await page.evaluate(() =>
    (window as any).sulk.scene.children.list.some((o: any) => o.text === 'MISSION COMPLETE'));
  expect(overlayShown).toBe(true);
  expect(errors).toHaveLength(0);
});
