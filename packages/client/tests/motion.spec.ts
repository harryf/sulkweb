import { test, expect, type Page } from '@playwright/test';

/**
 * Main-map motion suite (ISC-733..755). Assertions run against the scene's
 * deterministic probes (motionLog, camVel) plus settle-exact position checks,
 * never against tweens sampled mid-flight.
 */

async function boot(page: Page, url = '/?deploy=0&mission=debug_1&seed=1') {
  await page.goto(url);
  await expect(page.locator('canvas')).toBeVisible();
  await page.waitForFunction(() => (window as any).sulk?.scene?.minimap !== undefined, undefined, { timeout: 15000 });
}

/** Step whichever marine has a legal move; returns its id + destination. */
const stepAnyMarine = () => {
  const { engine, scene } = (window as any).sulk;
  const deltas = [[0, -1], [0, 1], [-1, 0], [1, 0], [-1, -1], [1, -1], [-1, 1], [1, 1]];
  for (const m of engine.marines) {
    if (!m.alive) continue;
    for (const [dc, dr] of deltas) {
      if (m.tryMove(dc, dr)) {
        const spr = scene.pieceSprites[m.id];
        return {
          id: m.id, c: m.pos.c, r: m.pos.r,
          spriteX: spr.x, spriteY: spr.y,
          log: scene.motionLog.filter((e: any) => e.id === m.id),
        };
      }
    }
  }
  return null;
};

test('marine steps tween on the heavy profile and settle exactly; the engine never waits (ISC-733/751)', async ({ page }) => {
  await boot(page);
  const moved = await page.evaluate(stepAnyMarine);
  expect(moved).not.toBeNull();
  // ISC-751: the engine has already moved (payload above IS post-move engine
  // truth) while the sprite is still at the OLD square, mid-tween. A vertical
  // step leaves x untouched, so the PAIR is what must differ.
  expect(moved!.spriteX !== moved!.c * 40 + 20 || moved!.spriteY !== moved!.r * 40 + 20).toBe(true);
  // ISC-733: the probe recorded a tweened marine step on the marine profile.
  const step = moved!.log.find((e: any) => e.kind === 'marine' && e.tweened && e.durationMs > 0);
  expect(step).toBeTruthy();
  expect(step.durationMs).toBeLessThanOrEqual(200); // heavy but countdown-cheap
  // Settles at exactly the destination centre with ALL tweens quiescent —
  // the squash chain must be finished too, scale fully reset after the thud.
  await page.waitForFunction((m: any) => {
    const scene = (window as any).sulk.scene;
    const spr = scene.pieceSprites[m.id];
    return spr.x === m.c * 40 + 20 && spr.y === m.r * 40 + 20
      && scene.tweens.getTweensOf(spr).length === 0
      && spr.scaleX === 1 && spr.scaleY === 1;
  }, moved, { timeout: 5000 });
});

test('rapid consecutive steps glide without desync (ISC-754)', async ({ page }) => {
  await boot(page);
  const final = await page.evaluate(() => {
    const { engine } = (window as any).sulk;
    const deltas = [[0, -1], [0, 1], [-1, 0], [1, 0]];
    for (const m of engine.marines) {
      if (!m.alive) continue;
      let moves = 0;
      // Two immediate steps back to back — the second kills the first tween.
      for (let i = 0; i < 2; i++) {
        for (const [dc, dr] of deltas) {
          if (m.tryMove(dc, dr)) { moves++; break; }
        }
      }
      if (moves === 2) return { id: m.id, c: m.pos.c, r: m.pos.r };
    }
    return null;
  });
  expect(final).not.toBeNull();
  await page.waitForFunction((f: any) => {
    const spr = (window as any).sulk.scene.pieceSprites[f.id];
    return spr.x === f.c * 40 + 20 && spr.y === f.r * 40 + 20;
  }, final, { timeout: 5000 });
});

test('marine turns ease and settle on the exact facing angle; highlight and markers ride along (ISC-734/735)', async ({ page }) => {
  await boot(page);
  const turned = await page.evaluate(() => {
    const { engine, scene, Selection, PieceEvents } = (window as any).sulk;
    const m = engine.marines.find((x: any) => x.alive && x.apRemaining >= 4);
    Selection.select(m.id);
    scene.updateHighlight();
    PieceEvents.emit('jammed', { pieceId: m.id, jammed: true }); // marker fixture
    m.tryTurn(1);
    return { id: m.id, facing: m.facing };
  });
  // Settled rotation is angle-equivalent to facing * 90deg (mod 360).
  await page.waitForFunction((t: any) => {
    const spr = (window as any).sulk.scene.pieceSprites[t.id];
    const norm = ((spr.rotation % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
    return Math.abs(norm - t.facing * Math.PI / 2) < 1e-6;
  }, turned, { timeout: 5000 });
  // ISC-735: highlight sits ON the sprite, jam marker at its (+12,-12) perch.
  const synced = await page.evaluate((t: any) => {
    const scene = (window as any).sulk.scene;
    const spr = scene.pieceSprites[t.id];
    return {
      hl: scene.highlight.x === spr.x && scene.highlight.y === spr.y,
      jam: scene.jamMarkers[t.id].x === spr.x + 12 && scene.jamMarkers[t.id].y === spr.y - 12,
    };
  }, turned);
  expect(synced.hl).toBe(true);
  expect(synced.jam).toBe(true);
});

test('stealer-phase replay styles moves per kind: darting stealers, sliding blips (ISC-736/737)', async ({ page }) => {
  await boot(page, '/?deploy=0&mission=space_hulk_1&seed=1');
  await page.evaluate(() => {
    const { sulk } = window as any;
    // A stealer near the squad is guaranteed to act; sh1 seeds 2 blips itself.
    new sulk.Genestealer(sulk.engine.state.board, { c: 20, r: 19 }, 0);
    sulk.scene.motionLog.length = 0;
    sulk.scene.endTurn();
  });
  await page.waitForFunction(() => !(window as any).sulk.scene.animating, undefined, { timeout: 30000 });
  const log = await page.evaluate(() => (window as any).sulk.scene.motionLog);
  const stealerSteps = log.filter((e: any) => e.kind === 'stealer' && e.tweened && e.durationMs > 0);
  const blipSteps = log.filter((e: any) => e.kind === 'blip' && e.tweened && e.durationMs > 0);
  expect(stealerSteps.length).toBeGreaterThan(0);
  expect(blipSteps.length).toBeGreaterThan(0);
  // The kind contrast the eye reads: dart < slide.
  expect(stealerSteps[0].durationMs).toBeLessThan(blipSteps[0].durationMs);
});

test('doors slide open and closed, settling on the right texture at scale 1 (ISC-738)', async ({ page }) => {
  await boot(page, '/?deploy=0&mission=space_hulk_1&seed=1');
  const opened = await page.evaluate(() => {
    const { engine, scene } = (window as any).sulk;
    scene.motionLog.length = 0;
    // sh1 deploys the squad facing a door: someone can always use it.
    for (const m of engine.marines) if (m.useDoor()) break;
    return scene.motionLog.filter((e: any) => e.kind === 'door-open');
  });
  expect(opened.length).toBe(1);
  expect(opened[0].tweened).toBe(true);
  await page.waitForFunction(() => {
    const scene = (window as any).sulk.scene;
    return Object.values(scene.doorSprites).some((d: any) =>
      d.texture.key === 'door_open' && d.scaleX === 1 && d.alpha === 1);
  }, undefined, { timeout: 5000 });
  const closed = await page.evaluate(() => {
    const { engine, scene } = (window as any).sulk;
    scene.motionLog.length = 0;
    for (const m of engine.marines) if (m.useDoor()) break;
    return scene.motionLog.filter((e: any) => e.kind === 'door-close');
  });
  expect(closed.length).toBe(1);
  await page.waitForFunction(() => {
    const scene = (window as any).sulk.scene;
    return Object.values(scene.doorSprites).every((d: any) =>
      d.texture.key !== 'door_open' ? d.scaleX === 1 : true);
  }, undefined, { timeout: 5000 });
});

test('flames shimmer while alight and clean up on clear (ISC-739/740)', async ({ page }) => {
  await boot(page);
  const burning = await page.evaluate(() => {
    const { scene, PieceEvents } = (window as any).sulk;
    PieceEvents.emit('sectionFlamed', { shooterId: '', squares: [{ x: 10, y: 10 }, { x: 11, y: 10 }], kills: [] });
    return {
      count: Object.keys(scene.flameSprites).length,
      tweening: Object.values(scene.flameSprites).every((f: any) => scene.tweens.isTweening(f)),
    };
  });
  expect(burning.count).toBe(2);
  expect(burning.tweening).toBe(true);
  const cleared = await page.evaluate(() => {
    const { scene, PieceEvents } = (window as any).sulk;
    const sprites = Object.values(scene.flameSprites);
    PieceEvents.emit('flamesCleared', { squares: [{ x: 10, y: 10 }, { x: 11, y: 10 }] });
    return {
      count: Object.keys(scene.flameSprites).length,
      destroyed: sprites.every((f: any) => !f.active),
      orphanTweens: sprites.some((f: any) => scene.tweens.isTweening(f)),
    };
  });
  expect(cleared.count).toBe(0);
  expect(cleared.destroyed).toBe(true);
  expect(cleared.orphanTweens).toBe(false);
});

test('a destroyed door crumbles but its map entry dies instantly (ISC-746)', async ({ page }) => {
  await boot(page, '/?deploy=0&mission=space_hulk_1&seed=1');
  const destroyed = await page.evaluate(() => {
    const { scene, PieceEvents } = (window as any).sulk;
    const key = Object.keys(scene.doorSprites)[0];
    const sprite = scene.doorSprites[key];
    const [xy, facing] = key.split(':');
    const [x, y] = xy.split(',').map(Number);
    scene.motionLog.length = 0;
    PieceEvents.emit('doorDestroyed', { x, y, facing: Number(facing) });
    return {
      mapCleared: scene.doorSprites[key] === undefined,
      crumbles: scene.motionLog.filter((e: any) => e.kind === 'door-crumble').length,
      stillDrawn: sprite.active, // the art lingers for the crumble
    };
  });
  expect(destroyed.mapCleared).toBe(true);
  expect(destroyed.crumbles).toBe(1);
  expect(destroyed.stillDrawn).toBe(true);
  // ...then no invisible zombie door remains on the display list.
  await page.waitForFunction(() => {
    const scene = (window as any).sulk.scene;
    return scene.children.list.filter((o: any) =>
      (o.texture?.key === 'door_closed' || o.texture?.key === 'door_open') && o.alpha === 0).length === 0;
  }, undefined, { timeout: 5000 });
});

test('shots recoil the shooter and always spring back to the exact centre (ISC-741/755)', async ({ page }) => {
  await boot(page);
  const shot = await page.evaluate(() => {
    const { engine, scene, PieceEvents } = (window as any).sulk;
    const m = engine.marines.find((x: any) => x.alive);
    scene.motionLog.length = 0;
    // Two rapid synthetic bursts — the view handler is what's under test.
    PieceEvents.emit('shot', { shooterId: m.id, targetId: '', x: 0, y: 0, rolls: [1], hit: false });
    PieceEvents.emit('shot', { shooterId: m.id, targetId: '', x: 0, y: 0, rolls: [1], hit: false });
    return {
      id: m.id, c: m.pos.c, r: m.pos.r,
      recoils: scene.motionLog.filter((e: any) => e.kind === 'recoil').length,
    };
  });
  expect(shot.recoils).toBe(2);
  await page.waitForFunction((s: any) => {
    const spr = (window as any).sulk.scene.pieceSprites[s.id];
    return spr.x === s.c * 40 + 20 && spr.y === s.r * 40 + 20 && spr.scaleX === 1;
  }, shot, { timeout: 5000 });
});

test('deaths play the flourish and the sprite is gone at the end (ISC-742)', async ({ page }) => {
  await boot(page, '/?deploy=0&mission=space_hulk_1&seed=1');
  const died = await page.evaluate(() => {
    const { sulk } = window as any;
    const s = new sulk.Genestealer(sulk.engine.state.board, { c: 20, r: 19 }, 0);
    sulk.scene.motionLog.length = 0;
    sulk.PieceEvents.emit('pieceDied', { pieceId: s.id });
    return {
      id: s.id,
      death: sulk.scene.motionLog.filter((e: any) => e.kind === 'death').length,
      mapCleared: sulk.scene.pieceSprites[s.id] === undefined,
    };
  });
  expect(died.death).toBe(1);
  expect(died.mapCleared).toBe(true); // logic truth dies instantly; only art lingers
  await page.waitForFunction((d: any) => {
    const scene = (window as any).sulk.scene;
    return !scene.children.list.some((o: any) => o.pieceId === d.id && o.active);
  }, died, { timeout: 5000 });
});

test('arrow panning has inertia: ramp while held, glide to exact zero after (ISC-743/750)', async ({ page }) => {
  await boot(page);
  await page.mouse.click(300, 300);
  const before = await page.evaluate(() => (window as any).sulk.scene.cameras.main.scrollY);
  await page.keyboard.down('ArrowDown');
  await page.waitForTimeout(250);
  const held = await page.evaluate(() => ({ ...(window as any).sulk.scene.camVel }));
  await page.keyboard.up('ArrowDown');
  expect(held.y).toBeGreaterThan(0);
  const after = await page.evaluate(() => (window as any).sulk.scene.cameras.main.scrollY);
  expect(after).toBeGreaterThan(before); // ISC-750: the pan still pans
  // Glides to a full stop: velocity parks at exactly 0 and the scroll freezes.
  await page.waitForFunction(() => (window as any).sulk.scene.camVel.y === 0, undefined, { timeout: 5000 });
  const s1 = await page.evaluate(() => (window as any).sulk.scene.cameras.main.scrollY);
  await page.waitForTimeout(120);
  const s2 = await page.evaluate(() => (window as any).sulk.scene.cameras.main.scrollY);
  expect(s2).toBe(s1);
});

test('a drag flick leaves momentum; grabbing the map parks it (ISC-744/745)', async ({ page }) => {
  await boot(page);
  const fling = async () => {
    await page.mouse.move(500, 300);
    await page.mouse.down();
    for (let i = 1; i <= 5; i++) {
      await page.mouse.move(500 - i * 40, 300);
      await page.waitForTimeout(16);
    }
    await page.mouse.up();
  };
  await fling();
  const released = await page.evaluate(() => ({ ...(window as any).sulk.scene.camVel }));
  expect(Math.abs(released.x)).toBeGreaterThan(0); // ISC-744: it keeps going
  await page.waitForFunction(() => (window as any).sulk.scene.camVel.x === 0, undefined, { timeout: 5000 });
  // ISC-745: fling again, then grab — pointerdown zeroes the glide instantly.
  await fling();
  await page.mouse.move(500, 300);
  await page.mouse.down();
  const grabbed = await page.evaluate(() => ({ ...(window as any).sulk.scene.camVel }));
  await page.mouse.up();
  expect(grabbed.x).toBe(0);
  expect(grabbed.y).toBe(0);
});

test('Anti: prefers-reduced-motion snaps everything instantly (ISC-747)', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await boot(page);
  const moved = await page.evaluate(stepAnyMarine);
  expect(moved).not.toBeNull();
  // The sprite is ALREADY at the destination in the same tick — no tween ran.
  expect(moved!.spriteX).toBe(moved!.c * 40 + 20);
  expect(moved!.spriteY).toBe(moved!.r * 40 + 20);
  expect(moved!.log.every((e: any) => e.tweened === false)).toBe(true);
  // Camera: fixed-speed panning with zero inertia.
  await page.mouse.click(300, 300);
  await page.keyboard.down('ArrowDown');
  await page.waitForTimeout(150);
  const vel = await page.evaluate(() => ({ ...(window as any).sulk.scene.camVel }));
  await page.keyboard.up('ArrowDown');
  expect(vel.y).toBe(0);
});

test('Anti: reduced motion still delivers the exact terminal board state after a replay (ISC-747 companion)', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await boot(page, '/?deploy=0&mission=space_hulk_1&seed=1');
  const drift = await page.evaluate(() => {
    const { sulk } = window as any;
    new sulk.Genestealer(sulk.engine.state.board, { c: 20, r: 19 }, 0);
    sulk.scene.motionLog.length = 0;
    sulk.scene.endTurn(); // instant replay path — resolves synchronously
    const { scene, engine } = sulk;
    const T = 40;
    const bad: string[] = [];
    for (const p of engine.state.board.pieces) {
      const spr = scene.pieceSprites[p.id];
      if (!spr) { bad.push(`${p.id}:no-sprite`); continue; }
      if (spr.x !== p.pos.c * T + T / 2 || spr.y !== p.pos.r * T + T / 2) bad.push(`${p.id}:pos`);
    }
    return {
      bad,
      animating: scene.animating,
      frozen: scene.minimap.frozen,
      allUntweened: scene.motionLog.every((e: any) => e.tweened === false),
    };
  });
  expect(drift.animating).toBe(false); // input never locks for accessibility users
  expect(drift.frozen).toBe(false);
  expect(drift.allUntweened).toBe(true);
  expect(drift.bad).toEqual([]);
});

test('an escaping marine fades clean — never the red death flourish (marineEscaped path)', async ({ page }) => {
  await boot(page, '/?deploy=0&mission=space_hulk_1&seed=1');
  const escaped = await page.evaluate(() => {
    const { engine, scene, PieceEvents } = (window as any).sulk;
    const m = engine.marines.find((x: any) => x.alive);
    const spr = scene.pieceSprites[m.id];
    scene.motionLog.length = 0;
    PieceEvents.emit('marineEscaped', { pieceId: m.id, escaped: 1 });
    return {
      deathEntries: scene.motionLog.filter((e: any) => e.kind === 'death').length,
      tinted: spr.isTinted, // the red wash is applied synchronously on death
      mapCleared: scene.pieceSprites[m.id] === undefined,
      fading: scene.tweens.isTweening(spr),
    };
  });
  expect(escaped.deathEntries).toBe(0);
  expect(escaped.tinted).toBe(false);
  expect(escaped.mapCleared).toBe(true);
  expect(escaped.fading).toBe(true);
});

test('an interrupted door slide continues from where it is, then settles clean', async ({ page }) => {
  await boot(page, '/?deploy=0&mission=space_hulk_1&seed=1');
  const mid = await page.evaluate(() => {
    const { scene, PieceEvents } = (window as any).sulk;
    const key = Object.keys(scene.doorSprites)[0];
    const [xy, facing] = key.split(':');
    const [x, y] = xy.split(',').map(Number);
    // Hand-construct the mid-open state, then toggle closed: the slide must
    // continue from scaleX 0.5, not snap back to the parted sliver.
    const spr = scene.doorSprites[key];
    spr.setTexture('door_closed').setScale(0.5, 1).setAlpha(0.85);
    PieceEvents.emit('doorToggled', { x, y, facing: Number(facing), open: false });
    return { key, scaleAtCallReturn: spr.scaleX };
  });
  expect(mid.scaleAtCallReturn).toBe(0.5);
  await page.waitForFunction((k: string) => {
    const d = (window as any).sulk.scene.doorSprites[k];
    return d.texture.key === 'door_closed' && d.scaleX === 1 && d.alpha === 1;
  }, mid.key, { timeout: 5000 });
  // Same-tick double toggle (open then close) also settles clean.
  await page.evaluate((k: string) => {
    const { scene, PieceEvents } = (window as any).sulk;
    const [xy, facing] = k.split(':');
    const [x, y] = xy.split(',').map(Number);
    PieceEvents.emit('doorToggled', { x, y, facing: Number(facing), open: true });
    PieceEvents.emit('doorToggled', { x, y, facing: Number(facing), open: false });
    return scene.doorSprites[k].texture.key;
  }, mid.key);
  await page.waitForFunction((k: string) => {
    const d = (window as any).sulk.scene.doorSprites[k];
    return d.texture.key === 'door_closed' && d.scaleX === 1 && d.alpha === 1;
  }, mid.key, { timeout: 5000 });
});

test('markers ride a displaced sprite within one frame (per-frame sync mechanism)', async ({ page }) => {
  await boot(page);
  const id = await page.evaluate(() => {
    const { engine, scene, PieceEvents } = (window as any).sulk;
    const m = engine.marines.find((x: any) => x.alive);
    PieceEvents.emit('jammed', { pieceId: m.id, jammed: true });
    // Displace the sprite by hand — no tween involved; only the per-frame
    // update() sync can carry the marker to the new spot.
    scene.pieceSprites[m.id].setPosition(scene.pieceSprites[m.id].x + 7, scene.pieceSprites[m.id].y);
    return m.id;
  });
  await page.waitForFunction((pid: string) => {
    const scene = (window as any).sulk.scene;
    const spr = scene.pieceSprites[pid];
    const jam = scene.jamMarkers[pid];
    return jam.x === spr.x + 12 && jam.y === spr.y - 12;
  }, id, { timeout: 5000 });
});

test('a stalled frame never slingshots the camera (dt clamp on the integrator)', async ({ page }) => {
  await boot(page);
  const jump = await page.evaluate(() => {
    const scene = (window as any).sulk.scene;
    const cam = scene.cameras.main;
    scene.camVel.x = 0.66; // saturated glide
    const before = cam.scrollX;
    scene.update(0, 5000); // a five-second GC stall
    return Math.abs(cam.scrollX - before);
  });
  expect(jump).toBeLessThanOrEqual(0.66 * 50 + 1e-6); // clamped to a 50ms step
});

test('the acted-refresh after a real shot never kills its own recoil (early-bail guard)', async ({ page }) => {
  await boot(page);
  // Face the marine WEST first: Phaser wraps rotation to (-pi, pi], so the
  // south/west facings are exactly where a raw facing*pi/2 comparison fails
  // and the bail silently stops firing (reviewer regression).
  const id = await page.evaluate(() => {
    const { engine } = (window as any).sulk;
    const m = engine.marines.find((x: any) => x.alive && x.apRemaining >= 4);
    while (m.facing !== 3) m.tryTurn(1);
    return m.id;
  });
  await page.waitForFunction((pid: string) => {
    const scene = (window as any).sulk.scene;
    return scene.tweens.getTweensOf(scene.pieceSprites[pid]).length === 0;
  }, id, { timeout: 5000 });
  const kept = await page.evaluate((pid: string) => {
    const { engine, scene, PieceEvents } = (window as any).sulk;
    const m = engine.findPiece(pid);
    scene.motionLog.length = 0;
    PieceEvents.emit('shot', { shooterId: pid, targetId: '', x: 0, y: 0, rolls: [1], hit: false });
    // The keydown handler's acted branch runs this right after handleFire —
    // the moveSprite early-bail must leave the recoil tween alive and add no
    // phantom motion entry.
    scene.refreshPieceSprite(m);
    return {
      tweening: scene.tweens.isTweening(scene.pieceSprites[pid]),
      phantoms: scene.motionLog.filter((e: any) => e.kind === 'marine').length,
    };
  }, id);
  expect(kept.tweening).toBe(true);
  expect(kept.phantoms).toBe(0);
});

test('Anti: post-replay reconciliation is exact — position, scale, alpha (ISC-748)', async ({ page }) => {
  await boot(page, '/?deploy=0&mission=space_hulk_1&seed=1');
  await page.evaluate(() => {
    const { sulk } = window as any;
    new sulk.Genestealer(sulk.engine.state.board, { c: 20, r: 19 }, 0);
    sulk.scene.endTurn();
  });
  await page.waitForFunction(() => !(window as any).sulk.scene.animating, undefined, { timeout: 30000 });
  const drift = await page.evaluate(() => {
    const { scene, engine } = (window as any).sulk;
    const T = 40;
    const bad: string[] = [];
    for (const p of engine.state.board.pieces) {
      const spr = scene.pieceSprites[p.id];
      if (!spr) { bad.push(`${p.id}:no-sprite`); continue; }
      if (spr.x !== p.pos.c * T + T / 2 || spr.y !== p.pos.r * T + T / 2) bad.push(`${p.id}:pos`);
      if (spr.scaleX !== 1 || spr.scaleY !== 1) bad.push(`${p.id}:scale`);
      if (spr.alpha !== 1) bad.push(`${p.id}:alpha`);
    }
    return bad;
  });
  expect(drift).toEqual([]);
});
