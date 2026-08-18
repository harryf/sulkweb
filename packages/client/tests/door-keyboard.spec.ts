import { test, expect } from '@playwright/test';

/**
 * Keyboard door shooting (ISC-610/611, user report 2026-08-18): F with no
 * hover used to do NOTHING when a closed door sat in the fire arc — the
 * fallback now shoots the nearest shootable closed door. Enemy targets keep
 * priority: a visible stealer soaks the shot before any door does.
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
  });
}

test('F with NO hover shoots the nearest closed door in arc (ISC-610)', async ({ page }) => {
  await bootStaged(page);
  // No mouse movement at all — hoverCoord stays null (pure keyboard play).
  expect(await page.evaluate(() => (window as any).sulk.scene.hoverCoord)).toBeNull();
  await page.keyboard.press('f');
  await page.waitForTimeout(120);
  const after = await page.evaluate(() => {
    const { engine } = (window as any).sulk;
    const door = engine.state.board.doorBetween({ c: 18, r: 20 }, { c: 19, r: 20 });
    const bolter = engine.marines.find((m: any) => m.spriteKey === 'terminator_storm_bolter');
    return { destroyed: door.destroyed, ap: bolter.ap };
  });
  expect(after.destroyed).toBe(true);
  expect(after.ap).toBe(3);
});

test('hovering a non-door square suppresses the fallback — F stays a no-op (ISC-615)', async ({ page }) => {
  await bootStaged(page);
  await page.evaluate(() => {
    // A mouse player resting the pointer on an empty square must never
    // demolish an unhovered door with a stray F.
    (window as any).sulk.scene.hoverCoord = { x: 17, y: 19 };
  });
  await page.keyboard.press('f');
  await page.waitForTimeout(120);
  const after = await page.evaluate(() => {
    const { engine } = (window as any).sulk;
    const door = engine.state.board.doorBetween({ c: 18, r: 20 }, { c: 19, r: 20 });
    const bolter = engine.marines.find((m: any) => m.spriteKey === 'terminator_storm_bolter');
    return { destroyed: door.destroyed, ap: bolter.ap };
  });
  expect(after.destroyed).toBe(false);
  expect(after.ap).toBe(4); // nothing spent
});

test('a visible stealer takes the F shot before any door does (ISC-611)', async ({ page }) => {
  await bootStaged(page);
  await page.evaluate(() => {
    const { engine, Genestealer } = (window as any).sulk;
    const board = engine.state.board;
    new Genestealer(board, { c: 18, r: 20 }, 0); // in the doorway mouth, straight ahead
  });
  await page.keyboard.press('f');
  await page.waitForTimeout(120);
  const after = await page.evaluate(() => {
    const { engine } = (window as any).sulk;
    const door = engine.state.board.doorBetween({ c: 18, r: 20 }, { c: 19, r: 20 });
    const stealers = engine.state.board.pieces.filter((p: any) => p.kind === 'stealer');
    return { destroyed: door.destroyed, stealersAlive: stealers.length };
  });
  expect(after.stealersAlive).toBe(0); // stealer died to the pinned 6s
  expect(after.destroyed).toBe(false); // the door was NOT the target
});
