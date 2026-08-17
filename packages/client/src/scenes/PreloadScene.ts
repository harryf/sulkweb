import Phaser from 'phaser';
import WebFont from 'webfontloader';

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
    // Not drawn anywhere: this load exists to give the loader a queue item so
    // its 'complete' event reliably fires and gates the WebFont wait below.
    this.load.image('square', 'assets/themes/default/square_corridor.png');
    this.load.once('complete', () => {
      let started = false;
      const startGame = () => {
        if (started) return;
        started = true;
        this.scene.start('GameScene');
      };
      WebFont.load({
        google: { families: ['Kanit:900'] },
        active: startGame,
        inactive: startGame, // font unavailable (offline etc.) must never block the game
        timeout: 2000
      });
    });
    this.load.start();
  }

  /**
   * Creates game objects.
   */
  create() {
    // GameScene will be started after font is loaded in preload()
  }
}
