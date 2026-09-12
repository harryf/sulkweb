// Stage 3 boot check (headless Chromium, real page, real clock, real keys and
// mouse): Tab selects the squad (rings on every member, the roster row lit),
// a right-click with the squad selected sets a defend order (squad marker,
// DEFEND on the row header, a task marker per marine), the marines walk to
// their posts on their own, Space holds the clock, no page errors. Run from
// packages/client with the dev server up:
//   node boot-check-squads.mjs
import { chromium } from '@playwright/test';

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1180, height: 800 } });
const errors = [];
page.on('pageerror', e => errors.push(e.message));
page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
await page.goto('http://localhost:5173/?deploy=0&mission=space_hulk_1&seed=1');
await page.waitForFunction(() => window.sulk?.scene?.hud !== undefined, undefined, { timeout: 20000 });
await page.waitForTimeout(1200);
await page.evaluate(() => window.sulk.scene.cameras.main.centerOn(10 * 40, 6 * 40));
// Focus the canvas, then Tab: the squad.
const box = await page.locator('canvas').boundingBox();
await page.mouse.click(box.x + 5, box.y + 5);
await page.keyboard.press('Tab');
await page.waitForTimeout(200);
const sel = await page.evaluate(() => {
  const { sulk } = window;
  const rings = sulk.scene.children.list.filter(c => c.name === 'squad-highlight');
  return { squad: sulk.Selection.getSquad(), marine: sulk.Selection.get(), rings: rings.length, rowSelected: !!document.querySelector('.squad-row.selected') };
});
// Right-click the room (10,7): defend it.
const view = await page.evaluate(() => {
  const s = window.sulk.scene;
  return { sx: s.cameras.main.scrollX, sy: s.cameras.main.scrollY, gw: s.scale.width };
});
const scale = box.width / view.gw;
await page.mouse.click(box.x + (10 * 40 + 20 - view.sx) * scale, box.y + (7 * 40 + 20 - view.sy) * scale, { button: 'right' });
await page.waitForTimeout(400);
const t1 = await page.evaluate(() => {
  const { sulk } = window;
  const st = sulk.engine.squadState('Calvin');
  return {
    tick: sulk.engine.tickCount,
    order: st?.order, coordinated: st?.coordinated,
    squadMarkers: sulk.scene.children.list.filter(c => c.name === 'squad-marker').map(c => c.getData('kind')),
    taskMarkers: sulk.scene.children.list.filter(c => c.name === 'order-marker' && c.getData('level') === 2).length,
    header: document.querySelector('.squad-row[data-squad="Calvin"] h3 .s-order')?.textContent,
    words: [...document.querySelectorAll('.marine-card .m-order')].map(e => e.textContent),
  };
});
await page.screenshot({ path: 'test-results/boot-squads-1.png' });
// Space: the command pause, while the squad is still whole.
await page.keyboard.press("Space");
await page.waitForTimeout(200);
const tickA = await page.evaluate(() => window.sulk.engine.tickCount);
await page.waitForTimeout(800);
const paused = await page.evaluate(() => ({ tick: window.sulk.engine.tickCount, cp: window.sulk.scene.isCommandPaused, overlay: window.sulk.scene.children.list.some(c => c.name === "command-pause"), result: window.sulk.engine.state.result }));
await page.screenshot({ path: "test-results/boot-squads-3.png" });
await page.keyboard.press("Space");
await page.waitForTimeout(800);
const resumed = await page.evaluate(() => ({ tick: window.sulk.engine.tickCount, cp: window.sulk.scene.isCommandPaused }));
// Let them walk (real clock).
await page.waitForTimeout(8000);
const t2 = await page.evaluate(() => {
  const { sulk } = window;
  return {
    tick: sulk.engine.tickCount, result: sulk.engine.state.result, stealers: sulk.engine.state.pieces.filter(p => p.kind !== "marine").length,
    marines: sulk.engine.marines.map(m => ({ at: [m.pos.c, m.pos.r], task: m.task ? [m.task.x, m.task.y] : null, ow: !!m.overwatch })),
  };
});
await page.screenshot({ path: 'test-results/boot-squads-2.png' });
console.log(JSON.stringify({ sel, t1, t2, tickA, paused, resumed, errors }, null, 1));
await browser.close();
