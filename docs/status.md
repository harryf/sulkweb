# Project Status

Where the port stands: what shipped, in what order, and what's knowingly missing. The system of record with per-criterion evidence is [ISA.md](../ISA.md); the original milestone specs live in [history/prompts/](history/prompts/).

## Roadmap state (original M0–M8 plan)

- ✅ M0–M2: board, engine geometry/LOS, mission render, camera, selection
- ✅ M3: HUD panel, AP counter, minimap
- ✅ M4: doors, overwatch, LOS overlay
- ✅ M5: shooting, close combat, death, blips, AI0
- ✅ M6: phase cycle, CP, turn timer, victory/defeat
- ✅ M7 (fidelity pass 2026-08-15): original mission 1 force (sergeant + heavy
  flamer), sections + flames, original deployment + flame objective, original
  sprites and sounds
- ✅ M8 (hygiene): clean build, e2e suite, truthful docs
- ✅ Mission recreation (2026-08-15): space_hulk_2 "Exterminate" — generalized
  `transcribeMission.ts` pipeline (MISH_*.py → mission JSON), kill-quota +
  entry-blockade victory, one-marine-per-room deployment, kill counter HUD
- ✅ Mission completion (2026-08-15): missions 3–6 + beta 1 with their
  original victory conditions — C.A.T. escort (+ draw state), permanent-cleanse
  dual flame objectives, escape counting, turn-limit defence with destructible
  ducting, per-mission flamer ammo
- ✅ Batch migration (2026-08-15): `scripts/migrateMissions.ts` converted ALL
  remaining originals (space_hulk 3–6, beta 1–2) into structured drafts,
  cross-checked against an independent source reading (zero discrepancies)
- ✅ beta_2 "Download" (v0.4.x): the exotic armoury — assault cannon
  (sustained fire, autofire, malfunction), chain fist, power-sword sergeant
  (parry), ambush counters with the original bluff odds
- ✅ Full audio (v0.3.x): per-mission ambient music, original SFX set,
  positional volume, motion tracker, generated credits page
- ✅ Deployment phase (v0.5.0, 2026-08-19): pre-mission squad placement with
  battle-order AUTO DEPLOY, per-squad clock, free rotation, roster picking —
  see [rules-reference.md](rules-reference.md) and
  [features.md](features.md#deployment-phase)

## Known gaps / residue

Autopilot numbers below were measured 2026-08-15, before the v0.4.9 melee
buff and the v0.5.0 deployment phase.

- The restored mission 1 is hard, and the scripted autopilot cannot measure HOW
  hard: it loses 60/60 seeds, but the loss funnel shows why — its flamer leads
  the column and dies to close combat on turn 2 in 57 of them (four marines
  still standing). That is a scripted-player limitation (protect-the-VIP escort
  tactics), not balance evidence — and the deployment phase now lets a human
  fix the marching order before turn 1. The kill chain itself is verified:
  unopposed, the squad delivers the flamer and wins by turn 9. debug_1 stays
  comfortably winnable.
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
- The librarian (psi rules) is not implemented; no registered mission needs him.
- Blips spawn ON entry squares instead of lurking off-board in the original's
  entry-triangle limbo (documented simplification; entries sit far from the
  fight). The off-board entry TRIANGLES themselves are drawn per the
  original, but the limbo squares behind them remain unimplemented.
- FPS measurement deferred (needs a visible-tab recording session).
