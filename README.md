# Sulk Web

A web-based port of the classic turn-based strategy game [Sulk](https://sulk.sourceforge.net/) (a Space Hulk clone, originally Pygame), built with **Phaser 3 + TypeScript** on the client and a **pure-TypeScript rules engine** with no rendering dependencies.

**Status: playable v0.1 slice.** Mission 1 ("Suicide Mission") boots with a five-marine squad, genestealer blips enter from mission entry points, the stealer AI hunts the squad, and the game ends in victory (reach the exit or exterminate) or defeat (squad wiped).

## Play

```bash
pnpm install
pnpm --filter ./packages/client dev   # open http://localhost:5173
```

### Controls

| Input | Action |
|-------|--------|
| Click marine | Select |
| `W` / `S` | Move forward / backward |
| `A` / `D` | Turn left / right |
| `O` | Open/close door ahead |
| `F` | Fire storm bolter at nearest target |
| `C` | Close combat (enemy directly ahead) |
| `V` | Overwatch on/off (2 AP) |
| `U` | Unjam bolter |
| `P` | Spend a Command Point (+1 AP) |
| `L` (hold) | Show line of sight |
| `Enter` / DONE | End marine phase |
| `Esc` | Pause |
| Arrows / drag | Pan camera |
| Mouse hover | Square coordinate + contents in the HUD (below the controls) |

## Rules implemented (per the original Sulk manual in `docs/`)

- AP economy: marines 4 AP, stealers 6 AP (free 90° turns), blips 6 AP omnidirectional
- Facing-relative move costs; occupancy; edge-model doors — a door sits on the
  boundary between two squares (front-3 operate; closed = blocks movement and
  sight across that edge)
- Vision 180° / fire 90° arcs, walls and pieces block LOS
- Storm bolter: 2d6 kill-on-6, sustained fire (+1 per miss, max +3), range 12
- Overwatch reaction fire, jams on doubles, 1 AP unjam
- Close combat: highest die, stealer 3d6 front / 2d6 flank, tie both survive
- Blips: hidden 1–3 stealers, convert the moment they are sighted — including
  when a kill vacates the square that was blocking the sight line; overflow lost
- Turn cycle: CP roll (1d6), marine phase (2:00 timer), reinforcements, stealer AI, victory checks
- Mission 1 carries a finite genestealer force (2 initial + 10 reinforcement blips): win by extermination or by reaching the exit; both outcomes verified (a pinned-seed autopilot win is part of the e2e suite)

## Development

```bash
pnpm --filter ./packages/engine test   # 112 unit tests (rules, AI, game flow)
pnpm --filter ./packages/client test   # HUD + minimap unit tests
pnpm --filter ./packages/client e2e    # Playwright smoke: real browser, no mocks
pnpm build                             # engine tsc + client vite build
pnpm --filter ./packages/engine example  # CLI engine tour
```

The project ISA (`ISA.md`) is the system of record: goals, verified criteria, decisions, and changelog.

## Structure

```
packages/
├─ engine/   # Pure rules & AI — no Phaser imports (enforced by test greps)
│  └─ src/{board,core,pieces,rules,ai,phases,missions,events}
└─ client/   # Phaser 3 + Vite front-end
   └─ src/{scenes,ui,utils}
```

## Roadmap state (original M0–M8 plan in `prompts/`)

- ✅ M0–M2: board, engine geometry/LOS, mission render, camera, selection
- ✅ M3: HUD panel, AP counter, minimap
- ✅ M4: doors, overwatch, LOS overlay
- ✅ M5: shooting, close combat, death, blips, AI0
- ✅ M6: phase cycle, CP, turn timer, victory/defeat
- 🔶 M7 (scoped): Mission 1 playable with storm-bolter squad; deferred: flamer,
  assault cannon, librarian, chain fist, sergeant/captain special rules, CAT,
  ambush counters, marine interrupts, additional missions
- ✅ M8 (hygiene): clean build, e2e suite, truthful docs

## Known gaps / residue

- Balance is first-pass: with the BFS stealer AI (2026-08-14) the scripted
  autopilot wins ~52% of seeds (62/120, fully deterministic scan) and every game reaches a
  decisive result; difficulty is playable but untuned.
- Marine interrupt actions (CP spending during the stealer phase) not implemented.
- FPS measurement deferred (needs a visible-tab recording session).
- Cross-vendor code audit pending — revisit against tag `v0.1` when available.
- `docs/` retains the original Sulk manual; edge rules (parry, autofire, psi)
  are deliberately out of the v0.1 scope.
