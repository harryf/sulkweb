# Game Features

What's in the game, mission by mission and system by system. For the rules as implemented (AP costs, dice, blips, doors, victory conditions), see [rules-reference.md](rules-reference.md); for the player-facing version with maps, read the deployed [field manual](https://harryf.github.io/sulkweb/manual.html).

**The entire original campaign is playable.** Nine missions transcribed from the original game's sources (`data/missions/<family>/MISH_*.py`).

Opening the bare app URL (`http://localhost:5173/`) shows the **homepage**: a title overlay with an intro, the mission-select list, credits, and a link to the **field manual** (`/manual.html`, friendly rules with TypeScript-rendered maps of every mission), over a dimmed attract-mode board. During a mission an **Abort mission** button (two-click confirm) returns to the homepage, and the end-of-mission dialog offers **Retry** or **Choose another mission**.

## The missions

- **`debug_1`**: "Suicide Mission with no forces", one storm-bolter marine
  vs a one-blip-per-turn trickle (adapted reach-the-exit objective). A training
  scenario, kept off the mission-select list.
  `http://localhost:5173/?mission=debug_1`
- **`space_hulk_1`**: the ORIGINAL scenario; 3 storm bolters, a sergeant and a
  heavy flamer deploy in the north corridor and must fight across the hulk to
  **set the Launch Control room on fire**. Defeat the moment the flamer marine dies
  or runs out of ammo (6 shots; self-destruct also wins if he's inside the room).
  Reinforcements are uncapped, exactly like the source.
  `http://localhost:5173/?mission=space_hulk_1`
- **`space_hulk_2`** "Exterminate": a fresh 204-square board. Squad Constantine
  (3 storm bolters + sergeant + heavy flamer) starts scattered (one marine per
  room, per the original deployment rule) against two blips a turn, uncapped.
  Win by **killing 30 stealers** (a dead blip counts its hidden 1–3 value) or by
  **blockading every entry** (a marine within 6 squares of each); lose when the
  squad is wiped. The HUD shows the running toll (`Kills: n/30`).
  `http://localhost:5173/?mission=space_hulk_2`
- **`space_hulk_3`** "Rescue": two squads escort the **C.A.T.** (a neutral
  crawling recorder that wanders on its own until a marine scoops it up) off
  the board through an exit. Stealers reaching the loose C.A.T. skewer it:
  once = damaged (escaping then is only a **draw**), twice = destroyed (defeat).
- **`space_hulk_4`** "Cleanse and Burn": two squads, two heavy flamers, two
  **Gene Banks** to burn. A flamed objective is permanently *cleansed*; lose
  the moment no living flamer has ammo.
- **`space_hulk_5`** "Decoy": get **five of ten marines out** through the
  single exit; lose when the squad drops below five.
- **`space_hulk_6`** "Defend": survive to the **end of cycle 16** while
  protecting the ducting (a stealer stepping on it tears it out, instant
  defeat) and keeping the control room unburnt. Flamers carry only 4 shots
  here, and firing one from inside the control room wrecks the ducting,
  exactly the source's own booby-trap.
- **`beta_1`** "Messenger": get any one marine out through the far exit.
- **`beta_2`** "Download": the full exotic armoury. A sergeant must HOLD the
  **Data Room** square through four quiet cycles (moving resets the
  counter) while the squad covers him with the **assault cannon** (3 dice,
  kill on 5+, 10 rounds + one reload, 2-AP AUTOFIRE that shreds stealers,
  doors and even battle-brothers, and can catastrophically MALFUNCTION), the
  **chain fist** (cuts doors apart for good), the **power-sword sergeant**
  (parries the best enemy die) and the heavy flamer. The stealers seed
  **ambush counters** behind your lines: two in three are bluffs that bait
  your overwatch into wasted fire, jams, and cannon mishaps.
  `http://localhost:5173/?mission=beta_2`

Blips enter from the mission entry points, refuse to expose themselves (converting
from cover like the originals), the stealer AI hunts the squad, and the original
sounds play throughout.

## Deployment phase

Every mission opens with a deployment phase: the squad waits in reserve and the
mission's deployment squares carry an X while free. Click a square to place the
next marine of that squad (or click his roster card first to pick him
specifically), click a placed marine to lift him back up, and spin him with
`A`/`D` for free. AUTO DEPLOY fills the line in battle order (bolter on point,
sergeant second, heavy weapon third); START, Enter, or the deployment clock
(90 seconds per squad) auto-deploys the rest and starts the mission, and the
game clock starts with it. `?deploy=0` skips the phase for quick testing.

## The clock (2.x)

There are no turns. The game runs on a fixed clock: one **tick** every 250 ms,
forty ticks to a **cycle** (10 s). Every marine regenerates **1 AP every three
ticks** (0.75 s) up to his pool of 4; genestealers and blips regenerate **1 AP
per half second** up to 6, so the swarm is half as quick again as the squad
and the squad answers with firepower. Every rule the original ran once a turn (reinforcements, the
command-point roll, the C.A.T. wander, the download counter, ambush counters,
the defend turn limit) now fires once a cycle, at its own moment inside it,
so the hulk never beats like a metronome. Overwatch is a standing order: it
persists until the marine acts, jams or dies, fires a free reaction shot at
every stealer action in its arc, and never more than one shot every two ticks.
Flames burn for one cycle from the moment they are lit.

A marine you are not steering steers himself: he unjams, shoots what he can
see, turns to face the nearest threat he has a sight line to in any
direction (blips included; a closed door hides), even off overwatch when the
turn would bring it into his line of fire, closes a door a stealer is looking
through, and otherwise faces whichever way covers the most squares and goes
on overwatch with two AP. He never
opens a door and never walks toward the objective on his own; the heavy
flamer holds his fuel unless a stealer comes within two squares of a section
nothing friendly stands in. A marine you have just steered is left alone for
two seconds.

**Orders (2.x stage 2).** Right-click a square with a marine selected and he
walks there on his own, opening doors on the way, and holds when he arrives;
Shift right-click and he goes on overwatch on arrival; right-click a closed
door and he goes and opens it. An order is standing intent: the marine keeps
shooting what he can see and fighting what reaches him while he walks, and
turns toward a stealer he could bring into his fire arc. A ring on the target
square (gold for hold, blue for overwatch, an orange bar on a door) shows the
order; his roster card reads MOVE, DOOR, OW or HOLD. Any key you press takes
the wheel back and drops the order. A square another marine stands on is
reached when he stands next to it, so "go to him" resolves. For tuning without
a rebuild, `?tick=<ms>` sets the tick and
`?tuning=regen.marine:3,overwatchCooldown:1` overrides the real-time
constants (see `TUNING` in the engine); `?tick=0` stops the clock and hands
it to `window.sulk.step(n)`, which is how the e2e suite drives a game.

**Squad orders (2.x stage 3).** Tab selects a squad (the selected marine's,
then the next squad on each press); every member gets a ring in the squad
colour and the roster row lights up. Right-click a square and the squad
defends that section: each marine walks to a post that covers one of its
entrances and goes on overwatch there, the assault cannon on the longest
lane, the flamer tucked inside facing the nearest way in; under fire the nearest
post fills first while the others hold on overwatch, then the rest go. Marines
moving under a squad order keep their overwatch on the way and fire at what
crosses their front. A marine you order or steer yourself leaves the squad's
plan until you let him be for a cycle. Shift right-click
and the squad advances there in a column, two squares at a hop, the rear
marine on overwatch facing the way you came until the column pulls away
from him; a stealer closing in stops the whole column on overwatch, facing it, until it is dealt with.
Right-click a closed door and two marines take positions that fire through
it, a third goes and opens it, the flamer waits a square behind him. Esc
drops the order (and the squad selection). The target carries a marker in
the squad colour (a double ring for defend, a ring with a chevron for
advance, a bar on the door edge for clear), each marine's own post shows as
the same ring shape in that colour, the squad row reads DEFEND, ADVANCE or
CLEAR, and his card reads the squad word while he is on the squad's business
(his own MOVE or DOOR first). Orders reach the squad through its sergeant:
with him alive they take effect at once; without him they arrive two
seconds late and every marine acts on his own (holds where he stands, walks
to the target alone, the nearest one opens the door). A marine you steer
yourself keeps his ground for a cycle before the squad plan takes him back.
Space is the command pause: the clock stops, the board stays readable,
right-click orders, Tab and Esc still work, and the keys that move a marine
wait until Space resumes.

## Controls

| Input | Action |
|-------|--------|
| Click marine / roster card | Select (card click also pans the camera to him) |
| Right-click square | Order the selected marine: walk there (doors opened on the way), then hold |
| Shift + right-click square | Order: walk there, then overwatch |
| Right-click closed door | Order: go and open it |
| `Tab` | Select the selected marine's squad, then the next squad on each press (rings on every member; Cmd/Ctrl/Alt+Tab stay with the browser) |
| Right-click square (squad selected) | Squad order: defend that section (posts covering every entrance) |
| Shift + right-click square (squad selected) | Squad order: advance there in a column with a rear guard |
| Right-click closed door (squad selected) | Squad order: clear it (two cover, one opens, the flamer waits behind) |
| `Esc` (squad selected) | Squad order: hold (drops the order and the squad selection) |
| `Space` | Command pause: the clock stops, orders (right-click, Tab, Esc) still go, direct-control keys wait; Space resumes |
| `1`-`0` | Select marine by number: 1-5 the first squad, 6-0 the second (shown as `[n]` on his card; dead marines' keys go inert) |
| `W` / `X` | Move forward (1 AP) / backward (2 AP) |
| `Q` / `E` | Move diagonally forward-left / forward-right (1 AP, facing kept) |
| `Z` / `C` | Move diagonally back-left / back-right (2 AP, facing kept) |
| `A` / `D` | Turn left / right |
| `S` (or `H`) | Open/close door ahead |
| `F` | Fire at the nearest target, or at a closed door under the cursor (bolter destroys on a 6, assault cannon on 5+) |
| `F` (heavy flamer) | First press arms targeting: valid squares get a crosshair cursor and the blast section is previewed in orange; second press fires into the hovered square. Any action key cancels |
| `M` | Close combat (enemy directly ahead) |
| `O` | Overwatch on/off (2 AP) |
| `U` | Unjam bolter |
| `R` / `T` | Reload (4 AP) / autofire (assault cannon only) |
| `G` | Cut the door ahead (chain fist only, 1 AP) |
| `B` `B` | Heavy flamer self-destruct: press twice to confirm (torches his own section) |
| `P` | Spend a Command Point (+1 AP) |
| `K` | Mute sound on/off (persists) |
| `L` (hold) | Show line of sight |
| `Esc` / PAUSE | Pause: the clock stops, the board stays readable, no key reaches the game until you resume. A hidden browser tab pauses on its own |
| `Enter` / START | During deployment only: start the mission |
| Arrows / drag / mouse wheel | Pan camera (wheel down pans down, like the down arrow; sideways wheel pans sideways) |
| Mini-map click | Jump the view to that point |
| Mouse hover | Square coordinate + contents in the HUD (below the map legend) |

## Marine roster panel

A card grid to the right of the canvas shows the whole force, one row per
squad, sergeant and special-weapon marines first. Each row is titled after
its sergeant per the Space Hulk convention ("Squad Hectarion"), with the
original mission squad key (Calvin, Constantine, Sakharov…) kept as the
grouping identity. Each card carries the marine's icon, a
static Deathwing-flavoured name (`Sgt. Gideon`, `Bro. Claudio`), live AP and
ammo, weapon label, and state badges (overwatch, jam, C.A.T. carried). Cards
grey out `KIA` as marines die (the thinning roster IS the pressure gauge)
and mark `ESCAPED` separately on escape missions. During deployment, reserve
marines show dashed-blue `RESERVE` cards that double as the deployment picker.
The selected marine's card glows gold; clicking a card selects him on the map
and pans the camera.

Stealer entry points render as the original off-board `entry.png` triangles
(exits get `exit.png` arrows) pointing onto the board, replacing the old
purple squares.

## Mini-map auspex

The mini-map doubles as the squad auspex. Living marines are steady red dots.
Genestealers and blips only appear when the radar sweeps: a pulse ring expands
from each living sergeant in time with the motion-tracker ping, and contacts
light up as the wavefront passes them (so the scope refreshes faster as the
swarm closes in). Stealers return solid green blobs, blips fainter blurry
smears (decoys look identical: the scanner cannot tell, and neither can you).
If both sergeants die the auspex goes dark and the swarm vanishes from the
scope. Clicking the mini-map jumps the main view to that point.

## Motion

The main map animates: marines step with a heavy, deliberate weight (and a
subtle recoil when their guns fire), genestealers dart, blips slide
suggestively through the dark, bulkhead doors part in the middle, and flames
shimmer. Camera panning carries a little inertia: arrow keys accelerate and
glide to a stop, and releasing a fast drag flings the view. All of it is
cosmetic; the engine resolves instantly and the mini-map stays motionless.

Genestealers near your squad turn to face their nearest prey at every cycle
boundary, so a room of contacts reads as a pack mid-charge. Fair warning: a
stealer staring your marine down defends close combat at full strength and
strikes back if it wins, exactly the position a human hive player would set
up with its free turns. The camera is yours: nothing pans it but you (arrows,
drag, wheel, a roster card, the mini-map).
With the OS "reduce motion" accessibility setting enabled, every animation is
replaced by an instant snap.

## Sound

The processed audio set is committed under
`packages/client/public/assets/audio/` and ships with the site; sources and
licensing live in [CREDITS.md](../CREDITS.md) and on the deployed
[audio credits page](https://harryf.github.io/sulkweb/credits.html). To
regenerate it from the original videos (requires `yt-dlp` + `ffmpeg` on PATH;
raw downloads are cached in the gitignored `.audio-cache/`):

```sh
pnpm fetch-audio
```

- **Ambient music**: a different [Music of 40K](https://www.youtube.com/@Musicof40K)
  soundscape per mission, looping continuously, loudness-normalised, ducked
  quiet while nothing is close and swelling while a stealer or blip stands
  within eight squares of a marine (900ms fades; the room literally gets
  louder as the swarm closes in).
- **SFX**: the original Sulk public-domain wavs voice the marines; storm
  bolters fire the *Aliens* M41A pulse-rifle burst; genestealers move, attack
  and die with *Alien: Isolation* vocalisations (cut points + role guesses in
  `src/audio/alienSegments.ts`, flagged `guess` until confirmed by ear).
- **Positional volume**: sounds the swarm makes (doors creaking open, skittering,
  blip conversions, death cries) attenuate with distance from your squad: a door
  opened far across the hulk creaks faintly in the dark; anything adjacent plays
  at full volume. Marine-caused sounds are by definition close and stay full.
- **Motion tracker**: the *Aliens* tracker ping runs continuously, its
  cadence and pitch tightening as the nearest blip closes on your marines:
  a 2.4s idle sweep at 20+ squares, a 300ms panic tick at 2.
- `K` mutes (persisted). Without fetched audio the game boots and plays
  silently (original-wav bolter fallback aside): audio is never load-bearing.

The game never blocks on audio: playback starts on your first click (browser
autoplay policy), all sounds are event-driven off the same engine event stream
the replays use, so what you hear tracks what you see.

## Gameplay log export

When a mission ends, the end dialog offers a debrief-notes field and a
**Download game log** button. The saved JSON
(`sulk-log_<mission>_<timestamp>.json`) records every move, shot (with actual
dice rolls), death, door, spawn and phase of the game plus your notes: a
growing corpus of real games used to improve the stealer AI with
mission-generic rules. Schema: [gamelog-format.md](gamelog-format.md).
