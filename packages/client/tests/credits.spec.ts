import { test, expect } from '@playwright/test';
import { MUSIC_TRACKS, SFX_SOURCES } from '../src/audio/audioManifest';
import { PLAYABLE_MISSIONS } from '../src/ui/missionMeta';

/**
 * The audio credits page (/credits.html): generated from audioManifest.ts,
 * so its row counts must match the manifest exactly — an asset can never
 * ship without its attribution.
 */

test('audio credits: one linked row per music track, every SFX source, channel terms, back link', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (err: Error) => errors.push(err.message));
  await page.goto('/credits.html');

  await expect(page.locator('.manual-header h1')).toHaveText('SULK');

  // One row per manifest track, each linking its source video
  await expect(page.locator('#music-credits .music-row')).toHaveCount(MUSIC_TRACKS.length);
  for (const t of [MUSIC_TRACKS[0], MUSIC_TRACKS[MUSIC_TRACKS.length - 1]]) {
    await expect(page.locator(`#music-credits a[href="https://www.youtube.com/watch?v=${t.videoId}"]`)).toHaveText(t.title);
  }
  // Spot-check a full row (derived from the manifest, not hardcoded):
  // mission display name, original work, artist
  const first = MUSIC_TRACKS[0];
  const row1 = page.locator('#music-credits .music-row').first();
  await expect(row1).toContainText(PLAYABLE_MISSIONS.find(m => m.key === first.mission)?.name ?? first.mission);
  await expect(row1).toContainText(first.album);
  await expect(row1).toContainText(first.artist);

  // Channel credit + terms
  await expect(page.locator('a[href="https://www.youtube.com/@Musicof40K"]')).toBeVisible();
  await expect(page.locator('.terms-quote')).toContainText('credit Music of 40K');

  // Every SFX source listed and linked
  await expect(page.locator('#sfx-credits .sfx-row')).toHaveCount(SFX_SOURCES.length);
  for (const s of SFX_SOURCES) {
    await expect(page.locator(`#sfx-credits a[href="https://www.youtube.com/watch?v=${s.videoId}"]`)).toBeVisible();
  }

  // Version stamp and back link
  await expect(page.locator('#app-version')).toHaveText(/^(dev|v\d+\.\d+(\.\d+)?(-[\w.]+)?)$/);
  await page.click('#back-to-game');
  await page.waitForURL(url => !url.pathname.includes('credits'));
  await expect(page.locator('#home-overlay')).toBeVisible();

  expect(errors).toHaveLength(0);
});

test('homepage and manual link the audio credits page', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('#home-overlay #credits-link')).toHaveAttribute('href', 'credits.html');
  await page.goto('/manual.html');
  await expect(page.locator('.manual-footer #credits-link')).toHaveAttribute('href', 'credits.html');
});
