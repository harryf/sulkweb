# ISA Archive: Missions (transcription, fidelity, victory conditions)

> Verbatim archive of completed run records moved out of the root [ISA.md](../../ISA.md).
> Read this before changing the matching part of the codebase. ISC IDs are stable and
> unique across the whole ISA; this file is their single home now. Text is preserved
> exactly as written at the time (including pre-ban em dashes).

## Criteria (archived runs)

### M7 — Mission 1 complete experience (scoped alpha)

- [x] ISC-54: Mission 1 ("Suicide Mission") converted to JSON with correct board sections, doors, entry points, deployment zones
- [x] ISC-55: Engine: mission JSON schema supports doors, entry/exit squares, deployment squares, objective type
- [x] ISC-56: Engine: marine squad for Mission 1 (5 storm-bolter terminators incl. sergeant stand-in) deploys at mission start squares
- [x] ISC-57: Engine: Mission 1 objective — flamer-target/destroy objective simplified to "kill all stealers OR reach exit" documented in Decisions and unit-tested
- [x] ISC-58: Engine: stealer reinforcement blips spawn per-turn per mission spec (unit test)
- [x] ISC-59: Client: full Mission 1 playable start-to-finish in browser (manual playthrough evidence)
- [x] ISC-60: Client: ESC pauses — timer stops, input ignored until resumed
- [x] ISC-61: Client: selection, movement, door, shoot, overwatch controls documented on-screen or in README

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

## Verification (archived evidence)

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

