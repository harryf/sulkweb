import { test, expect, type Page } from '@playwright/test';

/**
 * The homepage (bare `/`), mission-select flow, abort control, end-of-mission
 * dialog, and the field manual. The homepage is a DOM overlay above an
 * attract-mode space_hulk_1 backdrop with all input/clock/audio off.
 */

async function waitForScene(page: Page) {
  await expect(page.locator('canvas')).toBeVisible();
  await page.waitForFunction(() => (window as any).sulk?.scene?.hud !== undefined, undefined, { timeout: 15000 });
}

test('homepage: title, intro, mission list, credits, manual link over a dimmed space_hulk_1', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (err: Error) => errors.push(err.message));
  await page.goto('/');
  await waitForScene(page);

  const overlay = page.locator('#home-overlay');
  await expect(overlay).toBeVisible();
  await expect(overlay.locator('.home-title')).toHaveText('SULK');
  await expect(overlay.locator('.home-intro')).toContainText('Terminator marines');

  // 8 playable missions, campaign order, debug_1 deliberately absent
  await expect(overlay.locator('.home-mission')).toHaveCount(8);
  await expect(overlay.locator('[data-mission="space_hulk_1"] .home-mission-name')).toHaveText('Suicide Mission');
  await expect(overlay.locator('[data-mission="debug_1"]')).toHaveCount(0);

  // Credits footer + manual link
  await expect(overlay.locator('.home-credits')).toContainText('Toby Woodwark');
  await expect(overlay.locator('.home-credits')).toContainText('GPL-3.0');
  await expect(overlay.locator('.home-credits')).toContainText('Games Workshop');
  await expect(overlay.locator('#manual-link')).toBeVisible();

  // Version stamp: 'dev' locally, the release tag (vN.N.N) on deployed builds
  await expect(overlay.locator('#app-version')).toHaveText(/^(dev|v\d+\.\d+(\.\d+)?)$/);

  // Board "slightly visible" beneath: overlay background is semi-transparent
  const alpha = await overlay.evaluate(el => {
    const bg = getComputedStyle(el).backgroundColor; // rgba(r, g, b, a)
    const m = bg.match(/rgba?\(([^)]+)\)/);
    const parts = m![1].split(',').map(s => parseFloat(s));
    return parts.length === 4 ? parts[3] : 1;
  });
  expect(alpha).toBeGreaterThan(0);
  expect(alpha).toBeLessThan(1);

  // The backdrop is space_hulk_1, and no abort control offers itself at home
  const state = await page.evaluate(() => ({
    mission: (window as any).sulk.engine.mission.name,
    abort: !!document.getElementById('abort-mission'),
  }));
  expect(state.mission).toBe('Suicide Mission');
  expect(state.abort).toBe(false);

  expect(errors).toHaveLength(0);
});

test('attract mode is inert: no input, no clock, no audio', async ({ page }) => {
  await page.goto('/');
  await waitForScene(page);

  // Enter must NOT end the turn behind the overlay
  await page.keyboard.press('Enter');
  await page.waitForTimeout(200);
  const state = await page.evaluate(() => {
    const { engine, scene, audio } = (window as any).sulk;
    return {
      turn: engine.turnNumber,
      phase: engine.phase,
      timerRunning: scene.timerEvent !== undefined,
      audioConstructed: audio !== undefined,
      inputEnabled: scene.input.enabled,
    };
  });
  expect(state.turn).toBe(1);
  expect(state.phase).toBe('MarineAction');
  expect(state.timerRunning).toBe(false);
  expect(state.audioConstructed).toBe(false);
  expect(state.inputEnabled).toBe(false);
});

test('selecting a mission starts it; the overlay is gone and the abort control appears', async ({ page }) => {
  await page.goto('/');
  await waitForScene(page);
  await page.click('[data-mission="space_hulk_2"]');
  await page.waitForURL(/mission=space_hulk_2/);
  await waitForScene(page);

  const state = await page.evaluate(() => ({
    marines: (window as any).sulk.engine.marines.length,
    overlay: !!document.getElementById('home-overlay'),
    abort: !!document.getElementById('abort-mission'),
    inputEnabled: (window as any).sulk.scene.input.enabled,
  }));
  expect(state.marines).toBe(5); // Squad Constantine: 3 bolters, sergeant, flamer
  expect(state.overlay).toBe(false);
  expect(state.abort).toBe(true);
  expect(state.inputEnabled).toBe(true);
});

test('abort mission: first click arms, second click returns to the homepage', async ({ page }) => {
  await page.goto('/?mission=debug_1&seed=1');
  await waitForScene(page);

  const abort = page.locator('#abort-mission');
  await expect(abort).toHaveText('Abort mission');

  // A single click never navigates — it arms the confirm
  await abort.click();
  await expect(abort).toHaveText('Abandon squad?');
  await page.waitForTimeout(300);
  expect(page.url()).toContain('mission=debug_1');

  // The second click abandons ship
  await abort.click();
  await page.waitForURL(url => !url.search.includes('mission'));
  await expect(page.locator('#home-overlay')).toBeVisible();
});

test('legacy /?seed=N URLs redirect to debug_1 with the seed preserved', async ({ page }) => {
  await page.goto('/?seed=7');
  await page.waitForURL(/mission=debug_1.*seed=7|seed=7.*mission=debug_1/);
  await waitForScene(page);
  await expect(page.locator('#home-overlay')).toHaveCount(0);
});

test('an armed abort button does not fire on the end-turn Enter key', async ({ page }) => {
  await page.goto('/?mission=debug_1&seed=1');
  await waitForScene(page);
  await page.locator('#abort-mission').click(); // armed — and blurred
  await page.keyboard.press('Enter');           // means END TURN, not "confirm abort"
  await page.waitForTimeout(300);
  expect(page.url()).toContain('mission=debug_1'); // still in the mission
  const turn = await page.evaluate(() => (window as any).sulk.engine.turnNumber);
  expect(turn).toBeGreaterThanOrEqual(2); // Enter reached the game, not the button
});

test('mission won: end dialog offers retry and mission select', async ({ page }) => {
  test.setTimeout(120000);
  await page.goto('/?mission=debug_1&seed=1');
  await waitForScene(page);

  await page.evaluate(() => {
    const { engine, autoplay } = (window as any).sulk;
    autoplay(engine, 60);
  });
  const dialog = page.locator('#end-dialog');
  await expect(dialog).toBeVisible();
  await expect(dialog).toHaveAttribute('data-result', 'win');
  await expect(dialog.locator('h2')).toHaveText('Mission complete');
  await expect(dialog.locator('#end-retry')).toBeVisible();

  // Retry reloads the same mission (URL and pinned seed preserved)
  await dialog.locator('#end-retry').click();
  await waitForScene(page);
  expect(page.url()).toContain('mission=debug_1');
  await expect(page.locator('#end-dialog')).toHaveCount(0); // fresh game

  // Win again, choose another mission → homepage
  await page.evaluate(() => {
    const { engine, autoplay } = (window as any).sulk;
    autoplay(engine, 60);
  });
  await page.locator('#end-choose').click();
  await page.waitForURL(url => !url.search.includes('mission'));
  await expect(page.locator('#home-overlay')).toBeVisible();
});

test('mission lost: the same dialog appears with the failure result', async ({ page }) => {
  await page.goto('/?mission=debug_1&seed=1');
  await waitForScene(page);

  // Squad wipe = loss in every mission
  await page.evaluate(() => {
    const { engine } = (window as any).sulk;
    engine.marines.forEach((m: any) => m.die());
    engine.checkVictory();
  });
  const dialog = page.locator('#end-dialog');
  await expect(dialog).toBeVisible();
  await expect(dialog).toHaveAttribute('data-result', 'loss');
  await expect(dialog.locator('h2')).toHaveText('Mission failed');
  await expect(dialog.locator('#end-retry')).toBeVisible();
  await expect(dialog.locator('#end-choose')).toBeVisible();
});

test('field manual: rules sections, marine quotes, and a map for every mission', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (err: Error) => errors.push(err.message));
  await page.goto('/manual.html');

  await expect(page.locator('.manual-header h1')).toHaveText('SULK');
  for (const heading of ['How a turn works', 'Moving', 'Overwatch', 'The heavy flamer', 'Close combat', 'Blips', 'Winning and losing', 'Controls', 'The missions']) {
    await expect(page.locator('h2', { hasText: heading })).toBeVisible();
  }

  // The squad's testimony
  expect(await page.locator('blockquote.marine-quote').count()).toBeGreaterThanOrEqual(4);

  // One TypeScript-rendered SVG map per registered mission (8 playable + debug_1)
  await expect(page.locator('.mission-map svg')).toHaveCount(9);
  await expect(page.locator('#map-legend')).toBeVisible();
  await expect(page.locator('#mission-space_hulk_1 h3')).toHaveText('Suicide Mission');
  await expect(page.locator('#mission-space_hulk_1 .mission-facts')).toContainText('Flame the Launch Control');

  // Version stamp in the manual footer too
  await expect(page.locator('#app-version')).toHaveText(/^(dev|v\d+\.\d+(\.\d+)?)$/);

  // Back to the game
  await page.click('#back-to-game');
  await page.waitForURL(url => !url.pathname.includes('manual'));
  await expect(page.locator('#home-overlay')).toBeVisible();

  expect(errors).toHaveLength(0);
});
