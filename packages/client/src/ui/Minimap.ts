import Phaser from 'phaser';
import { GameEngine, Square } from '@sulk/engine/index.js'; // Assuming GameEngine and Square are exported from @sulk/engine
import { projectCamToMini } from '../utils/cameraBox';
import type { CamRect, MiniRect } from '../utils/cameraBox';

export interface MinimapOptions {
  tile: number; // full tile size in pixels
  width: number; // desired width of the minimap in pixels
}

export class Minimap extends Phaser.GameObjects.Container {
  private engine: GameEngine;
  private opts: MinimapOptions;
  private miniMapWidth: number;
  private miniMapHeight: number;
  private boardPixelWidth: number;
  private boardPixelHeight: number;
  private mapScale: number;
  private viewportBox: Phaser.GameObjects.Graphics;

  constructor(
    scene: Phaser.Scene,
    engine: GameEngine,
    opts: MinimapOptions
  ) {
    super(scene);
    this.engine = engine;
    this.opts = opts;

    const board = this.engine.state.board;
    this.boardPixelWidth = board.width * this.opts.tile;
    this.boardPixelHeight = board.height * this.opts.tile;

    this.mapScale = this.opts.width / this.boardPixelWidth;
    this.miniMapWidth = this.opts.width;
    this.miniMapHeight = this.boardPixelHeight * this.mapScale;

    // Create minimap background squares
    board.allSquares().forEach((square: Square) => {
      const miniSquareSize = this.opts.tile * this.mapScale;
      const x = square.x * this.opts.tile * this.mapScale;
      const y = square.y * this.opts.tile * this.mapScale;

      const image = scene.add.image(x + miniSquareSize / 2, y + miniSquareSize / 2, 'mini_square');
      image.setScale((this.opts.tile * this.mapScale) / image.width); // Scale to represent one game tile on the minimap
      image.setTint(square.kind === 'room' ? 0xA56A2A : 0x666666); // Brown for room, Grey for corridor
      this.add(image);
    });

    // Create viewport box
    this.viewportBox = scene.add.graphics();
    this.add(this.viewportBox);
  }

  updateCam(cam: Phaser.Cameras.Scene2D.Camera): void {
    const camRect: CamRect = {
      x: cam.scrollX,
      y: cam.scrollY,
      w: cam.width,
      h: cam.height,
    };

    const boardSize = {
      w: this.boardPixelWidth,
      h: this.boardPixelHeight,
    };

    const miniBounds: MiniRect = {
      x: 0,
      y: 0,
      w: this.miniMapWidth,
      h: this.miniMapHeight,
    };

    const miniCamRect = projectCamToMini(camRect, boardSize, miniBounds, 2); 

    this.viewportBox.clear();
    this.viewportBox.lineStyle(2, 0xFFFFFF, 1); 
    this.viewportBox.strokeRect(
      miniCamRect.x,
      miniCamRect.y,
      miniCamRect.w,
      miniCamRect.h
    );
  }
}
