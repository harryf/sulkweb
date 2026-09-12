import { test, expect } from '@playwright/test';

/**
 * Sound system e2e (ISC-310/311/326/331/332/334): AudioManager boots with the
 * right mission track, assets serve over HTTP, no autoplay-policy errors,
 * mute persists, and the required Music of 40K credit is visible.
 * Playback itself is asserted via manager/sound state, never audible output —
 * headless audio devices are not trustworthy.
 */

test('space_hulk_2: audio assets serve; manager holds the mission track; no autoplay errors', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (err: Error) => errors.push(err.message));
  const consoleErrors: string[] = [];
  page.on('console', msg => { if (msg.type() === 'error') consoleErrors.push(msg.text()); });

  await page.goto('/?deploy=0&tick=0&mission=space_hulk_2&seed=1');
  await page.waitForFunction(() => (window as any).sulk?.audio !== undefined, undefined, { timeout: 15000 });

  expect(await page.evaluate(() => (window as any).sulk.audio.trackKey)).toBe('music_space_hulk_2');

  // The mapped assets actually serve (ISC-331).
  for (const path of [
    '/assets/audio/music/space_hulk_2.ogg',
    '/assets/audio/sfx/bolter_fire.wav',
    '/assets/audio/sfx/tracker_ping.wav',
    '/assets/audio/alien/alien_death_01.wav',
    '/assets/sounds/door_open.wav',
  ]) {
    const status = await page.evaluate(async p => (await fetch(p)).status, path);
    expect(status, path).toBe(200);
  }

  // Decoded into the audio cache (loader finished, format decodable).
  await page.waitForFunction(() =>
    (window as any).sulk.scene.cache.audio.exists('music_space_hulk_2') &&
    (window as any).sulk.scene.cache.audio.exists('sfx_bolter'), undefined, { timeout: 15000 });

  // A user gesture unlocks audio and the ambient bed starts looping (ISC-310).
  await page.mouse.click(300, 300);
  await page.waitForFunction(() => {
    const s = (window as any).sulk.scene.sound;
    const music = s.get('music_space_hulk_2');
    return !s.locked && music && music.isPlaying && music.loop === true;
  }, undefined, { timeout: 10000 });

  // Ducking live (ISC-312/313): contact swells the bed above the quiet
  // level, its passing settles it back down (the tick event re-reads contact).
  // (Right at unlock Phaser reports volume=1 for a beat before the config
  // volume lands — wait for the quiet bed to settle instead of reading once.)
  await page.waitForFunction(() =>
    (window as any).sulk.scene.sound.get('music_space_hulk_2').volume < 0.2,
    undefined, { timeout: 6000 });
  // A stealer beside the squad, then one tick: the real handler + tween path.
  await page.evaluate(() => {
    const { sulk } = window as any;
    for (const m of sulk.engine.marines) m.lastCommandTick = 1e9; // no AI shot removes it
    const m = sulk.engine.marines[0];
    (window as any).contact = new sulk.Genestealer(sulk.engine.state.board, { c: m.pos.c, r: m.pos.r + 2 }, 0);
    (window as any).contact.ap = 0;
    sulk.engine.state.board.locked = true; // nobody moves; the contact just stands there
    sulk.step(1);
  });
  await page.waitForFunction(() =>
    (window as any).sulk.scene.sound.get('music_space_hulk_2').volume > 0.3,
    undefined, { timeout: 6000 });
  await page.evaluate(() => {
    const { sulk } = window as any;
    sulk.engine.state.board.locked = false;
    (window as any).contact.die();
    sulk.engine.state.board.locked = true;
    sulk.step(1);
  });
  await page.waitForFunction(() =>
    (window as any).sulk.scene.sound.get('music_space_hulk_2').volume < 0.2,
    undefined, { timeout: 6000 });

  // No page errors, no autoplay-policy console errors (ISC-311).
  expect(errors).toHaveLength(0);
  expect(consoleErrors.filter(e => /autoplay|AudioContext/i.test(e))).toHaveLength(0);
});

test('mute toggles with K (M is melee now) and survives reload (ISC-326/332/640/641)', async ({ page }) => {
  await page.goto('/?deploy=0&mission=debug_1&seed=1');
  await page.waitForFunction(() => (window as any).sulk?.audio !== undefined, undefined, { timeout: 15000 });
  expect(await page.evaluate(() => (window as any).sulk.audio.muted)).toBe(false);

  await page.mouse.click(300, 300); // focus the canvas
  await page.keyboard.press('m'); // M no longer touches the audio (ISC-641)
  await page.waitForTimeout(150);
  expect(await page.evaluate(() => (window as any).sulk.audio.muted)).toBe(false);
  await page.keyboard.press('k');
  await expect.poll(() => page.evaluate(() => (window as any).sulk.audio.muted)).toBe(true);
  expect(await page.evaluate(() => (window as any).sulk.scene.sound.mute)).toBe(true);

  await page.reload();
  await page.waitForFunction(() => (window as any).sulk?.audio !== undefined, undefined, { timeout: 15000 });
  expect(await page.evaluate(() => (window as any).sulk.audio.muted)).toBe(true);
  expect(await page.evaluate(() => localStorage.getItem('sulk_muted'))).toBe('1');
  // Clean up for other tests.
  await page.evaluate(() => localStorage.removeItem('sulk_muted'));
});

test('space_hulk_1: music keys on the REGISTRY key, not the display name (ISC-336)', async ({ page }) => {
  // space_hulk_1's mission.name is "Suicide Mission" — the bug that silenced
  // the 2026-08-15 release keyed music off mission.name and only missions
  // whose display name equalled their registry key ever loaded a track.
  await page.goto('/?deploy=0&mission=space_hulk_1&seed=1');
  await page.waitForFunction(() => (window as any).sulk?.audio !== undefined, undefined, { timeout: 15000 });
  expect(await page.evaluate(() => (window as any).sulk.engine.mission.name)).toBe('Suicide Mission');
  expect(await page.evaluate(() => (window as any).sulk.audio.trackKey)).toBe('music_space_hulk_1');
  await page.waitForFunction(() =>
    (window as any).sulk.scene.cache.audio.exists('music_space_hulk_1'), undefined, { timeout: 15000 });
  await page.mouse.click(300, 300);
  await page.waitForFunction(() => {
    const s = (window as any).sulk.scene.sound;
    const m = s.get('music_space_hulk_1');
    return m && m.isPlaying && s.context?.state === 'running';
  }, undefined, { timeout: 10000 });
});

test('required Music of 40K credit is visible and links the channel (ISC-334)', async ({ page }) => {
  await page.goto('/?deploy=0&mission=beta_2&seed=1');
  await page.waitForFunction(() => (window as any).sulk?.audio !== undefined, undefined, { timeout: 15000 });
  const credit = page.locator('.audio-credit');
  await expect(credit).toContainText('Music of 40K');
  // The credit block also links the credits page — target the channel link by
  // name (bare `a` trips Playwright strict mode with two matches).
  await expect(credit.getByRole('link', { name: 'Music of 40K' }))
    .toHaveAttribute('href', 'https://www.youtube.com/@Musicof40K');
});
