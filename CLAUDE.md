# sulkweb — working notes for AI/dev sessions

Web port of **Sulk** (Space Hulk clone): pure-TypeScript rules engine + Phaser 3 client.
ALL NINE missions registered (space_hulk 1–6, beta_1, beta_2, debug_1) — the complete original campaign, exotic weapons included.

## Read first

| What | Where |
|------|-------|
| **System of record** — goals, 76 verified criteria, decisions, changelog | `ISA.md` |
| Player-facing state, controls, known gaps | `README.md` |
| Original milestone specs (M0–M8) and roadmap | `prompts/` |
| Canonical game rules (AP costs, dice, blips, phases) | `docs/SULK Manual Combined.pdf`; distilled digest in ISA Decisions |
| Original Pygame engine analysis | `docs/Analysis Sulk Pygame*.html` |

Resuming work = extend `ISA.md` (new ISCs, decisions, changelog) — don't invent a parallel spec.

## Commands

```bash
pnpm install
pnpm --filter ./packages/client dev      # play at localhost:5173
pnpm --filter ./packages/engine test     # 228 unit tests + coverage (~95% lines)
pnpm --filter ./packages/client test     # HUD/minimap units (vitest, --dir src only)
pnpm --filter ./packages/client e2e      # Playwright no-mock suite (18 tests: playthroughs, flame/kill-counter/draw/download UIs, all-mission boots, animation, hover)
pnpm build                               # engine tsc -b + client vite build
pnpm --filter ./packages/engine example  # CLI engine tour
```

## Architecture (the invariants that matter)

- **`packages/engine` is pure TS — zero Phaser/DOM/network imports.** All rules live here
  and every rule has a unit test. The client renders engine state; it never owns it.
- **Events are the only engine→client channel:** `engine/src/events/PieceEvents.ts`
  (pieceMoved, pieceDied, shot, doorToggled, phaseChanged, gameOver, …). To surface new
  engine behavior in the UI, emit an event and subscribe in `GameScene`/`HudPanel`.
- `GameEngine` orchestrates: deployment, CP, turn cycle, reinforcements (finite
  `totalBlips` budget), AI (`ai/StealerAI.ts`), victory. `ai/MarineAutopilot.ts` is a
  legal-actions scripted player used by the deterministic e2e tests.
- Mission schema: `engine/src/missions/missionTypes.ts`; Mission 1 JSON has squares,
  doors (`doorFacing`), `entryPoints`, `exitPoints`, `marineDeployment`, `objective`.
- **Mission geometry comes from the ORIGINAL Sulk sources** at
  `~/Code/personal/sulk/archive/sulk-0.29-snapshot-20030623/data/missions/<family>/MISH_*.py`.
  Our JSONs mirror that structure: `engine/src/missions/space_hulk/space_hulk_{1,2}.json`,
  `engine/src/missions/debug/debug_1.json` — registry in `missions/index.ts`. debug_1 and
  space_hulk_1 share a byte-identical 98-square BOARD (verified by diffing the sources);
  they differ only in forces/objective. `mission{1,2}_fidelity.spec.ts` are the
  square-for-square guards — edit maps only with the original source in hand.
- **New missions transcribe mechanically**: `bun scripts/transcribeMission.ts
  <MISH_*.py> <target.json>` patches a single mission's board fields in place,
  preserving hand-written forces/objective fields; `bun scripts/migrateMissions.ts`
  batch-converts ALL remaining originals (space_hulk 3–6, beta 1–2) into drafts
  at `src/missions/drafts/` — both share `scripts/lib/parseMish.ts`, which
  parses MULTI-tag square dicts (`{O:1,M:None}`, quoted COMMENT strings) that
  single-tag regexes silently drop. Drafts carry everything mechanical (board,
  entries, exits, O/DUCTING squares, blips, squad rosters, info/story, default
  deployment) plus a `todo` list of unscripted semantics (victory_check is
  arbitrary Python; CAT/lurking/turn-limit/ambush/assault-cannon are unbuilt).
  Drafts are NEVER registered in `missions/index.ts` — the registry is the
  playability gate. Finishing a mission = implement its todos, move the JSON to
  its family folder, register, add a fidelity spec whose expected data comes
  from an INDEPENDENT reading of the source (missions 1/2 precedent), never
  from the script's own output.
- **space_hulk_2 "Exterminate" victory** (`objective: kill-quota`): marines win at
  `board.stealerCasualties >= killQuota` (counted in `Piece.die()` — stealer +1,
  blip +VALUE, conversion counts NOTHING) OR when every entry square has a marine
  within 6 (`Board.pieceNear` — the original `get_team_is_near` walk: 8-way over
  existing squares, walls block, closed doors don't). Loss on squad wipe. The
  original checks victory at PHASE BOUNDARIES (phases.py:774 marine-action end,
  973 end-phase); our kill-quota missions add a marine-action-end check in
  endMarinePhase plus an outcome-equivalent instant quota check on pieceDied
  (no enemy act between the 30th kill and the boundary) — blockade evaluates
  ONLY at boundaries (positions final). Other objectives keep their adapted
  post-spawn timing: a pre-stealer-phase check would read the empty turn-1
  board as "stealers exterminated" (debug1 regression caught this).
  Deployment is one marine per room section (original pre_deploy_rule); the two
  stealer-placed pieces are fixed adversarially (see ISA Decisions).
- **BEGINPLACE is DEAD CODE in the original** (initial camera position; its board.py
  consumers are commented out). Real deployment squares are the `M:`-tagged tuples —
  mission 1: the north corridor (10,0)–(10,4). Original FORCES: 3 storm bolters +
  sergeant (+1 CC, +30s timer) + heavy flamer (deployed at the column head — the
  original deploy phase pops the member list from the END, flamer first).
- **Sections drive the flamer**: each BOARD sublist in the Python source is one board
  SECTION; `scripts/addSections.ts` regenerates per-square `section` ids in the JSONs
  from the source. Flames fill the target's whole section (orthogonal spread, stopped
  by closed door edges), kill on d6 ≥ 2, block movement-in and LOS, and clear at
  end-phase (with a blip-sight recheck). Self-destruct silently wipes + torches the
  flamer's OWN section.
- **space_hulk_1 victory is the ORIGINAL**: `objective: flame-objective` +
  `objectivePoint (20,20)` — win the instant the objective square burns; LOSS the
  instant no living flamer has ammo. No exit win, no extermination win, reinforcements
  UNCAPPED. debug_1 keeps the adapted reach-exit objective (documented deviation).
- **Exotic systems (missions 3–6)**: `rules/exotic.ts` owns the C.A.T. (BOARD-level
  state, not a Piece — never occupies its square; enter to pick up / stealer-enter
  to damage, twice destroys; wanders 3 steps end-phase via board dice) and the
  destructible DUCTING map. Stealer-phase interactions CANNOT use event handlers
  (capture suppresses them) — runStealerActions calls stealerExoticInteractions
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
  MOVE-reset handler must check the sergeant actually LEFT the square —
  tryTurn also emits pieceMoved (caught twice now: keep initial hud.setStatus
  calls OUT of the pre-HUD markers block, the create()-order bug bit both runs).
- **Client default mission is `debug_1`;** `?mission=<name>` (any registry key) selects
  another — the space_hulk_1 e2e specs pass `?mission=space_hulk_1` explicitly.
- **Mission metadata (entry/exit `facing`, deployment `squad`) is written ONLY by
  `scripts/patchMissionMeta.ts`** from the original .mish sources (idempotent;
  aborts on mismatch; space_hulk_6's interleaved columns are hand-arbitrated in
  its SQUAD_OVERRIDES). `mission_meta.spec.ts` guards the invariants hermetically
  (facing must point at rock; every deploy square named). Fidelity specs that
  deep-equal deployment objects must include `squad`.
- **RosterPanel (client/src/ui/RosterPanel.ts) is DOM, not Phaser** — a flex
  sibling of the canvas. `buildRoster` zips `engine.marines` with
  `marineDeployment` BY INDEX **at scene start only** (both are insertion-
  ordered; after a death `engine.marines` shrinks, so never re-zip later —
  cards key on piece id). Names are static/deterministic (`marineNames.ts`
  pool + mission-name offset). Entry triangles/exit arrows draw one square
  OFF-board (`facing` = original efacing, rotation `idx*π/2`); the camera
  bounds carry a one-tile margin so edge triangles stay visible.

## Writing style for ALL displayed text (hard rule)

Every string a player can read — HUD, roster, help, credits, overlays, README, docs —
follows `docs/writing-guide.md`. Read it before writing or editing any displayed text.
The short version:

- Banned AI-tell vocabulary: pivotal/crucial/vital, underscore/highlight, showcase,
  foster, garner, delve, tapestry/landscape, testament, vibrant/profound/intricate,
  meticulous, "aligns with", "moving forward", "stands as / serves as",
  "Additionally," openers, "Furthermore/Moreover", "In summary", "it is worth noting",
  "not just X, but Y". Use the plain alternative from the guide's table.
- No em dashes for dramatic emphasis or as separators in displayed strings — use a
  colon, comma, `·`, or parenthesis (code comments are exempt).
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
   which is e2e-only — never put vitest specs there, the runners conflict).
3. Pinned-seed e2e: win.spec (debug_1 default, ?seed=1 → MISSION COMPLETE),
   playthrough.spec (?mission=space_hulk_1&seed=3 → loss), flamer-ui.spec
   (engine-surgery flame → win overlay + flames on screen).
   These are determinism fixtures, NOT balance evidence; balance = unpinned seed sweep.
   2026-08-15 post-fidelity baselines — space_hulk_1: 0W/60L, but the funnel shows
   the autopilot's flamer-led column feeds the flamer to CC on turn 2 in 57/60 —
   an autopilot artifact, NOT balance evidence; unopposed the autopilot wins turn 9,
   proving the kill chain (flamer.spec); debug_1: 40W/0L over 40.
   CAUTION: playthrough.spec idles turn 1 before its DONE click, so it consumes dice
   differently from plain autoplay — scan loss seeds under THAT pattern (endMarinePhase
   first, then autoplay). If a rules change alters dice-consumption order, re-scan and re-pin.
4. `window.sulk` in the client exposes `{ engine, Selection, scene, SeededRng, autoplay,
   runMarineTurn }` for e2e and console debugging.

## Gotchas (hard-won)

- **Never time-debounce keyboard input.** Under parallel-load frame stalls, two legitimate presses can share one frame's `time.now` — a time guard eats real input (it broke the flamer's second F). Replay protection is the `seenKeyEvents` WeakSet, full stop. Related: while the flamer is armed, `update()` recomputes hover from the REAL pointer every frame, so e2e must aim with `page.mouse.move`, never by injecting `hoverCoord`.
- **Phaser replays keydown events across frames under load** (headless e2e, stalled RAF): one physical press can emit 2-3 'keydown' events carrying the SAME native event object, double-firing any single-press action (it double-toggled mute and re-armed the flamer). EVERY keydown handler in GameScene must dedupe through `this.seenKeyEvents` (WeakSet) — add the guard to any new handler. Symptom signature: e2e failures that MIGRATE between key-driven tests when the full suite runs in parallel.

- **NodeNext imports:** engine files import with explicit `.js` extensions even for `.ts`
  sources. Client tsconfig has `verbatimModuleSyntax` — type-only imports need `import type`.
- **Background tabs freeze Phaser** (RAF throttled to zero): scenes don't finish `create()`,
  keys queue and replay, timers stall. Automate against a *visible* tab or headless
  Playwright; never debug input in a hidden tab.
- **Container children need their own `scrollFactor(0)`** — rendering follows the parent
  container but Phaser's input hit-test uses the child's factor (the DONE button drifted
  with the camera until `HudPanel` set it per child).
- **LOS:** missing squares are solid rock and block sight (fixed bug); pieces block LOS;
  vision arc is 180°, fire arc 90° with 45° edges shootable (`board/vision.ts`).
- **AI pathing:** BFS shortest-path (8-connected; closed door EDGES are pathed through and
  opened on contact; friendly pieces transparent for pathing so the horde queues through
  chokepoints, but a piece never steps onto an occupied square). Greedy stepping was removed —
  it stalls permanently in concave room pockets (regression tests in `ai_pathing.spec.ts`).
- **Doors are EDGES, not squares:** a `Door` anchors on a square + `doorFacing` and lives on
  the boundary to that neighbor. `Board.doorBetween(a,b)` is the lookup; movement blocks
  orthogonal crossings (`Piece.tryMove`), LOS does segment-intersection vs closed edges
  (`board/los.ts`), sprites render on the boundary. Door anchor squares are ordinary
  passable squares — never treat `doorAt(sq)` as "this square is a door".
- **Never emit events from a base-class constructor when subclass fields carry the payload:**
  JS runs subclass field initializers AFTER super() returns. `Piece.kind` is a base-constructor
  parameter for exactly this reason (the "every new piece renders as a marine" bug).
- **Stealer-phase animation = event replay:** `PieceEvents.capture()` buffers the
  endMarinePhase stream; the scene re-emits it via `PieceEvents.replay()` on a timeline.
  Two invariants: engine logic must not depend on event delivery inside the captured
  section, and state-mutating handlers (sight-conversion) must skip `PieceEvents.replaying`
  — replayed events describe PAST board states.
- **Sight-conversion lives at TWO levels, both required:** `GameEngine` handlers on
  `pieceMoved`/`doorToggled`/`pieceDied` cover live marine-phase actions (a kill vacates a
  square and can reveal a blip); `runStealerActions` calls `convertRevealedBlips` after every
  AI action because `capture()` suppresses handlers during the animated stealer phase.
  Removing either half silently diverges browser games from engine seed scans.
- **Determinism covers the RNG's whole lifetime:** blip values + first CP roll consume dice
  at engine CONSTRUCTION — swapping `board.dice` afterwards leaves them random. Pin with
  `?seed=N` (installs the source at construction), never a post-hoc dice swap.
- Root `package.json` has `build`/`test` scripts; engine coverage artifacts are gitignored.
- **Audio: `scripts/fetchAudio.ts` is the ONLY producer of fetched/derived audio.** Sources,
  mission→track map, and credits live in `packages/client/src/audio/audioManifest.ts`; alien
  cut points + role classification in `alienSegments.ts` (edit roles there, flip `guess` when
  ear-confirmed). Downloaded/derived binaries are gitignored (copyrighted sources — CREDITS.md);
  only the original PD `assets/sounds/` wavs are committed. `AudioManager` owns ALL playback —
  never call `this.sound.play` from GameScene; every audible behaviour routes through the
  pure-logic `audioLogic.ts` (vitest-covered) and cache-exists guards keep a no-audio clone
  booting silently. Music is OGG **Opus** (this ffmpeg has no libvorbis; Playwright's
  Chromium has no AAC — opus is the codec all our targets decode).

## Where work would continue (see README "Known gaps")

Missions 2–6 + beta transcription (each brings its equipment: assault cannon +
autofire/reload/malfunction, chain fist, thunder hammer, captain + grenades + parry,
librarian psi, CAT escort, ambush counters, exit-arrow lurking, turn limits — the
original per-mission survey is in ISA Decisions 2026-08-15). Marine interrupts during
stealer phase. Deferred verifications: FPS probe (ISC-71), cross-vendor audit.
