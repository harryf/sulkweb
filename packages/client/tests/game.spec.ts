import { test, expect, type Page } from '@playwright/test';

/**
 * No-mock smoke test: real client, real engine, real browser.
 * This is the regression net the project was missing — mocked unit tests
 * asserted the mocks, not the game.
 */

async function waitForGame(page: Page) {
  await page.goto('/');
  await expect(page.locator('canvas')).toBeVisible();
  await page.waitForFunction(() => (window as any).sulk?.scene?.hud !== undefined, undefined, { timeout: 15000 });
}

test('boots Mission 1: board, squad of five, two blips, zero errors', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (err: Error) => errors.push(err.message));
  await waitForGame(page);
  const state = await page.evaluate(() => {
    const { engine } = (window as any).sulk;
    return {
      marines: engine.marines.length,
      enemies: engine.stealerSide.length,
      phase: engine.phase,
      turn: engine.turnNumber,
      cp: engine.cp,
    };
  });
  expect(state.marines).toBe(5);
  expect(state.enemies).toBe(2);
  expect(state.phase).toBe('MarineAction');
  expect(state.turn).toBe(1);
  expect(state.cp).toBeGreaterThanOrEqual(1);
  expect(errors).toHaveLength(0);
});

test('a full engine turn runs through the UI without errors', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (err: Error) => errors.push(err.message));
  await waitForGame(page);
  const after = await page.evaluate(() => {
    const { engine, Selection } = (window as any).sulk;
    const marine = engine.marines[0];
    Selection.toggle(marine.id);
    marine.moveForward();
    engine.endMarinePhase();
    return { turn: engine.turnNumber, enemies: engine.stealerSide.length, result: engine.state.result };
  });
  expect(after.turn).toBe(2);
  expect(after.enemies).toBeGreaterThan(2); // reinforcements arrived
  expect(after.result).toBe('ongoing');
  expect(errors).toHaveLength(0);
});

test('death events reach the HUD casualty counter', async ({ page }) => {
  await waitForGame(page);
  const hudText = await page.evaluate(() => {
    const { engine, scene } = (window as any).sulk;
    const enemy = engine.stealerSide[0];
    enemy.die();
    return scene.hud.casualtyText.text as string;
  });
  expect(hudText).toContain('Kills: 1');
});
