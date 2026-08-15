import { test, expect } from '@playwright/test';

/**
 * Off-board marker reachability guard (ISC-292/293): for EVERY registered
 * mission, every entry triangle and exit arrow must be fully displayable —
 * its rotation-aware display bounds lie inside the camera's reachable range
 * (min pan … max pan + the board-view area left of the HUD). This is the spec
 * for the space_hulk_3 (28,22) truncation report: Phaser clamps scroll to
 * bounds − FULL canvas width, so the bounds must carry a HUD-width dead zone.
 */

const MISSIONS = [
  'space_hulk_1', 'space_hulk_2', 'space_hulk_3', 'space_hulk_4',
  'space_hulk_5', 'space_hulk_6', 'beta_1', 'beta_2', 'debug_1',
];

for (const mission of MISSIONS) {
  test(`${mission}: every off-board marker is fully pannable into view`, async ({ page }) => {
    await page.goto(`/?mission=${mission}&seed=1`);
    await page.waitForFunction(() => (window as any).sulk?.scene?.roster !== undefined, undefined, { timeout: 15000 });
    const r = await page.evaluate(async () => {
      const frame = () => new Promise(requestAnimationFrame);
      const scene = (window as any).sulk.scene;
      const cam = scene.cameras.main;
      const HUD = 200;
      const markers = scene.children.list
        .filter((o: any) => o.name === 'entry-triangle' || o.name === 'exit-arrow')
        .map((o: any) => { const b = o.getBounds(); return { kind: o.name, l: b.left, r: b.right, t: b.top, b: b.bottom }; });
      cam.setScroll(1e6, 1e6); await frame(); await frame();
      const maxX = cam.scrollX, maxY = cam.scrollY;
      cam.setScroll(-1e6, -1e6); await frame(); await frame();
      const minX = cam.scrollX, minY = cam.scrollY;
      const viewW = scene.scale.width - HUD, viewH = scene.scale.height;
      return {
        count: markers.length,
        entries: ((window as any).sulk.engine.mission.entryPoints ?? []).length,
        unreachable: markers.filter((m: any) =>
          m.r > maxX + viewW || m.l < minX || m.b > maxY + viewH || m.t < minY),
      };
    });
    expect(r.count).toBeGreaterThanOrEqual(r.entries); // a triangle per entry (+ any exit arrows)
    expect(r.unreachable).toEqual([]);
  });
}
