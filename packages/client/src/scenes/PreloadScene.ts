import Phaser from 'phaser';

/**
 * PreloadScene - pre-loads assets and starts the GameScene.
 */
export default class PreloadScene extends Phaser.Scene {
  constructor() {
    super('PreloadScene');
  }

  /**
   * Preloads game assets.
   */
  preload() {
    this.load.image('square', 'assets/themes/default/square_corridor.png');
  }

  /**
   * Creates game objects.
   */
  create() {
    this.scene.start('GameScene');
  }
}
