import { test, expect, type Page } from '@playwright/test';
import { waitForGame } from './harness';

/**
 * The metered command pause (2.x stage 4 step 5): Space stops the clock and
 * spends the engine's pause pool to do it. The bill goes out as one
 * pauseSpent command at the resume, the overlay counts the seconds down, and
 * an empty pool means the pause does not open at all. `?pause=free` puts the
 * stage 3 unmetered pause back.
 *
 * Every spec here boots with `?tick=0` (waitForGame's default): the clock
 * never runs, so the pool never recharges and the numbers after a resume are
 * exactly what the pause cost. The countdown and the auto-resume live in
 * update(), which Phaser calls every frame whatever the tick interval is.
 */

/** The pause overlay's label text, or null while no pause is open. */
const overlayText = (page: Page) =>
  page.evaluate(() => {
    const overlay = (window as any).sulk.scene.children.list
      .find((c: any) => c.name === 'command-pause');
    if (!overlay) return null;
    const label = overlay.list.find((c: any) => typeof c.text === 'string');
    return label ? (label.text as string) : null;
  });

/** The seconds the overlay says are left. */
function secondsLeft(text: string | null): number {
  const match = /(\d+\.\d) s /.exec(text ?? '');
  expect(match, `no countdown in overlay text: ${text}`).not.toBeNull();
  return Number(match![1]);
}

const paused = (page: Page) =>
  page.evaluate(() => (window as any).sulk.scene.isCommandPaused as boolean);

const pool = (page: Page) =>
  page.evaluate(() => (window as any).sulk.engine.pausePool as number);

const meterText = (page: Page) =>
  page.evaluate(() => ((window as any).sulk.scene.hud as any).meterText.text as string);

/** Record every pauseSpent bill the client issues from here on. */
async function recordBills(page: Page): Promise<void> {
  await page.evaluate(() => {
    (window as any).__bills = [];
    (window as any).sulk.PieceEvents.on('command', (p: any) => {
      if (p.command.type === 'pauseSpent') (window as any).__bills.push(p.command.ms as number);
    });
  });
}

const bills = (page: Page) => page.evaluate(() => (window as any).__bills as number[]);

test('the pause counts down and bills what it took', async ({ page }) => {
  const errors = await waitForGame(page, 'mission=space_hulk_1&seed=1');
  await recordBills(page);

  await page.keyboard.press('Space');
  await page.waitForTimeout(100);
  expect(await paused(page)).toBe(true);
  const opened = secondsLeft(await overlayText(page));
  expect(opened).toBeLessThanOrEqual(20);

  await page.waitForTimeout(1200);
  const text = await overlayText(page);
  expect(text).toContain(' s ');
  expect(secondsLeft(text)).toBeLessThan(opened);

  await page.keyboard.press('Space');
  await page.waitForTimeout(100);
  expect(await paused(page)).toBe(false);

  const spent = await bills(page);
  expect(spent).toHaveLength(1);
  expect(spent[0]).toBeGreaterThanOrEqual(1000);
  expect(spent[0]).toBeLessThanOrEqual(2500);
  // The clock never ran, so nothing recharged: the pool is the bill, exactly.
  const left = await pool(page);
  expect(left).toBeLessThan(20000);
  expect(left).toBe(20000 - spent[0]);
  expect(errors).toHaveLength(0);
});

test('a pool under a second refuses to open the pause', async ({ page }) => {
  const errors = await waitForGame(
    page, 'mission=space_hulk_1&seed=1&tuning=pausePool.base:0.5,pausePool.perSergeant:0');
  await recordBills(page);
  expect(await pool(page)).toBe(500);

  await page.keyboard.press('Space');
  await page.waitForTimeout(200);
  expect(await paused(page)).toBe(false);
  expect(await overlayText(page)).toBeNull();
  expect(await bills(page)).toHaveLength(0);
  expect(await pool(page)).toBe(500);

  const flash = await page.evaluate(() => {
    const hud = (window as any).sulk.scene.hud as any;
    return { text: hud.flashText.text as string, visible: hud.flashText.visible as boolean };
  });
  expect(flash.visible).toBe(true);
  expect(flash.text).toContain('NO COMMAND TIME');
  expect(errors).toHaveLength(0);
});

test('the pause resumes itself when the pool runs out', async ({ page }) => {
  const errors = await waitForGame(
    page, 'mission=space_hulk_1&seed=1&tuning=pausePool.base:1.5,pausePool.perSergeant:0');
  await recordBills(page);
  expect(await pool(page)).toBe(1500);

  await page.keyboard.press('Space');
  await page.waitForTimeout(100);
  expect(await paused(page)).toBe(true);

  await expect.poll(() => paused(page), { timeout: 2500 }).toBe(false);
  expect(await bills(page)).toEqual([1500]);
  expect(await pool(page)).toBe(0);
  expect(await overlayText(page)).toBeNull();
  expect(errors).toHaveLength(0);
});

test('?pause=free bills nothing and says so on the meter', async ({ page }) => {
  const errors = await waitForGame(page, 'mission=space_hulk_1&seed=1&pause=free');
  await recordBills(page);
  expect(await meterText(page)).toContain('FREE');

  await page.keyboard.press('Space');
  await page.waitForTimeout(1200);
  expect(await paused(page)).toBe(true);
  await page.keyboard.press('Space');
  await page.waitForTimeout(100);

  expect(await paused(page)).toBe(false);
  expect(await bills(page)).toHaveLength(0);
  expect(await pool(page)).toBe(20000);
  expect(await meterText(page)).toContain('FREE');
  expect(errors).toHaveLength(0);
});

test('the HUD meter reads the full pool at boot', async ({ page }) => {
  const errors = await waitForGame(page, 'mission=space_hulk_1&seed=1');
  expect(await meterText(page)).toContain('Command time 20.0 / 20 s');
  expect(errors).toHaveLength(0);
});
