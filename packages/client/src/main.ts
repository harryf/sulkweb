import './styles.css';
import Phaser from 'phaser';
import config from './gameConfig';
import { showHomeOverlay } from './ui/HomeOverlay';
import { mountAbortButton } from './ui/abortButton';

// `/` with no ?mission= is the homepage: the landing overlay above an
// attract-mode space_hulk_1 backdrop (GameScene reads the same param and
// disables input/clock/audio). With ?mission= we are playing: mount the
// abort control instead.
const params = new URLSearchParams(window.location.search);
if (params.has('seed') && !params.has('mission')) {
  // Legacy bug-report URLs: /?seed=N meant "replay debug_1 with this seed"
  // before the homepage existed. Preserve them instead of swallowing the
  // seed into the attract backdrop.
  params.set('mission', 'debug_1');
  window.location.replace(`${window.location.pathname}?${params}`);
} else if (params.has('mission')) {
  mountAbortButton();
} else {
  showHomeOverlay();
}

const game = new Phaser.Game(config);
(window as any).phaserGame = game;
