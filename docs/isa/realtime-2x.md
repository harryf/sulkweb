# ISA archive: the 2.x real-time line, planning and stage 1

Verbatim run records rotated out of the root ISA on 2026-09-13 (stage 3 run): the three planning runs (sixteenth to eighteenth, ISC-1095..1165) and stage 1, the clock (nineteenth, ISC-1166..1324). Decisions for these runs stay in the root ISA's chronological log until its own rotation. The plan they produced is docs/realtime-plan.md; the stage 2 and 3 records follow it in the root ISA.

## Criteria (archived)

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

## Features (archived)

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

## Verification (archived evidence)

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
