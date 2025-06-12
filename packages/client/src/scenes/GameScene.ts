import Phaser from 'phaser'
import { GameEngine, loadMission, Square } from "@sulk/engine";

const TILE_SIZE = 40

export default class GameScene extends Phaser.Scene {
  private readonly engine: GameEngine
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys

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
    if (this.cursors.left.isDown) cam.scrollX -= 5
    if (this.cursors.right.isDown) cam.scrollX += 5
    if (this.cursors.up.isDown) cam.scrollY -= 5
    if (this.cursors.down.isDown) cam.scrollY += 5
  }
}
