import { test, expect } from '@playwright/test';

/**
 * Minimap radar (ISC-672..707): click-to-focus, living-marine red dots, and
 * the sergeant auspex — pulse-revealed stealer/blip echoes driven by the
 * motion-tracker ping — plus distance attenuation for positional SFX.
 *
 * Auto pulses ride the real audio scheduler; tests that assert echo state
 * first detach sulk.audio.onPing and drive minimap.pulse(ms) directly, so
 * timing is deterministic.
 */

const boot = async (page: import('@playwright/test').Page, url = '/?deploy=0&mission=space_hulk_1&seed=1') => {
  await page.goto(url);
  await page.waitForFunction(() => (window as any).sulk?.scene?.roster !== undefined, undefined, { timeout: 15000 });
};

/** Click the minimap at LOCAL px (lx, ly), mapping game px → page px through
 *  the canvas rect (the display can be scaled — see CLAUDE.md gotcha). */
const clickMini = async (page: import('@playwright/test').Page, lx: number, ly: number) => {
  const pt = await page.evaluate(([x, y]) => {
    const scene = (window as any).sulk.scene;
    const c = document.querySelector('canvas')!;
    const r = c.getBoundingClientRect();
    const k = r.width / scene.scale.width;
    return { x: r.left + (scene.scale.width - 200 + 8 + x) * k, y: r.top + (8 + y) * k };
  }, [lx, ly]);
  await page.mouse.click(pt.x, pt.y);
  await page.waitForTimeout(120);
};

const cam = (page: import('@playwright/test').Page) =>
  page.evaluate(() => {
    const c = (window as any).sulk.scene.cameras.main;
    return { scrollX: c.scrollX, scrollY: c.scrollY, midX: c.midPoint.x, midY: c.midPoint.y };
  });

test('minimap click focuses the camera and moves the white box; selection survives (ISC-672/674/675)', async ({ page }) => {
  await boot(page);
  await page.mouse.click(300, 300); // canvas focus + audio unlock
  await page.keyboard.press('1');
  await page.waitForTimeout(90);
  const selBefore = await page.evaluate(() => (window as any).sulk.Selection.get());
  expect(selBefore).toBeTruthy();

  const boxBefore = await page.evaluate(() => ({ ...(window as any).sulk.scene.minimap.lastBox }));
  // Local y=140 on the 184px-wide sh1 minimap → world y ≈ 670, well inside
  // the camera's free vertical range (no clamp), so the mapping is exact.
  await clickMini(page, 92, 140);
  const after = await cam(page);
  const worldY = 140 / (184 / (22 * 40));
  expect(Math.abs(after.midY - worldY)).toBeLessThanOrEqual(40); // within one tile
  const boxAfter = await page.evaluate(() => ({ ...(window as any).sulk.scene.minimap.lastBox }));
  expect(boxAfter.y).not.toBe(boxBefore.y);
  // The click was a camera command, never a deselection (ISC-675).
  expect(await page.evaluate(() => (window as any).sulk.Selection.get())).toBe(selBefore);
});

test('corner clicks clamp to the camera bounds (ISC-673)', async ({ page }) => {
  await boot(page);
  await clickMini(page, 1, 1);
  const topLeft = await cam(page);
  const bounds = await page.evaluate(() => {
    const c = (window as any).sulk.scene.cameras.main;
    const b = c.getBounds();
    return { minX: b.x, minY: b.y, maxY: b.y + b.height - c.height };
  });
  expect(topLeft.scrollX).toBeCloseTo(bounds.minX, 0);
  expect(topLeft.scrollY).toBeCloseTo(bounds.minY, 0);

  const miniH = await page.evaluate(() => (window as any).sulk.scene.minimap.height);
  await clickMini(page, 92, miniH - 1);
  const bottom = await cam(page);
  expect(bottom.scrollY).toBeCloseTo(bounds.maxY, 0);
});

test('arrow-key panning still works after the click feature (ISC-676)', async ({ page }) => {
  await boot(page);
  await page.mouse.click(300, 300);
  const before = await cam(page);
  await page.keyboard.down('ArrowDown');
  await page.waitForTimeout(250);
  await page.keyboard.up('ArrowDown');
  const after = await cam(page);
  expect(after.scrollY).toBeGreaterThan(before.scrollY);
});

test('marine dots: one per living marine, tracking moves and deaths (ISC-678/679/680)', async ({ page }) => {
  // debug_1's open training map guarantees a legal step exists; sh1 deploys
  // the squad boxed in (door ahead, walls beside, brothers behind).
  await boot(page, '/?deploy=0&mission=debug_1&seed=1');
  const living = await page.evaluate(() =>
    (window as any).sulk.engine.marines.filter((m: any) => m.alive).length);
  const dots = () => page.evaluate(() => (window as any).sulk.scene.minimap.lastMarineDots.length);
  expect(await dots()).toBe(living);

  // Move whichever marine can step in any direction — his dot must follow.
  const before = await page.evaluate(() => JSON.stringify((window as any).sulk.scene.minimap.lastMarineDots));
  const moved = await page.evaluate(() => {
    const deltas = [[0, -1], [0, 1], [-1, 0], [1, 0], [-1, -1], [1, -1], [-1, 1], [1, 1]];
    for (const m of (window as any).sulk.engine.marines) {
      for (const [dc, dr] of deltas) if (m.tryMove(dc, dr)) return true;
    }
    return false;
  });
  expect(moved).toBe(true);
  await page.waitForTimeout(120);
  expect(await page.evaluate(() => JSON.stringify((window as any).sulk.scene.minimap.lastMarineDots))).not.toBe(before);

  // A death thins the scope (per-frame redraw reads alive directly).
  await page.evaluate(() => { (window as any).sulk.engine.marines[0].alive = false; });
  await page.waitForTimeout(120);
  expect(await dots()).toBe(living - 1);
});

test('pulses reveal contacts from the sergeant; without him the scope goes dark (ISC-686/688/692/693)', async ({ page }) => {
  await boot(page);
  await page.mouse.click(300, 300); // unlock audio → tracker would start; detach it
  const staged = await page.evaluate(() => {
    const { sulk } = window as any;
    sulk.audio.onPing = undefined; // deterministic manual pulses only
    // One contact near the squad, one across the map.
    const near = new sulk.Genestealer(sulk.engine.state.board, { c: 20, r: 19 }, 0);
    new sulk.Genestealer(sulk.engine.state.board, { c: 1, r: 1 }, 0);
    const blipId = sulk.engine.state.pieces.find((p: any) => p.kind === 'blip' && p.alive)?.id ?? null;
    const stealerId = near.id;
    const sgts = sulk.engine.marines
      .filter((m: any) => m.alive && m.spriteKey.startsWith('terminator_sergeant'))
      .map((m: any) => ({ x: m.pos.c, y: m.pos.r }));
    // Missions can open with blips already on the board — count ALL contacts.
    const contacts = sulk.engine.state.pieces
      .filter((p: any) => p.alive && (p.kind === 'stealer' || p.kind === 'blip')).length;
    return { sgts, contacts, stealerId, blipId, echoesBeforePulse: sulk.scene.minimap.activeEchoes() };
  });
  expect(staged.sgts.length).toBeGreaterThan(0);
  // Contacts exist but the scanner has not swept: nothing shows (ISC-686).
  expect(staged.echoesBeforePulse).toBe(0);

  const pulse = await page.evaluate(() => {
    const { sulk } = window as any;
    sulk.scene.minimap.pulse(2000);
    return { ...sulk.scene.minimap.lastPulse };
  });
  expect(pulse.origins).toEqual(staged.sgts); // the wave starts AT the sergeant (ISC-688)
  expect(pulse.contacts).toBe(staged.contacts);
  // Kind→style wiring: the stealer wears the solid texture, the blip the
  // smear — swap the ternary arms in pulse() and this fails (ISC-682/684).
  expect(await page.evaluate((id) => (window as any).sulk.scene.minimap.echoTexture(id), staged.stealerId))
    .toBe('echo_stealer');
  expect(await page.evaluate((id) => (window as any).sulk.scene.minimap.echoTexture(id), staged.blipId))
    .toBe('echo_blip');
  // By 900ms even the far contact has been swept and is still fading in view.
  await page.waitForTimeout(900);
  expect(await page.evaluate(() => (window as any).sulk.scene.minimap.activeEchoes())).toBe(staged.contacts);

  // Kill every sergeant: the next pulse clears the scope and spawns nothing.
  const dark = await page.evaluate(() => {
    const { sulk } = window as any;
    for (const m of sulk.engine.marines) {
      if (m.spriteKey.startsWith('terminator_sergeant')) m.alive = false;
    }
    sulk.scene.minimap.pulse(2000);
    return {
      origins: sulk.scene.minimap.lastPulse.origins,
      echoes: sulk.scene.minimap.activeEchoes(),
    };
  });
  expect(dark.origins).toEqual([]);
  expect(dark.echoes).toBe(0);
  // The red dots are not the auspex — marines stay on the map (ISC-693).
  await page.waitForTimeout(120);
  expect(await page.evaluate(() => (window as any).sulk.scene.minimap.lastMarineDots.length)).toBeGreaterThan(0);
});

test('beta_2: pulses ride BOTH sergeants, and one death does not darken the scope (ISC-688/692)', async ({ page }) => {
  await boot(page, '/?deploy=0&mission=beta_2&seed=1');
  await page.mouse.click(300, 300);
  const first = await page.evaluate(() => {
    const { sulk } = window as any;
    sulk.audio.onPing = undefined;
    new sulk.Genestealer(sulk.engine.state.board, { c: 11, r: 16 }, 0);
    sulk.scene.minimap.pulse(2000);
    const sgts = sulk.engine.marines
      .filter((m: any) => m.alive && m.spriteKey.startsWith('terminator_sergeant'))
      .map((m: any) => ({ x: m.pos.c, y: m.pos.r }));
    return { sgts, origins: sulk.scene.minimap.lastPulse.origins };
  });
  const key = (p: { x: number; y: number }) => `${p.x},${p.y}`;
  expect(first.origins.map(key).sort()).toEqual(first.sgts.map(key).sort());
  expect(first.origins.length).toBe(2);

  // One sergeant falls: the OTHER keeps the auspex alive (any-alive, not first-match).
  const second = await page.evaluate(() => {
    const { sulk } = window as any;
    sulk.engine.marines.find((m: any) => m.alive && m.spriteKey.startsWith('terminator_sergeant')).alive = false;
    sulk.scene.minimap.pulse(2000);
    return { origins: sulk.scene.minimap.lastPulse.origins };
  });
  expect(second.origins.length).toBe(1);
  await page.waitForTimeout(900);
  expect(await page.evaluate(() => (window as any).sulk.scene.minimap.activeEchoes())).toBeGreaterThan(0);
});

test('the live wiring pulses on its own: tracker pings drive the minimap without test scaffolding (ISC-691)', async ({ page }) => {
  await boot(page); // sh1 opens with blips on the board, so the tracker ticks
  await page.mouse.click(300, 300); // gesture: unlocks audio, starts the scheduler
  // No manual pulse() call anywhere — lastPulse can only be set by the real
  // onPing → minimap.pulse chain (idle cadence tops out at 2.4s).
  await page.waitForFunction(
    () => (window as any).sulk.scene.minimap.lastPulse !== null,
    undefined, { timeout: 8000 },
  );
  const origins = await page.evaluate(() => (window as any).sulk.scene.minimap.lastPulse.origins.length);
  expect(origins).toBeGreaterThan(0);
});

test('attract mode: no audio manager, no pulses, no echoes, no errors (ISC-695)', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', e => errors.push(String(e)));
  await page.goto('/');
  await page.waitForFunction(() => (window as any).sulk?.scene?.minimap !== undefined, undefined, { timeout: 15000 });
  const state = await page.evaluate(() => ({
    audio: (window as any).sulk.audio ?? null,
    echoes: (window as any).sulk.scene.minimap.activeEchoes(),
    pulse: (window as any).sulk.scene.minimap.lastPulse,
  }));
  expect(state.audio).toBeNull();
  expect(state.echoes).toBe(0);
  expect(state.pulse).toBeNull();
  expect(errors).toEqual([]);
});

test('a far stealer door creaks quiet; a marine-adjacent door plays full (ISC-701/706)', async ({ page }) => {
  await boot(page);
  await page.mouse.click(300, 300); // gesture: unlock so plays are real
  const volumes = await page.evaluate(() => {
    const { sulk } = window as any;
    const marines = sulk.engine.marines.filter((m: any) => m.alive);
    const near = { x: marines[0].pos.c, y: marines[0].pos.r };
    sulk.PieceEvents.emit('doorToggled', { x: near.x, y: near.y, facing: 0, open: true });
    const nearPlay = { ...sulk.audio.lastPlay };
    // The board square farthest (Chebyshev) from every living marine.
    const board = sulk.engine.state.board;
    let far = { x: 0, y: 0 }, best = -1;
    for (let x = 0; x < board.width; x++) for (let y = 0; y < board.height; y++) {
      const d = Math.min(...marines.map((m: any) => Math.max(Math.abs(m.pos.c - x), Math.abs(m.pos.r - y))));
      if (d > best) { best = d; far = { x, y }; }
    }
    sulk.PieceEvents.emit('doorToggled', { x: far.x, y: far.y, facing: 0, open: true });
    const farPlay = { ...sulk.audio.lastPlay };
    return { nearPlay, farPlay, farDist: best };
  });
  expect(volumes.nearPlay.key).toBe('sfx_door');
  expect(volumes.nearPlay.volume).toBeCloseTo(0.8, 5); // full gain at the squad
  expect(volumes.farDist).toBeGreaterThan(4); // sanity: the far square IS far
  expect(volumes.farPlay.volume).toBeLessThan(volumes.nearPlay.volume);
  expect(volumes.farPlay.volume).toBeGreaterThanOrEqual(0.8 * 0.25); // quiet, never silent

  // Marine-caused sounds stay UNROUTED at full gain — "completing" the
  // positional rule by attenuating your own gunfire is the regression here.
  const shot = await page.evaluate(() => {
    const { sulk } = window as any;
    const m = sulk.engine.marines.find((x: any) => x.alive);
    sulk.PieceEvents.emit('shot', { shooterId: m.id, targetId: '', x: 0, y: 0, rolls: [1], hit: false });
    return { ...sulk.audio.lastPlay };
  });
  expect(shot.volume).toBeCloseTo(0.8, 5);
});
