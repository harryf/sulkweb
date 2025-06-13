import Phaser from 'phaser'
import type { Coord } from '../utils/SelectionManager.js'

export class HighlightSprite extends Phaser.GameObjects.Image {
  constructor(scene: Phaser.Scene, tile: number) {
    super(scene, 0, 0, 'select')            // texture key loaded in GameScene
    this.setOrigin(0)                       // easier positioning: top-left
    this.setDisplaySize(tile, tile)         // stretch to tile size
    this.setDepth(2)                        // above the board
    this.setAlpha(0.5)                      // make it semi-transparent
  }

  /** Move highlight so its top-left aligns with the square at Coord. */
  moveTo(coord: Coord, tile: number) {
    this.setPosition(coord.c * tile, coord.r * tile)
  }
}
