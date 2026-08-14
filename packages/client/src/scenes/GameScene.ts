import Phaser from 'phaser'
import { GameEngine, MARINE_PHASE_SECONDS, loadMission, Square, Piece, StormBolterMarine, Genestealer, Selection, PieceEvents, visibleSquares, canShoot, closeCombat, DIR_VEC, SeededRng, autoplay, runMarineTurn } from "@sulk/engine/index.js";
import { Minimap } from '../ui/Minimap.js';
import { HighlightSprite } from '../ui/HighlightSprite.js';
import { HudPanel } from '../ui/HudPanel.js';
import { HUD_WIDTH } from '../config.js';

const TILE_SIZE = 40

export default class GameScene extends Phaser.Scene {
  private hud!: import('../ui/HudPanel.js').HudPanel;

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
  private timerRemaining = MARINE_PHASE_SECONDS;
  private timerEvent?: Phaser.Time.TimerEvent;
  private paused = false;
  /** True while the captured stealer-phase event stream is being replayed. */
  private animating = false;
  private pauseOverlay?: Phaser.GameObjects.Container;
  private losOverlay!: Phaser.GameObjects.Graphics;
  private losVisible = false;

  constructor() {
    super('GameScene')
    // The engine builds the board, deploys the squad, and seeds the first blips.
    // `?seed=N` pins the WHOLE game (blip values + CP roll included) — used by
    // the deterministic e2e suite and handy for bug reports.
    const seedParam = new URLSearchParams(window.location.search).get('seed');
    const dice = seedParam ? new SeededRng(Number(seedParam)) : undefined;
    this.engine = new GameEngine(loadMission('space_hulk_1'), [], dice);
    (window as any).sulk = { engine: this.engine, Selection, scene: this, SeededRng, autoplay, runMarineTurn }; // dev/debug + autoplay handle
  }

  preload() {
    this.load.image('square_corridor', 'assets/themes/default/square_corridor.png');
    this.load.image('square_room', 'assets/themes/default/square_room.png');
    this.load.image('mini_square', 'assets/themes/default/mini_square.png');
    this.load.image('select', 'assets/themes/default/select.png');
    this.load.image('door_closed', 'assets/themes/default/door_closed.png');
    this.load.image('door_open', 'assets/themes/default/door_open.png');
    this.load.image(StormBolterMarine.SPRITE_KEY, 'assets/themes/default/terminator_storm_bolter.png');
    this.load.image(Genestealer.SPRITE_KEY, 'assets/themes/default/stealer.png');
    this.load.image('blip', 'assets/themes/default/blip.png');
    this.load.image('flash_storm_bolter', 'assets/themes/default/flash_storm_bolter.png');
    this.load.image('marker_overwatch', 'assets/themes/default/marker_overwatch.png');
  }

  create() {
    const { board, pieces } = this.engine.state
    const { width, height } = board

    // Canvas: board viewport (capped so it fits a normal window) + HUD strip on the right
    const viewW = Math.min(width * TILE_SIZE, 880)
    const viewH = Math.min(height * TILE_SIZE, 720)
    this.scale.resize(viewW + HUD_WIDTH, viewH)

    board.allSquares().forEach((sq: Square) => {
      const texture = sq.kind === 'corridor' ? 'square_corridor' : 'square_room'
      this.add.image(sq.x * TILE_SIZE, sq.y * TILE_SIZE, texture).setOrigin(0)
    });

    // Door sprites, keyed by square, updated via engine doorToggled events
    board.allSquares().forEach((sq: Square) => {
      const door = board.doorAt({ c: sq.x, r: sq.y });
      if (!door) return;
      const sprite = this.add.image(sq.x * TILE_SIZE + TILE_SIZE / 2, sq.y * TILE_SIZE + TILE_SIZE / 2, 'door_closed')
        .setOrigin(0.5)
        .setDepth(0.5)
        .setRotation(door.facing % 2 === 0 ? 0 : Math.PI / 2);
      this.doorSprites[`${sq.x},${sq.y}`] = sprite;
    });
    PieceEvents.on('doorToggled', ({ x, y, open }) => {
      this.doorSprites[`${x},${y}`]?.setTexture(open ? 'door_open' : 'door_closed');
    });

    // Mission markers: stealer entry points (purple), exit objective (green),
    // marine deployment (blue outline). Drawn under pieces, over squares.
    const markers = this.add.graphics().setDepth(0.4);
    const mission = this.engine.mission;
    const T = this.tileSize;
    for (const e of mission.entryPoints ?? []) {
      markers.fillStyle(0x9932cc, 0.30).fillRect(e.x * T, e.y * T, T, T);
      markers.lineStyle(2, 0x9932cc, 0.9).strokeRect(e.x * T + 1, e.y * T + 1, T - 2, T - 2);
    }
    for (const e of mission.exitPoints ?? []) {
      markers.fillStyle(0x00cc44, 0.35).fillRect(e.x * T, e.y * T, T, T);
      markers.lineStyle(2, 0x00ff55, 1).strokeRect(e.x * T + 1, e.y * T + 1, T - 2, T - 2);
      this.add.text(e.x * T + T / 2, e.y * T + T / 2, 'EXIT', {
        fontFamily: 'Kanit', fontSize: '11px', color: '#00ff55', fontStyle: 'bold'
      }).setOrigin(0.5).setDepth(0.45);
    }
    for (const d of mission.marineDeployment ?? []) {
      markers.lineStyle(2, 0x3b82f6, 0.7).strokeRect(d.x * T + 3, d.y * T + 3, T - 6, T - 6);
    }

    // Render-side combat reactions: engine events drive all sprite state.
    // Handlers read the event PAYLOAD, never the engine — during stealer-phase
    // replay the engine already holds the final state, so payload coords are
    // the only truthful intermediate positions.
    PieceEvents.on('pieceMoved', ({ pieceId, x, y, facing }) => {
      this.moveSprite(pieceId, x, y, facing);
    });
    PieceEvents.on('pieceDied', ({ pieceId }) => {
      const sprite = this.pieceSprites[pieceId];
      if (sprite) {
        this.tweens.killTweensOf(sprite);
        this.tweens.add({ targets: sprite, alpha: 0, duration: this.animating ? 160 : 80, onComplete: () => sprite.destroy() });
      }
      delete this.pieceSprites[pieceId];
      this.owMarkers[pieceId]?.destroy();
      delete this.owMarkers[pieceId];
      if (Selection.get() === pieceId) {
        Selection.clear();
        this.updateHighlight();
        PieceEvents.emit('selected', { pieceId: null });
      }
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
      const msg = result === 'win' ? 'MISSION COMPLETE' : 'SQUAD WIPED OUT';
      const color = result === 'win' ? '#7CFC00' : '#ff4040';
      this.add.rectangle(0, 0, cam.width, cam.height, 0x000000, 0.6)
        .setOrigin(0).setScrollFactor(0).setDepth(99);
      this.add.text(cam.width / 2, cam.height / 2, msg, {
        fontFamily: 'Kanit', fontSize: '48px', color, fontStyle: 'bold'
      }).setOrigin(0.5).setScrollFactor(0).setDepth(100);
    });


    pieces.forEach(p => this.createPieceSprite(p));

    this.cursors = this.input.keyboard!.createCursorKeys()
    this.wasd = this.input.keyboard!.addKeys('W,A,S,D,O,F,C,V,U,P') as any
    this.input.keyboard!.on('keydown-ENTER', () => this.endTurn());
    this.input.keyboard!.on('keydown-ESC', () => this.togglePause());
    // Camera bounds to exclude HUD area
    this.cameras.main.setBounds(0, 0, width * TILE_SIZE, height * TILE_SIZE)

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

    const objectiveLabel: Record<string, string> = {
      'exterminate': 'Objective: kill every genestealer',
      'reach-exit': 'Objective: reach the green EXIT',
      'exterminate-or-exit': 'Objective: kill all stealers\nOR reach the green EXIT',
    };
    this.hud.setObjective(objectiveLabel[this.engine.mission.objective ?? 'exterminate-or-exit'] ?? '');

    PieceEvents.emit('cpChanged', { cp: this.engine.cp }); // HUD subscribed after the initial roll

    // Marine-phase turn timer
    this.timerRemaining = MARINE_PHASE_SECONDS;
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
        ap: piece ? { apRemaining: piece.apRemaining, apInitial: piece.apInitial } : undefined
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

  update() {
    const cam = this.cameras.main;
    const speed = 5;

    if (this.cursors.left.isDown) cam.scrollX -= speed;
    if (this.cursors.right.isDown) cam.scrollX += speed;
    if (this.cursors.up.isDown) cam.scrollY -= speed;
    if (this.cursors.down.isDown) cam.scrollY += speed;

    const worldW = this.engine.state.board.width * this.tileSize;
    const worldH = this.engine.state.board.height * this.tileSize;
    // Clamp so left edge never goes past HUD
    cam.scrollX = Phaser.Math.Clamp(cam.scrollX, 0, worldW - cam.width + HUD_WIDTH);
    cam.scrollY = Phaser.Math.Clamp(cam.scrollY, 0, worldH - cam.height);
  }

  private createSprite(pieceId: string, kind: string, x: number, y: number, facing: number) {
    const texture = kind === 'stealer' ? Genestealer.SPRITE_KEY
      : kind === 'blip' ? 'blip'
      : StormBolterMarine.SPRITE_KEY;
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
    if (this.engine.state.result !== 'ongoing') return;
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
  };

  /**
   * Done button / Enter / timer expiry: hand the turn to the stealers.
   * The engine resolves the whole phase synchronously; we capture its event
   * stream and re-emit it on a timeline so the player SEES the stealers act.
   */
  private endTurn(): void {
    if (this.engine.state.result !== 'ongoing' || this.paused || this.animating) return;
    const stream = PieceEvents.capture(() => this.engine.endMarinePhase());
    this.animating = true;
    Selection.clear();
    this.updateHighlight();
    PieceEvents.emit('selected', { pieceId: null });
    let at = 80;
    for (const ev of stream) {
      this.time.delayedCall(at, () => PieceEvents.emit(ev.type as any, ev.payload as any));
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
    this.timerRemaining = MARINE_PHASE_SECONDS;
    this.hud.setTimer(this.timerRemaining);
    this.updateHighlight();
  }

  /** F key: shoot the nearest enemy in fire arc + LOS. */
  private shootNearest(piece: Piece): boolean {
    if (!(piece instanceof StormBolterMarine)) return false;
    const board = this.engine.state.board;
    const enemies = board.pieces
      .filter((p): p is Piece => (p as Piece).kind !== 'marine')
      .filter(p => {
        const sq = board.get(p.pos.c, p.pos.r);
        return sq !== undefined && canShoot(board, piece, sq, StormBolterMarine.RANGE);
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
