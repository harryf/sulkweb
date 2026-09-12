# Real-time Sulk: plan for the 2.x line

Status: PROPOSAL, 2026-09-12. Nothing in this document is implemented. It exists to be argued with before any code changes. The ISA run block ISC-1095..1133 tracks the review of this plan; implementation gets its own run blocks per stage.

## Summary

Sulk Web 1.x is a faithful turn-based port. The 2.x line turns it into a real-time game: stealers act continuously and fast, marines are slow and heavy but shoot more, and every marine has a mind of its own so the player commands a squad instead of pushing one piece at a time.

The change is smaller than it looks and larger than it looks, in different places:

- Smaller: the turn structure lives in four files (GameEngine.ts, StealerAI.ts, hive.ts, GameScene.ts). The rules kernel (line of sight, dice, doors, movement costs, combat, flames, missions, exotic objects) never reads the phase and carries over untouched. Every end-of-turn rule (reinforcements, flame clearing, C.A.T. wander, download counter, CP roll, defend turn limit) keeps its mission-JSON numbers by firing on a fixed "cycle" of ticks instead of a turn.
- Larger: real time makes an idle marine a design hole. A marine the player is not steering must defend himself, or the game is a slaughter. The marine default AI is the load-bearing piece, and it ships in stage 1 before any order system exists.

Stage 1 delivers: a ticking engine with AP regeneration, the stealer hive acting per tick, the marine default AI (hold, face, fight, overwatch, unjam), direct keyboard control of the selected marine exactly as today, fog of war recomputed live, the stealer-phase replay pipeline removed, and debug_1 plus space_hulk_1 playable end to end. No orders yet. It is playable on its own, and it is the slice that tests the one assumption nothing so far has tested: that real time is more fun than the original's timed phase.

Three stages follow: individual orders, squad orders with per-type AI and the sergeant-loss mechanic, then mission orders with a balance sweep across all nine missions and the 2.0.0 stable release. The command hierarchy the review settled on is two levels (individual, squad) on top of a default behaviour; the mission level is a squad order applied to every squad and waits for a mission that needs it. The turn-based 1.x line stays frozen at /1.1.0/ and is not kept as a mode in the code.

## Verdict

Reviewed by a four-voice council (board-game veteran, real-time tactics designer, principal engineer, solo-dev product coach), a first-principles pass, a systems-thinking pass, and an independent code impact assessment. Full transcripts are summarised in the ISA Decisions for this run. The verdict in one line: **the design as described is worse than the turn-based game; a trimmed version of it can be better, and only a playable slice can tell.**

What is gained:

- Continuous threat. A stealer closing while a bolter unjams is tension the turn structure can only imply. The original's 120 s marine clock exists to force this feeling; real time produces it directly.
- The marine interrupt gap closes for free. docs/status.md names CP interrupts during the stealer phase as the biggest missing tool for winning space_hulk_1. In real time marines act whenever they have AP; the whole mechanic dissolves.
- The sight-conversion hazard goes. CLAUDE.md documents that blip conversion must run at two levels because the captured stealer phase suppresses event handlers. Without capture, the constructor handlers on pieceMoved, doorToggled, pieceDied and sectionFlamed cover everything once.
- Genre room. The port is faithful and complete; the 2.x line is where it becomes its own game.

What is lost:

- The move-or-overwatch agony. In the turn game every AP is a choice against a known stealer budget. With regeneration, hesitation costs seconds instead of the turn; the council's veteran calls this "no longer Space Hulk". That is an identity decision for Harry, not a design flaw to fix: the 1.x line stays as the faithful port.
- The discrete oracle. Today a stealer phase is a pure function whose event stream can be captured, replayed and asserted. Real time keeps determinism only if the engine stays a fixed-tick state machine with every player action entering through a command queue; the moment a wall clock or a direct piece call leaks in, the test suite that saved this project dies with it.
- The balance baselines, the pinned seeds, the manual's rules text, and roughly a third of the engine specs, all re-earned per stage.
- Spectators. With one marine under the keys the other four are AI. If their default reads as "abandoned" instead of "commanded", the game is worse than the turn game before any order system exists. This is the first thing stage 1 must answer.

What the review changed in the plan:

- The command hierarchy is two levels plus a default, not three: direct control and individual orders are one lever, squad orders are the differentiator, mission orders are deferred until a mission needs cross-squad coordination (unanimous).
- Sergeant loss is command latency, a slope, not a cliff; the "orders vanish" rule is kept behind a flag only for an A/B playtest (three of four voices; the dissent is build cost, which the flag answers).
- Squad AI intent must be visible on screen (order markers plus a one-word reason on the roster card). The systems pass found the design's archetype is Shifting the Burden: every time a squad move looks wrong the player micromanages, which starves the squad layer of use and evidence. Visible intent is the highest-leverage fix; tuning jam and spawn rates is the lowest.
- Stage 1 is built beside the current scene (a LiveScene.ts selected by query parameter), the old scene deleted only when the e2e suite is green on the new one; and 1.x stays frozen at /1.1.0/.
- Every player action, including today's direct-control keys, enters the engine through a command queue drained at the tick, so a seed plus a command log replays a game headlessly.

Why the March 2026 attempt stalled, and what this plan does differently: that attempt wrote a complete design first, then built thirteen milestones in one day against 604 unit tests, and the first human playtest found nothing shooting back (no blips spawning, no AI wired, no click reaching the engine). The design thinking is reused here (tick order, integer accumulators, persistent overwatch, the corridor rush arithmetic). The delivery is the opposite: one playable slice with a human verdict as the gate before the next.

## Real-time rules

### The tick and the cycle

`GameEngine.tick()` is a pure function call that advances the game by one tick. The client owns the clock and calls it on a fixed interval; the engine never reads wall-clock time. Tests call `tick()` directly, as many times as they like, with scripted dice.

| Constant | Proposed default | Notes |
|---|---|---|
| Tick interval | 250 ms | Client-side only; `?tick=<ms>` for playtests, `?tick=0` means manual stepping for e2e |
| Cycle | 40 ticks (10 s) | The turn-equivalent period. Every per-turn mission number (blips per turn, turn limit, download turns) keeps its value and fires once per cycle |

The cycle is the idea that keeps the nine mission files and their fidelity specs untouched: "per turn" becomes "per cycle" everywhere, and only the AP economy and action scheduling become continuous.

### Order of operations inside one tick

1. Command queue drained: every player action, direct-control keys included, is enqueued by the client as `(marineId, action)` and applied here, at most one per tick per marine. The client never calls `piece.tryMove` and friends directly any more; that is what makes a seed plus a command log a complete replay.
2. Marine AI: every living marine without a direct-control action this tick runs his decision list (see Marine AI) and takes at most one action.
3. AP regeneration for every piece (integer accumulators, see table).
4. Stealer side: `stealerTick(board, ctx)`. The hive plan is recomputed every 8 ticks or when a marine dies; each stealer or blip with AP takes at most one action. After every action the existing reaction chain runs unchanged: overwatch reactions, exotic interactions, blip conversion sweep.
5. Timers: flames burn down, sustained-fire bonus decays, order latency counters (stage 3).
6. Cycle boundary (every 40 ticks): reinforcements, CP roll, C.A.T. wander, download counter, defend turn limit, ambush counter deployment, charge orientation sweep.
7. Victory check (the kill-quota instant check already exists; blockade and defend stay cycle-boundary checks).
8. `tick` event emitted with `{ tick, cycle }`.

Marines act before regeneration so a marine waiting on one AP acts the tick after it arrives, never the same tick; stealers act after regeneration. This gives marines the first move in a tie, which is the deliberate marine edge.

### AP economy

| Piece | Cap | Regeneration | Time to full from empty |
|---|---|---|---|
| Marine (all types) | 4 | 1 AP per 4 ticks (1 s) | 4 s |
| Genestealer | 6 | 1 AP per 2 ticks (0.5 s) | 3 s |
| Blip | 6 | 1 AP per 2 ticks | 3 s |

The 1:2 throughput ratio matches the original 4:6 per turn scaled by "marines are slow and clunky". All action costs (move 1, backward 2, turn 1, about 2, overwatch 2, reload 4, cut door 1, and the rest of CostTables and the piece classes) carry over unchanged. Stealer free 90° turns and the consecutive-turn rule carry over. `resetAP()` at turn end goes; `apChanged` fires when an AP is gained.

Numbers in this table are starting values for the balance sweep, not commitments. They live as data in CostTables.ts beside the AP costs (regeneration thresholds, overwatch cooldown, cycle length) and are labelled unvalidated there; a `?tuning=` query string overrides them at load so a playtest can vary them without a rebuild. The advisor's caution stands: the ratio doubles the stealer edge relative to the tabletop 4:6 while every action cost is unchanged, so the first sweep tests marine 1 per 3 ticks as well.

Cycle events are staggered per entity, not fired as one burst: each entry point spawns at its own offset within the cycle (entry index times 5 ticks), and the C.A.T. wander, download tick and CP roll sit at distinct offsets. A single global heartbeat would make every spawn and timer land on the same tick, which reads as a metronome instead of a hulk that is alive.

### What replaces each end-of-turn rule

Every line of `GameEngine.endMarinePhase` maps to one of these.

| Turn-based rule (endMarinePhase) | Real-time replacement |
|---|---|
| Kill-quota marine-action-end victory check | Instant check on pieceDied (exists) plus cycle boundary |
| Phase flip to StealerAction | Dropped; no phases. `phase` stays as `Deploy` or `Live` |
| Reinforcements: blipsPerTurn from totalBlips budget | Same numbers per cycle at the cycle boundary; spawnBlips unchanged |
| Blip conversion sweep after spawn | After every action (exists in the reaction chain) and after spawn |
| runStealerActions (whole phase) | stealerTick, one action per piece per tick |
| Ambush counter deployment at phase end | Cycle boundary |
| Download counter (sergeant on the data room square) | Cycle boundary: same begin/decrement/reset logic |
| Victory check before flames clear | Cycle boundary |
| clearFlames | Flames burn for one cycle from ignition (per-flame ignition tick), then clear with the sight recheck |
| wanderCat | Cycle boundary |
| Defend: turn limit reached | Cycle count reaches turnLimit |
| turnNumber += 1 | cycle += 1; the hive's `turnNumber` rotation reads the cycle |
| resetAP for all pieces | Dropped; continuous regeneration |
| rollCommandPoints | Cycle boundary (open question: keep, regenerate, or drop) |
| Overwatch cleared at turn end (resetAP override) | Dropped; overwatch persists (see below) |

### Marine timer and command points

The 120 s marine clock (plus 30 s per sergeant) exists to stop the marine player thinking forever. Real time removes the need; the clock goes, along with `marinePhaseSeconds`, `timerBonus` as a clock bonus, and the HUD timer. The sergeant's bonus finds a new home in the command model (relay speed).

Command points: keep the original roll (1..6) once per cycle into a shared pool, spend with P on the selected marine for +1 AP as today. The alternative (drop CP) is listed under Open questions; it is the simplest rule and CP has a real job in real time (an emergency burst when the squad is caught mid-move).

### Overwatch

- Entering costs 2 AP as today; it is a persistent state, not a turn flag.
- An overwatching marine fires at any stealer that completes an action in his fire arc with line of fire (the existing `overwatchReactions`), one shot per trigger, no AP cost per shot (the original's reaction fire is free), no sustained-fire bonus, jam on doubles as today.
- Fire-rate gate: at most one reaction shot per marine every `OVERWATCH_COOLDOWN` ticks (default 2, a tunable). The advisor flagged this as the load-bearing balance knob: without a gate, persistent free reaction fire plus regeneration means every squad parks on overwatch and the default AI finds that line at once. Jam stays as the second brake. Stage 1 does not ship without both.
- While on overwatch he regenerates AP but the AI spends none; a direct-control action or an order cancels overwatch first (0 AP).
- Ends on jam, cancel, death, or a stealer arriving directly ahead (one last shot fires first, then close combat).
- The balance sweep decides whether persistent overwatch needs a cost (an AP drain per cycle is the fallback).

### Close combat, shooting, doors, flames, exotic rules

Unchanged. `closeCombat`, `shoot`, `canShoot`/`canSee`, door edges, section flames, C.A.T., ducting, assault cannon autofire and malfunction, chain fist, parry, ambush counters all keep their code and their unit tests. A stealer that reaches a marine's square attacks on its next action tick; a marine adjacent to a stealer straight ahead fights on his next AI tick (or when the player presses M).

### Marine interrupts

The biggest named gap in docs/status.md (marines spending CP during the stealer phase) dissolves: marines act at any time. The original's interrupt is the real-time game's normal state.

### Fog of war

`utils/fog.ts` stays. GameScene recomputes the sight set on a dirty flag set by pieceMoved, doorToggled, doorDestroyed, pieceDied, sectionFlamed, flamesCleared, at most once per frame. The pre-phase snapshots (`fogMarineSnap`, `fogRadarSnap`), the frozen-set invariant, `PieceEvents.replaying` guards and `planReplayFocus`'s hidden predicate all go with the replay pipeline: there is no epoch mismatch when events describe the present.

### Determinism

- The engine reads no clock; the tick count is the clock.
- Fixed order inside a tick (above), pieces iterated in board order as today.
- Dice come only from `board.dice`; the hive still plans with zero dice (hive.spec keeps counting draws).
- A seeded game driven by `tick()` with no player input is reproducible. With player input, the replay unit is `(tick, marineId, action)` from the command queue; GameLogger records it from stage 1, so a seed plus a log replays a game headlessly.
- Guard rails: a vitest runs the same seed and command log twice and compares a state hash per tick; a lint rule bans `Date` and `performance` in packages/engine/src.

### Hive adaptation

`runStealerActions` today drains every piece's AP in one call and recomputes `computeThreat` per activation. It becomes `stealerTick`: the plan (`planHive`) is cached on the board and recomputed every 8 ticks or on a marine death; the threat map is cached under a board version counter bumped by any move, door change, or death, so a quiet tick costs nothing; each stealer-side piece takes at most one action per tick (one iteration of today's loop body) followed by the same reaction chain. `plan.frustrated` and the idle counters count cycles instead of turns; the blip voluntary-conversion rule "has taken no action" (today `ap === apInitial`) becomes "idle for K ticks". The zero-dice invariant is unchanged: planning still draws nothing, and hive.spec keeps counting.

## Command model

Four ways to steer, one rule between them.

| Level | Who | How it is issued | Lifetime |
|---|---|---|---|
| L0 direct control | the selected marine | keys as today (W/X/Q/E/Z/C/A/D/S/F/M/O/U/B/T/R/G/P) | one action; the marine's AI is suspended while he is selected, except reactions (overwatch fire, close-combat defence) |
| L1 individual order | one marine | select him, right-click a square: move there, then hold (default) or overwatch (Shift); right-click a door: go and open it | until arrival or replacement |
| L2 squad order | one squad | select the squad (Tab cycles squads; the roster shows the squad header), right-click a square or room: defend it; Shift right-click: advance to it; right-click a door: clear it | until replaced |
| L3 mission order | all squads | stage 4; a squad order applied to every squad with the squad AI deciding routes | until replaced |

Priority rule: **the most specific live order wins.** Each marine holds exactly one slot per level (L1, L2, L3). The AI reads the lowest non-empty level; when an order completes (the marine arrives, the door is open) its slot clears and control falls back to the next level; when nothing is live, the default behaviour runs. A new order at a level replaces the old one at that level. A direct-control key press clears the marine's L1 slot (the player took the wheel) and does not touch L2 or L3.

There are no priority numbers to tune. "Individual beats squad" is fixed, and a squad order re-issued after an individual order still waits behind it until the individual order completes. If play shows a need for "this squad order overrides everything", that is a single flag on the squad order (stage 3 option), not a priority system.

### Sergeant loss

Chosen rule: **command latency.** Squad orders are relayed through the squad's sergeant. With a living sergeant an order reaches every marine on the next tick. Without one, each marine receives a squad order after a delay (proposed 8 ticks, 2 s) and, in stage 3's refinement, executes it without coordination: a "defend" becomes "hold where you stand and overwatch" instead of the squad repositioning to cover lanes. Individual orders and direct control are never delayed: the player can always grab a marine by hand.

Rejected alternatives:

- Squad orders vanish: turns the game into micromanagement drudgery exactly when the player has fewer marines and more to do. The punishment is boredom, not tension.
- Individual orders vanish too (manual control only): same problem, worse.
- Nothing changes: throws away the sergeant's role, which the original marks with the +30 s clock bonus and +1 close-combat die. Latency is that clock bonus reborn.

The sergeant keeps his close-combat bonus. `timerBonus` is renamed to a relay property or removed.

## Marine AI

### Default behaviour (every marine, every tick he has AP and no direct control)

Decision list, first match wins:

1. Adjacent stealer straight ahead: close combat (`closeCombat`, the M key rule).
2. Adjacent stealer elsewhere: turn toward it (`turnToward` from Direction.ts), then rule 1 next tick.
3. Jammed: unjam (1 AP).
4. A stealer in the fire arc with line of fire (`canShoot`): shoot (bolter, cannon normal fire, chain fist's bolter). The heavy flamer skips this rule (see per-type).
5. A stealer visible but outside the fire arc (`canSee` and not `canShoot`): turn toward the nearest one.
6. Not on overwatch and AP >= 2 and the weapon can overwatch: overwatch on.
7. Hold.

Doors: the default never opens a door; it closes an open door directly ahead when a stealer is seen through it and no friendly marine is beyond it. Everything else with doors happens on orders.

Rules 1 to 5 reuse `MarineAutopilot.ts` pieces (shootNearest, the adjacency and facing helpers) but the autopilot's mission march (advanceToward, missionTarget, assignEntryPosts) is not part of the default: an unordered marine does not wander toward the objective. Once orders exist, `MarineAutopilot.autoplay` becomes a scripted issuer of orders for the deterministic e2e fixtures.

### Per-type variations

| Type | Differs from the default |
|---|---|
| Storm bolter | None. This is the default |
| Sergeant (bolter, sword) | Default, plus he is the relay for squad orders; the squad AI keeps him second in a column, never point |
| Heavy flamer | Never overwatch (cannot); never shoots on his own except one last-stand rule: a stealer within 2 squares, ammo > 0, and the target section contains no marine and no objective the mission needs intact: flame it. Otherwise hold, fight adjacent, and keep the ammo for orders. The squad AI keeps him mid-column and never on point |
| Assault cannon | Default, plus reload (4 AP) when empty and no stealer is visible; autofire only on order or direct control; the squad AI gives him the longest lane |
| Chain fist | Default (bolter rules); cut door only on order |

### Squad AI (stage 3)

The squad is the deployment `squad` tag already carried on every marine. Three orders, each an algorithm sketch naming what it reuses.

**defend(area).** Area is a board section (the flamer's section ids) or a clicked square plus radius 3.

1. Entrances: the section's boundary crossings (door edges and open corridor mouths), found from Board adjacency where a passable neighbour lies outside the section.
2. Lanes: for each entrance, the squares a stealer would cross to reach the area, taken from `reachDistances` (hive.ts) limited to 8 squares.
3. Candidates: every free square in the area, times four facings; each candidate's cover set is the lane squares inside `visibleSquares` (vision.ts) with line of fire.
4. Assignment: greedy set cover. The marine with the longest weapon (assault cannon) picks first, bolters next, the flamer last and only from interior squares with the fewest lanes; each picks the candidate covering the most uncovered lane squares; ties prefer the square nearest the marine.
5. Issue: one L1-equivalent internal order per marine: move to the square, face the direction, overwatch. Re-plan when a marine dies, a door state on an entrance changes, or every cycle.

**advance(to).** Cover and move.

1. Route: `distanceField` from hive.ts from the target; the column follows the gradient, one square wide where the map is.
2. Order of march: bolter, sergeant, flamer, cannon, bolter (the deployment order rule in rules/deploy.ts, reused).
3. Leapfrog: the front pair moves up to 2 squares, the rear marine holds on overwatch facing backward until the column has passed his square, then follows. Only one marine moves per tick; the others hold or overwatch. A visible stealer suspends the advance and hands control to the default behaviour until no stealer is visible for a cycle.
4. Doors on the route: the front marine opens; the second covers on overwatch first.

**clear(door).** Two marines take overwatch positions with line of fire through the door square (candidates from step 3 of defend, lanes = the squares beyond the door); a third opens it; the flamer holds one square back with the door's section as his target if a stealer appears.

**hold.** Clears the squad slot; everyone runs the default.

### Mission orders (stage 4)

A mission order is a squad order sent to every squad, plus one new one: `objective`, where each squad's advance target is the mission's objective set (already computed as `hiveObjectives` for the stealer side: flame points, exits, data room, entries). Nothing else is new at this level; it is deferred because it is only useful once two squads exist on the same board (missions 3 to 6 and beta_2).

### Input summary

Extends docs/features.md Controls. Existing keys keep their meaning.

| Input | Action |
|---|---|
| Right-click square (marine selected) | L1: move there, then hold |
| Shift + right-click square (marine selected) | L1: move there, then overwatch |
| Right-click door edge (marine selected) | L1: go and open it |
| Tab | Select the squad of the selected marine (or the first squad) |
| Right-click square or room (squad selected) | L2: defend |
| Shift + right-click (squad selected) | L2: advance to |
| Right-click door (squad selected) | L2: clear |
| Esc (squad selected) | L2: hold (clears the order) |
| Space | Pause and resume the clock (pause was Esc; Esc becomes the order cancel) |
| Enter / DONE | Dropped (no turn to end); DONE button becomes pause |

Order markers: a small arrow or ring on the target square per order, colour by level; the roster card shows the marine's live order as one word (HOLD, OW, MOVE, DEFEND, ADVANCE, CLEAR).

## Codebase impact

### Engine (packages/engine/src, 30 source files)

| File | Change | Reason |
|---|---|---|
| GameEngine.ts | rewrite the scheduler, keep the rest | endMarinePhase becomes tick() plus a cycle boundary; deployment, victory, CP, escape, download logic stay |
| ai/StealerAI.ts | extend | runStealerActions splits into stealerTick (one action per piece per tick) with the same reaction chain; convertRevealedBlips, spawnBlips, chargeOrientation unchanged |
| ai/hive.ts | extend | plan cadence in ticks, idle counters in cycles, blip voluntary conversion "hasn't acted" becomes "idle for K ticks"; pathing, threat map, roles unchanged |
| ai/MarineAutopilot.ts | rewrite | becomes the scripted order issuer for fixtures; helpers move to the new marine AI |
| ai/MarineAI.ts | new | default decision list and per-type variations |
| ai/orders.ts | new | order types, per-marine slots, relay latency |
| ai/SquadAI.ts | new (stage 3) | defend, advance, clear |
| pieces/Piece.ts | extend | AP accumulator and regeneration; resetAP retired |
| pieces/StormBolterMarine.ts | extend | overwatch persists (resetAP override removed), shot cooldown tick, sustained-fire bonus decays by idle ticks instead of resetAP |
| pieces/HeavyFlamerMarine.ts | untouched | flame rule unchanged |
| pieces/AssaultCannonMarine.ts | extend | cooldowns for autofire and reload measured in ticks |
| pieces/Genestealer.ts | extend | free-turn flag resets by tick, resetAP override removed |
| pieces/Blip.ts | extend | idle tick counter for voluntary conversion |
| pieces/AmbushCounter.ts | untouched | deployAmbushCounter is called from the cycle boundary instead of the phase end; the function stays |
| events/PieceEvents.ts | extend | tick, orderIssued, orderCleared events; capture/replay retained only until the client stops using them, then removed |
| rules/flame.ts | extend | per-flame ignition tick for burn duration |
| rules/combat.ts | untouched | |
| rules/Door.ts | untouched | |
| rules/deploy.ts | untouched | |
| rules/exotic.ts | untouched | wanderCat runs on the cycle boundary, same function |
| rules/Feature.ts | untouched | |
| board/Board.ts | extend | `flaming` becomes a map of square to expiry tick (burn duration survives a cycle boundary); board version counter for the threat cache |
| board/los.ts | untouched | |
| board/vision.ts | untouched | |
| board/Square.ts | untouched | |
| core/CostTables.ts | extend | regeneration table beside the cost tables |
| core/Dice.ts | untouched | |
| core/Direction.ts | untouched | |
| missions/missionTypes.ts | untouched | per-turn numbers read per cycle |
| missions/missionLoader.ts, missions/index.ts | untouched | |
| log/GameLogger.ts | extend | records tick and cycle instead of turn and phase |
| index.ts | extend | exports |

### Client (packages/client/src, 31 source files plus 4 declaration files)

| File | Change | Reason |
|---|---|---|
| scenes/LiveScene.ts | new | the real-time scene: clock driver with a fixed-step accumulator (at most 4 ticks per frame, halted by pause and game over), per-tick event handling, command queue input, order input and markers, live fog. Built beside GameScene and selected by `?rules=live` until the e2e suite is green on it |
| scenes/GameScene.ts | remove (after LiveScene is green) | endTurn, replay scheduling, animating flag, fog snapshots, phase timer are all turn-based; the shared pieces (sprite refresh, hover, camera, deployment mode, flamer aiming) move into LiveScene or small shared modules first |
| utils/replayFocus.ts | remove | replay-only; a live action camera, if wanted later, is a new pure module over live events |
| config.ts, gameConfig.ts | extend | scene registration and the `?rules=` switch |
| global.d.ts, version.d.ts, vite-env.d.ts, webfontloader.d.ts | untouched | |
| utils/fog.ts | untouched | live recompute uses the same functions |
| utils/radarLogic.ts | untouched | |
| utils/motionLogic.ts | extend | ping cadence per tick instead of per phase |
| utils/cameraBox.ts | untouched | |
| ui/HudPanel.ts | extend | timer becomes cycle and pause display; DONE becomes pause |
| ui/RosterPanel.ts | extend | order word per card, squad headers selectable |
| ui/Minimap.ts | extend | frozen flag removed |
| ui/Selection.ts | extend | squad selection |
| ui/keyboardHelp.ts, manual/content.ts | extend | new keys, new rules text |
| ui/endDialog.ts, ui/HomeOverlay.ts, ui/abortButton.ts, ui/HighlightSprite.ts, ui/marineNames.ts, ui/missionMeta.ts | untouched | |
| audio/AudioManager.ts, audio/audioLogic.ts, audio/audioManifest.ts, audio/alienSegments.ts | untouched or extend audioLogic for continuous tracker | |
| scenes/PreloadScene.ts, main.ts, credits/main.ts, manual/main.ts, manual/missionMapSVG.ts, manual/versionsLink.ts | untouched | |
| tests/phaser-mock.ts | untouched | |

### Tests

Engine (34 specs): the independent assessment counted the specs that call `endMarinePhase` or assert phase, turn or AP reset: gameflow, quota_victory, beta2_mission, deploy (phase-name asserts), exotic_victory, kill_reveals, gamelog, hive, charge, conversion_on_sight, flamer, ai_pathing, debug1_mission, blips_ai; 22 of 36 spec files are untouched (board, los, vision, dice, doors, door_corner, door_shooting, diagonal_moves, movement, relativeCost, shooting, combat, beta2_weapons, the three mission fidelity specs, mission_meta, pieceAdded, index). Replacement: the same scenarios expressed as `tick()` sequences with scripted `RollQueue` dice; for stage 1 only, `endMarinePhase()` survives as a test shim equal to `runTicks(CYCLE)` so the victory and mission specs port by search and replace, and the shim is deleted in stage 2; RollQueue scripts re-baseline once because dice consumption order changes (CP roll at the cycle boundary, no AP reset); hive.spec keeps its zero-dice count per plan; new specs for the MarineAI decision order, order slots and fallback, relay latency, the squad set cover, and the same-seed same-log state-hash comparison.

Client units (12 specs): replayFocus.spec goes; fog.spec loses the snapshot cases; audioLogic and motionLogic adjust cadence.

E2e (26 specs): every pinned-seed playthrough (win.spec, playthrough.spec, flamer-ui.spec, fog.spec, gamelog) is re-expressed against a stepping harness: `?tick=0` stops the client clock and `window.sulk.step(n)` advances n ticks, so a test drives the game deterministically and asserts on screen. Pinned seeds are re-pinned once per stage after the last behavioural change of that stage, never mid-stage (the beta_2 lesson in CLAUDE.md). Key-driven tests keep the `seenKeyEvents` dedupe rule.

### Documentation and shipping

docs/features.md, docs/rules-reference.md, docs/architecture.md (the "sequence of one full turn" section is rewritten as "one tick"), the in-game manual, CLAUDE.md invariants (capture/replay, sight-conversion two levels, hive turn rotation) all change with stage 1. The stable root moves to 2.x only with the stage 4 release; until then 2.x stages ship as v2.0.0-alpha.N tags with their own frozen directories, and the ship report names the URL, per the shipping policy.

## Stages

Each stage ends in a playable, tagged build. Each stage's exit criteria become the ISCs of its own run.

### Stage 1: the clock (v2.0.0-alpha.1)

Ships: `tick()` and the cycle; AP regeneration; stealerTick with the hive per tick; marine default AI; direct control unchanged; persistent overwatch; flames with burn duration; CP per cycle; live fog; replay pipeline, phase timer, DONE and Enter removed; `?tick=` and `sulk.step(n)`; debug_1 and space_hulk_1 playable; docs updated.
Leaves out: any order; squads; sergeant mechanic (the sergeant is a bolter with +1 CC).
Exit criteria: engine suite green with the kernel specs untouched; hive zero-dice count holds; a seeded no-input game reproduces tick for tick; e2e stepping harness drives a win on debug_1 and a loss on space_hulk_1; overwatch cooldown and jam both in place and covered by a unit test; a human playtest verdict recorded in the ISA on two questions: does square-per-AP movement under direct control feel like moving or like stuttering (the advisor's pass/fail for the whole port; the client tweens each step, and if the answer is "stuttering" the fix is the tick and regeneration constants, tried before any AI work), and is real time more fun than the timed phase? Both are the go/no-go for stage 2.

### Stage 2: individual orders (v2.0.0-alpha.2)

Ships: order slots on every marine; L1 move-to with pathing (reusing hive pathStep with marines as blockers) then hold or overwatch; go-and-open-door; right-click input, order markers, roster order words; MarineAutopilot rewritten as an order issuer; the fixtures re-pinned.
Leaves out: squad orders, latency.
Exit criteria: a marine ordered across the map arrives and goes on overwatch facing the ordered direction; a direct key press cancels the order; the e2e fixture plays space_hulk_1 to the objective by orders alone with the default AI defending.

### Stage 3: squad orders and the chain of command (v2.0.0-alpha.3)

Ships: squad selection; defend, advance, clear; per-type AI variations; relay latency and uncoordinated execution without a sergeant; the "orders only" playtest.
Leaves out: mission orders, cross-squad coordination.
Exit criteria: on space_hulk_1, "defend the start corridor" places the marines so that every entrance lane is covered by at least one overwatcher (unit test on the set cover); "advance to the objective" reaches it with a rear guard facing back at every leapfrog step (fixture); killing the sergeant delays the next squad order by the configured ticks (unit test); a human plays space_hulk_1 using only squad orders and records the verdict.

### Stage 4: mission orders, balance, 2.0.0 (v2.0.0)

Ships: mission orders; all nine missions playable under the tick rules (defend's turn limit, download, escort, kill quota, blockade re-verified per cycle); an unpinned-seed balance sweep with the autopilot order issuer, numbers recorded in CLAUDE.md replacing the STALE baselines; manual and rules reference final; stable root moves to 2.0.0.
Exit criteria: every mission's victory and loss paths exercised by a fixture; the balance table in CLAUDE.md dated; release published after the run is green, root manifest reads v2.0.0, /1.1.0/ unchanged.

## Risks

| Risk | Stage | Mitigation |
|---|---|---|
| Built all at once, never playable between steps (the March 2026 attempt) | all | Stage gates with a tagged playable build and a human verdict; stage 1 has no orders by design |
| Persistent overwatch plus regeneration makes corridors impassable; the game becomes camping | 1 | Fire-rate gate (cooldown ticks) and jam ship in stage 1; balance sweep with the seeded autopilot on every stage; AP drain per cycle held as the fallback |
| Square-per-AP movement under direct control feels like stuttering, not real time | 1 | Client tweens every step; tick and regeneration constants are data with a query override; the stage 1 human verdict asks this question first, before any AI work |
| Default AI too strong (player watches) or too weak (player micromanages, orders unused) | 1, 3 | Default AI holds and never advances; the human playtest verdict is a stage gate; per-type restraint on the flamer |
| Pinned-seed e2e rot: input timing enters the dice stream | 1 | Stepping harness with the client clock stopped; seeds pinned once per stage |
| GameScene surgery: fog, radar gate, camera focus, audio mirror and roster truth all encode the "payload, not engine" replay invariant, and removing replay invalidates their reasoning | 1 | Build LiveScene.ts beside GameScene, switch by query parameter, delete GameScene and replayFocus.ts only when the e2e suite is green on LiveScene |
| Player and squad AI fight over a marine (a squad order yanks the marine under the keys) | 2, 3 | Direct control clears the individual slot and holds a short lease (a few ticks) during which no order moves him |
| The game stops being Space Hulk (the AP economy and the move-or-overwatch choice are the board game) | 1 | An identity decision, not a fix: 1.x stays the faithful port; the stage 1 verdict asks whether 2.x is a game Harry wants |
| Hive planning per tick too slow on the big maps (Dijkstra per plan, per piece) | 1 | Plan every 8 ticks and on marine death; per-action computeThreat stays as today; measure with the FPS probe (ISC-71) on space_hulk_6 |
| Two rule sets in one codebase (turn-based kept as a mode) | 1 | Not kept; 1.x is frozen at /1.1.0/ and reachable from versions.html |
| Squad set cover picks silly spots on odd map shapes | 3 | Unit tests on hand-picked rooms; the player can always override with L1 orders |

## Open questions

Each with the recommended default. Decisions belong to Harry.

| # | Question | Recommended default | Alternative |
|---|---|---|---|
| 1 | Tick interval | 250 ms | 500 ms (the earlier design) |
| 2 | AP regeneration table | marine 1 per 4 ticks, stealer and blip 1 per 2 ticks | tune after the stage 1 playtest |
| 3 | Cycle length | 40 ticks (10 s) | 30 or 60; it scales every per-turn mission number |
| 4 | Command points | keep the roll per cycle, P to spend | drop CP entirely |
| 5 | Persistent overwatch cost | none | 1 AP drain per cycle |
| 6 | Sergeant loss | relay latency 8 ticks plus uncoordinated execution (stage 3) | latency only; or squad orders vanish |
| 7 | Turn-based 1.x | frozen at /1.1.0/, no mode in code | keep a `?rules=turn` mode (doubles the test surface, not recommended) |
| 8 | Order input | right-click and Shift right-click | a click-mode key (V for move, then click) |
| 9 | Flamer autonomy | last-stand rule only | never fires without an order; or fires when two or more stealer-side pieces stand in the target section |
| 10 | Mission orders | stage 4 | drop; squad orders per squad suffice |
| 11 | Stage 1 missions | debug_1 and space_hulk_1 | all nine from the start (bigger blast radius) |
| 12 | Version line | 2.0.0-alpha.N tags, root moves at 2.0.0 | root moves at each alpha |
| 13 | Identity: is 2.x still Sulk, or a new game beside it? | same repo and name, 1.x frozen as the faithful port | a new name for the real-time game once stage 1 has a verdict |
| 14 | Direct control lease | a few ticks after the last key press during which no order moves the marine | none (orders may move him at once) |
