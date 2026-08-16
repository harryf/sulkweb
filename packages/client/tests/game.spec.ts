import { test, expect, type Page } from '@playwright/test';

/**
 * No-mock smoke test: real client, real engine, real browser.
 * This is the regression net the project was missing — mocked unit tests
 * asserted the mocks, not the game.
 */

async function waitForGame(page: Page, url = '/?mission=space_hulk_1') {
  // This spec exercises the full space_hulk_1 scenario (squad of five, two
  // blips); the client's DEFAULT mission is debug_1 — covered separately below.
  await page.goto(url);
  await expect(page.locator('canvas')).toBeVisible();
  await page.waitForFunction(() => (window as any).sulk?.scene?.hud !== undefined, undefined, { timeout: 15000 });
}

test('default mission is debug_1; ?mission= selects space_hulk_1', async ({ page }) => {
  await waitForGame(page, '/');
  const dbg = await page.evaluate(() => {
    const { engine } = (window as any).sulk;
    return { name: engine.mission.name, marines: engine.marines.length, enemies: engine.stealerSide.length };
  });
  expect(dbg.name).toBe('Suicide Mission with no forces');
  expect(dbg.marines).toBe(1); // lone storm-bolter marine at BEGINPLACE
  expect(dbg.enemies).toBe(0); // BLIPS = (0, 1)

  await waitForGame(page, '/?mission=space_hulk_1');
  const hulk = await page.evaluate(() => (window as any).sulk.engine.mission.name);
  expect(hulk).toBe('Suicide Mission');
});

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
    // Regression (2026-08-14): pieces added after boot must render with their
    // own texture, never the marine fallback ("DONE spawns marines" bug).
    const scene = (window as any).sulk.scene;
    const impostors = engine.state.board.pieces
      .filter((p: any) => p.kind !== 'marine')
      .filter((p: any) => scene.pieceSprites[p.id]?.texture?.key === 'terminator_storm_bolter')
      .map((p: any) => p.id);
    return { turn: engine.turnNumber, enemies: engine.stealerSide.length, result: engine.state.result, impostors };
  });
  expect(after.turn).toBe(2);
  expect(after.enemies).toBeGreaterThan(2); // reinforcements arrived
  expect(after.impostors).toEqual([]); // no non-marine wears the marine texture
  expect(after.result).toBe('ongoing');
  expect(errors).toHaveLength(0);
});

test('minimap viewport box stays inside the minimap on narrow maps (ISC-382)', async ({ page }) => {
  // Regression (2026-08-16): on space_hulk_1/beta_2 the camera sees more
  // world than the narrow board contains; the projected box overflowed the
  // minimap's right edge. Probe the rect actually drawn (Minimap.lastBox).
  for (const mission of ['space_hulk_1', 'beta_2']) {
    await waitForGame(page, `/?mission=${mission}`);
    for (const cx of [0, 0.5, 1]) {
      const probe = await page.evaluate(async (frac: number) => {
        const { scene, engine } = (window as any).sulk;
        const cam = scene.cameras.main;
        const boardW = engine.state.board.width * 40;
        const boardH = engine.state.board.height * 40;
        cam.centerOn(boardW * frac, boardH * frac);
        await new Promise(r => setTimeout(r, 100)); // let updateCam run
        const mini = scene.hud.miniMap;
        return { box: mini.lastBox, w: mini.width, h: mini.height };
      }, cx);
      expect(probe.box).not.toBeNull();
      expect(probe.box.x + probe.box.w).toBeLessThanOrEqual(probe.w);
      expect(probe.box.y + probe.box.h).toBeLessThanOrEqual(probe.h);
      expect(probe.box.x).toBeGreaterThanOrEqual(0);
      expect(probe.box.y).toBeGreaterThanOrEqual(0);
    }
  }
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
