import Phaser from 'phaser'
import { GameEngine, loadMission, missions, Square, Piece, StormBolterMarine, HeavyFlamerMarine, AssaultCannonMarine, ChainFistMarine, Genestealer, Selection, PieceEvents, visibleSquares, canShoot, closeCombat, DIR_VEC, SeededRng, autoplay, runMarineTurn } from "@sulk/engine/index.js";
import { Minimap } from '../ui/Minimap.js';
import { HighlightSprite } from '../ui/HighlightSprite.js';
import { HudPanel } from '../ui/HudPanel.js';
import { RosterPanel, type PieceStats } from '../ui/RosterPanel.js';
import { buildRoster } from '../ui/marineNames.js';
import { HUD_WIDTH } from '../config.js';

const TILE_SIZE = 40

export default class GameScene extends Phaser.Scene {
  private hud!: import('../ui/HudPanel.js').HudPanel;
  /** DOM roster card panel — public for the e2e suite. */
  roster!: RosterPanel;

  private tileSize: number = TILE_SIZE;
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

  constructor() {
    super('GameScene')
    // The engine builds the board, deploys the squad, and seeds the first blips.
    // `?seed=N` pins the WHOLE game (blip values + CP roll included) — used by
    // the deterministic e2e suite and handy for bug reports.
    // `?mission=<name>` selects any registered mission (default: debug_1).
    const params = new URLSearchParams(window.location.search);
    const seedParam = params.get('seed');
    const dice = seedParam ? new SeededRng(Number(seedParam)) : undefined;
    const missionParam = params.get('mission') ?? 'debug_1';
    const missionName = (missionParam in missions ? missionParam : 'debug_1') as keyof typeof missions;
    this.engine = new GameEngine(loadMission(missionName), [], dice);
    (window as any).sulk = { engine: this.engine, Selection, scene: this, SeededRng, autoplay, runMarineTurn, PieceEvents }; // dev/debug + autoplay handle
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
    // Original GPL sound set (data/sounds in the Pygame source)
    this.load.audio('snd_move', 'assets/sounds/marine_move.wav');
    this.load.audio('snd_bolter', 'assets/sounds/marine_shoot_bolter.wav');
    this.load.audio('snd_flamer', 'assets/sounds/marine_shoot_flamer.wav');
    this.load.audio('snd_cc', 'assets/sounds/marine_cc.wav');
    this.load.audio('snd_die', 'assets/sounds/marine_kill_skewered.wav');
    this.load.audio('snd_jam', 'assets/sounds/marine_jam.wav');
    this.load.audio('snd_door', 'assets/sounds/door_open.wav');
    this.load.audio('snd_destruct', 'assets/sounds/marine_selfdestruct_flamer.wav');
  }

  /** Fire-and-forget sound: never let a locked/absent audio context break play. */
  private sfx(key: string, volume = 0.5): void {
    try { this.sound.play(key, { volume }); } catch { /* audio unavailable */ }
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
      this.sfx('snd_door', 0.4);
    });
    PieceEvents.on('closeCombat', () => this.sfx('snd_cc', 0.5));

    // Mission markers: stealer entry triangles + exit arrows (theme art, drawn
    // one square OFF-board per the original EntryTriangle/ExitArrow — `facing`
    // is efacing, the off-board direction; the graphic points back onto the
    // board via rotate(-90°·efacing)), exit squares (green), marine deployment
    // (blue outline). Drawn under pieces, over squares.
    const markers = this.add.graphics().setDepth(0.4);
    const mission = this.engine.mission;
    const T = this.tileSize;
    const FACING_IDX: Record<string, number> = { up: 0, right: 1, down: 2, left: 3 };
    const OFF: Record<string, { dx: number; dy: number }> = {
      up: { dx: 0, dy: -1 }, right: { dx: 1, dy: 0 }, down: { dx: 0, dy: 1 }, left: { dx: -1, dy: 0 },
    };
    const placeMarker = (texture: string, p: { x: number; y: number; facing?: string }) => {
      if (!p.facing) return; // adapted mid-board point: flat marker only
      const o = OFF[p.facing];
      this.add.image((p.x + o.dx) * T + T / 2, (p.y + o.dy) * T + T / 2, texture)
        .setDepth(0.4)
        .setRotation(FACING_IDX[p.facing] * Math.PI / 2)
        .setName(texture === 'entry' ? 'entry-triangle' : 'exit-arrow');
    };
    for (const e of mission.entryPoints ?? []) placeMarker('entry', e);
    for (const e of mission.exitPoints ?? []) {
      placeMarker('exit', e);
      markers.fillStyle(0x00cc44, 0.35).fillRect(e.x * T, e.y * T, T, T);
      markers.lineStyle(2, 0x00ff55, 1).strokeRect(e.x * T + 1, e.y * T + 1, T - 2, T - 2);
      this.add.text(e.x * T + T / 2, e.y * T + T / 2, 'EXIT', {
        fontFamily: 'Kanit', fontSize: '11px', color: '#00ff55', fontStyle: 'bold'
      }).setOrigin(0.5).setDepth(0.45);
    }
    if (mission.objectivePoint) {
      const o = mission.objectivePoint;
      markers.fillStyle(0xff8800, 0.35).fillRect(o.x * T, o.y * T, T, T);
      markers.lineStyle(2, 0xffaa00, 1).strokeRect(o.x * T + 1, o.y * T + 1, T - 2, T - 2);
      this.add.text(o.x * T + T / 2, o.y * T + T / 2, 'BURN', {
        fontFamily: 'Kanit', fontSize: '11px', color: '#ffaa00', fontStyle: 'bold'
      }).setOrigin(0.5).setDepth(0.45);
    }
    for (const o of mission.objectivePoints ?? []) {
      markers.fillStyle(0xff8800, 0.35).fillRect(o.x * T, o.y * T, T, T);
      markers.lineStyle(2, 0xffaa00, 1).strokeRect(o.x * T + 1, o.y * T + 1, T - 2, T - 2);
      this.add.text(o.x * T + T / 2, o.y * T + T / 2, 'BURN', {
        fontFamily: 'Kanit', fontSize: '11px', color: '#ffaa00', fontStyle: 'bold'
      }).setOrigin(0.5).setDepth(0.45);
    }
    for (const r of mission.roomSquares ?? []) {
      markers.lineStyle(2, 0xff4040, 0.6).strokeRect(r.x * T + 2, r.y * T + 2, T - 4, T - 4);
    }
    for (const d of mission.ductingSquares ?? []) {
      this.ductingSprites[`${d.x},${d.y}`] =
        this.add.image(d.x * T + T / 2, d.y * T + T / 2, 'ducting').setDepth(0.5);
    }
    for (const d of mission.marineDeployment ?? []) {
      markers.lineStyle(2, 0x3b82f6, 0.7).strokeRect(d.x * T + 3, d.y * T + 3, T - 6, T - 6);
    }
    // The C.A.T. (mission 3): board-level object with its own sprite.
    if (this.engine.state.board.cat) {
      const cat = this.engine.state.board.cat;
      this.catSprite = this.add.image(cat.pos.c * T + T / 2, cat.pos.r * T + T / 2, 'cat').setDepth(0.95);
    }
    PieceEvents.on('catMoved', ({ x, y }) => {
      this.catSprite?.setVisible(true).setPosition(x * T + T / 2, y * T + T / 2);
      this.catMarker?.setPosition(x * T + T / 2 + 12, y * T + T / 2 - 12);
    });
    PieceEvents.on('catPickedUp', () => this.catSprite?.setVisible(false));
    PieceEvents.on('catDropped', ({ x, y }) => {
      this.catSprite?.setVisible(true).setPosition(x * T + T / 2, y * T + T / 2);
      this.catMarker?.setVisible(true).setPosition(x * T + T / 2 + 12, y * T + T / 2 - 12);
    });
    PieceEvents.on('catDamaged', ({ x, y, destroyed }) => {
      if (destroyed) {
        this.catSprite?.setVisible(true).setPosition(x * T + T / 2, y * T + T / 2).setTint(0x552222).setAlpha(0.6);
      } else {
        this.catMarker?.destroy();
        this.catMarker = this.add.image(x * T + T / 2 + 12, y * T + T / 2 - 12, 'marker_damage').setDepth(2);
      }
      this.sfx('snd_cc', 0.4);
    });
    PieceEvents.on('ductingDestroyed', ({ x, y }) => {
      this.ductingSprites[`${x},${y}`]?.setTexture('ducting_destroyed');
      this.sfx('snd_die', 0.5);
    });
    PieceEvents.on('marineEscaped', ({ pieceId, escaped }) => {
      const sprite = this.pieceSprites[pieceId];
      if (sprite) {
        this.tweens.killTweensOf(sprite);
        this.tweens.add({ targets: sprite, alpha: 0, duration: 150, onComplete: () => sprite.destroy() });
      }
      delete this.pieceSprites[pieceId];
      this.owMarkers[pieceId]?.destroy();
      delete this.owMarkers[pieceId];
      this.jamMarkers[pieceId]?.destroy();
      delete this.jamMarkers[pieceId];
      if (Selection.get() === pieceId) {
        Selection.clear();
        this.updateHighlight();
        PieceEvents.emit('selected', { pieceId: null });
      }
      this.sfx('snd_move', 0.4);
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
      this.sfx('snd_cc', 0.6);
    });
    PieceEvents.on('malfunction', () => this.sfx('snd_destruct'));
    PieceEvents.on('downloadChanged', ({ counter, active }) => {
      const total = this.engine.mission.downloadTurns ?? 4;
      this.hud.setStatus(active ? `Downloading… ${counter}/${total}` : `Download reset (${total})`);
    });
    if (mission.objective === 'download' && mission.downloadPoint) {
      const dp = mission.downloadPoint;
      markers.fillStyle(0xff8800, 0.35).fillRect(dp.x * T, dp.y * T, T, T);
      markers.lineStyle(2, 0xffaa00, 1).strokeRect(dp.x * T + 1, dp.y * T + 1, T - 2, T - 2);
      this.add.text(dp.x * T + T / 2, dp.y * T + T / 2, 'DATA', {
        fontFamily: 'Kanit', fontSize: '11px', color: '#ffaa00', fontStyle: 'bold'
      }).setOrigin(0.5).setDepth(0.45);
    }

    // Render-side combat reactions: engine events drive all sprite state.
    // Handlers read the event PAYLOAD, never the engine — during stealer-phase
    // replay the engine already holds the final state, so payload coords are
    // the only truthful intermediate positions.
    PieceEvents.on('pieceMoved', ({ pieceId, x, y, facing }) => {
      this.moveSprite(pieceId, x, y, facing);
      this.sfx('snd_move', 0.25);
    });
    PieceEvents.on('pieceDied', ({ pieceId }) => {
      this.sfx('snd_die', 0.4);
      const sprite = this.pieceSprites[pieceId];
      if (sprite) {
        this.tweens.killTweensOf(sprite);
        this.tweens.add({ targets: sprite, alpha: 0, duration: this.animating ? 160 : 80, onComplete: () => sprite.destroy() });
      }
      delete this.pieceSprites[pieceId];
      this.owMarkers[pieceId]?.destroy();
      delete this.owMarkers[pieceId];
      this.jamMarkers[pieceId]?.destroy();
      delete this.jamMarkers[pieceId];
      if (Selection.get() === pieceId) {
        Selection.clear();
        this.updateHighlight();
        PieceEvents.emit('selected', { pieceId: null });
      }
    });
    PieceEvents.on('shot', ({ shooterId }) => {
      this.sfx('snd_bolter', 0.35);
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
        this.sfx('snd_jam');
      } else {
        this.jamMarkers[pieceId]?.destroy();
        delete this.jamMarkers[pieceId];
      }
    });
    // Flames: render every burning square; clear on end-phase dispersal.
    PieceEvents.on('sectionFlamed', ({ shooterId, squares, kills }) => {
      for (const s of squares) {
        const key = `${s.x},${s.y}`;
        if (this.flameSprites[key]) continue;
        this.flameSprites[key] = this.add.image(s.x * T + T / 2, s.y * T + T / 2, 'flames').setDepth(0.9);
      }
      // A self-destruct kills its own shooter — that gets the big boom.
      this.sfx(kills.includes(shooterId) ? 'snd_destruct' : 'snd_flamer');
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
        fontFamily: 'Kanit', fontSize: '48px', color, fontStyle: 'bold'
      }).setOrigin(0.5).setScrollFactor(0).setDepth(100);
    });


    pieces.forEach(p => this.createPieceSprite(p));

    this.cursors = this.input.keyboard!.createCursorKeys()
    this.wasd = this.input.keyboard!.addKeys('W,A,S,D,O,F,C,V,U,P,X,T,R,G') as any
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
    const minimap = new Minimap(this, this.engine, { tile: this.tileSize, width: HUD_WIDTH - 2 * 8 });
    minimap.setScrollFactor(0); // fixed to screen

    // Create HUD panel (right-hand strip) and re-parent minimap into it
    this.hud = new HudPanel(this, minimap, () => this.endTurn());
    this.hud.setPosition(this.scale.width - HUD_WIDTH, 0);
    this.hud.setDepth(10);
    this.add.existing(this.hud);

    // Marine roster card panel (DOM, right of the canvas): squad-grouped cards
    // with live AP/ammo/state; card click selects the marine and pans to him.
    this.roster = new RosterPanel(
      buildRoster(this.engine, this.engine.mission),
      (id): PieceStats | undefined => {
        const p = this.engine.findPiece(id) as StormBolterMarine | undefined;
        if (!p) return { alive: false, apRemaining: 0, apInitial: 4, overwatch: false, jammed: false, facing: 0 };
        return {
          alive: p.alive,
          apRemaining: p.apRemaining,
          apInitial: p.apInitial,
          ammo: p instanceof HeavyFlamerMarine || p instanceof AssaultCannonMarine ? p.ammo : undefined,
          overwatch: p.overwatch ?? false,
          jammed: p.jammed ?? false,
          facing: p.facing,
        };
      },
      (id) => this.selectFromRoster(id),
    );

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
    });

    PieceEvents.emit('cpChanged', { cp: this.engine.cp }); // HUD subscribed after the initial roll

    // Marine-phase turn timer (120s + 30s per living sergeant, per the original)
    this.timerRemaining = this.engine.marinePhaseSeconds;
    this.hud.setTimer(this.timerRemaining);
    this.timerEvent = this.time.addEvent({
      delay: 1000, loop: true, callback: () => {
        if (this.paused || this.animating || this.engine.state.result !== 'ongoing' || this.engine.phase !== 'MarineAction') return;
        this.timerRemaining -= 1;
        this.hud.setTimer(this.timerRemaining);
        if (this.timerRemaining <= 0) this.endTurn();
      }
    });

    // Listen for camera updates for minimap
    this.events.on('update', () => minimap.updateCam(this.cameras.main));

    // Set-up selection
    this.highlight = new HighlightSprite(this, this.tileSize);
    this.add.existing(this.highlight);

    // Input handler for piece selection
    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      if (this.animating) return;
      const hit = this.children.list.find(obj =>
        obj.name === 'piece' && (obj as Phaser.GameObjects.Image).getBounds().contains(p.worldX, p.worldY)
      );

      if (hit) {
        Selection.toggle((hit as any).pieceId);
      } else {
        Selection.clear();
      }
      this.updateHighlight();

      const selectedId = Selection.get();
      const piece = selectedId ? this.engine.findPiece(selectedId) : undefined;
      PieceEvents.emit('selected', {
        pieceId: piece?.id ?? null,
        ap: piece ? { apRemaining: piece.apRemaining, apInitial: piece.apInitial } : undefined,
        ammo: piece instanceof HeavyFlamerMarine || piece instanceof AssaultCannonMarine ? piece.ammo : undefined
      });
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
      if (this.paused || this.animating || this.engine.state.result !== 'ongoing') return;
      const selectedId = Selection.get();
      if (!selectedId) return;

      const piece = this.engine.findPiece(selectedId);
      if (!piece) return;

      let acted = false;
      if (Phaser.Input.Keyboard.JustDown(this.wasd.W))      acted = piece.moveForward();
      else if (Phaser.Input.Keyboard.JustDown(this.wasd.S)) acted = piece.moveBackward();
      else if (Phaser.Input.Keyboard.JustDown(this.wasd.A)) acted = piece.tryTurn(-1);
      else if (Phaser.Input.Keyboard.JustDown(this.wasd.D)) acted = piece.tryTurn(1);
      else if (Phaser.Input.Keyboard.JustDown((this.wasd as any).O)) acted = piece.useDoor();
      else if (Phaser.Input.Keyboard.JustDown((this.wasd as any).F)) acted = this.shootNearest(piece);
      else if (Phaser.Input.Keyboard.JustDown((this.wasd as any).C)) acted = this.meleeAhead(piece);
      else if (Phaser.Input.Keyboard.JustDown((this.wasd as any).V)) {
        const marine = piece as StormBolterMarine;
        if (marine.overwatch) { marine.overwatchOff(); acted = true; }
        else acted = marine.overwatchOn?.() ?? false;
      }
      else if (Phaser.Input.Keyboard.JustDown((this.wasd as any).U)) acted = (piece as StormBolterMarine).unjam?.() ?? false;
      else if (Phaser.Input.Keyboard.JustDown((this.wasd as any).X)) acted = piece instanceof HeavyFlamerMarine && piece.selfDestruct();
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
  }

  /** Roster card click: select the marine, sync map highlight + HUD, pan to him. */
  private selectFromRoster(id: string): void {
    if (this.paused || this.animating || this.engine.state.result !== 'ongoing') return;
    const piece = this.engine.findPiece(id);
    if (!piece) return;
    Selection.select(id);
    this.updateHighlight();
    PieceEvents.emit('selected', {
      pieceId: id,
      ap: { apRemaining: piece.apRemaining, apInitial: piece.apInitial },
      ammo: piece instanceof HeavyFlamerMarine || piece instanceof AssaultCannonMarine ? piece.ammo : undefined
    });
    const sprite = this.pieceSprites[id];
    if (sprite) this.cameras.main.pan(sprite.x, sprite.y, 250, 'Sine.easeInOut');
  }

  /** Human-readable contents of a board square — powers the HUD hover readout. */
  describeSquare(x: number, y: number): string {
    const board = this.engine.state.board;
    const sq = board.get(x, y);
    if (!sq) return `(${x},${y}) — rock`;
    const parts = [`(${x},${y}) ${sq.kind} tile`];
    const ARROW = ['↑', '→', '↓', '←'];
    for (const door of board.doorsAt({ c: x, r: y })) {
      parts.push(`door ${ARROW[door.facing]} ${door.isOpen ? 'open' : 'closed'}`);
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
    const sprite = this.add.image(
      x * this.tileSize + this.tileSize / 2,
      y * this.tileSize + this.tileSize / 2,
      texture)
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
    const tx = x * this.tileSize + this.tileSize / 2;
    const ty = y * this.tileSize + this.tileSize / 2;
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

  /** ESC: pause stops the timer and ignores all game input until resumed. */
  private togglePause(): void {
    if (this.engine.state.result !== 'ongoing' || this.animating) return;
    this.paused = !this.paused;
    if (this.paused) {
      const cam = this.cameras.main;
      const box = this.add.rectangle(0, 0, cam.width, cam.height, 0x000000, 0.5).setOrigin(0);
      const label = this.add.text(cam.width / 2, cam.height / 2, 'PAUSED', {
        fontFamily: 'Kanit', fontSize: '42px', color: '#ffffff', fontStyle: 'bold'
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
    this.updateHighlight();
    PieceEvents.emit('selected', { pieceId: null });
    // Accessibility: with prefers-reduced-motion, skip the timeline entirely
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      for (const ev of stream) PieceEvents.replay(ev);
      this.finishReplay();
      return;
    }
    this.animating = true;
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
      }
    }
    this.timerRemaining = this.engine.marinePhaseSeconds;
    this.hud.setTimer(this.timerRemaining);
    this.updateHighlight();
    this.roster.refreshAll(); // post-replay engine truth (fresh AP, deaths)
  }

  /** F key: bolters shoot the nearest enemy in fire arc + LOS; the flamer
   *  torches the hovered square (fallback: the nearest enemy's square). */
  private shootNearest(piece: Piece): boolean {
    const board = this.engine.state.board;
    if (piece instanceof HeavyFlamerMarine) {
      const hovered = this.hoverCoord ? board.get(this.hoverCoord.x, this.hoverCoord.y) : undefined;
      if (piece.canFlame(hovered)) return piece.flameAt(hovered) !== undefined;
      const enemySquares = board.pieces
        .filter((p): p is Piece => (p as Piece).kind !== 'marine')
        .map(p => board.get(p.pos.c, p.pos.r))
        .filter((sq): sq is Square => sq !== undefined && piece.canFlame(sq));
      if (!enemySquares[0]) return false;
      return piece.flameAt(enemySquares[0]) !== undefined;
    }
    if (!(piece instanceof StormBolterMarine)) return false;
    const enemies = board.pieces
      .filter((p): p is Piece => (p as Piece).kind !== 'marine')
      .filter(p => {
        const sq = board.get(p.pos.c, p.pos.r);
        return sq !== undefined && canShoot(board, piece, sq); // aimed fire: LOS-bound, no range cap
      })
      .sort((a, b) =>
        Math.hypot(a.pos.c - piece.pos.c, a.pos.r - piece.pos.r) -
        Math.hypot(b.pos.c - piece.pos.c, b.pos.r - piece.pos.r));
    const target = enemies[0];
    if (!target) return false;
    piece.shoot(target as Piece);
    return true; // AP was spent even on a miss
  }

  /** C key: close combat against the piece directly ahead. */
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
      this.losOverlay.fillRect(sq.x * this.tileSize, sq.y * this.tileSize, this.tileSize, this.tileSize);
    }
  }

  private updateHighlight() {
    const selectedId = Selection.get();
    if (!selectedId) {
      this.highlight.hide();
      return;
    }
    const sprite = this.pieceSprites[selectedId];
    if (sprite) {
      this.highlight.follow(sprite);
    }
  }
}
