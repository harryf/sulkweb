import { test, expect } from '@playwright/test';

/**
 * Fog of war in a real browser (ISC-1064..1067, 2026-09-12): the pure rules
 * live in src/tests/fog.spec.ts; this file pins the WIRING the unit tests
 * cannot see: sprite visibility, the radar gate on blips, the hover readout
 * side channel, and the ?fog=0 escape hatch.
 */

const boot = async (page: import('@playwright/test').Page, url: string) => {
  const errors: string[] = [];
  page.on('pageerror', (err: Error) => errors.push(err.message));
  await page.goto(url);
  await page.waitForFunction(() => (window as any).sulk?.scene?.hud !== undefined, undefined, { timeout: 15000 });
  await page.waitForTimeout(400); // a few frames for updateFog
  return errors;
};

/** debug_1 starts with no blips on the board (the trickle arrives at end
 *  phase; seed 1 even wins on turn 1), so end the marine phase straight on
 *  the engine until blips exist: handlers run live, sprites arrive through
 *  pieceAdded, no replay involved. */
const trickle = async (page: import('@playwright/test').Page) => {
  const spawned = await page.evaluate(() => {
    const { engine } = (window as any).sulk;
    for (let i = 0; i < 4 && engine.state.result === 'ongoing'; i++) {
      engine.endMarinePhase();
      if (engine.state.pieces.some((p: any) => p.kind === 'blip')) break;
    }
    return engine.state.pieces.filter((p: any) => p.kind === 'blip').length;
  });
  await page.waitForTimeout(400);
  return spawned;
};

const blipState = (page: import('@playwright/test').Page) => page.evaluate(() => {
  const s = (window as any).sulk;
  const blips = s.scene.children.list.filter((c: any) => c.pieceKind === 'blip');
  const stealers = s.scene.children.list.filter((c: any) => c.pieceKind === 'stealer');
  return {
    sergeants: s.engine.marines.filter((m: any) => m.spriteKey.startsWith('terminator_sergeant')).length,
    blips: blips.length,
    blipsVisible: blips.filter((b: any) => b.visible).length,
    stealersVisible: stealers.filter((b: any) => b.visible).length,
    fog: !!s.scene.fogGfx,
  };
});

test('debug_1 has no sergeant: its blips exist but are never drawn under fog', async ({ page }) => {
  const errors = await boot(page, '/?deploy=0&tick=0&mission=debug_1&seed=5');
  await trickle(page);
  const st = await blipState(page);
  expect(st.fog).toBe(true);
  expect(st.sergeants).toBe(0);
  expect(st.blips).toBeGreaterThan(0);
  expect(st.blipsVisible).toBe(0);
  expect(errors).toHaveLength(0);
});

test('space_hulk_1: blips show while the sergeant lives, vanish when he dies, stealers unaffected', async ({ page }) => {
  const errors = await boot(page, '/?deploy=0&tick=0&mission=space_hulk_1&seed=3');
  const before = await blipState(page);
  expect(before.sergeants).toBe(1);
  expect(before.blips).toBe(2);
  expect(before.blipsVisible).toBe(2);

  // A stealer column the marines can SEE (door opened, three in a line).
  const column = await page.evaluate(() => {
    const s = (window as any).sulk;
    const board = s.engine.state.board;
    const front = s.engine.marines.reduce((a: any, b: any) => (b.pos.r > a.pos.r ? b : a));
    front.useDoor();
    const ids: string[] = [];
    for (const r of [front.pos.r + 2, front.pos.r + 3, front.pos.r + 4]) {
      ids.push(new s.Genestealer(board, { c: front.pos.c, r }, 0).id);
    }
    return ids;
  });
  await page.waitForTimeout(300);
  const columnVisible = await page.evaluate((ids: string[]) =>
    ids.map(id => (window as any).sulk.scene.pieceSprites[id]?.visible), column);
  expect(columnVisible).toEqual([true, true, true]); // sight passes the front stealer

  await page.evaluate(() => {
    const s = (window as any).sulk;
    s.engine.marines.find((m: any) => m.spriteKey.startsWith('terminator_sergeant')).die();
  });
  await page.waitForTimeout(300);
  const after = await blipState(page);
  expect(after.sergeants).toBe(0);
  expect(after.blips).toBe(2);
  expect(after.blipsVisible).toBe(0);
  expect(after.stealersVisible).toBe(3);
  expect(errors).toHaveLength(0);
});

test('the hover readout never names a blip while the radar is down', async ({ page }) => {
  await boot(page, '/?deploy=0&tick=0&mission=space_hulk_1&seed=3');
  const readouts = await page.evaluate(() => {
    const s = (window as any).sulk;
    const squares = s.engine.state.pieces.filter((p: any) => p.kind === 'blip').map((p: any) => [p.pos.c, p.pos.r]);
    const up = squares.map(([c, r]: number[]) => s.scene.describeSquare(c, r));
    s.engine.marines.find((m: any) => m.spriteKey.startsWith('terminator_sergeant')).die();
    const down = squares.map(([c, r]: number[]) => s.scene.describeSquare(c, r));
    return { up, down };
  });
  expect(readouts.up.length).toBe(2);
  for (const line of readouts.up) expect(line).toContain('blip');
  for (const line of readouts.down) expect(line).not.toContain('blip');
});

test('?fog=0 is a true escape hatch: no fog object, blips drawn with no sergeant', async ({ page }) => {
  const errors = await boot(page, '/?deploy=0&tick=0&fog=0&mission=debug_1&seed=5');
  await trickle(page);
  const st = await blipState(page);
  expect(st.fog).toBe(false);
  expect(st.sergeants).toBe(0);
  expect(st.blips).toBeGreaterThan(0);
  expect(st.blipsVisible).toBe(st.blips);
  expect(errors).toHaveLength(0);
});
