import { test, expect } from '@playwright/test';
import { waitForGame } from './harness';

/**
 * Deterministic victory by orders alone (stage 2 exit criterion): the
 * autopilot issues moveTo orders and the flame command, the default AI walks
 * and defends, and space_hulk_1 is won on a pinned seed, overlay included.
 * Seed policy: found by scanning seeds offline (2026-09-12 stage 2 scan at
 * the shipped tuning: 2 wins in 60, seeds 26 and 27); re-scan if rules change
 * dice consumption order or the regeneration constants. debug_1 left this
 * fixture in stage 2: its lone marine loses the exit race at the shipped
 * regeneration on every seed (ISA Decisions, 2026-09-12).
 */
test('space_hulk_1 is winnable by orders: the pinned seed reaches MISSION COMPLETE', async ({ page }) => {
  test.setTimeout(120000);
  // ?seed pins the WHOLE game (construction rolls included); ?tick=0 hands the clock to autoplay.
  const errors = await waitForGame(page, 'mission=space_hulk_1&seed=26');

  const result = await page.evaluate(() => {
    const { engine, autoplay, PieceEvents } = (window as any).sulk;
    const types: string[] = [];
    const h = ({ command }: { command: { type: string } }) => { types.push(command.type); };
    PieceEvents.on('command', h);
    autoplay(engine, 60);
    PieceEvents.off('command', h);
    return {
      result: engine.state.result, cycle: engine.cycle, tick: engine.tickCount, marines: engine.marines.length,
      orders: types.filter(t => t === 'order').length,
      direct: types.filter(t => ['move', 'turn', 'shoot', 'melee'].includes(t)).length,
    };
  });
  expect(result.result).toBe('win');
  expect(result.orders).toBeGreaterThan(4);
  expect(result.direct).toBe(0); // orders alone: the issuer never plays a marine directly
  expect(result.marines).toBeGreaterThan(0);
  expect(result.tick).toBeGreaterThan(0);
  await page.waitForTimeout(300);
  await page.screenshot({ path: 'test-results/mission-complete.png' });
  const overlayShown = await page.evaluate(() =>
    (window as any).sulk.scene.children.list.some((o: any) => o.text === 'MISSION COMPLETE'));
  expect(overlayShown).toBe(true);
  expect(errors).toHaveLength(0);
});
