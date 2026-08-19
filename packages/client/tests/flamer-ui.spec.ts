import { test, expect } from '@playwright/test';

/**
 * UI fidelity for the restored original force & objective (ISC-142/148..153):
 * sergeant + heavy flamer sprites, ammo readout, flame rendering, jam marker,
 * dice readout, and the flame-win overlay — real browser, no mocks.
 */
test('sergeant & flamer render; flaming Launch Control wins with flames on screen', async ({ page }) => {
  test.setTimeout(120000);
  const errors: string[] = [];
  page.on('pageerror', (err: Error) => errors.push(err.message));
  await page.goto('/?deploy=0&mission=space_hulk_1&seed=1');
  await expect(page.locator('canvas')).toBeVisible();
  await page.waitForFunction(() => (window as any).sulk?.scene?.hud !== undefined, undefined, { timeout: 15000 });

  // The squad renders its variant textures (ISC-142)
  const textures = await page.evaluate(() => {
    const { engine, scene } = (window as any).sulk;
    return engine.marines.map((m: any) => scene.pieceSprites[m.id]?.texture?.key).sort();
  });
  expect(textures).toEqual([
    'terminator_heavy_flamer', 'terminator_sergeant',
    'terminator_storm_bolter', 'terminator_storm_bolter', 'terminator_storm_bolter',
  ]);

  // The flamer's ammo readout lives on its ROSTER CARD; the HUD is
  // mission-level only and carries no AP line (ISC-150 → ISC-385/386)
  const flamerId = await page.evaluate(() => {
    const { engine, scene } = (window as any).sulk;
    return {
      id: engine.marines.find((m: any) => m.spriteKey === 'terminator_heavy_flamer').id,
      hudApText: (scene.hud as any).apText, // must be gone
    };
  });
  expect(flamerId.hudApText).toBeUndefined();
  await expect(page.locator(`.marine-card[data-piece-id="${flamerId.id}"] .m-ammo`)).toHaveText('Ammo 6');

  // Jam marker + dice readout wiring (ISC-149/151): pure event-view contracts
  const hudWiring = await page.evaluate(() => {
    const { engine, scene, PieceEvents } = (window as any).sulk;
    const bolter = engine.marines.find((m: any) => m.spriteKey === 'terminator_storm_bolter');
    PieceEvents.emit('jammed', { pieceId: bolter.id, jammed: true });
    const marker = !!scene.jamMarkers[bolter.id];
    PieceEvents.emit('jammed', { pieceId: bolter.id, jammed: false });
    const cleared = !scene.jamMarkers[bolter.id];
    PieceEvents.emit('shot', { shooterId: bolter.id, targetId: 'x', x: 0, y: 0, rolls: [6, 2], hit: true });
    return { marker, cleared, dice: scene.hud.diceText.text as string };
  });
  expect(hudWiring.marker).toBe(true);
  expect(hudWiring.cleared).toBe(true);
  expect(hudWiring.dice).toContain('6 2');

  // Walk the flamer to the firing corridor by engine surgery (UI probe, not a
  // rules claim — the rules path is covered by engine tests), then flame.
  const finale = await page.evaluate(() => {
    const { engine, scene } = (window as any).sulk;
    const board = engine.state.board;
    const flamer = engine.marines.find((m: any) => m.spriteKey === 'terminator_heavy_flamer');
    flamer.pos = { c: 17, r: 20 };
    flamer.facing = 1; // east
    scene.pieceSprites[flamer.id].setPosition(17 * 40 + 20, 20 * 40 + 20);
    board.doorBetween({ c: 18, r: 20 }, { c: 19, r: 20 }).open();
    const lc = board.get(20, 20);
    const ok = flamer.canFlame(lc);
    if (ok) flamer.flameAt(lc);
    return {
      ok,
      result: engine.state.result,
      flameSprites: Object.keys(scene.flameSprites).length,
      hover: scene.describeSquare(20, 20),
    };
  });
  expect(finale.ok).toBe(true);
  expect(finale.result).toBe('win');           // flame-objective victory (ISC-145 UI)
  // 3x3 room + the (18,20) door-anchor square (its door edge is OPEN here,
  // so the flood legally reaches it) = 10 burning squares on screen (ISC-148)
  expect(finale.flameSprites).toBe(10);
  expect(finale.hover).toContain('ON FIRE');
  expect(finale.hover).toContain('OBJECTIVE');
  await page.waitForTimeout(300);
  const overlay = await page.evaluate(() =>
    (window as any).sulk.scene.children.list.some((o: any) => o.text === 'MISSION COMPLETE'));
  expect(overlay).toBe(true);
  await page.screenshot({ path: 'test-results/flame-victory.png' });
  expect(errors).toEqual([]);
});
