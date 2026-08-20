# ISA Archive: Client UI (HUD, roster, minimap, input, motion, home page, manual)

> Verbatim archive of completed run records moved out of the root [ISA.md](../../ISA.md).
> Read this before changing the matching part of the codebase. ISC IDs are stable and
> unique across the whole ISA; this file is their single home now. Text is preserved
> exactly as written at the time (including pre-ban em dashes).

## Criteria (archived runs)

### Animated stealer phase + rules/UX sweep (2026-08-14, second user pass)

- [x] ISC-86: Stealer phase replays as visible step-by-step animation after DONE — sampled sprite positions change over time (Playwright)
- [x] ISC-87: `scene.animating` true during replay; keyboard/selection/pause/DONE input ignored until it ends (Playwright + code gates)
- [x] ISC-88: A blip converts the moment a marine's move/turn/door-toggle brings it into sight — no endMarinePhase needed (vitest ×2)
- [x] ISC-89: Conversion spawns all `value` (1–3) stealers on origin+adjacent free squares; overflow lost (vitest: value-2 blip → 2 stealers)
- [x] ISC-90: Stealer entry squares marked purple, exit square marked green with EXIT label, deployment squares outlined blue (Playwright + screenshot)
- [x] ISC-91: HUD shows the mission objective text and a map-marker legend (Playwright)
- [x] ISC-92: Anti: after replay ends every sprite matches engine position and kind-texture exactly — zero drift (Playwright)
- [x] ISC-93: Anti: endTurn during replay is ignored — turn number cannot double-advance (Playwright)
- [x] ISC-94: Pinned e2e games are fully deterministic: dice installed at engine construction via `?seed=N` (blip values + CP roll included); seeds re-scanned (Bash)
- [x] ISC-95: Anti: REPLAYED events never mutate engine state — sight-conversion ignores `PieceEvents.replaying` (vitest, advisor finding)

### Entry triangles + marine roster panel (2026-08-15 run)

- [x] ISC-270: GameScene preloads `entry.png` and `exit.png` theme textures (Grep)
- [x] ISC-271: every mission JSON's entryPoints carry `facing` extracted from the original `E:` tags; a spec cross-checks all 9 registered missions against the .mish sources (vitest)
- [x] ISC-272: entry triangles render one square OFF-board in the facing direction, rotated to point into the board per original EntryTriangle (`rotate(-90*efacing)` + FACEMAP offset); the purple square fill/stroke is gone (Grep + screenshot)
- [x] ISC-273: exit squares additionally render the `exit.png` arrow with the same off-board placement (original ExitArrow reuses EntryTriangle code) (screenshot)
- [x] ISC-274: every mission JSON's marineDeployment entries carry `squad` names from the original rosters; positional chunking is verified by type-sequence equality per squad (vitest)
- [x] ISC-275: client maps deployment `squad` + static thematic names onto engine marines BY ID at scene start (positional zip before any death can shrink the list) (vitest unit)
- [x] ISC-276: name generation is deterministic and static — same mission always yields the same names; sergeants get "Sgt." style, brothers "Bro." style, Space Hulk flavour (vitest unit)
- [x] ISC-277: a roster DOM panel renders to the RIGHT of the canvas: one row per squad (stacked vertically), cards ordered sergeant → specials → bolters within a row (Playwright)
- [x] ISC-278: each card shows the marine's theme icon, name, live AP `n/m`, ammo for flamer/assault-cannon, and a special-weapon label (Playwright)
- [x] ISC-279: a marine dying greys out its card (grayscale/dimmed + KIA), and it is no longer clickable-to-select (Playwright)
- [x] ISC-280: clicking a card selects that marine (Selection + map highlight) and pans the camera to him (Playwright)
- [x] ISC-281: clicking a marine on the map highlights his card; the selected card is visually distinct from unselected ones (Playwright)
- [x] ISC-282: the C.A.T. carrier's card shows a carry badge while carried, cleared on drop (vitest unit or Playwright)
- [x] ISC-283: an escaped marine's card shows ESCAPED styling distinct from KIA (vitest unit or Playwright)
- [x] ISC-284: overwatch and jam states surface on the card (badges) live (Playwright)
- [x] ISC-285: HUD legend/controls text updated — no stale "purple = stealer entry" claim (Grep)
- [x] ISC-286: Anti: engine stays Phaser/DOM-free — import grep guard still passes; roster is client-only (Grep)
- [x] ISC-287: Anti: all existing suites stay green (engine + client unit + e2e) and the build is clean after the change (Bash)

### Marker visibility + roster naming (2026-08-15 evening)

- [x] ISC-292: camera bounds include a HUD-width dead zone on the right — max pan brings the rightmost off-board marker fully into the board-view area (vitest-free geometry, Playwright probe)
- [x] ISC-293: permanent e2e guard sweeps ALL registered missions: every entry-triangle/exit-arrow rotated display bound lies within the reachable camera range (Playwright)
- [x] ISC-294: roster panel title reads "Marine Roster" (Playwright)
- [x] ISC-295: squad rows are titled after their leader — "Squad <sergeant first name>", fallback first member; data-squad keeps the original mission squad key (vitest + Playwright)
- [x] ISC-296: Anti: all suites green and the build clean after the change (Bash)

### Card polish — facing, CP, ammo line (2026-08-15 follow-up)

- [x] ISC-288: each living card shows a facing arrow glyph that updates when the marine turns (vitest + Playwright)
- [x] ISC-289: each living card shows the CP pool next to AP, live on cpChanged (vitest + Playwright)
- [x] ISC-290: ammo renders in its own .m-ammo element on a separate line — no longer part of .m-stats (Playwright + screenshot, no truncation)
- [x] ISC-291: Anti: all suites stay green and the build is clean after the change (Bash)

### Home page, mission flow & manual (2026-08-17 run)

Landing overlay:
- [x] ISC-472: opening `/` with no mission param loads space_hulk_1 as the backdrop (engine.mission.name === 'Suicide Mission') (Playwright evaluate)
- [x] ISC-473: a DOM home overlay is visible at `/` carrying the game title (Playwright locator)
- [x] ISC-474: the overlay includes an intro paragraph describing the game (Playwright text probe)
- [x] ISC-475: the overlay lists all 8 playable missions (6 campaign + 2 beta) with display name and one-line description each (Playwright count)
- [x] ISC-476: debug_1 does not appear in the landing mission list (Playwright zero-count)
- [x] ISC-477: clicking a mission entry navigates to `?mission=<key>` and that mission starts (Playwright click + evaluate)
- [x] ISC-478: a small credits footer names Toby Woodwark's original Sulk, Music of 40K audio, and GPL-3.0 (Playwright text probe)
- [x] ISC-479: a Manual link on the overlay navigates to the manual page (Playwright click + URL check)
- [x] ISC-480: the board is slightly visible beneath the overlay — overlay background is semi-transparent (computed backgroundColor alpha < 1) (Playwright evaluate)
- [x] ISC-481: attract mode disables gameplay input — pressing Enter at `/` does not advance the engine phase (Playwright keyboard + evaluate)
- [x] ISC-482: attract mode does not run the marine-phase clock (timer not started) (Playwright evaluate)
- [x] ISC-483: attract mode constructs no AudioManager (no music on the home page) (Playwright evaluate)
- [x] ISC-484: Anti: opening `/?mission=space_hulk_1` shows NO home overlay (Playwright zero-count)

End-of-mission dialog:
- [x] ISC-485: on a win, a DOM end-dialog appears showing the mission result (Playwright, pinned-seed autoplay win)
- [x] ISC-486: the end-dialog Retry button restarts the same mission (mission param preserved) (Playwright click + URL check)
- [x] ISC-487: the end-dialog "Choose another mission" button returns to the home overlay (Playwright click + locator)
- [x] ISC-488: on a loss, the same dialog appears with the failure result (Playwright, pinned losing seed)
- [x] ISC-489: the existing Phaser MISSION COMPLETE banner still renders behind the dialog (win.spec assertion unchanged) (Playwright)

Abort mission:
- [x] ISC-490: an Abort control is visible while a mission is being played (Playwright locator)
- [x] ISC-491: clicking Abort arms a confirm state; a second click returns to the homepage (Playwright two-click + URL check)
- [x] ISC-492: Anti: the Abort control is absent on the home overlay / attract mode (Playwright zero-count)
- [x] ISC-493: Anti: a single Abort click never navigates — confirmation is required (Playwright single-click + URL check)

Manual:
- [x] ISC-494: /manual.html loads with a title and zero console errors (Playwright pageerror capture)
- [x] ISC-495: the manual carries sections for turn structure, AP/CP, movement, shooting, overwatch, the flamer, close combat, doors, blips, flames, and victory objectives (Playwright heading probes)
- [x] ISC-496: rule numbers in the manual match docs/rules-reference.md (marine 4 AP / stealer 6 AP, d6 CP, overwatch 2 AP range 12, flamer 6 ammo kill 2+, 120s +30/sergeant clock) (grep of content module vs reference)
- [x] ISC-497: the manual contains at least 4 fake in-universe marine quotes styled as distinct blockquote elements (Playwright count)
- [x] ISC-498: the manual renders a TypeScript-built SVG map for every one of the 9 registered missions (Playwright svg count)
- [x] ISC-499: missionMapSVG draws squares by kind, door edges, entry/exit markers, deploy squares, and objective points (vitest on SVG output)
- [x] ISC-500: missionMapSVG element counts for space_hulk_1 match the mission JSON (squares, entries, deploys) (vitest)
- [x] ISC-501: the manual includes a map legend explaining the symbols (Playwright locator)
- [x] ISC-502: the manual links back to the game homepage (Playwright click + URL check)
- [x] ISC-503: the manual's missions section states each mission's objective and squad (Playwright text probes)
- [x] ISC-504: Anti: no copyrighted imagery added — maps are drawn from mission JSON only, no new binary art assets committed (git status inspection)

Build & regression:
- [x] ISC-505: the Vite production build emits both index.html and manual.html (Bash build + ls dist)
- [x] ISC-506: Anti: the full existing e2e suite passes after the change (specs that relied on bare-`/` = debug_1 updated to pin `?mission=debug_1`) (Playwright suite exit 0)
- [x] ISC-507: engine and client unit suites pass (Bash vitest exit 0)
- [x] ISC-508: the new home/manual e2e spec passes within the suite (Playwright)
- [x] ISC-509: README documents the home page, abort control, end dialog, and manual (Read)
- [x] ISC-510: docs/architecture.md covers the new client modules (home overlay, end dialog, abort, manual page) (Read)
- [x] ISC-511: Anti: seeded gameplay unchanged — playthrough.spec and all seeded e2e pass without pin changes (Playwright)
- [x] ISC-512: Anti: zero console errors on the home page (Playwright pageerror capture)
- [x] ISC-513: home overlay and manual visually verified in real Chrome via Interceptor screenshots (Interceptor)
- [x] ISC-514: work committed with a clean tree (Bash git status)

### Door-fire UX: reticle, real fallback, cause-aware audio (2026-08-18, fourth run — user playtest of v0.4.2)

- [x] ISC-620: a red reticle marks the door F would currently hit — hovered door first, else (when no enemy soaks the shot) the nearest shootable closed door; cleared when no target (Playwright: doorReticleFor states across all three scenarios + screenshot)
- [x] ISC-621: F auto-shoots the nearest shootable closed door even while the pointer rests on a non-door square — the v0.4.2 hover gate is reverted (Playwright: hoverCoord set, F, door destroyed, AP 4→3)
- [x] ISC-622: doorDestroyed carries `cause` — 'cut' plays the chainsaw, 'shot' stays with the weapon's own firing SFX (vitest: bolter shootDoor emits cause 'shot', chain-fist cutDoor emits 'cut'; Read AudioManager gate)
- [x] ISC-623: Anti: enemy priority survives the UX pass — a visible stealer takes the shot, the door stays intact, and the reticle is already null before the press (Playwright)
- [x] ISC-624: v0.4.3 released — tag CI green BEFORE the release was created (v0.4.2 lesson applied), release published, live bundle serves v0.4.3 with the reticle code present (gh run 32227022477 success; bundle grep v0.4.3 + doorReticle×2)
- [DEFERRED-VERIFY] ISC-619: live-site real-Chrome boot check (now v0.4.4) [both browser channels down this session: Interceptor extension handshake broken (3rd occurrence), claude-in-chrome denied by permission classifier. Mitigation: the same commit passed the full 62-test real-browser e2e suite locally incl. space_hulk_1 boot. Follow-up: repair Interceptor (Update workflow / Chrome restart), then `interceptor open https://harryf.github.io/sulkweb/?mission=space_hulk_1`]

### Enemy target reticle: see which stealer F shoots (2026-08-19, fifth run — user follow-up on v0.4.3)

- [x] ISC-625: the fire-target computation returns a discriminated union — hovered door, else nearest enemy, else nearest shootable door — from the SAME helpers handleFire uses, so indicator and shot can never diverge (Read GameScene fireTarget + grep shared helper names in both paths)
- [x] ISC-626: when the selected bolter/cannon marine has an enemy in fire arc + LOS, the red reticle is drawn centred on that enemy's square (Playwright: staged stealer, fireReticleFor = {kind:'enemy', pieceId, x, y})
- [x] ISC-627: when no enemy is visible the reticle still marks the door target exactly as in v0.4.3 — door-edge midpoint, hovered door first, else nearest shootable door (Playwright: fireReticleFor = {kind:'door', ...} at the staged door anchor)
- [x] ISC-628: a hovered closed door outranks a visible enemy in the reticle, matching F's actual priority (Playwright: stealer visible + hoverCoord on the door square → fireReticleFor kind 'door')
- [x] ISC-629: the enemy reticle marks the NEAREST enemy when several are visible — the one F actually kills (Playwright: two staged stealers at different ranges, reticle pieceId = nearer stealer's id, F kills that piece)
- [x] ISC-630: the reticle clears/retargets immediately after the shot — dead enemy never keeps a stale crosshair (Playwright: F, then fireReticleFor is null or a different target, never the dead pieceId)
- [x] ISC-631: Anti: no reticle in attract mode, when the game is over, when the flamer is selected (the only non-bolter-family marine — the chain fist extends StormBolterMarine and correctly keeps his bolter reticle), or when the marine is jammed/out of AP/ammo — fireTarget guards + the new canShootPiece legality mirror (Read guards + Playwright ap-exhausted probe + vitest empty-drum mirror)
- [x] ISC-632: Anti: the v0.4.3 door-keyboard regression suite still passes end-to-end after the rename (bunx playwright test door-keyboard)
- [x] ISC-633: keyboard-help note and rules-reference doc describe the reticle as marking F's target — enemy or door (Read both files)
- [x] ISC-634: full client e2e suite + engine tests green, typecheck clean (bun run test / e2e output)
- [x] ISC-635: v0.4.4 released — tag CI green BEFORE the release was created, release published, live bundle serves v0.4.4 with fireReticle code present (gh run 32230347102 success; bundle grep v0.4.4 + fireReticle×9)

### Keyboard remap: directional circle + weapon-key clarity (2026-08-19, sixth run — user playtest feedback)

- [x] ISC-636: Z moves diagonally back-LEFT and C moves diagonally back-RIGHT (swapped from v0.4.4), both at the 2 AP backward cost with facing kept (Playwright keymap: staged bolter, press z/c, assert pos+ap)
- [x] ISC-637: X moves straight backward (2 AP) — the QWE/AD/ZXC keys now form a directional circle around S (Playwright: press x, pos one square behind facing, ap −2)
- [x] ISC-638: S opens/closes the door ahead exactly as H does — H stays bound as an alias (Playwright: staged closed door ahead, press s, door isOpen; press h on another door still works)
- [x] ISC-639: M performs melee on the enemy directly ahead (Playwright: staged foe ahead, dice pinned, press m, closeCombat event fired, nobody self-destructed)
- [x] ISC-640: K toggles mute and the setting still persists across reload via localStorage sulk_muted (Playwright audio spec: press k, audio.muted true, reload, still true)
- [x] ISC-641: Anti: M no longer touches the audio — a press of M with audio constructed leaves audio.muted unchanged (Playwright: press m in the audio spec, muted stays false)
- [x] ISC-642: keyboardHelp KEY_ROWS data reflects the new layout — Z "back left", X "back", C "back right", S "open door", M "melee", K "mute" — with no duplicate keys and every bound key labeled (vitest keyboardHelp spec)
- [x] ISC-643: R and T keycaps carry the sub-label "assault cannon" and G carries "chain fist", rendered beneath the action word in both the in-game help and the manual page (vitest sub fields + Playwright DOM)
- [x] ISC-644: in-game keyboard help DIMS R/T/G in a mission that fields no assault cannon or chain fist marine (space_hulk_1) — keycap gets the disabled style (Playwright: class assertion on the caps)
- [x] ISC-645: in-game keyboard help shows R/T/G fully enabled in beta_2, the mission that fields both specialists (Playwright: no disabled class)
- [x] ISC-646: README controls table matches the new bindings — X back, Z/C back-left/right, S+H door, M melee, K mute listed (Read/grep README)
- [x] ISC-647: manual CONTROLS_INTRO and KEY_NOTES carry no stale references to the old layout (S back, X melee, M mute) (grep client src for stale strings)
- [x] ISC-648: the roster Credits line "M mutes sound" now says K (grep RosterPanel)
- [x] ISC-649: Anti: no em dashes introduced in any new or edited player-facing string (grep changed display strings)
- [x] ISC-650: Anti: the flamer-aim cancel key list treats M as an ACTION (cancels aim) while K (mute) keeps the aim, matching the old M-mute behavior (Read GameScene cancel string: m present, k absent)
- [x] ISC-651: the full client e2e suite (updated keymap/audio/help specs) and engine vitest pass, tsc clean in both packages (Bash exit codes)
- [x] ISC-652: Anti: the B double-press self-destruct disarm logic is untouched by the remap — pressing any non-B action key still disarms (Playwright keymap B test still green)
- [x] ISC-653: v0.4.5 released — main pushed, tag CI green BEFORE the release was created, release published, live bundle serves v0.4.5 with the remapped key handling present (gh run 32237513444 success; main bundle grep v0.4.5 + keydown-K; keyboardHelp chunk carries back left/right, open door, melee, mute, all three weapon subs)

### Number-key marine selection: mouseless play (2026-08-19, seventh run — user follow-up on v0.4.5)

- [x] ISC-654: pressing 1..5 selects the nth marine of the FIRST squad row as displayed (sergeant first, then specials, then bolters) — same order the cards render (Playwright: Selection.get() matches the roster entry id per key)
- [x] ISC-655: pressing 6..0 selects the nth marine of the SECOND squad row in a two-squad mission (beta_2: Sakharov 1-5, Sternfeld 6-0) (Playwright)
- [x] ISC-656: hotkey assignment is positional per squad BLOCK — squad two always starts at 6 regardless of squad one's size; single-squad missions leave 6..0 unassigned (vitest assignHotkeys)
- [x] ISC-657: numbers never reshuffle on death — a dead marine keeps his number and no survivor's number changes (vitest: map computed once from the scene-start roster; Playwright: kill then re-press others)
- [x] ISC-658: pressing a dead marine's number leaves the current selection unchanged (Playwright: kill, press his key, Selection.get() unchanged)
- [x] ISC-659: pressing an escaped marine's number leaves the selection unchanged — escape sets alive=false exactly like death, one guard covers both (Read GameEngine.tryEscape + selectFromRoster guard; vitest not needed beyond the alive gate)
- [x] ISC-660: a number press goes through the SAME selectFromRoster path as a card click — flamer aim disarmed, selected event emitted, camera pans to the marine (Playwright: flamerAiming true then number press leaves it false; Read for the shared call)
- [x] ISC-661: each living marine's roster card shows his hotkey as "[n]" (Playwright DOM: .m-hotkey text per card)
- [x] ISC-662: the hotkey badge is cleared from the card when the marine dies or escapes, matching the inert key (Playwright: kill, .m-hotkey empty on that card)
- [x] ISC-663: a squad with more than 5 marines assigns hotkeys only to its first five display positions — extras get none, no crash (vitest synthetic entries)
- [x] ISC-664: a third squad (if a future mission has one) gets no hotkeys (vitest synthetic entries)
- [x] ISC-665: Anti: attract mode ignores number keys — the homepage backdrop never gains a selection (existing keyboard disable; Playwright home: press 1, Selection empty)
- [x] ISC-666: Anti: a number press while paused or during the stealer replay does nothing (selectFromRoster guard; Playwright: pause then press)
- [x] ISC-667: the keyboard help documents the number row (KEY_NOTES line naming 1-5 / 6-0 squads) and README controls table gains the 1-0 row (Read both)
- [x] ISC-668: Anti: no em dashes in any new player-facing string (grep added display strings)
- [x] ISC-669: Anti: the digit keys do not collide with existing bindings — no addKeys change, dedicated keydown-DIGIT handlers with the shared seenKeyEvents dedupe (Read GameScene)
- [x] ISC-670: full client e2e + unit suites and engine tests green, tsc clean both packages (Bash exit codes)
- [x] ISC-671: v0.4.6 released — main pushed, tag CI green BEFORE the release was created, release published, live bundle serves v0.4.6 with the hotkey code present (gh run 32244944758 success; main-BjwaXd1w.js: v0.4.6 + m-hotkey x2; keyboardHelp-Bm7SgSOc.js: select-marine + press-his-number strings)

### Minimap radar: click focus, marine dots, pulsing echoes, distance audio (2026-08-19, eighth run)

- [x] ISC-672: clicking the minimap centers the main camera on the corresponding world point — local px / mapScale (Playwright: click a minimap point, camera midpoint lands on the expected world coords)
- [x] ISC-673: click-to-focus respects the existing camera bounds — a corner click clamps at setBounds, never scrolls past (Playwright corner click, scroll within bounds)
- [x] ISC-674: the white viewport box follows a minimap click — lastBox moves toward the clicked point (Playwright lastBox before/after)
- [x] ISC-675: Anti: a minimap click never changes the selection — the selected marine stays selected (Playwright: select, click minimap, Selection.get() unchanged)
- [x] ISC-676: cursor-key camera panning still works after the change (Playwright: arrow key scrolls camera)
- [x] ISC-677: the minimap-local-to-world projection is a pure unit-tested function (vitest miniToWorld)
- [x] ISC-678: every living marine renders as a red dot at his board square on the minimap (Playwright probe: dot count equals living marines)
- [x] ISC-679: a marine's dot follows his movement (Playwright: move marine, dot position updates)
- [x] ISC-680: a dead marine's dot disappears (Playwright: kill, dot count drops)
- [x] ISC-681: an escaped marine's dot disappears — the same alive filter covers death and escape (Read alive filter; ISC-659 engine pin already guarantees escape sets alive=false)
- [x] ISC-682: stealer echoes use a solid green radial-gradient cloud texture, blip echoes a fainter wider more transparent one (Read texture generation params)
- [x] ISC-683: stealer echo peak alpha strictly greater than blip echo peak alpha (vitest on radar config)
- [x] ISC-684: decoy ambush counters (kind 'blip') render as blip echoes with no special case (Read kind routing; vitest predicate)
- [x] ISC-685: echo positions project piece board squares to minimap px with the same scale as the tiles (vitest projection; Playwright probe)
- [x] ISC-686: echoes appear only via pulses — before the first pulse none are visible (Playwright: echo count 0 at boot)
- [x] ISC-687: AudioManager fires an onPing callback each tracker cycle with the interval, even when the ping WAV is absent from cache (Read: callback outside the cache guard)
- [x] ISC-688: pulse rings expand from each living sergeant's minimap position (Playwright probe: pulse origins equal living sergeant squares)
- [x] ISC-689: Antecedent: echo reveal is delayed proportionally to minimap distance from the nearest living sergeant, so the radar reads as a physical expanding wavefront rather than a UI toggle (vitest pulse timing function; Playwright delayed-appearance probe)
- [x] ISC-690: echoes fade out over the pulse interval so each pulse visibly refreshes them (vitest: fade duration derived from interval)
- [x] ISC-691: pulse cadence IS the tracker cadence — closer threats mean faster pulses, no separate clock (Read: onPing wired only from scheduleTracker)
- [x] ISC-692: with no living sergeant there are no pulse rings and no echoes — stealers and blips vanish from the minimap (Playwright: kill sergeants, pulse, echo count 0)
- [x] ISC-693: marine red dots remain visible with no living sergeant (Playwright same scenario: dots unchanged)
- [x] ISC-694: mute does not stop the pulses — mute silences sound, not scheduling (Read: scheduleTracker runs regardless of scene.sound.mute)
- [x] ISC-695: Anti: attract mode shows no echoes and no pulse errors — no AudioManager means no pulses, no crash (Playwright home boot, zero console errors, echo count 0)
- [x] ISC-696: game over stops the pulses (Read: existing gameOver trackerTimer.remove path also stops onPing)
- [x] ISC-697: Anti: echo objects are reused per piece id across pulses — repositioned, never recreated per pulse (Read: Map keyed by pieceId)
- [x] ISC-698: pure distanceGainFactor returns 1.0 at or inside fullDist (vitest)
- [x] ISC-699: distanceGainFactor returns minGain at or beyond farDist — quiet but never silent (vitest)
- [x] ISC-700: distanceGainFactor is monotonic non-increasing between the bounds; null distance returns 1.0 (vitest)
- [x] ISC-701: doorToggled SFX volume scales with the door's distance from the nearest living marine — a far stealer door plays quiet, a marine-adjacent door plays full (Playwright: emit far and near doorToggled, compare lastPlay.volume)
- [x] ISC-702: stealer skitter volume attenuates by the mover's position (Read routing; e2e lastPlay)
- [x] ISC-703: the blip-conversion voice attenuates by the conversion square (Read routing)
- [x] ISC-704: the stealer death cry attenuates by the death square (Read routing)
- [x] ISC-705: a stealer close-combat attack plays effectively full — the attacker is adjacent to a marine, inside fullDist (vitest boundary: dist 1 gives factor 1.0)
- [x] ISC-706: AudioManager exposes a lastPlay {key, volume} probe surface for the e2e suite (Read; consumed by ISC-701)
- [x] ISC-707: Anti: marine-caused sounds keep their current loudness — shots, flame, jam, malfunction stay unrouted at full gain (Read: those handlers unchanged)
- [x] ISC-708: Anti: main-map rendering of stealers and blips is unchanged — the radar reveals nothing outside the minimap (git diff: no piece-sprite render path edits)
- [x] ISC-709: Anti: no em dashes in any new player-facing string (grep new display strings)
- [x] ISC-710: README and the in-game/manual docs mention minimap click-to-focus and the sergeant radar (Read both)
- [x] ISC-711: typecheck clean in both packages (Bash tsc exit 0 twice)
- [x] ISC-712: engine tests, client unit tests, and the full e2e suite green (Bash exit codes)
- [x] ISC-713: Anti: pulse rings and echo images never paint outside the minimap rectangle — screen-space geometry mask on the ring and echo layers (Read mask construction; full-canvas screenshot mid-sweep)
- [x] ISC-714: the radar freezes during the stealer-phase replay — no dot redraws or pulses read the final engine state ahead of the animation (Read: minimap.frozen set with animating, pulse/drawMarines gated)
- [x] ISC-715: positional attenuation reads a payload-driven marine mirror, so replayed sounds anchor to the board AS SHOWN — a marine dying mid-replay holds full volume until his death event plays (Read mirror seeding + pieceMoved/pieceDied/marineEscaped/pieceAdded upkeep)
- [x] ISC-716: the echo timing envelope (delay + ramp + fade) always fits the pulse interval — at panic cadence the DELAY collapses, never the ramp or the dwell floor (vitest)
- [x] ISC-717: the first tracker cycle cannot be missed — the ping callback rides the AudioManager constructor ahead of any synchronous startAll (Read)
- [x] ISC-718: click-to-focus centres the clicked point in the VISIBLE play area, offsetting the HUD-covered half of the canvas (Read onFocus +HUD_WIDTH/2)
- [x] ISC-719: beta_2 pulses ride BOTH sergeants (origins = both positions) and one sergeant's death leaves the other's auspex alive (Playwright)
- [x] ISC-720: the kind-to-style wiring is pinned end to end — the stealer's echo wears echo_stealer, the blip's echo_blip, via the echoTexture probe (Playwright)
- [x] ISC-721: Anti: marine gunfire is never attenuated — a shot event plays at exactly the full SFX gain (Playwright lastPlay)
- [x] ISC-722: the live onPing wiring pulses the minimap with no test scaffolding — lastPulse set by the real scheduler alone (Playwright waitForFunction)
- [x] ISC-723: v0.4.7 released — main pushed, tag CI green BEFORE the release is created, release published, live bundle serves v0.4.7 with the radar code present (gh run watch; bundle greps for version + radar strings)

### Main-map motion: piece animation, sliding doors, flame shimmer, camera inertia (2026-08-19, ninth run)

Pure motion logic (`utils/motionLogic.ts`, vitest):
- [x] ISC-724: a new pure module `utils/motionLogic.ts` exports a MOTION config with per-kind step profiles (marine, stealer, blip), each naming duration and ease (Read + vitest)
- [x] ISC-725: Antecedent: kind contrast is pinned — stealer step duration < marine step duration < blip step duration, the precondition for heavy-vs-nimble-vs-suggestive reading as intended (vitest)
- [x] ISC-726: the marine step stays under 200ms — heavy but never wasting the countdown (vitest threshold)
- [x] ISC-727: `kindFromTexture` maps 'stealer' to stealer, 'blip' AND 'ambush_counter' to blip, and every terminator_* key to marine — the decoy counter inherits the blip slide with no special case (vitest)
- [x] ISC-728: `camPanStep` velocity ramps monotonically under held input and never exceeds its cap for any dt in a sweep (vitest)
- [x] ISC-729: `camPanStep` decays released velocity below 1% of cap within 400ms of no input (vitest)
- [x] ISC-730: door slide config: open shrinks the door's long axis to a small parted fraction, close restores to exactly 1, both under 220ms (vitest)
- [x] ISC-731: `shimmerPhase(x,y)` is deterministic — same square same offset, adjacent squares differ (vitest)
- [x] ISC-732: `recoilVector(facing)` returns a small (≤3px) offset opposite the facing unit vector for all four facings (vitest)

Scene wiring (Playwright):
- [x] ISC-733: a legal interactive marine step tweens the sprite — the motionLog probe records a tweened marine step at the marine profile duration and the sprite settles at exactly the destination square centre (Playwright debug_1)
- [x] ISC-734: marine turns ease the rotation and the settled angle is equivalent to facing·π/2 modulo 2π (Playwright)
- [x] ISC-735: the selection highlight and overwatch/jam markers ride the sprite every frame — after settle they sit exactly on/at their sprite offsets (Playwright)
- [x] ISC-736: during the stealer-phase replay the step log records stealer moves at the stealer profile duration (Playwright stepLog probe)
- [x] ISC-737: blip replay moves use the blip slide profile in the step log (Playwright stepLog probe)
- [x] ISC-738: doorToggled animates a slide — the motionLog records the door motion and the settled state is the correct texture at scale exactly 1 (Playwright)
- [x] ISC-739: every burning square's flame sprite carries a looping shimmer tween while alight (Playwright isTweening)
- [x] ISC-740: flamesCleared kills the shimmer and destroys the sprite — flameSprites empty for those squares, no orphan tweens (Playwright)
- [x] ISC-741: a marine shot recoils the shooter sprite (tween observed) and returns it to the exact square centre (Playwright)
- [x] ISC-742: a killed piece's sprite plays the death flourish (alpha/scale tween) and is destroyed at the end (Playwright)
- [x] ISC-743: arrow-key panning has inertia — camVel ramps while held, decays to zero after release, and the scroll stops changing (Playwright camVel probe)
- [x] ISC-744: a fast drag flick leaves momentum — camVel is nonzero right after mouseup and decays to zero (Playwright)
- [x] ISC-745: pointerdown grabs the map — starting a new drag mid-glide zeroes the momentum (Playwright)
- [x] ISC-746: doorDestroyed plays a crumble (fade/shrink) before the sprite is destroyed, and the sprite map entry is removed immediately (Playwright)

Anti-criteria:
- [x] ISC-747: Anti: prefers-reduced-motion disables all new motion — a W step lands at the destination centre with no tween on the immediate next probe (Playwright emulateMedia)
- [x] ISC-748: Anti: post-replay reconciliation stays exact — every piece sprite ends at engine-truth position AND scale 1, alpha 1 (existing drift check + scale/alpha extension)
- [x] ISC-749: Anti: the minimap gains no motion — no new tween targets any minimap layer; the radar e2e suite stays green (Playwright suite)
- [x] ISC-750: Anti: the ISC-676 arrow-pan regression stays green — a 250ms held arrow still moves the camera (Playwright)
- [x] ISC-751: Anti: animation never delays the engine — AP and engine position update synchronously on the keypress while the sprite is still mid-tween (Playwright)
- [x] ISC-752: Anti: no em dashes in any new or edited player-facing string (grep)
- [x] ISC-753: Anti: the attract-mode homepage stays clean — zero pageerrors with the animation code present (existing home test green)
- [x] ISC-754: Anti: rapid consecutive steps never desync — two quick legal W presses settle the sprite at the FINAL engine square exactly (Playwright)
- [x] ISC-755: Anti: repeated rapid shots never displace a marine — after two quick F shots the sprite is back at the exact centre (Playwright)

Docs + suites:
- [x] ISC-756: README gains a short Motion note covering the new animation and the prefers-reduced-motion respect (Read)
- [x] ISC-757: engine suite untouched and green (bun test)
- [x] ISC-758: client unit suite green with new motionLogic specs at 100% coverage for the new module (bun run test)
- [x] ISC-759: full client e2e suite green including the new animation spec (bunx playwright test)
- [x] ISC-760: tsc clean in both packages (bunx tsc --noEmit)
- [x] ISC-761: visual evidence captured — a mid-replay or mid-slide screenshot set written to the scratchpad (Playwright screenshots)
- [x] ISC-762: v0.4.8 released — main pushed, tag CI green BEFORE the release is created, release published, live bundle serves v0.4.8 with the motion code present (gh run watch; bundle greps for version + motion strings)

## Verification (archived evidence)

### Minimap radar (2026-08-19 eighth run, ISC-672..712)

- ISC-723: Bash — pushed e7c526d..a79bfda; tag v0.4.7; deploy run 32254736666 completed success BEFORE the release was created (codified order); release https://github.com/harryf/sulkweb/releases/tag/v0.4.7 "The hulk pings back" published; live home + manual 200; main-BmjP2yWF.js carries v0.4.7, echo_stealer, and the onPing/marineMirror radar code; the manual chunk carries "auspex" x3. Classifier returned NATIVE on "push and tag release" — context-override to ALGORITHM E1 per the standing release precedent (fourth application).
- ISC-672/674/675: Playwright radar spec — click at minimap local (92,140) lands cam.midPoint.y within one tile of local/mapScale world y (669.6); lastBox.y changed; Selection.get() unchanged across the click (the in-flight selection pan is reset first — panEffect.reset() in onFocus, found by the test itself: the 250ms pan stomped centerOn next frame)
- ISC-673: Playwright — corner click clamps scrollX/scrollY to cam.getBounds() min exactly; bottom-edge click clamps scrollY to bounds max (computed live from cam.height, no hardcoded geometry)
- ISC-676: Playwright — ArrowDown held 250ms still increases scrollY after the change
- ISC-677: vitest — miniToWorld inverts the projection (92,46 at sh1 scale → 440,220; corners map to corners)
- ISC-678/679/680: Playwright (debug_1 — sh1 deploys the squad boxed in with no legal step) — lastMarineDots.length equals living marines; a tryMove step changes the dot set next frame; alive=false drops the count by one (per-frame redraw reads engine alive directly)
- ISC-681: Read — drawMarines filters on p.alive, the same flag tryEscape sets false (engine-side pin from ISC-659 still green)
- ISC-682: Read makeCloudTexture — stealer texture coreAlpha 1/coreStop 0.35 (tight solid core), blip 0.55/0.15 (early-fading smear); screenshot radar-pulse.png shows both solidities on the live scope
- ISC-683: vitest — stealerAlpha 0.9 > blipAlpha 0.38, blipSizePx 15 > stealerSizePx 11
- ISC-684: Read — echo texture keyed on kind === 'stealer' ternary; AmbushCounter extends Blip (kind 'blip'), no special case exists to get wrong
- ISC-685: Read toMini — (c+0.5)*tile*mapScale, the same scale the tile images use; screenshot shows echoes seated on the corridor grid
- ISC-686: Playwright — with three stealers spawned and NO pulse fired (onPing detached), activeEchoes() === 0
- ISC-687: Read scheduleTracker — this.onPing?.(interval) sits outside play()'s cache guard; a missing tracker WAV silences the ping but not the sweep
- ISC-688: Playwright — lastPulse.origins deep-equals the living sergeants' board squares
- ISC-689: vitest — delay 0 at the origin, monotonic with distance, exactly ringDurationMs at max range, clamps beyond, degenerate maxPx=0 never divides by zero; Playwright: echoes revealed after the pulse
- ISC-690: vitest — fadeMs = interval - delay, clamped at minFadeMs 250 under panic cadence
- ISC-691: grep — onPing is invoked exactly once in the codebase (scheduleTracker) and minimap.pulse is wired exactly once (GameScene onPing); no other clock exists
- ISC-692: Playwright — all sergeants alive=false, pulse: lastPulse.origins [], activeEchoes 0 (clearEchoes destroys immediately)
- ISC-693: Playwright — same scenario, lastMarineDots.length > 0
- ISC-694: Read — scheduleTracker rechecks only this.over; scene.sound.mute silences playback, never scheduling
- ISC-695: Playwright — homepage: sulk.audio null, activeEchoes 0, lastPulse null, zero pageerror events
- ISC-696: Read — gameOver handler removes trackerTimer and sets over; scheduleTracker bails on this.over, so no further onPing fires
- ISC-697: Read — echoes is a Map<pieceId, Image>; pulse repositions and re-tweens the existing image, creating one only on first contact and destroying only when the contact leaves the board
- ISC-698/699/700/705: vitest — factor 1 at 0/1/fullDist; minGain at farDist and beyond; monotonic non-increasing sweep 0..farDist+2; null → 1; dist 1 (CC adjacency) → 1
- ISC-701/706: Playwright — synthetic doorToggled at a marine's own square: lastPlay {key: sfx_door, volume: 0.8}; at the board square farthest from every living marine (Chebyshev, computed live): volume < 0.8 and ≥ 0.2 floor
- ISC-702/703/704: Read — stealer skitter playAlien('stealer_move', x, y), blipConverted playAlien('stealer_door', x, y), stealer death playAlien('stealer_death', x, y) — all through playAt's single gain rule
- ISC-707: git diff — shot/sectionFlamed/malfunction/jammed handlers untouched; marine clank and marine death unrouted
- ISC-708: git diff grep — zero additions touching createSprite/pieceSprites/setTexture in GameScene; the change set is minimap + audio + docs + tests only
- ISC-709: git diff grep — zero em dashes in the new KEY_NOTES line and manual auspex HTML
- ISC-710: Read — README controls row "Mini-map click", README "Mini-map auspex" section + "Positional volume" sound bullet; manual SECTIONS gains id 'auspex'; KEY_NOTES gains the mini-map line
- ISC-711: Bash — tsc --noEmit exit 0 in packages/client and packages/engine (re-run clean after the review round)
- ISC-712: Bash — engine vitest 288/288; client unit 58/58 (8 files, radarLogic at 100% coverage); full Playwright e2e 78/78 (69 existing + 9 radar, incl. review-round additions)
- ISC-713: Read Minimap mask construction (make.graphics off-list, scrollFactor 0, fillRect at the minimap's screen rect, GeometryMask on ringGfx + echoLayer); screenshot radar-mask-full.png: mid-sweep arc clipped exactly at the minimap rectangle, zero paint over the board
- ISC-714: Read — endTurn sets minimap.frozen with animating, finishReplay clears both; updateCam skips drawMarines and pulse() returns early while frozen
- ISC-715: Read — marineMirror seeded from engine at construction; pieceMoved updates ids it holds, pieceDied(kind marine)/marineEscaped delete, pieceAdded(marine) inserts; nearestMarineDist iterates the mirror only
- ISC-716: vitest — fadeMs = interval - delay - fadeInMs at generous cadence, envelope sum ≤ interval, panic delay collapses to 0 with fade at the 250ms floor
- ISC-717: Read — AudioManager constructor takes onPing as its fourth parameter and assigns before the startAll branch; GameScene passes the pulse callback at construction
- ISC-718: Read — onFocus does panEffect.reset() then centerOn(wx + HUD_WIDTH / 2, wy), centring in the visible play area left of the opaque HUD strip
- ISC-719: Playwright beta_2 — lastPulse.origins (set-compared) equals both living sergeants' squares; after one sergeant dies, one origin remains and activeEchoes > 0 at 900ms
- ISC-720: Playwright — echoTexture(spawned stealer id) === 'echo_stealer', echoTexture(boot blip id) === 'echo_blip' immediately after pulse
- ISC-721: Playwright — synthetic shot from a living marine: lastPlay.volume exactly 0.8
- ISC-722: Playwright — no manual pulse() call in the test; waitForFunction(lastPulse !== null, 8s) satisfied by the real tracker scheduler after the unlock click; origins non-empty
- Screenshots: scratchpad radar-pulse.png (red dot column, one solid + several faint green echoes mid-sweep), radar-dark.png (same board, sergeant dead: dots only, scope dark), radar-mask-full.png (full canvas: ring clipped to the minimap)

### Main-map motion (2026-08-19 ninth run, ISC-724..761)

- ISC-724..732: Bash vitest — 12 new motion.spec unit tests green inside 70/70; motionLogic.ts 100% line/branch/function coverage; profiles 80 < 170 < 240ms, marine ≤200, kindFromTexture covers all nine piece textures incl. ambush_counter, camPanStep saturates at exactly maxSpeed and parks at exactly 0, shimmerPhase deterministic and neighbor-distinct, recoilVector opposite-facing ≤3px all four facings, shortestRotationDelta never exceeds |π| and lands angle-equivalent for all 16 facing pairs
- ISC-733/751: Playwright — motionLog records tweened marine step ≤200ms while the same evaluate shows engine pos already at destination and the sprite pair still off it (engine never waits); waitForFunction settled at exact centre with scale 1
- ISC-734/735: Playwright — settled rotation angle-equivalent to facing·π/2 (1e-6); highlight.x/y === sprite.x/y and jam marker at (+12,−12) after the eased turn
- ISC-736/737: Playwright — replay motionLog contains tweened stealer steps and blip steps; stealer duration < blip duration asserted from the log
- ISC-738: Playwright — useDoor open + close each log exactly one tweened door entry; settle checks texture door_open/door_closed at scaleX 1, alpha 1
- ISC-739/740: Playwright — every flameSprite isTweening while alight; after flamesCleared count 0, sprites destroyed, zero orphan tweens on the dead sprites
- ISC-741/755: Playwright — two rapid synthetic shots log 2 recoil entries; sprite settles back at exact centre, scale 1
- ISC-742: Playwright — synthetic pieceDied logs one death entry, pieceSprites map entry gone synchronously, sprite absent from the display list after the flourish
- ISC-743/750: Playwright — camVel.y > 0 while ArrowDown held, scroll advanced (ISC-676 arrow regression also green in the full run), camVel parks at exactly 0 and scrollY frozen across a 120ms window
- ISC-744/745: Playwright — drag flick leaves camVel nonzero after mouseup, decays to exactly 0; a fresh grab (pointerdown) zeroes both components instantly
- ISC-746: Playwright — synthetic doorDestroyed: map entry undefined in the same tick, one door-crumble log entry, sprite still active for the art, and no alpha-0 zombie door on the display list 400ms later
- ISC-747: Playwright emulateMedia reducedMotion — step lands at exact centre in the same tick, all log entries tweened:false, camVel stays 0 under a held arrow
- ISC-748: Playwright — post-replay sweep over engine pieces: exact position AND scaleX/scaleY 1 AND alpha 1, zero drift entries
- ISC-749: Bash git diff --name-only — Minimap.ts untouched (only GameScene.ts, README.md, ISA.md + new files); radar.spec green inside the full run
- ISC-752: Bash grep of added lines — the single em dash sits in a code comment (allowed); no new player-facing strings added
- ISC-753: Playwright — home.spec green in the full run with the animation code present
- ISC-754: Playwright — two back-to-back tryMoves settle at the FINAL engine square exactly
- ISC-756: Read — README "### Motion" section present between auspex and Sound
- ISC-757..760: Bash — engine 288/288, client unit 70/70 (motionLogic 100% cov), e2e 97/97 (78 prior + 19 motion), tsc --noEmit clean in both packages (final post-review-round run)
- ISC-761: Bash — scratchpad motion-replay.png (blip visibly OFF tile centre mid-slide, three flame tiles alight, Turn 1: Stealers) + motion-door-slide.png (squad door frame during the open)
- ISC-762: Bash — pushed ce279aa..72907bc; tag v0.4.8; deploy run 32265234725 completed success BEFORE the release was created (codified order); release https://github.com/harryf/sulkweb/releases/tag/v0.4.8 "The hulk moves" published; live home + manual 200; main-C1yrel04.js carries v0.4.8 x1 and the motion string literals motionLog x2, door-crumble, door-open, recoil, ambush_counter x2, prefers-reduced-motion (function identifiers are minified — string literals are the honest probe). Classifier returned ALGORITHM E3 on "OK push and tag" — executed at E1 per the standing release precedent (fifth application).

### Number-key marine selection (2026-08-19 seventh run, ISC-654..671)

- ISC-671: Bash — pushed 03dcba4..b5f8d2d; tag v0.4.6; deploy run 32244944758 success BEFORE release create; release https://github.com/harryf/sulkweb/releases/tag/v0.4.6 published; live home/manual 200; main-BjwaXd1w.js has v0.4.6 + m-hotkey x2; help chunk has the select-marine strings

- ISC-654/655: Playwright hotkeys spec — beta_2: pressing 2/6/0/1 each selects exactly the marine whose card wears that badge (badge↔key agreement asserted through the DOM, not duplicated mapping logic); [1] and [6] are the sergeants
- ISC-656/663/664: vitest — synthetic 3-marine squad one still starts squad two at 6; b6 (sixth member) and c1 (third squad) get no key; map size 8
- ISC-657/658/662: Playwright — [2] killed at engine level + pieceDied emitted: pressing 2 leaves selection on [1]'s marine, pressing 3 still selects the ORIGINAL third marine, the dead card's badge is removed; vitest purity check: identical map before/after mutation
- ISC-659: Read — GameEngine.tryEscape sets marine.alive=false + removePiece, identical to death; selectFromRoster's single !piece.alive guard covers both; markState (badge removal) fires from the marineEscaped event exactly as from pieceDied
- ISC-660: Playwright — flamer armed (flamerAiming true), press 1: aiming false and selection moved; the digit handler calls the SAME selectFromRoster the card click uses (Read)
- ISC-661: Playwright + screenshot scratchpad/hotkey-squad1.png — all ten badges render [1]..[5]/[6]..[0] per squad row in card order
- ISC-662 (visual): screenshot scratchpad/hotkey-squad1-kia.png — [2]'s card KIA-greyed with no badge, neighbours keep theirs
- ISC-665: Playwright — homepage: press 1, Selection.get() null (attract keyboard disable holds)
- ISC-666: Playwright — Escape pause, press 3: selection unchanged
- ISC-667: Read — KEY_NOTES first line documents 1-5/6-0 + [n] badge + fallen-marine inertness; help SPECIAL_KEYS shows the '1-0 select marine' cap; README table row present
- ISC-668: Bash — git diff added lines of keyboardHelp.ts + README grep em dash: 0
- ISC-669: Read — no addKeys change; ten dedicated keydown-DIGIT handlers, each with the shared seenKeyEvents dedupe; digits collide with nothing (letters/Enter/Esc only elsewhere)
- ISC-670: Bash — engine 288/288 (incl. new escape alive=false pin), client unit 30/30 (incl. escaped-badge assertion; tautological purity test deleted per review), full e2e 69/69 twice (one pre-existing audio-fade flake passed in isolation and on re-run), tsc --noEmit clean both packages

### Keyboard remap: directional circle + weapon-key clarity (2026-08-19 sixth run, ISC-636..653)

- ISC-653: Bash — pushed 07baf5c..fc4ac7c; tag v0.4.5; deploy run 32237513444 success BEFORE release create; release https://github.com/harryf/sulkweb/releases/tag/v0.4.5 published; live home/manual 200; main-D-nmvg8j.js has v0.4.5 + keydown-K; keyboardHelp-RYs3Pya6.js has every new label + weapon sub

- ISC-636: Playwright keymap — staged bolter facing north: q/(19,19) ap3, c back-right/(20,20) ap1, AP topped to 4, z back-LEFT lands (19,21) ap2 (positive move, not a refusal — review fix), e/(20,20) ap1, c refused at 1 AP; test green
- ISC-637: Playwright — new test "X moves straight backward at 2 AP": press x from (20,20) facing north → (20,21), ap 4→2, facing kept
- ISC-638: Playwright — press s opens the (18,20)|(19,20) door, press h closes it again (alias proven in the same test)
- ISC-639: Playwright — press m with foe staged ahead, dice pinned 3: closeCombat event fired, all 5 marines alive (no detonation)
- ISC-640: Playwright audio spec — press k: audio.muted true, scene.sound.mute true; reload: still muted, localStorage sulk_muted = '1'
- ISC-641: Playwright audio spec — press m BEFORE k with audio constructed: audio.muted stays false
- ISC-642: vitest keyboardHelp spec — byKey assertions Z 'back left', X 'back', C 'back right', S 'open door', M 'melee', K 'mute'; bound-key set matches addKeys+handlers exactly, no duplicates
- ISC-643: vitest — R/T sub 'assault cannon' requires 'assault_cannon', G sub 'chain fist' requires 'chain_fist', B sub 'heavy flamer' requires 'heavy_flamer' (review adoption), nothing else carries requires; Playwright roster spec asserts the rendered '(assault cannon)'/'(chain fist)' <small> text
- ISC-644: Playwright roster spec — space_hulk_1: exactly 3 .keycap.disabled caps with kbd text R/T/G and title 'No assault cannon in this mission'; screenshot scratchpad/keymap-sh1-dimmed.png shows them greyed
- ISC-645: Playwright roster spec — beta_2: zero .keycap.disabled; screenshot scratchpad/keymap-beta2-live.png shows R/T/G fully lit with sub-labels
- ISC-646: Read README — W/X, Z/C back-left/right, S (or H) door, M close combat, R/T '(assault cannon only)', G '(chain fist only)', K mute rows all present
- ISC-647: grep client src — zero matches for the stale layout (S back / X melee / M mute as display strings); CONTROLS_INTRO now names the movement circle with S at its centre
- ISC-648: grep RosterPanel — credits line reads 'K mutes sound.'
- ISC-649: Bash — git diff added lines for keyboardHelp/RosterPanel/content.ts/README grep '—': only two code comments match, zero player-facing strings
- ISC-650: Read GameScene — cancel list 'wsadqezchxoutrgpbm' contains m, no k; comment names K as the aim-keeping mute
- ISC-651: Bash — engine vitest 288/288 exit 0 (direct run), client vitest 47/47, full Playwright e2e 65/65 (was 62 + 2 dimming + 1 X-back), tsc --noEmit clean in both packages
- ISC-652: Playwright — keymap B test unchanged and green: held B never fires, single press arms, second press detonates

### Enemy target reticle (2026-08-19 fifth run, ISC-625..634)

- ISC-625: Read — fireTarget() calls hoveredDoorFor/nearestEnemyTarget/nearestShootableDoor, the exact three helpers handleFire executes; grep confirms no other target computation exists
- ISC-626: Playwright — staged stealer at (18,20): fireReticleFor = {kind:'enemy', pieceId, x:18, y:20} before the press; screenshot scratchpad/enemy-reticle.png shows the red crosshair centred on the stealer sprite
- ISC-627: Playwright — no enemy staged: fireReticleFor = {kind:'door', x:18, y:20} at the door anchor, F destroys it (AP 4→3), reticle null after
- ISC-628: Playwright — stealer visible + hoverCoord {18,20}: reticle kind 'door' (hovered door outranks the enemy, matching F)
- ISC-629/630: Playwright — door opened, stealers at (18,20)+(19,20): reticle = near id; F kills it; reticle retargets to the far id (never the corpse), 1 stealer left
- ISC-631: Playwright — ap=0 + freeShot=false → reticle null; attract/result/jam guards unchanged in fireTarget (Read); vitest — cannon canShootPiece false on empty drum and on 0 AP, true on full drum (mirrors shoot()'s bail exactly)
- ISC-632: Bash — bunx playwright test door-keyboard: 6/6 passed (10.5s pre-review, re-run green in the full suite post-review)
- ISC-633: Read — keyboardHelp note "The red reticle marks the target F will hit"; rules-reference.md line 105 "the targeted stealer or the door" (em dashes removed per repo displayed-strings rule)
- ISC-634: Bash — engine vitest 288/288 (incl. new canShootPiece mirror test), full client e2e 62/62 (23.0s), tsc --noEmit clean both packages (post-review-fix run)
- ISC-635: Bash — tag v0.4.4 on d13aee3 pushed; gh run 32230347102 (Deploy to GitHub Pages) success BEFORE release create; release https://github.com/harryf/sulkweb/releases/tag/v0.4.4 published; live home/manual 200, bundle main-Bwm9Q5SW.js grep: v0.4.4 ×1, fireReticle ×9

### Door-fire UX: reticle + fallback + audio cause (2026-08-18 fourth run, ISC-620..623)

- ISC-620: Playwright — reticle at door anchor (18,20) pre-press, null after destruction and while an enemy holds priority; screenshot test-results/door-reticle.png shows the red crosshair on the door edge
- ISC-621: Playwright — hoverCoord {17,19} + F → door destroyed, AP 4→3 (inverts the dropped ISC-615 fixture)
- ISC-622: vitest — shootDoor event stream `['shot','doorDestroyed']` with cause 'shot'; cutDoor doorDestroyed cause 'cut'; AudioManager gates sfx_chain_fist on cause==='cut'
- ISC-623: Playwright — staged stealer soaks the pinned 6s, door intact, reticle null before the press
- Suites: engine 287/287, e2e 59/59, typecheck clean

### Home-page run (2026-08-17, ISC-472..514)

- ISC-472/473/474/478/480: home.spec "homepage:" test — overlay visible, title SULK, intro text, credits (Toby Woodwark + GPL-3.0 + GW), computed overlay alpha 0<a<1, backdrop mission 'Suicide Mission' (49/49 suite green)
- ISC-475/476: Playwright count `.home-mission` = 8; `[data-mission="debug_1"]` count 0
- ISC-477: home.spec click space_hulk_2 → URL `?mission=space_hulk_2`, 5 marines deployed, overlay gone, abort mounted
- ISC-479: manual-link asserted visible; manual page test navigates back via #back-to-game → overlay visible
- ISC-481/482/483: home.spec "attract mode is inert" — Enter keypress leaves turn 1 / MarineAction; scene.timerEvent undefined; sulk.audio undefined; input.enabled false
- ISC-484: game.spec rewrite asserts overlay absent at `/?mission=debug_1`; roster/game specs all run overlay-free
- ISC-485/486/487/489: home.spec "mission won" — autoplay win → #end-dialog data-result=win, Retry reloads same URL (mission param kept, dialog gone), second win + Choose → homepage; win.spec still asserts the Phaser MISSION COMPLETE text object (passes unchanged)
- ISC-488: home.spec "mission lost" — squad wipe via die()+checkVictory → dialog data-result=loss, heading "Mission failed", both buttons present
- ISC-490/491/492/493: home.spec abort test — visible during mission, one click arms ("Abandon squad?", URL unchanged), second click → home; homepage test asserts #abort-mission absent at `/`
- ISC-494/495/497/498/501/502/503: manual e2e — zero pageerrors, 9 section headings probed, ≥4 blockquote.marine-quote, 9 .mission-map svg, #map-legend visible, back link works, mission facts text asserted
- ISC-496: content.ts numbers grep-matched to rules-reference.md (4 AP marine / 6 stealer+blip, d6 CP, 120s+30/sergeant, overwatch 2 AP range 12, flamer 2 AP + 1 ammo / 6 ammo / kill 2+, bolter 2 dice kill 6 / sustained max +4, cannon 3 dice 5+ / 10 rounds / 4 AP reload / autofire 2 AP 5 rounds 3+, CC 3-vs-1 dice / sergeant +1, blips 1-3)
- ISC-499/500: missionMapSVG.spec — 6 unit tests: square-rect count == squares.length, entry/deploy/objective counts == JSON, door ticks == doorFacing count, per-mission specials (exits/ducting/cat/download), well-formed SVG for all 9 missions, legend coverage (43/43 client units)
- ISC-504: git status shows no new binary assets; maps are SVG strings from mission JSON
- ISC-505: `pnpm build` green; dist/ contains index.html AND manual.html
- ISC-506/508/511: full Playwright suite 51/51 (42 pre-existing incl. seeded playthrough.spec unchanged + 9 new home.spec); hover/win/game specs pin ?mission=debug_1 (mission param does not touch the dice stream — same seeds hold)
- ISC-507: engine 259/259, client 43/43, tsc --noEmit clean both packages
- ISC-509/510: README homepage/abort/dialog/manual paragraph + updated counts (43/49) + structure line; architecture.md client-module lists + URL-routing paragraph updated
- ISC-512: home.spec homepage test captures pageerror — 0 errors
- ISC-513: real-Chrome screenshots (Claude-in-Chrome; Interceptor extension not connected this session): landing overlay, manual TOC/quotes/tables, Suicide Mission SVG map, in-game abort button, armed "ABANDON SQUAD?" state, MISSION FAILED banner + DOM dialog
- ISC-514: committed (hash in Decisions); tree clean

- ISC-1: Bash — `pnpm --filter ./packages/engine test` → 9 files, 45 tests passed
- ISC-2: Bash — `pnpm --filter ./packages/client test` → 2 files, 6 tests passed (mock-drift GameScene.spec deleted per Decision; hud.spec rewritten payload-driven)
- ISC-3: Bash — engine `tsc -b` clean (after mitt→in-house emitter), client `tsc --noEmit` clean, `vite build` → dist 1.5MB
- ISC-4: Browser (claude-in-chrome, real Chrome) — board renders Suicide Mission layout, zero console errors
- ISC-5: Browser screenshot — right-hand HUD strip, dark bg, full height
- ISC-6: Browser screenshot — minimap in HUD top, viewport box tracks drag-pan
- ISC-7: Browser screenshot — click marine → "AP: 4/4"
- ISC-8: Browser — dispatch S key → marine moves back 1 square, HUD "AP: 2/4" (backward=2AP per rules)
- ISC-9: Browser zoom screenshot — click empty square → "AP: --/--"
- ISC-10: Browser screenshots across drag-pan — HUD pixels unmoved while board scrolls
- ISC-13/16/17: vitest doors.spec — toggle 1 AP, front-3 reach, blocked/allowed movement (50→51 tests green)
- ISC-14/15: vitest doors.spec + vision.spec — closed blocks LOS, open restores
- ISC-18/19: Browser — door bars render on mission squares; O key opened door, marine moved through onto door square
- ISC-24: Browser screenshot — L overlay: green squares stop at closed door (also exposed+fixed walls-transparent LOS bug)
- ISC-25: vitest vision.spec — 180° vision arc + 90° fire arc truth tables, walls block
- ISC-20/21/22/23: vitest shooting.spec — overwatch 2AP/cleared-on-move, free reaction shot, jam on doubles incl. killing doubles, unjam 1AP; browser marker via overwatchChanged event
- ISC-26: vitest — SeededRng same-seed identical 20-roll sequences
- ISC-27/28/29: vitest — kill on 6, sustained +1/miss max +3 (scripted RollQueue), arc/LOS/range rejections spend no AP
- ISC-30/31: vitest combat.spec — 3d6 front / 2d6 flank, tie both survive, blow-from-behind spins defender
- ISC-32/34/35: browser — stealer killed via live engine: removed from state.pieces, sprite destroyed, HUD "Kills: 1"
- ISC-33: code + browser — flash sprite spawned at muzzle, destroyed via 250ms delayedCall
- ISC-36/37/38: vitest blips_ai.spec — blip 6AP any-dir 1AP, d6→1-3 value, convert around origin, lost-if-no-room, entry spawns
- ISC-39/40: vitest ai_pathing + blips_ai — greedy approach with Chebyshev-plateau fix (Euclidean tiebreak), CC when lined up, AI opens doors
- ISC-41/42: browser screenshots — blips render green, converted stealers swarm map, marines attacked over 7 idle turns without player input
- ISC-43..47: vitest gameflow.spec + browser HUD — turn cycle, AP reset, CP 1d6, spendCP, phase/turn display "Turn 7 — Stealers"
- ISC-48: browser — timer counts down (1:56 observed); expiry path shares endTurn with Done
- ISC-50..53: vitest — exit-win, exterminate-win, all-dead loss, post-result action rejection; browser "SQUAD WIPED OUT" overlay with dimmed board
- ISC-49: Playwright — real mouse click on DONE button advanced turn (after fixing container-child scrollFactor hit-test drift)
- ISC-54..58: mission JSON extended (entries/exit/deployment/objective/blips-per-turn), gameflow.spec deploys 5 marines + 2 blips; reinforcement spec
- ISC-59/70: Playwright playthrough — complete game via client action handlers, result reached turn 4 (loss, 3 kills), zero page errors
- ISC-60/61: ESC pause overlay + timer/input freeze; controls reference rendered in HUD
- ISC-62: pnpm build → engine tsc -b + client vite build clean
- ISC-63: Playwright suite 5/5 headless (boot, turn, HUD events, playthrough)
- ISC-64: README rewritten — truthful milestone table, controls, scope
- ISC-65: milestone commits 7b68e78, 66ca9ba, 72719d4, 33accc0 + this one, tests green at each
- ISC-66/73: grep — zero phaser imports, zero window/document in engine src
- ISC-67/68: tsc --noEmit clean both packages; no @ts-ignore, engine API cast-free
- ISC-69: engine coverage 94.64% lines
- ISC-72/76: grep — no networking deps, no Python artifacts
- ISC-74/75: README milestone claims match ISA; tree committed green at session end
- ISC-71: DEFERRED-VERIFY — FPS probe needs visible-tab recording; follow-up task in Decisions
- ISC-12: Bash — `git rm --cached -r packages/engine/coverage`, .gitignore entry added

### Animated stealer phase + rules/UX sweep (2026-08-14, second user pass)

- ISC-86: Playwright animation.spec — 8 samples @120ms of blip sprite: >1 distinct position; mid-animation screenshot `test-results/stealer-phase-mid-animation.png` (HUD "Turn 1 — Stealers", blips mid-corridor)
- ISC-87: animation.spec — `animating: true` right after endTurn; gates verified in code (keydown, pointerdown, togglePause, timer callback, endTurn)
- ISC-88: conversion_on_sight.spec — about-face reveals blip → converts instantly (2 stealers); door-open reveals blip → converts instantly
- ISC-89: same spec — value-2 blip spawns exactly 2 stealers; engine blips_ai overflow tests pre-existing
- ISC-90/91: animation.spec — EXIT text object present, `hud.objectiveText` contains "Objective"; screenshot `markers-and-objective.png` shows purple entries, gold objective, legend
- ISC-92: animation.spec — post-replay position+texture diff vs engine: `[]`
- ISC-93: animation.spec — second endTurn mid-replay: turnNumber unchanged
- ISC-94: deterministic scan (dice at construction) 120 seeds: 62 win / 58 loss / 0 ongoing; pins ?seed=1 (win, MISSION COMPLETE overlay) / ?seed=5 (loss); full suites: engine 101/101, client 6/6, e2e 7/7, build clean
- ISC-95: conversion_on_sight.spec — `PieceEvents.replay(doorToggled)` leaves visible blip alive; identical live emit converts it

