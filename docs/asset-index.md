# Asset Index

Every file under `packages/client/public/` (build output in `dist/` and macOS `.DS_Store` junk excluded), cross-referenced against the code that loads it. Reference channels checked: static `load.image`/`load.audio` paths, dynamic keys (`RosterPanel` iconUrl, `musicFile()`, `alien_${file}` in `AudioManager`), `index.html`, and `styles.css`.

Generated 2026-08-16 by cross-referencing `GameScene.preload`, `PreloadScene`, `AudioManager.queueLoads`, `audioManifest.ts`, `alienSegments.ts`, `marineNames.ts`, `RosterPanel`, `Minimap`, `index.html`, and `styles.css`. To refresh after adding or removing assets, re-run those cross-references (or diff this file against `find packages/client/public -type f`).

| Category | Count |
|---|---|
| Total files | 149 |
| In use | 66 |
| Unused | 77 (1648 KB) |
| Loaded but never drawn | 1 |
| License/provenance notes | 5 |

## Board and UI sprites

Sulk 0.29 sprite set, committed. Loaded by `GameScene.preload` (Phaser texture keys match the file stem); marine sprites double as roster card icons through `RosterPanel`.

| Name | Location | Status | How it is used |
|---|---|---|---|
| THEMES_INFO | `packages/client/public/assets/themes/THEMES_INFO` | License/provenance note | Sulk 0.29 theme provenance notes (license and authorship for the sprite set) |
| ambush_counter.png | `packages/client/public/assets/themes/default/ambush_counter.png` | Loaded, never drawn | Loaded in `GameScene.preload` but never drawn: no `add.image`/`add.sprite` site references the key. Dead weight in the boot download |
| blip.png | `packages/client/public/assets/themes/default/blip.png` | In use | Unrevealed blip counter sprite on the board |
| blip_1.png | `packages/client/public/assets/themes/default/blip_1.png` | Unused | Blip counter variant (value 1) from Sulk 0.29; the web client uses the single generic `blip.png` |
| blip_2.png | `packages/client/public/assets/themes/default/blip_2.png` | Unused | Blip counter variant (value 2), same story as blip_1 |
| blip_3.png | `packages/client/public/assets/themes/default/blip_3.png` | Unused | Blip counter variant (value 3), same story as blip_1 |
| bulkhead.png | `packages/client/public/assets/themes/default/bulkhead.png` | Unused | Bulkhead terrain piece from Sulk 0.29; no mission in the web port places bulkheads |
| bulkhead_destroyed.png | `packages/client/public/assets/themes/default/bulkhead_destroyed.png` | Unused | Destroyed bulkhead state, unused with `bulkhead.png` |
| cat.png | `packages/client/public/assets/themes/default/cat.png` | In use | C.A.T. token sprite on the board |
| crate.png | `packages/client/public/assets/themes/default/crate.png` | Unused | Crate terrain piece from Sulk 0.29; no mission places crates |
| cryogenic_tank.png | `packages/client/public/assets/themes/default/cryogenic_tank.png` | Unused | Cryogenic tank objective from Sulk 0.29; its mission is not in the web port |
| cryogenic_tank_destroyed.png | `packages/client/public/assets/themes/default/cryogenic_tank_destroyed.png` | Unused | Destroyed cryogenic tank state, unused with `cryogenic_tank.png` |
| door_closed.png | `packages/client/public/assets/themes/default/door_closed.png` | In use | Closed door sprite, keyed by anchor square + facing, swapped on `doorToggled` |
| door_open.png | `packages/client/public/assets/themes/default/door_open.png` | In use | Open door sprite, swapped in on `doorToggled` |
| ducting.png | `packages/client/public/assets/themes/default/ducting.png` | In use | Ducting objective sprite (space_hulk_6 targets) |
| ducting_destroyed.png | `packages/client/public/assets/themes/default/ducting_destroyed.png` | In use | Destroyed-state ducting sprite, swapped on `ductingDestroyed` |
| entry.png | `packages/client/public/assets/themes/default/entry.png` | In use | Stealer entry-point triangle drawn off-board at each `mission.entryPoints` edge |
| exit.png | `packages/client/public/assets/themes/default/exit.png` | In use | Exit arrow drawn off-board at each mission exit square |
| facing_arrow.png | `packages/client/public/assets/themes/default/facing_arrow.png` | Unused | Facing indicator from Sulk 0.29; the web client shows facing by rotating sprites and a text arrow on roster cards |
| flames.png | `packages/client/public/assets/themes/default/flames.png` | In use | Flame template overlay, one per burning square while a flamer section burns |
| flash_heavy_flamer.png | `packages/client/public/assets/themes/default/flash_heavy_flamer.png` | In use | Muzzle flash shown on heavy-flamer shots |
| flash_storm_bolter.png | `packages/client/public/assets/themes/default/flash_storm_bolter.png` | In use | Muzzle flash shown on storm-bolter and assault-cannon shots |
| marker_convert_1.png | `packages/client/public/assets/themes/default/marker_convert_1.png` | Unused | Blip-conversion countdown marker (1) from Sulk 0.29; the web port does not draw conversion markers |
| marker_convert_2.png | `packages/client/public/assets/themes/default/marker_convert_2.png` | Unused | Blip-conversion countdown marker (2), unused as above |
| marker_convert_3.png | `packages/client/public/assets/themes/default/marker_convert_3.png` | Unused | Blip-conversion countdown marker (3), unused as above |
| marker_damage.png | `packages/client/public/assets/themes/default/marker_damage.png` | In use | Damage marker drawn on the C.A.T. when it takes a hit |
| marker_jam.png | `packages/client/public/assets/themes/default/marker_jam.png` | In use | Jam marker drawn on the jammed marine |
| marker_overwatch.png | `packages/client/public/assets/themes/default/marker_overwatch.png` | In use | Overwatch marker drawn above a marine on `overwatchChanged` |
| mini_blip.png | `packages/client/public/assets/themes/default/mini_blip.png` | Unused | Minimap blip icon from Sulk 0.29; the web minimap draws pieces as colored squares |
| mini_entryexit.png | `packages/client/public/assets/themes/default/mini_entryexit.png` | Unused | Minimap entry/exit icon; the web minimap draws these as colored squares |
| mini_square.png | `packages/client/public/assets/themes/default/mini_square.png` | In use | Minimap square texture, one per board square in `Minimap` |
| mini_stealer.png | `packages/client/public/assets/themes/default/mini_stealer.png` | Unused | Minimap stealer icon; the web minimap draws pieces as colored squares |
| mini_terminator.png | `packages/client/public/assets/themes/default/mini_terminator.png` | Unused | Minimap marine icon; the web minimap draws pieces as colored squares |
| rubble.png | `packages/client/public/assets/themes/default/rubble.png` | Unused | Rubble terrain piece from Sulk 0.29; no mission places rubble |
| sectionline.png | `packages/client/public/assets/themes/default/sectionline.png` | Unused | Section boundary line from Sulk 0.29; the web client does not draw section lines |
| select.png | `packages/client/public/assets/themes/default/select.png` | In use | Selection ring on the selected marine (`HighlightSprite`) |
| select_cat.png | `packages/client/public/assets/themes/default/select_cat.png` | Unused | C.A.T. selection ring from Sulk 0.29; the web client draws no selection ring on the C.A.T. |
| square_corridor.png | `packages/client/public/assets/themes/default/square_corridor.png` | In use | Corridor floor tile, tiled per corridor square in `GameScene.create`; also the loading-bar texture in `PreloadScene` (key `square`) |
| square_room.png | `packages/client/public/assets/themes/default/square_room.png` | In use | Room floor tile, tiled per room square in `GameScene.create` |
| stealer.png | `packages/client/public/assets/themes/default/stealer.png` | In use | Genestealer board sprite (`Genestealer.SPRITE_KEY`) |
| stealer_decapitated.png | `packages/client/public/assets/themes/default/stealer_decapitated.png` | Unused | Stealer death frame from Sulk 0.29; the web client removes dead pieces without death animation frames |
| stealer_dying.png | `packages/client/public/assets/themes/default/stealer_dying.png` | Unused | Stealer death frame, unused as above |
| terminator_assault_cannon.png | `packages/client/public/assets/themes/default/terminator_assault_cannon.png` | In use | Assault-cannon marine sprite on the board (engine spriteKey `terminator_assault_cannon`, loaded in `GameScene.preload`); also the roster card icon via `RosterPanel` iconUrl |
| terminator_captain.png | `packages/client/public/assets/themes/default/terminator_captain.png` | Unused | Captain marine sprite from Sulk 0.29; no mission in the web port deploys a captain |
| terminator_chain_fist.png | `packages/client/public/assets/themes/default/terminator_chain_fist.png` | In use | Chain-fist marine sprite on the board (engine spriteKey `terminator_chain_fist`, loaded in `GameScene.preload`); also the roster card icon via `RosterPanel` iconUrl |
| terminator_dying.png | `packages/client/public/assets/themes/default/terminator_dying.png` | Unused | Marine death frame, unused as above |
| terminator_heavy_flamer.png | `packages/client/public/assets/themes/default/terminator_heavy_flamer.png` | In use | Heavy-flamer marine sprite on the board (engine spriteKey `terminator_heavy_flamer`, loaded in `GameScene.preload`); also the roster card icon via `RosterPanel` iconUrl |
| terminator_librarian.png | `packages/client/public/assets/themes/default/terminator_librarian.png` | Unused | Librarian marine sprite; no mission deploys a librarian |
| terminator_lightning_claws.png | `packages/client/public/assets/themes/default/terminator_lightning_claws.png` | Unused | Lightning-claws marine sprite; no mission deploys this loadout |
| terminator_sergeant.png | `packages/client/public/assets/themes/default/terminator_sergeant.png` | In use | Sergeant (power sword and storm bolter) marine sprite on the board (engine spriteKey `terminator_sergeant`, loaded in `GameScene.preload`); also the roster card icon via `RosterPanel` iconUrl |
| terminator_sergeant_sword.png | `packages/client/public/assets/themes/default/terminator_sergeant_sword.png` | In use | Sergeant sword-variant marine sprite on the board (engine spriteKey `terminator_sergeant_sword`, loaded in `GameScene.preload`); also the roster card icon via `RosterPanel` iconUrl |
| terminator_storm_bolter.png | `packages/client/public/assets/themes/default/terminator_storm_bolter.png` | In use | Storm-bolter marine sprite on the board (engine spriteKey `terminator_storm_bolter`, loaded in `GameScene.preload`); also the roster card icon via `RosterPanel` iconUrl |
| terminator_thunder_hammer.png | `packages/client/public/assets/themes/default/terminator_thunder_hammer.png` | Unused | Thunder-hammer marine sprite; no mission deploys this loadout |

## Sound effects (original Sulk set)

Sulk 0.29 wav set, committed, public domain except the three TLK Games button sounds. Queued by `AudioManager.queueLoads`, played off `PieceEvents`.

| Name | Location | Status | How it is used |
|---|---|---|---|
| SOUNDS_INFO | `packages/client/public/assets/sounds/SOUNDS_INFO` | License/provenance note | Sulk 0.29 sound-set provenance: public domain except the three TLK Games GPL2 button sounds |
| assault_cannon_burst.wav | `packages/client/public/assets/sounds/assault_cannon_burst.wav` | In use | Assault-cannon burst (`sfx_cannon`), selected by `shotSfx()` for cannon shooters |
| button_fail.wav | `packages/client/public/assets/sounds/button_fail.wav` | Unused | TLK Games GPL2 button sound, deliberately not used |
| button_press.wav | `packages/client/public/assets/sounds/button_press.wav` | Unused | TLK Games GPL2 button sound from Sulk 0.29, deliberately not used (see `SOUNDS_INFO` and the note in `audioManifest.ts`) |
| button_unpress.wav | `packages/client/public/assets/sounds/button_unpress.wav` | Unused | TLK Games GPL2 button sound, deliberately not used |
| chain_fist.wav | `packages/client/public/assets/sounds/chain_fist.wav` | In use | Chain-fist door cut, played on `doorDestroyed` |
| click.wav | `packages/client/public/assets/sounds/click.wav` | Unused | Generic click from Sulk 0.29; the web client has no click sound |
| door_open.wav | `packages/client/public/assets/sounds/door_open.wav` | In use | Door open/close, played on `doorToggled` |
| marine_cc.wav | `packages/client/public/assets/sounds/marine_cc.wav` | In use | Marine close-combat swing; also played quietly on `catDamaged` |
| marine_jam.wav | `packages/client/public/assets/sounds/marine_jam.wav` | In use | Weapon jam clunk, played when `jammed` fires |
| marine_kill_skewered.wav | `packages/client/public/assets/sounds/marine_kill_skewered.wav` | In use | Marine death cry; also played at half volume on `ductingDestroyed` |
| marine_move.wav | `packages/client/public/assets/sounds/marine_move.wav` | In use | Marine footstep clank (throttled); also played on `marineEscaped` |
| marine_selfdestruct_flamer.wav | `packages/client/public/assets/sounds/marine_selfdestruct_flamer.wav` | In use | Self-destruct blast; also the `malfunction` sound |
| marine_shoot_bolter.wav | `packages/client/public/assets/sounds/marine_shoot_bolter.wav` | In use | Fallback storm-bolter shot (`sfx_bolter_orig`) when the fetched pulse-rifle cut is absent |
| marine_shoot_flamer.wav | `packages/client/public/assets/sounds/marine_shoot_flamer.wav` | In use | Heavy-flamer shot (`sfx_flamer`), played on `sectionFlamed` |

## Music and fetched audio

Not committed: `packages/client/public/assets/audio/` is gitignored. Regenerate locally with `bun scripts/fetchAudio.ts` (yt-dlp + ffmpeg); sources and licensing in `CREDITS.md`. Every load is cache-guarded, so a clone without these files boots and plays silently.

| Name | Location | Status | How it is used |
|---|---|---|---|
| alien_attack_01.wav | `packages/client/public/assets/audio/alien/alien_attack_01.wav` | In use | Genestealer voice, role `stealer_attack` in `alienSegments.ts`: played when a stealer attacks in close combat (random pick within role) |
| alien_attack_02.wav | `packages/client/public/assets/audio/alien/alien_attack_02.wav` | In use | Genestealer voice, role `stealer_attack` in `alienSegments.ts`: played when a stealer attacks in close combat (random pick within role) |
| alien_attack_03.wav | `packages/client/public/assets/audio/alien/alien_attack_03.wav` | In use | Genestealer voice, role `stealer_attack` in `alienSegments.ts`: played when a stealer attacks in close combat (random pick within role) |
| alien_attack_04.wav | `packages/client/public/assets/audio/alien/alien_attack_04.wav` | In use | Genestealer voice, role `stealer_attack` in `alienSegments.ts`: played when a stealer attacks in close combat (random pick within role) |
| alien_attack_05.wav | `packages/client/public/assets/audio/alien/alien_attack_05.wav` | In use | Genestealer voice, role `stealer_attack` in `alienSegments.ts`: played when a stealer attacks in close combat (random pick within role) |
| alien_attack_06.wav | `packages/client/public/assets/audio/alien/alien_attack_06.wav` | In use | Genestealer voice, role `stealer_attack` in `alienSegments.ts`: played when a stealer attacks in close combat (random pick within role) |
| alien_death_01.wav | `packages/client/public/assets/audio/alien/alien_death_01.wav` | In use | Genestealer voice, role `stealer_death` in `alienSegments.ts`: played when a stealer dies (random pick within role) |
| alien_death_02.wav | `packages/client/public/assets/audio/alien/alien_death_02.wav` | In use | Genestealer voice, role `stealer_death` in `alienSegments.ts`: played when a stealer dies (random pick within role) |
| alien_death_03.wav | `packages/client/public/assets/audio/alien/alien_death_03.wav` | In use | Genestealer voice, role `stealer_death` in `alienSegments.ts`: played when a stealer dies (random pick within role) |
| alien_death_04.wav | `packages/client/public/assets/audio/alien/alien_death_04.wav` | In use | Genestealer voice, role `stealer_death` in `alienSegments.ts`: played when a stealer dies (random pick within role) |
| alien_door_01.wav | `packages/client/public/assets/audio/alien/alien_door_01.wav` | In use | Genestealer voice, role `stealer_door` in `alienSegments.ts`: played when a blip converts to stealers (random pick within role) |
| alien_door_02.wav | `packages/client/public/assets/audio/alien/alien_door_02.wav` | In use | Genestealer voice, role `stealer_door` in `alienSegments.ts`: played when a blip converts to stealers (random pick within role) |
| alien_door_03.wav | `packages/client/public/assets/audio/alien/alien_door_03.wav` | In use | Genestealer voice, role `stealer_door` in `alienSegments.ts`: played when a blip converts to stealers (random pick within role) |
| alien_door_04.wav | `packages/client/public/assets/audio/alien/alien_door_04.wav` | In use | Genestealer voice, role `stealer_door` in `alienSegments.ts`: played when a blip converts to stealers (random pick within role) |
| alien_extra_01.wav | `packages/client/public/assets/audio/alien/alien_extra_01.wav` | Unused | Role `unused` in `alienSegments.ts` (quiet breathing, maybe ambience); never queued for load |
| alien_extra_02.wav | `packages/client/public/assets/audio/alien/alien_extra_02.wav` | Unused | Role `unused` in `alienSegments.ts` (quiet breathing, maybe ambience); never queued for load |
| alien_extra_03.wav | `packages/client/public/assets/audio/alien/alien_extra_03.wav` | Unused | Role `unused` in `alienSegments.ts` (mid growl, maybe attack); never queued for load |
| alien_move_01.wav | `packages/client/public/assets/audio/alien/alien_move_01.wav` | In use | Genestealer voice, role `stealer_move` in `alienSegments.ts`: played when a stealer steps (random pick within role) |
| alien_move_02.wav | `packages/client/public/assets/audio/alien/alien_move_02.wav` | In use | Genestealer voice, role `stealer_move` in `alienSegments.ts`: played when a stealer steps (random pick within role) |
| alien_move_03.wav | `packages/client/public/assets/audio/alien/alien_move_03.wav` | In use | Genestealer voice, role `stealer_move` in `alienSegments.ts`: played when a stealer steps (random pick within role) |
| alien_move_04.wav | `packages/client/public/assets/audio/alien/alien_move_04.wav` | In use | Genestealer voice, role `stealer_move` in `alienSegments.ts`: played when a stealer steps (random pick within role) |
| alien_move_05.wav | `packages/client/public/assets/audio/alien/alien_move_05.wav` | In use | Genestealer voice, role `stealer_move` in `alienSegments.ts`: played when a stealer steps (random pick within role) |
| beta_1.ogg | `packages/client/public/assets/audio/music/beta_1.ogg` | In use | Looping ambient bed for the beta_1 mission ("Underground", Resident Evil, Shusaku Uchiyama); loaded via `musicFile()` in `audioManifest.ts`, volume ducked by phase in `AudioManager` |
| beta_2.ogg | `packages/client/public/assets/audio/music/beta_2.ogg` | In use | Looping ambient bed for the beta_2 mission ("Lab Entrance", Resident Evil, Shusaku Uchiyama); loaded via `musicFile()` in `audioManifest.ts`, volume ducked by phase in `AudioManager` |
| debug_1.ogg | `packages/client/public/assets/audio/music/debug_1.ogg` | In use | Looping ambient bed for the debug_1 mission ("Eerie Ambience", Five Nights at Freddy's); loaded via `musicFile()` in `audioManifest.ts`, volume ducked by phase in `AudioManager` |
| space_hulk_1.ogg | `packages/client/public/assets/audio/music/space_hulk_1.ogg` | In use | Looping ambient bed for the space_hulk_1 mission ("The Labyrinth", Silent Hill 2, Akira Yamaoka); loaded via `musicFile()` in `audioManifest.ts`, volume ducked by phase in `AudioManager` |
| space_hulk_2.ogg | `packages/client/public/assets/audio/music/space_hulk_2.ogg` | In use | Looping ambient bed for the space_hulk_2 mission ("Evil Malaise", Resident Evil 4, Misao Senbongi); loaded via `musicFile()` in `audioManifest.ts`, volume ducked by phase in `AudioManager` |
| space_hulk_3.ogg | `packages/client/public/assets/audio/music/space_hulk_3.ogg` | In use | Looping ambient bed for the space_hulk_3 mission ("Industrial Junk", Fallout, Mark Morgan); loaded via `musicFile()` in `audioManifest.ts`, volume ducked by phase in `AudioManager` |
| space_hulk_4.ogg | `packages/client/public/assets/audio/music/space_hulk_4.ogg` | In use | Looping ambient bed for the space_hulk_4 mission ("Dungeon 3", Fallout 3, Inon Zur); loaded via `musicFile()` in `audioManifest.ts`, volume ducked by phase in `AudioManager` |
| space_hulk_5.ogg | `packages/client/public/assets/audio/music/space_hulk_5.ogg` | In use | Looping ambient bed for the space_hulk_5 mission ("Cemetery", Divinity demo, Project Divinity); loaded via `musicFile()` in `audioManifest.ts`, volume ducked by phase in `AudioManager` |
| space_hulk_6.ogg | `packages/client/public/assets/audio/music/space_hulk_6.ogg` | In use | Looping ambient bed for the space_hulk_6 mission ("The Judgement of Carrion", Dawn of War II: Chaos Rising, Doyle W. Donehoo); loaded via `musicFile()` in `audioManifest.ts`, volume ducked by phase in `AudioManager` |
| bolter_fire.wav | `packages/client/public/assets/audio/sfx/bolter_fire.wav` | In use | Storm-bolter shot (`sfx_bolter`), cut from the Aliens M41A pulse-rifle burst; preferred over the original wav when present |
| tracker_ping.wav | `packages/client/public/assets/audio/sfx/tracker_ping.wav` | In use | Motion-tracker ping; cadence and pitch follow the nearest threat distance (`scheduleTracker`) |

## Fonts

Sulk 0.29 fonts, committed but not loaded: the client takes Kanit from Google Fonts in `styles.css`.

| Name | Location | Status | How it is used |
|---|---|---|---|
| FONTS_INFO | `packages/client/public/assets/fonts/FONTS_INFO` | License/provenance note | Sulk 0.29 font provenance notes |
| fudd.ttf | `packages/client/public/assets/fonts/fudd.ttf` | Unused | Sulk 0.29 UI font; the web client uses Kanit from Google Fonts (`styles.css` @import) |
| fudd.txt | `packages/client/public/assets/fonts/fudd.txt` | License/provenance note | License text for `fudd.ttf` |
| kimberley.ttf | `packages/client/public/assets/fonts/kimberley.ttf` | Unused | Sulk 0.29 UI font, unused as above |
| kimberley.txt | `packages/client/public/assets/fonts/kimberley.txt` | License/provenance note | License text for `kimberley.ttf` |

## Pygame UI images

The complete Sulk 0.29 pygame interface: action-button states, option widgets, splash, window icon. None are referenced by the web client, which draws its HUD on canvas and its roster in DOM.

| Name | Location | Status | How it is used |
|---|---|---|---|
| attack_disabled.png | `packages/client/public/assets/images/attack_disabled.png` | Unused | Original Sulk 0.29 pygame UI: "attack" action button, disabled state. The web client draws its UI with canvas and DOM instead |
| attack_enabled.png | `packages/client/public/assets/images/attack_enabled.png` | Unused | Original Sulk 0.29 pygame UI: "attack" action button, enabled state. The web client draws its UI with canvas and DOM instead |
| cat_disabled.png | `packages/client/public/assets/images/cat_disabled.png` | Unused | Original Sulk 0.29 pygame UI: "cat" action button, disabled state. The web client draws its UI with canvas and DOM instead |
| cat_enabled.png | `packages/client/public/assets/images/cat_enabled.png` | Unused | Original Sulk 0.29 pygame UI: "cat" action button, enabled state. The web client draws its UI with canvas and DOM instead |
| cat_pressed.png | `packages/client/public/assets/images/cat_pressed.png` | Unused | Original Sulk 0.29 pygame UI: "cat" action button, pressed state. The web client draws its UI with canvas and DOM instead |
| checkbox_checked.png | `packages/client/public/assets/images/checkbox_checked.png` | Unused | Original Sulk 0.29 pygame UI: options checkbox, checked state. The web client draws its UI with canvas and DOM instead |
| checkbox_empty.png | `packages/client/public/assets/images/checkbox_empty.png` | Unused | Original Sulk 0.29 pygame UI: options checkbox, empty state. The web client draws its UI with canvas and DOM instead |
| convert_disabled.png | `packages/client/public/assets/images/convert_disabled.png` | Unused | Original Sulk 0.29 pygame UI: "convert" action button, disabled state. The web client draws its UI with canvas and DOM instead |
| convert_enabled.png | `packages/client/public/assets/images/convert_enabled.png` | Unused | Original Sulk 0.29 pygame UI: "convert" action button, enabled state. The web client draws its UI with canvas and DOM instead |
| cp_disabled.png | `packages/client/public/assets/images/cp_disabled.png` | Unused | Original Sulk 0.29 pygame UI: "cp" action button, disabled state. The web client draws its UI with canvas and DOM instead |
| cp_enabled.png | `packages/client/public/assets/images/cp_enabled.png` | Unused | Original Sulk 0.29 pygame UI: "cp" action button, enabled state. The web client draws its UI with canvas and DOM instead |
| cp_pressed.png | `packages/client/public/assets/images/cp_pressed.png` | Unused | Original Sulk 0.29 pygame UI: "cp" action button, pressed state. The web client draws its UI with canvas and DOM instead |
| done_disabled.png | `packages/client/public/assets/images/done_disabled.png` | Unused | Original Sulk 0.29 pygame UI: "done" action button, disabled state. The web client draws its UI with canvas and DOM instead |
| done_enabled.png | `packages/client/public/assets/images/done_enabled.png` | Unused | Original Sulk 0.29 pygame UI: "done" action button, enabled state. The web client draws its UI with canvas and DOM instead |
| done_pressed.png | `packages/client/public/assets/images/done_pressed.png` | Unused | Original Sulk 0.29 pygame UI: "done" action button, pressed state. The web client draws its UI with canvas and DOM instead |
| icon.png | `packages/client/public/assets/images/icon.png` | Unused | Original Sulk 0.29 pygame UI: window icon. The web client draws its UI with canvas and DOM instead |
| movenshoot_disabled.png | `packages/client/public/assets/images/movenshoot_disabled.png` | Unused | Original Sulk 0.29 pygame UI: "movenshoot" action button, disabled state. The web client draws its UI with canvas and DOM instead |
| movenshoot_enabled.png | `packages/client/public/assets/images/movenshoot_enabled.png` | Unused | Original Sulk 0.29 pygame UI: "movenshoot" action button, enabled state. The web client draws its UI with canvas and DOM instead |
| movenshoot_pressed.png | `packages/client/public/assets/images/movenshoot_pressed.png` | Unused | Original Sulk 0.29 pygame UI: "movenshoot" action button, pressed state. The web client draws its UI with canvas and DOM instead |
| overwatch_disabled.png | `packages/client/public/assets/images/overwatch_disabled.png` | Unused | Original Sulk 0.29 pygame UI: "overwatch" action button, disabled state. The web client draws its UI with canvas and DOM instead |
| overwatch_enabled.png | `packages/client/public/assets/images/overwatch_enabled.png` | Unused | Original Sulk 0.29 pygame UI: "overwatch" action button, enabled state. The web client draws its UI with canvas and DOM instead |
| overwatch_pressed.png | `packages/client/public/assets/images/overwatch_pressed.png` | Unused | Original Sulk 0.29 pygame UI: "overwatch" action button, pressed state. The web client draws its UI with canvas and DOM instead |
| pause_disabled.png | `packages/client/public/assets/images/pause_disabled.png` | Unused | Original Sulk 0.29 pygame UI: "pause" action button, disabled state. The web client draws its UI with canvas and DOM instead |
| pause_enabled.png | `packages/client/public/assets/images/pause_enabled.png` | Unused | Original Sulk 0.29 pygame UI: "pause" action button, enabled state. The web client draws its UI with canvas and DOM instead |
| pause_pressed.png | `packages/client/public/assets/images/pause_pressed.png` | Unused | Original Sulk 0.29 pygame UI: "pause" action button, pressed state. The web client draws its UI with canvas and DOM instead |
| radiobox_checked.png | `packages/client/public/assets/images/radiobox_checked.png` | Unused | Original Sulk 0.29 pygame UI: options radio button, checked state. The web client draws its UI with canvas and DOM instead |
| radiobox_empty.png | `packages/client/public/assets/images/radiobox_empty.png` | Unused | Original Sulk 0.29 pygame UI: options radio button, empty state. The web client draws its UI with canvas and DOM instead |
| secrets_disabled.png | `packages/client/public/assets/images/secrets_disabled.png` | Unused | Original Sulk 0.29 pygame UI: "secrets" action button, disabled state. The web client draws its UI with canvas and DOM instead |
| secrets_enabled.png | `packages/client/public/assets/images/secrets_enabled.png` | Unused | Original Sulk 0.29 pygame UI: "secrets" action button, enabled state. The web client draws its UI with canvas and DOM instead |
| secrets_pressed.png | `packages/client/public/assets/images/secrets_pressed.png` | Unused | Original Sulk 0.29 pygame UI: "secrets" action button, pressed state. The web client draws its UI with canvas and DOM instead |
| selfdestruct_disabled.png | `packages/client/public/assets/images/selfdestruct_disabled.png` | Unused | Original Sulk 0.29 pygame UI: "selfdestruct" action button, disabled state. The web client draws its UI with canvas and DOM instead |
| selfdestruct_enabled.png | `packages/client/public/assets/images/selfdestruct_enabled.png` | Unused | Original Sulk 0.29 pygame UI: "selfdestruct" action button, enabled state. The web client draws its UI with canvas and DOM instead |
| selfdestruct_pressed.png | `packages/client/public/assets/images/selfdestruct_pressed.png` | Unused | Original Sulk 0.29 pygame UI: "selfdestruct" action button, pressed state. The web client draws its UI with canvas and DOM instead |
| shoot_disabled.png | `packages/client/public/assets/images/shoot_disabled.png` | Unused | Original Sulk 0.29 pygame UI: "shoot" action button, disabled state. The web client draws its UI with canvas and DOM instead |
| shoot_enabled.png | `packages/client/public/assets/images/shoot_enabled.png` | Unused | Original Sulk 0.29 pygame UI: "shoot" action button, enabled state. The web client draws its UI with canvas and DOM instead |
| shoot_pressed.png | `packages/client/public/assets/images/shoot_pressed.png` | Unused | Original Sulk 0.29 pygame UI: "shoot" action button, pressed state. The web client draws its UI with canvas and DOM instead |
| splash.png | `packages/client/public/assets/images/splash.png` | Unused | Original Sulk 0.29 pygame UI: title-screen splash. The web client draws its UI with canvas and DOM instead |
| unjam_disabled.png | `packages/client/public/assets/images/unjam_disabled.png` | Unused | Original Sulk 0.29 pygame UI: "unjam" action button, disabled state. The web client draws its UI with canvas and DOM instead |
| unjam_enabled.png | `packages/client/public/assets/images/unjam_enabled.png` | Unused | Original Sulk 0.29 pygame UI: "unjam" action button, enabled state. The web client draws its UI with canvas and DOM instead |
| usedoor_disabled.png | `packages/client/public/assets/images/usedoor_disabled.png` | Unused | Original Sulk 0.29 pygame UI: "usedoor" action button, disabled state. The web client draws its UI with canvas and DOM instead |
| usedoor_enabled.png | `packages/client/public/assets/images/usedoor_enabled.png` | Unused | Original Sulk 0.29 pygame UI: "usedoor" action button, enabled state. The web client draws its UI with canvas and DOM instead |
| usedoor_pressed.png | `packages/client/public/assets/images/usedoor_pressed.png` | Unused | Original Sulk 0.29 pygame UI: "usedoor" action button, pressed state. The web client draws its UI with canvas and DOM instead |

## Root

Files at the public root.

| Name | Location | Status | How it is used |
|---|---|---|---|
| vite.svg | `packages/client/public/vite.svg` | In use | Favicon, referenced from `index.html` (`<link rel="icon">`) |

## Unused assets

Everything below ships in the repo (or is generated by `fetchAudio.ts`) without any code drawing or playing it; one file is loaded at boot but never drawn, tagged below. All of it came over from Sulk 0.29 wholesale; nothing here is load-bearing, and the game runs identically without it.

Unused means unreferenced, not unshipped: Vite copies `public/` into `dist/` verbatim, so all 1648 KB of this lands in every build. Deleting is a separate decision this index does not make.

### Pygame UI images (42, 166 KB): the entire original interface

- `packages/client/public/assets/images/attack_disabled.png`
- `packages/client/public/assets/images/attack_enabled.png`
- `packages/client/public/assets/images/cat_disabled.png`
- `packages/client/public/assets/images/cat_enabled.png`
- `packages/client/public/assets/images/cat_pressed.png`
- `packages/client/public/assets/images/checkbox_checked.png`
- `packages/client/public/assets/images/checkbox_empty.png`
- `packages/client/public/assets/images/convert_disabled.png`
- `packages/client/public/assets/images/convert_enabled.png`
- `packages/client/public/assets/images/cp_disabled.png`
- `packages/client/public/assets/images/cp_enabled.png`
- `packages/client/public/assets/images/cp_pressed.png`
- `packages/client/public/assets/images/done_disabled.png`
- `packages/client/public/assets/images/done_enabled.png`
- `packages/client/public/assets/images/done_pressed.png`
- `packages/client/public/assets/images/icon.png`
- `packages/client/public/assets/images/movenshoot_disabled.png`
- `packages/client/public/assets/images/movenshoot_enabled.png`
- `packages/client/public/assets/images/movenshoot_pressed.png`
- `packages/client/public/assets/images/overwatch_disabled.png`
- `packages/client/public/assets/images/overwatch_enabled.png`
- `packages/client/public/assets/images/overwatch_pressed.png`
- `packages/client/public/assets/images/pause_disabled.png`
- `packages/client/public/assets/images/pause_enabled.png`
- `packages/client/public/assets/images/pause_pressed.png`
- `packages/client/public/assets/images/radiobox_checked.png`
- `packages/client/public/assets/images/radiobox_empty.png`
- `packages/client/public/assets/images/secrets_disabled.png`
- `packages/client/public/assets/images/secrets_enabled.png`
- `packages/client/public/assets/images/secrets_pressed.png`
- `packages/client/public/assets/images/selfdestruct_disabled.png`
- `packages/client/public/assets/images/selfdestruct_enabled.png`
- `packages/client/public/assets/images/selfdestruct_pressed.png`
- `packages/client/public/assets/images/shoot_disabled.png`
- `packages/client/public/assets/images/shoot_enabled.png`
- `packages/client/public/assets/images/shoot_pressed.png`
- `packages/client/public/assets/images/splash.png`
- `packages/client/public/assets/images/unjam_disabled.png`
- `packages/client/public/assets/images/unjam_enabled.png`
- `packages/client/public/assets/images/usedoor_disabled.png`
- `packages/client/public/assets/images/usedoor_enabled.png`
- `packages/client/public/assets/images/usedoor_pressed.png`

### Theme sprites (27, 39 KB): death frames, convert markers, minimap icons, unused terrain and loadouts

- `packages/client/public/assets/themes/default/ambush_counter.png` (loaded in `GameScene.preload` but never drawn)
- `packages/client/public/assets/themes/default/blip_1.png`
- `packages/client/public/assets/themes/default/blip_2.png`
- `packages/client/public/assets/themes/default/blip_3.png`
- `packages/client/public/assets/themes/default/bulkhead.png`
- `packages/client/public/assets/themes/default/bulkhead_destroyed.png`
- `packages/client/public/assets/themes/default/crate.png`
- `packages/client/public/assets/themes/default/cryogenic_tank.png`
- `packages/client/public/assets/themes/default/cryogenic_tank_destroyed.png`
- `packages/client/public/assets/themes/default/facing_arrow.png`
- `packages/client/public/assets/themes/default/marker_convert_1.png`
- `packages/client/public/assets/themes/default/marker_convert_2.png`
- `packages/client/public/assets/themes/default/marker_convert_3.png`
- `packages/client/public/assets/themes/default/mini_blip.png`
- `packages/client/public/assets/themes/default/mini_entryexit.png`
- `packages/client/public/assets/themes/default/mini_stealer.png`
- `packages/client/public/assets/themes/default/mini_terminator.png`
- `packages/client/public/assets/themes/default/rubble.png`
- `packages/client/public/assets/themes/default/sectionline.png`
- `packages/client/public/assets/themes/default/select_cat.png`
- `packages/client/public/assets/themes/default/stealer_decapitated.png`
- `packages/client/public/assets/themes/default/stealer_dying.png`
- `packages/client/public/assets/themes/default/terminator_captain.png`
- `packages/client/public/assets/themes/default/terminator_dying.png`
- `packages/client/public/assets/themes/default/terminator_librarian.png`
- `packages/client/public/assets/themes/default/terminator_lightning_claws.png`
- `packages/client/public/assets/themes/default/terminator_thunder_hammer.png`

### Sounds (4, 439 KB): the three TLK Games GPL2 button sounds plus a generic click

- `packages/client/public/assets/sounds/button_fail.wav`
- `packages/client/public/assets/sounds/button_press.wav`
- `packages/client/public/assets/sounds/button_unpress.wav`
- `packages/client/public/assets/sounds/click.wav`

### Alien voice cuts (3, 964 KB): segments classified role `unused`, never queued

- `packages/client/public/assets/audio/alien/alien_extra_01.wav`
- `packages/client/public/assets/audio/alien/alien_extra_02.wav`
- `packages/client/public/assets/audio/alien/alien_extra_03.wav`

### Fonts (2, 40 KB): replaced by Kanit from Google Fonts

- `packages/client/public/assets/fonts/fudd.ttf`
- `packages/client/public/assets/fonts/kimberley.ttf`

The font license files (`fudd.txt`, `kimberley.txt`) and the `*_INFO` provenance notes are kept deliberately: they document licensing for the sets above, so they are not listed as unused.
