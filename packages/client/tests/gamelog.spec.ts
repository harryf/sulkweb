import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';

/**
 * End-of-mission gameplay-log export (see docs/gamelog-format.md): the end
 * dialog offers debrief notes and a Download game log button; the saved JSON
 * is the analysis corpus for mission-generic stealer-AI improvements.
 * Uses the pinned debug_1 seed-1 win (same path as win.spec) so the dialog
 * appears deterministically.
 */
test('end dialog exports the gameplay log with notes, mission and timestamp filename', async ({ page }) => {
  test.setTimeout(120000);
  const errors: string[] = [];
  page.on('pageerror', (err: Error) => errors.push(err.message));
  await page.goto('/?deploy=0&mission=debug_1&seed=1');
  await page.waitForFunction(() => (window as any).sulk?.scene?.hud !== undefined, undefined, { timeout: 15000 });

  // The logger is live from scene construction on a real mission.
  expect(await page.evaluate(() => (window as any).sulk.gameLog !== null)).toBe(true);

  await page.evaluate(() => {
    const { engine, autoplay } = (window as any).sulk;
    autoplay(engine, 60);
  });
  await expect(page.locator('#end-dialog')).toBeVisible();

  // Notes field and download control are part of the dialog. TYPE the notes
  // key by key (not fill): Phaser's global key captures preventDefault 25
  // keycodes, which used to eat most characters typed into the textarea.
  // The gameOver handler now disables Phaser input; this asserts a human can
  // actually type here (reviewer finding, 2026-08-20).
  const notes = page.locator('#end-notes');
  await expect(notes).toBeVisible();
  await notes.click();
  await notes.pressSequentially('Stealers never pressured the flank; door play felt passive.');
  await expect(notes).toHaveValue('Stealers never pressured the flank; door play felt passive.');

  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.click('#end-download'),
  ]);

  // Filename: mission key + local timestamp keeps a collected corpus unique.
  expect(download.suggestedFilename())
    .toMatch(/^sulk-log_debug_1_\d{4}-\d{2}-\d{2}_\d{2}-\d{2}-\d{2}\.json$/);

  const path = await download.path();
  const log = JSON.parse(await readFile(path!, 'utf8'));
  expect(log.meta.formatVersion).toBe(1);
  expect(log.meta.mission).toBe('debug_1');
  expect(log.meta.seed).toBe(1);
  expect(log.meta.result).toBe('win');
  expect(typeof log.meta.version).toBe('string');
  expect(log.meta.startedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  expect(Array.isArray(log.initialPieces)).toBe(true);
  expect(log.initialPieces.length).toBeGreaterThan(0);
  expect(log.events.length).toBeGreaterThan(0);
  expect(log.events.some((e: { type: string }) => e.type === 'gameOver')).toBe(true);
  expect(log.notes).toBe('Stealers never pressured the flank; door play felt passive.');

  expect(errors).toHaveLength(0);
});

test('retry starts a fresh logger (reload resets the recording)', async ({ page }) => {
  test.setTimeout(120000);
  await page.goto('/?deploy=0&mission=debug_1&seed=1');
  await page.waitForFunction(() => (window as any).sulk?.scene?.hud !== undefined, undefined, { timeout: 15000 });
  await page.evaluate(() => { const { engine, autoplay } = (window as any).sulk; autoplay(engine, 60); });
  await expect(page.locator('#end-dialog')).toBeVisible();
  await page.click('#end-retry'); // full reload: same URL, same pinned seed
  await page.waitForFunction(() => (window as any).sulk?.scene?.hud !== undefined, undefined, { timeout: 15000 });
  const fresh = await page.evaluate(() => {
    const log = (window as any).sulk.gameLog;
    return { result: log.meta.result, started: typeof log.meta.startedAt };
  });
  expect(fresh.result).toBeNull(); // the new game's log, not the finished one
  expect(fresh.started).toBe('string');
});

test('attract-mode homepage records nothing and shows no end dialog', async ({ page }) => {
  await page.goto('/');
  await page.waitForFunction(() => (window as any).sulk?.engine !== undefined, undefined, { timeout: 15000 });
  expect(await page.evaluate(() => (window as any).sulk.gameLog)).toBeNull();
  await expect(page.locator('#end-dialog')).toHaveCount(0);
});
