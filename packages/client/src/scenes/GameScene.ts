import Phaser from 'phaser'
import { GameEngine, loadMission, Square } from "@sulk/engine";

const TILE_SIZE = 40

export default class GameScene extends Phaser.Scene {
  private readonly engine: GameEngine
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys
  private wasd!: {
    W: Phaser.Input.Keyboard.Key
    A: Phaser.Input.Keyboard.Key
    S: Phaser.Input.Keyboard.Key
    D: Phaser.Input.Keyboard.Key
  }

  constructor() {
    super('GameScene')
    const mission = loadMission('space_hulk_1')
    this.engine = new GameEngine(mission)
  }

  preload() {
    this.load.image('square_corridor', 'assets/themes/default/square_corridor.png')
    this.load.image('square_room', 'assets/themes/default/square_room.png')
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
    this.cameras.main.centerOn(centerX, centerY)

    // Enable drag-to-pan
    this.input.on('pointermove', (p: Phaser.Input.Pointer) => {
      if (!p.isDown) return
      this.cameras.main.scrollX -= (p.x - p.prevPosition.x) / this.cameras.main.zoom
      this.cameras.main.scrollY -= (p.y - p.prevPosition.y) / this.cameras.main.zoom
    })
  }

  update() {
    const cam = this.cameras.main
    const speed = 5

    if (this.cursors.left.isDown || this.wasd.A.isDown) cam.scrollX -= speed
    if (this.cursors.right.isDown || this.wasd.D.isDown) cam.scrollX += speed
    if (this.cursors.up.isDown || this.wasd.W.isDown) cam.scrollY -= speed
    if (this.cursors.down.isDown || this.wasd.S.isDown) cam.scrollY += speed
  }
}
