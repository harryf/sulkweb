# sulkweb: working notes for AI/dev sessions

Web port of **Sulk** (Space Hulk clone): pure-TypeScript rules engine + Phaser 3 client.
ALL NINE missions registered (space_hulk 1–6, beta_1, beta_2, debug_1); the complete original campaign, exotic weapons included.

## Read first

| What | Where |
|------|-------|
| **System of record**: goals, recent runs, archive index (900+ criteria) | `ISA.md` |
| Archived run records by code area (read before changing that area) | `docs/isa/` |
| Missions, controls, roster, deployment phase | `docs/features.md` |
| Gameplay log export schema (stealer-AI analysis corpus) | `docs/gamelog-format.md` |
| Roadmap state and known gaps | `docs/status.md` |
| **2.x real-time plan (APPROVED 2026-09-12; stage 1 shipped as v2.0.0-alpha.1 and played: "works, playable, really hard"; stage 2 shipped as v2.0.0-alpha.2 the same day; the alpha.2 playtest's facing fix is on /latest/ (commit 9398c7c) and alpha.3 will carry it; START THE NEXT SESSION at its last two sections, "Stage 2 as built" (tuning numbers, deviations, stage 3 notes) and "Playtest notes on alpha.2" (the facing fix and the next-session line))** | `docs/realtime-plan.md` |
| Original milestone specs (M0–M8) and roadmap | `docs/history/prompts/` |
| Canonical game rules (AP costs, dice, blips, phases) | `docs/history/SULK Manual Combined.pdf`; distilled digest in ISA Decisions |
| Original Pygame engine analysis | `docs/history/Analysis Sulk Pygame*.html` |

Resuming work = extend `ISA.md` (new ISCs, decisions, changelog); don't invent a parallel spec.

## Commands

```bash
pnpm install
pnpm --filter ./packages/client dev      # play at localhost:5173
pnpm --filter ./packages/engine test     # 431 unit tests + coverage (~98% lines)
pnpm --filter ./packages/client test     # HUD/minimap units (vitest, --dir src only)
pnpm --filter ./packages/client e2e      # Playwright no-mock suite (real browser, no mocks)
pnpm build                               # engine tsc -b + client vite build
pnpm --filter ./packages/engine example  # CLI engine tour
```

## Shipping policy (2026-08-20, after the invisible-feature incident)

The stable root (https://harryf.github.io/sulkweb/) only moves on a v* release;
a main push reaches ONLY /latest/. That split once left a shipped feature
invisible on the site the user actually plays. Non-negotiable rules:

- **User-facing gameplay changes get a stable v* release in the same run**, or
  an explicit callout that they are parked on /latest/ with the full URL.
- **"release" / "ship it" from the user means a v* release** (tag, watch green,
  publish), never just the automatic /latest/ deploy.
- **Every ship report names the exact URL that has the change.**
- **Watch deploy-latest to green after any game-code push** (it has no test
  gate and a failed run leaves /latest/ silently stale).
- deploy.yml re-dispatches deploy-latest after every release (heals the shared
  concurrency queue's pending-run replacement); do not remove that step.
- Release recipe: see "Cutting a release" in docs/architecture.md.

## Architecture (the invariants that matter)

- **`packages/engine` is pure TS; zero Phaser/DOM/network imports.** All rules live here
  and every rule has a unit test. The client renders engine state; it never owns it.
- **Events are the only engine→client channel:** `engine/src/events/PieceEvents.ts`
  (pieceMoved, pieceDied, shot, doorToggled, phaseChanged, gameOver, …). To surface new
  engine behavior in the UI, emit an event and subscribe in `GameScene`/`HudPanel`.
- `GameEngine` orchestrates: deployment, CP, turn cycle, reinforcements (finite
  `totalBlips` budget), AI (`ai/StealerAI.ts` executes; `ai/hive.ts` plans),
  victory. `ai/MarineAutopilot.ts` is a legal-actions scripted player used by
  the deterministic e2e tests.
- Mission schema: `engine/src/missions/missionTypes.ts`; Mission 1 JSON has squares,
  doors (`doorFacing`), `entryPoints`, `exitPoints`, `marineDeployment`, `objective`.
- **Mission geometry comes from the ORIGINAL Sulk sources** at
  `~/Code/personal/sulk/archive/sulk-0.29-snapshot-20030623/data/missions/<family>/MISH_*.py`.
  Our JSONs mirror that structure: `engine/src/missions/space_hulk/space_hulk_{1,2}.json`,
  `engine/src/missions/debug/debug_1.json`; registry in `missions/index.ts`. debug_1 and
  space_hulk_1 share a byte-identical 98-square BOARD (verified by diffing the sources);
  they differ only in forces/objective. `mission{1,2}_fidelity.spec.ts` are the
  square-for-square guards; edit maps only with the original source in hand.
- **New missions transcribe mechanically**: `bun scripts/transcribeMission.ts
  <MISH_*.py> <target.json>` patches a single mission's board fields in place,
  preserving hand-written forces/objective fields; `bun scripts/migrateMissions.ts`
  batch-converts ALL remaining originals (space_hulk 3–6, beta 1–2) into drafts
  at `src/missions/drafts/`; both share `scripts/lib/parseMish.ts`, which
  parses MULTI-tag square dicts (`{O:1,M:None}`, quoted COMMENT strings) that
  single-tag regexes silently drop. Drafts carry everything mechanical (board,
  entries, exits, O/DUCTING squares, blips, squad rosters, info/story, default
  deployment) plus a `todo` list of unscripted semantics (victory_check is
  arbitrary Python; CAT/lurking/turn-limit/ambush/assault-cannon are unbuilt).
  Drafts are NEVER registered in `missions/index.ts`; the registry is the
  playability gate. Finishing a mission = implement its todos, move the JSON to
  its family folder, register, add a fidelity spec whose expected data comes
  from an INDEPENDENT reading of the source (missions 1/2 precedent), never
  from the script's own output.
- **space_hulk_2 "Exterminate" victory** (`objective: kill-quota`): marines win at
  `board.stealerCasualties >= killQuota` (counted in `Piece.die()`; stealer +1,
  blip +VALUE, conversion counts NOTHING) OR when every entry square has a marine
  within 6 (`Board.pieceNear`; the original `get_team_is_near` walk: 8-way over
  existing squares, walls block, closed doors don't). Loss on squad wipe. The
  original checks victory at PHASE BOUNDARIES (phases.py:774 marine-action end,
  973 end-phase); our kill-quota missions add a marine-action-end check in
  endMarinePhase plus an outcome-equivalent instant quota check on pieceDied
  (no enemy act between the 30th kill and the boundary); blockade evaluates
  ONLY at boundaries (positions final). Other objectives keep their adapted
  post-spawn timing: a pre-stealer-phase check would read the empty turn-1
  board as "stealers exterminated" (debug1 regression caught this).
  Deployment is one marine per room section (original pre_deploy_rule); the two
  stealer-placed pieces are fixed adversarially (see ISA Decisions).
- **BEGINPLACE is DEAD CODE in the original** (initial camera position; its board.py
  consumers are commented out). Real deployment squares are the `M:`-tagged tuples;
  mission 1: the north corridor (10,0)–(10,4). Original FORCES: 3 storm bolters +
  sergeant (+1 CC, +30s timer) + heavy flamer (deployed at the column head; the
  original deploy phase pops the member list from the END, flamer first).
- **Sections drive the flamer**: each BOARD sublist in the Python source is one board
  SECTION; `scripts/addSections.ts` regenerates per-square `section` ids in the JSONs
  from the source. Flames fill the target's whole section (orthogonal spread, stopped
  by closed door edges), kill on d6 ≥ 2, block movement-in and LOS, and clear at
  end-phase (with a blip-sight recheck). Self-destruct silently wipes + torches the
  flamer's OWN section.
- **space_hulk_1 victory is the ORIGINAL**: `objective: flame-objective` +
  `objectivePoint (20,20)`; win the instant the objective square burns; LOSS the
  instant no living flamer has ammo. No exit win, no extermination win, reinforcements
  UNCAPPED. debug_1 keeps the adapted reach-exit objective (documented deviation).
- **Exotic systems (missions 3–6)**: `rules/exotic.ts` owns the C.A.T. (BOARD-level
  state, not a Piece; never occupies its square; enter to pick up / stealer-enter
  to damage, twice destroys; wanders 3 steps end-phase via board dice) and the
  destructible DUCTING map. Stealer-phase interactions CANNOT use event handlers
  (capture suppresses them); runStealerActions calls stealerExoticInteractions
  after each move, same pattern as convertRevealedBlips. Marine ESCAPE (lurk
  adaptation): entering an EXIT square on escort-cat/escape-count missions
  removes the marine via GameEngine.tryEscape (live marine phase only).
  GameResult now includes DRAW (damaged-cat escape). Defend: turn-limit win is
  an explicit end-phase check; ducting/room-flames/wipe lose; flamerAmmo
  override; the flamer-fires-from-control-room kludge lives on the
  sectionFlamed handler.
- **beta_2 weapons (AssaultCannonMarine.ts, AmbushCounter.ts)**: the cannon's
  aimed fire is 3 dice vs 5 (sustained LOWERS the req, floor 1), AUTOFIRE
  sweeps pieces INCLUDING MARINES and closed doors (Door.destroy() = gone for
  good, isOpen forever) in repeat passes, MALFUNCTION fires on a 3-dice triple
  once shotsFired > 10 (kills the cannon + adjacent d6 ≥ 4/5). Parry lives in
  combat.ts (best-die reroll when the parrier loses/ties with the opponent
  ahead). AmbushCounter extends Blip but overrides tryMove (no sight bars) and
  convert (fake → vanish + fireAtNothing on every watching overwatcher).
  Download victory: begin/decrement in endMarinePhase mirrors end_script; the
  MOVE-reset handler must check the sergeant actually LEFT the square;
  tryTurn also emits pieceMoved (caught twice now: keep initial hud.setStatus
  calls OUT of the pre-HUD markers block, the create()-order bug bit both runs).
- **Client default mission is `debug_1`;** `?mission=<name>` (any registry key) selects
  another; the space_hulk_1 e2e specs pass `?mission=space_hulk_1` explicitly.
- **Mission metadata (entry/exit `facing`, deployment `squad`) is written ONLY by
  `scripts/patchMissionMeta.ts`** from the original .mish sources (idempotent;
  aborts on mismatch; space_hulk_6's interleaved columns are hand-arbitrated in
  its SQUAD_OVERRIDES). `mission_meta.spec.ts` guards the invariants hermetically
  (facing must point at rock; every deploy square named). Fidelity specs that
  deep-equal deployment objects must include `squad`.
- **RosterPanel (client/src/ui/RosterPanel.ts) is DOM, not Phaser**; a flex
  sibling of the canvas. `buildRoster` zips `engine.marines` with
  `marineDeployment` BY INDEX **at scene start only** (both are insertion-
  ordered; after a death `engine.marines` shrinks, so never re-zip later;
  cards key on piece id). Names are static/deterministic (`marineNames.ts`
  pool + mission-name offset). Entry triangles/exit arrows draw one square
  OFF-board (`facing` = original efacing, rotation `idx*π/2`); the camera
  bounds carry a one-tile margin so edge triangles stay visible.

## Writing style for ALL displayed text (hard rule)

Every string a player can read (HUD, roster, help, credits, overlays, README, docs)
follows `docs/writing-guide.md`. Read it before writing or editing any displayed text.
The short version:

- Banned AI-tell vocabulary: pivotal/crucial/vital, underscore/highlight, showcase,
  foster, garner, delve, tapestry/landscape, testament, vibrant/profound/intricate,
  meticulous, "aligns with", "moving forward", "stands as / serves as",
  "Additionally," openers, "Furthermore/Moreover", "In summary", "it is worth noting",
  "not just X, but Y". Use the plain alternative from the guide's table.
- No em dashes. Ever. Not in displayed strings, docs, comments, commit messages,
  or anything else written from now on: use a colon, comma, `·`, semicolon, or
  parenthesis, or restructure the sentence. (Archived records under docs/isa/
  and docs/history/ keep their original text; everything new is em-dash-free.)
- Specifics beat generalities; no filler praise, no significance inflation, no rule-of-three
  padding, no vague attribution, no lead-in preambles, no Capitalizing Every Heading Word.
- Self-check: delete any sentence that only says the subject matters; collapse 3+ item
  lists that could be one sentence.

## Testing policy (this is why the project survived)

The project previously died from **mock-drift**: heavily-mocked Phaser unit tests asserted
the mocks, not the game. Standing rules (see ISA Principles + Changelog):

1. **Engine logic → vitest.** Combat tests inject a scripted `RollQueue([6,1,…])`,
   never assertions against seeds. `SeededRng` is for gameplay/e2e determinism only.
2. **Anything visual/interactive → real browser** (Playwright in `packages/client/tests/`,
   which is e2e-only; never put vitest specs there, the runners conflict).
3. Pinned-seed e2e: win.spec (debug_1 default, ?seed=1 → MISSION COMPLETE),
   playthrough.spec (?mission=space_hulk_1&seed=3 → loss), flamer-ui.spec
   (engine-surgery flame → win overlay + flames on screen).
   These are determinism fixtures, NOT balance evidence; balance = unpinned seed sweep.
   2026-08-15 post-fidelity baselines; space_hulk_1: 0W/60L, but the funnel shows
   the autopilot's flamer-led column feeds the flamer to CC on turn 2 in 57/60;
   an autopilot artifact, NOT balance evidence; unopposed the autopilot wins turn 9,
   proving the kill chain (flamer.spec); debug_1: 40W/0L over 40.
   STALE since 2026-09-12 (sight through stealer bodies converts blips earlier and
   widens the hive's seen map): the next balance run re-scans and owns these numbers.
   CAUTION: playthrough.spec idles turn 1 before its DONE click, so it consumes dice
   differently from plain autoplay; scan loss seeds under THAT pattern. If a rules change
   alters dice-consumption order, re-scan and re-pin. Stage 2 pins (2026-09-12): the win
   fixture is space_hulk_1 seed 26 by orders alone (win.spec, marine_ai.spec, gamelog.spec);
   space_hulk_2 survivor seed 29 (quota_victory.spec); debug_1 is a walking race at every
   regeneration tried (0 of 60 at the shipped 3, 30 of 30 without a shot at 2) and is no
   longer a win fixture.
4. `window.sulk` in the client exposes `{ engine, Selection, scene, SeededRng, autoplay,
   runMarineTurn, PieceEvents, Genestealer, gameLog, TUNING, step(n), command(id, cmd) }`
   for e2e and console debugging (`gameLog` is the GameLogger, null in attract mode).

## Gotchas (hard-won)

- **Playwright `fill()` hides broken text inputs; type with `pressSequentially()`.** Phaser's game-level KeyboardManager preventDefaults its ~25 captured keycodes on `window` with no target check, so a DOM `<textarea>` on a live game page silently eats most typed characters. `fill()` sets `.value` directly (no key events) and passes anyway; the debrief-notes field shipped untypable until a reviewer typed into it (2026-08-20). Any DOM text input needs (a) `clearCaptures()` while it is usable (scene-level `keyboard.enabled = false` is NOT enough) and (b) an e2e that types key by key and asserts the value.
- **Playwright real-mouse aiming must map world→page through the canvas rect.** `page.mouse.move(worldX - scrollX, ...)` silently hovers the WRONG tile; the canvas is offset/scaled in the e2e viewport (rect.left was -113). Correct mapping: `rect.left + (world - scroll) * rect.width / canvas.width` via `canvas.getBoundingClientRect()` (see door-keyboard/flamer-targeting harness notes, 2026-08-18). A wrong hover reads as "feature broken" when only the harness is.
- **Never time-debounce keyboard input.** Under parallel-load frame stalls, two legitimate presses can share one frame's `time.now`; a time guard eats real input (it broke the flamer's second F). Replay protection is the `seenKeyEvents` WeakSet, full stop. Related: while the flamer is armed, `update()` recomputes hover from the REAL pointer every frame, so e2e must aim with `page.mouse.move`, never by injecting `hoverCoord`.
- **Phaser replays keydown events across frames under load** (headless e2e, stalled RAF): one physical press can emit 2-3 'keydown' events carrying the SAME native event object, double-firing any single-press action (it double-toggled mute and re-armed the flamer). EVERY keydown handler in GameScene must dedupe through `this.seenKeyEvents` (WeakSet); add the guard to any new handler. Symptom signature: e2e failures that MIGRATE between key-driven tests when the full suite runs in parallel.

- **NodeNext imports:** engine files import with explicit `.js` extensions even for `.ts`
  sources. Client tsconfig has `verbatimModuleSyntax`; type-only imports need `import type`.
- **Background tabs freeze Phaser** (RAF throttled to zero): scenes don't finish `create()`,
  keys queue and replay, timers stall. Automate against a *visible* tab or headless
  Playwright; never debug input in a hidden tab.
- **Container children need their own `scrollFactor(0)`**; rendering follows the parent
  container but Phaser's input hit-test uses the child's factor (the DONE button drifted
  with the camera until `HudPanel` set it per child).
- **LOS is two policies since 2026-09-12 (`piecesBlock` in `board/los.ts`):** SIGHT (`canSee`,
  `piecesBlock: 'marines'`) passes through stealer-side bodies (stealers, blips, ambush
  counters), so the marines see the whole column and a blip behind a stealer converts at once;
  FIRE (`canShoot`, `piecesBlock: true`) still stops at the first body of any side, so overwatch
  and F never reach past the front rank and the hive's sacrifice blocker still shields the lane.
  Missing squares are solid rock and block both; vision arc is 180°, fire arc 90° with 45° edges
  shootable (`board/vision.ts`).
- **Fog of war (client only, `utils/fog.ts` + LiveScene.updateFog):** stealers hidden unless in a
  marine's sight set or within Chebyshev 2; BLIPS on the main board show only while the pulse
  radar runs (`radarLogic.radarActive`: a sergeant alive; debug_1 has no sergeant, so its blips
  are invisible until they convert). The sight set recomputes on a dirty flag raised by the
  engine events (moves, deaths, adds, conversions, doors, flames, cycle boundaries, escapes),
  at most once per frame; both gates read engine truth. `?fog=0` disables.
- **The clock (2.x, 2026-09-12):** `GameEngine.tick()` is the game; order: regen, deferred
  commands, marine default AI (`ai/MarineAI.ts`), `stealerTick`, expiry sweep + cycle offset
  events, cycle boundary every `TUNING.cycleTicks`, due reinforcements, victory, `tick` event.
  The engine reads no clock (engine_lint.spec bans `Date`/`performance`); the client's
  `LiveScene.update()` accumulator calls tick() (max 4 per frame). Every player action is
  `engine.command(id, MarineCommand)`, applied at once between ticks and logged against the
  tick it followed (the replay unit); the client NEVER calls piece action methods. A command
  stamps `lastCommandTick` (the direct-control lease, `TUNING.leaseTicks`) and the default AI
  skips leased marines. The 1.x test shims are GONE (engine_lint retires their names): mission
  specs run `runCycle(engine)` and the hive fixtures `stealerActivation(board)` from
  `rt.fixtures.ts` (hivePlanTicks calls of the live `stealerTick`, board tick stepped by hand).
  All real-time numbers live in `core/CostTables.ts` `TUNING` (`?tuning=k:v` overrides before
  construction; regen.marine 3 was chosen by the stage 2 scan, the rest is unvalidated).
  Re-pin the seed fixtures only after the last behavioural change of a stage.
- **Facing (alpha.2 playtest, 2026-09-13):** an idle marine turns to face the nearest
  stealer-side piece with a clear sight line from his square in ANY direction
  (`nearestThreatInSight`, blips included; rock, closed doors, marine bodies hide); an
  overwatcher turns for one outside his fire arc when `turnWouldBearOn` (re-arms next tick); any
  threat already in the fire arc (`threatInArc`) vetoes every facing turn (no spinning between two);
  with nothing in sight he turns to `preferredFacing` (the fire cone covering the most
  squares, closed door ahead peeked, current facing wins ties and near-ties) BEFORE rule 10
  arms overwatch, and at a move order's arrival with then overwatch and no ordered facing.
  Never use the 180 degree vision count for this: the flank line counts as seen, which in a
  corridor ranks a wall-facing as high as the corridor.
- **Orders (2.x stage 2, 2026-09-12):** `Piece.order` holds one `MarineOrder` (moveTo then
  hold|overwatch, optional facing; openDoor); `ai/orders.ts` executes it inside `marineTick`
  AFTER the reactions (unjam, shoot, adjacent fight/turn, flamer last stand, plus the transit
  turn when a turn would bring a seen stealer into the fire lane) and INSTEAD of rules 7 to 11.
  Commands `order`/`clearOrder` never stamp the lease (`order` resets it); every other
  command, accepted or refused, clears the slot; `orderChanged` fires on set/replace/clear/
  completion. `chooseStep` prefers straight lines over pathStep's diagonal weave. A door a
  marine opened is immune to the default's door-close rule for a cycle
  (`Door.lastOpenedByMarine`). The autopilot is an ORDER ISSUER (moveTo, flame, clearOrder as
  cover; the flamer's firing door is the one direct `door` command, issued one square short of
  the room's section). Client: right-click = order (`LiveScene.handleOrderClick`,
  `disableContextMenu`), marker = Graphics named 'order-marker' with pieceId/kind/then data,
  roster `.m-order` word from `orderLabel`.
- **AI is a hive (AI1, 2026-08-17; per tick since 2.x):** `ai/hive.ts` plans the stealer side
  (2.x: every `TUNING.hivePlanTicks` ticks or on a marine death, cached on the board; the
  threat map is cached under `Board.version`; patience/massing/idle counters advance once
  per CYCLE so the turn-denominated thresholds below still hold; blip voluntary conversion is
  "spent nothing since the pool was last full, or idle `TUNING.blipIdleTicks`");
  threat map (overwatch kill zones + seen squares), threat-weighted Dijkstra
  (kill +6, seen +2 per square; falls back to plain BFS behavior with no threat),
  staging ring + stall-based wave patience, approach-vector spread (separated
  octants, real-reach scoring, per-vector quotas), straggler hunts, sacrifice
  blocker (parks in the fire lane; its BODY blocks LOS so the column builds up
  behind), staging door-shuts, emergent jam rush. HARD invariants: the hive
  consumes ZERO dice (hive.spec counts RollQueue draws exactly; any planning
  draw re-baselines every scripted test), hive memory is a WeakMap on Board,
  variety comes only from cycle-number rotation. Pathing rules unchanged:
  8-connected, closed door EDGES pathed through and opened on contact, friendly
  pieces transparent (queue through chokepoints) but never stepped on, corner-cut
  diagonals pruned. Greedy stepping was removed; it stalls in concave pockets
  (`ai_pathing.spec.ts`). Behavior fixtures live in `hive.spec.ts`; re-pin
  pinned seeds only AFTER the last behavioral change (beta_2 got re-pinned twice
  in one session for scanning too early). Objective awareness (2026-08-18):
  GameEngine passes the marines' DESTINATION squares (never win rules); the
  hive grows reckless as marines close on them, camps the ring around them,
  shrinks wave thresholds to the remaining mission clock, and caps massing at
  6 turns absolute (growth-keyed patience alone never fires under uncapped
  reinforcements; learned from the (3,7) door-stack playtest). Idle pieces
  force-assault after 3 stationary plans; a frustrated blocked blip CONVERTS
  (stealers have no door caution; that is the deadlock breaker). Staged
  pieces are EXEMPT from the idle override (pinning a flank is their job; the
  wave caps still bring them in, and the frustrated SET stays independent so
  blocked blips convert at the next launch). Blood in the water: marine losses
  tighten the ring 8→6→4 and cap thresholds at squad+1. Zigzag advance through
  side alcoves is EMERGENT from the per-square kill penalty (pinned in
  hive.spec; don't add special-case code for it). CC targets an un-jammed
  overwatcher first. spawnBlips ranks entries by objective distance (bulk via
  rotated top-3, watched entries last) and every third cycle spawns a feint at
  the entry nearest the MARINES; 2.x books each blip into its entry's slot
  (entry index times `TUNING.spawnOffsetTicks`) instead of placing the wave at once.
- **Doors are EDGES, not squares:** a `Door` anchors on a square + `doorFacing` and lives on
  the boundary to that neighbor. `Board.doorBetween(a,b)` is the lookup; movement blocks
  orthogonal crossings (`Piece.tryMove`), LOS does segment-intersection vs closed edges
  (`board/los.ts`), sprites render on the boundary. Door anchor squares are ordinary
  passable squares; never treat `doorAt(sq)` as "this square is a door".
- **Never emit events from a base-class constructor when subclass fields carry the payload:**
  JS runs subclass field initializers AFTER super() returns. `Piece.kind` is a base-constructor
  parameter for exactly this reason (the "every new piece renders as a marine" bug).
- **No replay pipeline any more (2.x):** the client renders engine events as they fire. The
  emitter keeps `capture()`/`replay()`/`replaying` for the logger's exactly-once tap
  semantics and for tests; nothing in the client calls them, and engine logic must never
  depend on event delivery (the stealer side re-checks sight itself after every action).
- **Sight-conversion lives at TWO levels, both required:** `GameEngine` handlers on
  `pieceMoved`/`doorToggled`/`pieceDied` cover the marines' actions (a kill vacates a
  square and can reveal a blip); the stealer side (`stealerAct` in StealerAI.ts) calls
  `convertRevealedBlips` after every one of its actions itself, so a captured or
  handler-free driver (tests, the shims) behaves like the live tick.
  Removing either half silently diverges browser games from engine seed scans.
- **Determinism covers the RNG's whole lifetime:** blip values + first CP roll consume dice
  at engine CONSTRUCTION; swapping `board.dice` afterwards leaves them random. Pin with
  `?seed=N` (installs the source at construction), never a post-hoc dice swap.
- Root `package.json` has `build`/`test` scripts; engine coverage artifacts are gitignored.
- **Audio: `scripts/fetchAudio.ts` is the ONLY producer of fetched/derived audio.** Sources,
  mission→track map, and credits live in `packages/client/src/audio/audioManifest.ts`; alien
  cut points + role classification in `alienSegments.ts` (edit roles there, flip `guess` when
  ear-confirmed). The processed set under `assets/audio/` is committed and ships with the
  deployed site, attributed on `/credits.html` (see CREDITS.md); only the raw `.audio-cache/`
  is gitignored. `AudioManager` owns ALL playback;
  never call `this.sound.play` from LiveScene; every audible behaviour routes through the
  pure-logic `audioLogic.ts` (vitest-covered) and cache-exists guards keep a no-audio clone
  booting silently. Music is OGG **Opus** (this ffmpeg has no libvorbis; Playwright's
  Chromium has no AAC; opus is the codec all our targets decode).

## Where work would continue (see docs/status.md "Known gaps")

All nine missions are registered and playable; the campaign equipment (assault
cannon, chain fist, parry sergeant, C.A.T., ambush counters) shipped with them.
The 2.x line (docs/realtime-plan.md) is in progress: stage 1 (the clock) shipped
as v2.0.0-alpha.1 and dissolved the old "marine interrupts" gap (marines act at
any time now); stage 2 (individual orders, right-click) shipped as
v2.0.0-alpha.2; stage 3 (squad orders, the chain of command) starts from the
plan's "Stage 2 as built" section. Still open: thunder hammer + captain/grenades + librarian psi (no
registered mission uses them; sprites exist unused per docs/asset-index.md),
off-board entry-limbo lurking, the first balance sweep of the real-time
constants. Deferred verifications: FPS probe (ISC-71), live real-Chrome boot
check once Interceptor is repaired.
