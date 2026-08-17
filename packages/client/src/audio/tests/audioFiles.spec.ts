import { describe, it, expect } from 'vitest';
import { readdirSync } from 'node:fs';
import { join } from 'node:path';
import { MUSIC_TRACKS } from '../audioManifest';
import { ALIEN_SEGMENTS } from '../alienSegments';

/**
 * The shipped audio set and the credit manifest must be the SAME set, both
 * directions: every committed file under public/assets/audio/ has a manifest
 * entry (so /credits.html attributes it), and every manifest entry has its
 * file (so the game never ships a credit for missing audio). This is the
 * guard behind the "an asset can never ship without its credit" claim.
 */

const AUDIO_DIR = join(__dirname, '../../../public/assets/audio');

// Output names for the two single-file SFX cuts, per scripts/fetchAudio.ts.
const SFX_FILES = ['sfx/bolter_fire.wav', 'sfx/tracker_ping.wav'];

const expected = new Set<string>([
  ...MUSIC_TRACKS.map(t => `music/${t.mission}.ogg`),
  ...ALIEN_SEGMENTS.map(s => `alien/${s.file}`),
  ...SFX_FILES,
]);

const onDisk = new Set<string>(
  readdirSync(AUDIO_DIR, { recursive: true, withFileTypes: true })
    .filter(d => d.isFile() && !d.name.startsWith('.'))
    .map(d => `${join(d.parentPath ?? (d as any).path).split('/').pop()}/${d.name}`),
);

describe('shipped audio ↔ credit manifest set equality', () => {
  it('every committed audio file has a manifest (credits) entry', () => {
    const uncredited = [...onDisk].filter(f => !expected.has(f));
    expect(uncredited).toEqual([]);
  });

  it('every manifest entry has its committed file', () => {
    const missing = [...expected].filter(f => !onDisk.has(f));
    expect(missing).toEqual([]);
  });
});
