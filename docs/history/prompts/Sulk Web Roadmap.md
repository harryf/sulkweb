# Sulk Web Roadmap

### Road-map to **Sulk Web v0.1**

Below are the nine milestones (M0 – M8).

Each is self-contained and includes expected deliverables plus how you’ll know it’s finished.

---

## M0 “Hello Board” *(½ day)*

| Goal | Deliverables | Verification |
| --- | --- | --- |
| **Boot & draw a dummy grid** | `GameScene.ts` that loads `square_corridor.png` and tiles a 10 × 10 board (fixed camera). | Browser shows grid, no console errors. |
| **Continuous build** | Vite dev server, ESLint + Prettier, Vitest running zero tests. | `pnpm run dev` hot-reloads; `pnpm run test` green. |

---

## M1 “Pure Rules Core” *(~4 days)*

| Goal | Deliverables | Verification |
| --- | --- | --- |
| **Geometry & LOS** | `board/` module with `Square`, `Section`, `Board`, `seeable()` path-finder. | Jest: 100 % pass on LOS truth-table. |
| **Pieces / Features (minimal)** | `Piece` base (move/turn only) and `Feature` base with `Door` logic. | Unit tests cover movement cost & door open/close rules. |
| **Turn-phase skeleton** | `phases/ClockAndCP`, `MarineAction`, `StealerAction`, `EndPhase` created but empty. | Engine can advance phase chain with no pieces. |
| **Mission loader** | Parse one JSON mission with board only. | `new GameEngine(mission).state.board.squares.length > 0`. |

---

## M2 “Render & Pan” *(~3 days)*

| Goal | Deliverables | Verification |
| --- | --- | --- |
| **Render real mission** | Convert `MISH_space_hulk_1` to JSON and feed to Board renderer. | Map shows correct corridor/room layout. |
| **Camera & mini-map** | Arrow/WASD pans; mini-map box follows. | No blank gaps; box stays in mini-map rect. |
| **Square selection** | Pointer click toggles green Hi-Lite sprite. | Highlight tracks camera; second click removes it. |

---

## M3 “Pieces & Movement” *(~4 days)*

| Goal | Deliverables | Verification |
| --- | --- | --- |
| **Storm-Bolter Marine** | Movement/turn rules, AP pool, sprite facing rotations. | Move with keyboard, AP decrements, can’t enter walls or exceed AP. |
| **Piece selection handler** | Click piece → outline; arrow keys move. | Selection icon follows piece after move. |
| **AP HUD** | Bitmap-text counter in HUD layer. | Counter matches internal `apRemaining`. |

---

## M4 “Doors, Overwatch, LOS” *(~4 days)*

| Goal | Deliverables | Verification |
| --- | --- | --- |
| **Door interaction** | Use-door button + action handler. | Door toggles, board LOS updates accordingly. |
| **LOS debug overlay** | Hold *L* key draws line & highlight visible squares. | Manual test with different angles. |
| **Overwatch toggle** | Press overwatch button sets marker, disables other actions. | Marker appears, actions rejected until cancelled. |

---

## M5 “Shooting & Close Combat” *(~6 days)*

| Goal | Deliverables | Verification |
| --- | --- | --- |
| **Weapon system** | Dice rolls, fire bonus logic. `shoot`, `cc` methods complete. | Jest: hit/miss distribution, CC outcomes. |
| **Flash animation & ammo** | Muzzle flash sprite, AP & ammo deducted. | Visual flash + ammo counter decrements. |
| **Death handling** | Remove sprite, casualty counter, scroll message. | Stealer dies when shot, casualty++ displays. |
| **AI0 basic** | Stealer deploys & moves randomly, converts blips when seen. | Playthrough: AI blips appear, move, convert on LOS. |

---

## M6 “Phase Cycle & Turn Timer” *(~3 days)*

| Goal | Deliverables | Verification |
| --- | --- | --- |
| **ClockAndCP + timers** | HUD turn-timer, CP clock, Done button fully wired. | Timer counts down; Done ends phase early. |
| **Victory check** | All marines dead → defeat, all stealers dead → win. | Manual playtest kills all enemies, post-game dialog appears. |

---

## M7 “Feature-complete Alpha” *(~6 days)*

| Goal | Deliverables | Verification |
| --- | --- | --- |
| **Remaining piece types** | Flamer, Assault Cannon, Librarian, Chain-Fist, Captain, CAT, Ambush counter. | Each special rule unit-tested; manual sandbox mission exercises abilities. |
| **Mission flags & deployment phases** | Support `CAT`, `USE_AMBUSH_COUNTERS`, marine & stealer deployment UI. | Mission 1 deploys correctly; Ambush dialog appears when allowed. |
| **AI polish** | A* route finder, ambush placement heuristic, CC prioritisation. | AI reaches Marines, uses CC sensibly, places counters away from LOS. |
| **Pause/Options UI** | ESC menu, sound/theme toggles, save JSON state. | Pause stops timers; reload state restores board. |

---

## M8 “Public v0.1 Release” *(~2 days)*

| Goal | Deliverables | Verification |
| --- | --- | --- |
| **Full QA pass** | Play all six Space-Hulk missions start-to-finish. | Issue tracker zero critical bugs. |
| **Docs & deploy** | README, GitHub Pages/Netlify pipeline, version tag `v0.1.0`. | Fresh clone + `pnpm i && pnpm run build` produces deployable bundle. |