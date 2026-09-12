// Stage 1 boot check (headless Chromium, real page, real clock): the live
// scene ticks on its own, pieces move, no page errors. Run from packages/client:
//   node boot-check.mjs
import { chromium } from '@playwright/test';

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1180, height: 800 } });
const errors = [];
page.on('pageerror', e => errors.push(e.message));
page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
await page.goto('http://localhost:5173/?deploy=0&mission=space_hulk_1&seed=3');
await page.waitForFunction(() => window.sulk?.scene?.hud !== undefined, undefined, { timeout: 20000 });
await page.waitForTimeout(2500);
const t1 = await page.evaluate(() => ({ tick: window.sulk.engine.tickCount, cycle: window.sulk.engine.cycle,
  marines: window.sulk.engine.marines.map(m => `${m.spriteKey.slice(11)}@${m.pos.c},${m.pos.r} ap${m.ap}${m.overwatch ? ' OW' : ''}`) }));
await page.screenshot({ path: 'test-results/boot-check-1.png' });
await page.waitForTimeout(6000);
const t2 = await page.evaluate(() => ({ tick: window.sulk.engine.tickCount, cycle: window.sulk.engine.cycle, result: window.sulk.engine.state.result,
  stealers: window.sulk.engine.stealerSide.length,
  hud: [window.sulk.scene.hud.phaseText.text, window.sulk.scene.hud.timerText.text, window.sulk.scene.hud.doneLabel.text],
  motion: window.sulk.scene.motionLog.length,
  marines: window.sulk.engine.marines.map(m => `${m.spriteKey.slice(11)}@${m.pos.c},${m.pos.r} ap${m.ap}${m.overwatch ? ' OW' : ''}`) }));
await page.screenshot({ path: 'test-results/boot-check-2.png' });
// Esc pauses: the tick count freezes.
await page.keyboard.press('Escape');
const paused = await page.evaluate(() => window.sulk.scene.isPaused);
const tp = await page.evaluate(() => window.sulk.engine.tickCount);
await page.waitForTimeout(1500);
const tp2 = await page.evaluate(() => window.sulk.engine.tickCount);
await page.screenshot({ path: 'test-results/boot-check-3-paused.png' });
console.log(JSON.stringify({ t1, t2, paused, tickAtPause: tp, tickAfterPause: tp2, errors }, null, 1));
await browser.close();
