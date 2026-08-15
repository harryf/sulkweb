import { test, expect } from '@playwright/test';

/**
 * Mission 2 "Exterminate" UI fidelity (ISC-180/181/182): the 204-square board
 * loads, squad Constantine renders its five variant sprites, the HUD shows the
 * kill-quota counter and objective, and reaching the quota wins on screen.
 */
test('space_hulk_2 renders with kill counter; quota reached wins', async ({ page }) => {
  test.setTimeout(120000);
  const errors: string[] = [];
  page.on('pageerror', (err: Error) => errors.push(err.message));
  await page.goto('/?mission=space_hulk_2&seed=1');
  await expect(page.locator('canvas')).toBeVisible();
  await page.waitForFunction(() => (window as any).sulk?.scene?.hud !== undefined, undefined, { timeout: 15000 });

  // Board + squad (ISC-182)
  const setup = await page.evaluate(() => {
    const { engine, scene } = (window as any).sulk;
    return {
      squares: engine.state.board.grid.size,
      textures: engine.marines.map((m: any) => scene.pieceSprites[m.id]?.texture?.key).sort(),
      kills: scene.hud.casualtyText.text as string,
      objective: scene.hud.objectiveText.text as string,
    };
  });
  expect(setup.squares).toBe(204);
  expect(setup.textures).toEqual([
    'terminator_heavy_flamer', 'terminator_sergeant',
    'terminator_storm_bolter', 'terminator_storm_bolter', 'terminator_storm_bolter',
  ]);
  // Kill counter shows the quota from turn one (ISC-180)
  expect(setup.kills).toContain('Kills: 0/30');
  // Objective label names the mission-2 victory (ISC-181)
  expect(setup.objective).toContain('KILL 30');
  expect(setup.objective.toLowerCase()).toContain('blockade');

  // The toll display tracks casualtiesChanged (view contract), VALUE-weighted.
  const tollLine = await page.evaluate(() => {
    const { scene, PieceEvents } = (window as any).sulk;
    PieceEvents.emit('casualtiesChanged', { casualties: 7 });
    return scene.hud.casualtyText.text as string;
  });
  expect(tollLine).toContain('Kills: 7/30');

  // Engine surgery: put the toll at the quota and run the victory check —
  // the real kill paths are covered by quota_victory.spec; this probes the
  // engine→overlay wiring in the browser.
  const finale = await page.evaluate(() => {
    const { engine } = (window as any).sulk;
    engine.state.board.stealerCasualties = 30;
    engine.checkVictory();
    return engine.state.result;
  });
  expect(finale).toBe('win');
  await page.waitForTimeout(300);
  const overlay = await page.evaluate(() =>
    (window as any).sulk.scene.children.list.some((o: any) => o.text === 'MISSION COMPLETE'));
  expect(overlay).toBe(true);
  await page.screenshot({ path: 'test-results/mission2.png' });
  expect(errors).toEqual([]);
});
