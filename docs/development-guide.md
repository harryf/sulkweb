# Development Guide

Where everything lives and where to put new things. Read [architecture.md](architecture.md) first for how the two packages fit together; this file is the map and the recipes. Verified against the source on 2026-08-17; if a detail disagrees with the code, the code wins and this file needs updating.

## Setup and daily commands

```bash
pnpm install
pnpm --filter ./packages/client dev    # http://localhost:5173, hot-reloads engine AND client
pnpm fetch-audio                       # one-time-ish: music + generated SFX (yt-dlp + ffmpeg)

pnpm test                              # all unit suites (engine + client)
pnpm --filter ./packages/engine test   # engine only (vitest + coverage)
pnpm --filter ./packages/client test   # client unit only (vitest, jsdom)
pnpm --filter ./packages/client e2e    # Playwright, boots its own dev server
pnpm build                             # engine tsc + client vite build
```

Pick a mission with a URL parameter: `http://localhost:5173/?mission=beta_2` (default `debug_1`). In the browser console, `window.sulk` exposes the live engine, scene, `Selection`, and the autopilot helpers.

## Directory map

### `packages/engine/src/` (rules, no rendering)

| Path | Contents | Touch it when... |
|---|---|---|
| `GameEngine.ts` | State owner: the deployment phase (`beginDeployment`/`autoDeploy`/`finishDeployment`, helpers in `rules/deploy.ts`), phase driver (`endMarinePhase`), victory checks, CP | changing turn structure, victory rules, deployment |
| `board/` | `Board`, `Square`, `los.ts`, `vision.ts` (sight and fire arcs) | changing movement space, LOS, arcs |
| `pieces/` | `Piece` base + every unit class (marines, `Genestealer`, `Blip`, `AmbushCounter`) | adding or changing a unit type |
| `rules/` | `Door.ts`, `combat.ts` (close combat), `flame.ts`, `exotic.ts` (C.A.T., ducting) | changing a cross-piece rule |
| `ai/` | `StealerAI.ts`, `MarineAutopilot.ts` (autoplay for tests) | changing enemy behavior |
| `missions/` | Mission JSONs by family, `index.ts` registry, `missionTypes.ts` schema, `missionLoader.ts` | adding a mission or objective type |
| `core/` | `Dice.ts` (`SeededRng`, `RollQueue`), `Direction.ts` (also `chebyshev`, `facingToward`, shared vectors), `CostTables.ts` (AP costs) | changing costs, randomness, geometry |
| `events/PieceEvents.ts` | The typed event bus: `PieceEventsType` is the full event list | adding a new gameplay fact the UI must see |
| `index.ts` | The package's public exports; the client only sees what is exported here | whenever you add anything the client needs |
| `__tests__/` | The single Vitest suite directory, including per-mission fidelity specs | with every engine change |

Phase flow lives inside `GameEngine` (`PhaseName` is a string union, not a class hierarchy), and the piece-selection store lives in the client (`packages/client/src/ui/Selection.ts`); the engine never reads it.

### `packages/client/src/` (rendering, input, audio)

| Path | Contents | Touch it when... |
|---|---|---|
| `scenes/GameScene.ts` | The big one: asset preload, board drawing, input handling, event rendering, stealer-phase replay | new sprites, new keys, new visual reactions to events |
| `scenes/PreloadScene.ts` | Loading bar | rarely |
| `ui/HudPanel.ts` | Canvas Mission Status strip (turn, timer, kills, objective, dice, DONE) | mission-level HUD info |
| `ui/RosterPanel.ts` | DOM marine cards, keyboard help, credits | per-marine info, help, credits |
| `ui/marineNames.ts` | Roster identities; `EXPECTED_SPRITE` cross-checks deployment against engine pieces | new marine type |
| `ui/keyboardHelp.ts` | Key layout data for the help panel (pinned by a test) | any key binding change |
| `ui/Minimap.ts`, `utils/cameraBox.ts` | Minimap and its camera projection | minimap behavior |
| `ui/Selection.ts` | Selected-piece store (map, roster, and keyboard input all read it) | selection behavior |
| `audio/` | `AudioManager` (event → sound), `audioManifest.ts` (assets + credits), `audioLogic.ts` (pure mappings), `alienSegments.ts` | any sound change |
| `config.ts`, `gameConfig.ts`, `main.ts` | HUD constants (incl. `UI_FONT`, `FACING_ARROWS`), Phaser config, boot | dimensions, scenes |
| `src/tests/`, `src/ui/tests/`, `src/audio/tests/` | Client unit tests (jsdom, Phaser mocked) | with client logic changes |
| `tests/` (package root) | Playwright e2e: real browser, real input, seeded dice | with anything player-visible |

Both packages run `vitest run --coverage`: the engine covers everything under its `src/`, the client covers its non-Phaser logic (GameScene, Minimap, AudioManager and friends are exercised by the e2e suite instead, since jsdom cannot render Phaser).

### Everything else

| Path | Contents |
|---|---|
| `packages/client/public/assets/` | All game assets; see [asset-index.md](asset-index.md) for every file and what uses it |
| `scripts/fetchAudio.ts` | Regenerates the committed audio set from source videos, driven by `audioManifest.ts` |
| `docs/` | Guides (this one, [architecture.md](architecture.md), [writing-guide.md](writing-guide.md)), original-game reference material |
| `ISA.md` | Project system of record: criteria, decisions, verification evidence for everything built so far |
| `CLAUDE.md` | Working rules for AI-assisted development, including the displayed-text writing rules |
| `CREDITS.md` | Audio sources and licensing |

## Recipe: add a new mission

Missions are data. The engine reads one JSON object; no code is required unless you need a new objective type.

1. **Create the JSON** at `packages/engine/src/missions/<family>/<name>.json` (families mirror the original game: `space_hulk/`, `beta/`, `debug/`). The schema is `RawMissionJSON_v2` in `missionTypes.ts`, which documents every field. The core:

   ```jsonc
   {
     "name": "Display Title",
     "width": 22, "height": 27,
     "squares": [ { "x": 10, "y": 0, "kind": "corridor", "section": 0 } ],
     "entryPoints": [ { "x": 0, "y": 6, "facing": "left" } ],
     "exitPoints":  [ { "x": 21, "y": 20, "facing": "right" } ],
     "marineDeployment": [ { "x": 10, "y": 1, "facing": "down", "type": "sergeant", "squad": "Constantine" } ],
     "initialBlips": 2, "blipsPerTurn": 2,
     "objective": "reach-exit"
   }
   ```

   Squares carry an optional `doorFacing` (doors are edges on a square) and a `section` number (the blast unit for flamers). `type` defaults to `storm_bolter`. Objectives available today: `exterminate`, `reach-exit`, `exterminate-or-exit`, `flame-objective`, `kill-quota`, `escort-cat`, `flame-objectives`, `escape-count`, `defend`, `download`, each with its own extra fields (`killQuota`, `catStart`, `turnLimit`, `downloadPoint`...). Read an existing mission of the same objective as a template; `debug_1.json` is the smallest full example. Fair warning: loader validation is minimal (an empty `squares` array throws; everything else is trusted), so a typo in a field name shows up as odd in-game behavior, not an error message. The fidelity-spec test in step 5 is what catches it.

2. **Register it** in `packages/engine/src/missions/index.ts`: add the JSON import and a key in the `missions` object. The key is the mission's public name everywhere: the URL parameter, the music lookup, the tests.

3. **Play it**: `http://localhost:5173/?mission=<key>`. Unregistered names fall back to `debug_1`.

4. **Music (optional)**: add a `MUSIC_TRACKS` entry for the mission key in `packages/client/src/audio/audioManifest.ts`, then re-run `pnpm fetch-audio`. Without an entry the mission simply has no ambient track.

5. **Test it**: the pattern is a fidelity spec in `packages/engine/src/__tests__/` (see `mission2_fidelity.spec.ts` or `beta2_mission.spec.ts`): assert the board shape, deployment, and a scripted playthrough with `RollQueue`-pinned dice. If the mission is player-facing, add it to the e2e matrix in `packages/client/tests/` (`missions3plus.spec.ts` shows the shape).

6. **Document it**: the mission list in [features.md](features.md) is the player-facing catalogue; add the mission there.

## Recipe: add a new marine type

This is the marine path: marines are deployed from mission JSON through `MARINE_CLASSES`. Stealer-side pieces (`Genestealer`, `Blip`, `AmbushCounter`) are spawned by `StealerAI.ts` and mission logic instead, so a new stealer-side unit replaces steps 2 and 3 with changes there.

Unit types are classes in the engine plus a handful of client wiring points. Steps 2 and 3 are compiler-enforced (extending the `MarineType` union breaks the `MARINE_CLASSES` `Record` until you add the class); most of the rest fail quietly (a console warning, a fallback sound), so go down the list:

1. **Engine class** in `packages/engine/src/pieces/`: extend `Piece` (or, for a bolter-family weapon, `StormBolterMarine`, which brings jamming, overwatch, sustained fire, and move-and-shoot). Give it a `static readonly SPRITE_KEY` (this string is the contract with the client) and implement its actions. Emit existing `PieceEvents` where they fit; add a new event to `PieceEventsType` only for genuinely new facts.
2. **Type union**: add the type name to `MarineType` in `missions/missionTypes.ts` so mission JSON can deploy it.
3. **Deployment mapping**: add the class to `MARINE_CLASSES` in `GameEngine.ts`.
4. **Export it** from `packages/engine/src/index.ts`.
5. **Sprite**: put the PNG at `packages/client/public/assets/themes/default/<sprite_key>.png` and load it in `GameScene.preload` with the key equal to `SPRITE_KEY`. The roster reuses the same file by building the URL from the sprite key.
6. **Roster wiring** in `packages/client/src/ui/marineNames.ts`: add the type to `EXPECTED_SPRITE` (the roster logs a mismatch warning if this drifts from the engine) and, if it carries a special weapon, to `SPECIAL_LABEL`.
7. **Sound**: map the sprite key in `shotSfx` (and `combatSfx` if melee sounds differ) in `packages/client/src/audio/audioLogic.ts`; otherwise every shot falls back to the bolter sound.
8. **Keys**: if the unit needs a new action key, wire it in `GameScene` input handling AND add it to `KEY_ROWS`/`KEY_NOTES` in `ui/keyboardHelp.ts`. A client test pins the full key inventory against the help panel, so forgetting the help fails CI-style.
9. **Tests**: an engine spec for the unit's rules (see `beta2_weapons.spec.ts` for the assault cannon and chain fist as models), plus e2e coverage if it changes player-visible flows.

Success looks like: deploy the new `type` in a mission JSON, load it, and see the sprite on the board and a roster card with the right weapon label, no `roster zip mismatch` warning in the console, and the unit's own sound when it fires.

## Recipe: add a new objective / victory rule

1. Add the name to the `objective` union (plus any config fields) in `missionTypes.ts`, with a doc comment; the schema file doubles as the mission-format documentation.
2. Implement the win/loss logic in `GameEngine.checkVictory` and, if it ticks per turn, in `endMarinePhase` (the `download` objective is a complete worked example of both plus its own event).
3. If the HUD must show progress, emit a `PieceEvents` event and render it in `HudPanel` (see `casualtiesChanged` → `Kills: n/30`).
4. Cover it with an engine spec modeled on `exotic_victory.spec.ts` or `quota_victory.spec.ts`.

## Recipe: add sounds or other assets

- Every audio asset flows through `audioManifest.ts` (what it is, where it came from, who to credit); `AudioManager.queueLoads` loads it and an event handler plays it. Original wavs live in `assets/sounds/`; the processed fetched audio is committed under `assets/audio/` and regenerated by `scripts/fetchAudio.ts`. New audio needs a credit entry in the manifest: the deployed `/credits.html` page and `CREDITS.md` are driven by that data, so an asset without a manifest entry fails the audio-coverage unit test.
- For sprites and everything else, check [asset-index.md](asset-index.md) first: 25+ original-game sprites (death frames, blip variants, captain/librarian loadouts...) already sit unused in `assets/themes/default/` waiting for a feature to use them.

## Conventions that will bite you if skipped

- **The engine never imports Phaser or the DOM**, and the client never mutates engine state except through engine methods. The decision rule: if it affects game state or must survive the stealer-phase replay, it belongs in the engine; if it is a tween, sound, camera move, or sprite, it belongs in the client, with the fact crossing as a `PieceEvents` event. The classic mistake is implementing a rule in `GameScene` because the sprite is already in hand.
- **Events during the stealer phase are captured and replayed** for animation. Engine handlers that mutate state on events must check `PieceEvents.replaying`; client handlers driven by replayed payloads must not read live engine state until `finishReplay` (details in [architecture.md](architecture.md)).
- **Client unit tests vs e2e are different worlds**: `pnpm --filter ./packages/client test` runs vitest on `src/` only; Playwright specs live in `packages/client/tests/` and run with `pnpm --filter ./packages/client e2e`. Running vitest over the package root picks up Playwright files and fails confusingly.
- **Determinism is a feature**: anything random goes through the board's `DiceSource` so tests can pin it. Do not call `Math.random()` in the engine.
- **Displayed text follows the writing rules** in [writing-guide.md](writing-guide.md) (summarized in `CLAUDE.md`): no em dashes in player-visible strings, no AI-tell vocabulary, specifics over generalities.
- **ISA.md is the system of record.** Substantial changes land there as criteria with verification evidence; read its Decisions log before re-litigating a design choice, because most of them were made for a reason that is written down.
