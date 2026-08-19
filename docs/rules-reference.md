# Rules Reference

The complete rules of Sulk Web as implemented in the engine (`packages/engine/src/`), written as a reference rather than a tutorial. This is the source material for a future player-facing manual or online help. Every number here was read from the engine source; where the port deliberately adapts the original Sulk 0.29 behavior, the adaptation is noted. Verified against the source on 2026-08-16; on any disagreement the engine wins and this file needs updating. The original game's own manual is in `docs/` for comparison; controls are listed in the README.

## The board

- The board is a grid of squares, each `corridor` or `room` (a cosmetic distinction; both play identically). Squares missing from the mission define the walls: pieces cannot enter or see through the gaps between squares.
- Every square belongs to a numbered **section**, the blast unit for flame weapons.
- **Doors sit on edges** between two squares, not on squares. A closed door blocks movement across its edge, blocks any line of sight crossing its edge segment, and stops flame spread. A destroyed door is permanently open and can no longer be operated.
- Some squares carry mission features: entry points (genestealer reinforcements), exit points (marine escape), objective squares, ducting, the download terminal.
- Pieces face one of four directions (up, right, down, left). Blips have no meaningful facing.

## Turn structure

Each game turn runs:

1. **Marine phase.** The player acts with any marines in any order, spending AP and command points, under a real-time clock (below). The phase ends with the DONE button, the Enter key, or clock expiry.
2. **Stealer phase** (automatic). Reinforcement blips spawn at entry points, then every stealer-side piece acts (AI, below), then ambush counters deploy where the mission uses them.
3. **End phase** (automatic). Victory conditions are checked, flames go out, freed sight lines are re-checked, the loose C.A.T. wanders, mission counters tick (download), the turn number advances, every piece's AP refreshes, and a new command point pool is rolled.

Victory checks also fire mid-turn where the original demands it: a kill-quota win lands the moment the quota kill happens, a flame-objective win the moment the objective burns, an escape win the moment the quota marine leaves.

### The clock

The marine phase is timed: **120 seconds, plus 30 for each living sergeant** (either sergeant type). Expiry ends the phase exactly like pressing DONE.

### Action points (AP)

Every piece gets a fixed AP pool at the start of each turn and spends it on actions. Unspent AP is lost. Marines have 4 AP; genestealers and blips have 6.

### Command points (CP)

A fresh **d6 of command points** is rolled at the start of every turn (visible on the roster cards); the unspent remainder of the previous pool is discarded, never banked. Spending is legal only during the marine phase: 1 CP buys **+1 AP for any living marine**, any number of times while the pool lasts.

## Movement

Costs are relative to the piece's facing. There is no entry in a table = the move is illegal for that piece.

| Move (facing-relative) | Marine | Genestealer | Blip |
|---|---|---|---|
| Forward, forward-diagonal | 1 AP | 1 AP | 1 AP |
| Side-step | illegal | 1 AP | 1 AP |
| Backward, backward-diagonal | 2 AP | 2 AP | 1 AP |
| Turn 90° | 1 AP | free* | free (no facing) |
| About-face (180°) | 2 AP | 1 AP | free |

*Genestealer free-turn limit: repeating the same 90° direction twice in a row costs 1 AP the second time; any move or door use in between re-earns the free turn.

Additional movement rules:

- Diagonal moves keep the current facing.
- A move onto an occupied square is illegal. Pieces are solid.
- Flaming squares cannot be entered, except that a piece already standing in flames may move through or out of burning squares.
- An orthogonal move across a closed door edge is blocked. A diagonal move that would squeeze past the end of a closed door (crossing the corner its edge touches) is also blocked.
- Moving costs by the delta relative to facing, so walking backward is expensive; turning first is usually cheaper.

## Vision, line of sight, and fire arcs

- **Vision arc**: the front 180°, everything strictly ahead of the line through the piece perpendicular to its facing, plus that line itself (the piece's own square excluded).
- **Fire arc**: the front 90° cone. Targets exactly on the 45° edges count as inside.
- **Line of sight** is traced center to center. It is blocked by: any intermediate square that is missing or marked as blocking, any intermediate square occupied by a piece (pieces block sight), any intermediate square that is burning (you can see into flames, not through them), and any closed door edge the line crosses — including sight into the square directly behind the door, and including a diagonal line that grazes the door edge's corner (the doorway frame is solid, matching the diagonal-movement corner rule).
- **Seeing** a square = vision arc + clear LOS. **Shooting** a square = fire arc + clear LOS + weapon range (range measured as the larger of the x and y distance).

## Shooting

### Storm bolter (storm-bolter marines, sergeants, chain-fist marine)

- **Aimed shot**: 1 AP, two dice, the target dies if any die is 6 or more. Unlimited ammo, range limited only by LOS.
- **Sustained fire**: each consecutive aimed miss at the same target adds +1 to both dice on the next aimed shot, up to +4. The bonus resets on a kill, on switching targets, and on any move, turn, or door use. Free shots and overwatch shots neither use nor build the bonus.
- **Move-and-shoot**: a move earns one free shot (0 AP). Any other action forfeits it.
- **Jamming**: aimed shots never jam. Overwatch shots and reflex fire jam on any double, which also drops overwatch. A jammed bolter cannot fire until unjammed: **1 AP**.

### Overwatch (bolter-family weapons: storm bolter, both sergeants, chain fist, assault cannon)

- Entering overwatch costs **2 AP** and excludes other actions until cancelled (free) or lost.
- While on overwatch, the marine fires a free reaction shot at **every stealer-side action within his fire arc, clear LOS, and range 12**, resolved with his normal dice but no sustained bonus.
- Any action by the marine (move, turn, door, aimed shot) drops overwatch. A bolter jam drops it too. Nothing else does: **overwatch persists across turns** until the marine acts or jams.
- Reactions target any acting stealer-side piece, blips and ambush counters included (blips rarely expose themselves; counters do it deliberately).
- The heavy flamer cannot overwatch.

### Heavy flamer

- **Shot**: 2 AP and 1 ammo. Targets a **square** (in fire arc, LOS, range 12) and sets its entire section ablaze: flame floods orthogonally from the target within the section, stopped by closed door edges.
- **Ammo 6** (mission 6 overrides to 4). No reloads. The flamer cannot target its own section, and cannot target a square carrying a closed door edge.
- Every piece on a flamed square dies on a **d6 roll of 2+** (marines and stealers alike).
- **Self-destruct**: 1 AP, requires ammo, pressed twice in the UI to confirm. Kills every piece in the flamer's own section outright, himself included, no rolls, and flames every square of the section.
- No overwatch, no move-and-shoot.

### Assault cannon (beta_2)

- **Aimed shot**: 1 AP and 1 round, three dice, kill on any die of **5+**. Sustained fire lowers the requirement by 1 per consecutive aimed miss at the same target (maximum 4, floor of 1). Move-and-shoot applies (the free shot builds no bonus).
- **Ammo**: a 10-round drum plus **one reload** (4 AP) that restores it.
- **Autofire**: 2 AP and 5 rounds. Every unit the cannon can see in its fire arc, stealer-side pieces, closed doors, and even fellow marines, takes three dice with kills on **3+**; the sweep then repeats, because each kill can open sight to the next rank, until a full pass kills nothing.
- **Malfunction**: once more than 10 shots have been fired, rolling a triple on the three dice wrecks the gun: each adjacent piece dies on a d6 of 4+ (marines survive on anything under 5, their armour counts), and the cannon marine dies with it.
- Overwatch uses cannon dice and cannot jam; the malfunction is the cannon's failure mode.

### Shooting doors

A closed door can be destroyed by fire, permanently:

- Storm bolter: 1 AP (or the free move-and-shoot shot), two dice, destroyed on any 6. Sustained fire accrues against the door like any target.
- Assault cannon: 1 AP and 1 round, three dice, destroyed on 5+ (sustained lowers it); autofire also shreds every closed door it can see on 3+.
- The chain fist (below) cuts doors without dice.
- A marine standing at the door's edge can always shoot it point-blank even though the edge square is outside his fire arc.
- In the client, F targets in priority order: the hovered closed door, else the nearest enemy in sight, else the nearest shootable closed door. A red reticle marks whatever F would currently hit (the targeted stealer or the door), so the shot is never a surprise.

### Chain fist (beta_2)

A storm-bolter terminator whose powered blade **cuts the door directly ahead apart for 1 AP**, no roll, permanently destroyed. Otherwise fights as a storm-bolter marine.

## Close combat

- Costs the **attacker 1 AP**; the target must be on the square **directly ahead**.
- Dice: a genestealer rolls **3 dice against an opponent in its front 180°, 2 dice otherwise**. A marine rolls **1 die**; sergeants add **+1 to every close-combat die**. Highest single die wins.
- Outcomes:
  - Attacker's best die higher: the defender dies, facing irrelevant.
  - Defender's best die higher: the attacker dies only if the defender could strike back (attacker directly ahead of the defender); otherwise the attacker survives and the defender spins to face it.
  - Draw: both survive; the defender spins to face the attacker.
- **Parry** (power-sword sergeant, beta_2): when losing, or tied against an opponent already at its maximum possible score, the sword forces the opponent's best die to be removed and rerolled; the new result stands even if lower. The parry works both when the sergeant attacks and when he defends against an attacker directly ahead. A beatable tie is not parried (the draw stands rather than gambling).

## Doors

- **Operating**: 1 AP toggles a door reachable ahead: the edge to the square directly ahead wins; otherwise any door edge touching one of the three squares ahead (straight, front-left, front-right). Edges purely behind the piece are unreachable.
- Closed doors block movement, sight, flame spread, and overwatch lines.
- The stealer side opens doors on contact for 1 AP, ignoring facing; it never closes them.
- **Destruction** (permanent, the door can never close again): chain-fist cut, aimed bolter 6s, aimed cannon 5+, cannon autofire 3+.

## Units

| Unit | AP | Weapon | Key numbers |
|---|---|---|---|
| Storm-bolter marine | 4 | Storm bolter | 2 dice, kill 6+; sustained +1/miss (max +4); overwatch 2 AP, range 12; jam on overwatch doubles; unjam 1 AP |
| Sergeant | 4 | Storm bolter | As above, +1 on close-combat dice, +30 s phase clock while alive |
| Power-sword sergeant | 4 | Storm bolter | As sergeant, plus the parry |
| Heavy-flamer marine | 4 | Heavy flamer | 2 AP + 1 ammo per shot, 6 ammo, range 12, section blast, kill 2+; self-destruct 1 AP; 1 die in CC |
| Assault-cannon marine | 4 | Assault cannon | 3 dice kill 5+; 10-round drum + 1 reload (4 AP); autofire 2 AP + 5 rounds, kill 3+, hits everything visible; malfunction on triples after 10 shots |
| Chain-fist marine | 4 | Storm bolter + chain fist | Bolter as above; cut door ahead 1 AP, no roll |
| Genestealer | 6 | Claws only | CC 3 dice from front / 2 from side or rear; free 90° turns (repeat rule); cannot shoot |
| Blip | 6 | None | Hidden value 1-3; 1 AP any direction; cannot fight; sight rules below |
| Ambush counter | 6 | None | beta_2 only; decoy blip, rules below |

### Blips

- A blip is a sensor contact hiding **1 to 3 genestealers**. Values are drawn from the original blip bag: 8 ones, 4 twos, 9 threes (a 21-counter bag drawn with replacement), so the average blip hides about 2 stealers.
- Blips move any direction for 1 AP but may **never voluntarily enter a square any marine sees, or a square adjacent (8-way) to a marine**. The AI also refuses to open a door that would expose the blip to sight.
- **Conversion**: the moment any marine sees a blip, it converts, immediately and at any point in either phase (moves, turns, door toggles, deaths, and flames all re-check sight). One stealer appears on the blip's square, the rest on free adjacent squares; stealers that do not fit are **lost and score nothing**.
- **Voluntary conversion** is legal only while the blip has taken no action this turn; the AI uses it when blocked with marines within 6 squares, so the stealers inside can charge from cover next turn.
- Stealers born from a conversion during the stealer phase do not act in that same phase: the phase's acting list is fixed when it starts.
- A blip killed as a blip (flames, autofire) credits its **full hidden value** toward kill quotas. A converted blip is not a death and credits nothing.

### Ambush counters (beta_2)

- With the mission flag set, the stealer side keeps up to **two** counters on the board, deploying one at the end of each stealer phase on a random legal square: passable, unoccupied, **no marine within 6 walking squares, no marine line of sight**.
- Counters look like blips but move **freely**, straight into marine sight, which is the point. Two in three are **false alarms** (real on a d6 of 5+, drawn when the counter deploys).
- When sighted: a **real** counter converts to one genestealer; a **fake** one vanishes, and every overwatching marine who saw it reflex-fires at nothing. Reflex fire can **jam a bolter** on a double, and costs the assault cannon **a round plus a malfunction check**.
- A fake counter destroyed by fire scores nothing (its value is 0); a real one scores 1.

## Flames

- A flamer shot floods the target's section orthogonally from the target square, stopped by closed door edges, and sets those squares alight.
- Every piece on an ignited square dies on a d6 of **2+** (self-destruct kills without a roll). A loose C.A.T. in the blast is destroyed outright.
- Flaming squares block entry, except for pieces already standing in flames, which may move through or out of burning squares.
- **All flames go out in the end phase** of the same turn. A flame-objectives square that burned stays permanently "cleansed" for the mission objective even after the flames clear.

## Special mission features

### C.A.T. (mission: space_hulk_3 "Rescue")

A neutral crawling recorder. Board-level object, it never blocks a square.

- A **marine entering its square picks it up**; it then moves with the carrier.
- If the carrier dies, the C.A.T. drops where he fell (dropping into flames destroys it).
- A **stealer entering the loose C.A.T.'s square skewers it**: the first hit marks it damaged, the second destroys it. Destruction is an immediate marine loss.
- Flames destroy a loose C.A.T. outright.
- While **loose and undamaged**, it wanders up to 3 squares in every end phase, refusing occupied or flaming squares.
- A carrier escaping through an exit takes it off the board: a **win** if the C.A.T. is undamaged, a **draw** if damaged.

### Ducting (mission: space_hulk_6 "Defend")

Destructible features on three marked squares. A **stealer stepping onto intact ducting tears it out**, an immediate marine loss. The stealer AI actively paths toward intact ducting. A heavy flamer **firing while standing inside the control room** wrecks a piece of ducting itself, the original's own booby trap, reproduced.

### Download terminal (mission: beta_2 "Download")

One Data Room square. A sergeant (either type) standing on it at the end phase **begins the download**; each further end phase he remains decrements a counter that starts at 4. The counter **resets** if he leaves the square (turning in place is safe), if anyone else occupies it, or if it stands empty. Counter at zero wins; losing both sergeants loses immediately.

### Entry and exit points

- **Entry points**: off-board arrows where reinforcement blips spawn each stealer phase, round-robin across entries, skipping occupied ones. Spawning stops when the mission's total budget (`totalBlips`) is exhausted; most missions are uncapped.
- **Exit points**: in escape-family missions (`escape-count`, `escort-cat`), a marine ending a move on an exit square immediately leaves the board and counts toward the escape quota. In `reach-exit` missions the marine wins by standing on the exit instead.

## The stealer phase (AI behavior)

The stealer side plays as a **hive**: before any piece moves, a side-level plan (`ai/hive.ts`) reads the board and assigns each piece a role for the turn.

**The threat map.** The hive marks every square an un-jammed overwatching marine could shoot (fire arc + line of sight + range 12: the *kill zones*) and every square any marine sees. Pathing pays a heavy toll to enter a kill zone and a small one to be seen, so the horde routes around watched corridors and approaches through the dark. The map is recomputed as pieces act: a death, a door, or a body in a corridor changes it mid-phase.

**Roles.**

- **Assault**: charge (threat-weighted path) and fight. Everyone assaults when nothing threatens, when the wave is launched, or when the piece is already exposed. The moment a lone watcher's bolter **jams**, his kill zone vanishes and the horde floods the lane at once.
- **Stage**: advance to a hidden, unwatched square near the squad and hold. The buildup masses in territory the marines don't control, split across up to three genuinely separated approach directions so the squad must cover several at once. A staging piece beside an open door a marine watches through **shuts it** (1 AP) when that takes its side dark.
- **Block**: when a cohort is sealed off (every route crosses a fire lane), one stealer is spent. It walks straight into the lane, soaks the reaction burst (each forced shot is a jam chance), and **parks on the first watched square it survives**. Bodies block line of sight, so the corridor behind it goes dark and the mass builds up there. It holds until the wave goes.
- **Straggler hunt**: a marine separated from every squad-mate draws the nearest pieces onto him regardless of the wave state.

**Waves and the mission clock.** The hive masses until the staged force can swamp the squad (about twice the living marines; a hidden blip counts as two). Patience is keyed to growth: while reinforcements keep the wave growing it keeps massing, but three turns without growth, six turns of massing in total, or an exhausted blip budget launches it. The hive also knows WHERE the marines are heading — the mission's destination squares (objective points, exits, the data room, blockade entries), never the win rules — and reads the closest marine's distance to them as the time it has left. Waves shrink to fit that clock ("enough" is whatever is staged when only one wave is possible), hidden squares near the destination count as staging ground (the buildup becomes the roadblock), and a marine within four squares of his goal flips the whole hive reckless: everyone attacks, luck included. A launched wave strikes nearest-first, so the column unwinds front-to-back with the lead body shielding the ones behind.

**Hunger and pinning.** Attacking is the default; the hive only adds patience where patience pays. An unstaged piece that has sat still for three turns stops waiting and attacks, and a blip stuck that long (typically the queue head legally refusing a door that would expose it) converts at the next launch — the stealers inside have no such caution and unjam the whole column. Pieces holding hidden INSIDE the strike ring are exempt: a pair of them coiled on a flank pins the marines into covering that approach for almost nothing, until a wave brings them in.

**Blood in the water.** Once the squad takes losses, the hidden ring tightens (from eight squares down to four at half strength) and waves get cheaper — the whole pack creeps closer, still out of sight, so the strike lands from every direction at once.

**Fighting.** A charge into an overwatched corridor weaves through side alcoves, stepping out of the fire lane between advances — one reaction burst instead of one per square. In close combat, an adjacent un-jammed overwatcher dies before anyone else: he is the wave-breaker.

**Entries.** Reinforcements arrive strategically: entries a marine watches are used last, the bulk comes through the three entries nearest the marines' destination (rotated each turn), and every third turn one blip spawns at the entry nearest the marines instead — a cheap feint that keeps a standing threat on their flank.

**Per-piece execution** (unchanged from AI0):

1. A stealer with a marine directly ahead (or reachable by turning) **attacks in close combat**, repeatedly while AP lasts.
2. A stealer adjacent to the loose C.A.T. or intact ducting steps onto it (skewer / tear out).
3. Otherwise the piece steps along its role's path. Closed doors count as traversable; the piece opens them on contact (1 AP). Pieces queued behind a friend wait rather than burn AP.
4. Blips obey their no-sight/no-adjacency bars while pathing; a blocked, unacted blip with marines within 6 squares converts voluntarily.
5. **Every stealer-side action triggers overwatch reactions** from every overwatching marine who can see the actor, before its next action.

Sight is re-checked after every action, so a step, an opened door, or an overwatch kill can convert blips mid-phase.

The AI reads the full board state: it always knows where every marine is (and who is overwatching or jammed) and plans accordingly. The only information rule it respects is the blips' own no-sight constraint; there is no hidden-information model beyond blip values. The hive draws no dice: its choices are functions of the board alone, so a seeded game replays identically.

## Victory objectives

The mission's `objective` field selects the rule. In all of them, a wiped squad loses (in `escort-cat` this is an adaptation: the original could leave the game hanging with the C.A.T. uncarryable).

| Objective | Marines win when... | Marines lose when... |
|---|---|---|
| `exterminate` | No stealer-side pieces remain | Squad wiped |
| `reach-exit` | Any marine stands on an exit square | Squad wiped |
| `exterminate-or-exit` | Either of the above | Squad wiped |
| `flame-objective` | The objective square is set alight | No living flamer has ammo |
| `kill-quota` | Stealer casualties reach the quota (blips count their hidden value), or every entry square has a marine within 6 walking squares (blockade) | Squad wiped |
| `escort-cat` | A carrier exits with the undamaged C.A.T. (damaged = draw) | C.A.T. destroyed, or squad wiped |
| `flame-objectives` | Every objective square has burned at least once (permanently cleansed) | No living flamer has ammo |
| `escape-count` | Escaped marines reach the quota | Living + escaped marines drop below the quota |
| `defend` | The end phase of the turn limit is reached | Any ducting destroyed, any control-room square set alight, or squad wiped |
| `download` | The download counter reaches zero | No sergeant of either type alive |

## The missions

All nine registered missions, transcribed from the original game's sources. Reinforcements are per stealer phase and uncapped unless noted.

| Mission | Name | Objective | Squad | Blips (start / per turn) | Specifics |
|---|---|---|---|---|---|
| `debug_1` | Suicide Mission with no forces | exterminate-or-exit | 1 storm bolter | 0 / 1, capped at 10 total | The default mission: a one-marine training scenario |
| `space_hulk_1` | Suicide Mission | flame-objective | 3 bolters, sergeant, flamer | 2 / 1 | Burn the Launch Control square (20,20); the flamer's 6 shots are the mission clock |
| `space_hulk_2` | Exterminate | kill-quota | 3 bolters, sergeant, flamer | 0 / 2 | Quota 30; squad Constantine deploys scattered one marine per room; blockade win applies |
| `space_hulk_3` | Rescue | escort-cat | 6 bolters, 2 sergeants, 2 flamers | 0 / 3 | Squads Abel and Ilyich; C.A.T. starts at (28,13); damaged C.A.T. escape is a draw |
| `space_hulk_4` | Cleanse and Burn | flame-objectives | 6 bolters, 2 sergeants, 2 flamers | 0 / 2 | Two Gene Bank squares to cleanse; both flamers are the mission's ammunition |
| `space_hulk_5` | Decoy | escape-count | 6 bolters, 2 sergeants, 2 flamers | 3 / 2 | Five of ten marines must exit; dropping below five living + escaped loses |
| `space_hulk_6` | Defend | defend | 6 bolters, 2 sergeants, 2 flamers | 2 / 2 | Survive to end of turn 16; three ducting squares; flamers carry only 4 shots; flaming inside the control room loses |
| `beta_1` | Messenger | escape-count | 3 bolters, sergeant, flamer | 2 / 1 | Any one marine out through the far exit |
| `beta_2` | Download | download | 5 bolters, sergeant, sword sergeant, cannon, chain fist, flamer | 1 / 2 | The full armoury; hold the Data Room (12,22) for 4 quiet end phases; ambush counters active |

## Determinism

All randomness (attack dice, blip values, C.A.T. wander, ambush placement) flows through one dice source on the board. With a seeded source, an entire game replays identically, which is how the test suites script exact battles. There is no hidden randomness outside the dice stream. The marine-phase clock does not touch it: time consumes no dice, so the same actions produce the same game regardless of how fast the player takes them.
