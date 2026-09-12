# Real-time Sulk: plan for the 2.x line

Status: APPROVED 2026-09-12; stage 1 BUILT the same day and shipped as v2.0.0-alpha.1 (ISA run block ISC-1166..1324; the "Stage 1 as built" subsection records what changed from the kickoff and the balance evidence the build produced); stage 2 BUILT the same day and shipped as v2.0.0-alpha.2 (ISA run block ISC-1341..1470; "Stage 2 as built" at the end records its deviations and the tuning numbers; stage 3 starts there). Round one (ISA run block ISC-1095..1133) was reviewed and Harry answered open questions 1 to 14 and added the command pause idea; round two (ISC-1134..1153) folded those answers in, assessed the idea and asked questions 15 to 22, which Harry answered the same day (all agreed). Every open question carries a decision; the Decision column is the record. Stage 2 starts from its own section once the two stage 1 verdicts are in.

## Summary

Sulk Web 1.x is a faithful turn-based port. The 2.x line turns it into a real-time game: stealers act continuously and fast, marines are slow and heavy but shoot more, and every marine has a mind of its own so the player commands a squad instead of pushing one piece at a time.

The change is smaller than it looks and larger than it looks, in different places:

- Smaller: the turn structure lives in four files (GameEngine.ts, StealerAI.ts, hive.ts, GameScene.ts). The rules kernel (line of sight, dice, doors, movement costs, combat, flames, missions, exotic objects) never reads the phase and carries over untouched. Every end-of-turn rule (reinforcements, flame clearing, C.A.T. wander, download counter, CP roll, defend turn limit) keeps its mission-JSON numbers by firing on a fixed "cycle" of ticks instead of a turn.
- Larger: real time makes an idle marine a design hole. A marine the player is not steering must defend himself, or the game is a slaughter. The marine default AI is the load-bearing piece, and it ships in stage 1 before any order system exists.

Stage 1 delivers: a ticking engine with AP regeneration, the stealer hive acting per tick, the marine default AI (hold, face, fight, overwatch, unjam), direct keyboard control of the selected marine exactly as today, fog of war recomputed live, the stealer-phase replay pipeline removed, and debug_1 plus space_hulk_1 playable end to end. No orders yet. It is playable on its own, and it is the slice that tests the one assumption nothing so far has tested: that real time is more fun than the original's timed phase.

Three stages follow: individual orders, squad orders with per-type AI and the sergeant-loss mechanic, then mission orders, the command pause (Harry's idea: freeze the game for a recharging, sergeant-scaled budget of seconds and issue several orders at once; it replaces command points when it lands) and a balance sweep across all nine missions for the 2.0.0 stable release. The command hierarchy the review settled on is two levels (individual, squad) on top of a default behaviour; the mission level is a squad order applied to every squad and waits for a mission that needs it. The turn-based 1.x line stays frozen at /1.1.0/ and is not kept as a mode in the code.

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

| Constant | Value (decided, round 1) | Notes |
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

Command points (decided, round 1, amended by the command pause): stages 1 to 3 keep the original roll (1..6) once per cycle into a shared pool, spent with P on the selected marine for +1 AP as today. When the command pause lands (stage 4) it replaces CP outright: the pause budget is command points denominated in seconds, and two currencies for one resource (command capacity) would teach the player nothing and double the HUD. Whether the per-cycle d6 survives as a random top-up of the pause pool is open question 16.

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
- The command pause pool (stage 4) is engine state ticked like everything else; wall-clock seconds spent paused reach the engine only as a logged `pauseSpent` command at the resume tick, so replays reproduce the pool without the engine ever reading a clock.

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

### Command pause (Harry's idea, stage 4; unmetered prototype in stage 3)

The rule as proposed, made precise:

- The player presses Space: the clock stops (no ticks run, no manual control), the board stays fully readable, and the player issues any number of L1 and L2 orders. Space again, or the budget running out, resumes the clock.
- The budget is a pool of seconds that lives in the engine: `pausePool` with a cap and a recharge per tick, both scaled by the living sergeants and captains (proposed: cap 10 s plus 10 s per living sergeant or captain, recharge 1 s per cycle plus 1 s per cycle per sergeant or captain; so a full squad with one sergeant can pause for 20 s and refills in about 100 s of play). A second pause a few seconds after a long one gets only what has recharged.
- Orders issued during the pause are queued and enter the command queue at the resume tick with their normal relay latency. The pause buys thinking time, never reaction time: a squad order given in the pause still arrives 1 tick later with a sergeant and 8 ticks later without one.
- When it lands it replaces command points (see Command points above).

What it fixes: the attention problem the systems pass found. Real time with one keyboard marine makes the player choose between steering one marine and commanding four; every squad move that looks wrong invites micromanagement (Shifting the Burden). A budgeted pause turns command capacity into a resource with a visible meter, which is what command points always were in spirit, and it maps the sergeant's value onto something the player feels directly: with him alive you get to think longer.

The two biggest risks, each with the rule that defuses it (advisor, round 2):

- Pause-scumming: optimal play becomes "pause every tick" and the real-time game dissolves into turn-based with more clicks. Defused by the latency rule above (paused orders never fire on resume) and by the budget itself; the numbers are the balance lever.
- Reflex-save: the pause becomes a panic button that nullifies every ambush and makes sergeant loss painless. Two candidate rules: a lockout (no pause for about 1 s of game time after a new enemy contact or an overwatch trigger: you plan through fog, you do not rewind surprises), or no lockout and let the budget price the panic. Open question 17.

Determinism: the pool is engine state advanced by `tick()`, so its cap and recharge are deterministic and unit-testable; the seconds consumed during a pause are wall-clock (no ticks run), so the client reports them as a command (`pauseSpent {seconds}`) at the resume tick and the command log replays the pool exactly.

Placement: stage 4, after squad orders exist, because batching orders has no value until there are many orders worth batching; stage 3 ships the same pause unmetered (a free Space pause with orders allowed) so the feel is known before it is priced. Until then, stages 1 and 2 have only the free pause without orders (a menu, in effect).

Accessibility: a run-level setting (`?pause=free`, chosen before the mission, not a mid-run button) makes the pause unmetered with orders allowed, so it never competes with the budget economy inside a run. A pause that cannot issue orders is a screenshot, not accessibility (open question 18 asks whether this setting ships at all).

### Sergeant loss

Chosen rule: **command latency.** Squad orders are relayed through the squad's sergeant. With a living sergeant an order reaches every marine on the next tick. Without one, each marine receives a squad order after a delay (proposed 8 ticks, 2 s) and, in stage 3's refinement, executes it without coordination: a "defend" becomes "hold where you stand and overwatch" instead of the squad repositioning to cover lanes. Individual orders and direct control are never delayed: the player can always grab a marine by hand.

Rejected alternatives:

- Squad orders vanish: turns the game into micromanagement drudgery exactly when the player has fewer marines and more to do. The punishment is boredom, not tension.
- Individual orders vanish too (manual control only): same problem, worse.
- Nothing changes: throws away the sergeant's role, which the original marks with the +30 s clock bonus and +1 close-combat die. Latency is that clock bonus reborn.

The sergeant keeps his close-combat bonus. `timerBonus` is renamed to a relay property or removed.

With the command pause (stage 4) sergeant loss bites on two axes that stack: responsiveness (relay latency) and command throughput (a smaller, slower pause pool). Both are clamped with floors so a squad with every sergeant dead is degraded, not bricked: latency never exceeds 8 ticks and the pool never drops below a 10 s cap with a 1 s per cycle recharge. Open question 19 asks whether both should apply or only the pool once the pause exists.

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

Decided (round 1, Harry's notes on questions 5 and 9): an uncontrolled marine defaults to overwatch and turns to meet threats (rules 5 and 6 above are the implementation of that note, and rule 6 fires for any weapon that can overwatch); the heavy flamer and the assault cannon's autofire are used only on an explicit order or under direct control, with the flamer's last-stand rule as the single exception; the cannon reloads on its own only when it is empty and no stealer is visible (per-type table below).

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
| Esc (nothing selected) | Free pause: the clock stops, the board is readable, no orders or keys (stages 1 and 2: the only pause) |
| Space | Command pause: stage 3 unmetered with orders allowed; stage 4 metered by the pause pool, replaces P |
| P | Spend a command point (stages 1 to 3 only; removed with the command pause) |
| Enter / DONE | Dropped (no turn to end); the DONE button becomes the pause button with the pool meter beside it |

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

Ships: squad selection; defend, advance, clear; per-type AI variations; relay latency and uncoordinated execution without a sergeant; the unmetered command pause (Space freezes the clock, orders allowed, no budget) so its feel is known before it is priced; the "orders only" playtest.
Leaves out: mission orders, cross-squad coordination, the pause budget.
Exit criteria: on space_hulk_1, "defend the start corridor" places the marines so that every entrance lane is covered by at least one overwatcher (unit test on the set cover); "advance to the objective" reaches it with a rear guard facing back at every leapfrog step (fixture); killing the sergeant delays the next squad order by the configured ticks (unit test); a human plays space_hulk_1 using only squad orders and records the verdict.

### Stage 4: mission orders, balance, 2.0.0 (v2.0.0)

Ships: mission orders; the metered command pause (pool, cap and recharge scaled by sergeants and captains, paused orders carry normal latency, the pool meter on the HUD) replacing command points; all nine missions playable under the tick rules (defend's turn limit, download, escort, kill quota, blockade re-verified per cycle); an unpinned-seed balance sweep with the autopilot order issuer, numbers recorded in CLAUDE.md replacing the STALE baselines; manual and rules reference final; stable root moves to 2.0.0.
Exit criteria: every mission's victory and loss paths exercised by a fixture; the pool's cap, recharge and sergeant scaling covered by unit tests and a same-log replay; the balance table in CLAUDE.md dated; release published after the run is green, root manifest reads v2.0.0, /1.1.0/ unchanged.

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
| Pause-scumming: the command pause turns the real-time game back into turn-based with extra clicks | 3, 4 | Paused orders enter the queue with normal latency (thinking time, not reaction time); the budget's cap and recharge are the lever; the stage 3 unmetered prototype shows the pattern before it is priced |
| Reflex-save: the pause becomes a panic button that cancels ambushes and makes sergeant loss painless | 4 | Contact lockout (open question 17) or budget pricing; the pool floors keep it a slope |
| Two command currencies (CP and pause pool) confuse the player and double the HUD | 4 | The pause replaces CP outright when it lands |
| Hive planning per tick too slow on the big maps (Dijkstra per plan, per piece) | 1 | Plan every 8 ticks and on marine death; per-action computeThreat stays as today; measure with the FPS probe (ISC-71) on space_hulk_6 |
| Two rule sets in one codebase (turn-based kept as a mode) | 1 | Not kept; 1.x is frozen at /1.1.0/ and reachable from versions.html |
| Squad set cover picks silly spots on odd map shapes | 3 | Unit tests on hand-picked rooms; the player can always override with L1 orders |

## Open questions

Each with the recommended default. Decisions belong to Harry. Questions 1 to 14 were answered in round one; 15 onward come from the command pause and wait for answers.

| # | Question | Recommended default | Alternative | Decision |
|---|---|---|---|---|
| 1 | Tick interval | 250 ms | 500 ms (the earlier design) | 250 ms |
| 2 | AP regeneration table | marine 1 per 4 ticks, stealer and blip 1 per 2 ticks | tune after the stage 1 playtest | Agreed with recommendation |
| 3 | Cycle length | 40 ticks (10 s) | 30 or 60; it scales every per-turn mission number | Agreed with recommendation |
| 4 | Command points | keep the roll per cycle, P to spend | drop CP entirely | Agreed with recommendation but see "CP Replacement Idea” below |
| 5 | Persistent overwatch cost | none | 1 AP drain per cycle | Agreed with recommendation - uncontrolled marines should default to overwatch and also turn to meet threats - for the AI implementation |
| 6 | Sergeant loss | relay latency 8 ticks plus uncoordinated execution (stage 3) | latency only; or squad orders vanish | Agreed with recommendation but also see "CP Replacement Idea” below |
| 7 | Turn-based 1.x | frozen at /1.1.0/, no mode in code | keep a `?rules=turn` mode (doubles the test surface, not recommended) | Agreed with recommendation - frozen at /1.1.0/ - no mode in code |
| 8 | Order input | right-click and Shift right-click | a click-mode key (V for move, then click) | Agreed with recommendation |
| 9 | Flamer autonomy | last-stand rule only | never fires without an order; or fires when two or more stealer-side pieces stand in the target section | Agreed with recommendation - otherwise requires an explicit order or human control to use the flamer. Similar applies for the some of the auto-cannon modes |
| 10 | Mission orders | stage 4 | drop; squad orders per squad suffice | Agreed with recommendation - stage 4 |
| 11 | Stage 1 missions | debug_1 and space_hulk_1 | all nine from the start (bigger blast radius) | Agreed with recommendation - debug_1 and space_hulk_1 |
| 12 | Version line | 2.0.0-alpha.N tags, root moves at 2.0.0 | root moves at each alpha | Agreed with recommendation |
| 13 | Identity: is 2.x still Sulk, or a new game beside it? | same repo and name, 1.x frozen as the faithful port | a new name for the real-time game once stage 1 has a verdict | Agreed with recommendation |
| 14 | Direct control lease | a few ticks after the last key press during which no order moves the marine | none (orders may move him at once) | Agreed with recommendation |
| 15 | Command pause: replace CP or coexist | replace CP outright when the pause lands (stage 4); CP stays until then | keep both (two currencies) | Agreed with recommendation |
| 16 | Pause pool numbers and randomness | cap 10 s plus 10 s per living sergeant or captain; recharge 1 s per cycle plus 1 s per cycle per sergeant or captain; no random element | keep the original d6: each cycle rolls 1..6 s into the pool (random top-up, hidden information kept) | Agreed with recommendation |
| 17 | Reflex-save rule | no lockout in the first metered build; the budget prices the panic | lockout: no pause for about 1 s of game time after a new contact or an overwatch trigger | Agreed with recommendation |
| 18 | Accessibility free pause with orders | ship `?pause=free` as a run-level setting chosen before the mission | do not ship it; the unmetered pause exists only in the stage 3 prototype | Agreed with recommendation |
| 19 | Sergeant loss once the pause exists | both axes stack with floors: relay latency and a smaller, slower pool | pool scaling only; latency retired at stage 4 | Agreed with recommendation (Harry said "all agreement" in chat 2026-09-12; the cell was blank) |
| 20 | Pause placement | unmetered prototype in stage 3, metered and replacing CP in stage 4 | metered from stage 3 | Agreed with recommendation |
| 21 | Captains | the pool and relay rules read "sergeant or captain" from day one, but no captain piece class exists; add the captain (grenades, per docs/status.md) as its own item after 2.0.0 | fold the captain into stage 4 | Agreed with recommendation |
| 22 | Direct control during the pause | none (as proposed); the paused player only issues orders | allow direct-control keys to queue as L1 orders at the resume tick | Agreed with recommendation |

## CP Replacement Idea

(Harry, round 1. Assessed and made precise in "Command pause" under Command model; consequences traced through Command points, Sergeant loss, Input summary, Determinism, Stages 3 and 4, Risks, and open questions 15 to 22.)

For a later stage, we could introduce a game state where the player effectively pauses the game for a limited time and is able to issue multiple orders all at once. The length of time depends on the number of sergeants / captains available - if they are alive there is more time to issue orders. The time for orders also needs to “charge up” e.g. if it’s possible for pause for 30 seconds to issue a bunch of orders (no manual control in this game state), once the time is depleted, if the player enters this state a few seconds later, there might be only 5 seconds to issue orders - ticks would recharge this “pause time”. We need a good time for this mode and it needs to be reviewed.

## Stage 1 kickoff

Read this section first when starting stage 1 in a fresh session. It is the handover; the sections above are the reference.

### Settled constants and decisions

| Item | Value |
|---|---|
| Version | v2.0.0-alpha.1 tag with its own frozen directory; the stable root stays at v1.1.0 until v2.0.0; the ship report names the URL that has the change; watch deploy-latest and the release run to green |
| Tick | 250 ms, client-side; `?tick=<ms>` override; `?tick=0` stops the clock for e2e and `window.sulk.step(n)` advances n ticks |
| Cycle | 40 ticks; every per-turn mission number fires per cycle; per-entity offsets inside the cycle (entry index times 5 ticks; C.A.T., download and CP roll at distinct offsets) |
| AP | caps 4 marine, 6 stealer, 6 blip; regeneration marine 1 per 4 ticks, stealer and blip 1 per 2 ticks; integer accumulators; constants live as unvalidated data in CostTables.ts with a `?tuning=` override; the first sweep also tries marine 1 per 3 |
| Overwatch | persistent; free reaction shots through the existing overwatchReactions; OVERWATCH_COOLDOWN 2 ticks; jam on doubles kept; both under unit test before the stage ships |
| Command points | kept in stage 1 exactly as today (d6 per cycle, P for +1 AP); replaced by the command pause in stage 4 |
| Pause | Esc: free pause, clock stops, no orders, no keys (the only pause in stages 1 and 2) |
| Turn-based 1.x | frozen at /1.1.0/; no mode in code; the endMarinePhase shim below is test-only and dies in stage 2 |
| Scene | LiveScene.ts beside GameScene.ts, selected by `?rules=live`; GameScene and replayFocus.ts deleted only when the e2e suite is green on LiveScene |
| Marine AI | the seven-step default list in "Default behaviour"; flamer never fires on its own except the last-stand rule; cannon autofire only under direct control in stage 1; cannon reloads on its own when empty and no stealer is visible |

### Build order (each step leaves the suites green)

1. Engine clock: `tickCount`, `cycle`, `tick()`, `runTicks(n)`; `PhaseName` becomes `'Deploy' | 'Live'`; the tail of `endMarinePhase` moves into a cycle-boundary function in the same order (spawn, ambush counter, download, victory, flames expire, C.A.T., victory, defend limit, CP roll); `endMarinePhase()` survives as `runTicks(CYCLE)` so the mission and victory specs port by search and replace. AP reset goes; `apChanged` fires on gain.
2. AP accumulators on Piece with the regeneration table in CostTables.ts; `Board.flaming` becomes a map of square to expiry tick; `expireFlames(board, tick)` replaces `clearFlames`.
3. Command queue: `engine.command(marineId, action)` enqueues; drained at tick step 1, one per marine per tick; GameLogger records `(tick, marineId, action)`; nothing in the client calls piece methods directly.
4. Stealer side: `stealerTick` extracted from the loop body of `runStealerActions` (StealerAI.ts lines 198 to 322 today); plan cached on the board, recomputed every 8 ticks or on marine death; threat map cached under a board version counter bumped on move, door change and death; blip voluntary conversion "has not acted" becomes "idle K ticks"; chargeOrientation at the cycle boundary; hive.spec keeps counting zero dice.
5. Overwatch persistence and cooldown in StormBolterMarine (drop the resetAP override, add the cooldown tick, sustained-fire decay by idle ticks); AssaultCannon cooldowns in ticks.
6. `ai/MarineAI.ts`: the default decision list and the per-type minimum; helpers lifted from MarineAutopilot.ts (shootNearest, adjacency, facing); MarineAutopilot keeps only what the fixtures need until stage 2 rewrites it as the order issuer.
7. Engine tests: tick sequences with RollQueue for every ported scenario; MarineAI decision-order spec; overwatch cooldown and jam spec; the same-seed same-log state-hash spec; a lint rule banning `Date` and `performance` under packages/engine/src. Pinned seeds are re-pinned once, after the last behavioural change of the stage.
8. Client LiveScene.ts: fixed-step accumulator in update() (at most 4 ticks per frame, halted by pause and game over); reuse GameScene's sprite refresh, hover, camera, deployment mode and flamer aiming by moving them into shared modules first; no endTurn, no replay scheduling, no `animating`, no fog snapshots, no phase timer; HUD timer becomes the cycle counter; DONE becomes the pause button; Esc pauses; `window.sulk.step(n)`.
9. Fog: dirty flag set by pieceMoved, doorToggled, doorDestroyed, pieceDied, sectionFlamed, flamesCleared; recompute at most once per frame; delete the snapshot fields.
10. E2e: stepping harness; a debug_1 win and a space_hulk_1 loss driven by `sulk.step`; the key-driven tests keep the `seenKeyEvents` dedupe; real-browser boot check.
11. Docs: features.md Controls, architecture.md "one tick" in place of "one full turn", rules-reference.md, the manual's rules text, CLAUDE.md invariants (capture/replay, two-level sight conversion, hive turn rotation all change).
12. Tag v2.0.0-alpha.1, watch the run green, publish the release, verify the frozen directory and that the root still reads v1.1.0.

### Exit gate

The stage's exit criteria are in "Stage 1: the clock" above. The two human questions decide whether stage 2 starts: does square-per-AP movement under direct control feel like moving or stuttering, and is real time more fun than the timed phase. Record both verdicts in the ISA Decisions.

### Session gotchas worth knowing before the first command

- Interceptor's CLI was blocked all day by a stale daemon on port 19222 that needs the browser extension reloaded by hand; the Claude-in-Chrome tab froze Phaser when hidden; headless Playwright scripts run from inside packages/client (copy the .mjs there so `@playwright/test` resolves) were the working verification path.
- `packages/engine/tsconfig.tsbuildinfo` gets dirtied by builds; `git checkout --` it before commits.
- Chained `sleep` commands are blocked; use `until ... ; do sleep 5; done` loops in the background for Pages propagation.
- The advisor (Inference.ts) answers a terse question with `--timeout 400000`; a long question timed out.
- No em dashes anywhere, ever; commit messages carry the Claude co-author and session trailers.
- ISA.md's Criteria section holds sixteen runs; when a stage run closes, archive the oldest kept runs to docs/isa per the archive protocol at the top of Criteria.

### Stage 1 as built (2026-09-12)

What the build changed from the kickoff, each with its reason, so stage 2 starts from the code and not from the plan text above:

- Commands apply at once, between ticks, and are logged against the tick they followed; there is no drain at the next tick. Determinism needs an ordered log, not a delay, and a 0 to 250 ms input lag would have corrupted the movement-feel verdict this stage exists to collect. A command issued from inside a tick (an event handler) is deferred to the next tick's step 2 by a re-entrancy guard.
- Tick order is regeneration, deferred commands, marine default AI, stealer side, expiry sweep and cycle offset events, cycle boundary, due reinforcements, victory, `tick` event. Regeneration moved first (the advisor's finding: marines acting on last tick's AP while stealers act on this tick's was a hidden stealer edge); marines still act before stealers.
- The marine default list shoots before it fights: a storm bolter lands on 11 in 36 per shot, a marine's close combat on roughly 1 in 12 against three dice, so close combat is the fallback when no shot is possible (flamer, dry cannon). An overwatching marine holds even with a stealer adjacent: free reaction fire at one shot per two ticks out-rates aimed fire at one AP a shot.
- One scene, renamed: GameScene became LiveScene in place (git mv) instead of living beside it under `?rules=live`. The engine change left the old scene non-functional either way; the frozen /1.1.0/ directory and git history keep the turn-based client.
- Same-entry spawns retry each tick until the cycle ends, then take any free ranked entry, else are dropped without charging the budget; two blips booked into one entry no longer bunch onto a neighbour on the same tick.
- Extermination requires the reinforcement budget spent: a per-tick check would otherwise read the empty opening board of a trickle mission as a win (the debug_1 regression, now a spec).
- The hive's counters advance at the first plan of each new cycle, before the launch check, so every plan inside cycle N sees the value a 1.x plan saw on turn N (a first attempt incremented on the first plan of the cycle and launched a cycle early; stealer_tick.spec pins it).
- Blip voluntary conversion is "spent nothing since the pool was last full, or idle `blipIdleTicks`": the original "taken no action this turn" reads as a full pool in real time, and the behaviour fixtures pass unchanged.
- `runStealerActions` stays as a test-only whole-activation driver sharing the loop body with `stealerTick`; hive.spec keeps its zero-dice counts through it. It dies with the `endMarinePhase` shim in stage 2.
- The autopilot issues commands (so its marines hold a lease) and covers instead of walking when enemies are within 10 squares: a marine who spends each AP the moment it arrives walks blind. It also holds position for the flamer's 2 AP when the objective is in reach.
- Music ducks on contact (a threat within 8 squares of a marine) instead of on the phase; the HUD's one button is START during deployment and PAUSE afterwards; a hidden tab pauses.

Balance evidence from the build (the first sweep the plan asked for, autopilot-driven, not a human verdict): under marine 1 AP per 4 ticks the scripted autopilot wins debug_1 on 1 seed in 30 (seed 30, the pinned fixture) and loses space_hulk_1 on every seed inside the first cycle (the flamer leads the column into the first contact, an autopilot artefact known from 1.x); under marine 1 per 3 ticks debug_1 wins 4 in 30. space_hulk_2 wipes the squad inside 8 cycles on 24 of 30 seeds. The 1:2 regeneration ratio is the advisor's caution made visible; Harry's playtest, not the autopilot, decides it.

## Stage 1 verdict and stage 2 handover (2026-09-12)

Read this section first when starting the next session. Stage 1 is on the site as v2.0.0-alpha.1 (https://harryf.github.io/sulkweb/2.0.0-alpha.1/); the root stays v1.1.0.

### The verdict

Harry, after playing the prerelease: "OK it works and it's playable. It's _really_ hard to play now but we can tune that later." Reading: a go for stage 2; no complaint about movement feel (the stutter question passes by his silence and is flagged as inferred in the ISA); the difficulty is the balance evidence the build produced, not a surprise. The stage 2 session opens with a tuning pass before any order code.

### Tuning pass, in this order

Every knob is data in `packages/engine/src/core/CostTables.ts` (`TUNING`) and can be tried on the live build without a rebuild: `?tuning=key:value,key.sub:value` (for example `/2.0.0-alpha.1/?mission=space_hulk_1&tuning=regen.marine:3,overwatchCooldown:1`). The autopilot seed scan is the cheap second opinion (a bun script that imports the engine source, applies `applyTuning`, runs `autoplay(engine, 60)` over seeds 1 to 30 and counts results; the stage 1 session's scripts lived in the scratchpad and are five lines to rewrite).

1. `regen.marine` 4 to 3: the advisor's caution and the only knob with evidence (debug_1 autopilot wins 4 of 30 at 3 against 1 of 30 at 4). Try first.
2. `overwatchCooldown` 2 to 1: more reaction fire per stealer action; the second brake (jam on doubles) stays.
3. Reinforcement cadence: the per-cycle count is the mission's `blipsPerTurn` (mission JSON, not tuning); the lever without a mission edit is `cycleTicks` 40 to 60, which also slows the CP roll and every offset event. If the trickle is the problem, edit the mission numbers and note the deviation.
4. `leaseTicks` 8: shorter if the default AI feels absent after a key press, longer if it fights the player.
5. Only then the default AI itself (`ai/MarineAI.ts`): the likely candidate is rule 10 (overwatch with 2 AP), which parks every unsteered marine; a marine that follows the steered one is stage 2's order system, not a default.

Record the chosen values in `TUNING` (they are labelled unvalidated there) and re-pin the three seeds once, after the last change: debug_1 win (win.spec, marine_ai.spec, gamelog.spec), space_hulk_1 loss (playthrough.spec), space_hulk_2 survivors (quota_victory.spec).

### Stage 2 build order (individual orders, v2.0.0-alpha.2)

1. `ai/orders.ts`: the L1 slot on `Piece` (`order: MarineOrder | null`), `moveTo` with `then: 'hold' | 'overwatch'`, `openDoor`; completion clears the slot; a direct command clears it (the plan's "the player took the wheel").
2. `ai/MarineAI.ts`: tick step 3 reads the slot before the default list: path one step with `hive.pathStep` (marines as blockers, doors opened on contact), the default list's reactions (unjam, adjacent fight, shoot what is shootable) still win over a step.
3. `GameEngine.command`: new command types `order` and `clearOrder`, logged like every command.
4. `LiveScene`: right-click a square with a marine selected = move there then hold; Shift right-click = then overwatch; right-click a door edge = go and open it; order marker on the target square; the roster card shows HOLD, OW, MOVE.
5. `MarineAutopilot` becomes the scripted order issuer (one order per marine, re-issued on completion); its cover-and-hold branch from stage 1 stays.
6. Delete the two shims: `GameEngine.endMarinePhase()` and `StealerAI.runStealerActions()`. Specs that ride them and need rewriting to ticks: gameflow, quota_victory, beta2_mission, deploy, exotic_victory, kill_reveals, flamer, ai_pathing, debug1_mission, blips_ai, charge, hive (nineteen `runStealerActions` calls: express each as a locked-board engine plus `runTicks`, or keep `stealerTick` with `board.tick` stepped by hand).
7. Specs: orders.spec (slot, completion, replacement, direct-key clear, arrival then overwatch facing), the e2e fixture that plays space_hulk_1 to the objective by orders alone with the default AI defending.
8. Tag v2.0.0-alpha.2 the same way (prerelease tag, frozen dir, root untouched; deploy.yml already accepts `-alpha.N`).

### Session gotchas (this run)

- Interceptor's CLI was blocked again by a stale daemon on port 19222 (`interceptor status` says not running, `lsof -iTCP:19222` shows the old process); the extension needs a manual reload. The Claude-in-Chrome tab reports `document.hidden` unless Chrome is the foreground window, and Phaser then never finishes `create()`. The working real-browser check is headless Playwright from packages/client: `node boot-check.mjs` (committed) screenshots the live scene, reads the tick count and pauses with Esc.
- Vite HMR reloads the page mid-e2e when a source file is edited while the suite runs; two spurious failures came from that. Do not edit client src while Playwright runs.
- `packages/engine/tsconfig.tsbuildinfo` gets dirtied by `pnpm build`; `git checkout --` it before committing.
- Chained `sleep` is blocked; `until ...; do sleep 10; done` loops in a background command work for run watching and Pages propagation.
- The advisor answers a terse question with `--timeout 400000`; a long one, or one that invites tool use, comes back empty.
- The hive's behaviour fixtures (hive.spec) drive `runStealerActions`; they are the one place the old whole-activation driver is still load-bearing. Port them before deleting it.

## Stage 2 as built (2026-09-12)

Shipped as v2.0.0-alpha.2 (prerelease, its own frozen directory; the root stays v1.1.0). Read this before stage 3.

### Tuning pass, what the scan said

The instrument was the autopilot seed scan (three missions, seeds 1 to 30, autoplay 60 cycles), first with the stage 1 autopilot, then with the stage 2 order issuer. Stage 1 autopilot: regen.marine 3 took space_hulk_2 from 0 to 3 wins in 30 and debug_1 from 1 to 0; overwatchCooldown 1 moved nothing; cycleTicks 60 cost space_hulk_2 two of its three wins; regen.marine 2 gave debug_1 4 and space_hulk_1 7 in 30. Stage 2 order issuer at the shipped values (regen 3): debug_1 0 in 60, space_hulk_1 2 in 60 (seeds 26, 27), space_hulk_2 2 in 60 (seeds 29, 36); at regen.marine 2 debug_1 is won on all 30 seeds without a shot fired (the lone marine simply outruns the blips to the exit in 55 ticks) while the squad missions stay at 1 in 30. Chosen: regen.marine 3 (the handover's first knob, the only one with a positive signal on a squad mission); overwatchCooldown 2, cycleTicks 40 and leaseTicks 8 unchanged (the lease is invisible to the scan; it moves on feel). debug_1 is a walking race at every setting tried: unwinnable at 3, trivial at 2, so it left the win fixtures (below). The knob for Harry's next playtest is `?tuning=regen.marine:2` on debug_1 and space_hulk_1.

### What the build changed from the handover

- Orders live in `Piece.order` and are executed inside `marineTick` between the reactions and the parking rules (not as a separate tick step): the reactions (unjam, shoot, adjacent fight and turn, flamer last stand) keep first claim on the marine's AP, and rules 7 to 11 sleep while an order is live. The advisor's point that a marine ordered across a corridor must not stroll past a stealer became one transit reaction: turn toward a seen stealer when the turn would bring it into the fire lane (never otherwise, so he does not dither).
- The order command does not stamp the direct-control lease and resets it (the lease silences the AI that executes the order; stamping it would delay every order by two seconds); `clearOrder` stamps nothing either. Every other command, accepted or refused, clears the slot. Both key off receipt, which the log records, so replays agree.
- Steps prefer straight lines: the hive's `pathStep` returns the first shortest path its BFS finds, which weaves through diagonals across a room; `chooseStep` picks, among neighbours on some shortest path, the square straight ahead, then the other orthogonals, then diagonals.
- A door a marine opened is left alone by the default's door-close rule for one cycle (`Door.lastOpenedByMarine`): the SystemsThinking pass found the open-close pump an openDoor order would otherwise start when a stealer is seen beyond it.
- A moveTo whose target is held by another marine completes when the walker stands next to it (so "follow him" orders resolve); an unreachable target leaves him holding with his AP banked (no overwatch spend).
- The autopilot issues moveTo orders (bolters then overwatch, the flamer then hold), the flame command, and clearOrder as its cover branch when enemies are within 10 squares (an ordered marine would leave overwatch and walk into the claws). On missions whose job is to leave (reach-exit, escape-count) there is no cover branch: a lone marine who stops to cover dies. One direct command survived: the flamer opens his firing door with the door command from one square short of it, because the door square already belongs to the room's section and a flamer standing on it can never flame that room (the order would have walked him in).
- The shims are gone. `rt.fixtures.ts` gained `runCycle(engine)` (one cycle of real ticks) and `stealerActivation(board, ctx)` (hivePlanTicks calls of the live `stealerTick` with the board tick stepped, then the charge sweep: one fresh plan per activation, every pool drained). Two fixture expectations changed for the per-tick driver (ai_pathing's door refusal, blips_ai's single-tick decision), each with a comment; hive.spec's zero-dice counts held. Porting exposed a live bug: the sacrifice blocker kept walking up the fire lane once parked, eating a burst per tick until the next plan; it now holds where it parked.
- The pinned fixtures moved: the win fixture is space_hulk_1 seed 26 by orders alone (win.spec, marine_ai.spec, gamelog.spec), space_hulk_2's survivor seed is 29, and playthrough.spec keeps space_hulk_1 seed 3 as the loss path. debug_1 is no longer a win fixture (see the tuning numbers).

### Stage 3 notes

Squad orders (defend, advance, clear) and the chain of command build on the L1 slot: a squad order is a planner that writes L1 orders into its marines' slots and re-plans on the triggers the plan names. Nothing in stage 2 reserved a squad slot; add it beside `Piece.order` rather than inside it. The right-click input path (`LiveScene.handleOrderClick`) branches on what is selected; Tab-to-select-squad is the stage 3 entry point. The order marker is a Graphics object per marine named 'order-marker' with `pieceId`, `kind` and `then` data; squad markers can reuse the shape with a squad colour.

Verification debt carried into stage 3: the real-Chrome check through Interceptor was deferred again (the daemon-on-19222 pattern); headless real Chromium (boot-check.mjs, boot-check-orders.mjs) stood in, with screenshots read. Treat a live Interceptor pass as a beta blocker: no v2.0.0-beta.1 without it. The gameplay log gained two command types (order, clearOrder) and dropped nothing, so 1.x logs still parse.

## Playtest notes on alpha.2 (2026-09-13)

Harry, after playing v2.0.0-alpha.2: "one specific detail to improve - the individual AI - marines should automatically turn to face the nearest threat if inactive including blips - I had cases where a marine would face a wall in overwatch - if there isn't an obvious threat a marine should turn to face the direction that gives them the greatest line of sight".

Reading: the default list's rule 7 only turned toward a threat inside the marine's own 180 degree vision arc, rule 2 held an overwatching marine no matter what stood behind him, and rule 10 put a marine on overwatch in whatever direction he happened to face, so a marine who arrived facing rock parked there. Fix (shipped on /latest/ first, carried by alpha.3): an idle marine faces the nearest stealer-side piece he has a clear sight line to in any direction, blips included; an overwatching marine turns when that threat is outside his fire arc and the turn would put it in his line of fire (he re-arms next tick); with no threat in sight he turns to the facing whose 90 degree fire cone covers the most squares (not the 180 degree vision count, which ranks a wall-facing in a corridor as high as the corridor because the flank line counts as seen; a closed door straight ahead is peeked open and counts), before going on overwatch and on arrival of a move order without an ordered facing; a threat already in his fire arc vetoes every facing turn, so two threats on two sides never spin him unarmed. A facing the player chose is not second-guessed while the lease runs. Shipped on /latest/ as 9398c7c (engine 440 tests, e2e 119, seeds unchanged); ISA run ISC-1473..1497.

### Next session

Start here. Two things to get from Harry before stage 3 code: (1) does /latest/ (the facing fix) feel right, and does right-click ordering feel like commanding; (2) regen.marine 3 (shipped) or 2 (`?tuning=regen.marine:2`, the walking-race cliff on debug_1). Then stage 3 per "Stage 3 notes" above: the squad slot beside `Piece.order`, defend/advance/clear planners writing L1 orders, Tab squad select in `LiveScene.handleOrderClick`'s branch, squad markers reusing the 'order-marker' shape, v2.0.0-alpha.3 as a prerelease with its own frozen dir (deploy.yml accepts `-alpha.N`; `gh release create --prerelease` by hand, the workflow does not create releases). Housekeeping owed: the ISA archive rotation (root holds runs 2 to 22; move the three planning runs and stage 1 to docs/isa/), and the Interceptor real-Chrome pass (beta blocker).
