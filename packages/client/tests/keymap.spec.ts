import { test, expect } from '@playwright/test';

/**
 * Rebound keyboard (ISC-361..363/368..372, remapped ISC-636..639): the
 * QWE/AD/ZXC directional circle (Z back-left, X back, C back-right), S door
 * with H as the legacy alias, M melee, O overwatch, B×2 self-destruct with
 * confirm. Real key events, 80ms+ apart — Phaser replays keydowns under
 * machine-speed input (see CLAUDE.md).
 */

async function boot(page: import('@playwright/test').Page) {
  await page.goto('/?mission=space_hulk_1&seed=1');
  await page.waitForFunction(() => (window as any).sulk?.scene?.hud !== undefined, undefined, { timeout: 15000 });
}

const press = async (page: import('@playwright/test').Page, key: string) => {
  await page.keyboard.press(key);
  await page.waitForTimeout(90);
};

test('Q/E/Z/C move diagonally at forward/backward cost, facing kept (ISC-636)', async ({ page }) => {
  await boot(page);
  await page.evaluate(() => {
    const { engine, scene, Selection, PieceEvents } = (window as any).sulk;
    const bolter = engine.marines.find((m: any) => m.spriteKey === 'terminator_storm_bolter');
    bolter.pos = { c: 20, r: 20 }; // centre of the 3x3 Launch Control room
    bolter.facing = 0; // north
    scene.pieceSprites[bolter.id].setPosition(20 * 40 + 20, 20 * 40 + 20);
    Selection.select(bolter.id);
    PieceEvents.emit('selected', { pieceId: bolter.id, ap: { apRemaining: 4, apInitial: 4 } });
    (window as any).probe = () => ({ pos: { ...bolter.pos }, ap: bolter.ap, facing: bolter.facing });
  });

  await press(page, 'q'); // forward-left: (19,19), 1 AP
  expect(await page.evaluate(() => (window as any).probe())).toEqual({ pos: { c: 19, r: 19 }, ap: 3, facing: 0 });
  await press(page, 'c'); // back-right: (20,20), 2 AP
  expect(await page.evaluate(() => (window as any).probe())).toEqual({ pos: { c: 20, r: 20 }, ap: 1, facing: 0 });
  // Z gets its own POSITIVE move with AP in hand — a refused-at-0 press cannot
  // tell back-left from back-right (review 2026-08-19).
  await page.evaluate(() => {
    const { engine } = (window as any).sulk;
    engine.marines.find((m: any) => m.spriteKey === 'terminator_storm_bolter').ap = 4;
  });
  await press(page, 'z'); // back-left: (19,21), 2 AP
  expect(await page.evaluate(() => (window as any).probe())).toEqual({ pos: { c: 19, r: 21 }, ap: 2, facing: 0 });
  await press(page, 'e'); // forward-right: (20,20), 1 AP
  expect(await page.evaluate(() => (window as any).probe())).toEqual({ pos: { c: 20, r: 20 }, ap: 1, facing: 0 });
  await press(page, 'c'); // back-right needs 2 AP — refused at 1
  expect(await page.evaluate(() => (window as any).probe())).toEqual({ pos: { c: 20, r: 20 }, ap: 1, facing: 0 });
});

test('X moves straight backward at 2 AP, facing kept (ISC-637)', async ({ page }) => {
  await boot(page);
  await page.evaluate(() => {
    const { engine, scene, Selection, PieceEvents } = (window as any).sulk;
    const bolter = engine.marines.find((m: any) => m.spriteKey === 'terminator_storm_bolter');
    bolter.pos = { c: 20, r: 20 }; // centre of the 3x3 Launch Control room
    bolter.facing = 0; // north — backward is south
    scene.pieceSprites[bolter.id].setPosition(20 * 40 + 20, 20 * 40 + 20);
    Selection.select(bolter.id);
    PieceEvents.emit('selected', { pieceId: bolter.id, ap: { apRemaining: 4, apInitial: 4 } });
    (window as any).probe = () => ({ pos: { ...bolter.pos }, ap: bolter.ap, facing: bolter.facing });
  });
  await press(page, 'x');
  expect(await page.evaluate(() => (window as any).probe())).toEqual({ pos: { c: 20, r: 21 }, ap: 2, facing: 0 });
});

test('O toggles overwatch, S works doors with H as alias, M is melee (ISC-638/639)', async ({ page }) => {
  await boot(page);
  await page.evaluate(() => {
    const { engine, scene, Selection, PieceEvents } = (window as any).sulk;
    const bolter = engine.marines.find((m: any) => m.spriteKey === 'terminator_storm_bolter');
    bolter.pos = { c: 17, r: 20 };
    bolter.facing = 1; // east — Launch Control door reachable ahead
    scene.pieceSprites[bolter.id].setPosition(17 * 40 + 20, 20 * 40 + 20);
    Selection.select(bolter.id);
    PieceEvents.emit('selected', { pieceId: bolter.id, ap: { apRemaining: 4, apInitial: 4 } });
    (window as any).cc = 0;
    PieceEvents.on('closeCombat', () => (window as any).cc++);
  });

  await press(page, 'o'); // overwatch on (2 AP)
  expect(await page.evaluate(() => {
    const { engine } = (window as any).sulk;
    return engine.marines.find((m: any) => m.spriteKey === 'terminator_storm_bolter').overwatch;
  })).toBe(true);
  await press(page, 'o'); // and off again (free)
  expect(await page.evaluate(() => {
    const { engine } = (window as any).sulk;
    return engine.marines.find((m: any) => m.spriteKey === 'terminator_storm_bolter').overwatch;
  })).toBe(false);

  const doorOpen = () => page.evaluate(() => {
    const { engine } = (window as any).sulk;
    return engine.state.board.doorBetween({ c: 18, r: 20 }, { c: 19, r: 20 }).isOpen;
  });
  await press(page, 's'); // S is the primary door key: door ahead opens
  expect(await doorOpen()).toBe(true);
  await press(page, 'h'); // H stays bound as the legacy alias: closes it again
  expect(await doorOpen()).toBe(false);

  // M = melee: park a stealer-side piece right in front, dice pinned to a
  // survivable tie so both sides live and only the event proves the swing.
  // Top the AP back up first — the door toggles above spent 2.
  await page.evaluate(() => {
    const { engine } = (window as any).sulk;
    engine.state.board.dice.roll = () => 3;
    const bolter = engine.marines.find((m: any) => m.spriteKey === 'terminator_storm_bolter');
    bolter.ap = 4;
    const foe = engine.state.pieces.find((p: any) => p.kind !== 'marine');
    foe.pos = { c: bolter.pos.c + 1, r: bolter.pos.r }; // directly east = ahead
  });
  await press(page, 'm');
  expect(await page.evaluate(() => (window as any).cc)).toBeGreaterThan(0); // melee fired, not a detonation
  expect(await page.evaluate(() => {
    const { engine } = (window as any).sulk;
    return engine.marines.filter((m: any) => m.alive).length;
  })).toBe(5); // nobody self-destructed
});

test('B self-destructs only on a confirmed double press; held B never fires', async ({ page }) => {
  await boot(page);
  await page.evaluate(() => {
    const { engine, Selection, PieceEvents } = (window as any).sulk;
    const flamer = engine.marines.find((m: any) => m.spriteKey === 'terminator_heavy_flamer');
    Selection.select(flamer.id);
    PieceEvents.emit('selected', { pieceId: flamer.id, ap: { apRemaining: 4, apInitial: 4 }, ammo: 6 });
    engine.state.board.dice.roll = () => 1;
  });
  const flamerAlive = () => page.evaluate(() => {
    const { engine } = (window as any).sulk;
    return engine.marines.find((m: any) => m.spriteKey === 'terminator_heavy_flamer')?.alive ?? false;
  });

  // Holding B (auto-repeat) arms but never detonates — JustDown needs a fresh press.
  await page.keyboard.down('b');
  await page.waitForTimeout(700);
  await page.keyboard.up('b');
  expect(await flamerAlive()).toBe(true);

  // A single press (after the old arm expires) also never detonates.
  await page.waitForTimeout(2600);
  await press(page, 'b');
  expect(await flamerAlive()).toBe(true);

  // Second press inside the window: boom.
  await press(page, 'b');
  expect(await flamerAlive()).toBe(false);
});
