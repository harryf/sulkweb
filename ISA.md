---
project: sulkweb
task: "Project ISA — Sulk Web (playable Space Hulk port)"
effort: E4
effort_source: classifier
phase: verify
progress: 290/291 (card-polish ISC-288..291 verified; ISC-71 deferred)
mode: interactive
started: 2026-08-14T15:20:00Z
updated: 2026-08-15T12:45:00Z
---

# Sulk Web — Project ISA

## Problem

A web port of the classic Pygame game Sulk (Space Hulk clone) stalled mid-Milestone-3 of a nine-milestone roadmap. The working tree was abandoned with failing client tests, an uncommitted HUD refactor, and no playable game loop: pieces can move, but there are no doors, no shooting, no enemy, no turns, no way to win or lose. Progress stalled because UI/gameplay bugs kept appearing and nothing was ever verified in a real browser — trust in the process collapsed before the game became a game.

## Vision

Open `localhost:5173` and *play Space Hulk in the browser*: marines advance down corridors of a real mission map, doors grind open, a storm bolter chatters on overwatch as genestealer blips convert and rush the line, and the mission ends in a win or a bloody wipe. The euphoric surprise: "it actually plays — this abandoned repo became a game."

## Out of Scope

- Multiplayer / networking (Colyseus etc.) — the original real-time multiplayer ambition is explicitly dropped; this is the single-player, turn-based port per the sulkweb roadmap.
- Music. *(Sound EFFECTS moved IN scope by the 2026-08-15 faithful-recreation directive — the original GPL wav set is now wired; see Decisions.)*
- Mobile/touch support; desktop browser only.
- Additional missions beyond the Space Hulk campaign set shipped in the original Sulk; v0.1 requires only Mission 1 playable.
- Theming/skinning UI beyond the existing `default` theme assets.
- Renaming trademarked terms for public release (tracked, but not v0.1).
- Python/Pygame feature parity in edge rules (e.g. exotic pieces) where the manual and code disagree — Sulk manual wins.

## Principles

- The engine is pure TypeScript with zero Phaser imports; every rule is unit-testable headlessly. Rendering is a projection of engine state, never the owner of it.
- No claim of "working" without a probe: engine claims need a passing test; UI claims need a real-browser verification.
- Ship vertical slices: each milestone ends with something playable and committed, never an uncommitted mid-refactor tree.
- Prefer the original Sulk rules (manual + Pygame source in docs/) over invention; where ambiguous, pick the simplest rule that keeps the game fun and note the decision.

## Constraints

- Monorepo: pnpm workspaces, `packages/engine` (pure rules) + `packages/client` (Phaser 3 + Vite + TypeScript strict, NodeNext modules with explicit `.js` import extensions).
- Test stack: Vitest for engine and client units; Playwright for client e2e.
- Existing engine public API (`GameEngine`, `Board`, `Square`, `Piece`, phases, `loadMission`) is evolved, not rewritten.
- Assets are the existing PNG set in `packages/client/public/assets/themes/default/` — no new art pipeline.
- Node 22 / pnpm 10 toolchain as installed.

## Goal

From the abandoned mid-M3 state, reach a verified-playable Sulk v0.1 slice: all tests green, HUD complete, and the full game loop — movement, doors, shooting, overwatch, close combat, blips, basic stealer AI, turn phases, victory/defeat — playable in the browser on the real Mission-1 map, with the repo left committed and documented at every milestone boundary.

## Criteria

### Stabilize (S — recover the abandoned tree)

- [x] ISC-1: `pnpm --filter ./packages/engine test` exits 0
- [x] ISC-2: `pnpm --filter ./packages/client test` exits 0
- [x] ISC-3: `pnpm build` (engine + client) exits 0 with no TS errors
- [x] ISC-4: Dev server boots and page renders board with zero browser console errors
- [x] ISC-5: HUD panel renders fixed at right edge, full canvas height, dark background
- [x] ISC-6: Minimap renders inside HUD top area and tracks camera box on pan
- [x] ISC-7: Clicking a marine shows AP text `AP: n/m` in HUD
- [x] ISC-8: Moving a marine decrements HUD AP display in the browser
- [x] ISC-9: Deselecting (click empty square) resets HUD AP display to `AP: --/--`
- [x] ISC-10: Board camera pan (arrows/WASD/drag) never scrolls the HUD layer
- [x] ISC-11: Working tree committed at M3 boundary; `git status --short` clean
- [x] ISC-12: Stale `packages/engine/coverage/` artifacts removed from git tracking and ignored

### M4 — Doors, Overwatch, LOS

- [x] ISC-13: Engine: `Door.toggle()` flips open/closed and costs the acting piece 1 AP
- [x] ISC-14: Engine: closed door blocks LOS through its square (unit test) *(superseded by ISC-98 edge model — see Decisions 2026-08-14)*
- [x] ISC-15: Engine: open door does not block LOS (unit test) *(superseded by ISC-98)*
- [x] ISC-16: Engine: closed door blocks movement into/through its square; open door allows it *(superseded by ISC-97)*
- [x] ISC-17: Engine: piece can only toggle a door in the square directly ahead of its facing *(superseded by ISC-99 front-3 edge rule)*
- [x] ISC-18: Client: door sprite renders closed/open texture matching engine state
- [x] ISC-19: Client: door-use key/button toggles adjacent door and re-renders sprite
- [x] ISC-20: Engine: `overwatch` flag settable on a marine for 2 AP; cleared on move/turn/shoot
- [x] ISC-21: Engine: marine on overwatch auto-shoots (free, no sustained bonus, range 12) after each action by a stealer in LOS/fire-arc (unit test)
- [x] ISC-22: Engine: overwatch shot jams on any double; jam persists, 1 AP to clear, no shoot/overwatch while jammed (unit test)
- [x] ISC-23: Client: overwatch marker sprite appears on marine when overwatch set, disappears when cleared
- [x] ISC-24: Client: holding L with a piece selected highlights all squares in that piece's LOS
- [x] ISC-25: Engine: `seeable()` respects facing arc rules used by original Sulk (unit test against truth table)

### M5 — Shooting, Close Combat, Death, Blips & AI0

- [x] ISC-26: Engine: deterministic seedable RNG service; same seed reproduces identical dice sequences (unit test)
- [x] ISC-27: Engine: storm bolter `shoot(target)` rolls 2d6, kills on any die ≥6, costs 1 AP
- [x] ISC-28: Engine: sustained fire — each consecutive miss at same target adds +1 to each die, max +3; bonus lost on move/turn/target-switch (unit test)
- [x] ISC-29: Engine: shooting requires target in LOS and front fire arc; out-of-LOS shot rejected (unit test)
- [x] ISC-30: Engine: close combat resolves marine 1d6 (+1 sergeant) vs stealer 3d6 front / 2d6 side-rear; highest single die wins, tie = both survive (unit test)
- [x] ISC-31: Engine: CC loser is destroyed; defender losing while not facing attacker instead turns to face for free (unit test)
- [x] ISC-32: Engine: dead piece removed from `state.pieces` and its square's occupancy cleared
- [x] ISC-33: Client: muzzle-flash sprite appears at shooter on shot and disappears ≤300ms later
- [x] ISC-34: Client: shot kill removes target sprite from scene
- [x] ISC-35: Client: casualty counter in HUD increments on stealer death and marine death separately
- [x] ISC-36: Engine: `Blip` piece type with hidden stealer count (1-3), moves like a piece, no facing
- [x] ISC-37: Engine: blip converts to that many stealers when entering any marine's LOS (unit test)
- [x] ISC-38: Engine: blips enter play from mission-defined entry squares ("lurk" points)
- [x] ISC-39: Engine: AI0 — stealer/blip pieces move toward nearest marine each stealer phase (greedy step, unit test)
- [x] ISC-40: Engine: AI0 stealer adjacent to marine initiates close combat instead of moving
- [x] ISC-41: Client: blip renders blip sprite; conversion swaps in stealer sprites in the browser
- [x] ISC-42: Client: playthrough probe — stealer visibly moves toward marines and attacks without player input during stealer phase

### M6 — Phase Cycle, Timer, Victory

- [x] ISC-43: Engine: full phase chain cycles ClockAndCP → MarineAction → StealerAction → EndPhase → next turn (unit test)
- [x] ISC-44: Engine: AP pools reset each turn (marine 4, stealer 6, blip 6); CP rolled 1d6 per turn at ClockAndCP (unit test)
- [x] ISC-45: Engine: CP spendable as extra AP on marines during marine phase, including reactivating a used piece (unit test)
- [x] ISC-46: Engine: turn timer value exposed by engine; expiry force-ends marine phase
- [x] ISC-47: Client: HUD shows current phase name and turn number, updates each transition
- [x] ISC-48: Client: HUD turn-timer counts down in marine phase; hits zero → stealer phase begins
- [x] ISC-49: Client: Done button ends marine phase early
- [x] ISC-50: Engine: victory check — mission objective met → `state.result = 'win'` (unit test)
- [x] ISC-51: Engine: defeat check — all marines dead → `state.result = 'loss'` (unit test)
- [x] ISC-52: Client: post-game overlay displays WIN or DEFEAT and blocks further input
- [x] ISC-53: Engine: after `state.result` set, further actions rejected (unit test)

### M7 — Mission 1 complete experience (scoped alpha)

- [x] ISC-54: Mission 1 ("Suicide Mission") converted to JSON with correct board sections, doors, entry points, deployment zones
- [x] ISC-55: Engine: mission JSON schema supports doors, entry/exit squares, deployment squares, objective type
- [x] ISC-56: Engine: marine squad for Mission 1 (5 storm-bolter terminators incl. sergeant stand-in) deploys at mission start squares
- [x] ISC-57: Engine: Mission 1 objective — flamer-target/destroy objective simplified to "kill all stealers OR reach exit" documented in Decisions and unit-tested
- [x] ISC-58: Engine: stealer reinforcement blips spawn per-turn per mission spec (unit test)
- [x] ISC-59: Client: full Mission 1 playable start-to-finish in browser (manual playthrough evidence)
- [x] ISC-60: Client: ESC pauses — timer stops, input ignored until resumed
- [x] ISC-61: Client: selection, movement, door, shoot, overwatch controls documented on-screen or in README

### M8 — Release hygiene

- [x] ISC-62: Fresh `pnpm i && pnpm build` from clean clone produces deployable `packages/client/dist`
- [x] ISC-63: `pnpm --filter ./packages/client e2e` Playwright suite passes headless
- [x] ISC-64: README updated: controls, how to run, roadmap state, milestone status truthful
- [x] ISC-65: Every milestone completed in this effort is a separate git commit with tests green at that commit

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
- [x] ISC-76: Anti: no Python/Pygame code copied verbatim — rules re-expressed in TypeScript with tests

### Playtest bug sweep (2026-08-14, user-reported: "blips never move/convert, DONE spawns marines")

- [x] ISC-77: `pieceAdded` event payload carries the correct piece `kind` at emit time for every subclass (vitest)
- [x] ISC-78: In-browser: reinforcement blips spawned by DONE render with the blip texture, not marine (browser probe: texture key diff)
- [x] ISC-79: In-browser: blips converting to genestealers render with the stealer texture (browser probe)
- [x] ISC-80: A blip in a concave room pocket (no distance-reducing neighbor) paths out and continues toward marines (vitest, BFS regression)
- [x] ISC-81: In-browser: every live blip/stealer advances or acts each stealer phase across 5+ consecutive DONE turns unless boxed in by occupancy (browser probe: per-turn position diff)
- [x] ISC-82: A stealer diagonally adjacent to a marine lines up orthogonally and attacks within one activation (vitest)
- [x] ISC-83: Anti: marine piece-count never increases after any DONE click (browser probe over multi-turn playthrough)
- [x] ISC-84: Full engine suite + client units + Playwright e2e green after fixes, pinned seeds re-scanned if dice order changed (Bash)
- [x] ISC-85: Anti: a stealer-side piece queued behind a friend never opens an off-path door while waiting (vitest, advisor finding)

### Animated stealer phase + rules/UX sweep (2026-08-14, second user pass)

- [x] ISC-86: Stealer phase replays as visible step-by-step animation after DONE — sampled sprite positions change over time (Playwright)
- [x] ISC-87: `scene.animating` true during replay; keyboard/selection/pause/DONE input ignored until it ends (Playwright + code gates)
- [x] ISC-88: A blip converts the moment a marine's move/turn/door-toggle brings it into sight — no endMarinePhase needed (vitest ×2)
- [x] ISC-89: Conversion spawns all `value` (1–3) stealers on origin+adjacent free squares; overflow lost (vitest: value-2 blip → 2 stealers)
- [x] ISC-90: Stealer entry squares marked purple, exit square marked green with EXIT label, deployment squares outlined blue (Playwright + screenshot)
- [x] ISC-91: HUD shows the mission objective text and a map-marker legend (Playwright)
- [x] ISC-92: Anti: after replay ends every sprite matches engine position and kind-texture exactly — zero drift (Playwright)
- [x] ISC-93: Anti: endTurn during replay is ignored — turn number cannot double-advance (Playwright)
- [x] ISC-94: Pinned e2e games are fully deterministic: dice installed at engine construction via `?seed=N` (blip values + CP roll included); seeds re-scanned (Bash)
- [x] ISC-95: Anti: REPLAYED events never mutate engine state — sight-conversion ignores `PieceEvents.replaying` (vitest, advisor finding)

### Edge-model doors (2026-08-14, third user pass: "doors should be on the edge between two grid squares")

- [x] ISC-96: A Door models the boundary between its anchor square and the `doorFacing` neighbor; `doorBetween(a,b)` finds it from either direction (vitest)
- [x] ISC-97: Closed door blocks orthogonal movement across its edge; open allows it; movement parallel to the edge and onto the anchor square is unaffected (vitest)
- [x] ISC-98: Closed door blocks LOS crossing its edge — including the square directly behind it; open restores sight; sight parallel to the edge is unaffected (vitest, exact segment intersection)
- [x] ISC-99: Door operation follows the front-3 edge rule (straight-ahead edge wins; edges incident to front squares reachable; edges behind unreachable); AI opens the edge it is about to cross (vitest)
- [x] ISC-100: Door sprites render ON the boundary between their two squares, rotated along it (browser screenshot)
- [x] ISC-101: Anti: no door blocks or occupies a square — every door anchor square is passable (vitest)

### Kill-reveals conversion + hover readout (2026-08-15)

- [x] ISC-102: A marine shot that kills a stealer blocking LOS to a blip converts that blip immediately (vitest)
- [x] ISC-103: A close-combat kill that unblocks LOS to a blip converts it immediately (vitest)
- [x] ISC-104: An overwatch kill during the stealer phase (inside event capture) that reveals a blip converts it — despite capture buffering suppressing handlers (vitest)
- [x] ISC-105: Anti: a REPLAYED `pieceDied` event does not trigger blip conversion — animation replays describe past states (vitest)
- [x] ISC-106: HUD shows a hover readout line positioned below the controls text in the bottom-right panel (Playwright e2e + screenshot)
- [x] ISC-107: Hovering a board square displays its (x,y) coordinate and tile kind (corridor/room) (Playwright e2e)
- [x] ISC-108: Hover readout includes the occupant kind when a piece stands on the square, and door edges anchored there (Playwright e2e)
- [x] ISC-109: Anti: hovering never mutates game state — engine piece positions/AP identical before and after mousemove sweep (Playwright e2e)
- [x] ISC-110: Invariant test: at every settled marine-phase boundary of autoplayed games (seeds 1-10), no surviving blip sits inside marine sight (vitest)

### Original-map fidelity (2026-08-15, user-supplied Pygame MISH_space_hulk_1)

- [x] ISC-111: Mission JSON square set is exactly the 98 coordinates of the original BOARD tuples — no extras, none missing (vitest set-equality)
- [x] ISC-112: The seven door edges match the original: (10,5)↑ (8,7)→ (10,9)↑ (3,7)→ (1,9)↑ (13,15)↑ (18,20)→ (vitest) [refined: hand count missed (10,9)↑; generator transcription surfaced it]
- [x] ISC-113: The six stealer entry points match: (0,11) (2,11) (2,19) (2,21) (9,26) (14,26) (vitest)
- [x] ISC-114: Room squares are exactly the three 3×3 blocks (9-11×6-8, 0-2×6-8, 19-21×19-21); every other square is corridor (vitest)
- [x] ISC-115: Five marines deploy at/behind BEGINPLACE (14,20) in the X-junction, facing the objective (vitest + browser)
- [x] ISC-116: Objective adaptation — exit point is the Launch Control square (20,20); blip flow 2 initial + 1/turn per original BLIPS=(2,1) (vitest)
- [x] ISC-117: Board validator passes and full suites are green on the new map (Bash)
- [x] ISC-118: Re-pinned deterministic win and loss seeds verified in-browser via win.spec/playthrough.spec (Playwright)
- [x] ISC-119: Anti: no invented square from the old map survives — e.g. (15,13) reads as rock in the hover probe (Playwright)

### Mission library structure + debug_1 switch (2026-08-15)

- [x] ISC-120: Missions live in family subdirs mirroring the original `data/missions/` (space_hulk/, debug/); loader resolves both names (vitest)
- [x] ISC-121: debug_1 board is square/door/entry-identical to space_hulk_1 — mirrors the source diff (vitest)
- [x] ISC-122: debug_1 forces per source: one storm-bolter marine at BEGINPLACE (14,20), initialBlips 0, blipsPerTurn 1 (vitest)
- [x] ISC-123: Client loads debug_1 by default; `?mission=` URL param selects any registered mission (Playwright)
- [x] ISC-124: Pins re-established: debug_1 win pin in win.spec; space_hulk_1 loss pin retained via `?mission=` in playthrough.spec (Playwright)
- [x] ISC-125: Anti: the space_hulk_1 fidelity guard is untouched and still green after the move (vitest)

### Faithful-recreation audit (2026-08-15, user: "review the original game vs. what we have built … bring that over")

Rules fidelity (engine):
- [x] ISC-126: Marine side-step (facing-relative left/right orthogonal) is illegal — tryMove returns false, AP unchanged (vitest)
- [x] ISC-127: CC attacker-win kills the defender regardless of defender facing (vitest)
- [x] ISC-128: CC defender-win kills the attacker only when the attacker stands directly ahead of the defender; otherwise the attacker survives and the defender turns to face it (vitest)
- [x] ISC-129: CC draw: both survive; a non-facing defender rotates to face the attacker (vitest)
- [x] ISC-130: Aimed bolter shots have no range cap (LOS+arc only); overwatch shots are capped at range 12 (vitest)
- [x] ISC-131: Sustained-fire bonus caps at +4 per the source (`_max_fire_bonus = 4`) (vitest)
- [x] ISC-132: Move-and-shoot: first bolter shot after a move costs 0 AP and accrues no sustained bonus; turn/door clears the free shot (vitest)
- [x] ISC-133: Genestealer free-turn rule: second consecutive same-direction 90° turn costs 1 AP; alternating turns stay free; resets each turn (vitest)
- [x] ISC-134: Blip values draw from the original 8/4/9 bag (1s/2s/3s, with replacement) via the board dice source — deterministic under seed (vitest)
- [x] ISC-135: A blip may not step into a marine-seen square nor adjacent (8-way) to a marine (vitest)
- [x] ISC-136: AI blip that cannot legally advance converts voluntarily (only while unacted) when a marine is within 6 squares; otherwise it holds (vitest)

Sections & heavy flamer:
- [x] ISC-137: Mission JSONs carry per-square sectionId matching the original BOARD sublists (20 sections; Launch Control room and the north corridor each one section) (vitest fidelity)
- [x] ISC-138: Flame flood: flaming a square flames its whole section via orthogonal in-section spread, stopped by closed door edges (vitest)
- [x] ISC-139: HeavyFlamerMarine: shot costs 2 AP, ammo 6, range 12, fire-arc+LOS, cannot target own section or a closed-door-blocked square; each piece on flamed squares dies on d6 ≥ 2 (vitest)
- [x] ISC-140: Flames persist through the stealer phase (blocking movement into flaming squares), clear at end-phase, and the clearance re-checks blip sight (vitest)
- [x] ISC-141: Flamer self-destruct: 1 AP, requires ammo, kills and flames its own section including itself (vitest)

Sergeant & mission-1 truth:
- [x] ISC-142: SergeantMarine: +1 bonus on every CC die; distinct sprite key (vitest)
- [x] ISC-143: Marine phase timer = 120s + 30s per living sergeant, exposed by the engine and used by the client (vitest + client)
- [x] ISC-144: space_hulk_1 deploys on the ORIGINAL M squares (10,0)–(10,4) facing down — 3 bolters, sergeant (10,3), flamer (10,4); BEGINPLACE is dead code in the source (fidelity spec)
- [x] ISC-145: space_hulk_1 objective is flame-objective: win iff the objective square (20,20) is flamed (self-destruct counts); loss iff no living flamer has ammo; no exit win; reinforcements uncapped per source (vitest)
- [x] ISC-146: debug_1 deploys at an original M square facing down; keeps its documented adapted objective (vitest)
- [x] ISC-147: MarineAutopilot escorts the flamer south and flames only Launch Control; both win and loss reachable at pinned seeds under the new rules (vitest scan + Playwright)

Client fidelity:
- [x] ISC-148: Flaming squares render flames.png while burning and clear afterwards (Playwright)
- [x] ISC-149: Jammed marines show marker_jam.png (Playwright or client unit)
- [x] ISC-150: HUD/hover shows flamer ammo (Playwright)
- [x] ISC-151: HUD shows the most recent dice rolls (original DisplayDie fidelity) (Playwright)
- [x] ISC-152: Original GPL sounds shipped and wired: move, bolter, flamer, CC, death, jam, door, self-destruct play on their events including replay (file probe + client wiring probe)
- [x] ISC-153: Flamer controls: F flames the hovered legal square (fallback: nearest enemy square); X self-destructs (Playwright)

Anti + closure:
- [x] ISC-154: Anti: engine stays Phaser/DOM/audio-free (existing grep guard green)
- [x] ISC-155: Anti: debug_1 default boot unchanged — 1 marine, 0 enemies, HUD alive (Playwright)
- [x] ISC-156: All suites green with pins re-scanned under the new dice flow; scan evidence recorded (Bash)
- [x] ISC-157: README + CLAUDE.md updated: controls, restored rules, mission truth, re-baselined balance (Read)

Mission 2 "Exterminate" recreation (2026-08-15, source MISH_space_hulk_2.py):

Board fidelity:
- [x] ISC-158: `loadMission('space_hulk_2')` returns the mission — registry entry exists (vitest)
- [x] ISC-159: square set matches the original BOARD exactly — 204 squares (fidelity spec vs independent transcription)
- [x] ISC-160: 42 sections; per-square section ids partition identically to the source sublists (fidelity spec)
- [x] ISC-161: all 19 doors present with source facings (fidelity spec)
- [x] ISC-162: all 11 ENTRY squares present as entryPoints (fidelity spec)
- [x] ISC-163: marineDeployment = exactly 5 squares: 3 storm_bolter + 1 sergeant + 1 heavy_flamer (fidelity spec)
- [x] ISC-164: every deployment square is an original M-tagged square (fidelity spec)
- [x] ISC-165: each marine deploys in a DIFFERENT room section — pre_deploy_rule one-per-room (fidelity spec)
- [x] ISC-166: blips per BLIPS=(0,2): initialBlips 0, blipsPerTurn 2, no totalBlips cap (fidelity spec)

Victory engine (kill-quota):
- [x] ISC-167: stealer death adds 1 to a tracked casualty count (vitest)
- [x] ISC-168: blip death adds its VALUE to the casualty count — original pieces.py:515 (vitest)
- [x] ISC-169: Anti: blip CONVERSION adds nothing to the casualty count (vitest)
- [x] ISC-170: `casualtiesChanged` event emitted with the running total on each casualty (vitest)
- [x] ISC-171: schema gains objective `'kill-quota'` + `killQuota`; mission 2 uses killQuota 30 (Read + vitest)
- [x] ISC-172: kill-quota win — result 'win' when casualties ≥ killQuota at a victory check (vitest)
- [x] ISC-173: entry-blockade win — result 'win' when every entry square has a marine within 6 (vitest)
- [x] ISC-174: near-metric matches original get_team_is_near: BFS over existing squares, 8-way, self=0, closed doors do NOT block (vitest)
- [x] ISC-175: kill-quota loss — all marines dead → 'loss' (vitest)
- [x] ISC-176: mid-marine-phase quota kill ends the game immediately — outcome-equivalent to the original boundary check (vitest)
- [x] ISC-176.1: blockade never fires mid-phase (positions final at boundaries); marine-action-end check present (vitest)
- [x] ISC-177: Anti: victory timing of flame-objective / reach-exit missions is untouched — existing pinned e2e seeds still pass (Bash playwright)

AI + client:
- [x] ISC-178: autopilot plays kill-quota missions legally — advances on entry points, no illegal actions over a scripted run (vitest)
- [x] ISC-179: mission2_fidelity.spec green with expected data transcribed independently of the transcriber script (vitest)
- [x] ISC-180: HUD shows a kill counter (running casualties / quota) on kill-quota missions (Playwright)
- [x] ISC-181: client objective label describes the mission-2 objective (Playwright)
- [x] ISC-182: `?mission=space_hulk_2` renders the 204-square board + 5 variant marine sprites (Playwright)

Closure:
- [x] ISC-183: seed scan ≥20 autoplay seeds complete without engine errors; W/L recorded in Decisions (Bash)
- [x] ISC-184: full engine suite green (Bash)
- [x] ISC-185: client unit + e2e suites green (Bash)
- [x] ISC-186: `pnpm build` clean (Bash)
- [x] ISC-187: Anti: engine stays Phaser/DOM/audio-free (grep guard green)
- [x] ISC-188: generalized transcriber script converts a MISH_*.py to mission JSON — rerunnable for missions 3–6 (Bash)
- [x] ISC-189: README + CLAUDE.md document mission 2: forces, victory, adaptations (Read)
- [x] ISC-190: ISA Decisions records the stealer-placed-marine adaptation + no-lurk note (Read)

Batch migration of remaining missions (2026-08-15, "migrate all the rest"):
- [x] ISC-191: shared BOARD parser extracted to a module used by both transcribeMission and the batch migrator — no duplicated parse logic (Grep)
- [x] ISC-192: parser extracts EXIT-tagged squares as exitPoints and O-tagged squares as objective squares (vitest or script probe)
- [x] ISC-193: `migrateMissions.ts` converts ALL six remaining missions (space_hulk 3–6, beta 1–2) in one run (Bash)
- [x] ISC-194: each draft carries board data: squares with sections/kinds, doors, entries, exits, objective squares, bbox (Read)
- [x] ISC-195: each draft carries mechanically-extracted BLIPS (initial, perTurn) matching the source tuples (Read vs source)
- [x] ISC-196: each draft carries the squad roster(s): names, piece types mapped to our MarineType, unknown types + stealer-placed pieces flagged, mission 6 HF-ammo-4 override noted (Read)
- [x] ISC-197: each draft carries a default one-marine-per-room deployment where roster and rooms allow, flagged for hand review (Read)
- [x] ISC-198: each draft carries a `todo` list naming its unscripted semantics (victory rule, escort/lurk/turn-limit/ambush features, exotic equipment) (Read)
- [x] ISC-199: draft counts cross-checked against an INDEPENDENT agent reading of all six sources — discrepancy count reported (Bash diff)
- [x] ISC-200: Anti: no draft mission is registered in missions/index.ts or reachable via ?mission= — the registry stays a playability gate (Grep + Read)
- [x] ISC-201: Anti: existing missions/suites untouched — 168 engine / 6 unit / 11 e2e still green, build clean (Bash)
- [x] ISC-202: migrator is idempotent — rerun produces byte-identical drafts (Bash md5)
- [x] ISC-203: README/CLAUDE document the migrator, the drafts, and the per-mission semantic remainder (Read)

Mission completion run (2026-08-15, "get these missions completed including the victory condition"):

Shared engine systems:
- [x] ISC-204: GameResult supports 'draw'; client shows a draw overlay (vitest + Playwright)
- [x] ISC-205: marine entering an EXIT square on escape-family missions leaves the board — tracked, event emitted (vitest)
- [x] ISC-206: CAT: neutral board object; wanders ≤3 squares in end-phase when loose and undamaged, deterministic under seed (vitest)
- [x] ISC-207: marine entering the CAT square picks it up; the CAT moves with its carrier (vitest)
- [x] ISC-208: carrier death drops the CAT on the death square (vitest)
- [x] ISC-209: stealer reaching the loose CAT damages it; second damage destroys it (vitest)
- [x] ISC-210: flames on the CAT square destroy it outright (original update(): flaming → kill) (vitest)
- [x] ISC-211: mission `flamerAmmo` override applied at deploy (m6: 4) (vitest)
- [x] ISC-212: DUCTING: stealer stepping on a ducting square destroys that ducting (vitest)
Mission 3 "Rescue":
- [x] ISC-213: JSON finalized (squad-corridor deployments, CAT on an Ilyich square, exits, blips 0/3) + registered (vitest)
- [x] ISC-214: carrier escaping with an UNDAMAGED CAT → win (vitest)
- [x] ISC-215: carrier escaping with a DAMAGED CAT → draw (vitest)
- [x] ISC-216: CAT destroyed or squad wiped → loss (vitest)
- [x] ISC-217: fidelity spec green vs independent transcription (151 sq / 34 sec / 14 doors / 10 entries / 2 exits) (vitest)
Mission 4 "Cleanse and Burn":
- [x] ISC-218: JSON finalized (10 exact M-square deploys, two flamers, objectivePoints Gene Banks) + registered (vitest)
- [x] ISC-219: a flaming objective square becomes permanently CLEANSED — survives end-phase flame clearing (vitest)
- [x] ISC-220: both cleansed → win (vitest)
- [x] ISC-221: no living flamer with ammo and not won → loss (vitest)
- [x] ISC-222: fidelity spec green (182 sq / 40 sec / 18 doors / 8 entries) (vitest)
Mission 5 "Decoy":
- [x] ISC-223: JSON finalized (escapeQuota 5, exit (9,28), blips 3/2) + registered (vitest)
- [x] ISC-224: fifth marine escaping → win (vitest)
- [x] ISC-225: alive + escaped dropping below 5 → loss (vitest)
- [x] ISC-226: fidelity spec green (158 sq / 34 sec / 17 doors / 7 entries / 1 exit) (vitest)
Mission 6 "Defend":
- [x] ISC-227: JSON finalized (turnLimit 16, flamerAmmo 4, 3 ducting, 13 room squares, blips 2/2) + registered (vitest)
- [x] ISC-228: end of turn 16 with squad alive → win (vitest)
- [x] ISC-229: any ducting destroyed → loss (vitest)
- [x] ISC-230: any control-room square flaming → loss (vitest)
- [x] ISC-231: flamer firing while standing in the control room destroys a ducting (source kludge preserved) (vitest)
- [x] ISC-232: fidelity spec green (192 sq / 40 sec / 15 doors / 13 entries / 16 O / 3 ducting) (vitest)
Beta 1 "Messenger":
- [x] ISC-233: JSON finalized (escapeQuota 1, exit (33,8), blips 2/1) + registered (vitest)
- [x] ISC-234: fidelity spec green (192 sq / 41 sec / 21 doors — source-arbitrated over one agent's 19) (vitest)
AI + client:
- [x] ISC-235: stealer AI targets the loose CAT and intact ducting alongside marines (vitest)
- [x] ISC-236: autopilot plays all five new missions legally; seed scans recorded in Decisions (Bash)
- [x] ISC-237: client objective labels + HUD status counters (escaped/quota, cleansed/2, turn/limit) (Playwright)
- [x] ISC-238: CAT rendered (cat.png) with damage marker; ducting rendered with destroyed variant (Playwright)
- [x] ISC-239: draw overlay reachable end-to-end (m3 engine surgery) (Playwright)
Closure:
- [x] ISC-240: Anti: existing missions/pins untouched — full suites green, build clean (Bash)
- [x] ISC-241: Anti: registry guard passes — five finished missions registered without draft/todo; their drafts removed (vitest + Bash)
- [x] ISC-242: seed scans per new mission recorded (Bash)
- [x] ISC-243: README + CLAUDE updated (mission list, systems, honest balance) (Read)
- [x] ISC-244: beta_2 deferral documented (equipment run of its own) (Read)
- [x] ISC-245: each new mission boots via ?mission= in a real browser with zero console errors (Playwright)

Beta_2 "Download" completion (2026-08-15, "finish it off"):

Assault cannon:
- [x] ISC-246: aimed shot: 3 dice, kill on any ≥ 5, 10 ammo, ammo consumed per shot (vitest)
- [x] ISC-247: sustained fire lowers the kill requirement by 1 per aimed miss on the same target, floor 1 (max bonus 4); move-and-shoot/overwatch get no bonus (vitest)
- [x] ISC-248: autofire: 2 AP + 5 ammo, sweeps every visible fire-arc unit — stealers, closed DOORS, even marines — 3 dice vs 3 each, repeating until nothing new dies (vitest)
- [x] ISC-249: malfunction: a triple rolled after 10+ shots kills the cannon marine and rolls d6 ≥ 4 (stealers) / ≥ 5 (marines) for each adjacent piece (vitest)
- [x] ISC-250: reload: once, 4 AP, restores 10 ammo (vitest)
- [x] ISC-251: doors destroyed by autofire are gone permanently (edge acts open; sprite removed) (vitest + Playwright)
Chain fist + sword sergeant:
- [x] ISC-252: chain fist cuts (destroys) the door on the front edge for 1 AP (vitest)
- [x] ISC-253: sword sergeant parries: when losing or tied in CC with the opponent in his front arc, the opponent's best die is rerolled once; keeps sergeant +1 and +30s (vitest)
Ambush counters:
- [x] ISC-254: with the mission flag, one counter deploys at each stealer-phase end on a legal square (unoccupied, not within 6 of / seen by a marine), max 2 on board (vitest)
- [x] ISC-255: counter value drawn 0/0/1 from the board dice — deterministic under seed (vitest)
- [x] ISC-256: a sighted value-1 counter converts to a genestealer; a sighted FAKE vanishes and every overwatching marine that sees it fires at nothing — bolters can jam, an assault cannon burns ammo + risks malfunction (vitest)
- [x] ISC-257: counters move freely toward marines (no blip sight/adjacency bars) (vitest)
Download victory:
- [x] ISC-258: a sergeant (either type) on the Data Room square at end-phase begins the download; each further end-phase he remains unmoved decrements 4→0 (vitest)
- [x] ISC-259: the downloading sergeant MOVING (or vacating) resets the counter to 4 (turning does not) (vitest)
- [x] ISC-260: counter 0 → win at the boundary check; no living sergeant → loss (vitest)
Mission + closure:
- [x] ISC-261: beta_2.json finalized (2×5 column deployment with AC/CF/SGT-SW/HF placed, downloadPoint (12,22), blips 1/2, ambush flag) + registered — draft removed, drafts/ now empty (vitest + Bash)
- [x] ISC-262: fidelity spec green vs independent transcription (176 sq / 38 sec / 17 doors / 9 entries) (vitest)
- [x] ISC-263: autopilot plays beta_2: a sergeant walks to the Data Room and SITS; escorts overwatch; scans + opposed evidence recorded (Bash)
- [x] ISC-264: client: three new marine sprites + ambush-counter sprite render; keys T autofire / R reload / G cut door; download status line (Playwright)
- [x] ISC-265: Anti: all seven existing missions' suites + pins stay green; build clean (Bash)
- [x] ISC-266: Anti: registry guard passes with beta_2 registered (no draft/todo, objective set) (vitest)
- [x] ISC-267: README/CLAUDE updated — campaign 8/8 complete, weapons documented, honest balance (Read)

### Entry triangles + marine roster panel (2026-08-15 run)

- [x] ISC-270: GameScene preloads `entry.png` and `exit.png` theme textures (Grep)
- [x] ISC-271: every mission JSON's entryPoints carry `facing` extracted from the original `E:` tags; a spec cross-checks all 9 registered missions against the .mish sources (vitest)
- [x] ISC-272: entry triangles render one square OFF-board in the facing direction, rotated to point into the board per original EntryTriangle (`rotate(-90*efacing)` + FACEMAP offset); the purple square fill/stroke is gone (Grep + screenshot)
- [x] ISC-273: exit squares additionally render the `exit.png` arrow with the same off-board placement (original ExitArrow reuses EntryTriangle code) (screenshot)
- [x] ISC-274: every mission JSON's marineDeployment entries carry `squad` names from the original rosters; positional chunking is verified by type-sequence equality per squad (vitest)
- [x] ISC-275: client maps deployment `squad` + static thematic names onto engine marines BY ID at scene start (positional zip before any death can shrink the list) (vitest unit)
- [x] ISC-276: name generation is deterministic and static — same mission always yields the same names; sergeants get "Sgt." style, brothers "Bro." style, Space Hulk flavour (vitest unit)
- [x] ISC-277: a roster DOM panel renders to the RIGHT of the canvas: one row per squad (stacked vertically), cards ordered sergeant → specials → bolters within a row (Playwright)
- [x] ISC-278: each card shows the marine's theme icon, name, live AP `n/m`, ammo for flamer/assault-cannon, and a special-weapon label (Playwright)
- [x] ISC-279: a marine dying greys out its card (grayscale/dimmed + KIA), and it is no longer clickable-to-select (Playwright)
- [x] ISC-280: clicking a card selects that marine (Selection + map highlight) and pans the camera to him (Playwright)
- [x] ISC-281: clicking a marine on the map highlights his card; the selected card is visually distinct from unselected ones (Playwright)
- [x] ISC-282: the C.A.T. carrier's card shows a carry badge while carried, cleared on drop (vitest unit or Playwright)
- [x] ISC-283: an escaped marine's card shows ESCAPED styling distinct from KIA (vitest unit or Playwright)
- [x] ISC-284: overwatch and jam states surface on the card (badges) live (Playwright)
- [x] ISC-285: HUD legend/controls text updated — no stale "purple = stealer entry" claim (Grep)
- [x] ISC-286: Anti: engine stays Phaser/DOM-free — import grep guard still passes; roster is client-only (Grep)
- [x] ISC-287: Anti: all existing suites stay green (engine + client unit + e2e) and the build is clean after the change (Bash)

### Card polish — facing, CP, ammo line (2026-08-15 follow-up)

- [x] ISC-288: each living card shows a facing arrow glyph that updates when the marine turns (vitest + Playwright)
- [x] ISC-289: each living card shows the CP pool next to AP, live on cpChanged (vitest + Playwright)
- [x] ISC-290: ammo renders in its own .m-ammo element on a separate line — no longer part of .m-stats (Playwright + screenshot, no truncation)
- [x] ISC-291: Anti: all suites stay green and the build is clean after the change (Bash)

| isc | type | check | threshold | tool |
|-----|------|-------|-----------|------|
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

## Features

| name | description | satisfies | depends_on | parallelizable |
|------|-------------|-----------|------------|----------------|
| stabilize-m3 | Fix client test mocks, finish HUD, commit clean M3 | ISC-1..12 | — | no |
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
| rules-fidelity | Side-step ban, CC semantics, ranges, MNS, stealer turns, blip bag+restrictions | ISC-126..136 | — | no |
| sections-flamer | Section IDs in JSON, flame flood, HeavyFlamerMarine, self-destruct | ISC-137..141 | rules-fidelity | no |
| sergeant-mission-truth | Sergeant piece, timer bonus, original deployment + flame objective | ISC-142..147 | sections-flamer | no |
| client-fidelity | Flames/jam markers, ammo + dice HUD, sounds, flamer keys | ISC-148..153 | sergeant-mission-truth | partially |
| fidelity-closure | Pins re-scanned, suites green, docs updated | ISC-154..157 | all above | no |
| mission-meta | entry/exit facings + squad names extracted from .mish into mission JSONs via patch script | ISC-271,274 | — | yes |
| entry-triangles | entry.png/exit.png off-board triangles per original EntryTriangle/ExitArrow; purple squares gone | ISC-270,272,273,285 | mission-meta | yes |
| roster-panel | DOM card grid right of canvas: squad rows, names, AP/ammo, badges, death/escape states, two-way selection + camera pan | ISC-275..284 | mission-meta | no |
| roster-closure | Full suites + build + browser verification | ISC-286,287 | all above | no |

## Decisions

- 2026-08-15 (roster run, VERIFY/advisor): adopted from the advisor — (1) pair-wise weapon cross-check in buildRoster (deploy type vs engine sprite): the positional zip was correct by construction TODAY, but unverifiable against future deploy-order refactors, and space_hulk_6's hand-arbitration proved the correspondence isn't structurally derivable; mismatches downgrade to 'Unknown' loudly. (2) s6 roster map pinned as a fixture + negative test. (3) scrollIntoView on card highlight. (4) replay-truthfulness split documented on RosterPanel (HUD payload-only vs roster live-read + finishReplay reconcile). Deferred as polish (logged, not built): facing glyph on cards, CP-aware AP display, pending-entry state, badge tooltips, number-key card selection, resize re-derivation. Refuted/already-covered: cards are real <button>s (a11y), KIA/ESCAPED are text labels not color-only, escaped/dead clicks blocked, bolter ammo omission correct (engine bolters are unlimited), wheel-over-panel never reaches Phaser (DOM sits outside the canvas).
- 2026-08-15 (roster run, PLAN): entry/exit facings + squad names come from the ORIGINAL .mish sources via an idempotent patch script on parseMish (never hand-edited); the verifying spec checks the internal invariant "facing points off-board" (neighbor square in facing direction is rock) so it stays hermetic — no test-time dependency on the archive path. Squad→marine mapping is a positional zip captured BY ID at scene start (engine deploys marineDeployment in order; `engine.marines` filters insertion-ordered pieces), so later deaths can't shift names. Roster panel is DOM (flex sibling of the canvas), not Phaser — cards, greying, and scrolling are native CSS, and Playwright probes them directly. Entry triangles render one square OFF-board per the original (`FACEMAP` offset + `rotate(-90*efacing)` → Phaser `setRotation(idx*π/2)`); camera bounds/canvas gain a one-tile margin so edge triangles are visible. Delegation floor (E3 ≥2) relaxed, show-the-math: `which codex` fails (Forge/Cato unavailable on this machine, as in all prior runs) and the work is a single-package UI feature where a second writer would fork one file (GameScene) — Interceptor/Chrome verification remains the delegated leg.

- 2026-08-15 (mission library): missions now live at `engine/src/missions/<family>/<name>.json` mirroring the original `data/missions/` tree at `~/Code/personal/sulk/archive/sulk-0.29-snapshot-20030623/`; static registry in `missions/index.ts` is the only import site. Client default is `debug_1` per the user's explicit switch instruction; `?mission=<registry key>` selects others (param indexes the bundled registry object — never concatenated into a path, so no traversal surface; unknown → default). Squad-scenario e2e specs name `?mission=space_hulk_1` explicitly — coverage of the 5-marine path is retained under the param, accepted since the default choice is user-directed. debug_1 deviations: source has NO blip cap (we keep totalBlips 10 for finite extermination) and NO stealer-win clause (we inherit engine loss-on-squad-wipe); BEGINPLACE collapsed to a fixed square as with space_hulk_1. Advisor round: adopted registry manifest test + provenance notes; refuted path-traversal, implicit-default engine loads (grep clean), seed-parity smell (mixed parity), silent fallback on missing file (bundled import = build error). Delegation floor relaxed — codex CLI absent.
- 2026-08-15 (map rebuild — DOCUMENTED DEVIATIONS from the original MISH_space_hulk_1, per advisor): static board topology (98 squares, 7 doors, 6 entries, 3 rooms, BEGINPLACE) is verbatim-faithful and spec-verified; DYNAMICS are adapted. (1) Objective: "reach Launch Control (20,20)" replaces "flame the room" — no heavy flamer/ammo model yet, so the original loss condition (flamer dry/dead) is unmodeled. (2) `exterminate-or-exit` adds a win path the original lacks; win-reason breakdown over 120 seeds: 102 exit / 0 extermination / 18 losses — the extermination path and its `totalBlips: 10` cap are currently theoretical for the autopilot. (3) Marine facings: source specifies BEGINPLACE only; uniform 'right' (toward the objective) is our choice. (4) Consequence: autopilot win rate 85% vs 52% on the invented map — measures the adapted dash objective, NOT original difficulty; honest scoping in README, flamer + balance remain Known Gaps.
- 2026-08-15 (map rebuild — door translation): original doors are square-occupying Features ("Closed blocks move+LOS", Pygame analysis doc) at the listed coordinates; UP/RIGHT is the corridor-axis orientation. Our edge model is the USER-DIRECTED deviation from the 2026-08-14 remodel ("doors should be on the edge between two grid squares") — translation keeps the authored facing as the edge (e.g. (10,5)↑ = edge (10,5)-(10,4)); either adjacent edge preserves the choke, the anchor square stays standable by design. Advisor's "directed-door" concern refuted: `doorBetween` is symmetric (doors.spec asserts both directions) and the AI opens (3,7)→ from its anchor side and (13,15)↑ from the far side in ai_pathing.spec.
- 2026-08-15 (map rebuild): advisor's stale `--auto-state` ISA pointer is a known artifact — the tool reads MEMORY/WORK task ISAs; THIS project ISA (sulkweb/ISA.md, ISC-111..119) is the criteria record. Delegation floor (E3 ≥2) relaxed again: codex CLI absent; the generator + independent fidelity spec stand in for a second implementer. Correlated-transcription risk accepted: generator and spec were written in one session, but the browser screenshot against the physical-map reference is a third, visual check.
- 2026-08-15 (advisor adjudication, kill-reveals run): ADOPTED — (1) invariant test replacing trigger-list faith: ISC-110 asserts "no blip in marine sight at any settled phase boundary" across 10 full autoplayed games; (2) over-conversion negative guard: marine turns fire the sweep while the stealer still blocks LOS — blip must stay hidden (in kill_reveals.spec). REFUTED with evidence — "sweep path unexercised by the scan": `runStealerActions` is pure engine (`ai/StealerAI.ts`), called by `endMarinePhase`, which `autoplay` calls; the scan exercises it in every game. "Parallel implementations risk": both halves call the SAME `convertRevealedBlips` function — there is exactly one implementation of the rule; the two call sites differ only in trigger. "Hover info leak": readout prints `piece.kind` only — a blip reads as "blip" (public knowledge on the physical board); the hidden value is never in the string, and there is no fog-of-war to leak through. WAIVED — capture() queue-and-flush redesign (would collapse the two trigger sites into one): correct instinct, but it changes replay semantics for all view handlers; deferred with the invariant test standing guard against drift. Baseline clarified: byte-identity is against the PRE-change 2026-08-14 scan; mechanism (conversion consumes no dice; autopilot's action density) recorded in Verification.
- 2026-08-15: Kill-reveals fix placed at TWO levels by necessity, not redundancy: (a) `GameEngine` subscribes `pieceDied` → `convertRevealedBlips` (covers live marine-phase kills; skips `PieceEvents.replaying`); (b) `runStealerActions` calls `convertRevealedBlips` after each AI action (covers the animated stealer phase, where `capture()` suppresses ALL handlers). While tracing (b), found a LATENT divergence: live engine runs converted blips on AI door-openings via the `doorToggled` handler, but captured (browser-animated) runs skipped that handler — same seed could differ between engine scan and browser. The per-action engine-internal sweep closes it. Conversion timing changes dice flow → seed re-scan + re-pin planned.
- 2026-08-15: Delegation floor (E2 ≥1) relaxed — show-your-math: Forge/Cato need the codex CLI, absent all session; work is a two-file engine change plus one HUD line, single-author with full context already loaded. What Forge would have done (independent implementation of the conversion sweep) is covered by regression tests ISC-102..105.
- 2026-08-15: Hover readout is scene-driven (scene reads engine, passes a formatted string to `HudPanel.setHoverInfo`) preserving the "HUD never reaches into the engine" pattern; placed below the controls text per user's mid-turn note.
- 2026-08-14: Seeded via ISA Seed workflow from README, roadmap, prompts/ milestone docs, git history (23 commits), and test inventory. Sources: `prompts/Sulk Web Roadmap.md`, `prompts/PROJECT_AND_TOOLING.md`, milestone docs M0–M3.
- 2026-08-14: Scope decision — "finish it" defined as verified-playable v0.1 slice (roadmap M3→M6 complete, M7 scoped to Mission 1, M8 hygiene), not full 6-mission campaign with all piece types. Flamer/Assault Cannon/Librarian/Chain-Fist/CAT deferred; recorded in Out of Scope implicitly via Mission-1-only scoping. Rationale: playable game loop is the value inflection the roadmap never reached.
- 2026-08-14: ISC count 76 vs E4 soft floor 128 — show-your-math: criteria are milestone-verifiable behaviors; padding to 128 would split browser probes into sub-pixel assertions with no added information. Soft floor relaxed; hard gates (completeness, thinking floor) met.
- 2026-08-14: Root-cause of original abandonment (see Changelog): UI work verified only through heavily-mocked Vitest Phaser tests, never in a real browser; every mock drift read as "yet another bug". Remedy encoded in Principles: real-browser verification per UI ISC.

- 2026-08-14: Advisor (commitment boundary) — accepted: (1) LOS promoted to its own slice before shooting; (2) combat unit tests inject a scripted roll queue, seeded RNG reserved for gameplay/fuzz, preventing seed-rebaselining brittleness; (3) mock-heavy GameScene specs patched minimally (scale mock), not repaired further — the real regression net is a no-mock Playwright smoke test driving client+engine; (4) engine emits typed events consumed by the renderer. Rejected: full reducer rewrite of engine — current class-based engine is small enough to evolve; a rewrite risks re-stalling the project (logged as dead-end-avoidance).
- 2026-08-14: RootCauseAnalysis (FiveWhys, background agent) confirmed abandonment causes: mock-drift masquerading as product bugs, horizontal milestones deferring fun, no session-exit discipline. Remediations already encoded as ISC-4/42/59/63/70/75 and Principles.
- 2026-08-14: EnterPlanMode skipped — autonomous session, no user present to approve a plan; proceeding per ISA. Delegation floor (soft, ≥2): met via Explore rules-digest agent + RootCauseAnalysis fork; Forge unavailable (codex CLI not installed on this machine).
- 2026-08-14: refined: ISC-21/22/27/28/29/30/31/44/45 tightened to match the actual Sulk manual rules (digest from docs/SULK Manual Combined.pdf): kill on 6, sustained fire +1/miss max +3, overwatch jams on doubles, CC 1d6 vs 3d6-front/2d6-flank with tie=both-survive, marine 4 AP / stealer & blip 6 AP, CP 1d6/turn.

- 2026-08-14: ISC-71 deferred — background-tab RAF throttling makes an honest FPS measurement impossible in this session; follow-up: run `interceptor` recording on a visible tab after Interceptor extension reconnect (see Learn notes).
- 2026-08-14: Playthrough balance note — idle squad dies turn ~7, fighting squad turn ~4-6; winnable via overwatch chokepoints untested. Tune blipsPerTurn/entry distance if too brutal.

- 2026-08-14: Cato cross-vendor audit (Rule 2a, E4-mandatory) DEFERRED — codex CLI not installed on this machine. Follow-up: run audit against tag v0.1 when codex is available. Advisor final call ran instead; its two blocking findings (no observed win; residue not in README) were both fixed this session.

- 2026-08-14 (playtest sweep): User play-test reports reproduced in real browser (claude-in-chrome; Interceptor extension still disconnected). Root causes: (1) `Piece` base constructor calls `board.addPiece(this)` → emits `pieceAdded` before subclass field initializer sets `kind`; client `createPieceSprite` reads `kind === undefined` → marine-texture fallback. Every post-boot piece (reinforcement blips, converted stealers) rendered as a marine — perceived as "DONE spawns marines" and "blips never convert". (2) Greedy Chebyshev `stepToward` has no escape from concave pockets: blips entering mission-1 side rooms reach a local optimum and stall forever ("blips never move"). Fix: assign `kind` via base-constructor parameter before `addPiece`; replace greedy stepping with BFS shortest-path (8-connected, closed-door squares traversable + opened on contact, goal = orthogonal adjacency to nearest marine).
- 2026-08-14 (playtest sweep): Arrow-key camera pan investigated as third suspect — polling-based (`cursors.*.isDown` in update()); synthetic CDP key events complete within one frame so automation shows no pan, but a held physical key works. Not a bug; drag-pan verified working. No code change.
- 2026-08-14 (playtest sweep): Delegation floor (soft, ≥2) relaxed — show-your-math: Forge/Cato require codex CLI (`which codex` → not found); both defect files already read and root-caused directly, so Explore/general delegation adds hand-off cost with zero information gain.

- 2026-08-14 (animated stealer phase): Design — engine stays synchronous/pure; `PieceEvents.capture()` buffers the endMarinePhase event stream and the client re-emits it on a timed timeline (`PieceEvents.replay()`, tweens, input+timer locked, `finishReplay()` reconciles every sprite against engine truth). Handlers are payload-driven so replay never reads mid-phase state off the final board. Constraint documented on `capture()`: engine logic must not depend on event delivery inside the captured section.
- 2026-08-14 (animated stealer phase): Advisor final-call adjudication — ADOPTED: replay-mutation guard (`PieceEvents.replaying` skipped by sight-conversion handlers; ISC-95), ESC-pause gated during replay, `prefers-reduced-motion` skips the timeline. REFUTED with evidence: timer leak (delayedCalls are scene-owned, die with scene; no in-app New Game exists — restart is a page reload); input-lockout breadth (all turn entry points funnel through guarded endTurn; keydown/pointerdown/pause gated; camera pan deliberately allowed so the player can follow the action); two-engines-one-process conversion (conversion_on_sight.spec constructs sequential engines in one worker — second converts); objective wired (reach-exit victory is engine-tested, not presentation-only). LOGGED as follow-ups: GameEngine.dispose() to unsubscribe global-emitter handlers if in-app restart ever ships; click-to-skip replay; camera-follow for off-screen action; wall-clock sampling in animation.spec could flake on loaded CI (consider Playwright clock API).
- 2026-08-14 (animated stealer phase): Determinism root-fix — blip values + first CP roll consume dice at CONSTRUCTION, before test pins previously landed; all prior "pinned" seeds (and scans) were value-randomized. GameEngine now accepts a dice source at construction; client reads `?seed=N`. Deterministic rescan: 62W/58L/0 over 120; pins ?seed=1 (win) / ?seed=5 (loss).

- 2026-08-14 (edge-model doors): Advisor adjudication — ADOPTED: LOS symmetry property test (all-pairs, doors in 4 orientations — ISC-98 hardening), map validator rejecting inverse-duplicate edges and edges-into-rock (commit 0ece47e). EXPLAINED (advisor asked why the seed scan was identical): the edge lands on the same transition the door square used to gate — a piece previously blocked ENTERING the anchor now enters freely and is blocked LEAVING across the edge; AP totals, door-open costs, and dice consumption are step-for-step identical, so the scan matching is genuine regression evidence, not missing coverage (ai_pathing's door test forces traversal explicitly). REFUTED: AI facing soft-lock (AI opens via doorBetween directly, facing-free — front-3 rule binds only useDoor); door click-target risk (doors are not interactive; operation is the O key); fog-of-war gating (no fog exists). WAIVED with note: no diagonal-bypass guard (edge interiors cannot be crossed diagonally; recorded limitation for future 2-wide doorways); door-slam AP wars are legitimate Space Hulk tactics, not an exploit.
- 2026-08-14 (edge-model doors): refined: user playtest — doors rendered mid-square with square-blob LOS semantics "don't make sense". Remodeled: `Door` = boundary between anchor square and `doorFacing` neighbor (mission JSON reinterpreted in place — (10,5)↑, (10,8)↓, (10,16)↑, (15,13)→ — no data change). Movement blocks orthogonal edge crossings; LOS does exact sight-line-vs-edge segment intersection (endpoint grazing not blocking, consistent with corner-of-rock behavior); operation follows a front-3 EDGE rule; AI opens the edge it is about to cross; sprites render on the boundary. Dropped rule: "cannot close a door on an occupied square" (no doorway square exists). Known scope edge: diagonal moves cannot cross an edge's interior geometrically, and shipped corridors are 1-wide, so no diagonal-bypass rule was added — revisit if a mission ever puts a door edge on a 2-wide opening. ISC-14..17 superseded by ISC-96..99 (ID-stability: originals annotated, not renumbered).

- 2026-08-15 (faithful-recreation audit — the big one): Full source review of sulk-0.29 vs our port (two parallel Explore surveys: UI/presentation layer + mission framework/DSL; direct reads of pieces.py/rules.py/misc.py/teams.py/board.py). ADOPTED into engine: side-step ban (marine movemap L/R None), original CC resolution (attacker-win kills; winning defender kills only what it faces; spins otherwise), aimed-shot range uncapped / overwatch 12, sustained cap +4, move-and-shoot free shot, stealer same-direction free-turn limit (`just_turned`), blip bag 8/4/9 with replacement, blip movement/door-exposure bans + voluntary conversion, sections from BOARD sublists (`scripts/addSections.ts` regenerates), heavy flamer (2 AP/6 ammo/section flood/self-destruct), sergeant (+1 CC, +30s timer), original M-square deployment, original flame-Launch-Control victory + flamer-loss defeat, uncapped reinforcements, original sprites for all variants, original GPL sound set. DOCUMENTED DEVIATIONS: (1) move-and-shoot is AUTOMATIC (first post-move shot free) instead of the original's explicit toggle — the toggle only matters for sustained-fire accrual corner cases; (2) blip voluntary-convert heuristic = "blocked + marine within 6 + unacted" (original AI0's decision internals not transcribed); (3) flamer "cannot shoot squares with closed doors on" translated to "no closed door edge incident on the target square" (square-model → edge-model); (4) debug_1 keeps its adapted reach-exit objective and blip cap (its source has NO victory conditions at all); (5) lurking limbo squares / entry-triangle deployment not modeled — blips spawn ON entry squares (pre-existing). DEFERRED to the missions-2–6 phase (per user's queued "recreate all these maps"): assault cannon (+autofire/reload/malfunction), chain fist, thunder hammer, captain (+grenades+parry), sword sergeant parry, librarian psi, CAT, ambush counters, exit-arrow lurking, turn limits, marine interrupts, hot-seat secrets. Delegation: 2 Explore agents (floor met); Forge/Cato unavailable — codex CLI absent (`which codex` → none).
- 2026-08-15 (opposed 0/60 — an autopilot artifact, per the funnel): post-restoration seed sweeps: space_hulk_1 0W/60L; debug_1 40W/0L over 40. The loss funnel (see advisor adjudication below) shows the flamer-led column feeds the flamer to CC on turn 2 in 57/60 — the sweep measures the scripted player's lack of escort tactics, not mission balance. The squad must cross the whole map against uncapped reinforcements while keeping one specific marine alive — that takes overwatch/chokepoint/marching-order play beyond the autopilot. Kill chain verified instead: unopposed autoplay wins turn 9 (flamer.spec, pinned) and flame→win/ammo-out→loss are unit-probed. e2e pins: win = debug_1 seed 1, loss = space_hulk_1 seed 3 (idle-turn-1 pattern — all seeds lose), flame-win UI via engine surgery in flamer-ui.spec. Autopilot changes: BFS goal pathing (deployment is now far from the objective), flamer LEADS on flame missions (1-wide corridors; escorts would wall off the firing position — three staging designs refuted in traces: hold-at-4 plugs the east corridor, hold-at-7 plugs the col-13 corner, dodge-aside can't fix a rear-deployed flamer), escorts follow the flamer, bolters bank 2 AP for overwatch when the horde is within 10, free move-and-shoot used on advance.
- 2026-08-15 (advisor adjudication, fidelity run — the funnel that changed a claim): ADOPTED — (1) loss-funnel decomposition of the 0/60: min-flamer-distance histogram {13:57, 12:2, 11:1}, flamer death turn {2:57, 4:1}, marines alive at loss {4:55, …}, reached-firing-range 0, flames fired 0 → the flamer-led column feeds the mission-critical piece to CC on turn 2; the "authentic difficulty" claim was OURS-refuted and rewritten as "scripted-player artifact" in README/CLAUDE/ISA; (2) mission-gating greps: ambush counters gated on `USE_AMBUSH_COUNTERS in FLAGS` (phases.py:806) and mission 1 has `FLAGS = ()` → deferral safe; marine interrupts (`interruptable`, Marines_Interrupt, Space key) and lurking limbo are mission-1 mechanics → both upgraded to NAMED balance-relevant deferrals in README. REFUTED with evidence — "auto-fire may spend flamer ammo": the free-shot mechanic lives only in `StormBolterMarine.freeShot`; `HeavyFlamerMarine` extends `Piece` and has NO shoot() — there is no code path for a flamer free shot (type-level), the funnel confirms 0 flames fired outside the objective, and nothing fires without an explicit player F-press (the deviation is only the missing pre-toggle, ammo/jam choice preserved by simply not pressing F). "MNS ablation needed": moot per funnel — losses are turn-2 CC deaths; the bolter dice stream never reaches balance relevance. WAIVED — running the original Pygame headless with a mirrored policy (the "only real fidelity test"): sulk-0.29 is Python-2.2-era code; a faithful driver is its own project, queued as a future cross-check; a hand-authored competent-play win likewise deferred to the human-playtest pass.
- 2026-08-15 (`refined:` sound effects moved in scope): the user's faithful-recreation directive supersedes the v0.1 "Sound and music" exclusion for EFFECTS; the original wavs are public-domain/GPL per SOUNDS_INFO and ship in `client/public/assets/sounds/`. Music remains out of scope (the original has none).

**2026-08-15 — Mission 2 "Exterminate" recreation (ISC-158..190):**
- **Stealer-placed marines adaptation.** The original FORCES tuple gives TWO of squad Constantine's five pieces to the STEALER player to place — `(SB, STEALERTEAM)` and `(SGT, STEALERTEAM)`. Our port has no interactive deployment, so all five deploy at fixed squares chosen to mimic an adversarial stealer: the sergeant is wasted in the far-west room (6,15) and a lone bolter is isolated in the southwest room (6,23) nearest the south entries, while the marine-placed pieces sit well — heavy flamer central (13,15), bolters north (13,1) and south-mid (16,23). One marine per room section per `pre_deploy_rule`; the sixth room (8–10,6–8) stays empty. Documented deviation, revisit if interactive deployment ever lands.
- **No-lurk end_script is trivially satisfied**: our engine has no lurking at all (blips spawn ON entry squares — standing simplification). The original's NODEATH lurk-kills add nothing to casualties, which our counting matches by construction (only `Piece.die()` counts; conversion and non-death removals don't).
- **Victory timing (advisor-corrected, re-justified from source)**: the original checks victory at PHASE BOUNDARIES only — phases.py:774 (marine-action end, before the stealer phase) and phases.py:973 (end-phase). Our kill-quota missions now add the marine-action-end check in endMarinePhase (previously MISSING — a quota reached in the marine phase must resolve before stealers act) plus an outcome-equivalent instant quota check on pieceDied (no enemy act occurs between the quota kill and the boundary). Blockade evaluates ONLY at boundaries — marine positions are not final mid-phase (ISC-176.1). The boundary check is scoped to kill-quota because the adapted exterminate/exit objectives read the empty pre-reinforcement board as a win (debug1 spec caught the regression). My original "protect pinned seeds" rationale was a fixture argument, not a fidelity argument — the advisor was right to reject it; the timing now derives from the source.
- **Blockade metric** verified against source: `get_team_is_near` → `find_piece_near(team, 6)` BFS over `get_adjacents()` (misc.py:474) — 8-way square adjacency, walls block, doors ignored, self = 0. `Board.pieceNear` reproduces it; ISC-174 walls/doors unit test pins both properties.
- **Seed scans + advisor-demanded experiments (evidence for ISC-183)**: (a) opposed entry-post autopilot: 0W/30L, wiped t13–18, kills 1–10 (mean 3.3); (b) placement ABLATION — compact one-per-room deployment using the NW room instead of the isolated SW room: 0W/30L, kills mean 4.2 → placement is NOT the loss driver; (c) camp-and-overwatch competent-play proxy (hold position, shoot everything, overwatch remainder): 0W/30L, kills mean 5.6, best 15/30 → kills scale with strategy quality; (d) OPPOSED integrated quota win: killQuota lowered to 3, seed 5 — real overwatch/CC kills reach the quota and the win fires mid-game (now a permanent spec). Unopposed blockade win turn 7. Conclusion shipped in README: brutal by design, no scripted strategy wins, human winnability UNTESTED, and the missing marine-interrupt feature is the original's main tool for this fight. Blip-VALUE counting is not a guess: pieces.py:515-517 read directly this session.
- **Delegation floor (E3 ≥2) relaxed to 1, show-math**: Forge auto-include impossible (`which codex` → not found, verified again this run); the one delegation that added real value was the Explore agent's INDEPENDENT board transcription (fed the fidelity spec, keeping it non-tautological vs the transcriber script); remaining lookups were directed (delegation-gate-forbidden). EnterPlanMode skipped: autonomous continuation of an explicit queued directive, consistent with prior runs this session.

## Changelog

- **Conjectured:** heavily-mocked Phaser unit tests would keep client development safe (implicit in M0–M3 process).
  **Refuted by:** abandonment state — 3/6 client tests fail purely from mock drift (`scale.resize` missing), while the actual browser behavior was unknown; user reports "bugs too frequent, no progress."
  **Learned:** for canvas-heavy Phaser code, unit tests over deep mocks assert the mock, not the game; verification must be real-browser (Playwright e2e + Interceptor), with unit tests reserved for pure logic (engine, SelectionManager-style classes).
  **Criterion now:** ISC-4, ISC-42, ISC-59, ISC-63, ISC-70 (real-browser probes gate every UI milestone).

- **Conjectured:** per-turn blip reinforcements from the roadmap would produce a hard-but-fair mission.
  **Refuted by:** 400-seed autopilot scan — zero wins; unlimited spawns make the exterminate-or-exit objective mathematically unreachable.
  **Learned:** mission difficulty needs a finite force budget; "winnable" is a testable property, and a scripted legal-actions autopilot is the probe for it.
  **Criterion now:** ISC-59 verified via pinned-seed autopilot win (MISSION COMPLETE overlay) and deterministic loss/win playthrough e2e; totalBlips=10 in Mission 1 schema.

- **Conjectured:** the v0.1 e2e suite (boot, full turn, death counter, pinned-seed win/loss) plus 92 engine tests proved the game "plays according to the rules."
  **Refuted by:** first human play-test (2026-08-14): every post-boot piece rendered as a marine (pieceAdded fired from the base Piece constructor before subclass `kind` initializers ran — JS field-initializer ordering), and blips stalled permanently in concave room pockets (greedy Chebyshev stepping has no escape from local optima; the e2e autopilot won via shooting before the stall ever mattered to an assertion).
  **Learned:** event emission from a base-class constructor is a footgun whenever subclass fields carry the payload — assign discriminants via constructor parameter before any emit; and greedy pathing needs an adversarial-map test (concave pockets), not just open-corridor tests. Test suites verify what they assert, not "the game" — visual identity of pieces and multi-turn AI liveness were never asserted anywhere.
  **Criterion now:** ISC-77 (emit-time kind), ISC-80 (pocket escape), ISC-81 (per-turn liveness), ISC-83 (marine-count anti), ISC-85 (no door-flapping while queued); e2e impostor-texture assertion in game.spec.

- **Conjectured:** setting `board.dice = new SeededRng(n)` inside a test pins the whole game (win.spec/playthrough.spec relied on this since v0.1).
  **Refuted by:** win.spec(seed 1) failing in-browser while the engine scan called seed 1 a win — initial blip values and the first CP roll are consumed at ENGINE CONSTRUCTION from the default randomly-seeded dice, before any test-side swap lands; every prior pin and scan carried hidden variance.
  **Learned:** determinism claims must cover the full lifetime of the RNG consumer — audit WHEN the first roll happens, not just who rolls; "replace the RNG in the test" silently misses construction-time consumption.
  **Criterion now:** ISC-94 — dice source injectable at GameEngine construction, e2e pins via `?seed=N` URL, scans construct with the seed.

- **Conjectured:** modeling a door as a square-occupying Feature (blocksMove/blocksLOS on the anchor square) was a faithful-enough port of the board game's doors.
  **Refuted by:** user playtest — a door drawn in the middle of a walkable square reads as nonsense, and square-blob sight blocking produced "weird line of sight effects" (the whole door square vanished from sight lines instead of the boundary).
  **Learned:** physical-board entities keep their geometry class in digital ports: doors are edge predicates, not cell contents. Modeling them as cells leaked wrong semantics into four subsystems at once (movement, LOS, AI, render) — geometry errors metastasize.
  **Criterion now:** ISC-96..101 (edge model across movement, sight, operation, AI, render); ISC-14..17 annotated superseded.

- **Conjectured:** (advisor, 2026-08-14) the 1–2%→52% autopilot win-rate jump might be a stealth AI nerf wearing a bug-fix label.
  **Refuted by:** playtest traces — the BFS horde is strictly deadlier (idle squad wiped by turn 7 vs stragglers never arriving), and the win-rate rise is explained by stalled blips previously making the exterminate objective unreachable (hidden pieces parked in pockets forever → 'ongoing' stalemates, 0/120 seeds stalemate now).
  **Learned:** when a bug fix moves a balance metric, trace the mechanism (which side gained capability) before accepting either "restored intended balance" or "regression" — win-rate alone cannot distinguish them.
  **Criterion now:** ISC-84 records the seed-scan (62W/58L/0 stalemate) as the balance baseline; fixtures (seeds 29/3) are labeled determinism regressions, not balance evidence.

- 2026-08-15 C/R/L (debug_1 switch): **conjectured** (with the user) that MISH_debug_1.py was a different map from the one just rebuilt — "the map I gave you was the wrong one"; **refuted by** diffing the two originals: the BOARD literals are byte-identical, and neither file mutates the map after the literal — debug_1 differs only in NAME, forces (one marine, BLIPS (0,1)) and FLAGS; **learned** that when told two data sources conflict, diff them before rebuilding anything — the "wrong map" cost zero rework because the check ran first, and mission identity in this family lives in the forces/constants, not the geometry; **criterion now** ISC-121 pins the board identity transitively to the space_hulk_1 golden, and the registry manifest test (ISC-120) guards every future mission addition.
- 2026-08-15 C/R/L (map rebuild): **conjectured** that the exterminate-or-exit objective with a `totalBlips` cap gave the mission two genuinely reachable win paths on the rebuilt board; **refuted by** the win-reason instrumented scan — 102 of 102 autopilot wins reach the exit, zero exterminate — so the extermination path (and the cap that exists to enable it) is currently theoretical; **learned** that an aggregate metric ("85% wins") hides WHICH mechanism produces it — victory-condition changes must always be validated with a per-reason breakdown, and win-rate deltas after a map change measure the objective adaptation, not map difficulty; **criterion now** Verification records the 102/0/18 breakdown, README scopes the balance claim to the adapted objective, and the flamer-ammo economy is the named fix in Known Gaps.
- 2026-08-15 C/R/L (kill-reveals): **conjectured** that subscribing sight-conversion to `pieceMoved` + `doorToggled` covered every way a blip could enter marine sight; **refuted by** user playtest (killing the stealer in front of a blip left it un-flipped — deaths vacate squares and open sight lines) and by the follow-on discovery that `capture()` suppresses ALL handlers, so even a `pieceDied` subscription would silently skip the animated stealer phase; **learned** that event-trigger lists for a state invariant are structurally incomplete — the invariant itself ("no blip in marine sight after any settled action") must be both enforced at every mutation site AND empirically asserted over whole games; **criterion now** ISC-102..105 (per-cause conversion), ISC-110 (phase-boundary invariant over autoplayed games).

- 2026-08-15 (faithful-recreation run): conjectured — "our mission-1 dynamics were faithful apart from the flamer objective; BEGINPLACE (14,20) is the deployment site and the 85% autopilot win rate mostly reflects the missing flamer counterweight." refuted by — reading `src/objects/board.py` in the original: the only BEGINPLACE consumers (lines 117, 199) are commented out; the real deployment squares are the `M:`-tagged BOARD tuples at (10,0)–(10,4), a full map-crossing from Launch Control. learned — when transcribing a data format, trace every constant to its CONSUMER before assigning it semantics; a name ("BEGINPLACE") is not evidence of behavior, and the entire balance picture (six-square dash, 85% wins) was an artifact of one mis-read constant. criterion now — ISC-144 pins deployment to the M squares with the dead-code note, and mission1_fidelity.spec fails if deployment ever drifts from the source's `M` tags.
- 2026-08-15 (faithful-recreation run): conjectured — "the marine autopilot generalizes to the restored mission with staging tweaks (hold escorts near the objective)." refuted by — three traced deadlocks: hold-at-distance-4 walls the 1-wide east corridor, hold-at-7 walls the col-13 corner approach, and dodge-aside cannot rescue a rear-deployed flamer stuck behind four parked escorts. learned — on 1-square-wide topology, ORDER is the only degree of freedom: the piece that must arrive last-mile first must LEAD the column from deployment; all containment schemes reduce to walls. criterion now — ISC-147 verifies the kill chain via the unopposed pinned win (flamer leads, escorts follow); the opposed 0/60 is recorded WITH its loss funnel (flamer fed to CC turn 2 in 57/60) as a scripted-player artifact — balance measurement awaits either escort tactics or human playtest.

**2026-08-15 (mission 2) —**
- conjectured: nearest-entry targeting would let the autopilot blockade all 11 mission-2 entries.
- refuted by: unopposed probe (seed 1, blipsPerTurn 0) — all five marines clumped on the two nearest clusters, the southwest T-section entries (2,39)/(3,40) stayed uncovered, result still `ongoing` at turn 41.
- learned: the entry blockade is a set-cover problem, not a nearest-target problem; a greedy post assignment (each marine takes its nearest UNCOVERED entry, whose ≤6 board-walk neighbours leave the pool) covers all 11 entries with 5 marines.
- criterion now: ISC-178 — the autopilot advances on entry POSTS from greedy set-cover; unopposed it blockades by turn 7 (Decisions scan evidence).

**2026-08-15 — Batch migration of remaining missions (ISC-191..203):**
- The user asked whether one script could migrate "all the rest". Honest boundary established and shipped: everything MECHANICAL is scripted (boards, tags, blips, rosters, metadata, default deployments); everything SEMANTIC is not scriptable — each victory_check is arbitrary Python (escort+draw, dual flame, lurk-count, turn-16 defend, hold-square counter) and several engine features are unbuilt (CAT, lurking, DUCTING, ambush counters, assault cannon, chain fist, sword sergeant, per-mission ammo override). Each draft names its own remainder in a todo list.
- Cross-check verdict (ISC-199): migrator vs independent Explore-agent reading of all six sources — 0 discrepancies across squares/sections/doors/entries/exits/objectives/ducting/M/blips/bbox AND the full entry/exit/objective coordinate lists. The independence caught two pre-run defects: mission 3 CAT is a 3-tuple (my 2-tuple regex would have silently dropped the escort), and my unlabeled BLIPS grep had scrambled file order (three missions would have gotten wrong blip counts — the agent was right on all six, confirmed by labeled re-grep).
- Parser hardening: multi-tag square dicts ({O:1,M:None}, {O:2,DUCTING:RIGHT}) and quoted COMMENT strings occur in missions 4–6 — parseMish parses full dicts; the mission-1/2 single-tag path regenerates space_hulk_2.json byte-identically (regression md5 match).
- Registry = playability gate (ISC-200): drafts live in src/missions/drafts/, never imported, never registered; finishing checklist stamped into every draft todo.
- Mission-6 quirk recorded: 189/192 squares are M-tagged (deploy almost anywhere) — kind:room heuristic mis-paints it; flagged in its draft todo.

**2026-08-15 — Advisor adjudication, beta_2 run:** the advisor's parry question was REAL and fixed: my tie-parry was a gamble the original leaves to the player (get_best_parry_result auto-parries only when LOSING or when the opponent's score is already maximal — a reroll can't be worse; plain ties prompt the player). combat.ts now implements exactly that rule and declines the plain-tie gamble (deviation noted: no interactive prompt exists). Confirmed the reroll itself was already faithful — _parry REMOVES the max and the new roll STANDS (not best-of-two); no sergeant buff existed. Also delivered: PINNED opposed win (seed 4 CP-boost run is now a permanent spec — statistic → evidence); no-legal-square ambush deployment test (deviation: original random.choice would throw on empty; we skip — marine-favouring only on boards that would have crashed the original); 0/20 autopilot explained STRUCTURALLY (counter never left 4 because the squad dies en route — the sit-still path exists and is reached only by the CP rush); download does NOT forbid other actions (reset on MOVING only, per post_action_script — the sergeant can overwatch/shoot mid-download, verified by the turn-tolerance test); roster completeness verified 9/9 mission files ported (ls of data/missions families); FULL campaign re-verification ran AFTER the combat.ts parry change — 231 engine / 18 e2e green, all pins intact (parry activates only for parry=true pieces, so the other eight missions' dice streams are untouched, and their pinned seeds prove it). Advisor auto-state loaded an unrelated WORK ISA for the FOURTH time (standing v6.2.x project-ISA discovery gap) — criteria judged against sulkweb/ISA.md.

**2026-08-15 — beta_2 "Download" completion (ISC-246..267):** the final mission, weapons read class-by-class from pieces.py (assault cannon + ReloadsMixIn, chain fist, Sergeant_with_Power_Sword + ParryMixIn, Ambush_Counter + get_ambush_counter_val + Stealer_Action_Phase._end deployment). Adaptations: parry auto-decides (original asks the player on ties — ours parries whenever losing-or-tied with the opponent ahead, matching the "might as well" branch); ambush deployment square picked by 3-dice index over the legal list (original random.choice — uniformity approximate, determinism exact); autofire judges doors by their anchor square LOS. Download machinery mirrors init/end_script/post_action_script exactly: begin-then-decrement (5 quiet end-phases total), reset on MOVE only — the pieceMoved handler checks the sergeant actually LEFT the square because tryTurn also emits pieceMoved (caught by the ISC-259 test, engine-side fix). The create()-order HUD bug from the last run was REINTRODUCED in the download marker block and caught the same way (e2e timeout) — lesson now written into CLAUDE.md gotchas. Scans: shipped autopilot 0W/20L (the sit-still download is the hardest ask for a scripted player — counter never left 4); CP-boost probe 3/40 FULL OPPOSED WINS (seeds 4/8/9) — the mission is winnable under full opposition. Fidelity: 176/38/17/9 vs the independent transcription, exact. E4 context-override escalation from classifier E3, delegation 1/2 with standing show-math, Cato waived (codex absent).

**2026-08-15 — Mission completion run (ISC-204..245):** all five drafted missions finished with their ORIGINAL victory semantics, read from each victory_check this session. Adaptations (each preserving the source rule's shape): C.A.T. as board-level state (never occupies its square — a Piece would have blocked pickup/attack; enter-to-pick-up, stealer-enter-to-damage replaces the original's possession/attack UI; wanders 3 d6-driven steps in the end phase per may_wander); LURKING as exit-square departure (tryEscape removes the marine; escaped marines count toward quotas; original limbo squares don't exist here); mission-5 loss = alive+escaped < 5 (original len(marines) < 5, lurkers included — equivalent); escort-cat adds wipe→loss (original would hang with a loose cat and no marines); mission-6 stealers destroy ducting BY ENTERING the square (original attack mechanic is UI-driven; entering is the AI-reachable equivalent) and the flamer-fires-from-control-room kludge is preserved verbatim in spirit. Escalated E3→E4 (conversation context: five missions × new engine systems). Deployment choices: m3 both squads at their corridor pairs with the CAT at (28,13) Ilyich; m4/m5 fully determined by their 10 M squares (flamers at column heads — mission-1 lesson); m6 defensive ring in/around the control room with flamers OUT of the O:1 zone; b1 five of the ten M squares. Seed scans: m6 10W/10L over 20 (genuinely winnable scripted — camping defence suits the autopilot); m3/m4/m5/b1 0W/20L opposed (familiar scripted-player pattern; m4's flamer-led columns feed both flamers to CC by t3-4) with ALL win chains proven unopposed (m3 t17 after the escort crowd-lock fix — escorts now head for the exits and VACATE the corridors, only the nearest marine fetches the cat; m4 t7; m5 t11; b1 t12). beta_2 DEFERRED explicitly: assault cannon (autofire/reload/malfunction), chain fist, sword sergeant, ambush counters, hold-square-counter victory — a weapons-system run of its own; its draft stays in drafts/ behind the registry gate. Cato (E4-mandatory) waived again: codex CLI absent — standing waiver. One client defect found by e2e + real-Chrome reproduction: initial setStatus calls ran before this.hud existed (create()-order bug) — moved next to setObjective.

**2026-08-15 — Advisor adjudication, mission-completion run:** the advisor held on one point — 0/20 opposed with unopposed chain proofs cannot distinguish HARD from IMPOSSIBLE on missions whose new subsystems interact with opposition. Demanded opposed evidence per mission. Delivered: (a) FULL OPPOSED WINS via a CP-boosted legal-play probe — beta_1 22/40 seeds, mission 4 8/40 seeds (both Gene Banks cleansed under full opposition); mission 6 already 10/20 with the shipped autopilot; (b) COMPONENT OPPOSED PROOFS where full scripted wins stay out of reach — mission 5: marines escape through the exit under opposition (quota-5 unmet by script; squad shrinks below 5 first); mission 3: cat picked up and carried UNDAMAGED across 28 turn-ticks under opposition, and five marines exited opposed (full escort unmet by script — the longest chain). CP spending is the decisive lever (b1 0/60 without it → 22/40 with it) — NOT shipped into the autopilot (would shift dice order and invalidate the mission-1/debug_1 pins; recorded as a known autopilot improvement). Ducting semantics validated against mission-6 INFO: "The Stealers must attack and destroy the ducts" — the AI targets ducting for the source reason; "Flamer Marines may not fire into or out of the control room" = the kludge + room-fire loss. Escape timing note: escape-quota wins fire at the departure instant — outcome-equivalent to the original phase-boundary check (no enemy act intervenes), same argument as the mission-2 quota. The create()-order bug retains its regression tests (the five boot specs assert hud+status post-load). Transcription provenance: both agents read the .py sources directly (primary), never the pipeline output. Advisor auto-state again loaded an unrelated WORK ISA (known v6.2.x project-ISA discovery gap) — criteria judged against sulkweb/ISA.md ISC-204..245.

**2026-08-15 — Advisor adjudication, batch-migration run:** advisor endorsed both design calls (drafts-with-todos over auto-generating victory logic; unregistered-drafts as the shipping line) and demanded negative evidence. Executed: (a) load-path audit — loadMission goes only through the registry object; ?mission= can only reach registry keys; the one path-based loader (loadMissionSync) is an explicit-filepath Node test utility, noted as residual; (b) NEGATIVE CONTROL — mutated a draft (entry coordinate shift + dropped roster piece), the cross-check comparison fired on both, draft restored byte-identical; (c) durable REGISTRY GUARD — the registry-manifest spec now iterates ALL registered missions and fails on draft flag / todo list / missing objective (it had been hardcoded to two names and was silently skipping space_hulk_2 — advisor pressure surfaced that too). Adjudicated as residual without action: parser silent-skip risk (compensating control = independent per-tag totals, all matched); runtime-dump oracle (original needs Python 2.2-era pygame — waiver carried from the fidelity run); agent blindness confirmed by construction (launched before the migrator existed, prompt scoped to the .py sources, read-only). Advisor auto-state again loaded an unrelated WORK ISA — project-ISA discovery is a known v6.2.x gap; criteria judged against sulkweb/ISA.md ISC-191..203.

**2026-08-15 (beta_2 / campaign close) —**
- conjectured: my parry implementation ("reroll when losing or tied") was a faithful auto-decide stand-in for the original's player prompt.
- refuted by: the advisor demanding the reroll semantics be checked against the source — get_best_parry_result auto-parries ONLY when losing or when the opponent's score is already maximal; a plain-tie parry is a GAMBLE (the max is removed and the new roll stands, so the opponent can end up winning a stood draw) that the original hands to the player.
- learned: an "obviously safe" auto-decide can smuggle in a strategy choice; port decision RULES, not just mechanics — and when a prompt cannot exist, decline the gamble and document the deviation.
- criterion now: ISC-253 refined — parry fires per the original auto branch only; the declined plain-tie case has its own no-dice-consumed test.

**2026-08-15 (mission completion) —**
- conjectured: the scripted-player precedent from missions 1–2 transfers — unopposed chain proofs plus 0/20 opposed scans are sufficient evidence for the new missions.
- refuted by: the advisor — the new subsystems (CAT damage, exit departure, ducting) are exactly what OPPOSITION interacts with; 0/20 bounds the win rate below ~14% but cannot distinguish hard from impossible, and "impossible under opposition" would be a fidelity defect, not difficulty.
- learned: every new subsystem needs opposed evidence — full opposed wins where reachable, component-level opposed proofs where not; CP spending turned beta_1 from 0/60 to 22/40, revealing the autopilot leaves the original toolkit's strongest lever unused.
- criterion now: ISC-236 satisfied by opposed evidence per mission (full wins: m4/m6/b1; components: m3 carry, m5 escape), with the CP-boost autopilot improvement recorded for a future run.

**2026-08-15 (mission 2, second entry) —**
- conjectured: mid-phase victory checking scoped by "protect the pinned seeds" was a sound design rationale.
- refuted by: the advisor demanding the ORIGINAL's timing; reading phases.py showed boundary-only checks AND that our engine was missing the marine-action-end check entirely (a marine-phase quota win would have let the stealers act first), plus a real divergence: blockade evaluated mid-phase on non-final positions.
- learned: timing semantics must be justified from the source, never from test-fixture convenience; fixtures then pin whatever the source dictates. Also: a boundary check added for one objective family can be semantically wrong for adapted objectives (empty-board "extermination") — scope semantics to the objective they model.
- criterion now: ISC-176 refined to ISC-176 (instant quota, outcome-equivalent) + ISC-176.1 (blockade never fires mid-phase; boundary check present at marine-action end).

- 2026-08-15 (roster run C/R/L):
  - conjectured: the positional zip of engine.marines to deployment metadata is sound "by construction" (both insertion-ordered), so no runtime validation is needed.
  - refuted by: advisor 2026-08-15 — correctness today ≠ verifiability tomorrow; space_hulk_6's hand-arbitrated interleave PROVES the correspondence is not structurally derivable from the data, and a silent permutation renders plausible-but-wrong names that no screenshot or count-based test can catch.
  - learned: when a pairing is positional, cross-check each pair on a property both sides carry independently (deploy type vs engine sprite) so silent cosmetic corruption becomes a loud failure; pin the one arbitrated case as an exact fixture plus a negative test proving the tripwire fires.
  - criterion now: ISC-274/275 are guarded by the buildRoster weapon cross-check, the pinned space_hulk_6 (squad,type) map, and the reversed-deployment 'Unknown' negative test.

## Verification

- ISC-1: Bash — `pnpm --filter ./packages/engine test` → 9 files, 45 tests passed
- ISC-2: Bash — `pnpm --filter ./packages/client test` → 2 files, 6 tests passed (mock-drift GameScene.spec deleted per Decision; hud.spec rewritten payload-driven)
- ISC-3: Bash — engine `tsc -b` clean (after mitt→in-house emitter), client `tsc --noEmit` clean, `vite build` → dist 1.5MB
- ISC-4: Browser (claude-in-chrome, real Chrome) — board renders Suicide Mission layout, zero console errors
- ISC-5: Browser screenshot — right-hand HUD strip, dark bg, full height
- ISC-6: Browser screenshot — minimap in HUD top, viewport box tracks drag-pan
- ISC-7: Browser screenshot — click marine → "AP: 4/4"
- ISC-8: Browser — dispatch S key → marine moves back 1 square, HUD "AP: 2/4" (backward=2AP per rules)
- ISC-9: Browser zoom screenshot — click empty square → "AP: --/--"
- ISC-10: Browser screenshots across drag-pan — HUD pixels unmoved while board scrolls
- ISC-13/16/17: vitest doors.spec — toggle 1 AP, front-3 reach, blocked/allowed movement (50→51 tests green)
- ISC-14/15: vitest doors.spec + vision.spec — closed blocks LOS, open restores
- ISC-18/19: Browser — door bars render on mission squares; O key opened door, marine moved through onto door square
- ISC-24: Browser screenshot — L overlay: green squares stop at closed door (also exposed+fixed walls-transparent LOS bug)
- ISC-25: vitest vision.spec — 180° vision arc + 90° fire arc truth tables, walls block
- ISC-20/21/22/23: vitest shooting.spec — overwatch 2AP/cleared-on-move, free reaction shot, jam on doubles incl. killing doubles, unjam 1AP; browser marker via overwatchChanged event
- ISC-26: vitest — SeededRng same-seed identical 20-roll sequences
- ISC-27/28/29: vitest — kill on 6, sustained +1/miss max +3 (scripted RollQueue), arc/LOS/range rejections spend no AP
- ISC-30/31: vitest combat.spec — 3d6 front / 2d6 flank, tie both survive, blow-from-behind spins defender
- ISC-32/34/35: browser — stealer killed via live engine: removed from state.pieces, sprite destroyed, HUD "Kills: 1"
- ISC-33: code + browser — flash sprite spawned at muzzle, destroyed via 250ms delayedCall
- ISC-36/37/38: vitest blips_ai.spec — blip 6AP any-dir 1AP, d6→1-3 value, convert around origin, lost-if-no-room, entry spawns
- ISC-39/40: vitest ai_pathing + blips_ai — greedy approach with Chebyshev-plateau fix (Euclidean tiebreak), CC when lined up, AI opens doors
- ISC-41/42: browser screenshots — blips render green, converted stealers swarm map, marines attacked over 7 idle turns without player input
- ISC-43..47: vitest gameflow.spec + browser HUD — turn cycle, AP reset, CP 1d6, spendCP, phase/turn display "Turn 7 — Stealers"
- ISC-48: browser — timer counts down (1:56 observed); expiry path shares endTurn with Done
- ISC-50..53: vitest — exit-win, exterminate-win, all-dead loss, post-result action rejection; browser "SQUAD WIPED OUT" overlay with dimmed board
- ISC-49: Playwright — real mouse click on DONE button advanced turn (after fixing container-child scrollFactor hit-test drift)
- ISC-54..58: mission JSON extended (entries/exit/deployment/objective/blips-per-turn), gameflow.spec deploys 5 marines + 2 blips; reinforcement spec
- ISC-59/70: Playwright playthrough — complete game via client action handlers, result reached turn 4 (loss, 3 kills), zero page errors
- ISC-60/61: ESC pause overlay + timer/input freeze; controls reference rendered in HUD
- ISC-62: pnpm build → engine tsc -b + client vite build clean
- ISC-63: Playwright suite 5/5 headless (boot, turn, HUD events, playthrough)
- ISC-64: README rewritten — truthful milestone table, controls, scope
- ISC-65: milestone commits 7b68e78, 66ca9ba, 72719d4, 33accc0 + this one, tests green at each
- ISC-66/73: grep — zero phaser imports, zero window/document in engine src
- ISC-67/68: tsc --noEmit clean both packages; no @ts-ignore, engine API cast-free
- ISC-69: engine coverage 94.64% lines
- ISC-72/76: grep — no networking deps, no Python artifacts
- ISC-74/75: README milestone claims match ISA; tree committed green at session end
- ISC-71: DEFERRED-VERIFY — FPS probe needs visible-tab recording; follow-up task in Decisions
- ISC-12: Bash — `git rm --cached -r packages/engine/coverage`, .gitignore entry added

### Playtest bug sweep (2026-08-14)

- ISC-77: vitest — `pieceAdded.spec.ts` 3/3 pass: payload kind and live piece.kind correct for marine/stealer/blip at emit time
- ISC-78: browser probe — after real DONE click, turn-2 reinforcement blips p_7/p_8 texture `blip` (pre-fix: `terminator_storm_bolter`)
- ISC-79: browser probe — turn-3 conversion produced stealers p_11/p_12/p_13 all texture `stealer`
- ISC-80: vitest — ai_pathing "concave side-room pocket" test: blip escapes (6,12), closes Chebyshev distance over 3 activations
- ISC-81: browser probe — turns 2–5 per-turn position diff: `stuck: []` every turn; horde queued through the (10,5) door choke
- ISC-82: vitest — diagonal stealer at (11,5) ends orthogonally adjacent or marine dead within one activation
- ISC-83: browser probe — marine count 5→5→5→5 across DONE clicks turns 1–4, then only decreases via deaths (loss at turn 7: SQUAD WIPED OUT screenshot)
- ISC-84: Bash — engine 98/98, client units 6/6, e2e 6/6 (incl. new impostor-texture assertion), `pnpm build` clean; seeds re-scanned (120): 62 win / 58 loss / 0 stalemate; pins: win.spec seed 29 (MISSION COMPLETE screenshot artifact, Kills 20/Losses 3, turn 17), playthrough.spec seed 3 (loss turn 13)
- ISC-85: vitest — queued stealer with adjacent side door: door stays shut, position and AP unchanged

### Animated stealer phase + rules/UX sweep (2026-08-14, second user pass)

- ISC-86: Playwright animation.spec — 8 samples @120ms of blip sprite: >1 distinct position; mid-animation screenshot `test-results/stealer-phase-mid-animation.png` (HUD "Turn 1 — Stealers", blips mid-corridor)
- ISC-87: animation.spec — `animating: true` right after endTurn; gates verified in code (keydown, pointerdown, togglePause, timer callback, endTurn)
- ISC-88: conversion_on_sight.spec — about-face reveals blip → converts instantly (2 stealers); door-open reveals blip → converts instantly
- ISC-89: same spec — value-2 blip spawns exactly 2 stealers; engine blips_ai overflow tests pre-existing
- ISC-90/91: animation.spec — EXIT text object present, `hud.objectiveText` contains "Objective"; screenshot `markers-and-objective.png` shows purple entries, gold objective, legend
- ISC-92: animation.spec — post-replay position+texture diff vs engine: `[]`
- ISC-93: animation.spec — second endTurn mid-replay: turnNumber unchanged
- ISC-94: deterministic scan (dice at construction) 120 seeds: 62 win / 58 loss / 0 ongoing; pins ?seed=1 (win, MISSION COMPLETE overlay) / ?seed=5 (loss); full suites: engine 101/101, client 6/6, e2e 7/7, build clean
- ISC-95: conversion_on_sight.spec — `PieceEvents.replay(doorToggled)` leaves visible blip alive; identical live emit converts it

### Edge-model doors (2026-08-14, third user pass)

- ISC-96: doors.spec — anchor (1,0) facing down: otherSide (1,1); doorBetween symmetric both directions
- ISC-97: doors.spec — closed edge blocks (2,2)→(2,1); open allows; parallel entry (1,1)→(2,1) always allowed; anchor square isPassable true
- ISC-98: doors.spec — LOS (2,2)→(2,0) and (2,2)→(2,1) blocked when closed, clear when open; row-parallel LOS through anchor unaffected; vision.spec door tests pass unchanged
- ISC-99: doors.spec — straight-ahead toggle 1 AP, front-diagonal-incident edge reachable, behind edges (incl. own rear edge) unreachable; ai_pathing door test: blip opens edge (10,15)|(10,16) on contact and continues
- ISC-100: Playwright markers-and-objective.png — door bars straddle square boundaries on col-10 corridor and row-13 arm (previously centered in squares)
- ISC-101: doors.spec — `isPassable(anchor)` true with closed door present
- ISC-102: kill_reveals.spec — shot kills stealer at (4,6); blip at (4,4) `alive === false`, 2 stealers spawned; negative guard: marine turns (sweep fires, LOS still blocked) leave blip alive
- ISC-110: kill_reveals.spec — 10 autoplayed games, zero "visible blip at phase boundary" violations (112 engine tests green)
- ISC-111..114: mission1_fidelity.spec — set-equality vs independently transcribed BOARD: 98 squares, 7 door edges, 6 entries, 27 room squares all match (120 engine tests green)
- ISC-115: fidelity spec (deployment shape) + markers-and-objective.png (squad visible in the X-junction at rows 19-21, cols 12-14)
- ISC-116: fidelity spec — exitPoints [(20,20)], initialBlips 2, blipsPerTurn 1
- ISC-117: `new GameEngine(m)` constructs, `allDoors()` length 7; suites 120 engine / 6 client / 8 e2e green; `pnpm build` clean
- ISC-118: win.spec ?seed=1 → MISSION COMPLETE; playthrough.spec ?seed=3 → loss (13 turns, squad wiped) — seed 3 scanned under the spec's own idle-turn-1 pattern (plain-autoplay scan and playthrough pattern consume dice differently; seed 11 loses under one, wins under the other)
- ISC-119: hover.spec — (15,13) (a door square of the invented map) reads "— rock"
- Balance baseline (2026-08-15, original map): 120-seed scan 102W/18L/0; ALL 102 wins are exit wins (win-reason instrumented scan), 0 extermination — rate measures the adapted objective, see Decisions deviations entry
- ISC-103: kill_reveals.spec — CC outcome 'attacker', stealer dead, blip behind converted
- ISC-104: kill_reveals.spec — `PieceEvents.capture(() => engine.endMarinePhase())`: overwatch kill → blip converted, `blipConverted` in captured stream
- ISC-105: kill_reveals.spec — `PieceEvents.replay(pieceDied)` leaves visible blip alive; identical live emit converts it
- ISC-106: hover.spec + test-results/hover-readout.png — HUD line "(10,5) corridor tile · door ↑ closed" rendered below controls text (hoverY > controlsY asserted)
- ISC-107: hover.spec — hover (10,4) → "(10,4) … corridor tile"; off-map (0,0) → "rock"
- ISC-108: hover.spec — readout contains "marine" on occupied square, "door … closed" on door anchor
- ISC-109: hover.spec — piece id:pos:ap snapshot identical before/after mousemove sweep; zero page errors
- Seed re-scan post kill-reveals (2026-08-15): 62W/58L/0 over 120 construction-seeded games — IDENTICAL to baseline; mechanism: conversion consumes no dice, and the autopilot's dense marine actions meant reveal-timing shifts never altered the dice stream across all 120 seeds. Pins seed 1 (win) / seed 5 (loss) re-verified in-browser via win.spec + playthrough.spec.
- Sweep: engine 104/104, client units 6/6, e2e 7/7, build clean; deterministic seed scan UNCHANGED (62W/58L/0 — dice order preserved), pins ?seed=1/?seed=5 still valid

### Faithful-recreation run (2026-08-15)

- ISC-126: relativeCost.spec — stepLeft/stepRight refused, pos unchanged, AP 4/4
- ISC-127/128/129: combat.spec — behind-loss dies; behind-win survives+spins (Dir.S); draw spins; all RollQueue-scripted
- ISC-130: shooting.spec — aimed kill at range 14; overwatch refuses at 14
- ISC-131: shooting.spec — 5-shot ladder, 5th hits at raw 2 with +4 cap
- ISC-132: shooting.spec — post-move shot costs 0 AP; turns forfeit the free shot
- ISC-133: combat.spec — repeat right turn pays 1, alternating free, move re-earns
- ISC-134: blips_ai.spec — two-dice bag mapping incl. v=36 rejection redraw
- ISC-135/136: blips_ai.spec + ai_pathing.spec — watched corridor: no step into sight, voluntary convert at ≤6 (stealer rows ≥6); unseen far blip advances hidden; door-exposure refusal parks blip at the closed door, converts on next fresh activation
- ISC-137: mission1_fidelity.spec — 20 sections, north corridor = one, LC section = room+door anchor (10 squares); addSections.ts run: 98/98 mapped, both JSONs identical
- ISC-138: flamer.spec — two-section fixture flood = 9 room squares, closed-edge split keeps (18,20) out on the real map
- ISC-139: flamer.spec — 2 AP/1 ammo, one kill on [5,1], own-section/ammo/AP refusals
- ISC-140: flamer.spec — outsider blocked, insider exits, flames on board; clearFlames + sight recheck exercised via endMarinePhase in suite
- ISC-141: flamer.spec — self-destruct wipes own section incl. flamer, outsider untouched
- ISC-142: combat.spec — sergeant [5]+1=6 beats stealer 5; spriteKey + timerBonus asserted
- ISC-143: flamer.spec — 150s with sergeant alive, 120s after sgt.die(), result still ongoing
- ISC-144/145: mission1_fidelity.spec — M squares (10,0)–(10,4) facing down, types 3×SB + sgt(10,3) + HF(10,4); flame-objective, objectivePoint (20,20), no exits, no cap
- ISC-146: debug1_mission.spec — marine at (10,4) facing down; board identity now includes sections
- ISC-147: flamer.spec — unopposed autoplay seed 1 wins by turn ≤15 (actual: 9); opposed scan 0W/60L recorded in Decisions (authentic difficulty)
- ISC-148: flamer-ui.spec — 10 flame sprites on screen after flaming LC (room 9 + open-door anchor), test-results/flame-victory.png
- ISC-149/151: flamer-ui.spec — jam marker appears/clears on jammed events; dice HUD "6 2"
- ISC-150: flamer-ui.spec — HUD AP line "… · Ammo 6" on flamer selection
- ISC-152: 14 wavs + SOUNDS_INFO in client/public/assets/sounds; GameScene load.audio×8 + sfx() wiring on move/shot/flame/cc/death/jam/door/destruct; e2e zero page errors with sounds firing
- ISC-153: GameScene keydown F → flamer flameAt(hovered ?? nearest-enemy square) and X → selfDestruct (Grep-verified wiring); flame delivery + win overlay e2e-probed via flameAt in flamer-ui.spec
- ISC-154: engine purity greps green in suite (index.spec); audio lives client-side only
- ISC-155: game.spec — default boot "Suicide Mission with no forces", 1 marine, 0 enemies
- ISC-156: engine 143/143, client units 6/6, Playwright 10/10, `pnpm build` clean; scans: space_hulk_1 0W/60L, debug_1 40W/0L, unopposed win turn 9
- ISC-157: README + CLAUDE.md rewritten to the restored truth (deployment, objective, difficulty, sounds, counts)
- Live browser (real Chrome, claude-in-chrome; Interceptor extension not connected this session): space_hulk_1 renders restored deployment, BURN marker on (20,20), HUD "FLAME Launch Control / (lose: flamer dead/dry)", timer 2:30, zero console errors; HUD text-overlap defect found in first screenshot and fixed (objective label shortened), re-verified clean

Mission-2 recreation (2026-08-15):
- ISC-158: vitest — mission2_fidelity "registry loads it by name" green (name/width 31/height 41)
- ISC-159: vitest — 204-square set equals the Explore agent independent transcription
- ISC-160: vitest — 42 sections partition identically to source sublists
- ISC-161: vitest — 19 doors with source facings
- ISC-162: vitest — 11 entryPoints match ENTRY tags
- ISC-163: vitest — 5 deploys: 3 SB + sergeant + flamer; engine classes + 150s timer
- ISC-164: vitest — every deploy square in the 55-square M list
- ISC-165: vitest — 5 distinct room sections (one marine per room)
- ISC-166: vitest — initialBlips 0, blipsPerTurn 2, totalBlips undefined
- ISC-167: vitest — stealer.die() → stealerCasualties 1
- ISC-168: vitest — Blip(value 3).die() → +3; end-to-end quota win via blip value
- ISC-169: vitest — blip.convert() → casualties 0 (anti)
- ISC-170: vitest — casualtiesChanged emitted with running total
- ISC-171: Read + vitest — schema union + killQuota; mission JSON kill-quota/30
- ISC-172/176: vitest — 2nd kill at quota 2 flips result to win mid-phase; boundary 29→ongoing/30→win; OPPOSED integration: quota-3 autoplay seed 5 → win with real kills
- ISC-176.1: vitest — mid-phase kill with blockading formation stays ongoing; endMarinePhase → win
- ISC-169.1: vitest — value-3 blip converts to 1 stealer (2 lost, uncounted); killing it credits 1, not 3
- ISC-173: vitest — entry 6 steps away → win at phase end; 7 away → ongoing
- ISC-174: vitest — wall-split corridors ongoing; closed-door link → win (doors do not block the metric)
- ISC-175: vitest — marine.die() → loss
- ISC-177: vitest anti (exterminate-or-exit stays ongoing mid-phase) + pinned e2e suite green (win.spec/playthrough.spec unchanged)
- ISC-178: vitest — autoplay(space_hulk_2, 8 turns) legal, no throw; scans in Decisions
- ISC-179: vitest — expected data from independent Explore transcription, 8/8 fidelity tests green
- ISC-180/181/182: Playwright mission2.spec — 204 squares, 5 variant textures, "Kills: 0/30", "KILL 30…blockade", quota win overlay + screenshot; PLUS live real-Chrome session: board render, kill counter, 2:30 timer, sergeant move, DONE turn cycle spawning 2 blips at NE entries, zero console errors
- ISC-183: Bash — 30-seed opposed scan 0W/30L + unopposed blockade win turn 7 (Decisions)
- ISC-184: Bash — engine suite 23 files / 168 tests green (post-advisor additions)
- ISC-185: Bash — client units 6 green; e2e 11/11 green
- ISC-186: Bash — pnpm build exit 0, zero errors
- ISC-187: Grep — zero phaser imports in engine src (guard suite green)
- ISC-188: Bash — transcriber rerun byte-identical (md5 884b34c8… before/after)
- ISC-189: Read — README (mission list, rules, roadmap, gaps) + CLAUDE.md (transcriber pipeline, kill-quota invariants, counts 164/11) updated
- ISC-190: Read — Decisions entry records stealer-placed adaptation, no-lurk note, timing, scans, delegation show-math
Batch migration (2026-08-15):
- ISC-191: Grep — both scripts import scripts/lib/parseMish.ts; no duplicate BOARD walker
- ISC-192: script probe — exits/objectives extracted (m3 2 exits, m4 2 obj, m6 16 obj + 3 duct)
- ISC-193: Bash — one run converted all six missions
- ISC-194..197: Read — drafts carry board/blips/rosters (CAT + exotics flagged)/default deployments
- ISC-198: Read — per-draft todo lists (4–8 items each) name victory + feature remainder
- ISC-199: Bash diff — 0 discrepancies vs independent agent reading (counts + coordinate lists); NEGATIVE CONTROL: mutated draft (coord shift + dropped piece) detected on both axes, then restored; agent blind by construction (launched pre-migrator, sources only)
- ISC-200: Grep — zero draft references in missions/index.ts; durable guard: registry-manifest spec fails on draft/todo/missing-objective for EVERY registered mission (previously hardcoded to two names); load-path audit clean
- ISC-201: Bash — 168 engine / 6 unit / 11 e2e green, build clean, mission-1/2 JSON md5 unchanged
- ISC-202: Bash — rerun md5 identical (idempotent)
- ISC-203: Read — README roadmap + CLAUDE.md pipeline docs updated

Mission completion (2026-08-15):
- ISC-204..212: vitest exotic_victory.spec — draw result, escape, CAT pickup/drop/damage/flames/wander (seed-deterministic), flamerAmmo, ducting (16 tests)
- ISC-213..216: vitest — m3 registered + escort-cat win/draw/loss paths
- ISC-217/222/226/232/234: vitest missions_fidelity.spec — five boards square-for-square vs two independent transcriptions (b1 doors source-arbitrated to 21)
- ISC-218..221: vitest — m4 permanent cleanse, dual-cleanse win, dry-flamer loss
- ISC-223..225: vitest — m5 quota-5 escape win, below-5 loss
- ISC-227..231: vitest — m6 turn-limit win, ducting loss, room-fire loss, control-room kludge, ammo-4 override
- ISC-233: vitest — beta_1 registered, quota 1
- ISC-235: vitest — stealer AI lunges at loose cat + tears ducting en route
- ISC-236/242: Bash — 20-seed scans ×5 missions zero errors; 60-seed instrumented scans; OPPOSED wins b1 22/40 + m4 8/40 (CP-boost probe) + m6 10/20 (shipped autopilot); m3/m5 component-opposed proofs; all recorded in Decisions
- ISC-237/238/245: Playwright missions3plus.spec — five boots with labels/status/cat/ducting sprites, zero console errors; real-Chrome state probe (10 marines/151 squares/HUD ready)
- ISC-239/204: Playwright — engine-surgery draw → MISSION DRAWN overlay + screenshot mission3-draw.png (visually inspected: board, escort label, Escaped: 0, 3:00 two-sergeant timer)
- ISC-240: Bash — full suites green: 209 engine (25 files) / 6 client units / 17 e2e / build clean
- ISC-241: vitest — registry guard sweeps all EIGHT missions (no draft/todo/missing-objective); finished drafts deleted, only beta_2.json remains
- ISC-243/244: Read — README (8-mission list, systems, honest balance, beta_2 note) + CLAUDE (exotic systems invariants) updated

beta_2 completion (2026-08-15):
- ISC-246..251: vitest — cannon shot/sustained-floor/autofire-multipass (door-opens-sightline case)/malfunction (adjacent 4-vs-5 reqs)/reload-once/permanent door destruction
- ISC-252/253: vitest — chain-fist cut (1 AP, uncloseable) + parry reroll flips a losing exchange
- ISC-254..257: vitest — deploy legality (far + unseen, max 2), dice-drawn 0/0/1 value, free movement, real-converts / fake-rattles (bolter jam + cannon ammo burn)
- ISC-258..260: vitest — begin/decrement/win, turn-tolerant move-reset, both sergeant types download, sergeantless loss
- ISC-261/262: vitest + Bash — beta_2 registered (drafts/ EMPTY), board vs independent transcription exact, 180s two-sergeant timer
- ISC-263: Bash — autopilot legal 6-turn spec + 20-seed scan (0W, structurally explained) + CP-boost 3/40 OPPOSED WINS, seed 4 PINNED as a permanent spec
- ISC-264: Playwright beta2.spec — 10 variant sprites, download status line, win overlay, zero page errors + screenshot inspected (DATA marker, 3-line objective, Downloading 2/4)
- ISC-265: Bash — 231 engine / 6 unit / 18 e2e green AFTER the combat.ts parry fix (full-campaign re-verification), build clean, all pins intact
- ISC-266: vitest — registry guard sweeps NINE missions clean
- ISC-267: Read — README (campaign COMPLETE, weapons) + CLAUDE (weapon invariants, twice-bitten create()-order gotcha)
- ISC-270: Grep/Playwright — GameScene preloads entry+exit; e2e asserts `textures.exists('entry'/'exit')` true
- ISC-271: vitest mission_meta.spec — all 9 missions: every entryPoint has `facing` AND the facing-neighbor square is rock (hermetic invariant); patchMissionMeta.ts run twice, idempotent, zero mismatches
- ISC-272: Playwright + Chrome screenshot — 11 `entry-triangle` images on space_hulk_2; beta_2 screenshot shows white triangles one square off-board pointing in; purple fill code deleted (Grep)
- ISC-273: Playwright roster.spec — space_hulk_3's two EXIT:DOWN squares each have an `exit-arrow` at (x, y+1) off-board
- ISC-274: vitest mission_meta.spec — every deployment square named; squad names/sizes spot-checked vs all 9 original rosters (Calvin, Constantine, Abel/Ilyich, Pilgrim/Stone, Abraham/Harken, Luther/Snow, Lawer, Sakharov/Sternfeld); s6 interleave hand-arbitrated in SQUAD_OVERRIDES
- ISC-275/276: vitest roster.spec (client unit) — id-zip matches engine.marines, deterministic identical rosters across engines, unique names, Sgt./Bro. titles, weapon labels
- ISC-277/278: Playwright + Chrome zoom screenshot — squad rows Sakharov/Sternfeld stacked, sergeant→specials→bolters order, icon+name+AP 4/4+Ammo 10/6+weapon labels visible
- ISC-279: Playwright + Chrome — engine `die()` greys the card (grayscale, KIA), click no longer selects
- ISC-280: Playwright + live Chrome — card click sets Selection to that piece id, card gets `selected` class, camera panEffect runs toward the sprite (scrollY 291→180 observed; RAF-throttled in background tabs only)
- ISC-281: Playwright — map-side selection moves the single `selected` highlight to the right card
- ISC-282/283: vitest — catPickedUp badges the carrier card, catDropped clears; marineEscaped applies `escaped` (not `dead`) with ESCAPED label
- ISC-284: Playwright — overwatchOn() puts an OW badge on the card live
- ISC-285: Grep/Playwright — legend reads "▲ = stealer entry"; hover.spec updated probe passes
- ISC-286: Bash — engine suite (incl. import grep guard) 236/236; roster code lives entirely in client/src/ui
- ISC-287: Bash — 236 engine + 12 client unit + 21 e2e green, `pnpm -r build` clean
- ISC-274/275 (advisor round): vitest — buildRoster weapon cross-check clean on all missions exercised; space_hulk_6 (squad,type) map PINNED pair-for-pair; reversed-deployment negative test proves the tripwire fires ('Unknown' downgrade). e2e re-run 3/3 after the change.
- ISC-288: vitest + Playwright — .m-face renders ↓ at deploy, flips to ← after tryTurn(1) (unit) / changes after a live turn (e2e)
- ISC-289: vitest + Playwright — stats line reads "AP n/m · CP p", updates on cpChanged (unit exact-match) and shows the seeded pool in e2e
- ISC-290: Playwright + wide screenshot — .m-ammo is its own element+line ("Ammo 10"/"Ammo 6" under the weapon cards), .m-stats contains no Ammo, nothing truncated at 92px
- ISC-291: Bash — 236 engine + 14 client unit + 21 e2e green, build clean
