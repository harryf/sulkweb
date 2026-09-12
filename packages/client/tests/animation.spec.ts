import { test, expect } from '@playwright/test';
import { waitForGame, step } from './harness';

/**
 * The stealer side moves on the clock: with the client clock stopped, each
 * step(n) resolves engine ticks synchronously while the sprites tween to
 * their new squares afterwards, and every sprite settles on engine truth.
 */
test('stealers advance under the clock as visible sprite motion, then settle on engine truth', async ({ page }) => {
  // space_hulk_1: two initial blips guarantee stealer-side motion
  const errors = await waitForGame(page, 'mission=space_hulk_1&seed=1');

  // A stealer next to the squad is guaranteed to act every tick; kill the
  // marine AI's interest by keeping every marine leased (their default AI
  // would otherwise shoot it before the sprite has moved).
  const movingId = await page.evaluate(() => {
    const { sulk } = window as any;
    for (const m of sulk.engine.marines) m.lastCommandTick = 1e9;
    const s = new sulk.Genestealer(sulk.engine.state.board, { c: 10, r: 14 }, 0);
    return s.id as string;
  });
  const before = await page.evaluate((id: string) => {
    const spr = (window as any).sulk.scene.pieceSprites[id];
    return { x: spr.x, y: spr.y };
  }, movingId);
  await step(page, 3); // three actions of a full stealer: three squares north

  // ISC-86: the sprite is visibly in motion across frames
  const positions: string[] = [];
  for (let i = 0; i < 8; i++) {
    const p = await page.evaluate((id: string) => {
      const spr = (window as any).sulk.scene.pieceSprites[id];
      return spr ? { x: spr.x, y: spr.y } : null;
    }, movingId);
    if (p) positions.push(`${Math.round(p.x)},${Math.round(p.y)}`);
    if (i === 2) await page.screenshot({ path: 'test-results/stealer-mid-animation.png' });
    await page.waitForTimeout(60);
  }
  expect(new Set(positions).size).toBeGreaterThan(1);
  const moved = await page.evaluate((id: string) => (window as any).sulk.engine.findPiece(id)?.pos, movingId);
  expect(moved.r).toBeLessThan(14); // the engine moved it at once; the sprite catches up over frames
  void before;

  // Every sprite settles on engine truth (ISC-92)
  await page.waitForTimeout(600);
  const drift = await page.evaluate(() => {
    const { scene, engine } = (window as any).sulk;
    const T = 40;
    const bad: string[] = [];
    for (const p of engine.state.board.pieces) {
      const spr = scene.pieceSprites[p.id];
      if (!spr) { bad.push(`${p.id}:no-sprite`); continue; }
      if (spr.x !== p.pos.c * T + T / 2 || spr.y !== p.pos.r * T + T / 2) bad.push(`${p.id}:pos`);
      const expectedTex = p.spriteKey ?? (p.kind === 'stealer' ? 'stealer' : p.kind === 'blip' ? 'blip' : 'terminator_storm_bolter');
      if (spr.texture.key !== expectedTex) bad.push(`${p.id}:tex`);
    }
    return bad;
  });
  expect(drift).toEqual([]);

  // Mission surfacing: the BURN objective marker on the map, objective in the HUD
  const surfacing = await page.evaluate(() => {
    const { scene } = (window as any).sulk;
    return {
      objectiveMarker: scene.children.list.some((o: any) => o.text === 'BURN'),
      objective: scene.hud.objectiveText?.text ?? '',
    };
  });
  expect(surfacing.objectiveMarker).toBe(true);
  expect(surfacing.objective).toContain('FLAME');
  await page.screenshot({ path: 'test-results/markers-and-objective.png' });
  expect(errors).toHaveLength(0);
});
