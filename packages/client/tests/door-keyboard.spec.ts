import { test, expect } from '@playwright/test';

/**
 * Auto door fire + target reticle (ISC-610/611/620/621, user reports
 * 2026-08-18): F shoots the hovered door first, else the nearest enemy, else
 * the nearest shootable closed door — regardless of where the pointer rests
 * (the v0.4.2 hover gate made the fallback unreachable in real play, since
 * any mouse move sets hoverCoord). A red reticle marks the door F would hit
 * BEFORE the press, so the fallback is never a surprise demolition.
 */

async function bootStaged(page: any) {
  await page.goto('/?mission=space_hulk_1&seed=1');
  await page.waitForFunction(() => (window as any).sulk?.scene?.hud !== undefined, undefined, { timeout: 15000 });
  await page.evaluate(() => {
    const { engine, scene, Selection, PieceEvents } = (window as any).sulk;
    const bolter = engine.marines.find((m: any) => m.spriteKey === 'terminator_storm_bolter');
    bolter.pos = { c: 17, r: 20 };
    bolter.facing = 1; // east, toward the closed Launch Control door (18,20)|(19,20)
    scene.pieceSprites[bolter.id].setPosition(17 * 40 + 20, 20 * 40 + 20);
    engine.state.board.dice.roll = () => 6; // pin every roll to a hit
    Selection.select(bolter.id);
    PieceEvents.emit('selected', {
      pieceId: bolter.id,
      ap: { apRemaining: bolter.apRemaining, apInitial: bolter.apInitial },
    });
    scene.refreshDoorReticle();
  });
}

const state = (page: any) => page.evaluate(() => {
  const { engine, scene } = (window as any).sulk;
  const door = engine.state.board.doorBetween({ c: 18, r: 20 }, { c: 19, r: 20 });
  const bolter = engine.marines.find((m: any) => m.spriteKey === 'terminator_storm_bolter');
  return { destroyed: door.destroyed, ap: bolter.ap, reticle: scene.doorReticleFor };
});

test('the reticle marks the fallback door, and F with no hover destroys it (ISC-610/620)', async ({ page }) => {
  await bootStaged(page);
  const before = await state(page);
  expect(before.reticle).toEqual({ x: 18, y: 20, facing: expect.any(Number) }); // door anchor marked
  await page.keyboard.press('f');
  await page.waitForTimeout(120);
  const after = await state(page);
  expect(after.destroyed).toBe(true);
  expect(after.ap).toBe(3);
  expect(after.reticle).toBeNull(); // target gone, reticle cleared
});

test('a pointer resting on a NON-door square no longer suppresses the fallback (ISC-621)', async ({ page }) => {
  await bootStaged(page);
  await page.evaluate(() => {
    const { scene } = (window as any).sulk;
    scene.hoverCoord = { x: 17, y: 19 }; // mouse parked on an empty square
    scene.refreshDoorReticle();
  });
  expect((await state(page)).reticle).not.toBeNull(); // fallback door still marked
  await page.keyboard.press('f');
  await page.waitForTimeout(120);
  const after = await state(page);
  expect(after.destroyed).toBe(true); // F auto-shoots the nearest door
  expect(after.ap).toBe(3);
});

test('a visible stealer takes the F shot before any door — and clears the reticle (ISC-611)', async ({ page }) => {
  await bootStaged(page);
  await page.evaluate(() => {
    const { engine, Genestealer, scene } = (window as any).sulk;
    new Genestealer(engine.state.board, { c: 18, r: 20 }, 0); // in the doorway mouth
    scene.refreshDoorReticle();
  });
  expect((await state(page)).reticle).toBeNull(); // enemy soaks the shot — no door target
  await page.keyboard.press('f');
  await page.waitForTimeout(120);
  const after = await state(page);
  const stealers = await page.evaluate(() =>
    (window as any).sulk.engine.state.board.pieces.filter((p: any) => p.kind === 'stealer').length);
  expect(stealers).toBe(0); // stealer died to the pinned 6s
  expect(after.destroyed).toBe(false); // the door was NOT the target
});
