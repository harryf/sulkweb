---
project: sulkweb
task: "Project ISA — Sulk Web (playable Space Hulk port)"
effort: E4
effort_source: classifier
phase: complete
progress: 778/780 (v0.5.0 release staged ISC-848; ISC-71 deferred)
mode: interactive
started: 2026-08-14T15:20:00Z
updated: 2026-08-19T21:05:00Z
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

### Marker visibility + roster naming (2026-08-15 evening)

- [x] ISC-292: camera bounds include a HUD-width dead zone on the right — max pan brings the rightmost off-board marker fully into the board-view area (vitest-free geometry, Playwright probe)
- [x] ISC-293: permanent e2e guard sweeps ALL registered missions: every entry-triangle/exit-arrow rotated display bound lies within the reachable camera range (Playwright)
- [x] ISC-294: roster panel title reads "Marine Roster" (Playwright)
- [x] ISC-295: squad rows are titled after their leader — "Squad <sergeant first name>", fallback first member; data-squad keeps the original mission squad key (vitest + Playwright)
- [x] ISC-296: Anti: all suites green and the build clean after the change (Bash)

### Card polish — facing, CP, ammo line (2026-08-15 follow-up)

- [x] ISC-288: each living card shows a facing arrow glyph that updates when the marine turns (vitest + Playwright)
- [x] ISC-289: each living card shows the CP pool next to AP, live on cpChanged (vitest + Playwright)
- [x] ISC-290: ammo renders in its own .m-ammo element on a separate line — no longer part of .m-stats (Playwright + screenshot, no truncation)
- [x] ISC-291: Anti: all suites stay green and the build is clean after the change (Bash)

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

### Flamer targeting + shootable doors + ducting orientation (2026-08-16)

- [x] ISC-338: F with a flamer selected enters targeting mode without spending AP or ammo (Playwright: aiming flag true, AP unchanged)
- [x] ISC-339: in targeting mode, hovering a valid in-range square sets the crosshair cursor; invalid hover sets not-allowed (Playwright canvas.style.cursor)
- [x] ISC-340: valid hover previews the exact flame-flood square set (Playwright: exposed preview list equals engine flameFlood)
- [x] ISC-341: second F on a valid hovered square fires flameAt into it — section burns (Playwright: board.isFlaming true, ammo −1, AP −2)
- [x] ISC-342: flaming a visible square kills a stealer hidden around a corner in the same section — no LOS to the stealer required (vitest, RollQueue-pinned)
- [x] ISC-343: second F on an invalid hover stays armed without firing — AP and ammo untouched, not-allowed cursor as feedback (refined per Advisor: silent exit punishes mis-aims) (Playwright)
- [x] ISC-344: targeting mode cancels on piece deselection or another action key (Playwright)
- [x] ISC-345: space_hulk_1's Launch Control (20,20) is flameable by aimed shot from outside its section — self-destruct no longer the only path (vitest on the real mission board)
- [x] ISC-346: Anti: the flamer never auto-fires at a "nearest enemy" fallback square — the second press fires only at the hovered square (Grep: fallback removed; vitest behavior)
- [x] ISC-347: HUD legend documents the two-press flamer flow (Grep HudPanel)
- [x] ISC-348: bolter aimed shot destroys a closed door on a D6 roll of 6 — original sh_kill_scorereq=6 (vitest, RollQueue)
- [x] ISC-349: a door shot costs 1 AP (free after move via move-and-shoot) and emits shot + doorDestroyed events (vitest)
- [x] ISC-350: bolter misses at the same door accrue sustained-fire +1 per miss, max +4, cleared on move/turn (vitest)
- [x] ISC-351: assault cannon aimed shot destroys a closed door on ≥5 (aburst_kill_scorereq=5), spends 1 ammo, counts toward malfunction (vitest, RollQueue)
- [x] ISC-352: doors outside the fire arc or without LOS to either flanking square cannot be shot (vitest)
- [x] ISC-352.1: a marine directly facing an adjacent closed door edge CAN shoot it point-blank — the door's own segment must not block the shot at itself (vitest)
- [x] ISC-353: open or already-destroyed doors are not shootable targets (vitest)
- [x] ISC-354: autofire destroys a closed door whose ANCHOR square lies on the far side of the edge — near-side LOS now counts (vitest regression)
- [x] ISC-355: client: hovering a shootable door square and pressing F shoots the door in preference to auto-targeting (Playwright, dice pinned)
- [x] ISC-356: Anti: a door shot never kills a piece and a piece shot never destroys a door — the two target paths stay disjoint (vitest event assertions)
- [x] ISC-357: ducting sprites orient to their run — a square with left/right ducting neighbors renders rotated 90° (Playwright: sprite rotation on space_hulk_6)
- [x] ISC-358: space_hulk_6 (13,0)(14,0)(15,0) reads as one continuous horizontal pipe; ductingDestroyed keeps the rotation (Playwright)
- [x] ISC-359: Anti: doors stay immune to flames (fl_kill_scorereq None in the original) — flameFlood still stops at closed door edges (vitest)
- [x] ISC-360: all suites green: engine vitest, client vitest, Playwright e2e; `pnpm -r build` clean (Bash)

### Diagonal movement + key rebind (2026-08-16, run 2)

- [x] ISC-361: Q moves the marine forward-left diagonally for 1 AP, facing unchanged (Playwright key press + engine unit)
- [x] ISC-362: E moves forward-right diagonally for 1 AP (Playwright + unit)
- [x] ISC-363: Z moves back-right and C moves back-left diagonally for 2 AP each — the user's explicit mapping (Playwright + unit)
- [x] ISC-364: a diagonal move counts as a MOVE — grants move-and-shoot, breaks overwatch, clears sustained fire (vitest)
- [x] ISC-365: Anti: strafing stays impossible for marines — stepLeft/stepRight refuse, no key binds a sideways move (vitest + grep)
- [x] ISC-366: Anti: a diagonal move cannot cut the corner of a closed door edge — (18,20)→(19,19) blocked while the Launch Control door is closed, legal once open (vitest on the real mission)
- [x] ISC-367: marine move costs match the original movemap exactly: F/FL/FR=1, B/BL/BR=2, L/R impossible (vitest cost probes)
- [x] ISC-368: B is the self-destruct key; X no longer detonates (Playwright)
- [x] ISC-369: self-destruct requires B twice within the confirm window — a single press never detonates (fidelity: original "Really self-destruct?" dialog) (Playwright)
- [x] ISC-370: O toggles overwatch (was V); V is unbound everywhere (Playwright + grep)
- [x] ISC-371: H toggles doors (was O) (Playwright)
- [x] ISC-372: X performs close combat (was C) (Playwright or unit)
- [x] ISC-373: HUD legend and README document the full new key map (Grep)
- [x] ISC-374: Anti: no key is bound to two actions across all keyboard handlers (grep audit of addKeys + keydown-*)
- [x] ISC-375: all suites green: engine vitest, client vitest, Playwright, tsc, build (Bash)
- [x] ISC-376: projectCamToMini clamps projected width: camera wider than the board yields box width ≤ minimap width minus the line inset (vitest)
- [x] ISC-377: projectCamToMini clamps projected height symmetrically for boards shorter than the camera view (vitest)
- [x] ISC-378: real space_hulk_1 geometry (22×27 tiles, 184px minimap): box stroke extents stay inside the minimap (vitest)
- [x] ISC-379: real beta_2 geometry (23×33 tiles): box stroke extents stay inside the minimap (vitest)
- [x] ISC-380: Anti: wide-map regression — the three existing projectCamToMini cases pass unchanged (vitest)
- [x] ISC-381: Anti: projected width/height never negative even when the minimap is smaller than the line width (vitest)
- [x] ISC-382: live probe: e2e on space_hulk_1 AND beta_2, camera panned to 3 positions, drawn rect (Minimap.lastBox) inside minimap bounds (Playwright)
- [x] ISC-383: full suites green after the fix: engine vitest, client vitest, Playwright e2e, tsc, build (Bash)
- [x] ISC-384: canvas HUD header reads "Mission Status" (e2e text probe)
- [x] ISC-385: HUD no longer renders AP or CP lines; apText/cpText fields gone (grep + e2e absence probe)
- [x] ISC-386: flamer ammo readout lives on the roster card only; flamer-ui e2e asserts it there (Playwright)
- [x] ISC-387: Mission Status keeps turn/phase, timer, kills/losses, objective, mission status line, dice, map legend, hover info, DONE (e2e)
- [x] ISC-388: docs/writing-guide.md rules hard-wired into project CLAUDE.md (grep)
- [x] ISC-389: displayed UI strings follow the guide: no em dashes as separators/emphasis in HUD/roster text (grep scan)
- [x] ISC-390: keyboard help renders in the roster panel as keycap squares in QWERTY rows with physical stagger; unbound keys dimmed in place (e2e DOM probe)
- [x] ISC-391: keyboard help expands/collapses via a native arrow control and toggles on click; toggling blurs the summary so Enter stays a gameplay key (e2e)
- [x] ISC-392: every bound key (W A S D Q E Z C H F X O U B T R G P L M Enter Esc) appears exactly once with an action label (vitest on layout data)
- [x] ISC-393: Credits section sits below the keyboard help crediting Toby Woodwark with a sulk.sourceforge.net link (e2e)
- [x] ISC-394: music credit (Music of 40K link) lives inside Credits; the old GameScene-appended audio-credit is gone — exactly one music credit in the DOM (e2e count)
- [x] ISC-395: Credits states the game is inspired by Space Hulk, first edition, a Games Workshop board game (e2e text)
- [x] ISC-396: the original site's Legal text (GPL notice + Games Workshop trademark disclaimer) present, collapsed by default (e2e)
- [x] ISC-397: Anti: no test still asserts AP/CP/keyboard legend inside the HUD — hud.spec, hover.spec, flamer-ui.spec updated and green (vitest + Playwright)
- [x] ISC-398: Anti: roster cards unchanged — AP/CP stats line and ammo line still render (e2e, existing roster.spec)
- [x] ISC-399: full suites green: engine vitest, client vitest, Playwright e2e, tsc, build (Bash)

### Asset index (docs/asset-index.md, 2026-08-16)
- [x] ISC-400: docs/asset-index.md exists and covers every file under packages/client/public — 149 files, generator reconcile 0 missing / 0 stale (Bash)
- [x] ISC-401: every index row carries name, repo-relative location, status, and a usage description (Read)
- [x] ISC-402: generator script errors on any file without a map entry or map entry without a file, so completeness is mechanical (Read of script + clean run)
- [x] ISC-403: unused list names all 26 unused theme sprites plus ambush_counter.png tagged loaded-but-never-drawn (Read)
- [x] ISC-404: unused list names all 42 pygame UI images (Read)
- [x] ISC-405: unused list names the 4 unused sounds: 3 TLK Games GPL2 button sounds + click.wav (Read)
- [x] ISC-406: unused list names the 3 alien_extra cuts classified role 'unused' in alienSegments.ts (Read)
- [x] ISC-407: fonts listed unused with the reason (client uses Kanit via Google Fonts @import) (Read)
- [x] ISC-408: provenance recorded — assets/audio/ gitignored and regenerated by scripts/fetchAudio.ts; themes/sounds/images/fonts committed (Read + .gitignore)
- [x] ISC-409: summary counts internally consistent: 149 total = 66 in use + 77 unused + 1 loaded-never-drawn + 5 license notes (Bash arithmetic)
- [x] ISC-410: Anti: no asset file deleted, moved, or renamed by this run — git status shows only the new doc and ISA (Bash)
- [x] ISC-411: Anti: no dist/ build output or .DS_Store rows appear in the index (Grep)
- [x] ISC-412: doc prose passes the writing-guide banned-pattern scan, em dashes included (Grep exit 1)

### Architecture + development guides (docs/, 2026-08-16)
- [x] ISC-413: docs/architecture.md exists covering monorepo layout, engine internals, client internals, and the boundary (Read)
- [x] ISC-414: architecture doc names all three interaction channels: client→engine method calls with read-only state, engine→client PieceEvents, capture/replay for the stealer phase with the replaying-flag rules (Read)
- [x] ISC-415: architecture doc documents the vite `@sulk/engine`→`../engine/src` alias: dev needs no engine build, engine edits hot-reload (Read vs vite.config.ts)
- [x] ISC-416: deploy section: pnpm build → static packages/client/dist; fetch-audio-before-build caveat; no `base` set so root hosting or add base; assets404 is dev-only (Read vs vite.config.ts, .gitignore)
- [x] ISC-417: docs/development-guide.md exists with annotated directory maps for both packages plus root files (Read)
- [x] ISC-418: add-a-mission recipe: JSON in missions/<family>/, register in missions/index.ts, schema fields from RawMissionJSON_v2, ?mission= URL, optional MUSIC_TRACKS entry, fidelity-spec test pattern, README listing (Read vs sources)
- [x] ISC-419: add-a-unit-type recipe enumerates all nine wiring points: piece class + SPRITE_KEY, MarineType union, MARINE_CLASSES, index.ts export, sprite PNG + preload, EXPECTED_SPRITE/SPECIAL_LABEL, audioLogic sfx, keyboardHelp, tests (Read vs grep-verified touch points)
- [x] ISC-420: both docs name the three test suites with exact commands and locations, including the vitest-vs-playwright directory split gotcha (Read)
- [x] ISC-421: every path, filename, spec file, and directory referenced in both docs resolves in the repo (Bash find loop, 0 missing)
- [x] ISC-422: Anti: no source file modified; git status shows only the two new docs + ISA (Bash)
- [x] ISC-423: both docs pass the writing-guide banned-pattern scan including em dashes (Grep exit 1)
- [x] ISC-424: docs cross-link each other and asset-index.md / writing-guide.md; all md links resolve (Bash link check, 0 missing)

### Rules reference (docs/rules-reference.md, 2026-08-16)
- [x] ISC-425: docs/rules-reference.md exists: complete implemented-rules reference, scoped as source material for a future manual (Read)
- [x] ISC-426: turn structure documented: marine/stealer/end phases, 120s+30/sergeant clock, d6 CP pool, spendCP +1 AP, AP refresh (Read vs GameEngine)
- [x] ISC-427: movement cost table per unit class matches CostTables, Genestealer.moveCost, Blip.moveCost, including illegal marine side-steps and the stealer free-turn repeat rule (Read)
- [x] ISC-428: vision 180 / fire 90 with 45-degree inclusion, LOS blocking set (missing squares, pieces, closed door edges incl. behind-door), Chebyshev range (Read vs vision.ts/los.ts)
- [x] ISC-429: all six marine types with exact numbers: bolter 2d 6+, sustained +1 max +4, MNS free shot, jam-on-overwatch-doubles only, unjam 1 AP; flamer 2AP/6 ammo/range 12/kill 2+/self-destruct; cannon 3d 5+/drum 10/reload 4AP/autofire 2AP+5 rounds 3+/malfunction triples past 10; chain fist 1 AP cut; sergeant +1 CC +30s; sword parry (Read vs piece classes)
- [x] ISC-430: stealer 6 AP CC 3/2 dice; blip bag 8/4/9 of 21, sight/adjacency bars, conversion spill and lost-stealers rule, voluntary-convert conditions, killed-blip value credit (Read vs Genestealer/Blip)
- [x] ISC-431: ambush counters: max 2, deploy constraints, 1-in-3 real (5+ draw), fake vanish + reflex fire with jam/malfunction risk (Read vs AmbushCounter)
- [x] ISC-432: close combat: 1 AP, directly-ahead requirement, outcome table incl. defender-cannot-strike-back survival, parry decision rule (Read vs combat.ts)
- [x] ISC-433: doors: edge model, front-3 operation rule, all four destruction paths, point-blank edge shot rule (Read vs Door.ts/Piece.findAdjacentDoor/StormBolter.doorInSight)
- [x] ISC-434: flames: section flood stopped by closed doors, kill 2+, silent self-destruct kills, end-phase dispersal, permanent cleansing (Read vs flame.ts)
- [x] ISC-435: special features complete: C.A.T. (pickup/drop/skewer/wander 3/escape win-draw), ducting + control-room booby trap, download counter start/decrement/reset, entry round-robin + totalBlips cap, exit behavior (Read vs exotic.ts/GameEngine)
- [x] ISC-436: all 10 objectives in a win/loss table and all 9 missions with squad composition and config extracted from mission JSONs (Bash python extraction, quoted above in Decisions)
- [x] ISC-437: stealer-phase AI behavior documented: attack priority, exotic step-ons, BFS pathing with door-on-contact, blip caution, per-action overwatch reactions and sight re-checks (Read vs StealerAI)
- [x] ISC-438: Anti: no source file modified (git status: doc + README link + ISA only); banned-pattern scan exit 1; README links all resolve (Bash)

<!-- Run: code review + coverage + dedup + reorg (2026-08-17) -->
- [x] ISC-439: Baseline captured pre-change: 257 unit tests in the combined root run + 35 client units + 42 e2e all pass; name-level JSON dump retained (Bash) [refined: the 222-engine split was a mis-derivation; the name dump is the real baseline]
- [x] ISC-440: Anti: post-change engine+client unit suites pass with 0 failures; no test lost except those belonging to deleted dead code (Bash vitest)
- [x] ISC-441: Anti: post-change full Playwright e2e suite passes 42/42 (Bash pnpm e2e)
- [x] ISC-442: Anti: no gameplay rule or constant changed — engine diff is only verified-dead deletions, file moves, and behavior-preserving extractions (git diff Read)
- [x] ISC-443: client/src/counter.ts deleted after grep shows zero importers (Bash)
- [x] ISC-444: client style.css (package root, 0 B) and src/style.css deleted; main.ts's src/styles.css remains (Bash)
- [x] ISC-445: engine example.ts, example/example-build scripts, register-ts-node.js, ts-node devDep removed; engine build passes (Bash tsc)
- [x] ISC-446: GameCycle.ts, phases/ (5 files), phaseChain.spec.ts removed; index.ts exports pruned; zero remaining references (grep)
- [x] ISC-447: board/Section.ts deleted; only prior match was flame.ts's local inSection helper (grep)
- [x] ISC-448: stale packages/client/pnpm-lock.yaml removed; root lockfile is the only lockfile (ls)
- [x] ISC-449: engine index.ts export list audited; dead GameCycle/Selection exports and "Old exports" comment gone (grep audit) [refined: remaining consumer-less exports kept deliberately as public API — see Decisions]
- [x] ISC-450: custom.d.ts checked against tsconfig resolveJsonModule; kept or removed with build proof (Bash tsc)
- [x] ISC-451: engine unit tests consolidated to one directory convention; src/tests/ and package-root tests/ eliminated (ls)
- [x] ISC-452: post-consolidation engine suite runs the same tests, count reconciled minus deleted dead-code suites (vitest output)
- [x] ISC-453: client unit tests run with coverage (@vitest/coverage-v8); coverage recorded (Bash)
- [x] ISC-454: utils/cameraBox.ts fully covered by unit tests (vitest + coverage) [refined: already 100% via minimap.spec — verified, no new test needed]
- [x] ISC-455: ui/marineNames.ts covered on determinism and mapping (vitest) [refined: already 100% lines via roster.spec — verified]
- [x] ISC-456: engine missionLoader uncovered lines (27-28, 54-55) exercised by new tests (coverage report)
- [x] ISC-457: engine coverage excludes scripts/ so the report reflects shipping code (vitest config + report)
- [x] ISC-458: HeavyFlamerMarine uncovered branches (35, 41, 51-53) exercised (coverage report)
- [x] ISC-459: engine duplication-review findings triaged: adopted fixes verified by suite, rejections reasoned in Decisions (agent report + Decisions)
- [x] ISC-460: client duplication-review findings triaged the same way (agent report + Decisions)
- [x] ISC-461: phaser removed from client devDependencies (remains a dependency); install/build clean (package.json + pnpm)
- [x] ISC-462: vitest major-version divergence (engine ^3 vs client ^1) resolved or documented with reason (package.json/Decisions)
- [x] ISC-463: client test-results/ ignored by git (Read .gitignore)
- [x] ISC-464: docs/architecture.md engine-internals section reflects removals — no phases/, no GameCycle (Read + grep)
- [x] ISC-465: docs/development-guide.md reflects final test layout and coverage commands (Read)
- [x] ISC-466: README reflects any changed commands or structure; doc links resolve (Bash link check)
- [x] ISC-467: Anti: no doc references a deleted file (grep docs for counter.ts/GameCycle/phases//example.ts/Section.ts)
- [x] ISC-468: Selection.ts placement and GameScene-split assessment decided and logged with reasons (Decisions)
- [x] ISC-469: LICENSE file at repo root contains the canonical full GPL-3.0 text fetched from gnu.org (Read + diff vs source)
- [x] ISC-470: README clearly states GPL-3.0 licensing with link, noting it matches the original game (Read)
- [x] ISC-471: all three package.json files declare the GPL-3.0 SPDX license field (Read)

### Home page, mission flow & manual (2026-08-17 run)

Landing overlay:
- [x] ISC-472: opening `/` with no mission param loads space_hulk_1 as the backdrop (engine.mission.name === 'Suicide Mission') (Playwright evaluate)
- [x] ISC-473: a DOM home overlay is visible at `/` carrying the game title (Playwright locator)
- [x] ISC-474: the overlay includes an intro paragraph describing the game (Playwright text probe)
- [x] ISC-475: the overlay lists all 8 playable missions (6 campaign + 2 beta) with display name and one-line description each (Playwright count)
- [x] ISC-476: debug_1 does not appear in the landing mission list (Playwright zero-count)
- [x] ISC-477: clicking a mission entry navigates to `?mission=<key>` and that mission starts (Playwright click + evaluate)
- [x] ISC-478: a small credits footer names Toby Woodwark's original Sulk, Music of 40K audio, and GPL-3.0 (Playwright text probe)
- [x] ISC-479: a Manual link on the overlay navigates to the manual page (Playwright click + URL check)
- [x] ISC-480: the board is slightly visible beneath the overlay — overlay background is semi-transparent (computed backgroundColor alpha < 1) (Playwright evaluate)
- [x] ISC-481: attract mode disables gameplay input — pressing Enter at `/` does not advance the engine phase (Playwright keyboard + evaluate)
- [x] ISC-482: attract mode does not run the marine-phase clock (timer not started) (Playwright evaluate)
- [x] ISC-483: attract mode constructs no AudioManager (no music on the home page) (Playwright evaluate)
- [x] ISC-484: Anti: opening `/?mission=space_hulk_1` shows NO home overlay (Playwright zero-count)

End-of-mission dialog:
- [x] ISC-485: on a win, a DOM end-dialog appears showing the mission result (Playwright, pinned-seed autoplay win)
- [x] ISC-486: the end-dialog Retry button restarts the same mission (mission param preserved) (Playwright click + URL check)
- [x] ISC-487: the end-dialog "Choose another mission" button returns to the home overlay (Playwright click + locator)
- [x] ISC-488: on a loss, the same dialog appears with the failure result (Playwright, pinned losing seed)
- [x] ISC-489: the existing Phaser MISSION COMPLETE banner still renders behind the dialog (win.spec assertion unchanged) (Playwright)

Abort mission:
- [x] ISC-490: an Abort control is visible while a mission is being played (Playwright locator)
- [x] ISC-491: clicking Abort arms a confirm state; a second click returns to the homepage (Playwright two-click + URL check)
- [x] ISC-492: Anti: the Abort control is absent on the home overlay / attract mode (Playwright zero-count)
- [x] ISC-493: Anti: a single Abort click never navigates — confirmation is required (Playwright single-click + URL check)

Manual:
- [x] ISC-494: /manual.html loads with a title and zero console errors (Playwright pageerror capture)
- [x] ISC-495: the manual carries sections for turn structure, AP/CP, movement, shooting, overwatch, the flamer, close combat, doors, blips, flames, and victory objectives (Playwright heading probes)
- [x] ISC-496: rule numbers in the manual match docs/rules-reference.md (marine 4 AP / stealer 6 AP, d6 CP, overwatch 2 AP range 12, flamer 6 ammo kill 2+, 120s +30/sergeant clock) (grep of content module vs reference)
- [x] ISC-497: the manual contains at least 4 fake in-universe marine quotes styled as distinct blockquote elements (Playwright count)
- [x] ISC-498: the manual renders a TypeScript-built SVG map for every one of the 9 registered missions (Playwright svg count)
- [x] ISC-499: missionMapSVG draws squares by kind, door edges, entry/exit markers, deploy squares, and objective points (vitest on SVG output)
- [x] ISC-500: missionMapSVG element counts for space_hulk_1 match the mission JSON (squares, entries, deploys) (vitest)
- [x] ISC-501: the manual includes a map legend explaining the symbols (Playwright locator)
- [x] ISC-502: the manual links back to the game homepage (Playwright click + URL check)
- [x] ISC-503: the manual's missions section states each mission's objective and squad (Playwright text probes)
- [x] ISC-504: Anti: no copyrighted imagery added — maps are drawn from mission JSON only, no new binary art assets committed (git status inspection)

Build & regression:
- [x] ISC-505: the Vite production build emits both index.html and manual.html (Bash build + ls dist)
- [x] ISC-506: Anti: the full existing e2e suite passes after the change (specs that relied on bare-`/` = debug_1 updated to pin `?mission=debug_1`) (Playwright suite exit 0)
- [x] ISC-507: engine and client unit suites pass (Bash vitest exit 0)
- [x] ISC-508: the new home/manual e2e spec passes within the suite (Playwright)
- [x] ISC-509: README documents the home page, abort control, end dialog, and manual (Read)
- [x] ISC-510: docs/architecture.md covers the new client modules (home overlay, end dialog, abort, manual page) (Read)
- [x] ISC-511: Anti: seeded gameplay unchanged — playthrough.spec and all seeded e2e pass without pin changes (Playwright)
- [x] ISC-512: Anti: zero console errors on the home page (Playwright pageerror capture)
- [x] ISC-513: home overlay and manual visually verified in real Chrome via Interceptor screenshots (Interceptor)
- [x] ISC-514: work committed with a clean tree (Bash git status)

### GitHub Pages deploy (release-gated)

- [x] ISC-515: vite.config.ts sets `base: './'` so built pages work under the /sulkweb/ subpath (Read)
- [x] ISC-516: `__APP_VERSION__` injected via Vite define from `SULK_VERSION` env, `dev` fallback, with a TS declaration (Read)
- [x] ISC-517: version string visible on the homepage credits line (Playwright `#app-version`)
- [x] ISC-518: version string visible in the manual footer (Playwright)
- [x] ISC-519: `.github/workflows/deploy.yml` exists and triggers only on `v*` tag pushes plus manual dispatch (Read)
- [x] ISC-520: workflow gates deploy behind typecheck + engine and client unit suites (needs-chain in yml) (Read)
- [x] ISC-521: workflow builds with `SULK_VERSION` set from the pushed tag name (Read)
- [x] ISC-522: workflow publishes `packages/client/dist` via upload-pages-artifact + deploy-pages with pages/id-token permissions (Read)
- [x] ISC-523: Anti: no workflow trigger fires on plain pushes to main — Pages only updates from tags (Read)
- [x] ISC-524: GitHub Pages enabled on the repo with `build_type: workflow` (gh api 200)
- [x] ISC-525: repo homepage field set to https://harryf.github.io/sulkweb/ and description names the game (gh api)
- [x] ISC-526: README links to the live page near the top (Grep)
- [x] ISC-527: README documents the release process: push tag vX.Y.Z → CI gate → Pages deploy (Grep)
- [x] ISC-528: tag v0.2.0 pushed and its deploy workflow run concluded success (gh run)
- [x] ISC-529: live https://harryf.github.io/sulkweb/ returns 200 with the game HTML (curl)
- [x] ISC-530: live manual.html returns 200 (curl)
- [x] ISC-531: deployed bundle contains version string v0.2.0 and the UI shows it (curl/browser)
- [x] ISC-532: Anti: live page loads with zero console errors despite the gitignored music being absent from the deploy (browser probe)
- [x] ISC-533: local suites still green after changes (client unit + home.spec e2e) (Bash)
- [x] ISC-534: work committed with a clean tree (Bash git status)

### Audio ships with attribution (deploy v0.3.0)

- [x] ISC-535: .gitignore no longer excludes assets/audio; all fetched audio tracked (git ls-files ≥33 files)
- [x] ISC-536: credits.html is a third Vite MPA input with its own entry module (Read)
- [x] ISC-537: credits page renders one music row per MUSIC_TRACKS entry, each linking its YouTube video (e2e count 9)
- [x] ISC-538: music rows show track title, original work, artist, and mission display name (e2e spot checks)
- [x] ISC-539: SFX section lists the Sulk-original set and all SFX_SOURCES with YouTube links (e2e)
- [x] ISC-540: Music of 40K channel credit, playlist link, and non-profit terms are stated on the page (e2e)
- [x] ISC-541: homepage credits line links the audio-credits page (e2e)
- [x] ISC-542: manual footer links the audio-credits page (e2e)
- [x] ISC-543: credits page has a back-to-game link (e2e)
- [x] ISC-544: Anti: zero pageerrors on the credits page (e2e)
- [x] ISC-545: CREDITS.md rewritten to the ships-with-attribution posture (Read)
- [x] ISC-546: README no longer claims the deploy is audio-silent; links the credits page (Grep)
- [x] ISC-547: deploy.yml header comment matches the new posture (Read)
- [x] ISC-548: local gates green: client tsc, unit 43, e2e including the new credits spec (Bash)
- [x] ISC-549: tag v0.3.0 deploy run concluded success (gh run)
- [x] ISC-550: live credits.html returns 200 and contains the YouTube links (curl)
- [x] ISC-551: live assets/audio/music/space_hulk_1.ogg returns 200 (curl)
- [x] ISC-552: live game constructs AudioManager with zero console errors in real Chrome (browser)
- [x] ISC-553: work committed with a clean tree (git status)

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

### Hive AI — AI1 (2026-08-17)

- [x] ISC-567: threat map: an un-jammed overwatching bolter's fire-arc/LOS/range-12 squares form the kill zone; jamming empties it while marine sight persists (vitest hive.spec)
- [x] ISC-568: threat-weighted pathing detours a stealer around a watched corridor whenever a dark route exists; the plain path is unchanged when no threat weights apply (vitest)
- [x] ISC-569: a hidden piece inside the strike ring (graph distance ≤8, unseen, unwatched) holds position while overwatch lanes are live instead of charging (vitest)
- [x] ISC-570: a buildup that stops growing for 3 turns launches as a wave; the launched wave routes through dark approaches (test: flank walk to the marine's side square with zero reaction dice drawn) (vitest)
- [x] ISC-571: when separated approach vectors (≥2 octant steps apart) hold staging squares, the buildup splits across them — pinned by a two-corridor fixture ending one stealer per flank (vitest)
- [x] ISC-572: ≥2 pieces within hunt range converge on a marine isolated ≥4 from every squad-mate, even when another marine is nearer (vitest)
- [x] ISC-573: a stuck cohort (≥3 hidden pieces with no safe route) spends one stealer as blocker: it walks the raw path into the fire lane, soaks exactly one reaction burst, parks with AP in hand, and the lane behind its body leaves the kill zone (vitest, dice counted exactly)
- [x] ISC-574: a parked blocker holds on later activations (no action, no fresh reaction fire) while its square stays watched; followers advance only through dark squares behind it (vitest)
- [x] ISC-575: a staging piece shuts an adjacent open door a marine watches through — silent probe first, closes only when its own side actually goes dark, without leaving cover (vitest)
- [x] ISC-576: jam rush: a jammed watcher leaves no kill zone, so the hive launches instantly and charges to close combat (vitest)
- [x] ISC-577: Anti: hive planning consumes zero dice — RollQueue remaining counts asserted exactly across staging, spread, and blocker fixtures (vitest)
- [x] ISC-578: Anti: every AI0 invariant survives — queue-without-door-flapping, blip door caution, voluntary conversion, exotic step-ons, CC lineup: full engine suite 267/267 (Bash vitest)
- [x] ISC-579: engine passes turnNumber + blipsRemaining into the AI; wave patience resets while reinforcements keep the ready force growing (Read GameEngine + vitest growth-reset behavior)
- [x] ISC-580: no hidden stalls: 140 autoplayed games across space_hulk_1/debug_1/space_hulk_2 all reach win/loss within 40 turns, 0 ongoing (Bash sweep)
- [x] ISC-581: pinned-seed fixtures re-scanned at the FINAL AI state: beta_2 opposed-win re-pinned 9→6 (scan 1-80, 5 wins); debug_1 seed-1 win, space_hulk_1 seed-3 loss, and all 56 e2e hold unchanged (Bash vitest + playwright)

### Hive objective awareness + hunger (2026-08-18)

- [x] ISC-582: the engine passes the marines' destination squares (objectivePoint/objectivePoints/downloadPoint/exitPoints; kill-quota → entryPoints) into the hive; exterminate-style hunts pass none (Read GameEngine + vitest)
- [x] ISC-583: a marine within 4 graph squares of a destination flips the hive reckless — staged pieces launch on the FIRST plan instead of massing (vitest hive.spec)
- [x] ISC-584: wave threshold shrinks with the mission clock — min(base, max(2, ceil(marineObjDist/3))) — so "enough" is whatever the hive has when time is short (Read hive.ts + suite)
- [x] ISC-585: growth-keyed patience is bounded: growth reset disabled when turnsLeft ≤ 3 and an absolute 6-turn massing cap fires regardless — uncapped reinforcements can no longer postpone the wave forever (Read + vitest)
- [x] ISC-586: hidden squares within 6 of a destination are staging candidates and count as staged force — the buildup camps/blocks the marines' target even when the squad is far away (vitest: stealer parks in the destination ring, unseen, zero reaction dice)
- [x] ISC-587: a piece stationary for 3 consecutive plans is forced to assault; the idle counter resets on any move (Read + vitest)
- [x] ISC-588: a frustrated BLOCKED blip converts voluntarily even with marines beyond 6 — the (3,7) door-stack deadlock breaks because emerging stealers have no door caution (vitest: exposure-door blip converts after idling, 2 stealers spawn)
- [x] ISC-589: spawnBlips rotates its round-robin start by turn number and prefers entries no marine sees; engine passes turnNumber % entries.length (vitest: rotation + watched-entry-skipped fixtures)
- [x] ISC-590: Anti: idle pieces never stall long-term — probe over 40 full autoplayed games (space_hulk_1 + space_hulk_2, 15 turns each): worst consecutive idle 3 turns, zero pieces at 5+ (Bash probe)
- [x] ISC-591: Anti: no regression — full engine suite 272/272, e2e 56/56, build clean; beta_2 pin re-scanned at final state (52, the only win in 1-80 under the rush probe) (Bash)

### Hive pin / blood / zigzag / entry strategy (2026-08-18, second run)

- [x] ISC-592: staged pieces are exempt from the idle-hunger override — a hidden flank-holder keeps role `stage` past the idle cap while growth keeps the wave clock resetting (vitest pin fixture)
- [x] ISC-593: a frustrated blocked blip STILL converts at the next launch (frustration set is independent of role exemption) — the door-deadlock fix survives pinning (vitest hunger fixture unchanged)
- [x] ISC-594: marine losses tighten the hidden ring (8 → 6 at first blood → 4 at half strength) and cap the wave threshold at squad+1 — the pack creeps closer, still hidden (vitest blood fixture)
- [x] ISC-595: a charge into an overwatched corridor weaves through side alcoves — exactly ONE reaction burst for a four-square advance, asserted by scripted-queue exhaustion (vitest zigzag fixture)
- [x] ISC-596: among adjacent marines, close combat targets an un-jammed overwatcher first (Read StealerAI watcherFirst + suite)
- [x] ISC-597: spawn entries rank by distance to the marines' destination — the bulk rotates among the top three, entries in marine sight go last (vitest entry-strategy fixture)
- [x] ISC-598: every third turn (incl. turn 1's opening spawn) one blip spawns at the unseen entry nearest the MARINES — a standing feint pinning that approach (vitest: turn 4 spawns at the near entry)
- [x] ISC-599: Anti: legacy spawn semantics preserved where no marines/objectives exist (rotation + round-robin + occupied-skip fixtures all green) (vitest)
- [x] ISC-600: Anti: no over-aggression regression — debug_1 sweep still 40W/0L; all-mission sweeps terminate, 0 ongoing (Bash)
- [DEFERRED-VERIFY] ISC-601: beta_2 remains winnable under skilled play [probe evidence RETIRED — doubly invalid: (a) 0 wins in seeds 1-400 against the camping hive, (b) the autopilot corks its OWN Data Room corridor (perimeter hold-radius 2 parks a bolter in the 1-wide approach — old opposed wins only happened because stealers killed the cork). Follow-up: designer (user) playtest of beta_2; tuning lever OBJ_RING(6) in Decisions. The fixture now pins the deterministic opposed LOSS.]
- [x] ISC-602: the beta_2 download is mechanically completable on the REAL map — lone sergeant, zero opposition: walks onto (12,22), 4→0, win (vitest capability fixture; distinguishes "brutally hard" from "structurally broken")
- [x] ISC-603: feint cadence keys on turn + stealer casualties (not a countable fixed period) and stays a pure function of board state — seed-deterministic, zero dice (Read spawnBlips + 277/277 suite with re-pins)

### Door-corner LOS + conversion legality + keyboard door fire (2026-08-18, third run — user bug report)

- [x] ISC-604: a marine diagonal to a closed door edge cannot see the square behind it — a sight line grazing the door segment's ENDPOINT blocks like a crossing (vitest door_corner fixture, both diagonals)
- [x] ISC-605: the same diagonals see through once the door opens; straight-on sight unchanged closed and open (vitest control cases)
- [x] ISC-606: `squareSeenByMarine` is false for the doorway square with only an angled marine present — blips behind a closed door no longer convert to a marine at an angle (vitest)
- [x] ISC-607: blip conversion never seats a stealer across a closed door edge (orthogonal) or across its corner (diagonal) — seats must be one LEGAL step from the blip square, mirroring `doorBetween` + `diagonalBlockedByDoor` (vitest, doorway fixture: all seats on the blip's side)
- [x] ISC-608: with no legal seat beyond the origin, the surplus stealer is LOST and the `blipConverted` event reports it (vitest dead-end fixture, lost: 1)
- [x] ISC-609: an OPEN door restores the across-the-edge seat; occupied legal seats still exclude (vitest)
- [x] ISC-610: pressing F with NO hover and no enemy in sight shoots the nearest shootable closed door — pure keyboard play can always fire at doors (Playwright, hoverCoord null, door destroyed, 1 AP)
- [x] ISC-611: a visible enemy keeps F priority — the stealer dies, the door stays intact (Playwright)
- [x] ISC-612: Anti: the hovered-door path is unchanged — hover a flank square + F still shoots that door (existing ISC-355 e2e green; plus real-pointer repro via canvas-rect mapping)
- [x] ISC-613: Anti: no pinned determinism fixture shifts — full engine suite (285) and full e2e suite (58) green with zero re-pins (Bash)
- [x] ISC-614: keyboard help and rules reference document the F door fallback and the door-corner LOS rule (Read keyboardHelp.ts + docs/rules-reference.md)
- [ ] ISC-615: [DROPPED — see Decisions 2026-08-18 door-UX run: the hover gate made the fallback unreachable in real play (any mouse move sets hoverCoord); reverted per user playtest, replaced by the visible reticle ISC-620 + ISC-621]
- [x] ISC-616: every door-segment endpoint on every registered mission has ≤3 passable neighbouring squares — the map property the corner LOS rule relies on is pinned hermetically (vitest mission_meta sweep, all 9 missions)
- [x] ISC-617: Anti: a long diagonal threading door-free corners stays visible — the endpoint rule touches only closed-door segments (vitest, (0,0)→(4,4) through the doorway fixture's room)
- [x] ISC-618: v0.4.2 released — tag on main, CI gates green on the tag commit, GitHub release published, live site serves v0.4.2 (gh run 32175393177 success; bundle grep; release URL)
### Door-fire UX: reticle, real fallback, cause-aware audio (2026-08-18, fourth run — user playtest of v0.4.2)

- [x] ISC-620: a red reticle marks the door F would currently hit — hovered door first, else (when no enemy soaks the shot) the nearest shootable closed door; cleared when no target (Playwright: doorReticleFor states across all three scenarios + screenshot)
- [x] ISC-621: F auto-shoots the nearest shootable closed door even while the pointer rests on a non-door square — the v0.4.2 hover gate is reverted (Playwright: hoverCoord set, F, door destroyed, AP 4→3)
- [x] ISC-622: doorDestroyed carries `cause` — 'cut' plays the chainsaw, 'shot' stays with the weapon's own firing SFX (vitest: bolter shootDoor emits cause 'shot', chain-fist cutDoor emits 'cut'; Read AudioManager gate)
- [x] ISC-623: Anti: enemy priority survives the UX pass — a visible stealer takes the shot, the door stays intact, and the reticle is already null before the press (Playwright)
- [x] ISC-624: v0.4.3 released — tag CI green BEFORE the release was created (v0.4.2 lesson applied), release published, live bundle serves v0.4.3 with the reticle code present (gh run 32227022477 success; bundle grep v0.4.3 + doorReticle×2)
- [DEFERRED-VERIFY] ISC-619: live-site real-Chrome boot check (now v0.4.4) [both browser channels down this session: Interceptor extension handshake broken (3rd occurrence), claude-in-chrome denied by permission classifier. Mitigation: the same commit passed the full 62-test real-browser e2e suite locally incl. space_hulk_1 boot. Follow-up: repair Interceptor (Update workflow / Chrome restart), then `interceptor open https://harryf.github.io/sulkweb/?mission=space_hulk_1`]
### Enemy target reticle: see which stealer F shoots (2026-08-19, fifth run — user follow-up on v0.4.3)

- [x] ISC-625: the fire-target computation returns a discriminated union — hovered door, else nearest enemy, else nearest shootable door — from the SAME helpers handleFire uses, so indicator and shot can never diverge (Read GameScene fireTarget + grep shared helper names in both paths)
- [x] ISC-626: when the selected bolter/cannon marine has an enemy in fire arc + LOS, the red reticle is drawn centred on that enemy's square (Playwright: staged stealer, fireReticleFor = {kind:'enemy', pieceId, x, y})
- [x] ISC-627: when no enemy is visible the reticle still marks the door target exactly as in v0.4.3 — door-edge midpoint, hovered door first, else nearest shootable door (Playwright: fireReticleFor = {kind:'door', ...} at the staged door anchor)
- [x] ISC-628: a hovered closed door outranks a visible enemy in the reticle, matching F's actual priority (Playwright: stealer visible + hoverCoord on the door square → fireReticleFor kind 'door')
- [x] ISC-629: the enemy reticle marks the NEAREST enemy when several are visible — the one F actually kills (Playwright: two staged stealers at different ranges, reticle pieceId = nearer stealer's id, F kills that piece)
- [x] ISC-630: the reticle clears/retargets immediately after the shot — dead enemy never keeps a stale crosshair (Playwright: F, then fireReticleFor is null or a different target, never the dead pieceId)
- [x] ISC-631: Anti: no reticle in attract mode, when the game is over, when the flamer is selected (the only non-bolter-family marine — the chain fist extends StormBolterMarine and correctly keeps his bolter reticle), or when the marine is jammed/out of AP/ammo — fireTarget guards + the new canShootPiece legality mirror (Read guards + Playwright ap-exhausted probe + vitest empty-drum mirror)
- [x] ISC-632: Anti: the v0.4.3 door-keyboard regression suite still passes end-to-end after the rename (bunx playwright test door-keyboard)
- [x] ISC-633: keyboard-help note and rules-reference doc describe the reticle as marking F's target — enemy or door (Read both files)
- [x] ISC-634: full client e2e suite + engine tests green, typecheck clean (bun run test / e2e output)
- [x] ISC-635: v0.4.4 released — tag CI green BEFORE the release was created, release published, live bundle serves v0.4.4 with fireReticle code present (gh run 32230347102 success; bundle grep v0.4.4 + fireReticle×9)

### Keyboard remap: directional circle + weapon-key clarity (2026-08-19, sixth run — user playtest feedback)

- [x] ISC-636: Z moves diagonally back-LEFT and C moves diagonally back-RIGHT (swapped from v0.4.4), both at the 2 AP backward cost with facing kept (Playwright keymap: staged bolter, press z/c, assert pos+ap)
- [x] ISC-637: X moves straight backward (2 AP) — the QWE/AD/ZXC keys now form a directional circle around S (Playwright: press x, pos one square behind facing, ap −2)
- [x] ISC-638: S opens/closes the door ahead exactly as H does — H stays bound as an alias (Playwright: staged closed door ahead, press s, door isOpen; press h on another door still works)
- [x] ISC-639: M performs melee on the enemy directly ahead (Playwright: staged foe ahead, dice pinned, press m, closeCombat event fired, nobody self-destructed)
- [x] ISC-640: K toggles mute and the setting still persists across reload via localStorage sulk_muted (Playwright audio spec: press k, audio.muted true, reload, still true)
- [x] ISC-641: Anti: M no longer touches the audio — a press of M with audio constructed leaves audio.muted unchanged (Playwright: press m in the audio spec, muted stays false)
- [x] ISC-642: keyboardHelp KEY_ROWS data reflects the new layout — Z "back left", X "back", C "back right", S "open door", M "melee", K "mute" — with no duplicate keys and every bound key labeled (vitest keyboardHelp spec)
- [x] ISC-643: R and T keycaps carry the sub-label "assault cannon" and G carries "chain fist", rendered beneath the action word in both the in-game help and the manual page (vitest sub fields + Playwright DOM)
- [x] ISC-644: in-game keyboard help DIMS R/T/G in a mission that fields no assault cannon or chain fist marine (space_hulk_1) — keycap gets the disabled style (Playwright: class assertion on the caps)
- [x] ISC-645: in-game keyboard help shows R/T/G fully enabled in beta_2, the mission that fields both specialists (Playwright: no disabled class)
- [x] ISC-646: README controls table matches the new bindings — X back, Z/C back-left/right, S+H door, M melee, K mute listed (Read/grep README)
- [x] ISC-647: manual CONTROLS_INTRO and KEY_NOTES carry no stale references to the old layout (S back, X melee, M mute) (grep client src for stale strings)
- [x] ISC-648: the roster Credits line "M mutes sound" now says K (grep RosterPanel)
- [x] ISC-649: Anti: no em dashes introduced in any new or edited player-facing string (grep changed display strings)
- [x] ISC-650: Anti: the flamer-aim cancel key list treats M as an ACTION (cancels aim) while K (mute) keeps the aim, matching the old M-mute behavior (Read GameScene cancel string: m present, k absent)
- [x] ISC-651: the full client e2e suite (updated keymap/audio/help specs) and engine vitest pass, tsc clean in both packages (Bash exit codes)
- [x] ISC-652: Anti: the B double-press self-destruct disarm logic is untouched by the remap — pressing any non-B action key still disarms (Playwright keymap B test still green)
- [x] ISC-653: v0.4.5 released — main pushed, tag CI green BEFORE the release was created, release published, live bundle serves v0.4.5 with the remapped key handling present (gh run 32237513444 success; main bundle grep v0.4.5 + keydown-K; keyboardHelp chunk carries back left/right, open door, melee, mute, all three weapon subs)

### Number-key marine selection: mouseless play (2026-08-19, seventh run — user follow-up on v0.4.5)

- [x] ISC-654: pressing 1..5 selects the nth marine of the FIRST squad row as displayed (sergeant first, then specials, then bolters) — same order the cards render (Playwright: Selection.get() matches the roster entry id per key)
- [x] ISC-655: pressing 6..0 selects the nth marine of the SECOND squad row in a two-squad mission (beta_2: Sakharov 1-5, Sternfeld 6-0) (Playwright)
- [x] ISC-656: hotkey assignment is positional per squad BLOCK — squad two always starts at 6 regardless of squad one's size; single-squad missions leave 6..0 unassigned (vitest assignHotkeys)
- [x] ISC-657: numbers never reshuffle on death — a dead marine keeps his number and no survivor's number changes (vitest: map computed once from the scene-start roster; Playwright: kill then re-press others)
- [x] ISC-658: pressing a dead marine's number leaves the current selection unchanged (Playwright: kill, press his key, Selection.get() unchanged)
- [x] ISC-659: pressing an escaped marine's number leaves the selection unchanged — escape sets alive=false exactly like death, one guard covers both (Read GameEngine.tryEscape + selectFromRoster guard; vitest not needed beyond the alive gate)
- [x] ISC-660: a number press goes through the SAME selectFromRoster path as a card click — flamer aim disarmed, selected event emitted, camera pans to the marine (Playwright: flamerAiming true then number press leaves it false; Read for the shared call)
- [x] ISC-661: each living marine's roster card shows his hotkey as "[n]" (Playwright DOM: .m-hotkey text per card)
- [x] ISC-662: the hotkey badge is cleared from the card when the marine dies or escapes, matching the inert key (Playwright: kill, .m-hotkey empty on that card)
- [x] ISC-663: a squad with more than 5 marines assigns hotkeys only to its first five display positions — extras get none, no crash (vitest synthetic entries)
- [x] ISC-664: a third squad (if a future mission has one) gets no hotkeys (vitest synthetic entries)
- [x] ISC-665: Anti: attract mode ignores number keys — the homepage backdrop never gains a selection (existing keyboard disable; Playwright home: press 1, Selection empty)
- [x] ISC-666: Anti: a number press while paused or during the stealer replay does nothing (selectFromRoster guard; Playwright: pause then press)
- [x] ISC-667: the keyboard help documents the number row (KEY_NOTES line naming 1-5 / 6-0 squads) and README controls table gains the 1-0 row (Read both)
- [x] ISC-668: Anti: no em dashes in any new player-facing string (grep added display strings)
- [x] ISC-669: Anti: the digit keys do not collide with existing bindings — no addKeys change, dedicated keydown-DIGIT handlers with the shared seenKeyEvents dedupe (Read GameScene)
- [x] ISC-670: full client e2e + unit suites and engine tests green, tsc clean both packages (Bash exit codes)
- [x] ISC-671: v0.4.6 released — main pushed, tag CI green BEFORE the release was created, release published, live bundle serves v0.4.6 with the hotkey code present (gh run 32244944758 success; main-BjwaXd1w.js: v0.4.6 + m-hotkey x2; keyboardHelp-Bm7SgSOc.js: select-marine + press-his-number strings)

### Minimap radar: click focus, marine dots, pulsing echoes, distance audio (2026-08-19, eighth run)

- [x] ISC-672: clicking the minimap centers the main camera on the corresponding world point — local px / mapScale (Playwright: click a minimap point, camera midpoint lands on the expected world coords)
- [x] ISC-673: click-to-focus respects the existing camera bounds — a corner click clamps at setBounds, never scrolls past (Playwright corner click, scroll within bounds)
- [x] ISC-674: the white viewport box follows a minimap click — lastBox moves toward the clicked point (Playwright lastBox before/after)
- [x] ISC-675: Anti: a minimap click never changes the selection — the selected marine stays selected (Playwright: select, click minimap, Selection.get() unchanged)
- [x] ISC-676: cursor-key camera panning still works after the change (Playwright: arrow key scrolls camera)
- [x] ISC-677: the minimap-local-to-world projection is a pure unit-tested function (vitest miniToWorld)
- [x] ISC-678: every living marine renders as a red dot at his board square on the minimap (Playwright probe: dot count equals living marines)
- [x] ISC-679: a marine's dot follows his movement (Playwright: move marine, dot position updates)
- [x] ISC-680: a dead marine's dot disappears (Playwright: kill, dot count drops)
- [x] ISC-681: an escaped marine's dot disappears — the same alive filter covers death and escape (Read alive filter; ISC-659 engine pin already guarantees escape sets alive=false)
- [x] ISC-682: stealer echoes use a solid green radial-gradient cloud texture, blip echoes a fainter wider more transparent one (Read texture generation params)
- [x] ISC-683: stealer echo peak alpha strictly greater than blip echo peak alpha (vitest on radar config)
- [x] ISC-684: decoy ambush counters (kind 'blip') render as blip echoes with no special case (Read kind routing; vitest predicate)
- [x] ISC-685: echo positions project piece board squares to minimap px with the same scale as the tiles (vitest projection; Playwright probe)
- [x] ISC-686: echoes appear only via pulses — before the first pulse none are visible (Playwright: echo count 0 at boot)
- [x] ISC-687: AudioManager fires an onPing callback each tracker cycle with the interval, even when the ping WAV is absent from cache (Read: callback outside the cache guard)
- [x] ISC-688: pulse rings expand from each living sergeant's minimap position (Playwright probe: pulse origins equal living sergeant squares)
- [x] ISC-689: Antecedent: echo reveal is delayed proportionally to minimap distance from the nearest living sergeant, so the radar reads as a physical expanding wavefront rather than a UI toggle (vitest pulse timing function; Playwright delayed-appearance probe)
- [x] ISC-690: echoes fade out over the pulse interval so each pulse visibly refreshes them (vitest: fade duration derived from interval)
- [x] ISC-691: pulse cadence IS the tracker cadence — closer threats mean faster pulses, no separate clock (Read: onPing wired only from scheduleTracker)
- [x] ISC-692: with no living sergeant there are no pulse rings and no echoes — stealers and blips vanish from the minimap (Playwright: kill sergeants, pulse, echo count 0)
- [x] ISC-693: marine red dots remain visible with no living sergeant (Playwright same scenario: dots unchanged)
- [x] ISC-694: mute does not stop the pulses — mute silences sound, not scheduling (Read: scheduleTracker runs regardless of scene.sound.mute)
- [x] ISC-695: Anti: attract mode shows no echoes and no pulse errors — no AudioManager means no pulses, no crash (Playwright home boot, zero console errors, echo count 0)
- [x] ISC-696: game over stops the pulses (Read: existing gameOver trackerTimer.remove path also stops onPing)
- [x] ISC-697: Anti: echo objects are reused per piece id across pulses — repositioned, never recreated per pulse (Read: Map keyed by pieceId)
- [x] ISC-698: pure distanceGainFactor returns 1.0 at or inside fullDist (vitest)
- [x] ISC-699: distanceGainFactor returns minGain at or beyond farDist — quiet but never silent (vitest)
- [x] ISC-700: distanceGainFactor is monotonic non-increasing between the bounds; null distance returns 1.0 (vitest)
- [x] ISC-701: doorToggled SFX volume scales with the door's distance from the nearest living marine — a far stealer door plays quiet, a marine-adjacent door plays full (Playwright: emit far and near doorToggled, compare lastPlay.volume)
- [x] ISC-702: stealer skitter volume attenuates by the mover's position (Read routing; e2e lastPlay)
- [x] ISC-703: the blip-conversion voice attenuates by the conversion square (Read routing)
- [x] ISC-704: the stealer death cry attenuates by the death square (Read routing)
- [x] ISC-705: a stealer close-combat attack plays effectively full — the attacker is adjacent to a marine, inside fullDist (vitest boundary: dist 1 gives factor 1.0)
- [x] ISC-706: AudioManager exposes a lastPlay {key, volume} probe surface for the e2e suite (Read; consumed by ISC-701)
- [x] ISC-707: Anti: marine-caused sounds keep their current loudness — shots, flame, jam, malfunction stay unrouted at full gain (Read: those handlers unchanged)
- [x] ISC-708: Anti: main-map rendering of stealers and blips is unchanged — the radar reveals nothing outside the minimap (git diff: no piece-sprite render path edits)
- [x] ISC-709: Anti: no em dashes in any new player-facing string (grep new display strings)
- [x] ISC-710: README and the in-game/manual docs mention minimap click-to-focus and the sergeant radar (Read both)
- [x] ISC-711: typecheck clean in both packages (Bash tsc exit 0 twice)
- [x] ISC-712: engine tests, client unit tests, and the full e2e suite green (Bash exit codes)
- [x] ISC-713: Anti: pulse rings and echo images never paint outside the minimap rectangle — screen-space geometry mask on the ring and echo layers (Read mask construction; full-canvas screenshot mid-sweep)
- [x] ISC-714: the radar freezes during the stealer-phase replay — no dot redraws or pulses read the final engine state ahead of the animation (Read: minimap.frozen set with animating, pulse/drawMarines gated)
- [x] ISC-715: positional attenuation reads a payload-driven marine mirror, so replayed sounds anchor to the board AS SHOWN — a marine dying mid-replay holds full volume until his death event plays (Read mirror seeding + pieceMoved/pieceDied/marineEscaped/pieceAdded upkeep)
- [x] ISC-716: the echo timing envelope (delay + ramp + fade) always fits the pulse interval — at panic cadence the DELAY collapses, never the ramp or the dwell floor (vitest)
- [x] ISC-717: the first tracker cycle cannot be missed — the ping callback rides the AudioManager constructor ahead of any synchronous startAll (Read)
- [x] ISC-718: click-to-focus centres the clicked point in the VISIBLE play area, offsetting the HUD-covered half of the canvas (Read onFocus +HUD_WIDTH/2)
- [x] ISC-719: beta_2 pulses ride BOTH sergeants (origins = both positions) and one sergeant's death leaves the other's auspex alive (Playwright)
- [x] ISC-720: the kind-to-style wiring is pinned end to end — the stealer's echo wears echo_stealer, the blip's echo_blip, via the echoTexture probe (Playwright)
- [x] ISC-721: Anti: marine gunfire is never attenuated — a shot event plays at exactly the full SFX gain (Playwright lastPlay)
- [x] ISC-722: the live onPing wiring pulses the minimap with no test scaffolding — lastPulse set by the real scheduler alone (Playwright waitForFunction)
- [x] ISC-723: v0.4.7 released — main pushed, tag CI green BEFORE the release is created, release published, live bundle serves v0.4.7 with the radar code present (gh run watch; bundle greps for version + radar strings)

### Main-map motion: piece animation, sliding doors, flame shimmer, camera inertia (2026-08-19, ninth run)

Pure motion logic (`utils/motionLogic.ts`, vitest):
- [x] ISC-724: a new pure module `utils/motionLogic.ts` exports a MOTION config with per-kind step profiles (marine, stealer, blip), each naming duration and ease (Read + vitest)
- [x] ISC-725: Antecedent: kind contrast is pinned — stealer step duration < marine step duration < blip step duration, the precondition for heavy-vs-nimble-vs-suggestive reading as intended (vitest)
- [x] ISC-726: the marine step stays under 200ms — heavy but never wasting the countdown (vitest threshold)
- [x] ISC-727: `kindFromTexture` maps 'stealer' to stealer, 'blip' AND 'ambush_counter' to blip, and every terminator_* key to marine — the decoy counter inherits the blip slide with no special case (vitest)
- [x] ISC-728: `camPanStep` velocity ramps monotonically under held input and never exceeds its cap for any dt in a sweep (vitest)
- [x] ISC-729: `camPanStep` decays released velocity below 1% of cap within 400ms of no input (vitest)
- [x] ISC-730: door slide config: open shrinks the door's long axis to a small parted fraction, close restores to exactly 1, both under 220ms (vitest)
- [x] ISC-731: `shimmerPhase(x,y)` is deterministic — same square same offset, adjacent squares differ (vitest)
- [x] ISC-732: `recoilVector(facing)` returns a small (≤3px) offset opposite the facing unit vector for all four facings (vitest)

Scene wiring (Playwright):
- [x] ISC-733: a legal interactive marine step tweens the sprite — the motionLog probe records a tweened marine step at the marine profile duration and the sprite settles at exactly the destination square centre (Playwright debug_1)
- [x] ISC-734: marine turns ease the rotation and the settled angle is equivalent to facing·π/2 modulo 2π (Playwright)
- [x] ISC-735: the selection highlight and overwatch/jam markers ride the sprite every frame — after settle they sit exactly on/at their sprite offsets (Playwright)
- [x] ISC-736: during the stealer-phase replay the step log records stealer moves at the stealer profile duration (Playwright stepLog probe)
- [x] ISC-737: blip replay moves use the blip slide profile in the step log (Playwright stepLog probe)
- [x] ISC-738: doorToggled animates a slide — the motionLog records the door motion and the settled state is the correct texture at scale exactly 1 (Playwright)
- [x] ISC-739: every burning square's flame sprite carries a looping shimmer tween while alight (Playwright isTweening)
- [x] ISC-740: flamesCleared kills the shimmer and destroys the sprite — flameSprites empty for those squares, no orphan tweens (Playwright)
- [x] ISC-741: a marine shot recoils the shooter sprite (tween observed) and returns it to the exact square centre (Playwright)
- [x] ISC-742: a killed piece's sprite plays the death flourish (alpha/scale tween) and is destroyed at the end (Playwright)
- [x] ISC-743: arrow-key panning has inertia — camVel ramps while held, decays to zero after release, and the scroll stops changing (Playwright camVel probe)
- [x] ISC-744: a fast drag flick leaves momentum — camVel is nonzero right after mouseup and decays to zero (Playwright)
- [x] ISC-745: pointerdown grabs the map — starting a new drag mid-glide zeroes the momentum (Playwright)
- [x] ISC-746: doorDestroyed plays a crumble (fade/shrink) before the sprite is destroyed, and the sprite map entry is removed immediately (Playwright)

Anti-criteria:
- [x] ISC-747: Anti: prefers-reduced-motion disables all new motion — a W step lands at the destination centre with no tween on the immediate next probe (Playwright emulateMedia)
- [x] ISC-748: Anti: post-replay reconciliation stays exact — every piece sprite ends at engine-truth position AND scale 1, alpha 1 (existing drift check + scale/alpha extension)
- [x] ISC-749: Anti: the minimap gains no motion — no new tween targets any minimap layer; the radar e2e suite stays green (Playwright suite)
- [x] ISC-750: Anti: the ISC-676 arrow-pan regression stays green — a 250ms held arrow still moves the camera (Playwright)
- [x] ISC-751: Anti: animation never delays the engine — AP and engine position update synchronously on the keypress while the sprite is still mid-tween (Playwright)
- [x] ISC-752: Anti: no em dashes in any new or edited player-facing string (grep)
- [x] ISC-753: Anti: the attract-mode homepage stays clean — zero pageerrors with the animation code present (existing home test green)
- [x] ISC-754: Anti: rapid consecutive steps never desync — two quick legal W presses settle the sprite at the FINAL engine square exactly (Playwright)
- [x] ISC-755: Anti: repeated rapid shots never displace a marine — after two quick F shots the sprite is back at the exact centre (Playwright)

Docs + suites:
- [x] ISC-756: README gains a short Motion note covering the new animation and the prefers-reduced-motion respect (Read)
- [x] ISC-757: engine suite untouched and green (bun test)
- [x] ISC-758: client unit suite green with new motionLogic specs at 100% coverage for the new module (bun run test)
- [x] ISC-759: full client e2e suite green including the new animation spec (bunx playwright test)
- [x] ISC-760: tsc clean in both packages (bunx tsc --noEmit)
- [x] ISC-761: visual evidence captured — a mid-replay or mid-slide screenshot set written to the scratchpad (Playwright screenshots)
- [x] ISC-762: v0.4.8 released — main pushed, tag CI green BEFORE the release is created, release published, live bundle serves v0.4.8 with the motion code present (gh run watch; bundle greps for version + motion strings)

### Charging stealers + replay action camera (2026-08-19, tenth run)

Engine — charge facing:
- [x] ISC-763: the hive gains a phase-end chargeOrientation sweep (refined from the per-move tryMove hook — see Decisions); marine and blip movement code untouched, Piece.ts diff net-zero (vitest + git diff)
- [x] ISC-764: a stealer ending a move within the charge radius of a living marine faces the NEAREST one (vitest)
- [x] ISC-765: a stealer beyond the charge radius keeps its path facing (vitest)
- [x] ISC-766: nearest is Chebyshev-minimal with a deterministic tie (board order) (vitest)
- [x] ISC-767: orientation is free — AP after the move equals the move cost alone, and lastFreeTurn bookkeeping is untouched (vitest)
- [x] ISC-768: Anti: blips never charge-face (vitest)
- [x] ISC-769: Anti: dead marines are never charge targets (vitest)
- [x] ISC-770: the sweep emits a facing-only pieceMoved ONLY for stealers whose facing actually changes, once at phase end — never per move (vitest capture)
- [x] ISC-771: engine suite green including the new charge specs (bun test)

View — pure replay-focus planner:
- [x] ISC-772: a new pure module exports the FOCUS config (near distance, retarget throttle, pan/shake/vignette/lunge params) (vitest)
- [x] ISC-773: planReplayFocus annotates near-marine piece moves with focus points (vitest)
- [x] ISC-774: far-from-marine moves produce no focus (vitest)
- [x] ISC-775: pieces spawned this phase never produce a focus (vitest)
- [x] ISC-776: retarget throttle — consecutive events near the current focus target produce no new pan until the action moves beyond the retarget distance (vitest)
- [x] ISC-777: closeCombat always yields an attack annotation carrying attacker and defender squares (vitest)
- [x] ISC-778: the planner's position tracker follows the stream — a piece that moves then attacks is annotated at its NEW square (vitest)
- [x] ISC-779: 100% coverage on the new planner module (bun run test)

Scene wiring:
- [x] ISC-780: during the replay the camera pans to near-marine action — focusLog probe entries + camera midpoint lands within a tile of a focus target (Playwright)
- [x] ISC-781: a stealer attack pans the camera to the fight (focusLog attack entry, midpoint near the defender) (Playwright)
- [x] ISC-782: attack effects fire — shake + spotlight vignette recorded via the lastAttackFx probe, vignette gone after the replay (Playwright)
- [x] ISC-783: the attacker lunge is recorded in motionLog and the attacker settles at its exact square centre (Playwright)
- [x] ISC-784: charge facing is visible — after the replay a spawned stealer's sprite rotation matches its engine facing, toward the nearest marine (Playwright)
- [x] ISC-785: Anti: far moves and spawn events produce zero focusLog entries (Playwright)
- [x] ISC-786: Anti: the reduced-motion instant replay stays exact with no pans or effects (Playwright)
- [x] ISC-787: Anti: replay pacing is unchanged — one pieceMoved event per stealer move, verified from the captured stream (vitest/Playwright)
- [x] ISC-788: Anti: the arrow-pan and drag regressions stay green (player camera control intact) (Playwright suite)
- [x] ISC-789: full client e2e suite green (bunx playwright test)
- [x] ISC-790: client unit suite green (bun run test)
- [x] ISC-791: tsc clean in both packages (bunx tsc --noEmit)
- [x] ISC-792: README notes the charging stealers and the action camera (Read)
- [x] ISC-793: visual evidence — an attack-vignette screenshot in the scratchpad (Playwright)
- [x] ISC-794: Anti: no em dashes in any new player-facing string (grep)
- [x] ISC-795: v0.4.9 released — main pushed, tag CI green BEFORE the release is created, release published, live bundle serves v0.4.9 with the charge + action-camera code present (gh run watch; bundle greps for version + focus strings)

### Deployment phase (2026-08-19 run)

- [x] ISC-796: engine rules/deploy.ts exports pure orderSquaresFrontToBack — front = argmax(pos·facingVec); a left-facing squad orders lowest-x first (unit)
- [x] ISC-797: pure autoDeployPlan orders reserves storm_bolter, sergeant(/sword), heavy weapon, remainder — assigned front to back (unit)
- [x] ISC-798: GameEngine.beginDeployment moves every marine into engine.reserve (deployment order kept), sets phase Deploy, locks the board (unit)
- [x] ISC-799: Anti: beginDeployment refuses after turn 1 has begun, when already in Deploy, or with no marineDeployment (unit)
- [x] ISC-800: deployMarine places a reserve marine on a free deploy square of HIS squad at the square default facing, emitting pieceAdded (unit)
- [x] ISC-801: Anti: deployMarine refuses non-deploy squares, occupied squares, already-deployed marines, and wrong phase (unit)
- [x] ISC-802: Anti: cross-squad deployment refused — a marine cannot take a square tagged with another squad (unit)
- [x] ISC-803: undeployMarine returns a deployed marine to reserve and frees the square (unit)
- [x] ISC-804: turnDeployed rotates a deployed marine free of AP cost and emits a facing-only pieceMoved (unit)
- [x] ISC-805: Anti: normal piece actions dead during Deploy — tryMove/tryTurn/shoot return false via the locked board (unit)
- [x] ISC-806: autoDeploy fills only FREE squares with remaining reserves in the sensible order per squad; player placements untouched (unit)
- [x] ISC-807: finishDeployment auto-deploys the remainder, unlocks the board, sets phase MarineAction with every marine on board at full AP (unit)
- [x] ISC-808: Suicide auto-deploy: front square (10,4) holds a storm bolter, sergeant behind, flamer third — flamer no longer in front (unit)
- [x] ISC-809: Anti: checkVictory is inert during Deploy — an empty board is not a squad wipe (unit)
- [x] ISC-810: Anti: engine pieceMoved side effects (blip conversion, escape, download abort) suppressed during Deploy (unit)
- [x] ISC-811: deployment consumes no dice — same seed, any deploy sequence, identical CP and blip values to an untouched game (unit)
- [x] ISC-812: space_hulk_5.json squares (10..14,10) face right (Read)
- [x] ISC-813: Anti: the Decoy diff touches ONLY those five facing values (git diff)
- [x] ISC-814: missions with 2+ deploy squares boot into deploy mode; ?deploy=0 skips straight to MarineAction (e2e)
- [x] ISC-815: Anti: attract mode (no mission param) never enters deploy mode (e2e)
- [x] ISC-816: free deploy squares show an X marker; occupied ones do not; all markers gone after Done (e2e)
- [x] ISC-817: clicking a free deploy square places the roster-armed marine, else the next reserve marine of that squad (e2e)
- [x] ISC-818: clicking a deployed marine during deploy undeploys him — X returns, card back to reserve (e2e)
- [x] ISC-819: A/D during deploy rotates the selected deployed marine with AP untouched (e2e)
- [x] ISC-820: roster cards show a RESERVE state until deployed; clicking a reserve card arms that marine (e2e)
- [x] ISC-821: deploy clock = 90s per squad shown in the HUD; the phase line reads Deployment (e2e)
- [x] ISC-822: the clock reaching 0 auto-deploys the remainder and starts the mission (e2e)
- [x] ISC-823: DONE during deploy finishes deployment and restarts the marine clock at marinePhaseSeconds (e2e)
- [x] ISC-824: AUTO DEPLOY control fills every square in the sensible order and exists only during the phase (e2e)
- [x] ISC-825: Anti: after deployment no deploy-only UI survives (X markers, AUTO button) and normal action keys work (e2e)
- [x] ISC-826: ESC pauses deployment — clock frozen, deploy clicks inert, resume works (e2e)
- [x] ISC-827: Anti: W/F and other action keys during deploy never move a marine or spend AP (e2e)
- [x] ISC-828: Anti: every pre-existing e2e suite stays green with the mechanical deploy=0 URL update (playwright)
- [x] ISC-829: deploy mode fully works under prefers-reduced-motion (e2e)
- [x] ISC-830: HUD phase text renders Deploy as deployment, never as Stealers (e2e)
- [x] ISC-831: placement default facing = the square mission facing — Decoy Abraham deploys facing right (e2e)
- [x] ISC-832: the in-game manual gains a Deployment section: phase, clock, controls (Read)
- [x] ISC-833: docs/rules-reference.md documents the deployment rules (Read)
- [x] ISC-834: keyboard help notes deploy-phase controls (Read)
- [x] ISC-835: Anti: zero em dashes in new player-facing strings (grep)
- [x] ISC-836: engine suite green including the new deploy spec (bun test)
- [x] ISC-837: client unit suite green (vitest)
- [x] ISC-838: full e2e suite green (playwright)
- [x] ISC-839: tsc clean in both packages (tsc)
- [x] ISC-840: README mentions the deployment phase (Read)
- [x] ISC-841: Anti: the deploy lock also kills the quieter verbs — useDoor, overwatchOn, unjam refuse on a locked board, and the doorToggled/pieceDied engine listeners are Deploy-guarded (unit)
- [x] ISC-842: Anti: drag-to-pan starting on a deploy square never places or lifts a marine — placement fires on pointerup under a 6px movement gate (code + e2e clicks still work)
- [x] ISC-843: Anti: finishDeployment never strands a marine in reserve — a squatted deploy square falls back to the nearest free passable square (unit)
- [x] ISC-844: Anti: the AUTO DEPLOY button covers no populated HUD line — bottom-anchored (screenshot)
- [x] ISC-845: Anti: Enter and ESC dedupe Phaser's same-event replay — one press is one toggle/end, even under stalled headless frames (e2e pause test)
- [x] ISC-846: Anti: a marine's first turn-in-place never plays the footstep SFX — lastPos seeded at construction and on pieceAdded (code)
- [x] ISC-847: an armed reserve roster card keeps the selection border (CSS specificity fix)
- [ ] ISC-848: v0.5.0 released — main pushed, tag CI green BEFORE the release is created, release published, live bundle serves v0.5.0 with the deployment-phase code present (gh run watch; bundle greps for version + deploy strings)

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
| deployment-phase | engine Deploy phase + reserve model, client deploy mode UI, Decoy data fix, docs | ISC-796..840 | — | no |
| marine-hotkeys | assignHotkeys single source, digit handlers, card badges, docs | ISC-654..670 | — | no |
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
| home-overlay | DOM landing overlay at `/`: title, intro, mission list, credits, manual link; space_hulk_1 attract backdrop | ISC-472..484,512 | — | no |
| end-dialog | DOM win/loss dialog with Retry + Choose-another buttons over the Phaser banner | ISC-485..489 | home-overlay | yes |
| abort-control | Two-click confirm Abort button during missions, returns home | ISC-490..493 | home-overlay | yes |
| manual-page | manual.html Vite MPA page: friendly rules from rules-reference.md, marine quotes, SVG mission maps built in TypeScript | ISC-494..504 | — | yes |
| home-closure | Spec updates for new `/` semantics, new home.spec, docs, build, commit | ISC-505..511,513,514 | all above | no |
| pages-build-config | Vite base './' + version define + UI version display | ISC-515..518 | — | no |
| pages-release-workflow | Tag-gated GitHub Actions deploy to Pages | ISC-519..523,528 | pages-build-config | no |
| pages-repo-setup | Enable Pages, homepage + description, README links/release docs | ISC-524..527 | — | yes |
| pages-live-verify | Live-site probes, console check, commit | ISC-529..534 | pages-release-workflow | no |
| audio-ship | Track fetched audio in git; posture docs update (CREDITS/README/workflow) | ISC-535,545..547 | — | no |
| credits-page | /credits.html generated from audioManifest + alienSegments; links from home/manual | ISC-536..544 | — | no |
| audio-release | v0.3.0 tag, live probes incl. audio 200 + real-Chrome audio construct | ISC-548..553 | audio-ship, credits-page | no |
| hive-threat | Threat map (kill zones + seen) and threat-weighted Dijkstra pathing | ISC-567,568 | blips-ai | no |
| hive-waves | Staging ring, stall-based patience, wave launch, vector spread | ISC-569..571,579 | hive-threat | no |
| hive-tactics | Straggler hunts, sacrifice blocker, door shutting, jam rush | ISC-572..576 | hive-waves | no |
| hive-closure | Dice discipline, regression suite, soak sweep, seed re-pins | ISC-577,578,580,581 | all hive | no |
| hive-objectives | Destination awareness: recklessness, wave budget, objective camping | ISC-582..586 | hive-waves | no |
| hive-hunger | Idle frustration: forced assault, deadlock-breaking blip conversion | ISC-587,588,590 | hive-waves | no |
| spawn-fanout | Entry rotation by turn + prefer-unseen entries | ISC-589 | — | yes |
| minimap-click | Interactive rect child on Minimap, miniToWorld projection, centerOn, HUD guard on selection handler | ISC-672..677 | — | no |
| minimap-dots | Red living-marine dots redrawn in updateCam | ISC-678..681 | minimap-click | no |
| radar-echoes | Canvas radial cloud textures, echo Map keyed by pieceId, pulse reveal + fade, wavefront delay from nearest sergeant | ISC-682..697 | minimap-dots | no |
| radar-ping-bridge | AudioManager.onPing(interval) fired from scheduleTracker; GameScene wires to minimap.pulse | ISC-687,691,694,696 | radar-echoes | no |
| distance-audio | distanceGainFactor pure fn + playAt/playAlienAt routing for positional stealer sounds, lastPlay probe | ISC-698..707 | — | yes |
| radar-docs-tests | README/manual notes, new unit + e2e suites, full verification | ISC-708..712 | all above | no |
| motion-logic | Pure utils/motionLogic.ts: per-kind step profiles, kindFromTexture, camPanStep, door slide, shimmer phase, recoil vector | ISC-724..732 | — | yes |
| piece-step-motion | moveSprite rework: kind-styled tweens, snap reconcile path, per-frame marker/highlight sync, motionLog probe | ISC-733..737,748,751,754 | motion-logic | no |
| door-slide | doorToggled centre-parting slide + doorDestroyed crumble | ISC-738,746 | motion-logic | no |
| flame-shimmer | Looping alpha/scale/angle shimmer per flame sprite, killed on clear | ISC-739,740 | motion-logic | no |
| shot-recoil-death | Subtle shooter recoil on shot event; death fade+shrink flourish | ISC-741,742,755 | motion-logic | no |
| camera-inertia | Velocity-model arrow panning + drag-release momentum + grab-to-stop, reduced-motion fallback | ISC-743..745,750 | motion-logic | no |
| motion-docs-tests | README note, motionLogic unit spec, motion e2e spec, full verification | ISC-747,749,752,753,756..761 | all above | no |
| charge-facing | Hive phase-end chargeOrientation sweep + Genestealer.chargeTarget (free, event-on-change-only) | ISC-763..771 | — | yes |
| replay-focus-planner | Pure planReplayFocus: stream walk, position tracker, near filter, retarget throttle, attack staging, facingOnly pacing | ISC-772..779 | — | yes |
| action-camera | endTurn plan wiring: replayPan (force pans), attackFx (shake + spotlight vignette + lunge), focusLog/lastAttackFx probes, finishReplay cleanup | ISC-780..786 | replay-focus-planner | no |
| focus-docs-tests | README extension, charge.spec, replayFocus.spec, focus.spec, full verification | ISC-787..794 | all above | no |

## Decisions

- 2026-08-19 (deployment phase run, E3 classifier, ISC-796..847): User request: a pre-mission deployment phase — 1.5 min per squad clock, click deploy squares to choose a marine from that square's squad, sensible default facing (Decoy 10..14,10 down→right data fix), no cross-squad mixing, optional A/D orientation, X indicator on free squares, timeout/Done auto-deploys the remainder, undeploy possible, pause works, an Auto Deploy control (bolter point, sergeant, heavy weapon, bolters behind), the roster as deploy indicator + picker, minimal UI that disappears after; mid-turn addition: rules + manual updates. DESIGN: the phase lives in the ENGINE (placement legality is a game rule and unit-testable), model = LIFT-INTO-RESERVE: marines construct exactly as before (roster identity, dice draws, and every existing test untouched), then client-initiated beginDeployment() moves them into engine.reserve and sets board.locked — the existing lock that already gates every mover/weapon becomes the deploy guard for free. deployMarine/undeployMarine/turnDeployed/autoDeploy/finishDeployment are the whole API; deployMarine rides board.addPiece's pieceAdded so the client sprite pipeline needs zero new events. Squad key = deployMeta recorded at construction from the mission JSON's squad tags. Front-to-back = argmax(pos · own-facing vector): Suicide's down column fronts at y=4, Decoy's Harken left row fronts at x=23 — no per-mission data needed. Deployment is dice-free and side-effect-free: checkVictory, the pieceMoved/doorToggled/pieceDied listeners all early-return in Deploy (an empty board is a squad in reserve, not a wipe; a staging rotation is not a sight line). Client: default-ON (?deploy=0 opt-out; mechanical sed across all 20 old e2e suites; debug_1 self-excludes via the 2-square minimum; attract never calls it), X text markers, click-to-place/pick-up, roster cards double as the picker (RESERVE class + arming), 90s/squad on the EXISTING timer event, AUTO button in the EXISTING HudPanel, Enter/DONE routed to finishDeploy — net new UI: one button and some Xs, all destroyed at mission start. Advisor verdict conditions resolved: pre-change-layout equivalence is proven by the 103 old suites running green under deploy=0; legacy-URL default-off REJECTED (contradicts the explicit ask); pause/timeout semantics tested; leftover-reserve semantics defined + tested. Delegation: Forge auto-include unavailable — codex binary absent (7th occurrence) — code-reviewer + pr-test-analyzer per precedent. REVIEW ROUND (all six reviewer findings adopted, analyzer gaps adopted or refuted): (reviewer 6) board.locked did NOT cover useDoor/overwatchOn/unjam and the doorToggled listener converted blips during deploy — guards added, ISC-805 extended to the quieter verbs; (reviewer 4) pointerdown placement meant drag-to-pan over the deploy area silently placed/lifted marines — moved to pointerup behind a 6px getDistance gate; (reviewer 4) finishDeployment could strand a marine when a stray piece squatted a deploy square (isOccupied counts blips) — nearest-free-passable fallback added + unit test, reserve is never non-empty at MarineAction; (reviewer 3) the AUTO button covered the objective/status rows populated before deployment on missions 3/5/6/beta_2 — bottom-anchored; (reviewer 3) first-rotation footstep SFX: AudioManager.lastPos was never seeded, so every piece's FIRST turn-in-place clanked (pre-existing, conspicuous in deploy) — seeded at construction + pieceAdded; (reviewer 2) .reserve CSS tie beat .selected — override added. The strengthened pause e2e (AUTO emit + Enter while paused) then EXPOSED A REAL PRE-EXISTING BUG: keydown-ENTER/ESC lacked the seenKeyEvents dedupe every other key has, so Phaser's same-event replay under stalled headless frames double-toggled pause and let a replayed Enter end the phase through the momentarily-unpaused gap — dedupe added, test green. Analyzer G1 ("turn guard untested") REFUTED with a bun probe: endMarinePhase() lands at turn 2/MarineAction, so the refusal WAS the turn guard; hardened with explicit asserts anyway. G2/G3/G5 adopted (space_hulk_2 scattered mixed-facing lifecycle, space_hulk_6 interleaved squads + flamerAmmo-survives-reserve, undeploy-then-timeout reconciliation). Final: engine 319/319, client unit 82/82, e2e 115/115, tsc clean both.

- 2026-08-19 (charging stealers + action camera run, E3 classifier, ISC-763..794): User follow-up on v0.4.8: stealers should face the nearest marine ("charging... more tension"), the replay camera should follow stealer activity near marines (spawns and far movers skipped), and attacks should hard-focus with a zoom "if that's easy". DESIGN: (1) CHARGE FACING lives in the ENGINE, not the view — stealer facing is rules-live (front-180 = 3 CC dice), so a sprite-only rotation would lie about the melee a marine is about to take. First attempt was a per-move chargeFacing() hook on Piece.tryMove riding the move event; the engine suite REFUTED it within minutes: the hive re-faces toward its path before every move, and starting those turns from prey-facing instead of path-facing made some previously-costed turns free — the zigzag fixture's stealer banked the AP, advanced an extra kill-lane square, and ate a second overwatch burst (RollQueue exhausted). REFINED to a phase-end chargeOrientation sweep in StealerAI: runs AFTER all activations, so mid-phase move/turn economics are byte-identical (the untouched zigzag fixture is the proof); free direct set per the combat faceToward precedent; emits a facing-only pieceMoved ONLY on change; covers idle stealers too — which is where the "semi-random orientations" actually lived, since hunters' path facing already points at prey. Radius CHARGE_DIST 6 keeps far staging/flank routing out of it. Rules note: close-in stealers now defend marine melee from the front (3 dice) more often — this matches optimal human stealer play in the original (you end activations facing threats) and is logged as a deliberate, faithful buff. (2) ACTION CAMERA: pure planReplayFocus walks the captured stream with a position tracker seeded from pre-phase SPRITE squares (payload-not-engine: closeCombat events carry no coordinates, and final engine state lies mid-replay), annotating near-marine moves/doors/conversions/deaths with throttled focus points (nearDist 6, retarget 4) and closeCombat with always-focus attack staging; marine anchors include marines killed this phase (they anchor the fight that killed them). Facing-only pieceMoved events (charge spins AND the pre-existing path turns) now pace at 40ms instead of 110ms — replays got faster, not slower. (3) ZOOM NOT IMPLEMENTED, by design: Phaser camera zoom scales scrollFactor-0 objects, i.e. the entire single-scene HUD, around the canvas centre; a real zoom needs a UI-camera or scene split. The claustrophobia ships as a hard force-pan + camera shake + a darkening radial spotlight vignette (canvas gradient, depth 3 under the HUD, killTweensOf-before-destroy) + an attacker lunge; the camera-split zoom is offered as a follow-up. Fixture lessons from EXECUTE: sh1's squad deploys at (10,0..4) so (20,19) is genuinely FAR (the planner's silence was correct, the test's geography was wrong); a LONE near stealer stages away to the hidden ring rather than hunting, and a wave spawned close kills debug_1's single marine — the deterministic fixture is a 10-stealer wave at distance 8..11: big enough to charge, far enough that prey survives, leaving live close-in chargers for the invariant. Camera assertions use worldView.contains (bounds clamping makes "centred" physically impossible on small maps — IN VIEW is the actual contract). ISC floor: 32 fresh ISCs meet E3 ≥32. Delegation: Forge auto-include unavailable — codex binary absent (6th occurrence) — code-reviewer + pr-test-analyzer at VERIFY per precedent. REVIEW ROUND (advisor + two parallel agents; nine adoptions, reasoned no-changes): ADOPTED (reviewer severity 8) — the charge buff had a SECOND undocumented rules consequence: combat's defender-win branch reads the defender's facing, so a charge-faced stealer now STRIKES BACK lethally against a losing marine melee (previously a facing-away stealer just spun and the marine survived, ~72% death swing on 1d6-vs-3d6). Resolved as deliberate and faithful (a free end-of-activation turn lets a human hive player set up exactly this), but now DOCUMENTED in the CHARGE_DIST doc comment + README fair-warning line and PINNED by an engine spec (marine attacks charge-faced stealer, defender wins, attacker dies). (reviewer 6, CONFIRMED bug) — marine anchors were snapshotted AFTER capture ran the phase, but die() splices pieces out of board.pieces, so a marine killed mid-phase vanished from the anchor set and the swarm finished him off-camera (worst on last-survivor turns: anchors [], zero focus for the rest of the replay); anchors now snapshot BEFORE the capture. (reviewer 5) — replay force-pans made drag-panning impossible during the stealer phase (the pan effect re-writes scroll every frame ahead of scene update); pointerdown now resets panEffect, matching the arrow-key and minimap escape hatches. (reviewer 4) — the CHARGE_DIST doc comment still described the refuted per-move design and hid the 1 AP about-face the path planner does not price; rewritten. (reviewer 5 + analyzer 2, same finding) — the runStealerActions integration test was vacuously green if either side died; liveness now asserted. (analyzer 1/3) — the sweep's structural contract (captured exactly once, applied once, lands as the stream tail after every action) pinned by an isolated-pocket-stealer capture test. (analyzer 4) — the replay scheduling arithmetic extracted to pure replayOffsets(types, plan, delays) with exact-offset unit tests; GameScene consumes the offsets. (analyzer 5) — FOCUS.nearDist === Genestealer.CHARGE_DIST pinned by a cross-package unit test (same tension radius; divergence must be a decision). (analyzer 6 + hygiene) — back-to-back attackFx e2e: the second spotlight replaces the first (exactly one live vignette), all fade to zero, zero pageerrors; focusLog now also cleared on the reduced-motion path; marine-phase actions asserted to never touch focusLog. NO CHANGE with verified reasoning: the fog-of-war leak concern does not apply (all pieces always render on the main map, only blip VALUES are hidden — radar-run precedent); the two-marine pincer survives (the sweep faces only the nearest marine, and marine-phase flanking happens after the sweep); lunge-on-dying-attacker cannot throw (removePieceSprite kills tweens before the fade, callbacks nulled); reduced-motion already disables all of it (ISC-786); the vignette texture is global by design (exists-guard, scene never restarts). Final counts after the round: engine 298/298 (10 charge tests), client unit 82/82 (13 planner tests), e2e 103/103 (6 focus tests).

- 2026-08-19 (main-map motion run, E3 classifier, ISC-724..761): User follow-up on v0.4.7: "add some animation to make the game feel more alive" — heavy clunky marines, fast nimble stealers, suggestively sliding blips, sliding doors, shimmering flames, eased camera panning with velocity, subtle shot vibration; main map only; death/chainfist icon swaps optional-if-cheap. DESIGN: one pure motion vocabulary in utils/motionLogic.ts (per-kind step profiles + camera physics + door/shimmer/recoil params) consumed by GameScene — no new assets, everything from tweens on existing sprites. Piece kind during replay derives from the sprite's own TEXTURE key (stealer/blip/ambush_counter/terminator_*), never the engine: pieceMoved payloads carry no kind, and a converted blip's id vanishes from final engine state mid-replay, so texture is the only payload-truthful kind source (extends the payload-not-engine invariant). moveSprite gains snap/tween modes: interactive + replay steps tween per kind profile; finishReplay reconciles via an explicit snap that also resets scale/alpha, preserving the animation.spec drift contract exactly. killTweensOf-then-retween-from-current makes consecutive rapid steps a continuous glide instead of a desync. Doors: centre-parting slide (long-axis scale shrink/restore around the texture swap) reads as bulkhead halves — no origin shifts, rotation-safe because local X is the long axis at every facing. Flames: looping alpha/scale/angle shimmer with a deterministic per-square phase offset (no Math.random) so no two neighbors pulse in sync. Camera: shared velocity model — arrows accelerate toward a cap, release decays exponentially, drag release seeds momentum from OUR tracked drag deltas (pointer.velocity is unreliable headless), pointerdown grabs (zeroes) it, and roster/minimap pans zero it to avoid fighting panEffect. Shot vibration: tiny recoil opposite facing with yoyo, position re-anchored from engine truth before each burst (marines never move during replay, so engine pos is truthful for shooters). Deaths get a cheap tint+shrink+fade flourish; doorDestroyed a crumble; icon swaps deferred per the user's own "come back later". Testability: a capped public motionLog probe records every motion decision (id, kind, duration, tweened) making all e2e assertions deterministic without mid-flight sampling; camVel is public for the inertia tests. prefers-reduced-motion (already honored by the replay) now disables ALL new motion via live matchMedia checks. Bonus fix folded in: per-frame marker sync in update() closes the pre-existing gap where jam markers did not ride replay tweens. Delegation: Forge auto-include at E3 unavailable — codex binary absent (5th occurrence) — slot covered by code-reviewer + pr-test-analyzer agents per precedent. ISC floor: 38 fresh ISCs meet E3 ≥32 naturally. REVIEW ROUND (advisor + two parallel agents; ten adoptions, reasoned skips): ADOPTED (reviewer severity 7, CONFIRMED from Phaser 3.90 source) — Phaser's rotation setter WRAPS to (-pi, pi], so the moveSprite no-op bail compared facing*pi/2 (raw 3.14/4.71 for S/W) against wrapped stored values (-3.14/-1.57) and never fired for south/west facings: every such shot killed its own recoil via the acted-refresh, added a no-op 130ms rotation tween, and wrote phantom marine entries into motionLog; fixed with Angle.Wrap on targetRot and pinned by a west-facing recoil-guard e2e asserting tween-alive + zero phantom entries. (reviewer 6) — drag-fling dt used the frame-quantized this.time.now while Phaser dispatches mouse moves synchronously per DOM event, inflating fling velocity ~10x on fast-polling mice (invisible to e2e, which moves once per frame); switched to performance.now() and tightened flingWindowMs 80→50 so a parked hold never flings stale velocity. (reviewer 4 + 3) — reduced-motion was queried live but a mid-game OS switch left the infinite shimmer loops running, and the per-frame matchMedia allocation churned GC; now a cached boolean behind a change listener that also kills+resets shimmer tweens on switch-to-reduce, and the roster pan gates to centerOn. (reviewer 4) — any action pressed mid-step restarted the 170ms step tween from scratch and double-logged it; a per-sprite pending moveTarget now bails when the in-flight tween already heads to the same target (also collapses the interactive event+refresh double-log to one entry per step). (reviewer 2) — interrupted door slides now scale duration to remaining travel so a short finish never crawls. (advisor, adopted) — bounds-clamp/foreign-writer velocity parking via an expectedScroll detector (1px tolerance added after reproduction showed the camera ROUNDS scroll to whole pixels every frame — the raw detector read the sub-pixel correction as a foreign writer and froze arrow panning; caught by the suite, root-caused with an instrumented probe); panEffect.reset() when arrow input arrives mid-pan; dying sprites disableInteractive+unnamed so a mid-flourish click can never select a corpse; reduced-motion terminal-state replay e2e (endTurn instant path leaves animating false, minimap unfrozen, exact positions). (analyzer 8→adopted as cheaper equivalent) — the early-bail guard is now exercised through the real acted-refresh flow. (analyzer 1/2/3, all adopted) — shortest-path rotation extracted pure + unit-pinned (a naive delta would settle at the same normalized angle and pass every prior test while pirouetting 270°); escape-vs-death styling pinned (marineEscaped: zero death entries, isTinted false — the win moment must never wear the red death wash); reduced-motion endTurn branch pinned. (analyzer 4/5/6/7, adopted) — interrupted-door continuation asserted from a hand-constructed mid-state; per-frame marker sync asserted via manual sprite displacement; squash settle gated on tween quiescence; dt-clamp e2e calls scene.update(0, 5000) directly and bounds the jump. Advisor findings verified-then-declined: delta-scaling already exponential, fling already EMA over zoom-divided deltas, scene-restart tween leaks impossible (retry is a page reload), shimmer perf bounded by flame-section size. Reviewer verified clean from source: killTweensOf nulls callbacks (no resurrection), TweenManager.add is immediately discoverable (no pre-3.60 pending hole), all five destroy paths kill tweens first, finishReplay ordering lands before the tween pass, marker loop reads post-tween positions same-frame.

- 2026-08-19 (minimap-radar run, E3 classifier, ISC-672..712): User follow-up on v0.4.6: minimap click-to-focus, marine red dots, fuzzy stealer/blip echoes revealed by a sergeant-origin pulse synced to the pulse-radar sound, and distance attenuation for stealer-caused SFX. DESIGN: the "pulse radar sound" already exists — the motion-tracker ping in AudioManager.scheduleTracker, whose cadence tightens with threat distance — so the minimap pulse is driven by a new onPing(interval) callback fired from that scheduler and by NOTHING else: sight and sound lock together with zero new clocks, and the speed-coupling the user asked for comes free. Echo model: snapshot threat positions at pulse time, reveal each echo after a delay proportional to its minimap distance from the NEAREST living sergeant (an expanding wavefront, ring visuals to match), fade over the pulse interval so the next pulse refreshes — stale-between-pulses is the radar fiction, not a bug. No living sergeant → no pulse, no echoes (the sergeant carries the scanner); marine dots stay. Blips are already visible counters on the main map (only their VALUE is hidden), so echoes leak nothing; AmbushCounter decoys have kind 'blip' and inherit the fainter styling with no special case. Cloud textures generated at boot from canvas radial gradients (solid green for stealers, wider/fainter for blips) — no new assets. Click-to-focus reuses the proven interactive-rectangle-child pattern (DONE button precedent) + cam.centerOn with existing setBounds clamping; the global pointerdown selection handler gains the same HUD-region guard the drag-pan and hover handlers already have — TODAY a minimap/HUD click silently clears the selection, which would make look-around recon self-defeating. Attenuation: ONE pure rule at ONE ingestion point — playAt(key, x, y) scales gain by Chebyshev distance from the nearest living marine (full ≤ fullDist, floor minGain at ≥ farDist, never silent); marine-caused sounds are at/adjacent to a marine so the uniform rule leaves them at full volume by construction, and only positional stealer-side handlers (doorToggled, skitter, blip-convert, stealer CC, stealer death) route through it. Pure logic (radarLogic.ts, distanceGainFactor) stays jsdom-testable. ISC floor: 41 fresh ISCs meet the E3 ≥32 floor naturally (51 after the review round). Delegation: Forge auto-include at E3 unavailable — codex binary absent (verified `which codex`, 4th occurrence) — slot covered by TWO reviewer agents (code-reviewer + pr-test-analyzer) per the established precedent. REVIEW ROUND (advisor + two parallel agents; nine adoptions, four reasoned skips): ADOPTED (1, reviewer severity 8, CONFIRMED) — pulse rings were unclipped: containers do not clip children, the sweep radius is the minimap DIAGONAL, and HudPanel sits at depth 10, so every ping painted green arcs across the right ~190px of the board; fixed with a screen-space GeometryMask (scrollFactor 0, off the display list) over the ring and echo layers, proven by a full-canvas mid-sweep screenshot. (2, severity 6) — the radar read LIVE engine state during the stealer-phase replay, spoiling deaths/conversions seconds before their animations (the codebase's own payload-not-engine invariant); minimap.frozen now tracks scene.animating: dots hold their last frame, pulses skip. (3, severity 5) — same root cause in attenuation: nearestMarineDist now reads a payload-driven marineMirror (seeded at boot; pieceMoved/pieceDied/marineEscaped/pieceAdded upkeep) so a marine dying on the phase's first replayed event anchors full volume until his death plays. (4, severity 5) — at cadences under ~1100ms the wavefront delay left echoes no room to finish their 110ms ramp before the next pulse reset them, and the minFadeMs floor was unreachable exactly at panic; the envelope (delay+fadeInMs+fade) is now budgeted against the interval with the DELAY yielding first, and the unit test that pinned the unreachable fade was rewritten around the real envelope. (5, severity 4) — centerOn centred clicks on the CANVAS, whose right 200px is opaque HUD, landing every focus 100px right of the visible centre; +HUD_WIDTH/2 offset. (6, severity 3) — with sound already unlocked, AudioManager's constructor fired the first tracker cycle synchronously BEFORE create() assigned onPing, silently dropping the first sweep; the callback now rides the constructor. (analyzer 1, severity 7) — the live onPing→pulse wiring was never executed by any test (every echo e2e detached it for determinism): deleting the one wiring line kept all suites green while shipping a radar that never sweeps; a no-scaffolding e2e now waits for the real scheduler to set lastPulse (the advisor independently demanded the same test — adopted once). (analyzer 2, severity 6) — beta_2's two-sergeant path (nearest-origin Math.min and any-alive gating) was unexercised; structural e2e added: both origins present, one death leaves the scope alive. (analyzer 3, severity 5) — kind→texture/alpha wiring was swappable with all suites green; echoTexture(id) probe added and pinned per kind. (analyzer 4, severity 4) — README's "marine sounds stay full" claim was untested; a shot event is now pinned at exactly full gain. SKIPPED with reasons: echo-cleanup-loop test (engine-verified that converted blips get NEW stealer ids so cleanup is leak-prevention only, no visible ghost); wavefront-stagger timing e2e (sub-second tween assertions in CI are a flake magnet, the pure pulseTimings units own that math — analyzer's own recommendation); pause/game-over pulse tests (pre-existing shared paths, near-tautological); reviewer finding 7 (minimap click during pause) resolved as NO CHANGE — arrow and drag panning already move the camera while paused, so camera-free-while-paused is the existing contract and the click is consistent with it. Reviewer verified clean from Phaser 3.90 source: killTweensOf destroys tweens and nulls callbacks, so the nested fade tween cannot resurrect a killed echo; same-frame tweens are discoverable (no pre-3.60 _pending hole); the nested-container hit test composes parent transforms but not parent scroll factors, exactly as the clickZone comment claims; fillAlpha 0 keeps the hit test alive; the HUD guard blocks only the selection handler (audio unlock and DONE still fire). Nitpicks adopted: once-per-game texture comment, probe-unit JSDoc (dots in minimap px, origins in board squares). Known bounded leak accepted: when the last threat dies the tracker parks and never pulses, so the final already-invisible echo Images outlive their contacts until scene shutdown.

- 2026-08-19 (marine-hotkeys run, E3 classifier, ISC-654..670): User follow-up on v0.4.5: number keys 1-0 select marines "to allow play without requiring the mouse". DESIGN: one pure function, assignHotkeys(entries) in marineNames.ts, is the single source — GameScene binds keydown-ONE..ZERO from it, RosterPanel renders the [n] badges from it, both computed from the SAME scene-start roster (deterministic equality, no shared mutable state). Numbering is positional per squad BLOCK in DISPLAYED card order (groupBySquad: sergeant, specials, bolters) — so [1]/[6] are always the sergeants, and squad two starts at 6 even when squad one is short, exactly the user's "1-5 first unit, 6-0 second unit". The map is computed ONCE, so numbers never reshuffle on death — the key goes inert instead, via a single new !piece.alive guard in selectFromRoster (GameEngine.tryEscape sets alive=false identically to death, so escape is covered by the same line). The digit press reuses selectFromRoster wholesale — attract/pause/replay/game-over guards, flamer-aim disarm, selected emit, and the camera pan all come free and stay identical to a card click. e2e asserts badge↔key AGREEMENT through the DOM (the card wearing [6] is what key 6 selects) rather than re-deriving the mapping — the contract the player actually reads. ISC floor show-math: 17 fresh ISCs vs the E3 ≥32 soft floor — the feature decomposes to 17 binary probes on a project ISA carrying 670 cumulative; padding would violate the granularity gate (accepted precedent: fifth run, 10). Delegation: Forge auto-include at E3 unavailable — codex binary absent (verified `which codex`, 3rd occurrence, 2026-08-15/18 precedent) — slot covered by TWO reviewer agents (code-reviewer on the diff, pr-test-analyzer on coverage), meeting the ≥2 floor. REVIEW ROUND (two agents in parallel — code-reviewer on the diff, pr-test-analyzer on coverage; five adoptions, two explicit skips): (1) ADOPTED both agents' shared finding — the ESCAPED half of badge removal was untested (a refactor moving the .remove() out of markState kept every suite green); the existing ESCAPED unit test now asserts .m-hotkey is null. (2) ADOPTED (analyzer severity 7) — the entire escaped-key-inertness claim rested on tryEscape's alive=false with NO test pinning it anywhere; a plausible "escaped isn't dead" refactor would have silently un-guarded the client. Engine escape test now asserts m.alive === false (ISC-659's contract, engine-side). (3) ADOPTED — the purity unit test was tautological (assignHotkeys reads no engine state, the assertion could not fail for ANY implementation); deleted with an explanatory comment, the bind-once invariant stays pinned by the e2e kill-then-repress test. (4) ADOPTED — Cmd/Ctrl/Alt+digit now bails before the dedupe: the browser's tab-switch shortcut must never double as a silent selection change (reviewer flagged speculative on whether Chrome dispatches the keydown; the guard is unconditionally correct either way). (5) ADOPTED (nearly free) — space_hulk_1 e2e now presses 6 and asserts no selection change: single-squad missions leave 6-0 unbound by construction, now pinned. SKIPPED with reasons: animating/game-over guard tests (pre-existing shared selectFromRoster path this diff didn't touch; animating window is a Playwright flake magnet) and a numpad-absence test (asserting a binding nobody wrote guards nothing). Reviewer verified clean: double-source risk (groupBySquad never mutates input — displayOrder sorts a spread copy), handler leak (scene never restarts; Phaser shutdown removes listeners), key collisions (digits reach no other handler; specific-before-generic emit order makes the digit claim the dedupe entry before the movement block), em dashes (8 new ones, all code comments). One full-suite audio-fade flake (home.spec:140) passed in isolation and on the immediate full-suite re-run — pre-existing timing sensitivity, unrelated to this diff.


- 2026-08-19 (keyboard-remap run, E2, ISC-636..652): User playtest verdict on the v0.4.4 layout: "the keyboard mappings need improving." Six-part remap executed exactly as specified: Z/C swapped (Z back-left, C back-right), back moved S→X so QWEADZXC form a directional circle, S freed for the door (H kept bound as the legacy alias — the user redefined S but never asked to remove H, and muscle memory plus every existing H test survive for free), melee X→M, mute M→K. DESIGN: the remap lives at the two ingestion points only — the GameScene JustDown chain + keydown-K handler, and the keyboardHelp.ts layout data that both renderers (in-game roster help, manual page) already consume — so no per-surface patching. Weapon-key clarity via two new KeyCap fields: `sub` (weapon qualifier rendered in brackets under the label; R/T "assault cannon", G "chain fist" — the marine is a chain FIST, the user's "chain saw" read as the same unit) and `requires` (MarineType gate). The in-game help dims a gated cap (opacity .3 + explanatory title) when no such marine is in the RosterPanel entries — the mission deploy list, so the keymap doubles as a live loadout readout; the manual page shows sub-labels but never dims (it documents the game, not a mission). Only beta_2 fields both specialists today, so every space_hulk mission visibly dims R/T/G. Behavior notes pinned by tests: M is now an ACTION (added to the flamer-aim cancel list) while K inherits M-mute's aim-keeping; the keydown-K handler claims the shared seenKeyEvents dedupe entry exactly as keydown-M did (Phaser fires the specific event before the generic one — mechanism unchanged, only the letter). One stale pin caught by the suite itself: roster.spec's unbound-spacer count 6→5 (K left the spacer set). ISC floor show-math: 17 new ISCs meet the E2 ≥16 floor naturally. Delegation floor: code-reviewer agent on the diff (E2 soft floor 1 met). Process slip logged: one ISA checkbox pass used a python3 heredoc — repo rule is TypeScript/shell; subsequent passes used perl. REVIEW ROUND (code-reviewer agent, all five findings adopted): (1) README:142 Sound-features bullet still said "M mutes" — the ISC-646 grep only covered the controls table; fixed to K. (2) meleeAhead doc comment still said "X key" two lines above the changed dispatch; fixed to M. (3) AudioManager.toggleMute comment said "M key / HUD toggle" — the M half newly stale, the HUD-toggle half never true (keydown-K is the sole caller repo-wide); fixed to "K key". (4) TEST GAP CONFIRMED: the only z press sat at 0 AP, so the refusal assertion could not tell back-left from back-right — an un-swap of Z would have passed the entire suite while C and X were genuinely pinned; Z now gets its own positive move with AP topped up ((20,20) area: z lands (19,21) at 2 AP). ISC-636's original evidence was recorded against a no-op — corrected. (5) B (blow up) is heavy-flamer-gated in GameScene but carried no requires, and the unit test actively pinned the omission — violating the loadout-readout premise the feature states; requires union widened to 'heavy_flamer', B marked with sub 'heavy flamer' (every current mission except debug_1 fields a flamer, so only debug_1 dims B — correctly). Reviewer also verified from Phaser 3.90 source that the specific keydown-K event fires before the generic keydown, so the shared seenKeyEvents dedupe order is guaranteed, not lucky; and that buildRoster's failure modes all default toward storm_bolter, meaning dimming fails SAFE (dims rather than falsely un-dims).


- 2026-08-19 (enemy-reticle run, E2, ISC-625..634): User follow-up on v0.4.3: "now we have the target icon over doors … let's do the same for stealers." DESIGN (three angles weighed): a second parallel enemyReticleFor state was rejected — two states can lie about the one F decision; a differently-styled enemy reticle rejected — position over a stealer vs a door edge is self-explanatory and consistency wins. CHOSEN: fireDoorTarget() generalized to fireTarget() returning a discriminated union ({kind:'door',door} | {kind:'enemy',piece}) built from the SAME helpers handleFire executes (hoveredDoorFor → nearestEnemyTarget → nearestShootableDoor), one fireReticleFor state, one renderer switching on kind — the "indicator can never lie" property extends to enemies for free, and the hovered-door-outranks-enemy priority is now VISIBLE too (pinned by e2e). Refresh points unchanged and sufficient: every marine action funnels through updateHighlight, plus pointermove/doorToggled/doorDestroyed/finishReplay — enemy positions only change through marine-turn consequences (deaths, conversions) all on those paths. Rename doorReticleFor→fireReticleFor / refreshDoorReticle→refreshFireReticle contained to GameScene + the door-keyboard spec (repo-wide grep). Delegation floor: code-reviewer agent on the diff (E2 soft floor 1 met); ISC floor show-math: 10 new ISCs on a project ISA already carrying 600+ — the E2 ≥16 floor is a per-run count on fresh articulation and this feature genuinely decomposes to 10 binary probes; padding would violate the granularity gate. REVIEW ROUND (code-reviewer agent, all five findings adopted): (1) UNION-HONESTY GAP CONFIRMED — the enemy branch had no ammo guard: an assault cannon with an empty drum (reachable in beta_2) would wear a reticle on a stealer while shoot() bails on ammo<1, F fires nothing, and shootNearest still returned true. Fixed at the engine ingestion point: canShootPiece(target) added to StormBolterMarine as the read-only mirror of beginAimedShot's guards (shape of canShootDoor), AssaultCannonMarine overrides with the ammo≥1 bail; nearestEnemyTarget filters through it, so reticle AND auto-target are legality-honest for every bolter-family marine (pinned by vitest empty-drum test). (2) ISC-631 originally claimed the chain fist gets no reticle — FALSE, ChainFistMarine extends StormBolterMarine and correctly keeps his bolter reticle; criterion reworded before the wrong invariant could mislead a future fix. (3) em dashes removed from the new player-facing strings (rules-reference, keyboardHelp) per the repo's displayed-strings rule. (4) the nearest-of-many test was collinear — the near stealer BLOCKED LOS to the far one, so the distance sort was never exercised; restaged on different rays inside the Launch Control room with both candidates asserted shootable via canShootPiece. (5) draw geometry was unasserted — fireReticleFor now carries cx/cy (the drawn pixel centre) and tests pin 760/820 (door midpoint) vs 740/820 (enemy square centre), closing the same hole in the v0.4.3 door reticle. Residual-risk comment added on refreshFireReticle: the staleness guarantee rests on the acted→updateHighlight funnel — anything that kills/moves pieces outside a marine action must add its own refresh.
- 2026-08-18 (door-UX run, E3, ISC-620..623): User playtest of v0.4.2 refuted the hover gate within hours: "it doesn't auto shoot the nearest door" — hoverCoord is set by ANY pointermove over the canvas and never clears over the board, so for every mouse-touching player the gate reduced the fallback to dead code (the reviewer's stray-F hazard and the user's want were resolved in the wrong direction). REVERSAL with a better mitigation: the gate is gone — F's priority is hovered door → nearest enemy → nearest shootable closed door, always — and the hazard is handled by VISIBILITY instead of suppression: a red reticle (doorReticleGfx, drawn at the door edge midpoint) marks the door F would currently hit, refreshed at a single choke point (updateHighlight) plus pointermove/doorToggled/doorDestroyed. fireDoorTarget() derives the target from the same helpers the shot uses (hoveredDoorFor / nearestEnemyTarget / nearestShootableDoor) so indicator and behavior can never diverge. ISC-615 dropped (tombstoned) — its Playwright fixture now asserts the OPPOSITE (ISC-621). AUDIO: "the sound effect is the chainsaw not shots" — AudioManager played sfx_chain_fist on EVERY doorDestroyed; the event now carries cause ('cut' from the chain fist's cutDoor, default 'shot' from bolter/cannon paths) and the chainsaw is gated on cause==='cut' (the weapon's own firing SFX already accompanies shot-kills via the shot event). Lesson encoded: when a safety gate and a feature want the same input, prefer making the outcome VISIBLE over making the action unreachable — suppression traded a rare hazard for a constant failure.
- 2026-08-18 (door-corner run, E3, ISC-604..614): User reported three door bugs; all reproduced before any fix (probe script + real-pointer Playwright). ROOT CAUSES: (1) `hasLineOfSight` tested closed-door segments with proper-INTERIOR intersection only — a diagonal sight line passing exactly through a door segment's endpoint (the doorway corner, solid frame) grazed through, so an angled marine saw the square behind a closed door and converted blips there; (2) `Blip.convert()` seated surplus stealers on ANY passable-unoccupied 8-neighbor — including across the closed door edge (and across its corner diagonally), splitting one blip onto both sides of a shut door; (3) "can't shoot doors" was a KEYBOARD-PATH gap, not an engine bug — engine `shootDoor` is fully tested and a real-pointer hover+F Playwright repro PASSES once the mouse mapping goes through the canvas rect (the game is keyboard-driven; F with no hover fell into shootNearest, found no piece, and silently did nothing). FIXES at ingestion points: los.ts blocks a sight line touching a closed-door segment endpoint (pointOnSegment), which is exactly the sight-side mirror of the movement corner rule `diagonalBlockedByDoor` — one geometric truth, two rules now consistent; convert() seats must be one LEGAL step from the blip square (doorBetween + diagonalBlockedByDoor); GameScene handleFire falls back to the nearest shootable closed door when no enemy target exists (enemy priority preserved, pinned by e2e). Zero re-pins: all 285 engine + 58 e2e tests green untouched — the corner case never arose in pinned corridor geometries. Delegation: codex absent again (2026-08-15 precedent) — Forge slot covered by the code-reviewer agent on the combined diff. Harness gotcha worth keeping: Playwright `page.mouse` coordinates must map world→page through `canvas.getBoundingClientRect()` + internal/display scale — the naive world-minus-scroll mapping silently hovers the wrong tile (the canvas rect had left=-113, width 1080 vs internal 1080 at e2e viewport). REVIEW ROUND (code-reviewer agent on the diff; advisor timed out twice at 120s/240s — Inference backend unresponsive, agent covered the second-opinion leg): verified clean — pointOnSegment is EXACT arithmetic here (centres at half-integers, endpoints at integers → every cross product a dyadic rational, |cross| ≥ 0.25 when non-collinear, EPS never load-bearing); the endpoint rule and diagonalBlockedByDoor are provably the SAME predicate (a door edge's endpoints ARE the two corners whose four incident edges the movement rule checks); an old-vs-new LOS diff over every square pair on all nine maps shows every newly-blocked pair passes exactly through a door corner backed by rock (intended physics, zero over-blocks); no door became unshootable. ADOPTED: (1) hover gate on the F fallback — hoverCoord is set by every pointermove over the canvas, so the fallback fired for MOUSE players resting on any non-door square, at unlimited aimed-shot range (p90 nearest-door 11.5 squares on sh1), permanently demolishing an untargeted door and (via the cannon's shootDoor override) burning drum rounds + malfunction clock — gated on hoverCoord===null (ISC-615) which also makes the docs' "no hover" claim true; (2) doorway-corner map property pinned across all missions (ISC-616 — his census: zero 4-open corners anywhere today, but nothing guarded the premise); (3) anti-regression diagonal visibility case (ISC-617); (4) CLAUDE.md window.sulk shape drift fixed (PieceEvents, Genestealer). PARTIALLY ADOPTED: shootNearestDoor ordering test — two-doors-in-one-arc staging doesn't exist naturally near the sh1 fixture and the sort is three lines of Math.hypot over door midpoints; the no-op and hover-gate cases are pinned instead, behind-the-marine impossibility rests on inFireArc's strict rel.dr<0 (his own code-read concurs). NOTED as design consequence, not bug: a frustrated blip converting while boxed against a shut door now LOSES its surplus stealers (seats across the door are gone) — a nerf to the hive's documented deadlock-breaker, accepted as rules-correct (the split-spawn was the exploit, not the feature).
- 2026-08-18 (hive pin/blood/zigzag/entries run, E4, ISC-592..601): Second escalation pass on the user's brief ("really hard to beat"). Adopted: (1) PIN — staged pieces are exempt from the idle-hunger role override: a couple of pieces coiled hidden on a flank pin the marines into covering that approach at near-zero cost (the user's 0,11/2,11 opening, generalized); the frustration SET stays independent of the role, so a blocked blip still converts at the next launch and the door-deadlock fix survives (Science QuickDiagnosis walked 6 degenerate states: whole-force pinning impossible — threshold ≤8 forces launches; marines entering the ring flip pinners to assault). (2) BLOOD — squad losses tighten the hidden ring 8→6→4 (half strength) and cap wave thresholds at squad+1: the pack creeps closer, still unseen, and strikes from all directions. (3) ZIGZAG — verified EMERGENT before building anything: the per-square kill penalty already makes a charge weave through side alcoves (probe: 4-square advance under overwatch drew exactly ONE reaction burst); pinned as a fixture with scripted-queue exhaustion, no special-case code added. (4) ENTRY STRATEGY — spawn ranking by distance-to-destination (bulk through rotated top-3, watched entries last) plus a feint every third turn (incl. the opening spawn) at the unseen entry nearest the MARINES: the user's "use 14,26, spread via 9,26/2,19/2,21, feint from the near entries" without a single hardcoded coordinate. (5) BeCreative VS pass added watcher-priority CC: an adjacent un-jammed overwatcher dies first — he is the wave-breaker. RETIRED: the beta_2 pinned-opposed-WIN fixture. After these changes the CP-rush probe wins 0 of 400 seeds and the download counter never ticks — the crude probe is no longer valid winnability evidence against a hive that camps the Data Room. Rather than silently weakening the AI (against the user's explicit brief) or keeping a dead fixture, the pin now guards the deterministic opposed LOSS, ISC-601 is DEFERRED-VERIFY on a designer playtest, and the tuning lever (OBJ_RING, currently 6, possibly per-objective-type) is documented here. Re-pins this run: quota autopilot seed 5→1 (the hive wipes the seed-5 squad inside 8 turns; the test's property is legality, seed 1 keeps 3 marines alive) and lowered-quota seed 7→1 (casualty-keyed cadence). Sweeps: debug_1 unchanged 40W/0L (no over-aggression on the training mission); all missions terminate, 0 ongoing. ADVISOR ROUND (post-commit): challenged that 0/400 might mean "structurally broken, not hard" — RESOLVED by two findings: (a) capability proof ISC-602: a lone sergeant on the real map completes the download unopposed (mechanic + geometry intact); (b) the probe's autopilot CORKS ITS OWN DOORWAY — perimeter marines hold at radius ≤2 of the download point, which in beta_2's 1-wide approach corridor parks a bolter in the sergeant's only path (unopposed autoplay stalls at counter 4 with the Data Room EMPTY; historical opposed wins happened because stealers killed the cork). Autopilot doorway bug logged as TEST-INFRA DEBT — fixing it re-baselines every autoplay pin, defer to the next autopilot session. Also adopted from the advisor: feint cadence keyed on turn+casualties (a fixed 3-turn period is human-countable; casualties make it state-dependent while staying seed-deterministic), and the zigzag fixture asserts the INVARIANT (one burst per advance, ends out of the lane) rather than the exact path. Rejected with evidence: "only debug_1 swept" (sh1/sh2/beta_2 all swept — his --auto-state loaded the unrelated show-page ISA again, third occurrence; the in-repo ISA remains the record).
- 2026-08-18 (hive objective-awareness run, E3, ISC-582..591): User playtest refuted the pure-reactive hive — in space_hulk_1 blips stacked behind door (3,7) (legally refusing an exposure door, marines never within 6 so the voluntary-convert rule slept) while the marines burned the objective; reproduced in an instrumented autoplay run (blips massing west, hive even shutting the door behind them). Root causes: (a) growth-keyed patience NEVER fires under uncapped reinforcements (force "grows" every turn → clock resets forever); (b) the hive had no idea where the marines were HEADING; (c) spawnBlips restarted its round-robin at entry[0] every call, so blipsPerTurn=1 missions hammer one entry. Adopted, per the user's design brief: destination geography (not win rules) flows into the hive — GameEngine passes objective/exit/download/blockade-entry squares; urgency scales with the closest marine's graph distance to them (reckless all-in at ≤4; wave threshold min(base, turnsLeft) with turnsLeft = ceil(dist/3) — "how many waves can we still launch"); growth-reset disabled at turnsLeft ≤ 3 plus an absolute 6-turn massing cap; hidden squares within 6 of a destination are staging candidates and staged force (the buildup becomes the roadblock); per-piece idle tracking (3 stationary plans → forced assault — hunger is the default, the hive only ADDS intelligence; a frustrated blocked blip converts even with marines far, which is what actually breaks door-stack deadlocks); spawnBlips rotates by turn number and prefers unseen entries (fan-out + blips not born converted). Advisor triage: no-destination/unreachable paths verified guarded (?? 99 defaults, ≥1/≥2 floors — no zero-size waves), objField recomputed per plan, idle counter resets on movement (no late-game all-in degeneration), spawn rotation is turn-derived hence seed-deterministic (pinned e2e seeds prove it), the over-aggression probe is the sweep itself (debug_1 unchanged 40W/0L); his --auto-state loaded an unrelated harness ISA — in-repo project ISA remains the record (2026-08-17 precedent). BALANCE FLAG surfaced to the user, not silently tuned: beta_2's CP-boosted rush probe collapsed 5/80 → 1/80 because the hive now camps the Data Room ring — this is the requested blocking behavior working as designed, but if beta_2 feels unwinnable in human play, first lever is shrinking OBJ_RING (6) or the destination-ring force weight for `download` missions. Idle probe evidence: worst consecutive stealer idle across 40 full games is now 3 turns (was unbounded).
- 2026-08-17 (hive AI run, E4, ISC-567..581): AI0 (per-piece greedy beeline) replaced by AI1 — a hive layer (`ai/hive.ts`) that plans the whole stealer turn: threat map (kill zones from un-jammed overwatchers via fire arc + LOS + range 12; seen set from marine vision), threat-weighted Dijkstra pathing (kill +6/square, seen +2 — corridor length is priced automatically since cost accrues per square entered), staging ring (hidden squares at graph distance 2–8 from the squad), stall-based wave patience (the clock ticks only while the ready force stops growing — reinforcements feeding the wave keep it massing; 3 stalled turns → launch; threshold clamp(2×marines, 3..8); blip counts 2 ≈ bag mean 2.05; budget-dry relaxes to ≥marines), approach-vector spread (staging candidates bucketed into octants around the squad centroid; up to 3 vectors ≥2 octant steps apart, pieces assigned by REAL safe-approach cost with per-vector quotas), straggler hunts (≥2 pieces in range 8 gang an isolated marine, gap ≥4), sacrifice blocker (a stuck cohort of ≥3 spends one stealer to park on the first fire-lane square it survives — its body blocks LOS, followers hold then build up behind; each soaked burst is a 1-in-6 jam roll), staging door-shutting (silent probe, closes only when our side goes dark; reach = edges incident to own/neighbor squares per the manual's front-3 rule with free stealer turns), and emergent jam rush (a jammed watcher contributes no kill zone → instant launch — zero special-case code). Engine passes {turnNumber, blipsRemaining}; hive memory is a WeakMap on Board (persists per game, invisible to fresh test boards); planning consumes ZERO dice (RollQueue tests count draws exactly) and tactic variety comes from turn-number tie rotation, never randomness. Advisor round (Inference.ts): adopted — stall-based patience (was flat 3 turns, punished long approaches), angular vector separation + real-reach scoring (his "one fat column" prediction reproduced empirically: adjacent octants and chebyshev scoring collapsed/crossed the assignments — both now pinned by the spread fixture), mechanical dice-count assertions. Scoped honestly per his audit — decoys = multi-vector staging + turn rotation shifting pressure points (deliberate self-exposure decoys are illegal for blips and out of scope); probing-as-information-gathering is meaningless because the hive reads engine truth like AI0 always did (omniscience is the original Sulk AI's design too — documented, out of scope); AP/CP drain is limited to jam economics (overwatch fire is free in this rule set — there is no AP cost to drain; forcing shots fishes for jams that cost the marine 1 AP to clear); flamer-ammo baiting is out of scope (needs a model of player behavior). Delegation floor (E4 ≥2): `which codex` fails again — Forge/Cato unavailable on this machine (2026-08-15 precedent); floor covered by the SystemsThinking fork (its causal-loop read of the old real-time design doc still transferred: overwatch throughput saturates ~2 shots/gun so waves ≥2×marines leak, and a jam cycle ≈6 forced shots — both constants informed wave sizing and blocker EV) plus the advisor round. Re-pin discipline learned the hard way: beta_2's opposed-win seed was re-pinned TWICE (9→3→6) because the first re-scan ran before the design was final — pin only after the last behavioral change. Pre-existing e2e failure fixed in passing: audio credit link assert tripped Playwright strict mode (two links in the block since the credits page landed) — selector tightened to getByRole.
- 2026-08-17 (home-page run, VERIFY/diff-review agent): five findings, all adopted with fixes in the follow-up commit — (1) MED: a clicked abort button kept keyboard focus, so the player's next Enter (the END-TURN key) re-activated it; within the 4s window that single keypress aborted the game. Fixed by blurring on every activation (reading `armed` BEFORE the blur, since the first fix attempt would have let a blur-disarm handler race the second click) and dropping the blur-disarm in favour of time-only disarm; regression e2e added (armed + Enter → turn advances, mission keeps playing). (2) MED: legacy `/?seed=N` bug-report URLs (pre-homepage semantics: replay debug_1) were silently swallowed into the attract backdrop; main.ts now redirects seed-without-mission to `?mission=debug_1&seed=N`; regression e2e added. (3) LOW: roster cards are DOM buttons reachable by Tab+Enter through the overlay — selectFromRoster gained an attract guard, keeping the homepage fully inert. (4) LOW: the homepage was downloading the entire mission audio set for an AudioManager that never constructs — queueLoads now skipped in attract mode. (5) LOW pre-existing: `requested in missions` walked the prototype chain, so `?mission=toString` reached loadMission and threw (dead black canvas); replaced with an own-property check. Agent also confirmed: endDialog idempotent under gameOver re-delivery, no import-time side effects in the manual's engine imports, dice streams untouched for any fixed mission+seed pair, and HudPanel DONE / ESC / drag / M are all Phaser-input paths dead in attract mode.
- 2026-08-17 (home-page run, VERIFY/advisor + agents): Fact-check agent found one real manual error (cannon malfunction: the gunner ALWAYS dies, manual said "usually") and one incompleteness (parry also fires on an unbeatable tie) — both fixed in content.ts; every other number verified against rules-reference.md including the 21-counter blip-bag mean (43/21 ≈ 2.05). Advisor round (first call timed out at 120s; retry succeeded): adopted — (1) dist smoke check on production-style static serving: `vite preview` serves both pages 200, and the manual's chunk graph carries ZERO Phaser (manual 17.7K + 67.8K shared mission-data chunk vs the game's 1.5M main chunk); (2) Retry-vs-seed decided and documented: Retry reloads the full URL INCLUDING any pinned ?seed — deliberate, because seeds only enter URLs via tests and bug reports (the homepage's mission links never carry one), so casual Retry is always fresh dice while a bug-report link reproduces exactly; the "seed-shopping exploit" requires deliberately pinning your own seed in a single-player game, accepted. Declined with reasons: bare-`/` e2e coverage and abort first-click tests ALREADY exist (home.spec, 7 tests — the advisor could not see the suite); Netlify/Vercel rewrite-rule probing — no deploy target exists, this is a personal local-play project (fetched audio is non-redistributable per CREDITS.md), revisit if a deploy ever lands; overlay dismiss path — the overlay IS the homepage by design, there is deliberately no close button stranding an attract board (you leave via mission select or the manual); ISA/slug mismatch — artifact of the advisor's --auto-state reading the harness work registry, the project ISA in-repo is the system of record and is current.
- 2026-08-17 (home-page run, OBSERVE): Architecture — all new chrome is DOM, not Phaser: the landing overlay, end-dialog, and abort button are HTML siblings/overlays of the canvas (rich text, links, native scrolling, Playwright-probe-able), matching the roster panel precedent. Navigation is URL-driven (`/` = home, `?mission=X` = play, reload = retry) so every transition is a clean page load with zero engine-state teardown risk. Home mode = absence of the `mission` param: GameScene then loads space_hulk_1 as an attract backdrop with input disabled, timer unstarted, and no AudioManager (autoplay-unlock via overlay clicks must not blast music). The manual is a second Vite MPA entry (manual.html) whose mission maps are SVG strings built in TypeScript from the actual mission JSONs (user's "possibly even better" option — zero image assets, always in sync with the data). BREAKING-DEFAULT note: bare `/` previously meant "play debug_1"; four e2e specs relying on that get `?mission=debug_1` pinned — same game, explicit param — and game.spec's default-mission test is rewritten to assert the new home semantics. debug_1 stays reachable by URL but is omitted from the landing list (training/debug scenario, not a player mission). E4 ISC soft floor (≥128) waived, show-the-math: this run adds 43 ISCs (472..514); the project ISA totals 515, far past the floor — the floor exists to force decomposition, which the project file already embodies. Delegation floor (E4 ≥2): `which codex` fails again (Forge/Cato unavailable on this machine); floor met instead via two background review agents at VERIFY (diff review + manual-vs-rules fact-check). adopted — (1) MARKER_OVERHANG(24) folded into camera bounds on ALL four sides: the guard passed only incidentally for wide (84px) triangle art overhanging its cell by 22px; now structural. (2) Deleted the per-frame manual scroll clamp — setBounds is the single clamp for every scroll path (keys/drag/pan()), killing the two-clamps-must-agree drift vector the advisor flagged (pan()/centerOn bypass manual clamps). (3) Leaderless-squad title fallback pinned (debug_1). Refuted/waived with reasons: camera-viewport-excluding-HUD variant (HUD is in-canvas scrollFactor-0 — needs a second camera; zoom is fixed at 1, the advisor's own criterion for accepting bounds-widening; zoom-1 assumption now documented at the setBounds site); narrow-viewport e2e run (canvas is fixed-size, not Scale.FIT/DOM-relative — window size cannot change camera geometry); real-drag pixel assertion (with the manual clamp deleted, the guard's settled-clamp measurement IS the one clamp all input paths hit); duplicate squad titles impossible (names unique per mission by pool construction).
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

- 2026-08-15 (sound run): PLAN. Music = OGG Vorbis not m4a (Playwright's open-source Chromium lacks AAC; Chrome/Firefox fine with Vorbis; Safari secondary). SFX = WAV (universal decode; user asked for wavs). Base SFX layer = original Sulk 0.29 public-domain wavs (SOUNDS_INFO: PD except 3 GPL2 button sounds) — faithful and pre-classified; YouTube assets cover only what the original lacks: stealer voice (Alien: Isolation compilation), pulse-rifle bolter punch, motion tracker, ambient music. Pipeline = manifest-driven `scripts/fetchAudio.ts` (bun TS, idempotent); binaries gitignored, repo carries only script + manifest + credits — keeps copyrighted material out of the public repo while the game works locally after one command. Architecture: pure-logic `audioLogic.ts` (duck targets, tracker interval/detune, event→sfx mapping, replay throttle — all vitest-testable in jsdom) + thin Phaser adapter `AudioManager.ts` (subscribes PieceEvents; replay stream drives ducking so audio tracks what the player sees). Delegation floor waiver (show-your-math): Forge/Cato require `codex` — `which codex` fails this session (verified again); remaining work is serial single-repo file surgery interleaved with an in-flight download pipeline; a parallel writer would race the asset paths. Track→mission map: sh1 Labyrinth, sh2 Evil Malaise, sh3 Industrial Junk, sh4 Dungeon 3, sh5 Cemetery, sh6 Judgement of Carrion (finale epic), beta_1 Underground, beta_2 Lab Entrance, debug_1 Eerie Ambience.

- 2026-08-15 (sound run): refined: ISC-305 — the original PD wav set was ALREADY committed (assets/sounds/) and GameScene had an inline snd_* layer I didn't know about; consolidated instead of duplicated: inline sfx() calls + loads deleted, AudioManager is now the single audio owner, my copied duplicates removed. refined: e2e ducking probe drives phaseChanged events directly — asserting mid-replay volume raced the down-fade on short replays (seed-1 space_hulk_2 stealer phase ends before the 900ms up-tween crosses 0.25). Gotcha found: Phaser reports volume=1 for a beat right at unlock before config volume lands — settle-wait, never single-read. Root-cause fix for missing assets: vite assets-404 middleware (SPA fallback was serving index.html as "audio" → 23 unhandled decode rejections); fixing at the ingestion point made the existing loaderror-tolerance + cache guards sufficient.

- 2026-08-15 (sound run, Advisor round): ADOPTED — (1) `killTweensOf` before each duck tween (phase flip faster than the 900ms fade would leave two tweens fighting); (2) death-cry dedupe through SfxThrottle (a flame template kills several pieces in one tick — one cry, not a clipping chorus); (3) try/catch around localStorage (private-mode boot safety); (4) CREDITS.md hardened: explicit "NOT cleared for redistribution" statement, YouTube-ToS honesty, upstream "legally dodgy" caveat on assault_cannon_burst.wav surfaced. REFUTED with evidence — mute-vs-tween conflict (mute is Phaser's master `sound.mute` flag, a separate axis from the tweened per-sound volume); tracker NaN/stale/leak (distance recomputed from engine.state.pieces every ping, null parks the chain, clamps unit-tested at both ends, gameOver removes the timer, scene-clock timers die with the scene and no restart path exists); replay/hydration scream-burst (no save/load/undo exists; the only replay is the per-turn stealer stream where audio SHOULD play — that is the feature). DEFERRED to user/backlog — ear-check of the 22 guess-flagged segments (user offered to classify after my pass); opus loop-seam listen; WebKit/Firefox matrix + prod SPA-rewrite 404s (local Chrome project, no deploy target). Sulk-wav provenance was already verified against SOUNDS_INFO (not EA 1993 assets).

### 2026-08-16 — Flamer targeting / door shooting / ducting run
- PLAN: engine already targets SQUARES for the flamer (canFlame needs LOS to the square, not to a stealer) — root cause of "can only fire at visible stealers" was client UX only: no targeting mode, no cursor feedback, auto-fallback hid the mechanism. Fix = two-press F flow per user spec.
- Fidelity (original Sulk 0.29 read): Shoot_Something targets `game.squares` for FLAMEGUN (squares, not enemies); closed-door scorereqs sh=6 / aburst=5 / aauto=3 / cc=6; fl=None (doors immune to flames). Aimed door shots implement sh/aburst; autofire already implemented aauto=3.
- refined: edge-model door targetability = canShoot(anchor) OR canShoot(otherSide) OR point-blank (edge directly ahead). The OR is the faithful translation — original doors OCCUPY a square and legality was LOS to that square from either side. Point-blank special case needed because a marine's own square is never in his fire arc and the ray to the far square crosses the door's own segment.
- Advisor round (pre-BUILD, backgrounded): adopted stay-armed-on-invalid-second-F (silent exit punishes mis-aims), arm-gate on ammo/AP, disarm on selected piece death, pan-stale hover recompute in update(), friendly-fire red wash in blast preview, malfunction-counter assertion. Refuted-by-code: single-slot sustained tracking, pure flameFlood, dual cannon thresholds — all already true. Deferred: honoring enemy hover for bolter aimed shots (pre-existing auto-nearest behavior, not in scope); richer doorShot/flameFired payloads (preview reuses pure engine fn, divergence impossible).
- Delegation floor (E3 ≥2) waived — show-the-math: `which codex` → not found (Forge/Cato/Anvil unavailable); tightly coupled engine↔client edits; Advisor invoked as the second perspective instead.
- Aiming-cancel scope: only piece-action keys (wsadocvuxtrgp) cancel — arrow-key camera panning, L overlay, and M mute deliberately keep the aim (panning TO the target is part of aiming).

### 2026-08-16 — Diagonal movement + key rebind run
- Fidelity: original marine _movemap {F_L:1,F:1,F_R:1,L:None,R:None,B_L:2,B:2,B_R:2} — the user's spec IS the original rule; engine MOVE_COST already matched, only bindings + helpers were missing. Original numpad KP7/KP9/KP1/KP3 = the four diagonals; original self-destruct shows a "Really self-destruct?" dialog → B double-press confirm is fidelity, not invention.
- refined: NEW corner rule — a diagonal step is blocked when a closed door sits on any of the four edges meeting the crossed corner (the original's door SQUARE filled that gap; edge-model translation left it open). Door-only by design: the original's cell model ALLOWED wall-corner squeezes, so walls stay permissive. Single predicate Board.diagonalBlockedByDoor consumed by tryMove AND the stealer BFS (Advisor blocker: divergence strands the AI in a forever-'wait').
- Key conflicts resolved: melee C→X (no-ops without an adjacent target; X flanked by movement keys is now low-cost), door O→H ("hatch"), overwatch V→O, self-destruct X→B×2, V unbound. Z=back-right / C=back-left implemented exactly as the user wrote it — spatially crossed vs the keyboard (Z bottom-left maps RIGHT); flagged for a one-word flip if it was a transcription slip.
- Advisor round: adopted arm-state-bound-to-piece-id, endTurn disarm, held-B e2e proof, AI/BFS shared predicate; refuted-by-code: auto-repeat detonation (Phaser JustDown fires once per physical press — proven by the held-B test); deferred: event.code layout-independence, modifier-key guards, text-input suppression (no text inputs exist) — all pre-existing scheme-wide choices.
- Seeded drift: the corner rule reroutes stealers; beta_2 pin 4→9, quota pin 5→7. Diagnosed before re-pinning: seed-4 run progresses fully (18 casualties, download to 1, loss at turn 12) — fragility, not stalls.
- refuted: my own 35ms handleFire debounce — under parallel load two LEGITIMATE presses land in one stalled frame with identical time.now; the WeakSet replay dedupe is the correct guard and the debounce swallowed real input. Removed.
- Delegation floor waived, same math as prior run (codex absent; Advisor as second perspective).

### 2026-08-16 — minimap viewport-box overflow on narrow maps (E2, ISC-376..383)
- Root cause: `projectCamToMini` clamped the box's POSITION but never its SIZE. On boards narrower than the camera's world viewport (space_hulk_1 22 tiles, beta_2 23), the projected width exceeded the whole minimap; the x-clamp pinned x to the left inset and the excess spilled out the right edge. Repro'd numerically before touching code: +41.7px (space_hulk_1) and +30.2px (beta_2) overflow; space_hulk_6 (29 tiles) −22px, matching the user's "only these two missions" report exactly.
- Fix at the ingestion point (the shared projection function), not per-map: clamp W/H to `mini − lineWidth` (floored at 0) BEFORE the position clamp, so the position math consumes the clamped extents. Camera-sees-more-world-than-board is intended behavior (small maps letterboxed, markers pannable) — the projection must absorb it, not the camera.
- Advisor round: adopted stroke-extent assertions (path ± halfLine inside bounds — path-only checks can hide a half-line spill) and the eyeball check that the position clamp reads the clamped width (it does — consts declared above the clamp lines). Refuted-by-inspection: inverse-mapping drift (projectCamToMini has one caller; the minimap has no pointer handlers, no inverse exists) and downstream rounding (strokeRect gets the floats untouched). Declined: NaN guards for zero board dims — Minimap is constructed after mission load and every mission has ≥1 square; a guard would protect an unreachable state.
- `Minimap.lastBox` added as a public e2e probe of the rect actually drawn — same pattern as `flamePreview`.
- One e2e blip (40/41) in the first post-fix run, unidentified test, followed by 4 consecutive 41/41 runs; consistent with the known parallel-load flake class, logged honestly rather than hidden.
- Delegation floor waived, same math as prior runs (codex absent; Advisor as second perspective on a 4-line single-file fix).

### 2026-08-16 — HUD restructure: Mission Status, keyboard help, Credits (E3, ISC-384..399)
- Split of concerns made explicit: the canvas HUD is MISSION-level (turn, timer, kills, objective, status, dice, map legend, hover); the DOM roster is MARINE-level (AP/CP/ammo per card) plus static reference (keyboard help, credits). The HUD's `selected`/`apChanged`/`ammoChanged` listeners were removed outright, not redirected.
- Keyboard help is data-driven (`keyboardHelp.ts` KEY_ROWS) with unbound keys kept as dimmed aria-hidden spacers so bound keys sit at true physical positions; a vitest pins the 22-key binding inventory against GameScene's addKeys + dedicated handlers, so a future rebind that forgets the help fails a test.
- Native `<details>` chosen over custom JS for collapse (arrow for free). Advisor caught the focus trap: a focused `<summary>` re-toggles on Enter, and Enter ends the turn — fixed by blurring on the async `toggle` event, and the e2e polls for the blur (asserting immediately after click races the queued event; first run of that assertion flaked before the poll).
- Playwright `hasText` is substring + case-insensitive: filtering keycaps by 'W' matched "f**w**d left" — locate by exact `<kbd>` text instead.
- Music credit consolidated into the Credits section; the GameScene DOM append deleted (single source, e2e counts exactly one link). Legal text carried verbatim from the original site inside a collapsed sub-details.
- Writing guide: summarized into CLAUDE.md with the guide as canonical source ("read it before writing displayed text") — a pointer plus the ban list, accepting the advisor's divergence concern because the section defers explicitly. Displayed strings audited: `Turn N — Marines` → `Turn N: Marines`, dice `— KILL` → `· KILL`; remaining em dashes are code comments (exempt).
- Delegation floor waived, same math as prior runs (codex absent; Advisor invoked as the second perspective; all touched files already in context).

### 2026-08-16 — asset index in docs/ (E3, ISC-400..412)
- Request said "assets in the ./docs/ directory", but docs/ holds five documentation files and no assets; read as "index the game assets, put the file in ./docs/" — the only reading where usage descriptions and an unused list mean anything. Assets live at packages/client/public.
- Index generated by a scratchpad bun script that walks public/, pairs each file with a hand-verified usage entry, and exits nonzero on any unmapped or stale entry — completeness by construction instead of eyeballing 149 rows.
- Usage traced through four channels a filename grep would miss: static load.image/load.audio paths (GameScene, PreloadScene, AudioManager), dynamic keys (RosterPanel iconUrl ← engine spriteKey via EXPECTED_SPRITE; musicFile() per mission; alien_${file} gated on alienSegments role), index.html favicon, styles.css fonts.
- Findings: 78 of 149 files dead (42 pygame UI images, 27 theme sprites, 4 sounds, 3 alien cuts, 2 fonts). ambush_counter.png is the sole loaded-but-never-drawn asset (boot-download dead weight; left in place — read-only scope, inventory only).
- Accuracy corrections made against sources before generation: ducting objective belongs to space_hulk_6 (initially misattributed to space_hulk_4; mission JSON grep settled it); softened unverifiable claims (blip-conversion timing, C.A.T. selectability) to what the code shows.
- E3 ISC floor (≥32) not met with 13 new ISCs — show-math: single-doc deliverable; the project ISA's 413 total far exceeds the floor. Delegation floor waived, same math as prior runs.

### 2026-08-16 — architecture + development guides (E3, ISC-413..424)
- Two docs added: docs/architecture.md (system + frontend↔engine boundary + deployment) and docs/development-guide.md (directory map + recipes for missions, unit types, objectives, sounds).
- Every architectural claim read from source this session before writing: vite alias means the client compiles engine SOURCE (dev needs no engine build; engine's tsc dist exists for non-Vite consumers); the stealer turn is synchronous inside endMarinePhase() with the client capturing and replaying the event stream (GameScene:779); MARINE_CLASSES in GameEngine constructor is the deployment mapping; unregistered ?mission= falls back to debug_1.
- Deploy section written to what exists: no CI, no Dockerfile, no vite `base` — static hosting of packages/client/dist, with the fetch-audio-before-build caveat (audio/ is gitignored; game degrades to silence) and the assets404-is-dev-only note.
- Unit-type recipe enumerates nine wiring points because the failure modes are quiet (EXPECTED_SPRITE drift only warns; missing shotSfx mapping silently falls back to bolter) — the list came from grep, not memory.
- Verification was mechanical where possible: every backticked path/filename resolved via find (first pass flagged 44 "missing" that were bare filenames inside stated parent dirs — checker false negatives, re-verified repo-wide to 0); md links checked; banned-pattern scan clean on both docs.
- Same floor waivers as the asset-index run (12 new ISCs vs E3 ≥32; delegation inline).

### 2026-08-16 — rules reference (E3 via context-override, ISC-425..438)
- Classifier returned E2 seeing the prompt alone; escalated to E3 per the conversation (largest doc extraction of the session, same class as the two prior E3 doc runs).
- docs/rules-reference.md written from a full read of every rules module this session: CostTables, Piece, StormBolter/Sergeant/Sword, HeavyFlamer, AssaultCannon/ChainFist, Genestealer, Blip, AmbushCounter, combat, Door, flame, exotic, vision, los, StealerAI, GameEngine (CP, timer, endMarinePhase, checkVictory), plus a python extraction of all nine mission JSON configs.
- Two precision fixes caught on self-review before commit: dropped an unverified cannot-re-flame claim; corrected overwatch reactions to fire-arc + LOS + range (canShoot), not merely sight.
- Notable rules surfaced by the read that the reference now records: bolters jam ONLY on overwatch/reflex doubles (the canJam flag is false on aimed shots); the parry declines beatable ties; lost conversion stealers score nothing; blip bag is 8/4/9 over 21 via rejection sampling; the mission 6 control-room flamer booby trap.
- User wrote "./doc/"; delivered to the established ./docs/ and said so. README Guides list extended with the new file (consistent with the prior explicit link-the-docs request).
- 14 new ISCs vs E3 soft floor ≥32: same show-math (single doc; project total 438). Delegation waived, standing rationale.

### 2026-08-17 — code review + coverage + dedup + reorg + GPL (E4 classifier, ISC-439..471)
- Baselines captured before any change: 222 engine + 35 client unit tests, 42/42 e2e, engine coverage table. Every chunk re-verifies against these.
- Two background review agents (engine + client duplication) ran as the delegation pair; Forge/Cato remain unavailable (codex CLI absent — `which codex` empty). Show-math: Cato's cross-vendor role partially covered by the two independent agent reviews plus the Advisor round; residual risk is Anthropic-family blind spots, accepted and disclosed.
- Triage rule for agent findings: adopt only behavior-identical LOW-risk changes; preserve flagged diffs verbatim (fade 150 vs 160/80, escaped-flamer keeps aiming, hypot-vs-chebyshev autopilot metric); surface HIGH-risk findings as documented follow-ups, not fixes — seeded e2e playthroughs make ANY behavior change a break.
- HIGH-risk findings deliberately NOT fixed (documented for a future decision): (1) MarineAutopilot BFS lacks the diagonalBlockedByDoor corner rule Board.ts declares "must never diverge" — can plan a step tryMove refuses (latent stall); (2) marineEscaped does not disarm flamer aiming while pieceDied does; (3) autopilot nearest-sort uses Euclidean hypot while all rules use Chebyshev. Each would change seeded-game outcomes.
- One latent-defect fix ADOPTED (bug, not behavior-preserving refactor, disclosed as such): finishReplay orphans JAM markers (destroys sprites + overwatch markers but not jamMarkers) — cleanup added for symmetry.
- loadMissionSync deleted (test-only, silent space_hulk_1 fallback footgun, drags Node fs into browser-bundled engine src); mission.spec rewritten against loadMission + direct JSON import.
- Selection.ts moves engine→client: zero engine-internal consumers (grep), it is pure UI state; e2e unaffected (window.sulk.Selection is set by GameScene from its own import).
- EnterPlanMode skipped: user requested the work directly (not "create a plan"); session precedent is direct execution with per-chunk verification.
- GPL-3.0 licensing added mid-run at user request: LICENSE from gnu.org canonical text, README section, SPDX fields in all three package.json files.
- New-ISC count 33 vs E4 soft floor ≥128: show-math — project ISA totals 471 ISCs, far above the floor; a single review run adding 128 criteria would be padding, not articulation. Thinking floor met at 6 (IterativeDepth, SystemsThinking, FirstPrinciples, RootCauseAnalysis, Advisor, ReReadCheck).
- Agent-finding triage (engine): ADOPTED squareSeenByMarine unification (3 copies → vision.ts), facingToward/turnToward/chebyshev/ORTHO_VECS/FACING_WORD → Direction.ts, demolishDoor/openDoorWithEvent → Door.ts free functions (Door class stays silent for the blip peek probe), SBM/ACM beginAimedShot/beginDoorShot/settleDoorShot/jam/clearSustained/spendRound, GameEngine resetDownload, getSquare alias removal (los.ts + tests moved to .get), Square.distance/isAdjacent/headingTo deletion (test-only; distance duplicated chebyshev). DECLINED with reasons: BFS unification (rule deltas are real behavior — corner rule + marine-blocking; HIGH risk to seeded games), walkDist/pieceNear merge (small, private, documented; coupling autopilot to Board buys little), hypot→chebyshev in autopilot sorts (behavior change), ACM dead jammed-guards removal (inherited-flow consistent, harmless), Genestealer.moveCost derivation (explicit table more legible), doorAt retention (reasonable public convenience), overwatcher-scan share (intentional canSee difference).
- Agent-finding triage (client): ADOPTED centerXY (~14 sites), paintObjectiveSquare (4 sites), removePieceSprite+clearSelectionOf (preserving fade 150 vs animating?160:80 and the disarm difference verbatim), disarmAndRefresh (3 identical sites), emitSelected/ammoOf (3 sites), OFF→DIR_VEC, tileSize→TILE_SIZE, MINI_MAP_MARGIN use, FACING_ARROWS + UI_FONT hoist to config, audioManifest dead-export deletion + stale-comment fix, PreloadScene 'square' load documented. DECLINED: AudioManager handler table (guard already centralized in play()), HUD kill-counter unification (intentional replay-truthful split, documented in RosterPanel), overlay-shape merge (differ in depth/alpha/teardown).
- Advisor round (full transcript in session): ADOPTED test-NAME diff vs the pre-change JSON dump (every gone name accounted: dead-code deletions, retitles, file moves), Object.freeze on DIR_VEC/ORTHO_VECS/FACING_WORD + suite rerun (green — no mutation anywhere), clean-clone `pnpm install --frozen-lockfile` + suites (green — the deleted client lockfile provably unnecessary), vitest single-version check (one 3.2.3 across workspace — advisor's engine-on-1 assumption was wrong, engine inherits root ^3.2.3), no-.snap-files check, repo-wide deleted-name grep (only tar**getSquare** substring false positives), client coverage/ gitignore addition, GW-trademark + asset-license sentences in the README License section, three-way commit split (refactor 64bfc71 / JAM fix d22bfdc / licensing 7fb9ac3). SPDX GPL-3.0-only already chosen pre-advice. DECLINED with reasons: characterization test for the corner-rule divergence (documented at the code site in nextStep's docblock + here; budget) and a dedicated JAM-fix unit test (Phaser-bound scene internals; fix isolated in its own commit for review). Escaped-flamer re-triage per advisor: it IS a state leak, but reachable only if a flamer escapes while aiming, and every aim-canceling path (movement keys) fires before an escape move completes — near-unreachable, cosmetic cursor stickiness at worst, left documented.
- refined: ISC-439 baseline restated around the name-level dump (the 222/35 split was a mis-derivation from the combined rtk run); ISC-449 reinterpreted — consumer-less barrel exports (drawAmbushValue, TURN_COST, AP_PER_TURN, DOOR_FACING, sectionSquares, clearFlames, toRelative) KEPT as deliberate public API of a library package; ISC-454/455 satisfied by pre-existing coverage discovered once instrumentation landed (minimap.spec covers cameraBox 100%, roster.spec covers marineNames 100%).
- Found in the act: the old mission.spec asserted `name === 'Suicide Mission'` against sampleMission.json ("Demo Board") — it passed only because loadMissionSync's silent catch substituted space_hulk_1. The footgun the deletion removes had already swallowed its own test.
- Process slip logged: one `npx vitest` invocation early in the run (bun/bunx-always rule; project tooling is pnpm — subsequent runs used `pnpm exec`).

### 2026-08-17 — Pages-deploy run (ISC-515..534, E3)

- Design: the git tag is the single source of truth for a release — trigger (`v*` push), UI version (`SULK_VERSION` → Vite define `__APP_VERSION__` → `#app-version` in homepage credits + manual footer), and deployed content are all derived from it. No package.json version bumps to drift. `workflow_dispatch` was added then REMOVED after review: it would stamp a branch name as the version; redeploys instead re-run the tag's workflow from the Actions UI, so the tag remains the only version source.
- Vite `base: './'` chosen over `'/sulkweb/'`: all runtime asset strings are already relative, so a relative base makes the build mount-point-agnostic (works on Pages, `vite preview`, and any future host) with zero environment switches.
- The deployed site ships without ALL fetched audio (`assets/audio/`: ambient music, alien voices, derived SFX cuts — YouTube-sourced, gitignored per CREDITS.md). CI checkouts never have it; GitHub Pages 404s take the client's tolerated loaderror path (ISC-328 hardening pays off). Tracked `assets/sounds/` ships. README/workflow wording corrected per review (first draft claimed only music was missing).
- Environment protection gotcha: the auto-created `github-pages` environment only allowed `main`; the tag deploy was rejected on first run. Fixed via API: custom branch policies + a `v*` tag-type deployment policy, then re-ran the failed job. This is now part of the release gateway itself.
- CI gate = engine tsc build + client `tsc --noEmit` + `pnpm -r test` (302 unit tests). DECLINED putting Playwright e2e in CI (minutes + browser install + flake for a personal repo; e2e runs locally per this ISA's process, and the deployed version string is live-probed post-deploy instead). Reviewer's script-injection note fixed (`SULK_VERSION` via `env:` block, not raw `${{ }}` in `run:`).
- Delegation floor (E3 ≥2) show-your-math: Forge waived — `which codex` fails on this machine (re-verified). One background diff-review agent ran (found the MED env-interpolation and MED audio-claim issues plus three LOWs, all addressed); a second agent would have re-reviewed the same single-workflow diff with nothing new to add.
- ISC soft floor: 20 new ISCs this run; project total 535 far exceeds the E3 ≥32 floor.
- Interceptor extension again reported "no extensions connected" (daemon up) — real-Chrome verification done via Claude-in-Chrome MCP, same fallback as the home-page run.
- Commits: 9d83ca9 (feature: base/version/define, workflow, README, repo setup), e78900d (review hardening). Tag: v0.2.0 → run 32012182040 success.
### 2026-08-17 — Fades + favicon run (ISC-554..566, E2)

- Root cause of the reported "homepage music keeps playing in the next mission": NOT same-tab (page unload kills audio — homepage confirmed silent by design, live-reproduced). The bleed is the backgrounded-tab path: a looping Web Audio source keeps sounding while the hidden tab's RAF loop is frozen, and Phaser's blur-pause only catches sounds already playing at blur time (a sound started while hidden played happily in our probe). Fix: explicit `visibilitychange` handling in AudioManager — hidden pauses the bed immediately (tweens are RAF-frozen while hidden, so no fade there), visible resumes with the entrance fade.
- Phaser gotcha (cost one red test): `play()` resets a sound's volume to its config value, clobbering a preceding `setVolume(0)` via the unlock queue's deferred play — a from-less fade tween then captures volume 1 and fades DOWN (observed: 1 → 0.37 toward the 0.16 duck target). The fix is `volume: { from: 0, to: target }` — the tween re-asserts silence at start regardless of what play() does. Documented at the code site.
- Favicon: the 40×40 storm-bolter terminator sprite used at native size (sips smoothing would blur pixel art); vite.svg deleted, all three pages link /favicon.png (Vite rewrites relative under the subpath).
- Advisor round: guards it demanded already present (killTweensOf before pause, isPaused gate on resume, listener teardown in destroy, add-config volume 0 against the one-frame blast — live v1≈0). ADOPTED: visibility-pause regression e2e (defineProperty visibilityState + dispatch, assert isPaused, then visible → isPlaying; commit 47e9879). DECLINED: iOS Safari resume handling (ogg never decodes on Safari anyway — standing known limitation).
- Delegation floor (E2 ≥1) waived, show-your-math: scoped two-file fix in code two review rounds just covered; the advisor round provided the second-opinion function.
- Commits: f6bea9c (fades + visibility pause + favicon), 47e9879 (regression e2e). Tag v0.3.2 — deploy run green.

### 2026-08-17 — Audio-ship run (ISC-535..553, E3)

- User decision (explicit, after options presented with CREDITS.md's "NOT cleared for redistribution" surfaced): ship ALL fetched audio with a per-source credits page. Music rides the Music of 40K non-profit-with-credit grant (the page satisfies its stated terms verbatim); the Aliens/Alien: Isolation cuts ship as short attributed excerpts with a rights-holder takedown offer. CREDITS.md rewritten to state this posture plainly rather than pretend a clean chain of title.
- Design: /credits.html is generated from audioManifest.ts + alienSegments.ts — the same data fetchAudio.ts downloads from and AudioManager plays from. The reviewer correctly noted generation alone no longer guarantees coverage once binaries are hand-committed, so a unit test now asserts set-equality between the files on disk and the manifest, both directions (audioFiles.spec.ts).
- Review agent findings, all fixed in 003877c: 8 stale "gitignored / ships no audio" claims across CREDITS.md itself, fetchAudio.ts, architecture.md (whose deployment section was ALSO stale on base './' and CI from the v0.2.0 run), CLAUDE.md, development-guide ×2, asset-index.md, AudioManager; the in-game RosterPanel credit under-crediting audible film/game cuts (now links credits.html); alien cut counts (22 ship, 19 play — page said 19); brittle hardcoded first-row asserts in credits.spec.
- Gotcha (environmental): Chrome hidden-tab RAF pause freezes the PreloadScene→GameScene handoff, mimicking a deploy failure. Diagnosed via document.hidden=true; un-stuck by stepping phaserGame.loop manually. Affects verification tooling only, not users.
- Layout: manual.css scopes its reading column to #manual — the credits page needed its own #credits column (860px); caught by live screenshot, shipped in v0.3.1.
- Delegation floor (E3 ≥2) show-your-math: Forge waived (codex CLI absent, standing); one background diff-review agent ran and delivered (11 findings adopted); a second reviewer on the same diff judged redundant.
- Commits: 6ce332c (audio + credits page + posture flip), 003877c (review fixes). Tags v0.3.0, v0.3.1 — both deploy runs green.
- Advisor round (audio-ship): ADOPTED four closers, all green — gesture-unlocked playback on live (AudioContext "running", sfx_tracker_ping played, isPlaying true; audible, not merely constructed); 32 decoded cache keys rule out 404-HTML-as-audio; in-game credits link verified in the live DOM as relative href; repo-wide stale-phrase grep returns only the corrected CLAUDE.md sentence; no service worker exists anywhere (its cache-versioning concern is moot — the "32 keys" are Phaser's in-memory audio cache). DECLINED: Safari/iOS ogg support (pre-existing design since the audio run: Vorbis-only, cache guards degrade to silence; a Safari fallback is a feature request, not this run); repo size vs Pages limits (36M vs 1GB soft limit — non-issue).

- Advisor round (8 items): ADOPTED the git-history audio check — `git log --diff-filter=A -- assets/audio/` empty and `git rev-list --objects --all` contains zero mp3/ogg/m4a/opus/webm objects; only the 15 tracked GPL `assets/sounds/*.wav` exist in history, so the copyright posture holds at the object level, not just the working tree. Items 2/3/5/6/7/8 already evidenced (needs-chain, negative trigger via e78900d push producing no run, tag-derived version env, no router, build_type workflow, hashed-filename freshness). Item 4 already done (play path exercised in real Chrome, zero errors). DECLINED: in-game copy explaining the missing web audio (the in-game credits' "Music of 40K" line slightly overpromises on the deployed site; README covers it — cosmetic follow-up, not blocking).

## Changelog

- **Conjectured:** (door-corner run) proper-interior segment intersection was the right blocking test for closed-door edges — endpoint grazing "doesn't count" as crossing, per the standard computational-geometry convention the original implementation borrowed.
  **Refuted by:** the user's playtest ("strange behaviours around line of sight and doors converting blips to stealers if the marine is at an angle"; "one stealer appeared each side of the door") and the reproduction probe: a marine diagonal to a closed door saw the square behind it through the door's corner point, converting blips the door should hide — while the movement layer had ALWAYS treated that same corner as solid (`diagonalBlockedByDoor`).
  **Learned:** the geometry convention has to come from the game world, not the algorithm textbook: a door segment's endpoints are doorway frame, and sight and movement must read the same corner the same way. When two rule layers (move vs see) encode the same physical boundary with different edge-case conventions, the divergence IS the bug class — the blip split-spawn was the same corner blindness surfacing through a third path (conversion seating used raw adjacency with no edge legality at all).
  **Criterion now:** ISC-604..609 (corner LOS + conversion legality, both mirroring the movement rule), ISC-613 (zero pinned-fixture drift).

- **Conjectured:** (hive pin/blood run) the scripted CP-rush probe was a durable winnability oracle for beta_2 — re-pin its seed after each AI change and the mission stays demonstrably beatable.
  **Refuted by:** the probe's win rate across the hive's evolution: 3/40 → 5/80 → 1/80 → 0/400, with the download counter never ticking in the final scan. The probe's fixed strategy (pump CP into one sergeant, rush the Data Room) is exactly the play a destination-camping hive is built to punish; its failure now measures the probe's rigidity, not the mission's winnability.
  **Learned:** a fixed-strategy probe is only an oracle while the opponent is weaker than the strategy. Once the AI adapts to the probe's exact shape, "probe loses" stops distinguishing "mission unwinnable" from "probe outdated" — at that point the honest moves are (a) repurpose the pin to what it still proves (determinism of the opposed loop) and (b) escalate winnability to a stronger oracle (human playtest), with the tuning lever pre-identified.
  **Criterion now:** ISC-601 (DEFERRED-VERIFY on designer playtest), pinned opposed-LOSS determinism fixture in beta2_mission.spec.

- **Conjectured:** (hive AI run) growth-keyed wave patience — "keep massing while reinforcements feed the wave" — would time waves against the respawn rate.
  **Refuted by:** the user's space_hulk_1 playtest: under UNCAPPED reinforcements the force grows every single turn, so the patience clock reset forever and the wave never launched; blips meanwhile deadlocked at an exposure door outside the voluntary-convert radius, and the marines completed the mission against a passive horde.
  **Learned:** any "wait while improving" heuristic needs an absolute bound AND an external clock. The external clock here is the mission itself: the hive doesn't need the win rules, only the destination geography — distance-to-destination converts directly into "waves remaining", and when that hits one, enough is whatever you have. Hunger belongs at the piece level too: idleness is evidence the clever plan is not working.
  **Criterion now:** ISC-583..588, ISC-590 (reckless launch, shrinking threshold, massing cap, destination camping, idle-forced assault, deadlock-breaking conversion, bounded-idle soak probe).

- **Conjectured:** (hive AI run) octant round-robin over staging candidates would spread the buildup across approach vectors — "assign piece i to octant (i+turn) mod N" read like it forced a split.
  **Refuted by:** the two-corridor spread fixture: both stealers massed on ONE flank. Two causes stacked — octant granularity put six adjacent-octant candidates on the same corridor (so "different octants" were the same approach), and chebyshev scoring sent a west-side piece to an east-side target because straight-line distance ignores that the route curls around rock (the pieces then crossed paths and jammed on the transit row).
  **Learned:** "spread across directions" needs BOTH angular separation (vectors ≥2 octant steps apart, else it's the same corridor) and real approach cost (a safe-reachability Dijkstra map per piece — chebyshev lies exactly when routing matters, which is exactly when the mechanic matters). The advisor predicted "one fat column" from the architecture alone before the fixture proved it; adversarial fixtures for coordination mechanics earn their cost.
  **Criterion now:** ISC-571 (one stealer per flank in the two-corridor fixture, both dark, zero reaction dice).

- **Conjectured:** (sound run) the cut pipeline was verified because ffprobe showed correct durations/codecs, the e2e suite heard state (isPlaying, volume), and the one hand-cut file sounded plausible.
  **Refuted by:** the user playing alien_attack_01.wav in VLC — pure silence. Every script-cut file was −inf dB: with `-ss` AFTER `-i` (output seeking), ffmpeg runs the `-af` fade chain on the FULL source timeline first, so `afade=out:st=0.2` silenced the entire 250s source and the seek extracted zeros. Duration/codec/state probes all pass on a perfectly-formed file of silence. Two more bugs hid behind it: trackKey built from `mission.name` (display title — "Suicide Mission" ≠ registry key, so space_hulk_1/debug_1 never queued music), and Brave leaving the AudioContext 'suspended' while Phaser reported unlocked.
  **Learned:** for media pipelines, verify the SIGNAL, not the container — an RMS/peak assertion is to audio what a screenshot is to UI; state-level probes (isPlaying) are the "curl returns 200" of sound. And test the identity axis where names diverge: the e2e missions all happened to have name==key.
  **Criterion now:** ISC-335 (silence self-check inside fetchAudio itself), ISC-336 (name≠key mission regression e2e asserting context 'running' + isPlaying), ISC-337 (gesture-driven context resume).

- **Conjectured:** (sound run) "missing audio never breaks boot" was satisfied by loaderror tolerance + cache-exists guards — the code path looked complete, so the criterion looked met.
  **Refuted by:** the ISC-328 live probe (stash the audio dir, boot the game): 23 unhandled "Unable to decode audio data" rejections — Vite's SPA fallback serves index.html with HTTP **200** for missing /assets files, so the loader never errors; Phaser happily tries to decode HTML as Ogg.
  **Learned:** graceful-degradation criteria are about the *server contract*, not just client guards — a guard keyed on load failure is dead code when the failure mode is a successful load of the wrong bytes. Probe absence by actually removing the asset, never by reading the guard.
  **Criterion now:** ISC-328 passes via the `assets404` Vite middleware (missing /assets/* → real 404) + the stash-the-dir Playwright probe; the same check must be re-run against any future static host's rewrite rules (deferred with the deploy backlog).

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


### 2026-08-16 — Phaser replays keydown events; dedupe at the handler boundary
**Conjectured:** one physical key press = one Phaser 'keydown' emission, so raw-event checks and JustDown dispatch are equivalent and safe.
**Refuted by:** instrumented e2e keylog — 3 DOM keydowns produced 5 Phaser emissions under machine-speed input (f@880, f@886, f@887-replay, a@888, f@898-replay); the trailing replayed 'f' re-armed the flamer after 'a' had cancelled, and under full-suite load the same replay double-fired keydown-M (mute true→false with the poll catching the intermediate), making failures MIGRATE between key-driven tests.
**Learned:** Phaser's keyboard queue can re-emit the SAME native event object across frames when frames stall (headless parallelism, throttled RAF). Any single-press action wired to 'keydown' double-fires. The replay passes the identical event object, so a WeakSet dedupe at every handler boundary is a complete, timing-free fix — debounce-by-ms is the fallback, dedupe-by-identity is the cure. Also: a test failure that MOVES between tests under load is a shared-infrastructure symptom, never two unrelated flakes.
**Criterion now:** ISC-360 (three consecutive full-suite runs green: 37/37 e2e), seenKeyEvents WeakSet guarding both keydown handlers + fire-intent debounce in handleFire.


### 2026-08-16 — Time debounce vs event-identity dedupe for input replays
**Conjectured:** a ~2-frame time debounce in handleFire is a harmless extra guard against Phaser keydown replays, alongside the WeakSet dedupe.
**Refuted by:** intermittent full-suite-only failures of the two-press e2e — under parallel load two LEGITIMATE F presses 80ms apart in wall time were processed in one stalled frame batch with identical scene time, and the debounce swallowed the real second press (received state: re-armed instead of fired). Also refuted the synthetic-hover test pattern: with the flamer armed, update() recomputes hover from the REAL pointer every frame, so injected hoverCoord is overwritten frame-dependently — the e2e must aim with real mouse moves.
**Learned:** guard against duplicate INPUT by identity (same event object → WeakSet), never by time — wall-time gaps and frame-time gaps diverge under load, and a time guard eventually eats a legitimate input. And when production code owns a piece of state (hover follows the pointer), tests must drive the real input, not inject the state.
**Criterion now:** ISC-375 (five consecutive full-suite runs 40/40), handleFire carries a comment forbidding time-based debounce, flamer e2e aims via page.mouse.move.

## Verification

### Minimap radar (2026-08-19 eighth run, ISC-672..712)

- ISC-723: Bash — pushed e7c526d..a79bfda; tag v0.4.7; deploy run 32254736666 completed success BEFORE the release was created (codified order); release https://github.com/harryf/sulkweb/releases/tag/v0.4.7 "The hulk pings back" published; live home + manual 200; main-BmjP2yWF.js carries v0.4.7, echo_stealer, and the onPing/marineMirror radar code; the manual chunk carries "auspex" x3. Classifier returned NATIVE on "push and tag release" — context-override to ALGORITHM E1 per the standing release precedent (fourth application).
- ISC-672/674/675: Playwright radar spec — click at minimap local (92,140) lands cam.midPoint.y within one tile of local/mapScale world y (669.6); lastBox.y changed; Selection.get() unchanged across the click (the in-flight selection pan is reset first — panEffect.reset() in onFocus, found by the test itself: the 250ms pan stomped centerOn next frame)
- ISC-673: Playwright — corner click clamps scrollX/scrollY to cam.getBounds() min exactly; bottom-edge click clamps scrollY to bounds max (computed live from cam.height, no hardcoded geometry)
- ISC-676: Playwright — ArrowDown held 250ms still increases scrollY after the change
- ISC-677: vitest — miniToWorld inverts the projection (92,46 at sh1 scale → 440,220; corners map to corners)
- ISC-678/679/680: Playwright (debug_1 — sh1 deploys the squad boxed in with no legal step) — lastMarineDots.length equals living marines; a tryMove step changes the dot set next frame; alive=false drops the count by one (per-frame redraw reads engine alive directly)
- ISC-681: Read — drawMarines filters on p.alive, the same flag tryEscape sets false (engine-side pin from ISC-659 still green)
- ISC-682: Read makeCloudTexture — stealer texture coreAlpha 1/coreStop 0.35 (tight solid core), blip 0.55/0.15 (early-fading smear); screenshot radar-pulse.png shows both solidities on the live scope
- ISC-683: vitest — stealerAlpha 0.9 > blipAlpha 0.38, blipSizePx 15 > stealerSizePx 11
- ISC-684: Read — echo texture keyed on kind === 'stealer' ternary; AmbushCounter extends Blip (kind 'blip'), no special case exists to get wrong
- ISC-685: Read toMini — (c+0.5)*tile*mapScale, the same scale the tile images use; screenshot shows echoes seated on the corridor grid
- ISC-686: Playwright — with three stealers spawned and NO pulse fired (onPing detached), activeEchoes() === 0
- ISC-687: Read scheduleTracker — this.onPing?.(interval) sits outside play()'s cache guard; a missing tracker WAV silences the ping but not the sweep
- ISC-688: Playwright — lastPulse.origins deep-equals the living sergeants' board squares
- ISC-689: vitest — delay 0 at the origin, monotonic with distance, exactly ringDurationMs at max range, clamps beyond, degenerate maxPx=0 never divides by zero; Playwright: echoes revealed after the pulse
- ISC-690: vitest — fadeMs = interval - delay, clamped at minFadeMs 250 under panic cadence
- ISC-691: grep — onPing is invoked exactly once in the codebase (scheduleTracker) and minimap.pulse is wired exactly once (GameScene onPing); no other clock exists
- ISC-692: Playwright — all sergeants alive=false, pulse: lastPulse.origins [], activeEchoes 0 (clearEchoes destroys immediately)
- ISC-693: Playwright — same scenario, lastMarineDots.length > 0
- ISC-694: Read — scheduleTracker rechecks only this.over; scene.sound.mute silences playback, never scheduling
- ISC-695: Playwright — homepage: sulk.audio null, activeEchoes 0, lastPulse null, zero pageerror events
- ISC-696: Read — gameOver handler removes trackerTimer and sets over; scheduleTracker bails on this.over, so no further onPing fires
- ISC-697: Read — echoes is a Map<pieceId, Image>; pulse repositions and re-tweens the existing image, creating one only on first contact and destroying only when the contact leaves the board
- ISC-698/699/700/705: vitest — factor 1 at 0/1/fullDist; minGain at farDist and beyond; monotonic non-increasing sweep 0..farDist+2; null → 1; dist 1 (CC adjacency) → 1
- ISC-701/706: Playwright — synthetic doorToggled at a marine's own square: lastPlay {key: sfx_door, volume: 0.8}; at the board square farthest from every living marine (Chebyshev, computed live): volume < 0.8 and ≥ 0.2 floor
- ISC-702/703/704: Read — stealer skitter playAlien('stealer_move', x, y), blipConverted playAlien('stealer_door', x, y), stealer death playAlien('stealer_death', x, y) — all through playAt's single gain rule
- ISC-707: git diff — shot/sectionFlamed/malfunction/jammed handlers untouched; marine clank and marine death unrouted
- ISC-708: git diff grep — zero additions touching createSprite/pieceSprites/setTexture in GameScene; the change set is minimap + audio + docs + tests only
- ISC-709: git diff grep — zero em dashes in the new KEY_NOTES line and manual auspex HTML
- ISC-710: Read — README controls row "Mini-map click", README "Mini-map auspex" section + "Positional volume" sound bullet; manual SECTIONS gains id 'auspex'; KEY_NOTES gains the mini-map line
- ISC-711: Bash — tsc --noEmit exit 0 in packages/client and packages/engine (re-run clean after the review round)
- ISC-712: Bash — engine vitest 288/288; client unit 58/58 (8 files, radarLogic at 100% coverage); full Playwright e2e 78/78 (69 existing + 9 radar, incl. review-round additions)
- ISC-713: Read Minimap mask construction (make.graphics off-list, scrollFactor 0, fillRect at the minimap's screen rect, GeometryMask on ringGfx + echoLayer); screenshot radar-mask-full.png: mid-sweep arc clipped exactly at the minimap rectangle, zero paint over the board
- ISC-714: Read — endTurn sets minimap.frozen with animating, finishReplay clears both; updateCam skips drawMarines and pulse() returns early while frozen
- ISC-715: Read — marineMirror seeded from engine at construction; pieceMoved updates ids it holds, pieceDied(kind marine)/marineEscaped delete, pieceAdded(marine) inserts; nearestMarineDist iterates the mirror only
- ISC-716: vitest — fadeMs = interval - delay - fadeInMs at generous cadence, envelope sum ≤ interval, panic delay collapses to 0 with fade at the 250ms floor
- ISC-717: Read — AudioManager constructor takes onPing as its fourth parameter and assigns before the startAll branch; GameScene passes the pulse callback at construction
- ISC-718: Read — onFocus does panEffect.reset() then centerOn(wx + HUD_WIDTH / 2, wy), centring in the visible play area left of the opaque HUD strip
- ISC-719: Playwright beta_2 — lastPulse.origins (set-compared) equals both living sergeants' squares; after one sergeant dies, one origin remains and activeEchoes > 0 at 900ms
- ISC-720: Playwright — echoTexture(spawned stealer id) === 'echo_stealer', echoTexture(boot blip id) === 'echo_blip' immediately after pulse
- ISC-721: Playwright — synthetic shot from a living marine: lastPlay.volume exactly 0.8
- ISC-722: Playwright — no manual pulse() call in the test; waitForFunction(lastPulse !== null, 8s) satisfied by the real tracker scheduler after the unlock click; origins non-empty
- Screenshots: scratchpad radar-pulse.png (red dot column, one solid + several faint green echoes mid-sweep), radar-dark.png (same board, sergeant dead: dots only, scope dark), radar-mask-full.png (full canvas: ring clipped to the minimap)

### Main-map motion (2026-08-19 ninth run, ISC-724..761)

- ISC-724..732: Bash vitest — 12 new motion.spec unit tests green inside 70/70; motionLogic.ts 100% line/branch/function coverage; profiles 80 < 170 < 240ms, marine ≤200, kindFromTexture covers all nine piece textures incl. ambush_counter, camPanStep saturates at exactly maxSpeed and parks at exactly 0, shimmerPhase deterministic and neighbor-distinct, recoilVector opposite-facing ≤3px all four facings, shortestRotationDelta never exceeds |π| and lands angle-equivalent for all 16 facing pairs
- ISC-733/751: Playwright — motionLog records tweened marine step ≤200ms while the same evaluate shows engine pos already at destination and the sprite pair still off it (engine never waits); waitForFunction settled at exact centre with scale 1
- ISC-734/735: Playwright — settled rotation angle-equivalent to facing·π/2 (1e-6); highlight.x/y === sprite.x/y and jam marker at (+12,−12) after the eased turn
- ISC-736/737: Playwright — replay motionLog contains tweened stealer steps and blip steps; stealer duration < blip duration asserted from the log
- ISC-738: Playwright — useDoor open + close each log exactly one tweened door entry; settle checks texture door_open/door_closed at scaleX 1, alpha 1
- ISC-739/740: Playwright — every flameSprite isTweening while alight; after flamesCleared count 0, sprites destroyed, zero orphan tweens on the dead sprites
- ISC-741/755: Playwright — two rapid synthetic shots log 2 recoil entries; sprite settles back at exact centre, scale 1
- ISC-742: Playwright — synthetic pieceDied logs one death entry, pieceSprites map entry gone synchronously, sprite absent from the display list after the flourish
- ISC-743/750: Playwright — camVel.y > 0 while ArrowDown held, scroll advanced (ISC-676 arrow regression also green in the full run), camVel parks at exactly 0 and scrollY frozen across a 120ms window
- ISC-744/745: Playwright — drag flick leaves camVel nonzero after mouseup, decays to exactly 0; a fresh grab (pointerdown) zeroes both components instantly
- ISC-746: Playwright — synthetic doorDestroyed: map entry undefined in the same tick, one door-crumble log entry, sprite still active for the art, and no alpha-0 zombie door on the display list 400ms later
- ISC-747: Playwright emulateMedia reducedMotion — step lands at exact centre in the same tick, all log entries tweened:false, camVel stays 0 under a held arrow
- ISC-748: Playwright — post-replay sweep over engine pieces: exact position AND scaleX/scaleY 1 AND alpha 1, zero drift entries
- ISC-749: Bash git diff --name-only — Minimap.ts untouched (only GameScene.ts, README.md, ISA.md + new files); radar.spec green inside the full run
- ISC-752: Bash grep of added lines — the single em dash sits in a code comment (allowed); no new player-facing strings added
- ISC-753: Playwright — home.spec green in the full run with the animation code present
- ISC-754: Playwright — two back-to-back tryMoves settle at the FINAL engine square exactly
- ISC-756: Read — README "### Motion" section present between auspex and Sound
- ISC-757..760: Bash — engine 288/288, client unit 70/70 (motionLogic 100% cov), e2e 97/97 (78 prior + 19 motion), tsc --noEmit clean in both packages (final post-review-round run)
- ISC-761: Bash — scratchpad motion-replay.png (blip visibly OFF tile centre mid-slide, three flame tiles alight, Turn 1: Stealers) + motion-door-slide.png (squad door frame during the open)
- ISC-762: Bash — pushed ce279aa..72907bc; tag v0.4.8; deploy run 32265234725 completed success BEFORE the release was created (codified order); release https://github.com/harryf/sulkweb/releases/tag/v0.4.8 "The hulk moves" published; live home + manual 200; main-C1yrel04.js carries v0.4.8 x1 and the motion string literals motionLog x2, door-crumble, door-open, recoil, ambush_counter x2, prefers-reduced-motion (function identifiers are minified — string literals are the honest probe). Classifier returned ALGORITHM E3 on "OK push and tag" — executed at E1 per the standing release precedent (fifth application).

### Charging stealers + action camera (2026-08-19 tenth run, ISC-763..794)

- ISC-763..770: Bash vitest — 10 charge.spec tests green (incl. review-round strike-back pin + captured-once tail test): sweep faces nearest living marine (W on the 3-vs-5 pick), radius 6 respected, Chebyshev tie resolves to board order, AP unchanged AND the armed lastFreeTurn repeat-rule still bills 1 after the sweep, blips stay S, dead marine skipped for the living one, exactly one facing-only pieceMoved for the turning stealer and zero for the already-facing one with position unchanged in the payload, runStealerActions integration leaves the close survivor prey-facing; Piece.ts net-zero diff (git diff shows only StealerAI + Genestealer)
- ISC-771: Bash — engine suite 296/296 including the UNCHANGED zigzag overwatch-economics fixture (the neutrality proof)
- ISC-772..779: Bash vitest — 13 replayFocus.spec tests green (incl. replayOffsets exact-offset + CHARGE_DIST coupling pins); planner 100% line/branch/function coverage; near focus, far null, spawn silent until near, throttle holds inside retargetDist and re-pans beyond, closeCombat staged from tracked squares, move-then-attack stages from the NEW square, facingOnly annotated, ghosts/unknown types degrade to null
- ISC-780: Playwright — focusLog non-empty after an adjacent-wave replay and the last focus target inside cam.worldView (bounds-clamp-safe contract)
- ISC-781/782/783: Playwright — attack focusLog entry matches lastAttackFx; fx_vignette texture created and no live vignette object after finishReplay; motionLog lunge entries > 0
- ISC-784: Playwright — 10-stealer wave at distance 8..11 on debug_1: survivors within 6 of the still-living marine all face him (engine facing = facingToward mirror) AND every such sprite's normalized rotation equals facing·π/2; non-vacuous (count > 0)
- ISC-785: Playwright — far-corner reinforcement on sh1: zero focusLog entries near the corner, every entry within 6 of a marine
- ISC-786: Playwright — reduced-motion instant replay: zero focus entries, lastAttackFx null, no vignette, every sprite at exact engine position
- ISC-787: vitest + Read — sweep emits only phase-end change-only events (ISC-770); facing-only events pace at FOCUS.facingOnlyDelayMs 40 in endTurn (read); no per-move additions
- ISC-788..791: Bash — full e2e 103/103 (97 prior + 6 focus; arrow/drag regressions inside), client unit 82/82 (13 planner tests), engine 298/298 (10 charge tests), tsc clean both packages (final post-review-round run)
- ISC-792: Read — README Motion section extended with charging stealers + action camera + spotlight
- ISC-793: Bash — scratchpad attack-vignette.png: camera parked on the fight, stealer over the marine square, Losses: 1 + KIA card, edges darkened by the spotlight
- ISC-794: Bash grep — zero em dashes in the README additions; no other player-facing strings added
- ISC-795: Bash — pushed 804ac6d..ab6dcae; tag v0.4.9; deploy run 32282612243 completed success BEFORE the release was created (codified order); release https://github.com/harryf/sulkweb/releases/tag/v0.4.9 "The swarm has a face" published; live home 200; main-BSuq_HdX.js carries v0.4.9 plus the feature strings fx_vignette, lunge, chargeTarget, door-crumble. Classifier returned NATIVE on "push and tag" — context-override to ALGORITHM E1 per the standing release precedent (sixth application).

### Deployment phase run (2026-08-19)

- ISC-796..811: Bash bun test — engine suite 316/316 green (18 new tests in deploy.spec.ts covering front-to-back ordering with left-facing reversal, battle order, begin/deploy/undeploy/turnDeployed/autoDeploy/finishDeployment, squad-mixing refusal, locked-board action deadness, checkVictory + blip-conversion suppression, dice neutrality vs a seeded control, Suicide auto-order flamer-third); rules/deploy.ts 100% line coverage
- ISC-812: bun eval — space_hulk_5 marineDeployment reads 10,10:right … 14,10:right (Harken untouched at left)
- ISC-813: git diff --numstat — 5 insertions, 5 deletions, only the facing values
- ISC-814..831: Bash playwright — new deploy.spec.ts 11/11 green: boot probe (deployMode, phase Deploy, 5 reserve, 5 X markers, DEPLOYMENT phase text, 90s clock; deploy=0 → MarineAction with 0 markers), attract inert + 180s two-squad clock, click-to-place at mission facing with roster-order pick + selection for A/D, roster-card arming placing the flamer at a chosen square, pick-back-up with X restore + free A/D rotation + dead action keys, AUTO DEPLOY battle order bolter/sergeant/flamer with mission NOT started, Done teardown (no markers, no AUTO button, marine clock 150s, board unlocked, AP spendable), clock-expiry auto-start, ESC pause gating clicks, Decoy cross-squad refusal with Abraham fallback facing right, reduced-motion exact placement
- ISC-828: Bash playwright — full e2e 114/114 (103 pre-existing suites green after the mechanical deploy=0 URL update; home.spec mission-launch test updated to assert the new deploy-mode player flow)
- ISC-832: Read — manual/content.ts 'Deployment' section (id deployment) between 'What is this?' and 'How a turn works'
- ISC-833: Read — docs/rules-reference.md '## Deployment' section before Turn structure: placement, squad areas, facing, auto order, clock, rules stance, deploy=0
- ISC-834: Read — keyboardHelp KEY_NOTES leads with the deployment controls note
- ISC-835: Bash grep — zero em dashes in new player-facing strings (manual section, KEY_NOTES, HUD labels)
- ISC-836: engine 316/316; ISC-837: client unit 82/82; ISC-838: e2e 114/114; ISC-839: tsc --noEmit clean in both packages
- ISC-840: Read — README '### Deployment' section above Controls
- Visual: scratchpad deploy-phase.png (5 X markers, RESERVE cards, AUTO DEPLOY + DEPLOYMENT 1:30) and deploy-done.png (squad placed, zero deploy UI, Turn 1: Marines 2:29)
- Review round (code-reviewer 6 findings + pr-test-analyzer 7 gaps, all resolved):
  - ISC-841: bun test — ISC-805 test extended to overwatchOn/unjam/useDoor all false with AP untouched; locked guards added to the three verbs, Deploy guards to the doorToggled + pieceDied listeners
  - ISC-842: Read GameScene — deploy pointerdown branch inert; placement on pointerup gated by p.getDistance() < 6; all 12 deploy e2e clicks still pass (Playwright click = down+up in place)
  - ISC-843: bun test — stealer parked on a deploy square: finishDeployment lands all 6 marines on 6 distinct squares, reserve 0 (nearest-free-passable fallback)
  - ISC-844: scratchpad deploy-phase.png re-shot — AUTO DEPLOY bottom-anchored, objective/status/legend all readable
  - ISC-845: playwright — strengthened ESC test (AUTO emit + Enter while paused stay inert) exposed the replay double-fire live, then passed with the seenKeyEvents dedupe on keydown-ENTER/ESC
  - ISC-846: Read AudioManager — lastPos seeded in the constructor loop and the pieceAdded handler
  - ISC-847: Read styles.css — .marine-card.reserve.selected border override present
  - Analyzer G1 REFUTED with tool evidence: endMarinePhase() lands at turn 2 / MarineAction / ongoing (bun probe), so the ISC-799 refusal WAS the turn guard; test hardened with explicit phase/turn asserts and a pinned seed anyway
  - Analyzer G2/G3 adopted: space_hulk_2 scattered mixed-facing lifecycle + space_hulk_6 interleaved squads with flamerAmmo-survives-reserve, both green
  - Analyzer G5 adopted: undeploy-then-timeout e2e reconciliation test green; G6 skipped (digit hotkeys share selectFromRoster's tested code path); G7 addressed by the ISC-843 fallback
  - Final suites after the round: engine 319/319, client unit 82/82, e2e 115/115, tsc clean both

### Number-key marine selection (2026-08-19 seventh run, ISC-654..671)

- ISC-671: Bash — pushed 03dcba4..b5f8d2d; tag v0.4.6; deploy run 32244944758 success BEFORE release create; release https://github.com/harryf/sulkweb/releases/tag/v0.4.6 published; live home/manual 200; main-BjwaXd1w.js has v0.4.6 + m-hotkey x2; help chunk has the select-marine strings

- ISC-654/655: Playwright hotkeys spec — beta_2: pressing 2/6/0/1 each selects exactly the marine whose card wears that badge (badge↔key agreement asserted through the DOM, not duplicated mapping logic); [1] and [6] are the sergeants
- ISC-656/663/664: vitest — synthetic 3-marine squad one still starts squad two at 6; b6 (sixth member) and c1 (third squad) get no key; map size 8
- ISC-657/658/662: Playwright — [2] killed at engine level + pieceDied emitted: pressing 2 leaves selection on [1]'s marine, pressing 3 still selects the ORIGINAL third marine, the dead card's badge is removed; vitest purity check: identical map before/after mutation
- ISC-659: Read — GameEngine.tryEscape sets marine.alive=false + removePiece, identical to death; selectFromRoster's single !piece.alive guard covers both; markState (badge removal) fires from the marineEscaped event exactly as from pieceDied
- ISC-660: Playwright — flamer armed (flamerAiming true), press 1: aiming false and selection moved; the digit handler calls the SAME selectFromRoster the card click uses (Read)
- ISC-661: Playwright + screenshot scratchpad/hotkey-squad1.png — all ten badges render [1]..[5]/[6]..[0] per squad row in card order
- ISC-662 (visual): screenshot scratchpad/hotkey-squad1-kia.png — [2]'s card KIA-greyed with no badge, neighbours keep theirs
- ISC-665: Playwright — homepage: press 1, Selection.get() null (attract keyboard disable holds)
- ISC-666: Playwright — Escape pause, press 3: selection unchanged
- ISC-667: Read — KEY_NOTES first line documents 1-5/6-0 + [n] badge + fallen-marine inertness; help SPECIAL_KEYS shows the '1-0 select marine' cap; README table row present
- ISC-668: Bash — git diff added lines of keyboardHelp.ts + README grep em dash: 0
- ISC-669: Read — no addKeys change; ten dedicated keydown-DIGIT handlers, each with the shared seenKeyEvents dedupe; digits collide with nothing (letters/Enter/Esc only elsewhere)
- ISC-670: Bash — engine 288/288 (incl. new escape alive=false pin), client unit 30/30 (incl. escaped-badge assertion; tautological purity test deleted per review), full e2e 69/69 twice (one pre-existing audio-fade flake passed in isolation and on re-run), tsc --noEmit clean both packages

### Keyboard remap: directional circle + weapon-key clarity (2026-08-19 sixth run, ISC-636..653)

- ISC-653: Bash — pushed 07baf5c..fc4ac7c; tag v0.4.5; deploy run 32237513444 success BEFORE release create; release https://github.com/harryf/sulkweb/releases/tag/v0.4.5 published; live home/manual 200; main-D-nmvg8j.js has v0.4.5 + keydown-K; keyboardHelp-RYs3Pya6.js has every new label + weapon sub

- ISC-636: Playwright keymap — staged bolter facing north: q/(19,19) ap3, c back-right/(20,20) ap1, AP topped to 4, z back-LEFT lands (19,21) ap2 (positive move, not a refusal — review fix), e/(20,20) ap1, c refused at 1 AP; test green
- ISC-637: Playwright — new test "X moves straight backward at 2 AP": press x from (20,20) facing north → (20,21), ap 4→2, facing kept
- ISC-638: Playwright — press s opens the (18,20)|(19,20) door, press h closes it again (alias proven in the same test)
- ISC-639: Playwright — press m with foe staged ahead, dice pinned 3: closeCombat event fired, all 5 marines alive (no detonation)
- ISC-640: Playwright audio spec — press k: audio.muted true, scene.sound.mute true; reload: still muted, localStorage sulk_muted = '1'
- ISC-641: Playwright audio spec — press m BEFORE k with audio constructed: audio.muted stays false
- ISC-642: vitest keyboardHelp spec — byKey assertions Z 'back left', X 'back', C 'back right', S 'open door', M 'melee', K 'mute'; bound-key set matches addKeys+handlers exactly, no duplicates
- ISC-643: vitest — R/T sub 'assault cannon' requires 'assault_cannon', G sub 'chain fist' requires 'chain_fist', B sub 'heavy flamer' requires 'heavy_flamer' (review adoption), nothing else carries requires; Playwright roster spec asserts the rendered '(assault cannon)'/'(chain fist)' <small> text
- ISC-644: Playwright roster spec — space_hulk_1: exactly 3 .keycap.disabled caps with kbd text R/T/G and title 'No assault cannon in this mission'; screenshot scratchpad/keymap-sh1-dimmed.png shows them greyed
- ISC-645: Playwright roster spec — beta_2: zero .keycap.disabled; screenshot scratchpad/keymap-beta2-live.png shows R/T/G fully lit with sub-labels
- ISC-646: Read README — W/X, Z/C back-left/right, S (or H) door, M close combat, R/T '(assault cannon only)', G '(chain fist only)', K mute rows all present
- ISC-647: grep client src — zero matches for the stale layout (S back / X melee / M mute as display strings); CONTROLS_INTRO now names the movement circle with S at its centre
- ISC-648: grep RosterPanel — credits line reads 'K mutes sound.'
- ISC-649: Bash — git diff added lines for keyboardHelp/RosterPanel/content.ts/README grep '—': only two code comments match, zero player-facing strings
- ISC-650: Read GameScene — cancel list 'wsadqezchxoutrgpbm' contains m, no k; comment names K as the aim-keeping mute
- ISC-651: Bash — engine vitest 288/288 exit 0 (direct run), client vitest 47/47, full Playwright e2e 65/65 (was 62 + 2 dimming + 1 X-back), tsc --noEmit clean in both packages
- ISC-652: Playwright — keymap B test unchanged and green: held B never fires, single press arms, second press detonates

### Enemy target reticle (2026-08-19 fifth run, ISC-625..634)

- ISC-625: Read — fireTarget() calls hoveredDoorFor/nearestEnemyTarget/nearestShootableDoor, the exact three helpers handleFire executes; grep confirms no other target computation exists
- ISC-626: Playwright — staged stealer at (18,20): fireReticleFor = {kind:'enemy', pieceId, x:18, y:20} before the press; screenshot scratchpad/enemy-reticle.png shows the red crosshair centred on the stealer sprite
- ISC-627: Playwright — no enemy staged: fireReticleFor = {kind:'door', x:18, y:20} at the door anchor, F destroys it (AP 4→3), reticle null after
- ISC-628: Playwright — stealer visible + hoverCoord {18,20}: reticle kind 'door' (hovered door outranks the enemy, matching F)
- ISC-629/630: Playwright — door opened, stealers at (18,20)+(19,20): reticle = near id; F kills it; reticle retargets to the far id (never the corpse), 1 stealer left
- ISC-631: Playwright — ap=0 + freeShot=false → reticle null; attract/result/jam guards unchanged in fireTarget (Read); vitest — cannon canShootPiece false on empty drum and on 0 AP, true on full drum (mirrors shoot()'s bail exactly)
- ISC-632: Bash — bunx playwright test door-keyboard: 6/6 passed (10.5s pre-review, re-run green in the full suite post-review)
- ISC-633: Read — keyboardHelp note "The red reticle marks the target F will hit"; rules-reference.md line 105 "the targeted stealer or the door" (em dashes removed per repo displayed-strings rule)
- ISC-634: Bash — engine vitest 288/288 (incl. new canShootPiece mirror test), full client e2e 62/62 (23.0s), tsc --noEmit clean both packages (post-review-fix run)
- ISC-635: Bash — tag v0.4.4 on d13aee3 pushed; gh run 32230347102 (Deploy to GitHub Pages) success BEFORE release create; release https://github.com/harryf/sulkweb/releases/tag/v0.4.4 published; live home/manual 200, bundle main-Bwm9Q5SW.js grep: v0.4.4 ×1, fireReticle ×9

### Door-fire UX: reticle + fallback + audio cause (2026-08-18 fourth run, ISC-620..623)

- ISC-620: Playwright — reticle at door anchor (18,20) pre-press, null after destruction and while an enemy holds priority; screenshot test-results/door-reticle.png shows the red crosshair on the door edge
- ISC-621: Playwright — hoverCoord {17,19} + F → door destroyed, AP 4→3 (inverts the dropped ISC-615 fixture)
- ISC-622: vitest — shootDoor event stream `['shot','doorDestroyed']` with cause 'shot'; cutDoor doorDestroyed cause 'cut'; AudioManager gates sfx_chain_fist on cause==='cut'
- ISC-623: Playwright — staged stealer soaks the pinned 6s, door intact, reticle null before the press
- Suites: engine 287/287, e2e 59/59, typecheck clean

### Door-corner LOS + conversion legality + keyboard door fire (2026-08-18 third run, ISC-604..614)

- ISC-604/605/606: vitest — door_corner.spec: both diagonals blocked closed / clear open; straight-on control unchanged; squareSeenByMarine false (4 tests)
- ISC-607/608/609: vitest — doorway fixture: value-3 blip seats all on r≥5; dead-end fixture seats `['1,2']` with `lost: 1` in blipConverted; open-door fixture seats `['1,1','1,2']`; occupied-seat exclusion (4 tests)
- ISC-610/611: Playwright — door-keyboard.spec: hoverCoord null + F → door (18,20)|(19,20) destroyed, AP 4→3; staged stealer at (18,20) + F → stealer dead, door intact (2 tests)
- ISC-612: Playwright — flamer-targeting ISC-355 test green; real-pointer repro (canvas-rect mapping) destroyed the door with hover (18,20)
- ISC-613: Bash — engine suite 285/285 (was 277 + 8 new), e2e suite 58/58 (was 56 + 2 new), typecheck clean, ZERO re-pins
- ISC-614: Read — keyboardHelp.ts note + rules-reference.md LOS bullet & door-shooting bullet updated
- ISC-615: Playwright — hoverCoord {17,19} + F → door intact, AP 4 unchanged (door-keyboard.spec)
- ISC-616: vitest — mission_meta doorway-corner sweep: all 9 missions, every door endpoint ≤3 open neighbours
- ISC-617: vitest — (0,0)→(4,4) diagonal through door-free corners stays visible (door_corner.spec)
- ISC-618: Bash — v0.4.2 tag deploy run 32175393177 completed/success; `curl` home+manual 200; `grep v0.4.2` in live assets/main-rEGYGo8G.js; release live at https://github.com/harryf/sulkweb/releases/tag/v0.4.2. RELEASE GOTCHA captured: the first tag build FAILED on CI — the pinned beta_2 opposed-run test exceeded vitest's 5s default on the slower runner (passes ~4s locally; corner-LOS adds per-door work to a hot loop) — fixed with explicit 20s/30s test timeouts and the tag MOVED to the fix commit. Moving a tag DETACHES its GitHub release (it became an "untagged-…" draft): deleted the draft and recreated the release against the new tag. Next time: tag only after the tag-commit's CI is green, or push main first and watch its run before tagging.
- ISC-619: DEFERRED — both browser channels down (Interceptor no-handshake 3rd occurrence; claude-in-chrome classifier-denied); same-commit local e2e (59/59, real Chromium, space_hulk_1 boot) stands in until Interceptor is repaired

### Hive pin / blood / zigzag / entries (2026-08-18 second run, ISC-592..601)

- ISC-592: vitest — pinner idle 3 (frustrated set ✓) yet role stays 'stage' while growth holds the launch off
- ISC-593: vitest — hunger fixture unchanged: blocked blip converts on the launch turn despite pin exemption
- ISC-594: vitest — stealer holds at dist 7 with the squad whole; after 2 deaths creeps the dark lane to dist ≤4, unseen
- ISC-595: vitest — weighted step from (1,5) is the alcove (0,4); executor advance draws exactly one burst (RollQueue [2,3] fully consumed, no throw)
- ISC-596: Read — watcherFirst in StealerAI CC selection; full suite green with it live
- ISC-597: vitest — turn-2 spawn lands at the entry beside the objective, not the near one
- ISC-598: vitest — turn-4 (feint) spawn lands at the entry nearest the marines
- ISC-599: vitest — legacy rotation/round-robin/occupied-skip fixtures untouched and green
- ISC-600: Bash — sweeps: debug_1 40W/0L unchanged; sh1 0W/60L, sh2 0W/40L, all 0 ongoing
- ISC-601: Bash — beta_2 scans 1-120 and 121-400: zero wins, best counter 4 (never ticked); fixture converted to pinned opposed LOSS (seed 1, decided < 45 turns); autopilot self-cork reproduced (lead sergeant stalls at (12,18), Data Room empty, perimeter bolter in the corridor)
- ISC-602: vitest — real-map lone-sergeant capability fixture: moveForward×2 onto (12,22), five end-phases, counter 0, result win
- ISC-603: Read + Bash — cadence `(turnNumber + stealerCasualties) % 3`; full suite 277/277, e2e 56/56 after re-pins (quota seed 7→1, scan seeds 1-6 all win)

### Hive objective awareness + hunger (2026-08-18, ISC-582..591)

- ISC-582: Read — GameEngine builds hiveObjectives from mission geography; ctx carries them each stealer phase
- ISC-583: vitest — with objectives 1 square from the marine, the staged stealer charges on call 1 (no massing)
- ISC-584/585: Read + suite — floors verified in code (max(2,·), max(1,·), 6-turn cap); 272/272 with the new gates live
- ISC-586: vitest — stealer crosses the map and parks inside the destination ring, unseen, 10/10 dice untouched
- ISC-587/588: vitest — exposure-door blip idles 3 plans then converts with marines 7 away; 2 stealers emerge
- ISC-589: vitest — startIndex 0/1/2 place at entries[0]/[1]/[2]; watched entry skipped in favour of the dark one
- ISC-590: Bash — idle probe, 40 games × 15 turns: worst consecutive idle 3, zero pieces at 5+
- ISC-591: Bash — engine 272/272, e2e 56/56, build clean; beta_2 scan 1-80 → single win seed 52, re-pinned with comment

### Hive AI run (2026-08-17, ISC-567..581)

- ISC-567: vitest — kill set holds (1,5)/(1,9), empties on jam while seen persists (hive.spec threat map)
- ISC-568: vitest — plain first step c=2 (fire lane), weighted first step c=0 (dark lane), same goal
- ISC-569: vitest — staged stealer holds (1,6) across three activations under a live overwatch lane
- ISC-570: vitest — 4th activation launches; stealer flanks to (1,0) via the dark lane; RollQueue remaining 40/40 (zero reaction dice)
- ISC-571: vitest — two-corridor fixture ends sides ['east','west'], both hidden, 10/10 dice untouched
- ISC-572: vitest — both hunters close on the isolated marine to adjacency, away from the nearer pair
- ISC-573: vitest — blocker parks (2,9) with 5 AP after exactly one [1,2] burst; kill set drops (2,11)/(2,12), keeps (2,9)
- ISC-574: vitest — second activation: blocker still (2,9), followers advance only through dark squares, dice 0 remaining (none drawn)
- ISC-575: vitest — door shut from cover at (0,3); (1,4) leaves the kill zone; stealer never moved
- ISC-576: vitest — jammed watcher: stealer charges (1,6)→(1,1) into CC lineup
- ISC-577: vitest — every hive fixture asserts exact RollQueue remaining counts; `rg Math.random ai/` → no matches
- ISC-578: Bash — `pnpm --filter ./packages/engine test` → 30 files, 267/267 pass
- ISC-579: Read — GameEngine.endMarinePhase passes {turnNumber, blipsRemaining}; vitest growth-reset keeps massing while force grows
- ISC-580: Bash — sweep: space_hulk_1 5W/55L/0 ongoing (60), debug_1 40W/0L (40), space_hulk_2 0W/40L/0 ongoing (40); all end ≤ turn 40
- ISC-581: Bash — beta_2 scan seeds 1-80 at final AI: 5 wins, pinned seed 6 (turn 12, counter 0); full e2e 56/56 including debug_1 seed-1 win and space_hulk_1 seed-3 loss pins

### Home-page run (2026-08-17, ISC-472..514)

- ISC-472/473/474/478/480: home.spec "homepage:" test — overlay visible, title SULK, intro text, credits (Toby Woodwark + GPL-3.0 + GW), computed overlay alpha 0<a<1, backdrop mission 'Suicide Mission' (49/49 suite green)
- ISC-475/476: Playwright count `.home-mission` = 8; `[data-mission="debug_1"]` count 0
- ISC-477: home.spec click space_hulk_2 → URL `?mission=space_hulk_2`, 5 marines deployed, overlay gone, abort mounted
- ISC-479: manual-link asserted visible; manual page test navigates back via #back-to-game → overlay visible
- ISC-481/482/483: home.spec "attract mode is inert" — Enter keypress leaves turn 1 / MarineAction; scene.timerEvent undefined; sulk.audio undefined; input.enabled false
- ISC-484: game.spec rewrite asserts overlay absent at `/?mission=debug_1`; roster/game specs all run overlay-free
- ISC-485/486/487/489: home.spec "mission won" — autoplay win → #end-dialog data-result=win, Retry reloads same URL (mission param kept, dialog gone), second win + Choose → homepage; win.spec still asserts the Phaser MISSION COMPLETE text object (passes unchanged)
- ISC-488: home.spec "mission lost" — squad wipe via die()+checkVictory → dialog data-result=loss, heading "Mission failed", both buttons present
- ISC-490/491/492/493: home.spec abort test — visible during mission, one click arms ("Abandon squad?", URL unchanged), second click → home; homepage test asserts #abort-mission absent at `/`
- ISC-494/495/497/498/501/502/503: manual e2e — zero pageerrors, 9 section headings probed, ≥4 blockquote.marine-quote, 9 .mission-map svg, #map-legend visible, back link works, mission facts text asserted
- ISC-496: content.ts numbers grep-matched to rules-reference.md (4 AP marine / 6 stealer+blip, d6 CP, 120s+30/sergeant, overwatch 2 AP range 12, flamer 2 AP + 1 ammo / 6 ammo / kill 2+, bolter 2 dice kill 6 / sustained max +4, cannon 3 dice 5+ / 10 rounds / 4 AP reload / autofire 2 AP 5 rounds 3+, CC 3-vs-1 dice / sergeant +1, blips 1-3)
- ISC-499/500: missionMapSVG.spec — 6 unit tests: square-rect count == squares.length, entry/deploy/objective counts == JSON, door ticks == doorFacing count, per-mission specials (exits/ducting/cat/download), well-formed SVG for all 9 missions, legend coverage (43/43 client units)
- ISC-504: git status shows no new binary assets; maps are SVG strings from mission JSON
- ISC-505: `pnpm build` green; dist/ contains index.html AND manual.html
- ISC-506/508/511: full Playwright suite 51/51 (42 pre-existing incl. seeded playthrough.spec unchanged + 9 new home.spec); hover/win/game specs pin ?mission=debug_1 (mission param does not touch the dice stream — same seeds hold)
- ISC-507: engine 259/259, client 43/43, tsc --noEmit clean both packages
- ISC-509/510: README homepage/abort/dialog/manual paragraph + updated counts (43/49) + structure line; architecture.md client-module lists + URL-routing paragraph updated
- ISC-512: home.spec homepage test captures pageerror — 0 errors
- ISC-513: real-Chrome screenshots (Claude-in-Chrome; Interceptor extension not connected this session): landing overlay, manual TOC/quotes/tables, Suicide Mission SVG map, in-game abort button, armed "ABANDON SQUAD?" state, MISSION FAILED banner + DOM dialog
- ISC-514: committed (hash in Decisions); tree clean

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
- ISC-292: Playwright probe — pre-fix measurement: s2 maxX 200 left 2 triangles unreachable, s3 maxX 280 cut the (28,22) triangle at world-x 1160 (user report CONFIRMED); post-fix bounds carry +HUD_WIDTH and the corner screenshot shows the triangle whole at max pan
- ISC-293: Playwright markers.spec — permanent 9-mission sweep, rotation-aware getBounds vs settled min/max scroll: 0 unreachable everywhere
- ISC-294: Playwright + screenshot — h2 reads "Marine Roster"
- ISC-295: vitest + Playwright + screenshot — rows titled "Squad <sergeant>" (SQUAD HECTARION / SQUAD CLAUDIO seen live), data-squad keeps the original mission key
- ISC-296: Bash — 236 engine + 14 client unit + 30 e2e green, build clean
- ISC-297: Bash — fetchAudio.ts run twice: "32 produced, 1 already present" then "0 produced, 33 already present"
- ISC-298/299: vitest — manifest test: every registered mission has a distinct track with full credit fields (26 client units green)
- ISC-300: Bash ffprobe — all 9 music files codec=opus, durations 114.5s–909.7s (each >60s)
- ISC-301: Bash ffprobe — bolter_fire.wav 0.972s (≤2.5s)
- ISC-302: Bash ffprobe — tracker_ping.wav 0.100s (≤1.5s)
- ISC-303: Bash ls — 22 alien wavs cut (≥8)
- ISC-304: Read + vitest — alienSegments.ts: 22 entries with start/secs/role/guess/note; all 4 combat roles represented; 3 flagged 'unused' for audition
- ISC-305: pre-existing — original PD wavs were ALREADY committed at assets/sounds/ (discovered mid-run); provenance documented in CREDITS.md; refined in Decisions
- ISC-306: Bash — `git ls-files | grep -cE "assets/audio|\.audio-cache"` = 0
- ISC-307/308: Read — CREDITS.md (channel + 9 per-track links + composers + 3 SFX videos + SOUNDS_INFO); README "Sound" section with one-command fetch
- ISC-309: Grep — AudioManager reads engine.state.pieces / engine.phase / mission.name only; no mutation
- ISC-310: Playwright — after click: !locked && music.isPlaying && loop===true
- ISC-311: Playwright — zero pageerrors; zero autoplay/AudioContext console errors
- ISC-312/313: vitest config + Playwright — quiet bed <0.2 settles; StealerAction event swells volume >0.3; MarineAction returns it <0.2 (tween, fadeMs=900≥500)
- ISC-314: vitest — captured endMarinePhase stream carries StealerAction→…→MarineAction; duckTarget maps loud→quiet
- ISC-315..319: vitest — shot/death/combat/jam routing incl. chain-fist and blip-silent cases
- ISC-320: vitest — 20 triggers in one 150ms window → exactly 1 play; keys independent
- ISC-321: Grep — blipConverted → playAlien('stealer_door') handler present (mapping is 1 line; role pool pinned by ISC-304 test)
- ISC-322/323/324: vitest — interval monotonic within [300,2400], detune 500→0, null distance parks tracker
- ISC-325: Grep — gameOver handler: duckTo(0, 2500) + trackerTimer.remove(); over flag blocks reschedule
- ISC-326/332: Playwright — M flips muted + scene.sound.mute; localStorage sulk_muted=1 survives reload; HUD legend line "M mute sound"
- ISC-327: vitest — musicLoud (0.38) ≤ sfxGain/2 (0.4) asserted
- ISC-328: Playwright — audio dir stashed away: hover spec green, zero page errors (after vite assets-404 middleware fix; initially FAILED with 23 "Unable to decode audio data" — SPA fallback served index.html as audio)
- ISC-329: Bash — 236 engine + 26 client unit + 33 e2e green; pnpm -r build clean
- ISC-330: Grep — scripts/ has no python/npm/npx (one doc-comment mention of pnpm only); pipeline is bun+TS with execFile-style arg arrays
- ISC-331: Playwright — 200s for mission ogg, bolter, tracker, alien death, original door wav; trackKey === 'music_space_hulk_2'
- ISC-333: fetchAudio.ts summary — payload 38.5MB (≤80MB)
- ISC-334: Playwright — .audio-credit contains "Music of 40K" with href to the channel
- ISC-335: Bash — fetchAudio silence self-check: all 24 regenerated cuts report −15.9…−33.7 dB RMS (was −inf across the board); guard throws on <−60 dB
- ISC-336: Playwright — space_hulk_1 (name="Suicide Mission"): trackKey === 'music_space_hulk_1', cache hit, music isPlaying with context 'running'
- ISC-337: Chrome MCP live probe in the user's Brave — ctxState "running", musicPlaying true, vol 0.16, all caches loaded (was: suspended context, no music queued, silent wavs)

### Flamer targeting + doors + ducting (2026-08-16)
- ISC-338/339/340/341/343/344/346: Playwright flamer-targeting.spec "two-press" — arm keeps AP 4/ammo 6, crosshair on valid hover, preview length 10 == engine flameFlood, invalid F stays armed at AP 4, 'a' cancels, final fire → isFlaming(20,20), result win, AP 0, ammo 5, cursor default, zero page errors
- ISC-342: vitest door_shooting.spec — canShoot(hidden square)=false yet flameAt(visible mouth) kills the stealer at (0,5) behind rock
- ISC-345: vitest flamer.spec flame-objective win (existing, still green) + the e2e two-press run ends in 'win' by aimed shot — X self-destruct not involved
- ISC-347: HudPanel legend "Flamer: F aims (hover a square), F again fires · other key cancels" (grep)
- ISC-348..353 incl 352.1, 356: vitest door_shooting.spec 13 tests — 6 destroys door (events shot+doorDestroyed, targetId door:1,5,0, AP 3), sustained +1 to a 6, reset on turn, free move-and-shoot, arc/LOS refusals, point-blank with both flanking canShoot=false, open/destroyed refused, cannon 5+ (ammo 9, shotsFired 1), 4s bounce, bystander stealer alive with no pieceDied
- ISC-354: vitest — autofire destroys far-side-anchor door where canShoot(anchor)=false (fails on pre-fix code)
- ISC-355: Playwright — hover door flank square + F → door.destroyed, AP 3, door sprite removed
- ISC-357/358: Playwright — ducting rotations [π/2, π/2, π/2] on space_hulk_6, texture swap to ducting_destroyed keeps rotation; screenshot test-results/ducting-horizontal.png shows one continuous pipe
- ISC-359: vitest flamer.spec — flood stops at closed door edges (both fixtures, still green)
- ISC-360: engine 249/249, client unit 26/26, Playwright 37/37 × 3 consecutive runs, tsc clean both packages, pnpm -r build clean
- Visual: test-results/flame-preview.png — armed flamer, whole section washed orange with brighter target square

### Diagonal movement + key rebind (2026-08-16)
- ISC-361..363: keymap.spec e2e — q (19,19) ap3, z (20,20) ap1, e (21,19) ap0, c refused at 0 AP, facing 0 throughout; diagonal_moves.spec unit mirrors all four with both facings
- ISC-364: unit — moveForwardLeft cancels overwatch, sets freeShot
- ISC-365: unit — MOVE_COST['±1,0'] undefined, stepLeft/stepRight refuse, AP untouched
- ISC-366: unit on real space_hulk_1 — (18,20)→(19,19) refused with door closed, allowed once open, position asserted both ways
- ISC-367: unit — MOVE_COST deep-equals the original movemap
- ISC-368/369: keymap.spec — held B 700ms never detonates; single B (post-expiry) never detonates; second B inside window kills the flamer
- ISC-370: e2e — o toggles overwatch on (2 AP) and off; grep: V absent from addKeys and all handlers
- ISC-371: e2e — h opens the Launch Control door from (17,20)
- ISC-372: e2e — x with a foe directly ahead emits closeCombat, all 5 marines alive
- ISC-373: HudPanel legend + README controls table document Q/E/Z/C, H, O, X, B×2 (grep)
- ISC-374: addKeys('W,A,S,D,Q,E,Z,C,O,F,X,B,H,U,P,T,R,G') — 18 unique keys, keydown-M/L/ENTER/ESC disjoint (grep audit)
- ISC-375: 257 engine / 26 client unit / 40 e2e ×5 consecutive; tsc clean both; pnpm -r build clean
- Seeded re-pins verified by scan: beta_2 seeds {9 win}, quota seeds {7,8,9 win}, every scanned game progresses to turn 8-14 with casualties accruing — no AI stalls
- ISC-376/377: vitest — camera 2000/2000-wide vs 1000px board: w ≤ mini.w−2, stroke extents inside; symmetric height case passes
- ISC-378/379: vitest — real dims (22×27 and 23×33 tiles, 184px minimap, 1080px camera): stroke extents inside both axes; numeric repro shows overflow +41.7/+30.2px before fix, −1px (inset) after
- ISC-380: vitest — original 3 projectCamToMini cases pass unedited; space_hulk_6 repro numbers byte-identical pre/post fix (−22.2px, untouched)
- ISC-381: vitest — 1×1 minimap with 4px stroke yields w,h ≥ 0
- ISC-382: Playwright — both missions × 3 camera positions (hard left, centre, hard right): lastBox.x+w ≤ mini.width, y+h ≤ mini.height, x,y ≥ 0; screenshots (scratchpad minimap-*.png) show the box hugging but not crossing the right edge panned hard right
- ISC-383: 257 engine / 31 client unit / 41 e2e (4 consecutive green after one unrelated-flake blip); tsc exit 0; pnpm -r build Done
- ISC-384/385/387: e2e — hud.texts contains 'Mission Status', 'Turn 1:', 'Kills:', 'Map: ▲'; no 'AP:'/'CP:' strings; apText/cpText undefined
- ISC-386: e2e — `.marine-card[data-piece-id=flamer] .m-ammo` reads 'Ammo 6'; hud.apText undefined
- ISC-388: CLAUDE.md § "Writing style for ALL displayed text" with ban list + pointer to docs/writing-guide.md
- ISC-389: grep — em dashes in HudPanel remain only in comments; phase line and dice line use ':' and '·'
- ISC-390/391: e2e — 4 kb-rows, Q/A/Z row leads, stagger 0<14<30px, 6 aria-hidden unbound spacers, W keycap label 'forward'; summary click toggles open false→true, focus polled off SUMMARY, Enter leaves panel open
- ISC-392: vitest keyboardHelp.spec — 22 bound keys match addKeys + L/M/Enter/Esc, no duplicates, all labeled; QWERTY stagger + movement-rose spot checks
- ISC-393..396: e2e — Credits h3, sulk.sourceforge.net anchor text 'Sulk', 'Toby Woodwark', exactly 1 Music of 40K anchor, 'Space Hulk™, first edition' + 'board game published by Games Workshop', legal details closed then expands with 'no way endorsed by Games Workshop Limited' + 'Genestealers'
- ISC-397: hud.spec rewritten to mission-level (4 tests), hover.spec anchors 'Map: ▲', flamer-ui asserts roster card — all green
- ISC-398: roster.spec 'AP 4/4 · CP ' and 'Ammo 6' card assertions untouched, green
- ISC-399: 257 engine / 35 client unit / 42 e2e ×3 consecutive; tsc 0 errors; pnpm -r build Done; screenshots roster-help.png, credits-legal.png, mission-status.png

### Asset index (2026-08-16)
- ISC-400: `bun gen-asset-index.ts` → "WROTE docs/asset-index.md — 149 files: 66 used, 77 unused, 1 loaded-unused, 5 docs"; reconcile step errors on any unmapped file and ran clean
- ISC-401/402: Read of docs/asset-index.md — every row has Name | Location | Status | usage columns; script exits 1 printing UNMAPPED FILES / MAP ENTRIES WITHOUT FILES on drift
- ISC-403..407: unused section groups verified by Read — themes 27 (ambush_counter tagged), images 42, sounds 4, alien 3, fonts 2; per-directory find counts match (themes 53, sounds 15, fonts 5, images 42, music 9, sfx 2, alien 22, root 1)
- ISC-408: .gitignore line `packages/client/public/assets/audio/` quoted; git ls-files shows fonts/images/sounds/themes tracked
- ISC-409: 66+77+1+5 = 149 = sum of per-directory find counts
- ISC-410: git status after run: modified ISA.md, new docs/asset-index.md only
- ISC-411: grep for dist/ and .DS_Store in the doc → no rows (walker skips .DS_Store; walk root is public/ so dist/ never entered)
- ISC-412: grep -E banned-pattern scan (writing guide list + em dash) exit 1 on docs/asset-index.md

### Rules reference (2026-08-16)
- ISC-425..437: docs/rules-reference.md read end-to-end after writing; every number spot-audited by grep against engine constants (AP_PER_TURN 4, Genestealer AP 6, KILL_REQ 5, AUTO_KILL_REQ 3, AUTOFIRE 2AP/5 ammo, RELOAD 4, DRUM 10, flamer RANGE 12 / SHOT_COST 2 / ammo 6, OVERWATCH_RANGE 12, MAX_SUSTAINED 4, MARINE_PHASE_SECONDS 120, timerBonus 30, ccBonus 1, blip bag thresholds 8/12/21); mission table generated from the 9 JSONs by script
- ISC-428 addendum: flames-block-LOS confirmed at los.ts (intermediate burning squares block; endpoints excluded) — a planned "flames do not block sight" claim was refuted by this probe before it entered the doc
- ISC-429 addendum: overwatch persistence across turns confirmed (resetAP does not clear the flag; only own actions and jams do)
- ISC-437 addendum: stealer-phase acting list is a snapshot ([...board.pieces] at loop start), so conversion-born stealers wait a phase — documented
- ISC-438: git status shows docs/rules-reference.md + README + ISA only; banned-pattern grep exit 1; README doc links all resolve

### 2026-08-17 — code review + coverage + dedup + reorg + GPL (ISC-439..471)
- ISC-439: baseline pre-change — combined unit run PASS(257) FAIL(0), client-alone 35/35, e2e 42/42, engine coverage table captured; JSON name dump persisted and used for the post-change diff
- ISC-440/452: name-level test diff — every GONE name is a dead-code deletion (getSquare/distance/headingTo/isAdjacent/phaseChain×3/mission-old×2), a retitle, or a file move reappearing under the new path; post-change engine 259/259, client 37/37
- ISC-441: e2e 42/42 on the committed tree (post-refactor run AND final run both green)
- ISC-442: engine diff reviewed — deletions, moves, and extraction-only refactors; Object.freeze on the shared tables survived both suites; dice-draw order untouched (no extracted helper contains a dice.roll)
- ISC-443..448: git rm evidence in commit 64bfc71; zero-importer greps quoted in run notes; root lockfile sole survivor (clean-clone frozen-lockfile install passed)
- ISC-449..450: index.ts pruned comment + dead exports; engine `tsc -b` green without custom.d.ts (resolveJsonModule)
- ISC-451: `ls` — engine tests solely under src/__tests__ (29 files); src/tests and package-root tests gone
- ISC-453: client `vitest run --dir src --coverage` produces v8 report (35.13% stmts overall — Phaser-bound files at 0 are e2e-covered, non-Phaser logic 80-100%)
- ISC-454/455: coverage report — cameraBox.ts 100/100/100/100, marineNames.ts 100% lines (pre-existing specs)
- ISC-456: missionLoader.ts 100% lines after loadMissionSync deletion + unknown-name throw test
- ISC-457: engine vitest.config coverage.include src/** — scripts/ absent from the report
- ISC-458: HeavyFlamerMarine 100% lines, 95.23% branches (new refusal tests; residual = defensive !own guard)
- ISC-459/460/468: triage tables in Decisions; every agent finding dispositioned adopt/decline with reason
- ISC-461: client package.json — phaser in dependencies only (grep: one occurrence)
- ISC-462: `pnpm why vitest` — "Found 1 version of vitest: vitest@3.2.3"
- ISC-463: .gitignore:9 test-results/ (pre-existing, verified via git check-ignore); coverage/ dirs added
- ISC-464/465: architecture.md + development-guide.md updated (no phases/, Selection in client, test layout, coverage commands), date stamps 2026-08-17, banned-pattern scan exit 1
- ISC-466: README — test counts current (259/37/42), example script removed, structure line updated, all seven link targets exist
- ISC-467: stale-reference grep across docs/README for GameCycle/phases//counter.ts/example.ts/Section.ts/loadMissionSync/sampleMission — exit 1
- ISC-469: LICENSE fetched from gnu.org/licenses/gpl-3.0.txt (674 lines, sha1 31a3d460bb3c7d98845187c716a30db81c44b615)
- ISC-470/471: README License section with GPL link + GW disclaimer; GPL-3.0-only in all three package.json (grep: 3/3)
- Regression gates: clean-clone `pnpm install --frozen-lockfile` + engine 259/259 + client 37/37 (CLEANCLONE_OK); full `pnpm build` green; final e2e 42/42
- Commits: 64bfc71 (refactor), d22bfdc (JAM-marker fix), 7fb9ac3 (GPL licensing)

### Pages-deploy run (2026-08-17, ISC-515..534)

- ISC-515: Read vite.config.ts — `base: './'` present; dist/index.html emits `src="./assets/main-*.js"`
- ISC-516: Read vite.config.ts define block + version.d.ts declaration; local build with SULK_VERSION=v0.0.0-local stamps both main and manual chunks (grep: 2 files)
- ISC-517/518: home.spec homepage + manual tests assert `#app-version` matches /^(dev|v\d+\.\d+(\.\d+)?(-[\w.]+)?)$/ — 9/9 then 3/3 after regex widening
- ISC-519/523: Read deploy.yml — `on: push: tags: ['v*']` only (workflow_dispatch removed per review); push of e78900d to main triggered no run (gh run list unchanged)
- ISC-520: Read deploy.yml — verify-and-build steps: engine build (tsc -b), client tsc --noEmit, `pnpm -r test`, all before upload; deploy job `needs: verify-and-build`
- ISC-521: Read deploy.yml — `env: SULK_VERSION: ${{ github.ref_name }}` on the build step (env block per review, not raw interpolation)
- ISC-522: Read deploy.yml — upload-pages-artifact path packages/client/dist; deploy-pages@v4 with pages:write + id-token:write; environment github-pages
- ISC-524: `gh api POST repos/harryf/sulkweb/pages` → build_type "workflow", html_url https://harryf.github.io/sulkweb/; plus tag-type deployment policy `v*` added to the github-pages environment
- ISC-525: `gh api repos/harryf/sulkweb` → homepage set, description "Sulk in your browser — … Play: https://harryf.github.io/sulkweb/"
- ISC-526/527: README top links the live URL; "Releases & deployment" section documents tag → gate → deploy with the corrected audio claim
- ISC-528: run 32012182040 conclusion success (verify-and-build + deploy both success; first attempt's deploy rejected by environment protection, fixed via tag policy, job re-run)
- ISC-529/530: curl live: home 200, manual.html 200
- ISC-531: deployed manual chunk contains v0.2.0 (curl+grep: 1); real-Chrome screenshot shows "· v0.2.0" in homepage credits and manual footer JS probe versionShown=true
- ISC-532: real-Chrome (Claude-in-Chrome) console after fresh load of `/` and after starting space_hulk_1: zero errors/exceptions; game fully playable (5 marines, HUD, timer, board render screenshot)
- ISC-533: client tsc clean, engine tsc build clean, client unit 43/43, home.spec 9/9 (then 3/3 targeted rerun after review fixes)
- ISC-534: commits 9d83ca9 + e78900d pushed; tree clean except ISA record (committed at LEARN)

### Audio-ship run (2026-08-17, ISC-535..553)

- ISC-535: `git ls-files packages/client/public/assets/audio | wc -l` → 33 (9 ogg, 22 alien wav, 2 sfx wav); .gitignore keeps only .audio-cache/
- ISC-536: credits.html + src/credits/{main.ts,credits.css}; vite input {main,manual,credits}; built chunk 3.5K (no Phaser — reviewer verified only type-imports touch the engine)
- ISC-537..540: credits.spec — 9 manifest-derived music rows each linking youtube.com/watch?v=<videoId>, 3 SFX rows, Music of 40K terms quote + channel/playlist links; live JS probe: musicRows 9, sfxRows 3, ytLinks 12
- ISC-541/542: credits.spec asserts #credits-link href=credits.html in home overlay and manual footer
- ISC-543/544: back-to-game navigates to /; pageerror capture 0
- ISC-545: CREDITS.md rewritten (ships-with-attribution posture; good-faith statement; takedown offer); stale "gitignored" line inside it fixed per review
- ISC-546/547: README + deploy.yml claims updated; review swept SIX more stale sites (fetchAudio.ts, architecture.md deployment section incl. stale base/CI points, CLAUDE.md invariant, development-guide ×2, asset-index.md, AudioManager comment) — all fixed in 003877c
- ISC-548: tsc clean; client unit 45/45 (2 new audioFiles set-equality guards); credits.spec 2/2; home.spec 9/9 earlier
- ISC-549: v0.3.0 run 32015294184 success; v0.3.1 run success (both jobs)
- ISC-550/551: curl live: credits.html 200, music/space_hulk_1.ogg 200, alien/alien_attack_01.wav 200
- ISC-552: real Chrome on live ?mission=space_hulk_1: AudioManager constructed, 32 audio keys in cache, hud up, zero console errors. Gotcha found: the hidden-tab RAF pause stalls PreloadScene→GameScene transition (environmental, all versions); un-stuck by manually stepping game.loop
- ISC-553: commits 6ce332c (audio + credits page) + 003877c (review fixes); tags v0.3.0, v0.3.1; tree clean except ISA record

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
