import { expect, type Page } from '@playwright/test';

/**
 * The stepping harness for the live game (2.x): `?tick=0` stops the client
 * clock so nothing moves until the test says so, and `step(n)` runs n engine
 * ticks through window.sulk.step. Every spec that drives a game should boot
 * through here unless it is about the running clock itself.
 *
 * `query` is the mission part (`mission=debug_1&seed=1`); deploy=0 and
 * tick=0 are prepended unless the query already names them.
 */
export async function waitForGame(page: Page, query = 'mission=debug_1&seed=1'): Promise<string[]> {
  const errors: string[] = [];
  page.on('pageerror', (err: Error) => errors.push(err.message));
  const parts = [] as string[];
  if (!/(^|&)deploy=/.test(query)) parts.push('deploy=0');
  if (!/(^|&)tick=/.test(query)) parts.push('tick=0');
  parts.push(query);
  await page.goto(`/?${parts.join('&')}`);
  await expect(page.locator('canvas')).toBeVisible();
  await page.waitForFunction(() => (window as any).sulk?.scene?.hud !== undefined, undefined, { timeout: 15000 });
  return errors;
}

/** Advance the engine n ticks and return the tick count. */
export function step(page: Page, n = 1): Promise<number> {
  return page.evaluate((count: number) => {
    const { sulk } = window as any;
    sulk.step(count);
    return sulk.engine.tickCount as number;
  }, n);
}
