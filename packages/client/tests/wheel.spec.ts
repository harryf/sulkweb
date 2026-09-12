import { test, expect } from '@playwright/test';

/**
 * Mouse wheel pans the camera like the arrow keys (2026-09-12): wheel down
 * moves the view down the map, wheel up moves it back, and the wheel over
 * the HUD strip does nothing.
 */
const boot = async (page: import('@playwright/test').Page) => {
  await page.goto('/?deploy=0&mission=space_hulk_1&seed=1');
  await page.waitForFunction(() => (window as any).sulk?.scene?.hud !== undefined, undefined, { timeout: 15000 });
  await page.waitForTimeout(300);
};

const scroll = (page: import('@playwright/test').Page) => page.evaluate(() => {
  const cam = (window as any).sulk.scene.cameras.main;
  return { x: Math.round(cam.scrollX), y: Math.round(cam.scrollY) };
});

/** Page coordinates of a point on the map area (left third of the canvas). */
const mapPoint = (page: import('@playwright/test').Page) => page.evaluate(() => {
  const r = document.querySelector('canvas')!.getBoundingClientRect();
  return { x: r.left + r.width * 0.3, y: r.top + r.height * 0.5 };
});
const hudPoint = (page: import('@playwright/test').Page) => page.evaluate(() => {
  const scene = (window as any).sulk.scene;
  const r = document.querySelector('canvas')!.getBoundingClientRect();
  const k = r.width / scene.scale.width;
  return { x: r.left + (scene.scale.width - 100) * k, y: r.top + r.height * 0.6 };
});

test('wheel down pans the camera down, wheel up brings it back', async ({ page }) => {
  await boot(page);
  const pt = await mapPoint(page);
  await page.mouse.move(pt.x, pt.y);
  const before = await scroll(page);
  await page.mouse.wheel(0, 300);
  await page.waitForTimeout(150);
  const down = await scroll(page);
  expect(down.y).toBeGreaterThan(before.y);
  expect(down.x).toBe(before.x);
  await page.mouse.wheel(0, -300);
  await page.waitForTimeout(150);
  const back = await scroll(page);
  expect(back.y).toBeLessThan(down.y);
});

test('the wheel over the HUD strip leaves the camera alone', async ({ page }) => {
  await boot(page);
  const pt = await hudPoint(page);
  await page.mouse.move(pt.x, pt.y);
  const before = await scroll(page);
  await page.mouse.wheel(0, 300);
  await page.waitForTimeout(150);
  expect(await scroll(page)).toEqual(before);
});
