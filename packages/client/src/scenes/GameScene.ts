import Phaser from 'phaser'
import { GameEngine, MARINE_PHASE_SECONDS, loadMission, Square, Piece, StormBolterMarine, Genestealer, Selection, PieceEvents, visibleSquares, canShoot, closeCombat, DIR_VEC } from "@sulk/engine/index.js";
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
  private losOverlay!: Phaser.GameObjects.Graphics;
  private losVisible = false;

  constructor() {
    super('GameScene')
    // The engine builds the board, deploys the squad, and seeds the first blips
    this.engine = new GameEngine(loadMission('space_hulk_1'));
    (window as any).sulk = { engine: this.engine, Selection, scene: this }; // dev/debug handle
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

    // Render-side combat reactions: engine events drive all sprite state
    PieceEvents.on('pieceMoved', ({ pieceId }) => {
      const moved = this.engine.findPiece(pieceId);
      if (moved) this.refreshPieceSprite(moved);
      this.owMarkers[pieceId]?.setPosition(
        this.pieceSprites[pieceId]?.x ?? 0, (this.pieceSprites[pieceId]?.y ?? 0) - 12);
    });
    PieceEvents.on('pieceDied', ({ pieceId }) => {
      this.pieceSprites[pieceId]?.destroy();
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
    PieceEvents.on('pieceAdded', ({ pieceId }) => {
      if (this.pieceSprites[pieceId]) return;
      const added = this.engine.findPiece(pieceId);
      if (added) this.createPieceSprite(added);
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

    PieceEvents.emit('cpChanged', { cp: this.engine.cp }); // HUD subscribed after the initial roll

    // Marine-phase turn timer
    this.timerRemaining = MARINE_PHASE_SECONDS;
    this.hud.setTimer(this.timerRemaining);
    this.timerEvent = this.time.addEvent({
      delay: 1000, loop: true, callback: () => {
        if (this.engine.state.result !== 'ongoing' || this.engine.phase !== 'MarineAction') return;
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

  private createPieceSprite(piece: Piece) {
    const texture = piece.kind === 'stealer' ? Genestealer.SPRITE_KEY
      : piece.kind === 'blip' ? 'blip'
      : StormBolterMarine.SPRITE_KEY;
    const sprite = this.add.image(0, 0, texture)
      .setOrigin(0.5, 0.5)
      .setDepth(1)
      .setName('piece')
      .setInteractive();
    (sprite as any).pieceId = piece.id;
    this.pieceSprites[piece.id] = sprite;
    this.refreshPieceSprite(piece);
  }

  private refreshPieceSprite(piece: Piece) {
    const sprite = this.pieceSprites[piece.id];
    if (!sprite) return;

    const targetWorldX = (piece.pos.c * this.tileSize) + (this.tileSize / 2);
    const targetWorldY = (piece.pos.r * this.tileSize) + (this.tileSize / 2);

    sprite.setPosition(targetWorldX, targetWorldY);
    sprite.setRotation(piece.facing * Math.PI / 2);
  }

  /** Done button / Enter / timer expiry: hand the turn to the stealers. */
  private endTurn(): void {
    if (this.engine.state.result !== 'ongoing') return;
    this.engine.endMarinePhase();
    this.timerRemaining = MARINE_PHASE_SECONDS;
    this.hud.setTimer(this.timerRemaining);
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
