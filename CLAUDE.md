# sulkweb — working notes for AI/dev sessions

Web port of **Sulk** (Space Hulk clone): pure-TypeScript rules engine + Phaser 3 client.
Currently at **v0.1 (tagged)** — Mission 1 is playable start-to-finish, win and loss both verified.

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
pnpm --filter ./packages/engine test     # 112 unit tests + coverage (~95% lines)
pnpm --filter ./packages/client test     # HUD/minimap units (vitest, --dir src only)
pnpm --filter ./packages/client e2e      # Playwright no-mock suite (8 tests, incl. win+loss playthroughs, stealer-phase animation, HUD hover readout)
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
  Our JSONs mirror that structure: `engine/src/missions/space_hulk/space_hulk_1.json`,
  `engine/src/missions/debug/debug_1.json` — registry in `missions/index.ts`. debug_1 and
  space_hulk_1 share a byte-identical 98-square BOARD (verified by diffing the sources);
  they differ only in forces (debug_1: ONE marine at BEGINPLACE, blips 0 initial + 1/turn).
  `mission1_fidelity.spec.ts` is the square-for-square guard — edit maps only with the
  original source in hand. Dynamics are documented deviations (no flamer →
  reach-Launch-Control win; see ISA Decisions).
- **Client default mission is `debug_1`;** `?mission=<name>` (any registry key) selects
  another — the space_hulk_1 e2e specs pass `?mission=space_hulk_1` explicitly.

## Testing policy (this is why the project survived)

The project previously died from **mock-drift**: heavily-mocked Phaser unit tests asserted
the mocks, not the game. Standing rules (see ISA Principles + Changelog):

1. **Engine logic → vitest.** Combat tests inject a scripted `RollQueue([6,1,…])`,
   never assertions against seeds. `SeededRng` is for gameplay/e2e determinism only.
2. **Anything visual/interactive → real browser** (Playwright in `packages/client/tests/`,
   which is e2e-only — never put vitest specs there, the runners conflict).
3. Pinned-seed e2e: win.spec (debug_1 default, ?seed=1 → MISSION COMPLETE) and
   playthrough.spec (?mission=space_hulk_1&seed=3 → loss).
   These are determinism fixtures, NOT balance evidence; balance = unpinned seed sweep.
   2026-08-15 baselines — space_hulk_1: 102W/18L/0 over 120 (ALL wins by reaching Launch
   Control; rate measures the adapted objective, see ISA); debug_1: 30W/30L/0 over 60.
   CAUTION: playthrough.spec idles turn 1 before its DONE click, so it consumes dice
   differently from plain autoplay — scan loss seeds under THAT pattern (endMarinePhase
   first, then autoplay). If a rules change alters dice-consumption order, re-scan and re-pin.
4. `window.sulk` in the client exposes `{ engine, Selection, scene, SeededRng, autoplay,
   runMarineTurn }` for e2e and console debugging.

## Gotchas (hard-won)

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

## Where work would continue (see README "Known gaps")

Balance tuning (blip budget/entries), sergeant + special weapons (flamer, assault cannon,
librarian — rules already digested in ISA), marine interrupts during stealer phase,
more missions (schema is ready), sound, deploy pipeline. Deferred verifications:
FPS probe (ISC-71), cross-vendor audit against tag `v0.1`.
