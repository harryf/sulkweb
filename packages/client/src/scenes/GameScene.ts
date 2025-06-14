import Phaser from 'phaser'
import { GameEngine, loadMission, Square, Piece, StormBolterMarine, Dir } from "@sulk/engine/index.js";
import { Minimap } from '../ui/Minimap.js';
import { SelectionManager } from '../utils/SelectionManager.js'
import { HighlightSprite } from '../ui/HighlightSprite.js'

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
  private selection!: SelectionManager
  private highlight!: HighlightSprite;
  private marine!: StormBolterMarine;
  private marineSprite!: Phaser.GameObjects.Image;

  constructor() {
    super('GameScene')
    const mission = loadMission('space_hulk_1')
    this.engine = new GameEngine(mission)
  }

  preload() {
    this.load.image('square_corridor', 'assets/themes/default/square_corridor.png');
    this.load.image('square_room', 'assets/themes/default/square_room.png');
    this.load.image('mini_square', 'assets/themes/default/mini_square.png');
    this.load.image('select', 'assets/themes/default/select.png');
    this.load.image(StormBolterMarine.SPRITE_KEY, 'assets/themes/default/terminator_storm_bolter.png');
  }

  create() {
    const { board } = this.engine.state
    const { width, height } = board

    board.allSquares().forEach((sq: Square) => {
      const texture = sq.kind === 'corridor' ? 'square_corridor' : 'square_room'
      this.add.image(sq.x * TILE_SIZE, sq.y * TILE_SIZE, texture).setOrigin(0)
    })

    this.cursors = this.input.keyboard!.createCursorKeys()
    this.wasd = this.input.keyboard!.addKeys('W,A,S,D') as any
    this.cameras.main.setBounds(0, 0, width * TILE_SIZE, height * TILE_SIZE)
    
    // Center the camera on the middle of the map
    const centerX = Math.floor(width / 2) * TILE_SIZE
    const centerY = Math.floor(height / 2) * TILE_SIZE
    this.cameras.main.centerOn(centerX, centerY);

    // 1× Marine for demo
    this.marine = new StormBolterMarine(this.engine.state.board, { c: 10, r: 0 }, Dir.N);
    (this.engine.state as any).pieces = [this.marine] as Piece[]; // (simple array for now)

    const initialMarineWorldX = (this.marine.pos.c * TILE_SIZE) + (TILE_SIZE / 2);
    const initialMarineWorldY = (this.marine.pos.r * TILE_SIZE) + (TILE_SIZE / 2);
    this.marineSprite = this.add.image(
      initialMarineWorldX,
      initialMarineWorldY,
      StormBolterMarine.SPRITE_KEY
    ).setOrigin(0.5, 0.5).setDepth(1);
    this.refreshSprite(); // Set initial rotation

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
    this.selection = new SelectionManager()
    this.highlight = new HighlightSprite(this, this.tileSize)
    this.highlight.setVisible(false)
    this.add.existing(this.highlight)

    // Input handler
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (pointer.leftButtonDown()) {
        const world = pointer.positionToCamera(this.cameras.main) as Phaser.Math.Vector2
        const col = Math.floor(world.x / this.tileSize)
        const row = Math.floor(world.y / this.tileSize)

        // guard rails — stay inside board
        if (col < 0 || row < 0 ||
            col >= this.engine.state.board.width ||
            row >= this.engine.state.board.height) return

        const next = this.selection.toggle({ c: col, r: row })
        if (next) {
          this.highlight.moveTo(next, this.tileSize)
          this.highlight.setVisible(true)
        } else {
          this.highlight.setVisible(false)
        }
      }
    });

    // Marine controls
    this.input.keyboard!.on('keydown', (_event: KeyboardEvent) => {
      let acted = false;
      let action = ''; // To store which action was attempted

      if (Phaser.Input.Keyboard.JustDown(this.wasd.W)) {
        acted = this.marine.moveForward();
        action = 'moveForward';
      } else if (Phaser.Input.Keyboard.JustDown(this.wasd.S)) {
        acted = this.marine.moveBackward();
        action = 'moveBackward';
      } else if (Phaser.Input.Keyboard.JustDown(this.wasd.A)) {
        acted = this.marine.tryTurn(-1); // Turn left
        action = 'turnLeft';
      } else if (Phaser.Input.Keyboard.JustDown(this.wasd.D)) {
        acted = this.marine.tryTurn(1);  // Turn right
        action = 'turnRight';
      }

      if (acted) {
        console.log(`Action: ${action}, AP: ${this.marine.ap}, Pos: (${this.marine.pos.c},${this.marine.pos.r}), Facing: ${Dir[this.marine.facing]}`);
        this.refreshSprite();
      } else if (action) { // Log if an action was attempted but failed
        console.warn(`Action FAILED: ${action}, AP: ${this.marine.ap}, Pos: (${this.marine.pos.c},${this.marine.pos.r}), Facing: ${Dir[this.marine.facing]}`);
      }
    });
  }

  update() {
    const cam = this.cameras.main;
    const speed = 5;

    // Camera controls (WASD removed for marine control)
    if (this.cursors.left.isDown) cam.scrollX -= speed;
    if (this.cursors.right.isDown) cam.scrollX += speed;
    if (this.cursors.up.isDown) cam.scrollY -= speed;
    if (this.cursors.down.isDown) cam.scrollY += speed;

    // Clamp camera
    const worldW = this.engine.state.board.width * this.tileSize;
    const worldH = this.engine.state.board.height * this.tileSize;
    cam.scrollX = Phaser.Math.Clamp(cam.scrollX, 0, worldW - cam.width);
    cam.scrollY = Phaser.Math.Clamp(cam.scrollY, 0, worldH - cam.height);
  }

  private refreshSprite() {
    const marineLogicPos = { c: this.marine.pos.c, r: this.marine.pos.r }; // Capture before calculation
    const targetWorldX = (marineLogicPos.c * TILE_SIZE) + (TILE_SIZE / 2);
    const targetWorldY = (marineLogicPos.r * TILE_SIZE) + (TILE_SIZE / 2);
    
    console.log(`refreshSprite: Marine logic pos: (${marineLogicPos.c},${marineLogicPos.r}). TileSize: ${TILE_SIZE}. Sprite target world CENTER pos: (${targetWorldX.toFixed(2)},${targetWorldY.toFixed(2)}). Current sprite world pos: (${this.marineSprite.x.toFixed(2)}, ${this.marineSprite.y.toFixed(2)})`);

    this.marineSprite.setPosition(targetWorldX, targetWorldY);

    console.log(`refreshSprite: Sprite AFTER setPosition: (${this.marineSprite.x.toFixed(2)}, ${this.marineSprite.y.toFixed(2)})`);

    this.marineSprite.setRotation(this.marine.facing * Math.PI / 2);
  }
}
