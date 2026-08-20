# ISA Archive: Engine core rules (movement, combat, shooting, doors, LOS, blips)

> Verbatim archive of completed run records moved out of the root [ISA.md](../../ISA.md).
> Read this before changing the matching part of the codebase. ISC IDs are stable and
> unique across the whole ISA; this file is their single home now. Text is preserved
> exactly as written at the time (including pre-ban em dashes).

## Criteria (archived runs)

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

## Verification (archived evidence)

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

