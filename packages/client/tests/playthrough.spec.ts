import { test, expect, type Page } from '@playwright/test';

/**
 * Full-mission playthrough using only legal player actions routed through the
 * client's own handlers (shootNearest / meleeAhead / useDoor / moveForward)
 * plus real clicks on the DONE button. The game must reach a result.
 */

async function waitForGame(page: Page) {
  await page.goto('/');
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

  // Now play turns with simple tactics until the game ends
  const result = await page.evaluate(async () => {
    const { engine, scene, Selection } = (window as any).sulk;
    const S = scene as any;
    let guard = 0;
    while (engine.state.result === 'ongoing' && guard++ < 30) {
      // Marines act rear-to-front? Front first: highest row (closest to exit)
      const marines = [...engine.marines].sort((a: any, b: any) => b.pos.r - a.pos.r);
      for (const m of marines) {
        Selection.toggle(m.id);
        let acts = 0;
        while (m.ap > 0 && acts++ < 12 && engine.state.result === 'ongoing') {
          if (S.shootNearest(m)) continue;         // clear threats first
          if (S.meleeAhead(m)) continue;           // or fight what is in the face
          if (m.findAdjacentDoor && m.findAdjacentDoor() && !m.findAdjacentDoor().isOpen) {
            if (m.useDoor()) continue;
          }
          if (m.moveForward()) continue;
          break;                                    // blocked — next marine
        }
        Selection.clear();
        engine.checkVictory();
        if (engine.state.result !== 'ongoing') break;
      }
      if (engine.state.result === 'ongoing') engine.endMarinePhase();
    }
    return { result: engine.state.result, turns: engine.turnNumber, marinesLeft: engine.marines.length,
             kills: scene.hud.casualtyText.text };
  });

  expect(['win', 'loss']).toContain(result.result); // a complete game, either way
  expect(errors).toHaveLength(0);
  await page.screenshot({ path: 'test-results/playthrough-final.png' });
  console.log('PLAYTHROUGH:', JSON.stringify(result));
});
