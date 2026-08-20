---
project: sulkweb
task: "Project ISA; Sulk Web (playable Space Hulk port)"
effort: E4
effort_source: classifier
phase: complete
progress: "831/832 (em dash purge + ISA split shipped, ISC-884..900; ISC-71 deferred)"
mode: interactive
started: 2026-08-14T15:20:00Z
updated: 2026-08-20T10:20:00Z
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
| [docs/isa/client-ui.md](docs/isa/client-ui.md) | HUD, roster, minimap radar, input/keys, motion, home page, manual | ISC-472..514, 604..712, 724..761 area |
| [docs/isa/audio.md](docs/isa/audio.md) | music, SFX, tracker, fades | sound system, silent-audio fix, fades + favicon |
| [docs/isa/releases-infra.md](docs/isa/releases-infra.md) | CI, Pages deploy, release hygiene | M8, Pages deploy, audio-ship, ISC-515..553 area |
| [docs/isa/docs-meta.md](docs/isa/docs-meta.md) | documentation and repo meta work | asset index, guides, rules reference, code review, ISC-400..471 area |
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

### Deployment phase (2026-08-19 run)

- [x] ISC-796: engine rules/deploy.ts exports pure orderSquaresFrontToBack; front = argmax(pos·facingVec); a left-facing squad orders lowest-x first (unit)
- [x] ISC-797: pure autoDeployPlan orders reserves storm_bolter, sergeant(/sword), heavy weapon, remainder; assigned front to back (unit)
- [x] ISC-798: GameEngine.beginDeployment moves every marine into engine.reserve (deployment order kept), sets phase Deploy, locks the board (unit)
- [x] ISC-799: Anti: beginDeployment refuses after turn 1 has begun, when already in Deploy, or with no marineDeployment (unit)
- [x] ISC-800: deployMarine places a reserve marine on a free deploy square of HIS squad at the square default facing, emitting pieceAdded (unit)
- [x] ISC-801: Anti: deployMarine refuses non-deploy squares, occupied squares, already-deployed marines, and wrong phase (unit)
- [x] ISC-802: Anti: cross-squad deployment refused; a marine cannot take a square tagged with another squad (unit)
- [x] ISC-803: undeployMarine returns a deployed marine to reserve and frees the square (unit)
- [x] ISC-804: turnDeployed rotates a deployed marine free of AP cost and emits a facing-only pieceMoved (unit)
- [x] ISC-805: Anti: normal piece actions dead during Deploy; tryMove/tryTurn/shoot return false via the locked board (unit)
- [x] ISC-806: autoDeploy fills only FREE squares with remaining reserves in the sensible order per squad; player placements untouched (unit)
- [x] ISC-807: finishDeployment auto-deploys the remainder, unlocks the board, sets phase MarineAction with every marine on board at full AP (unit)
- [x] ISC-808: Suicide auto-deploy: front square (10,4) holds a storm bolter, sergeant behind, flamer third; flamer no longer in front (unit)
- [x] ISC-809: Anti: checkVictory is inert during Deploy; an empty board is not a squad wipe (unit)
- [x] ISC-810: Anti: engine pieceMoved side effects (blip conversion, escape, download abort) suppressed during Deploy (unit)
- [x] ISC-811: deployment consumes no dice; same seed, any deploy sequence, identical CP and blip values to an untouched game (unit)
- [x] ISC-812: space_hulk_5.json squares (10..14,10) face right (Read)
- [x] ISC-813: Anti: the Decoy diff touches ONLY those five facing values (git diff)
- [x] ISC-814: missions with 2+ deploy squares boot into deploy mode; ?deploy=0 skips straight to MarineAction (e2e)
- [x] ISC-815: Anti: attract mode (no mission param) never enters deploy mode (e2e)
- [x] ISC-816: free deploy squares show an X marker; occupied ones do not; all markers gone after Done (e2e)
- [x] ISC-817: clicking a free deploy square places the roster-armed marine, else the next reserve marine of that squad (e2e)
- [x] ISC-818: clicking a deployed marine during deploy undeploys him; X returns, card back to reserve (e2e)
- [x] ISC-819: A/D during deploy rotates the selected deployed marine with AP untouched (e2e)
- [x] ISC-820: roster cards show a RESERVE state until deployed; clicking a reserve card arms that marine (e2e)
- [x] ISC-821: deploy clock = 90s per squad shown in the HUD; the phase line reads Deployment (e2e)
- [x] ISC-822: the clock reaching 0 auto-deploys the remainder and starts the mission (e2e)
- [x] ISC-823: DONE during deploy finishes deployment and restarts the marine clock at marinePhaseSeconds (e2e)
- [x] ISC-824: AUTO DEPLOY control fills every square in the sensible order and exists only during the phase (e2e)
- [x] ISC-825: Anti: after deployment no deploy-only UI survives (X markers, AUTO button) and normal action keys work (e2e)
- [x] ISC-826: ESC pauses deployment; clock frozen, deploy clicks inert, resume works (e2e)
- [x] ISC-827: Anti: W/F and other action keys during deploy never move a marine or spend AP (e2e)
- [x] ISC-828: Anti: every pre-existing e2e suite stays green with the mechanical deploy=0 URL update (playwright)
- [x] ISC-829: deploy mode fully works under prefers-reduced-motion (e2e)
- [x] ISC-830: HUD phase text renders Deploy as deployment, never as Stealers (e2e)
- [x] ISC-831: placement default facing = the square mission facing; Decoy Abraham deploys facing right (e2e)
- [x] ISC-832: the in-game manual gains a Deployment section: phase, clock, controls (Read)
- [x] ISC-833: docs/rules-reference.md documents the deployment rules (Read)
- [x] ISC-834: keyboard help notes deploy-phase controls (Read)
- [x] ISC-835: Anti: zero em dashes in new player-facing strings (grep)
- [x] ISC-836: engine suite green including the new deploy spec (bun test)
- [x] ISC-837: client unit suite green (vitest)
- [x] ISC-838: full e2e suite green (playwright)
- [x] ISC-839: tsc clean in both packages (tsc)
- [x] ISC-840: README mentions the deployment phase (Read)
- [x] ISC-841: Anti: the deploy lock also kills the quieter verbs; useDoor, overwatchOn, unjam refuse on a locked board, and the doorToggled/pieceDied engine listeners are Deploy-guarded (unit)
- [x] ISC-842: Anti: drag-to-pan starting on a deploy square never places or lifts a marine; placement fires on pointerup under a 6px movement gate (code + e2e clicks still work)
- [x] ISC-843: Anti: finishDeployment never strands a marine in reserve; a squatted deploy square falls back to the nearest free passable square (unit)
- [x] ISC-844: Anti: the AUTO DEPLOY button covers no populated HUD line; bottom-anchored (screenshot)
- [x] ISC-845: Anti: Enter and ESC dedupe Phaser's same-event replay; one press is one toggle/end, even under stalled headless frames (e2e pause test)
- [x] ISC-846: Anti: a marine's first turn-in-place never plays the footstep SFX; lastPos seeded at construction and on pieceAdded (code)
- [x] ISC-847: an armed reserve roster card keeps the selection border (CSS specificity fix)
- [x] ISC-848: v0.5.0 released; main pushed, tag CI green BEFORE the release is created, release published, live bundle serves v0.5.0 with the deployment-phase code present (gh run watch; bundle greps for version + deploy strings)

### Repo cleanup: README rewrite, docs reorganization, build history (2026-08-20)

- [x] ISC-849: README.md is ≤120 lines (wc -l)
- [x] ISC-850: the live-game link https://harryf.github.io/sulkweb/ appears in the first 10 lines of README (head)
- [x] ISC-851: the field-manual link appears in README (grep manual.html URL)
- [x] ISC-852: README carries local run instructions; pnpm install + client dev command (grep)
- [x] ISC-853: README embeds ≥2 screenshots whose image files exist in the repo (grep + ls)
- [x] ISC-854: each committed screenshot is <1.5MB (ls -l guard against repo bloat)
- [x] ISC-855: at least one screenshot shows actual gameplay; marines and HUD visible (Read image)
- [x] ISC-856: README links to every retained top-level docs page: architecture, development-guide, rules-reference, asset-index, writing-guide, features, status (grep)
- [x] ISC-857: README links to CLAUDE.md and ISA.md (grep)
- [x] ISC-858: README retains the GPL license section with the Games Workshop disclaimer (grep)
- [x] ISC-859: README retains the tag-driven release fact; only version tags deploy (grep)
- [x] ISC-860: docs/features.md exists with the full mission catalog; all 9 missions named (grep count)
- [x] ISC-861: docs/features.md carries the controls table (grep for key rows)
- [x] ISC-862: docs/features.md carries the deployment, roster panel, mini-map auspex, motion, and sound sections (grep headers)
- [x] ISC-863: docs/status.md exists with roadmap milestone state and known gaps (grep headers)
- [x] ISC-864: stale claims fixed in status content; v0.1 cross-vendor-audit line removed/updated, autopilot numbers dated (Read)
- [x] ISC-865: test counts everywhere current; 319 engine / 82 client unit / 115 e2e; no 259/43/51 remain (rg)
- [x] ISC-866: prompts/ no longer exists at repo root (ls)
- [x] ISC-867: docs/history/prompts/ contains all 14 prompt files, no .DS_Store (ls count)
- [x] ISC-868: OVERVIEW_PYGAME_VERSION.md, SULK Manual Combined.pdf, and both Notion HTML exports live in docs/history/ (ls)
- [x] ISC-869: docs/history/README.md describes how the game was built and links every history file (Read)
- [x] ISC-870: moves used git mv; git log --follow shows pre-move history for a sampled prompt file (git log)
- [x] ISC-871: files directly under docs/ are exactly: architecture, development-guide, asset-index, rules-reference, writing-guide, features, status (+ history/, images/) (ls)
- [x] ISC-872: architecture.md documents the Deploy phase; reserve, board.locked staging (grep)
- [x] ISC-873: development-guide.md mentions the deployment phase where GameEngine is described (grep)
- [x] ISC-874: sulkweb CLAUDE.md context-routing paths updated; prompts/ and moved docs files point at docs/history/ (grep)
- [x] ISC-875: every relative link in README.md resolves to an existing file (link-check loop)
- [x] ISC-876: every relative link in docs/*.md (top level) resolves to an existing file (link-check loop)
- [x] ISC-877: Anti: no repo file outside docs/history/ still references the old prompts/ path (rg clean)
- [x] ISC-878: Anti: no removed README content is lost; missions, controls, roster, auspex, motion, sound, rules summary, roadmap, gaps each findable under docs/ (grep per topic)
- [x] ISC-879: Anti: packages/** source is untouched by this cleanup (git diff --stat scope check)
- [x] ISC-880: Anti: no em dashes introduced into player-facing strings; cleanup touches no packages source at all (subsumed by ISC-879, git diff)
- [x] ISC-881: work committed to main and pushed; GitHub repo homepage serves the new README (git push + fetch github.com/harryf/sulkweb)
- [x] ISC-882: screenshots render on the GitHub homepage; raw image URLs return 200 after push (curl)
- [x] ISC-883: ISA records this cleanup; ISCs verified with evidence, Decisions entry, progress updated (Read ISA)

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

## Test Strategy

| isc | type | check | threshold | tool |
|-----|------|-------|-----------|------|
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

## Decisions

Older entries: [docs/isa/decisions-log.md](docs/isa/decisions-log.md).

- 2026-08-20 (em dash purge + ISA restructure, ISC-884..900): User banned em dashes ("kill them all... never put another mdash anywhere"). Scope decision: scrubbed all living documentation (README, CLAUDE.md, CREDITS.md, top-level docs, docs/history/README.md, config comments) plus the root ISA's kept text; left verbatim the June-2025 archives, the docs/isa/ archives (records preserve their original text, noted in each file's preamble), and code comments (the old rule exempted them; the ban is forward-looking and now covers everything new). Replacement judgment: colon for elaborations, parentheses for asides, semicolon or comma for clause joins, restructure where none fit; en dash ranges untouched. ISA restructure: GitHub YAML error fixed by quoting the progress value (the unquoted colon in "shipped: ISC-..." broke the frontmatter parser at line 6 col 40); 369KB root split to ~50KB by archiving completed run blocks verbatim into docs/isa/ topic files (engine-core, missions, stealer-ai, client-ui, audio, releases-infra, docs-meta) keyed to code areas, with chronological decisions-log and changelog-log; recent runs stay in root; deferred items become root pointers; per-run archive protocol documented in the Criteria index. Delegation: one general-purpose agent scrubbed the four largest docs pages in parallel (before/after counts verified).

- 2026-08-19 (deployment phase run, E3 classifier, ISC-796..847): User request: a pre-mission deployment phase; 1.5 min per squad clock, click deploy squares to choose a marine from that square's squad, sensible default facing (Decoy 10..14,10 down→right data fix), no cross-squad mixing, optional A/D orientation, X indicator on free squares, timeout/Done auto-deploys the remainder, undeploy possible, pause works, an Auto Deploy control (bolter point, sergeant, heavy weapon, bolters behind), the roster as deploy indicator + picker, minimal UI that disappears after; mid-turn addition: rules + manual updates. DESIGN: the phase lives in the ENGINE (placement legality is a game rule and unit-testable), model = LIFT-INTO-RESERVE: marines construct exactly as before (roster identity, dice draws, and every existing test untouched), then client-initiated beginDeployment() moves them into engine.reserve and sets board.locked; the existing lock that already gates every mover/weapon becomes the deploy guard for free. deployMarine/undeployMarine/turnDeployed/autoDeploy/finishDeployment are the whole API; deployMarine rides board.addPiece's pieceAdded so the client sprite pipeline needs zero new events. Squad key = deployMeta recorded at construction from the mission JSON's squad tags. Front-to-back = argmax(pos · own-facing vector): Suicide's down column fronts at y=4, Decoy's Harken left row fronts at x=23; no per-mission data needed. Deployment is dice-free and side-effect-free: checkVictory, the pieceMoved/doorToggled/pieceDied listeners all early-return in Deploy (an empty board is a squad in reserve, not a wipe; a staging rotation is not a sight line). Client: default-ON (?deploy=0 opt-out; mechanical sed across all 20 old e2e suites; debug_1 self-excludes via the 2-square minimum; attract never calls it), X text markers, click-to-place/pick-up, roster cards double as the picker (RESERVE class + arming), 90s/squad on the EXISTING timer event, AUTO button in the EXISTING HudPanel, Enter/DONE routed to finishDeploy; net new UI: one button and some Xs, all destroyed at mission start. Advisor verdict conditions resolved: pre-change-layout equivalence is proven by the 103 old suites running green under deploy=0; legacy-URL default-off REJECTED (contradicts the explicit ask); pause/timeout semantics tested; leftover-reserve semantics defined + tested. Delegation: Forge auto-include unavailable; codex binary absent (7th occurrence); code-reviewer + pr-test-analyzer per precedent. REVIEW ROUND (all six reviewer findings adopted, analyzer gaps adopted or refuted): (reviewer 6) board.locked did NOT cover useDoor/overwatchOn/unjam and the doorToggled listener converted blips during deploy; guards added, ISC-805 extended to the quieter verbs; (reviewer 4) pointerdown placement meant drag-to-pan over the deploy area silently placed/lifted marines; moved to pointerup behind a 6px getDistance gate; (reviewer 4) finishDeployment could strand a marine when a stray piece squatted a deploy square (isOccupied counts blips); nearest-free-passable fallback added + unit test, reserve is never non-empty at MarineAction; (reviewer 3) the AUTO button covered the objective/status rows populated before deployment on missions 3/5/6/beta_2; bottom-anchored; (reviewer 3) first-rotation footstep SFX: AudioManager.lastPos was never seeded, so every piece's FIRST turn-in-place clanked (pre-existing, conspicuous in deploy); seeded at construction + pieceAdded; (reviewer 2) .reserve CSS tie beat .selected; override added. The strengthened pause e2e (AUTO emit + Enter while paused) then EXPOSED A REAL PRE-EXISTING BUG: keydown-ENTER/ESC lacked the seenKeyEvents dedupe every other key has, so Phaser's same-event replay under stalled headless frames double-toggled pause and let a replayed Enter end the phase through the momentarily-unpaused gap; dedupe added, test green. Analyzer G1 ("turn guard untested") REFUTED with a bun probe: endMarinePhase() lands at turn 2/MarineAction, so the refusal WAS the turn guard; hardened with explicit asserts anyway. G2/G3/G5 adopted (space_hulk_2 scattered mixed-facing lifecycle, space_hulk_6 interleaved squads + flamerAmmo-survives-reserve, undeploy-then-timeout reconciliation). Final: engine 319/319, client unit 82/82, e2e 115/115, tsc clean both.

- 2026-08-20 (repo cleanup, ISC-849..883): README rewritten as a short screenshot-led landing page (live game + manual + local run + doc links only). Layout decision: ONE docs/features.md tour page (missions, controls, deployment, roster, auspex, motion, sound) over per-topic splinters; single "what's in the game" page is more discoverable; docs/status.md holds roadmap state + known gaps (freshened); docs/history/ holds the build story (prompts/ 14 milestone files moved via git mv, pygame analysis, original manual PDF, Notion exports) with its own README. Delegation floor (E3 ≥2) show-your-math: Forge waived; docs-only work, no coding task (codex CLI also still absent, 8th occurrence); one code-reviewer agent over the final diff is the single delegation. Push-without-ask rationale: the user's stated goal IS the GitHub homepage; pushing main never deploys the live site (tag-gated), so push is the deliverable, not an extra.
## Changelog

The full conjecture/refutation/learning trail: [docs/isa/changelog-log.md](docs/isa/changelog-log.md). New entries land here first and are archived once their run is.

## Verification

### Deployment phase run (2026-08-19)

- ISC-796..811: Bash bun test; engine suite 316/316 green (18 new tests in deploy.spec.ts covering front-to-back ordering with left-facing reversal, battle order, begin/deploy/undeploy/turnDeployed/autoDeploy/finishDeployment, squad-mixing refusal, locked-board action deadness, checkVictory + blip-conversion suppression, dice neutrality vs a seeded control, Suicide auto-order flamer-third); rules/deploy.ts 100% line coverage
- ISC-812: bun eval; space_hulk_5 marineDeployment reads 10,10:right … 14,10:right (Harken untouched at left)
- ISC-813: git diff --numstat; 5 insertions, 5 deletions, only the facing values
- ISC-814..831: Bash playwright; new deploy.spec.ts 11/11 green: boot probe (deployMode, phase Deploy, 5 reserve, 5 X markers, DEPLOYMENT phase text, 90s clock; deploy=0 → MarineAction with 0 markers), attract inert + 180s two-squad clock, click-to-place at mission facing with roster-order pick + selection for A/D, roster-card arming placing the flamer at a chosen square, pick-back-up with X restore + free A/D rotation + dead action keys, AUTO DEPLOY battle order bolter/sergeant/flamer with mission NOT started, Done teardown (no markers, no AUTO button, marine clock 150s, board unlocked, AP spendable), clock-expiry auto-start, ESC pause gating clicks, Decoy cross-squad refusal with Abraham fallback facing right, reduced-motion exact placement
- ISC-828: Bash playwright; full e2e 114/114 (103 pre-existing suites green after the mechanical deploy=0 URL update; home.spec mission-launch test updated to assert the new deploy-mode player flow)
- ISC-832: Read; manual/content.ts 'Deployment' section (id deployment) between 'What is this?' and 'How a turn works'
- ISC-833: Read; docs/rules-reference.md '## Deployment' section before Turn structure: placement, squad areas, facing, auto order, clock, rules stance, deploy=0
- ISC-834: Read; keyboardHelp KEY_NOTES leads with the deployment controls note
- ISC-835: Bash grep; zero em dashes in new player-facing strings (manual section, KEY_NOTES, HUD labels)
- ISC-836: engine 316/316; ISC-837: client unit 82/82; ISC-838: e2e 114/114; ISC-839: tsc --noEmit clean in both packages
- ISC-840: Read; README '### Deployment' section above Controls
- Visual: scratchpad deploy-phase.png (5 X markers, RESERVE cards, AUTO DEPLOY + DEPLOYMENT 1:30) and deploy-done.png (squad placed, zero deploy UI, Turn 1: Marines 2:29)
- Review round (code-reviewer 6 findings + pr-test-analyzer 7 gaps, all resolved):
  - ISC-841: bun test; ISC-805 test extended to overwatchOn/unjam/useDoor all false with AP untouched; locked guards added to the three verbs, Deploy guards to the doorToggled + pieceDied listeners
  - ISC-842: Read GameScene; deploy pointerdown branch inert; placement on pointerup gated by p.getDistance() < 6; all 12 deploy e2e clicks still pass (Playwright click = down+up in place)
  - ISC-843: bun test; stealer parked on a deploy square: finishDeployment lands all 6 marines on 6 distinct squares, reserve 0 (nearest-free-passable fallback)
  - ISC-844: scratchpad deploy-phase.png re-shot; AUTO DEPLOY bottom-anchored, objective/status/legend all readable
  - ISC-845: playwright; strengthened ESC test (AUTO emit + Enter while paused stay inert) exposed the replay double-fire live, then passed with the seenKeyEvents dedupe on keydown-ENTER/ESC
  - ISC-846: Read AudioManager; lastPos seeded in the constructor loop and the pieceAdded handler
  - ISC-847: Read styles.css; .marine-card.reserve.selected border override present
  - Analyzer G1 REFUTED with tool evidence: endMarinePhase() lands at turn 2 / MarineAction / ongoing (bun probe), so the ISC-799 refusal WAS the turn guard; test hardened with explicit phase/turn asserts and a pinned seed anyway
  - Analyzer G2/G3 adopted: space_hulk_2 scattered mixed-facing lifecycle + space_hulk_6 interleaved squads with flamerAmmo-survives-reserve, both green
  - Analyzer G5 adopted: undeploy-then-timeout e2e reconciliation test green; G6 skipped (digit hotkeys share selectFromRoster's tested code path); G7 addressed by the ISC-843 fallback
  - Final suites after the round: engine 319/319, client unit 82/82, e2e 115/115, tsc clean both
- ISC-848: Bash; pushed 712c90d..0be552d; tag v0.5.0; deploy run 32305330852 completed success BEFORE the release was created (codified order); release https://github.com/harryf/sulkweb/releases/tag/v0.5.0 "Your squad, your marching order" published; live home 200; main-BsS2_Wa0.js carries v0.5.0 plus the deploy strings AUTO DEPLOY, deploy-x, DEPLOYMENT, beginDeployment (deploySeconds absent only because minification renames plain identifiers). Classifier returned ALGORITHM E2 on "push and tag"; run executed on the standing E1 release precedent (seventh application); same checklist either way.

Repo cleanup (2026-08-20, ISC-849..883):
- ISC-849..852: Bash; README 63 lines; live link on line 5; manual.html linked; pnpm install + `packages/client dev` present.
- ISC-853/854/855: Bash + Read; docs/images/gameplay.png (182KB) and homepage.png (181KB) embedded and on disk; gameplay image visually confirmed (five marine cards, HUD, mini-map, blips closing, turn 3); homepage image shows title + mission list over the attract board. Captured via Playwright vs temp vite :5199 (Interceptor still down; standing stand-in).
- ISC-856..859: grep; links to all seven top-level docs pages + CLAUDE.md + ISA.md; gpl-3.0 + Games Workshop disclaimer; "version tags only" release fact.
- ISC-860..862: grep; all 9 mission ids in features.md; 19 control-table rows; headers The missions/Deployment phase/Controls/Marine roster panel/Mini-map auspex/Motion/Sound.
- ISC-863/864: grep; status.md has Roadmap state + Known gaps headers; stale "revisit against tag v0.1" line gone; autopilot numbers dated 2026-08-15; parry/autofire "arrive later" line replaced (they shipped with beta_2); librarian/psi gap named.
- ISC-865: rg; zero hits for 259/43/51 counts outside docs/history; no live counts asserted anywhere (README lists commands, not counts).
- ISC-866..869: ls; prompts/ gone from root; docs/history/prompts/ = 14 files, no .DS_Store; 4 legacy files + README.md in docs/history/; history README links all files (11 relative links, all resolve).
- ISC-870: git status; all 18 moves recorded as R (rename) entries; --follow re-probed post-commit.
- ISC-871: ls; docs/ top level exactly architecture, asset-index, development-guide, features, rules-reference, status, writing-guide + history/ + images/.
- ISC-872/873: grep; beginDeployment/Deploy-phase paragraph in architecture.md; deployment-phase row in development-guide.md GameEngine entry.
- ISC-874: grep; CLAUDE.md rows point at docs/features.md, docs/status.md, docs/history/prompts/, docs/history/SULK Manual, docs/history/Analysis; stale "76 verified criteria" refreshed.
- ISC-875/876: bun linkcheck.ts; 48 relative links across README + all top-level docs + history README: ALL_LINKS_OK.
- ISC-877: rg -P "(?<!history/)prompts/" outside ISA/history; zero hits.
- ISC-878: grep; Exterminate/overwatch/auspex/reduce-motion/motion-tracker/AUTO DEPLOY in features.md, roadmap + interrupt gaps in status.md; rules summary superseded by rules-reference.md (already canonical).
- ISC-879/880: git status; zero packages/** paths in the change set; no player-facing strings touched.
- ISC-881: Bash; commit 5937405 pushed e33a7a7..5937405; GitHub README API returns the new landing page verbatim (first 12 lines matched); features.md and docs/history tree render 200 on github.com.
- ISC-882: curl; raw.githubusercontent.com/.../docs/images/{gameplay,homepage}.png both 200 image/png (181923B / 180713B).
Em dash purge + ISA restructure (2026-08-20 second run, ISC-884..900):
- ISC-884/885/895/900: rg; zero em dashes across README, CLAUDE.md, CREDITS.md, root ISA, .gitignore, deploy.yml, every top-level docs page, docs/history/README.md, docs/isa/README.md (15 files, all 0). The four largest docs pages were scrubbed by a parallel agent with per-instance judgment (before/after: 25/9/7/7 to 0).
- ISC-886/887: grep + git diff; en dash ranges (1–3, M0–M8) intact; the June-2025 history archives show zero edits.
- ISC-888: Edit applied to ~/.claude-personal/CLAUDE.md Operational Rules; the ban now loads at every session start.
- ISC-889/890/891: Read + ls; frontmatter progress value quoted (the unquoted colon was the GitHub YAML error at line 6 col 40); root ISA 51,784 bytes (was 369KB); docs/isa/ holds 10 files (7 topics + 2 logs + README).
- ISC-892/897: bun script; 900 unique ISC ids across root + archives, 0 duplicates; ISC-77/472/567 verbatim in engine-core/client-ui/stealer-ai.
- ISC-893/894/896: grep; archive protocol + index table in root Criteria; 3 deferred pointers; CLAUDE.md routes to docs/isa/.
- ISC-898: linkcheck; ALL_LINKS_OK across root ISA + all docs/isa files.
- ISC-899: curl; github.com/harryf/sulkweb/blob/main/ISA.md returns 200 with zero "Error in user YAML" matches and the frontmatter task rendered in the metadata table (commit 743c837 pushed 609f01a..743c837).
- ISC-883: this record. Review round: code-reviewer agent audited the diff; links all clean (48 targets incl. angle-bracket space paths), 3 findings ADOPTED (CLAUDE.md stale "see README Known gaps" heading → docs/status.md; stale remaining-work paragraph rewritten to the genuinely-open list; release recipe + SULK_VERSION→__APP_VERSION__ chain restored as architecture.md "Cutting a release"; the one real information loss); both sub-threshold wording notes also adopted ("one squad" → "your Terminator marines"; "square-for-square" softened). git log --follow shows 2 commits on the moved roadmap file (rename detected at 100%).
