import Phaser from 'phaser'
import { GameEngine, loadMission, missions, Square, Piece, StormBolterMarine, HeavyFlamerMarine, AssaultCannonMarine, ChainFistMarine, Genestealer, PieceEvents, visibleSquares, closeCombat, DIR_VEC, SeededRng, autoplay, runMarineTurn, flameFlood, Door, deploySeconds } from "@sulk/engine/index.js";
import { Selection } from "../ui/Selection";
import { Minimap } from '../ui/Minimap.js';
import { HighlightSprite } from '../ui/HighlightSprite.js';
import { HudPanel } from '../ui/HudPanel.js';
import { RosterPanel, type PieceStats } from '../ui/RosterPanel.js';
import { buildRoster, assignHotkeys } from '../ui/marineNames.js';
import { AudioManager } from '../audio/AudioManager.js';
import { showEndDialog } from '../ui/endDialog.js';
import { HUD_WIDTH, MINI_MAP_MARGIN, UI_FONT, FACING_ARROWS } from '../config.js';
import { MOTION, kindFromTexture, camPanStep, shimmerPhase, recoilVector, shortestRotationDelta } from '../utils/motionLogic.js';
import { FOCUS, planReplayFocus, replayOffsets } from '../utils/replayFocus.js';

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
  /** Deterministic motion probe: every motion decision (piece steps, door
   *  slides, recoil, deaths) in arrival order, capped — the e2e suite asserts
   *  profiles from this instead of racing tweens mid-flight. */
  motionLog: { id: string; kind: string; durationMs: number; tweened: boolean }[] = [];
  /** Camera inertia velocity (px/ms) — public for the e2e suite. */
  camVel = { x: 0, y: 0 };
  /** Tracked drag velocity for release momentum (px/ms). pointer.velocity is
   *  unreliable under headless test drivers, so we integrate our own. */
  private dragVel = { x: 0, y: 0 };
  private lastDragAt = 0;
  /** Where the integrator left the scroll last frame. If anything else moved
   *  it since (bounds clamp at a map edge, panEffect, drag), the glide is
   *  fighting another writer — park it. */
  private expectedScroll: { x: number; y: number } | null = null;
  /** Replay action-camera probe: every pan the plan fired (board squares). */
  focusLog: { x: number; y: number; attack: boolean }[] = [];
  /** Last attack staging the effects fired for — e2e probe. */
  lastAttackFx: { x: number; y: number } | null = null;
  /** The claustrophobia spotlight over an in-progress kill. */
  private vignette?: Phaser.GameObjects.Image;
  /** Homepage attract mode (no ?mission= param): the board is scenery under
   *  the DOM landing overlay — input disabled, clock stopped, no audio. */
  private readonly attract: boolean;
  /** `?deploy=0` skips the deployment phase (e2e suites, quick debugging). */
  private readonly deployRequested: boolean;
  /** True while the pre-mission deployment phase runs — public for e2e. */
  deployMode = false;
  /** Deployment clock (90s per squad), separate from the marine-phase clock. */
  private deployRemaining = 0;
  /** Reserve marine armed for placement by a roster click / pick-up. */
  private armedId: string | null = null;
  /** X markers over free deploy squares — rebuilt on every placement change. */
  private deployMarkers: Phaser.GameObjects.Text[] = [];

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
    this.deployRequested = params.get('deploy') !== '0';
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
    this.watchReducedMotion()

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
      const sprite = this.doorSprites[`${x},${y}:${facing}`];
      if (sprite) this.slideDoor(sprite, open);
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
      this.removePieceSprite(pieceId, 150, 'fade'); // an escape is not a death
      this.clearSelectionOf(pieceId, false);
      this.hud.setStatus(this.escapeStatus(escaped));
    });
    PieceEvents.on('objectiveCleansed', ({ cleansedCount }) => {
      const total = (this.engine.mission.objectivePoints ?? []).length;
      this.hud.setStatus(`Cleansed: ${cleansedCount}/${total}`);
    });
    // beta_2: destroyed doors disappear for good; malfunctions go out with a bang.
    // The map entry dies immediately (reticle/logic truth); the sprite gets a
    // brief crumble before destroy.
    PieceEvents.on('doorDestroyed', ({ x, y, facing }) => {
      const key = `${x},${y}:${facing}`;
      const sprite = this.doorSprites[key];
      delete this.doorSprites[key];
      if (sprite) {
        this.tweens.killTweensOf(sprite);
        if (this.reducedMotion) {
          sprite.destroy();
        } else {
          this.logMotion('door', 'door-crumble', MOTION.door.crumbleMs, true);
          sprite.setTint(0xff8866);
          this.tweens.add({
            targets: sprite, alpha: 0, scaleY: 0.25, duration: MOTION.door.crumbleMs,
            ease: 'Quad.easeIn', onComplete: () => sprite.destroy(),
          });
        }
      }
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
      // Subtle recoil: re-anchor on engine truth (a shooter never moves while
      // shooting — marines stand still through the whole stealer replay), kick
      // opposite the muzzle, spring back. Bursts re-anchor per shot, so rapid
      // fire vibrates without ever drifting the sprite off its square.
      const sprite = this.pieceSprites[shooterId];
      if (sprite?.active && !this.reducedMotion) {
        const [cx, cy] = centerXY(shooter.pos.c, shooter.pos.r);
        this.tweens.killTweensOf(sprite);
        sprite.setScale(1).setPosition(cx, cy);
        const r = recoilVector(shooter.facing as 0 | 1 | 2 | 3);
        this.tweens.add({
          targets: sprite, x: cx + r.dx, y: cy + r.dy,
          duration: MOTION.recoil.durationMs, yoyo: true, repeat: 1, ease: 'Sine.easeInOut',
          onComplete: () => sprite.setPosition(cx, cy),
        });
        this.logMotion(shooterId, 'recoil', MOTION.recoil.durationMs, true);
      }
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
        const spr = this.add.image(s.x * T + T / 2, s.y * T + T / 2, 'flames').setDepth(0.9);
        this.flameSprites[key] = spr;
        if (!this.reducedMotion) {
          // Shimmer: per-square period offset keeps neighbors out of sync.
          this.tweens.add({
            targets: spr, alpha: MOTION.shimmer.alphaLow, scale: MOTION.shimmer.scaleHigh,
            angle: MOTION.shimmer.angleDeg,
            duration: MOTION.shimmer.baseMs + shimmerPhase(s.x, s.y),
            yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
          });
        }
      }
    });
    PieceEvents.on('flamesCleared', ({ squares }) => {
      for (const s of squares) {
        const spr = this.flameSprites[`${s.x},${s.y}`];
        if (spr) {
          this.tweens.killTweensOf(spr); // the shimmer loops forever — never orphan it
          spr.destroy();
        }
        delete this.flameSprites[`${s.x},${s.y}`];
      }
    });
    PieceEvents.on('pieceAdded', ({ pieceId, kind, x, y, facing }) => {
      if (this.pieceSprites[pieceId]) return;
      this.createSprite(pieceId, kind, x, y, facing);
    });
    PieceEvents.on('blipConverted', ({ blipId }) => {
      const spr = this.pieceSprites[blipId];
      if (spr) {
        this.tweens.killTweensOf(spr); // it may be mid-slide when it converts
        spr.destroy();
      }
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
    // Both single-press handlers dedupe through seenKeyEvents like every
    // other key: under load Phaser replays the SAME native event across
    // frames, and an un-deduped ESC double-toggles pause while a replayed
    // ENTER slips through the momentarily-unpaused gap and ends the phase.
    this.input.keyboard!.on('keydown-ENTER', (e: KeyboardEvent) => {
      if (this.seenKeyEvents.has(e)) return;
      this.seenKeyEvents.add(e);
      this.endTurn();
    });
    this.input.keyboard!.on('keydown-ESC', (e: KeyboardEvent) => {
      if (this.seenKeyEvents.has(e)) return;
      this.seenKeyEvents.add(e);
      this.togglePause();
    });
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
      const dx = (p.x - p.prevPosition.x) / this.cameras.main.zoom;
      const dy = (p.y - p.prevPosition.y) / this.cameras.main.zoom;
      this.cameras.main.scrollX -= dx;
      this.cameras.main.scrollY -= dy;
      // Track drag velocity (px/ms, scroll direction) for release momentum.
      // performance.now(), NOT this.time.now: Phaser dispatches mouse moves
      // synchronously from the DOM listener, so a fast-polling mouse lands
      // several per frame — the frame-quantized clock reads dt 0 for all but
      // the first and inflates the fling ~10x (reviewer finding).
      const now = performance.now();
      const dt = Math.max(1, now - this.lastDragAt);
      this.lastDragAt = now;
      this.dragVel.x = 0.6 * (-dx / dt) + 0.4 * this.dragVel.x;
      this.dragVel.y = 0.6 * (-dy / dt) + 0.4 * this.dragVel.y;
    });
    // Grab-to-stop: touching the map kills any glide AND takes the wheel from
    // any in-flight programmatic pan (the replay action camera force-pans;
    // without this a drag during the stealer phase is undone every frame).
    this.input.on('pointerdown', () => {
      this.camVel.x = 0;
      this.camVel.y = 0;
      this.dragVel.x = 0;
      this.dragVel.y = 0;
      this.lastDragAt = performance.now();
      this.cameras.main.panEffect.reset();
    });
    // Deploy placement fires on pointerup with a movement gate: the camera
    // parks ON the deployment squares, so press-and-drag to pan must never
    // silently place or pick up a marine (reviewer finding, 2026-08-19).
    this.input.on('pointerup', (p: Phaser.Input.Pointer) => {
      if (!this.deployMode || this.paused) return;
      if (p.x > this.scale.width - HUD_WIDTH) return;
      if (p.getDistance() >= 6) return; // it was a pan, not a click
      this.handleDeployClick(p);
    });
    this.input.on('pointerup', (p: Phaser.Input.Pointer) => {
      if (this.reducedMotion) return;
      if (p.x > this.scale.width - HUD_WIDTH) return;
      // Only a recent, fast drag flings — a click or a parked hold does not.
      if (performance.now() - this.lastDragAt > MOTION.cam.flingWindowMs) return;
      const vx = Phaser.Math.Clamp(this.dragVel.x * MOTION.cam.flingCarry, -MOTION.cam.flingMax, MOTION.cam.flingMax);
      const vy = Phaser.Math.Clamp(this.dragVel.y * MOTION.cam.flingCarry, -MOTION.cam.flingMax, MOTION.cam.flingMax);
      if (Math.hypot(vx, vy) >= MOTION.cam.flingMin) {
        this.camVel.x = vx;
        this.camVel.y = vy;
      }
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
        // Reserve marines (deployment phase) are off the board but not dead —
        // without this fallback their cards would grey out as KIA.
        const p = (this.engine.findPiece(id)
          ?? this.engine.reserve.find(m => m.id === id)) as StormBolterMarine | undefined;
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
          if (this.paused || this.animating || this.engine.state.result !== 'ongoing') return;
          if (this.deployMode) {
            this.deployRemaining -= 1;
            this.hud.setTimer(this.deployRemaining);
            if (this.deployRemaining <= 0) this.finishDeploy();
            return;
          }
          if (this.engine.phase !== 'MarineAction') return;
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
      if (this.deployMode) return; // placement happens on pointerup — a drag here is a pan
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
      if (this.deployMode) {
        // Deployment controls: A/D rotate the selected deployed marine, free.
        // Everything else is swallowed — the board is locked anyway, but the
        // keys must not leak side effects (aiming, self-destruct arming).
        const selId = Selection.get();
        if (selId) {
          let turned = false;
          if (Phaser.Input.Keyboard.JustDown(this.wasd.A)) turned = this.engine.turnDeployed(selId, -1);
          else if (Phaser.Input.Keyboard.JustDown(this.wasd.D)) turned = this.engine.turnDeployed(selId, 1);
          if (turned) this.roster.refreshAll();
        }
        return;
      }
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

    // Pre-mission deployment phase: the squad lifts into reserve and the
    // player lays out his own battle order. Skipped in attract mode, by
    // ?deploy=0 (e2e suites), and for missions without a real deployment
    // (debug_1's single square) — beginDeployment itself refuses those.
    if (!this.attract && this.deployRequested && this.engine.beginDeployment()) {
      this.enterDeployMode();
    }

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
    if (this.deployMode) {
      // Reserve card: arm the marine — the next deploy-square click places HIM.
      if (this.engine.reserve.some(m => m.id === id)) {
        this.armedId = id;
        Selection.clear();
        this.updateHighlight();
        PieceEvents.emit('selected', { pieceId: id }); // card highlight = armed
        return;
      }
      // Deployed card: select him on the map for A/D rotation.
      const deployed = this.engine.findPiece(id);
      if (!deployed) return;
      this.armedId = null;
      Selection.select(id);
      this.updateHighlight();
      this.emitSelected(deployed);
      return;
    }
    const piece = this.engine.findPiece(id);
    // Death AND escape both set alive=false — one guard makes a fallen or
    // escaped marine's hotkey (and card) inert.
    if (!piece || !piece.alive) return;
    Selection.select(id);
    this.disarmAndRefresh();
    this.emitSelected(piece);
    const sprite = this.pieceSprites[id];
    if (sprite) {
      // A DOM roster click never reaches Phaser's pointerdown — park any glide
      // here or the inertia fights the pan effect frame by frame.
      this.camVel.x = 0;
      this.camVel.y = 0;
      if (this.reducedMotion) this.cameras.main.centerOn(sprite.x, sprite.y);
      else this.cameras.main.pan(sprite.x, sprite.y, 250, 'Sine.easeInOut');
    }
  }

  // ---------- Deployment phase (client) ----------

  /** Open the deploy UI: reserve roster, X markers, deploy clock, AUTO button.
   *  The camera parks on the deployment area so the phase starts on-subject. */
  private enterDeployMode(): void {
    this.deployMode = true;
    // The engine lifted the squad into reserve — their sprites go with them.
    for (const m of this.engine.reserve) this.removePieceSprite(m.id, 0, 'fade');
    Selection.clear();
    this.updateHighlight();
    for (const m of this.engine.reserve) this.roster.setDeployed(m.id, false);
    this.deployRemaining = deploySeconds(this.engine.mission);
    this.hud.setTimer(this.deployRemaining);
    this.hud.setDeployMode(true, () => {
      if (this.paused || !this.deployMode) return;
      this.engine.autoDeploy();
      this.syncDeployState();
    });
    this.refreshDeployMarkers();
    const squares = this.engine.mission.marineDeployment ?? [];
    if (squares.length) {
      const cx = squares.reduce((s, d) => s + d.x, 0) / squares.length;
      const cy = squares.reduce((s, d) => s + d.y, 0) / squares.length;
      this.cameras.main.centerOn(cx * TILE_SIZE + TILE_SIZE / 2 + HUD_WIDTH / 2, cy * TILE_SIZE + TILE_SIZE / 2);
    }
  }

  /** Reconcile roster classes + X markers to engine truth (after autoDeploy). */
  private syncDeployState(): void {
    for (const m of this.engine.marines) this.roster.setDeployed(m.id, true);
    for (const m of this.engine.reserve) this.roster.setDeployed(m.id, false);
    this.refreshDeployMarkers();
  }

  /** X over every FREE deploy square; none once deployment is over. */
  private refreshDeployMarkers(): void {
    for (const t of this.deployMarkers) t.destroy();
    this.deployMarkers = [];
    if (!this.deployMode) return;
    for (const d of this.engine.mission.marineDeployment ?? []) {
      if (this.engine.state.board.isOccupied({ c: d.x, r: d.y })) continue;
      const [cx, cy] = centerXY(d.x, d.y);
      this.deployMarkers.push(
        this.add.text(cx, cy, '✕', { fontFamily: UI_FONT, fontSize: '26px', color: '#7ec8ff' })
          .setOrigin(0.5).setDepth(0.6).setName('deploy-x'));
    }
  }

  /** Deploy-phase click: place the armed (or next) reserve marine on a free
   *  deploy square, or pick a deployed marine back up to re-place him. */
  private handleDeployClick(p: Phaser.Input.Pointer): void {
    const x = Math.floor(p.worldX / TILE_SIZE), y = Math.floor(p.worldY / TILE_SIZE);
    const occupant = this.engine.marines.find(m => m.pos.c === x && m.pos.r === y);
    if (occupant) {
      if (this.engine.undeployMarine(occupant.id)) {
        this.removePieceSprite(occupant.id, 0, 'fade');
        this.armedId = occupant.id; // picked up — the next square click re-places him
        Selection.clear();
        this.updateHighlight();
        this.roster.setDeployed(occupant.id, false);
        PieceEvents.emit('selected', { pieceId: occupant.id });
        this.refreshDeployMarkers();
      }
      return;
    }
    const sq = this.engine.deploySquareAt(x, y);
    if (!sq) return;
    // The armed marine when his squad owns this square, else the squad's next reserve.
    const armed = this.engine.reserve.find(m => m.id === this.armedId);
    const pick = (armed && this.engine.deploySquadOf(armed.id) === sq.squad)
      ? armed
      : this.engine.reserve.find(m => this.engine.deploySquadOf(m.id) === sq.squad);
    if (!pick || !this.engine.deployMarine(pick.id, x, y)) return;
    // The sprite arrives via the pieceAdded handler; select him so A/D rotates.
    this.armedId = null;
    Selection.select(pick.id);
    this.updateHighlight();
    this.emitSelected(pick);
    this.roster.setDeployed(pick.id, true);
    this.refreshDeployMarkers();
  }

  /** Done / Enter / clock expiry: auto-deploy the rest and start the mission.
   *  Every deploy-only control (X markers, AUTO button, reserve tags) goes. */
  private finishDeploy(): void {
    if (!this.deployMode) return;
    this.deployMode = false;
    this.engine.finishDeployment(); // remaining reserves land via pieceAdded
    this.armedId = null;
    Selection.clear();
    this.updateHighlight();
    PieceEvents.emit('selected', { pieceId: null });
    this.refreshDeployMarkers(); // deployMode off → all markers destroyed
    this.hud.setDeployMode(false);
    this.roster.clearDeploy();
    this.roster.refreshAll();
    this.timerRemaining = this.engine.marinePhaseSeconds;
    this.hud.setTimer(this.timerRemaining);
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

  update(_time: number, delta: number) {
    const cam = this.cameras.main;

    if (this.reducedMotion) {
      // Fixed-speed panning, exactly the pre-inertia behavior.
      const speed = 5;
      if (this.cursors.left.isDown) cam.scrollX -= speed;
      if (this.cursors.right.isDown) cam.scrollX += speed;
      if (this.cursors.up.isDown) cam.scrollY -= speed;
      if (this.cursors.down.isDown) cam.scrollY += speed;
      this.camVel.x = 0;
      this.camVel.y = 0;
    } else {
      // Inertia model: arrows accelerate toward a cap, release glides to rest.
      // dt is clamped so a stalled frame never slingshots the camera.
      const dirX = ((this.cursors.right.isDown ? 1 : 0) - (this.cursors.left.isDown ? 1 : 0)) as -1 | 0 | 1;
      const dirY = ((this.cursors.down.isDown ? 1 : 0) - (this.cursors.up.isDown ? 1 : 0)) as -1 | 0 | 1;
      // Someone else moved the scroll since our last write (the bounds clamp
      // at a map edge, a pan effect, a drag): park that axis instead of
      // integrating into a wall — otherwise reversing off an edge lags while
      // stored velocity burns off (Advisor 2026-08-19). Tolerance 1px: the
      // camera rounds scroll to whole pixels every frame, and that sub-pixel
      // correction must never read as a foreign writer.
      if (this.expectedScroll) {
        if (Math.abs(cam.scrollX - this.expectedScroll.x) > 1) this.camVel.x = 0;
        if (Math.abs(cam.scrollY - this.expectedScroll.y) > 1) this.camVel.y = 0;
      }
      // Manual input takes the wheel from any in-flight programmatic pan.
      if ((dirX !== 0 || dirY !== 0) && cam.panEffect.isRunning) cam.panEffect.reset();
      const dt = Math.min(delta, 50);
      this.camVel.x = camPanStep(this.camVel.x, dirX, dt);
      this.camVel.y = camPanStep(this.camVel.y, dirY, dt);
      cam.scrollX += this.camVel.x * dt;
      cam.scrollY += this.camVel.y * dt;
      this.expectedScroll = { x: cam.scrollX, y: cam.scrollY };
    }

    // Markers and the selection highlight ride their sprites every frame —
    // the single sync point for every tween (steps, recoil, squash), which
    // also lets jam markers follow replay motion (they never did before).
    for (const id of Object.keys(this.owMarkers)) {
      const s = this.pieceSprites[id];
      if (s?.active) this.owMarkers[id].setPosition(s.x, s.y - 12);
    }
    for (const id of Object.keys(this.jamMarkers)) {
      const s = this.pieceSprites[id];
      if (s?.active) this.jamMarkers[id].setPosition(s.x + 12, s.y - 12);
    }
    const sel = Selection.get();
    if (sel) {
      const s = this.pieceSprites[sel];
      if (s?.active && this.highlight.visible) this.highlight.follow(s);
    }

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

  /** Cached prefers-reduced-motion — refreshed by a change listener so the
   *  OS toggle applies mid-game WITHOUT allocating a MediaQueryList per
   *  frame (update() reads this every tick). */
  private reduceMotionOn = false;
  private get reducedMotion(): boolean {
    return this.reduceMotionOn;
  }

  /** Wire the reduced-motion media query: seed the cache and, on a mid-game
   *  switch to reduce, kill the only motion that never self-terminates —
   *  the looping flame shimmer — and reset the sprites it was riding. */
  private watchReducedMotion(): void {
    const mq = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    if (!mq) return;
    this.reduceMotionOn = mq.matches;
    mq.addEventListener?.('change', (e) => {
      this.reduceMotionOn = e.matches;
      if (!e.matches) return;
      for (const spr of Object.values(this.flameSprites)) {
        this.tweens.killTweensOf(spr);
        spr.setAlpha(1).setScale(1).setAngle(0);
      }
    });
  }

  /** Record a motion decision on the capped probe log (e2e determinism). */
  private logMotion(id: string, kind: string, durationMs: number, tweened: boolean): void {
    this.motionLog.push({ id, kind, durationMs, tweened });
    if (this.motionLog.length > 200) this.motionLog.shift();
  }

  /**
   * Position/rotate a sprite from event-payload data. Every step tweens with
   * its kind's profile (heavy marines, darting stealers, sliding blips) — the
   * kind comes from the sprite's TEXTURE, the only payload-truthful source
   * during replay (a converted blip's id is gone from final engine state).
   * snap=true is the reconcile path (finishReplay/reduced-motion) and must
   * land on engine truth exactly, clearing any scale/alpha residue.
   */
  private moveSprite(pieceId: string, x: number, y: number, facing: number, snap = false) {
    const sprite = this.pieceSprites[pieceId];
    if (!sprite || !sprite.active) return;
    const [tx, ty] = centerXY(x, y);
    // Phaser's rotation setter WRAPS to (-pi, pi] — compare against the value
    // the sprite will actually store, or south/west facings never match and
    // every no-op refresh kills live tweens (reviewer finding, 3.90 source).
    const targetRot = Phaser.Math.Angle.Wrap(facing * Math.PI / 2);
    // Nothing changed (e.g. the post-shot acted-refresh), or a tween is
    // already in flight to this exact target: bail before touching tweens, or
    // every shot kills its own recoil and every mid-step action restarts the
    // step from scratch.
    const pending = (sprite as any).moveTarget as { tx: number; ty: number; rot: number } | undefined;
    if (!snap && ((sprite.x === tx && sprite.y === ty && sprite.rotation === targetRot)
      || (pending && pending.tx === tx && pending.ty === ty && pending.rot === targetRot))) return;
    (sprite as any).moveTarget = { tx, ty, rot: targetRot };
    this.tweens.killTweensOf(sprite);
    sprite.setScale(1); // clear interrupted squash/pulse residue
    const kind = kindFromTexture(sprite.texture.key);
    if (snap || this.reducedMotion) {
      sprite.setRotation(targetRot).setPosition(tx, ty).setAlpha(1);
      this.logMotion(pieceId, kind, 0, false);
      if (Selection.get() === pieceId) this.updateHighlight();
      return;
    }
    // Rotation: marines grind through the turn; stealers/blips just face it.
    if (kind === 'marine' && sprite.rotation !== targetRot) {
      const delta = shortestRotationDelta(sprite.rotation, targetRot);
      this.tweens.add({
        targets: sprite, rotation: sprite.rotation + delta,
        duration: MOTION.turnMs, ease: 'Sine.easeInOut',
        onComplete: () => sprite.setRotation(targetRot),
      });
    } else {
      sprite.setRotation(targetRot);
    }
    if (sprite.x === tx && sprite.y === ty) {
      // Turn in place: no position tween, no arrival thud.
      this.logMotion(pieceId, kind, kind === 'marine' ? MOTION.turnMs : 0, kind === 'marine');
    } else {
      const { durationMs, ease } = MOTION.step[kind];
      this.tweens.add({
        targets: sprite, x: tx, y: ty, duration: durationMs, ease,
        onComplete: () => {
          sprite.setPosition(tx, ty);
          if (kind === 'marine') {
            // The thud: a heavy frame settles into the deck.
            this.tweens.add({
              targets: sprite, scaleX: MOTION.squash.scaleX, scaleY: MOTION.squash.scaleY,
              duration: MOTION.squash.durationMs, yoyo: true,
              onComplete: () => sprite.setScale(1),
            });
          }
        },
      });
      if (kind === 'stealer') {
        this.tweens.add({
          targets: sprite, scale: MOTION.stealerPulse.scale,
          duration: durationMs / 2, yoyo: true, onComplete: () => sprite.setScale(1),
        });
      }
      this.logMotion(pieceId, kind, durationMs, true);
    }
    if (Selection.get() === pieceId) this.updateHighlight();
  }

  private refreshPieceSprite(piece: Piece, snap = false) {
    this.moveSprite(piece.id, piece.pos.c, piece.pos.r, piece.facing, snap);
  }

  /** Bulkhead halves part along the door's long axis (local X at every facing). */
  private slideDoor(sprite: Phaser.GameObjects.Image, open: boolean): void {
    this.tweens.killTweensOf(sprite);
    const done = () => sprite.setTexture(open ? 'door_open' : 'door_closed').setScale(1).setAlpha(1);
    if (this.reducedMotion) {
      done();
      this.logMotion('door', open ? 'door-open' : 'door-close', 0, false);
      return;
    }
    const { slideMs, partedScale } = MOTION.door;
    // Interrupted slides continue from wherever the halves are — duration
    // scales with the remaining travel so a short finish never crawls.
    const travel = (fromScale: number, toScale: number) =>
      Math.max(40, Math.round(slideMs * Math.abs(fromScale - toScale) / (1 - partedScale)));
    if (open) {
      sprite.setTexture('door_closed');
      this.tweens.add({ targets: sprite, scaleX: partedScale, alpha: 0.7, duration: travel(sprite.scaleX, partedScale), ease: 'Sine.easeIn', onComplete: done });
    } else {
      // From fully open, the halves emerge from the parted sliver; from an
      // interrupted mid-open slide, continue from wherever they are.
      if (sprite.texture.key !== 'door_closed' || sprite.scaleX > 0.99) {
        sprite.setScale(partedScale, 1).setAlpha(0.7);
      }
      sprite.setTexture('door_closed');
      this.tweens.add({ targets: sprite, scaleX: 1, alpha: 1, duration: travel(sprite.scaleX, 1), ease: 'Sine.easeOut', onComplete: done });
    }
    this.logMotion('door', open ? 'door-open' : 'door-close', slideMs, true);
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

  /** Fade out and forget a piece's sprite plus its overwatch/jam markers.
   *  style 'death' adds the red-wash crumple; 'fade' is a clean exit (escape). */
  private removePieceSprite(pieceId: string, fadeMs: number, style: 'death' | 'fade' = 'death'): void {
    const sprite = this.pieceSprites[pieceId];
    if (sprite) {
      this.tweens.killTweensOf(sprite);
      // The art lingers; the PIECE is gone — never hit-testable, never a
      // selection target, while the flourish plays out.
      sprite.disableInteractive().setName('');
      if (this.reducedMotion) {
        sprite.destroy();
      } else if (style === 'death') {
        sprite.setTint(MOTION.death.tint);
        this.logMotion(pieceId, 'death', fadeMs, true);
        this.tweens.add({
          targets: sprite, alpha: 0, scale: MOTION.death.scale, duration: fadeMs,
          ease: 'Quad.easeIn', onComplete: () => sprite.destroy(),
        });
      } else {
        this.tweens.add({ targets: sprite, alpha: 0, duration: fadeMs, onComplete: () => sprite.destroy() });
      }
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
    // During deployment, Done / Enter closes the phase instead of the turn.
    if (this.deployMode) {
      this.finishDeploy();
      return;
    }
    // Marine anchors MUST be snapshotted BEFORE the phase resolves: die()
    // splices the piece out of board.pieces, so a marine killed this phase
    // would vanish from the anchor set — and he anchors the very fight that
    // killed him (reviewer finding, 2026-08-19).
    const anchors = this.engine.marines.map(m => ({ x: m.pos.c, y: m.pos.r }));
    const stream = PieceEvents.capture(() => this.engine.endMarinePhase());
    Selection.clear();
    this.disarmAndRefresh();
    this.emitSelected(undefined);
    this.focusLog = []; // both paths: a stale log from a prior replay must not linger
    // Accessibility: with prefers-reduced-motion, skip the timeline entirely
    if (this.reducedMotion) {
      for (const ev of stream) PieceEvents.replay(ev);
      this.finishReplay();
      return;
    }
    this.animating = true;
    // Freeze the radar: mid-replay the engine holds FINAL state, and dots or
    // echoes drawn from it would spoil deaths and conversions the animation
    // has not shown yet (same payload-not-engine invariant the sprites obey).
    this.minimap.frozen = true;
    // Action camera: plan focus points from the stream itself. Seed positions
    // are the SPRITES' pre-phase squares (view truth); anchors were taken
    // before the phase resolved (marines never move during it).
    const seed: Record<string, { x: number; y: number }> = {};
    for (const [id, spr] of Object.entries(this.pieceSprites)) {
      seed[id] = { x: Math.floor(spr.x / TILE_SIZE), y: Math.floor(spr.y / TILE_SIZE) };
    }
    const plan = planReplayFocus(stream as any, seed, anchors);
    // Pure scheduling arithmetic: facing-only spins (charge orientation, path
    // turns) pace fast — they are drama, not travel.
    const offsets = replayOffsets(stream.map(e => e.type as string), plan, GameScene.REPLAY_DELAY);
    stream.forEach((ev, i) => {
      this.time.delayedCall(offsets[i], () => PieceEvents.replay(ev));
      const ann = plan[i];
      if (ann?.attack) {
        const attack = ann.attack;
        this.time.delayedCall(offsets[i], () => this.attackFx(attack));
      } else if (ann?.focus) {
        const focus = ann.focus;
        this.time.delayedCall(offsets[i], () => this.replayPan(focus.x, focus.y, false));
      }
    });
    this.time.delayedCall(offsets[stream.length] + 150, () => this.finishReplay());
  }

  /** Camera pan to a board square, centred in the visible play area. */
  private replayPan(bx: number, by: number, attack: boolean): void {
    this.focusLog.push({ x: bx, y: by, attack });
    if (this.focusLog.length > 100) this.focusLog.shift();
    const [px, py] = centerXY(bx, by);
    // force=true: a fresh action always outranks the pan already in flight.
    this.cameras.main.pan(px + HUD_WIDTH / 2, py, FOCUS.panMs, 'Sine.easeInOut', true);
  }

  /** Close combat lands: hard focus, a kick of shake, the spotlight vignette,
   *  and the attacker's lunge. The zoom the design substitutes for. */
  private attackFx(a: { x: number; y: number; ax: number; ay: number; attackerId: string; defenderId: string }): void {
    this.replayPan(a.x, a.y, true);
    this.lastAttackFx = { x: a.x, y: a.y };
    this.cameras.main.shake(FOCUS.shake.durationMs, FOCUS.shake.intensity);
    const [dx, dy] = centerXY(a.x, a.y);
    this.showVignette(dx, dy);
    const spr = this.pieceSprites[a.attackerId];
    if (spr?.active) {
      const [ax, ay] = centerXY(a.ax, a.ay);
      this.tweens.killTweensOf(spr);
      spr.setScale(1).setPosition(ax, ay);
      (spr as any).moveTarget = { tx: ax, ty: ay, rot: spr.rotation };
      const vx = Math.sign(a.x - a.ax), vy = Math.sign(a.y - a.ay);
      this.tweens.add({
        targets: spr, x: ax + vx * FOCUS.lunge.px, y: ay + vy * FOCUS.lunge.px,
        duration: FOCUS.lunge.durationMs, yoyo: true, ease: 'Quad.easeIn',
        onComplete: () => spr.setPosition(ax, ay),
      });
      this.logMotion(a.attackerId, 'lunge', FOCUS.lunge.durationMs, true);
    }
  }

  /** Darkening spotlight centred on the fight — claustrophobia without the
   *  camera zoom a single-scene HUD cannot survive. */
  private showVignette(px: number, py: number): void {
    if (!this.textures.exists('fx_vignette')) {
      const size = 512;
      const canvas = this.textures.createCanvas('fx_vignette', size, size)!;
      const ctx = canvas.getContext();
      const g = ctx.createRadialGradient(size / 2, size / 2, size * 0.12, size / 2, size / 2, size / 2);
      g.addColorStop(0, 'rgba(0,0,0,0)');
      g.addColorStop(0.55, 'rgba(0,0,0,0.35)');
      g.addColorStop(1, 'rgba(0,0,0,1)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, size, size);
      canvas.refresh();
    }
    this.clearVignette();
    const cfg = FOCUS.vignette;
    const img = this.add.image(px, py, 'fx_vignette').setDepth(3)
      .setScale((this.scale.width * cfg.scale) / 512).setAlpha(0).setName('fx_vignette');
    this.vignette = img;
    this.tweens.add({
      targets: img, alpha: cfg.alpha, duration: cfg.inMs,
      onComplete: () => this.tweens.add({
        targets: img, alpha: 0, delay: cfg.holdMs, duration: cfg.outMs,
        onComplete: () => {
          img.destroy();
          if (this.vignette === img) this.vignette = undefined;
        },
      }),
    });
  }

  /** Kill + drop the spotlight (fresh attack, or replay over). */
  private clearVignette(): void {
    if (!this.vignette) return;
    this.tweens.killTweensOf(this.vignette);
    this.vignette.destroy();
    this.vignette = undefined;
  }

  /** Replay done: engine truth wins. Reconcile every sprite, restart the clock. */
  private finishReplay(): void {
    this.animating = false;
    this.minimap.frozen = false;
    this.clearVignette();
    const live = new Set(this.engine.state.pieces.map(p => p.id));
    for (const p of this.engine.state.pieces) {
      if (!this.pieceSprites[p.id]) this.createPieceSprite(p as Piece);
      else this.refreshPieceSprite(p as Piece, true); // reconcile SNAPS to engine truth
    }
    for (const id of Object.keys(this.pieceSprites)) {
      if (!live.has(id)) {
        this.tweens.killTweensOf(this.pieceSprites[id]);
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
