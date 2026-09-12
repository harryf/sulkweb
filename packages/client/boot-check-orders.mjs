// Stage 2 boot check (headless Chromium, real page, real clock, real mouse):
// the live scene ticks, a right-click with a marine selected sets an order,
// the marker draws and the roster word reads MOVE, the marine walks there on
// his own, the word reads OW on arrival, no page errors. Run from
// packages/client with the dev server up:
//   node boot-check-orders.mjs
import { chromium } from '@playwright/test';

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1180, height: 800 } });
const errors = [];
page.on('pageerror', e => errors.push(e.message));
page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
await page.goto('http://localhost:5173/?deploy=0&mission=space_hulk_1&seed=26');
await page.waitForFunction(() => window.sulk?.scene?.hud !== undefined, undefined, { timeout: 20000 });
await page.waitForTimeout(1200);
// Select the flamer at the head of the column and pan to him.
const id = await page.evaluate(() => {
  const { sulk } = window;
  const m = sulk.engine.marines[4];
  sulk.Selection.select(m.id);
  sulk.PieceEvents.emit('selected', { pieceId: m.id, ap: { apRemaining: m.apRemaining, apInitial: m.apInitial } });
  sulk.scene.cameras.main.centerOn(m.pos.c * 40, m.pos.r * 40);
  return m.id;
});
await page.waitForTimeout(200);
// Right-click (10,9): world to page through the canvas rect.
const box = await page.locator('canvas').boundingBox();
const view = await page.evaluate(() => {
  const s = window.sulk.scene;
  return { sx: s.cameras.main.scrollX, sy: s.cameras.main.scrollY, gw: s.scale.width };
});
const scale = box.width / view.gw;
await page.mouse.click(box.x + (10 * 40 + 20 - view.sx) * scale, box.y + (9 * 40 + 20 - view.sy) * scale, { button: 'right' });
await page.waitForTimeout(150);
const t1 = await page.evaluate((id) => {
  const { sulk } = window;
  const m = sulk.engine.findPiece(id);
  return {
    tick: sulk.engine.tickCount,
    order: m.order,
    marker: sulk.scene.children.list.filter(c => c.name === 'order-marker').map(c => ({ kind: c.getData('kind'), then: c.getData('then') })),
    word: document.querySelector(`[data-piece-id="${id}"] .m-order`)?.textContent,
    pos: m.pos,
  };
}, id);
await page.screenshot({ path: 'test-results/boot-check-orders-1.png' });
await page.waitForTimeout(4500);
const t2 = await page.evaluate((id) => {
  const { sulk } = window;
  const m = sulk.engine.findPiece(id);
  return {
    tick: sulk.engine.tickCount, pos: m.pos, order: m.order,
    markers: sulk.scene.children.list.filter(c => c.name === 'order-marker').length,
    word: document.querySelector(`[data-piece-id="${id}"] .m-order`)?.textContent,
    result: sulk.engine.state.result,
  };
}, id);
await page.screenshot({ path: 'test-results/boot-check-orders-2.png' });
console.log(JSON.stringify({ t1, t2, errors }, null, 1));
await browser.close();
