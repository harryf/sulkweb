# Gameplay log format

Every finished mission offers a **Download game log** button in the end dialog
(with an optional debrief-notes field). The saved JSON is a complete, ordered
record of the game: the raw material for improving the stealer AI by analyzing
many real games per mission and extracting rules that are **mission-generic**
(no per-mission intelligence is ever embedded in the AI itself).

Filename: `sulk-log_<missionKey>_<YYYY-MM-DD_HH-MM-SS>.json` (local wall
clock), so a collected corpus stays unique and sorts chronologically.

Recorder: `packages/engine/src/log/GameLogger.ts`, attached in the GameScene
constructor for real missions (never for the homepage attract backdrop). It
taps the engine's raw event stream at emit time, so the animated stealer-phase
replay is never double-counted and events appear in true chronological order.

## Top-level shape

```json
{
  "meta": { ... },
  "initialPieces": [ ... ],
  "events": [ ... ],
  "notes": "free text typed by the player in the end dialog"
}
```

## meta

| field | meaning |
|---|---|
| `formatVersion` | schema version of this file, currently `1` |
| `mission` | mission REGISTRY key (`space_hulk_1`), the grouping key for analysis |
| `missionName` | display title ("Suicide Mission") |
| `seed` | the `?seed` pin as a number, or `null` for an unseeded game |
| `version` | app build (`v0.5.1`, `latest-<sha>`, or `dev`) |
| `startedAt` / `endedAt` | UTC ISO timestamps (attach time / gameOver time) |
| `result` | `win`, `loss`, `draw`, or `null` if the game never ended |

## initialPieces

Board layout at logger attach time: `{ id, kind, sprite, x, y, facing }` per
piece. `kind` is coarse (`marine` / `stealer` / `blip`); `sprite` carries the
weapon identity (`terminator_heavy_flamer`, ...). Later arrivals show up as
`pieceAdded` events; deployment-phase placements as `pieceMoved` events with
`phase: "Deploy"`.

## events

Each entry is an envelope plus the raw payload of one engine event:

```json
{ "seq": 41, "turn": 3, "phase": "StealerAction", "type": "shot",
  "shooterId": "p_2", "targetId": "p_9", "x": 12, "y": 7,
  "rolls": [5, 2], "hit": true }
```

- `seq`: monotonic, gap-free sequence number (exactly-once guarantee).
- `turn` / `phase`: engine state at the moment the event fired.
- `type` + payload: any `PieceEventsType` entry except the two UI-noise types.
  The authoritative payload reference is
  `packages/engine/src/events/PieceEvents.ts`.

Recorded types include `pieceMoved`, `shot` (with actual dice rolls),
`closeCombat` (both sides' rolls and the outcome), `pieceDied`, `pieceAdded`,
`blipConverted`, `doorToggled`, `doorDestroyed`, `overwatchChanged`, `jammed`,
`sectionFlamed`, `flamesCleared`, `ammoChanged`, `casualtiesChanged`,
`marineEscaped`, `cat*`, `objectiveCleansed`, `ductingDestroyed`,
`malfunction`, `downloadChanged`, `phaseChanged`, `cpChanged`, `gameOver`.

Deliberately skipped: `selected` (pure UI selection chatter) and `apChanged`
(one tick per AP spend; derivable from the logged actions).

Because shot and combat events embed their actual dice rolls, hit-rate and
lethality analysis never needs to re-simulate; and for seeded games the whole
run is reproducible from `meta.seed` alone.

## Analysis sketches

```bash
# Kill locations across a corpus of mission-1 logs
jq -r '.events[] | select(.type == "pieceDied") | "\(.x),\(.y)"' sulk-log_space_hulk_1_*.json | sort | uniq -c

# Marine survival by turn
jq '[.events[] | select(.type == "pieceDied" and .kind == "marine") | .turn]' sulk-log_*.json

# Overwatch effectiveness: shots fired during the stealer phase
jq '[.events[] | select(.type == "shot" and .phase == "StealerAction")] | group_by(.hit) | map({hit: .[0].hit, n: length})' sulk-log_*.json
```

The end goal: aggregate many logs per mission, find where stealers die without
trading, which approaches never worked, and how human players describe the AI
in their notes, then turn those findings into generic hive-AI rules that apply
to any mission.

## Corpus caveats

- **Autopilot games can carry a spurious `win`.** The marine autopilot calls a
  victory check after every move; on a mission whose board is momentarily
  empty of stealers (debug_1 turn 1), `exterminate-or-exit` reads that as
  exterminated. Human play never triggers this path (victory is only checked
  at phase boundaries, after reinforcements spawn). Filter suspect records
  with: result `win` + zero `pieceDied` + gameOver in turn 1.
- **Planned for formatVersion 2** (when stealer-AI work begins): hive intent
  events (chosen role/target and runner-up per piece, wave decisions) and a
  per-turn canonical board hash for replay-equivalence checks. Both live
  inside the AI decider, which this version deliberately leaves untouched so
  the corpus predates the changes it will justify.
