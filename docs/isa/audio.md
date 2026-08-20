# ISA Archive: Audio (music, SFX, motion tracker, fades)

> Verbatim archive of completed run records moved out of the root [ISA.md](../../ISA.md).
> Read this before changing the matching part of the codebase. ISC IDs are stable and
> unique across the whole ISA; this file is their single home now. Text is preserved
> exactly as written at the time (including pre-ban em dashes).

## Criteria (archived runs)

### Sound system (2026-08-15, user: "work on the sounds in the game")

Asset pipeline (yt-dlp + ffmpeg, manifest-driven, nothing hand-managed):

- [x] ISC-297: `scripts/fetchAudio.ts` (TypeScript via bun) downloads every manifest asset; idempotent — second run skips all existing files (Bash: run twice)
- [x] ISC-298: manifest maps each of the 9 registered missions to a distinct Music of 40K playlist track by videoId (vitest)
- [x] ISC-299: manifest carries per-track credit fields — title, video URL, channel, and composer/source credits pulled from each video description (vitest schema + Read)
- [x] ISC-300: music transcoded with loudnorm to a common LUFS target, AAC .m4a; ffprobe shows aac codec and >60s duration for all 9 (Bash ffprobe)
- [x] ISC-301: pulse-rifle burst cut from uz0UkvGU2qE into a ≤2.5s bolter-fire wav (ffprobe)
- [x] ISC-302: single clean motion-tracker ping cut from VancAKcmO6s, ≤1.5s (ffprobe)
- [x] ISC-303: alien SFX video qiyXFQKheOU silence-segmented into ≥8 individual wavs (Bash ls count)
- [x] ISC-304: every alien segment gets a manifest entry with heuristic label (move/attack/death/door candidates) + duration/spectral stats; ambiguous ones flagged for user classification (Read manifest)
- [x] ISC-305: original Sulk 0.29 public-domain wavs (bolter, flamer, cannon, cc, chain_fist, jam, scream, move, door, selfdestruct) copied in with provenance from SOUNDS_INFO (Bash ls + CREDITS)
- [x] ISC-306: Anti: no downloaded/derived audio binary committed — `git ls-files` shows zero audio files under the fetched-audio dirs (Bash)
- [x] ISC-307: CREDITS.md credits Music of 40K (channel + per-track video links + underlying composer credits), the three Aliens/Isolation SFX videos, and Sulk SOUNDS_INFO (Read)
- [x] ISC-308: README Audio section: one-command fetch, credit requirements, ducking + tracker design (Read)

Client integration (AudioManager, event-driven):

- [x] ISC-309: `src/audio/AudioManager.ts` consumes PieceEvents + read-only engine snapshots; zero engine mutation (Grep)
- [x] ISC-310: the current mission's track loops continuously once audio unlocks (e2e)
- [x] ISC-311: audio starts only on first user gesture — zero autoplay-policy console errors on load (Playwright console)
- [x] ISC-312: marine phase = quiet music level, stealer phase = louder level, both named in one config object (vitest)
- [x] ISC-313: volume transitions fade ≥500ms — never a hard cut (vitest/e2e)
- [x] ISC-314: ducking is driven by phaseChanged as replayed — correct on both the timeline path and the prefers-reduced-motion synchronous path (vitest with captured stream)
- [x] ISC-315: shot → weapon-correct SFX: storm bolter/pistol→pulse-rifle burst, flamer→flamer, assault cannon→cannon (vitest)
- [x] ISC-316: doorToggled → door sound (vitest)
- [x] ISC-317: stealer death → alien death cry; marine death → skewered scream (vitest)
- [x] ISC-318: closeCombat → cc punch; chain-fist attacker → chain_fist (vitest)
- [x] ISC-319: jammed → jam sound (vitest)
- [x] ISC-320: stealer pieceMoved during replay → skitter, throttled so a 20-step replay fires ≤1 per 150ms window (vitest)
- [x] ISC-321: blipConverted → reveal hiss (vitest)
- [x] ISC-322: motion-tracker ping interval maps nearest threat→marine distance monotonically (closer = faster) within [min,max] bounds (vitest)
- [x] ISC-323: tracker pitch/detune rises as distance shrinks (vitest)
- [x] ISC-324: tracker silent when no threats on board or after gameOver (vitest)
- [x] ISC-325: gameOver fades music out and stops the tracker (vitest)
- [x] ISC-326: M toggles mute, persisted in localStorage, documented in the HUD legend (e2e)
- [x] ISC-327: Antecedent: music reads as *background* — its loud (stealer) ceiling stays at or below half the SFX gain (Read config)
- [x] ISC-328: Anti: missing audio files never break boot — loader errors tolerated, game runs silently, zero page errors (vitest guard + Playwright)
- [x] ISC-329: Anti: all pre-existing suites stay green and `pnpm -r build` stays clean (Bash)
- [x] ISC-330: Anti: pipeline is bun + TypeScript only — no npm/npx, no Python (Grep scripts/)
- [x] ISC-331: e2e: space_hulk_2's mapped music file serves HTTP 200 and AudioManager holds the right track key (Playwright)
- [x] ISC-332: e2e: mute state survives page reload (Playwright)
- [x] ISC-333: fetched audio payload ≤80MB total (Bash du)
- [x] ISC-334: visible in-game credit line "Music: Music of 40K" linking the channel (e2e text probe)

### Silent-audio fix (2026-08-16, user: "not hearing any of the new audio" + VLC-silent wav)

- [x] ISC-335: every file fetchAudio produces carries real signal — script self-check throws on <−60 dB RMS output (Bash: regenerated set −15.9…−33.7 dB)
- [x] ISC-336: music keys on the mission REGISTRY key — space_hulk_1 ("Suicide Mission") and debug_1 ("Demo Board") load their tracks (Playwright regression test)
- [x] ISC-337: Anti: a suspended AudioContext (Brave) never leaves the game silently "playing" — gesture-driven resume; verified running in the user's own browser (Chrome MCP probe)

### Music fades + favicon (deploy v0.3.2)

- [x] ISC-554: music starts at volume 0 and fades in to the duck target (Read AudioManager + e2e volume ramp)
- [x] ISC-555: document hidden pauses the music immediately (visibilitychange handler) (Read + browser probe)
- [x] ISC-556: document visible again resumes music with a fade-in (Read)
- [x] ISC-557: destroy() removes the visibility listener (Read)
- [x] ISC-558: e2e asserts music isPlaying with rising volume after mission start in dev (Playwright)
- [x] ISC-559: favicon.png generated from a marine sprite, committed under public/ (file exists)
- [x] ISC-560: index/manual/credits HTML all link rel=icon favicon.png; no vite.svg references remain (Grep)
- [x] ISC-561: built dist carries favicon.png and the icon links (Bash)
- [x] ISC-562: local gates green: tsc, unit suites, affected e2e (Bash)
- [x] ISC-563: tag v0.3.2 deploy run success (gh)
- [x] ISC-564: live favicon.png returns 200 and live pages reference it (curl)
- [x] ISC-565: live real-Chrome probe: hidden tab pauses music (browser)
- [x] ISC-566: work committed with a clean tree (git status)

## Verification (archived evidence)

### Fades + favicon run (2026-08-17, ISC-554..566)

- ISC-554: AudioManager.startMusic — add({loop, volume: 0}) + play() + fadeIn() with `volume: {from: 0, to: duckTarget}` over musicFadeInMs 1800; e2e asserts early < 0.16 and rising
- ISC-555/556: onVisibility — hidden: killTweensOf + pause; visible: resume + fadeIn; e2e dispatches visibilitychange both ways (isPaused true, then isPlaying true)
- ISC-557: destroy() removeEventListener read back; GameScene shutdown already calls audio.destroy
- ISC-558: home.spec "music fades in from silence" green (after the play()-resets-volume fix)
- ISC-559/560: public/favicon.png (= terminator_storm_bolter.png, 40×40); all three HTML link rel=icon /favicon.png; vite.svg deleted, zero references repo-wide
- ISC-561: dist build carries favicon.png; live pages emit href="./favicon.png"
- ISC-562: tsc clean; unit 45/45; full e2e 54/54 pre-commit, +2 new tests green
- ISC-563: v0.3.2 deploy run success (both jobs)
- ISC-564: curl live favicon.png → 200 image/png; all three live pages reference it
- ISC-565: live real-Chrome: music_space_hulk_3 playing with volume rising (fade-in), visibilitychange dispatch in the hidden tab → isPaused true
- ISC-566: commits f6bea9c + 47e9879 pushed; tree clean except ISA record

