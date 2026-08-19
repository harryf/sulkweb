import { test, expect } from '@playwright/test';

/**
 * Auto fire target + reticle (ISC-610/611/620/621, ISC-625..631, user reports
 * 2026-08-18/19): F shoots the hovered door first, else the nearest enemy,
 * else the nearest shootable closed door — regardless of where the pointer
 * rests (the v0.4.2 hover gate made the fallback unreachable in real play,
 * since any mouse move sets hoverCoord). A red reticle marks whatever F would
 * hit — enemy OR door — BEFORE the press, computed by the same fireTarget()
 * the shot uses, so the indicator can never diverge from the behavior.
 */

async function bootStaged(page: any) {
  await page.goto('/?deploy=0&mission=space_hulk_1&seed=1');
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
    scene.refreshFireReticle();
  });
}

const state = (page: any) => page.evaluate(() => {
  const { engine, scene } = (window as any).sulk;
  const door = engine.state.board.doorBetween({ c: 18, r: 20 }, { c: 19, r: 20 });
  const bolter = engine.marines.find((m: any) => m.spriteKey === 'terminator_storm_bolter');
  return { destroyed: door.destroyed, ap: bolter.ap, reticle: scene.fireReticleFor };
});

const stealerCount = (page: any) => page.evaluate(() =>
  (window as any).sulk.engine.state.board.pieces.filter((p: any) => p.kind === 'stealer').length);

test('the reticle marks the fallback door, and F with no hover destroys it (ISC-610/620/627)', async ({ page }) => {
  await bootStaged(page);
  const before = await state(page);
  expect(before.reticle).toEqual({
    kind: 'door', x: 18, y: 20, facing: expect.any(Number),
    cx: 760, cy: 820, // drawn at the door-edge midpoint between (18,20) and (19,20)
  });
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
    scene.refreshFireReticle();
  });
  expect((await state(page)).reticle).toEqual(expect.objectContaining({ kind: 'door' })); // fallback door still marked
  await page.keyboard.press('f');
  await page.waitForTimeout(120);
  const after = await state(page);
  expect(after.destroyed).toBe(true); // F auto-shoots the nearest door
  expect(after.ap).toBe(3);
});

test('a visible stealer wears the reticle and takes the F shot before any door (ISC-611/626)', async ({ page }) => {
  await bootStaged(page);
  const stealerId = await page.evaluate(() => {
    const { engine, Genestealer, scene } = (window as any).sulk;
    const s = new Genestealer(engine.state.board, { c: 18, r: 20 }, 0); // in the doorway mouth
    scene.refreshFireReticle();
    return s.id;
  });
  // The enemy soaks the shot — and the reticle SAYS so before the press,
  // drawn at the stealer's square centre.
  expect((await state(page)).reticle).toEqual({ kind: 'enemy', pieceId: stealerId, x: 18, y: 20, cx: 740, cy: 820 });
  await page.keyboard.press('f');
  await page.waitForTimeout(120);
  const after = await state(page);
  expect(await stealerCount(page)).toBe(0); // stealer died to the pinned 6s
  expect(after.destroyed).toBe(false); // the door was NOT the target
  expect(after.reticle?.pieceId).not.toBe(stealerId); // never a stale crosshair on a corpse (ISC-630)
});

test('a hovered closed door outranks a visible enemy, matching F priority (ISC-628)', async ({ page }) => {
  await bootStaged(page);
  await page.evaluate(() => {
    const { engine, Genestealer, scene } = (window as any).sulk;
    new Genestealer(engine.state.board, { c: 18, r: 20 }, 0);
    scene.hoverCoord = { x: 18, y: 20 }; // hovering the door's anchor square
    scene.refreshFireReticle();
  });
  expect((await state(page)).reticle).toEqual(
    expect.objectContaining({ kind: 'door', x: 18, y: 20 }));
});

test('with several enemies the reticle marks the NEAREST — and retargets after the kill (ISC-629/630)', async ({ page }) => {
  await bootStaged(page);
  // Both stealers on DIFFERENT rays inside the Launch Control room so they are
  // simultaneously shootable (collinear staging would let the near one block
  // LOS to the far one, and the distance sort would never be exercised).
  const ids = await page.evaluate(() => {
    const { engine, Genestealer, scene, Selection } = (window as any).sulk;
    const bolter = engine.findPiece(Selection.get());
    bolter.pos = { c: 19, r: 20 }; // inside the room, facing east
    scene.pieceSprites[bolter.id].setPosition(19 * 40 + 20, 20 * 40 + 20);
    const near = new Genestealer(engine.state.board, { c: 20, r: 19 }, 0); // dist ~1.41
    const far = new Genestealer(engine.state.board, { c: 21, r: 21 }, 0);  // dist ~2.24
    scene.refreshFireReticle();
    return {
      near: near.id,
      far: far.id,
      bothShootable: bolter.canShootPiece(near) && bolter.canShootPiece(far),
    };
  });
  expect(ids.bothShootable).toBe(true); // the sort has a real choice to make
  expect((await state(page)).reticle).toEqual({ kind: 'enemy', pieceId: ids.near, x: 20, y: 19, cx: 820, cy: 780 });
  await page.keyboard.press('f'); // pinned 6s: the near stealer dies
  await page.waitForTimeout(120);
  // The crosshair moves straight to the surviving far stealer.
  expect((await state(page)).reticle).toEqual(
    expect.objectContaining({ kind: 'enemy', pieceId: ids.far, x: 21, y: 21 }));
  expect(await stealerCount(page)).toBe(1);
});

test('no AP and no free shot means no reticle at all (ISC-631)', async ({ page }) => {
  await bootStaged(page);
  await page.evaluate(() => {
    const { engine, scene } = (window as any).sulk;
    const bolter = engine.marines.find((m: any) => m.spriteKey === 'terminator_storm_bolter');
    bolter.ap = 0;
    bolter.freeShot = false;
    scene.refreshFireReticle();
  });
  expect((await state(page)).reticle).toBeNull();
});
