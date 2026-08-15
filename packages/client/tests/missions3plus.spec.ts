import { test, expect } from '@playwright/test';

/**
 * The five completed missions boot in a real browser with their objective
 * labels, status counters, and exotic objects on screen (ISC-237/238/245);
 * mission 3's draw state reaches the overlay (ISC-239/204).
 */

const BOOTS: { name: string; squares: number; marines: number; objective: string; status: string }[] = [
  { name: 'space_hulk_3', squares: 151, marines: 10, objective: 'ESCORT the C.A.T.', status: 'Escaped: 0' },
  { name: 'space_hulk_4', squares: 182, marines: 10, objective: 'FLAME both Gene Banks', status: 'Cleansed: 0/2' },
  { name: 'space_hulk_5', squares: 158, marines: 10, objective: 'ESCAPE 5 marines', status: 'Escaped: 0/5' },
  { name: 'space_hulk_6', squares: 192, marines: 10, objective: 'DEFEND the ducting', status: 'Hold until turn 16' },
  { name: 'beta_1', squares: 192, marines: 5, objective: 'GET one marine out', status: 'Escaped: 0/1' },
];

for (const b of BOOTS) {
  test(`${b.name} boots: board, squad, objective, status line, zero errors`, async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (err: Error) => errors.push(err.message));
    await page.goto(`/?mission=${b.name}&seed=1`);
    await expect(page.locator('canvas')).toBeVisible();
    await page.waitForFunction(() => (window as any).sulk?.scene?.hud !== undefined, undefined, { timeout: 15000 });
    const state = await page.evaluate(() => {
      const { engine, scene } = (window as any).sulk;
      return {
        squares: engine.state.board.grid.size,
        marines: engine.marines.length,
        objective: scene.hud.objectiveText.text as string,
        status: scene.hud.statusText.text as string,
        catSprite: !!scene.catSprite,
        ducting: Object.keys(scene.ductingSprites).length,
      };
    });
    expect(state.squares).toBe(b.squares);
    expect(state.marines).toBe(b.marines);
    expect(state.objective).toContain(b.objective);
    expect(state.status).toContain(b.status);
    if (b.name === 'space_hulk_3') expect(state.catSprite).toBe(true);   // cat.png on the board (ISC-238)
    if (b.name === 'space_hulk_6') expect(state.ducting).toBe(3);        // ducting sprites (ISC-238)
    expect(errors).toEqual([]);
  });
}

test('mission 3 draw state reaches the overlay (ISC-239)', async ({ page }) => {
  await page.goto('/?mission=space_hulk_3&seed=1');
  await page.waitForFunction(() => (window as any).sulk?.scene?.hud !== undefined, undefined, { timeout: 15000 });
  const result = await page.evaluate(() => {
    const { engine } = (window as any).sulk;
    engine.state.board.cat.damaged = true;
    engine.state.board.cat.escaped = true;
    engine.checkVictory();
    return engine.state.result;
  });
  expect(result).toBe('draw');
  await page.waitForTimeout(300);
  const overlay = await page.evaluate(() =>
    (window as any).sulk.scene.children.list.some((o: any) => o.text === 'MISSION DRAWN'));
  expect(overlay).toBe(true);
  await page.screenshot({ path: 'test-results/mission3-draw.png' });
});
