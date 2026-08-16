import { test, expect } from '@playwright/test';

/**
 * Two-press flamer targeting + aimed door shooting + ducting orientation
 * (ISC-338..341/343/344/346/355/357/358) — real browser, real key events.
 */

test('flamer two-press targeting: arm, aim with preview, fire into the square', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (err: Error) => errors.push(err.message));
  await page.goto('/?mission=space_hulk_1&seed=1');
  await page.waitForFunction(() => (window as any).sulk?.scene?.hud !== undefined, undefined, { timeout: 15000 });

  // Stage the board state used across the existing flamer-ui suite: flamer in
  // the east corridor, facing the open door into Launch Control's room.
  await page.evaluate(() => {
    const { engine, scene, Selection, PieceEvents } = (window as any).sulk;
    const board = engine.state.board;
    const flamer = engine.marines.find((m: any) => m.spriteKey === 'terminator_heavy_flamer');
    flamer.pos = { c: 17, r: 20 };
    flamer.facing = 1; // east
    scene.pieceSprites[flamer.id].setPosition(17 * 40 + 20, 20 * 40 + 20);
    board.doorBetween({ c: 18, r: 20 }, { c: 19, r: 20 }).open();
    Selection.select(flamer.id);
    PieceEvents.emit('selected', {
      pieceId: flamer.id,
      ap: { apRemaining: flamer.apRemaining, apInitial: flamer.apInitial },
      ammo: flamer.ammo,
    });
  });

  // First F arms — no AP or ammo spent (ISC-338).
  await page.keyboard.press('f');
  await page.waitForTimeout(80);
  await expect.poll(() => page.evaluate(() => (window as any).sulk.scene.flamerAiming)).toBe(true);
  expect(await page.evaluate(() => {
    const { engine } = (window as any).sulk;
    const flamer = engine.marines.find((m: any) => m.spriteKey === 'terminator_heavy_flamer');
    return { ap: flamer.ap, ammo: flamer.ammo };
  })).toEqual({ ap: 4, ammo: 6 });

  // Valid hover: crosshair + the engine's exact flood as preview (ISC-339/340).
  const valid = await page.evaluate(() => {
    const { scene, engine } = (window as any).sulk;
    scene.hoverCoord = { x: 20, y: 20 };
    scene.refreshAimUI();
    return {
      cursor: engine ? scene.game.canvas.style.cursor : '',
      preview: scene.flamePreview.length,
    };
  });
  expect(valid.cursor).toBe('crosshair');
  // 3x3 room + the (18,20) door-anchor square (its edge is OPEN here, so the
  // flood legally reaches it) — same 10 squares the flamer-ui spec burns.
  expect(valid.preview).toBe(10);

  // Invalid hover: not-allowed cursor; F stays armed and spends nothing (ISC-343).
  await page.evaluate(() => {
    const { scene } = (window as any).sulk;
    scene.hoverCoord = { x: 17, y: 20 }; // the flamer's own square
    scene.refreshAimUI();
  });
  expect(await page.evaluate(() => (window as any).sulk.scene.game.canvas.style.cursor)).toBe('not-allowed');
  await page.keyboard.press('f');
  await page.waitForTimeout(80);
  expect(await page.evaluate(() => {
    const { scene, engine } = (window as any).sulk;
    const flamer = engine.marines.find((m: any) => m.spriteKey === 'terminator_heavy_flamer');
    return { aiming: scene.flamerAiming, ap: flamer.ap, flaming: engine.state.board.flaming.size };
  })).toEqual({ aiming: true, ap: 4, flaming: 0 });

  // A movement key cancels the aim without firing (ISC-344).
  await page.keyboard.press('a');
  await page.waitForTimeout(80);
  await expect.poll(() => page.evaluate(() => (window as any).sulk.scene.flamerAiming)).toBe(false);
  await page.keyboard.press('d'); // face east again (turn back)
  await page.waitForTimeout(80);

  // Re-arm, hover the objective, second F fires INTO that square (ISC-341/346).
  await page.keyboard.press('f');
  await page.waitForTimeout(80);
  await page.evaluate(() => {
    const { scene } = (window as any).sulk;
    scene.hoverCoord = { x: 20, y: 20 };
    scene.refreshAimUI();
  });
  await page.keyboard.press('f');
  await page.waitForTimeout(80);
  const fired = await page.evaluate(() => {
    const { scene, engine } = (window as any).sulk;
    const flamer = engine.marines.find((m: any) => m.spriteKey === 'terminator_heavy_flamer');
    return {
      aiming: scene.flamerAiming,
      burning: engine.state.board.isFlaming({ c: 20, r: 20 }),
      result: engine.state.result,
      ap: flamer.ap, ammo: flamer.ammo,
      cursor: scene.game.canvas.style.cursor,
    };
  });
  expect(fired).toEqual({ aiming: false, burning: true, result: 'win', ap: 0, ammo: 5, cursor: 'default' });
  expect(errors).toEqual([]);
});

test('hovering a shootable closed door and pressing F shoots the door (ISC-355)', async ({ page }) => {
  await page.goto('/?mission=space_hulk_1&seed=1');
  await page.waitForFunction(() => (window as any).sulk?.scene?.hud !== undefined, undefined, { timeout: 15000 });
  await page.evaluate(() => {
    const { engine, scene, Selection, PieceEvents } = (window as any).sulk;
    const board = engine.state.board;
    const bolter = engine.marines.find((m: any) => m.spriteKey === 'terminator_storm_bolter');
    bolter.pos = { c: 17, r: 20 };
    bolter.facing = 1; // east, toward the closed Launch Control door
    scene.pieceSprites[bolter.id].setPosition(17 * 40 + 20, 20 * 40 + 20);
    board.dice.roll = () => 6; // pin the destroy roll
    Selection.select(bolter.id);
    PieceEvents.emit('selected', {
      pieceId: bolter.id,
      ap: { apRemaining: bolter.apRemaining, apInitial: bolter.apInitial },
    });
    scene.hoverCoord = { x: 18, y: 20 }; // flanking square of the door edge
  });
  await page.keyboard.press('f');
  await page.waitForTimeout(80);
  const after = await page.evaluate(() => {
    const { engine, scene } = (window as any).sulk;
    const door = engine.state.board.doorBetween({ c: 18, r: 20 }, { c: 19, r: 20 });
    const bolter = engine.marines.find((m: any) => m.spriteKey === 'terminator_storm_bolter');
    return {
      destroyed: door.destroyed,
      ap: bolter.ap,
      sprite: Object.keys(scene.doorSprites).some((k: string) => k.startsWith('19,20') || k.startsWith('18,20')),
    };
  });
  expect(after.destroyed).toBe(true);
  expect(after.ap).toBe(3);
  expect(after.sprite).toBe(false); // doorDestroyed removed the sprite
});

test('space_hulk_6 ducting run renders as one horizontal pipe (ISC-357/358)', async ({ page }) => {
  await page.goto('/?mission=space_hulk_6&seed=1');
  await page.waitForFunction(() => (window as any).sulk?.scene?.hud !== undefined, undefined, { timeout: 15000 });
  const ducts = await page.evaluate(() => {
    const { scene, PieceEvents } = (window as any).sulk;
    const rotations = ['13,0', '14,0', '15,0'].map((k: string) => scene.ductingSprites[k]?.rotation);
    PieceEvents.emit('ductingDestroyed', { x: 14, y: 0 });
    const destroyed = scene.ductingSprites['14,0'];
    return { rotations, tex: destroyed.texture.key, rotKept: destroyed.rotation };
  });
  expect(ducts.rotations).toEqual([Math.PI / 2, Math.PI / 2, Math.PI / 2]);
  expect(ducts.tex).toBe('ducting_destroyed');
  expect(ducts.rotKept).toBe(Math.PI / 2);
});
