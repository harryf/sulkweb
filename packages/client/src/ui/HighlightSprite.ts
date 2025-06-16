import Phaser from 'phaser'


export class HighlightSprite extends Phaser.GameObjects.Image {
  constructor(scene: Phaser.Scene, tile: number) {
    super(scene, 0, 0, 'select');
    this.setOrigin(0.5);
    this.setDisplaySize(tile, tile);
    this.setDepth(0.5); // Just below the piece
    this.setAlpha(0.3);
    this.setVisible(false);
  }

  follow(target: Phaser.GameObjects.Image) {
    this.setPosition(target.x, target.y)
      .setRotation(target.rotation)
      .setVisible(true);
  }

  hide() {
    this.setVisible(false);
  }
}
