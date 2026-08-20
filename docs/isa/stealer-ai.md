# ISA Archive: Stealer hive AI and autopilot

> Verbatim archive of completed run records moved out of the root [ISA.md](../../ISA.md).
> Read this before changing the matching part of the codebase. ISC IDs are stable and
> unique across the whole ISA; this file is their single home now. Text is preserved
> exactly as written at the time (including pre-ban em dashes).

## Criteria (archived runs)

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

## Verification (archived evidence)

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

