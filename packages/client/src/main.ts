import './styles.css';
import Phaser from 'phaser';
import config from './gameConfig';
import { showHomeOverlay } from './ui/HomeOverlay';
import { mountAbortButton } from './ui/abortButton';

// `/` with no ?mission= is the homepage: the landing overlay above an
// attract-mode space_hulk_1 backdrop (GameScene reads the same param and
// disables input/clock/audio). With ?mission= we are playing: mount the
// abort control instead.
if (new URLSearchParams(window.location.search).has('mission')) {
  mountAbortButton();
} else {
  showHomeOverlay();
}

const game = new Phaser.Game(config);
(window as any).phaserGame = game;
