import { test, expect, type Page } from '@playwright/test';

/**
 * Full-mission playthrough using only legal player actions routed through the
 * client's own handlers (shootNearest / meleeAhead / useDoor / moveForward)
 * plus real clicks on the DONE button. The game must reach a result.
 */

async function waitForGame(page: Page) {
  // ?seed pins the whole game from construction — deterministic playthrough.
  // NOTE this spec idles turn 1 before its real DONE click, so its trajectory
  // differs from the plain-autoplay scan — seeds were scanned under THIS
  // pattern (2026-08-15 original map): seed 3 ends in a loss, keeping this the
  // defeat-path regression; win.spec covers victory. Rescan if dice order changes.
  await page.goto('/?seed=3');
  await expect(page.locator('canvas')).toBeVisible();
  await page.waitForFunction(() => (window as any).sulk?.scene?.hud !== undefined, undefined, { timeout: 15000 });
}

test('Mission 1 plays start-to-finish and reaches a result', async ({ page }) => {
  test.setTimeout(120000);
  const errors: string[] = [];
  page.on('pageerror', (err: Error) => errors.push(err.message));
  await waitForGame(page);

  // Click the DONE button once for real — verifies the button wiring (ISC-49)
  const doneProbe = await page.evaluate(() => {
    const { scene, engine } = (window as any).sulk;
    const before = engine.turnNumber;
    // find the button: it is the interactive rectangle inside the HUD
    return { before, hudX: scene.hud.x };
  });
  // The HUD sits at (scale.width - 200); DONE button occupies y≈430-464 within it.
  // Instead of pixel-hunting, dispatch a real pointer event on the canvas at the button.
  const box = await page.locator('canvas').boundingBox();
  if (box) {
    // Canvas CSS size equals game size; DONE at (hud.x + 100, ~447) in game pixels
    const donePos = await page.evaluate(() => {
      const { scene } = (window as any).sulk;
      const hud = scene.hud;
      const btn = hud.list.find((o: any) => o.type === 'Rectangle' && o.input?.enabled);
      return btn ? { x: hud.x + btn.x + btn.width / 2, y: hud.y + btn.y + btn.height / 2 } : null;
    });
    console.log('DONE-btn debug:', JSON.stringify({ donePos, box }));
    if (donePos) {
      const gameW = await page.evaluate(() => (window as any).sulk.scene.scale.width);
      const scaleX = box.width / gameW;
      console.log('clicking at', box.x + donePos.x * scaleX, box.y + donePos.y * scaleX, 'scale', scaleX);
      await page.mouse.click(box.x + donePos.x * scaleX, box.y + donePos.y * scaleX);
      await page.waitForTimeout(300);
    }
  }
  const afterDone = await page.evaluate(() => (window as any).sulk.engine.turnNumber);
  expect(afterDone).toBe(doneProbe.before + 1); // the real click ended the phase

  // Deterministic completion: autopilot (legal actions only) at pinned seed 5
  // (set at page load via ?seed — construction rolls included). Every scanned
  // seed completes within 60 turns; this one ends in a loss. Rescan seeds if
  // rules change dice-consumption order.
  const result = await page.evaluate(() => {
    const { engine, scene, runMarineTurn } = (window as any).sulk;
    let guard = 0;
    while (engine.state.result === 'ongoing' && guard++ < 40) {
      runMarineTurn(engine);
      if (engine.state.result === 'ongoing') engine.endMarinePhase();
    }
    return { result: engine.state.result, turns: engine.turnNumber, marinesLeft: engine.marines.length,
             kills: scene.hud.casualtyText.text };
  });

  expect(result.result).toBe('loss'); // pinned defeat path — win.spec covers victory
  expect(errors).toHaveLength(0);
  await page.screenshot({ path: 'test-results/playthrough-final.png' });
  console.log('PLAYTHROUGH:', JSON.stringify(result));
});
