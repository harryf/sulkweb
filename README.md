# Sulk Web

A web-based port of the classic turn-based strategy game [Sulk](https://sulk.sourceforge.net/) (a Space Hulk clone, originally Pygame), built with **Phaser 3 + TypeScript** on the client and a **pure-TypeScript rules engine** with no rendering dependencies.

**▶ Play it now: <https://harryf.github.io/sulkweb/>** (deployed from tagged
releases; the version tag is shown at the bottom of the homepage. Full audio
included — every track and effect is attributed, with links to the original
videos, on the [audio credits page](https://harryf.github.io/sulkweb/credits.html);
see also `CREDITS.md`.)

**Status: COMPLETE — the entire original campaign is playable.** Nine missions transcribed from the
original game's sources (`data/missions/<family>/MISH_*.py`).

Opening the bare app URL (`http://localhost:5173/`) shows the **homepage**: a title
overlay with an intro, the mission-select list, credits, and a link to the **field
manual** (`/manual.html` — friendly rules with TypeScript-rendered maps of every
mission), over a dimmed attract-mode board. During a mission an **Abort mission**
button (two-click confirm) returns to the homepage, and the end-of-mission dialog
offers **Retry** or **Choose another mission**.

- **`debug_1`**: "Suicide Mission with no forces" — one storm-bolter marine
  vs a one-blip-per-turn trickle (adapted reach-the-exit objective). A training
  scenario, kept off the mission-select list.
  `http://localhost:5173/?mission=debug_1`
- **`space_hulk_1`**: the ORIGINAL scenario — 3 storm bolters, a sergeant and a
  heavy flamer deploy in the north corridor and must fight across the hulk to
  **set the Launch Control room on fire**. Defeat the moment the flamer marine dies
  or runs out of ammo (6 shots — self-destruct also wins if he's inside the room).
  Reinforcements are uncapped, exactly like the source.
  `http://localhost:5173/?mission=space_hulk_1`
- **`space_hulk_2`** "Exterminate": a fresh 204-square board. Squad Constantine
  (3 storm bolters + sergeant + heavy flamer) starts scattered — one marine per
  room, per the original deployment rule — against two blips a turn, uncapped.
  Win by **killing 30 stealers** (a dead blip counts its hidden 1–3 value) or by
  **blockading every entry** (a marine within 6 squares of each); lose when the
  squad is wiped. The HUD shows the running toll (`Kills: n/30`).
  `http://localhost:5173/?mission=space_hulk_2`
- **`space_hulk_3`** "Rescue": two squads escort the **C.A.T.** — a neutral
  crawling recorder that wanders on its own until a marine scoops it up — off
  the board through an exit. Stealers reaching the loose C.A.T. skewer it:
  once = damaged (escaping then is only a **draw**), twice = destroyed (defeat).
- **`space_hulk_4`** "Cleanse and Burn": two squads, two heavy flamers, two
  **Gene Banks** to burn. A flamed objective is permanently *cleansed*; lose
  the moment no living flamer has ammo.
- **`space_hulk_5`** "Decoy": get **five of ten marines out** through the
  single exit; lose when the squad drops below five.
- **`space_hulk_6`** "Defend": survive to the **end of turn 16** while
  protecting the ducting (a stealer stepping on it tears it out — instant
  defeat) and keeping the control room unburnt. Flamers carry only 4 shots
  here, and firing one from inside the control room wrecks the ducting —
  exactly the source's own booby-trap.
- **`beta_1`** "Messenger": get any one marine out through the far exit.
- **`beta_2`** "Download": the full exotic armoury. A sergeant must HOLD the
  **Data Room** square through four quiet end-phases (moving resets the
  counter) while the squad covers him with the **assault cannon** (3 dice,
  kill on 5+, 10 rounds + one reload, 2-AP AUTOFIRE that shreds stealers,
  doors and even battle-brothers — and can catastrophically MALFUNCTION), the
  **chain fist** (cuts doors apart for good), the **power-sword sergeant**
  (parries the best enemy die) and the heavy flamer. The stealers seed
  **ambush counters** behind your lines — two in three are bluffs that bait
  your overwatch into wasted fire, jams, and cannon mishaps.
  `http://localhost:5173/?mission=beta_2`

Blips enter from the mission entry points, refuse to expose themselves (converting
from cover like the originals), the stealer AI hunts the squad, and the original
sounds play throughout.

## Play

```bash
pnpm install
pnpm --filter ./packages/client dev   # open http://localhost:5173
```

### Controls

| Input | Action |
|-------|--------|
| Click marine / roster card | Select (card click also pans the camera to him) |
| `W` / `X` | Move forward (1 AP) / backward (2 AP) |
| `Q` / `E` | Move diagonally forward-left / forward-right (1 AP, facing kept) |
| `Z` / `C` | Move diagonally back-left / back-right (2 AP, facing kept) |
| `A` / `D` | Turn left / right |
| `S` (or `H`) | Open/close door ahead |
| `F` | Fire at the nearest target — or at a closed door under the cursor (bolter destroys on a 6, assault cannon on 5+) |
| `F` (heavy flamer) | First press arms targeting: valid squares get a crosshair cursor and the blast section is previewed in orange; second press fires into the hovered square. Any action key cancels |
| `M` | Close combat (enemy directly ahead) |
| `O` | Overwatch on/off (2 AP) |
| `U` | Unjam bolter |
| `R` / `T` | Reload (4 AP) / autofire (assault cannon only) |
| `G` | Cut the door ahead (chain fist only, 1 AP) |
| `B` `B` | Heavy flamer self-destruct — press twice to confirm (torches his own section) |
| `P` | Spend a Command Point (+1 AP) |
| `K` | Mute sound on/off (persists) |
| `L` (hold) | Show line of sight |
| `Enter` / DONE | End marine phase |
| `Esc` | Pause |
| Arrows / drag | Pan camera |
| Mouse hover | Square coordinate + contents in the HUD (below the map legend) |

### Marine roster panel

A card grid to the right of the canvas shows the whole force, one row per
squad — titled after its sergeant per the Space Hulk convention ("Squad
Hectarion"), with the original mission squad key (Calvin, Constantine,
Sakharov…) kept as the grouping identity — sergeant and special-weapon
marines first. Each card carries the marine's icon, a
static Deathwing-flavoured name (`Sgt. Gideon`, `Bro. Claudio`), live AP and
ammo, weapon label, and state badges (overwatch, jam, C.A.T. carried). Cards
grey out `KIA` as marines die — the thinning roster IS the pressure gauge —
and mark `ESCAPED` separately on escape missions. The selected marine's card
glows gold; clicking a card selects him on the map and pans the camera.

Stealer entry points render as the original off-board `entry.png` triangles
(exits get `exit.png` arrows) pointing onto the board, replacing the old
purple squares.

### Sound

The processed audio set is committed under
`packages/client/public/assets/audio/` and ships with the site; sources and
licensing live in `CREDITS.md` and on the deployed
[audio credits page](https://harryf.github.io/sulkweb/credits.html). To
regenerate it from the original videos (requires `yt-dlp` + `ffmpeg` on PATH;
raw downloads are cached in the gitignored `.audio-cache/`):

```sh
pnpm fetch-audio
```

- **Ambient music** — a different [Music of 40K](https://www.youtube.com/@Musicof40K)
  soundscape per mission, looping continuously, loudness-normalised, ducked
  quiet during your phase and swelling while the stealers act (900ms fades —
  the room literally gets louder when it isn't your turn).
- **SFX** — the original Sulk public-domain wavs voice the marines; storm
  bolters fire the *Aliens* M41A pulse-rifle burst; genestealers move, attack
  and die with *Alien: Isolation* vocalisations (cut points + role guesses in
  `src/audio/alienSegments.ts` — flagged `guess` until confirmed by ear).
- **Motion tracker** — the *Aliens* tracker ping runs continuously, its
  cadence and pitch tightening as the nearest blip closes on your marines:
  a 2.4s idle sweep at 20+ squares, a 300ms panic tick at 2.
- `K` mutes (persisted). Without fetched audio the game boots and plays
  silently (original-wav bolter fallback aside) — audio is never load-bearing.

The game never blocks on audio: playback starts on your first click (browser
autoplay policy), all sounds are event-driven off the same engine event stream
the replays use, so what you hear tracks what you see.

## Rules implemented (per the original Sulk manual in `docs/`)

- AP economy: marines 4 AP (NO side-steps, per the original movemap), stealers 6 AP
  (free 90° turns — but the same direction twice in a row costs 1), blips 6 AP omnidirectional
- Facing-relative move costs; occupancy; edge-model doors — a door sits on the
  boundary between two squares (front-3 operate; closed = blocks movement and
  sight across that edge)
- Vision 180° / fire 90° arcs; walls, pieces and flames block LOS
- Storm bolter: 2d6 kill-on-6, sustained fire (+1 per aimed miss, max +4), no range
  cap on aimed shots; move-and-shoot — the first shot after a move is free
- Overwatch reaction fire (range 12), jams on doubles, 1 AP unjam, jam marker
- Close combat per the source: highest die; stealer 3d6 front / 2d6 flank; sergeant +1;
  attacker-win always kills; a winning defender only kills an attacker it faces,
  otherwise it spins to face; draws spin the defender too
- Heavy flamer: 2 AP per shot, 6 ammo, range 12, sets the target's whole board
  SECTION on fire (d6 ≥ 2 kills each piece; flames block movement + sight until the
  end-phase); cannot flame his own section; 1 AP self-destruct torches it instead
- Blips: hidden 1–3 stealers drawn from the original 8/4/9 counter bag; never move
  into marine sight or adjacent to a marine; convert the instant they're sighted —
  including when a kill vacates a blocking square — or voluntarily from cover
- Turn cycle: CP roll (1d6), marine phase (2:00 + 0:30 per living sergeant),
  reinforcements (uncapped on space_hulk_1, per source), stealer AI, victory checks
- The board is the ORIGINAL Sulk "Suicide Mission" layout (98 squares, 20 sections,
  7 doors, 6 stealer entries, three rooms), verified square-for-square against the
  Pygame source by `mission1_fidelity.spec`; marines deploy on the original `M`
  squares — the north corridor (10,0)–(10,4). (`BEGINPLACE` turned out to be dead
  code in the source: the initial camera position, not a deployment site.)
- Original objective restored: flame Launch Control (20,20); stealers win the moment
  no living flamer has ammo. Original sprites for every piece variant and the
  original GPL sound set are wired in.
- Mission 2 victory per the source `victory_check`: casualty counting matches the
  original `kill()` (stealer +1, blip +its hidden value, blip CONVERSION counts
  nothing), quota win fires the instant the 30th kill lands, and the blockade
  check walks the board graph exactly like `get_team_is_near` (8-way, walls
  block, closed doors don't, self = 0).
- beta_2 weapons per the source classes: assault cannon (aburst 5 / autofire 3
  score-reqs, sustained −1 per miss, malfunction on triples past ten shots —
  adjacent d6 ≥ 4, marines ≥ 5), chain-fist door cutting, ParryMixIn rerolls,
  Ambush_Counter with the original choice((0,0,1)) fake odds and
  try_to_jam_guns overwatch bait.
- Missions 3–6 + beta 1 victory rules per their `victory_check` functions:
  C.A.T. escort with the original damaged-draw state, permanent Gene Bank
  cleansing, lurk-count escapes (adapted as exit-square departures), and the
  turn-16 defence with destructible ducting — including the source's
  flamer-in-the-control-room kludge. Draws render their own overlay.

## Development

```bash
pnpm --filter ./packages/engine test   # 259 unit tests (rules, AI, game flow) + coverage report
pnpm --filter ./packages/client test   # 43 unit tests (HUD, minimap, roster, audio, manual maps) + coverage
pnpm --filter ./packages/client e2e    # 51 Playwright tests: real browser, no mocks
pnpm build                             # engine tsc + client vite build
```

The project ISA (`ISA.md`) is the system of record: goals, verified criteria, decisions, and changelog.

### Releases & deployment

The live site <https://harryf.github.io/sulkweb/> is GitHub Pages, deployed by
`.github/workflows/deploy.yml`. **Only version tags deploy** — pushing to
`main` never touches the live site. To ship a release:

```bash
git tag v0.3.0          # semver tag = the release gateway AND the UI version
git push origin v0.3.0  # CI: typecheck + full unit suites, then build + deploy
```

The workflow builds with `SULK_VERSION` set from the tag, which Vite injects
as `__APP_VERSION__` — visible in the homepage credits and the manual footer
(`dev` on local builds). If the verification gate fails, nothing deploys.

The deployed site ships **with the full audio set**: the processed files
under `assets/audio/` (ambient music, alien voices, derived SFX cuts) are
committed, and every source is attributed with a link to its original video
on [`/credits.html`](https://harryf.github.io/sulkweb/credits.html) — the
page is generated from `audioManifest.ts`, the same data the fetch script
and the game use, so an asset can never ship without its credit. Licensing
posture and per-track tables: `CREDITS.md`.

### Guides

- [docs/architecture.md](docs/architecture.md): how the packages fit together, the frontend/engine boundary (method calls in, `PieceEvents` out, stealer-phase capture/replay), and how to deploy.
- [docs/development-guide.md](docs/development-guide.md): directory map and recipes for adding missions, marine types, objectives, and sounds.
- [docs/asset-index.md](docs/asset-index.md): every asset under `packages/client/public`, what uses it, and the unused list.
- [docs/rules-reference.md](docs/rules-reference.md): the complete game rules as implemented, units, doors, special features, and missions.
- [docs/writing-guide.md](docs/writing-guide.md): rules for all player-visible text.

## Structure

```
packages/
├─ engine/   # Pure rules & AI — no Phaser imports (enforced by test greps)
│  └─ src/{board,core,pieces,rules,ai,missions,events}
└─ client/   # Phaser 3 + Vite front-end
   └─ src/{scenes,ui,audio,manual,utils}  # manual/ builds /manual.html (field manual + SVG maps)
```

## Roadmap state (original M0–M8 plan in `prompts/`)

- ✅ M0–M2: board, engine geometry/LOS, mission render, camera, selection
- ✅ M3: HUD panel, AP counter, minimap
- ✅ M4: doors, overwatch, LOS overlay
- ✅ M5: shooting, close combat, death, blips, AI0
- ✅ M6: phase cycle, CP, turn timer, victory/defeat
- ✅ M7 (fidelity pass 2026-08-15): original mission 1 force (sergeant + heavy
  flamer), sections + flames, original deployment + flame objective, original
  sprites and sounds; deferred: assault cannon, librarian, chain fist, thunder
  hammer, captain/grenades, CAT, ambush counters, marine interrupts — these
  belong to missions 2–6 and beta, queued for the mission-recreation phase
- ✅ M8 (hygiene): clean build, e2e suite, truthful docs
- ✅ Mission recreation 1/6 (2026-08-15): space_hulk_2 "Exterminate" — generalized
  `transcribeMission.ts` pipeline (MISH_*.py → mission JSON), kill-quota +
  entry-blockade victory, one-marine-per-room deployment, kill counter HUD
- ✅ Mission completion (2026-08-15): missions 3–6 + beta 1 COMPLETED with their
  original victory conditions — C.A.T. escort (+ draw state), permanent-cleanse
  dual flame objectives, escape counting, turn-limit defence with destructible
  ducting, per-mission flamer ammo. Autopilot scans: mission 6 wins 10/20 seeds
  (the camp-and-hold fight is winnable even scripted); 3/4/5/b1 lose 20/20
  opposed (the familiar scripted-player pattern — all four win unopposed:
  m3 t17, m4 t7, m5 t11, b1 t12) — and, decisively, OPPOSED wins exist for
  every mission family: beta_1 22/40 and mission 4 8/40 with command-point
  boosted legal play, mission 6 10/20 as-is; missions 3/5 have opposed
  component proofs (cat carried undamaged, marines escaping) with the full
  chains documented as scripted-player limits, not rule defects. CP spending
  is the biggest untapped autopilot lever (0/60 → 22/40 on beta_1).
- ✅ Batch migration (2026-08-15): `scripts/migrateMissions.ts` converted ALL
  remaining originals (space_hulk 3–6, beta 1–2) into structured drafts at
  `engine/src/missions/drafts/` — boards, sections, doors, entries, exits,
  objective squares, ducting, blips, squad rosters, name/info/story, default
  deployments, cross-checked against an independent source reading (zero
  discrepancies). Each draft carries a `todo` list naming its unscripted
  semantics; drafts are NOT registered — the registry stays the playability gate

## Known gaps / residue

- The restored mission is hard, and the scripted autopilot cannot measure HOW hard:
  it loses 60/60 seeds, but the loss funnel shows why — its flamer leads the column
  and dies to close combat on turn 2 in 57 of them (four marines still standing).
  That is a scripted-player limitation (protect-the-VIP escort tactics), not
  balance evidence. The kill chain itself is verified: unopposed, the squad
  delivers the flamer and wins by turn 9. Human winnability with overwatch and
  door discipline is untested. debug_1 stays comfortably winnable.
- Mission 2 is brutal by design ("outnumbered sixty to one") and no scripted
  strategy wins it: entry-post marching, a compact-deployment ablation, and a
  camp-and-overwatch proxy all go 0-for-30, though kills scale with strategy
  quality (means 3.3 → 4.2 → 5.6, best single run 15 of 30). Both win chains
  are verified: the quota fires in a real OPPOSED game (integration test at a
  lowered quota) and the blockade completes unopposed by turn 7. Whether a
  human can reach 30 is untested — the missing marine-interrupt actions (below)
  are the original's main tool for exactly this fight.
- The two marines the original lets the STEALER player place (a bolter and the
  sergeant) deploy at fixed adversarial spots instead — see ISA Decisions.
- Marine interrupt actions (CP spending during the stealer phase) not implemented —
  a real mission-1 marine tool in the original (Space key), and the biggest
  named gap for a human trying to win space_hulk_1.
- Blips spawn ON entry squares instead of lurking off-board in the original's
  entry-triangle limbo (documented simplification; entries sit far from the
  fight). The off-board entry TRIANGLES themselves are now drawn per the
  original, but the limbo squares behind them remain unimplemented.
- FPS measurement deferred (needs a visible-tab recording session).
- Cross-vendor code audit pending — revisit against tag `v0.1` when available.
- `docs/` retains the original Sulk manual; edge rules (parry, autofire, psi)
  arrive with the missions that need them.

## License

Sulk Web is free software, licensed under the
[GNU General Public License v3.0](https://www.gnu.org/licenses/gpl-3.0.html)
(see [LICENSE](LICENSE)) — the same license as the original Sulk game it
recreates. You may copy, modify, and redistribute it under the GPL's terms.
Audio and music assets carry their own licenses, credited in
[CREDITS.md](CREDITS.md). Space Hulk is a trademark of Games Workshop; this
is an unaffiliated fan recreation of the open-source Sulk clone and claims
no rights over Games Workshop's intellectual property.
