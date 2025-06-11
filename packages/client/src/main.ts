import Phaser from 'phaser';
import config from './gameConfig';

const game = new Phaser.Game(config);
(window as any).phaserGame = game;
