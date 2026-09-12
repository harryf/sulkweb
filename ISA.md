---
project: sulkweb
task: "Project ISA; Sulk Web (playable Space Hulk port)"
effort: E4
effort_source: context-override
phase: execute
progress: "1257/1273 (stage 1 closed with the verdict; handover run ISC-1325..1340 open; ISC-1038 dropped; ISC-71 deferred)"
mode: interactive
started: 2026-08-14T15:20:00Z
updated: 2026-09-12T22:05:00Z
---

# Sulk Web: Project ISA

## Problem

A web port of the classic Pygame game Sulk (Space Hulk clone) stalled mid-Milestone-3 of a nine-milestone roadmap. The working tree was abandoned with failing client tests, an uncommitted HUD refactor, and no playable game loop: pieces can move, but there are no doors, no shooting, no enemy, no turns, no way to win or lose. Progress stalled because UI/gameplay bugs kept appearing and nothing was ever verified in a real browser; trust in the process collapsed before the game became a game.

## Vision

Open `localhost:5173` and *play Space Hulk in the browser*: marines advance down corridors of a real mission map, doors grind open, a storm bolter chatters on overwatch as genestealer blips convert and rush the line, and the mission ends in a win or a bloody wipe. The euphoric surprise: "it actually plays; this abandoned repo became a game."

## Out of Scope

- Multiplayer / networking (Colyseus etc.); the original real-time multiplayer ambition is explicitly dropped; this is the single-player, turn-based port per the sulkweb roadmap.
- Music. *(Sound EFFECTS moved IN scope by the 2026-08-15 faithful-recreation directive; the original GPL wav set is now wired; see Decisions.)*
- Mobile/touch support; desktop browser only.
- Additional missions beyond the Space Hulk campaign set shipped in the original Sulk; v0.1 requires only Mission 1 playable.
- Theming/skinning UI beyond the existing `default` theme assets.
- Renaming trademarked terms for public release (tracked, but not v0.1).
- Python/Pygame feature parity in edge rules (e.g. exotic pieces) where the manual and code disagree; Sulk manual wins.

## Principles

- The engine is pure TypeScript with zero Phaser imports; every rule is unit-testable headlessly. Rendering is a projection of engine state, never the owner of it.
- No claim of "working" without a probe: engine claims need a passing test; UI claims need a real-browser verification.
- Ship vertical slices: each milestone ends with something playable and committed, never an uncommitted mid-refactor tree.
- Prefer the original Sulk rules (manual + Pygame source in docs/) over invention; where ambiguous, pick the simplest rule that keeps the game fun and note the decision.

## Constraints

- Monorepo: pnpm workspaces, `packages/engine` (pure rules) + `packages/client` (Phaser 3 + Vite + TypeScript strict, NodeNext modules with explicit `.js` import extensions).
- Test stack: Vitest for engine and client units; Playwright for client e2e.
- Existing engine public API (`GameEngine`, `Board`, `Square`, `Piece`, phases, `loadMission`) is evolved, not rewritten.
- Assets are the existing PNG set in `packages/client/public/assets/themes/default/`; no new art pipeline.
- Node 22 / pnpm 10 toolchain as installed.

## Goal

From the abandoned mid-M3 state, reach a verified-playable Sulk v0.1 slice: all tests green, HUD complete, and the full game loop (movement, doors, shooting, overwatch, close combat, blips, basic stealer AI, turn phases, victory/defeat) playable in the browser on the real Mission-1 map, with the repo left committed and documented at every milestone boundary.

## Criteria

### How this file stays small (archive protocol)

This root ISA holds the living core: Problem through Goal, the cross-cutting
invariants and anti-criteria, the most recent one or two runs (criteria,
decisions, verification), and this index. Completed run records are archived
verbatim by code area under [docs/isa/](docs/isa/README.md); read the matching
archive before changing that part of the codebase. Protocol per new run:
append the run's criteria/decisions/verification here as usual; when the run
after next completes, move the oldest kept run's blocks to its topic archive.
ISC IDs are stable, never renumbered, and each lives in exactly one file.

| Archive | Covers | ISC runs include |
|---|---|---|
| [docs/isa/engine-core.md](docs/isa/engine-core.md) | movement, combat, shooting, doors, LOS, blips, kill-reveals | Stabilize, M4, M5, M6, edge doors, diagonal moves, door-corner LOS, flamer targeting |
| [docs/isa/missions.md](docs/isa/missions.md) | mission transcription, fidelity, victory conditions | M7, map fidelity, mission library, faithful-recreation audit (ISC-77..390 area) |
| [docs/isa/stealer-ai.md](docs/isa/stealer-ai.md) | hive AI, pin/blood/zigzag, charging, autopilot | ISC-567..601, 763..794 |
| [docs/isa/client-ui.md](docs/isa/client-ui.md) | HUD, roster, minimap radar, input/keys, motion, home page, manual, deployment phase | ISC-472..514, 604..712, 724..761, 798..830 area |
| [docs/isa/audio.md](docs/isa/audio.md) | music, SFX, tracker, fades | sound system, silent-audio fix, fades + favicon |
| [docs/isa/releases-infra.md](docs/isa/releases-infra.md) | CI, Pages deploy, release hygiene | M8, Pages deploy, audio-ship, ISC-515..553 area |
| [docs/isa/docs-meta.md](docs/isa/docs-meta.md) | documentation and repo meta work | asset index, guides, rules reference, code review, README rewrite and docs reorganization, ISC-400..471 and 849..875 area |
| [docs/isa/decisions-log.md](docs/isa/decisions-log.md) | chronological archive of older Decisions entries | all runs |
| [docs/isa/changelog-log.md](docs/isa/changelog-log.md) | the conjecture/refutation/learning trail | all runs |

Deferred and open items living in archives (pointers, not duplicates):

- ISC-601 [DEFERRED-VERIFY]: beta_2 winnable under skilled play, designer playtest pending (docs/isa/stealer-ai.md)
- ISC-615 [DROPPED]: tombstone, see decisions-log (docs/isa/engine-core.md)
- ISC-619 [DEFERRED-VERIFY]: live-site real-Chrome boot check once Interceptor is repaired (docs/isa/client-ui.md)
- ISC-71 [DEFERRED-VERIFY]: FPS probe, lives below under Cross-cutting invariants

### Cross-cutting invariants

- [x] ISC-66: Engine package still imports zero Phaser symbols (`rg "phaser" packages/engine/src` empty)
- [x] ISC-67: TypeScript strict mode passes across both packages with no `// @ts-ignore` added
- [x] ISC-68: No `as any` casts added to engine public API surface (client shims allowed where Phaser mocks force it)
- [x] ISC-69: All engine rule modules have unit tests; engine line coverage ≥90%
- [x] ISC-70: Browser console shows zero errors during a full Mission 1 playthrough
- [DEFERRED-VERIFY] ISC-71: Board of Mission 1 size renders at ≥30 FPS during pan (no visible jank in verification recording)

### Anti-criteria

- [x] ISC-72: Anti: no networking/multiplayer dependency appears in any package.json
- [x] ISC-73: Anti: engine never reads `window`, `document`, or Phaser globals (grep probe)
- [x] ISC-74: Anti: no milestone marked done in README without its ISCs verified
- [x] ISC-75: Anti: working tree never left with failing tests at end of a work session
- [x] ISC-76: Anti: no Python/Pygame code copied verbatim; rules re-expressed in TypeScript with tests

### Em dash purge + ISA restructure (2026-08-20, second run)

- [x] ISC-884: the CLAUDE.md writing rule bans em dashes everywhere (not just displayed strings) and itself contains none (Read)
- [x] ISC-885: zero em dashes in README.md, CLAUDE.md, CREDITS.md, every top-level docs/*.md, docs/history/README.md, deploy.yml, and .gitignore (rg)
- [x] ISC-886: en dash ranges survive the scrub; 1–3 and M0–M8 still present where they were (grep)
- [x] ISC-887: Anti: the June-2025 archives under docs/history/ keep their original text (git diff shows no edits to them)
- [x] ISC-888: the PAI-level operational rules ban em dashes in all future output (Read ~/.claude-personal/CLAUDE.md)
- [x] ISC-889: ISA frontmatter is valid YAML; the progress value is quoted (Read)
- [x] ISC-890: root ISA.md is under 60KB and readable in one pass (ls)
- [x] ISC-891: docs/isa/ holds seven topic archives plus decisions-log, changelog-log, and a README (ls)
- [x] ISC-892: every ISC ID appears in exactly one file across root + archives; zero duplicates, total unchanged by the split (script)
- [x] ISC-893: the root ISA carries the archive index table and the per-run archive protocol (grep)
- [x] ISC-894: deferred items in archives surface as pointers in the root (ISC-601, ISC-615, ISC-619) (grep)
- [x] ISC-895: zero em dashes in the root ISA.md (grep)
- [x] ISC-896: sulkweb CLAUDE.md describes the ISA split and points at docs/isa/ (grep)
- [x] ISC-897: Anti: no ISC renumbered by the split; ISC-77, ISC-472, ISC-567 exist verbatim in their archives (grep)
- [x] ISC-898: every relative link in root ISA.md and docs/isa/*.md resolves (linkcheck)
- [x] ISC-899: pushed; github.com renders ISA.md with a metadata table instead of the YAML error banner (curl)
- [x] ISC-900: the four agent-scrubbed docs pages read correctly and carry zero em dashes (rg + Read spot-check)

### Versioned Pages deploys: stable root, frozen /X.Y.Z/, live /latest/ (2026-08-20, third run)

- [x] ISC-901: gh-pages branch exists holding the full site tree: stable at root, 0.5.0/, latest/ (git ls-remote + ls)
- [x] ISC-902: live root serves the v0.5.0 stable build (curl bundle version string)
- [x] ISC-903: live /0.5.0/ serves the v0.5.0 build (curl)
- [x] ISC-904: live /latest/ serves a latest-<sha> stamped build of main head (curl)
- [x] ISC-905: live /versions.html lists stable, latest, and every version dir (curl)
- [x] ISC-906: tag workflow keeps the full verification gate (typecheck + all unit suites) before any deploy (Read yml)
- [x] ISC-907: tag workflow writes the build to gh-pages root AND /X.Y.Z/ (X.Y.Z from the tag, v stripped) while preserving all other version dirs and latest/ (Read yml)
- [x] ISC-908: both workflows regenerate versions.html from the version dirs actually present (Read yml)
- [x] ISC-909: a new latest workflow fires on every main push, builds with SULK_VERSION=latest-<7sha>, and updates only /latest/ (Read yml)
- [x] ISC-910: latest workflow has workflow_dispatch for manual runs (Read yml)
- [x] ISC-911: latest workflow has no test gate; the build itself is the only bar, so a logically broken game still deploys to /latest/ (Read yml)
- [x] ISC-912: both workflows share the pages concurrency group so deploys serialize (Read yml)
- [x] ISC-913: both workflows push the storage branch, then upload the ENTIRE branch tree as the Pages artifact (Read yml)
- [x] ISC-914: Anti: the tag workflow never writes latest/; the latest workflow never writes root files or version dirs (Read yml sync steps)
- [x] ISC-915: Anti: a main push leaves / and /0.5.0/ byte-identical (bundle filenames compared before/after the latest deploy)
- [x] ISC-916: workflow permissions: contents write (branch push) plus pages/id-token write only (Read yml)
- [x] ISC-917: manual footer carries an All versions link that resolves to the root versions.html from the root, from /latest/, and from /X.Y.Z/ (unit + built html grep)
- [x] ISC-918: the link path computation is a pure function with a unit test covering root, latest, and version-dir paths (bun/vitest)
- [x] ISC-919: client unit suite green after the manual change (pnpm test)
- [x] ISC-920: client tsc clean (pnpm exec tsc --noEmit)
- [x] ISC-921: Anti: packages/engine untouched by this run (git diff)
- [x] ISC-922: architecture.md deployment section documents the three-URL scheme and the storage branch (Read)
- [x] ISC-923: README Releases section names stable /, frozen /X.Y.Z/, live /latest/ (Read)
- [x] ISC-924: Anti: zero em dashes in every file this run touches (rg)
- [x] ISC-925: bootstrap deploy run green (gh run watch)
- [x] ISC-926: live /0.5.0/manual.html and /latest/manual.html return 200 (curl)
- [x] ISC-927: /latest/ bundle contains the versions link code; the frozen /0.5.0/ manual does not (documented: snapshots predate the link) (curl grep)
- [x] ISC-928: versions.html carries working relative links (./ for stable, latest/, 0.5.0/) (curl content)
- [x] ISC-929: Anti: no site file is served from the repo main branch anymore; the artifact comes from the storage branch alone (Read yml)
- [x] ISC-930: ISA records this run with evidence and a Decisions entry (Read)
- [x] ISC-931: docs note the site-size arithmetic (each frozen version ~36MB against the 1GB Pages soft limit) (Read)
- [x] ISC-932: Anti: re-running a tag workflow only rewrites that tag's own dir and root, never another version (yml logic: dir name derives from ref_name)

### v0.5.1: versions page discoverable from the stable manual (2026-08-20, fourth run)

- [x] ISC-933: v0.5.1 released through the NEW versioned workflow; run green FIRST, then release published; live root manual carries the All versions link; /0.5.1/ frozen; /0.5.0/ and /latest/ byte-untouched; versions.html lists both versions; root manifest.json now exists (curl suite)

### Gameplay log export: capture, download, notes (2026-08-20, fifth run)

Purpose: collect per-mission gameplay logs so stealer AI improvements can be
extracted as mission-generic rules from real games, not embedded per mission.

Engine capture:

- [x] ISC-934: the PieceEvents Emitter gains tap(fn)/untap(fn); taps observe every real emission INCLUDING inside capture() sections, exactly once each (vitest)
- [x] ISC-935: taps do NOT fire for replayed events (replaying=true), so the captured-then-replayed stealer phase is never double-recorded (vitest)
- [x] ISC-936: GameLogger lives at packages/engine/src/log/GameLogger.ts and is exported from the engine index (Read + grep)
- [x] ISC-937: each recorded event carries {seq, turn, phase, type, ...payload}, turn and phase read from the engine at emit time (vitest)
- [x] ISC-938: the logger skips the UI-noise events 'selected' and 'apChanged' and records every other PieceEvents type (vitest)
- [x] ISC-939: log meta includes formatVersion 1, mission key, mission display name, seed (number or null), app version string, startedAt ISO timestamp (vitest)
- [x] ISC-940: the initial piece layout (id, kind, x, y, facing) is snapshotted at logger construction (vitest)
- [x] ISC-941: when gameOver fires, meta.result and endedAt are set on the log (vitest)
- [x] ISC-942: notes are settable and serialize() embeds the notes string (vitest)
- [x] ISC-943: filename(date) returns sulk-log_<missionKey>_<YYYY-MM-DD_HH-MM-SS>.json, deterministic for a passed Date (vitest)
- [x] ISC-944: detach() untaps; events emitted after detach are not recorded (vitest)
- [x] ISC-945: serialize() output round-trips through JSON.parse with events in strictly increasing seq order (vitest)
- [x] ISC-946: a full seeded autoplay game on debug_1 yields a log with >0 pieceMoved, >0 pieceDied, exactly one gameOver, and meta.result equal to engine.state.result (vitest)

Client wiring:

- [x] ISC-947: GameScene constructs a GameLogger for real missions (mission key, display name, seed, __APP_VERSION__) and exposes it as window.sulk.gameLog (Read + e2e)
- [x] ISC-948: attract mode (homepage backdrop) constructs no logger (Read guard + e2e: sulk.gameLog undefined on /)
- [x] ISC-949: the end dialog gains a notes textarea (#end-notes) with a placeholder inviting notes on how the stealers played (e2e)
- [x] ISC-950: the end dialog gains a Download game log button (#end-download) (e2e)
- [x] ISC-951: clicking download saves a file whose name matches sulk-log_<mission>_<date>_<time>.json (Playwright download event, regex)
- [x] ISC-952: the downloaded JSON contains mission, seed, result, version, initialPieces, a non-empty events array, and the exact notes text typed in the textarea (e2e content assertions)
- [x] ISC-953: showEndDialog without a logger renders no download section (endDialog guard, Read + vitest or e2e)

Regression and build:

- [x] ISC-954: engine vitest suite green after the changes (Bash exit 0)
- [x] ISC-955: client unit suite green (Bash exit 0)
- [x] ISC-956: client e2e suite green including the new gamelog spec (Bash exit 0)
- [x] ISC-957: tsc clean in both packages (engine build + client tsc --noEmit, exit 0)

Documentation:

- [x] ISC-958: docs/gamelog-format.md documents the schema field by field with the analysis intent (Read)
- [x] ISC-959: docs/architecture.md gains a gameplay-log section covering the tap mechanism and export flow (Read)
- [x] ISC-960: docs/features.md mentions the end-of-mission log export (Read)
- [x] ISC-961: CLAUDE.md routing table points to docs/gamelog-format.md (Read)

Anti-criteria:

- [x] ISC-962: Anti: the export path makes no network request; the file is produced client-side via Blob only (grep for fetch/XHR in new code)
- [x] ISC-963: Anti: the engine gains no Phaser or DOM dependency from the logger (grep phaser/document in engine src)
- [x] ISC-964: Anti: no stealer-phase event appears twice in a full-game log (duplicate seq or duplicated gameOver) (vitest on autoplay log)
- [x] ISC-965: Anti: the homepage attract mode shows no end dialog and pays no logging overhead (e2e: no #end-dialog, no gameLog on /)
- [x] ISC-966: Anti: zero em dashes in any new or edited file (grep)
- [x] ISC-967: Anti: no mission-specific intelligence added to the stealer AI in this run; hive.ts and StealerAI.ts are untouched (git diff)


### v0.6.0: gameplay log export reaches the stable root (2026-08-20, sixth run)

- [x] ISC-968: v0.6.0 released through the versioned workflow; run green FIRST, then release published; live root end dialog carries the notes field and Download game log button; /0.6.0/ frozen; /0.5.1/, /0.5.0/ and /latest/ byte-untouched; versions.html lists v0.6.0 as Stable (curl + Playwright live probe suite)

### Latest-pipeline hardening: pre-emption healing + ship-time policy (2026-08-20, seventh run)

- [x] ISC-969: deploy.yml permissions include actions: write (Read)
- [x] ISC-970: deploy.yml's deploy job ends by dispatching deploy-latest, so a release can never leave /latest/ lagging a pre-empted pending run (Read)
- [x] ISC-971: the dispatch mechanism is proven live: gh workflow run deploy-latest → run green → /latest/ manifest stamped at main head sha (Bash + curl); in-workflow dispatch CONFIRMED on the v0.6.1 release run: redispatch-latest job success, dispatched run 32424973007 green, /latest/ re-stamped at head (deferred probe closed 2026-08-21)
- [x] ISC-972: sulkweb CLAUDE.md codifies the ship-time policy: user-facing gameplay changes are offered a stable v* release in the same run; "release"/"ship" from the user means a v* release, never just the automatic /latest/ deploy; every ship report names the exact URL that has the change; deploy-latest runs are watched to green after any game-code push (Read)
- [x] ISC-973: architecture.md deployment section documents the post-release re-dispatch and marks the pre-emption caveat healed for /latest/ (Read)
- [x] ISC-974: Anti: docs-only PUSHES still deploy nothing (release-driven re-dispatches intentionally bypass paths-ignore) (Bash gh run list)
- [x] ISC-975: Anti: zero em dashes on any added line (git diff grep)

### Blip conversion on door destruction (2026-08-21, eighth run)

- [x] ISC-976: the bug is reproduced by a failing engine test before any fix: shooting a door hiding a blip leaves the blip unconverted (vitest fail output captured)
- [x] ISC-977: GameEngine subscribes to doorDestroyed and runs convertRevealedBlips with the same replay/Deploy/result guards as doorToggled (Read)
- [x] ISC-978: a bolter shot that demolishes a door hiding a blip converts it on the spot, stealers appear on the blip square (vitest)
- [x] ISC-979: the one handler covers all three destruction paths because bolter shootDoor, cannon autofire, and chain-fist cut all emit through demolishDoor (grep: demolishDoor is the only doorDestroyed emitter)
- [x] ISC-980: Anti: a REPLAYED doorDestroyed event never converts blips against the final board (vitest)
- [x] ISC-981: Anti: conversion timing everywhere else is untouched; all pre-existing conversion tests still pass (vitest suite)
- [x] ISC-982: full engine and client unit suites green after the fix (pnpm -r test)
- [x] ISC-983: Anti: zero em dashes on any added line (git diff grep)

### v0.6.1: blip conversion fix reaches the stable root (2026-08-21, ninth run)

- [x] ISC-984: v0.6.1 released through the codified order: main pushed, tag pushed, run 32424784501 green FIRST, then release published (gh run view + release URL)
- [x] ISC-985: live root and frozen /0.6.1/ manifests both read v0.6.1 at head sha 05220d1; /latest/ re-stamped at the same sha; /0.6.0/ untouched (curl)
- [x] ISC-986: redispatch-latest job succeeded on a real release and its dispatched deploy-latest run 32424973007 completed green (gh run view); closes ISC-971's deferred probe
- [x] ISC-987: live root boots the game with zero console and page errors (Playwright probe: phase MarineAction turn 1, errorCount 0)
- [x] ISC-988: Anti: no frozen version dir was deleted or altered by the release (curl 200 on /0.6.0/manifest.json)

### Fog of war: stealers hidden outside marine sight (2026-08-21, tenth run)

- [x] ISC-989: a pure client module computeMarineSight(board) returns the set of squares any living marine sees, plus each marine's own square (vitest)
- [x] ISC-990: computeMarineSight excludes squares behind a marine, outside his 180 degree vision arc (vitest)
- [x] ISC-991: computeMarineSight excludes squares behind a closed door and includes them once the door opens (vitest)
- [x] ISC-992: threatRevealed is true for a square in the sight set (vitest)
- [x] ISC-993: threatRevealed is true for a square outside sight but within Chebyshev 2 of a marine, the creeping-up-behind rule (vitest)
- [x] ISC-994: threatRevealed is false for a square outside sight at Chebyshev 3 from every marine (vitest)
- [x] ISC-995: GameScene draws a dimming overlay over every square not in the sight set, at a depth above floor, markers and doors but below pieces (Read + live probe)
- [x] ISC-996: stealer sprites are hidden every frame when their current sprite tile is not revealed, and shown when it is, so replays flash them across lit corridors (Read)
- [x] ISC-997: blip sprites, marine sprites and the C.A.T. are never hidden by fog; the per-frame pass touches only kind stealer (Read/grep)
- [x] ISC-998: Minimap.ts is byte-untouched; the radar remains the detection instrument (git diff)
- [x] ISC-999: fog is on by default in real missions, off in attract mode, and ?fog=0 disables it (Read)
- [x] ISC-1000: during the Deploy phase no fog overlay is drawn (Read)
- [x] ISC-1001: the sight set is never recomputed mid-replay (recompute gated on !animating), honoring the payload-not-engine invariant; finishReplay triggers a fresh compute (Read)
- [x] ISC-1002: a stealer sprite created while fog is on spawns hidden and is shown by the per-frame pass only if revealed, so no one-frame flash leaks its position (Read)
- [x] ISC-1003: Anti: zero engine files modified in this run (git diff --stat)
- [x] ISC-1004: Anti: with fog disabled the scene renders exactly as before: no overlay object drawn, no visibility toggling (Read of guard clauses)
- [x] ISC-1005: full engine and client suites green (pnpm -r test)
- [x] ISC-1006: Anti: zero em dashes on any added line (git diff grep)
- [x] ISC-1007: typecheck green across the workspace (pnpm -r typecheck or build)
- [x] ISC-1008: live probe: a real mission under fog shows the overlay and hides an out-of-sight stealer while the minimap still echoes it (Playwright on local preview)

Review round (2026-08-21):

- [x] ISC-1009: the creep reveal rides the PRE-PHASE marine snapshot during replays, so a marine killed this phase keeps revealing his killer's approach; engine truth resumes at finishReplay (Read + vitest suite green)
- [x] ISC-1010: fog-hidden stealers are not clickable: the pointerdown hit test requires sprite.visible, closing the select-highlight-AP-LOS-cone oracle (Read)
- [x] ISC-1011: the hover readout never names an unrevealed stealer outside Deploy, and uses the same marine source as the renderer (Read)
- [x] ISC-1012: marineEscaped marks the fog dirty by construction, not by event-ordering coupling (Read)
- [x] ISC-1013: when the mission ends and the replay has shown it, the fog lifts: overlay cleared, all stealers revealed for the post-mortem; never mid-replay (Read)

### Fog of war parked 2026-08-24, resumed 2026-09-12

ISC-989..1013 (the fog run block above) were reserved on main while the feature sat on branch `fog-of-war`; the reservation held and main (v0.6.1 head plus the parking record below) was merged into the branch on 2026-09-12. The next run allocates from ISC-1019.

### Fog of war parked, main restored to stable (2026-08-24, tenth run)

- [x] ISC-1014: branch fog-of-war exists and contains exactly the three fog commits d6c66bf, 258a03f, 1418ca9 (git log)
- [x] ISC-1015: main is reset to origin/main 4fa53ee, the v0.6.1 head, with a clean tree (git status + rev-parse)
- [x] ISC-1016: this ISA on main names the branch, its contents, and how to resume (Read)
- [x] ISC-1017: Anti: ISC IDs 989..1013 are reserved on main so a future run cannot collide with the branch's run block (Read)
- [x] ISC-1018: Anti: zero fog code remains on main: no utils/fog.ts, no updateFog reference in GameScene (ls + grep)

### Fog of war resumed: branch restored, main merged, running locally (2026-09-12, eleventh run)

- [x] ISC-1019: branch fog-of-war is checked out and its tip is a merge commit whose parents are 1418ca9 (fog tip) and df42de2 (main tip) (git log)
- [x] ISC-1020: main is fully contained in fog-of-war: git merge-base --is-ancestor main fog-of-war exits 0 (git)
- [x] ISC-1021: ISA.md carries both the fog run block (ISC-989..1013) and the parking block (ISC-1014..1018) with zero conflict markers (grep)
- [x] ISC-1022: engine vitest suite green on the merged tree, 337/337 (pnpm -r test)
- [x] ISC-1023: client vitest suite green on the merged tree, 97/97, fog.ts at 100 percent line coverage (pnpm -r test)
- [x] ISC-1024: pnpm build green on the merged tree, engine tsc -b plus client vite build (pnpm build)
- [x] ISC-1025: Vite dev server serves the merged tree on localhost:5173 with HTTP 200 (curl)
- [x] ISC-1026: real Chrome boots ?mission=space_hulk_1 to the Deploy phase with fogEnabled true and the fog graphics object present (live probe)
- [x] ISC-1027: after AUTO DEPLOY and DONE the mission is in MarineAction turn 1 with a five-square sight set and the board beyond the column visibly dimmed (live probe + screenshot)
- [x] ISC-1028: ending turn 1 runs a stealer phase and lands in engine turn 2 with a blip spawned and the fog flag dirty for the post-replay recompute (live probe)
- [x] ISC-1029: Anti: zero console errors or page exceptions across boot, deploy, turn 1 and the turn 2 replay (console read, onlyErrors)
- [x] ISC-1030: Anti: no game code changed in this run; the merge diff against 1418ca9 touches ISA.md only (git diff --stat)
- [x] ISC-1031: Anti: the branch was not pushed and no tag was created (git branch -vv, git tag)
- [x] ISC-1032: Anti: zero em dashes on any line added this run (git diff grep)

### Fog adjustments: transparent stealer bodies, radar-gated blips (2026-09-12, twelfth run)

- [x] ISC-1033: hasLineOfSight piecesBlock is a two-policy option: 'marines' (sight) stops only at a marine occupant, true (fire) stops at any occupant (Read los.ts)
- [x] ISC-1034: a marine SEES the square behind a stealer and the square behind a stealer plus a blip (vitest vision.spec)
- [x] ISC-1034.1: a marine cannot SHOOT past the front stealer: canShoot true on the front rank, false on the squares behind it, so overwatch reach is unchanged (vitest vision.spec)
- [x] ISC-1035: an intervening marine still blocks sight (vitest vision.spec, unchanged case)
- [x] ISC-1036: a blip queued behind a stealer converts on the marine's first action that puts it in arc (vitest conversion_on_sight.spec)
- [x] ISC-1037: the kill-reveal suite is rewritten to the new rule: the first sweep converts the blip through the stealer, the kill reveals nothing further; close-combat and overwatch kill sweeps still pass (vitest kill_reveals.spec)
- [ ] ISC-1038: [DROPPED, see Decisions 2026-09-12 refined: fire lines still stop at bodies, so the hive sacrifice-blocker fixture stays byte-identical to main and green]
- [x] ISC-1039: hive.spec dice-count invariant unchanged: the blocker run consumes exactly one reaction burst (vitest, remaining 0)
- [x] ISC-1040: computeMarineSight includes the squares behind one and two stealers in a column (vitest fog.spec)
- [x] ISC-1041: radarActive(pieces) is true while a sergeant lives and false after he dies (vitest fog.spec)
- [x] ISC-1042: a squad with no sergeant has no radar (vitest fog.spec, debug_1 shape)
- [x] ISC-1043: threatVisible('blip', ...) is exactly the radar flag: true out of sight with radar up, false adjacent and false in sight with radar down (vitest fog.spec)
- [x] ISC-1044: threatVisible('stealer', ...) ignores the radar flag and follows sight-or-creep (vitest fog.spec)
- [x] ISC-1045: GameScene spawns blip sprites hidden under fog and the per-frame pass shows them iff the radar is up (Read createSprite + applyThreatFog)
- [x] ISC-1046: the radar gate rides a pre-phase snapshot during replays (fogRadarSnap set in endTurn, cleared in finishReplay) so a sergeant killed this phase keeps the blips on screen until the replay has shown his death (Read)
- [x] ISC-1047: during Deploy the blip radar gate still applies, counting the RESERVE (a sergeant waiting to be placed still carries the auspex), stealers are left alone and the overlay stays clear (Read updateFog Deploy branch + fogRadar)
- [x] ISC-1048: game over lifts the fog for blips as well as stealers (Read updateFog result branch)
- [x] ISC-1049: the hover readout never names a blip while the radar is down, Deploy included (Read describeSquare)
- [x] ISC-1050: Anti: fog-hidden blips are not clickable; the pointerdown hit test's visible gate covers every hidden threat kind (Read)
- [x] ISC-1051: Anti: Minimap.ts byte-untouched; the scope keeps its own sergeant gate (git diff --stat)
- [x] ISC-1052: Anti: with ?fog=0 nothing changes on the client: no radar gate, no hidden sprites (Read guard: fogGfx undefined short-circuits updateFog; createSprite hides only under fogEnabled)
- [x] ISC-1053: engine suite green on the new rule (pnpm engine test)
- [x] ISC-1054: client suite green including the new fog cases (pnpm client test)
- [x] ISC-1055: pnpm build green (engine tsc -b + client vite)
- [x] ISC-1056: Playwright e2e suite green, pinned seeds (win.spec seed 1, playthrough.spec seed 3) unchanged in outcome (pnpm client e2e)
- [x] ISC-1057: live probe, space_hulk_1 under fog in real Chrome: a stealer column in a corridor is fully visible sprite by sprite, not just the front one (page eval + screenshot)
- [x] ISC-1058: live probe: blips visible on the main board while the sergeant lives; after sergeant.die() the blip sprites are hidden and the hover readout omits them (page eval)
- [x] ISC-1059: live probe: zero console errors across boot, deploy, turn cycle, and the sergeant-death check (console read)
- [x] ISC-1060: CLAUDE.md LOS gotcha rewritten to marine-only blocking and a fog rules entry added (Read)
- [x] ISC-1061: Anti: zero em dashes on any line added this run (git diff grep)
- [x] ISC-1062: Anti: no change to blip conversion rules themselves: squareSeenByMarine untouched, conversion triggers untouched (git diff on StealerAI.ts, Blip.ts, GameEngine.ts empty)
- [x] ISC-1063: code-reviewer agent pass on the diff with every CRITICAL or MEDIUM finding adopted or refuted in Decisions (Agent)

Review round (2026-09-12):

- [x] ISC-1064: the replay action camera never pans onto a move or death the fog hides: planReplayFocus takes a hidden(pieceId, square) predicate and GameScene feeds it the frozen sight set, marine snapshot and radar snapshot by piece kind (vitest replayFocus.spec + Read)
- [x] ISC-1065: a real-browser fog spec exists in packages/client/tests: debug_1 blips exist but are not drawn, space_hulk_1 blips vanish on sergeant death while a three-stealer column stays visible, hover omits hidden blips, ?fog=0 draws everything (Playwright)
- [x] ISC-1066: the field manual's sight section states the sight/fire split and the Blips section states the radar gate, in the writing guide's voice (Read content.ts)
- [x] ISC-1067: docs/rules-reference.md LOS, seeing/shooting and threat-map lines describe the two policies (Read)
- [x] ISC-1068: hive.ts computeThreat comment states that bodies block fire lines and, since 2026-09-12, not sight lines (Read)
- [x] ISC-1069: CLAUDE.md marks the 2026-08-15 balance baselines stale pending a re-scan (Read)
- [x] ISC-1070: the ISA verification block matches HEAD after the sight/fire split (Read of the corrected ISC-1033/1034/1038 lines)
- [x] ISC-1071: Anti: the full Playwright suite stays green with the new fog spec added, pinned seeds intact (pnpm client e2e)

### v1.0.0 released: fog of war lands on main, branch retired (2026-09-12, thirteenth run)

- [x] ISC-1072: main fast-forwarded to the fog-of-war tip 46aadd3 and pushed; origin/main is 46aadd3 (git log, git push)
- [x] ISC-1073: v1.0.0 released through the codified order: main pushed, tag pushed, run 34689952039 green (verify-build-publish, deploy, redispatch-latest) FIRST, then the release published at https://github.com/harryf/sulkweb/releases/tag/v1.0.0 (gh run view + gh release create)
- [x] ISC-1074: the main-push deploy-latest run 34689950858 completed green (gh run watch)
- [x] ISC-1075: live root and frozen /1.0.0/ manifests both read v1.0.0 at sha 46aadd3; /latest/ re-stamped latest-46aadd3 (curl)
- [x] ISC-1076: Anti: /0.6.1/manifest.json still reads v0.6.1 at 05220d1 (curl)
- [x] ISC-1077: live root boots space_hulk_1 with fog on, sight set 5, blips 2/2 visible with the sergeant alive, zero page and console errors (headless Playwright probe)
- [x] ISC-1078: branch fog-of-war deleted locally after the fast-forward; it never existed on origin (git branch -d, git ls-remote)
- [x] ISC-1079: Anti: no history rewrite: the merge was a fast-forward, every fog commit keeps its sha (git log)

### Toward v1.1: converted stealers face their prey, wheel panning (2026-09-12, fourteenth run)

- [x] ISC-1080: Blip.convert gives every emerging stealer the facing toward its nearest living marine (Chebyshev, board-order tie), falling back to south when no marine is on the board (Read Blip.ts)
- [x] ISC-1081: a value-3 blip due west of a marine converts into three stealers all facing per facingToward, the one on the blip square due east (vitest conversion_on_sight.spec)
- [x] ISC-1082: Anti: conversion consumes no dice and emits the same blipConverted payload as before (Read: no board.dice call added, payload untouched)
- [x] ISC-1083: Anti: engine pinned fixtures unchanged in outcome: beta2_mission seed 1, hive.spec, kill_reveals (vitest, full engine suite green)
- [x] ISC-1084: the mouse wheel over the map pans the camera: deltaY adds to scrollY, deltaX to scrollX, both divided by zoom; any glide or programmatic pan in flight is cancelled; expectedScroll updated so the inertia model does not fight it (Read GameScene wheel handler)
- [x] ISC-1085: the wheel over the HUD strip does nothing (Read guard + Playwright wheel.spec)
- [x] ISC-1086: Playwright wheel.spec: wheel down raises scrollY, wheel up lowers it again, HUD wheel leaves scroll untouched (2 tests green)
- [x] ISC-1087: docs/features.md keymap row names the wheel alongside arrows and drag (Read)
- [x] ISC-1088: full Playwright suite green with wheel.spec added, pinned seeds intact (pnpm client e2e)
- [x] ISC-1089: Anti: zero em dashes on any added line (git diff grep)
- [x] ISC-1090: both changes pushed to main and live on /latest/ with the callout URL in the ship report; v1.1.0 is NOT cut in this run (user chooses when the minor closes) (git push, curl /latest/manifest.json)

### v1.1.0 released (2026-09-12, fifteenth run)

- [x] ISC-1091: v1.1.0 released through the codified order: main already pushed (8a83743), tag pushed, run 34690875591 green (verify-build-publish, deploy, redispatch-latest) FIRST, then the release published at https://github.com/harryf/sulkweb/releases/tag/v1.1.0 (gh run view + gh release create)
- [x] ISC-1092: live root and frozen /1.1.0/ manifests both read v1.1.0 at sha 8a83743; /latest/ re-stamped at the same sha (curl)
- [x] ISC-1093: Anti: /1.0.0/ and /0.6.1/ manifests unchanged (curl)
- [x] ISC-1094: live root boots space_hulk_1 with fog on and zero page or console errors (headless Playwright probe)

### Real-time gameplay plan: turn-based to ticking clock with a command hierarchy (2026-09-12, sixteenth run, PLANNING ONLY)

Deliverable is a reviewed plan document, docs/realtime-plan.md, plus this ISA's decisions. No game code changes in this run.

- [x] ISC-1095: docs/realtime-plan.md exists with these top-level sections in order: Summary, Verdict, Real-time rules, Command model, Marine AI, Codebase impact, Stages, Risks, Open questions (Read)
- [x] ISC-1096: Verdict names what the real-time design gains and what it loses, each claim tied to a current-code fact or to the earlier attempt's playtest evidence, no unsupported taste claims (Read)
- [x] ISC-1097: the plan cites the earlier real-time attempt (sibling sulk repo: docs/game-design.md, docs/reviews/) and lists what to reuse, what to drop, and why that attempt stalled (Read)
- [x] ISC-1098: tick model decided: one pure engine tick entry point, tick rate, per-side AP regeneration table, and where the tick is driven from (client clock) (Read)
- [x] ISC-1099: every turn-boundary rule in GameEngine.endMarinePhase (reinforcements, blip conversion sweep, ambush counters, download tick, victory checks, flame clearing, C.A.T. wander, defend turn limit, AP reset, CP roll, phase flip) has a named real-time replacement or an explicit "drop" (Read against a grep of endMarinePhase)
- [x] ISC-1100: overwatch in real time is specified: persistent state, fire trigger, cadence, AP cost per shot, jam, end conditions (Read)
- [x] ISC-1101: the marine phase timer and command points have a stated real-time replacement (mission clock or none; CP regeneration or removal) (Read)
- [x] ISC-1102: command model specifies the four control levels (direct keyboard, individual order, squad order, mission order), the priority rule between them, and the one-slot-per-level queue on each marine (Read)
- [x] ISC-1103: sergeant loss mechanic is a single chosen rule with rationale, alternatives listed and rejected with reasons (Read)
- [x] ISC-1104: individual AI default behaviour is specified as a decision list (hold, overwatch, face threat, fight adjacent, unjam, door handling) with the order of precedence (Read)
- [x] ISC-1105: per-type AI variations are specified for storm bolter, sergeant, heavy flamer, assault cannon, chain fist, with what differs from the default (Read)
- [x] ISC-1106: squad AI specifies at least: defend-area (sight-line coverage assignment), advance-to (cover-and-move with a rear guard), clear-door; each as an algorithm sketch naming the engine functions it reuses (Read)
- [x] ISC-1107: mission-level orders are either specified or explicitly deferred to a named stage (Read)
- [x] ISC-1108: player input for issuing orders is specified as a keymap and pointer table that extends docs/features.md Controls without breaking existing keys (Read)
- [x] ISC-1109: codebase impact table lists every non-test engine source file with a change kind (untouched, extend, rewrite, new) and a one-line reason (Read; count matches find packages/engine/src)
- [x] ISC-1110: codebase impact table lists every non-test client source file the same way (Read; count matches find packages/client/src)
- [x] ISC-1111: test impact states which engine unit specs and e2e specs break under a tick model and the replacement strategy (scripted RollQueue kept, pinned seeds re-pinned per stage, capture/replay retired) (Read)
- [x] ISC-1112: new engine events are named with payloads (tick, orderIssued, orderCompleted, aiActed or equivalent) and the stealer-phase capture/replay channel has a stated fate (Read)
- [x] ISC-1113: determinism section states how seeded runs stay reproducible under ticks (fixed tick order, no wall-clock reads in the engine) (Read)
- [x] ISC-1114: hive AI adaptation is specified: replan cadence in ticks, which hive.ts functions survive unchanged, what the zero-dice invariant becomes (Read)
- [x] ISC-1115: at least three delivery stages, each ending in a playable build with a version number, stage 1 narrow enough to ship on its own (Read)
- [x] ISC-1116: every stage lists verifiable exit criteria that can become ISCs in its own run (Read)
- [x] ISC-1117: the fate of the turn-based mode is an explicit decision (kept as a mode, kept in a frozen release only, or dropped) (Read)
- [x] ISC-1118: fog of war interplay is stated: the frozen sight-set and pre-phase snapshots (fogMarineSnap, fogRadarSnap) have a real-time replacement (Read)
- [x] ISC-1119: Risks section lists at least five risks, each with a mitigation and the stage where it bites (Read)
- [x] ISC-1120: Open questions section lists every decision left to the user with a recommended default (Read)
- [x] ISC-1121: Anti: no game code changed in this run (git diff --stat main -- packages/ empty)
- [x] ISC-1122: Anti: zero em dashes in the new plan and in this run's ISA text (grep)
- [x] ISC-1123: Anti: zero banned writing-guide words in the plan (grep for the guide's banned list)
- [x] ISC-1124: Council debate outcome (positions, disagreements, resolution) is recorded in Decisions (Read)
- [x] ISC-1125: FirstPrinciples output (hard constraints, soft constraints, unvalidated assumptions) is recorded in Decisions and reflected in the plan's Verdict (Read)
- [x] ISC-1126: SystemsThinking output (the causal loops of command latency, sergeant loss, and marine AI autonomy) is recorded in Decisions (Read)
- [x] ISC-1127: the Architect agent's independent impact assessment is reconciled with the plan; divergences and their resolution are listed in Decisions (Read)
- [x] ISC-1128: advisor called before the plan is final; adopted and rejected points recorded in Decisions (Read)
- [x] ISC-1129: the plan is linked from CLAUDE.md's read-first table and from docs/status.md (grep)
- [x] ISC-1130: PROJECTS.md Sulk entry records the plan as pending user review (grep)
- [x] ISC-1131: the plan and ISA changes are committed on main (git log)
- [x] ISC-1132: Antecedent: the plan reads in one sitting, at most 700 lines (wc -l)
- [x] ISC-1133: Antecedent: the Summary states what stage 1 delivers within the first 40 lines (Read)

### Real-time plan, round 2: command pause idea and the answered questions (2026-09-12, seventeenth run, PLANNING ONLY)

Harry answered open questions 1..14 in the plan and added a "CP Replacement Idea" (a recharging command pause). This run reviews the idea, folds the answers into the body, and lists the next open questions.

- [x] ISC-1134: docs/realtime-plan.md has a "Command pause" section inside the Command model (Read)
- [x] ISC-1135: the section states the rule: pool measured in seconds, cap and recharge per tick, scaling by living sergeants and captains, no manual control while paused, orders queued and applied at the resume tick (Read)
- [x] ISC-1136: the section assesses the idea: what it fixes (attention load, the Shifting the Burden loop) and its two biggest risks each with a defusing rule (Read)
- [x] ISC-1137: the command points paragraph states the pause's relation to CP (replace or coexist) as a recommendation with the question left to Harry (Read)
- [x] ISC-1138: the sergeant loss section states how the pool scaling combines with relay latency (Read)
- [x] ISC-1139: the input summary resolves Space and Esc: free pause versus command pause and what each allows (Read)
- [x] ISC-1140: determinism section states the pool lives in the engine and pause consumption enters the command log (Read)
- [x] ISC-1141: the stage placement of the command pause is stated with a reason (Read)
- [x] ISC-1142: the Risks table has rows for the command pause (Read)
- [x] ISC-1143: open questions 1..14 keep Harry's Decision column verbatim; new questions 15 onward each carry a recommended default and an empty Decision cell (Read, git diff)
- [x] ISC-1144: decided items read as decisions in the body: no "Proposed default" column, the 1.x freeze, 250 ms tick and 40-tick cycle stated as settled (grep "Proposed default" = 0)
- [x] ISC-1145: Harry's notes on Q5 (uncontrolled marines default to overwatch and turn to meet threats) and Q9 (cannon modes need an order or direct control) are reflected in the Marine AI section (Read)
- [x] ISC-1146: the Status line records the second round and that the doc awaits answers to the new questions (Read)
- [x] ISC-1147: Anti: no game code changed (git diff --stat main -- packages/ empty)
- [x] ISC-1148: Anti: zero em dashes in the plan and this run's ISA text (grep)
- [x] ISC-1149: Anti: zero banned writing-guide words in the plan (grep)
- [x] ISC-1150: advisor consulted on the command pause; adopted and rejected points in Decisions (Read)
- [x] ISC-1151: Decisions entry for this round records the assessment and the doc changes (Read)
- [x] ISC-1152: plan and ISA committed on main (git log)
- [x] ISC-1153: PROJECTS.md records the second round as pending Harry's answers (grep)

### Real-time plan approved, stage 1 kickoff notes (2026-09-12, eighteenth run, PLANNING ONLY)

Harry answered questions 15..22 (all agreed). This run commits the answers, marks the plan approved, and leaves the notes stage 1 starts from after compaction. ISC count 12 against the E3 soft floor of 32; show-your-math: bookkeeping plus one handover section, each with its own probe.

- [x] ISC-1154: every open question 1..22 carries a Decision cell (grep: 21 "Agreed with recommendation" plus "250 ms"; row 19 filled from Harry's "all agreement" in chat, noted in the cell)
- [x] ISC-1155: the plan's Status line reads APPROVED and points to the kickoff section (Read line 3)
- [x] ISC-1156: a "Stage 1 kickoff" section closes the plan with settled constants, build order, exit gate, and session gotchas (grep)
- [x] ISC-1157: the kickoff's constants table agrees with the body (tick 250 ms, cycle 40, AP caps and regeneration, overwatch cooldown 2, CP kept in stage 1, Esc free pause, LiveScene by ?rules=live) (Read)
- [x] ISC-1158: the build order has twelve steps ending in the alpha tag and a root check (Read)
- [x] ISC-1159: CLAUDE.md read-first row calls the plan APPROVED and names the kickoff section (grep)
- [x] ISC-1160: PROJECTS.md says PLAN APPROVED, NEXT SESSION: begin STAGE 1 from the kickoff section (grep)
- [x] ISC-1161: Anti: no game code changed (git diff --stat main -- packages/ empty)
- [x] ISC-1162: Anti: zero em dashes in the plan and this run's ISA text (grep)
- [x] ISC-1163: Anti: the kickoff section stays under 80 lines (a handover, not a second plan) (wc on the section)
- [x] ISC-1164: Decisions entry records the approval and the row 19 fill (Read)
- [x] ISC-1165: plan, ISA, CLAUDE.md committed on main and pushed (git log, origin/main)

### Stage 1: the clock (v2.0.0-alpha.1) (2026-09-12, nineteenth run)

Build stage 1 of docs/realtime-plan.md from its "Stage 1 kickoff" section: the engine tick and cycle, AP regeneration, stealerTick with cached hive plans, persistent overwatch with a cooldown, flames with burn duration, the marine default AI, all input through an engine command path, LiveScene with a fixed-step clock, live fog, the e2e stepping harness, docs, and the v2.0.0-alpha.1 prerelease. ISC-1166..1324 (159 criteria).

#### Step 1: the engine clock

- [x] ISC-1166: CostTables.ts exports a mutable TUNING object (cycleTicks 40, regen marine 4 / stealer 2 / blip 2, apCap 4/6/6, overwatchCooldown 2, flameTicks 40, hivePlanTicks 8, blipIdleTicks 8, sustainedDecayTicks 40, leaseTicks 8, cycle offsets) labelled unvalidated (Read)
- [x] ISC-1167: applyTuning(partial) deep-merges overrides into TUNING at runtime and rejects unknown keys (vitest)
- [x] ISC-1168: PhaseName is exactly 'Deploy' | 'Live'; grep MarineAction|StealerAction in packages/engine/src = 0
- [x] ISC-1169: GameEngine.tickCount starts at 0 and cycle at 1; tick() increments tickCount by one (vitest)
- [x] ISC-1170: tick() is a no-op during Deploy and after game over (vitest)
- [x] ISC-1171: runTicks(n) runs n ticks and stops early at game over (vitest)
- [x] ISC-1172: a `tick` event { tick, cycle } is emitted once per tick (vitest counts)
- [x] ISC-1173: the cycle boundary fires every TUNING.cycleTicks ticks: cycle += 1, CP roll, spawn scheduling, charge orientation, defend limit, boundary victory check, in that order (Read plus vitest for cycle and CP)
- [x] ISC-1174: reinforcements per cycle = min(blipsPerTurn, budget left), each blip scheduled at its entry's offset (entry index times TUNING.spawnOffsetTicks inside the cycle); two entries land at ticks 40 and 45 (vitest)
- [x] ISC-1175: a scheduled blip whose entry is blocked at its tick falls to the next ranked entry, else is dropped without charging the budget (vitest)
- [x] ISC-1176: initial blips still spawn at construction and consume dice there (gameflow.spec)
- [x] ISC-1177: endMarinePhase() survives as a test-only shim equal to runTicks(TUNING.cycleTicks), JSDoc says so (Read plus vitest: turnNumber advances by one)
- [x] ISC-1178: turnNumber is a getter aliasing cycle (vitest)
- [x] ISC-1179: defend: the marine win fires when the cycle reaches turnLimit at a boundary (exotic_victory ported)
- [x] ISC-1180: download counter begins/decrements/resets at the download offset once per cycle (beta2_mission ported)
- [x] ISC-1181: ambush counter deploys at the ambush offset once per cycle (beta2_mission ported)
- [x] ISC-1182: the loose C.A.T. wanders at the cat offset once per cycle (exotic_victory ported)
- [x] ISC-1183: Anti: no AP reset at the boundary; a marine at 2 AP holds 2 plus regeneration only (vitest)
- [x] ISC-1184: apChanged fires on every AP gain (vitest)
- [x] ISC-1185: kill-quota: blockade evaluated only at the boundary; the instant quota check on pieceDied is kept (quota_victory ported)
- [x] ISC-1186: exterminate-family win requires no stealer-side piece on the board and no spawn pending in the cycle (vitest)
- [x] ISC-1187: marinePhaseSeconds, MARINE_PHASE_SECONDS and timerBonus are gone from the engine; the client detects sergeants by class (grep = 0 in engine and client)

#### Step 2: AP accumulators and flames

- [x] ISC-1188: Piece.apCap equals the constructor pool; a regeneration counter adds 1 AP every TUNING.regen[kind] ticks (vitest: marine +1 at tick 4, stealer +1 at tick 2)
- [x] ISC-1189: no regeneration past apCap; the counter holds at zero while full so a spend restarts a full interval (vitest)
- [x] ISC-1190: regeneration runs after marine AI and before stealer actions inside tick() (Read of tick order)
- [x] ISC-1191: Board.tick is set by the engine at the start of every tick (vitest)
- [x] ISC-1192: Board.flaming is a Map of square key to expiry tick; isFlaming reads it (vitest)
- [x] ISC-1193: igniteSquares stamps expiry board.tick + TUNING.flameTicks on every square (vitest)
- [x] ISC-1194: expireFlames(board) clears only expired squares, emits flamesCleared with exactly those, and re-checks blip sight (vitest)
- [x] ISC-1195: clearFlames stays exported as the expire-all helper (grep index.ts)
- [x] ISC-1196: flame-objective still wins on the spot when the objective burns (flamer.spec)
- [x] ISC-1197: Anti: a flame lit at tick 5 still burns at tick 44 and is out at tick 45 (vitest)

#### Step 3: the command path

- [x] ISC-1198: MarineCommand union type exported from the engine index (Read)
- [x] ISC-1199: engine.command(marineId, cmd) applies the command at once between ticks and returns whether it acted (vitest)
- [x] ISC-1200: command refuses dead, unknown and non-marine ids, Deploy, game over and a locked board (vitest)
- [x] ISC-1201: every command type reaches its piece method: move forward/back and four diagonals, turn, door, shoot, shootDoor, flame, melee, overwatch on and off, unjam, selfDestruct, autofire, reload, cutDoor, cp (vitest table)
- [x] ISC-1202: a successful command emits apChanged and a `command` event { tick, pieceId, command, ok } (vitest)
- [x] ISC-1203: a command stamps the marine's lastCommandTick (the direct-control lease) (vitest)
- [x] ISC-1204: GameLogger records command events and carries tick in every event envelope (gamelog.spec)
- [x] ISC-1205: checkVictory runs after a successful command: a marine stepping onto the exit wins on the move (vitest)
- [x] ISC-1206: Anti: packages/client/src calls no piece action method directly (grep moveForward|moveBackward|tryTurn|useDoor|\.shoot\(|shootDoor|flameAt|overwatchOn|overwatchOff|unjam\(|selfDestruct|autofire\(|reload\(|cutDoor|closeCombat\(|spendCP = 0 outside type imports)
- [x] ISC-1207: stateHash(engine) exported: a stable string over tick, cycle, cp, result, pieces (id, kind, pos, facing, ap, overwatch, jammed, ammo), doors, flames (Read)
- [x] ISC-1208: same seed plus same command log twice gives identical stateHash at every tick over 200 ticks (vitest)

#### Step 4: the stealer side per tick

- [x] ISC-1209: stealerTick(board, ctx) exported; each stealer-side piece takes at most one action per tick (vitest: a stealer six squares out closes one square per tick)
- [x] ISC-1210: the hive plan is cached on the board and recomputed every TUNING.hivePlanTicks ticks or when the marine count drops (vitest with a spy on planHive)
- [x] ISC-1211: the threat map is cached under board.version; version bumps on move, turn, door toggle/destroy, death, add, overwatch and jam change, flame ignite/expire (vitest)
- [x] ISC-1212: Anti: computeThreat is not called on a quiet tick (spy: 0 calls over 10 ticks with nothing moving)
- [x] ISC-1213: hive patience, massing and idle counters advance once per cycle, not per plan (vitest: no wave launch inside one cycle from patience alone)
- [x] ISC-1214: blip voluntary conversion requires idleTicks >= TUNING.blipIdleTicks (vitest)
- [x] ISC-1215: chargeOrientation runs at the cycle boundary (charge.spec ported)
- [x] ISC-1216: the hive still consumes zero dice under stealerTick (hive.spec RollQueue counts hold)
- [x] ISC-1217: runStealerActions stays as a test-only whole-activation driver sharing the loop body with stealerTick, JSDoc says so (Read)
- [x] ISC-1218: the reaction chain after every stealer action is unchanged: overwatch reactions, exotic interactions, convertRevealedBlips (Read)
- [x] ISC-1219: activation order goes nearest-first when the wave is launched into live fire lanes (Read)
- [x] ISC-1220: a marine death forces a replan on the next tick (vitest)
- [x] ISC-1221: spawn ranking (rankEntries) is shared by scheduled spawns and the construction spawn (Read)

#### Step 5: persistent overwatch

- [x] ISC-1222: overwatch persists across cycle boundaries (vitest: on after 80 ticks with no action)
- [x] ISC-1223: StormBolterMarine no longer overrides resetAP (grep)
- [x] ISC-1224: a reaction shot sets owReadyTick = board.tick + TUNING.overwatchCooldown; a second trigger inside the window fires nothing (vitest)
- [x] ISC-1225: once the cooldown expires the next trigger fires (vitest)
- [x] ISC-1226: jam on doubles still ends overwatch (vitest)
- [x] ISC-1227: the sustained-fire bonus decays after TUNING.sustainedDecayTicks idle ticks (vitest)
- [x] ISC-1228: a direct command cancels overwatch first at zero AP cost, as today (vitest)
- [x] ISC-1229: a stealer arriving directly ahead of an overwatcher eats one reaction shot, then close combat follows on its next action tick (vitest over ticks)
- [x] ISC-1230: Piece.onTick(tick) runs for every living piece each tick (vitest)

#### Step 6: marine default AI

- [x] ISC-1231: ai/MarineAI.ts exports marineTick(engine, marine) and runMarineAI(engine) (Read)
- [x] ISC-1232: jammed: unjam first (vitest)
- [x] ISC-1233: a stealer in the fire arc with line of fire: shoot (bolter, cannon aimed fire, chain fist bolter) (vitest)
- [x] ISC-1234: adjacent stealer straight ahead and no shot possible: close combat (vitest)
- [x] ISC-1235: adjacent stealer elsewhere: turn toward it (vitest)
- [x] ISC-1236: visible but not shootable stealer: turn toward the nearest one (vitest)
- [x] ISC-1237: not on overwatch, AP >= 2, weapon can overwatch: overwatch on (vitest)
- [x] ISC-1238: otherwise hold: no state change (vitest)
- [x] ISC-1239: first match wins: a shootable adjacent stealer is shot, not fought (vitest)
- [x] ISC-1240: door rule: an open door directly ahead is closed when a stealer is seen through it and no friendly marine stands beyond (vitest)
- [x] ISC-1241: Anti: the default never opens a door (vitest)
- [x] ISC-1242: heavy flamer: never overwatch, never fires on its own outside the last-stand rule (vitest)
- [x] ISC-1243: flamer last stand: a stealer within 2 squares, ammo > 0, target section holds no marine and no objective square: flame it (vitest)
- [x] ISC-1244: assault cannon: reloads on its own only when empty and no stealer is visible (vitest)
- [x] ISC-1245: Anti: the AI never autofires the cannon (vitest)
- [x] ISC-1246: Anti: the AI never cuts a door with the chain fist (vitest)
- [x] ISC-1247: lease: a marine commanded within TUNING.leaseTicks is skipped by the AI; reaction fire is unaffected (vitest)
- [x] ISC-1248: an overwatching marine spends nothing on its own except to shoot or fight an adjacent stealer (vitest)
- [x] ISC-1249: runMarineAI runs at tick step 2 for every living marine with AP, one action each per tick (vitest)
- [x] ISC-1250: MarineAutopilot issues its actions through engine.command and autoplay(engine, maxTicks) alternates issuing and ticking (vitest: a debug_1 game reaches a result)

#### Step 7: engine tests and the lint

- [x] ISC-1251: engine suite green with at least 341 tests (bash)
- [x] ISC-1252: ported specs green: gameflow, quota_victory, beta2_mission, deploy, exotic_victory, kill_reveals, gamelog, hive, charge, conversion_on_sight, flamer, ai_pathing, debug1_mission, blips_ai (bash)
- [x] ISC-1253: kernel specs untouched (git diff = 0 lines on board, los, vision, dice, doors, door_corner, door_shooting, diagonal_moves, movement, relativeCost, shooting, beta2_weapons, mission1_fidelity, missions_fidelity, mission_meta, pieceAdded, index); refined 2026-09-12: combat.spec and mission2_fidelity.spec each lost ONE assert that tested the removed marine-phase clock (timerBonus, marinePhaseSeconds), nothing else changed in them
- [x] ISC-1254: marine_ai.spec.ts covers the decision order (file exists, green)
- [x] ISC-1255: overwatch_ticks.spec.ts covers cooldown, jam and persistence (file exists, green)
- [x] ISC-1256: determinism.spec.ts covers same-seed same-log hash equality (file exists, green)
- [x] ISC-1257: engine_lint.spec.ts fails on Date or performance under packages/engine/src outside log/GameLogger.ts (file exists, green)
- [x] ISC-1258: engine line coverage >= 90% (vitest coverage summary)
- [x] ISC-1259: hive.spec zero-dice assertions unchanged (grep remaining counts)

#### Step 8: LiveScene

- [x] ISC-1260: scenes/LiveScene.ts exists, scenes/GameScene.ts does not, gameConfig registers LiveScene (ls, Read)
- [x] ISC-1261: update() runs a fixed-step accumulator: at most 4 ticks per frame (Read)
- [x] ISC-1262: `?tick=<ms>` sets the interval, default 250 (Read plus e2e)
- [x] ISC-1263: `?tick=0` stops the clock; window.sulk.step(n) runs n ticks (e2e)
- [x] ISC-1264: the clock halts while paused, during deployment, after game over and in attract mode (e2e: attract tickCount stays 0)
- [x] ISC-1265: Anti: no endTurn, replay, animating, fogMarineSnap, fogRadarSnap, timerRemaining, capture( or replay( in packages/client/src (grep = 0)
- [x] ISC-1266: utils/replayFocus.ts and tests/replayFocus.spec.ts deleted (ls)
- [x] ISC-1267: HUD shows the cycle line "Cycle N" and seconds into the cycle from the tick event (client unit spec)
- [x] ISC-1268: HUD button reads PAUSE with Esc after deployment and START during deployment; clicking it pauses or starts (client unit spec plus e2e)
- [x] ISC-1269: Esc toggles the PAUSED overlay and the clock stops (e2e)
- [x] ISC-1270: every action key routes through engine.command (grep LiveScene) and W moves the selected marine at once (e2e)
- [x] ISC-1271: Enter finishes deployment during deploy and does nothing afterwards (e2e)
- [x] ISC-1272: flamer two-press targeting unchanged; the second F issues a flame command (flamer-targeting e2e)
- [x] ISC-1273: window.sulk exposes engine, Selection, scene, SeededRng, autoplay, runMarineTurn, PieceEvents, Genestealer, gameLog, step, command, TUNING (e2e)
- [x] ISC-1274: `?tuning=` (comma separated key:value, dotted keys) applies before engine construction (e2e: regen.marine:3 read back)
- [x] ISC-1275: music ducking keys on threat proximity instead of phase (audioLogic unit spec)
- [x] ISC-1276: Minimap.frozen removed (grep)
- [x] ISC-1277: AI actions render through events: an unselected bolter shows the overwatch marker within one cycle (e2e)
- [x] ISC-1278: deployment phase unchanged: deploy clock, AUTO, placement, start (deploy e2e)
- [x] ISC-1279: attract homepage inert: no ticks, no input (home e2e)
- [x] ISC-1280: client typecheck clean: tsc --noEmit (bash)
- [x] ISC-1281: client unit suite green (bash)
- [x] ISC-1282: Antecedent: each direct-control step tweens with MOTION.step.marine so a move reads as motion, never a teleport (Read)

#### Step 9: live fog

- [x] ISC-1283: fog dirty flag set by pieceMoved, pieceDied, pieceAdded, blipConverted, doorToggled, doorDestroyed, sectionFlamed, flamesCleared, phaseChanged, marineEscaped (Read)
- [x] ISC-1284: the sight set recomputes at most once per frame (Read: dirty consumed in updateFog)
- [x] ISC-1285: threat sprites show or hide from their live tile every frame (fog e2e)
- [x] ISC-1286: Anti: no snapshot fields or animating gates remain in the fog code (grep)
- [x] ISC-1287: client fog unit spec keeps its rule cases without snapshot cases (bash green)
- [x] ISC-1288: fog e2e green (bash)

#### Step 10: e2e

- [x] ISC-1289: tests/harness.ts provides waitForGame and step helpers used by the ported specs (file)
- [x] ISC-1290: win.spec: a debug_1 win driven by autoplay over ticks at a re-pinned seed reaches MISSION COMPLETE (e2e)
- [x] ISC-1291: playthrough.spec: a space_hulk_1 loss driven by step at a re-pinned seed (e2e)
- [x] ISC-1292: animation.spec and focus.spec replay cases removed; remaining motion cases green (e2e)
- [x] ISC-1293: key-driven specs keep the seenKeyEvents dedupe (grep LiveScene keydown handlers)
- [x] ISC-1294: full e2e suite green (bash count)
- [x] ISC-1295: real-browser boot check of the live scene: screenshot with pieces moving under the clock (Interceptor or headless Playwright screenshot file)
- [x] ISC-1296: seeds re-pinned once, after the last behavioural change, noted in Decisions (Read)
- [x] ISC-1297: gamelog e2e: exported log events carry tick (e2e)

#### Step 11: docs

- [x] ISC-1298: features.md Controls: Enter/DONE row gone, Esc pause and PAUSE button rows, a paragraph on ticks, cycles and regeneration (grep)
- [x] ISC-1299: architecture.md: "Sequence of one tick" replaces "Sequence of one full turn" (grep)
- [x] ISC-1300: rules-reference.md Turn structure rewritten as The clock: ticks, cycles, AP regeneration, overwatch cooldown, flames burn one cycle (grep)
- [x] ISC-1301: manual content.ts: "How a turn works" rewritten for the clock; CP and timer text updated (grep)
- [x] ISC-1302: CLAUDE.md invariants updated: capture/replay gone, tick order, command path, hive cycle rotation, LiveScene, shim note (grep)
- [x] ISC-1303: docs/status.md next-line section says stage 1 shipped as v2.0.0-alpha.1 with the URL (grep)
- [x] ISC-1304: realtime-plan.md Status line records stage 1 shipped (grep)
- [x] ISC-1305: Anti: zero em dashes in every changed doc, source file and commit message (grep)
- [x] ISC-1306: Anti: zero banned writing-guide words in changed docs (word-bounded grep)

#### Step 12: release

- [x] ISC-1307: deploy.yml accepts vX.Y.Z-alpha.N: a prerelease tag writes only its frozen dir, never the root, STABLE_VERSION or manifest.json (Read)
- [x] ISC-1308: the root-refresh preserve regex keeps prerelease dirs (Read)
- [x] ISC-1309: genVersionsPage.sh lists prerelease dirs labelled prerelease (Read)
- [x] ISC-1310: versionsHref treats a prerelease dir as a version dir (client unit spec)
- [x] ISC-1311: tag v2.0.0-alpha.1 pushed and its deploy run concluded success (gh run)
- [x] ISC-1312: GitHub release v2.0.0-alpha.1 published as a prerelease (gh release view)
- [x] ISC-1313: https://harryf.github.io/sulkweb/2.0.0-alpha.1/ returns 200 and its manifest names v2.0.0-alpha.1 (curl)
- [x] ISC-1314: Anti: the root manifest still names v1.1.0 after the release (curl)
- [x] ISC-1315: deploy-latest run green after the main push (gh run)
- [x] ISC-1316: versions.html lists 2.0.0-alpha.1 (curl)
- [x] ISC-1317: the ship report names the exact URL that has the change (this run's summary)

#### Closing

- [x] ISC-1318: Anti: engine imports zero Phaser or DOM symbols after the change (grep phaser|window|document in packages/engine/src = 0)
- [x] ISC-1319: Anti: no `as any` added to the engine public API (git diff grep)
- [x] ISC-1320: refined 2026-09-12: three commits, one per group of steps that interlock (engine 1 to 7, client 8 and 9, tests, docs and release plumbing 10 to 12), suites green at each, pushed to main, tree clean at the end (git log)
- [x] ISC-1321: ISA archive protocol applied: the two oldest kept runs moved to docs/isa (Read)
- [x] ISC-1322: PROJECTS.md records stage 1 shipped and the two open verdicts (grep)
- [x] ISC-1323: human verdict 1 recorded in Decisions: does square-per-AP direct movement feel like moving or stuttering (Harry, 2026-09-12: "it works and it's playable"; no stutter complaint, movement passes by his silence on it, flagged as inferred)
- [x] ISC-1324: human verdict 2 recorded in Decisions: is real time more fun than the timed phase (Harry, 2026-09-12: playable, "really hard to play now but we can tune that later": stage 2 goes ahead with a tuning pass first)

### Stage 1 verdict and stage 2 handover notes (2026-09-12, twentieth run)

Harry played v2.0.0-alpha.1 and said: "OK it works and it's playable. It's _really_ hard to play now but we can tune that later." This run records the verdict and writes the notes stage 2 starts from, before compaction.

- [ ] ISC-1325: ISC-1323 and ISC-1324 carry Harry's words verbatim and are no longer deferred (grep)
- [ ] ISC-1326: Decisions entry records the verdict, the reading of it (go for stage 2, tune first), and what "really hard" points at (Read)
- [ ] ISC-1327: docs/realtime-plan.md gains a "Stage 1 verdict and stage 2 handover" section (grep)
- [ ] ISC-1328: the handover names the tuning knobs to try first, in order, each with the ?tuning= key and the evidence behind it (Read)
- [ ] ISC-1329: the handover names the stage 2 build order with the files it touches (Read)
- [ ] ISC-1330: the handover names the two shims to delete in stage 2 and the specs that ride them (Read)
- [ ] ISC-1331: the handover carries the session gotchas that bit this run (Interceptor daemon, hidden tab, HMR reloads during e2e, tsbuildinfo) (Read)
- [ ] ISC-1332: docs/status.md next-line paragraph records the verdict (grep)
- [ ] ISC-1333: CLAUDE.md read-first row points at the handover section (grep)
- [ ] ISC-1334: PROJECTS.md Sulk entry says stage 1 verdict in, NEXT = tuning pass then stage 2 from the handover (grep)
- [ ] ISC-1335: Anti: no game code changed (git diff --stat -- packages/ empty)
- [ ] ISC-1336: Anti: zero em dashes in the new text (grep)
- [ ] ISC-1337: Anti: zero banned writing-guide words in the new text (grep)
- [ ] ISC-1338: committed on main and pushed, tree clean (git status, origin/main)
- [ ] ISC-1339: the ISA frontmatter reads phase complete with every stage 1 criterion closed (Read)
- [ ] ISC-1340: deploy-latest stays green or is not triggered by the docs-only push (gh run list)

## Test Strategy

| isc | type | check | threshold | tool |
|-----|------|-------|-----------|------|
| ISC-1325..1340 | docs/repo | grep and Read of ISA, plan, status, CLAUDE.md, PROJECTS.md; git and gh probes | present as stated; 0 / 0; green or not triggered | Bash, Read |
| ISC-1166..1187, 1188..1197 | engine | vitest specs under packages/engine/src/__tests__ (clock.spec, regen.spec, flames_ticks.spec) plus Read of tick() | green; order as stated | vitest, Read |
| ISC-1198..1208 | engine | command.spec, determinism.spec, gamelog.spec; grep of packages/client/src | green; grep 0 | vitest, Bash |
| ISC-1209..1221 | engine/ai | stealer_tick.spec with spies on planHive and computeThreat; ported hive/charge specs | green; spy counts | vitest |
| ISC-1222..1230 | engine | overwatch_ticks.spec | green | vitest |
| ISC-1231..1250 | engine/ai | marine_ai.spec, autopilot port | green | vitest |
| ISC-1251..1259 | tests | suite run, git diff on kernel specs, file existence, coverage summary | >= 341, 0 lines, files exist, >= 90% | Bash |
| ISC-1260..1282 | client | Read of LiveScene, client unit specs, Playwright e2e | present; green | Read, vitest, Playwright |
| ISC-1283..1288 | client/fog | Read, fog unit spec, fog e2e | present; green | Read, vitest, Playwright |
| ISC-1289..1297 | e2e | Playwright suite, screenshot file | green; file exists | Playwright, Bash |
| ISC-1298..1306 | docs | grep of the named files | hits as stated; em dash 0; banned 0 | Bash |
| ISC-1307..1317 | release | Read deploy.yml and scripts; gh run/release; curl | green; 200; versions as stated | Bash, gh, curl |
| ISC-1318..1324 | closing | grep, git log, Read ISA and PROJECTS.md; two deferred human verdicts | as stated | Bash, Read |
| ISC-1154..1160,1164 | plan-doc/repo | grep and Read of the plan, CLAUDE.md, PROJECTS.md, ISA Decisions | present as stated | Bash grep, Read |
| ISC-1161..1163 | anti | git diff scope, em dash grep, section line count | 0 / 0 / < 80 | Bash |
| ISC-1165 | repo | git log; git rev-parse origin/main | commit on main, pushed | Bash |
| ISC-1134..1146,1150..1151 | plan-doc | Read the named section of docs/realtime-plan.md or ISA Decisions | present as stated | Read |
| ISC-1143,1144 | diff/grep | git diff on the open-questions table; grep "Proposed default" | Decision column intact; 0 hits | Bash |
| ISC-1147..1149 | anti | git diff scope, em dash grep, banned-word grep | 0 / 0 / 0 | Bash |
| ISC-1152..1153 | repo | git log; grep PROJECTS.md | commit on main; entry present | Bash |
| ISC-1095..1120,1124..1128,1133 | plan-doc | Read the named section of docs/realtime-plan.md or the ISA Decisions and confirm the stated content | present as stated | Read |
| ISC-1099,1109,1110 | cross-check | grep endMarinePhase rules / find source files and compare counts to the plan's tables | every rule and file accounted for | Bash grep, find |
| ISC-1121..1123 | anti | git diff scope, em dash grep, banned-word grep | 0 changes / 0 matches | Bash |
| ISC-1129..1131 | repo | grep CLAUDE.md, status.md, PROJECTS.md; git log | links present, commit on main | Bash grep, git |
| ISC-1132 | size | wc -l docs/realtime-plan.md | <= 700 | Bash |
| ISC-934..946,964 | unit | Emitter tap semantics + GameLogger record/serialize/filename + autoplay integration log | all new engine vitest cases pass | Bash vitest |
| ISC-947..953,965 | UI/e2e | window.sulk.gameLog probes, end-dialog DOM, Playwright download event + JSON content | new gamelog spec passes | Bash playwright |
| ISC-954..957 | regression | full unit + e2e suites, engine build, client tsc | exit 0 everywhere | Bash |
| ISC-958..961 | docs | Read new/updated docs pages and CLAUDE.md table | sections present as stated | Read |
| ISC-962..963,966..967 | anti | grep fetch/phaser/document/em dash, git diff scope on ai/ | 0 matches / untouched | Bash grep, git diff |
| ISC-672..676,678..680,686,688..689,692..693,695,701,719..722 | UI/e2e | minimap click/dot/echo probes via window.sulk + lastPlay volume compare | all new minimap/audio e2e tests pass | Bash playwright |
| ISC-713..718 | review-round | mask screenshot, frozen/mirror/constructor Reads, envelope vitest | as stated per ISC | Read / vitest / screenshot |
| ISC-677,683..685,689..690,698..700,705 | unit | miniToWorld, radar config + timing fns, distanceGainFactor curve | all new vitest cases pass | Bash vitest |
| ISC-681..682,687,691,694,696..697,702..704,706..710 | inspection | Read routing/guards/texture params, git diff scope, grep | as stated per ISC | Read / Bash grep |
| ISC-711..712 | build | tsc + full suites | exit 0 everywhere | Bash |
| ISC-654..655,657..658,660..662,665..666 | UI/e2e | number-press Selection assertions + card badge DOM | all hotkey tests pass | Bash playwright |
| ISC-656,659,663..664,667..669 | unit/docs | assignHotkeys vitest, Read guards + docs, grep | as stated per ISC | Bash vitest / Read / grep |
| ISC-636..641,644..645,652 | UI/e2e | staged key presses + help DOM class assertions | all updated keymap/audio/help tests pass | Bash playwright |
| ISC-642..643,646..651 | unit/docs | KEY_ROWS field assertions, grep for stale strings, suite exits | 0 stale refs, 0 failures | Bash vitest / grep / Read |
| ISC-625..631 | UI/e2e | fireReticleFor union states across staged scenarios + screenshot | all 6 door-keyboard tests pass | Bash playwright |
| ISC-632..634 | regression | door-keyboard suite, full e2e, engine vitest, tsc | 6/6, 62/62, 287/287, 0 errors | Bash |
| ISC-439..441 | baseline/regression | unit + e2e suite exit codes pre/post | 0 failures | Bash vitest/playwright |
| ISC-442..452 | cleanup | grep zero-reference proofs, ls, git diff review, build exit | as stated per ISC | Bash/Read |
| ISC-453..458 | coverage | vitest --coverage report lines/branches | stated lines covered | Bash vitest |
| ISC-459..460,468 | review triage | agent reports vs Decisions entries | every finding dispositioned | Read |
| ISC-461..463 | hygiene | package.json/.gitignore content | fields as stated | Read |
| ISC-464..467 | docs | Read + grep for deleted names | 0 stale references | Read/Grep |
| ISC-469..471 | license | LICENSE text diff vs gnu.org, README, package.json | exact text + fields present | Bash diff/Read |
| ISC-472..493 | UI/e2e | Playwright DOM locators, URL checks, engine evaluate | as stated per ISC | Bash playwright |
| ISC-494..498,501..503 | manual e2e | Playwright headings/counts/links on manual.html | present as stated | Bash playwright |
| ISC-496 | content fidelity | manual numbers vs rules-reference.md | all stated numbers match | Grep/Read |
| ISC-499,500 | unit | missionMapSVG output assertions | element counts match JSON | Bash vitest |
| ISC-504,514 | repo | git status / diff inspection | no binaries, clean tree | Bash git |
| ISC-505,507 | build/unit | build exit + vitest exit | 0 | Bash |
| ISC-506,508,511 | e2e regression | full playwright suite | exit 0 | Bash playwright |
| ISC-509,510 | docs | README/architecture content | claims match shipped state | Read |
| ISC-512 | console | pageerror capture on `/` | 0 errors | Bash playwright |
| ISC-513 | visual | real-Chrome screenshots | overlay + manual render correctly | Interceptor |
| ISC-515,516,519..523 | static | config/workflow content read-back | matches spec | Read |
| ISC-517,518,533 | unit/e2e | vitest + playwright home/manual specs | exit 0 | Bash |
| ISC-524,525,528 | API | gh api / gh run list | 200 / success | Bash gh |
| ISC-526,527 | docs | README content | live link + release process present | Grep |
| ISC-529..531 | deploy | curl live URLs + version probe | 200 + v0.2.0 | Bash curl |
| ISC-532 | console | real-Chrome console on live site | 0 errors | Browser |
| ISC-534 | repo | git status | clean tree | Bash git |
| ISC-535,553 | repo | git ls-files / status | ≥33 audio files tracked / clean | Bash git |
| ISC-536,545..547 | static | file/config read-back | matches posture | Read/Grep |
| ISC-537..544 | e2e | new credits.spec + home/manual link asserts | exit 0 | Bash playwright |
| ISC-548 | build/unit/e2e | tsc + vitest + playwright | exit 0 | Bash |
| ISC-549..551 | deploy | gh run + curl live URLs | success / 200 | Bash |
| ISC-552 | console | real-Chrome console with audio present | 0 errors | Browser |
| ISC-554..557 | static/unit | AudioManager read-back + e2e | matches spec | Read/Bash |
| ISC-558,562 | e2e/unit | playwright + vitest + tsc | exit 0 | Bash |
| ISC-559..561,564 | asset | file exists + grep + curl live | present / 200 | Bash |
| ISC-563,566 | deploy/repo | gh run + git status | success / clean | Bash |
| ISC-565 | browser | hidden-tab music pause probe | paused | Browser |
| ISC-567..577 | engine unit | hive.spec fixtures (RollQueue-counted, threat-set asserts) | pass + exact dice counts | Bash vitest |
| ISC-582..589 | engine unit + read | hive.spec objective/hunger/fan-out fixtures + code read | pass | Bash vitest / Read |
| ISC-590 | soak probe | 40-game idle tracker, 15 turns each | worst idle ≤ 3 | Bash bun |
| ISC-591 | regression + pins | full suites + beta_2 scan | 272/272, 56/56, pin documented | Bash |
| ISC-578 | regression | full engine suite | 267/267 | Bash vitest |
| ISC-579 | engine unit + read | GameEngine ctx pass + growth-reset fixture | pass | Read/Bash |
| ISC-580 | soak | 140-game autoplay sweep, 3 missions | 0 ongoing at turn 40 | Bash bun |
| ISC-581 | pins | seed scans + full e2e | documented pins, 56/56 | Bash |
| ISC-1..3 | build/test | command exit code | 0 | Bash |
| ISC-4..10 | UI | rendered state + console | 0 errors | Interceptor screenshot + console read |
| ISC-11,12,65 | repo | git status/log | clean/commits exist | Bash git |
| ISC-13..17,20..22,25..32,36..40,43..46,50..53,55..58 | engine unit | vitest assertion | pass | Bash vitest |
| ISC-18,19,23,24,33..35,41,42,47..49,52,59..61 | UI | browser behavior | visible + console clean | Interceptor |
| ISC-62,63 | build/e2e | clean build + playwright | exit 0 | Bash |
| ISC-64 | docs | README content | claims match ISA state | Read |
| ISC-66,68,72,73,76 | static | grep probe | zero matches | Grep |
| ISC-67 | types | tsc --noEmit both packages | 0 errors | Bash |
| ISC-69 | coverage | vitest coverage lines | ≥90% engine | Bash |
| ISC-70,71 | UI perf | console + recording | 0 errors, no jank | Interceptor |
| ISC-102..105 | engine unit | vitest assertion (RollQueue-pinned kills) | pass | Bash vitest |
| ISC-106..109 | UI | Playwright mousemove + HUD text read + state diff | pass + screenshot | Bash playwright |
| ISC-126..147 | engine unit | vitest assertions (RollQueue-pinned where dice matter) | pass | Bash vitest |
| ISC-148..153,155 | UI | Playwright real-browser probes + screenshots | pass | Bash playwright |
| ISC-154 | static | grep for phaser/dom/audio imports in engine | 0 matches | Grep |
| ISC-156 | build/e2e | full suites + seed scans | exit 0 + documented pins | Bash |
| ISC-157 | docs | README/CLAUDE claims match shipped state | consistent | Read |
| ISC-158..166,179 | engine unit | mission2_fidelity.spec vs independently-transcribed data | pass | Bash vitest |
| ISC-167..176,178 | engine unit | vitest assertions (RollQueue-pinned where dice matter) | pass | Bash vitest |
| ISC-177,180..182 | UI/e2e | Playwright real-browser probes | pass | Bash playwright |
| ISC-183..186 | build/e2e | seed-scan script + full suites + build | exit 0 | Bash |
| ISC-187 | static | engine import grep guard | 0 matches | Grep |
| ISC-188 | tool | transcriber run reproduces space_hulk_2.json | byte-identical | Bash |
| ISC-189,190 | docs | README/CLAUDE/ISA content | claims match shipped state | Read |
| ISC-191..198,200,203 | tool/docs | migrator output + registry + docs read-back | consistent | Read/Grep/Bash |
| ISC-199,202 | tool | independent-agent diff + rerun md5 | 0 unexplained diffs / identical | Bash |
| ISC-201 | build/e2e | full suites + build | exit 0 | Bash |
| ISC-724..732 | pure unit | motionLogic vitest (profiles, kindFromTexture, camPanStep, door/shimmer/recoil params) | pass, 100% cov | Bash vitest |
| ISC-733..746 | e2e | Playwright motionLog probe + settle-exact position checks + camVel probe | pass | Bash playwright |
| ISC-747..755 | e2e anti | reducedMotion emulation, drift+scale check, radar/arrow/home regressions, rapid-input desync | pass | Bash playwright |
| ISC-756 | docs | README Motion note | present | Read |
| ISC-757..760 | suites | engine vitest + client unit + e2e + tsc both | exit 0 | Bash |
| ISC-761 | visual | scratchpad screenshots mid-motion | files exist | Bash |
| ISC-763..770 | engine unit | charge.spec (sweep facing/AP/events, tie, radius, blip/dead-marine guards) | pass | Bash vitest |
| ISC-771 | engine suite | full vitest incl. unchanged zigzag economics fixture | 296/296 | Bash vitest |
| ISC-772..779 | pure unit | replayFocus.spec (planner annotations, throttle, tracker, coverage) | pass, 100% cov | Bash vitest |
| ISC-780..786 | e2e | focus.spec probes (focusLog, lastAttackFx, motionLog lunge, worldView.contains, facing invariant) | pass | Bash playwright |
| ISC-787 | unit + read | ISC-770 capture + planner facingOnly pacing + endTurn read | no per-move extra events | vitest/Read |
| ISC-788..791 | suites | full e2e + unit + tsc both | exit 0 | Bash |
| ISC-792 | docs | README Motion section extension | present | Read |
| ISC-793 | visual | scratchpad attack-vignette.png | file exists | Bash |
| ISC-794 | static | em-dash grep on added player-facing strings | 0 | Grep |
| ISC-796..811 | unit | engine deploy module + GameEngine deploy API | new deploy.spec green | bun test |
| ISC-812..813 | data | Decoy facing values + diff scope | five values only | Read / git diff |
| ISC-814..831 | UI/e2e | deploy-mode boot, markers, placement, rotate, undeploy, clock, pause, auto, roster | new deploy e2e green + old suites green | playwright |
| ISC-832..835,840 | docs | manual section, rules-reference, key notes, em-dash grep, README | present / 0 | Read / Grep |
| ISC-836..839 | suites | engine + unit + e2e + tsc | exit 0 | bun / playwright / tsc |

## Features

### Stage 1: the clock (2026-09-12)

| Feature | Description | Satisfies | Depends on | Parallel |
|---|---|---|---|---|
| engine-clock | tickCount, cycle, tick(), runTicks, boundary function, scheduled spawns, shim | ISC-1166..1187 | none | no |
| regen-flames | AP accumulators, Board.tick, flame expiry map | ISC-1188..1197 | engine-clock | no |
| command-path | MarineCommand, engine.command, lease stamp, logger tick, stateHash | ISC-1198..1208 | engine-clock | no |
| stealer-tick | loop body extraction, plan and threat caches, board.version, blip idle, cycle counters | ISC-1209..1221 | regen-flames | no |
| overwatch-ticks | cooldown, persistence, sustained decay, onTick | ISC-1222..1230 | regen-flames | yes (with stealer-tick) |
| marine-ai | default decision list, per-type minimum, lease, autopilot as issuer | ISC-1231..1250 | command-path, overwatch-ticks | no |
| engine-tests | ported specs, new specs, lint, coverage | ISC-1251..1259 | marine-ai | no |
| live-scene | LiveScene.ts, accumulator, HUD cycle and pause, command routing, tuning, audio duck | ISC-1260..1282 | engine-tests | no |
| live-fog | dirty flag only, snapshots removed | ISC-1283..1288 | live-scene | no |
| e2e-port | harness, seeds, replay cases removed, boot check | ISC-1289..1297 | live-fog | yes (with docs) |
| docs | features, architecture, rules-reference, manual, CLAUDE.md, status, plan | ISC-1298..1306 | live-scene | yes (with e2e-port) |
| release | deploy.yml prerelease path, versions page, tag, verify | ISC-1307..1317 | e2e-port, docs | no |

### Real-time plan run (2026-09-12, planning only)

| name | description | satisfies | depends_on | parallelizable |
|---|---|---|---|---|
| plan-doc | docs/realtime-plan.md: summary, verdict, rules, command model, marine AI, impact, stages, risks, open questions | ISC-1095..1120, 1132, 1133 | none | no |
| plan-review | Council, FirstPrinciples, SystemsThinking, independent assessment, advisor; outcomes in Decisions | ISC-1124..1128 | plan-doc | yes (forks) |
| plan-hygiene | no code changes, no em dashes, no banned words, links from CLAUDE.md and status.md, PROJECTS.md, commit | ISC-1121..1123, 1129..1131 | plan-doc | no |

### Fog of war run (2026-08-21)

| name | description | satisfies | depends_on | parallelizable |
|---|---|---|---|---|
| fog-module | pure client utils/fog.ts: computeMarineSight (union of visibleSquares over living marines plus own squares) and threatRevealed (sight set OR Chebyshev <= 2 of a marine) | ISC-989..994 | none | no |
| scene-fog | GameScene: fog graphics overlay, dirty-flag recompute gated on !animating, per-frame stealer show/hide from sprite tile, spawn-hidden stealers, ?fog=0 and attract/Deploy exemptions | ISC-995..997, 999..1002, 1004 | fog-module | no |
| fog-tests | vitest fog.spec.ts against the real engine board; full suites; typecheck; live Playwright probe | ISC-1005, 1007, 1008 | fog-module, scene-fog | no |

| name | description | satisfies | depends_on | parallelizable |
|------|-------------|-----------|------------|----------------|
| deployment-phase | engine Deploy phase + reserve model, client deploy mode UI, Decoy data fix, docs | ISC-796..840 |; | no |
| marine-hotkeys | assignHotkeys single source, digit handlers, card badges, docs | ISC-654..670 |; | no |
| stabilize-m3 | Fix client test mocks, finish HUD, commit clean M3 | ISC-1..12 |; | no |
| doors | Engine door rules + client door sprites/interaction | ISC-13..19 | stabilize-m3 | yes |
| overwatch | Overwatch flag, auto-fire, jam, marker | ISC-20..23 | shooting-core | no |
| los-overlay | L-key LOS debug overlay | ISC-24,25 | stabilize-m3 | yes |
| shooting-core | RNG service, storm bolter dice, death handling | ISC-26..35 | stabilize-m3 | yes |
| blips-ai | Blip type, conversion, entry, AI0 movement/CC | ISC-36..42 | shooting-core, doors | no |
| phase-cycle | ClockAndCP, CP spend, timer, done, victory/defeat | ISC-43..53 | blips-ai | no |
| mission-1 | Real mission JSON, deployment, objective, reinforcements | ISC-54..59 | phase-cycle | partially |
| polish-pause | Pause, controls help, README | ISC-60,61,64 | mission-1 | yes |
| release | Clean build, e2e, commits per milestone | ISC-62,63,65 | all | no |
| kill-reveals | Death/AI actions re-check sight → blips convert; replay-safe | ISC-102..105 | blips-ai | no |
| hover-readout | HUD line below controls: hovered square coord + contents | ISC-106..109 | polish-pause | yes |
| rules-fidelity | Side-step ban, CC semantics, ranges, MNS, stealer turns, blip bag+restrictions | ISC-126..136 |; | no |
| sections-flamer | Section IDs in JSON, flame flood, HeavyFlamerMarine, self-destruct | ISC-137..141 | rules-fidelity | no |
| sergeant-mission-truth | Sergeant piece, timer bonus, original deployment + flame objective | ISC-142..147 | sections-flamer | no |
| client-fidelity | Flames/jam markers, ammo + dice HUD, sounds, flamer keys | ISC-148..153 | sergeant-mission-truth | partially |
| fidelity-closure | Pins re-scanned, suites green, docs updated | ISC-154..157 | all above | no |
| mission-meta | entry/exit facings + squad names extracted from .mish into mission JSONs via patch script | ISC-271,274 |; | yes |
| entry-triangles | entry.png/exit.png off-board triangles per original EntryTriangle/ExitArrow; purple squares gone | ISC-270,272,273,285 | mission-meta | yes |
| roster-panel | DOM card grid right of canvas: squad rows, names, AP/ammo, badges, death/escape states, two-way selection + camera pan | ISC-275..284 | mission-meta | no |
| roster-closure | Full suites + build + browser verification | ISC-286,287 | all above | no |
| home-overlay | DOM landing overlay at `/`: title, intro, mission list, credits, manual link; space_hulk_1 attract backdrop | ISC-472..484,512 |; | no |
| end-dialog | DOM win/loss dialog with Retry + Choose-another buttons over the Phaser banner | ISC-485..489 | home-overlay | yes |
| abort-control | Two-click confirm Abort button during missions, returns home | ISC-490..493 | home-overlay | yes |
| manual-page | manual.html Vite MPA page: friendly rules from rules-reference.md, marine quotes, SVG mission maps built in TypeScript | ISC-494..504 |; | yes |
| home-closure | Spec updates for new `/` semantics, new home.spec, docs, build, commit | ISC-505..511,513,514 | all above | no |
| pages-build-config | Vite base './' + version define + UI version display | ISC-515..518 |; | no |
| pages-release-workflow | Tag-gated GitHub Actions deploy to Pages | ISC-519..523,528 | pages-build-config | no |
| pages-repo-setup | Enable Pages, homepage + description, README links/release docs | ISC-524..527 |; | yes |
| pages-live-verify | Live-site probes, console check, commit | ISC-529..534 | pages-release-workflow | no |
| audio-ship | Track fetched audio in git; posture docs update (CREDITS/README/workflow) | ISC-535,545..547 |; | no |
| credits-page | /credits.html generated from audioManifest + alienSegments; links from home/manual | ISC-536..544 |; | no |
| audio-release | v0.3.0 tag, live probes incl. audio 200 + real-Chrome audio construct | ISC-548..553 | audio-ship, credits-page | no |
| hive-threat | Threat map (kill zones + seen) and threat-weighted Dijkstra pathing | ISC-567,568 | blips-ai | no |
| hive-waves | Staging ring, stall-based patience, wave launch, vector spread | ISC-569..571,579 | hive-threat | no |
| hive-tactics | Straggler hunts, sacrifice blocker, door shutting, jam rush | ISC-572..576 | hive-waves | no |
| hive-closure | Dice discipline, regression suite, soak sweep, seed re-pins | ISC-577,578,580,581 | all hive | no |
| hive-objectives | Destination awareness: recklessness, wave budget, objective camping | ISC-582..586 | hive-waves | no |
| hive-hunger | Idle frustration: forced assault, deadlock-breaking blip conversion | ISC-587,588,590 | hive-waves | no |
| spawn-fanout | Entry rotation by turn + prefer-unseen entries | ISC-589 |; | yes |
| minimap-click | Interactive rect child on Minimap, miniToWorld projection, centerOn, HUD guard on selection handler | ISC-672..677 |; | no |
| minimap-dots | Red living-marine dots redrawn in updateCam | ISC-678..681 | minimap-click | no |
| radar-echoes | Canvas radial cloud textures, echo Map keyed by pieceId, pulse reveal + fade, wavefront delay from nearest sergeant | ISC-682..697 | minimap-dots | no |
| radar-ping-bridge | AudioManager.onPing(interval) fired from scheduleTracker; GameScene wires to minimap.pulse | ISC-687,691,694,696 | radar-echoes | no |
| distance-audio | distanceGainFactor pure fn + playAt/playAlienAt routing for positional stealer sounds, lastPlay probe | ISC-698..707 |; | yes |
| radar-docs-tests | README/manual notes, new unit + e2e suites, full verification | ISC-708..712 | all above | no |
| motion-logic | Pure utils/motionLogic.ts: per-kind step profiles, kindFromTexture, camPanStep, door slide, shimmer phase, recoil vector | ISC-724..732 |; | yes |
| piece-step-motion | moveSprite rework: kind-styled tweens, snap reconcile path, per-frame marker/highlight sync, motionLog probe | ISC-733..737,748,751,754 | motion-logic | no |
| door-slide | doorToggled centre-parting slide + doorDestroyed crumble | ISC-738,746 | motion-logic | no |
| flame-shimmer | Looping alpha/scale/angle shimmer per flame sprite, killed on clear | ISC-739,740 | motion-logic | no |
| shot-recoil-death | Subtle shooter recoil on shot event; death fade+shrink flourish | ISC-741,742,755 | motion-logic | no |
| camera-inertia | Velocity-model arrow panning + drag-release momentum + grab-to-stop, reduced-motion fallback | ISC-743..745,750 | motion-logic | no |
| motion-docs-tests | README note, motionLogic unit spec, motion e2e spec, full verification | ISC-747,749,752,753,756..761 | all above | no |
| charge-facing | Hive phase-end chargeOrientation sweep + Genestealer.chargeTarget (free, event-on-change-only) | ISC-763..771 |; | yes |
| replay-focus-planner | Pure planReplayFocus: stream walk, position tracker, near filter, retarget throttle, attack staging, facingOnly pacing | ISC-772..779 |; | yes |
| action-camera | endTurn plan wiring: replayPan (force pans), attackFx (shake + spotlight vignette + lunge), focusLog/lastAttackFx probes, finishReplay cleanup | ISC-780..786 | replay-focus-planner | no |
| focus-docs-tests | README extension, charge.spec, replayFocus.spec, focus.spec, full verification | ISC-787..794 | all above | no |

### Gameplay log export run (2026-08-20)

| name | description | satisfies | depends_on | parallelizable |
|---|---|---|---|---|
| emitter-tap | tap/untap observers on the PieceEvents Emitter, exactly-once through capture/replay | ISC-934..935 | none | no |
| game-logger | engine GameLogger: envelope, filter, meta, snapshot, notes, filename, serialize | ISC-936..946, 964 | emitter-tap | no |
| scene-wiring | GameScene constructs logger for real missions, exposes window.sulk.gameLog | ISC-947..948, 965 | game-logger | no |
| end-dialog-export | notes textarea + download button in the end dialog, Blob download | ISC-949..953, 962 | scene-wiring | no |
| gamelog-tests | engine vitest + Playwright gamelog spec + regression suites | ISC-954..957 | all above | partially |
| gamelog-docs | schema doc, architecture section, features mention, CLAUDE.md row | ISC-958..961, 966 | game-logger | yes |

## Decisions

- 2026-09-12 22:05 (stage 1 verdict): Harry played the prerelease: "OK it works and it's playable. It's _really_ hard to play now but we can tune that later." Reading: the go/no-go for stage 2 is a GO (playable, no stutter complaint, no "less fun than the timed phase"); "really hard" is the balance evidence the build already produced (autopilot 1 win in 30 on debug_1; the 1:2 regeneration ratio the advisor cautioned about; the marine default list shoots and overwatches but never advances, so a squad under one keyboard moves at one marine's pace while the swarm regenerates twice as fast). Decision: stage 2 opens with a short tuning pass BEFORE orders, driven by ?tuning= on the live build and by the autopilot seed scan, in this order: marine regeneration 1 per 3 ticks (4 of 30 wins against 1 of 30), then overwatch cooldown, then the reinforcement cadence (blips per cycle is the mission's blipsPerTurn; a cycle of 60 ticks is the cheap lever), then the lease length; the default AI stays as it is until a knob has been tried. Movement feel is recorded as passing by inference (he did not name stuttering); if it comes up in the tuning pass the fix is tickMs and regen first, per the plan. Notes written into docs/realtime-plan.md "Stage 1 verdict and stage 2 handover" so the next session starts there after compaction.

- 2026-09-12 20:55 (stage 1, RELEASED): tag v2.0.0-alpha.1 on 14365c1; "Deploy release to GitHub Pages" run 34699089071 succeeded in all three jobs (verify-build-publish, deploy, redispatch-latest); GitHub release published as a prerelease at https://github.com/harryf/sulkweb/releases/tag/v2.0.0-alpha.1; the live prerelease is https://harryf.github.io/sulkweb/2.0.0-alpha.1/ (manifest v2.0.0-alpha.1, sha 14365c1); the root manifest and STABLE_VERSION still read v1.1.0 (sha 8a83743), so the shipping policy's callout is: the change lives ONLY at /2.0.0-alpha.1/ (and /latest/), never at the root, by design of the 2.x line. deploy-latest for the main push (34699075087) and the post-release re-dispatch both green. Human verdicts ISC-1323 and ISC-1324 are DEFERRED-VERIFY: Harry plays /2.0.0-alpha.1/?mission=debug_1 and space_hulk_1 and answers (a) does square-per-AP direct movement feel like moving or stuttering (if stuttering, the fix is the tick and regeneration constants first, tried through ?tuning= before any AI work) and (b) is real time more fun than the timed phase; both gate stage 2. Interceptor real-Chrome boot check stays deferred (ISC-619's condition unchanged); the headless real-Chromium boot check stands in. Closing advisor call (terse retry after the first returned empty): verdict "code complete, pending playtest sign-off", ADOPTED as the framing: the build is verified, the stage exit gate is the two verdicts, written with pass/fail: (a) PASS = "moving" (a step reads as a heavy stride, not a stutter), FAIL = "stuttering" (then ?tuning= on tickMs/regen before any AI work); (b) PASS = "more fun than the timed phase", FAIL = stage 2 does not start and the identity question (plan Q13) reopens. Its multi-client/Colyseus/soak points do not apply (single-player, no server; the advisor read the March memory note); rejected with that reason. Its self-verification question: the 159 criteria were written at OBSERVE before any code, and two were refined afterwards with ID-stable notes (ISC-1253, ISC-1320).

- 2026-09-12 20:30 (stage 1, BUILD to VERIFY): what changed from the kickoff, each with its reason (also recorded in the plan's "Stage 1 as built" subsection so stage 2 starts from the code): (1) commands apply at once between ticks and are logged against the tick they followed, no drain at the next tick: determinism needs an ordered log, not a delay, and 0 to 250 ms of input lag would corrupt the movement-feel verdict; a re-entrancy guard defers a command issued from inside a tick. (2) Tick order is regeneration, deferred commands, marine AI, stealer tick, expiry sweep and cycle offset events, boundary, due reinforcements, victory, tick event (the advisor's finding that regenerating after the marine AI handed stealers fresh AP and marines stale AP; marines still act first). (3) The default list shoots before it fights (11/36 per bolter shot against roughly 1/12 for a marine's close combat) and an overwatching marine holds even with a stealer adjacent (free reaction fire at one shot per two ticks out-rates aimed fire). (4) One scene renamed in place (GameScene to LiveScene by git mv) instead of a `?rules=live` twin: the engine change made the old scene inert either way, and /1.1.0/ plus git history keep it. (5) Same-entry spawns retry until the cycle ends, then fall back, else drop unbilled (the advisor's bunching point). (6) Extermination requires the reinforcement budget spent (the debug_1 empty-board regression, now clock.spec). (7) Hive counters advance at the first plan of each new cycle before the launch check (a first cut incremented on the cycle's first plan and launched a cycle early; stealer_tick.spec pins the fixed cadence). (8) Blip voluntary conversion = spent nothing since the pool was last full, or idle blipIdleTicks. (9) runStealerActions kept as a test-only whole-activation driver sharing the loop body; hive.spec's zero-dice counts hold through it; dies with the shim in stage 2. (10) The autopilot issues commands and covers when enemies are within 10 squares, and holds for the flamer's 2 AP in reach (it was walking the flamer into the objective room and the lone debug_1 marine blind into the dark). (11) Music ducks on contact within 8 squares; the HUD button is START while deploying and PAUSE afterwards; a hidden tab pauses. Advisor (commitment boundary): adopted the regen order, absolute tick stamps everywhere, the re-entrancy guard, spawn retry, pause on blur; rejected stealers-before-marine-AI (the plan's marine-first tie is deliberate and the lease answers the AP contention) and separate RNG streams (the ordered log fixes the interleaving). Balance evidence (autopilot-driven, not a verdict): debug_1 wins 1 of 30 seeds at marine regen 4 (seed 30, the pinned fixture) and 4 of 30 at regen 3; space_hulk_1 loses every seed inside cycle 1 (the flamer-led column, the 1.x autopilot artefact); space_hulk_2 wipes 24 of 30 squads inside 8 cycles (seed 2 re-pinned). Interceptor: stale daemon on port 19222 again, the extension needs a manual reload; the Claude-in-Chrome tab reported document.hidden and Phaser never finished create(); the boot check is the headless real-Chromium run (packages/client/boot-check.mjs: clock ticks 8 to 32, HUD "Cycle 1, 8s / 10s, PAUSE Esc", two blips, four bolters on overwatch by tick 8, Esc freezes the tick count, zero page errors, screenshots under test-results/boot-check-*.png). Delegation: a fork ported the e2e suite in parallel with the docs (116 of 116 green, no client hooks needed, focus.spec deleted, tests/harness.ts added); Forge and Cato waived (codex absent). E2e re-run by me: 116 passed. Seeds pinned once after the last behavioural change: debug_1 30, space_hulk_1 3, space_hulk_2 2.

- 2026-09-12 19:05 (stage 1, OBSERVE): classifier returned E3 ("approves multi-step implementation plan"); escalated to E4 by conversation context: the approved kickoff is a twelve-step engine and client rewrite plus a release-pipeline change, cross-cutting by the plan's own impact tables. Forge waived (sixteenth time): codex binary absent (which codex = not found); show-your-math: the work is one sequential dependency chain through a single engine file and a single scene, so a second writer would collide on the same files; the Plan agent's independent assessment already reviewed the design, the advisor is the second opinion at the commitment boundary, and a fork will port e2e specs in parallel with docs once LiveScene lands. Cato waived on the same absence. 159 criteria against the E4 floor of 128.

- 2026-09-12 18:20 (real-time plan approved, kickoff): Harry answered questions 15..22 "all agreement"; row 19's Decision cell was blank in the file, filled as agreed with a note naming the chat as the source. Plan status set to APPROVED. Stage 1 starts next session from the "Stage 1 kickoff" section appended to docs/realtime-plan.md: settled constants (tick 250 ms, cycle 40 with per-entity offsets, AP caps 4/6/6 with marine 1 per 4 ticks and stealer 1 per 2, overwatch cooldown 2 ticks plus jam, CP kept through stage 3, Esc free pause, 1.x frozen, LiveScene beside GameScene), a twelve-step build order that keeps the suites green at every step (engine clock and shim, accumulators and flame expiry, command queue, stealerTick with caches, overwatch persistence, MarineAI default, engine tests and the Date lint, LiveScene, live fog, e2e stepping harness, docs, alpha tag), the exit gate (the two human verdict questions), and the session gotchas (Interceptor daemon, hidden-tab Phaser freeze, headless Playwright from packages/client, tsbuildinfo dirt, blocked sleep chains, terse advisor calls, no em dashes, ISA archive protocol). PROJECTS.md and CLAUDE.md point at it. Version for stage 1: v2.0.0-alpha.1 with its own frozen directory, root stays v1.1.0.

- 2026-09-12 17:40 (real-time plan round 2, assessment of the command pause): Harry's idea: freeze the game for a budget of seconds that recharges with ticks and scales with living sergeants and captains, issue many orders at once, no manual control while paused, framed as a CP replacement for a later stage. Assessment: it is the tactical-pause pattern (Door Kickers, Frozen Synapse) and it answers the attention problem the systems pass named (one keyboard marine, four spectators, Shifting the Burden): command capacity becomes a resource with a visible meter, which is what command points always were in spirit, and the sergeant's worth becomes "you get to think longer". Made precise in the plan: pool in seconds as ENGINE state (cap and recharge per tick, proposed 10 s plus 10 s per sergeant or captain, recharge 1 s per cycle plus 1 s per cycle per sergeant or captain), paused orders enter the command queue at the resume tick WITH their normal relay latency (thinking time, never reaction time), wall-clock seconds spent paused reach the engine only as a logged pauseSpent command so replays reproduce the pool. Advisor (terse call, answered in time): ADOPTED (a) the latency rule against pause-scumming; (b) replace CP outright when the pause lands, two currencies for one resource teach nothing (Harry had said keep CP on Q4 "but see idea": resolved as keep CP through stage 3, replace at stage 4, open question 15 asks him to confirm); (c) stack pool scaling with relay latency, both floored so a sergeant-less squad is degraded not bricked (open question 19); (d) stage 4 metered, stage 3 unmetered prototype to feel it before pricing it (Harry said "later stage"; open question 20); (e) accessibility free pause as a run-level setting chosen before the mission, never a mid-run button (open question 18). NOT ADOPTED as a rule, kept as a question: the contact lockout against reflex-save (open question 17, default no lockout, the budget prices the panic). Doc changes: Status line, Summary, tick table now "decided", Command points paragraph, new "Command pause" section, Sergeant loss stacking paragraph, Marine AI decided note for Harry's Q5 and Q9 remarks, Input summary (Esc free pause, Space command pause, P until stage 4, DONE becomes pause with the meter), Determinism bullet, Stage 3 and 4 ships and exit criteria, three Risks rows, open questions 15..22 (also captains, which have no piece class yet, and direct control during the pause). Harry's Decision column for 1..14 preserved verbatim (13 "Agreed with recommendation" cells plus "250 ms").

- 2026-09-12 17:10 (real-time plan round 2, OBSERVE): Harry read the plan, accepted every recommendation (Q1..Q14), added AI notes on Q5 and Q9, and proposed a recharging command pause as a CP replacement for a later stage. Tier E3 by the classifier; ISC count 20 against the soft floor of 32, show-your-math: one idea folded into one document, every consequence has its own probe already. Delegation waived: single-author design judgment inside a 10-minute budget; the advisor is the second opinion.

- 2026-09-12 15:40 (real-time plan, advisor): first call timed out at 170 s; second call (terse, 400 s budget) returned three points. (1) Persistent free reaction fire without a fire-rate gate is a balance trap the default AI will exploit at once: ADOPTED, the plan now names OVERWATCH_COOLDOWN (default 2 ticks) plus jam as stage 1 requirements with a unit test in the exit criteria. (2) The 1:2 regeneration ratio doubles the stealer edge over the tabletop 4:6 with costs unchanged: ADOPTED as a caution, the constants live as unvalidated data in CostTables with a ?tuning= override and the first sweep tests marine 1 per 3 ticks. (3) Square-per-AP movement under direct control may feel like stuttering, which is the real pass/fail of the port and must be tested in stage 1 before any AI: ADOPTED into the stage 1 verdict questions and the Risks table. Also flagged: a single 40-tick heartbeat fires every per-turn rule in one burst; ADOPTED as per-entity offsets within the cycle. The advisor called the rest (fixed tick, deterministic sim, most-specific-live-order-wins, sequencing) sound.

- 2026-09-12 15:05 (real-time plan, Council): Quick council of four composed voices (board-game veteran, real-time tactics designer, principal engineer, solo-dev product coach). Unanimous: the design as described is worse than the turn game, a trimmed version could be better, and the mission layer is premature; the hierarchy should be two levels (individual, squad) on top of a default self-defence AI. Unanimous first slice: one marine under the keys, default AI on the rest, stealers spawning and closing continuously, fixed tick, seeded dice, no orders, no sergeant mechanic; "if that is not tense alone, the design is dead, exactly where March died". Sergeant loss: three of four for command latency (a slope, felt as tension, one constant in a deterministic sim); the dissent (product coach) argued vanish is one boolean and ships in an evening. Standing concerns carried into the plan: the veteran's "this is no longer Space Hulk" (recorded as an identity decision for the user, open question 13), the designer's "one keyboard marine makes the other four spectators" (stage 1's human verdict asks exactly this), the engineer's "keep it a fixed-tick seeded replayable state machine or the suite dies", the coach's "build the slice beside the v1.1 root, not on top". ADOPTED: two levels plus default, latency with vanish behind a flag for an A/B, stage 1 as the trimmed slice, LiveScene beside GameScene. NOT ADOPTED: the designer's "bake one squad order (hold with overwatch) into stage 1": the default AI already holds and overwatches, so the order adds a UI with no new behaviour.

- 2026-09-12 15:05 (real-time plan, FirstPrinciples): hard constraints: engine purity and events as the only channel (the port's law); determinism with seeded dice and scripted RollQueue tests; that an idle marine in real time is a design hole (a hard consequence, not a preference). Soft constraints: the turn structure itself (four files: GameEngine, StealerAI, hive, GameScene), the stealer-phase capture/replay animation (exists only because the stealer side acts in a batch, becomes dead code), fidelity to the original rules (the kernel stays faithful, the scheduler does not), sergeant loss must matter (design wish). Unvalidated assumptions: that real time is more fun than the original's 120 s timed phase (never tested; the March attempt never reached a verdict); that three command levels are needed (two plus a default achieve the function "steer a squad without micromanaging"); that a priority system is needed ("most specific live order wins, and expires" removes the tunable); that the hive planner survives per-tick calls (a cadence and a cache, verified against hive.ts's structure). Key insight: the load-bearing piece is the marine default AI, so it ships first and alone.

- 2026-09-12 15:05 (real-time plan, SystemsThinking): three causal loops built. (1) Command latency and attention: order granularity, marine autonomy and sergeant loss feed player workload; micromanagement relieves it instantly (balancing) but starves the squad layer of use and evidence (reinforcing), which is the Shifting the Burden archetype. (2) Tempo: stealer regeneration against marine fire rate, overwatch jams and reinforcements; jam is the balancing loop that keeps persistent overwatch from turning corridors into walls. (3) Trust in squad AI: a move that looks wrong reads as a failure, the player takes over, the layer never earns trust. Highest leverage (Meadows): make squad intent visible (order markers and a one-word reason on the roster card) so a surprising move reads as a decision; graceful sergeant loss as a slope (latency) rather than a cliff (vanish); lowest leverage: tuning jam and spawn rates. ADOPTED into the plan's Verdict, the roster order word, and the latency rule.

- 2026-09-12 15:05 (real-time plan, independent impact assessment reconciled): the Plan agent read the same sources independently and produced an impact map, tick model, module layout, test impact, staging and risks. Agreements: 250 ms tick, cycle mapping of per-turn mission numbers, one action per piece per tick with the existing reaction chain, plan cadence, LiveScene beside GameScene, stage order and stage 1 as the riskiest. Divergences and resolution: (a) it counted 74 files (mission JSONs, declaration files, config.ts and gameConfig.ts included) where the draft had 30 engine and 28 client; the draft's client count was a truncated listing (tail -30), corrected to 31 source plus 4 declaration files, JSONs listed as untouched in prose. (b) It routes ALL player input through an engine command queue so a seed plus a command log replays a game: adopted (the draft only had direct-control keys queued). (c) Board.flaming as a map of square to expiry tick and sustained fire decaying by idle ticks: adopted. (d) An endMarinePhase shim equal to runTicks(CYCLE) for stage 1 spec porting: adopted, deleted in stage 2. (e) Threat cache keyed on a board version counter and a same-seed same-log state-hash vitest plus a lint ban on Date in the engine: adopted. (f) Its flamer profile (fire when two or more stealer-side pieces stand in the target section) differs from the draft's last-stand rule: kept as an alternative in open question 9. (g) It keeps MarineAutopilot beside new marine AI modules; the draft rewrites it as the order issuer: the draft stands (one scripted player, not two), with its helpers lifted into MarineAI. (h) Its "player-held lease" on the individual slot after a key press: adopted as open question 14 with a default. Nothing it verified contradicted a fact in the draft; its unverified items (per-tick vision cost, Playwright stepping under CI load) are carried as risks.

- 2026-09-12 15:05 (real-time plan, process): Claude Code plan mode not entered although the tier is E4: the deliverable of this run IS a plan document plus ISA entries, and plan mode blocks writing files; the "plan means stop" rule is honoured by touching no game code (ISC-1121). Forge waived (fifteenth time) and Cato waived: codex binary absent; delegation was the Plan agent (independent assessment) and the Council's four composed agents plus the SystemsThinking fork.

- 2026-09-12 (real-time plan, sixteenth run, OBSERVE): user directive: plan, do not implement, the change from turn-based to real-time (fast stealers, slow heavy marines with more firepower), with marine AI at three levels plus direct control, a priority scheme between command levels, a short per-marine order queue, per-type AI, and a sergeant-loss mechanic; assess the gameplay's merits, the codebase impact, and stage the delivery. Preflight found the earlier real-time attempt in the sibling repo (~/Code/personal/sulk, March 2026): a full tick-based design doc (500 ms ticks, integer AP accumulators, persistent overwatch, click-to-move) and a one-day build that playtested badly (no stealers spawning, nothing interactive, mock-heavy tests) before the user restarted with the faithful turn-based port that became sulkweb. That history is the strongest input this plan has: the design thinking is reusable, the delivery style is the thing to avoid. Cross-vendor waivers: codex binary absent (`which codex` empty), so Cato (mandatory at E4) and Forge cannot run; delegation is the Architect agent (independent impact assessment) plus the Council's composed agents. ISC floor: 39 ISCs against the E4 soft floor of 128; show-your-math: the unit of work is one document plus decisions, and every section of it has its own probe already; padding to 128 would split prose paragraphs into criteria that no tool can distinguish.

- 2026-09-12 (v1.1.0 release): user asked to cut v1.1.0 and asked why main was "still on 0.6.1". It was not: the previous ship report's STORY bullet described the state BEFORE the v1.0.0 run, and the root was serving v1.0.0 at the time. Lesson for the ship report: the story's first bullet must be time-stamped as the starting state or dropped, never read as current. Release cut from main 8a83743 with the two v1.1 items (conversion facing, wheel panning); title "v1.1.0: squared up and scrolling". Old versions stay frozen under /1.0.0/ and /0.6.1/, listed on versions.html.

- 2026-09-12 (toward v1.1, plan): user asked for two small improvements for the next minor version. (1) Stealers emerging from a converted blip face their nearest marine, reusing the same rule the hive's phase-end charge sweep applies (facingToward + Chebyshev nearest, board-order tie) but at the moment of conversion, so a contact that bursts out of hiding is already turned toward its prey; the sweep still runs at phase end for everyone else. Placed in Blip.convert (the single conversion site, AmbushCounter routes through super.convert) rather than in the two callers. No dice consumed, so pinned engine fixtures hold. (2) Mouse wheel pans the camera like the arrow keys: wheel down pans down, horizontal wheel or trackpad swipe pans sideways; implemented as direct scroll writes (the drag precedent) that cancel inertia and any programmatic pan, ignored over the HUD strip. Shipped to main, which lands on /latest/ only; v1.1.0 not cut here since the user framed these as items FOR the next minor, and the minor may collect more.

- 2026-09-12 (v1.0.0 release): user instruction: merge the fog branch into main, cut v1.0.0, release, delete the branch. Fast-forward merge (main was an ancestor), tag pushed, release run green before the GitHub release was published (order codified at ISC-984), stable root verified live at the tag sha, branch deleted locally (it was never pushed). Release title "v1.0.0: the dark between the bulkheads". The 1.x line now starts on main; there is no long-lived feature branch. Known and carried forward from the twelfth run: debug_1 has no sergeant so its blips stay hidden under fog; motion-tracker audio still pings for blips with the radar down; balance baselines stale.

- 2026-09-12 (fog adjustments, code review round): code-reviewer (working against HEAD after the split) reported two CRITICAL, five IMPORTANT, four nits. ADOPTED: (1) CRITICAL replay-camera leak: planReplayFocus annotated every near-marine pieceMoved with a focus point regardless of kind, so on a sergeant-less mission the camera walked the player down an empty corridor one invisible blip step at a time; fixed with a hidden(pieceId, square) predicate on the planner (pure, unit-tested) fed by GameScene from the frozen sight set, marine snapshot and radar snapshot; conversions and close combat keep panning since they always show something. (2) CRITICAL stale ISA verification after the split: ISC-1033/1034/1038 lines rewritten against HEAD, ISC-1034.1 ticked. (3) hive seen-map widening stated honestly: the kill map (canShoot) is unchanged and the blocker still shields it, the seen map (canSee) now reaches past the blocker so staging behind it is penalised, not forbidden; comment fixed, no hive code change, balance impact deferred to the next balance run. (4) Manual and rules-reference text rewritten for the split and the radar gate. (5) Real-browser fog spec added (four tests). (6) Balance baselines in CLAUDE.md marked stale. Nits adopted: GameScene fog doc comments, one radarPieces() helper for both radar call sites with the RadarPieceView type restored, explicit 'marines' branch in los.ts. NOT ADOPTED, with reasons: motion-tracker audio still tracks blips with the radar down: the tracker is the squad's own motion sensor, a different instrument from the sergeant's auspex, and silencing the game's main tension channel on debug_1 is a design call for the user, recorded here as a known, deliberate asymmetry; blips selectable while visible: pre-existing, the radar gate narrows it, and selecting a blip is harmless (no marine action applies). Cross-vendor Forge/Cato: still no codex binary.

- 2026-09-12 (fog adjustments, refined after the advisor): the advisor pushed back on gating fire and sight together: transparent bodies in canShoot meant overwatch and F reached past the front stealer, a combat and balance change the user never asked for, riding on a visibility fix. Split the gate: canSee uses piecesBlock 'marines' (sight through stealer-side bodies: the ask), canShoot keeps piecesBlock true (a shot stops at the first body of any side, as before). Fallout reversed: hive.spec and hive.ts are restored byte-identical to main (the sacrifice blocker's body shields the kill lane again, since the threat map is canShoot-based), ISC-1038 dropped, ISC-1034.1 added to pin the fire policy. Advisor points NOT adopted, with reasons: capability flag instead of the sergeant sprite check (isSergeant already exists and the minimap uses it; a captain lands with its own piece class and the predicate gains one line then); mission-level radar flag for sergeant-less missions (debug_1 is a debug mission; flagged to the user instead); RNG partition question (moot once canShoot is unchanged: the e2e greenness now covers exactly what changed, sight, through the blip-conversion path); save/replay compatibility (there are no saved games; the gameplay log export is analysis data, not a replay format).

- 2026-09-12 (fog adjustments, twelfth run, plan): user directive, two changes. (1) Stealers must not block line of sight: everything behind them in the sight line stays visible and blips convert the moment they enter it; the goals are dread (see the whole column charging) and information (count the room before flaming it). Implemented at the ENGINE gate, not in the fog renderer: hasLineOfSight's piecesBlock now stops only at a marine occupant, so sight, fire and the blip-conversion sweep (squareSeenByMarine calls the same canSee) agree by construction; a renderer-only change would have shown stealers the engine still treated as walls. Marines still block each other (not asked; original rule kept). Consequence accepted and pinned in hive.spec: the hive's sacrifice blocker no longer shields the lane behind it, it is a pure decoy now (one soaked burst, a jam chance); whether the hive should keep spending a stealer on it is an open balance question, out of this run's scope, and the kill-reveal test that proved "the kill opens the sight line past a stealer" is rewritten to the new rule (the first sweep converts through the body; the death sweep is still exercised by the close-combat and overwatch cases). (2) Blips on the main board show only while the pulse radar runs: radarLogic.radarActive (any living sergeant; a captain would join once the engine has one; the user said "sergeant or captain") gates blip sprites per frame through fog.threatVisible; stealers keep the sight-or-creep rule. Read literally: radar down means a blip is invisible even adjacent or in sight (in sight it converts anyway). debug_1, the default mission, has no sergeant, so under fog its blips are never shown; that is the rule, flagged to the user. Replay epoch: fogRadarSnap is taken in endTurn beside fogMarineSnap so a sergeant killed this phase keeps the blips on screen until finishReplay, matching the minimap's frozen scope. Minimap.ts untouched. Forge waived (14th): codex binary still absent; code-reviewer is the delegation.

- 2026-09-12 (fog resumed, eleventh run): user instruction: restore branch fog-of-war, merge main in, use it as the base for the 1.x version series, get it running locally first so the open fog issues can be fixed. The branch was intact locally (never pushed); main had moved by exactly one commit since the park (df42de2, the ISA parking record), so the merge conflicted in ISA.md only. Resolution keeps both sides whole: the fog run block and the parking block both live in Criteria, both Decisions entries stay, the frontmatter progress line is combined. Suites, build and a real-Chrome boot all green; the branch is runnable and unchanged in game code. Open fog design questions carried forward from the 2026-08-21 entries: creep reveal leaks through walls (Chebyshev 2 vs BFS path distance), and whether the hearing reveal should draw an ambiguous marker rather than the full stealer sprite. First live observation worth checking against the user's own list: at mission start on space_hulk_1 the sight set is only the five marine squares (the column faces a closed door), so the whole map reads as black except the squad. The 1.x series starts from this branch; the branch-to-main landing and the v1.0.0 cut wait until the fog issues are fixed. Interceptor CLI was blocked by a stale daemon (documented gotcha); the live probe used the Claude-in-Chrome extension, which is still real Chrome. Forge waived (13th): codex binary still absent.

- 2026-08-24 (fog parked): user verdict on the fog-of-war build: "hold on this for now... it needs more work but I want to make some other changes to the stable release first". The complete, review-hardened feature is parked on branch `fog-of-war` (tip 1418ca9; three commits: the feature, the review-round fixes, the ISA record). What it contains: stealers hidden outside marine LOS with a Chebyshev-2 creep reveal, 0.42 dim overlay on unseen squares at depth 0.7, blips/minimap untouched, replay-frozen sight set with a pre-phase marine snapshot for the creep reveal, side channels closed (hover, click, L-cone), ?fog=0 escape hatch, 10 pure vitest cases, all suites and live probes green at park time. Its ISA run block (ISC-989..1013, all [x]) rides the branch; those IDs are reserved on main, next allocation starts at ISC-1019. TO RESUME: `git checkout fog-of-war`, then either rebase onto main or merge main in; re-run pnpm -r test plus the fog Playwright probe after; the known open design questions are in the branch ISA's fog Decisions entries (creep-radius wall-leak tunable vs BFS, ambiguous-marker rendering instead of full sprite for the hearing reveal). Branch intentionally NOT pushed; the branches-on-main exception was explicit user instruction, overriding the direct-to-main default for this repo.

- 2026-08-21 (fog-of-war run, code review): code-reviewer found one CRITICAL, one MEDIUM, four nits; all but one adopted (ISC-1009..1013). CRITICAL: updateFog read live engine.marines every frame, but the whole stealer phase resolves synchronously inside PieceEvents.capture BEFORE frame 1 of the replay, so a marine killed this phase was already spliced out of engine state and projected no creep reveal for the entire animation: his killer approached and struck invisibly, and the missing reveal doubled as an inverse payload-not-engine leak (it told the player who was already dead). My own melee-attacker-always-revealed test missed it because it hands threatRevealed a literal marines array. Fix mirrors the existing anchors snapshot two lines above (same splice hazard, same cure): fogMarineSnap taken in endTurn, used by fogMarines() while animating, cleared in finishReplay; hover guard shares fogMarines(). MEDIUM: the pointerdown hit test scans children.list manually and ignored visible, so a fog-hidden stealer was clickable, which forced the highlight visible at its square, leaked its AP to the HUD, and let the L key paint its whole vision cone above the fog; fixed with a visible gate on the hit predicate. Nits adopted: marineEscaped added to the dirty triggers (was correct only via pieceMoved ordering coupling), game-over fog lift gated on !animating (post-mortem readability without leaking the result mid-replay), hover guard exempted during Deploy. Nit skipped: per-frame allocation micro-optimization outside replays (few marines, few stealers, not measurable). Reviewer confirmed clean: coordinate math (tile flips at the 50% pixel mid-tween as intended, lunge 10px never flips a tile), ?fog=0 truly zero-change (pieceKind stash has exactly two occurrences), sprite lifecycle races, permanent desync impossibility, capture-buffering vs fogDirty, AmbushCounter is kind blip, fire reticle cannot mark a hidden stealer (90 degree arc is a strict subset of the 180 degree sight arc over the same LOS).

- 2026-08-21 (fog-of-war run, verify round): advisor + test-analyzer triage. ADOPTED: (1) hover-readout side channel was real: describeSquare named any piece on the hovered square, so hovering the dark scanned the map; now a stealer part is omitted unless threatRevealed (advisor finding, the only code defect either reviewer surfaced pre-code-review). (2) Three tests added per test-analyzer: dead marine casts no sight / wiped squad empty set (pins the board.pieces-holds-only-living engine invariant fog leans on), melee-attacker-always-revealed tripwire (independent of the creepRadius knob), non-marine pieces cast no sight (negative filter test). REJECTED with reasons: BFS-vs-Chebyshev re-litigation (user explicitly asked for "within 2 grid squares should appear"; full-sprite reveal is the requested behavior; ambiguous-marker rendering noted as a future option); recompute-on-replayed-door-events (replays pierce nothing, ONE coherent rule: live marine actions recompute immediately, replay events only mark dirty for finishReplay; the advisor's "tension" conflated the live useDoor probe with replay); client-side-secret hardening (solo honesty game, ?fog=0 is the user's own escape hatch, no multiplayer on the roadmap); arc-boundary drift (impossible by construction: fog calls the engine's visibleSquares, the same function blip conversion uses, so fog LOS is engine LOS identically); mid-replay frozen-cone-of-a-marine-killed-by-overwatch leak acknowledged as transient (recomputes at finishReplay) and conservative-direction. Advisor's stale-ISA complaint was an --auto-state artifact (it read an unrelated task ISA; this run's 20 ISCs live here).

- 2026-08-21 (fog-of-war run, plan): user wants dramatic fog: stealers hidden on the main board unless in marine LOS or within 2 squares, dim overlay on out-of-sight squares, blips and minimap unchanged, accepting it may prove too hard ("I want to try it"). Design: pure presentation feature, zero engine changes; the engine already exports visibleSquares/canSee. Sight set = union over living marines of visibleSquares plus each marine's own square (a marine never "sees" the square he stands on per inVisionArc, but dimming the squad would be absurd). Proximity metric: Chebyshev <= 2 THROUGH walls, deliberately: reads as hearing scratching in the bulkheads, is deterministic and cheap; a BFS path-distance variant is the tunable alternative if wall-leak feels wrong in play. Attacked-from-behind reveal needs no extra pathway: all stealer-side pieces (Genestealer, Blip, AmbushCounter) attack in melee, so an attacker is always Chebyshev 1. Replay handling extends the codebase's payload-not-engine invariant: the sight set is FROZEN during replay (recompute gated on !animating, mirroring minimap.frozen) and per-frame stealer show/hide tests the sprite's live tile against the frozen set; marines never move during the stealer phase so proximity from engine marine positions stays truthful mid-replay. A stealer opening a door mid-replay keeps the corridor dark until finishReplay: conservative and thematically right. Escape hatch: ?fog=0 (default on in real missions, off in attract mode, no overlay during Deploy). Overlay depth 0.7: above floor 0, markers 0.4-0.5, doors 0.5, deploy-x 0.6; below losOverlay 0.8, flames 0.9 (flames stay bright: light sources), cat 0.95, pieces 1. ISC soft floor show-your-math: 20 ISCs, not 32; contained presentation surface, every behavior has exactly one probe, padding would split atomic probes artificially (precedent: runs eight and nine). Forge waived (12th): codex binary still absent; code-reviewer + pr-test-analyzer are the delegation pair.

- 2026-08-21 (door-destruction run, review round): code-reviewer independently verified reproduce-first (removed the handler, 2 tests fail; restored, 6 pass) and confirmed the capture-safety claim (overwatch is the only marine action inside capture and it never targets doors). Adopted: mid-autofire interleave test (handler converts a blip synchronously inside autofire's repeat-pass loop and the fresh stealer becomes a pass-2 target), dead RollQueue removed from the replay test. Test-analyzer verdict: sufficient; per-weapon conversion tests rejected as redundant since demolishDoor is the sole doorDestroyed emitter. Advisor sweep of remaining sight-adding events: turn-in-place covered (tryTurn emits pieceMoved, tested), flame expiry covered (clearFlames is followed by convertRevealedBlips at end phase), blip spawn covered (spawnBlips followed by convertRevealedBlips), cat is not a piece and never blocks LOS. KNOWN PRE-EXISTING GAPS, not fixed this run: (1) finishDeployment lands reserve marines without a conversion sweep, so a blip already in a just-deployed marine's arc waits for the next trigger; (2) marineEscaped vacates a square without a conversion sweep, which could in principle open another marine's sight line. Both self-heal on the next marine action and predate this run.

- 2026-08-21 (door-destruction run): user playtest report: blip behind a door stayed a blip after the door was shot away. Root cause: door destruction emits doorDestroyed (demolishDoor in rules/Door.ts), but GameEngine's immediate-conversion wiring only covered doorToggled, marine pieceMoved, pieceDied, and sectionFlamed, so no sight re-check ran until the next unrelated trigger. Fix at the ingestion point: one doorDestroyed subscription in the GameEngine constructor mirroring the doorToggled guards (replaying, Deploy phase, result ongoing). This single handler covers all three destruction weapons since bolter shootDoor, cannon autofire, and chain-fist cut all emit through demolishDoor. Handler is capture-safe: stealers only open doors, never destroy them, so it cannot fire inside the suppressed stealer phase. Reproduce-first honored: both new tests failed before the fix, passed after. Forge waived (11th): codex binary still absent; reviewer + test-analyzer agents are the delegation pair.

- 2026-08-20 (hardening run): root cause of the invisible-feature incident split into two legs. Process leg: nothing forced the reach-stable decision at ship time and "release" was read as the automatic /latest/ deploy; codified as the CLAUDE.md Shipping policy. Technical leg: the shared pages concurrency group keeps ONE pending run, so a release queued behind a main push replaces that push's pending deploy-latest run and the commit never reaches /latest/ until the next push; healed by deploy.yml's redispatch-latest job. Reviewer round (4 findings, ALL adopted): heal moved to an always-run job (displacement happens at queue time, a red release gate still owes the heal); continue-on-error + ::warning so a dispatch failure never turns a deployed release red; actions: write scoped per-job away from the third-party-code build job; docs corrected (content-identical rebuild not no-op, release-driven dispatch bypasses paths-ignore, ISC-974 narrowed to pushes). Reviewer also confirmed: no recursion path, rollback dispatch is harmless (deploy-latest never touches root/frozen dirs, versions.html regenerates from the rolled-back STABLE_VERSION), YAML valid. Advisor waived show-math: the change is ~40 workflow lines with a live dispatch proof and a full reviewer round as the second opinion.
- 2026-08-20 (gamelog run): capture hook is a tap on the Emitter itself, firing at real emit time BEFORE capture() buffering and skipping replaying re-emissions. Alternatives rejected: per-type .on subscription (misses capture-suppressed stealer events, depends on animation replay running to completion) and logging calls inside GameEngine rules methods (invasive, scatters concerns). Tap gives exactly-once, true chronological order, zero rules-code churn, and headless testability.
- 2026-08-20 (gamelog run): event filter drops only 'selected' and 'apChanged' (pure UI noise / derivable from actions); everything else recorded, cpChanged included (marine resource decisions are analysis signal). Shot and closeCombat payloads already embed actual dice rolls, so hit-rate analysis needs no re-simulation.
- 2026-08-20 (gamelog run): stealer AI files (hive.ts, StealerAI.ts) deliberately untouched; the run's whole point is collecting data BEFORE changing the AI, keeping future rules mission-generic (ISC-967).
- 2026-08-20 (gamelog run): Forge auto-include waived, 10th occurrence: codex binary absent on this machine. Delegation floor met instead with code-reviewer + pr-test-analyzer agents at VERIFY.
- 2026-08-20 (gamelog run, discovery): MarineAutopilot's post-move engine.checkVictory() reads debug_1's empty turn-1 board as an exterminate-or-exit win (3-event game). Pre-existing and autopilot-only: human play checks victory at phase boundaries after reinforcements spawn, so the corpus cannot carry the false label. win.spec unknowingly leans on it for its fast pass. Surfaced to the user, not fixed this run; jq filter documented in gamelog-format.md Corpus caveats.
- 2026-08-20 (gamelog run, advisor adjudication): ADOPTED payload deep-copy (structuredClone: the shallow spread aliased nested arrays like rolls/squares/kills, a silent history-rewrite risk) + mutation-after-emit test; ADOPTED corpus-caveat documentation (spurious-win filter, formatVersion-2 plan). DEFERRED to formatVersion 2 with the actual AI work: hive intent events and per-turn board hash (both live in the decider ISC-967 deliberately freezes so the corpus predates the changes it justifies). DECLINED: apChanged logging (derivable from action stream + cost tables; cpChanged IS logged), observation flags (stealer AI has full knowledge; hidden-info concern is marine-side), NDJSON (per-game download stays JSON), JSON-schema validation test (typed interfaces + round-trip cover it).
- 2026-08-20 (gamelog run, code-reviewer adjudication, 7 findings ALL adopted): (1) CRITICAL: Phaser's game-level KeyboardManager preventDefaults its 25 captured keycodes on window with no target check, so a human could not type into the notes textarea (reviewer reproduced in Chromium: 49 of 59 characters eaten; my e2e used fill(), which bypasses key events and hid it). Fix: gameOver handler disables Phaser input AND clearCaptures() (scene-level enabled=false alone proved insufficient: e2e still showed "lnvlnk;lyliv."); e2e switched to pressSequentially + toHaveValue as the human-typing proof. (2) Same lever stops typed keys driving mute/roster/pause behind the dialog. (3) seed parsed ONCE and shared by dice + log (?seed=abc used to build SeededRng(NaN) while logging null; empty ?seed= logged 0 while unseeded). (4) payload aliasing: already fixed mid-verify via structuredClone (reviewer saw the pre-fix snapshot). (5) envelope now written AFTER the payload spread so seq/turn/phase/type always win key collisions (phaseChanged's own fields could shadow engine truth); collision test added. (6) CLAUDE.md window.sulk contract updated with gameLog. (7) scene shutdown hook detaches the logger (module-singleton tap would survive a future scene restart).
- 2026-08-20 (gamelog run, test-analyzer adjudication): ADOPTED phase-integrity walk in the autoplay test (envelope phase vs last phaseChanged marker: the corpus's core dimension), deploy-phase coverage (beginDeployment/finishDeployment placements land with phase Deploy), tap-exception isolation in emit (a throwing logger must never abort handlers or the capture buffer) + pinning test, retry-lifecycle e2e (reload = fresh logger), rolls-presence assertion, NaN ?seed guard (malformed seed logs null, not NaN). DECLINED as benign: notes unicode (JSON.stringify), double download click (re-serializes per click), nested capture (unused in practice).

Older entries: [docs/isa/decisions-log.md](docs/isa/decisions-log.md).

- 2026-08-20 (versioned Pages deploys, ISC-901..932): User wants root = last stable, /X.Y.Z/ frozen forever, /latest/ = main head (may be broken), versions reachable via the manual. Design: kept Pages build_type=workflow; gh-pages branch is the persistent site tree; each workflow updates only its slice (release: root + own version dir; latest: latest/ only) then publishes the ENTIRE tree as the artifact; shared concurrency group serializes deploys. Bootstrapped the branch from a local v0.5.0-stamped rebuild proven byte-identical to the live bundle (main-BsS2_Wa0.js, same sha). Advisor round: ADOPTED shallow depth-1 fetch (branch history never materialized), .nojekyll, per-dir manifest.json, tag-rerun/dispatch documented as the rollback lever, retention note (~40MB/version vs 1GB soft limit, revisit at ~20 releases); DECLINED the redirect-stub root (user explicitly wants the game AT the root URL) and the Release-tarball architecture (heavier rework; concurrency group already serializes; 40MB is the deliberate committed audio set). Reviewer round (6 findings, all adopted): strict vX.Y.Z tag validation (a v0.6.0-rc1 snapshot would be silently deleted by the next release, vlatest would clobber /latest/); concurrency pre-emption documented (GitHub keeps one pending run per group, a queued release can be cancelled: watch tag runs to green, re-run if pre-empted); workflow_dispatch on deploy.yml so rollback outlives the 30-day re-run window; deploy.yml self-bootstraps an orphan gh-pages while deploy-latest fails loudly (its from-scratch tree would lack the stable root); e2e assertion for the footer versions link; e2e version regex widened for latest-<sha>. Known gaps accepted: root manifest.json first appears at the next tag (bootstrap wrote none); frozen snapshots predating the manual change lack the All versions link.
- 2026-08-20 (em dash purge + ISA restructure, ISC-884..900): User banned em dashes ("kill them all... never put another mdash anywhere"). Scope decision: scrubbed all living documentation (README, CLAUDE.md, CREDITS.md, top-level docs, docs/history/README.md, config comments) plus the root ISA's kept text; left verbatim the June-2025 archives, the docs/isa/ archives (records preserve their original text, noted in each file's preamble), and code comments (the old rule exempted them; the ban is forward-looking and now covers everything new). Replacement judgment: colon for elaborations, parentheses for asides, semicolon or comma for clause joins, restructure where none fit; en dash ranges untouched. ISA restructure: GitHub YAML error fixed by quoting the progress value (the unquoted colon in "shipped: ISC-..." broke the frontmatter parser at line 6 col 40); 369KB root split to ~50KB by archiving completed run blocks verbatim into docs/isa/ topic files (engine-core, missions, stealer-ai, client-ui, audio, releases-infra, docs-meta) keyed to code areas, with chronological decisions-log and changelog-log; recent runs stay in root; deferred items become root pointers; per-run archive protocol documented in the Criteria index. Delegation: one general-purpose agent scrubbed the four largest docs pages in parallel (before/after counts verified).

- 2026-08-19 (deployment phase run, E3 classifier, ISC-796..847): User request: a pre-mission deployment phase; 1.5 min per squad clock, click deploy squares to choose a marine from that square's squad, sensible default facing (Decoy 10..14,10 down→right data fix), no cross-squad mixing, optional A/D orientation, X indicator on free squares, timeout/Done auto-deploys the remainder, undeploy possible, pause works, an Auto Deploy control (bolter point, sergeant, heavy weapon, bolters behind), the roster as deploy indicator + picker, minimal UI that disappears after; mid-turn addition: rules + manual updates. DESIGN: the phase lives in the ENGINE (placement legality is a game rule and unit-testable), model = LIFT-INTO-RESERVE: marines construct exactly as before (roster identity, dice draws, and every existing test untouched), then client-initiated beginDeployment() moves them into engine.reserve and sets board.locked; the existing lock that already gates every mover/weapon becomes the deploy guard for free. deployMarine/undeployMarine/turnDeployed/autoDeploy/finishDeployment are the whole API; deployMarine rides board.addPiece's pieceAdded so the client sprite pipeline needs zero new events. Squad key = deployMeta recorded at construction from the mission JSON's squad tags. Front-to-back = argmax(pos · own-facing vector): Suicide's down column fronts at y=4, Decoy's Harken left row fronts at x=23; no per-mission data needed. Deployment is dice-free and side-effect-free: checkVictory, the pieceMoved/doorToggled/pieceDied listeners all early-return in Deploy (an empty board is a squad in reserve, not a wipe; a staging rotation is not a sight line). Client: default-ON (?deploy=0 opt-out; mechanical sed across all 20 old e2e suites; debug_1 self-excludes via the 2-square minimum; attract never calls it), X text markers, click-to-place/pick-up, roster cards double as the picker (RESERVE class + arming), 90s/squad on the EXISTING timer event, AUTO button in the EXISTING HudPanel, Enter/DONE routed to finishDeploy; net new UI: one button and some Xs, all destroyed at mission start. Advisor verdict conditions resolved: pre-change-layout equivalence is proven by the 103 old suites running green under deploy=0; legacy-URL default-off REJECTED (contradicts the explicit ask); pause/timeout semantics tested; leftover-reserve semantics defined + tested. Delegation: Forge auto-include unavailable; codex binary absent (7th occurrence); code-reviewer + pr-test-analyzer per precedent. REVIEW ROUND (all six reviewer findings adopted, analyzer gaps adopted or refuted): (reviewer 6) board.locked did NOT cover useDoor/overwatchOn/unjam and the doorToggled listener converted blips during deploy; guards added, ISC-805 extended to the quieter verbs; (reviewer 4) pointerdown placement meant drag-to-pan over the deploy area silently placed/lifted marines; moved to pointerup behind a 6px getDistance gate; (reviewer 4) finishDeployment could strand a marine when a stray piece squatted a deploy square (isOccupied counts blips); nearest-free-passable fallback added + unit test, reserve is never non-empty at MarineAction; (reviewer 3) the AUTO button covered the objective/status rows populated before deployment on missions 3/5/6/beta_2; bottom-anchored; (reviewer 3) first-rotation footstep SFX: AudioManager.lastPos was never seeded, so every piece's FIRST turn-in-place clanked (pre-existing, conspicuous in deploy); seeded at construction + pieceAdded; (reviewer 2) .reserve CSS tie beat .selected; override added. The strengthened pause e2e (AUTO emit + Enter while paused) then EXPOSED A REAL PRE-EXISTING BUG: keydown-ENTER/ESC lacked the seenKeyEvents dedupe every other key has, so Phaser's same-event replay under stalled headless frames double-toggled pause and let a replayed Enter end the phase through the momentarily-unpaused gap; dedupe added, test green. Analyzer G1 ("turn guard untested") REFUTED with a bun probe: endMarinePhase() lands at turn 2/MarineAction, so the refusal WAS the turn guard; hardened with explicit asserts anyway. G2/G3/G5 adopted (space_hulk_2 scattered mixed-facing lifecycle, space_hulk_6 interleaved squads + flamerAmmo-survives-reserve, undeploy-then-timeout reconciliation). Final: engine 319/319, client unit 82/82, e2e 115/115, tsc clean both.

- 2026-08-20 (repo cleanup, ISC-849..883): README rewritten as a short screenshot-led landing page (live game + manual + local run + doc links only). Layout decision: ONE docs/features.md tour page (missions, controls, deployment, roster, auspex, motion, sound) over per-topic splinters; single "what's in the game" page is more discoverable; docs/status.md holds roadmap state + known gaps (freshened); docs/history/ holds the build story (prompts/ 14 milestone files moved via git mv, pygame analysis, original manual PDF, Notion exports) with its own README. Delegation floor (E3 ≥2) show-your-math: Forge waived; docs-only work, no coding task (codex CLI also still absent, 8th occurrence); one code-reviewer agent over the final diff is the single delegation. Push-without-ask rationale: the user's stated goal IS the GitHub homepage; pushing main never deploys the live site (tag-gated), so push is the deliverable, not an extra.
## Changelog

The full conjecture/refutation/learning trail: [docs/isa/changelog-log.md](docs/isa/changelog-log.md). New entries land here first and are archived once their run is.

- 2026-09-12 | conjectured: the player's commands should be queued and drained at the next tick, one per marine, so the replay unit is a clean (tick, marine, action) triple.
  refuted by: the first-principles pass on the kickoff: determinism needs an ORDERED log, not a delayed one; a drain adds 0 to 250 ms of input latency on a 250 ms tick, and stage 1's whole purpose is the movement-feel verdict that latency would corrupt.
  learned: when a design says "queue" for determinism, ask whether it means ordered or delayed; only ordering is load-bearing, and a log of "applied after tick N" replays exactly.
  criterion now: ISC-1199 (command applies at once between ticks), ISC-1207 (same seed plus same log gives identical hashes for 200 ticks).

- 2026-09-12 | conjectured: the hive's turn-denominated counters could advance "once per cycle" by incrementing at the first plan of each cycle in the 1.x check-then-count order.
  refuted by: stealer_tick.spec: the wave launched at tick 89, inside cycle 3, because the cycle's later plans saw the value the 1.x code only saw a whole turn later.
  learned: converting a per-turn counter to per-cycle is not "increment less often"; the increment must land where the next check is one period away, so every plan inside cycle N reads what turn N read.
  criterion now: ISC-1213 (patience counts cycles: cycles 1 to 3 hold, the first plan of cycle 4 launches, three CP dice drawn and nothing else).

- 2026-09-12 | conjectured: the autopilot ports to real time by issuing its per-turn decision list as commands, one per marine per tick.
  refuted by: the unopposed space_hulk_1 fixture stalled ongoing and debug_1 lost 40 of 40: a marine that spends each AP the moment it arrives never holds 2 AP for a flame in reach and walks blind past the blips that then convert behind him.
  learned: a per-turn script assumes a full pool at decision time; under regeneration the script needs explicit "hold for it" branches (wait in reach, cover when contact is near) or its priorities invert.
  criterion now: ISC-1250 (autopilot issues commands and drives debug_1 seed 30 to a win), ISC-1290 (win.spec on that seed).

- 2026-09-12 | conjectured: command points survive the real-time conversion as a per-cycle d6 spent for +1 AP, because CP has a real job (an emergency burst).
  refuted by: Harry's command-pause idea plus the advisor: the resource CP models is command capacity, and once a budgeted pause exists a second currency for the same resource teaches the player nothing and doubles the HUD.
  learned: when translating a turn-based resource into real time, name what the resource IS (here: how much commanding the player gets to do) before choosing its new form; the form the original used (+1 AP) was an artefact of turns.
  criterion now: ISC-1137 (CP kept through stage 3, replaced by the pause pool at stage 4; the d6 top-up is open question 16).

- 2026-09-12 | conjectured: the real-time change needs a three-level command hierarchy with a priority system, and the hard part is the tick engine.
  refuted by: the code survey (the turn structure sits in four files and the rules kernel never reads the phase) and a unanimous four-voice council plus the advisor: idle marines are the design hole, so the marine default AI is the load-bearing piece, two order levels plus a default cover the function, and "most specific live order wins, and expires" replaces priorities.
  learned: when a real-time conversion is proposed, the schedule is soft and cheap; what is hard is everything the turn structure was silently doing for the player (nobody acts while you think), and that must be replaced before any command surface exists. The March 2026 attempt built the surface first and had nothing shooting back.
  criterion now: ISC-1115 (stage 1 is ticks plus default AI plus direct control only), ISC-1102 (two levels plus default, one slot each), ISC-1103 (latency, not vanish).

- 2026-08-21 (fog of war): conjectured: the creep reveal can read live engine marine positions every frame because marines never move during the stealer phase. refuted by: code review; marines never MOVE during the phase but they DIE during it, and death splices them from engine state before frame 1 of the replay, so a killed marine stopped revealing his own killer's approach. learned: any per-frame fog input must come from the same epoch as the frozen sight set; "position can't change" is not "the piece list can't change"; the codebase already encodes this exact hazard in the replay-focus anchors snapshot two lines above where the fix landed. criterion now: ISC-1009 (creep reveal rides the pre-phase snapshot during replays, engine truth resumes at finishReplay).

## Verification

### Fog of war run (2026-08-21)

- ISC-989..994: vitest fog.spec.ts 7/7 green against the real engine (own square in set, arc exclusion behind, closed-door exclusion flipping on useDoor, multi-marine union, sight reveal, Chebyshev-2 creep reveal including diagonal, Chebyshev-3 hidden)
- ISC-995: Read of updateFog (fillRect per unseen square, FOG.overlayColor at 0.42) + fogGfx depth 0.7 between doors 0.5 and losOverlay 0.8; pixel-luminance proof on space_hulk_1 screenshots: far room 147.0 undimmed vs 85.3 under fog, far corridor 83.2 vs 48.7
- ISC-996: live Playwright probe on debug_1: stealer at Chebyshev >2 out of sight sprite.visible=false; stealer beyond the closed door hidden, then engine.marines[0].useDoor() live flipped it visible=true and fogSight grew 1 to 9
- ISC-997: per-frame pass guards pieceKind === 'stealer'; probe: marine sprites visible=true under fog
- ISC-998: git status: Minimap.ts untouched; minimap suite green in the 94
- ISC-999: constructor sets fogEnabled = !attract && params.get('fog') !== '0' (Read); live probe with ?fog=0: scene.fogGfx=false
- ISC-1000: updateFog clears and returns during deployMode/Deploy phase, sets fogDirty for the mission start (Read)
- ISC-1001: recompute gated on this.fogDirty && !this.animating; replay events leave the flag set so finishReplay's next frame recomputes (Read)
- ISC-1002: createSprite stashes pieceKind and spawns stealers setVisible(false) under fog (Read); probe stealers were created via live pieceAdded and never flashed
- ISC-1003: git diff --stat: only ISA.md and packages/client/* changed; engine tree byte-untouched
- ISC-1004: guard `if (!gfx) return` is the sole fog path in update(); ?fog=0 probe booted with zero errors and no fog object
- ISC-1005: pnpm -r test: engine 337/337, client 94/94 (7 new)
- ISC-1006: git diff added-lines em dash count: 0 (after sweeping 10 from my own comments)
- ISC-1007: tsc --noEmit exit 0 on the client package (engine untouched)
- ISC-1008: Playwright live probe on the dev server: fog overlay active (sightSize 1 of 98 on debug_1, correct: the marine spawns nose-to-door), hidden/creep/door-reveal all correct, zero console and page errors; minimap code byte-untouched keeps echoing all threats

### Fog of war review round (2026-08-21)

- ISC-1009: Read of endTurn (fogMarineSnap beside anchors), fogMarines() gate on animating, finishReplay clear; suites 337 + 97 green
- ISC-1010: Read of the pointerdown predicate: obj.name === 'piece' && visible && bounds
- ISC-1011: Read of describeSquare: hoverHidden uses fogMarines() and exempts Deploy
- ISC-1012: Read of the subscription block: marineEscaped present
- ISC-1013: Read of updateFog: result !== 'ongoing' branch gated on !animating, clears overlay, shows stealers
- Regression: full live Playwright probe re-run post-fixes, identical green results (hidden/creep/door-flip/fog=0, zero errors); em dash count on added lines 0

### Blip conversion on door destruction (2026-08-21, eighth run)

- ISC-976: vitest fail output pre-fix: "Tests 2 failed | 3 passed" in conversion_on_sight.spec.ts, blip.alive stayed true after shootDoor and after live doorDestroyed emit.
- ISC-977: Read GameEngine.ts: doorDestroyed handler present beside doorToggled with identical replaying/Deploy/ongoing guards.
- ISC-978: vitest: "shooting a door apart that reveals a blip converts it on the spot" passes; stealer present on (10,6).
- ISC-979: grep: demolishDoor is the only doorDestroyed emitter; callers are StormBolterMarine.shootDoor, AssaultCannonMarine autofire, chain-fist cut.
- ISC-980: vitest: "REPLAYED doorDestroyed events never re-trigger conversion" passes; replay leaves blip alive, live emit converts.
- ISC-981: vitest: all 3 pre-existing conversion_on_sight tests still pass unchanged.
- ISC-982: pnpm -r test: engine 34 files / 336 tests passed, client 11 files / 87 tests passed.
- ISC-983: git diff added-lines grep for em dash: 0 matches.

### v0.6.1: blip conversion fix reaches the stable root (2026-08-21, ninth run)

- ISC-984: Bash; run 32424784501 completed success (verify-build-publish, deploy, redispatch-latest all green) before gh release create; release at https://github.com/harryf/sulkweb/releases/tag/v0.6.1.
- ISC-985: curl; root manifest {"version":"v0.6.1","sha":"05220d1..."}, /0.6.1/ identical, /latest/ {"version":"latest-05220d1"}, /0.6.0/ manifest returns 200.
- ISC-986: gh run view 32424973007: event workflow_dispatch, conclusion success; /latest/ built one minute after the release deploy.
- ISC-987: Playwright on https://harryf.github.io/sulkweb/?mission=debug_1&seed=1: engine live (phase MarineAction, turn 1), errorCount 0.
- ISC-988: curl 200 + unchanged version field on /0.6.0/manifest.json after the release completed.

### Fog of war resumed (2026-09-12)

- ISC-1019: git log --oneline -3 on fog-of-war: b461208 Merge main (v0.6.1 head + fog parking record) into fog-of-war, parents df42de2 and 1418ca9
- ISC-1020: git merge-base --is-ancestor main fog-of-war exit 0
- ISC-1021: grep -c of conflict markers in ISA.md: 0; both run blocks present under Criteria
- ISC-1022: pnpm -r test: packages/engine Test Files 34 passed, Tests 337 passed
- ISC-1023: pnpm -r test: packages/client Test Files 12 passed, Tests 97 passed; coverage row fog.ts 100 100 100 100
- ISC-1024: pnpm build exit 0; client vite build "built in 2.57s"
- ISC-1025: curl -o /dev/null -w %{http_code} http://localhost:5173/ printed 200 (VITE v6.3.5)
- ISC-1026: page eval: {"phase":"Deploy","fogEnabled":true,"hasFogGfx":true}
- ISC-1027: page eval after AUTO DEPLOY + DONE: {"phase":"MarineAction","turn":1,"marines":5,"fogSight":5,"fogDirty":false}; screenshot shows the five-marine column lit, every other square dimmed
- ISC-1028: page eval after Enter: {"phase":"MarineAction","turn":2,"animating":true,"fogSight":5,"fogDirty":true,"blips":3,"blipsSpawned":1}
- ISC-1029: read_console_messages onlyErrors after each step: "No console errors or exceptions found"
- ISC-1030: git diff --stat 1418ca9 fog-of-war: ISA.md only
- ISC-1031: git branch -vv shows fog-of-war with no upstream; git tag unchanged, latest v0.6.1
- ISC-1032: git diff HEAD~1 | grep -c on added lines for the em dash character: 0

### Fog adjustments: transparent stealer bodies, radar-gated blips (2026-09-12)

- ISC-1033: Read los.ts after the split: `const blocks = opts.piecesBlock === 'marines' ? occupant?.kind === 'marine' : occupant !== undefined;` is the only occupant check; canSee passes 'marines', canShoot passes true (Read vision.ts)
- ISC-1034/1034.1/1035: vision.spec 10/10: 'stealers and blips are transparent to SIGHT' (canSee behind stealer and behind stealer+blip), 'a FIRE line still stops at the first body' (canShoot true on the front rank, false behind it), and 'an intervening MARINE blocks sight' all green
- ISC-1036: conversion_on_sight.spec 7/7: 'a blip behind a stealer converts the moment the sight line reaches it' green (about-face converts through the stealer, 2 stealers on board)
- ISC-1037: kill_reveals.spec 5/5 after the rewrite: first sweep converts (3 stealers), the kill leaves 2; close-combat and overwatch cases unchanged and green
- ISC-1038 dropped; ISC-1039: hive.spec byte-identical to main (git diff 4823544..HEAD empty for hive.spec.ts) and green: the blocker's body still darkens the kill lane (kill.has('2,11') false), RollQueue remaining 0
- ISC-1040: fog.spec 'stealer bodies do not block sight' green: sight has 4,3 / 4,2 / 4,0 with two stealers in the column
- ISC-1041/1042: fog.spec radarActive true with a sergeant, false after sergeant.die(), false for the sergeant-less open mission
- ISC-1043/1044: fog.spec threatVisible: blip = radar flag in all three placements; stealer ignores the flag
- ISC-1045: Read createSprite (hides stealer and blip under fogEnabled) and applyThreatFog (threatVisible per sprite from its live tile)
- ISC-1046: Read endTurn (fogRadarSnap = radarActive(pieces) beside fogMarineSnap), fogRadar() returns the snap while animating, finishReplay nulls it
- ISC-1047: Read updateFog Deploy branch: gfx.clear, fogDirty, applyThreatFog(true) which skips stealers; fogRadar counts engine.reserve; headless probe A: Deploy phase, reserve 5, blipSprites 2, blipsVisible 2
- ISC-1048: Read updateFog result branch: stealer and blip sprites setVisible(true)
- ISC-1049: Read describeSquare: hoverHidden covers blip with !fogRadar() outside the Deploy exemption; probe D hover on (0,11) and (9,26) reads 'corridor tile · stealer entry' with no blip part
- ISC-1050: Read pointerdown hit predicate: requires visible on every 'piece' object, kind-agnostic
- ISC-1051: git diff --stat: Minimap.ts absent
- ISC-1052: Read updateFog first guard (!gfx return) and createSprite (fogEnabled &&); probe E with ?fog=0: fogGfx false, blipsVisible 2 of 2 after the sergeant died
- ISC-1053: pnpm engine test: Test Files 34 passed, Tests 339 passed
- ISC-1054: pnpm client test: Test Files 12 passed, Tests 102 passed
- ISC-1055: pnpm build: engine Done, client built in 2.22s
- ISC-1056: pnpm client e2e against the live dev server: 118 passed (51.5s); win.spec seed 1 and playthrough.spec seed 3 unchanged
- ISC-1057: headless probe C on space_hulk_1 seed 3: door opened, stealers placed at (10,6) (10,7) (10,8), sightHas [true,true,true], sprite visible [true,true,true]; screenshot c-column.png shows all three sprites in the corridor
- ISC-1058: probe B: sergeants 1, blipSprites 2, blipsVisible 2; probe D after sergeant.die(): sergeantsLeft 0, blipsVisible 0 of 2, stealersVisible 3 of 3
- ISC-1059: probe errors array empty across A..E (pageerror + console error listeners)
- ISC-1060: Read CLAUDE.md Gotchas: LOS entry rewritten, 'Fog of war (client only...)' entry added
- ISC-1061: git diff | grep '^+' | grep -c em dash: 0
- ISC-1062: git diff --stat: StealerAI.ts, Blip.ts, GameEngine.ts absent
- Probe note: the real-Chrome probe was attempted first (Interceptor blocked by the stale daemon; Claude-in-Chrome tab reported visibilityState hidden, frame 0, Phaser frozen), so the live evidence above comes from a headless Playwright script run in the client package, the same instrument as the repo's e2e suite and as ISC-1008 at park time.

### Fog adjustments review round (2026-09-12)

- ISC-1063: code-reviewer agent ran against HEAD 1f56f77 (2 CRITICAL, 5 IMPORTANT, 4 nits); disposition of every finding in Decisions 2026-09-12 (code review round)
- ISC-1064: replayFocus.spec 3 new cases green (visible mover pans, hidden mover and its death get null, predicate receives the destination square; throttled events never ask); Read GameScene endTurn: kindOf map from sprites + stream pieceAdded, hiddenAt uses fogRadar()/fogSight/fogMarines(), passed as the fifth planReplayFocus argument
- ISC-1065: packages/client/tests/fog.spec.ts 4 passed (8.2s): debug_1 seed 5 blips exist and blipsVisible 0; space_hulk_1 seed 3 blips 2 visible then 0 after sergeant.die() with the three-stealer column [true,true,true]; hover 'blip' present with radar up, absent with radar down; ?fog=0 blipsVisible === blips
- ISC-1066: Read content.ts sight section (marines block sight, stealers and blips do not, a shot stops at the first body) and Blips section (radar returns, vanish without a sergeant); banned-word grep on content.ts empty
- ISC-1067: Read docs/rules-reference.md: LOS bullet names the marine-only sight policy, seeing/shooting bullet names both policies plus a fog bullet, threat-map paragraph names fire vs sight LOS
- ISC-1068: Read hive.ts computeThreat comment: bodies block FIRE lines, since 2026-09-12 not SIGHT lines
- ISC-1069: Read CLAUDE.md testing policy item 3: 'STALE since 2026-09-12' note appended to the baselines
- ISC-1070: Read of the corrected ISC-1033/1034/1038 verification lines above against los.ts, vision.spec and hive.spec at HEAD
- Suites at this point: engine 340/340, client 105/105 (3 replay-focus cases added), fog e2e 4/4; full e2e run recorded under ISC-1071
- ISC-1071: pnpm client e2e: 122 passed (fog.spec 4 + the prior 118), win.spec seed 1 and playthrough.spec seed 3 unchanged

### v1.0.0 release (2026-09-12)

- ISC-1072: git push output 4fa53ee..46aadd3 main -> main after `git merge --ff-only fog-of-war`
- ISC-1073: gh run view 34689952039: success | verify-build-publish:success, deploy:success, redispatch-latest:success; then gh release create printed https://github.com/harryf/sulkweb/releases/tag/v1.0.0
- ISC-1074: gh run watch 34689950858: completed with 'success'
- ISC-1075: curl root {"version":"v1.0.0","sha":"46aadd30...","built":"2026-09-12T11:02:54Z"}; /1.0.0/ identical; /latest/ {"version":"latest-46aadd3"}
- ISC-1076: curl /0.6.1/manifest.json {"version":"v0.6.1","sha":"05220d1c..."}
- ISC-1077: headless probe on https://harryf.github.io/sulkweb/?deploy=0&mission=space_hulk_1&seed=3: {"phase":"MarineAction","turn":1,"fog":true,"fogSight":5,"blipsVisible":"2/2","errors":[]}
- ISC-1078: git branch -d printed "Deleted branch fog-of-war (was 46aadd3)"; git ls-remote --heads origin has no fog ref
- ISC-1079: git log --oneline main shows 46aadd3, 1f56f77, 987fade, 4823544, b461208 unchanged

### Toward v1.1 (2026-09-12)

- ISC-1080: Read Blip.convert: prey = nearest living marine by chebyshev from the blip origin; facing = prey ? facingToward(spot, prey.pos) : Dir.S
- ISC-1081: conversion_on_sight.spec 'converted stealers emerge facing their nearest marine' green: 3 stealers, the one on (1,4) faces Dir.E, all match facingToward
- ISC-1082: Read: no dice draw added to convert; blipConverted payload unchanged (blipId, x, y, stealerIds, lost)
- ISC-1083: pnpm engine test: Test Files 34 passed, Tests 341 passed (beta2_mission pinned seed 1, hive.spec, kill_reveals all green)
- ISC-1084: Read GameScene wheel handler: panEffect.reset, camVel zeroed, scrollX += deltaX / zoom, scrollY += deltaY / zoom, expectedScroll set
- ISC-1085/1086: playwright tests/wheel.spec.ts 2 passed: scrollY up by wheel(0,300) then down by wheel(0,-300), x unchanged; HUD wheel leaves {x,y} equal
- ISC-1087: Read docs/features.md: "Arrows / drag / mouse wheel | Pan camera (wheel down pans down...)"
- ISC-1088: pnpm client e2e: 124 passed (54.2s); client unit 105/105
- ISC-1089: git diff HEAD | grep '^+' | grep -c em dash: 0
- ISC-1090: git push e6a5d16..3e21a48 main; deploy-latest green; curl /latest/manifest.json reads latest-3e21a48; root still v1.0.0

### v1.1.0 release (2026-09-12)

- ISC-1091: gh run view 34690875591: success | verify-build-publish:success, deploy:success, redispatch-latest:success; then gh release create printed https://github.com/harryf/sulkweb/releases/tag/v1.1.0
- ISC-1092: curl root {"version":"v1.1.0","sha":"8a837432...","built":"2026-09-12T11:23:06Z"}; /1.1.0/ identical; /latest/ reads latest-3e21a48 (the code head; 8a83743 differs from it by ISA text only)
- ISC-1093: curl /1.0.0/ {"version":"v1.0.0","sha":"46aadd30..."} and /0.6.1/ {"version":"v0.6.1","sha":"05220d1c..."} unchanged
- ISC-1094: headless probe on the root: {"phase":"MarineAction","turn":1,"fog":true,"fogSight":5,"blipsVisible":"2/2","errors":[]}

### Real-time plan run (2026-09-12)

- ISC-1095: Read/grep: docs/realtime-plan.md headers in order at lines 5 Summary, 18 Verdict, 46 Real-time rules, 144 Command model, 171 Marine AI, 245 Codebase impact, 319 Stages, 349 Risks, 365 Open questions
- ISC-1096: Read: Verdict "What is gained" and "What is lost" lists cite docs/status.md (interrupt gap), CLAUDE.md (two-level sight conversion), the council verdict, and the March playtest reviews
- ISC-1097: Read: Verdict closes with "Why the March 2026 attempt stalled" naming docs/game-design.md reuse (tick order, accumulators, persistent overwatch, corridor arithmetic) and the review findings (no spawns, nothing interactive)
- ISC-1098: Read: "The tick and the cycle" names GameEngine.tick(), 250 ms client-driven, ?tick=, the 40-tick cycle, and the AP table
- ISC-1099: grep: every endMarinePhase rule named in the mapping table (Kill-quota 2, Phase flip 1, Reinforcements 3, conversion sweep 2, Ambush counter 3, Download counter 3, clearFlames 1, wanderCat 2, turn limit 5, turnNumber 1, resetAP 6, rollCommandPoints 1, Overwatch cleared 1 hits)
- ISC-1100: Read: Overwatch section lists persistent state, trigger via overwatchReactions, OVERWATCH_COOLDOWN 2 ticks (line 118), free shots, jam, end conditions
- ISC-1101: Read: "Marine timer and command points": clock dropped, sergeant bonus moves to relay speed, CP roll per cycle kept with P spend, drop listed as alternative
- ISC-1102: Read: Command model table L0..L3 (lines 153..156), rule "the most specific live order wins", one slot per level, direct key clears L1
- ISC-1103: Read: "Sergeant loss": chosen command latency 8 ticks plus uncoordinated execution; three rejected alternatives with reasons
- ISC-1104: Read: "Default behaviour" seven-step decision list (line 176) plus the door rule
- ISC-1105: Read: "Per-type variations" table: storm bolter, sergeant, heavy flamer, assault cannon, chain fist
- ISC-1106: Read: "Squad AI": defend (reachDistances, visibleSquares, greedy set cover), advance (distanceField, deploy order, leapfrog), clear, hold
- ISC-1107: Read: "Mission orders (stage 4)" deferred with the reason (needs two squads on one board)
- ISC-1108: Read: "Input summary" table extends Controls; existing keys kept; Esc, Space, Enter changes stated
- ISC-1109: find/grep loop: every one of the 30 engine source files (drafts excluded) appears in the plan; missing=0
- ISC-1110: find/grep loop: every one of the 35 client .ts files appears; missing=0; header says 31 source plus 4 declaration files
- ISC-1111: Read: "Tests": breaking engine specs enumerated, 22 of 36 untouched, endMarinePhase shim for stage 1, RollQueue re-baseline, seeds re-pinned per stage, stepping harness ?tick=0 and sulk.step(n)
- ISC-1112: Read: PieceEvents row names tick, orderIssued, orderCleared; capture/replay fate stated (retained until the client stops using them, then removed)
- ISC-1113: Read: "Determinism": no clock in the engine, fixed order, board.dice only, command log replay, state-hash vitest, Date lint ban
- ISC-1114: Read: "Hive adaptation": plan every 8 ticks or on marine death, threat cache by board version, one action per piece per tick, counters in cycles, zero-dice invariant kept
- ISC-1115: Read: four stages (lines 326..344) each with a version tag; stage 1 = ticks + default AI + direct control only
- ISC-1116: Read: every stage has an "Exit criteria" line with tool-checkable items
- ISC-1117: Read: Summary and open question 7: 1.x frozen at /1.1.0/, no mode in code
- ISC-1118: Read: "Fog of war": dirty-flag recompute, fogMarineSnap and fogRadarSnap removed with the replay pipeline
- ISC-1119: Read: Risks table has 11 rows, each with stage and mitigation
- ISC-1120: Read: Open questions table has 14 rows each with a recommended default and an alternative
- ISC-1121: git diff --stat main -- packages/ printed 0 lines
- ISC-1122: grep '—' docs/realtime-plan.md = 0; grep on the run block and the six new Decisions entries = 0
- ISC-1123: grep -i -w banned list = 0; phrase list = 0
- ISC-1124: Read: Decisions "real-time plan, Council" entry: positions, 3:1 split on sergeant loss, adopted and not adopted
- ISC-1125: Read: Decisions "real-time plan, FirstPrinciples" entry; Verdict's "What the review changed" reflects it
- ISC-1126: Read: Decisions "real-time plan, SystemsThinking" entry: three loops, Shifting the Burden, leverage points
- ISC-1127: Read: Decisions "independent impact assessment reconciled" entry lists divergences a..h with resolutions
- ISC-1128: Read: Decisions "real-time plan, advisor" entry: first call timed out, second call's three points adopted
- ISC-1129: grep realtime-plan CLAUDE.md line 15; docs/status.md line 42
- ISC-1130: grep -c realtime-plan PROJECTS.md = 1 ("PENDING HARRY REVIEW")
- ISC-1132: wc -l docs/realtime-plan.md = 384
- ISC-1133: grep: "Stage 1 delivers" at line 14
- ISC-1131: git log: 6573491 "docs: real-time 2.x plan (proposal, reviewed, nothing implemented)" on main; closed by the following ISA commit

### Real-time plan, round 2 (2026-09-12)

- ISC-1134: grep: "### Command pause (Harry's idea, stage 4; unmetered prototype in stage 3)" at line 163
- ISC-1135: Read: the section's first bullet list states Space, pool in seconds, cap and recharge scaled by sergeants and captains, no manual control, orders applied at the resume tick with normal latency
- ISC-1136: Read: "What it fixes" paragraph (attention, Shifting the Burden) and "The two biggest risks" with the latency rule and the lockout-or-budget rule
- ISC-1137: Read: Command points paragraph: CP kept stages 1 to 3, replaced by the pause at stage 4, d6 top-up left to question 16
- ISC-1138: Read: Sergeant loss closes with the stacking paragraph (latency plus pool, floors: 8 ticks, 10 s cap, 1 s per cycle) and points to question 19
- ISC-1139: grep: Input summary rows "Esc (nothing selected)" free pause, "Space" command pause per stage, "P" until stage 4, DONE becomes pause with the meter (line 270 area)
- ISC-1140: grep: Determinism bullet with pauseSpent at line 142; Command pause section repeats it at line 179
- ISC-1141: Read: "Placement: stage 4 ... stage 3 ships the same pause unmetered"
- ISC-1142: grep: Risks rows "Pause-scumming" (line 390), "Reflex-save", "Two command currencies"
- ISC-1143: grep: 13 "Agreed with recommendation" cells and row 1 "| 250 ms |" intact; rows 15..22 present with empty Decision cells (lines 417..424)
- ISC-1144: grep "Proposed default" = 0; tick table header reads "Value (decided, round 1)"
- ISC-1145: grep: "Decided (round 1, Harry's notes on questions 5 and 9)" at line 215
- ISC-1146: Read: Status line "second round ... asks the questions it raises (15 onward)"
- ISC-1147: git diff --stat main -- packages/ printed 0 lines
- ISC-1148: grep '—' docs/realtime-plan.md = 0; this run's ISA text written without em dashes (grep on the round-2 entries = 0)
- ISC-1149: banned words 0, phrases 0 (word-bounded grep)
- ISC-1150: Read: Decisions "round 2, assessment of the command pause" lists advisor points a..e adopted and the lockout kept as a question
- ISC-1151: Read: the same Decisions entry lists every doc change
- ISC-1153: grep -c "open questions 15..22" PROJECTS.md = 1
- ISC-1152: git log: 7a5780e "docs: real-time plan round 2, command pause assessed, questions 15..22" on main; closed by the following ISA commit

### Real-time plan approved, kickoff (2026-09-12)

- ISC-1154: grep -c "Agreed with recommendation" docs/realtime-plan.md = 21; row 1 "| 250 ms |"; row 19 filled with the chat note
- ISC-1155: Read line 3: "Status: APPROVED 2026-09-12; nothing built yet ... Implementation starts with stage 1 from the \"Stage 1 kickoff\" section"
- ISC-1156: grep "## Stage 1 kickoff" = 1; subsections "Settled constants and decisions", "Build order", "Exit gate", "Session gotchas"
- ISC-1157: Read: kickoff table values match the tick table, AP table, Overwatch, Command points, Input summary and Scene rows above
- ISC-1158: Read: build order numbered 1..12, step 12 tags v2.0.0-alpha.1 and checks the root still reads v1.1.0
- ISC-1159: grep "APPROVED 2026-09-12" CLAUDE.md = 1
- ISC-1160: grep "Stage 1 kickoff" PROJECTS.md = 1
- ISC-1161: git diff --stat main -- packages/ printed 0 lines
- ISC-1162: grep '—' docs/realtime-plan.md = 0; this run's ISA text = 0
- ISC-1163: kickoff section line count under 80 (sed from the header to end of file, wc -l)
- ISC-1164: Read: Decisions "real-time plan approved, kickoff" entry present
- ISC-1165: git log: b97bd8d "docs: real-time plan approved (questions 15..22 answered), stage 1 kickoff notes" on main, pushed with the closing ISA commit

### Stage 1 risks (2026-09-12)

- Per-tick vision cost: threat map cached under board.version, fog under a dirty flag; probe ISC-1212, and the boot check.
- Hive fixtures under per-tick activation: shared loop body, counters per cycle; probe hive.spec plus stealer_tick.spec.
- Seed re-pin for the two e2e fixtures: engine-side scan first, one pin at the end of the stage.
- Mission specs and the shim: staggered spawns may need two shim calls before a "spawned" assert.
- Prerelease deploy path: a branch in deploy.yml that never writes the root; curl the root manifest after the run.

### Stage 1: the clock (2026-09-12)

- ISC-1166..1187: clock.spec (11 tests), regen_flames.spec, exotic_victory/beta2_mission/quota_victory/debug1_mission ported; engine suite 42 files, 406 tests green; grep MarineAction|StealerAction|marinePhaseSeconds|timerBonus in engine and client src = 0 (engine_lint.spec + grep)
- ISC-1188..1197: regen_flames.spec (8 tests): marine +1 at tick 4, stealer at tick 2; cap holds and banks nothing; Board.tick set; flames Map with expiry 5 + 40, out at 45, expireFlames announces exactly the expired squares; clearFlames exported; Board.version bumps on nine change kinds
- ISC-1198..1208: command.spec (9 tests): at-once application, refusals, the full command table, command event {tick, pieceId, command, ok} plus apChanged, the lease, deferral from inside a tick, victory after a command, stateHash; determinism.spec: 200 ticks identical hashes, different seed diverges; gamelog.spec envelope carries tick; grep of piece action methods in packages/client/src outside tests = 0 (the only hit is location.reload)
- ISC-1209..1221: stealer_tick.spec (6 tests): one square per tick, plan every 8 ticks and on a marine death (planHive spy), computeThreat 0 calls over 10 quiet ticks and exactly 1 after board.touch(), patience per cycle, charge orientation at the boundary on a locked board; hive.spec zero-dice fixtures green; regen_flames.spec blip conversion freshness; Read of stealerAct's reaction chain, activationOrder, rankEntries shared by scheduleSpawns and spawnBlips
- ISC-1222..1230: overwatch_ticks.spec (8 tests): persists 80 ticks at full AP, shots at ticks 1 and 3 only with owReadyTick 5, board-only cooldown withholds dice, jam ends overwatch, sustained bonus decays after 40 idle ticks, command cancels overwatch at 1 AP for the move, arrival ahead = shot@1 then cc@2, onTick 5 calls; grep "override resetAP" StormBolterMarine.ts = 0
- ISC-1231..1250: marine_ai.spec (17 tests) covering every rule, first-match order, the door rule both ways, never opens a door, flamer never overwatches, last stand three ways, cannon reload and dry hold, no autofire (ammo 9 not 5), no chain-fist cut, runMarineAI one action each and the lease skip, autoplay debug_1 seed 30 win
- ISC-1251..1259: engine suite 406 passed (34 files became 42); git diff on the kernel specs 0 lines except the two clock asserts (refined text); files marine_ai.spec.ts, overwatch_ticks.spec.ts, determinism.spec.ts, engine_lint.spec.ts present and green; coverage "All files 98.54 lines"; hive.spec RollQueue counts untouched
- ISC-1260..1282: ls scenes/ = LiveScene.ts, PreloadScene.ts; gameConfig registers LiveScene; Read of update(): tickAcc capped at tickMs times 4, while loop max 4; tickMs from ?tick with TUNING.tickMs default; step(n) on window.sulk; clockRunning getter; grep endTurn|animating|fogMarineSnap|fogRadarSnap|timerRemaining|capture(|replay( in client src = 0; replayFocus.ts and its spec gone; hud.spec clock tests (Cycle 2, 3s / 10s, PAUSE Esc, START); boot-check.mjs: Esc freezes tickCount at 33, scene.isPaused true; keymap and hotkeys e2e green through engine.command; deploy e2e Enter starts the mission; flamer-targeting e2e green; window.sulk exposes step, command, TUNING; tuning-check: ?tuning=regen.marine:3,overwatchCooldown:1 read back as 3 and 1 and a 0-AP marine has 1 AP after 3 ticks; audio.spec contact ducking; grep frozen Minimap.ts = 0; boot check shows OW badges on the roster and four bolters on overwatch by tick 8; deploy and home e2e green; tsc --noEmit clean; client units 11 files 92 tests
- ISC-1283..1288: Read of the fogDirty subscriptions (ten events) and updateFog (dirty consumed once per frame); fog e2e green; grep snapshot fields = 0; fog unit spec green
- ISC-1289..1297: tests/harness.ts present; win.spec (seed 30) and playthrough.spec (seed 3) green; focus.spec deleted, animation and motion replay cases removed; grep seenKeyEvents in LiveScene = 8 handlers; full suite 116 passed (two runs: the fork's and mine, 46.6 s); boot-check screenshots test-results/boot-check-1.png, -2.png, -3-paused.png from headless Chromium; seeds pinned once (Decisions); gamelog envelope tick asserted in gamelog.spec
- ISC-1298..1306: grep features.md "Esc / PAUSE" and "The clock (2.x)"; architecture.md "Sequence of one tick"; rules-reference.md "## The clock (2.x)"; content.ts "How the clock works"; CLAUDE.md "The clock (2.x" invariant and the rewritten replay and sight-conversion bullets; status.md "stage 1 shipped as v2.0.0-alpha.1"; realtime-plan.md Status line and "Stage 1 as built"; em dash grep on the changed docs and new code = 0; banned words = 0
- ISC-1307..1310: Read deploy.yml: regex accepts -alpha.N, PRERELEASE branch skips the root, STABLE_VERSION and manifest.json; preserve regex includes the prerelease shape; genVersionsPage.sh labels prereleases; versionsLink.spec covers 2.0.0-alpha.1
- ISC-1318..1321: engine_lint.spec (no phaser/window/document); git diff grep "as any" in engine src = 0; three commits with green suites; docs/isa/client-ui.md and docs-meta.md received the deployment and repo-cleanup runs
- ISC-1311..1317: gh run view 34699089071 conclusion success, jobs verify-build-publish/deploy/redispatch-latest all success; gh release view: isPrerelease true; curl /2.0.0-alpha.1/manifest.json = {"version":"v2.0.0-alpha.1","sha":"14365c1..."} and /2.0.0-alpha.1/ = 200; root manifest.json version v1.1.0 and STABLE_VERSION v1.1.0; deploy-latest 34699075087 success; versions.html lists 2.0.0-alpha.1; the ship report names the URL
- ISC-1322: PROJECTS.md Sulk entry rewritten: stage 1 built, prerelease URL, the two verdicts as NEXT, balance evidence, gotchas
- ISC-1323, ISC-1324: DEFERRED-VERIFY, follow-up: Harry's playtest of /2.0.0-alpha.1/ (recorded in Decisions 2026-09-12 20:55)
