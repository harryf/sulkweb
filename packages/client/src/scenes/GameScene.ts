import Phaser from 'phaser';

/**
 * GameScene – draws a 10×10 board of corridor squares.
 * Tiles are 64 px and the camera is fixed.
*/
export default class GameScene extends Phaser.Scene {
  constructor() {
    super('GameScene');
  }

  /**
   * Creates the game objects for this scene.
   */
  create() {
    for (let y = 0; y < 10; y++) {
      for (let x = 0; x < 10; x++) {
        this.add.image(x * 64, y * 64, 'square').setOrigin(0);
      }
    }
  }

  /**
   * Returns the number of tiles on the board.
   * @returns {number} The number of tile children.
   */
  public get tileCount(): number {
    return this.children.length;
  }
}
