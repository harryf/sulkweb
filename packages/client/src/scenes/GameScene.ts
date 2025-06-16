import Phaser from 'phaser'
import { GameEngine, loadMission, Square, Piece, StormBolterMarine, Dir, Selection, Board } from "@sulk/engine/index.js";
import { Minimap } from '../ui/Minimap.js';
import { HighlightSprite } from '../ui/HighlightSprite.js';

const TILE_SIZE = 40

export default class GameScene extends Phaser.Scene {
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

  constructor() {
    super('GameScene')
    const mission = loadMission('space_hulk_1');
    const board = new Board(mission.width, mission.height, mission.squares);
    // Create pieces
    const marine = new StormBolterMarine(board, { c: 10, r: 0 }, Dir.N);
    const pieces = [marine];
    this.engine = new GameEngine(mission, pieces);
    // Manually assign the created board to the engine's state, as the engine creates its own instance.
    this.engine.state.board = board;
  }

  preload() {
    this.load.image('square_corridor', 'assets/themes/default/square_corridor.png');
    this.load.image('square_room', 'assets/themes/default/square_room.png');
    this.load.image('mini_square', 'assets/themes/default/mini_square.png');
    this.load.image('select', 'assets/themes/default/select.png');
    this.load.image(StormBolterMarine.SPRITE_KEY, 'assets/themes/default/terminator_storm_bolter.png');
  }

  create() {
    const { board, pieces } = this.engine.state
    const { width, height } = board

    board.allSquares().forEach((sq: Square) => {
      const texture = sq.kind === 'corridor' ? 'square_corridor' : 'square_room'
      this.add.image(sq.x * TILE_SIZE, sq.y * TILE_SIZE, texture).setOrigin(0)
    });

    pieces.forEach(p => this.createPieceSprite(p));

    this.cursors = this.input.keyboard!.createCursorKeys()
    this.wasd = this.input.keyboard!.addKeys('W,A,S,D') as any
    this.cameras.main.setBounds(0, 0, width * TILE_SIZE, height * TILE_SIZE)
    
    const centerX = Math.floor(width / 2) * TILE_SIZE
    const centerY = Math.floor(height / 2) * TILE_SIZE
    this.cameras.main.centerOn(centerX, centerY);

    // Enable drag-to-pan
    this.input.on('pointermove', (p: Phaser.Input.Pointer) => {
      if (!p.isDown) return
      this.cameras.main.scrollX -= (p.x - p.prevPosition.x) / this.cameras.main.zoom;
      this.cameras.main.scrollY -= (p.y - p.prevPosition.y) / this.cameras.main.zoom;
    });

    // Create Minimap
    const minimap = new Minimap(this, this.engine, { tile: this.tileSize, width: 200 });
    this.add.existing(minimap);
    minimap.setScrollFactor(0); // fixed to screen
    minimap.setPosition(this.cameras.main.width - 210, this.cameras.main.height - 210);
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
        const id = (hit as any).pieceId;
        Selection.toggle(id);
        this.updateHighlight();
      }
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

      if (acted) {
        this.refreshPieceSprite(piece);
        this.updateHighlight();
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
    cam.scrollX = Phaser.Math.Clamp(cam.scrollX, 0, worldW - cam.width);
    cam.scrollY = Phaser.Math.Clamp(cam.scrollY, 0, worldH - cam.height);
  }

  private createPieceSprite(piece: Piece) {
    const sprite = this.add.image(0, 0, StormBolterMarine.SPRITE_KEY)
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
