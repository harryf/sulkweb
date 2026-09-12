import { test, expect, type Page } from '@playwright/test';
import { waitForGame, step } from './harness';

/**
 * Individual orders (2.x stage 2): a right-click with a marine selected is
 * an order the default AI carries out on its own ticks. Three views of one
 * order: the engine slot, the marker on the board, the word on the card.
 */

/** World coordinates to page coordinates through the canvas rect (the canvas
 *  is offset and scaled in the e2e viewport; see CLAUDE.md gotchas). */
async function toPage(page: Page, wx: number, wy: number): Promise<{ x: number; y: number }> {
  const box = (await page.locator('canvas').boundingBox())!;
  const view = await page.evaluate(() => {
    const s = (window as any).sulk.scene;
    return { sx: s.cameras.main.scrollX, sy: s.cameras.main.scrollY, gw: s.scale.width };
  });
  const scale = box.width / view.gw;
  return { x: box.x + (wx - view.sx) * scale, y: box.y + (wy - view.sy) * scale };
}

const T = 40;

async function selectFirstMarine(page: Page): Promise<string> {
  return page.evaluate(() => {
    const { sulk } = window as any;
    const m = sulk.engine.marines[0];
    sulk.Selection.select(m.id);
    sulk.PieceEvents.emit('selected', { pieceId: m.id, ap: { apRemaining: m.apRemaining, apInitial: m.apInitial } });
    sulk.scene.cameras.main.centerOn(m.pos.c * 40, m.pos.r * 40);
    return m.id as string;
  });
}

test('an order through the command path: the marine walks there, goes on overwatch, marker and card follow', async ({ page }) => {
  const errors = await waitForGame(page, 'mission=space_hulk_1&seed=1');
  const id = await page.evaluate(() => {
    const { sulk } = window as any;
    // The column stands at (10,0)..(10,4) facing down, the flamer at its head.
    // Order the flamer clear first (marines block the path), then the
    // sergeant at (10,3) down to (10,6) then overwatch.
    const flamer = sulk.engine.marines[4];
    sulk.command(flamer.id, { type: 'order', order: { type: 'moveTo', x: 10, y: 9, then: 'hold' } });
    const m = sulk.engine.marines[3];
    sulk.command(m.id, { type: 'order', order: { type: 'moveTo', x: 10, y: 6, then: 'overwatch' } });
    return m.id as string;
  });
  // Slot, marker, word: all three say MOVE.
  expect(await page.evaluate((id) => (window as any).sulk.engine.findPiece(id).order, id))
    .toEqual({ type: 'moveTo', x: 10, y: 6, then: 'overwatch' });
  const marker = await page.evaluate((id) => {
    const o = (window as any).sulk.scene.children.list.find((c: any) => c.name === 'order-marker' && c.getData('pieceId') === id);
    return o ? { then: o.getData('then'), kind: o.getData('kind') } : null;
  }, id);
  expect(marker).toEqual({ then: 'overwatch', kind: 'moveTo' });
  await expect(page.locator(`[data-piece-id="${id}"] .m-order`)).toHaveText('MOVE');

  // Walk: 3 squares behind the flamer on 4 AP plus regeneration, then 2 AP for overwatch.
  await step(page, 40);
  const after = await page.evaluate((id) => {
    const m = (window as any).sulk.engine.findPiece(id);
    return { pos: m.pos, overwatch: m.overwatch, order: m.order, facing: m.facing };
  }, id);
  expect(after.pos).toEqual({ c: 10, r: 6 });
  expect(after.facing).toBe(2); // arrived facing the way he walked (south)
  expect(after.overwatch).toBe(true);
  expect(after.order).toBeNull();
  expect(await page.evaluate((id) => (window as any).sulk.scene.children.list.some((c: any) => c.name === 'order-marker' && c.getData('pieceId') === id), id)).toBe(false);
  await expect(page.locator(`[data-piece-id="${id}"] .m-order`)).toHaveText('OW');
  expect(errors).toHaveLength(0);
});

test('right-click orders: square = walk then hold, Shift = then overwatch, door edge = go open it, a key takes the wheel back', async ({ page }) => {
  const errors = await waitForGame(page, 'mission=space_hulk_1&seed=1');
  const id = await selectFirstMarine(page);
  await page.waitForTimeout(100);

  // Plain right-click on (10,3): walk there, then hold.
  let pt = await toPage(page, 10 * T + T / 2, 3 * T + T / 2);
  await page.mouse.click(pt.x, pt.y, { button: 'right' });
  await page.waitForTimeout(100);
  expect(await page.evaluate((id) => (window as any).sulk.engine.findPiece(id).order, id))
    .toEqual({ type: 'moveTo', x: 10, y: 3, then: 'hold' });
  await expect(page.locator(`[data-piece-id="${id}"] .m-order`)).toHaveText('MOVE');

  // Shift right-click on (10,4): walk there, then overwatch (replaces the first order).
  pt = await toPage(page, 10 * T + T / 2, 4 * T + T / 2);
  await page.keyboard.down('Shift');
  await page.mouse.click(pt.x, pt.y, { button: 'right' });
  await page.keyboard.up('Shift');
  await page.waitForTimeout(100);
  expect(await page.evaluate((id) => (window as any).sulk.engine.findPiece(id).order, id))
    .toEqual({ type: 'moveTo', x: 10, y: 4, then: 'overwatch' });
  expect(await page.evaluate(() =>
    (window as any).sulk.scene.children.list.filter((c: any) => c.name === 'order-marker').length)).toBe(1);

  // Right-click a closed door edge: go and open it. Pan to the door first.
  const door = await page.evaluate(() => {
    const { sulk } = window as any;
    const d = sulk.engine.state.board.allDoors().find((d: any) => !d.isOpen);
    const o = d.otherSide();
    const mx = (d.square.x + o.c + 1) / 2 * 40, my = (d.square.y + o.r + 1) / 2 * 40;
    sulk.scene.cameras.main.centerOn(mx, my);
    return { x: d.square.x, y: d.square.y, facing: d.facing, mx, my };
  });
  await page.waitForTimeout(100);
  pt = await toPage(page, door.mx, door.my);
  await page.mouse.click(pt.x, pt.y, { button: 'right' });
  await page.waitForTimeout(100);
  expect(await page.evaluate((id) => (window as any).sulk.engine.findPiece(id).order, id))
    .toEqual({ type: 'openDoor', x: door.x, y: door.y, facing: door.facing });
  await expect(page.locator(`[data-piece-id="${id}"] .m-order`)).toHaveText('DOOR');

  // A direct key clears the order and the marker.
  await page.keyboard.press('w');
  await page.waitForTimeout(100);
  expect(await page.evaluate((id) => (window as any).sulk.engine.findPiece(id).order, id)).toBeNull();
  expect(await page.evaluate(() => (window as any).sulk.scene.children.list.some((c: any) => c.name === 'order-marker'))).toBe(false);
  await expect(page.locator(`[data-piece-id="${id}"] .m-order`)).toHaveText('HOLD');
  expect(errors).toHaveLength(0);
});

test('right-click issues nothing with no marine selected or on the HUD strip, and keeps the selection', async ({ page }) => {
  const errors = await waitForGame(page, 'mission=space_hulk_1&seed=1');
  // Nothing selected.
  let pt = await toPage(page, 10 * T + T / 2, 3 * T + T / 2);
  await page.mouse.click(pt.x, pt.y, { button: 'right' });
  await page.waitForTimeout(100);
  expect(await page.evaluate(() => (window as any).sulk.engine.marines.some((m: any) => m.order !== null))).toBe(false);
  // Selected, right-click on the HUD strip: nothing, selection kept.
  const id = await selectFirstMarine(page);
  const hud = await page.evaluate(() => {
    const s = (window as any).sulk.scene;
    return { x: s.scale.width - 60, y: 120 };
  });
  const box = (await page.locator('canvas').boundingBox())!;
  const gw = await page.evaluate(() => (window as any).sulk.scene.scale.width);
  const scale = box.width / gw;
  await page.mouse.click(box.x + hud.x * scale, box.y + hud.y * scale, { button: 'right' });
  await page.waitForTimeout(100);
  expect(await page.evaluate(() => (window as any).sulk.engine.marines.some((m: any) => m.order !== null))).toBe(false);
  expect(await page.evaluate(() => (window as any).sulk.Selection.get())).toBe(id);
  expect(errors).toHaveLength(0);
});
