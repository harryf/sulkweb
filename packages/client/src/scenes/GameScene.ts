import Phaser from 'phaser'
import { GameEngine, loadMission, missions, Square, Piece, StormBolterMarine, HeavyFlamerMarine, AssaultCannonMarine, ChainFistMarine, Genestealer, PieceEvents, visibleSquares, closeCombat, DIR_VEC, SeededRng, autoplay, runMarineTurn, flameFlood, Door } from "@sulk/engine/index.js";
import { Selection } from "../ui/Selection";
import { Minimap } from '../ui/Minimap.js';
import { HighlightSprite } from '../ui/HighlightSprite.js';
import { HudPanel } from '../ui/HudPanel.js';
import { RosterPanel, type PieceStats } from '../ui/RosterPanel.js';
import { buildRoster, assignHotkeys } from '../ui/marineNames.js';
import { AudioManager } from '../audio/AudioManager.js';
import { showEndDialog } from '../ui/endDialog.js';
import { HUD_WIDTH, MINI_MAP_MARGIN, UI_FONT, FACING_ARROWS } from '../config.js';

const TILE_SIZE = 40

/** Pixel centre of board square (x, y) — spread into add.image/setPosition. */
const centerXY = (x: number, y: number): [number, number] =>
  [x * TILE_SIZE + TILE_SIZE / 2, y * TILE_SIZE + TILE_SIZE / 2]

/** Ammo readout for the two limited-ammo marines; undefined for everyone else. */
const ammoOf = (p: Piece | undefined): number | undefined =>
  p instanceof HeavyFlamerMarine || p instanceof AssaultCannonMarine ? p.ammo : undefined

export default class GameScene extends Phaser.Scene {
  private hud!: import('../ui/HudPanel.js').HudPanel;
  /** DOM roster card panel — public for the e2e suite. */
  roster!: RosterPanel;
  /** Minimap radar — public for the e2e suite (pulse + probe surfaces). */
  minimap!: Minimap;

  private readonly engine: GameEngine
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys
  private wasd!: {
    W: Phaser.Input.Keyboard.Key
    A: Phaser.Input.Keyboard.Key
    S: Phaser.Input.Keyboard.Key
    D: Phaser.Input.Keyboard.Key
  }
  private highlight!: HighlightSprite;
  private pieceSprites: { [id: string]: Phaser.GameObjects.Image } = {};
  private doorSprites: { [coord: string]: Phaser.GameObjects.Image } = {};
  private owMarkers: { [id: string]: Phaser.GameObjects.Image } = {};
  private jamMarkers: { [id: string]: Phaser.GameObjects.Image } = {};
  private flameSprites: { [coord: string]: Phaser.GameObjects.Image } = {};
  private ductingSprites: { [coord: string]: Phaser.GameObjects.Image } = {};
  private catSprite?: Phaser.GameObjects.Image;
  private catMarker?: Phaser.GameObjects.Image;
  /** Board coordinate under the mouse — the flamer's F-key target. */
  private hoverCoord: { x: number; y: number } | null = null;
  /** Two-press flamer targeting: first F arms, second F fires at the hovered
   *  square. Public for the e2e suite. */
  flamerAiming = false;
  /** Squares the armed flamer would set alight at the current hover — drawn
   *  as the blast preview and asserted by e2e. */
  flamePreview: { x: number; y: number }[] = [];
  private flamePreviewGfx!: Phaser.GameObjects.Graphics;
  /** Reticle over whatever F would shoot right now — enemy or door. Public for
   *  e2e; cx/cy are the drawn pixel centre so tests pin the geometry too. */
  fireReticleFor:
    | { kind: 'door'; x: number; y: number; facing: number; cx: number; cy: number }
    | { kind: 'enemy'; pieceId: string; x: number; y: number; cx: number; cy: number }
    | null = null;
  private fireReticleGfx!: Phaser.GameObjects.Graphics;
  /** First B press arms self-destruct; the second within the window fires.
   *  0 = disarmed. Armed state is bound to ONE flamer — switching selection
   *  must never carry the confirm to a different marine (Advisor 2026-08-16).
   *  (Fidelity: the original shows a "Really self-destruct?" dialog.) */
  private destructArmedAt = 0;
  private destructArmedFor = '';
  /** Phaser's keyboard queue can re-emit the SAME native event across frames
   *  under load (headless e2e, stalled RAF) — every keydown handler dedupes
   *  through this set or single-press actions double-fire. */
  private seenKeyEvents = new WeakSet<KeyboardEvent>();
  private timerRemaining = 120;
  private timerEvent?: Phaser.Time.TimerEvent;
  private paused = false;
  /** True while the captured stealer-phase event stream is being replayed. */
  private animating = false;
  private pauseOverlay?: Phaser.GameObjects.Container;
  private losOverlay!: Phaser.GameObjects.Graphics;
  private losVisible = false;
  /** Last hover readout string — public for the e2e suite to assert against. */
  hoverInfo = '';
  /** All game audio (music ducking, SFX, motion tracker) — public for e2e. */
  audio!: AudioManager;
  /** Mission REGISTRY key (space_hulk_1…) — the audio manifest keys on this,
   *  NOT on mission.name (a display title like "Suicide Mission"). */
  private readonly missionKey: string;
  /** Homepage attract mode (no ?mission= param): the board is scenery under
   *  the DOM landing overlay — input disabled, clock stopped, no audio. */
  private readonly attract: boolean;

  constructor() {
    super('GameScene')
    // The engine builds the board, deploys the squad, and seeds the first blips.
    // `?seed=N` pins the WHOLE game (blip values + CP roll included) — used by
    // the deterministic e2e suite and handy for bug reports.
    // `?mission=<name>` selects any registered mission (unknown → debug_1).
    // NO mission param at all = the homepage: space_hulk_1 plays as a dimmed
    // attract backdrop under the DOM landing overlay (input, clock, and audio
    // all off — see the `attract` guards in create()).
    const params = new URLSearchParams(window.location.search);
    const seedParam = params.get('seed');
    const dice = seedParam ? new SeededRng(Number(seedParam)) : undefined;
    const missionParam = params.get('mission');
    this.attract = missionParam === null;
    const requested = missionParam ?? 'space_hulk_1';
    // Own-property check, not `in`: prototype-chain keys (?mission=toString)
    // must fall back to debug_1, not reach loadMission and throw.
    const missionName = (Object.prototype.hasOwnProperty.call(missions, requested)
      ? requested : 'debug_1') as keyof typeof missions;
    this.missionKey = missionName;
    this.engine = new GameEngine(loadMission(missionName), [], dice);
    (window as any).sulk = { engine: this.engine, Selection, scene: this, SeededRng, autoplay, runMarineTurn, PieceEvents, Genestealer }; // dev/debug + autoplay handle
  }

  preload() {
    this.load.image('square_corridor', 'assets/themes/default/square_corridor.png');
    this.load.image('square_room', 'assets/themes/default/square_room.png');
    this.load.image('entry', 'assets/themes/default/entry.png');
    this.load.image('exit', 'assets/themes/default/exit.png');
    this.load.image('mini_square', 'assets/themes/default/mini_square.png');
    this.load.image('select', 'assets/themes/default/select.png');
    this.load.image('door_closed', 'assets/themes/default/door_closed.png');
    this.load.image('door_open', 'assets/themes/default/door_open.png');
    this.load.image('terminator_storm_bolter', 'assets/themes/default/terminator_storm_bolter.png');
    this.load.image('terminator_sergeant', 'assets/themes/default/terminator_sergeant.png');
    this.load.image('terminator_heavy_flamer', 'assets/themes/default/terminator_heavy_flamer.png');
    this.load.image(Genestealer.SPRITE_KEY, 'assets/themes/default/stealer.png');
    this.load.image('blip', 'assets/themes/default/blip.png');
    this.load.image('flames', 'assets/themes/default/flames.png');
    this.load.image('flash_storm_bolter', 'assets/themes/default/flash_storm_bolter.png');
    this.load.image('flash_heavy_flamer', 'assets/themes/default/flash_heavy_flamer.png');
    this.load.image('marker_overwatch', 'assets/themes/default/marker_overwatch.png');
    this.load.image('marker_jam', 'assets/themes/default/marker_jam.png');
    this.load.image('cat', 'assets/themes/default/cat.png');
    this.load.image('marker_damage', 'assets/themes/default/marker_damage.png');
    this.load.image('ducting', 'assets/themes/default/ducting.png');
    this.load.image('ducting_destroyed', 'assets/themes/default/ducting_destroyed.png');
    this.load.image('terminator_assault_cannon', 'assets/themes/default/terminator_assault_cannon.png');
    this.load.image('terminator_chain_fist', 'assets/themes/default/terminator_chain_fist.png');
    this.load.image('terminator_sergeant_sword', 'assets/themes/default/terminator_sergeant_sword.png');
    this.load.image('ambush_counter', 'assets/themes/default/ambush_counter.png');
    // All audio (mission music + original PD wavs + fetched cuts) queues via
    // the AudioManager — see src/audio/. Missing fetched files are tolerated.
    // Attract mode never constructs the AudioManager, so skip the fetches too
    // (the homepage should not download the whole mission audio set).
    if (!this.attract) AudioManager.queueLoads(this, this.missionKey);
  }

  create() {
    const { board, pieces } = this.engine.state
    const { width, height } = board

    // Canvas: board viewport (capped so it fits a normal window) + HUD strip on
    // the right. One tile of margin all round so off-board entry triangles /
    // exit arrows are visible at board edges.
    const viewW = Math.min((width + 2) * TILE_SIZE, 880)
    const viewH = Math.min((height + 2) * TILE_SIZE, 760)
    this.scale.resize(viewW + HUD_WIDTH, viewH)

    board.allSquares().forEach((sq: Square) => {
      const texture = sq.kind === 'corridor' ? 'square_corridor' : 'square_room'
      this.add.image(sq.x * TILE_SIZE, sq.y * TILE_SIZE, texture).setOrigin(0)
    });

    // Door sprites, keyed by anchor square + facing, updated via doorToggled.
    // EDGE-MODEL: the sprite sits ON the boundary between the anchor square
    // and its facing-neighbor, rotated to lie along that boundary.
    board.allSquares().forEach((sq: Square) => {
      for (const door of board.doorsAt({ c: sq.x, r: sq.y })) {
        const v = DIR_VEC[door.facing];
        const sprite = this.add.image(
          sq.x * TILE_SIZE + TILE_SIZE / 2 + v.dc * TILE_SIZE / 2,
          sq.y * TILE_SIZE + TILE_SIZE / 2 + v.dr * TILE_SIZE / 2,
          'door_closed')
          .setOrigin(0.5)
          .setDepth(0.5)
          .setRotation(door.facing % 2 === 0 ? 0 : Math.PI / 2);
        this.doorSprites[`${sq.x},${sq.y}:${door.facing}`] = sprite;
      }
    });
    PieceEvents.on('doorToggled', ({ x, y, facing, open }) => {
      this.doorSprites[`${x},${y}:${facing}`]?.setTexture(open ? 'door_open' : 'door_closed');
      this.refreshFireReticle(); // open/closed flips shootability
    });
    
    // Mission markers: stealer entry triangles + exit arrows (theme art, drawn
    // one square OFF-board per the original EntryTriangle/ExitArrow — `facing`
    // is efacing, the off-board direction; the graphic points back onto the
    // board via rotate(-90°·efacing)), exit squares (green), marine deployment
    // (blue outline). Drawn under pieces, over squares.
    const markers = this.add.graphics().setDepth(0.4);
    const mission = this.engine.mission;
    const T = TILE_SIZE;
    const FACING_IDX: Record<string, 0 | 1 | 2 | 3> = { up: 0, right: 1, down: 2, left: 3 };
    const placeMarker = (texture: string, p: { x: number; y: number; facing?: string }) => {
      if (!p.facing) return; // adapted mid-board point: flat marker only
      const o = DIR_VEC[FACING_IDX[p.facing]];
      this.add.image(...centerXY(p.x + o.dc, p.y + o.dr), texture)
        .setDepth(0.4)
        .setRotation(FACING_IDX[p.facing] * Math.PI / 2)
        .setName(texture === 'entry' ? 'entry-triangle' : 'exit-arrow');
    };
    for (const e of mission.entryPoints ?? []) placeMarker('entry', e);
    for (const e of mission.exitPoints ?? []) {
      placeMarker('exit', e);
      this.paintObjectiveSquare(markers, e.x, e.y, 'EXIT', 0x00cc44, 0x00ff55, '#00ff55');
    }
    if (mission.objectivePoint) {
      const o = mission.objectivePoint;
      this.paintObjectiveSquare(markers, o.x, o.y, 'BURN', 0xff8800, 0xffaa00, '#ffaa00');
    }
    for (const o of mission.objectivePoints ?? []) {
      this.paintObjectiveSquare(markers, o.x, o.y, 'BURN', 0xff8800, 0xffaa00, '#ffaa00');
    }
    for (const r of mission.roomSquares ?? []) {
      markers.lineStyle(2, 0xff4040, 0.6).strokeRect(r.x * T + 2, r.y * T + 2, T - 4, T - 4);
    }
    // Ducting art is a vertical pipe; rotate squares whose run continues
    // left/right so a horizontal duct reads as one continuous pipe.
    const ductKeys = new Set((mission.ductingSquares ?? []).map(d => `${d.x},${d.y}`));
    for (const d of mission.ductingSquares ?? []) {
      const horizontal = ductKeys.has(`${d.x - 1},${d.y}`) || ductKeys.has(`${d.x + 1},${d.y}`);
      this.ductingSprites[`${d.x},${d.y}`] =
        this.add.image(d.x * T + T / 2, d.y * T + T / 2, 'ducting')
          .setDepth(0.5).setRotation(horizontal ? Math.PI / 2 : 0);
    }
    for (const d of mission.marineDeployment ?? []) {
      markers.lineStyle(2, 0x3b82f6, 0.7).strokeRect(d.x * T + 3, d.y * T + 3, T - 6, T - 6);
    }
    // The C.A.T. (mission 3): board-level object with its own sprite.
    if (this.engine.state.board.cat) {
      const cat = this.engine.state.board.cat;
      this.catSprite = this.add.image(...centerXY(cat.pos.c, cat.pos.r), 'cat').setDepth(0.95);
    }
    // The damage marker rides the cat's top-right corner (+12, −12 off centre).
    const catMarkerXY = (x: number, y: number): [number, number] => {
      const [cx, cy] = centerXY(x, y);
      return [cx + 12, cy - 12];
    };
    PieceEvents.on('catMoved', ({ x, y }) => {
      this.catSprite?.setVisible(true).setPosition(...centerXY(x, y));
      this.catMarker?.setPosition(...catMarkerXY(x, y));
    });
    PieceEvents.on('catPickedUp', () => this.catSprite?.setVisible(false));
    PieceEvents.on('catDropped', ({ x, y }) => {
      this.catSprite?.setVisible(true).setPosition(...centerXY(x, y));
      this.catMarker?.setVisible(true).setPosition(...catMarkerXY(x, y));
    });
    PieceEvents.on('catDamaged', ({ x, y, destroyed }) => {
      if (destroyed) {
        this.catSprite?.setVisible(true).setPosition(...centerXY(x, y)).setTint(0x552222).setAlpha(0.6);
      } else {
        this.catMarker?.destroy();
        this.catMarker = this.add.image(...catMarkerXY(x, y), 'marker_damage').setDepth(2);
      }
    });
    PieceEvents.on('ductingDestroyed', ({ x, y }) => {
      this.ductingSprites[`${x},${y}`]?.setTexture('ducting_destroyed');
    });
    PieceEvents.on('marineEscaped', ({ pieceId, escaped }) => {
      this.removePieceSprite(pieceId, 150);
      this.clearSelectionOf(pieceId, false);
      this.hud.setStatus(this.escapeStatus(escaped));
    });
    PieceEvents.on('objectiveCleansed', ({ cleansedCount }) => {
      const total = (this.engine.mission.objectivePoints ?? []).length;
      this.hud.setStatus(`Cleansed: ${cleansedCount}/${total}`);
    });
    // beta_2: destroyed doors disappear for good; malfunctions go out with a bang.
    PieceEvents.on('doorDestroyed', ({ x, y, facing }) => {
      this.doorSprites[`${x},${y}:${facing}`]?.destroy();
      delete this.doorSprites[`${x},${y}:${facing}`];
      this.refreshFireReticle(); // the target may be gone
    });
        PieceEvents.on('downloadChanged', ({ counter, active }) => {
      const total = this.engine.mission.downloadTurns ?? 4;
      this.hud.setStatus(active ? `Downloading… ${counter}/${total}` : `Download reset (${total})`);
    });
    if (mission.objective === 'download' && mission.downloadPoint) {
      const dp = mission.downloadPoint;
      this.paintObjectiveSquare(markers, dp.x, dp.y, 'DATA', 0xff8800, 0xffaa00, '#ffaa00');
    }

    // Render-side combat reactions: engine events drive all sprite state.
    // Handlers read the event PAYLOAD, never the engine — during stealer-phase
    // replay the engine already holds the final state, so payload coords are
    // the only truthful intermediate positions.
    PieceEvents.on('pieceMoved', ({ pieceId, x, y, facing }) => {
      this.moveSprite(pieceId, x, y, facing);
    });
    PieceEvents.on('pieceDied', ({ pieceId }) => {
      this.removePieceSprite(pieceId, this.animating ? 160 : 80);
      this.clearSelectionOf(pieceId, true); // an armed flamer can die mid-aim
    });
    PieceEvents.on('shot', ({ shooterId }) => {
      const shooter = this.engine.findPiece(shooterId);
      if (!shooter) return;
      const v = DIR_VEC[shooter.facing];
      const flash = this.add.image(
        (shooter.pos.c + v.dc * 0.6) * TILE_SIZE + TILE_SIZE / 2,
        (shooter.pos.r + v.dr * 0.6) * TILE_SIZE + TILE_SIZE / 2,
        'flash_storm_bolter'
      ).setDepth(2).setRotation(shooter.facing * Math.PI / 2);
      this.time.delayedCall(250, () => flash.destroy());
    });
    PieceEvents.on('overwatchChanged', ({ pieceId, on }) => {
      if (on) {
        const sprite = this.pieceSprites[pieceId];
        if (!sprite) return;
        this.owMarkers[pieceId] = this.add.image(sprite.x, sprite.y - 12, 'marker_overwatch').setDepth(2);
      } else {
        this.owMarkers[pieceId]?.destroy();
        delete this.owMarkers[pieceId];
      }
    });
    // Jam marker (original marker_jam.png on the jammed marine) + sound
    PieceEvents.on('jammed', ({ pieceId, jammed }) => {
      if (jammed) {
        const sprite = this.pieceSprites[pieceId];
        if (!sprite) return;
        this.jamMarkers[pieceId]?.destroy();
        this.jamMarkers[pieceId] = this.add.image(sprite.x + 12, sprite.y - 12, 'marker_jam').setDepth(2);
      } else {
        this.jamMarkers[pieceId]?.destroy();
        delete this.jamMarkers[pieceId];
      }
    });
    // Flames: render every burning square; clear on end-phase dispersal.
    PieceEvents.on('sectionFlamed', ({ squares }) => {
      for (const s of squares) {
        const key = `${s.x},${s.y}`;
        if (this.flameSprites[key]) continue;
        this.flameSprites[key] = this.add.image(s.x * T + T / 2, s.y * T + T / 2, 'flames').setDepth(0.9);
      }
    });
    PieceEvents.on('flamesCleared', ({ squares }) => {
      for (const s of squares) {
        this.flameSprites[`${s.x},${s.y}`]?.destroy();
        delete this.flameSprites[`${s.x},${s.y}`];
      }
    });
    PieceEvents.on('pieceAdded', ({ pieceId, kind, x, y, facing }) => {
      if (this.pieceSprites[pieceId]) return;
      this.createSprite(pieceId, kind, x, y, facing);
    });
    PieceEvents.on('blipConverted', ({ blipId }) => {
      this.pieceSprites[blipId]?.destroy();
      delete this.pieceSprites[blipId];
    });
    PieceEvents.on('gameOver', ({ result }) => {
      this.timerEvent?.remove();
      const cam = this.cameras.main;
      const msg = result === 'win' ? 'MISSION COMPLETE'
        : result === 'draw' ? 'MISSION DRAWN' : 'MISSION FAILED';
      const color = result === 'win' ? '#7CFC00'
        : result === 'draw' ? '#e8c840' : '#ff4040';
      this.add.rectangle(0, 0, cam.width, cam.height, 0x000000, 0.6)
        .setOrigin(0).setScrollFactor(0).setDepth(99);
      this.add.text(cam.width / 2, cam.height / 2, msg, {
        fontFamily: UI_FONT, fontSize: '48px', color, fontStyle: 'bold'
      }).setOrigin(0.5).setScrollFactor(0).setDepth(100);
      // DOM dialog on top of the banner: retry (reload — a pinned ?seed
      // replays the identical game) or back to mission select.
      showEndDialog(result);
    });


    pieces.forEach(p => this.createPieceSprite(p));

    this.cursors = this.input.keyboard!.createCursorKeys()
    this.wasd = this.input.keyboard!.addKeys('W,A,S,D,Q,E,Z,C,O,F,X,B,H,U,P,T,R,G,M') as any
    this.input.keyboard!.on('keydown-ENTER', () => this.endTurn());
    this.input.keyboard!.on('keydown-ESC', () => this.togglePause());
    // Camera bounds — the SINGLE clamp for every scroll path (keys, drag,
    // pan()): one-tile margin for off-board markers plus MARKER_OVERHANG for
    // the wide entry/exit art (84px along one axis — up to 22px past its
    // cell), PLUS a HUD-width dead zone on the right. Phaser clamps scroll to
    // bounds − FULL canvas width, but the right 200px of canvas is the opaque
    // HUD strip — without the dead zone the rightmost markers can never pan
    // out from under it (space_hulk_3's (28,22) entry triangle was the
    // reported casualty). Assumes zoom stays 1 (this scene never zooms);
    // markers.spec sweeps all missions against these exact clamps.
    const MARKER_OVERHANG = 24
    this.cameras.main.setBounds(
      -TILE_SIZE - MARKER_OVERHANG, -TILE_SIZE - MARKER_OVERHANG,
      (width + 2) * TILE_SIZE + HUD_WIDTH + 2 * MARKER_OVERHANG,
      (height + 2) * TILE_SIZE + 2 * MARKER_OVERHANG)

    const centerX = Math.floor(width / 2) * TILE_SIZE
    const centerY = Math.floor(height / 2) * TILE_SIZE
    this.cameras.main.centerOn(centerX, centerY);

    // Enable drag-to-pan (ignore drags that start over the right-hand HUD)
    this.input.on('pointermove', (p: Phaser.Input.Pointer) => {
      if (!p.isDown) return;
      if (p.x > this.scale.width - HUD_WIDTH) return;
      this.cameras.main.scrollX -= (p.x - p.prevPosition.x) / this.cameras.main.zoom;
      this.cameras.main.scrollY -= (p.y - p.prevPosition.y) / this.cameras.main.zoom;
    });

    // Create Minimap (sized to fit inside the HUD panel)
    const minimap = new Minimap(this, this.engine, { tile: TILE_SIZE, width: HUD_WIDTH - 2 * MINI_MAP_MARGIN });
    minimap.setScrollFactor(0); // fixed to screen
    this.minimap = minimap;
    // Click-to-focus: centre the camera on the clicked point — setBounds
    // clamps at the map edges, and updateCam moves the white box to match.
    // An in-flight selection pan must yield, or it stomps the click next frame.
    // The +HUD_WIDTH/2 shift centres the point in the VISIBLE play area: the
    // camera spans the whole canvas, whose right 200px is the opaque HUD.
    minimap.onFocus = (wx, wy) => {
      this.cameras.main.panEffect.reset();
      this.cameras.main.centerOn(wx + HUD_WIDTH / 2, wy);
    };

    // Create HUD panel (right-hand strip) and re-parent minimap into it
    this.hud = new HudPanel(this, minimap, () => this.endTurn());
    this.hud.setPosition(this.scale.width - HUD_WIDTH, 0);
    this.hud.setDepth(10);
    this.add.existing(this.hud);

    // Marine roster card panel (DOM, right of the canvas): squad-grouped cards
    // with live AP/ammo/state; card click selects the marine and pans to him.
    const rosterEntries = buildRoster(this.engine, this.engine.mission);
    this.roster = new RosterPanel(
      rosterEntries,
      (id): PieceStats | undefined => {
        const p = this.engine.findPiece(id) as StormBolterMarine | undefined;
        if (!p) return { alive: false, apRemaining: 0, apInitial: 4, overwatch: false, jammed: false, facing: 0 };
        return {
          alive: p.alive,
          apRemaining: p.apRemaining,
          apInitial: p.apInitial,
          ammo: ammoOf(p),
          overwatch: p.overwatch ?? false,
          jammed: p.jammed ?? false,
          facing: p.facing,
        };
      },
      (id) => this.selectFromRoster(id),
    );

    // Number keys 1-0 select marines by displayed roster position: 1-5 the
    // first squad row, 6-0 the second (mouseless play). The map is computed
    // ONCE from the scene-start roster, so numbers never reshuffle as marines
    // die — a dead marine's key goes inert via selectFromRoster's alive guard.
    const hotkeys = assignHotkeys(rosterEntries);
    const DIGIT_KEYS: Record<string, string> = {
      '1': 'ONE', '2': 'TWO', '3': 'THREE', '4': 'FOUR', '5': 'FIVE',
      '6': 'SIX', '7': 'SEVEN', '8': 'EIGHT', '9': 'NINE', '0': 'ZERO',
    };
    for (const [id, label] of hotkeys) {
      this.input.keyboard!.on(`keydown-${DIGIT_KEYS[label]}`, (e: KeyboardEvent) => {
        // Cmd/Ctrl+digit is the browser's tab switch — never steal it into a
        // silent selection change the player returns to without explanation.
        if (e.metaKey || e.ctrlKey || e.altKey) return;
        if (this.seenKeyEvents.has(e)) return; // Phaser replay — one select per press
        this.seenKeyEvents.add(e);
        this.selectFromRoster(id);
      });
    }

    // All game audio: per-mission ambient bed (ducked by phase), event SFX,
    // and the motion tracker. K toggles mute (persisted; M is melee). NOT
    // constructed in attract mode — a click on the landing overlay is a
    // browser autoplay unlock, and the homepage must stay silent.
    if (!this.attract) {
      // The minimap radar sweeps on the motion-tracker ping — one clock for
      // sight and sound, so the pulse speeds up as the threats close in. The
      // callback rides the constructor: with sound already unlocked the first
      // cycle fires synchronously inside it, before any later assignment.
      this.audio = new AudioManager(this, this.engine, this.missionKey,
        (ms) => this.minimap.pulse(ms));
      (window as any).sulk.audio = this.audio;
      this.input.keyboard!.on('keydown-K', (e: KeyboardEvent) => {
        if (this.seenKeyEvents.has(e)) return; // Phaser replay — one toggle per press
        this.seenKeyEvents.add(e);
        this.audio.toggleMute();
      });
      this.events.once('shutdown', () => this.audio.destroy());
    }
    // The required Music of 40K credit lives in the roster panel's Credits
    // section (RosterPanel buildCredits — see CREDITS.md).

    const objectiveLabel: Record<string, string> = {
      'exterminate': 'Objective: kill every genestealer',
      'reach-exit': 'Objective: reach the green EXIT',
      'exterminate-or-exit': 'Objective: kill all stealers\nOR reach the green EXIT',
      'flame-objective': 'FLAME Launch Control\n(lose: flamer dead/dry)',
      'kill-quota': `KILL ${this.engine.mission.killQuota ?? 30} stealers\nOR blockade every entry`,
      'escort-cat': 'ESCORT the C.A.T. to an EXIT\n(damaged = draw; destroyed = defeat)',
      'flame-objectives': 'FLAME both Gene Banks\n(lose: flamers dead/dry)',
      'escape-count': (this.engine.mission.escapeQuota ?? 1) > 1
        ? `ESCAPE ${this.engine.mission.escapeQuota} marines via the EXIT`
        : 'GET one marine out via the EXIT',
      'defend': `DEFEND the ducting + control room\nuntil the end of turn ${this.engine.mission.turnLimit ?? 16}`,
      'download': 'HOLD the Data Room with a sergeant\nfor 4 quiet end-phases',
    };
    this.hud.setObjective(objectiveLabel[this.engine.mission.objective ?? 'exterminate-or-exit'] ?? '');
    this.hud.setKillQuota(this.engine.mission.objective === 'kill-quota'
      ? (this.engine.mission.killQuota ?? 30) : undefined);
    const obj = this.engine.mission.objective;
    if (obj === 'escape-count' || obj === 'escort-cat') {
      this.hud.setStatus(this.escapeStatus(0));
    } else if (obj === 'flame-objectives') {
      this.hud.setStatus(`Cleansed: 0/${(this.engine.mission.objectivePoints ?? []).length}`);
    } else if (obj === 'defend') {
      this.hud.setStatus(`Hold until turn ${this.engine.mission.turnLimit ?? 16}`);
    } else if (obj === 'download') {
      this.hud.setStatus(`Download not started (${this.engine.mission.downloadTurns ?? 4})`);
    }

    // Hover readout: coordinate + contents of the square under the cursor,
    // shown in the HUD below the controls (map design / reference aid).
    this.input.on('pointermove', (p: Phaser.Input.Pointer) => {
      if (p.isDown) return; // dragging = panning; leave the readout as-is
      if (p.x > this.scale.width - HUD_WIDTH) {
        this.hoverInfo = '';
        this.hoverCoord = null;
      } else {
        const hx = Math.floor(p.worldX / TILE_SIZE), hy = Math.floor(p.worldY / TILE_SIZE);
        this.hoverCoord = { x: hx, y: hy };
        this.hoverInfo = this.describeSquare(hx, hy);
      }
      this.hud.setHoverInfo(this.hoverInfo);
      if (this.flamerAiming) this.refreshAimUI();
      this.refreshFireReticle(); // hover picks the door F targets
    });

    PieceEvents.emit('cpChanged', { cp: this.engine.cp }); // HUD subscribed after the initial roll

    // Marine-phase turn timer (120s + 30s per living sergeant, per the
    // original). Never started in attract mode — the homepage backdrop must
    // not tick itself into the stealer phase behind the overlay.
    this.timerRemaining = this.engine.marinePhaseSeconds;
    this.hud.setTimer(this.timerRemaining);
    if (!this.attract) {
      this.timerEvent = this.time.addEvent({
        delay: 1000, loop: true, callback: () => {
          if (this.paused || this.animating || this.engine.state.result !== 'ongoing' || this.engine.phase !== 'MarineAction') return;
          this.timerRemaining -= 1;
          this.hud.setTimer(this.timerRemaining);
          if (this.timerRemaining <= 0) this.endTurn();
        }
      });
    }

    // Listen for camera updates for minimap
    this.events.on('update', () => minimap.updateCam(this.cameras.main));

    // Set-up selection
    this.highlight = new HighlightSprite(this, TILE_SIZE);
    this.add.existing(this.highlight);
    this.flamePreviewGfx = this.add.graphics().setDepth(0.85);
    this.fireReticleGfx = this.add.graphics().setDepth(2.5);

    // Input handler for piece selection
    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      if (this.animating) return;
      // Clicks on the HUD strip (minimap, DONE) are their own controls — they
      // must never fall through and clear the selection (ISC-675).
      if (p.x > this.scale.width - HUD_WIDTH) return;
      const hit = this.children.list.find(obj =>
        obj.name === 'piece' && (obj as Phaser.GameObjects.Image).getBounds().contains(p.worldX, p.worldY)
      );

      if (hit) {
        Selection.toggle((hit as any).pieceId);
      } else {
        Selection.clear();
      }
      this.disarmAndRefresh(); // any (de)selection disarms flamer + self-destruct

      const selectedId = Selection.get();
      this.emitSelected(selectedId ? this.engine.findPiece(selectedId) : undefined);
    });

    // LOS debug overlay — hold L with a piece selected
    this.losOverlay = this.add.graphics().setDepth(0.8);
    this.input.keyboard!.on('keydown-L', () => {
      this.losVisible = true;
      this.drawLosOverlay();
    });
    this.input.keyboard!.on('keyup-L', () => {
      this.losVisible = false;
      this.losOverlay.clear();
    });

    // Keyboard handler for piece movement
    this.input.keyboard!.on('keydown', (_event: KeyboardEvent) => {
      if (this.seenKeyEvents.has(_event)) return; // Phaser replay of a handled press
      this.seenKeyEvents.add(_event);
      if (this.paused || this.animating || this.engine.state.result !== 'ongoing') return;
      const selectedId = Selection.get();
      if (!selectedId) return;

      const piece = this.engine.findPiece(selectedId);
      if (!piece) return;

      // Any piece ACTION while the flamer is armed cancels targeting mode.
      // (Arrow-key camera panning, L overlay, and K mute keep the aim.)
      if (this.flamerAiming && 'wsadqezchxoutrgpbm'.includes(_event.key.toLowerCase())) {
        this.setFlamerAiming(false);
      }
      // Likewise, anything that isn't the B confirm disarms self-destruct.
      if (this.destructArmedAt && _event.key.toLowerCase() !== 'b') this.destructArmedAt = 0;

      let acted = false;
      if (Phaser.Input.Keyboard.JustDown(this.wasd.W))      acted = piece.moveForward();
      else if (Phaser.Input.Keyboard.JustDown((this.wasd as any).X)) acted = piece.moveBackward();
      else if (Phaser.Input.Keyboard.JustDown(this.wasd.A)) acted = piece.tryTurn(-1);
      else if (Phaser.Input.Keyboard.JustDown(this.wasd.D)) acted = piece.tryTurn(1);
      // Diagonal moves (original numpad 7/9/1/3) — QWE/AD/ZXC form a
      // directional circle: Q fwd-left, E fwd-right, Z back-LEFT, C back-RIGHT.
      else if (Phaser.Input.Keyboard.JustDown((this.wasd as any).Q)) acted = piece.moveForwardLeft();
      else if (Phaser.Input.Keyboard.JustDown((this.wasd as any).E)) acted = piece.moveForwardRight();
      else if (Phaser.Input.Keyboard.JustDown((this.wasd as any).Z)) acted = piece.moveBackLeft();
      else if (Phaser.Input.Keyboard.JustDown((this.wasd as any).C)) acted = piece.moveBackRight();
      // S is the primary door key (centre of the movement circle); H stays
      // bound as the legacy alias.
      else if (Phaser.Input.Keyboard.JustDown(this.wasd.S)) acted = piece.useDoor();
      else if (Phaser.Input.Keyboard.JustDown((this.wasd as any).H)) acted = piece.useDoor();
      else if (Phaser.Input.Keyboard.JustDown((this.wasd as any).F)) acted = this.handleFire(piece);
      else if (Phaser.Input.Keyboard.JustDown((this.wasd as any).M)) acted = this.meleeAhead(piece);
      else if (Phaser.Input.Keyboard.JustDown((this.wasd as any).O)) {
        const marine = piece as StormBolterMarine;
        if (marine.overwatch) { marine.overwatchOff(); acted = true; }
        else acted = marine.overwatchOn?.() ?? false;
      }
      else if (Phaser.Input.Keyboard.JustDown((this.wasd as any).U)) acted = (piece as StormBolterMarine).unjam?.() ?? false;
      else if (Phaser.Input.Keyboard.JustDown((this.wasd as any).B)) acted = this.handleSelfDestruct(piece);
      else if (Phaser.Input.Keyboard.JustDown((this.wasd as any).T)) acted = piece instanceof AssaultCannonMarine && piece.autofire();
      else if (Phaser.Input.Keyboard.JustDown((this.wasd as any).R)) acted = piece instanceof AssaultCannonMarine && piece.reload();
      else if (Phaser.Input.Keyboard.JustDown((this.wasd as any).G)) acted = piece instanceof ChainFistMarine && piece.cutDoor();
      else if (Phaser.Input.Keyboard.JustDown((this.wasd as any).P)) acted = this.engine.spendCP(piece);

      if (acted) this.engine.checkVictory(); // e.g. marine stepped onto the exit
      if (this.losVisible) this.drawLosOverlay(); // keep overlay in sync while held

      if (acted) {
        this.refreshPieceSprite(piece);
        this.updateHighlight();
        PieceEvents.emit('apChanged', { pieceId: piece.id, apRemaining: piece.apRemaining, apInitial: piece.apInitial });
      }
    });

    // Homepage attract mode: the board is scenery. Kill ALL Phaser input
    // (pointer + every keyboard handler above) so keys leaking through the
    // DOM overlay can never advance the engine behind the title screen.
    if (this.attract) {
      this.input.enabled = false;
      this.input.keyboard!.enabled = false;
    }
  }

  /** Roster card click: select the marine, sync map highlight + HUD, pan to him. */
  private selectFromRoster(id: string): void {
    // Attract guard: roster cards are DOM buttons, reachable by Tab+Enter
    // straight through the landing overlay — the homepage stays inert.
    if (this.attract) return;
    if (this.paused || this.animating || this.engine.state.result !== 'ongoing') return;
    const piece = this.engine.findPiece(id);
    // Death AND escape both set alive=false — one guard makes a fallen or
    // escaped marine's hotkey (and card) inert.
    if (!piece || !piece.alive) return;
    Selection.select(id);
    this.disarmAndRefresh();
    this.emitSelected(piece);
    const sprite = this.pieceSprites[id];
    if (sprite) this.cameras.main.pan(sprite.x, sprite.y, 250, 'Sine.easeInOut');
  }

  /** Human-readable contents of a board square — powers the HUD hover readout. */
  describeSquare(x: number, y: number): string {
    const board = this.engine.state.board;
    const sq = board.get(x, y);
    if (!sq) return `(${x},${y}) — rock`;
    const parts = [`(${x},${y}) ${sq.kind} tile`];
    for (const door of board.doorsAt({ c: x, r: y })) {
      parts.push(`door ${FACING_ARROWS[door.facing]} ${door.isOpen ? 'open' : 'closed'}`);
    }
    const piece = board.pieceAt({ c: x, r: y }) as Piece | undefined;
    if (piece) {
      parts.push(piece instanceof HeavyFlamerMarine ? `marine (flamer, ammo ${piece.ammo})`
        : piece instanceof AssaultCannonMarine ? `marine (assault cannon, ammo ${piece.ammo})`
        : piece instanceof ChainFistMarine ? 'marine (chain fist)'
        : piece.timerBonus > 0 ? 'marine (sergeant)'
        : piece.kind);
    }
    const dl = this.engine.mission.downloadPoint;
    if (dl && dl.x === x && dl.y === y) parts.push('OBJECTIVE: Data Room');
    if (board.isFlaming({ c: x, r: y })) parts.push('ON FIRE');
    if (this.engine.mission.entryPoints?.some(e => e.x === x && e.y === y)) parts.push('stealer entry');
    if (this.engine.mission.exitPoints?.some(e => e.x === x && e.y === y)) parts.push('EXIT');
    const obj = this.engine.mission.objectivePoint;
    if (obj && obj.x === x && obj.y === y) parts.push('OBJECTIVE: Launch Control');
    const multi = this.engine.mission.objectivePoints;
    if (multi?.some(p => p.x === x && p.y === y)) {
      parts.push(this.engine.cleansed.has(`${x},${y}`) ? 'Gene Bank (CLEANSED)' : 'OBJECTIVE: Gene Bank');
    }
    if (this.engine.mission.roomSquares?.some(r => r.x === x && r.y === y)) parts.push('CONTROL ROOM');
    const duct = board.ducting.get(`${x},${y}`);
    if (duct !== undefined) parts.push(duct ? 'DUCTING' : 'DUCTING (destroyed)');
    const cat = board.cat;
    if (cat && cat.carrierId === null && !cat.escaped && cat.pos.c === x && cat.pos.r === y) {
      parts.push(cat.destroyed ? 'C.A.T. (destroyed)' : cat.damaged ? 'C.A.T. (damaged)' : 'C.A.T.');
    }
    return parts.join(' · ');
  }

  /** HUD status line for escape-family missions. */
  private escapeStatus(escaped: number): string {
    const quota = this.engine.mission.objective === 'escape-count'
      ? (this.engine.mission.escapeQuota ?? 1) : undefined;
    return quota !== undefined ? `Escaped: ${escaped}/${quota}` : `Escaped: ${escaped}`;
  }

  update() {
    const cam = this.cameras.main;
    const speed = 5;

    if (this.cursors.left.isDown) cam.scrollX -= speed;
    if (this.cursors.right.isDown) cam.scrollX += speed;
    if (this.cursors.up.isDown) cam.scrollY -= speed;
    if (this.cursors.down.isDown) cam.scrollY += speed;

    // Camera panning moves the world under a stationary pointer — while the
    // flamer is armed, keep the hover target and preview honest.
    if (this.flamerAiming) {
      const p = this.input.activePointer;
      const hx = Math.floor(p.worldX / TILE_SIZE), hy = Math.floor(p.worldY / TILE_SIZE);
      if (!this.hoverCoord || this.hoverCoord.x !== hx || this.hoverCoord.y !== hy) {
        this.hoverCoord = { x: hx, y: hy };
        this.refreshAimUI();
      }
    }

    // No manual clamp here: the camera bounds set in create() are the single
    // source of truth — Phaser clamps every scroll path against them.
  }

  private createSprite(pieceId: string, kind: string, x: number, y: number, facing: number) {
    // Engine pieces carry their own texture key (sergeant/flamer variants);
    // fall back to the kind for pieces not present in the engine registry.
    const texture = this.engine.findPiece(pieceId)?.spriteKey
      ?? (kind === 'stealer' ? Genestealer.SPRITE_KEY
        : kind === 'blip' ? 'blip'
        : 'terminator_storm_bolter');
    const sprite = this.add.image(...centerXY(x, y), texture)
      .setOrigin(0.5, 0.5)
      .setDepth(1)
      .setRotation(facing * Math.PI / 2)
      .setName('piece')
      .setInteractive();
    (sprite as any).pieceId = pieceId;
    this.pieceSprites[pieceId] = sprite;
  }

  private createPieceSprite(piece: Piece) {
    this.createSprite(piece.id, piece.kind, piece.pos.c, piece.pos.r, piece.facing);
  }

  /** Position/rotate a sprite from event-payload data. Tweens while a stealer
   * phase is being replayed; snaps during interactive marine actions. */
  private moveSprite(pieceId: string, x: number, y: number, facing: number) {
    const sprite = this.pieceSprites[pieceId];
    if (!sprite || !sprite.active) return;
    const [tx, ty] = centerXY(x, y);
    sprite.setRotation(facing * Math.PI / 2);
    this.tweens.killTweensOf(sprite);
    if (this.animating) {
      this.tweens.add({
        targets: sprite, x: tx, y: ty, duration: 100, ease: 'Linear',
        onUpdate: () => this.owMarkers[pieceId]?.setPosition(sprite.x, sprite.y - 12),
      });
    } else {
      sprite.setPosition(tx, ty);
    }
    this.owMarkers[pieceId]?.setPosition(tx, ty - 12);
    if (Selection.get() === pieceId) this.updateHighlight();
  }

  private refreshPieceSprite(piece: Piece) {
    this.moveSprite(piece.id, piece.pos.c, piece.pos.r, piece.facing);
  }

  /** Filled + stroked mission square with a centred label (EXIT/BURN/DATA). */
  private paintObjectiveSquare(markers: Phaser.GameObjects.Graphics, x: number, y: number,
    label: string, fill: number, stroke: number, cssColor: string): void {
    const T = TILE_SIZE;
    markers.fillStyle(fill, 0.35).fillRect(x * T, y * T, T, T);
    markers.lineStyle(2, stroke, 1).strokeRect(x * T + 1, y * T + 1, T - 2, T - 2);
    this.add.text(...centerXY(x, y), label, {
      fontFamily: UI_FONT, fontSize: '11px', color: cssColor, fontStyle: 'bold'
    }).setOrigin(0.5).setDepth(0.45);
  }

  /** Fade out and forget a piece's sprite plus its overwatch/jam markers. */
  private removePieceSprite(pieceId: string, fadeMs: number): void {
    const sprite = this.pieceSprites[pieceId];
    if (sprite) {
      this.tweens.killTweensOf(sprite);
      this.tweens.add({ targets: sprite, alpha: 0, duration: fadeMs, onComplete: () => sprite.destroy() });
    }
    delete this.pieceSprites[pieceId];
    this.owMarkers[pieceId]?.destroy();
    delete this.owMarkers[pieceId];
    this.jamMarkers[pieceId]?.destroy();
    delete this.jamMarkers[pieceId];
  }

  /** If the vanished piece owned the selection, clear it and tell the HUD. */
  private clearSelectionOf(pieceId: string, disarmFlamer: boolean): void {
    if (Selection.get() !== pieceId) return;
    Selection.clear();
    if (disarmFlamer) this.setFlamerAiming(false);
    this.updateHighlight();
    PieceEvents.emit('selected', { pieceId: null });
  }

  /** Any (de)selection disarms the flamer and the self-destruct confirm. */
  private disarmAndRefresh(): void {
    this.setFlamerAiming(false);
    this.destructArmedAt = 0;
    this.updateHighlight();
  }

  /** Announce the current selection with its AP/ammo payload (or a clear). */
  private emitSelected(piece: Piece | undefined): void {
    PieceEvents.emit('selected', {
      pieceId: piece?.id ?? null,
      ap: piece ? { apRemaining: piece.apRemaining, apInitial: piece.apInitial } : undefined,
      ammo: ammoOf(piece),
    });
  }

  /** ESC: pause stops the timer and ignores all game input until resumed. */
  private togglePause(): void {
    if (this.engine.state.result !== 'ongoing' || this.animating) return;
    this.paused = !this.paused;
    if (this.paused) {
      const cam = this.cameras.main;
      const box = this.add.rectangle(0, 0, cam.width, cam.height, 0x000000, 0.5).setOrigin(0);
      const label = this.add.text(cam.width / 2, cam.height / 2, 'PAUSED', {
        fontFamily: UI_FONT, fontSize: '42px', color: '#ffffff', fontStyle: 'bold'
      }).setOrigin(0.5);
      this.pauseOverlay = this.add.container(0, 0, [box, label]).setScrollFactor(0).setDepth(90);
    } else {
      this.pauseOverlay?.destroy();
      this.pauseOverlay = undefined;
    }
  }

  /** Per-event replay pacing (ms added AFTER the event fires). */
  private static readonly REPLAY_DELAY: Record<string, number> = {
    pieceMoved: 110, doorToggled: 200, shot: 230, closeCombat: 260,
    pieceDied: 200, blipConverted: 170, pieceAdded: 90,
    sectionFlamed: 300, flamesCleared: 150, jammed: 120,
    catMoved: 110, catDropped: 170, catDamaged: 220,
    ductingDestroyed: 220, marineEscaped: 180, objectiveCleansed: 150,
    doorDestroyed: 220, malfunction: 320, downloadChanged: 120,
  };

  /**
   * Done button / Enter / timer expiry: hand the turn to the stealers.
   * The engine resolves the whole phase synchronously; we capture its event
   * stream and re-emit it on a timeline so the player SEES the stealers act.
   */
  private endTurn(): void {
    if (this.engine.state.result !== 'ongoing' || this.paused || this.animating) return;
    const stream = PieceEvents.capture(() => this.engine.endMarinePhase());
    Selection.clear();
    this.disarmAndRefresh();
    this.emitSelected(undefined);
    // Accessibility: with prefers-reduced-motion, skip the timeline entirely
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      for (const ev of stream) PieceEvents.replay(ev);
      this.finishReplay();
      return;
    }
    this.animating = true;
    // Freeze the radar: mid-replay the engine holds FINAL state, and dots or
    // echoes drawn from it would spoil deaths and conversions the animation
    // has not shown yet (same payload-not-engine invariant the sprites obey).
    this.minimap.frozen = true;
    let at = 80;
    for (const ev of stream) {
      this.time.delayedCall(at, () => PieceEvents.replay(ev));
      at += GameScene.REPLAY_DELAY[ev.type as string] ?? 0;
    }
    this.time.delayedCall(at + 150, () => this.finishReplay());
  }

  /** Replay done: engine truth wins. Reconcile every sprite, restart the clock. */
  private finishReplay(): void {
    this.animating = false;
    this.minimap.frozen = false;
    const live = new Set(this.engine.state.pieces.map(p => p.id));
    for (const p of this.engine.state.pieces) {
      if (!this.pieceSprites[p.id]) this.createPieceSprite(p as Piece);
      else this.refreshPieceSprite(p as Piece);
    }
    for (const id of Object.keys(this.pieceSprites)) {
      if (!live.has(id)) {
        this.pieceSprites[id].destroy();
        delete this.pieceSprites[id];
        this.owMarkers[id]?.destroy();
        delete this.owMarkers[id];
        // Symmetry with removePieceSprite: a piece that vanished without its
        // death event replayed must not leave an orphaned JAM marker behind.
        this.jamMarkers[id]?.destroy();
        delete this.jamMarkers[id];
      }
    }
    this.timerRemaining = this.engine.marinePhaseSeconds;
    this.hud.setTimer(this.timerRemaining);
    this.updateHighlight();
    this.roster.refreshAll(); // post-replay engine truth (fresh AP, deaths)
  }

  /**
   * F key. Flamer: two-press targeting — the first F arms (no AP), the second
   * fires at the hovered square; an invalid second press just disarms.
   * Bolter/cannon: a shootable closed door under the cursor takes priority,
   * otherwise auto-target the nearest enemy in fire arc + LOS.
   */
  private handleFire(piece: Piece): boolean {
    // Replay protection lives in the keydown handler's seenKeyEvents dedupe —
    // no time-based debounce here: under load two LEGITIMATE presses can land
    // in one stalled frame batch with identical time.now (2026-08-16).
    const board = this.engine.state.board;
    if (piece instanceof HeavyFlamerMarine) {
      if (!this.flamerAiming) {
        // Arming is free (AP is spent by the shot) but pointless dry or broke.
        if (piece.ammo >= 1 && piece.ap >= HeavyFlamerMarine.SHOT_COST) this.setFlamerAiming(true);
        return false;
      }
      const hovered = this.hoverCoord ? board.get(this.hoverCoord.x, this.hoverCoord.y) : undefined;
      // Invalid aim: stay armed — the not-allowed cursor is the feedback, and a
      // mis-click must not force re-arming (Advisor 2026-08-16).
      if (!piece.canFlame(hovered)) return false;
      this.setFlamerAiming(false);
      return piece.flameAt(hovered) !== undefined;
    }
    if (!(piece instanceof StormBolterMarine)) return false;
    const door = this.hoveredDoorFor(piece);
    if (door) { piece.shootDoor(door); this.refreshFireReticle(); return true; } // AP spent even on a miss
    if (this.shootNearest(piece)) { this.refreshFireReticle(); return true; }
    // No enemy in sight: fall back to the nearest shootable closed door.
    // The reticle (refreshFireReticle) shows this target BEFORE the press, so
    // the shot is never a surprise — that visibility replaces the hover gate
    // an earlier review round added (user feedback 2026-08-18: the gate made
    // the fallback near-unreachable, since any mouse move sets hoverCoord).
    const fallback = this.nearestShootableDoor(piece);
    if (!fallback) return false;
    piece.shootDoor(fallback);
    this.refreshFireReticle();
    return true; // AP spent even on a miss
  }

  /** The nearest closed door this marine can shoot (fire arc + LOS). */
  private nearestShootableDoor(piece: StormBolterMarine): Door | undefined {
    const mid = (d: Door) => ({
      x: (d.square.x + d.otherSide().c) / 2,
      y: (d.square.y + d.otherSide().r) / 2,
    });
    return this.engine.state.board.allDoors()
      .filter(d => piece.canShootDoor(d))
      .sort((a, b) => {
        const ma = mid(a), mb = mid(b);
        return Math.hypot(ma.x - piece.pos.c, ma.y - piece.pos.r)
          - Math.hypot(mb.x - piece.pos.c, mb.y - piece.pos.r);
      })[0];
  }

  /** What F would hit RIGHT NOW for the selected marine — the same priority
   *  handleFire executes (hovered door, else nearest enemy, else nearest
   *  shootable door), from the same helpers, so the reticle can never lie. */
  private fireTarget():
    | { kind: 'door'; door: Door }
    | { kind: 'enemy'; piece: Piece }
    | undefined {
    if (this.attract || this.engine.state.result !== 'ongoing') return undefined;
    const selectedId = Selection.get();
    const piece = selectedId ? this.engine.findPiece(selectedId) : undefined;
    if (!(piece instanceof StormBolterMarine)) return undefined; // flamer excluded (extends Piece)
    if (piece.jammed || (!piece.freeShot && piece.ap < 1)) return undefined;
    const hovered = this.hoveredDoorFor(piece);
    if (hovered) return { kind: 'door', door: hovered };
    const enemy = this.nearestEnemyTarget(piece);
    if (enemy) return { kind: 'enemy', piece: enemy };
    const door = this.nearestShootableDoor(piece);
    return door ? { kind: 'door', door } : undefined;
  }

  /** Reticle over whatever F would shoot — enemy or door — so the player sees
   *  the target before pressing (discoverability + no surprise). Refresh rests
   *  entirely on the acted→updateHighlight funnel (plus pointermove/doorToggled/
   *  doorDestroyed/finishReplay): anything that ever kills or moves pieces
   *  OUTSIDE a marine action must add its own refresh or the crosshair stales. */
  refreshFireReticle(): void {
    const target = this.fireTarget();
    this.fireReticleGfx.clear();
    if (!target) {
      this.fireReticleFor = null;
      return;
    }
    const T = TILE_SIZE;
    let cx: number, cy: number;
    if (target.kind === 'enemy') {
      const p = target.piece;
      cx = (p.pos.c + 0.5) * T;
      cy = (p.pos.r + 0.5) * T;
      this.fireReticleFor = { kind: 'enemy', pieceId: p.id, x: p.pos.c, y: p.pos.r, cx, cy };
    } else {
      const door = target.door;
      const other = door.otherSide();
      cx = ((door.square.x + other.c) / 2 + 0.5) * T;
      cy = ((door.square.y + other.r) / 2 + 0.5) * T;
      this.fireReticleFor = { kind: 'door', x: door.square.x, y: door.square.y, facing: door.facing, cx, cy };
    }
    const r = T * 0.32;
    this.fireReticleGfx.lineStyle(2.5, 0xff3333, 0.95).strokeCircle(cx, cy, r);
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
      this.fireReticleGfx.lineBetween(cx + dx * r * 0.55, cy + dy * r * 0.55, cx + dx * r * 1.45, cy + dy * r * 1.45);
    }
  }

  /** A closed, shootable door on an edge of the hovered square. */
  private hoveredDoorFor(piece: StormBolterMarine): Door | undefined {
    if (!this.hoverCoord) return undefined;
    const { x, y } = this.hoverCoord;
    return this.engine.state.board.allDoors()
      .filter(d => (d.square.x === x && d.square.y === y) ||
        (d.otherSide().c === x && d.otherSide().r === y))
      .find(d => piece.canShootDoor(d));
  }

  /** Arm/disarm the flamer targeting mode — single owner of cursor + preview. */
  private setFlamerAiming(on: boolean): void {
    if (!this.flamerAiming && !on) return;
    this.flamerAiming = on;
    this.refreshAimUI();
  }

  /** Cursor + blast-preview overlay for the armed flamer. The preview IS the
   *  engine's flameFlood — never a client-side approximation. */
  private refreshAimUI(): void {
    this.flamePreviewGfx.clear();
    this.flamePreview = [];
    if (!this.flamerAiming) {
      this.input.setDefaultCursor('default');
      return;
    }
    const board = this.engine.state.board;
    const selectedId = Selection.get();
    const piece = selectedId ? this.engine.findPiece(selectedId) : undefined;
    const hovered = this.hoverCoord ? board.get(this.hoverCoord.x, this.hoverCoord.y) : undefined;
    if (!(piece instanceof HeavyFlamerMarine) || !piece.canFlame(hovered)) {
      this.input.setDefaultCursor('not-allowed');
      return;
    }
    this.input.setDefaultCursor('crosshair');
    const T = TILE_SIZE;
    this.flamePreview = flameFlood(board, hovered).map(s => ({ x: s.x, y: s.y }));
    for (const s of this.flamePreview) {
      const target = s.x === hovered.x && s.y === hovered.y;
      this.flamePreviewGfx.fillStyle(0xff6600, target ? 0.65 : 0.4)
        .fillRect(s.x * T, s.y * T, T, T)
        .lineStyle(2, 0xffaa00, 0.9).strokeRect(s.x * T + 1, s.y * T + 1, T - 2, T - 2);
      // A battle-brother in the blast gets a red warning wash — the flood
      // rolls to kill marines exactly like stealers (Advisor 2026-08-16).
      const p = board.pieceAt({ c: s.x, r: s.y }) as Piece | undefined;
      if (p?.alive && p.kind === 'marine') {
        this.flamePreviewGfx.fillStyle(0xff0000, 0.45).fillRect(s.x * T, s.y * T, T, T);
      }
    }
  }

  /** The nearest enemy this marine could shoot (fire arc + LOS, no range cap).
   *  canShootPiece is the engine's legality mirror of shoot() — it keeps an
   *  empty cannon drum from putting a reticle on a target F couldn't fire at. */
  private nearestEnemyTarget(piece: StormBolterMarine): Piece | undefined {
    return this.engine.state.board.pieces
      .filter((p): p is Piece => (p as Piece).kind !== 'marine')
      .filter(p => piece.canShootPiece(p))
      .sort((a, b) =>
        Math.hypot(a.pos.c - piece.pos.c, a.pos.r - piece.pos.r) -
        Math.hypot(b.pos.c - piece.pos.c, b.pos.r - piece.pos.r))[0];
  }

  /** Auto-target: shoot the nearest enemy in fire arc + LOS. */
  private shootNearest(piece: StormBolterMarine): boolean {
    const target = this.nearestEnemyTarget(piece);
    if (!target) return false;
    piece.shoot(target);
    return true; // AP was spent even on a miss
  }

  /** B key, twice: self-destruct with confirmation — the original games this
   *  ports asked "Really self-destruct?"; a single stray press must never
   *  torch the squad (the old X binding sat between action keys). */
  private handleSelfDestruct(piece: Piece): boolean {
    if (!(piece instanceof HeavyFlamerMarine)) return false;
    if (this.destructArmedAt && this.destructArmedFor === piece.id
        && this.time.now - this.destructArmedAt < 2500) {
      this.destructArmedAt = 0; // disarm BEFORE firing — no re-entrant repeat
      return piece.selfDestruct();
    }
    this.destructArmedAt = this.time.now;
    this.destructArmedFor = piece.id;
    this.hud.flash('Press B again to SELF-DESTRUCT');
    return false;
  }

  /** M key: close combat against the piece directly ahead. */
  private meleeAhead(piece: Piece): boolean {
    const v = DIR_VEC[piece.facing];
    const ahead = { c: piece.pos.c + v.dc, r: piece.pos.r + v.dr };
    const defender = this.engine.state.board.pieceAt(ahead) as Piece | undefined;
    if (!defender) return false;
    return closeCombat(piece, defender) !== undefined;
  }

  private drawLosOverlay() {
    this.losOverlay.clear();
    const selectedId = Selection.get();
    if (!selectedId) return;
    const piece = this.engine.findPiece(selectedId);
    if (!piece) return;
    this.losOverlay.fillStyle(0x00ff00, 0.25);
    for (const sq of visibleSquares(this.engine.state.board, piece)) {
      this.losOverlay.fillRect(sq.x * TILE_SIZE, sq.y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
    }
  }

  private updateHighlight() {
    const selectedId = Selection.get();
    if (!selectedId) {
      this.highlight.hide();
      this.refreshFireReticle();
      return;
    }
    const sprite = this.pieceSprites[selectedId];
    if (sprite) {
      this.highlight.follow(sprite);
    }
    // Single choke point: every action/selection path that moves the highlight
    // also re-derives which door F would shoot.
    this.refreshFireReticle();
  }
}
