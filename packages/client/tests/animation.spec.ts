import { test, expect, type Page } from '@playwright/test';

async function waitForGame(page: Page) {
  // space_hulk_1: two initial blips guarantee visible stealer-phase motion
  await page.goto('/?mission=space_hulk_1&seed=1'); // pinned — deterministic replay content
  await expect(page.locator('canvas')).toBeVisible();
  await page.waitForFunction(() => (window as any).sulk?.scene?.hud !== undefined, undefined, { timeout: 15000 });
}

test('stealer phase replays as a visible animation, then reconciles', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (err: Error) => errors.push(err.message));
  await waitForGame(page);

  // Kick the turn through the scene's own endTurn (same path as DONE/Enter)
  const kickoff = await page.evaluate(() => {
    const { scene, engine } = (window as any).sulk;
    const before = engine.turnNumber;
    (scene as any).endTurn();
    // engine resolves synchronously; the VIEW should still be animating
    const blip = engine.state.board.pieces.find((p: any) => p.kind !== 'marine');
    return { before, after: engine.turnNumber, animating: (scene as any).animating, movingId: blip?.id };
  });
  expect(kickoff.after).toBe(kickoff.before + 1);
  expect(kickoff.animating).toBe(true); // ISC-87

  // ISC-93: ending the turn again mid-animation must be ignored
  const doubleEnd = await page.evaluate(() => {
    const { scene, engine } = (window as any).sulk;
    (scene as any).endTurn();
    return engine.turnNumber;
  });
  expect(doubleEnd).toBe(kickoff.after);

  // ISC-86: a sprite is visibly in motion — sample its position twice
  const sample = () => page.evaluate((id: string) => {
    const spr = (window as any).sulk.scene.pieceSprites[id];
    return spr ? { x: spr.x, y: spr.y } : null;
  }, kickoff.movingId!);
  const positions: string[] = [];
  for (let i = 0; i < 8; i++) {
    const p = await sample();
    if (p) positions.push(`${Math.round(p.x)},${Math.round(p.y)}`);
    if (i === 3) await page.screenshot({ path: 'test-results/stealer-phase-mid-animation.png' });
    await page.waitForTimeout(120);
  }
  expect(new Set(positions).size).toBeGreaterThan(1); // it MOVED across samples

  // Replay ends and every sprite matches engine truth (ISC-92)
  await page.waitForFunction(() => !(window as any).sulk.scene.animating, undefined, { timeout: 30000 });
  const drift = await page.evaluate(() => {
    const { scene, engine } = (window as any).sulk;
    const T = 40;
    const bad: string[] = [];
    for (const p of engine.state.board.pieces) {
      const spr = scene.pieceSprites[p.id];
      if (!spr) { bad.push(`${p.id}:no-sprite`); continue; }
      if (spr.x !== p.pos.c * T + T / 2 || spr.y !== p.pos.r * T + T / 2) bad.push(`${p.id}:pos`);
      const expectedTex = p.kind === 'stealer' ? 'stealer' : p.kind === 'blip' ? 'blip' : 'terminator_storm_bolter';
      if (spr.texture.key !== expectedTex) bad.push(`${p.id}:tex`);
    }
    return bad;
  });
  expect(drift).toEqual([]);

  // Mission surfacing: EXIT marker on the map, objective in the HUD
  const surfacing = await page.evaluate(() => {
    const { scene } = (window as any).sulk;
    return {
      exitMarker: scene.children.list.some((o: any) => o.text === 'EXIT'),
      objective: scene.hud.objectiveText?.text ?? '',
    };
  });
  expect(surfacing.exitMarker).toBe(true);
  expect(surfacing.objective).toContain('Objective');
  await page.screenshot({ path: 'test-results/markers-and-objective.png' });
  expect(errors).toHaveLength(0);
});
