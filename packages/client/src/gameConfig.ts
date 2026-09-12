import Phaser from 'phaser';
import PreloadScene from './scenes/PreloadScene';
import LiveScene from './scenes/LiveScene';

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: 640,
  height: 640,
  parent: 'app',
  pixelArt: true,
  scene: [PreloadScene, LiveScene],
};

export default config;
