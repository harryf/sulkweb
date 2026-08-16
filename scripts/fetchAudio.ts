#!/usr/bin/env bun
/**
 * Fetch + process every audio asset the game uses. Run from the repo root:
 *
 *     bun scripts/fetchAudio.ts        (or: pnpm fetch-audio)
 *
 * Sources and credits live in packages/client/src/audio/audioManifest.ts and
 * alienSegments.ts — this script is a dumb executor of that manifest.
 * Idempotent: every output is skipped if it already exists, raw downloads are
 * cached in .audio-cache/. Requires yt-dlp + ffmpeg on PATH.
 *
 * The processed audio (and the raw cache) are deliberately gitignored — see
 * CREDITS.md for why the repo ships no downloaded audio.
 */
import { existsSync, mkdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { MUSIC_TRACKS, SFX_SOURCES, musicUrl } from '../packages/client/src/audio/audioManifest.ts';
import { ALIEN_SEGMENTS } from '../packages/client/src/audio/alienSegments.ts';

const ROOT = join(import.meta.dir, '..');
const CACHE = join(ROOT, '.audio-cache');
const AUDIO = join(ROOT, 'packages/client/public/assets/audio');

const run = (cmd: string[]): void => {
  const p = Bun.spawnSync(cmd, { stdout: 'pipe', stderr: 'pipe' });
  if (p.exitCode !== 0) {
    throw new Error(`${cmd[0]} failed (${p.exitCode}): ${p.stderr.toString().split('\n').slice(-4).join('\n')}`);
  }
};

/** Download bestaudio for a video into the cache (any extension). Retries —
 *  YouTube 403s are intermittent. Returns the cached file path. */
const download = (videoId: string, stem: string): string => {
  const existing = new Bun.Glob(`${stem}.*`).scanSync({ cwd: CACHE }).next().value as string | undefined;
  if (existing) return join(CACHE, existing);
  for (let attempt = 1; ; attempt++) {
    try {
      run(['yt-dlp', '-f', 'bestaudio/best', '-o', join(CACHE, `${stem}.%(ext)s`), '--no-progress', '--retries', '5', musicUrl(videoId)]);
      break;
    } catch (e) {
      if (attempt >= 4) throw e;
      console.log(`  retry ${attempt} for ${videoId}…`);
      Bun.sleepSync(15000);
    }
  }
  const got = new Bun.Glob(`${stem}.*`).scanSync({ cwd: CACHE }).next().value as string | undefined;
  if (!got) throw new Error(`download produced no file for ${stem}`);
  return join(CACHE, got);
};

/** Overall RMS of a produced file, in dB. Digital silence reads -inf. */
const rmsDb = (file: string): number => {
  const p = Bun.spawnSync(['ffmpeg', '-hide_banner', '-i', file, '-t', '30',
    '-af', 'astats=measure_overall=RMS_level:measure_perchannel=none', '-f', 'null', '-']);
  const m = p.stderr.toString().match(/RMS level dB:\s*(-?[\d.]+|-inf)/g)?.pop();
  const v = m?.split(':')[1].trim();
  return v === '-inf' || v === undefined ? -Infinity : parseFloat(v);
};

let made = 0, skipped = 0;
const emit = (out: string, produce: () => void): void => {
  if (existsSync(out)) { skipped++; return; }
  produce();
  if (!existsSync(out)) throw new Error(`expected output missing: ${out}`);
  // Self-check: a cut that produced digital silence is a pipeline bug, not an
  // asset. (This guard exists because output-seeking once ran the fade filters
  // on the full source timeline and every cut extracted pure zeros.)
  const db = rmsDb(out);
  if (db < -60) throw new Error(`produced SILENT audio (${db} dB RMS): ${out}`);
  made++;
  console.log(`  + ${out.replace(ROOT + '/', '')} (${db.toFixed(1)} dB)`);
};

for (const dir of [CACHE, join(AUDIO, 'music'), join(AUDIO, 'sfx'), join(AUDIO, 'alien')]) {
  mkdirSync(dir, { recursive: true });
}

// ── 1. Ambient music: one loudnormed OGG Vorbis per mission ──────────────
console.log('music…');
for (const t of MUSIC_TRACKS) {
  emit(join(AUDIO, 'music', `${t.mission}.ogg`), () => {
    const raw = download(t.videoId, `music_${t.videoId}`);
    run(['ffmpeg', '-hide_banner', '-y', '-i', raw,
      '-af', 'loudnorm=I=-20:TP=-1.5:LRA=11',
      '-c:a', 'libopus', '-b:a', '112k', '-ar', '48000',
      join(AUDIO, 'music', `${t.mission}.ogg`)]);
  });
}

// ── 2. Aliens pulse rifle → storm-bolter burst ───────────────────────────
console.log('pulse rifle…');
const pulse = SFX_SOURCES.find(s => s.id === 'pulse_rifle')!;
emit(join(AUDIO, 'sfx', 'bolter_fire.wav'), () => {
  const raw = download(pulse.videoId, 'pulse_rifle_raw');
  // -ss/-t BEFORE -i (input seeking): the fade filters must see the trimmed
  // clip starting at t=0, not the full source timeline. With output seeking
  // the fade-out silences the whole source after st seconds and the seek then
  // extracts pure silence — the bug that shipped 22 silent wavs on 2026-08-15.
  run(['ffmpeg', '-hide_banner', '-y', '-ss', '0.30', '-t', '1.05', '-i', raw,
    '-af', 'afade=t=in:d=0.01,afade=t=out:st=0.90:d=0.15,loudnorm=I=-16:TP=-1',
    '-ar', '44100', '-ac', '1', join(AUDIO, 'sfx', 'bolter_fire.wav')]);
});

// ── 3. Aliens motion tracker → single clean ping ─────────────────────────
console.log('motion tracker…');
const tracker = SFX_SOURCES.find(s => s.id === 'motion_tracker')!;
emit(join(AUDIO, 'sfx', 'tracker_ping.wav'), () => {
  const raw = download(tracker.videoId, 'tracker_raw');
  run(['ffmpeg', '-hide_banner', '-y', '-ss', '0.700', '-t', '0.10', '-i', raw,
    '-af', 'afade=t=in:d=0.004,afade=t=out:st=0.07:d=0.03,loudnorm=I=-16:TP=-1',
    '-ar', '44100', '-ac', '1', join(AUDIO, 'sfx', 'tracker_ping.wav')]);
});

// ── 4. Alien: Isolation reel → classified stealer voice segments ─────────
console.log('alien segments…');
const alien = SFX_SOURCES.find(s => s.id === 'alien')!;
for (const seg of ALIEN_SEGMENTS) {
  emit(join(AUDIO, 'alien', seg.file), () => {
    const raw = download(alien.videoId, 'alien_raw');
    // Quiet skitters keep a gentler target so their noise floor stays down.
    const target = seg.role === 'stealer_move' ? '-20' : '-16';
    const fadeOut = Math.max(0.05, seg.secs - 0.25).toFixed(2);
    run(['ffmpeg', '-hide_banner', '-y',
      '-ss', String(seg.start), '-t', String(seg.secs), '-i', raw,
      '-af', `afade=t=in:d=0.02,afade=t=out:st=${fadeOut}:d=0.25,loudnorm=I=${target}:TP=-1.5`,
      '-ar', '44100', '-ac', '1', join(AUDIO, 'alien', seg.file)]);
  });
}

// ── Summary ──────────────────────────────────────────────────────────────
const du = (dir: string): number => {
  let bytes = 0;
  for (const f of new Bun.Glob('**/*').scanSync({ cwd: dir })) {
    try { bytes += statSync(join(dir, f)).size; } catch { /* dir entries */ }
  }
  return bytes;
};
console.log(`done: ${made} produced, ${skipped} already present, payload ${(du(AUDIO) / 1e6).toFixed(1)}MB`);
